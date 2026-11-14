import React, { useState } from 'react';
import { Bell, CalendarCheck, CheckSquare, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type {
  ClosePromptDecision,
  ClosePromptPayload,
  ReminderPayload,
  ReminderTaskInfo,
} from '../../types';
import { formatShortDate, getPriorityColor, getToday } from '../../utils/helpers';
import './ReminderModal.css';

function whenLabel(task: ReminderTaskInfo): string {
  return task.scheduled_date === getToday() ? 'Today' : formatShortDate(task.scheduled_date);
}

const ReminderTaskList: React.FC<{ tasks: ReminderTaskInfo[] }> = ({ tasks }) => (
  <ul className="reminder-task-list">
    {tasks.map((task) => (
      <li key={task.id} className="reminder-task-row">
        <span
          className="reminder-task-dot"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        />
        <span className="reminder-task-title">{task.title}</span>
        <span className="reminder-task-meta">
          {whenLabel(task)} · {task.category}
        </span>
      </li>
    ))}
  </ul>
);

interface PendingReminderModalProps {
  payload: ReminderPayload;
  onDismiss: () => void;
  onReview: () => void;
  onPreparePlan: () => void;
}

export const PendingReminderModal: React.FC<PendingReminderModalProps> = ({
  payload,
  onDismiss,
  onReview,
  onPreparePlan,
}) => {
  const hasTasks = payload.pendingCount > 0;
  const hasPlanIssue = payload.missingTomorrowPlan;

  return (
    <Modal
      isOpen
      onClose={onDismiss}
      title={hasTasks ? 'Welcome Back!' : 'DayTrack Reminder'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onDismiss}>
            Remind Me Later
          </Button>
          {hasPlanIssue && (
            <Button variant={hasTasks ? 'secondary' : 'primary'} onClick={onPreparePlan}>
              Prepare Tomorrow's Plan
            </Button>
          )}
          {hasTasks && (
            <Button variant="primary" icon={<CheckSquare size={15} />} onClick={onReview}>
              View Pending Tasks
            </Button>
          )}
        </>
      }
    >
      {hasTasks && (
        <div className="reminder-alert">
          <Bell size={18} className="reminder-alert-icon" />
          <p>{payload.message}</p>
        </div>
      )}

      {hasTasks && <ReminderTaskList tasks={payload.tasks} />}

      {hasPlanIssue && (
        <section className={`reminder-section ${hasTasks ? 'reminder-section-spaced' : ''}`}>
          <h4 className="reminder-section-title">
            <CalendarCheck size={15} /> Tomorrow's plan
          </h4>
          <p className="reminder-message">
            You haven't prepared tomorrow's task list yet. Take a moment to plan your next day.
          </p>
        </section>
      )}

      {payload.overdueCount > 0 && (
        <p className="reminder-hint">
          Tasks carried over from earlier days stay pending until you complete them — nothing is
          deleted automatically.
        </p>
      )}

      {hasPlanIssue && (
        <p className="reminder-hint">
          “Remind Me Later” only closes this reminder; it will check again after the next sign-in,
          unlock, or wake.
        </p>
      )}
    </Modal>
  );
};

interface ClosePromptModalProps {
  payload: ClosePromptPayload;
  onDecision: (decision: ClosePromptDecision) => void;
}

export const ClosePromptModal: React.FC<ClosePromptModalProps> = ({ payload, onDecision }) => {
  const [busy, setBusy] = useState(false);

  const decide = (decision: ClosePromptDecision) => {
    if (busy) return;
    setBusy(true);
    onDecision(decision);
  };

  const pendingSentence =
    payload.overdueCount === 0
      ? `You still have ${payload.pendingCount} unfinished ${
          payload.pendingCount === 1 ? 'task' : 'tasks'
        } today. Are you sure you want to leave?`
      : `You still have ${payload.pendingCount} unfinished ${
          payload.pendingCount === 1 ? 'task' : 'tasks'
        } (${payload.todayPendingCount} today, ${payload.overdueCount} from earlier days). Are you sure you want to leave?`;

  return (
    <Modal
      isOpen
      onClose={() => decide('later')}
      title="Before You Leave"
      size="md"
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={() => decide('close')}>
            Close Anyway
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => decide('later')}>
            Remind Me Later
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => decide('prepare')}>
            Prepare Tomorrow's Plan
          </Button>
        </>
      }
    >
      <div className="close-prompt-intro">
        <AlertTriangle size={18} />
        <span>Your saved work is safe. Review the reminders below before leaving.</span>
      </div>

      {payload.pendingCount > 0 && (
        <section className="reminder-section">
          <h4 className="reminder-section-title">
            <Bell size={15} /> Unfinished tasks
          </h4>
          <p className="reminder-message">{pendingSentence}</p>
          <ReminderTaskList tasks={payload.tasks} />
        </section>
      )}

      {payload.missingTomorrowPlan && (
        <section className="reminder-section">
          <h4 className="reminder-section-title">
            <CalendarCheck size={15} /> Tomorrow's plan
          </h4>
          <p className="reminder-message">
            You haven't prepared your next day's task list yet. Do you want to save tomorrow's tasks
            before leaving?
          </p>
        </section>
      )}

      <p className="reminder-hint">
        Choosing “Prepare Tomorrow's Plan” keeps DayTrack open in End-of-Day Review.
      </p>
    </Modal>
  );
};
