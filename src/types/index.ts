// ──────────────────────────────────────────
// DayTrack – Shared Type Definitions
// ──────────────────────────────────────────

// ── Enums / Literals ──

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'study' | 'coding' | 'thesis' | 'project' | 'personal' | 'other';

export const TASK_CATEGORIES: TaskCategory[] = ['study', 'coding', 'thesis', 'project', 'personal', 'other'];
export const TASK_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];
export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

export const DISTRACTION_CATEGORIES = [
  'Social media',
  'YouTube',
  'Unnecessary browsing',
  'Random activities',
  'Other distractions'
] as const;
export type DistractionCategory = typeof DISTRACTION_CATEGORIES[number];

export const BREAK_CATEGORIES = [
  'Short break',
  'Meal',
  'Exercise',
  'Rest / recharge',
  'Other break'
] as const;
export type BreakCategory = typeof BREAK_CATEGORIES[number];

export type LogKind = 'distraction' | 'break';

// ── Database Row Types ──

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  estimated_minutes: number;
  actual_minutes: number;
  deadline: string | null;
  scheduled_date: string;          // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  carried_forward_from: string | null;
  is_deleted: number;
  // Present when the row came from the per-day history table.
  day_status?: TaskStatus;
  history_day?: string;
}

export interface TaskSession {
  id: number;
  task_id: number;
  session_date: string;            // YYYY-MM-DD (local date the session started)
  start_time: string;              // ISO 8601
  end_time: string | null;
  duration_seconds: number;
  is_active: number;               // 0 | 1
  last_heartbeat: string | null;
}

export interface SessionWithTask extends TaskSession {
  task_title: string;
  task_category: TaskCategory;
}

export interface ActiveTimerContext {
  session: TaskSession | null;     // running session, or the last session for a paused task
  task: Task;
  isRunning: boolean;
}

export interface DailyPlan {
  id: number;
  plan_date: string;               // YYYY-MM-DD
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: number;
  summary_date: string;            // YYYY-MM-DD
  total_tracked_minutes: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  notes: string;
  created_at: string;
}

export interface TimeAdjustment {
  id: number;
  task_id: number;
  adjustment_date: string | null;
  adjusted_minutes: number;
  reason: string;
  created_at: string;
}

export interface DistractionLog {
  id: number;
  log_date: string;                // YYYY-MM-DD
  kind: LogKind;
  category: string;
  duration_minutes: number;
  description: string;
  created_at: string;
}

// ── Input / Mutation Types ──

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  estimated_minutes: number;
  deadline?: string;
  scheduled_date: string;          // YYYY-MM-DD
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  estimated_minutes?: number;
  actual_minutes?: number;
  deadline?: string | null;
  scheduled_date?: string;
  completed_at?: string | null;
}

export interface UpdateSessionInput {
  id: number;
  start_time: string;
  end_time: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateDistractionInput {
  log_date: string;
  kind?: LogKind;
  category: string;
  duration_minutes: number;
  description: string;
}

// ── Analytics Types ──

export interface CategoryBreakdown {
  category: string;
  minutes: number;
}

export interface EstimatedVsActual {
  taskTitle: string;
  estimated: number;
  actual: number;
}

export interface TaskTimeBreakdown {
  taskId: number;
  taskTitle: string;
  category: TaskCategory;
  minutes: number;
}

export interface DailyAnalytics {
  date: string;
  totalTrackedMinutes: number;
  adjustmentMinutes: number;
  breakMinutes: number;
  distractionMinutes: number;
  estimatedMinutes: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  categoryBreakdown: CategoryBreakdown[];
  estimatedVsActual: EstimatedVsActual[];
  taskTimeBreakdown: TaskTimeBreakdown[];
}

export interface WeeklyAnalytics {
  weekStart: string;
  weekEnd: string;
  dailyData: DailyAnalytics[];
  totalTrackedMinutes: number;
  totalCompletedTasks: number;
  averageDailyMinutes: number;
}

// ── Timer State ──

export interface TimerState {
  taskId: number | null;
  taskTitle: string;
  isRunning: boolean;
  sessionId: number | null;
  startTime: string | null;
  elapsedSeconds: number;          // current (or most recent) session
  actualSeconds: number;           // all tracked time for the task, including live session
  estimatedMinutes: number;
}

// ── Reminders ──

export type ReminderSource =
  | 'startup'
  | 'resume'
  | 'unlock'
  | 'focus'
  | 'second-instance'
  | 'notification';

export interface ReminderTaskInfo {
  id: number;
  title: string;
  scheduled_date: string;          // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
}

export interface ReminderPayload {
  source: ReminderSource;
  pendingCount: number;
  todayPendingCount: number;
  overdueCount: number;
  tasks: ReminderTaskInfo[];
  message: string;
  missingTomorrowPlan: boolean;
  tomorrowDate: string;
}

export interface ClosePromptPayload {
  pendingCount: number;
  todayPendingCount: number;
  overdueCount: number;
  tasks: ReminderTaskInfo[];
  missingTomorrowPlan: boolean;
  tomorrowDate: string;
}

export type ClosePromptDecision = 'prepare' | 'later' | 'close';

// ── Windows Task Scheduler ──

export interface WindowsReminderStatus {
  supported: boolean;          // packaged Windows build
  registered: boolean;
  enabled: boolean;
  state: string;               // Ready | Running | Disabled | Unknown
  exePath: string;             // executable the task currently launches
  expectedExePath: string;     // currently running executable
  needsUpdate: boolean;
  triggers: string[];
  lastRunTime: string | null;
  lastResult: number | null;
  message: string;
}

// ── Navigation ──

export type PageName = 'dashboard' | 'tasks' | 'timer' | 'calendar' | 'analytics' | 'planning' | 'settings';

// ── Settings ──

export interface AppSettingsMap {
  theme: 'dark' | 'light';
  autoStartup: 'true' | 'false';
  notificationsEnabled: 'true' | 'false';
  deadlineReminders: 'true' | 'false';
  breakReminders: 'true' | 'false';
  dailyWorkingHours: string;           // e.g. "8"
  timeFormat: '12' | '24';
  startMinimized: 'true' | 'false';
  minimizeToTray: 'true' | 'false';
  pauseOnLock: 'true' | 'false';
  [key: string]: string;
}

// ── Preload API (exposed on window.daytrack) ──

export interface DayTrackAPI {
  // Tasks
  getTasks: (date: string) => Promise<Task[]>;
  getTasksByRange: (startDate: string, endDate: string) => Promise<Task[]>;
  getTaskHistory: (date: string) => Promise<Task[]>;
  getTaskHistoryByRange: (startDate: string, endDate: string) => Promise<Task[]>;
  setTaskDayStatus: (taskId: number, day: string, status: TaskStatus) => Promise<void>;
  getAllTasks: (filters?: TaskFilters) => Promise<Task[]>;
  getTask: (id: number) => Promise<Task | null>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  moveTask: (id: number, newDate: string) => Promise<Task>;
  carryForwardTasks: (fromDate: string, toDate: string) => Promise<Task[]>;
  getUnfinishedTasks: () => Promise<Task[]>;

  // Timer / Sessions
  startTimer: (taskId: number) => Promise<TaskSession>;
  pauseTimer: (sessionId: number) => Promise<TaskSession>;
  stopTimer: (sessionId: number) => Promise<TaskSession>;
  clearTimerContext: () => Promise<void>;
  getActiveSession: () => Promise<ActiveTimerContext | null>;
  getTaskSessions: (taskId: number) => Promise<TaskSession[]>;
  getSessionsByDate: (date: string) => Promise<SessionWithTask[]>;
  updateSessionTimes: (input: UpdateSessionInput) => Promise<TaskSession>;
  adjustTime: (taskId: number, minutes: number, reason: string, date?: string) => Promise<TimeAdjustment>;
  getTaskAdjustments: (taskId: number) => Promise<TimeAdjustment[]>;
  deleteAdjustment: (id: number) => Promise<void>;
  recoverTimers: () => Promise<number>;

  // Daily Plans
  getDailyPlan: (date: string) => Promise<DailyPlan | null>;
  saveDailyPlan: (date: string, notes: string) => Promise<DailyPlan>;

  // Daily Summaries
  getDailySummary: (date: string) => Promise<DailySummary | null>;
  saveDailySummary: (date: string, notes: string) => Promise<DailySummary>;

  // Analytics
  getDailyAnalytics: (date: string) => Promise<DailyAnalytics>;
  getWeeklyAnalytics: (weekStart: string) => Promise<WeeklyAnalytics>;
  getMonthlyAnalytics: (year: number, month: number) => Promise<DailyAnalytics[]>;
  getCategoryAnalytics: (startDate: string, endDate: string) => Promise<CategoryBreakdown[]>;
  getTaskTimeBreakdown: (startDate: string, endDate: string) => Promise<TaskTimeBreakdown[]>;

  // Distractions / breaks
  logDistraction: (input: CreateDistractionInput) => Promise<DistractionLog>;
  getDistractions: (date: string) => Promise<DistractionLog[]>;
  getDistractionsByRange: (startDate: string, endDate: string) => Promise<DistractionLog[]>;
  deleteDistraction: (id: number) => Promise<void>;

  // Settings
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
  getAllSettings: () => Promise<Record<string, string>>;

  // System
  setAutoStartup: (enabled: boolean, startMinimized?: boolean) => Promise<void>;
  getAutoStartup: (startMinimized?: boolean) => Promise<boolean>;
  showNotification: (title: string, body: string) => Promise<void>;
  exportToCSV: (startDate: string, endDate: string) => Promise<string>;
  backupData: () => Promise<string>;
  restoreData: (filePath: string) => Promise<void>;
  resetData: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  selectFile: () => Promise<string | null>;
  selectSaveLocation: (defaultName: string) => Promise<string | null>;

  // Reminders
  getPendingReminder: () => Promise<ReminderPayload | null>;
  dismissReminder: () => Promise<void>;
  respondClosePrompt: (decision: ClosePromptDecision) => Promise<void>;
  getWindowsReminderStatus: () => Promise<WindowsReminderStatus>;
  registerWindowsReminderTasks: () => Promise<WindowsReminderStatus>;

  // Events from main process
  onTimerUpdate: (callback: (state: TimerState) => void) => () => void;
  onDayChanged: (callback: (date: string) => void) => () => void;
  onReminder: (callback: (payload: ReminderPayload) => void) => () => void;
  onClosePrompt: (callback: (payload: ClosePromptPayload) => void) => () => void;
  onPreparePlan: (callback: () => void) => () => void;
}

// ── Extend Window ──

declare global {
  interface Window {
    daytrack: DayTrackAPI;
  }
}

export {};
