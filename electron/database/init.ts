import Database from 'better-sqlite3';
import { SCHEMA, DEFAULT_SETTINGS, INSERT_DEFAULT_SETTINGS } from './schema';

let db: Database.Database | null = null;

function hasColumn(database: Database.Database, table: string, column: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

function migrate(database: Database.Database): void {
  const run = database.transaction(() => {
    if (!hasColumn(database, 'task_sessions', 'session_date')) {
      database.exec('ALTER TABLE task_sessions ADD COLUMN session_date TEXT');
      database.exec(
        "UPDATE task_sessions SET session_date = date(start_time, 'localtime') WHERE session_date IS NULL"
      );
    }
    if (!hasColumn(database, 'task_sessions', 'last_heartbeat')) {
      database.exec('ALTER TABLE task_sessions ADD COLUMN last_heartbeat TEXT');
      database.exec(
        'UPDATE task_sessions SET last_heartbeat = COALESCE(end_time, start_time) WHERE last_heartbeat IS NULL'
      );
    }
    if (!hasColumn(database, 'time_adjustments', 'adjustment_date')) {
      database.exec('ALTER TABLE time_adjustments ADD COLUMN adjustment_date TEXT');
      database.exec(
        "UPDATE time_adjustments SET adjustment_date = date(created_at, 'localtime') WHERE adjustment_date IS NULL"
      );
    }
    if (!hasColumn(database, 'distraction_logs', 'kind')) {
      database.exec("ALTER TABLE distraction_logs ADD COLUMN kind TEXT DEFAULT 'distraction'");
    }

    // Backfill the per-day history for databases created before it existed.
    database.exec(`
      INSERT OR IGNORE INTO task_day_logs (task_id, day, status)
      SELECT id, scheduled_date, status FROM tasks
    `);
    database.exec(`
      INSERT OR IGNORE INTO task_day_logs (task_id, day, status)
      SELECT id, carried_forward_from, 'pending' FROM tasks
      WHERE carried_forward_from IS NOT NULL AND carried_forward_from <> scheduled_date
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_sessions_date ON task_sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_time_adjustments_date ON time_adjustments(adjustment_date);
      CREATE INDEX IF NOT EXISTS idx_task_day_logs_day ON task_day_logs(day);
    `);
  });

  run();
}

export function initDatabase(dbPath: string): Database.Database {
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(SCHEMA);
  migrate(db);

  const insertSetting = db.prepare(INSERT_DEFAULT_SETTINGS);
  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value);
    }
  });
  insertMany();

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function isDbOpen(): boolean {
  return db !== null;
}

export function checkpoint(): void {
  if (db) {
    db.pragma('wal_checkpoint(TRUNCATE)');
  }
}

export function closeDb(): void {
  if (db) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // Database may already be closed.
    }
    db.close();
    db = null;
  }
}
