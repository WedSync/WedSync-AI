'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Users,
  Target,
} from 'lucide-react';

// Component imports
import { PhotoGroupBuilder } from './PhotoGroupBuilder';
import { PhotoGroupCard } from './PhotoGroupCard';
import { GuestSelector } from './GuestSelector';

// Types
import {
  PhotoGroup,
  PhotoGroupFormData,
  PhotoGroupFilters,
  PhotoGroupSort,
  PhotoGroupMetrics,
  PhotoGroupConflict,
  AvailableGuest,
  GuestAssignmentAction,
  DragDropContextData,
} from '@/types/photo-groups';
import { Guest } from '@/types/guest-management';

// Hooks
import { useGuestPhotoGroups } from '@/hooks/useGuestPhotoGroups';
import { usePhotoGroupConflicts } from '@/hooks/usePhotoGroupConflicts';

interface PhotoGroupManagerProps {
  coupleId: string;
  initialGroups?: PhotoGroup[];
  availableGuests?: AvailableGuest[];
  onReorder?: (groupIds: string[]) => void;
  className?: string;
}

export function PhotoGroupManager({
  coupleId,
  initialGroups = [],
  availableGuests = [],
  onReorder,
  className = '',
}: PhotoGroupManagerProps) {
  // State management
  const [filters, setFilters] = useState<PhotoGroupFilters>({
    search: '',
    photo_type: 'all',
    has_conflicts: false,
  });

  const [sort, setSort] = useState<PhotoGroupSort>({
    field: 'priority',
    direction: 'asc',
  });

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PhotoGroup | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragDropContextData | null>(
    null,
  );

  // Custom hooks
  const {
    groups,
    loading,
    error,
    metrics,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    assignGuestToGroup,
    unassignGuestFromGroup,
  } = useGuestPhotoGroups(coupleId, { initialGroups });

  const { conflicts, checkConflicts } = usePhotoGroupConflicts(groups);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (group) =>
          group.name.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower) ||
          group.location?.toLowerCase().includes(searchLower),
      );
    }

    // Apply photo type filter
    if (filters.photo_type !== 'all') {
      result = result.filter(
        (group) => group.photo_type === filters.photo_type,
      );
    }

    // Apply conflicts filter
    if (filters.has_conflicts) {
      const conflictGroupIds = new Set(conflicts.map((c) => c.groupId));
      result = result.filter((group) => conflictGroupIds.has(group.id));
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [groups, filters, sort, conflicts]);

  // Get unassigned guests
  const unassignedGuests = useMemo(() => {
    const assignedGuestIds = new Set(
      groups.flatMap(
        (group) => group.assignments?.map((a) => a.guest_id) || [],
      ),
    );
    return availableGuests.filter((guest) => !assignedGuestIds.has(guest.id));
  }, [availableGuests, groups]);

  // Event handlers
  const handleCreateGroup = useCallback(
    async (formData: PhotoGroupFormData) => {
      await createGroup(formData);
      setShowBuilder(false);
    },
    [createGroup],
  );

  const handleUpdateGroup = useCallback(
    async (groupId: string, formData: PhotoGroupFormData) => {
      await updateGroup(groupId, formData);
      setEditingGroup(null);
      setShowBuilder(false);
    },
    [updateGroup],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      await deleteGroup(groupId);
    },
    [deleteGroup],
  );

  const handleEditGroup = useCallback((group: PhotoGroup) => {
    setEditingGroup(group);
    setShowBuilder(true);
  }, []);

  const handleGuestAssignment = useCallback(
    async (action: GuestAssignmentAction) => {
      switch (action.type) {
        case 'assign':
          await assignGuestToGroup(action.guestId, action.targetGroupId);
          break;
        case 'unassign':
          if (action.sourceGroupId) {
            await unassignGuestFromGroup(action.guestId, action.sourceGroupId);
          }
          break;
        case 'reassign':
          if (action.sourceGroupId) {
            await unassignGuestFromGroup(action.guestId, action.sourceGroupId);
          }
          await assignGuestToGroup(action.guestId, action.targetGroupId);
          break;
      }
    },
    [assignGuestToGroup, unassignGuestFromGroup],
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    setDraggedItem(activeData as DragDropContextData);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Handle drag over logic for visual feedback
      const { active, over } = event;

      if (!over || !active.data.current) return;

      // Check for conflicts during drag
      const activeData = active.data.current as DragDropContextData;
      if (activeData.dragType === 'guest') {
        checkConflicts(activeData.guestId!, over.id as string);
      }
    },
    [checkConflicts],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedItem(null);

      if (!over || !active.data.current) return;

      const activeData = active.data.current as DragDropContextData;
      const overData = over.data.current;

      // Handle guest assignment
      if (activeData.dragType === 'guest' && overData?.type === 'group') {
        const action: GuestAssignmentAction = {
          type: activeData.sourceGroupId ? 'reassign' : 'assign',
          guestId: activeData.guestId!,
          sourceGroupId: activeData.sourceGroupId,
          targetGroupId: over.id as string,
        };
        await handleGuestAssignment(action);
      }

      // Handle group reordering
      if (activeData.dragType === 'group' && overData?.type === 'group') {
        const activeIndex = groups.findIndex((g) => g.id === active.id);
        const overIndex = groups.findIndex((g) => g.id === over.id);

        if (activeIndex !== overIndex) {
          const newOrder = [...groups];
          const [movedGroup] = newOrder.splice(activeIndex, 1);
          newOrder.splice(overIndex, 0, movedGroup);

          const reorderedIds = newOrder.map((g) => g.id);
          await reorderGroups(reorderedIds);
          onReorder?.(reorderedIds);
        }
      }
    },
    [groups, handleGuestAssignment, reorderGroups, onReorder],
  );

  // Metrics display
  const MetricsCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'gray',
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color?: 'gray' | 'blue' | 'green' | 'amber' | 'red';
  }) => {
    const colorClasses = {
      gray: 'bg-gray-50 text-gray-600',
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Failed to load photo groups
            </h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid="photo-groups-container"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Photo Groups</h2>
          <p className="text-sm text-gray-600 mt-1">
            Organize your guests into photo groups for efficient wedding
            photography
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Groups"
          value={metrics?.total_groups || 0}
          subtitle={`${filteredGroups.length} shown`}
          icon={Target}
          color="blue"
        />
        <MetricsCard
          title="Assigned Guests"
          value={metrics?.total_assignments || 0}
          subtitle={`${unassignedGuests.length} unassigned`}
          icon={Users}
          color="green"
        />
        <MetricsCard
          title="Total Time"
          value={`${metrics?.estimated_total_time || 0}m`}
          subtitle="Estimated duration"
          icon={Clock}
          color="amber"
        />
        <MetricsCard
          title="Conflicts"
          value={metrics?.groups_with_conflicts || 0}
          subtitle="Need attention"
          icon={AlertTriangle}
          color={metrics?.groups_with_conflicts ? 'red' : 'gray'}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search groups by name, description, or location..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filters.photo_type}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  photo_type: e.target.value as any,
                }))
              }
              className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              aria-label="Photo type filter"
            >
              <option value="all">All Types</option>
              <option value="family">Family</option>
              <option value="friends">Friends</option>
              <option value="bridal_party">Bridal Party</option>
              <option value="groomsmen">Groomsmen</option>
              <option value="bridesmaids">Bridesmaids</option>
              <option value="children">Children</option>
              <option value="special">Special</option>
              <option value="formal">Formal</option>
              <option value="candid">Candid</option>
            </select>
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  has_conflicts: !prev.has_conflicts,
                }))
              }
              className={`px-3.5 py-2.5 border rounded-lg font-medium text-sm transition-all duration-200 ${
                filters.has_conflicts
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              {filters.has_conflicts ? 'Show All' : 'Conflicts Only'}
            </button>
          </div>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo Groups List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Photo Groups ({filteredGroups.length})
            </h3>

            {filteredGroups.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {groups.length === 0
                    ? 'No photo groups yet'
                    : 'No groups match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {groups.length === 0
                    ? 'Create your first photo group to start organizing your wedding photography.'
                    : 'Try adjusting your search or filters to see more groups.'}
                </p>
                {groups.length === 0 && (
                  <button
                    onClick={() => setShowBuilder(true)}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-all duration-200"
                  >
                    Create Your First Group
                  </button>
                )}
              </div>
            ) : (
              <SortableContext
                items={filteredGroups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {filteredGroups.map((group) => (
                    <PhotoGroupCard
                      key={group.id}
                      photoGroup={group}
                      onEdit={handleEditGroup}
                      onDelete={handleDeleteGroup}
                      conflicts={conflicts.filter(
                        (c) => c.groupId === group.id,
                      )}
                      data-testid={`photo-group-${group.id}`}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>

          {/* Unassigned Guests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Unassigned Guests ({unassignedGuests.length})
            </h3>
            <div data-testid="unassigned-guests-section">
              <GuestSelector
                availableGuests={unassignedGuests}
                selectedGuestIds={[]}
                onGuestSelect={() => {}}
                onGuestUnselect={() => {}}
                searchPlaceholder="Search unassigned guests..."
                showCheckboxes={false}
                allowDragDrop={true}
              />
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem && draggedItem.dragType === 'guest' && (
            <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
              <p className="font-medium text-gray-900">Moving guest...</p>
            </div>
          )}
          {draggedItem && draggedItem.dragType === 'group' && (
            <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
              <p className="font-medium text-gray-900">Reordering group...</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Photo Group Builder Modal */}
      {showBuilder && (
        <PhotoGroupBuilder
          isOpen={showBuilder}
          onClose={() => {
            setShowBuilder(false);
            setEditingGroup(null);
          }}
          onSubmit={
            editingGroup
              ? (data) => handleUpdateGroup(editingGroup.id, data)
              : handleCreateGroup
          }
          initialData={editingGroup || undefined}
          availableGuests={availableGuests}
          coupleId={coupleId}
        />
      )}
    </div>
  );
}

export default PhotoGroupManager;
