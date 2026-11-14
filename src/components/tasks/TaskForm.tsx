import React, { useState, useEffect } from 'react';
import type { Task, CreateTaskInput, TaskPriority, TaskCategory } from '../../types';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../../types';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { TextArea } from '../common/TextArea';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { getToday } from '../../utils/helpers';
import './TaskForm.css';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  initialTask?: Task | null;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('coding');
  const [estimatedHours, setEstimatedHours] = useState('1');
  const [estimatedMinutes, setEstimatedMinutes] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [scheduledDate, setScheduledDate] = useState(getToday());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority);
      setCategory(initialTask.category);
      setEstimatedHours(Math.floor(initialTask.estimated_minutes / 60).toString());
      setEstimatedMinutes((initialTask.estimated_minutes % 60).toString());
      setDeadline(initialTask.deadline || '');
      setScheduledDate(initialTask.scheduled_date || getToday());
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('coding');
      setEstimatedHours('1');
      setEstimatedMinutes('0');
      setDeadline('');
      setScheduledDate(getToday());
    }
    setError('');
  }, [initialTask, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    const totalEstMinutes = (parseInt(estimatedHours || '0', 10) * 60) + parseInt(estimatedMinutes || '0', 10);
    if (totalEstMinutes <= 0) {
      setError('Estimated time must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        estimated_minutes: totalEstMinutes,
        deadline: deadline || undefined,
        scheduled_date: scheduledDate
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Edit Task' : 'Add New Task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="task-form">
        {error && <div className="form-error-banner">{error}</div>}

        <Input
          label="Task Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Complete React practice, Thesis chapter 3"
          autoFocus
        />

        <TextArea
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details, notes, or subtasks..."
          rows={3}
        />

        <div className="form-row-2">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            options={TASK_CATEGORIES.map((c) => ({
              value: c,
              label: c.charAt(0).toUpperCase() + c.slice(1)
            }))}
          />

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={TASK_PRIORITIES.map((p) => ({
              value: p,
              label: p.charAt(0).toUpperCase() + p.slice(1)
            }))}
          />
        </div>

        <div className="form-row-2">
          <div className="duration-inputs">
            <label className="duration-label">Estimated Time</label>
            <div className="duration-fields">
              <div className="duration-col">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="duration-input"
                />
                <span className="duration-unit">hrs</span>
              </div>
              <div className="duration-col">
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="duration-input"
                />
                <span className="duration-unit">mins</span>
              </div>
            </div>
          </div>

          <Input
            label="Scheduled Date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>

        <Input
          label="Deadline (Optional)"
          type="time"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {initialTask ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
