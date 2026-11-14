import React from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
  noPadding = false,
  children,
  onClick
}) => {
  return (
    <div
      className={`card ${noPadding ? 'card-no-padding' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || icon || action) && (
        <div className="card-header">
          <div className="card-title-group">
            {icon && <span className="card-icon">{icon}</span>}
            <div>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};
