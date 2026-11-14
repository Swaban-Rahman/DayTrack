import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TaskItem } from '../components/tasks/TaskItem';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { TextArea } from '../components/common/TextArea';
import { EmptyState } from '../components/common/EmptyState';
import type { DailyPlan, DailySummary, Task } from '../types';
import { formatDate, formatDuration, getToday, getTomorrow, shiftDate } from '../utils/helpers';
import './PlanningPage.css';

export const PlanningPage: React.FC = () => {
  const { todayTasks, unfinishedTasks, carryForwardTasks, moveTask, refreshTasks } = useApp();
  const [reviewDate, setReviewDate] = useState(getToday());
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [planNotes, setPlanNotes] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [savedPlan, setSavedPlan] = useState<DailyPlan | null>(null);
  const [savedSummary, setSavedSummary] = useState<DailySummary | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isCarrying, setIsCarrying] = useState(false);

  const loadDay = async (date: string) => {
    if (!window.daytrack) return;
    const [tasks, plan, summary] = await Promise.all([
      window.daytrack.getTasks(date),
      window.daytrack.getDailyPlan(date),
      window.daytrack.getDailySummary(date),
    ]);
    setDayTasks(tasks || []);
    setSavedPlan(plan);
    setSavedSummary(summary);
    setPlanNotes(plan?.notes || '');
    setSummaryNotes(summary?.notes || '');
  };

  useEffect(() => {
    loadDay(reviewDate).catch((err) => console.error('Failed to load day review:', err));
  }, [reviewDate]);

  useEffect(() => {
    if (!window.daytrack) return;
    window.daytrack.getTasks(reviewDate).then((tasks) => setDayTasks(tasks || [])).catch(console.error);
  }, [reviewDate, todayTasks, unfinishedTasks]);

  const completed = dayTasks.filter((task) => task.status === 'completed');
  const openTasks = dayTasks.filter((task) => task.status !== 'completed');
  const trackedMinutes = dayTasks.reduce((sum, task) => sum + task.actual_minutes, 0);
  const estimatedMinutes = dayTasks.reduce((sum, task) => sum + task.estimated_minutes, 0);

  const backlogDates = useMemo(
    () => Array.from(new Set(unfinishedTasks.map((task) => task.scheduled_date))),
    [unfinishedTasks]
  );

  const savePlan = async () => {
    if (!window.daytrack) return;
    setIsSavingPlan(true);
    try {
      const plan = await window.daytrack.saveDailyPlan(reviewDate, planNotes);
      setSavedPlan(plan);
      setStatusMessage('Daily plan saved.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Could not save the daily plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const saveSummary = async () => {
    if (!window.daytrack) return;
    setIsSavingSummary(true);
    try {
      const summary = await window.daytrack.saveDailySummary(reviewDate, summaryNotes);
      setSavedSummary(summary);
      setStatusMessage('End-of-day summary saved.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Could not save the summary.');
    } finally {
      setIsSavingSummary(false);
    }
  };

  const carryOpenTasks = async () => {
    setIsCarrying(true);
    try {
      const moved = await carryForwardTasks(reviewDate, getTomorrow());
      setStatusMessage(
        moved.length > 0
          ? `Moved ${moved.length} open task${moved.length === 1 ? '' : 's'} to tomorrow.`
          : 'No open tasks to carry forward.'
      );
      await loadDay(reviewDate);
    } finally {
      setIsCarrying(false);
    }
  };

  const bringBacklogToToday = async () => {
    setIsCarrying(true);
    try {
      let moved = 0;
      for (const date of backlogDates) {
        const carried = await carryForwardTasks(date, getToday());
        moved += carried.length;
      }
      await refreshTasks();
      setStatusMessage(
        moved > 0
          ? `Brought ${moved} unfinished task${moved === 1 ? '' : 's'} to today.`
          : 'No unfinished tasks to bring forward.'
      );
    } finally {
      setIsCarrying(false);
    }
  };

  return (
    <div className="planning-page">
      <div className="planning-header">
        <div>
          <h2 className="page-heading">End-of-Day Review</h2>
          <p className="page-subheading">
            Close the day, keep unfinished work, and write what actually happened.
          </p>
        </div>
        <label className="review-date-field">
          <span>Review date</span>
          <input
            type="date"
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </label>
      </div>

      <p className="review-date-label">{formatDate(reviewDate)}</p>
      {statusMessage && <p className="planning-status">{statusMessage}</p>}

      <div className="planning-stats">
        <Card className="planning-stat">
          <div className="stat-label"><CheckCircle2 size={16} /> Completed</div>
          <strong>{completed.length}/{dayTasks.length}</strong>
        </Card>
        <Card className="planning-stat">
          <div className="stat-label"><Clock3 size={16} /> Tracked</div>
          <strong>{formatDuration(trackedMinutes)}</strong>
          <span>of {formatDuration(estimatedMinutes)} estimated</span>
        </Card>
        <Card className="planning-stat">
          <div className="stat-label"><CalendarCheck size={16} /> Still open</div>
          <strong>{openTasks.length}</strong>
        </Card>
      </div>

      <div className="planning-grid">
        <Card title="Plan for the day" subtitle="What you intended to get done" icon={<CalendarCheck size={18} />}>
          <TextArea
            label="Plan notes"
            rows={6}
            value={planNotes}
            onChange={(event) => setPlanNotes(event.target.value)}
            placeholder="Thesis chapter, coding block, study session..."
          />
          <div className="planning-actions">
            <Button variant="primary" loading={isSavingPlan} onClick={savePlan}>
              Save plan
            </Button>
            {savedPlan && <span className="muted-note">Updated {savedPlan.updated_at}</span>}
          </div>
        </Card>

        <Card title="End-of-day reflection" subtitle="Saved with the day's task totals" icon={<Moon size={18} />}>
          <TextArea
            label="Summary notes"
            rows={6}
            value={summaryNotes}
            onChange={(event) => setSummaryNotes(event.target.value)}
            placeholder="What moved forward, what slipped, and why."
          />
          <div className="planning-actions">
            <Button variant="primary" loading={isSavingSummary} onClick={saveSummary}>
              Save summary
            </Button>
            {savedSummary && (
              <span className="muted-note">
                Last snapshot: {savedSummary.completed_tasks} done, {formatDuration(savedSummary.total_tracked_minutes)} tracked
              </span>
            )}
          </div>
        </Card>
      </div>

      <section className="planning-section">
        <div className="tasks-section-header">
          <h3 className="section-title">Open tasks on this day</h3>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRight size={14} />}
            loading={isCarrying}
            disabled={openTasks.length === 0}
            onClick={carryOpenTasks}
          >
            Move open tasks to {shiftDate(reviewDate, 1) === getTomorrow() ? 'tomorrow' : shiftDate(reviewDate, 1)}
          </Button>
        </div>
        {openTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={28} />}
            title="Nothing left open"
            description="Completed work stays on this date. Add a reflection if you want a record of the day."
          />
        ) : (
          <div className="planning-task-list">
            {openTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section className="planning-section">
        <div className="tasks-section-header">
          <h3 className="section-title">Unfinished from earlier days</h3>
          <Button
            variant="secondary"
            size="sm"
            loading={isCarrying}
            disabled={unfinishedTasks.length === 0}
            onClick={bringBacklogToToday}
          >
            Bring all to today
          </Button>
        </div>
        {unfinishedTasks.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={28} />}
            title="No backlog"
            description="Tasks left pending on past dates will show up here."
          />
        ) : (
          <div className="backlog-list">
            {unfinishedTasks.map((task) => (
              <div key={task.id} className="backlog-row">
                <div>
                  <strong>{task.title}</strong>
                  <span>{formatDate(task.scheduled_date)} · {task.priority} · {task.category}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveTask(task.id, getToday())}
                >
                  Move to today
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
