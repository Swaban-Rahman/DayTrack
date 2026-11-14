import React, { useMemo, useState } from 'react';
import type { SessionWithTask, TaskSession } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useApp } from '../../context/AppContext';
import {
  formatTime,
  formatDuration,
  formatShortDate,
  formatClockTimeWithSeconds,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
} from '../../utils/helpers';
import { History, Pencil, Check, X } from 'lucide-react';
import './SessionList.css';

interface SessionListProps {
  sessions: TaskSession[];
  taskTitle?: string;
  cardTitle?: string;
  showTaskTitle?: boolean;
  loading?: boolean;
  emptyText?: string;
  onChanged?: () => void;
}

const MAX_SESSION_MINUTES = 24 * 60;

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  taskTitle,
  cardTitle,
  showTaskTitle = false,
  loading = false,
  emptyText,
  onChanged,
}) => {
  const { settings, notify, refreshTasks } = useApp();
  const timeFormat = settings.timeFormat || '24';

  const [editingId, setEditingId] = useState<number | null>(null);
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const totalSeconds = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.is_active ? 0 : s.duration_seconds), 0),
    [sessions]
  );

  const beginEdit = (session: TaskSession) => {
    setEditingId(session.id);
    setStartValue(toDateTimeLocalValue(session.start_time));
    setEndValue(session.end_time ? toDateTimeLocalValue(session.end_time) : toDateTimeLocalValue(new Date().toISOString()));
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const saveEdit = async (session: TaskSession) => {
    if (!window.daytrack) return;
    if (!startValue || !endValue) {
      setEditError('Both start and end times are required.');
      return;
    }
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setEditError('Enter valid start and end times.');
      return;
    }
    if (end <= start) {
      setEditError('End time must be after the start time.');
      return;
    }
    if (end - start > MAX_SESSION_MINUTES * 60 * 1000) {
      setEditError('A single session cannot be longer than 24 hours.');
      return;
    }
    if (end > Date.now() + 60 * 1000) {
      setEditError('End time cannot be in the future.');
      return;
    }

    setSaving(true);
    setEditError('');
    try {
      await window.daytrack.updateSessionTimes({
        id: session.id,
        start_time: fromDateTimeLocalValue(startValue),
        end_time: fromDateTimeLocalValue(endValue),
      });
      await refreshTasks();
      notify('Session times updated.', 'success');
      setEditingId(null);
      if (onChanged) onChanged();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update this session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card title={cardTitle || 'Work Sessions'} icon={<History size={18} />}>
        <p className="no-sessions-text">Loading sessions…</p>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card title={cardTitle || 'Work Sessions'} icon={<History size={18} />}>
        <p className="no-sessions-text">{emptyText || 'No recorded sessions for this task yet.'}</p>
        <p className="sessions-empty-hint">
          Every start/pause cycle is saved here, so history is kept even after manual corrections.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={cardTitle || `Sessions ${taskTitle ? `– ${taskTitle}` : ''}`}
      subtitle={`${sessions.length} session${sessions.length > 1 ? 's' : ''} · ${formatDuration(totalSeconds / 60)} recorded`}
      icon={<History size={18} />}
    >
      {editError && <div className="session-edit-error">{editError}</div>}
      <div className="sessions-table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              {showTaskTitle && <th>Task</th>}
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className={isEditing ? 'session-row-editing' : ''}>
                  <td>{idx + 1}</td>
                  <td className="session-date-cell">
                    {s.session_date ? formatShortDate(s.session_date) : formatShortDate(new Date(s.start_time))}
                  </td>
                  {showTaskTitle && (
                    <td className="session-task-cell">
                      {(s as SessionWithTask).task_title || '—'}
                    </td>
                  )}
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          type="datetime-local"
                          className="session-edit-input"
                          value={startValue}
                          onChange={(e) => setStartValue(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="datetime-local"
                          className="session-edit-input"
                          value={endValue}
                          onChange={(e) => setEndValue(e.target.value)}
                        />
                      </td>
                      <td colSpan={2} className="session-edit-note">
                        Original history of other sessions is untouched.
                      </td>
                      <td>
                        <div className="session-edit-actions">
                          <button
                            className="session-icon-btn save"
                            title="Save changes"
                            disabled={saving}
                            onClick={() => saveEdit(s)}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="session-icon-btn"
                            title="Cancel"
                            disabled={saving}
                            onClick={cancelEdit}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="session-time-cell">
                        {formatClockTimeWithSeconds(s.start_time, timeFormat)}
                      </td>
                      <td className="session-time-cell">
                        {s.end_time ? formatClockTimeWithSeconds(s.end_time, timeFormat) : 'Running…'}
                      </td>
                      <td className="session-duration">{formatTime(s.duration_seconds)}</td>
                      <td>
                        <Badge variant={s.is_active ? 'accent' : 'success'} size="sm">
                          {s.is_active ? 'In Progress' : 'Completed'}
                        </Badge>
                      </td>
                      <td className="session-action-cell">
                        <button
                          className="session-icon-btn"
                          title={s.is_active ? 'Running sessions cannot be edited' : 'Edit session times'}
                          disabled={!!s.is_active}
                          onClick={() => beginEdit(s)}
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="sessions-edit-hint">
        Editing a session recalculates the tracked time from timestamps. No session is ever deleted automatically.
      </p>
    </Card>
  );
};
