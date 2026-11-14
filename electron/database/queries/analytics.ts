import { getDb } from '../init';
import type {
  DailyAnalytics,
  WeeklyAnalytics,
  CategoryBreakdown,
  EstimatedVsActual,
} from '../../../src/types/index';

export function getDailyAnalytics(date: string): DailyAnalytics {
  const db = getDb();

  // Task counts
  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as totalTasks,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completedTasks,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END), 0) as pendingTasks
    FROM tasks WHERE scheduled_date = ? AND is_deleted = 0
  `).get(date) as { totalTasks: number; completedTasks: number; pendingTasks: number };

  // Total tracked minutes from sessions
  const tracked = db.prepare(`
    SELECT COALESCE(SUM(ts.duration_seconds), 0) as totalSeconds
    FROM task_sessions ts
    INNER JOIN tasks t ON ts.task_id = t.id
    WHERE t.scheduled_date = ? AND t.is_deleted = 0
  `).get(date) as { totalSeconds: number };

  // Category breakdown
  const categoryRows = db.prepare(`
    SELECT t.category, COALESCE(SUM(ts.duration_seconds), 0) as totalSeconds
    FROM tasks t
    LEFT JOIN task_sessions ts ON ts.task_id = t.id
    WHERE t.scheduled_date = ? AND t.is_deleted = 0
    GROUP BY t.category
    HAVING totalSeconds > 0
  `).all(date) as { category: string; totalSeconds: number }[];

  const categoryBreakdown: CategoryBreakdown[] = categoryRows.map((row) => ({
    category: row.category,
    minutes: Math.round(row.totalSeconds / 60),
  }));

  // Estimated vs actual
  const evaRows = db.prepare(`
    SELECT title as taskTitle, estimated_minutes as estimated, actual_minutes as actual
    FROM tasks WHERE scheduled_date = ? AND is_deleted = 0 AND (estimated_minutes > 0 OR actual_minutes > 0)
  `).all(date) as EstimatedVsActual[];

  return {
    date,
    totalTrackedMinutes: Math.round(tracked.totalSeconds / 60),
    totalTasks: taskStats.totalTasks,
    completedTasks: taskStats.completedTasks,
    pendingTasks: taskStats.pendingTasks,
    categoryBreakdown,
    estimatedVsActual: evaRows,
  };
}

export function getWeeklyAnalytics(weekStart: string): WeeklyAnalytics {
  // Generate 7 days starting from weekStart
  const startDate = new Date(weekStart + 'T00:00:00');
  const dailyData: DailyAnalytics[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyData.push(getDailyAnalytics(dateStr));
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const totalTrackedMinutes = dailyData.reduce((sum, d) => sum + d.totalTrackedMinutes, 0);
  const totalCompletedTasks = dailyData.reduce((sum, d) => sum + d.completedTasks, 0);
  const daysWithData = dailyData.filter((d) => d.totalTrackedMinutes > 0).length;

  return {
    weekStart,
    weekEnd: endDate.toISOString().split('T')[0],
    dailyData,
    totalTrackedMinutes,
    totalCompletedTasks,
    averageDailyMinutes: daysWithData > 0 ? Math.round(totalTrackedMinutes / daysWithData) : 0,
  };
}

export function getMonthlyAnalytics(year: number, month: number): DailyAnalytics[] {
  // month is 1-based
  const daysInMonth = new Date(year, month, 0).getDate();
  const results: DailyAnalytics[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    results.push(getDailyAnalytics(dateStr));
  }

  return results;
}

export function getCategoryAnalytics(startDate: string, endDate: string): CategoryBreakdown[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.category, COALESCE(SUM(ts.duration_seconds), 0) as totalSeconds
    FROM tasks t
    LEFT JOIN task_sessions ts ON ts.task_id = t.id
    WHERE t.scheduled_date >= ? AND t.scheduled_date <= ? AND t.is_deleted = 0
    GROUP BY t.category
    HAVING totalSeconds > 0
    ORDER BY totalSeconds DESC
  `).all(startDate, endDate) as { category: string; totalSeconds: number }[];

  return rows.map((row) => ({
    category: row.category,
    minutes: Math.round(row.totalSeconds / 60),
  }));
}
