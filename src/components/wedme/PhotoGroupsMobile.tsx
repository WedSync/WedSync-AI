'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ChevronDownIcon,
  PlusIcon,
  ShareIcon,
  EditIcon,
  TrashIcon,
} from 'lucide-react';
import { PhotoGroupsManager } from './PhotoGroupsManager';
import { TouchInput } from '@/components/touch/TouchInput';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

interface PhotoGroupsMobileProps {
  weddingId: string;
  onShare?: (groupId: string) => void;
  onCreateGroup?: () => void;
}

export function PhotoGroupsMobile({
  weddingId,
  onShare,
  onCreateGroup,
}: PhotoGroupsMobileProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { toast } = useToast();

  // Enhanced offline support for wedding day
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user', // TODO: Get from auth context
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Mock data - replace with actual data fetching
  const [photoGroups, setPhotoGroups] = useState([
    {
      id: '1',
      name: 'Family Portraits',
      description: 'Immediate family group shots',
      photoCount: 12,
      guestCount: 8,
      status: 'incomplete' as const,
      priority: 'high' as const,
      estimatedTime: '30 min',
      venue: 'Main Garden',
      conflicts: [],
    },
    {
      id: '2',
      name: 'Wedding Party',
      description: 'Bridal party and groomsmen shots',
      photoCount: 24,
      guestCount: 12,
      status: 'complete' as const,
      priority: 'high' as const,
      estimatedTime: '45 min',
      venue: 'Rose Pavilion',
      conflicts: ['time-overlap-ceremony'],
    },
    {
      id: '3',
      name: 'Extended Family',
      description: 'Aunts, uncles, cousins group photos',
      photoCount: 6,
      guestCount: 24,
      status: 'pending' as const,
      priority: 'medium' as const,
      estimatedTime: '60 min',
      venue: 'Main Garden',
      conflicts: [],
    },
  ]);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handleQuickShare = useCallback(
    async (groupId: string) => {
      try {
        // Generate shareable link or trigger native share
        if (navigator.share) {
          await navigator.share({
            title: 'Photo Group Plan',
            text: 'Check out this photo group plan for our wedding!',
            url: `${window.location.origin}/wedme/photo-groups/${groupId}`,
          });
        } else {
          // Fallback to copy link
          await navigator.clipboard.writeText(
            `${window.location.origin}/wedme/photo-groups/${groupId}`,
          );
          toast({
            title: 'Link copied!',
            description: 'Photo group link copied to clipboard',
          });
        }
        onShare?.(groupId);
      } catch (error) {
        toast({
          title: 'Share failed',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [onShare, toast],
  );

  const filteredGroups = photoGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status: 'complete' | 'incomplete' | 'pending') => {
    switch (status) {
      case 'complete':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'incomplete':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'pending':
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-error-50 text-error-700';
      case 'medium':
        return 'bg-warning-50 text-warning-700';
      case 'low':
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Photo Groups
            </h1>
            <div className="flex items-center gap-2">
              {/* Offline Status Indicator */}
              {!offlineHook.isOnline && (
                <div className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded-full border border-warning-200">
                  Offline
                </div>
              )}
              {/* Sync Status */}
              {offlineHook.syncStatus.hasUnsyncedData && (
                <div className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                  {offlineHook.syncStatus.pendingCount} pending
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Mobile Optimized */}
          <TouchInput
            placeholder="Search photo groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            size="md"
            preventZoom={true}
            touchOptimized={true}
          />
        </div>
      </div>

      {/* Stats Overview - Mobile Cards */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {photoGroups.length}
            </div>
            <div className="text-xs text-gray-500">Total Groups</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-success-600">
              {photoGroups.filter((g) => g.status === 'complete').length}
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary-600">
              {photoGroups.reduce((sum, g) => sum + g.guestCount, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Guests</div>
          </div>
        </div>
      </div>

      {/* Photo Groups List */}
      <div className="p-4 space-y-3">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div
              key={group.id}
              className={cn(
                'bg-white rounded-xl border border-gray-200 shadow-xs',
                'transition-all duration-200',
                selectedGroup === group.id &&
                  'ring-2 ring-primary-100 border-primary-300',
              )}
            >
              {/* Group Header - Touch Optimized */}
              <div
                className="p-4 cursor-pointer touch-manipulation"
                onClick={() => toggleGroupExpansion(group.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {group.name}
                      </h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full border',
                          getStatusColor(group.status),
                        )}
                      >
                        {group.status}
                      </span>
                      {group.priority === 'high' && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getPriorityColor(group.priority),
                          )}
                        >
                          High Priority
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {group.description}
                    </p>

                    {/* Mobile Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{group.guestCount} guests</span>
                      <span>{group.photoCount} photos</span>
                      <span>{group.estimatedTime}</span>
                      <span>{group.venue}</span>
                    </div>

                    {/* Conflicts Warning */}
                    {group.conflicts.length > 0 && (
                      <div className="mt-2 px-2 py-1 bg-warning-50 border border-warning-200 rounded-lg">
                        <div className="text-xs text-warning-700 font-medium">
                          ⚠️ {group.conflicts.length} conflict
                          {group.conflicts.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Icon */}
                  <ChevronDownIcon
                    className={cn(
                      'w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {/* Quick Actions - Mobile Optimized */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleQuickShare(group.id)}
                      className={cn(
                        'flex items-center justify-center gap-1 px-3 py-2.5',
                        'bg-primary-50 text-primary-700 rounded-lg',
                        'text-sm font-medium touch-manipulation',
                        'hover:bg-primary-100 transition-colors duration-200',
                      )}
                    >
                      <ShareIcon className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={() => setSelectedGroup(group.id)}
                      className={cn(
                        'flex items-center justify-center gap-1 px-3 py-2.5',
                        'bg-gray-50 text-gray-700 rounded-lg',
                        'text-sm font-medium touch-manipulation',
                        'hover:bg-gray-100 transition-colors duration-200',
                      )}
                    >
                      <EditIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        // Handle delete with confirmation
                        if (confirm('Delete this photo group?')) {
                          setPhotoGroups((prev) =>
                            prev.filter((g) => g.id !== group.id),
                          );
                          toast({
                            title: 'Group deleted',
                            description: 'Photo group has been removed',
                          });
                        }
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1 px-3 py-2.5',
                        'bg-error-50 text-error-700 rounded-lg',
                        'text-sm font-medium touch-manipulation',
                        'hover:bg-error-100 transition-colors duration-200',
                      )}
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>

                  {/* Photo Grid Preview */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      Photos Preview
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({
                        length: Math.min(4, group.photoCount),
                      }).map((_, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"
                        >
                          <div className="text-xs text-gray-400">Photo</div>
                        </div>
                      ))}
                      {group.photoCount > 4 && (
                        <div className="aspect-square bg-primary-50 rounded-lg flex items-center justify-center">
                          <div className="text-xs text-primary-600 font-medium">
                            +{group.photoCount - 4}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
                📸
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No photo groups found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first photo group to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setIsCreating(true);
                  onCreateGroup?.();
                }}
                className={cn(
                  'px-6 py-3 bg-primary-600 text-white rounded-lg font-medium',
                  'touch-manipulation hover:bg-primary-700 transition-colors duration-200',
                )}
              >
                Create Photo Group
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-4 z-20">
        <button
          onClick={() => {
            setIsCreating(true);
            onCreateGroup?.();
          }}
          className={cn(
            'w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg',
            'flex items-center justify-center touch-manipulation',
            'hover:bg-primary-700 transition-all duration-200',
            'focus:outline-none focus:ring-4 focus:ring-primary-100',
          )}
          aria-label="Create new photo group"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Performance Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div>Online: {offlineHook.isOnline ? '✅' : '❌'}</div>
          <div>Pending: {offlineHook.syncStatus.pendingCount}</div>
          <div>Cache: {offlineHook.preCache.isPreCached ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  );
}
