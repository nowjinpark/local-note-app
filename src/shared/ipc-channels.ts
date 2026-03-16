// IPC 채널 이름 상수 정의

export const IPC_CHANNELS = {
  // Note 관련
  NOTE_CREATE: 'db:note:create',
  NOTE_UPDATE: 'db:note:update',
  NOTE_DELETE: 'db:note:delete',
  NOTE_GET: 'db:note:get',
  NOTE_LIST: 'db:note:list',
  NOTE_SEARCH: 'db:note:search',
  NOTE_EXPORT: 'db:note:export',

  // Category 관련
  CATEGORY_CREATE: 'db:category:create',
  CATEGORY_UPDATE: 'db:category:update',
  CATEGORY_DELETE: 'db:category:delete',
  CATEGORY_GET: 'db:category:get',
  CATEGORY_LIST: 'db:category:list',

  // Tag 관련
  TAG_CREATE: 'db:tag:create',
  TAG_DELETE: 'db:tag:delete',
  TAG_LIST: 'db:tag:list',
  TAG_SEARCH: 'db:tag:search',

  // Trash 관련
  TRASH_LIST: 'db:trash:list',
  TRASH_RESTORE: 'db:trash:restore',
  TRASH_DELETE_PERMANENT: 'db:trash:delete-permanent',
  TRASH_EMPTY: 'db:trash:empty',
  TRASH_AUTO_PURGE: 'db:trash:auto-purge',

  // Settings 관련
  SETTINGS_GET: 'db:settings:get',
  SETTINGS_SET: 'db:settings:set',

  // Backup 관련
  BACKUP_CREATE: 'db:backup:create',
  BACKUP_LIST: 'db:backup:list',
  BACKUP_DELETE: 'db:backup:delete',
  BACKUP_EXPORT_PATH: 'db:backup:export-path',
  BACKUP_OPEN_FOLDER: 'db:backup:open-folder',
  BACKUP_RESTORE: 'db:backup:restore',

  // Attachment 관련
  ATTACHMENT_UPLOAD: 'db:attachment:upload',
  ATTACHMENT_LIST: 'db:attachment:list',
  ATTACHMENT_DELETE: 'db:attachment:delete',
  ATTACHMENT_GET_URL: 'db:attachment:get-url',
  ATTACHMENT_OPEN: 'db:attachment:open',
} as const;
