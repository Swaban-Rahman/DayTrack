export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + (date.length === 10 ? 'T00:00:00' : '')) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const safeMin = Math.max(0, Math.round(minutes));
  const h = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return toDateString(new Date());
}

export function getTomorrow(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return toDateString(now);
}

export function getYesterday(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return toDateString(now);
}

export function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return toDateString(next);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Monday-based week start for a YYYY-MM-DD date. */
export function getWeekStart(date: string = getToday()): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateString(d);
}

export function getWeekEnd(date: string = getToday()): string {
  return shiftDate(getWeekStart(date), 6);
}

export function getMonthStart(date: string = getToday()): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getMonthEnd(date: string = getToday()): string {
  const d = new Date(`${date}T00:00:00`);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toDateString(last);
}

/** Formats an ISO timestamp as a clock time using the user's 12/24h preference. */
export function formatClockTime(value: string | null | undefined, timeFormat: string = '24'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12',
  });
}

export function formatClockTimeWithSeconds(value: string, timeFormat: string = '24'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: timeFormat === '12',
  });
}

export function formatDeadline(value: string | null, timeFormat: string = '24'): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${day}, ${formatClockTime(value, timeFormat)}`;
}

/** Value accepted by <input type="datetime-local"> in the user's local timezone. */
export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a datetime-local input value into an ISO timestamp. */
export function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function getCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'study': return '#38bdf8';
    case 'coding': return '#6c63ff';
    case 'thesis': return '#a78bfa';
    case 'project': return '#fb923c';
    case 'personal': return '#4ade80';
    default: return '#94a3b8';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#f87171';
    case 'medium': return '#fbbf24';
    case 'low': return '#38bdf8';
    default: return '#94a3b8';
  }
}
