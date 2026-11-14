import { getDb } from './database/init';
import { localDateString } from './utils/dates';
import type {
  ReminderPayload,
  ReminderTaskInfo,
  ReminderSource,
  ClosePromptPayload,
} from '../src/types/index';

const DEBOUNCE_MS = 15 * 1000;
const FOCUS_COOLDOWN_MS = 10 * 60 * 1000;

export interface ReminderData {
  today: string;
  tomorrow: string;
  tasks: ReminderTaskInfo[];
  todayPendingCount: number;
  overdueCount: number;
  missingTomorrowPlan: boolean;
}

let lastNotification: { signature: string; at: number } | null = null;

function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return localDateString(next);
}

/**
 * Reads today's unfinished work and whether tomorrow has any plan yet.
 * Only reads existing tables — no schema change is required for reminders.
 */
export function collectReminderData(): ReminderData {
  const db = getDb();
  const today = localDateString();
  const tomorrow = shiftDate(today, 1);

  const tasks = db.prepare(`
    SELECT id, title, scheduled_date, status, priority, category
    FROM tasks
    WHERE is_deleted = 0
      AND status IN ('pending', 'in_progress')
      AND scheduled_date <= ?
    ORDER BY
      CASE WHEN scheduled_date = ? THEN 0 ELSE 1 END,
      scheduled_date ASC,
      CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      created_at ASC
  `).all(today, today) as ReminderTaskInfo[];

  const todayPendingCount = tasks.filter((task) => task.scheduled_date === today).length;
  const overdueCount = tasks.length - todayPendingCount;

  const tomorrowTasks = db.prepare(
    'SELECT COUNT(*) AS count FROM tasks WHERE scheduled_date = ? AND is_deleted = 0'
  ).get(tomorrow) as { count: number };

  const tomorrowPlan = db.prepare(
    'SELECT notes FROM daily_plans WHERE plan_date = ?'
  ).get(tomorrow) as { notes: string } | undefined;

  const hasTomorrowNotes = !!(tomorrowPlan && tomorrowPlan.notes.trim().length > 0);

  return {
    today,
    tomorrow,
    tasks,
    todayPendingCount,
    overdueCount,
    missingTomorrowPlan: tomorrowTasks.count === 0 && !hasTomorrowNotes,
  };
}

export function hasReminderContent(data: ReminderData): boolean {
  return data.tasks.length > 0 || data.missingTomorrowPlan;
}

export function planReminderMessage(): string {
  return "You haven't prepared tomorrow's task list yet. Take a moment to plan your next day.";
}

export function reminderMessage(data: ReminderData): string {
  if (data.tasks.length === 0) return '';

  const plural = (count: number) => (count === 1 ? 'task' : 'tasks');
  const closing = `Please complete ${data.todayPendingCount + data.overdueCount === 1 ? 'it' : 'them'}.`;

  if (data.todayPendingCount > 0 && data.overdueCount === 0) {
    return `You still have ${data.todayPendingCount} unfinished ${plural(data.todayPendingCount)} from today. ${closing}`;
  }
  if (data.todayPendingCount === 0 && data.overdueCount > 0) {
    return `You still have ${data.overdueCount} unfinished ${plural(data.overdueCount)} from earlier days. ${closing}`;
  }
  return `You still have ${data.todayPendingCount} unfinished ${plural(data.todayPendingCount)} from today and ${data.overdueCount} from earlier days. ${closing}`;
}

/** Toast body used when tasks and/or the next-day plan are still outstanding. */
export function reminderToastBody(data: ReminderData): string {
  return [
    reminderMessage(data),
    data.missingTomorrowPlan ? planReminderMessage() : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildReminderPayload(data: ReminderData, source: ReminderSource): ReminderPayload {
  return {
    source,
    pendingCount: data.tasks.length,
    todayPendingCount: data.todayPendingCount,
    overdueCount: data.overdueCount,
    tasks: data.tasks,
    message: reminderMessage(data),
    missingTomorrowPlan: data.missingTomorrowPlan,
    tomorrowDate: data.tomorrow,
  };
}

export function buildClosePromptPayload(data: ReminderData): ClosePromptPayload {
  return {
    pendingCount: data.tasks.length,
    todayPendingCount: data.todayPendingCount,
    overdueCount: data.overdueCount,
    tasks: data.tasks,
    missingTomorrowPlan: data.missingTomorrowPlan,
    tomorrowDate: data.tomorrow,
  };
}

function signatureOf(data: ReminderData): string {
  return [
    data.today,
    data.tasks.map((task) => task.id).sort((a, b) => a - b).join(','),
    data.missingTomorrowPlan ? 'no-plan' : 'plan',
  ].join('|');
}

/**
 * Lifecycle events (resume + unlock + sign-in) can fire back to back; a short
 * debounce keeps the same reminder from appearing twice. Focus checks are
 * throttled longer so alt-tabbing does not nag. User dismissal resets this.
 */
export function shouldNotify(data: ReminderData, source: ReminderSource): boolean {
  if (!hasReminderContent(data)) {
    lastNotification = null;
    return false;
  }

  const signature = signatureOf(data);
  const now = Date.now();

  if (lastNotification && lastNotification.signature === signature) {
    const cooldown = source === 'focus' || source === 'second-instance'
      ? FOCUS_COOLDOWN_MS
      : DEBOUNCE_MS;
    if (now - lastNotification.at < cooldown) return false;
  }

  lastNotification = { signature, at: now };
  return true;
}

/**
 * "Remind Me Later" only closes the current reminder. Clearing the debounce
 * guarantees the next login, unlock, resume or launch re-checks the database
 * and shows the reminder again while work is still outstanding.
 */
export function resetReminderDedupe(): void {
  lastNotification = null;
}
