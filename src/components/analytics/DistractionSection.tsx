import React, { useState } from 'react';
import type { DistractionLog } from '../../types';
import { DISTRACTION_CATEGORIES } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { AlertTriangle, Trash2, Plus } from 'lucide-react';
import { formatDuration, getToday } from '../../utils/helpers';
import './DistractionSection.css';

interface DistractionSectionProps {
  distractions: DistractionLog[];
  onAddDistraction: (data: { category: string; duration_minutes: number; description: string; log_date: string }) => Promise<void>;
  onDeleteDistraction: (id: number) => Promise<void>;
}

export const DistractionSection: React.FC<DistractionSectionProps> = ({
  distractions,
  onAddDistraction,
  onDeleteDistraction
}) => {
  const [category, setCategory] = useState<string>(DISTRACTION_CATEGORIES[0]);
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const totalDistractionMinutes = distractions.reduce((sum, d) => sum + d.duration_minutes, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins <= 0) return;

    setLoading(true);
    try {
      await onAddDistraction({
        category,
        duration_minutes: mins,
        description: description.trim(),
        log_date: getToday()
      });
      setDescription('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="distraction-container">
      <Card
        title="Distraction & Time Wastage Log"
        subtitle={`Identify time leaks – Total lost today: ${formatDuration(totalDistractionMinutes)}`}
        icon={<AlertTriangle size={18} />}
      >
        <form onSubmit={handleSubmit} className="distraction-form">
          <div className="distraction-form-fields">
            <Select
              label="Distraction Type"
              value={category}
              onChange={(val) => setCategory(val)}
              options={DISTRACTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />

            <Input
              label="Duration (Minutes)"
              type="number"
              min="1"
              max="480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />

            <Input
              label="Reason / Notes"
              placeholder="e.g. Scrolled reels, watched video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="distraction-submit-wrap">
              <Button
                type="submit"
                variant="danger"
                size="md"
                icon={<Plus size={16} />}
                loading={loading}
              >
                Log Distraction
              </Button>
            </div>
          </div>
        </form>

        <div className="distraction-list">
          {distractions.length === 0 ? (
            <p className="no-distraction-text">No distractions recorded today. Great focus!</p>
          ) : (
            distractions.map((d) => (
              <div key={d.id} className="distraction-item">
                <div className="distraction-item-left">
                  <Badge variant="danger" size="sm">
                    {d.category}
                  </Badge>
                  <span className="distraction-duration">{formatDuration(d.duration_minutes)}</span>
                  {d.description && <span className="distraction-desc">{d.description}</span>}
                </div>
                <button
                  className="distraction-del-btn"
                  onClick={() => onDeleteDistraction(d.id)}
                  title="Remove log"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
