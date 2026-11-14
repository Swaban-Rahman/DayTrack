import React, { useCallback, useEffect, useState } from 'react';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { DayDetail } from '../components/calendar/DayDetail';
import { useApp } from '../context/AppContext';
import type { DailyAnalytics, SessionWithTask, Task } from '../types';
import { getToday, toDateString } from '../utils/helpers';
import './CalendarPage.css';

export const CalendarPage: React.FC = () => {
  const { todayTasks } = useApp();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [daySessions, setDaySessions] = useState<SessionWithTask[]>([]);
  const [dayAnalytics, setDayAnalytics] = useState<DailyAnalytics | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});

  const loadDateData = useCallback(async (date: string) => {
    if (!window.daytrack) return;
    setDayLoading(true);
    try {
      const [tasks, sessions, analytics] = await Promise.all([
        window.daytrack.getTaskHistory(date),
        window.daytrack.getSessionsByDate(date),
        window.daytrack.getDailyAnalytics(date)
      ]);
      setDayTasks(tasks || []);
      setDaySessions(sessions || []);
      setDayAnalytics(analytics || null);
    } catch (err) {
      console.error('Failed to load day history:', err);
    } finally {
      setDayLoading(false);
    }
  }, []);

  const loadMonthCounts = useCallback(async (monthDate: Date) => {
    if (!window.daytrack) return;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDate.toString().padStart(2, '0')}`;

    try {
      const history = await window.daytrack.getTaskHistoryByRange(firstDay, lastDay);
      const counts: Record<string, { total: number; completed: number }> = {};
      history.forEach((t) => {
        const day = t.history_day || t.scheduled_date;
        if (!counts[day]) {
          counts[day] = { total: 0, completed: 0 };
        }
        counts[day].total += 1;
        if ((t.day_status || t.status) === 'completed') {
          counts[day].completed += 1;
        }
      });
      setTaskCounts(counts);
    } catch (err) {
      console.error('Failed to load month history:', err);
    }
  }, []);

  useEffect(() => {
    loadMonthCounts(currentMonth);
  }, [currentMonth, loadMonthCounts]);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate, loadDateData, todayTasks]);

  const refreshAll = () => {
    loadDateData(selectedDate);
    loadMonthCounts(currentMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateString(today));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="calendar-page">
      <div className="calendar-page-layout">
        <div className="calendar-main-col">
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={goToToday}
            taskCountsByDate={taskCounts}
          />
        </div>

        <div className="calendar-side-col">
          <DayDetail
            date={selectedDate}
            tasks={dayTasks}
            sessions={daySessions}
            analytics={dayAnalytics}
            loading={dayLoading}
            onRefreshDate={refreshAll}
          />
        </div>
      </div>
    </div>
  );
};
