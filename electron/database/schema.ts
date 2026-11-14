// ─── DayTrack Database Schema ───

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  category TEXT DEFAULT 'other' CHECK(category IN ('study','coding','thesis','project','personal','other')),
  estimated_minutes INTEGER DEFAULT 60,
  actual_minutes INTEGER DEFAULT 0,
  deadline TEXT,
  scheduled_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  completed_at TEXT,
  carried_forward_from TEXT,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  session_date TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  last_heartbeat TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_date TEXT UNIQUE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  summary_date TEXT UNIQUE NOT NULL,
  total_tracked_minutes INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS time_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  adjustment_date TEXT,
  adjusted_minutes INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS distraction_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL,
  kind TEXT DEFAULT 'distraction' CHECK(kind IN ('distraction','break')),
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Immutable per-day record of where a task appeared.
-- Carrying a task forward adds a row for the new day instead of erasing history.
CREATE TABLE IF NOT EXISTS task_day_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(task_id, day),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_active ON task_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_distraction_logs_date ON distraction_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'dark',
  autoStartup: 'false',
  notificationsEnabled: 'true',
  deadlineReminders: 'true',
  breakReminders: 'false',
  dailyWorkingHours: '8',
  timeFormat: '24',
  startMinimized: 'true',
  minimizeToTray: 'true',
  pauseOnLock: 'true',
  lastStartupNotification: '',
};

export const INSERT_DEFAULT_SETTINGS = `
INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);
`;
