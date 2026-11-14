import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { TimerPage } from './pages/TimerPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PlanningPage } from './pages/PlanningPage';
import { SettingsPage } from './pages/SettingsPage';
import { useApp } from './context/AppContext';
import type { PageName } from './types';
import './App.css';

const PAGE_TITLES: Record<PageName, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  timer: 'Time Tracker',
  calendar: 'Calendar',
  analytics: 'Analytics',
  planning: 'End of Day',
  settings: 'Settings',
};

const App: React.FC = () => {
  const { currentPage, isLoading } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tasks':
        return <TasksPage />;
      case 'timer':
        return <TimerPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'planning':
        return <PlanningPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header title={PAGE_TITLES[currentPage]} />
        <main className="app-content">
          {isLoading ? (
            <div className="app-loading">Loading DayTrack…</div>
          ) : (
            renderPage()
          )}
        </main>
      </div>
    </div>
  );
};

export { App };
