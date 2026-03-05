import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-2xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
      secondary: 'glass-panel text-zinc-100 hover:bg-white/10',
      danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20',
      outline: 'border border-white/10 bg-transparent hover:bg-white/5 text-zinc-200',
      ghost: 'hover:bg-white/5 text-zinc-400 hover:text-zinc-100',
    };

    const sizes = {
      sm: 'h-9 px-4 text-xs tracking-wide uppercase',
      md: 'h-12 px-6',
      lg: 'h-14 px-8 text-lg',
      icon: 'h-12 w-12',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
