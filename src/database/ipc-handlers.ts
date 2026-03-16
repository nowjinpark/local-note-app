import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { getDatabase } from './connection';
import type { NoteData, CategoryData, TagData, NoteFilter } from '../shared/types';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createBackup,
  listBackups,
  deleteBackup,
  getBackupFolderPath,
  restoreFromBackup
} from './backup';
import {
  uploadAttachment,
  listAttachments,
  deleteAttachment,
  getAttachmentPath,
  deleteNoteAttachments
} from './attachments';

// IPC 핸들러 등록 함수
export function registerIpcHandlers(): void {
  console.log('Registering IPC handlers...');

  const db = getDatabase();

  // ===== Note 핸들러 =====

  // 노트 생성
  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, (_event, data: NoteData) => {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO note (id, title, content, category_id, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.title, data.content, data.categoryId || null, data.parentId || null, now, now);

    // 태그 추가 (있으면)
    if (data.tagIds && data.tagIds.length > 0) {
      const tagStmt = db.prepare('INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tagIds) {
        tagStmt.run(id, tagId);
      }
    }

    return db.prepare('SELECT * FROM note WHERE id = ?').get(id);
  });

  // 노트 수정
  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, (_event, id: string, data: Partial<NoteData>) => {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(data.categoryId);
    }
    if (data.parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(data.parentId);
    }
    if (data.isPinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(data.isPinned ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (updates.length > 0) {
      const stmt = db.prepare(`UPDATE note SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    // 태그 업데이트 (있으면)
    if (data.tagIds !== undefined) {
      db.prepare('DELETE FROM note_tag WHERE note_id = ?').run(id);
      if (data.tagIds.length > 0) {
        const tagStmt = db.prepare('INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)');
        for (const tagId of data.tagIds) {
          tagStmt.run(id, tagId);
        }
      }
    }

    return db.prepare('SELECT * FROM note WHERE id = ?').get(id);
  });

  // 노트 삭제 (소프트 삭제)
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, (_event, id: string) => {
    const now = new Date().toISOString();
    db.prepare('UPDATE note SET deleted_at = ? WHERE id = ?').run(now, id);
    return { success: true };
  });

  // 노트 조회 (단일)
  ipcMain.handle(IPC_CHANNELS.NOTE_GET, (_event, id: string) => {
    const note = db.prepare('SELECT * FROM note WHERE id = ?').get(id);
    if (!note) return null;

    // 태그 조회
    const tags = db.prepare(`
      SELECT t.* FROM tag t
      INNER JOIN note_tag nt ON t.id = nt.tag_id
      WHERE nt.note_id = ?
    `).all(id);

    return { ...note, tags };
  });

  // 노트 목록 조회
  ipcMain.handle(IPC_CHANNELS.NOTE_LIST, (_event, filter?: NoteFilter) => {
    let query: string;
    const params: any[] = [];

    // 태그 필터가 있는 경우 JOIN 사용
    if (filter?.tagId) {
      query = `
        SELECT DISTINCT n.* FROM note n
        INNER JOIN note_tag nt ON n.id = nt.note_id
        WHERE nt.tag_id = ? AND n.deleted_at IS NULL
      `;
      params.push(filter.tagId);

      if (filter?.categoryId) {
        query += ' AND n.category_id = ?';
        params.push(filter.categoryId);
      }

      query += ' ORDER BY n.is_pinned DESC, n.updated_at DESC';
    } else {
      // 태그 필터가 없는 경우 기존 로직
      query = 'SELECT * FROM note WHERE deleted_at IS NULL';

      if (filter?.categoryId) {
        query += ' AND category_id = ?';
        params.push(filter.categoryId);
      }

      if (filter?.parentId !== undefined) {
        if (filter.parentId === null) {
          query += ' AND parent_id IS NULL';
        } else {
          query += ' AND parent_id = ?';
          params.push(filter.parentId);
        }
      }

      query += ' ORDER BY is_pinned DESC, updated_at DESC';
    }

    const notes = db.prepare(query).all(...params);

    // 각 노트에 태그 정보 추가
    return notes.map((note: any) => {
      const tags = db.prepare(`
        SELECT t.* FROM tag t
        INNER JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
      `).all(note.id);
      return { ...note, tags };
    });
  });

  // 노트 검색
  ipcMain.handle(IPC_CHANNELS.NOTE_SEARCH, (_event, searchQuery: string) => {
    const query = `
      SELECT * FROM note
      WHERE (title LIKE ? OR content LIKE ?) AND deleted_at IS NULL
      ORDER BY is_pinned DESC, updated_at DESC
    `;
    const searchPattern = `%${searchQuery}%`;
    const notes = db.prepare(query).all(searchPattern, searchPattern);

    // 각 노트에 태그 정보 추가
    return notes.map((note: any) => {
      const tags = db.prepare(`
        SELECT t.* FROM tag t
        INNER JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
      `).all(note.id);
      return { ...note, tags };
    });
  });

  // 노트 내보내기
  ipcMain.handle(IPC_CHANNELS.NOTE_EXPORT, async (_event, noteId: string) => {
    const note: any = db.prepare('SELECT * FROM note WHERE id = ?').get(noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    // 태그 가져오기
    const tags = db.prepare(`
      SELECT t.* FROM tag t
      INNER JOIN note_tag nt ON t.id = nt.tag_id
      WHERE nt.note_id = ?
    `).all(noteId);

    // 카테고리 가져오기
    let categoryName = '없음';
    if (note.category_id) {
      const category: any = db.prepare('SELECT name FROM category WHERE id = ?').get(note.category_id);
      if (category) {
        categoryName = category.name;
      }
    }

    // Markdown 파일 내용 생성
    const tagNames = tags.map((t: any) => t.name).join(', ');
    const markdown = `# ${note.title || '제목 없음'}

**카테고리:** ${categoryName}
**태그:** ${tagNames || '없음'}
**작성일:** ${note.created_at}
**수정일:** ${note.updated_at}

---

${note.content || ''}
`;

    // 파일 저장 다이얼로그
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
      title: '노트 내보내기',
      defaultPath: `${note.title || '노트'}.md`,
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, markdown, 'utf-8');
      return { success: true, filePath: result.filePath };
    }

    return { success: false };
  });

  // ===== Category 핸들러 =====

  // 카테고리 생성
  ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, (_event, data: CategoryData) => {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO category (id, name, description, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.description || null, data.parentId || null, now);

    return db.prepare('SELECT * FROM category WHERE id = ?').get(id);
  });

  // 카테고리 수정
  ipcMain.handle(IPC_CHANNELS.CATEGORY_UPDATE, (_event, id: string, data: Partial<CategoryData>) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(data.parentId);
    }

    values.push(id);

    if (updates.length > 0) {
      const stmt = db.prepare(`UPDATE category SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return db.prepare('SELECT * FROM category WHERE id = ?').get(id);
  });

  // 카테고리 삭제
  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, (_event, id: string) => {
    db.prepare('DELETE FROM category WHERE id = ?').run(id);
    return { success: true };
  });

  // 카테고리 조회 (단일)
  ipcMain.handle(IPC_CHANNELS.CATEGORY_GET, (_event, id: string) => {
    return db.prepare('SELECT * FROM category WHERE id = ?').get(id);
  });

  // 카테고리 목록 조회
  ipcMain.handle(IPC_CHANNELS.CATEGORY_LIST, () => {
    return db.prepare('SELECT * FROM category ORDER BY name ASC').all();
  });

  // ===== Tag 핸들러 =====

  // 태그 생성
  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, (_event, data: TagData) => {
    // 이미 존재하는지 확인
    const existing = db.prepare('SELECT * FROM tag WHERE name = ?').get(data.name);
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const stmt = db.prepare('INSERT INTO tag (id, name) VALUES (?, ?)');
    stmt.run(id, data.name);

    return db.prepare('SELECT * FROM tag WHERE id = ?').get(id);
  });

  // 태그 삭제
  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, (_event, id: string) => {
    db.prepare('DELETE FROM tag WHERE id = ?').run(id);
    return { success: true };
  });

  // 태그 목록 조회
  ipcMain.handle(IPC_CHANNELS.TAG_LIST, () => {
    return db.prepare('SELECT * FROM tag ORDER BY name ASC').all();
  });

  // 태그 검색 (자동완성용)
  ipcMain.handle(IPC_CHANNELS.TAG_SEARCH, (_event, query: string) => {
    const searchPattern = `%${query}%`;
    return db.prepare('SELECT * FROM tag WHERE name LIKE ? ORDER BY name ASC').all(searchPattern);
  });

  // ===== Trash 핸들러 =====

  // 휴지통 노트 목록 조회
  ipcMain.handle(IPC_CHANNELS.TRASH_LIST, () => {
    const notes = db.prepare(`
      SELECT * FROM note
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `).all();

    // 각 노트에 태그와 카테고리 정보 추가
    return notes.map((note: any) => {
      const tags = db.prepare(`
        SELECT t.* FROM tag t
        INNER JOIN note_tag nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
      `).all(note.id);

      let category = null;
      if (note.category_id) {
        category = db.prepare('SELECT * FROM category WHERE id = ?').get(note.category_id);
      }

      return { ...note, tags, category };
    });
  });

  // 휴지통에서 노트 복원
  ipcMain.handle(IPC_CHANNELS.TRASH_RESTORE, (_event, noteId: string) => {
    db.prepare('UPDATE note SET deleted_at = NULL WHERE id = ?').run(noteId);
    return { success: true };
  });

  // 노트 영구 삭제
  ipcMain.handle(IPC_CHANNELS.TRASH_DELETE_PERMANENT, (_event, noteId: string) => {
    // 첨부파일도 함께 삭제
    deleteNoteAttachments(db, noteId);
    // 노트 삭제
    db.prepare('DELETE FROM note WHERE id = ?').run(noteId);
    return { success: true };
  });

  // 휴지통 비우기
  ipcMain.handle(IPC_CHANNELS.TRASH_EMPTY, () => {
    const result = db.prepare('DELETE FROM note WHERE deleted_at IS NOT NULL').run();
    return { success: true, count: result.changes };
  });

  // 자동 정리 (오래된 항목 삭제)
  ipcMain.handle(IPC_CHANNELS.TRASH_AUTO_PURGE, () => {
    // 휴지통 보관 기간 가져오기
    const setting: any = db.prepare('SELECT value FROM app_settings WHERE key = ?')
      .get('trash_retention_days');
    const retentionDays = setting ? parseInt(setting.value) : 30;

    // 보관 기간이 지난 노트 삭제
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const result = db.prepare(`
      DELETE FROM note
      WHERE deleted_at IS NOT NULL AND deleted_at < ?
    `).run(cutoffISO);

    return { success: true, count: result.changes };
  });

  // ===== Settings 핸들러 =====

  // 설정 값 조회
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: string) => {
    const result: any = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return result ? result.value : null;
  });

  // 설정 값 저장
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, key: string, value: string) => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run(key, value, now);
    return { success: true };
  });

  // ===== Backup 핸들러 =====

  // 백업 생성
  ipcMain.handle(
    IPC_CHANNELS.BACKUP_CREATE,
    async (_event, options: { type: 'manual' | 'auto'; format: 'json' | 'sqlite' }) => {
      return await createBackup(db, options.type, options.format);
    }
  );

  // 백업 목록 조회
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, () => {
    return listBackups(db);
  });

  // 백업 삭제
  ipcMain.handle(IPC_CHANNELS.BACKUP_DELETE, (_event, backupId: string) => {
    return deleteBackup(db, backupId);
  });

  // 백업 폴더 경로 조회
  ipcMain.handle(IPC_CHANNELS.BACKUP_EXPORT_PATH, () => {
    return getBackupFolderPath();
  });

  // 백업 폴더 열기
  ipcMain.handle(IPC_CHANNELS.BACKUP_OPEN_FOLDER, async () => {
    try {
      const folderPath = getBackupFolderPath();
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to open backup folder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 백업 복원
  ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, async () => {
    try {
      // 파일 선택 다이얼로그
      const result = await dialog.showOpenDialog({
        title: '백업 파일 선택',
        filters: [
          { name: 'JSON 백업', extensions: ['json'] },
          { name: 'SQLite 백업', extensions: ['db'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Cancelled' };
      }

      const filePath = result.filePaths[0];

      // JSON 백업 복원
      if (filePath.endsWith('.json')) {
        return await restoreFromBackup(db, filePath);
      }

      // SQLite 백업은 앱 재시작 필요 (추후 구현)
      return { success: false, error: 'SQLite 복원은 아직 지원되지 않습니다.' };
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ===== Attachment 핸들러 =====

  // 첨부파일 업로드
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_UPLOAD, async (_event, noteId: string) => {
    try {
      // 파일 선택 다이얼로그
      const result = await dialog.showOpenDialog({
        title: '파일 첨부',
        properties: ['openFile'],
        filters: [
          { name: '모든 파일', extensions: ['*'] },
          { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: '문서', extensions: ['txt', 'md', 'doc', 'docx'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Cancelled');
      }

      const filePath = result.filePaths[0];
      return await uploadAttachment(db, noteId, filePath);
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      throw error;
    }
  });

  // 첨부파일 목록
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_LIST, (_event, noteId: string) => {
    return listAttachments(db, noteId);
  });

  // 첨부파일 삭제
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_DELETE, (_event, attachmentId: string) => {
    return deleteAttachment(db, attachmentId);
  });

  // 첨부파일 URL 조회
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_GET_URL, (_event, attachmentId: string) => {
    const fullPath = getAttachmentPath(db, attachmentId);
    if (!fullPath) {
      throw new Error('Attachment not found');
    }
    // 커스텀 프로토콜 URL로 변환 (보안 향상)
    return `noteapp://attachment/${attachmentId}`;
  });

  // 첨부파일 열기
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_OPEN, async (_event, attachmentId: string) => {
    try {
      const fullPath = getAttachmentPath(db, attachmentId);
      if (!fullPath) {
        throw new Error('Attachment not found');
      }
      await shell.openPath(fullPath);
    } catch (error) {
      console.error('Failed to open attachment:', error);
      throw error;
    }
  });

  console.log('✅ IPC handlers registered successfully');
}
