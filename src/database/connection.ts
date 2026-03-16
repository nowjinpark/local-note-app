import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { runMigrations } from './migrations';

// 데이터베이스 인스턴스
let db: Database.Database | null = null;

// 데이터베이스 초기화 함수
export function initializeDatabase(): Database.Database {
  try {
    // 데이터베이스 파일 경로 (사용자 데이터 폴더) - app.ready 이후에만 호출 가능
    const DB_PATH = path.join(app.getPath('userData'), 'data.db');
    console.log('Database path:', DB_PATH);

    // 데이터베이스 파일이 있는 디렉토리 확인
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 데이터베이스 연결
    db = new Database(DB_PATH);

    // WAL 모드 활성화 (성능 향상)
    db.pragma('journal_mode = WAL');
    console.log('✅ WAL mode enabled');

    // 테이블 생성
    createTables(db);

    // 마이그레이션 실행
    runMigrations(db);

    console.log('✅ Database connected successfully');
    return db;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// 테이블 생성
function createTables(database: Database.Database): void {
  // Category 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE CASCADE
    );
  `);

  // Note 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS note (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category_id TEXT,
      parent_id TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_id) REFERENCES note(id) ON DELETE CASCADE
    );
  `);

  // is_pinned 컬럼 마이그레이션 (기존 테이블에 추가)
  try {
    database.exec(`ALTER TABLE note ADD COLUMN is_pinned INTEGER DEFAULT 0`);
  } catch (e) {
    // 컬럼이 이미 존재하면 에러 무시
  }

  // Tag 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS tag (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // NoteTag 관계 테이블 (다대다)
  database.exec(`
    CREATE TABLE IF NOT EXISTS note_tag (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
    );
  `);

  // 인덱스 생성 (성능 향상)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_note_title ON note(title);
    CREATE INDEX IF NOT EXISTS idx_note_category ON note(category_id);
    CREATE INDEX IF NOT EXISTS idx_note_pinned ON note(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_note_updated ON note(updated_at);
    CREATE INDEX IF NOT EXISTS idx_category_parent ON category(parent_id);
  `);

  console.log('✅ Database tables created');
}

// 데이터베이스 인스턴스 가져오기
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// 데이터베이스 종료 함수
export function closeDatabase(): void {
  try {
    if (db) {
      db.close();
      db = null;
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}
