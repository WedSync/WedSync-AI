'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { LoadingOptimizer, LoadingSkeleton } from '@/components/performance';

// Dynamic import with loading state
const PhotoGroupsManager = dynamic(
  () =>
    import('@/components/wedme/PhotoGroupsManager').catch(() => ({
      default: () => (
        <div className="p-4 text-center text-gray-500">
          Photo Groups Manager unavailable
        </div>
      ),
    })),
  {
    loading: () => <LoadingSkeleton context="gallery" variant="wave" />,
    ssr: false, // Client-side only for photo management
  },
);

interface DynamicPhotoGroupsManagerProps {
  [key: string]: any;
}

export const DynamicPhotoGroupsManager = memo<DynamicPhotoGroupsManagerProps>(
  (props) => {
    return (
      <LoadingOptimizer
        context="gallery"
        loadingType="skeleton"
        priority="medium"
        retryable={true}
        timeout={10000}
      >
        <PhotoGroupsManager {...props} />
      </LoadingOptimizer>
    );
  },
);

DynamicPhotoGroupsManager.displayName = 'DynamicPhotoGroupsManager';

export default DynamicPhotoGroupsManager;
