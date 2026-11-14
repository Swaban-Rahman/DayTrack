import React, { useState } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  MoreVertical,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ArrowRight,
  CalendarClock
} from 'lucide-react';
import type { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { TaskForm } from './TaskForm';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  formatDuration,
  formatTime,
  formatDeadline,
  formatClockTime,
  getCategoryColor,
  getPriorityColor,
  getTomorrow
} from '../../utils/helpers';
import './TaskItem.css';

interface TaskItemProps {
  task: Task;
  onChanged?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onChanged }) => {
  const {
    activeSession,
    timerState,
    settings,
    startTimer,
    pauseTimer,
    updateTask,
    deleteTask,
    moveTask,
    completeTask,
    notify
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(task.scheduled_date);

  const isSameTask = activeSession?.task.id === task.id;
  const isRunning = isSameTask && timerState.isRunning;
  const isPaused = isSameTask && !timerState.isRunning;
  const viewStatus = task.history_day ? task.day_status || task.status : task.status;
  const isCompleted = viewStatus === 'completed';
  const isHistoryView = !!task.history_day && task.history_day !== task.scheduled_date;
  const timeFormat = settings.timeFormat || '24';

  const actualSeconds = isSameTask ? timerState.actualSeconds : task.actual_minutes * 60;
  const estimatedSeconds = (isSameTask ? timerState.estimatedMinutes : task.estimated_minutes) * 60;
  const actualMinutes = Math.round(actualSeconds / 60);
  const difference = actualMinutes - (estimatedSeconds / 60);

  const toggleComplete = async () => {
    try {
      if (task.history_day) {
        if (!window.daytrack) return;
        const nextStatus = isCompleted ? 'pending' : 'completed';
        await window.daytrack.setTaskDayStatus(task.id, task.history_day, nextStatus);
        notify(
          nextStatus === 'completed'
            ? 'Marked completed for this day.'
            : 'Marked pending for this day.',
          'info'
        );
        if (onChanged) onChanged();
        return;
      }
      if (isCompleted) {
        await updateTask({ id: task.id, status: 'pending', completed_at: null });
        notify('Task moved back to pending.', 'info');
      } else {
        await completeTask(task.id);
      }
    } catch {
      // completeTask already reports the error.
    }
  };

  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      await pauseTimer();
    } else {
      await startTimer(task.id);
    }
  };

  const handleMoveToTomorrow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    await moveTask(task.id, getTomorrow());
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      await moveTask(task.id, rescheduleDate);
      setRescheduleOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not reschedule the task.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      setConfirmDelete(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete the task.', 'error');
    }
  };

  const movedElsewhere = task.history_day && task.scheduled_date !== task.history_day;

  return (
    <div className={`task-item ${isCompleted ? 'task-completed' : ''} ${isRunning ? 'task-active' : ''}`}>
      <div className="task-main-row" onClick={() => setExpanded(!expanded)}>
        <button
          className="task-check-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete();
          }}
          title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
        >
          {isCompleted ? (
            <CheckCircle2 size={20} className="check-icon-completed" />
          ) : (
            <Circle size={20} className="check-icon-pending" />
          )}
        </button>

        <div className="task-content-block">
          <div className="task-title-line">
            <span className={`task-title ${isCompleted ? 'strikethrough' : ''}`}>
              {task.title}
            </span>
            {task.carried_forward_from && (
              <Badge variant="warning" size="sm">
                Carried forward
              </Badge>
            )}
            {movedElsewhere && (
              <Badge variant="info" size="sm">
                Now {task.scheduled_date}
              </Badge>
            )}
            {viewStatus === 'in_progress' && !isRunning && (
              <Badge variant="accent" size="sm">
                In progress
              </Badge>
            )}
          </div>

          <div className="task-meta-line">
            <Badge size="sm" color={getCategoryColor(task.category)}>
              {task.category}
            </Badge>

            <Badge size="sm" color={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>

            <span className="task-time-pill" title="Estimated vs actual time">
              <Clock size={12} />
              <span>
                {formatDuration(actualMinutes)} / {formatDuration(task.estimated_minutes)}
              </span>
              {actualMinutes > 0 && difference > 0 && (
                <span className="time-overrun">+{formatDuration(difference)} over</span>
              )}
              {actualMinutes > 0 && difference < 0 && (
                <span className="time-underrun">{formatDuration(Math.abs(difference))} under</span>
              )}
            </span>

            {task.deadline && (
              <span className="task-deadline-pill">
                Due: {formatDeadline(task.deadline, timeFormat)}
              </span>
            )}
          </div>
        </div>

        <div className="task-actions" onClick={(e) => e.stopPropagation()}>
          {!isCompleted && !isHistoryView && (
            <button
              className={`task-timer-btn ${isRunning ? 'active' : ''} ${isPaused ? 'paused' : ''}`}
              onClick={handleTimerToggle}
              title={isRunning ? 'Pause timer' : isPaused ? 'Resume timer' : 'Start timer'}
            >
              {isRunning ? (
                <>
                  <Pause size={14} />
                  <span className="timer-live-time">{formatTime(timerState.elapsedSeconds)}</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>{isPaused ? 'Resume' : 'Start'}</span>
                </>
              )}
            </button>
          )}

          <div className="task-menu-container">
            <button
              className="task-more-btn"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More options"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <div className="task-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 size={14} />
                  Edit Task
                </button>
                <button className="dropdown-item" onClick={handleMoveToTomorrow}>
                  <ArrowRight size={14} />
                  Move to Tomorrow
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    setRescheduleDate(task.scheduled_date);
                    setRescheduleOpen(true);
                  }}
                >
                  <CalendarClock size={14} />
                  Reschedule…
                </button>
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMenu(false);
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 size={14} />
                  Delete Task
                </button>
              </div>
            )}
          </div>

          <button
            className="task-expand-btn"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse task' : 'Expand task'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="task-expanded-section">
          {task.description ? (
            <p className="task-desc-text">{task.description}</p>
          ) : (
            <p className="task-desc-empty">No additional description.</p>
          )}

          <div className="task-details-footer">
            <span className="detail-item">
              <Calendar size={13} />
              Scheduled: {task.scheduled_date}
            </span>
            {task.history_day && task.history_day !== task.scheduled_date && (
              <span className="detail-item">
                Was planned on {task.history_day}
                {task.day_status ? ` (${task.day_status})` : ''}
              </span>
            )}
            {task.completed_at && (
              <span className="detail-item success">
                Completed: {formatClockTime(task.completed_at, timeFormat)}
              </span>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <TaskForm
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          initialTask={task}
          onSubmit={async (input) => {
            await updateTask({ id: task.id, ...input });
            setIsEditing(false);
          }}
        />
      )}

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this task?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          “{task.title}” will be removed from your active lists. Its recorded time sessions are
          kept in the local database for history and analytics.
        </p>
      </Modal>

      <Modal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule task"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReschedule}>
              Move task
            </Button>
          </>
        }
      >
        <Input
          label="New date"
          type="date"
          value={rescheduleDate}
          onChange={(e) => setRescheduleDate(e.target.value)}
        />
      </Modal>
    </div>
  );
};
