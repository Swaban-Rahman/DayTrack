import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { getDb, closeDb, initDatabase, checkpoint, isDbOpen } from '../database/init';
import { SCHEMA, DEFAULT_SETTINGS, INSERT_DEFAULT_SETTINGS } from '../database/schema';
import * as taskQueries from '../database/queries/tasks';
import * as sessionQueries from '../database/queries/sessions';
import * as planQueries from '../database/queries/plans';
import * as settingsQueries from '../database/queries/settings';
import * as distractionQueries from '../database/queries/distractions';
import * as analyticsQueries from '../database/queries/analytics';
import { setAutoStartup, getAutoStartup } from '../utils/startup';
import { showNotification } from '../utils/notifications';
import type {
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
  CreateDistractionInput,
  UpdateSessionInput,
} from '../../src/types/index';

function wrapHandler(fn: (...args: any[]) => unknown) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]): Promise<unknown> => {
    try {
      return await fn(...args);
    } catch (err: any) {
      console.error('IPC handler error:', err);
      throw new Error(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best effort
  }
}

function validateSqliteBackup(filePath: string): void {
  if (!fs.existsSync(filePath)) throw new Error('Backup file not found');

  let probe: Database.Database | null = null;
  try {
    probe = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = probe.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error('The selected file is not a healthy SQLite database');
    const hasTasks = probe.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
    if (!hasTasks) throw new Error('The selected database is not a DayTrack backup');
  } finally {
    probe?.close();
  }
}

export function registerAllHandlers(): void {
  // ── Tasks ──
  ipcMain.handle('tasks:get', wrapHandler((date: string) => taskQueries.getTasksByDate(date)));
  ipcMain.handle('tasks:getByRange', wrapHandler((startDate: string, endDate: string) => taskQueries.getTasksByRange(startDate, endDate)));
  ipcMain.handle('tasks:getHistory', wrapHandler((date: string) => taskQueries.getTaskHistoryByDate(date)));
  ipcMain.handle('tasks:getHistoryByRange', wrapHandler((startDate: string, endDate: string) => taskQueries.getTaskHistoryByRange(startDate, endDate)));
  ipcMain.handle('tasks:setDayStatus', wrapHandler((taskId: number, day: string, status: 'pending' | 'in_progress' | 'completed') => taskQueries.setTaskDayStatus(taskId, day, status)));
  ipcMain.handle('tasks:getAll', wrapHandler((filters?: TaskFilters) => taskQueries.getAllTasks(filters)));
  ipcMain.handle('tasks:getOne', wrapHandler((id: number) => taskQueries.getTaskById(id)));
  ipcMain.handle('tasks:create', wrapHandler((input: CreateTaskInput) => taskQueries.createTask(input)));
  ipcMain.handle('tasks:update', wrapHandler((input: UpdateTaskInput) => {
    if (input.status === 'completed') {
      sessionQueries.stopSessionsForTask(input.id);
    }
    return taskQueries.updateTask(input);
  }));
  ipcMain.handle('tasks:delete', wrapHandler((id: number) => {
    sessionQueries.stopSessionsForTask(id);
    taskQueries.deleteTask(id);
  }));
  ipcMain.handle('tasks:move', wrapHandler((id: number, newDate: string) => taskQueries.moveTask(id, newDate)));
  ipcMain.handle('tasks:carryForward', wrapHandler((fromDate: string, toDate: string) => taskQueries.carryForwardTasks(fromDate, toDate)));
  ipcMain.handle('tasks:getUnfinished', wrapHandler(() => taskQueries.getUnfinishedTasks()));

  // ── Timer / Sessions ──
  ipcMain.handle('timer:start', wrapHandler((taskId: number) => sessionQueries.startSession(taskId)));
  ipcMain.handle('timer:pause', wrapHandler((sessionId: number) => sessionQueries.pauseSession(sessionId)));
  ipcMain.handle('timer:stop', wrapHandler((sessionId: number) => sessionQueries.stopSession(sessionId)));
  ipcMain.handle('timer:clearContext', wrapHandler(() => sessionQueries.clearPausedContext()));
  ipcMain.handle('timer:getActive', wrapHandler(() => sessionQueries.getActiveSession()));
  ipcMain.handle('timer:getSessions', wrapHandler((taskId: number) => sessionQueries.getTaskSessions(taskId)));
  ipcMain.handle('timer:getSessionsByDate', wrapHandler((date: string) => sessionQueries.getSessionsByDate(date)));
  ipcMain.handle('timer:updateSessionTimes', wrapHandler((input: UpdateSessionInput) => sessionQueries.updateSessionTimes(input)));
  ipcMain.handle('timer:adjustTime', wrapHandler((taskId: number, minutes: number, reason: string, date?: string) =>
    sessionQueries.adjustTime(taskId, minutes, reason, date)
  ));
  ipcMain.handle('timer:getAdjustments', wrapHandler((taskId: number) => sessionQueries.getTaskAdjustments(taskId)));
  ipcMain.handle('timer:deleteAdjustment', wrapHandler((id: number) => sessionQueries.deleteTimeAdjustment(id)));
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
  ipcMain.handle('analytics:taskTime', wrapHandler((startDate: string, endDate: string) => analyticsQueries.getTaskTimeBreakdown(startDate, endDate)));

  // ── Distractions / breaks ──
  ipcMain.handle('distractions:log', wrapHandler((input: CreateDistractionInput) => distractionQueries.logDistraction(input)));
  ipcMain.handle('distractions:get', wrapHandler((date: string) => distractionQueries.getDistractions(date)));
  ipcMain.handle('distractions:getRange', wrapHandler((startDate: string, endDate: string) => distractionQueries.getDistractionsByRange(startDate, endDate)));
  ipcMain.handle('distractions:delete', wrapHandler((id: number) => distractionQueries.deleteDistraction(id)));

  // ── Settings ──
  ipcMain.handle('settings:get', wrapHandler((key: string) => settingsQueries.getSetting(key)));
  ipcMain.handle('settings:set', wrapHandler((key: string, value: string) => settingsQueries.setSetting(key, value)));
  ipcMain.handle('settings:getAll', wrapHandler(() => settingsQueries.getAllSettings()));

  // ── System ──
  ipcMain.handle('system:autoStartup:set', wrapHandler((enabled: boolean, startMinimized = true) => {
    setAutoStartup(enabled, startMinimized);
    settingsQueries.setSetting('autoStartup', String(enabled));
  }));

  ipcMain.handle('system:autoStartup:get', wrapHandler((startMinimized?: boolean) => getAutoStartup(startMinimized)));

  ipcMain.handle('system:notification', wrapHandler((title: string, body: string) => {
    showNotification(String(title).slice(0, 120), String(body).slice(0, 500));
  }));

  ipcMain.handle('system:export:csv', wrapHandler((startDate: string, endDate: string) => {
    const tasks = taskQueries.getTasksByRange(startDate, endDate);
    const db = getDb();

    const headers = [
      'ID', 'Title', 'Description', 'Status', 'Priority', 'Category',
      'Estimated Minutes', 'Actual Minutes', 'Deadline', 'Scheduled Date',
      'Created At', 'Completed At', 'Carried Forward From', 'Sessions', 'Last Session Date'
    ];

    const sessionStats = db.prepare(`
      SELECT task_id, COUNT(*) as sessions, MAX(session_date) as last_date
      FROM task_sessions GROUP BY task_id
    `).all() as { task_id: number; sessions: number; last_date: string | null }[];

    const statsByTask = new Map(sessionStats.map((row) => [row.task_id, row]));

    const rows = tasks.map((task) => {
      const stats = statsByTask.get(task.id);
      return [
        task.id,
        csvCell(task.title),
        csvCell(task.description),
        task.status,
        task.priority,
        task.category,
        task.estimated_minutes,
        task.actual_minutes,
        csvCell(task.deadline),
        task.scheduled_date,
        csvCell(task.created_at),
        csvCell(task.completed_at),
        csvCell(task.carried_forward_from),
        stats?.sessions || 0,
        csvCell(stats?.last_date),
      ].join(',');
    });

    // BOM keeps Excel happy with UTF-8 titles.
    const csv = '\ufeff' + [headers.join(','), ...rows].join('\r\n');

    const result = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Export Tasks to CSV',
      defaultPath: `daytrack-export-${startDate}-to-${endDate}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (!result) throw new Error('Export cancelled');

    fs.writeFileSync(result, csv, 'utf-8');
    return result;
  }));

  ipcMain.handle('system:backup', wrapHandler(async () => {
    if (!isDbOpen()) throw new Error('Database is not available');

    checkpoint();
    const result = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Backup DayTrack Database',
      defaultPath: `daytrack-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });

    if (!result) throw new Error('Backup cancelled');

    await getDb().backup(result);
    return result;
  }));

  ipcMain.handle('system:restore', wrapHandler(async (filePath: string) => {
    if (!isDbOpen()) throw new Error('Database is not available');
    if (!filePath) throw new Error('No backup file selected');

    const dbPath = getDb().name;
    const resolved = path.resolve(filePath);
    if (path.resolve(dbPath) === resolved) {
      throw new Error('Cannot restore the database over itself');
    }

    validateSqliteBackup(resolved);

    // Keep the current database recoverable if the restore fails halfway.
    checkpoint();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyPath = `${dbPath}.pre-restore-${stamp}.db`;
    await getDb().backup(safetyPath);

    closeDb();
    safeUnlink(`${dbPath}-wal`);
    safeUnlink(`${dbPath}-shm`);

    try {
      fs.copyFileSync(resolved, dbPath);
      initDatabase(dbPath);
    } catch (err) {
      try {
        safeUnlink(`${dbPath}-wal`);
        safeUnlink(`${dbPath}-shm`);
        fs.copyFileSync(safetyPath, dbPath);
        initDatabase(dbPath);
      } catch {
        // If the safety copy also fails there is nothing more we can do here.
      }
      throw new Error(`Restore failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }

    return;
  }));

  ipcMain.handle('system:reset', wrapHandler(() => {
    const db = getDb();
    checkpoint();

    const reset = db.transaction(() => {
      db.exec('DROP TABLE IF EXISTS task_day_logs');
      db.exec('DROP TABLE IF EXISTS task_sessions');
      db.exec('DROP TABLE IF EXISTS time_adjustments');
      db.exec('DROP TABLE IF EXISTS distraction_logs');
      db.exec('DROP TABLE IF EXISTS daily_summaries');
      db.exec('DROP TABLE IF EXISTS daily_plans');
      db.exec('DROP TABLE IF EXISTS app_settings');
      db.exec('DROP TABLE IF EXISTS tasks');
      db.exec(SCHEMA);

      const insertSetting = db.prepare(INSERT_DEFAULT_SETTINGS);
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insertSetting.run(key, value as string);
      }
    });

    reset();
  }));

  ipcMain.handle('system:version', wrapHandler(() => app.getVersion()));

  ipcMain.handle('system:selectFile', wrapHandler(() => {
    const result = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow()!, {
      title: 'Select DayTrack Backup',
      properties: ['openFile'],
      filters: [{ name: 'DayTrack Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
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
