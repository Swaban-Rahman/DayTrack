import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  CalendarDays,
  BarChart3,
  Moon,
  Settings,
  Sparkles,
  Pause,
  Play
} from 'lucide-react';
import type { PageName } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatTime } from '../../utils/helpers';
import './Sidebar.css';

interface NavItem {
  id: PageName;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'timer', label: 'Time Tracker', icon: Clock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'planning', label: 'End-of-Day', icon: Moon },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, timerState, pauseTimer, startTimer } = useApp();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Sparkles size={20} className="brand-icon" />
        </div>
        <div className="brand-info">
          <h1 className="brand-title">DayTrack</h1>
          <span className="brand-subtitle">Productivity</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={19} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {item.id === 'timer' && timerState.isRunning && (
                <span className="timer-badge-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Timer Mini Widget */}
      {timerState.isRunning && (
        <div className="sidebar-timer-widget" onClick={() => setCurrentPage('timer')}>
          <div className="widget-header">
            <span className="widget-pulsing-dot" />
            <span className="widget-label">Running Timer</span>
          </div>
          <p className="widget-task-name" title={timerState.taskTitle}>
            {timerState.taskTitle}
          </p>
          <div className="widget-controls">
            <span className="widget-time">{formatTime(timerState.elapsedSeconds)}</span>
            <button
              className="widget-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (timerState.isRunning) {
                  pauseTimer();
                } else if (timerState.taskId) {
                  startTimer(timerState.taskId);
                }
              }}
              title={timerState.isRunning ? 'Pause' : 'Resume'}
            >
              {timerState.isRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="sidebar-footer">
        <span className="offline-badge">Offline Ready</span>
      </div>
    </aside>
  );
};
