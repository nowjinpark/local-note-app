import { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import { getAttachmentsDir } from './attachments';

export interface BackupResult {
  success: boolean;
  filePath?: string;
  filesZipPath?: string;  // 첨부파일 ZIP 경로 (선택적)
  fileSize?: number;      // JSON + ZIP 합계
  counts?: {
    notes: number;
    categories: number;
    tags: number;
    attachments: number;
  };
  error?: string;
}

export interface BackupInfo {
  id: string;
  backup_path: string;
  backup_type: 'manual' | 'auto';
  backup_format: 'json' | 'sqlite';
  file_size: number;
  notes_count: number;
  categories_count: number;
  tags_count: number;
  attachments_count: number;
  created_at: string;
}

/**
 * 백업 디렉토리 경로 반환
 */
export function getBackupDir(): string {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');

  // 백업 디렉토리가 없으면 생성
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}

/**
 * 첨부파일을 ZIP으로 압축
 * @param attachmentsDir 첨부파일 루트 디렉토리
 * @param zipPath ZIP 파일 저장 경로
 * @returns 생성된 ZIP 파일 크기
 */
async function createAttachmentsZip(
  attachmentsDir: string,
  zipPath: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    // attachments 디렉토리가 없거나 비어있으면 ZIP 생성 안 함
    if (!fs.existsSync(attachmentsDir)) {
      console.log('No attachments directory, skipping ZIP creation');
      resolve(0);
      return;
    }

    const files = fs.readdirSync(attachmentsDir);
    if (files.length === 0) {
      console.log('Attachments directory is empty, skipping ZIP creation');
      resolve(0);
      return;
    }

    // ZIP 아카이브 생성
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축
    });

    output.on('close', () => {
      const zipSize = archive.pointer();
      console.log(`✅ Attachments ZIP created: ${zipSize} bytes`);
      resolve(zipSize);
    });

    archive.on('error', (err) => {
      console.error('❌ ZIP creation error:', err);
      reject(err);
    });

    archive.pipe(output);

    // attachments 디렉토리 전체를 'attachments/' 경로로 압축
    archive.directory(attachmentsDir, 'attachments');

    archive.finalize();
  });
}

/**
 * ZIP에서 첨부파일 압축 해제
 * @param zipPath ZIP 파일 경로
 * @param targetDir 압축 해제 대상 디렉토리 (userData)
 */
async function extractAttachmentsZip(
  zipPath: string,
  targetDir: string
): Promise<void> {
  if (!fs.existsSync(zipPath)) {
    console.log('No attachments ZIP file found, skipping extraction');
    return;
  }

  try {
    await extractZip(zipPath, { dir: targetDir });
    console.log('✅ Attachments extracted successfully');
  } catch (error) {
    console.error('❌ ZIP extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract attachments: ${errorMessage}`);
  }
}

/**
 * JSON 형식으로 데이터베이스 백업 생성
 */
export async function createBackup(
  db: Database,
  type: 'manual' | 'auto' = 'manual',
  format: 'json' | 'sqlite' = 'json'
): Promise<BackupResult> {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const backupDir = getBackupDir();

    if (format === 'json') {
      return await createJsonBackup(db, backupDir, timestamp, type);
    } else {
      return await createSqliteBackup(db, backupDir, timestamp, type);
    }
  } catch (error) {
    console.error('Backup creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * JSON 백업 생성
 */
async function createJsonBackup(
  db: Database,
  backupDir: string,
  timestamp: string,
  type: 'manual' | 'auto'
): Promise<BackupResult> {
  const backupFileName = `backup-${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFileName);

  // 모든 데이터 조회
  const notes = db.prepare('SELECT * FROM note').all();
  const categories = db.prepare('SELECT * FROM category').all();
  const tags = db.prepare('SELECT * FROM tag').all();
  const noteTags = db.prepare('SELECT * FROM note_tag').all();
  const attachments = db.prepare('SELECT * FROM attachment').all();

  // 백업 데이터 구조
  const backupData = {
    version: '1.0',
    created_at: new Date().toISOString(),
    backup_type: type,
    database: {
      notes,
      categories,
      tags,
      note_tags: noteTags,
      attachments
    },
    counts: {
      notes: notes.length,
      categories: categories.length,
      tags: tags.length,
      attachments: attachments.length
    }
  };

  // JSON 파일로 저장
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  const fileStats = fs.statSync(backupPath);
  const backupSize = fileStats.size;

  // 첨부파일 ZIP 생성
  let zipSize = 0;
  let totalSize = backupSize;
  let zipPath: string | undefined;

  if (attachments.length > 0) {
    const attachmentsDir = getAttachmentsDir();
    const zipFileName = `backup-${timestamp}-files.zip`;
    zipPath = path.join(backupDir, zipFileName);

    try {
      zipSize = await createAttachmentsZip(attachmentsDir, zipPath);
      totalSize += zipSize;

      console.log(`📦 Backup with attachments: JSON ${backupSize} bytes + ZIP ${zipSize} bytes`);
    } catch (error) {
      console.error('Failed to create attachments ZIP:', error);
      // ZIP 생성 실패해도 백업은 계속 진행 (메타데이터만)
      zipPath = undefined;
    }
  } else {
    console.log(`📦 Backup without attachments: ${backupSize} bytes`);
  }

  // 백업 히스토리에 기록
  const backupId = `backup-${Date.now()}`;
  db.prepare(`
    INSERT INTO backup_history (
      id, backup_path, backup_type, backup_format,
      file_size, notes_count, categories_count, tags_count, attachments_count,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    backupId,
    backupPath,
    type,
    'json',
    totalSize,  // JSON + ZIP 합계
    notes.length,
    categories.length,
    tags.length,
    attachments.length,
    new Date().toISOString()
  );

  return {
    success: true,
    filePath: backupPath,
    filesZipPath: zipSize > 0 ? zipPath : undefined,
    fileSize: totalSize,
    counts: {
      notes: notes.length,
      categories: categories.length,
      tags: tags.length,
      attachments: attachments.length
    }
  };
}

/**
 * SQLite 백업 생성 (파일 복사)
 */
async function createSqliteBackup(
  db: Database,
  backupDir: string,
  timestamp: string,
  type: 'manual' | 'auto'
): Promise<BackupResult> {
  const backupFileName = `backup-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFileName);

  // 현재 데이터베이스 파일 경로
  const dbPath = path.join(app.getPath('userData'), 'data.db');

  // 파일 복사
  fs.copyFileSync(dbPath, backupPath);

  const fileStats = fs.statSync(backupPath);
  const fileSize = fileStats.size;

  // 카운트 조회
  const notesCount = db.prepare('SELECT COUNT(*) as count FROM note').get() as { count: number };
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM category').get() as { count: number };
  const tagsCount = db.prepare('SELECT COUNT(*) as count FROM tag').get() as { count: number };
  const attachmentsCount = db.prepare('SELECT COUNT(*) as count FROM attachment').get() as { count: number };

  // 백업 히스토리에 기록
  const backupId = `backup-${Date.now()}`;
  db.prepare(`
    INSERT INTO backup_history (
      id, backup_path, backup_type, backup_format,
      file_size, notes_count, categories_count, tags_count, attachments_count,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    backupId,
    backupPath,
    type,
    'sqlite',
    fileSize,
    notesCount.count,
    categoriesCount.count,
    tagsCount.count,
    attachmentsCount.count,
    new Date().toISOString()
  );

  return {
    success: true,
    filePath: backupPath,
    fileSize,
    counts: {
      notes: notesCount.count,
      categories: categoriesCount.count,
      tags: tagsCount.count,
      attachments: attachmentsCount.count
    }
  };
}

/**
 * 백업 목록 조회
 */
export function listBackups(db: Database): BackupInfo[] {
  return db.prepare(`
    SELECT * FROM backup_history
    ORDER BY created_at DESC
  `).all() as BackupInfo[];
}

/**
 * 백업 삭제
 */
export function deleteBackup(db: Database, backupId: string): { success: boolean } {
  try {
    // 백업 정보 조회
    const backup = db.prepare('SELECT backup_path FROM backup_history WHERE id = ?')
      .get(backupId) as { backup_path: string } | undefined;

    if (!backup) {
      throw new Error('Backup not found');
    }

    // 파일 삭제
    if (fs.existsSync(backup.backup_path)) {
      fs.unlinkSync(backup.backup_path);
    }

    // 히스토리에서 삭제
    db.prepare('DELETE FROM backup_history WHERE id = ?').run(backupId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return { success: false };
  }
}

/**
 * 백업 폴더 경로 반환 (사용자가 직접 열 수 있도록)
 */
export function getBackupFolderPath(): string {
  return getBackupDir();
}

/**
 * JSON 백업에서 데이터 복원
 */
export async function restoreFromBackup(
  db: Database,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      throw new Error('백업 파일을 찾을 수 없습니다.');
    }

    // JSON 파일 읽기
    const backupContent = fs.readFileSync(filePath, 'utf-8');
    const backupData = JSON.parse(backupContent);

    // 백업 버전 확인
    if (!backupData.version || !backupData.database) {
      throw new Error('올바르지 않은 백업 파일 형식입니다.');
    }

    // 첨부파일 ZIP 복원 확인
    const backupDir = path.dirname(filePath);
    const backupBasename = path.basename(filePath, '.json');
    const zipPath = path.join(backupDir, `${backupBasename}-files.zip`);

    // ZIP 파일 존재 여부 확인
    const hasAttachmentsZip = fs.existsSync(zipPath);

    if (hasAttachmentsZip && backupData.database.attachments?.length > 0) {
      console.log('📦 Restoring attachments from ZIP...');

      // userData 디렉토리 경로
      const userDataDir = app.getPath('userData');

      try {
        // ZIP 압축 해제 (attachments/ 디렉토리가 자동 생성됨)
        await extractAttachmentsZip(zipPath, userDataDir);
      } catch (error) {
        console.error('Failed to extract attachments ZIP:', error);
        console.warn('⚠️ Continuing with metadata-only restore');
        // ZIP 복원 실패해도 메타데이터는 복원 계속
      }
    } else if (backupData.database.attachments?.length > 0) {
      console.warn('⚠️ Backup contains attachment metadata but no files ZIP found');
    }

    // 트랜잭션으로 복원
    db.transaction(() => {
      // 기존 데이터 삭제
      db.prepare('DELETE FROM note_tag').run();
      db.prepare('DELETE FROM note').run();
      db.prepare('DELETE FROM tag').run();
      db.prepare('DELETE FROM category').run();
      db.prepare('DELETE FROM attachment').run();

      // 카테고리 복원
      if (backupData.database.categories && backupData.database.categories.length > 0) {
        const categoryStmt = db.prepare(`
          INSERT INTO category (id, name, description, parent_id, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const cat of backupData.database.categories) {
          categoryStmt.run(cat.id, cat.name, cat.description, cat.parent_id, cat.created_at);
        }
      }

      // 태그 복원
      if (backupData.database.tags && backupData.database.tags.length > 0) {
        const tagStmt = db.prepare('INSERT INTO tag (id, name) VALUES (?, ?)');
        for (const tag of backupData.database.tags) {
          tagStmt.run(tag.id, tag.name);
        }
      }

      // 노트 복원
      if (backupData.database.notes && backupData.database.notes.length > 0) {
        const noteStmt = db.prepare(`
          INSERT INTO note (id, title, content, category_id, parent_id, is_pinned, deleted_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const note of backupData.database.notes) {
          noteStmt.run(
            note.id,
            note.title,
            note.content,
            note.category_id,
            note.parent_id,
            note.is_pinned || 0,
            note.deleted_at || null,
            note.created_at,
            note.updated_at
          );
        }
      }

      // 노트-태그 관계 복원
      if (backupData.database.note_tags && backupData.database.note_tags.length > 0) {
        const noteTagStmt = db.prepare('INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)');
        for (const nt of backupData.database.note_tags) {
          noteTagStmt.run(nt.note_id, nt.tag_id);
        }
      }

      // 첨부파일 복원 (메타데이터만)
      if (backupData.database.attachments && backupData.database.attachments.length > 0) {
        const attachmentStmt = db.prepare(`
          INSERT INTO attachment (id, note_id, filename, stored_filename, file_path, file_size, mime_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const att of backupData.database.attachments) {
          attachmentStmt.run(
            att.id,
            att.note_id,
            att.filename,
            att.stored_filename,
            att.file_path,
            att.file_size,
            att.mime_type,
            att.created_at
          );
        }
      }
    })();

    return { success: true };
  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
