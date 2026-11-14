import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, CheckSquare } from 'lucide-react';
import type { TaskStatus, TaskPriority, TaskCategory } from '../types';
import './TasksPage.css';

export const TasksPage: React.FC = () => {
  const { todayTasks, createTask } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const filteredTasks = useMemo(() => {
    return todayTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [todayTasks, statusFilter, categoryFilter, priorityFilter, search]);

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <div>
          <h2 className="page-heading">Tasks Management</h2>
          <p className="page-subheading">
            Organize, prioritize, and track your daily workflow
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

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title={todayTasks.length === 0 ? 'No tasks created yet' : 'No tasks match your filters'}
          description={todayTasks.length === 0 ? 'Add your tasks for today to begin organizing your day.' : 'Try adjusting your search criteria or clearing filters.'}
          action={
            todayTasks.length === 0 ? (
              <Button variant="primary" onClick={() => setIsTaskModalOpen(true)}>
                Create a Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={async (input) => {
          await createTask(input);
          setIsTaskModalOpen(false);
        }}
      />
    </div>
  );
};
