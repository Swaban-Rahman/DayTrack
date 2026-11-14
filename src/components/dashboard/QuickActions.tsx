import React, { useState } from 'react';
import { Plus, Clock, Moon, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { TaskForm } from '../tasks/TaskForm';
import './QuickActions.css';

export const QuickActions: React.FC = () => {
  const { setCurrentPage, createTask } = useApp();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <div className="quick-actions-bar">
      <Button
        variant="primary"
        size="md"
        icon={<Plus size={16} />}
        onClick={() => setIsTaskModalOpen(true)}
      >
        Quick Add Task
      </Button>

      <Button
        variant="secondary"
        size="md"
        icon={<Clock size={16} />}
        onClick={() => setCurrentPage('timer')}
      >
        Time Tracker
      </Button>

      <Button
        variant="secondary"
        size="md"
        icon={<Moon size={16} />}
        onClick={() => setCurrentPage('planning')}
      >
        End-of-Day Review
      </Button>

      <Button
        variant="ghost"
        size="md"
        icon={<BarChart2 size={16} />}
        onClick={() => setCurrentPage('analytics')}
      >
        View Analytics
      </Button>

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
