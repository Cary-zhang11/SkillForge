import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.SKILLFORGE_DB || join(process.cwd(), 'data', 'skillforge.db');

export const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    interactive INTEGER NOT NULL DEFAULT 0,
    config TEXT,
    skill_path TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(name, version)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    skill_version TEXT NOT NULL,
    inputs TEXT NOT NULL,
    file_ids TEXT NOT NULL,
    mode TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    error_message TEXT,
    result_file_ids TEXT,
    container_id TEXT,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    task_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
`);

export function initDb(): void {
  // Schema is created on module load; this function exists for explicit initialization if needed
  console.log('Database initialized at:', DB_PATH);
}
