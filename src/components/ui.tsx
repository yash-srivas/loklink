/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 border border-orange-600/20',
      secondary: 'bg-gradient-to-b from-stone-800 to-stone-900 text-white hover:from-stone-900 hover:to-stone-950 shadow-md shadow-stone-900/20 border border-stone-700/20',
      outline: 'border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 hover:border-stone-300 shadow-sm dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
      ghost: 'bg-transparent hover:bg-stone-100 text-stone-600 border border-transparent dark:text-stone-400 dark:hover:bg-stone-800',
      danger: 'bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/20 border border-red-600/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg',
      md: 'h-10 px-4 py-2 text-sm rounded-xl',
      lg: 'h-12 px-8 text-base rounded-xl',
      icon: 'h-10 w-10 p-0 flex items-center justify-center rounded-full',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-stone-900 dark:border-stone-800',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

Card.displayName = 'Card';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 font-medium dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-200 dark:placeholder:text-stone-500 dark:focus-visible:border-orange-500/50',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';

export const Badge = ({ 
  className, 
  children, 
  variant = 'default' 
}: { 
  className?: string, 
  children: React.ReactNode, 
  variant?: 'default' | 'success' | 'warning' | 'danger' 
}) => {
  const variants = {
    default: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
    warning: 'bg-orange-50 text-orange-700 border border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
    danger: 'bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  };
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider', variants[variant], className)}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
