import React, { useState, useEffect } from 'react';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { DayDetail } from '../components/calendar/DayDetail';
import type { Task } from '../types';
import { getToday } from '../utils/helpers';
import './CalendarPage.css';

export const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});

  const loadDateTasks = async (date: string) => {
    if (window.daytrack) {
      const tasks = await window.daytrack.getTasks(date);
      setDayTasks(tasks || []);
    }
  };

  const loadMonthCounts = async (monthDate: Date) => {
    if (!window.daytrack) return;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDate.toString().padStart(2, '0')}`;

    try {
      const monthTasks = await window.daytrack.getTasksByRange(firstDay, lastDay);
      const counts: Record<string, { total: number; completed: number }> = {};
      monthTasks.forEach((t) => {
        if (!counts[t.scheduled_date]) {
          counts[t.scheduled_date] = { total: 0, completed: 0 };
        }
        counts[t.scheduled_date].total += 1;
        if (t.status === 'completed') {
          counts[t.scheduled_date].completed += 1;
        }
      });
      setTaskCounts(counts);
    } catch (err) {
      console.error('Failed to load month tasks:', err);
    }
  };

  useEffect(() => {
    loadMonthCounts(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    loadDateTasks(selectedDate);
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
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
            taskCountsByDate={taskCounts}
          />
        </div>

        <div className="calendar-side-col">
          <DayDetail
            date={selectedDate}
            tasks={dayTasks}
            onRefreshDate={() => {
              loadDateTasks(selectedDate);
              loadMonthCounts(currentMonth);
            }}
          />
        </div>
      </div>
    </div>
  );
};
