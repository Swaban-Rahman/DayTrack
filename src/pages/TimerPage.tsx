import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { SessionList } from '../components/timer/SessionList';
import { TimeAdjustment } from '../components/timer/TimeAdjustment';
import type { TaskSession } from '../types';
import './TimerPage.css';

export const TimerPage: React.FC = () => {
  const { activeSession, todayTasks } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<TaskSession[]>([]);

  const activeTask = activeSession?.task;
  const targetTaskId = selectedTaskId || activeTask?.id || (todayTasks[0]?.id ?? null);
  const targetTask = todayTasks.find((t) => t.id === targetTaskId);

  useEffect(() => {
    if (targetTaskId && window.daytrack) {
      window.daytrack.getTaskSessions(targetTaskId).then((res) => {
        setSessions(res || []);
      }).catch(console.error);
    }
  }, [targetTaskId, activeSession]);

  return (
    <div className="timer-page">
      <TimerDisplay />

      <TimerControls
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {targetTask && (
        <div className="timer-page-grid">
          <SessionList
            sessions={sessions}
            taskTitle={targetTask.title}
          />
          <TimeAdjustment
            taskId={targetTask.id}
            taskTitle={targetTask.title}
            onAdjusted={() => {
              if (window.daytrack) {
                window.daytrack.getTaskSessions(targetTask.id).then(setSessions);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
