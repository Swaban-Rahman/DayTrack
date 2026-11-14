import React from 'react';
import { Sparkles, Calendar, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getGreeting, formatDate, getToday } from '../../utils/helpers';
import './WelcomeCard.css';

export const WelcomeCard: React.FC = () => {
  const { todayTasks, unfinishedTasks } = useApp();
  const greeting = getGreeting();
  const today = getToday();

  const totalTasks = todayTasks.length;
  const completedCount = todayTasks.filter((t) => t.status === 'completed').length;
  const remainingCount = totalTasks - completedCount;

  return (
    <div className="welcome-banner">
      <div className="welcome-content">
        <div className="welcome-badge">
          <Sparkles size={14} />
          <span>Daily Assistant</span>
        </div>
        <h2 className="welcome-title">{greeting}! Here is your plan for today.</h2>
        <p className="welcome-subtitle">
          <Calendar size={14} className="inline-icon" />
          {formatDate(today)}
          <span className="dot-divider">•</span>
          <CheckCircle size={14} className="inline-icon" />
          {completedCount} of {totalTasks} tasks completed
          {unfinishedTasks.length > 0 && (
            <span className="unfinished-alert">
              ({unfinishedTasks.length} carried from previous days)
            </span>
          )}
        </p>
      </div>

      <div className="welcome-stats-pill">
        <div className="pill-item">
          <span className="pill-value">{remainingCount}</span>
          <span className="pill-label">Remaining</span>
        </div>
        <div className="pill-divider" />
        <div className="pill-item">
          <span className="pill-value">{completedCount}</span>
          <span className="pill-label">Completed</span>
        </div>
      </div>
    </div>
  );
};
