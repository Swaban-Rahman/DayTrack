import React from 'react';
import { Search } from 'lucide-react';
import type { TaskStatus, TaskPriority, TaskCategory } from '../../types';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../../types';
import './TaskFilters.css';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusChange: (val: TaskStatus | 'all') => void;
  categoryFilter: TaskCategory | 'all';
  onCategoryChange: (val: TaskCategory | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityChange: (val: TaskPriority | 'all') => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  priorityFilter,
  onPriorityChange
}) => {
  return (
    <div className="task-filters-bar">
      <div className="filter-search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-selects">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {TASK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">All Priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
