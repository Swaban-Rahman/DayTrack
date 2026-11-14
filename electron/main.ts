import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
  session,
} from 'electron';
import * as path from 'path';
import { initDatabase, closeDb, checkpoint, isDbOpen } from './database/init';
import { registerAllHandlers } from './ipc/handlers';
import {
  getActiveSession,
  recoverTimers,
  pauseSession,
  startSession,
  touchActiveSession,
} from './database/queries/sessions';
import { getTasksByDate, getUnfinishedTasks } from './database/queries/tasks';
import { getSetting, setSetting } from './database/queries/settings';
import {
  showDailyStartupNotification,
  showBreakReminder,
  checkDeadlineReminders,
  showNotification,
} from './utils/notifications';
import { localDateString } from './utils/dates';
import { isLoginStartup } from './utils/startup';
import type { TimerState } from '../src/types/index';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.setAppUserModelId('com.daytrack.app');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let breakReminderInterval: NodeJS.Timeout | null = null;
let isQuitting = false;
let tickCount = 0;
let currentDate = localDateString();
const notifiedDeadlines = new Set<string>();

const isDev = !app.isPackaged;

function getIconPath(): string {
  return app.isPackaged
    ? path.join(__dirname, '../dist/icon.png')
    : path.join(__dirname, '../public/icon.png');
}

function applyContentSecurityPolicy(): void {
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(false);
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow(startHidden: boolean): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!startHidden) showMainWindow();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'DayTrack',
    backgroundColor: '#0d0d14',
    autoHideMenuBar: true,
    icon: getIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (!app.isPackaged) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      if (level >= 2) {
        console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
      }
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('[renderer] process gone:', details.reason);
    });
    mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
      console.error(`[renderer] failed to load (${code}): ${description}`);
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    const minimizeToTray = getSetting('minimizeToTray') !== 'false';
    if (minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      isQuitting = true;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  let trayIcon: Electron.NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(getIconPath());
    if (trayIcon.isEmpty()) trayIcon = nativeImage.createEmpty();
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('DayTrack');
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
  updateTrayMenu();
}

function trayTimerAction(): void {
  try {
    const active = getActiveSession();
    if (!active) {
      showMainWindow();
      return;
    }
    if (active.isRunning && active.session) {
      pauseSession(active.session.id);
    } else {
      startSession(active.task.id);
    }
    updateTrayMenu();
  } catch (err) {
    console.error('Tray timer action failed:', err);
  }
}

function updateTrayMenu(): void {
  if (!tray) return;

  let statusLabel = 'No active timer';
  let actionLabel = 'Open DayTrack';
  let canToggle = false;

  try {
    const active = getActiveSession();
    if (active) {
      statusLabel = `${active.isRunning ? 'Tracking' : 'Paused'}: ${active.task.title}`;
      actionLabel = active.isRunning ? 'Pause timer' : 'Resume timer';
      canToggle = true;
      tray.setToolTip(`DayTrack — ${statusLabel}`);
    } else {
      tray.setToolTip('DayTrack');
    }
  } catch {
    statusLabel = 'No active timer';
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Show DayTrack', click: () => showMainWindow() },
    { label: statusLabel, enabled: false },
    { type: 'separator' },
  ];

  if (canToggle) {
    template.push({ label: actionLabel, click: trayTimerAction });
    template.push({ type: 'separator' });
  }

  template.push({
    label: 'Quit',
    click: () => {
      isQuitting = true;
      app.quit();
    },
  });

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function sendTimerState(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  let state: TimerState = {
    taskId: null,
    taskTitle: '',
    isRunning: false,
    sessionId: null,
    startTime: null,
    elapsedSeconds: 0,
    actualSeconds: 0,
    estimatedMinutes: 0,
  };

  try {
    const active = getActiveSession();
    if (active) {
      const running = active.isRunning;
      const elapsed = running && active.session
        ? Math.max(0, Math.floor((Date.now() - new Date(active.session.start_time).getTime()) / 1000))
        : active.session?.duration_seconds || 0;

      state = {
        taskId: active.task.id,
        taskTitle: active.task.title,
        isRunning: running,
        sessionId: active.session?.id ?? null,
        startTime: active.session?.start_time ?? null,
        elapsedSeconds: elapsed,
        actualSeconds: active.task.actual_minutes * 60 + (running ? elapsed : 0),
        estimatedMinutes: active.task.estimated_minutes,
      };
    }
  } catch (err) {
    console.error('Timer tick error:', err);
  }

  mainWindow.webContents.send('timer:tick', state);
}

function startTimerTick(): void {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    if (!isDbOpen()) return;
    tickCount += 1;

    try {
      sendTimerState();

      // Persist a heartbeat so a crash/shutdown only counts time we can prove was observed.
      if (tickCount % 15 === 0) {
        const active = getActiveSession();
        if (active?.isRunning) touchActiveSession();
      }

      if (tickCount % 30 === 0) updateTrayMenu();

      if (tickCount % 60 === 0) {
        if (getSetting('notificationsEnabled') !== 'false' && getSetting('deadlineReminders') !== 'false') {
          checkDeadlineReminders(notifiedDeadlines);
        }

        const today = localDateString();
        if (today !== currentDate) {
          currentDate = today;
          notifiedDeadlines.clear();
          mainWindow?.webContents.send('day:changed', today);
          maybeShowStartupNotification();
        }
      }
    } catch (err) {
      console.error('Timer tick loop error:', err);
    }
  }, 1000);
}

function startBreakReminders(): void {
  if (breakReminderInterval) return;
  breakReminderInterval = setInterval(() => {
    try {
      if (getSetting('breakReminders') !== 'true') return;
      const active = getActiveSession();
      if (active?.isRunning) showBreakReminder();
    } catch {
      // ignore
    }
  }, 90 * 60 * 1000);
}

function maybeShowStartupNotification(): void {
  try {
    if (getSetting('notificationsEnabled') === 'false') return;
    const today = localDateString();
    if (getSetting('lastStartupNotification') === today) return;

    const todayTasks = getTasksByDate(today);
    const unfinished = getUnfinishedTasks();
    showDailyStartupNotification(todayTasks.length, unfinished.length);
    setSetting('lastStartupNotification', today);
  } catch (err) {
    console.error('Startup notification error:', err);
  }
}

function pauseActiveTimer(): void {
  try {
    if (!isDbOpen()) return;
    const active = getActiveSession();
    if (active?.isRunning && active.session) {
      pauseSession(active.session.id);
      updateTrayMenu();
    }
  } catch (err) {
    console.error('Failed to pause active timer:', err);
  }
}

function registerPowerHandlers(): void {
  powerMonitor.on('suspend', () => {
    pauseActiveTimer();
  });

  powerMonitor.on('shutdown', () => {
    pauseActiveTimer();
    try {
      checkpoint();
    } catch {
      // best effort during OS shutdown
    }
  });

  powerMonitor.on('lock-screen', () => {
    if (getSetting('pauseOnLock') === 'true') {
      pauseActiveTimer();
    }
  });
}

function bootstrap(): void {
  const dbPath = path.join(app.getPath('userData'), 'daytrack.db');
  initDatabase(dbPath);

  try {
    const recovered = recoverTimers();
    if (recovered > 0 && getSetting('notificationsEnabled') !== 'false') {
      showNotification(
        'DayTrack timer recovered',
        `${recovered} unfinished timer session${recovered === 1 ? ' was' : 's were'} closed safely. Review the recorded time before continuing.`
      );
    }
  } catch (err) {
    console.error('Timer recovery error:', err);
  }

  registerAllHandlers();
  registerPowerHandlers();
  applyContentSecurityPolicy();

  createWindow(isLoginStartup());
  createTray();
  startTimerTick();
  startBreakReminders();
  maybeShowStartupNotification();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(false);
    } else {
      showMainWindow();
    }
  });
}

app.on('second-instance', () => {
  showMainWindow();
});

app.on('before-quit', () => {
  isQuitting = true;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (breakReminderInterval) {
    clearInterval(breakReminderInterval);
    breakReminderInterval = null;
  }

  pauseActiveTimer();

  try {
    checkpoint();
  } catch {
    // ignore
  }
  closeDb();
});

app.on('window-all-closed', () => {
  // With "minimize to tray" disabled the window was really closed — exit fully.
  if (isQuitting) {
    app.quit();
    return;
  }
  try {
    if (isDbOpen() && getSetting('minimizeToTray') === 'false') {
      isQuitting = true;
      app.quit();
    }
  } catch {
    // App is already shutting down.
  }
});

if (gotTheLock) {
  app.whenReady().then(bootstrap).catch((err) => {
    console.error('Failed to start DayTrack:', err);
    app.quit();
  });
}
