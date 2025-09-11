import * as React from 'react';
import clsx from 'clsx';
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; isLoading?: boolean; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode;
}
const base = 'relative inline-flex items-center justify-center rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed transition-standard';
const sizes: Record<Size,string> = { sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 text-[15px]', lg: 'h-11 px-5 text-base' };
const variants: Record<Variant,string> = {
  primary: 'bg-accent text-[15px] text-[color:var(--accent-ink)] hover:opacity-90 shadow-sm',
  secondary: 'border border-border bg-background text-foreground hover:bg-muted shadow-sm',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant='primary', size='md', isLoading, leftIcon, rightIcon, children, className, ...props }, ref
) {
  return (
    <button ref={ref} className={clsx(base, sizes[size], variants[variant], className)} aria-busy={isLoading} {...props}>
      {leftIcon ? <span className="mr-2">{leftIcon}</span> : null}
      <span className={clsx(isLoading && 'opacity-0')}>{children}</span>
      {rightIcon ? <span className="ml-2">{rightIcon}</span> : null}
      {isLoading && <span className="absolute inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />}
    </button>
  );
});
