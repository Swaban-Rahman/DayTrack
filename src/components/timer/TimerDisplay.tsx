import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { formatTime, formatDuration, getCategoryColor } from '../../utils/helpers';
import './TimerDisplay.css';

export const TimerDisplay: React.FC = () => {
  const { activeSession, timerState } = useApp();

  const isRunning = timerState.isRunning;
  const task = activeSession?.task;

  const actualMinutes = Math.round(timerState.actualSeconds / 60);
  const difference = actualMinutes - timerState.estimatedMinutes;

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
                Tracked: <strong>{formatDuration(actualMinutes)}</strong> / Estimated:{' '}
                <strong>{formatDuration(timerState.estimatedMinutes)}</strong>
                {actualMinutes > 0 && difference > 0 && (
                  <span className="timer-diff over"> (+{formatDuration(difference)} over estimate)</span>
                )}
                {actualMinutes > 0 && difference < 0 && (
                  <span className="timer-diff under"> ({formatDuration(Math.abs(difference))} under estimate)</span>
                )}
              </span>
            </div>
            <p className="timer-session-note">
              {isRunning
                ? 'This session is being recorded from timestamps, so it stays accurate even if the UI is throttled.'
                : 'Timer paused. Your last session is saved — resume to start a new work session.'}
            </p>
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
