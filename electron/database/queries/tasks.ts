import { getDb } from '../init';
import { localDateString } from '../../utils/dates';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '../../../src/types/index';

const PRIORITY_ORDER = "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END";

export function getTasksByDate(date: string): Task[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM tasks WHERE scheduled_date = ? AND is_deleted = 0 ORDER BY ${PRIORITY_ORDER}, created_at ASC`
  );
  return stmt.all(date) as Task[];
}

export function getTasksByRange(startDate: string, endDate: string): Task[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM tasks WHERE scheduled_date >= ? AND scheduled_date <= ? AND is_deleted = 0 ORDER BY scheduled_date ASC, ${PRIORITY_ORDER}`
  );
  return stmt.all(startDate, endDate) as Task[];
}

export function getAllTasks(filters?: TaskFilters): Task[] {
  const db = getDb();
  const conditions: string[] = ['is_deleted = 0'];
  const params: any[] = [];

  if (filters) {
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters.priority) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }
    if (filters.startDate) {
      conditions.push('scheduled_date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('scheduled_date <= ?');
      params.push(filters.endDate);
    }
    if (filters.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const sql = `SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY scheduled_date DESC, ${PRIORITY_ORDER}`;
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Task[];
}

export function getTaskById(id: number): Task | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0');
  return (stmt.get(id) as Task) || null;
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, category, estimated_minutes, deadline, scheduled_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.title,
    input.description || '',
    input.priority,
    input.category,
    input.estimated_minutes,
    input.deadline || null,
    input.scheduled_date
  );
  return getTaskById(result.lastInsertRowid as number)!;
}

export function updateTask(input: UpdateTaskInput): Task {
  const db = getDb();
  const fields: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) { fields.push('title = ?'); params.push(input.title); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description); }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
    if (input.status === 'completed') {
      fields.push('completed_at = ?');
      params.push(new Date().toISOString());
    }
  }
  if (input.priority !== undefined) { fields.push('priority = ?'); params.push(input.priority); }
  if (input.category !== undefined) { fields.push('category = ?'); params.push(input.category); }
  if (input.estimated_minutes !== undefined) { fields.push('estimated_minutes = ?'); params.push(input.estimated_minutes); }
  if (input.actual_minutes !== undefined) { fields.push('actual_minutes = ?'); params.push(input.actual_minutes); }
  if (input.deadline !== undefined) { fields.push('deadline = ?'); params.push(input.deadline); }
  if (input.scheduled_date !== undefined) { fields.push('scheduled_date = ?'); params.push(input.scheduled_date); }
  if (input.completed_at !== undefined) { fields.push('completed_at = ?'); params.push(input.completed_at); }

  if (fields.length === 0) {
    return getTaskById(input.id)!;
  }

  fields.push("updated_at = datetime('now','localtime')");
  params.push(input.id);

  const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`;
  db.prepare(sql).run(...params);

  return getTaskById(input.id)!;
}

export function deleteTask(id: number): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE tasks SET is_deleted = 1, updated_at = datetime('now','localtime') WHERE id = ?");
  stmt.run(id);
}

export function moveTask(id: number, newDate: string): Task {
  const db = getDb();
  const stmt = db.prepare("UPDATE tasks SET scheduled_date = ?, updated_at = datetime('now','localtime') WHERE id = ? AND is_deleted = 0");
  stmt.run(newDate, id);
  return getTaskById(id)!;
}

export function carryForwardTasks(fromDate: string, toDate: string): Task[] {
  const db = getDb();
  if (fromDate === toDate) return [];

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
  const stmt = db.prepare(
    `SELECT * FROM tasks WHERE scheduled_date < ? AND status IN ('pending', 'in_progress') AND is_deleted = 0 ORDER BY scheduled_date ASC, ${PRIORITY_ORDER}`
  );
  return stmt.all(today) as Task[];
}
