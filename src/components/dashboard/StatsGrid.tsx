import React from 'react';
import { CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDuration } from '../../utils/helpers';
import './StatsGrid.css';

export const StatsGrid: React.FC = () => {
  const { todayTasks } = useApp();

  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const totalTrackedMinutes = todayTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0);
  const totalPlannedMinutes = todayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrap accent">
          <ListTodo size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Total Planned</span>
          <span className="stat-value">{totalTasks} tasks</span>
          <span className="stat-sub">{formatDuration(totalPlannedMinutes)} planned</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrap success">
          <CheckCircle2 size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{completedTasks}</span>
          <span className="stat-sub">{completionRate}% of today's plan</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrap warning">
          <Clock size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{pendingTasks}</span>
          <span className="stat-sub">{pendingTasks === 0 ? 'All done!' : 'Needs focus'}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrap info">
          <TrendingUp size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Tracked Time</span>
          <span className="stat-value">{formatDuration(totalTrackedMinutes)}</span>
          <span className="stat-sub">Productive work today</span>
        </div>
      </div>
    </div>
  );
};
