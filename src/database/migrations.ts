import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_soft_delete',
    up: (db) => {
      db.exec(`
        ALTER TABLE note ADD COLUMN deleted_at TEXT DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_note_deleted ON note(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_note_deleted_at_value ON note(deleted_at)
          WHERE deleted_at IS NOT NULL;
      `);
      console.log('✅ Migration 1: Added soft delete support');
    }
  },
  {
    version: 2,
    name: 'create_settings_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO app_settings (key, value, updated_at)
        VALUES ('trash_retention_days', '30', datetime('now'));
      `);
      console.log('✅ Migration 2: Created settings table');
    }
  },
  {
    version: 3,
    name: 'create_attachment_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS attachment (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          stored_filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_attachment_note ON attachment(note_id);
        CREATE INDEX IF NOT EXISTS idx_attachment_created ON attachment(created_at);
      `);
      console.log('✅ Migration 3: Created attachment table');
    }
  },
  {
    version: 4,
    name: 'create_backup_history',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS backup_history (
          id TEXT PRIMARY KEY,
          backup_path TEXT NOT NULL,
          backup_type TEXT NOT NULL,
          backup_format TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          notes_count INTEGER NOT NULL,
          categories_count INTEGER NOT NULL,
          tags_count INTEGER NOT NULL,
          attachments_count INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_history(created_at DESC);

        INSERT OR IGNORE INTO app_settings (key, value, updated_at)
        VALUES
          ('auto_backup_enabled', 'false', datetime('now')),
          ('auto_backup_interval_hours', '24', datetime('now')),
          ('last_auto_backup', '', datetime('now'));
      `);
      console.log('✅ Migration 4: Created backup history table');
    }
  }
];

// 버전 추적 테이블 초기화
export function initializeMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

// 마이그레이션 실행
export function runMigrations(db: Database.Database): void {
  initializeMigrations(db);

  const currentVersion = db.prepare(
    'SELECT MAX(version) as version FROM schema_version'
  ).get() as { version: number | null };

  const startVersion = currentVersion?.version || 0;

  console.log(`📊 Current schema version: ${startVersion}`);

  const pendingMigrations = migrations
    .filter(m => m.version > startVersion)
    .sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    console.log('✅ Database is up to date');
    return;
  }

  console.log(`🔄 Running ${pendingMigrations.length} migration(s)...`);

  pendingMigrations.forEach(migration => {
    console.log(`Running migration ${migration.version}: ${migration.name}`);

    db.transaction(() => {
      migration.up(db);
      db.prepare(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)'
      ).run(migration.version, new Date().toISOString());
    })();

    console.log(`✅ Migration ${migration.version} completed`);
  });

  console.log('✅ All migrations completed successfully');
}
