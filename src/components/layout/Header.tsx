import React, { useState } from 'react';
import { Plus, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { TaskForm } from '../tasks/TaskForm';
import { formatDate, getToday } from '../../utils/helpers';
import './Header.css';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { theme, toggleTheme } = useTheme();
  const { createTask } = useApp();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-title">{title}</h2>
        <span className="header-date">{formatDate(getToday())}</span>
      </div>

      <div className="header-actions">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setIsTaskModalOpen(true)}
        >
          Add Task
        </Button>
      </div>

      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={async (input) => {
          await createTask(input);
          setIsTaskModalOpen(false);
        }}
      />
    </header>
  );
};
