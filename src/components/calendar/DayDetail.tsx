import React, { useState } from 'react';
import type { Task } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { TaskItem } from '../tasks/TaskItem';
import { TaskForm } from '../tasks/TaskForm';
import { Plus, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { formatDate, formatDuration } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';
import './DayDetail.css';

interface DayDetailProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  onRefreshDate: () => void;
}

export const DayDetail: React.FC<DayDetailProps> = ({ date, tasks, onRefreshDate }) => {
  const { createTask } = useApp();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const totalTrackedMinutes = tasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
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
          <span>{completedCount} / {tasks.length} Completed</span>
        </div>
        <div className="day-metric">
          <Clock size={15} className="metric-icon accent" />
          <span>Tracked: {formatDuration(totalTrackedMinutes)}</span>
        </div>
      </div>

      <div className="day-detail-task-list">
        {tasks.length === 0 ? (
          <p className="no-day-tasks-text">No tasks recorded on this date.</p>
        ) : (
          tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={async (input) => {
          await createTask({ ...input, scheduled_date: date });
          setIsTaskModalOpen(false);
          onRefreshDate();
        }}
      />
    </Card>
  );
};
