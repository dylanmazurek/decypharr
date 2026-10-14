import React from 'react';
import { cn } from '../../lib/utils';

export interface StatCellProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  statusDot?: 'ok' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  subtext,
  icon,
  statusDot,
  className,
}) => {
  const dotColor = {
    ok: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive',
    neutral: 'bg-muted-foreground',
  }[statusDot || 'neutral'];

  return (
    <div className={cn('p-4 flex flex-col justify-between gap-1', className)}>
      <div className="flex items-center gap-2">
        {statusDot && (
          <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
        )}
        {icon && (
          <span className="text-muted-foreground flex items-center shrink-0">
            {icon}
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold text-foreground tracking-tight font-sans">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-muted-foreground truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};

export interface StatusStripProps {
  children: React.ReactNode;
  className?: string;
  columns?: number;
}

export const StatusStrip: React.FC<StatusStripProps> = ({
  children,
  className,
  columns = 4,
}) => {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  }[columns] || 'grid-cols-2 lg:grid-cols-4';

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-card-lift grid divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden',
        colClass,
        className
      )}
    >
      {children}
    </div>
  );
};
