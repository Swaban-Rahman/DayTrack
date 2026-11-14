import React from 'react';
import { Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../../utils/helpers';
import './OverviewStats.css';

interface OverviewStatsProps {
  totalTrackedMinutes: number;
  completedTasks: number;
  pendingTasks: number;
  totalDistractionMinutes: number;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  totalTrackedMinutes,
  completedTasks,
  pendingTasks,
  totalDistractionMinutes
}) => {
  const totalTasks = completedTasks + pendingTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="overview-stats-grid">
      <div className="overview-stat-card">
        <div className="overview-icon-badge primary">
          <Clock size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Total Productive Time</span>
          <span className="overview-value">{formatDuration(totalTrackedMinutes)}</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge success">
          <CheckCircle2 size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Tasks Completed</span>
          <span className="overview-value">{completedTasks} ({completionRate}%)</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge warning">
          <TrendingUp size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Pending Tasks</span>
          <span className="overview-value">{pendingTasks}</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge danger">
          <AlertTriangle size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Recorded Distractions</span>
          <span className="overview-value">{formatDuration(totalDistractionMinutes)}</span>
        </div>
      </div>
    </div>
  );
};
