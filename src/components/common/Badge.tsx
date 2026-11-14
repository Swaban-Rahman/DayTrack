import React from 'react';
import './Badge.css';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  color,
  className = ''
}) => {
  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      style={color ? { backgroundColor: `${color}20`, color: color, borderColor: `${color}40` } : undefined}
    >
      {children}
    </span>
  );
};
