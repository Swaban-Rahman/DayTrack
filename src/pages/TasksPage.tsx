import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, CheckSquare } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskCategory, TaskFilters as TaskFilterValues } from '../types';
import {
  formatDate,
  getMonthStart,
  getToday,
  getTomorrow,
  getYesterday
} from '../utils/helpers';
import './TasksPage.css';

type Scope = 'today' | 'upcoming' | 'past' | 'all' | 'custom';

const SCOPE_LABELS: Record<Scope, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  past: 'Past',
  all: 'All tasks',
  custom: 'Custom range'
};

export const TasksPage: React.FC = () => {
  const { todayTasks, createTask } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [scope, setScope] = useState<Scope>('all');
  const [customStart, setCustomStart] = useState(getMonthStart());
  const [customEnd, setCustomEnd] = useState(getToday());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!window.daytrack) return;
    setLoading(true);
    setLoadError('');
    try {
      const filters: TaskFilterValues = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (search.trim()) filters.search = search.trim();

      const today = getToday();
      if (scope === 'today') {
        filters.startDate = today;
        filters.endDate = today;
      } else if (scope === 'upcoming') {
        filters.startDate = getTomorrow();
      } else if (scope === 'past') {
        filters.endDate = getYesterday();
      } else if (scope === 'custom') {
        if (!customStart || !customEnd) {
          setLoadError('Choose both a start and end date.');
          setLoading(false);
          return;
        }
        if (customStart > customEnd) {
          setLoadError('The start date must be before the end date.');
          setLoading(false);
          return;
        }
        filters.startDate = customStart;
        filters.endDate = customEnd;
      }

      const rows = await window.daytrack.getAllTasks(filters);
      setTasks(rows || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, categoryFilter, priorityFilter, search, customStart, customEnd]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, todayTasks]);

  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    const sorted = [...tasks].sort((a, b) => {
      if (scope === 'upcoming') return a.scheduled_date.localeCompare(b.scheduled_date);
      return b.scheduled_date.localeCompare(a.scheduled_date);
    });
    sorted.forEach((task) => {
      if (!map.has(task.scheduled_date)) map.set(task.scheduled_date, []);
      map.get(task.scheduled_date)!.push(task);
    });
    return Array.from(map.entries());
  }, [tasks, scope]);

  const today = getToday();

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <div>
          <h2 className="page-heading">Tasks Management</h2>
          <p className="page-subheading">
            Organize today's plan, schedule future work, and revisit earlier days.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setIsTaskModalOpen(true)}
        >
          Add Task
        </Button>
      </div>

      <div className="tasks-scope-bar">
        {(Object.keys(SCOPE_LABELS) as Scope[]).map((key) => (
          <button
            key={key}
            className={`scope-btn ${scope === key ? 'active' : ''}`}
            onClick={() => setScope(key)}
          >
            {SCOPE_LABELS[key]}
          </button>
        ))}

        {scope === 'custom' && (
          <div className="scope-date-range">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Start date"
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="End date"
            />
          </div>
        )}
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
      />

      {loadError && <div className="tasks-load-error">{loadError}</div>}

      {loading ? (
        <p className="tasks-loading">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title={
            statusFilter === 'all' && categoryFilter === 'all' && priorityFilter === 'all' && !search
              ? `No tasks in ${SCOPE_LABELS[scope].toLowerCase()}`
              : 'No tasks match your filters'
          }
          description={
            scope === 'today'
              ? 'Add tasks for today to start planning your work.'
              : 'Try a different date range, scope, or clear the filters.'
          }
          action={
            <Button variant="primary" onClick={() => setIsTaskModalOpen(true)}>
              Create a Task
            </Button>
          }
        />
      ) : (
        <div className="tasks-list-grouped">
          {groupedTasks.map(([date, dayTasks]) => (
            <section key={date} className="task-date-group">
              <div className="task-date-header">
                <span className={`task-date-label ${date < today ? 'past' : date > today ? 'future' : 'today'}`}>
                  {formatDate(date)}
                  {date === today ? ' · Today' : ''}
                </span>
                <span className="task-date-count">{dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}</span>
              </div>
              <div className="tasks-list">
                {dayTasks.map((task) => (
                  <TaskItem key={`${task.id}-${date}`} task={task} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultDate={scope === 'today' ? today : undefined}
        onSubmit={async (input) => {
          await createTask(input);
          setIsTaskModalOpen(false);
        }}
      />
    </div>
  );
};
