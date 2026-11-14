import Database from 'better-sqlite3';
import { SCHEMA, DEFAULT_SETTINGS, INSERT_DEFAULT_SETTINGS } from './schema';

let db: Database.Database | null = null;

export function initDatabase(dbPath: string): Database.Database {
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  // Enable foreign key enforcement
  db.pragma('foreign_keys = ON');

  // Run schema creation
  db.exec(SCHEMA);

  // Insert default settings if they don't exist
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

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
