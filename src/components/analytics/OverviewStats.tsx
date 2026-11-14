import React from 'react';
import { Clock, CheckCircle2, TrendingUp, AlertTriangle, Coffee, Hourglass } from 'lucide-react';
import { formatDuration } from '../../utils/helpers';
import './OverviewStats.css';

interface OverviewStatsProps {
  totalTrackedMinutes: number;
  breakMinutes: number;
  totalDistractionMinutes: number;
  unaccountedMinutes: number;
  completedTasks: number;
  pendingTasks: number;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  totalTrackedMinutes,
  breakMinutes,
  totalDistractionMinutes,
  unaccountedMinutes,
  completedTasks,
  pendingTasks
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
          <span className="overview-label">Productive Time</span>
          <span className="overview-value">{formatDuration(totalTrackedMinutes)}</span>
          <span className="overview-hint">Tracked on tasks</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge info">
          <Coffee size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Breaks</span>
          <span className="overview-value">{formatDuration(breakMinutes)}</span>
          <span className="overview-hint">Manually logged rest</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge danger">
          <AlertTriangle size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Distractions</span>
          <span className="overview-value">{formatDuration(totalDistractionMinutes)}</span>
          <span className="overview-hint">Manually logged leaks</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge muted">
          <Hourglass size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Unaccounted</span>
          <span className="overview-value">{formatDuration(unaccountedMinutes)}</span>
          <span className="overview-hint">Not automatically wasted</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge success">
          <CheckCircle2 size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Tasks Completed</span>
          <span className="overview-value">{completedTasks} ({completionRate}%)</span>
          <span className="overview-hint">Across the selected period</span>
        </div>
      </div>

      <div className="overview-stat-card">
        <div className="overview-icon-badge warning">
          <TrendingUp size={20} />
        </div>
        <div className="overview-stat-body">
          <span className="overview-label">Pending Tasks</span>
          <span className="overview-value">{pendingTasks}</span>
          <span className="overview-hint">Still open from this period</span>
        </div>
      </div>
    </div>
  );
};
