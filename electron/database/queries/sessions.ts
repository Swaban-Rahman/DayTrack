import { getDb } from '../init';
import { getSetting, setSetting } from './settings';
import { localDateString } from '../../utils/dates';
import type {
  TaskSession,
  Task,
  SessionWithTask,
  ActiveTimerContext,
  TimeAdjustment,
  UpdateSessionInput,
} from '../../../src/types/index';

const PAUSED_TASK_KEY = 'timerPausedTaskId';
const PAUSED_SESSION_KEY = 'timerPausedSessionId';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nowIso(): string {
  return new Date().toISOString();
}

function getTask(taskId: number): Task | null {
  return (getDb().prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(taskId) as Task) || null;
}

export function startSession(taskId: number): TaskSession {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error('Task not found');
  if (task.status === 'completed') throw new Error('Cannot start a timer on a completed task');

  // Only one timer may run at a time.
  const activeSession = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1')
    .get() as TaskSession | undefined;
  if (activeSession) {
    if (activeSession.task_id === taskId) return activeSession;
    pauseSession(activeSession.id);
  }

  const now = nowIso();
  const result = db.prepare(`
    INSERT INTO task_sessions (task_id, session_date, start_time, is_active, last_heartbeat)
    VALUES (?, ?, ?, 1, ?)
  `).run(taskId, localDateString(), now, now);

  db.prepare(`
    UPDATE tasks SET status = 'in_progress', updated_at = datetime('now','localtime')
    WHERE id = ? AND status = 'pending'
  `).run(taskId);
  db.prepare(`
    UPDATE task_day_logs SET status = 'in_progress', updated_at = datetime('now','localtime')
    WHERE task_id = ? AND day = ? AND status = 'pending'
  `).run(taskId, task.scheduled_date);

  setSetting(PAUSED_TASK_KEY, '');
  setSetting(PAUSED_SESSION_KEY, '');

  return db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(result.lastInsertRowid) as TaskSession;
}

export function pauseSession(sessionId: number): TaskSession {
  const db = getDb();
  const session = db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(sessionId) as TaskSession | undefined;
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (!session.is_active) return session;

  const now = nowIso();
  const startTime = new Date(session.start_time).getTime();
  const endTime = Date.parse(now);
  const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));

  db.prepare(`
    UPDATE task_sessions SET end_time = ?, duration_seconds = ?, is_active = 0, last_heartbeat = ?
    WHERE id = ?
  `).run(now, durationSeconds, now, sessionId);

  updateTaskActualMinutes(session.task_id);

  setSetting(PAUSED_TASK_KEY, String(session.task_id));
  setSetting(PAUSED_SESSION_KEY, String(sessionId));

  return db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(sessionId) as TaskSession;
}

export function stopSession(sessionId: number): TaskSession {
  const session = pauseSession(sessionId);
  clearPausedContext();
  return session;
}

export function clearPausedContext(): void {
  setSetting(PAUSED_TASK_KEY, '');
  setSetting(PAUSED_SESSION_KEY, '');
}

export function stopSessionsForTask(taskId: number): void {
  const db = getDb();
  const active = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1 AND task_id = ?').get(taskId) as TaskSession | undefined;
  if (active) {
    pauseSession(active.id);
  }
  const pausedTaskId = getSetting(PAUSED_TASK_KEY);
  if (pausedTaskId === String(taskId)) {
    clearPausedContext();
  }
}

export function getActiveSession(): ActiveTimerContext | null {
  const db = getDb();

  const session = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1')
    .get() as TaskSession | undefined;

  if (session) {
    const task = getTask(session.task_id);
    if (task) return { session, task, isRunning: true };
    // Orphaned session (task deleted) — close it so it cannot keep accruing time.
    pauseSession(session.id);
    clearPausedContext();
    return null;
  }

  const pausedTaskIdRaw = getSetting(PAUSED_TASK_KEY);
  const pausedTaskId = pausedTaskIdRaw ? Number(pausedTaskIdRaw) : NaN;
  if (!Number.isFinite(pausedTaskId)) return null;

  const task = getTask(pausedTaskId);
  if (!task || task.status === 'completed') {
    clearPausedContext();
    return null;
  }

  const sessionIdRaw = getSetting(PAUSED_SESSION_KEY);
  const sessionId = sessionIdRaw ? Number(sessionIdRaw) : NaN;
  let lastSession: TaskSession | null = null;
  if (Number.isFinite(sessionId)) {
    lastSession = (db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(sessionId) as TaskSession) || null;
  }
  if (!lastSession) {
    lastSession = (db.prepare(
      'SELECT * FROM task_sessions WHERE task_id = ? ORDER BY id DESC LIMIT 1'
    ).get(pausedTaskId) as TaskSession) || null;
  }

  return { session: lastSession, task, isRunning: false };
}

export function touchActiveSession(): void {
  const db = getDb();
  db.prepare("UPDATE task_sessions SET last_heartbeat = ? WHERE is_active = 1").run(nowIso());
}

export function getTaskSessions(taskId: number): TaskSession[] {
  const db = getDb();
  return db.prepare('SELECT * FROM task_sessions WHERE task_id = ? ORDER BY start_time DESC').all(taskId) as TaskSession[];
}

export function getSessionsByDate(date: string): SessionWithTask[] {
  if (!DATE_RE.test(date)) throw new Error('Date must use YYYY-MM-DD format');
  const db = getDb();
  return db.prepare(`
    SELECT s.*, t.title AS task_title, t.category AS task_category
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date = ? AND t.is_deleted = 0
    ORDER BY s.start_time ASC
  `).all(date) as SessionWithTask[];
}

export function updateSessionTimes(input: UpdateSessionInput): TaskSession {
  const db = getDb();
  const session = db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(input.id) as TaskSession | undefined;
  if (!session) throw new Error('Session not found');
  if (session.is_active) throw new Error('Pause the timer before editing its times');

  const startMs = Date.parse(input.start_time);
  const endMs = Date.parse(input.end_time);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error('Invalid session dates');
  if (endMs <= startMs) throw new Error('End time must be after start time');

  const durationSeconds = Math.floor((endMs - startMs) / 1000);
  const sessionDate = localDateString(new Date(startMs));
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  db.prepare(`
    UPDATE task_sessions
    SET start_time = ?, end_time = ?, duration_seconds = ?, session_date = ?, last_heartbeat = ?
    WHERE id = ?
  `).run(startIso, endIso, durationSeconds, sessionDate, endIso, input.id);

  updateTaskActualMinutes(session.task_id);
  return db.prepare('SELECT * FROM task_sessions WHERE id = ?').get(input.id) as TaskSession;
}

export function adjustTime(taskId: number, minutes: number, reason: string, date?: string): TimeAdjustment {
  const db = getDb();
  if (!getTask(taskId)) throw new Error('Task not found');
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value) || value === 0) throw new Error('Adjustment must be a non-zero number of minutes');
  if (Math.abs(value) > 24 * 60) throw new Error('A single adjustment cannot exceed 24 hours');

  const adjustmentDate = date && DATE_RE.test(date) ? date : localDateString();

  const result = db.prepare(
    'INSERT INTO time_adjustments (task_id, adjustment_date, adjusted_minutes, reason) VALUES (?, ?, ?, ?)'
  ).run(taskId, adjustmentDate, value, (reason || '').trim());

  updateTaskActualMinutes(taskId);
  return db.prepare('SELECT * FROM time_adjustments WHERE id = ?').get(result.lastInsertRowid) as TimeAdjustment;
}

export function getTaskAdjustments(taskId: number): TimeAdjustment[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM time_adjustments WHERE task_id = ? ORDER BY created_at DESC, id DESC'
  ).all(taskId) as TimeAdjustment[];
}

export function deleteTimeAdjustment(id: number): void {
  const db = getDb();
  const row = db.prepare('SELECT * FROM time_adjustments WHERE id = ?').get(id) as
    | { task_id: number }
    | undefined;
  if (!row) return;
  db.prepare('DELETE FROM time_adjustments WHERE id = ?').run(id);
  updateTaskActualMinutes(row.task_id);
}

export function recoverTimers(): number {
  const db = getDb();
  const activeSessions = db.prepare('SELECT * FROM task_sessions WHERE is_active = 1').all() as TaskSession[];
  if (activeSessions.length === 0) return 0;

  const now = Date.now();
  const updateStmt = db.prepare(`
    UPDATE task_sessions SET end_time = ?, duration_seconds = ?, is_active = 0, last_heartbeat = ?
    WHERE id = ?
  `);

  let lastRecoveredTaskId: number | null = null;
  let lastRecoveredSessionId: number | null = null;

  const recoverTransaction = db.transaction(() => {
    for (const session of activeSessions) {
      const startMs = new Date(session.start_time).getTime();
      // The heartbeat is the last moment the app proved it was alive. Falling back to the
      // start time is deliberate: an old/corrupt row must not create hours of phantom work.
      const heartbeatMs = session.last_heartbeat
        ? new Date(session.last_heartbeat).getTime()
        : startMs;
      const safeEnd = Math.max(startMs, Math.min(heartbeatMs, now));
      const durationSeconds = Math.floor((safeEnd - startMs) / 1000);
      const endIso = new Date(safeEnd).toISOString();

      updateStmt.run(endIso, durationSeconds, endIso, session.id);
      updateTaskActualMinutes(session.task_id);
      lastRecoveredTaskId = session.task_id;
      lastRecoveredSessionId = session.id;
    }
  });

  recoverTransaction();

  if (lastRecoveredTaskId !== null && lastRecoveredSessionId !== null) {
    const task = getTask(lastRecoveredTaskId);
    if (task && task.status !== 'completed') {
      setSetting(PAUSED_TASK_KEY, String(lastRecoveredTaskId));
      setSetting(PAUSED_SESSION_KEY, String(lastRecoveredSessionId));
    } else {
      clearPausedContext();
    }
  }

  return activeSessions.length;
}

export function updateTaskActualMinutes(taskId: number): void {
  const db = getDb();

  const sessionSum = db.prepare(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM task_sessions WHERE task_id = ? AND is_active = 0'
  ).get(taskId) as { total: number };

  const adjustmentSum = db.prepare(
    'SELECT COALESCE(SUM(adjusted_minutes), 0) as total FROM time_adjustments WHERE task_id = ?'
  ).get(taskId) as { total: number };

  const totalMinutes = Math.max(0, Math.round(sessionSum.total / 60) + adjustmentSum.total);

  db.prepare("UPDATE tasks SET actual_minutes = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(totalMinutes, taskId);
}
