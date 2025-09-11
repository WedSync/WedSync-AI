import { Suspense } from 'react';
import { Metadata } from 'next';
import { PhotoGroupsManager } from '@/components/wedme/PhotoGroupsManager';
import { WedMeHeader } from '@/components/wedme/WedMeHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata: Metadata = {
  title: 'Photo Groups - WedMe',
  description:
    'Organize your wedding photos into groups for easy sharing and management',
};

export default function WedMePhotoGroupsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <WedMeHeader
        title="Photo Groups"
        subtitle="Organize photos for your special moments"
        showBack={true}
      />

      <main className="px-4 pt-2 pb-20 max-w-md mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <PhotoGroupsManager />
        </Suspense>
      </main>
    </div>
  );
}
