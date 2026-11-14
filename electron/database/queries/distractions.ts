import { getDb } from '../init';
import type { DistractionLog, CreateDistractionInput } from '../../../src/types/index';

export function logDistraction(input: CreateDistractionInput): DistractionLog {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO distraction_logs (log_date, category, duration_minutes, description) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(
    input.log_date,
    input.category,
    input.duration_minutes,
    input.description
  );
  return db.prepare('SELECT * FROM distraction_logs WHERE id = ?').get(result.lastInsertRowid) as DistractionLog;
}

export function getDistractions(date: string): DistractionLog[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM distraction_logs WHERE log_date = ? ORDER BY created_at DESC');
  return stmt.all(date) as DistractionLog[];
}

export function getDistractionsByRange(startDate: string, endDate: string): DistractionLog[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM distraction_logs WHERE log_date >= ? AND log_date <= ? ORDER BY log_date ASC, created_at DESC'
  );
  return stmt.all(startDate, endDate) as DistractionLog[];
}

export function deleteDistraction(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM distraction_logs WHERE id = ?').run(id);
}
