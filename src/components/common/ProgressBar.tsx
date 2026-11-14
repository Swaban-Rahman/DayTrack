import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color,
  size = 'md',
  showLabel = false,
  label
}) => {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={`progress-container progress-${size}`}>
      {showLabel && (
        <div className="progress-label-row">
          <span className="progress-label">{label || 'Progress'}</span>
          <span className="progress-percent">{clampedValue}%</span>
        </div>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color || 'var(--accent)'
          }}
        />
      </div>
    </div>
  );
};
