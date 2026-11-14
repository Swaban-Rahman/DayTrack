import React from 'react';
import { Pause, Play, Square, Check, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatTime, formatDuration, getCategoryColor } from '../../utils/helpers';
import './ActiveTaskCard.css';

export const ActiveTaskCard: React.FC = () => {
  const {
    activeSession,
    timerState,
    pauseTimer,
    startTimer,
    stopTimer,
    completeTask,
    setCurrentPage
  } = useApp();

  if (!activeSession) return null;

  const { task } = activeSession;
  const isRunning = timerState.isRunning;

  return (
    <Card className="active-task-card" noPadding>
      <div className="active-task-inner">
        <div className="active-task-left">
          <div className="active-status-badge">
            <span className={`pulse-dot ${isRunning ? 'running' : 'paused'}`} />
            <span>{isRunning ? 'Currently Tracking' : 'Timer Paused'}</span>
          </div>

          <h3 className="active-task-title">{task.title}</h3>

          <div className="active-task-meta">
            <Badge color={getCategoryColor(task.category)} size="sm">
              {task.category}
            </Badge>
            <span className="active-meta-text">
              <Clock size={13} />
              Planned: {formatDuration(task.estimated_minutes)}
            </span>
          </div>
        </div>

        <div className="active-task-center">
          <div className="active-timer-number">
            {formatTime(timerState.elapsedSeconds)}
          </div>
          <span className="active-timer-caption">Current Session Duration</span>
        </div>

        <div className="active-task-right">
          {isRunning ? (
            <Button
              variant="secondary"
              size="md"
              icon={<Pause size={16} />}
              onClick={pauseTimer}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={<Play size={16} />}
              onClick={() => startTimer(task.id)}
            >
              Resume
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            icon={<Square size={16} />}
            onClick={stopTimer}
            title="Stop timer without completing"
          >
            Stop
          </Button>

          <Button
            variant="success"
            size="md"
            icon={<Check size={16} />}
            onClick={() => completeTask(task.id)}
          >
            Complete
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('timer')}
          >
            Open Tracker →
          </Button>
        </div>
      </div>
    </Card>
  );
};
