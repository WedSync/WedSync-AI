'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOptimizer, LoadingSkeleton } from '@/components/performance';

// Dynamic import with loading state
const TrialConversionFlow = dynamic(
  () =>
    import('@/components/trial/TrialConversionFlow').catch(() => ({
      default: () => (
        <div className="p-4 text-center text-gray-500">
          Trial Conversion Flow unavailable
        </div>
      ),
    })),
  {
    loading: () => <LoadingSkeleton context="card" count={2} variant="pulse" />,
    ssr: false, // Client-side only for conversion tracking
  },
);

interface DynamicTrialConversionFlowProps {
  [key: string]: any;
}

export const DynamicTrialConversionFlow = memo<DynamicTrialConversionFlowProps>(
  (props) => {
    return (
      <LoadingOptimizer
        context="general"
        loadingType="skeleton"
        priority="low"
        retryable={true}
        timeout={6000}
      >
        <TrialConversionFlow {...props} />
      </LoadingOptimizer>
    );
  },
);

DynamicTrialConversionFlow.displayName = 'DynamicTrialConversionFlow';

export default DynamicTrialConversionFlow;
