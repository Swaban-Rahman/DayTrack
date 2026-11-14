import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { StatsGrid } from '../components/dashboard/StatsGrid';
import { ActiveTaskCard } from '../components/dashboard/ActiveTaskCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { ProgressBar } from '../components/common/ProgressBar';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { CheckSquare, AlertCircle, ArrowRight, CalendarCheck } from 'lucide-react';
import { getToday } from '../utils/helpers';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const {
    todayTasks,
    unfinishedTasks,
    createTask,
    carryForwardTasks,
    setCurrentPage
  } = useApp();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCarryingForward, setIsCarryingForward] = useState(false);
  const [todayPlanNotes, setTodayPlanNotes] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadTodayPlan = async () => {
      if (!window.daytrack) return;
      try {
        const plan = await window.daytrack.getDailyPlan(getToday());
        if (!cancelled) setTodayPlanNotes(plan?.notes?.trim() || '');
      } catch (err) {
        console.error("Failed to load today's plan notes:", err);
      }
    };

    loadTodayPlan();
    const cleanup = window.daytrack?.onDayChanged(() => {
      loadTodayPlan();
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Group today's tasks by priority
  const highPriority = todayTasks.filter((t) => t.priority === 'high');
  const mediumPriority = todayTasks.filter((t) => t.priority === 'medium');
  const lowPriority = todayTasks.filter((t) => t.priority === 'low');

  const handleCarryForwardAll = async () => {
    setIsCarryingForward(true);
    try {
      const today = getToday();
      const dates = Array.from(new Set(unfinishedTasks.map((t) => t.scheduled_date)));
      for (const date of dates) {
        await carryForwardTasks(date, today);
      }
    } finally {
      setIsCarryingForward(false);
    }
  };

  return (
    <div className="dashboard-page">
      <WelcomeCard />

      {todayPlanNotes && (
        <Card
          className="today-plan-card"
          title="Plan for today"
          subtitle="Saved from your end-of-day planning"
          icon={<CalendarCheck size={18} />}
        >
          <p className="today-plan-notes">{todayPlanNotes}</p>
        </Card>
      )}

      {/* Progress Bar Card */}
      <Card className="progress-banner-card" noPadding>
        <div className="progress-banner-content">
          <ProgressBar
            value={progressPercent}
            size="md"
            showLabel
            label={`Today's Completion Progress (${completedTasks}/${totalTasks} Tasks)`}
          />
        </div>
      </Card>

      <ActiveTaskCard />
      <StatsGrid />
      <QuickActions />

      {/* Carried Forward Alert if any */}
      {unfinishedTasks.length > 0 && (
        <div className="carried-alert-box">
          <div className="carried-alert-text">
            <AlertCircle size={18} className="alert-icon" />
            <div>
              <strong>{unfinishedTasks.length} unfinished tasks</strong> from previous days are available to review.
            </div>
          </div>
          <div className="carried-alert-actions">
            <Button
              variant="secondary"
              size="sm"
              loading={isCarryingForward}
              onClick={handleCarryForwardAll}
            >
              Bring to Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={() => setCurrentPage('planning')}
            >
              Review in Planning
            </Button>
          </div>
        </div>
      )}

      {/* Main Task List */}
      <div className="dashboard-tasks-section">
        <div className="tasks-section-header">
          <h3 className="section-title">Today's Schedule</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('tasks')}
          >
            Manage All Tasks →
          </Button>
        </div>

        {totalTasks === 0 ? (
          <EmptyState
            icon={<CheckSquare size={28} />}
            title="No tasks scheduled for today"
            description="Start by adding your planned goals, thesis work, coding sessions, or study tasks."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsTaskModalOpen(true)}
              >
                Add Your First Task
              </Button>
            }
          />
        ) : (
          <div className="grouped-tasks-container">
            {highPriority.length > 0 && (
              <div className="priority-group">
                <div className="priority-header high">
                  <span className="priority-dot high" />
                  <span>High Priority ({highPriority.length})</span>
                </div>
                {highPriority.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {mediumPriority.length > 0 && (
              <div className="priority-group">
                <div className="priority-header medium">
                  <span className="priority-dot medium" />
                  <span>Medium Priority ({mediumPriority.length})</span>
                </div>
                {mediumPriority.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}

            {lowPriority.length > 0 && (
              <div className="priority-group">
                <div className="priority-header low">
                  <span className="priority-dot low" />
                  <span>Low Priority ({lowPriority.length})</span>
                </div>
                {lowPriority.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
