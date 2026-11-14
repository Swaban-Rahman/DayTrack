import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarGrid.css';

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  taskCountsByDate: Record<string, { total: number; completed: number }>;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  taskCountsByDate
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // First day of month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Number of days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="calendar-grid-card">
      <div className="calendar-nav-bar">
        <h3 className="calendar-month-title">{monthName}</h3>
        <div className="calendar-nav-btns">
          <button className="cal-nav-btn" onClick={onPrevMonth} aria-label="Previous Month">
            <ChevronLeft size={18} />
          </button>
          <button className="cal-nav-btn" onClick={onNextMonth} aria-label="Next Month">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-table">
        <div className="calendar-days-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="calendar-day-name">{d}</div>
          ))}
        </div>

        <div className="calendar-cells-grid">
          {leadingBlanks.map((b) => (
            <div key={`blank-${b}`} className="calendar-cell blank" />
          ))}

          {daysArray.map((day) => {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const counts = taskCountsByDate[dateStr];

            return (
              <div
                key={dateStr}
                className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDate(dateStr)}
              >
                <span className="cell-day-number">{day}</span>
                {counts && counts.total > 0 && (
                  <div className="cell-indicators">
                    <span
                      className={`cell-dot ${counts.completed === counts.total ? 'all-done' : 'has-pending'}`}
                      title={`${counts.completed}/${counts.total} completed`}
                    />
                    <span className="cell-task-count">{counts.total}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
