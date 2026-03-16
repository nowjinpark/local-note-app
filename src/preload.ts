// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/ipc-channels';
import type { NoteData, CategoryData, TagData, NoteFilter, TrashNote, BackupResult, BackupInfo, AttachmentData } from './shared/types';

// Renderer 프로세스에 안전하게 API 노출
contextBridge.exposeInMainWorld('noteApi', {
  // Note API
  createNote: (data: NoteData) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, data),
  updateNote: (id: string, data: Partial<NoteData>) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, id, data),
  deleteNote: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  getNote: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, id),
  listNotes: (filter?: NoteFilter) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_LIST, filter),
  searchNotes: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_SEARCH, query),
  exportNote: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_EXPORT, id),

  // Category API
  createCategory: (data: CategoryData) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, data),
  updateCategory: (id: string, data: Partial<CategoryData>) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, id, data),
  deleteCategory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),
  getCategory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET, id),
  listCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_LIST),

  // Tag API
  createTag: (data: TagData) => ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, data),
  deleteTag: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  listTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),
  searchTags: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_SEARCH, query),

  // Trash API
  listTrash: () => ipcRenderer.invoke(IPC_CHANNELS.TRASH_LIST),
  restoreFromTrash: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.TRASH_RESTORE, noteId),
  deleteNotePermanent: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.TRASH_DELETE_PERMANENT, noteId),
  emptyTrash: () => ipcRenderer.invoke(IPC_CHANNELS.TRASH_EMPTY),
  autoPurgeTrash: () => ipcRenderer.invoke(IPC_CHANNELS.TRASH_AUTO_PURGE),

  // Settings API
  getSetting: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

  // Backup API
  createBackup: (options: { type: 'manual' | 'auto'; format: 'json' | 'sqlite' }) =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, options),
  listBackups: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST),
  deleteBackup: (backupId: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_DELETE, backupId),
  getBackupFolderPath: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_EXPORT_PATH),
  openBackupFolder: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_OPEN_FOLDER),
  restoreBackup: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE),

  // Attachment API
  uploadAttachment: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.ATTACHMENT_UPLOAD, noteId),
  listAttachments: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.ATTACHMENT_LIST, noteId),
  deleteAttachment: (attachmentId: string) => ipcRenderer.invoke(IPC_CHANNELS.ATTACHMENT_DELETE, attachmentId),
  getAttachmentUrl: (attachmentId: string) => ipcRenderer.invoke(IPC_CHANNELS.ATTACHMENT_GET_URL, attachmentId),
  openAttachment: (attachmentId: string) => ipcRenderer.invoke(IPC_CHANNELS.ATTACHMENT_OPEN, attachmentId),
});

// TypeScript 타입 선언 (global)
declare global {
  interface Window {
    noteApi: {
      createNote: (data: NoteData) => Promise<any>;
      updateNote: (id: string, data: Partial<NoteData>) => Promise<any>;
      deleteNote: (id: string) => Promise<{ success: boolean }>;
      getNote: (id: string) => Promise<any>;
      listNotes: (filter?: NoteFilter) => Promise<any[]>;
      searchNotes: (query: string) => Promise<any[]>;
      exportNote: (id: string) => Promise<{ success: boolean; filePath?: string }>;

      createCategory: (data: CategoryData) => Promise<any>;
      updateCategory: (id: string, data: Partial<CategoryData>) => Promise<any>;
      deleteCategory: (id: string) => Promise<{ success: boolean }>;
      getCategory: (id: string) => Promise<any>;
      listCategories: () => Promise<any[]>;

      createTag: (data: TagData) => Promise<any>;
      deleteTag: (id: string) => Promise<{ success: boolean }>;
      listTags: () => Promise<any[]>;
      searchTags: (query: string) => Promise<any[]>;

      listTrash: () => Promise<TrashNote[]>;
      restoreFromTrash: (noteId: string) => Promise<{ success: boolean }>;
      deleteNotePermanent: (noteId: string) => Promise<{ success: boolean }>;
      emptyTrash: () => Promise<{ success: boolean; count: number }>;
      autoPurgeTrash: () => Promise<{ success: boolean; count: number }>;

      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<{ success: boolean }>;

      createBackup: (options: { type: 'manual' | 'auto'; format: 'json' | 'sqlite' }) => Promise<BackupResult>;
      listBackups: () => Promise<BackupInfo[]>;
      deleteBackup: (backupId: string) => Promise<{ success: boolean }>;
      getBackupFolderPath: () => Promise<string>;
      openBackupFolder: () => Promise<{ success: boolean; error?: string }>;
      restoreBackup: () => Promise<{ success: boolean; error?: string }>;

      uploadAttachment: (noteId: string) => Promise<AttachmentData>;
      listAttachments: (noteId: string) => Promise<AttachmentData[]>;
      deleteAttachment: (attachmentId: string) => Promise<{ success: boolean; error?: string }>;
      getAttachmentUrl: (attachmentId: string) => Promise<string>;
      openAttachment: (attachmentId: string) => Promise<void>;
    };
  }
}
