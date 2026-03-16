// 공통 타입 정의

export interface NoteData {
  id?: string;
  title: string;
  content: string;
  categoryId?: string | null;
  parentId?: string | null;
  isPinned?: boolean;
  tagIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryData {
  id?: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt?: Date;
}

export interface TagData {
  id?: string;
  name: string;
}

export interface NoteFilter {
  categoryId?: string;
  tagId?: string;
  tagIds?: string[];
  searchQuery?: string;
  parentId?: string | null;
}

// Trash 관련 타입
export interface TrashNote {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  deleted_at: string;
  created_at: string;
  updated_at: string;
  tags?: TagData[];
  category?: CategoryData;
}

// Backup 관련 타입
export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
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

// Attachment 관련 타입
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
