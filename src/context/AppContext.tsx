import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  Task,
  TaskSession,
  TimerState,
  PageName,
  CreateTaskInput,
  UpdateTaskInput,
} from "../types";
import { getToday } from "../utils/helpers";

interface AppContextType {
  todayTasks: Task[];
  unfinishedTasks: Task[];
  activeSession: { session: TaskSession; task: Task } | null;
  timerState: TimerState;
  settings: Record<string, string>;
  currentPage: PageName;
  setCurrentPage: (page: PageName) => void;
  isLoading: boolean;
  refreshTasks: () => Promise<void>;
  refreshActiveSession: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  moveTask: (id: number, newDate: string) => Promise<Task>;
  carryForwardTasks: (fromDate: string, toDate: string) => Promise<Task[]>;
  startTimer: (taskId: number) => Promise<TaskSession>;
  pauseTimer: () => Promise<TaskSession | null>;
  stopTimer: () => Promise<TaskSession | null>;
  completeTask: (taskId: number) => Promise<Task>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<PageName>("dashboard");
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [unfinishedTasks, setUnfinishedTasks] = useState<Task[]>([]);
  const [activeSession, setActiveSession] = useState<{
    session: TaskSession;
    task: Task;
  } | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    taskId: null,
    taskTitle: "",
    isRunning: false,
    sessionId: null,
    startTime: null,
    elapsedSeconds: 0,
  });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    if (!window.daytrack) return;
    try {
      const today = getToday();
      const [todayList, unfinishedList] = await Promise.all([
        window.daytrack.getTasks(today),
        window.daytrack.getUnfinishedTasks(),
      ]);
      setTodayTasks(todayList || []);
      setUnfinishedTasks(unfinishedList || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, []);

  const refreshActiveSession = useCallback(async () => {
    if (!window.daytrack) return;
    try {
      const active = await window.daytrack.getActiveSession();
      setActiveSession(active);
    } catch (err) {
      console.error("Failed to get active session:", err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!window.daytrack) return;
    try {
      const allSettings = await window.daytrack.getAllSettings();
      setSettings(allSettings || {});
    } catch (err) {
      console.error("Failed to get settings:", err);
    }
  }, []);

  useEffect(() => {
    let cleanupTimer: (() => void) | undefined;

    const init = async () => {
      setIsLoading(true);
      if (window.daytrack) {
        try {
          await window.daytrack.recoverTimers();
        } catch (e) {
          console.error("Error recovering timers:", e);
        }
        await Promise.all([
          refreshTasks(),
          refreshActiveSession(),
          refreshSettings(),
        ]);

        cleanupTimer = window.daytrack.onTimerUpdate((newState) => {
          setTimerState(newState);
        });
      }
      setIsLoading(false);
    };

    init();

    return () => {
      if (cleanupTimer) cleanupTimer();
    };
  }, [refreshTasks, refreshActiveSession, refreshSettings]);

  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    const task = await window.daytrack.createTask(input);
    await refreshTasks();
    return task;
  };

  const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    const task = await window.daytrack.updateTask(input);
    await refreshTasks();
    await refreshActiveSession();
    return task;
  };

  const deleteTask = async (id: number): Promise<void> => {
    if (!window.daytrack) throw new Error("API not available");
    await window.daytrack.deleteTask(id);
    await refreshTasks();
    await refreshActiveSession();
  };

  const moveTask = async (id: number, newDate: string): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    const task = await window.daytrack.moveTask(id, newDate);
    await refreshTasks();
    return task;
  };

  const carryForwardTasks = async (
    fromDate: string,
    toDate: string,
  ): Promise<Task[]> => {
    if (!window.daytrack) throw new Error("API not available");
    const carried = await window.daytrack.carryForwardTasks(fromDate, toDate);
    await refreshTasks();
    return carried;
  };

  const startTimer = async (taskId: number): Promise<TaskSession> => {
    if (!window.daytrack) throw new Error("API not available");
    const session = await window.daytrack.startTimer(taskId);
    await refreshActiveSession();
    await refreshTasks();
    return session;
  };

  const pauseTimer = async (): Promise<TaskSession | null> => {
    if (!window.daytrack || !activeSession) return null;
    const session = await window.daytrack.pauseTimer(activeSession.session.id);
    await refreshActiveSession();
    await refreshTasks();
    return session;
  };

  const stopTimer = async (): Promise<TaskSession | null> => {
    if (!window.daytrack || !activeSession) return null;
    const session = await window.daytrack.stopTimer(activeSession.session.id);
    await refreshActiveSession();
    await refreshTasks();
    return session;
  };

  const completeTask = async (taskId: number): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    if (activeSession && activeSession.task.id === taskId) {
      await window.daytrack.stopTimer(activeSession.session.id);
    }
    const updated = await window.daytrack.updateTask({
      id: taskId,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await refreshTasks();
    await refreshActiveSession();
    return updated;
  };

  return (
    <AppContext.Provider
      value={{
        todayTasks,
        unfinishedTasks,
        activeSession,
        timerState,
        settings,
        currentPage,
        setCurrentPage,
        isLoading,
        refreshTasks,
        refreshActiveSession,
        refreshSettings,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        carryForwardTasks,
        startTimer,
        pauseTimer,
        stopTimer,
        completeTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
