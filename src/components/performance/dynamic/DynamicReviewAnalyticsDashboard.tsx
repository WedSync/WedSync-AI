'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOptimizer, LoadingSkeleton } from '@/components/performance';

// Dynamic import with loading state
const ReviewAnalyticsDashboard = dynamic(
  () =>
    import('@/components/reviews/analytics/ReviewAnalyticsDashboard').catch(
      () => ({
        default: () => (
          <div className="p-4 text-center text-gray-500">
            Review Analytics Dashboard unavailable
          </div>
        ),
      }),
    ),
  {
    loading: () => (
      <LoadingSkeleton context="card" count={3} variant="shimmer" />
    ),
    ssr: false, // Client-side only for analytics
  },
);

interface DynamicReviewAnalyticsDashboardProps {
  [key: string]: any;
}

export const DynamicReviewAnalyticsDashboard =
  memo<DynamicReviewAnalyticsDashboardProps>((props) => {
    return (
      <LoadingOptimizer
        context="general"
        loadingType="skeleton"
        priority="low"
        retryable={true}
      >
        <ReviewAnalyticsDashboard {...props} />
      </LoadingOptimizer>
    );
  });

DynamicReviewAnalyticsDashboard.displayName = 'DynamicReviewAnalyticsDashboard';

export default DynamicReviewAnalyticsDashboard;
