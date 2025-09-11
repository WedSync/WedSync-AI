import * as React from 'react';
import clsx from 'clsx';
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('bg-elevated rounded-lg border border-border shadow-md', className)} {...props} />;
}
export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (<div className="p-6 border-b border-border"><h3 className="text-sm font-semibold">{title}</h3>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>);
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-6', className)} {...props} />;
}
