import { Notification } from 'electron';
import type { Task } from '../../src/types/index';

const scheduledTimeouts: NodeJS.Timeout[] = [];

export function clearAllReminders(): void {
  for (const t of scheduledTimeouts) {
    clearTimeout(t);
  }
  scheduledTimeouts.length = 0;
}

export function scheduleDeadlineReminders(tasks: Task[]): void {
  // Clear previous reminders before scheduling new ones
  clearAllReminders();

  const now = Date.now();

  for (const task of tasks) {
    if (!task.deadline || task.status === 'completed') continue;

    const deadlineTime = new Date(task.deadline).getTime();
    // Remind 30 minutes before deadline
    const reminderTime = deadlineTime - 30 * 60 * 1000;

    if (reminderTime > now) {
      const timeout = setTimeout(() => {
        if (Notification.isSupported()) {
          new Notification({
            title: '⏰ Deadline Approaching',
            body: `"${task.title}" is due in 30 minutes!`,
          }).show();
        }
      }, reminderTime - now);
      scheduledTimeouts.push(timeout);
    }
  }
}

export function showDailyStartupNotification(taskCount: number): void {
  if (!Notification.isSupported()) return;

  new Notification({
    title: '📋 DayTrack – Good Morning!',
    body:
      taskCount > 0
        ? `You have ${taskCount} task${taskCount === 1 ? '' : 's'} scheduled for today. Let's get productive!`
        : 'No tasks scheduled yet. Plan your day!',
  }).show();
}

export function showBreakReminder(): void {
  if (!Notification.isSupported()) return;

  new Notification({
    title: '☕ Time for a Break',
    body: 'You\'ve been working for a while. Take a short break to stay fresh!',
  }).show();
}
