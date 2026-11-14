import { getDb } from '../init';
import { localDateString } from '../../utils/dates';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, TaskStatus } from '../../../src/types/index';

const PRIORITY_ORDER = "CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value: string, label: string): void {
  if (!DATE_RE.test(value)) throw new Error(`${label} must use YYYY-MM-DD format`);
}

function assertPriority(value: string): void {
  if (!['high', 'medium', 'low'].includes(value)) throw new Error('Invalid task priority');
}

function assertCategory(value: string): void {
  if (!['study', 'coding', 'thesis', 'project', 'personal', 'other'].includes(value)) {
    throw new Error('Invalid task category');
  }
}

export function upsertTaskDay(taskId: number, day: string, status: TaskStatus): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO task_day_logs (task_id, day, status)
    VALUES (?, ?, ?)
    ON CONFLICT(task_id, day)
    DO UPDATE SET status = excluded.status, updated_at = datetime('now','localtime')
  `).run(taskId, day, status);
}

export function getTasksByDate(date: string): Task[] {
  assertDate(date, 'Date');
  const db = getDb();
  return db.prepare(
    `SELECT t.* FROM tasks t WHERE t.scheduled_date = ? AND t.is_deleted = 0 ORDER BY ${PRIORITY_ORDER}, t.created_at ASC`
  ).all(date) as Task[];
}

export function getTaskHistoryByDate(date: string): Task[] {
  assertDate(date, 'Date');
  const db = getDb();
  return db.prepare(`
    SELECT t.*, d.status AS day_status, d.day AS history_day
    FROM task_day_logs d
    INNER JOIN tasks t ON t.id = d.task_id
    WHERE d.day = ? AND t.is_deleted = 0
    ORDER BY ${PRIORITY_ORDER}, t.created_at ASC
  `).all(date) as Task[];
}

export function getTaskHistoryByRange(startDate: string, endDate: string): Task[] {
  assertDate(startDate, 'Start date');
  assertDate(endDate, 'End date');
  const db = getDb();
  return db.prepare(`
    SELECT t.*, d.status AS day_status, d.day AS history_day
    FROM task_day_logs d
    INNER JOIN tasks t ON t.id = d.task_id
    WHERE d.day >= ? AND d.day <= ? AND t.is_deleted = 0
    ORDER BY d.day ASC, ${PRIORITY_ORDER}
  `).all(startDate, endDate) as Task[];
}

export function getTasksByRange(startDate: string, endDate: string): Task[] {
  assertDate(startDate, 'Start date');
  assertDate(endDate, 'End date');
  const db = getDb();
  return db.prepare(
    `SELECT t.* FROM tasks t WHERE t.scheduled_date >= ? AND t.scheduled_date <= ? AND t.is_deleted = 0 ORDER BY t.scheduled_date ASC, ${PRIORITY_ORDER}`
  ).all(startDate, endDate) as Task[];
}

export function getAllTasks(filters?: TaskFilters): Task[] {
  const db = getDb();
  const conditions: string[] = ['t.is_deleted = 0'];
  const params: any[] = [];

  if (filters) {
    if (filters.status) {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push('t.category = ?');
      params.push(filters.category);
    }
    if (filters.priority) {
      conditions.push('t.priority = ?');
      params.push(filters.priority);
    }
    if (filters.startDate) {
      assertDate(filters.startDate, 'Start date');
      conditions.push('t.scheduled_date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      assertDate(filters.endDate, 'End date');
      conditions.push('t.scheduled_date <= ?');
      params.push(filters.endDate);
    }
    if (filters.search) {
      conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const sql = `SELECT t.* FROM tasks t WHERE ${conditions.join(' AND ')} ORDER BY t.scheduled_date DESC, ${PRIORITY_ORDER}`;
  return db.prepare(sql).all(...params) as Task[];
}

export function getTaskById(id: number): Task | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(id) as Task) || null;
}

export function createTask(input: CreateTaskInput): Task {
  const title = (input.title || '').trim();
  if (!title) throw new Error('Task title is required');
  if (title.length > 300) throw new Error('Task title is too long');
  assertPriority(input.priority);
  assertCategory(input.category);
  assertDate(input.scheduled_date, 'Scheduled date');

  const estimated = Math.round(Number(input.estimated_minutes));
  if (!Number.isFinite(estimated) || estimated <= 0) {
    throw new Error('Estimated duration must be greater than 0');
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, category, estimated_minutes, deadline, scheduled_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    (input.description || '').trim(),
    input.priority,
    input.category,
    estimated,
    input.deadline || null,
    input.scheduled_date
  );

  const id = result.lastInsertRowid as number;
  upsertTaskDay(id, input.scheduled_date, 'pending');
  return getTaskById(id)!;
}

export function updateTask(input: UpdateTaskInput): Task {
  const db = getDb();
  const existing = getTaskById(input.id);
  if (!existing) throw new Error('Task not found');

  const fields: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('Task title cannot be empty');
    fields.push('title = ?');
    params.push(title);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description.trim());
  }
  if (input.status !== undefined) {
    if (!['pending', 'in_progress', 'completed'].includes(input.status)) {
      throw new Error('Invalid task status');
    }
    fields.push('status = ?');
    params.push(input.status);
    if (input.status === 'completed') {
      fields.push('completed_at = ?');
      params.push(input.completed_at || new Date().toISOString());
    } else if (input.completed_at === undefined) {
      fields.push('completed_at = NULL');
    }
  }
  if (input.priority !== undefined) {
    assertPriority(input.priority);
    fields.push('priority = ?');
    params.push(input.priority);
  }
  if (input.category !== undefined) {
    assertCategory(input.category);
    fields.push('category = ?');
    params.push(input.category);
  }
  if (input.estimated_minutes !== undefined) {
    const estimated = Math.round(Number(input.estimated_minutes));
    if (!Number.isFinite(estimated) || estimated <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }
    fields.push('estimated_minutes = ?');
    params.push(estimated);
  }
  if (input.actual_minutes !== undefined) {
    fields.push('actual_minutes = ?');
    params.push(Math.max(0, Math.round(Number(input.actual_minutes))));
  }
  if (input.deadline !== undefined) {
    fields.push('deadline = ?');
    params.push(input.deadline || null);
  }
  if (input.scheduled_date !== undefined) {
    assertDate(input.scheduled_date, 'Scheduled date');
    fields.push('scheduled_date = ?');
    params.push(input.scheduled_date);
  }
  if (input.completed_at !== undefined && input.status === undefined) {
    fields.push('completed_at = ?');
    params.push(input.completed_at);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now','localtime')");
  params.push(input.id);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`).run(...params);

  const updated = getTaskById(input.id)!;
  upsertTaskDay(updated.id, updated.scheduled_date, updated.status);
  if (input.scheduled_date && input.scheduled_date !== existing.scheduled_date) {
    // Keep the old day in history, but reflect the new plan for the target day.
    upsertTaskDay(updated.id, input.scheduled_date, updated.status);
  }
  return updated;
}

export function deleteTask(id: number): void {
  const db = getDb();
  db.prepare("UPDATE tasks SET is_deleted = 1, updated_at = datetime('now','localtime') WHERE id = ?").run(id);
}

/** Updates the status of one day in a task's history without disturbing other days. */
export function setTaskDayStatus(taskId: number, day: string, status: TaskStatus): void {
  assertDate(day, 'Day');
  if (!['pending', 'in_progress', 'completed'].includes(status)) {
    throw new Error('Invalid task status');
  }
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const db = getDb();
  const run = db.transaction(() => {
    upsertTaskDay(taskId, day, status);
    if (task.scheduled_date === day) {
      db.prepare(`
        UPDATE tasks SET status = ?, completed_at = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(status, status === 'completed' ? new Date().toISOString() : null, taskId);
    }
  });
  run();
}

export function moveTask(id: number, newDate: string): Task {
  assertDate(newDate, 'Move date');
  const db = getDb();
  const task = getTaskById(id);
  if (!task) throw new Error('Task not found');

  db.prepare("UPDATE tasks SET scheduled_date = ?, updated_at = datetime('now','localtime') WHERE id = ? AND is_deleted = 0")
    .run(newDate, id);

  upsertTaskDay(id, newDate, task.status);
  return getTaskById(id)!;
}

export function carryForwardTasks(fromDate: string, toDate: string): Task[] {
  assertDate(fromDate, 'From date');
  assertDate(toDate, 'To date');
  if (fromDate === toDate) return [];

  const db = getDb();
  const incompleteTasks = db.prepare(
    "SELECT * FROM tasks WHERE scheduled_date = ? AND status IN ('pending', 'in_progress') AND is_deleted = 0"
  ).all(fromDate) as Task[];

  const updateStmt = db.prepare(`
    UPDATE tasks
    SET scheduled_date = ?,
        carried_forward_from = COALESCE(carried_forward_from, ?),
        updated_at = datetime('now','localtime')
    WHERE id = ? AND is_deleted = 0
  `);

  const carryTransaction = db.transaction(() => {
    for (const task of incompleteTasks) {
      updateStmt.run(toDate, task.scheduled_date, task.id);
      // The source day keeps its pending entry; the target day gets its own entry.
      upsertTaskDay(task.id, toDate, task.status);
    }
  });

  carryTransaction();
  return incompleteTasks
    .map((task) => getTaskById(task.id))
    .filter((task): task is Task => task !== null);
}

export function getUnfinishedTasks(): Task[] {
  const db = getDb();
  const today = localDateString();
  return db.prepare(
    `SELECT t.* FROM tasks t WHERE t.scheduled_date < ? AND t.status IN ('pending', 'in_progress') AND t.is_deleted = 0 ORDER BY t.scheduled_date ASC, ${PRIORITY_ORDER}`
  ).all(today) as Task[];
}

export function getScheduledTaskCount(date: string): number {
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE scheduled_date = ? AND is_deleted = 0'
  ).get(date) as { count: number };
  return row.count;
}
