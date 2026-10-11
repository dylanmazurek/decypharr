import React from 'react';
import { cn } from '../../lib/utils';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center bg-elevated border border-border rounded-lg p-0.5 gap-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 font-medium transition-all select-none cursor-pointer',
              size === 'sm' ? 'px-2.5 py-1 text-xs rounded-md' : 'px-3 py-1.5 text-sm rounded-md',
              isSelected
                ? 'bg-raised text-foreground shadow-selected-x font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-raised/50'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.2 rounded-full font-mono',
                  isSelected
                    ? 'bg-primary/20 text-accent-foreground font-semibold'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
