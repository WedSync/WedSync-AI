'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  Active,
  Over,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  CameraIcon,
  ClockIcon,
} from 'lucide-react';
import { TouchInput } from '@/components/touch/TouchInput';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

// Types
interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship: string;
  group?: 'family' | 'friends' | 'wedding-party' | 'vendors';
  profileImage?: string;
  isVip?: boolean;
  dietaryRestrictions?: string[];
  plusOne?: string;
  rsvpStatus?: 'confirmed' | 'pending' | 'declined';
}

interface PhotoGroup {
  id: string;
  name: string;
  description: string;
  maxGuests?: number;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  venue?: string;
  timeSlot?: string;
  assignedGuests: Guest[];
  requiredRoles?: string[];
  photoStyle?: string;
  isLocked?: boolean;
}

interface MobileGuestAssignmentProps {
  weddingId: string;
  photoGroups: PhotoGroup[];
  availableGuests: Guest[];
  onAssignGuest: (guestId: string, groupId: string) => void;
  onUnassignGuest: (guestId: string) => void;
  onUpdateGroups: (groups: PhotoGroup[]) => void;
  isReadOnly?: boolean;
}

// Draggable Guest Card Component
function DraggableGuestCard({
  guest,
  isAssigned = false,
}: {
  guest: Guest;
  isAssigned?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative bg-white rounded-lg border-2 border-gray-200 p-3 shadow-xs',
        'transition-all duration-200 touch-manipulation',
        'active:scale-95 active:shadow-md',
        isDragging && 'opacity-50 shadow-lg z-50',
        isAssigned && 'border-primary-300 bg-primary-50',
        guest.isVip && 'border-amber-300 bg-amber-50',
        'min-h-[60px] cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Guest Avatar */}
      <div className="flex items-center space-x-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            guest.profileImage
              ? 'bg-gray-100'
              : 'bg-primary-100 text-primary-600',
          )}
        >
          {guest.profileImage ? (
            <img
              src={guest.profileImage}
              alt={guest.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium">
              {guest.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate text-sm">
              {guest.name}
            </h4>
            {guest.isVip && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                VIP
              </span>
            )}
            {guest.rsvpStatus === 'confirmed' && (
              <CheckIcon className="w-4 h-4 text-success-500" />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span className="capitalize">{guest.relationship}</span>
            {guest.plusOne && (
              <span className="flex items-center gap-1">
                <PlusIcon className="w-3 h-3" />
                +1
              </span>
            )}
          </div>
        </div>

        {/* Drag Handle Indicator */}
        <div className="flex flex-col gap-0.5 opacity-40 flex-shrink-0">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>

      {/* Visual feedback during drag */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary-100 border-2 border-primary-300 rounded-lg opacity-75" />
      )}
    </div>
  );
}

// Drop Zone for Photo Groups
function PhotoGroupDropZone({
  group,
  isOver,
  children,
}: {
  group: PhotoGroup;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const isAtCapacity = group.maxGuests
    ? group.assignedGuests.length >= group.maxGuests
    : false;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 border-gray-200 overflow-hidden',
        'transition-all duration-200',
        isOver && !isAtCapacity && 'border-primary-400 bg-primary-50 shadow-lg',
        isOver && isAtCapacity && 'border-error-400 bg-error-50',
        group.isLocked && 'opacity-50 pointer-events-none',
      )}
    >
      {/* Group Header */}
      <div
        className={cn(
          'px-4 py-3 border-b border-gray-200 bg-gray-50',
          isOver && !isAtCapacity && 'bg-primary-100 border-primary-200',
          isOver && isAtCapacity && 'bg-error-100 border-error-200',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-gray-900 text-sm">{group.name}</h3>
            {group.priority === 'high' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                High Priority
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <UsersIcon className="w-3 h-3" />
            <span>
              {group.assignedGuests.length}
              {group.maxGuests && `/${group.maxGuests}`}
            </span>
          </div>
        </div>

        {/* Group metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {group.estimatedTime && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              <span>{group.estimatedTime}</span>
            </div>
          )}
          {group.venue && <span>{group.venue}</span>}
        </div>
      </div>

      {/* Drop indicator */}
      {isOver && (
        <div
          className={cn(
            'px-4 py-2 text-center text-sm font-medium',
            !isAtCapacity
              ? 'text-primary-700 bg-primary-100'
              : 'text-error-700 bg-error-100',
          )}
        >
          {!isAtCapacity ? (
            <span>Drop guest here to assign</span>
          ) : (
            <span>Group is at capacity</span>
          )}
        </div>
      )}

      {/* Group content */}
      <div className="p-4">{children}</div>

      {/* Capacity warning */}
      {isAtCapacity && (
        <div className="px-4 py-2 bg-warning-50 border-t border-warning-200">
          <div className="text-xs text-warning-700 text-center">
            ⚠️ Group is at maximum capacity
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function MobileGuestAssignment({
  weddingId,
  photoGroups,
  availableGuests,
  onAssignGuest,
  onUnassignGuest,
  onUpdateGroups,
  isReadOnly = false,
}: MobileGuestAssignmentProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showUnassigned, setShowUnassigned] = useState(true);

  const { toast } = useToast();

  // Enhanced offline support
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Configure sensors for optimal touch experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Short delay for better touch UX
        tolerance: 8, // Touch tolerance
      },
    }),
  );

  // Get unassigned guests
  const unassignedGuests = useMemo(() => {
    const assignedGuestIds = new Set(
      photoGroups.flatMap((group) =>
        group.assignedGuests.map((guest) => guest.id),
      ),
    );
    return availableGuests.filter((guest) => !assignedGuestIds.has(guest.id));
  }, [availableGuests, photoGroups]);

  // Filter guests based on search and filters
  const filteredUnassignedGuests = useMemo(() => {
    let filtered = unassignedGuests;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          guest.relationship.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query),
      );
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((guest) => guest.group === selectedFilter);
    }

    return filtered;
  }, [unassignedGuests, searchQuery, selectedFilter]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Haptic feedback for drag start
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !active) {
        setActiveId(null);
        return;
      }

      const guestId = active.id as string;
      const targetGroupId = over.id as string;

      try {
        if (targetGroupId === 'unassigned') {
          // Move guest back to unassigned
          await onUnassignGuest(guestId);
          toast({
            title: 'Guest unassigned',
            description: 'Guest moved to unassigned list',
          });
        } else {
          // Check if target group is at capacity
          const targetGroup = photoGroups.find((g) => g.id === targetGroupId);
          if (
            targetGroup?.maxGuests &&
            targetGroup.assignedGuests.length >= targetGroup.maxGuests
          ) {
            toast({
              title: 'Cannot assign guest',
              description: 'This photo group is at maximum capacity',
              variant: 'destructive',
            });
            setActiveId(null);
            return;
          }

          // Assign guest to group
          await onAssignGuest(guestId, targetGroupId);
          toast({
            title: 'Guest assigned',
            description: `Guest assigned to ${targetGroup?.name}`,
          });
        }

        // Success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      } catch (error) {
        toast({
          title: 'Assignment failed',
          description: 'Please try again',
          variant: 'destructive',
        });

        // Error haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      }

      setActiveId(null);
    },
    [photoGroups, onAssignGuest, onUnassignGuest, toast],
  );

  // Get the actively dragged guest
  const activeGuest = useMemo(() => {
    if (!activeId) return null;
    return availableGuests.find((guest) => guest.id === activeId) || null;
  }, [activeId, availableGuests]);

  // Guest filters
  const guestGroups = ['all', 'family', 'friends', 'wedding-party', 'vendors'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Guest Assignment
            </h1>
            <div className="flex items-center gap-2">
              {!offlineHook.isOnline && (
                <div className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded-full border border-warning-200">
                  Offline
                </div>
              )}
              {offlineHook.syncStatus.hasUnsyncedData && (
                <div className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                  {offlineHook.syncStatus.pendingCount} pending
                </div>
              )}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <TouchInput
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              icon={<SearchIcon className="w-4 h-4" />}
              size="md"
              preventZoom={true}
              touchOptimized={true}
            />

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {guestGroups.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation',
                    'transition-colors duration-200 flex-shrink-0',
                    selectedFilter === filter
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200',
                  )}
                >
                  {filter === 'all'
                    ? 'All Guests'
                    : filter
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Stats */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {availableGuests.length}
            </div>
            <div className="text-xs text-gray-500">Total Guests</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary-600">
              {availableGuests.length - unassignedGuests.length}
            </div>
            <div className="text-xs text-gray-500">Assigned</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-warning-600">
              {unassignedGuests.length}
            </div>
            <div className="text-xs text-gray-500">Unassigned</div>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4 space-y-4">
          {/* Photo Groups */}
          {photoGroups.map((group) => (
            <PhotoGroupDropZone
              key={group.id}
              group={group}
              isOver={false} // Will be handled by DndContext
            >
              <div className="space-y-2">
                <SortableContext
                  items={group.assignedGuests.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.assignedGuests.map((guest) => (
                    <DraggableGuestCard
                      key={guest.id}
                      guest={guest}
                      isAssigned={true}
                    />
                  ))}
                </SortableContext>

                {group.assignedGuests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserGroupIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Drop guests here to assign</p>
                    <p className="text-xs mt-1">
                      Long press and drag from unassigned list
                    </p>
                  </div>
                )}
              </div>
            </PhotoGroupDropZone>
          ))}

          {/* Unassigned Guests */}
          {showUnassigned && filteredUnassignedGuests.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 text-sm">
                    Unassigned Guests ({filteredUnassignedGuests.length})
                  </h3>
                  <button
                    onClick={() => setShowUnassigned(!showUnassigned)}
                    className="p-1 rounded text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <SortableContext
                  items={filteredUnassignedGuests.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredUnassignedGuests.map((guest) => (
                    <DraggableGuestCard
                      key={guest.id}
                      guest={guest}
                      isAssigned={false}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredUnassignedGuests.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <SearchIcon className="w-12 h-12 mx-auto opacity-40" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No guests found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or filter
              </p>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeGuest && <DraggableGuestCard guest={activeGuest} />}
        </DragOverlay>
      </DndContext>

      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-4 z-20">
        <button
          onClick={() => setShowUnassigned(!showUnassigned)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
            'text-white touch-manipulation transition-all duration-200',
            'hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary-100',
            showUnassigned ? 'bg-primary-600' : 'bg-gray-600',
          )}
          aria-label={
            showUnassigned ? 'Hide unassigned guests' : 'Show unassigned guests'
          }
        >
          <UsersIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Performance Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs z-30">
          <div>Online: {offlineHook.isOnline ? '✅' : '❌'}</div>
          <div>Pending: {offlineHook.syncStatus.pendingCount}</div>
          <div>Guests: {availableGuests.length}</div>
          <div>
            Assigned: {availableGuests.length - unassignedGuests.length}
          </div>
        </div>
      )}
    </div>
  );
}
