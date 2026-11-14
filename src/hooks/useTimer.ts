import { useApp } from '../context/AppContext';

export const useTimer = () => {
  const {
    activeSession,
    timerState,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask
  } = useApp();

  return {
    activeSession,
    timerState,
    isRunning: timerState.isRunning,
    elapsedSeconds: timerState.elapsedSeconds,
    activeTaskId: timerState.taskId,
    activeTaskTitle: timerState.taskTitle,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask
  };
};
