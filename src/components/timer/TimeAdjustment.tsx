import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Sliders, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TimeAdjustment as TimeAdjustmentRow } from '../../types';
import { formatDuration, getToday } from '../../utils/helpers';
import './TimeAdjustment.css';

interface TimeAdjustmentProps {
  taskId: number;
  taskTitle: string;
  onAdjusted?: () => void;
}

export const TimeAdjustment: React.FC<TimeAdjustmentProps> = ({
  taskId,
  taskTitle,
  onAdjusted
}) => {
  const { refreshTasks, notify } = useApp();
  const [minutes, setMinutes] = useState('15');
  const [reason, setReason] = useState('');
  const [adjustDate, setAdjustDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adjustments, setAdjustments] = useState<TimeAdjustmentRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<TimeAdjustmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAdjustments = useCallback(async () => {
    if (!window.daytrack) return;
    try {
      const rows = await window.daytrack.getTaskAdjustments(taskId);
      setAdjustments(rows || []);
    } catch (err) {
      console.error('Failed to load adjustments:', err);
    }
  }, [taskId]);

  useEffect(() => {
    setMinutes('15');
    setReason('');
    setAdjustDate(getToday());
    setError('');
    loadAdjustments();
  }, [taskId, loadAdjustments]);

  const handleAdjust = async (isAdd: boolean) => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) {
      setError('Enter a number of minutes greater than 0.');
      return;
    }
    if (mins > 1440) {
      setError('A single adjustment cannot be longer than 24 hours.');
      return;
    }
    if (!adjustDate) {
      setError('Choose the day this adjustment belongs to.');
      return;
    }

    const adjustedValue = isAdd ? mins : -mins;
    setLoading(true);
    setError('');
    try {
      if (window.daytrack) {
        await window.daytrack.adjustTime(
          taskId,
          adjustedValue,
          reason.trim() || 'Manual correction',
          adjustDate
        );
        await refreshTasks();
        await loadAdjustments();
        notify(
          `${adjustedValue > 0 ? '+' : ''}${formatDuration(Math.abs(adjustedValue))} ${
            adjustedValue > 0 ? 'added to' : 'deducted from'
          } tracked time.`,
          'success'
        );
        setReason('');
        if (onAdjusted) onAdjusted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the adjustment.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !window.daytrack) return;
    setDeleting(true);
    try {
      await window.daytrack.deleteAdjustment(pendingDelete.id);
      await refreshTasks();
      await loadAdjustments();
      notify('Adjustment removed.', 'info');
      setPendingDelete(null);
      if (onAdjusted) onAdjusted();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not remove the adjustment.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      title="Manual Time Adjustment"
      subtitle={`Correct or manually log time spent on "${taskTitle}"`}
      icon={<Sliders size={18} />}
    >
      <div className="time-adjustment-form">
        {error && <div className="adjustment-error-banner">{error}</div>}

        <div className="adjustment-row">
          <Input
            label="Minutes"
            type="number"
            min="1"
            max="1440"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />

          <Input
            label="Day"
            type="date"
            value={adjustDate}
            max={getToday()}
            onChange={(e) => setAdjustDate(e.target.value)}
          />

          <Input
            label="Reason (Optional)"
            placeholder="e.g. Worked on paper, phone discussion"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="adjustment-buttons">
          <Button
            variant="secondary"
            size="md"
            loading={loading}
            onClick={() => handleAdjust(false)}
          >
            − Deduct Minutes
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={() => handleAdjust(true)}
          >
            + Add Minutes
          </Button>
        </div>

        <p className="adjustment-note">
          Adjustments are stored separately from work sessions, so recorded history stays intact.
        </p>

        <div className="adjustment-history">
          <h4 className="adjustment-history-title">Adjustment History</h4>
          {adjustments.length === 0 ? (
            <p className="adjustment-empty">No manual adjustments for this task.</p>
          ) : (
            adjustments.map((adj) => (
              <div key={adj.id} className="adjustment-item">
                <div className="adjustment-item-main">
                  <Badge variant={adj.adjusted_minutes >= 0 ? 'success' : 'danger'} size="sm">
                    {adj.adjusted_minutes >= 0 ? '+' : '−'}
                    {formatDuration(Math.abs(adj.adjusted_minutes))}
                  </Badge>
                  <span className="adjustment-reason">{adj.reason || 'Manual correction'}</span>
                </div>
                <div className="adjustment-item-side">
                  <span className="adjustment-date">{adj.adjustment_date || adj.created_at.slice(0, 10)}</span>
                  <button
                    className="adjustment-del-btn"
                    title="Delete adjustment"
                    onClick={() => setPendingDelete(adj)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete time adjustment?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete Adjustment
            </Button>
          </>
        }
      >
        <p className="adjustment-modal-text">
          This removes the manual adjustment of{' '}
          <strong>
            {pendingDelete
              ? `${pendingDelete.adjusted_minutes >= 0 ? '+' : '−'}${formatDuration(
                  Math.abs(pendingDelete.adjusted_minutes)
                )}`
              : ''}
          </strong>{' '}
          from the task total. Recorded work sessions are not affected.
        </p>
      </Modal>
    </Card>
  );
};
