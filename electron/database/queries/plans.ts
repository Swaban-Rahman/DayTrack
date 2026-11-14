import { getDb } from '../init';
import type { DailyPlan, DailySummary } from '../../../src/types/index';

export function getDailyPlan(date: string): DailyPlan | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM daily_plans WHERE plan_date = ?');
  return (stmt.get(date) as DailyPlan) || null;
}

export function saveDailyPlan(date: string, notes: string): DailyPlan {
  const db = getDb();
  // Upsert: insert or update if plan_date already exists
  const existing = getDailyPlan(date);
  if (existing) {
    db.prepare(
      "UPDATE daily_plans SET notes = ?, updated_at = datetime('now','localtime') WHERE plan_date = ?"
    ).run(notes, date);
  } else {
    db.prepare(
      'INSERT INTO daily_plans (plan_date, notes) VALUES (?, ?)'
    ).run(date, notes);
  }
  return getDailyPlan(date)!;
}

export function getDailySummary(date: string): DailySummary | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM daily_summaries WHERE summary_date = ?');
  return (stmt.get(date) as DailySummary) || null;
}

export function saveDailySummary(date: string, notes: string): DailySummary {
  const db = getDb();

  // Calculate stats from tasks for this date
  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total_tasks,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_tasks,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END), 0) as pending_tasks
    FROM tasks WHERE scheduled_date = ? AND is_deleted = 0
  `).get(date) as { total_tasks: number; completed_tasks: number; pending_tasks: number };

  // Calculate total tracked minutes from sessions for tasks on this date
  const trackedMinutes = db.prepare(`
    SELECT COALESCE(SUM(ts.duration_seconds), 0) as total_seconds
    FROM task_sessions ts
    INNER JOIN tasks t ON ts.task_id = t.id
    WHERE t.scheduled_date = ? AND t.is_deleted = 0
  `).get(date) as { total_seconds: number };

  const totalTrackedMinutes = Math.round(trackedMinutes.total_seconds / 60);

  // Upsert
  const existing = getDailySummary(date);
  if (existing) {
    db.prepare(`
      UPDATE daily_summaries SET
        total_tracked_minutes = ?,
        total_tasks = ?,
        completed_tasks = ?,
        pending_tasks = ?,
        notes = ?
      WHERE summary_date = ?
    `).run(
      totalTrackedMinutes,
      taskStats.total_tasks,
      taskStats.completed_tasks,
      taskStats.pending_tasks,
      notes,
      date
    );
  } else {
    db.prepare(`
      INSERT INTO daily_summaries (summary_date, total_tracked_minutes, total_tasks, completed_tasks, pending_tasks, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      date,
      totalTrackedMinutes,
      taskStats.total_tasks,
      taskStats.completed_tasks,
      taskStats.pending_tasks,
      notes
    );
  }

  return getDailySummary(date)!;
}
