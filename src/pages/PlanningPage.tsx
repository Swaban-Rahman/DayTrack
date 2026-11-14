import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, Moon, Plus, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskForm } from '../components/tasks/TaskForm';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { TextArea } from '../components/common/TextArea';
import { EmptyState } from '../components/common/EmptyState';
import type { DailyAnalytics, DailyPlan, DailySummary, Task } from '../types';
import {
  formatDate,
  formatDate as formatFullDate,
  formatDuration,
  getCategoryColor,
  getToday,
  shiftDate
} from '../utils/helpers';
import './PlanningPage.css';

export const PlanningPage: React.FC = () => {
  const {
    createTask,
    unfinishedTasks,
    carryForwardTasks,
    moveTask,
    refreshTasks
  } = useApp();

  const [reviewDate, setReviewDate] = useState(getToday());
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [dayAnalytics, setDayAnalytics] = useState<DailyAnalytics | null>(null);
  const [nextDateTasks, setNextDateTasks] = useState<Task[]>([]);
  const [planNotes, setPlanNotes] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [nextPlanNotes, setNextPlanNotes] = useState('');
  const [savedPlan, setSavedPlan] = useState<DailyPlan | null>(null);
  const [savedNextPlan, setSavedNextPlan] = useState<DailyPlan | null>(null);
  const [savedSummary, setSavedSummary] = useState<DailySummary | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingNextPlan, setSavingNextPlan] = useState(false);
  const [isCarrying, setIsCarrying] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info');

  const nextDate = shiftDate(reviewDate, 1);
  const today = getToday();

  const setStatus = (message: string, kind: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    setStatusKind(kind);
  };

  const loadDay = async (date: string) => {
    if (!window.daytrack) return;
    const next = shiftDate(date, 1);
    try {
      const [tasks, plan, summary, analytics, nextTasks, nextPlan] = await Promise.all([
        window.daytrack.getTaskHistory(date),
        window.daytrack.getDailyPlan(date),
        window.daytrack.getDailySummary(date),
        window.daytrack.getDailyAnalytics(date),
        window.daytrack.getTasks(next),
        window.daytrack.getDailyPlan(next)
      ]);
      setDayTasks(tasks || []);
      setSavedPlan(plan);
      setSavedSummary(summary);
      setPlanNotes(plan?.notes || '');
      setSummaryNotes(summary?.notes || '');
      setDayAnalytics(analytics || null);
      setNextDateTasks(nextTasks || []);
      setSavedNextPlan(nextPlan || null);
      setNextPlanNotes(nextPlan?.notes || '');
    } catch (err) {
      console.error('Failed to load planning data:', err);
      setStatus('Could not load this day.', 'error');
    }
  };

  useEffect(() => {
    loadDay(reviewDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewDate, unfinishedTasks]);

  const completed = useMemo(
    () => dayTasks.filter((task) => (task.day_status || task.status) === 'completed'),
    [dayTasks]
  );
  const openTasks = useMemo(
    () => dayTasks.filter((task) => (task.day_status || task.status) !== 'completed'),
    [dayTasks]
  );

  const trackedMinutes = dayAnalytics?.totalTrackedMinutes ?? dayTasks.reduce((sum, t) => sum + t.actual_minutes, 0);
  const estimatedMinutes = dayAnalytics?.estimatedMinutes ?? dayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);
  const breakMinutes = dayAnalytics?.breakMinutes ?? 0;
  const distractionMinutes = dayAnalytics?.distractionMinutes ?? 0;
  const categories = dayAnalytics?.categoryBreakdown || [];

  const backlogDates = useMemo(
    () => Array.from(new Set(unfinishedTasks.map((task) => task.scheduled_date))).sort(),
    [unfinishedTasks]
  );

  const savePlan = async () => {
    if (!window.daytrack) return;
    setSavingPlan(true);
    try {
      const plan = await window.daytrack.saveDailyPlan(reviewDate, planNotes);
      setSavedPlan(plan);
      setStatus('Daily plan saved.', 'success');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save the daily plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const saveSummary = async () => {
    if (!window.daytrack) return;
    setSavingSummary(true);
    try {
      const summary = await window.daytrack.saveDailySummary(reviewDate, summaryNotes);
      setSavedSummary(summary);
      setStatus('End-of-day summary saved.', 'success');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save the summary.', 'error');
    } finally {
      setSavingSummary(false);
    }
  };

  const saveNextPlan = async () => {
    if (!window.daytrack) return;
    setSavingNextPlan(true);
    try {
      const plan = await window.daytrack.saveDailyPlan(nextDate, nextPlanNotes);
      setSavedNextPlan(plan);
      setNextPlanNotes(plan.notes);
      setStatus(`Plan saved for ${formatFullDate(nextDate)}.`, 'success');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save tomorrow\'s plan.', 'error');
    } finally {
      setSavingNextPlan(false);
    }
  };

  const carryOpenTasks = async () => {
    setIsCarrying(true);
    try {
      const moved = await carryForwardTasks(reviewDate, nextDate);
      setStatus(
        moved.length > 0
          ? `Moved ${moved.length} open task${moved.length === 1 ? '' : 's'} to ${formatFullDate(nextDate)}.`
          : 'No open tasks scheduled on this day to carry forward.',
        moved.length > 0 ? 'success' : 'info'
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
        const carried = await carryForwardTasks(date, today);
        moved += carried.length;
      }
      await refreshTasks();
      await loadDay(reviewDate);
      setStatus(
        moved > 0
          ? `Brought ${moved} unfinished task${moved === 1 ? '' : 's'} to today.`
          : 'No unfinished tasks to bring forward.',
        moved > 0 ? 'success' : 'info'
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not move the backlog.', 'error');
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
            Close the day, keep unfinished work, and plan the next one without losing history.
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
      {statusMessage && <p className={`planning-status ${statusKind}`}>{statusMessage}</p>}

      <div className="planning-stats">
        <Card className="planning-stat">
          <div className="stat-label"><CheckCircle2 size={16} /> Completed</div>
          <strong>{completed.length}/{dayTasks.length}</strong>
          <span>{openTasks.length} still open</span>
        </Card>
        <Card className="planning-stat">
          <div className="stat-label"><Clock3 size={16} /> Tracked</div>
          <strong>{formatDuration(trackedMinutes)}</strong>
          <span>of {formatDuration(estimatedMinutes)} estimated</span>
        </Card>
        <Card className="planning-stat">
          <div className="stat-label"><Sun size={16} /> Breaks / leaks</div>
          <strong>{formatDuration(breakMinutes)} / {formatDuration(distractionMinutes)}</strong>
          <span>break time / distractions</span>
        </Card>
      </div>

      {categories.length > 0 && (
        <div className="planning-category-chips">
          {categories.map((entry) => (
            <span key={entry.category} className="planning-category-chip">
              <span
                className="planning-category-dot"
                style={{ backgroundColor: getCategoryColor(entry.category) }}
              />
              {entry.category}
              <strong>{formatDuration(entry.minutes)}</strong>
            </span>
          ))}
        </div>
      )}

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
            <Button variant="primary" loading={savingPlan} onClick={savePlan}>
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
            <Button variant="primary" loading={savingSummary} onClick={saveSummary}>
              Save summary
            </Button>
            {savedSummary && (
              <span className="muted-note">
                Snapshot: {savedSummary.completed_tasks} done · {formatDuration(savedSummary.total_tracked_minutes)} tracked
              </span>
            )}
          </div>
        </Card>
      </div>

      <section className="planning-section">
        <div className="tasks-section-header">
          <h3 className="section-title">Open tasks on this day</h3>
          <div className="planning-section-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setTaskModalDate(reviewDate)}
            >
              Add task to this day
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={14} />}
              loading={isCarrying}
              disabled={openTasks.length === 0}
              onClick={carryOpenTasks}
            >
              Move open tasks to {formatFullDate(nextDate)}
            </Button>
          </div>
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
              <TaskItem
                key={`${task.id}-${task.history_day || 'current'}`}
                task={task}
                onChanged={() => loadDay(reviewDate)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="planning-section">
        <div className="tasks-section-header">
          <h3 className="section-title">Plan for {formatFullDate(nextDate)}</h3>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setTaskModalDate(nextDate)}
          >
            Add task for next day
          </Button>
        </div>
        {nextDateTasks.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={28} />}
            title="No tasks planned yet"
            description="Add tomorrow's tasks now so the next day starts with a clear plan."
            action={
              <Button variant="secondary" size="sm" onClick={() => setTaskModalDate(nextDate)}>
                Add a task
              </Button>
            }
          />
        ) : (
          <div className="planning-task-list">
            {nextDateTasks.map((task) => (
              <TaskItem key={`next-${task.id}`} task={task} />
            ))}
          </div>
        )}
        <Card title="Next-day notes" icon={<CalendarCheck size={18} />}>
          <TextArea
            label="Plan notes for the next day"
            rows={4}
            value={nextPlanNotes}
            onChange={(event) => setNextPlanNotes(event.target.value)}
            placeholder="Top priorities, time blocks, and anything to prepare."
          />
          <div className="planning-actions">
            <Button variant="primary" loading={savingNextPlan} onClick={saveNextPlan}>
              Save next-day plan
            </Button>
            {savedNextPlan && (
              <span className="muted-note">Saved {savedNextPlan.updated_at}</span>
            )}
          </div>
        </Card>
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
            description="Tasks left pending on past dates will show up here. Nothing is deleted automatically."
          />
        ) : (
          <div className="backlog-list">
            {unfinishedTasks.map((task) => (
              <div key={task.id} className="backlog-row">
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {formatDate(task.scheduled_date)} · {task.priority} · {task.category} ·{' '}
                    {formatDuration(task.actual_minutes)} tracked
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await moveTask(task.id, today);
                    await loadDay(reviewDate);
                  }}
                >
                  Move to today
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <TaskForm
        isOpen={!!taskModalDate}
        onClose={() => setTaskModalDate(null)}
        defaultDate={taskModalDate || undefined}
        onSubmit={async (input) => {
          await createTask({ ...input, scheduled_date: taskModalDate || input.scheduled_date });
          setTaskModalDate(null);
          await loadDay(reviewDate);
        }}
      />
    </div>
  );
};
