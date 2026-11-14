import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { SessionList } from '../components/timer/SessionList';
import { TimeAdjustment } from '../components/timer/TimeAdjustment';
import type { Task, TaskSession } from '../types';
import './TimerPage.css';

export const TimerPage: React.FC = () => {
  const { activeSession, todayTasks, unfinishedTasks, refreshTasks } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<TaskSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const candidateTasks = useMemo(() => {
    const map = new Map<number, Task>();
    todayTasks.forEach((t) => map.set(t.id, t));
    unfinishedTasks.forEach((t) => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    if (activeSession) map.set(activeSession.task.id, activeSession.task);
    return Array.from(map.values());
  }, [todayTasks, unfinishedTasks, activeSession]);

  const activeTask = activeSession?.task;
  const targetTaskId =
    selectedTaskId || activeTask?.id || (candidateTasks[0]?.id ?? null);
  const targetTask = candidateTasks.find((t) => t.id === targetTaskId);

  const loadSessions = useCallback(async (taskId: number) => {
    if (!window.daytrack) return;
    setSessionsLoading(true);
    try {
      const res = await window.daytrack.getTaskSessions(taskId);
      setSessions(res || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetTaskId) {
      loadSessions(targetTaskId);
    } else {
      setSessions([]);
    }
  }, [targetTaskId, activeSession, loadSessions]);

  const handleChanged = () => {
    refreshTasks();
    if (targetTaskId) loadSessions(targetTaskId);
  };

  return (
    <div className="timer-page">
      <TimerDisplay />

      <TimerControls onSelectTask={(id) => setSelectedTaskId(id)} />

      {targetTask ? (
        <div className="timer-page-grid">
          <SessionList
            sessions={sessions}
            taskTitle={targetTask.title}
            loading={sessionsLoading}
            onChanged={handleChanged}
          />
          <TimeAdjustment
            taskId={targetTask.id}
            taskTitle={targetTask.title}
            onAdjusted={handleChanged}
          />
        </div>
      ) : (
        <div className="timer-page-empty">
          <h3>No tasks available to track</h3>
          <p>Create a task first, then return here to start recording focused work.</p>
        </div>
      )}
    </div>
  );
};
