import React, { useState } from 'react';
import { Play, Pause, Square, Check, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import './TimerControls.css';

interface TimerControlsProps {
  onSelectTask: (taskId: number) => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({ onSelectTask }) => {
  const {
    todayTasks,
    activeSession,
    timerState,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const isRunning = timerState.isRunning;
  const currentTaskId = activeSession?.task.id;
  const pendingTasks = todayTasks.filter((t) => t.status !== 'completed');

  const handleStart = async () => {
    const idToStart = selectedTaskId ? parseInt(selectedTaskId, 10) : currentTaskId || (pendingTasks[0]?.id);
    if (idToStart) {
      await startTimer(idToStart);
    }
  };

  return (
    <div className="timer-controls-card">
      {/* Select task to track */}
      <div className="task-picker-row">
        <label className="picker-label">Working on:</label>
        <select
          value={currentTaskId ? currentTaskId.toString() : selectedTaskId}
          onChange={(e) => {
            setSelectedTaskId(e.target.value);
            if (e.target.value) {
              onSelectTask(parseInt(e.target.value, 10));
            }
          }}
          className="task-picker-select"
        >
          <option value="">-- Choose a task to track --</option>
          {pendingTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.category} - {t.priority})
            </option>
          ))}
        </select>
      </div>

      {/* Control Buttons */}
      <div className="controls-buttons-row">
        {isRunning ? (
          <Button
            variant="secondary"
            size="lg"
            icon={<Pause size={20} />}
            onClick={pauseTimer}
          >
            Pause Timer
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon={<Play size={20} />}
            onClick={handleStart}
            disabled={!currentTaskId && !selectedTaskId && pendingTasks.length === 0}
          >
            {activeSession ? 'Resume Timer' : 'Start Timer'}
          </Button>
        )}

        {activeSession && (
          <>
            <Button
              variant="ghost"
              size="lg"
              icon={<Square size={20} />}
              onClick={stopTimer}
              title="Stop timer session"
            >
              Stop
            </Button>

            <Button
              variant="success"
              size="lg"
              icon={<Check size={20} />}
              onClick={() => completeTask(activeSession.task.id)}
            >
              Finish & Mark Complete
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
