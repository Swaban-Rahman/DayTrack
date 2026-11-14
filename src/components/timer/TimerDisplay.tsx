import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { formatTime, formatDuration, getCategoryColor } from '../../utils/helpers';
import './TimerDisplay.css';

export const TimerDisplay: React.FC = () => {
  const { activeSession, timerState } = useApp();

  const isRunning = timerState.isRunning;
  const task = activeSession?.task;

  return (
    <div className="timer-display-hero">
      <div className={`timer-ring ${isRunning ? 'pulse-ring' : ''}`}>
        <div className="timer-digits">
          {formatTime(timerState.elapsedSeconds)}
        </div>
        <div className="timer-status-caption">
          {isRunning ? 'RECORDING TIME' : activeSession ? 'PAUSED' : 'READY TO START'}
        </div>
      </div>

      <div className="timer-hero-meta">
        {task ? (
          <>
            <h2 className="timer-task-title">{task.title}</h2>
            <div className="timer-task-badges">
              <Badge color={getCategoryColor(task.category)}>
                {task.category}
              </Badge>
              <span className="timer-comparison-text">
                Tracked: <strong>{formatDuration(task.actual_minutes)}</strong> / Estimated: <strong>{formatDuration(task.estimated_minutes)}</strong>
              </span>
            </div>
          </>
        ) : (
          <p className="no-active-task-hint">
            Select a task below or press Start to begin tracking your work.
          </p>
        )}
      </div>
    </div>
  );
};
