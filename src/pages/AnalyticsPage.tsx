import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { OverviewStats } from '../components/analytics/OverviewStats';
import { TimeCharts } from '../components/analytics/TimeCharts';
import { DistractionSection } from '../components/analytics/DistractionSection';
import type {
  DailyAnalytics,
  CategoryBreakdown,
  EstimatedVsActual,
  DistractionLog
} from '../types';
import { getToday, toDateString } from '../utils/helpers';
import './AnalyticsPage.css';

export const AnalyticsPage: React.FC = () => {
  const {
    getCategoryAnalytics,
    getMonthlyAnalytics,
    getDistractionsByRange,
    logDistraction,
    deleteDistraction
  } = useAnalytics();

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [dailyHoursData, setDailyHoursData] = useState<{ date: string; hours: number }[]>([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState<{ date: string; completed: number; planned: number }[]>([]);
  const [estimatedVsActualData, setEstimatedVsActualData] = useState<EstimatedVsActual[]>([]);
  const [distractions, setDistractions] = useState<DistractionLog[]>([]);

  const loadData = async () => {
    const today = new Date();
    const daysBack = timeRange === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysBack - 1));

    const startStr = toDateString(startDate);
    const endStr = getToday();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    try {
      const [cats, currentMonth, priorMonth, dists] = await Promise.all([
        getCategoryAnalytics(startStr, endStr),
        getMonthlyAnalytics(today.getFullYear(), today.getMonth() + 1),
        getMonthlyAnalytics(previousMonth.getFullYear(), previousMonth.getMonth() + 1),
        getDistractionsByRange(startStr, endStr)
      ]);
      const monthly: DailyAnalytics[] = [...(priorMonth || []), ...(currentMonth || [])].filter(
        (day) => day.date >= startStr && day.date <= endStr
      );

      setCategoryData(cats || []);
      setDistractions(dists || []);

      // Build daily hours and weekly trend from monthly data
      const hoursChart = (monthly || []).map((d) => ({
        date: d.date.slice(5),
        hours: Math.round(d.totalTrackedMinutes / 60 * 10) / 10
      })).slice(-daysBack);
      setDailyHoursData(hoursChart);

      const trends = (monthly || []).map((d) => ({
        date: d.date.slice(5),
        completed: d.completedTasks,
        planned: d.totalTasks
      })).slice(-daysBack);
      setWeeklyTrendData(trends);

      // Collect recent estimated vs actual
      const estAct: EstimatedVsActual[] = [];
      (monthly || []).forEach((d) => {
        if (d.estimatedVsActual) {
          d.estimatedVsActual.forEach((item) => {
            if (estAct.length < 10) {
              estAct.push(item);
            }
          });
        }
      });
      setEstimatedVsActualData(estAct);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const totalTrackedMins = dailyHoursData.reduce((sum, d) => sum + (d.hours * 60), 0);
  const completedTotal = weeklyTrendData.reduce((sum, d) => sum + d.completed, 0);
  const plannedTotal = weeklyTrendData.reduce((sum, d) => sum + d.planned, 0);
  const distractionTotal = distractions.reduce((sum, d) => sum + d.duration_minutes, 0);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h2 className="page-heading">Time & Productivity Analytics</h2>
          <p className="page-subheading">
            Track productive hours, identify time wastage, and review performance trends
          </p>
        </div>

        <div className="range-toggle-group">
          <button
            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Last 7 Days
          </button>
          <button
            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      <OverviewStats
        totalTrackedMinutes={totalTrackedMins}
        completedTasks={completedTotal}
        pendingTasks={Math.max(0, plannedTotal - completedTotal)}
        totalDistractionMinutes={distractionTotal}
      />

      <TimeCharts
        dailyHoursData={dailyHoursData}
        categoryData={categoryData}
        estimatedVsActualData={estimatedVsActualData}
        weeklyTrendData={weeklyTrendData}
      />

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
    </div>
  );
};
