import React from 'react';
import './Select.css';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`select-group ${className}`}>
      {label && <label htmlFor={selectId} className="select-label">{label}</label>}
      <div className={`select-wrapper ${error ? 'select-error' : ''}`}>
        <select id={selectId} className="select-field" {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="select-option">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="select-error-text">{error}</span>}
    </div>
  );
};
