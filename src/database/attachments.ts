import { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';
import mime from 'mime-types';

export interface AttachmentData {
  id: string;
  note_id: string;
  filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

// 파일 크기 제한 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 허용된 파일 확장자 (화이트리스트)
const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg',  // 이미지
  '.pdf',  // PDF
  '.txt', '.md', '.doc', '.docx',  // 문서
  '.zip', '.rar', '.7z',  // 압축 파일
  '.mp3', '.mp4', '.avi', '.mov',  // 미디어
];

/**
 * 첨부파일 디렉토리 경로 반환
 */
export function getAttachmentsDir(): string {
  const userDataPath = app.getPath('userData');
  const attachmentsDir = path.join(userDataPath, 'attachments');

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  return attachmentsDir;
}

/**
 * 파일명 안전화 (경로 순회 공격 방지)
 */
function sanitizeFilename(filename: string): string {
  // 경로 구분자 및 특수문자 제거
  return filename
    .replace(/[/\\]/g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\.\./g, '_');
}

/**
 * 파일 확장자 검증
 */
function isAllowedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * 첨부파일 업로드
 */
export async function uploadAttachment(
  db: Database,
  noteId: string,
  sourceFilePath: string
): Promise<AttachmentData> {
  try {
    // 파일 존재 확인
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error('파일을 찾을 수 없습니다.');
    }

    // 파일 정보 조회
    const stats = fs.statSync(sourceFilePath);
    const originalFilename = path.basename(sourceFilePath);

    // 파일 크기 검증
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`파일 크기는 ${MAX_FILE_SIZE / (1024 * 1024)}MB를 초과할 수 없습니다.`);
    }

    // 파일 타입 검증
    if (!isAllowedFileType(originalFilename)) {
      throw new Error('허용되지 않은 파일 형식입니다.');
    }

    // 파일명 안전화
    const safeFilename = sanitizeFilename(originalFilename);
    const ext = path.extname(safeFilename);
    const uuid = randomUUID();
    const storedFilename = `${uuid}${ext}`;

    // 노트별 디렉토리 생성
    const noteAttachmentsDir = path.join(getAttachmentsDir(), noteId);
    if (!fs.existsSync(noteAttachmentsDir)) {
      fs.mkdirSync(noteAttachmentsDir, { recursive: true });
    }

    // 파일 복사
    const destPath = path.join(noteAttachmentsDir, storedFilename);
    fs.copyFileSync(sourceFilePath, destPath);

    // MIME 타입 감지
    const mimeType = mime.lookup(safeFilename) || 'application/octet-stream';

    // DB 레코드 생성
    const attachmentId = randomUUID();
    const now = new Date().toISOString();
    const relativePath = path.join('attachments', noteId, storedFilename);

    db.prepare(`
      INSERT INTO attachment (id, note_id, filename, stored_filename, file_path, file_size, mime_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(attachmentId, noteId, safeFilename, storedFilename, relativePath, stats.size, mimeType, now);

    return {
      id: attachmentId,
      note_id: noteId,
      filename: safeFilename,
      stored_filename: storedFilename,
      file_path: relativePath,
      file_size: stats.size,
      mime_type: mimeType,
      created_at: now
    };
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    throw error;
  }
}

/**
 * 노트의 첨부파일 목록 조회
 */
export function listAttachments(db: Database, noteId: string): AttachmentData[] {
  return db.prepare(`
    SELECT * FROM attachment
    WHERE note_id = ?
    ORDER BY created_at DESC
  `).all(noteId) as AttachmentData[];
}

/**
 * 첨부파일 삭제
 */
export function deleteAttachment(db: Database, attachmentId: string): { success: boolean; error?: string } {
  try {
    // 첨부파일 정보 조회
    const attachment = db.prepare('SELECT * FROM attachment WHERE id = ?')
      .get(attachmentId) as AttachmentData | undefined;

    if (!attachment) {
      return { success: false, error: 'Attachment not found' };
    }

    // 파일 삭제
    const fullPath = path.join(app.getPath('userData'), attachment.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // DB 레코드 삭제
    db.prepare('DELETE FROM attachment WHERE id = ?').run(attachmentId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 첨부파일의 전체 경로 반환
 */
export function getAttachmentPath(db: Database, attachmentId: string): string | null {
  try {
    const attachment = db.prepare('SELECT file_path FROM attachment WHERE id = ?')
      .get(attachmentId) as { file_path: string } | undefined;

    if (!attachment) {
      return null;
    }

    return path.join(app.getPath('userData'), attachment.file_path);
  } catch (error) {
    console.error('Failed to get attachment path:', error);
    return null;
  }
}

/**
 * 노트의 모든 첨부파일 삭제 (노트 영구 삭제 시 사용)
 */
export function deleteNoteAttachments(db: Database, noteId: string): void {
  try {
    // 첨부파일 목록 조회
    const attachments = listAttachments(db, noteId);

    // 각 첨부파일 삭제
    for (const attachment of attachments) {
      const fullPath = path.join(app.getPath('userData'), attachment.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // DB 레코드 삭제
    db.prepare('DELETE FROM attachment WHERE note_id = ?').run(noteId);

    // 빈 디렉토리 삭제
    const noteAttachmentsDir = path.join(getAttachmentsDir(), noteId);
    if (fs.existsSync(noteAttachmentsDir)) {
      const files = fs.readdirSync(noteAttachmentsDir);
      if (files.length === 0) {
        fs.rmdirSync(noteAttachmentsDir);
      }
    }
  } catch (error) {
    console.error('Failed to delete note attachments:', error);
  }
}
