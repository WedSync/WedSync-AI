'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOptimizer, LoadingSkeleton } from '@/components/performance';

// Dynamic import with loading state
const CustomerHealthDashboard = dynamic(
  () =>
    import('@/components/dashboard/CustomerHealthDashboard').catch(() => ({
      default: () => (
        <div className="p-4 text-center text-gray-500">
          Customer Health Dashboard unavailable
        </div>
      ),
    })),
  {
    loading: () => <LoadingSkeleton context="table" variant="pulse" />,
    ssr: false, // Client-side only for admin dashboard
  },
);

interface DynamicCustomerHealthDashboardProps {
  [key: string]: any;
}

export const DynamicCustomerHealthDashboard =
  memo<DynamicCustomerHealthDashboardProps>((props) => {
    return (
      <LoadingOptimizer
        context="general"
        loadingType="skeleton"
        priority="medium"
        retryable={true}
        timeout={8000}
      >
        <CustomerHealthDashboard {...props} />
      </LoadingOptimizer>
    );
  });

DynamicCustomerHealthDashboard.displayName = 'DynamicCustomerHealthDashboard';

export default DynamicCustomerHealthDashboard;
