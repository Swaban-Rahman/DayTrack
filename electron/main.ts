import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { initDatabase, closeDb } from './database/init';
import { registerAllHandlers } from './ipc/handlers';
import { getActiveSession } from './database/queries/sessions';
import { getTasksByDate } from './database/queries/tasks';
import { getSetting } from './database/queries/settings';
import { recoverTimers } from './database/queries/sessions';
import { scheduleDeadlineReminders, showDailyStartupNotification, showBreakReminder } from './utils/notifications';
import { localDateString } from './utils/dates';
import type { TimerState } from '../src/types/index';

// ── Single instance lock ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let breakReminderInterval: NodeJS.Timeout | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DayTrack',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  // Create a simple tray icon (16x16 empty icon as fallback)
  let trayIcon: nativeImage;
  const iconPath = path.join(__dirname, '../public/icon.png');
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('DayTrack');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show DayTrack',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function startTimerTick(): void {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      const activeData = getActiveSession();
      if (activeData) {
        const { session, task } = activeData;
        const startTime = new Date(session.start_time).getTime();
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        const timerState: TimerState = {
          taskId: task.id,
          taskTitle: task.title,
          isRunning: true,
          sessionId: session.id,
          startTime: session.start_time,
          elapsedSeconds,
        };

        mainWindow.webContents.send('timer:tick', timerState);
      } else {
        const timerState: TimerState = {
          taskId: null,
          taskTitle: '',
          isRunning: false,
          sessionId: null,
          startTime: null,
          elapsedSeconds: 0,
        };
        mainWindow.webContents.send('timer:tick', timerState);
      }
    } catch (err) {
      console.error('Timer tick error:', err);
    }
  }, 1000);
}

function stopTimerTick(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startBreakReminders(): void {
  // Remind every 90 minutes
  breakReminderInterval = setInterval(() => {
    try {
      const enabled = getSetting('breakReminders');
      if (enabled === 'true') {
        showBreakReminder();
      }
    } catch {
      // ignore
    }
  }, 90 * 60 * 1000);
}

// ── App lifecycle ──

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopTimerTick();

  if (breakReminderInterval) {
    clearInterval(breakReminderInterval);
    breakReminderInterval = null;
  }

  // Gracefully save any active timer state
  try {
    const activeData = getActiveSession();
    if (activeData) {
      const { pauseSession } = require('./database/queries/sessions');
      pauseSession(activeData.session.id);
    }
  } catch (err) {
    console.error('Error saving timer state on quit:', err);
  }

  closeDb();
});

app.whenReady().then(() => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'daytrack.db');
  initDatabase(dbPath);

  // Recover any timers that were active when app last closed
  try {
    recoverTimers();
  } catch (err) {
    console.error('Timer recovery error:', err);
  }

  // Register IPC handlers
  registerAllHandlers();

  // Create window and tray
  createWindow();
  createTray();

  // Start timer tick updates
  startTimerTick();

  // Start break reminders
  startBreakReminders();

  // Startup notifications
  try {
    const notificationsEnabled = getSetting('notificationsEnabled');
    if (notificationsEnabled !== 'false') {
      const today = localDateString();
      const todayTasks = getTasksByDate(today);
      showDailyStartupNotification(todayTasks.length);

      // Schedule deadline reminders
      const deadlineReminders = getSetting('deadlineReminders');
      if (deadlineReminders !== 'false') {
        scheduleDeadlineReminders(todayTasks);
      }
    }
  } catch (err) {
    console.error('Startup notification error:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows, keep app running in tray
  if (process.platform !== 'darwin') {
    // Don't quit — tray keeps it alive
  }
});
