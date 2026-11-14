import React from 'react';
import type { TaskSession } from '../../types';
import { Card } from '../common/Card';
import { formatTime, formatDuration } from '../../utils/helpers';
import { History } from 'lucide-react';
import './SessionList.css';

interface SessionListProps {
  sessions: TaskSession[];
  taskTitle?: string;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, taskTitle }) => {
  if (sessions.length === 0) {
    return (
      <Card title="Work Sessions" icon={<History size={18} />}>
        <p className="no-sessions-text">No recorded sessions for this task yet.</p>
      </Card>
    );
  }

  return (
    <Card
      title={`Sessions ${taskTitle ? `– ${taskTitle}` : ''}`}
      subtitle={`${sessions.length} recorded session${sessions.length > 1 ? 's' : ''}`}
      icon={<History size={18} />}
    >
      <div className="sessions-table-wrapper">
        <table className="sessions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => {
              const start = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const end = s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active now';

              return (
                <tr key={s.id}>
                  <td>{idx + 1}</td>
                  <td>{start}</td>
                  <td>{end}</td>
                  <td className="session-duration">{formatTime(s.duration_seconds)}</td>
                  <td>
                    <span className={`session-status-tag ${s.is_active ? 'active' : 'completed'}`}>
                      {s.is_active ? 'In Progress' : 'Completed'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
