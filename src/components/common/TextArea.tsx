import React from 'react';
import './TextArea.css';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  id,
  rows = 3,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`textarea-group ${className}`}>
      {label && <label htmlFor={textareaId} className="textarea-label">{label}</label>}
      <textarea
        id={textareaId}
        rows={rows}
        className={`textarea-field ${error ? 'textarea-error' : ''}`}
        {...props}
      />
      {error && <span className="textarea-error-text">{error}</span>}
    </div>
  );
};
