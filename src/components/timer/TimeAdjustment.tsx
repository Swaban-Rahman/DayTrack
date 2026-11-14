import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';
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
  const { refreshTasks } = useApp();
  const [minutes, setMinutes] = useState('15');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAdjust = async (isAdd: boolean) => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins === 0) return;

    const adjustedValue = isAdd ? Math.abs(mins) : -Math.abs(mins);

    setLoading(true);
    setSuccessMsg('');
    try {
      if (window.daytrack) {
        await window.daytrack.adjustTime(taskId, adjustedValue, reason || 'Manual correction');
        await refreshTasks();
        setSuccessMsg(`Successfully adjusted ${adjustedValue > 0 ? `+${adjustedValue}` : adjustedValue} minutes.`);
        setReason('');
        if (onAdjusted) onAdjusted();
      }
    } catch (err: any) {
      console.error('Failed to adjust time:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={`Manual Time Adjustment`}
      subtitle={`Correct or manually log time spent on "${taskTitle}"`}
      icon={<Sliders size={18} />}
    >
      <div className="time-adjustment-form">
        {successMsg && <div className="adjustment-success-banner">{successMsg}</div>}

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
            - Deduct Minutes
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
      </div>
    </Card>
  );
};
