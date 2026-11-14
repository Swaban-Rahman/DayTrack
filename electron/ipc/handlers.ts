import { ipcMain, app, dialog, Notification, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getDb } from '../database/init';
import * as taskQueries from '../database/queries/tasks';
import * as sessionQueries from '../database/queries/sessions';
import * as planQueries from '../database/queries/plans';
import * as settingsQueries from '../database/queries/settings';
import * as distractionQueries from '../database/queries/distractions';
import * as analyticsQueries from '../database/queries/analytics';
import { setAutoStartup, getAutoStartup } from '../utils/startup';
import type { TaskFilters, CreateTaskInput, UpdateTaskInput, CreateDistractionInput, TimeAdjustment } from '../../src/types/index';

function wrapHandler<T>(fn: (...args: any[]) => T) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]): Promise<T> => {
    try {
      return fn(...args);
    } catch (err: any) {
      console.error(`IPC handler error:`, err);
      throw err;
    }
  };
}

export function registerAllHandlers(): void {
  // ── Tasks ──
  ipcMain.handle('tasks:get', wrapHandler((date: string) => taskQueries.getTasksByDate(date)));
  ipcMain.handle('tasks:getByRange', wrapHandler((startDate: string, endDate: string) => taskQueries.getTasksByRange(startDate, endDate)));
  ipcMain.handle('tasks:getAll', wrapHandler((filters?: TaskFilters) => taskQueries.getAllTasks(filters)));
  ipcMain.handle('tasks:getOne', wrapHandler((id: number) => taskQueries.getTaskById(id)));
  ipcMain.handle('tasks:create', wrapHandler((input: CreateTaskInput) => taskQueries.createTask(input)));
  ipcMain.handle('tasks:update', wrapHandler((input: UpdateTaskInput) => taskQueries.updateTask(input)));
  ipcMain.handle('tasks:delete', wrapHandler((id: number) => taskQueries.deleteTask(id)));
  ipcMain.handle('tasks:move', wrapHandler((id: number, newDate: string) => taskQueries.moveTask(id, newDate)));
  ipcMain.handle('tasks:carryForward', wrapHandler((fromDate: string, toDate: string) => taskQueries.carryForwardTasks(fromDate, toDate)));
  ipcMain.handle('tasks:getUnfinished', wrapHandler(() => taskQueries.getUnfinishedTasks()));

  // ── Timer / Sessions ──
  ipcMain.handle('timer:start', wrapHandler((taskId: number) => sessionQueries.startSession(taskId)));
  ipcMain.handle('timer:pause', wrapHandler((sessionId: number) => sessionQueries.pauseSession(sessionId)));
  ipcMain.handle('timer:stop', wrapHandler((sessionId: number) => sessionQueries.stopSession(sessionId)));
  ipcMain.handle('timer:getActive', wrapHandler(() => sessionQueries.getActiveSession()));
  ipcMain.handle('timer:getSessions', wrapHandler((taskId: number) => sessionQueries.getTaskSessions(taskId)));
  ipcMain.handle('timer:adjustTime', wrapHandler((taskId: number, minutes: number, reason: string) => sessionQueries.adjustTime(taskId, minutes, reason)));
  ipcMain.handle('timer:recover', wrapHandler(() => sessionQueries.recoverTimers()));

  // ── Plans ──
  ipcMain.handle('plans:get', wrapHandler((date: string) => planQueries.getDailyPlan(date)));
  ipcMain.handle('plans:save', wrapHandler((date: string, notes: string) => planQueries.saveDailyPlan(date, notes)));
  ipcMain.handle('plans:getSummary', wrapHandler((date: string) => planQueries.getDailySummary(date)));
  ipcMain.handle('plans:saveSummary', wrapHandler((date: string, notes: string) => planQueries.saveDailySummary(date, notes)));

  // ── Analytics ──
  ipcMain.handle('analytics:daily', wrapHandler((date: string) => analyticsQueries.getDailyAnalytics(date)));
  ipcMain.handle('analytics:weekly', wrapHandler((weekStart: string) => analyticsQueries.getWeeklyAnalytics(weekStart)));
  ipcMain.handle('analytics:monthly', wrapHandler((year: number, month: number) => analyticsQueries.getMonthlyAnalytics(year, month)));
  ipcMain.handle('analytics:category', wrapHandler((startDate: string, endDate: string) => analyticsQueries.getCategoryAnalytics(startDate, endDate)));

  // ── Distractions ──
  ipcMain.handle('distractions:log', wrapHandler((input: CreateDistractionInput) => distractionQueries.logDistraction(input)));
  ipcMain.handle('distractions:get', wrapHandler((date: string) => distractionQueries.getDistractions(date)));
  ipcMain.handle('distractions:getRange', wrapHandler((startDate: string, endDate: string) => distractionQueries.getDistractionsByRange(startDate, endDate)));
  ipcMain.handle('distractions:delete', wrapHandler((id: number) => distractionQueries.deleteDistraction(id)));

  // ── Settings ──
  ipcMain.handle('settings:get', wrapHandler((key: string) => settingsQueries.getSetting(key)));
  ipcMain.handle('settings:set', wrapHandler((key: string, value: string) => settingsQueries.setSetting(key, value)));
  ipcMain.handle('settings:getAll', wrapHandler(() => settingsQueries.getAllSettings()));

  // ── System ──
  ipcMain.handle('system:autoStartup:set', wrapHandler((enabled: boolean) => {
    setAutoStartup(enabled);
    settingsQueries.setSetting('autoStartup', String(enabled));
  }));

  ipcMain.handle('system:autoStartup:get', wrapHandler(() => getAutoStartup()));

  ipcMain.handle('system:notification', wrapHandler((title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }));

  ipcMain.handle('system:export:csv', wrapHandler((startDate: string, endDate: string) => {
    const tasks = taskQueries.getTasksByRange(startDate, endDate);
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Category', 'Estimated Minutes', 'Actual Minutes', 'Deadline', 'Scheduled Date', 'Created At', 'Completed At'];
    const rows = tasks.map((t) => [
      t.id, `"${t.title.replace(/"/g, '""')}"`, `"${t.description.replace(/"/g, '""')}"`,
      t.status, t.priority, t.category, t.estimated_minutes, t.actual_minutes,
      t.deadline || '', t.scheduled_date, t.created_at, t.completed_at || ''
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    const result = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Export Tasks to CSV',
      defaultPath: `daytrack-export-${startDate}-to-${endDate}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (result) {
      fs.writeFileSync(result, csv, 'utf-8');
      return result;
    }
    throw new Error('Export cancelled');
  }));

  ipcMain.handle('system:backup', wrapHandler(() => {
    const db = getDb();
    const dbPath = db.name;

    const result = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Backup Database',
      defaultPath: `daytrack-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'Database Files', extensions: ['db'] }],
    });

    if (result) {
      fs.copyFileSync(dbPath, result);
      return result;
    }
    throw new Error('Backup cancelled');
  }));

  ipcMain.handle('system:restore', wrapHandler((filePath: string) => {
    const db = getDb();
    const dbPath = db.name;

    // Close current db, copy the backup over, then re-init
    const { closeDb, initDatabase } = require('../database/init');
    closeDb();
    fs.copyFileSync(filePath, dbPath);
    initDatabase(dbPath);
  }));

  ipcMain.handle('system:reset', wrapHandler(() => {
    const db = getDb();
    // Drop all tables
    db.exec('DROP TABLE IF EXISTS task_sessions');
    db.exec('DROP TABLE IF EXISTS time_adjustments');
    db.exec('DROP TABLE IF EXISTS distraction_logs');
    db.exec('DROP TABLE IF EXISTS daily_summaries');
    db.exec('DROP TABLE IF EXISTS daily_plans');
    db.exec('DROP TABLE IF EXISTS app_settings');
    db.exec('DROP TABLE IF EXISTS tasks');

    // Re-run schema
    const { SCHEMA, DEFAULT_SETTINGS, INSERT_DEFAULT_SETTINGS } = require('../database/schema');
    db.exec(SCHEMA);
    const insertSetting = db.prepare(INSERT_DEFAULT_SETTINGS);
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value as string);
    }
  }));

  ipcMain.handle('system:version', wrapHandler(() => app.getVersion()));

  ipcMain.handle('system:selectFile', wrapHandler(() => {
    const result = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Select File',
      properties: ['openFile'],
      filters: [{ name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }],
    });
    return result && result.length > 0 ? result[0] : null;
  }));

  ipcMain.handle('system:selectSaveLocation', wrapHandler((defaultName: string) => {
    const result = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Save File',
      defaultPath: defaultName,
    });
    return result || null;
  }));
}
