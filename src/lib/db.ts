import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

// Support both new and legacy database paths for backward compatibility
const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'floppy-disk.db');
const LEGACY_DB_PATH = join(process.cwd(), 'data', 'socialscrubb.db');

const DB_PATH = process.env.DATABASE_PATH || 
  (existsSync(LEGACY_DB_PATH) ? LEGACY_DB_PATH : DEFAULT_DB_PATH);

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = require('path').dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      source_type TEXT NOT NULL,
      filename TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL,
      total_records INTEGER DEFAULT 0,
      processed_records INTEGER DEFAULT 0,
      failed_records INTEGER DEFAULT 0,
      error_message TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_id TEXT,
      record_type TEXT NOT NULL,
      author_name TEXT,
      text TEXT,
      timestamp INTEGER,
      timezone TEXT,
      permalink TEXT,
      permalink_status TEXT,
      visibility TEXT,
      parent_id TEXT,
      shared_content TEXT,
      owner_commentary TEXT,
      has_media INTEGER DEFAULT 0,
      media_metadata TEXT,
      conversation_context TEXT,
      import_warnings TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      model_version TEXT,
      analyzed_at INTEGER NOT NULL,
      priority TEXT NOT NULL,
      priority_score INTEGER,
      professional_assessment TEXT,
      faith_context_assessment TEXT,
      supporting_excerpts TEXT,
      concerns TEXT,
      severity TEXT,
      confidence REAL,
      context_notes TEXT,
      uncertainty TEXT,
      policy_version TEXT,
      suggested_action TEXT,
      media_reviewed INTEGER DEFAULT 0,
      raw_output TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_actions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_import ON posts(import_id);
    CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
    CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_posts_platform_id ON posts(platform_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_post ON analysis_results(post_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_priority ON analysis_results(priority);
    CREATE INDEX IF NOT EXISTS idx_review_post ON review_actions(post_id);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
