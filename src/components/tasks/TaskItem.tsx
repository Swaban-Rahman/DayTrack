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
  ArrowRight
} from 'lucide-react';
import type { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { TaskForm } from './TaskForm';
import {
  formatDuration,
  formatTime,
  getCategoryColor,
  getPriorityColor,
  getTomorrow
} from '../../utils/helpers';
import './TaskItem.css';

interface TaskItemProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const {
    activeSession,
    timerState,
    startTimer,
    pauseTimer,
    updateTask,
    deleteTask,
    moveTask
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isCurrentActive = activeSession?.task.id === task.id && timerState.isRunning;
  const isCompleted = task.status === 'completed';

  const toggleComplete = async () => {
    if (isCompleted) {
      await updateTask({ id: task.id, status: 'pending', completed_at: null });
    } else {
      if (isCurrentActive) {
        await pauseTimer();
      }
      await updateTask({
        id: task.id,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    }
  };

  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentActive) {
      await pauseTimer();
    } else {
      await startTimer(task.id);
    }
  };

  const handleMoveToTomorrow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await moveTask(task.id, getTomorrow());
    setShowMenu(false);
  };

  const timeDiff = task.actual_minutes - task.estimated_minutes;

  return (
    <div className={`task-item ${isCompleted ? 'task-completed' : ''} ${isCurrentActive ? 'task-active' : ''}`}>
      <div className="task-main-row" onClick={() => setExpanded(!expanded)}>
        {/* Complete Checkbox */}
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

        {/* Task Details */}
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
          </div>

          <div className="task-meta-line">
            <Badge
              size="sm"
              color={getCategoryColor(task.category)}
            >
              {task.category}
            </Badge>

            <Badge
              size="sm"
              color={getPriorityColor(task.priority)}
            >
              {task.priority}
            </Badge>

            <span className="task-time-pill" title="Estimated vs Actual time">
              <Clock size={12} />
              <span>{formatDuration(task.actual_minutes)} / {formatDuration(task.estimated_minutes)}</span>
              {task.actual_minutes > 0 && timeDiff > 0 && (
                <span className="time-overrun">+{formatDuration(timeDiff)}</span>
              )}
            </span>

            {task.deadline && (
              <span className="task-deadline-pill">
                Due: {task.deadline}
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="task-actions" onClick={(e) => e.stopPropagation()}>
          {!isCompleted && (
            <button
              className={`task-timer-btn ${isCurrentActive ? 'active' : ''}`}
              onClick={handleTimerToggle}
              title={isCurrentActive ? 'Pause timer' : 'Start timer'}
            >
              {isCurrentActive ? (
                <>
                  <Pause size={14} />
                  <span className="timer-live-time">
                    {formatTime(timerState.elapsedSeconds)}
                  </span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Start</span>
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
                <button
                  className="dropdown-item"
                  onClick={handleMoveToTomorrow}
                >
                  <ArrowRight size={14} />
                  Move to Tomorrow
                </button>
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMenu(false);
                    deleteTask(task.id);
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
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
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
            {task.completed_at && (
              <span className="detail-item success">
                Completed: {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {isEditing && (
        <TaskForm
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          initialTask={task}
          onSubmit={async (input) => {
            await updateTask({
              id: task.id,
              ...input
            });
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
};
