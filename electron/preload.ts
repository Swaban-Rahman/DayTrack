import { contextBridge, ipcRenderer } from 'electron';
import type { DayTrackAPI, TimerState } from '../src/types/index';

const api: DayTrackAPI = {
  // ── Tasks ──
  getTasks: (date) => ipcRenderer.invoke('tasks:get', date),
  getTasksByRange: (startDate, endDate) => ipcRenderer.invoke('tasks:getByRange', startDate, endDate),
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
  getActiveSession: () => ipcRenderer.invoke('timer:getActive'),
  getTaskSessions: (taskId) => ipcRenderer.invoke('timer:getSessions', taskId),
  adjustTime: (taskId, minutes, reason) => ipcRenderer.invoke('timer:adjustTime', taskId, minutes, reason),
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

  // ── Distractions ──
  logDistraction: (input) => ipcRenderer.invoke('distractions:log', input),
  getDistractions: (date) => ipcRenderer.invoke('distractions:get', date),
  getDistractionsByRange: (startDate, endDate) => ipcRenderer.invoke('distractions:getRange', startDate, endDate),
  deleteDistraction: (id) => ipcRenderer.invoke('distractions:delete', id),

  // ── Settings ──
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // ── System ──
  setAutoStartup: (enabled) => ipcRenderer.invoke('system:autoStartup:set', enabled),
  getAutoStartup: () => ipcRenderer.invoke('system:autoStartup:get'),
  showNotification: (title, body) => ipcRenderer.invoke('system:notification', title, body),
  exportToCSV: (startDate, endDate) => ipcRenderer.invoke('system:export:csv', startDate, endDate),
  backupData: () => ipcRenderer.invoke('system:backup'),
  restoreData: (filePath) => ipcRenderer.invoke('system:restore', filePath),
  resetData: () => ipcRenderer.invoke('system:reset'),
  getAppVersion: () => ipcRenderer.invoke('system:version'),
  selectFile: () => ipcRenderer.invoke('system:selectFile'),
  selectSaveLocation: (defaultName) => ipcRenderer.invoke('system:selectSaveLocation', defaultName),

  // ── Events from main process ──
  onTimerUpdate: (callback: (state: TimerState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: TimerState) => callback(state);
    ipcRenderer.on('timer:tick', listener);
    return () => {
      ipcRenderer.removeListener('timer:tick', listener);
    };
  },
};

contextBridge.exposeInMainWorld('daytrack', api);
