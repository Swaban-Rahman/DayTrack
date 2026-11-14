import { getDb } from '../init';
import { localDateString } from '../../utils/dates';
import type {
  DailyAnalytics,
  WeeklyAnalytics,
  CategoryBreakdown,
  EstimatedVsActual,
  TaskTimeBreakdown,
  TaskCategory,
  TaskSession,
} from '../../../src/types/index';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value: string): void {
  if (!DATE_RE.test(value)) throw new Error('Date must use YYYY-MM-DD format');
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function getActiveSession(): TaskSession | null {
  return (getDb().prepare('SELECT * FROM task_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1')
    .get() as TaskSession) || null;
}

function getActiveElapsed(session: TaskSession | null, date: string): number {
  if (!session || session.session_date !== date) return 0;
  const start = new Date(session.start_time).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

interface SessionCategoryRow {
  category: TaskCategory;
  totalSeconds: number;
}

interface AdjustmentCategoryRow {
  category: TaskCategory;
  totalMinutes: number;
}

function getCategoryTotals(date: string): Map<string, number> {
  const db = getDb();
  const categories = new Map<string, number>();

  const sessionRows = db.prepare(`
    SELECT t.category, COALESCE(SUM(s.duration_seconds), 0) as totalSeconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date = ? AND s.is_active = 0 AND t.is_deleted = 0
    GROUP BY t.category
  `).all(date) as SessionCategoryRow[];

  for (const row of sessionRows) {
    categories.set(row.category, Math.round(row.totalSeconds / 60));
  }

  const activeSession = getActiveSession();
  if (activeSession && activeSession.session_date === date) {
    const category = db.prepare('SELECT category FROM tasks WHERE id = ?').get(activeSession.task_id) as
      | { category: string }
      | undefined;
    if (category) {
      const elapsed = getActiveElapsed(activeSession, date);
      categories.set(category.category, (categories.get(category.category) || 0) + Math.round(elapsed / 60));
    }
  }

  const adjustmentRows = db.prepare(`
    SELECT t.category, COALESCE(SUM(a.adjusted_minutes), 0) as totalMinutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date = ? AND t.is_deleted = 0
    GROUP BY t.category
  `).all(date) as AdjustmentCategoryRow[];

  for (const row of adjustmentRows) {
    categories.set(row.category, (categories.get(row.category) || 0) + row.totalMinutes);
  }

  return categories;
}

function getTaskTimeTotals(date: string): TaskTimeBreakdown[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.id as taskId, t.title as taskTitle, t.category,
           COALESCE(SUM(s.duration_seconds), 0) as totalSeconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date = ? AND s.is_active = 0 AND t.is_deleted = 0
    GROUP BY t.id, t.title, t.category
  `).all(date) as { taskId: number; taskTitle: string; category: TaskCategory; totalSeconds: number }[];

  const map = new Map<number, TaskTimeBreakdown>();
  for (const row of rows) {
    map.set(row.taskId, {
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      category: row.category,
      minutes: Math.round(row.totalSeconds / 60),
    });
  }

  const activeSession = getActiveSession();
  if (activeSession && activeSession.session_date === date) {
    const task = db.prepare('SELECT id, title, category FROM tasks WHERE id = ?').get(activeSession.task_id) as
      | { id: number; title: string; category: TaskCategory }
      | undefined;
    if (task) {
      const existing = map.get(task.id);
      const liveMinutes = Math.round(getActiveElapsed(activeSession, date) / 60);
      map.set(task.id, {
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        minutes: (existing?.minutes || 0) + liveMinutes,
      });
    }
  }

  const adjustmentRows = db.prepare(`
    SELECT t.id as taskId, t.title as taskTitle, t.category,
           COALESCE(SUM(a.adjusted_minutes), 0) as totalMinutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date = ? AND t.is_deleted = 0
    GROUP BY t.id, t.title, t.category
  `).all(date) as { taskId: number; taskTitle: string; category: TaskCategory; totalMinutes: number }[];

  for (const row of adjustmentRows) {
    const existing = map.get(row.taskId);
    map.set(row.taskId, {
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      category: row.category,
      minutes: (existing?.minutes || 0) + row.totalMinutes,
    });
  }

  return Array.from(map.values())
    .map((entry) => ({ ...entry, minutes: Math.max(0, entry.minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
}

function getLogTotals(date: string): { breakMinutes: number; distractionMinutes: number } {
  const rows = getDb().prepare(`
    SELECT kind, COALESCE(SUM(duration_minutes), 0) as minutes
    FROM distraction_logs WHERE log_date = ? GROUP BY kind
  `).all(date) as { kind: string; minutes: number }[];

  let breakMinutes = 0;
  let distractionMinutes = 0;
  for (const row of rows) {
    if (row.kind === 'break') breakMinutes += row.minutes;
    else distractionMinutes += row.minutes;
  }
  return { breakMinutes, distractionMinutes };
}

export function getDailyAnalytics(date: string): DailyAnalytics {
  assertDate(date);
  const db = getDb();

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as totalTasks,
      COALESCE(SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END), 0) as completedTasks,
      COALESCE(SUM(CASE WHEN d.status IN ('pending', 'in_progress') THEN 1 ELSE 0 END), 0) as pendingTasks,
      COALESCE(SUM(t.estimated_minutes), 0) as estimatedMinutes
    FROM task_day_logs d
    INNER JOIN tasks t ON t.id = d.task_id
    WHERE d.day = ? AND t.is_deleted = 0
  `).get(date) as {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    estimatedMinutes: number;
  };

  const sessionTracker = db.prepare(`
    SELECT COALESCE(SUM(s.duration_seconds), 0) as totalSeconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date = ? AND s.is_active = 0 AND t.is_deleted = 0
  `).get(date) as { totalSeconds: number };

  const adjustmentTotal = db.prepare(`
    SELECT COALESCE(SUM(a.adjusted_minutes), 0) as totalMinutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date = ? AND t.is_deleted = 0
  `).get(date) as { totalMinutes: number };

  const activeSession = getActiveSession();
  const activeSeconds = getActiveElapsed(activeSession, date);
  const logTotals = getLogTotals(date);

  const sessionMinutes = Math.round((sessionTracker.totalSeconds + activeSeconds) / 60);

  const categoryMap = getCategoryTotals(date);
  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, minutes]) => ({ category, minutes: Math.max(0, minutes) }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const taskTimeBreakdown = getTaskTimeTotals(date);
  const taskMinutes = new Map(taskTimeBreakdown.map((entry) => [entry.taskId, entry.minutes]));

  const dayTasks = db.prepare(`
    SELECT t.id, t.title, t.estimated_minutes, t.actual_minutes
    FROM task_day_logs d
    INNER JOIN tasks t ON t.id = d.task_id
    WHERE d.day = ? AND t.is_deleted = 0
  `).all(date) as { id: number; title: string; estimated_minutes: number; actual_minutes: number }[];

  const estimatedVsActual: EstimatedVsActual[] = dayTasks
    .map((task) => ({
      taskTitle: task.title,
      estimated: task.estimated_minutes,
      actual: taskMinutes.get(task.id) || 0,
    }))
    .filter((entry) => entry.estimated > 0 || entry.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 12);

  return {
    date,
    totalTrackedMinutes: Math.max(0, sessionMinutes + adjustmentTotal.totalMinutes),
    adjustmentMinutes: adjustmentTotal.totalMinutes,
    breakMinutes: logTotals.breakMinutes,
    distractionMinutes: logTotals.distractionMinutes,
    estimatedMinutes: taskStats.estimatedMinutes,
    totalTasks: taskStats.totalTasks,
    completedTasks: taskStats.completedTasks,
    pendingTasks: taskStats.pendingTasks,
    categoryBreakdown,
    estimatedVsActual,
    taskTimeBreakdown,
  };
}

export function getWeeklyAnalytics(weekStart: string): WeeklyAnalytics {
  assertDate(weekStart);
  const dailyData: DailyAnalytics[] = [];

  for (let i = 0; i < 7; i++) {
    dailyData.push(getDailyAnalytics(addDays(weekStart, i)));
  }

  const weekEnd = addDays(weekStart, 6);
  const totalTrackedMinutes = dailyData.reduce((sum, d) => sum + d.totalTrackedMinutes, 0);
  const totalCompletedTasks = dailyData.reduce((sum, d) => sum + d.completedTasks, 0);
  const daysWithData = dailyData.filter(
    (d) => d.totalTrackedMinutes > 0 || d.totalTasks > 0 || d.breakMinutes > 0 || d.distractionMinutes > 0
  ).length;

  return {
    weekStart,
    weekEnd,
    dailyData,
    totalTrackedMinutes,
    totalCompletedTasks,
    averageDailyMinutes: daysWithData > 0 ? Math.round(totalTrackedMinutes / daysWithData) : 0,
  };
}

export function getMonthlyAnalytics(year: number, month: number): DailyAnalytics[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const results: DailyAnalytics[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    results.push(getDailyAnalytics(dateStr));
  }

  return results;
}

export function getCategoryAnalytics(startDate: string, endDate: string): CategoryBreakdown[] {
  assertDate(startDate);
  assertDate(endDate);
  const db = getDb();

  const sessionRows = db.prepare(`
    SELECT t.category, COALESCE(SUM(s.duration_seconds), 0) as totalSeconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date >= ? AND s.session_date <= ? AND s.is_active = 0 AND t.is_deleted = 0
    GROUP BY t.category
  `).all(startDate, endDate) as SessionCategoryRow[];

  const map = new Map<string, number>();
  for (const row of sessionRows) {
    map.set(row.category, Math.round(row.totalSeconds / 60));
  }

  const activeSession = getActiveSession();
  if (activeSession && activeSession.session_date >= startDate && activeSession.session_date <= endDate) {
    const task = db.prepare('SELECT category FROM tasks WHERE id = ?').get(activeSession.task_id) as
      | { category: string }
      | undefined;
    if (task) {
      const elapsedMinutes = Math.round(getActiveElapsed(activeSession, activeSession.session_date) / 60);
      map.set(task.category, (map.get(task.category) || 0) + elapsedMinutes);
    }
  }

  const adjustmentRows = db.prepare(`
    SELECT t.category, COALESCE(SUM(a.adjusted_minutes), 0) as totalMinutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date >= ? AND a.adjustment_date <= ? AND t.is_deleted = 0
    GROUP BY t.category
  `).all(startDate, endDate) as AdjustmentCategoryRow[];

  for (const row of adjustmentRows) {
    map.set(row.category, (map.get(row.category) || 0) + row.totalMinutes);
  }

  return Array.from(map.entries())
    .map(([category, minutes]) => ({ category, minutes: Math.max(0, minutes) }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export function getTaskTimeBreakdown(startDate: string, endDate: string): TaskTimeBreakdown[] {
  assertDate(startDate);
  assertDate(endDate);
  const db = getDb();

  const rows = db.prepare(`
    SELECT t.id as taskId, t.title as taskTitle, t.category,
           COALESCE(SUM(s.duration_seconds), 0) as totalSeconds
    FROM task_sessions s
    INNER JOIN tasks t ON t.id = s.task_id
    WHERE s.session_date >= ? AND s.session_date <= ? AND s.is_active = 0 AND t.is_deleted = 0
    GROUP BY t.id, t.title, t.category
  `).all(startDate, endDate) as { taskId: number; taskTitle: string; category: TaskCategory; totalSeconds: number }[];

  const map = new Map<number, TaskTimeBreakdown>();
  for (const row of rows) {
    map.set(row.taskId, {
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      category: row.category,
      minutes: Math.round(row.totalSeconds / 60),
    });
  }

  const activeSession = getActiveSession();
  if (activeSession && activeSession.session_date >= startDate && activeSession.session_date <= endDate) {
    const task = db.prepare('SELECT id, title, category FROM tasks WHERE id = ?').get(activeSession.task_id) as
      | { id: number; title: string; category: TaskCategory }
      | undefined;
    if (task) {
      const existing = map.get(task.id);
      map.set(task.id, {
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        minutes: (existing?.minutes || 0) + Math.round(getActiveElapsed(activeSession, activeSession.session_date) / 60),
      });
    }
  }

  const adjustmentRows = db.prepare(`
    SELECT t.id as taskId, t.title as taskTitle, t.category,
           COALESCE(SUM(a.adjusted_minutes), 0) as totalMinutes
    FROM time_adjustments a
    INNER JOIN tasks t ON t.id = a.task_id
    WHERE a.adjustment_date >= ? AND a.adjustment_date <= ? AND t.is_deleted = 0
    GROUP BY t.id, t.title, t.category
  `).all(startDate, endDate) as { taskId: number; taskTitle: string; category: TaskCategory; totalMinutes: number }[];

  for (const row of adjustmentRows) {
    const existing = map.get(row.taskId);
    map.set(row.taskId, {
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      category: row.category,
      minutes: (existing?.minutes || 0) + row.totalMinutes,
    });
  }

  return Array.from(map.values())
    .map((entry) => ({ ...entry, minutes: Math.max(0, entry.minutes) }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
