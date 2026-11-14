import { getDb } from '../init';
import type { DailyPlan, DailySummary } from '../../../src/types/index';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string): void {
  if (!DATE_RE.test(date)) throw new Error('Date must use YYYY-MM-DD format');
}

export function getDailyPlan(date: string): DailyPlan | null {
  assertDate(date);
  return (getDb().prepare('SELECT * FROM daily_plans WHERE plan_date = ?').get(date) as DailyPlan) || null;
}

export function saveDailyPlan(date: string, notes: string): DailyPlan {
  assertDate(date);
  const db = getDb();
  const existing = getDailyPlan(date);
  if (existing) {
    db.prepare(
      "UPDATE daily_plans SET notes = ?, updated_at = datetime('now','localtime') WHERE plan_date = ?"
    ).run(notes, date);
  } else {
    db.prepare('INSERT INTO daily_plans (plan_date, notes) VALUES (?, ?)').run(date, notes);
  }
  return getDailyPlan(date)!;
}

export function getDailySummary(date: string): DailySummary | null {
  assertDate(date);
  return (getDb().prepare('SELECT * FROM daily_summaries WHERE summary_date = ?').get(date) as DailySummary) || null;
}

export function saveDailySummary(date: string, notes: string): DailySummary {
  assertDate(date);
  const db = getDb();

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total_tasks,
      COALESCE(SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_tasks,
      COALESCE(SUM(CASE WHEN d.status IN ('pending', 'in_progress') THEN 1 ELSE 0 END), 0) as pending_tasks
    FROM task_day_logs d
    INNER JOIN tasks t ON t.id = d.task_id
    WHERE d.day = ? AND t.is_deleted = 0
  `).get(date) as { total_tasks: number; completed_tasks: number; pending_tasks: number };

  const trackedMinutes = db.prepare(`
    SELECT COALESCE(SUM(s.duration_seconds), 0) as total_seconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date = ? AND s.is_active = 0 AND t.is_deleted = 0
  `).get(date) as { total_seconds: number };

  const adjustments = db.prepare(`
    SELECT COALESCE(SUM(a.adjusted_minutes), 0) as total_minutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date = ? AND t.is_deleted = 0
  `).get(date) as { total_minutes: number };

  const totalTrackedMinutes = Math.max(0, Math.round(trackedMinutes.total_seconds / 60) + adjustments.total_minutes);

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
