import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'outline', size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 px-2.5 text-xs rounded-md',
      md: 'h-9 px-3.5 text-sm rounded-lg',
      lg: 'h-10 px-4 text-base rounded-lg',
      icon: 'h-9 w-9 p-0 rounded-lg justify-center',
    }[size];

    const variantClasses = {
      primary: 'bg-primary text-primary-foreground font-semibold hover:brightness-105 active:brightness-95 shadow-xs',
      outline: 'bg-elevated border border-border text-foreground hover:bg-raised hover:border-border-strong',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-raised',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-elevated',
      destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
    }[variant];

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 font-medium transition-colors select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
