import { contextBridge, ipcRenderer } from 'electron';
import type { DayTrackAPI, TimerState, ReminderPayload, ClosePromptPayload } from '../src/types/index';

const api: DayTrackAPI = {
  // ── Tasks ──
  getTasks: (date) => ipcRenderer.invoke('tasks:get', date),
  getTasksByRange: (startDate, endDate) => ipcRenderer.invoke('tasks:getByRange', startDate, endDate),
  getTaskHistory: (date) => ipcRenderer.invoke('tasks:getHistory', date),
  getTaskHistoryByRange: (startDate, endDate) => ipcRenderer.invoke('tasks:getHistoryByRange', startDate, endDate),
  setTaskDayStatus: (taskId, day, status) => ipcRenderer.invoke('tasks:setDayStatus', taskId, day, status),
  getAllTasks: (filters?) => ipcRenderer.invoke('tasks:getAll', filters),
  getTask: (id) => ipcRenderer.invoke('tasks:getOne', id),
  createTask: (input) => ipcRenderer.invoke('tasks:create', input),
  updateTask: (input) => ipcRenderer.invoke('tasks:update', input),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  moveTask: (id, newDate) => ipcRenderer.invoke('tasks:move', id, newDate),
  carryForwardTasks: (fromDate, toDate) => ipcRenderer.invoke('tasks:carryForward', fromDate, toDate),
  getUnfinishedTasks: () => ipcRenderer.invoke('tasks:getUnfinished'),

  // ── Timer / Sessions ──
  startTimer: (taskId) => ipcRenderer.invoke('timer:start', taskId),
  pauseTimer: (sessionId) => ipcRenderer.invoke('timer:pause', sessionId),
  stopTimer: (sessionId) => ipcRenderer.invoke('timer:stop', sessionId),
  clearTimerContext: () => ipcRenderer.invoke('timer:clearContext'),
  getActiveSession: () => ipcRenderer.invoke('timer:getActive'),
  getTaskSessions: (taskId) => ipcRenderer.invoke('timer:getSessions', taskId),
  getSessionsByDate: (date) => ipcRenderer.invoke('timer:getSessionsByDate', date),
  updateSessionTimes: (input) => ipcRenderer.invoke('timer:updateSessionTimes', input),
  adjustTime: (taskId, minutes, reason, date?) => ipcRenderer.invoke('timer:adjustTime', taskId, minutes, reason, date),
  getTaskAdjustments: (taskId) => ipcRenderer.invoke('timer:getAdjustments', taskId),
  deleteAdjustment: (id) => ipcRenderer.invoke('timer:deleteAdjustment', id),
  recoverTimers: () => ipcRenderer.invoke('timer:recover'),

  // ── Daily Plans ──
  getDailyPlan: (date) => ipcRenderer.invoke('plans:get', date),
  saveDailyPlan: (date, notes) => ipcRenderer.invoke('plans:save', date, notes),

  // ── Daily Summaries ──
  getDailySummary: (date) => ipcRenderer.invoke('plans:getSummary', date),
  saveDailySummary: (date, notes) => ipcRenderer.invoke('plans:saveSummary', date, notes),

  // ── Analytics ──
  getDailyAnalytics: (date) => ipcRenderer.invoke('analytics:daily', date),
  getWeeklyAnalytics: (weekStart) => ipcRenderer.invoke('analytics:weekly', weekStart),
  getMonthlyAnalytics: (year, month) => ipcRenderer.invoke('analytics:monthly', year, month),
  getCategoryAnalytics: (startDate, endDate) => ipcRenderer.invoke('analytics:category', startDate, endDate),
  getTaskTimeBreakdown: (startDate, endDate) => ipcRenderer.invoke('analytics:taskTime', startDate, endDate),

  // ── Distractions / breaks ──
  logDistraction: (input) => ipcRenderer.invoke('distractions:log', input),
  getDistractions: (date) => ipcRenderer.invoke('distractions:get', date),
  getDistractionsByRange: (startDate, endDate) => ipcRenderer.invoke('distractions:getRange', startDate, endDate),
  deleteDistraction: (id) => ipcRenderer.invoke('distractions:delete', id),

  // ── Settings ──
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // ── System ──
  setAutoStartup: (enabled, startMinimized) => ipcRenderer.invoke('system:autoStartup:set', enabled, startMinimized),
  getAutoStartup: (startMinimized) => ipcRenderer.invoke('system:autoStartup:get', startMinimized),
  showNotification: (title, body) => ipcRenderer.invoke('system:notification', title, body),
  exportToCSV: (startDate, endDate) => ipcRenderer.invoke('system:export:csv', startDate, endDate),
  backupData: () => ipcRenderer.invoke('system:backup'),
  restoreData: (filePath) => ipcRenderer.invoke('system:restore', filePath),
  resetData: () => ipcRenderer.invoke('system:reset'),
  getAppVersion: () => ipcRenderer.invoke('system:version'),
  selectFile: () => ipcRenderer.invoke('system:selectFile'),
  selectSaveLocation: (defaultName) => ipcRenderer.invoke('system:selectSaveLocation', defaultName),

  // ── Reminders ──
  getPendingReminder: () => ipcRenderer.invoke('reminder:getPending'),
  dismissReminder: () => ipcRenderer.invoke('reminder:dismiss'),
  respondClosePrompt: (decision) => ipcRenderer.invoke('reminder:closeDecision', decision),
  getWindowsReminderStatus: () => ipcRenderer.invoke('reminder:schedulerStatus'),
  registerWindowsReminderTasks: () => ipcRenderer.invoke('reminder:schedulerRegister'),

  // ── Events from main process ──
  onTimerUpdate: (callback: (state: TimerState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: TimerState) => callback(state);
    ipcRenderer.on('timer:tick', listener);
    return () => {
      ipcRenderer.removeListener('timer:tick', listener);
    };
  },
  onDayChanged: (callback: (date: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, date: string) => callback(date);
    ipcRenderer.on('day:changed', listener);
    return () => {
      ipcRenderer.removeListener('day:changed', listener);
    };
  },
  onReminder: (callback: (payload: ReminderPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ReminderPayload) => callback(payload);
    ipcRenderer.on('reminder:show', listener);
    return () => {
      ipcRenderer.removeListener('reminder:show', listener);
    };
  },
  onClosePrompt: (callback: (payload: ClosePromptPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ClosePromptPayload) => callback(payload);
    ipcRenderer.on('reminder:close-prompt', listener);
    return () => {
      ipcRenderer.removeListener('reminder:close-prompt', listener);
    };
  },
  onPreparePlan: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('reminder:prepare-plan', listener);
    return () => {
      ipcRenderer.removeListener('reminder:prepare-plan', listener);
    };
  },
};

contextBridge.exposeInMainWorld('daytrack', api);
