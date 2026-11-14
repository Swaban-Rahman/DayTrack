import { useApp } from '../context/AppContext';

export const useTasks = () => {
  const {
    todayTasks,
    unfinishedTasks,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    carryForwardTasks
  } = useApp();

  return {
    todayTasks,
    unfinishedTasks,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    carryForwardTasks
  };
};
