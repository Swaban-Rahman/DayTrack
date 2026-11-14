import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  Task,
  TaskSession,
  TimerState,
  PageName,
  CreateTaskInput,
  UpdateTaskInput,
  ActiveTimerContext,
  ReminderPayload,
  ClosePromptPayload,
  ClosePromptDecision,
} from "../types";
import { getToday } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { PendingReminderModal, ClosePromptModal } from "../components/reminders/ReminderModal";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type ToastKind = "error" | "success" | "info";

interface PendingStart {
  taskId: number;
  taskTitle: string;
  runningTitle: string;
  resolve: (confirmed: boolean) => void;
}

interface AppContextType {
  todayTasks: Task[];
  unfinishedTasks: Task[];
  activeSession: ActiveTimerContext | null;
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
  startTimer: (taskId: number) => Promise<TaskSession | null>;
  pauseTimer: () => Promise<TaskSession | null>;
  stopTimer: () => Promise<TaskSession | null>;
  completeTask: (taskId: number) => Promise<Task>;
  notify: (message: string, kind?: ToastKind) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_TIMER: TimerState = {
  taskId: null,
  taskTitle: "",
  isRunning: false,
  sessionId: null,
  startTime: null,
  elapsedSeconds: 0,
  actualSeconds: 0,
  estimatedMinutes: 0,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<PageName>("dashboard");
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [unfinishedTasks, setUnfinishedTasks] = useState<Task[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveTimerContext | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(EMPTY_TIMER);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingStart, setPendingStart] = useState<PendingStart | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [reminder, setReminder] = useState<ReminderPayload | null>(null);
  const [closePrompt, setClosePrompt] = useState<ClosePromptPayload | null>(null);

  const timerRef = useRef<TimerState>(EMPTY_TIMER);
  const activeRef = useRef<ActiveTimerContext | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, kind: ToastKind = "info") => {
    setToast({ message, kind });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

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
      activeRef.current = active;
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
    activeRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    timerRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    let cleanupTimer: (() => void) | undefined;
    let cleanupDay: (() => void) | undefined;
    let cleanupReminder: (() => void) | undefined;
    let cleanupClosePrompt: (() => void) | undefined;
    let cleanupPreparePlan: (() => void) | undefined;
    let pendingSyncTimer: number | undefined;

    const applyPendingReminder = (pending: ReminderPayload | null) => {
      if (!pending) return;
      setReminder(pending);
      if (pending.source === "startup" || pending.source === "notification") {
        setCurrentPage("dashboard");
      }
    };

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
          const previous = timerRef.current;
          const previousActive = activeRef.current;
          setTimerState(newState);

          const stopped = previous.isRunning && !newState.isRunning;
          const sessionChanged = previous.sessionId !== newState.sessionId;
          const appeared = !previousActive && newState.taskId !== null;

          if (stopped || sessionChanged || appeared) {
            refreshActiveSession();
          }
          if (stopped || appeared) {
            refreshTasks();
          }
        });

        cleanupDay = window.daytrack.onDayChanged(() => {
          refreshTasks();
          refreshActiveSession();
          notify("A new day has started. Today's plan and backlog are refreshed.", "info");
        });

        cleanupReminder = window.daytrack.onReminder((payload) => {
          setClosePrompt(null);
          setReminder(payload);
          if (payload.source === "startup" || payload.source === "notification") {
            setCurrentPage("dashboard");
          }
        });

        cleanupClosePrompt = window.daytrack.onClosePrompt((payload) => {
          setReminder(null);
          setClosePrompt(payload);
        });

        cleanupPreparePlan = window.daytrack.onPreparePlan(() => {
          setReminder(null);
          setClosePrompt(null);
          setCurrentPage("planning");
        });

        try {
          const pending = await window.daytrack.getPendingReminder();
          applyPendingReminder(pending);
        } catch (e) {
          console.error("Error loading pending reminder:", e);
        }

        // The main process may generate the startup reminder just after the
        // renderer mounts, and a pushed event can arrive before listeners are
        // attached. Re-read once to close that gap without polling forever.
        pendingSyncTimer = window.setTimeout(async () => {
          try {
            const pending = await window.daytrack.getPendingReminder();
            applyPendingReminder(pending);
          } catch (e) {
            console.error("Error re-checking pending reminder:", e);
          }
        }, 1500);
      }
      setIsLoading(false);
    };

    init();

    return () => {
      if (pendingSyncTimer) window.clearTimeout(pendingSyncTimer);
      if (cleanupTimer) cleanupTimer();
      if (cleanupDay) cleanupDay();
      if (cleanupReminder) cleanupReminder();
      if (cleanupClosePrompt) cleanupClosePrompt();
      if (cleanupPreparePlan) cleanupPreparePlan();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [refreshTasks, refreshActiveSession, refreshSettings, notify]);

  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    const task = await window.daytrack.createTask(input);
    await refreshTasks();
    notify("Task created.", "success");
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
    notify("Task deleted.", "info");
  };

  const moveTask = async (id: number, newDate: string): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    const task = await window.daytrack.moveTask(id, newDate);
    await refreshTasks();
    notify(`Task moved to ${newDate}.`, "success");
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

  const startTimer = async (taskId: number): Promise<TaskSession | null> => {
    if (!window.daytrack) return null;

    const current = timerRef.current;
    if (current.isRunning && current.taskId && current.taskId !== taskId) {
      const taskTitle = todayTasks.find((t) => t.id === taskId)?.title || "";
      const confirmed = await new Promise<boolean>((resolve) => {
        setPendingStart({
          taskId,
          taskTitle,
          runningTitle: current.taskTitle,
          resolve,
        });
      });
      if (!confirmed) return null;
    }

    try {
      if (current.isRunning && current.taskId === taskId) {
        return null;
      }

      const active = activeRef.current;
      if (active?.isRunning && active.session) {
        await window.daytrack.pauseTimer(active.session.id);
      }

      const session = await window.daytrack.startTimer(taskId);
      await refreshActiveSession();
      await refreshTasks();
      return session;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not start the timer.", "error");
      return null;
    }
  };

  const pauseTimer = async (): Promise<TaskSession | null> => {
    if (!window.daytrack) return null;
    const active = activeRef.current;
    if (!active?.isRunning || !active.session) return null;
    try {
      const session = await window.daytrack.pauseTimer(active.session.id);
      await refreshActiveSession();
      await refreshTasks();
      return session;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not pause the timer.", "error");
      return null;
    }
  };

  const stopTimer = async (): Promise<TaskSession | null> => {
    if (!window.daytrack) return null;
    const active = activeRef.current;
    try {
      if (active?.isRunning && active.session) {
        const session = await window.daytrack.stopTimer(active.session.id);
        await refreshActiveSession();
        await refreshTasks();
        return session;
      }
      if (active && !active.isRunning) {
        await window.daytrack.clearTimerContext();
        await refreshActiveSession();
        return null;
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not stop the timer.", "error");
    }
    return null;
  };

  const completeTask = async (taskId: number): Promise<Task> => {
    if (!window.daytrack) throw new Error("API not available");
    try {
      const active = activeRef.current;
      if (active && active.task.id === taskId) {
        if (active.isRunning && active.session) {
          await window.daytrack.stopTimer(active.session.id);
        } else {
          await window.daytrack.clearTimerContext();
        }
      }
      const updated = await window.daytrack.updateTask({
        id: taskId,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      await refreshTasks();
      await refreshActiveSession();
      notify("Task completed.", "success");
      return updated;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not complete the task.", "error");
      throw err;
    }
  };

  const confirmStart = () => {
    if (!pendingStart) return;
    pendingStart.resolve(true);
    setPendingStart(null);
  };

  const cancelStart = () => {
    if (!pendingStart) return;
    pendingStart.resolve(false);
    setPendingStart(null);
  };

  const dismissReminder = () => {
    setReminder(null);
    window.daytrack?.dismissReminder().catch((err) => console.error("Failed to dismiss reminder:", err));
  };

  const reviewPendingTasks = () => {
    dismissReminder();
    setCurrentPage("dashboard");
  };

  const prepareTomorrowPlan = () => {
    dismissReminder();
    setCurrentPage("planning");
  };

  const handleCloseDecision = async (decision: ClosePromptDecision) => {
    setClosePrompt(null);
    if (decision === "prepare") {
      setCurrentPage("planning");
    }
    try {
      await window.daytrack?.respondClosePrompt(decision);
    } catch (err) {
      console.error("Failed to send close decision:", err);
    }
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
        notify,
      }}
    >
      {children}

      {reminder && (
        <PendingReminderModal
          payload={reminder}
          onDismiss={dismissReminder}
          onReview={reviewPendingTasks}
          onPreparePlan={prepareTomorrowPlan}
        />
      )}

      {closePrompt && (
        <ClosePromptModal payload={closePrompt} onDecision={handleCloseDecision} />
      )}

      <Modal
        isOpen={!!pendingStart}
        onClose={cancelStart}
        title="Another task is running"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={cancelStart}>
              Keep current timer
            </Button>
            <Button variant="primary" onClick={confirmStart}>
              Pause and switch
            </Button>
          </>
        }
      >
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-primary)" }}>{pendingStart?.runningTitle}</strong> is
          currently being tracked. Starting another task will pause it first. The time recorded so
          far is kept.
        </p>
      </Modal>

      {toast && (
        <div className={`app-toast app-toast-${toast.kind}`} role="status">
          {toast.kind === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
