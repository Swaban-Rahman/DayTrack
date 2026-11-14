import React, { useState } from 'react';
import type { DailyAnalytics, SessionWithTask, Task } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { TaskItem } from '../tasks/TaskItem';
import { TaskForm } from '../tasks/TaskForm';
import { SessionList } from '../timer/SessionList';
import { Plus, Calendar, Clock, CheckCircle2, Coffee, AlertTriangle } from 'lucide-react';
import { formatDate, formatDuration, getCategoryColor } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';
import './DayDetail.css';

interface DayDetailProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  sessions: SessionWithTask[];
  analytics: DailyAnalytics | null;
  loading: boolean;
  onRefreshDate: () => void;
}

export const DayDetail: React.FC<DayDetailProps> = ({
  date,
  tasks,
  sessions,
  analytics,
  loading,
  onRefreshDate
}) => {
  const { createTask } = useApp();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const completedCount = analytics?.completedTasks ?? tasks.filter((t) => (t.day_status || t.status) === 'completed').length;
  const totalCount = analytics?.totalTasks ?? tasks.length;
  const trackedMinutes = analytics?.totalTrackedMinutes ?? sessions.reduce((sum, s) => sum + (s.is_active ? 0 : Math.round(s.duration_seconds / 60)), 0);
  const breakMinutes = analytics?.breakMinutes ?? 0;
  const distractionMinutes = analytics?.distractionMinutes ?? 0;
  const categories = analytics?.categoryBreakdown || [];

  return (
    <div className="day-detail-stack">
      <Card
        title="Daily Breakdown"
        subtitle={formatDate(date)}
        icon={<Calendar size={18} />}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsTaskModalOpen(true)}
          >
            Add for this day
          </Button>
        }
      >
        <div className="day-detail-summary-bar">
          <div className="day-metric">
            <CheckCircle2 size={15} className="metric-icon success" />
            <span>{completedCount} / {totalCount} Completed</span>
          </div>
          <div className="day-metric">
            <Clock size={15} className="metric-icon accent" />
            <span>Tracked: {formatDuration(trackedMinutes)}</span>
          </div>
          {breakMinutes > 0 && (
            <div className="day-metric">
              <Coffee size={15} className="metric-icon break" />
              <span>Breaks: {formatDuration(breakMinutes)}</span>
            </div>
          )}
          {distractionMinutes > 0 && (
            <div className="day-metric">
              <AlertTriangle size={15} className="metric-icon distraction" />
              <span>Distractions: {formatDuration(distractionMinutes)}</span>
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="day-category-chips">
            {categories.map((entry) => (
              <span key={entry.category} className="day-category-chip">
                <span
                  className="day-category-dot"
                  style={{ backgroundColor: getCategoryColor(entry.category) }}
                />
                {entry.category}
                <strong>{formatDuration(entry.minutes)}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="day-detail-task-list">
          {loading ? (
            <p className="no-day-tasks-text">Loading history…</p>
          ) : tasks.length === 0 ? (
            <p className="no-day-tasks-text">No tasks recorded on this date.</p>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={`${task.id}-${task.history_day || 'current'}`}
                task={task}
                onChanged={onRefreshDate}
              />
            ))
          )}
        </div>
      </Card>

      <SessionList
        sessions={sessions}
        cardTitle="Time Records"
        showTaskTitle
        loading={loading}
        emptyText="No work sessions recorded on this day."
        onChanged={onRefreshDate}
      />

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultDate={date}
        onSubmit={async (input) => {
          await createTask({ ...input, scheduled_date: date });
          setIsTaskModalOpen(false);
          onRefreshDate();
        }}
      />
    </div>
  );
};
