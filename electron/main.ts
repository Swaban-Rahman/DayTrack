import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
  session,
  ipcMain,
  Notification,
} from 'electron';
import * as path from 'path';
import { initDatabase, closeDb, checkpoint, isDbOpen } from './database/init';
import { registerAllHandlers } from './ipc/handlers';
import {
  getActiveSession,
  getTaskTrackedSeconds,
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
import { isLoginStartup, isReminderCheckLaunch } from './utils/startup';
import {
  collectReminderData,
  buildReminderPayload,
  buildClosePromptPayload,
  reminderToastBody,
  hasReminderContent,
  shouldNotify,
  resetReminderDedupe,
} from './reminders';
import {
  ensureSchedulerTask,
  getSchedulerStatus,
  registerSchedulerTask,
} from './windows/scheduler';
import type { ReminderData } from './reminders';
import type {
  TimerState,
  ReminderPayload,
  ReminderSource,
  ClosePromptDecision,
} from '../src/types/index';

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

let pendingReminderPayload: ReminderPayload | null = null;
let activeNotification: Notification | null = null;
let closePromptOpen = false;
let closePromptTimer: NodeJS.Timeout | null = null;
let reminderCheckTimer: NodeJS.Timeout | null = null;
let allowCloseOnce = false;
let shutdownInProgress = false;
let screenLocked = false;

const CLOSE_PROMPT_TIMEOUT_MS = 30 * 1000;

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

function sendToRenderer(channel: string, payload: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const contents = mainWindow.webContents;
  if (contents.isLoading()) {
    contents.once('did-finish-load', () => {
      if (!contents.isDestroyed()) contents.send(channel, payload);
    });
  } else {
    contents.send(channel, payload);
  }
}

function getClosePromptData(): ReminderData | null {
  try {
    if (!isDbOpen()) return null;
    const data = collectReminderData();
    if (data.tasks.length === 0 && !data.missingTomorrowPlan) return null;
    return data;
  } catch (err) {
    console.error('Reminder check failed:', err);
    return null;
  }
}

/**
 * Shown after login, wake-up, unlock, focus or a scheduler launch. Reads the
 * database every time so completed tasks are never reported as pending, and
 * reports an unsaved next-day plan even when no tasks are pending.
 */
function maybeShowPendingReminder(source: ReminderSource): boolean {
  try {
    if (!isDbOpen()) return false;

    // Already on screen — lifecycle events must not stack duplicate popups
    // or notifications while the user is reading this reminder.
    if (pendingReminderPayload) return false;

    const data = collectReminderData();
    if (!hasReminderContent(data)) {
      pendingReminderPayload = null;
      return false;
    }
    if (!shouldNotify(data, source)) return false;

    const payload = buildReminderPayload(data, source);
    pendingReminderPayload = payload;

    // Show the app for login and lifecycle reminders so the list is visible
    // even when the window was minimized or hidden in the tray.
    showMainWindow();
    sendToRenderer('reminder:show', payload);

    if (getSetting('notificationsEnabled') !== 'false' && Notification.isSupported()) {
      const notification = new Notification({
        title: data.tasks.length > 0 ? 'Welcome Back!' : 'DayTrack Reminder',
        body: reminderToastBody(data),
      });
      notification.on('click', () => {
        const clickedPayload: ReminderPayload = { ...payload, source: 'notification' };
        pendingReminderPayload = clickedPayload;
        showMainWindow();
        sendToRenderer('reminder:show', clickedPayload);
      });
      activeNotification = notification;
      notification.show();
    }

    return true;
  } catch (err) {
    console.error('Pending task reminder failed:', err);
    return false;
  }
}

function openClosePrompt(data: ReminderData): void {
  closePromptOpen = true;
  pendingReminderPayload = null;
  showMainWindow();
  sendToRenderer('reminder:close-prompt', buildClosePromptPayload(data));

  if (closePromptTimer) clearTimeout(closePromptTimer);
  // Never leave the window unclosable if the renderer stops responding.
  closePromptTimer = setTimeout(() => {
    if (closePromptOpen) respondClosePrompt('later');
  }, CLOSE_PROMPT_TIMEOUT_MS);
}

function respondClosePrompt(decision: ClosePromptDecision): void {
  if (!closePromptOpen) return;

  closePromptOpen = false;
  if (closePromptTimer) {
    clearTimeout(closePromptTimer);
    closePromptTimer = null;
  }

  if (decision === 'prepare') {
    showMainWindow();
    sendToRenderer('reminder:prepare-plan', null);
    return;
  }

  if (decision === 'later') {
    // Dismiss only this prompt. Future unlock/resume/login checks must still
    // find the outstanding tasks and next-day plan in SQLite.
    resetReminderDedupe();
    pendingReminderPayload = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    return;
  }

  allowCloseOnce = true;
  isQuitting = true;
  app.quit();
}

/** Explicit tray exit — the user asked to stop the background process. */
function exitApp(): void {
  if (isQuitting) return;
  isQuitting = true;
  allowCloseOnce = true;
  closePromptOpen = false;
  if (closePromptTimer) {
    clearTimeout(closePromptTimer);
    closePromptTimer = null;
  }
  app.quit();
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
    if (isQuitting || allowCloseOnce) return;

    const minimizeToTray = getSetting('minimizeToTray') !== 'false';

    if (shutdownInProgress) {
      // OS shutdown/logoff: never block the session from ending.
      isQuitting = true;
      return;
    }

    if (closePromptOpen) {
      event.preventDefault();
      return;
    }

    const reminderData = getClosePromptData();

    if (!reminderData) {
      if (minimizeToTray) {
        event.preventDefault();
        mainWindow?.hide();
      } else {
        isQuitting = true;
      }
      return;
    }

    event.preventDefault();
    openClosePrompt(reminderData);
  });

  // Re-check on focus (for example when the window is restored from the tray
  // or brought forward by a second launch). Throttled inside reminders.ts.
  mainWindow.on('focus', () => {
    if (pendingReminderPayload || closePromptOpen || shutdownInProgress) return;
    maybeShowPendingReminder('focus');
  });

  // Windows ends the session on logoff/shutdown/restart. Let it proceed; the
  // reminder is shown on the next sign-in instead of blocking the OS.
  mainWindow.on('session-end', () => {
    shutdownInProgress = true;
    try {
      checkpoint();
    } catch {
      // best effort during OS shutdown
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
    { label: 'Open DayTrack', click: () => showMainWindow() },
    { label: statusLabel, enabled: false },
    { type: 'separator' },
  ];

  if (canToggle) {
    template.push({ label: actionLabel, click: trayTimerAction });
    template.push({ type: 'separator' });
  }

  template.push({
    label: 'Exit DayTrack',
    click: () => exitApp(),
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
      const liveSeconds = running && active.session
        ? Math.max(0, Math.floor((Date.now() - new Date(active.session.start_time).getTime()) / 1000))
        : 0;
      // Pause finalizes a session row and resume opens a new one, so the
      // visible clock must be the sum of saved rows plus the live segment.
      // Otherwise resume appears to restart at 00:00 even though time was kept.
      const trackedSeconds = getTaskTrackedSeconds(active.task.id) + liveSeconds;

      state = {
        taskId: active.task.id,
        taskTitle: active.task.title,
        isRunning: running,
        sessionId: active.session?.id ?? null,
        startTime: active.session?.start_time ?? null,
        elapsedSeconds: trackedSeconds,
        actualSeconds: trackedSeconds,
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
      if (tickCount % 5 === 0) {
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

function maybeShowStartupNotification(includePendingReminder = false): void {
  try {
    const today = localDateString();

    if (includePendingReminder && maybeShowPendingReminder('startup')) {
      setSetting('lastStartupNotification', today);
      return;
    }

    if (getSetting('notificationsEnabled') === 'false') return;
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

/**
 * Windows fires several power/session events together around wake and unlock.
 * Debounce the check so SQLite and the session are ready and only one reminder
 * is produced.
 */
function scheduleReminderCheck(source: ReminderSource, delayMs = 1500): void {
  if (reminderCheckTimer) clearTimeout(reminderCheckTimer);
  reminderCheckTimer = setTimeout(() => {
    reminderCheckTimer = null;
    maybeShowPendingReminder(source);
  }, delayMs);
}

function registerPowerHandlers(): void {
  powerMonitor.on('suspend', () => {
    pauseActiveTimer();
    try {
      checkpoint();
    } catch {
      // best effort before sleep
    }
  });

  // Wake-up and unlock both land here. Unlock checks are deferred until the
  // session is actually unlocked; the short debounce collapses the burst.
  powerMonitor.on('resume', () => {
    if (!screenLocked) scheduleReminderCheck('resume');
  });

  powerMonitor.on('unlock-screen', () => {
    screenLocked = false;
    scheduleReminderCheck('unlock');
  });

  powerMonitor.on('shutdown', () => {
    // The OS is ending the session — never block it. Persist, then make a
    // best-effort notification; the reliable reminder appears next sign-in.
    shutdownInProgress = true;
    pauseActiveTimer();
    try {
      checkpoint();
    } catch {
      // best effort during OS shutdown
    }
    try {
      if (getSetting('notificationsEnabled') !== 'false' && Notification.isSupported()) {
        const data = collectReminderData();
        if (hasReminderContent(data)) {
          new Notification({
            title: data.tasks.length > 0 ? 'DayTrack – Unfinished tasks' : 'DayTrack Reminder',
            body: reminderToastBody(data),
          }).show();
        }
      }
    } catch {
      // best effort during OS shutdown
    }
  });

  powerMonitor.on('lock-screen', () => {
    screenLocked = true;
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

  ipcMain.handle('reminder:getPending', () => pendingReminderPayload);
  ipcMain.handle('reminder:dismiss', () => {
    pendingReminderPayload = null;
    resetReminderDedupe();
  });
  ipcMain.handle('reminder:closeDecision', (_event, decision: ClosePromptDecision) => {
    if (decision === 'prepare' || decision === 'later' || decision === 'close') {
      respondClosePrompt(decision);
    }
  });
  ipcMain.handle('reminder:schedulerStatus', () => getSchedulerStatus());
  ipcMain.handle('reminder:schedulerRegister', () => registerSchedulerTask());

  // Scheduler launches ("--reminder-check") stay in the tray unless the
  // database actually has something to remind the user about.
  const reminderLaunch = isReminderCheckLaunch();
  createWindow(isLoginStartup() || reminderLaunch);
  createTray();
  startTimerTick();
  startBreakReminders();
  if (reminderLaunch) {
    maybeShowPendingReminder('startup');
  } else {
    maybeShowStartupNotification(true);
  }

  // Register/refresh the Windows reminder task once the window is up. Failure
  // (policy restrictions, portable build) must not stop the app from running.
  setTimeout(() => ensureSchedulerTask(), 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(false);
    } else {
      showMainWindow();
    }
  });
}

app.on('second-instance', (_event, argv) => {
  // A scheduler trigger while the app is already running must not open the
  // window unless there is an actual reminder; a manual second launch should
  // focus the existing window as before.
  if (isReminderCheckLaunch(argv)) {
    maybeShowPendingReminder('second-instance');
    return;
  }
  showMainWindow();
  maybeShowPendingReminder('second-instance');
});

app.on('before-quit', () => {
  isQuitting = true;

  if (closePromptTimer) {
    clearTimeout(closePromptTimer);
    closePromptTimer = null;
  }
  if (reminderCheckTimer) {
    clearTimeout(reminderCheckTimer);
    reminderCheckTimer = null;
  }
  closePromptOpen = false;

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
