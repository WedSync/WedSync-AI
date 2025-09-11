import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the heavy BrandingCustomizer component
const BrandingCustomizerDynamic = dynamic(
  () => import('./BrandingCustomizer'),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for better performance
  },
);

export function BrandingCustomizerLazy(props: any) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <BrandingCustomizerDynamic {...props} />
    </Suspense>
  );
}

export default BrandingCustomizerLazy;
