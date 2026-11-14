import React, { useEffect, useMemo, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useApp } from '../context/AppContext';
import { OverviewStats } from '../components/analytics/OverviewStats';
import { TimeCharts } from '../components/analytics/TimeCharts';
import { DistractionSection } from '../components/analytics/DistractionSection';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import type {
  DailyAnalytics,
  CategoryBreakdown,
  EstimatedVsActual,
  DistractionLog,
  TaskTimeBreakdown
} from '../types';
import {
  getToday,
  shiftDate,
  getWeekStart,
  getMonthStart,
  formatDuration,
  getCategoryColor,
  formatShortDate
} from '../utils/helpers';
import './AnalyticsPage.css';

type RangeKey = 'week' | 'month' | 'last30';

const RANGE_LABELS: Record<RangeKey, string> = {
  week: 'This Week',
  month: 'This Month',
  last30: 'Last 30 Days'
};

function getRangeBounds(range: RangeKey): { start: string; end: string } {
  const today = getToday();
  if (range === 'week') return { start: getWeekStart(today), end: today };
  if (range === 'month') return { start: getMonthStart(today), end: today };
  return { start: shiftDate(today, -29), end: today };
}

function monthsInRange(start: string, end: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return months;
}

function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export const AnalyticsPage: React.FC = () => {
  const {
    getMonthlyAnalytics,
    getCategoryAnalytics,
    getTaskTimeBreakdown,
    getDistractionsByRange,
    logDistraction,
    deleteDistraction
  } = useAnalytics();
  const { settings, notify } = useApp();

  const [range, setRange] = useState<RangeKey>('week');
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyAnalytics[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [taskBreakdown, setTaskBreakdown] = useState<TaskTimeBreakdown[]>([]);
  const [distractions, setDistractions] = useState<DistractionLog[]>([]);

  const workingHours = Math.max(1, parseInt(settings.dailyWorkingHours || '8', 10) || 8);

  const loadData = async () => {
    const { start, end } = getRangeBounds(range);
    setLoading(true);
    try {
      const months = monthsInRange(start, end);
      const monthlyResults = await Promise.all(
        months.map((m) => getMonthlyAnalytics(m.year, m.month))
      );
      const merged = monthlyResults
        .flat()
        .filter((day) => day.date >= start && day.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));

      const [cats, tasks, dists] = await Promise.all([
        getCategoryAnalytics(start, end),
        getTaskTimeBreakdown(start, end),
        getDistractionsByRange(start, end)
      ]);

      setDailyData(merged);
      setCategoryData(cats || []);
      setTaskBreakdown(tasks || []);
      setDistractions(dists || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      notify(err instanceof Error ? err.message : 'Could not load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const totals = useMemo(() => {
    const today = getToday();
    let tracked = 0;
    let breaks = 0;
    let distractions = 0;
    let completed = 0;
    let pending = 0;
    let unaccounted = 0;
    let productiveDays = 0;
    const estimatedByTask = new Map<string, number>();

    dailyData.forEach((day) => {
      const accounted = day.totalTrackedMinutes + day.breakMinutes + day.distractionMinutes;
      tracked += day.totalTrackedMinutes;
      breaks += day.breakMinutes;
      distractions += day.distractionMinutes;
      completed += day.completedTasks;
      if (day.date <= today) pending += day.pendingTasks;
      if (day.totalTrackedMinutes > 0) productiveDays += 1;

      day.estimatedVsActual.forEach((entry) => {
        estimatedByTask.set(
          entry.taskTitle,
          Math.max(estimatedByTask.get(entry.taskTitle) || 0, entry.estimated)
        );
      });

      // Only days with recorded activity can have unaccounted time; simply planning a
      // task is not evidence that the configured working hours were spent.
      if (day.date <= today && accounted > 0) {
        unaccounted += Math.max(0, workingHours * 60 - accounted);
      }
    });

    const estimated = Array.from(estimatedByTask.values()).reduce((sum, value) => sum + value, 0);

    return {
      tracked,
      breaks,
      distractions,
      estimated,
      completed,
      pending,
      unaccounted,
      productiveDays,
      avgPerProductiveDay: productiveDays > 0 ? Math.round(tracked / productiveDays) : 0
    };
  }, [dailyData, workingHours]);

  const accountingData = useMemo(() => {
    const today = getToday();
    return dailyData.map((day) => {
      const accounted = day.totalTrackedMinutes + day.breakMinutes + day.distractionMinutes;
      return {
        date: day.date.slice(5),
        tracked: toHours(day.totalTrackedMinutes),
        breaks: toHours(day.breakMinutes),
        distractions: toHours(day.distractionMinutes),
        unaccounted: day.date <= today && accounted > 0
          ? toHours(Math.max(0, workingHours * 60 - accounted))
          : 0
      };
    });
  }, [dailyData, workingHours]);

  const dailyHoursData = useMemo(
    () => dailyData.map((day) => ({ date: day.date.slice(5), hours: toHours(day.totalTrackedMinutes) })),
    [dailyData]
  );

  const trendData = useMemo(
    () =>
      dailyData.map((day) => ({
        date: day.date.slice(5),
        completed: day.completedTasks,
        planned: day.totalTasks
      })),
    [dailyData]
  );

  const estimatedVsActualData = useMemo<EstimatedVsActual[]>(() => {
    const map = new Map<string, EstimatedVsActual>();
    dailyData.forEach((day) => {
      day.estimatedVsActual.forEach((entry) => {
        const existing = map.get(entry.taskTitle);
        if (existing) {
          existing.actual += entry.actual;
          existing.estimated = Math.max(existing.estimated, entry.estimated);
        } else {
          map.set(entry.taskTitle, { ...entry });
        }
      });
    });
    return Array.from(map.values())
      .filter((entry) => entry.actual > 0 || entry.estimated > 0)
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 10);
  }, [dailyData]);

  const maxTaskMinutes = taskBreakdown.length > 0 ? taskBreakdown[0].minutes : 0;
  const { start, end } = getRangeBounds(range);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h2 className="page-heading">Time & Productivity Analytics</h2>
          <p className="page-subheading">
            {formatShortDate(start)} – {formatShortDate(end)} · Productive, break, distraction and
            unaccounted time are tracked separately.
          </p>
        </div>

        <div className="range-toggle-group">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
            <button
              key={key}
              className={`range-btn ${range === key ? 'active' : ''}`}
              onClick={() => setRange(key)}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="analytics-loading">Loading analytics…</div>
      ) : (
        <>
          <OverviewStats
            totalTrackedMinutes={totals.tracked}
            breakMinutes={totals.breaks}
            totalDistractionMinutes={totals.distractions}
            unaccountedMinutes={totals.unaccounted}
            completedTasks={totals.completed}
            pendingTasks={totals.pending}
          />

          <div className="analytics-mini-summary">
            <span>
              Average productive time per active day:{' '}
              <strong>{formatDuration(totals.avgPerProductiveDay)}</strong>
            </span>
            <span>
              Estimated workload: <strong>{formatDuration(totals.estimated)}</strong> · Actual:{' '}
              <strong>{formatDuration(totals.tracked)}</strong>
            </span>
          </div>

          <TimeCharts
            dailyHoursData={dailyHoursData}
            dailyAccountingData={accountingData}
            categoryData={categoryData}
            estimatedVsActualData={estimatedVsActualData}
            weeklyTrendData={trendData}
          />

          <Card
            title="Time per Task"
            subtitle="Where your tracked minutes went in this period"
          >
            {taskBreakdown.length === 0 ? (
              <p className="analytics-empty">No tracked time in this period yet.</p>
            ) : (
              <div className="task-breakdown-list">
                {taskBreakdown.slice(0, 12).map((task) => (
                  <div key={task.taskId} className="task-breakdown-row">
                    <div className="task-breakdown-header">
                      <span className="task-breakdown-title">{task.taskTitle}</span>
                      <div className="task-breakdown-meta">
                        <Badge color={getCategoryColor(task.category)} size="sm">
                          {task.category}
                        </Badge>
                        <span className="task-breakdown-time">{formatDuration(task.minutes)}</span>
                      </div>
                    </div>
                    <div className="task-breakdown-bar-track">
                      <div
                        className="task-breakdown-bar-fill"
                        style={{
                          width: `${maxTaskMinutes > 0 ? Math.max(3, (task.minutes / maxTaskMinutes) * 100) : 0}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <DistractionSection
            distractions={distractions}
            onAddDistraction={async (data) => {
              await logDistraction(data);
              await loadData();
            }}
            onDeleteDistraction={async (id) => {
              await deleteDistraction(id);
              await loadData();
            }}
          />
        </>
      )}
    </div>
  );
};
