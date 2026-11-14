import { Notification } from 'electron';
import { getDb } from '../database/init';

export function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
}

export function showDailyStartupNotification(taskCount: number, unfinishedCount: number): void {
  let body: string;
  if (taskCount > 0) {
    body = `You have ${taskCount} task${taskCount === 1 ? '' : 's'} scheduled for today.`;
  } else {
    body = 'No tasks scheduled yet. Plan your day in DayTrack.';
  }
  if (unfinishedCount > 0) {
    body += ` ${unfinishedCount} unfinished task${unfinishedCount === 1 ? '' : 's'} waiting from earlier days.`;
  }
  showNotification('DayTrack – Good Morning', body);
}

export function showBreakReminder(): void {
  showNotification('Time for a break', "You've been tracking work for a while. Take a short break to stay fresh.");
}

interface DeadlineCandidate {
  id: number;
  title: string;
  deadline: string;
}

/**
 * Runs every minute so tasks added after startup are covered. Returns the set of
 * reminder keys that have now been delivered.
 */
export function checkDeadlineReminders(notified: Set<string>): void {
  const db = getDb();
  const now = Date.now();
  const windowEnd = now + 30 * 60 * 1000;

  const tasks = db.prepare(`
    SELECT id, title, deadline FROM tasks
    WHERE is_deleted = 0 AND status <> 'completed' AND deadline IS NOT NULL AND deadline <> ''
  `).all() as DeadlineCandidate[];

  for (const task of tasks) {
    const deadline = new Date(task.deadline).getTime();
    if (!Number.isFinite(deadline)) continue;
    const key = `${task.id}:${task.deadline}`;
    if (notified.has(key)) continue;

    if (deadline <= windowEnd && deadline >= now - 60 * 1000) {
      const minutesLeft = Math.max(0, Math.round((deadline - now) / 60000));
      const body = minutesLeft > 0
        ? `"${task.title}" is due in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
        : `"${task.title}" is due now.`;
      showNotification('Deadline approaching', body);
      notified.add(key);
    }
  }
}
