import { getDb } from '../init';
import type { DistractionLog, CreateDistractionInput, LogKind } from '../../../src/types/index';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string): void {
  if (!DATE_RE.test(date)) throw new Error('Date must use YYYY-MM-DD format');
}

export function logDistraction(input: CreateDistractionInput): DistractionLog {
  assertDate(input.log_date);
  const category = (input.category || '').trim();
  if (!category) throw new Error('Log category is required');

  const minutes = Math.round(Number(input.duration_minutes));
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Duration must be greater than 0');
  if (minutes > 24 * 60) throw new Error('A single log entry cannot exceed 24 hours');

  const kind: LogKind = input.kind === 'break' ? 'break' : 'distraction';

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO distraction_logs (log_date, kind, category, duration_minutes, description) VALUES (?, ?, ?, ?, ?)'
  ).run(input.log_date, kind, category, minutes, (input.description || '').trim());

  return db.prepare('SELECT * FROM distraction_logs WHERE id = ?').get(result.lastInsertRowid) as DistractionLog;
}

export function getDistractions(date: string): DistractionLog[] {
  assertDate(date);
  return getDb().prepare(
    'SELECT * FROM distraction_logs WHERE log_date = ? ORDER BY created_at DESC, id DESC'
  ).all(date) as DistractionLog[];
}

export function getDistractionsByRange(startDate: string, endDate: string): DistractionLog[] {
  assertDate(startDate);
  assertDate(endDate);
  return getDb().prepare(
    'SELECT * FROM distraction_logs WHERE log_date >= ? AND log_date <= ? ORDER BY log_date ASC, created_at DESC'
  ).all(startDate, endDate) as DistractionLog[];
}

export function deleteDistraction(id: number): void {
  getDb().prepare('DELETE FROM distraction_logs WHERE id = ?').run(id);
}
