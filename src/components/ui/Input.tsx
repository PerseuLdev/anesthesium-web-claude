import React from 'react';
import { cn } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, suffix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full group">
        {label && <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-focus-within:text-zinc-300 transition-colors flex justify-between items-center">{label}</label>}
        <div className="relative w-full">
          <input
            className={cn(
              "flex h-12 w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus-visible:outline-none focus-visible:border-white/20 focus-visible:bg-white/5 transition-all shadow-inner",
              error && "border-rose-500/50 focus-visible:border-rose-500",
              suffix && "pr-16",
              className
            )}
            ref={ref}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {suffix}
            </div>
          )}
        </div>
        {error && <span className="text-[10px] font-mono text-rose-500 uppercase tracking-wider">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
