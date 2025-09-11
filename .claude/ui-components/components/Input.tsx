import * as React from 'react';
import clsx from 'clsx';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hint?: string; error?: string; label?: string; requiredMark?: boolean;
}
export function Input({ label, hint, error, requiredMark, id, className, ...props }: InputProps) {
  const inputId = id || React.useId();
  const describedBy = error ? inputId + '-error' : hint ? inputId + '-hint' : undefined;
  return (
    <label className="block">
      {label && <span className="text-sm font-medium">{label} {requiredMark && <span className="text-danger" aria-hidden="true">*</span>}</span>}
      <input id={inputId}
        className={clsx('mt-2 h-10 w-full rounded-md border border-border bg-background px-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent', className)}
        aria-describedby={describedBy} aria-invalid={!!error} {...props}
      />
      {hint && !error && <p id={inputId + '-hint'} className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {error && <p id={inputId + '-error'} className="mt-1 text-sm text-danger">{error}</p>}
    </label>
  );
}
