import React, { useMemo, useState } from 'react';
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
    unfinishedTasks,
    activeSession,
    timerState,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask,
    notify
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const isRunning = timerState.isRunning;
  const currentTaskId = activeSession?.task.id;

  const selectableTasks = useMemo(() => {
    const map = new Map<number, (typeof todayTasks)[number]>();
    todayTasks.forEach((t) => map.set(t.id, t));
    unfinishedTasks.forEach((t) => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    if (activeSession) map.set(activeSession.task.id, activeSession.task);
    return Array.from(map.values()).filter((t) => t.status !== 'completed');
  }, [todayTasks, unfinishedTasks, activeSession]);

  const selectValue = selectedTaskId || (currentTaskId ? String(currentTaskId) : '');
  const selectedIsDifferent = !!selectedTaskId && !!currentTaskId && Number(selectedTaskId) !== currentTaskId;

  const handleStart = async () => {
    const idToStart = selectedTaskId ? parseInt(selectedTaskId, 10) : currentTaskId;
    if (!idToStart) {
      notify('Select a task before starting the timer.', 'info');
      return;
    }
    await startTimer(idToStart);
  };

  return (
    <div className="timer-controls-card">
      <div className="task-picker-row">
        <label className="picker-label">Working on:</label>
        <select
          value={selectValue}
          onChange={(e) => {
            setSelectedTaskId(e.target.value);
            if (e.target.value) {
              onSelectTask(parseInt(e.target.value, 10));
            }
          }}
          className="task-picker-select"
        >
          <option value="">-- Choose a task to track --</option>
          {selectableTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.category} - {t.priority})
            </option>
          ))}
        </select>
      </div>

      {isRunning && selectedIsDifferent && (
        <p className="timer-switch-hint">
          <ArrowRightLeft size={13} /> Starting the selected task will ask before pausing the
          current timer.
        </p>
      )}

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
            disabled={!currentTaskId && !selectedTaskId && selectableTasks.length === 0}
          >
            {selectedIsDifferent
              ? 'Start Selected Task'
              : activeSession
                ? 'Resume Timer'
                : 'Start Timer'}
          </Button>
        )}

        {isRunning && selectedIsDifferent && (
          <Button
            variant="primary"
            size="lg"
            icon={<Play size={20} />}
            onClick={handleStart}
          >
            Switch & Start
          </Button>
        )}

        {activeSession && (
          <>
            <Button
              variant="ghost"
              size="lg"
              icon={<Square size={20} />}
              onClick={stopTimer}
              title={isRunning ? 'Stop and save this session' : 'Clear the paused timer'}
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
