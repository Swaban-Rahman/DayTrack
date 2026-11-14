import { getDb } from '../init';
import type { TaskSession, Task } from '../../../src/types/index';

export function startSession(taskId: number): TaskSession {
  const db = getDb();

  // Deactivate any currently active session (pause it)
  const activeSession = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1').get() as TaskSession | undefined;
  if (activeSession) {
    pauseSession(activeSession.id);
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO task_sessions (task_id, start_time, is_active) VALUES (?, ?, 1)'
  );
  const result = stmt.run(taskId, now);

  // Also mark the task as in_progress
  db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now','localtime') WHERE id = ? AND status = 'pending'").run(taskId);

  return db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(result.lastInsertRowid) as TaskSession;
}

export function pauseSession(sessionId: number): TaskSession {
  const db = getDb();
  const session = db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(sessionId) as TaskSession | undefined;
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const now = new Date().toISOString();
  const startTime = new Date(session.start_time).getTime();
  const endTime = new Date(now).getTime();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  db.prepare(
    'UPDATE task_sessions SET end_time = ?, duration_seconds = ?, is_active = 0 WHERE id = ?'
  ).run(now, durationSeconds, sessionId);

  // Recalculate actual_minutes for the task
  updateTaskActualMinutes(session.task_id);

  return db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(sessionId) as TaskSession;
}

export function stopSession(sessionId: number): TaskSession {
  // Stop is the same as pause — ends the session and calculates duration
  return pauseSession(sessionId);
}

export function getActiveSession(): { session: TaskSession; task: Task } | null {
  const db = getDb();
  const session = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1').get() as TaskSession | undefined;
  if (!session) return null;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(session.task_id) as Task | undefined;
  if (!task) return null;

  return { session, task };
}

export function getTaskSessions(taskId: number): TaskSession[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM task_sessions WHERE task_id = ? ORDER BY start_time DESC');
  return stmt.all(taskId) as TaskSession[];
}

export function adjustTime(taskId: number, minutes: number, reason: string) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO time_adjustments (task_id, adjusted_minutes, reason) VALUES (?, ?, ?)'
  );
  const result = stmt.run(taskId, minutes, reason);
  updateTaskActualMinutes(taskId);
  return db.prepare('SELECT * FROM time_adjustments WHERE id = ?').get(result.lastInsertRowid);
}

export function recoverTimers(): void {
  const db = getDb();
  // Find all sessions still marked as active (app crashed/closed while timer running)
  const activeSessions = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1').all() as TaskSession[];

  const now = new Date().toISOString();
  const updateStmt = db.prepare(
    'UPDATE task_sessions SET end_time = ?, duration_seconds = ?, is_active = 0 WHERE id = ?'
  );

  const recoverTransaction = db.transaction(() => {
    for (const session of activeSessions) {
      const startTime = new Date(session.start_time).getTime();
      const endTime = new Date(now).getTime();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      updateStmt.run(now, durationSeconds, session.id);
      updateTaskActualMinutes(session.task_id);
    }
  });

  recoverTransaction();
}

export function updateTaskActualMinutes(taskId: number): void {
  const db = getDb();

  // Sum duration from all completed sessions
  const sessionSum = db.prepare(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM task_sessions WHERE task_id = ? AND is_active = 0'
  ).get(taskId) as { total: number };

  // Sum time adjustments
  const adjustmentSum = db.prepare(
    'SELECT COALESCE(SUM(adjusted_minutes), 0) as total FROM time_adjustments WHERE task_id = ?'
  ).get(taskId) as { total: number };

  const totalMinutes = Math.max(0, Math.round(sessionSum.total / 60) + adjustmentSum.total);

  db.prepare("UPDATE tasks SET actual_minutes = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(totalMinutes, taskId);
}
