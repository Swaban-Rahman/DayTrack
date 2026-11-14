import React, { useState } from 'react';
import type { DistractionLog, LogKind } from '../../types';
import { BREAK_CATEGORIES, DISTRACTION_CATEGORIES } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { AlertTriangle, Coffee, Trash2, Plus } from 'lucide-react';
import { formatDuration, getToday } from '../../utils/helpers';
import './DistractionSection.css';

interface DistractionSectionProps {
  distractions: DistractionLog[];
  onAddDistraction: (data: {
    category: string;
    duration_minutes: number;
    description: string;
    log_date: string;
    kind: LogKind;
  }) => Promise<void>;
  onDeleteDistraction: (id: number) => Promise<void>;
}

const KIND_OPTIONS = [
  { value: 'distraction', label: 'Distraction' },
  { value: 'break', label: 'Break / Rest' }
];

export const DistractionSection: React.FC<DistractionSectionProps> = ({
  distractions,
  onAddDistraction,
  onDeleteDistraction
}) => {
  const [kind, setKind] = useState<LogKind>('distraction');
  const [category, setCategory] = useState<string>(DISTRACTION_CATEGORIES[0]);
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [description, setDescription] = useState('');
  const [logDate, setLogDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = kind === 'break' ? BREAK_CATEGORIES : DISTRACTION_CATEGORIES;
  const distractionLogs = distractions.filter((d) => d.kind !== 'break');
  const breakLogs = distractions.filter((d) => d.kind === 'break');
  const totalDistractionMinutes = distractionLogs.reduce((sum, d) => sum + d.duration_minutes, 0);
  const totalBreakMinutes = breakLogs.reduce((sum, d) => sum + d.duration_minutes, 0);

  const handleKindChange = (nextKind: LogKind) => {
    setKind(nextKind);
    setCategory((nextKind === 'break' ? BREAK_CATEGORIES : DISTRACTION_CATEGORIES)[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      setError('Enter a duration greater than 0 minutes.');
      return;
    }
    if (mins > 720) {
      setError('Duration cannot exceed 720 minutes.');
      return;
    }
    if (!logDate) {
      setError('Pick the day this time belongs to.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onAddDistraction({
        category,
        duration_minutes: mins,
        description: description.trim(),
        log_date: logDate,
        kind
      });
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="distraction-container">
      <Card
        title="Breaks & Distraction Log"
        subtitle={`Manual split – distractions: ${formatDuration(totalDistractionMinutes)} · breaks: ${formatDuration(totalBreakMinutes)}`}
        icon={<AlertTriangle size={18} />}
      >
        <form onSubmit={handleSubmit} className="distraction-form">
          <div className="distraction-form-fields">
            <Select
              label="Type"
              value={kind}
              onChange={(e) => handleKindChange(e.target.value as LogKind)}
              options={KIND_OPTIONS}
            />

            <Select
              label={kind === 'break' ? 'Break Type' : 'Distraction Type'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => ({ value: c, label: c }))}
            />

            <Input
              label="Duration (Minutes)"
              type="number"
              min="1"
              max="720"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />

            <Input
              label="Date"
              type="date"
              value={logDate}
              max={getToday()}
              onChange={(e) => setLogDate(e.target.value)}
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
                variant={kind === 'break' ? 'primary' : 'danger'}
                size="md"
                icon={<Plus size={16} />}
                loading={loading}
              >
                {kind === 'break' ? 'Log Break' : 'Log Distraction'}
              </Button>
            </div>
          </div>
          {error && <p className="distraction-error">{error}</p>}
        </form>

        <div className="distraction-list">
          {distractions.length === 0 ? (
            <p className="no-distraction-text">
              No distractions or breaks logged in this period.
            </p>
          ) : (
            distractions.map((d) => {
              const isBreak = d.kind === 'break';
              return (
                <div key={d.id} className={`distraction-item ${isBreak ? 'is-break' : ''}`}>
                  <div className="distraction-item-left">
                    <Badge variant={isBreak ? 'info' : 'danger'} size="sm">
                      {isBreak ? <Coffee size={11} /> : <AlertTriangle size={11} />}
                      {isBreak ? 'Break' : 'Distraction'}
                    </Badge>
                    <span className="distraction-category">{d.category}</span>
                    <span className={`distraction-duration ${isBreak ? 'break' : ''}`}>
                      {formatDuration(d.duration_minutes)}
                    </span>
                    {d.description && <span className="distraction-desc">{d.description}</span>}
                  </div>
                  <div className="distraction-item-right">
                    <span className="distraction-date">{d.log_date}</span>
                    <button
                      className="distraction-del-btn"
                      onClick={() => onDeleteDistraction(d.id)}
                      title="Remove log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
