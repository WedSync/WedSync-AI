import React from 'react';
import { clsx } from 'clsx';

interface DescriptionListProps extends React.HTMLAttributes<HTMLDListElement> {
  children: React.ReactNode;
}

interface DescriptionTermProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

interface DescriptionDetailsProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const DescriptionList = React.forwardRef<
  HTMLDListElement,
  DescriptionListProps
>(({ className, children, ...props }, ref) => {
  return (
    <dl ref={ref} className={clsx('space-y-3', className)} {...props}>
      {children}
    </dl>
  );
});
DescriptionList.displayName = 'DescriptionList';

export const DescriptionTerm = React.forwardRef<
  HTMLElement,
  DescriptionTermProps
>(({ className, children, ...props }, ref) => {
  return (
    <dt
      ref={ref}
      className={clsx('text-sm font-medium text-gray-500', className)}
      {...props}
    >
      {children}
    </dt>
  );
});
DescriptionTerm.displayName = 'DescriptionTerm';

export const DescriptionDetails = React.forwardRef<
  HTMLElement,
  DescriptionDetailsProps
>(({ className, children, ...props }, ref) => {
  return (
    <dd
      ref={ref}
      className={clsx('text-sm text-gray-900 mt-1', className)}
      {...props}
    >
      {children}
    </dd>
  );
});
DescriptionDetails.displayName = 'DescriptionDetails';
