'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOptimizer, LoadingSkeleton } from '@/components/performance';

// Dynamic import with loading state
const SeatingArrangement = dynamic(
  () =>
    import('@/components/seating/SecureSeatingArrangement').catch(() => ({
      default: () => (
        <div className="p-4 text-center text-gray-500">
          Seating Arrangement unavailable
        </div>
      ),
    })),
  {
    loading: () => (
      <LoadingSkeleton context="card" count={4} variant="shimmer" />
    ),
    ssr: false, // Client-side only for interactive seating
  },
);

interface DynamicSeatingArrangementProps {
  [key: string]: any;
}

export const DynamicSeatingArrangement = memo<DynamicSeatingArrangementProps>(
  (props) => {
    return (
      <LoadingOptimizer
        context="general"
        loadingType="skeleton"
        priority="low"
        retryable={true}
        timeout={12000}
      >
        <SeatingArrangement {...props} />
      </LoadingOptimizer>
    );
  },
);

DynamicSeatingArrangement.displayName = 'DynamicSeatingArrangement';

export default DynamicSeatingArrangement;
