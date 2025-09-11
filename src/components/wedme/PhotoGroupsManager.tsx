'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PhotoGroup } from './PhotoGroup';
import { PhotoGrid } from './PhotoGrid';
import { CreateGroupModal } from './CreateGroupModal';
import { PhotoGroupFAB } from './PhotoGroupFAB';
import { EmptyState } from './EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { usePhotoGroups } from '@/hooks/usePhotoGroups';
import type { PhotoGroup as PhotoGroupType, Photo } from '@/types/photos';

export function PhotoGroupsManager() {
  const [groups, setGroups] = useState<PhotoGroupType[]>([]);
  const [ungroupedPhotos, setUngroupedPhotos] = useState<Photo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const {
    groups: fetchedGroups,
    photos: fetchedPhotos,
    createGroup,
    updateGroup,
    deleteGroup,
    addPhotoToGroup,
    removePhotoFromGroup,
    isLoading: hookLoading,
    error,
  } = usePhotoGroups();

  // Configure touch sensors for mobile devices
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  useEffect(() => {
    if (fetchedGroups && fetchedPhotos) {
      setGroups(fetchedGroups);
      setUngroupedPhotos(fetchedPhotos.filter((photo) => !photo.groupId));
      setIsLoading(false);
    }
  }, [fetchedGroups, fetchedPhotos]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over logic for visual feedback
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        setActiveId(null);
        return;
      }

      const photoId = active.id as string;
      const targetGroupId = over.id as string;

      try {
        if (targetGroupId === 'ungrouped') {
          await removePhotoFromGroup(photoId);
          toast({
            title: 'Photo removed from group',
            description: 'Photo moved to ungrouped photos',
          });
        } else {
          await addPhotoToGroup(photoId, targetGroupId);
          toast({
            title: 'Photo added to group',
            description: 'Photo successfully moved to group',
          });
        }
      } catch (error) {
        toast({
          title: 'Error moving photo',
          description: 'Please try again',
          variant: 'destructive',
        });
      }

      setActiveId(null);
    },
    [addPhotoToGroup, removePhotoFromGroup, toast],
  );

  const handleCreateGroup = useCallback(
    async (name: string, description?: string) => {
      try {
        await createGroup({ name, description });
        setShowCreateModal(false);
        toast({
          title: 'Group created',
          description: `"${name}" group has been created successfully`,
        });
      } catch (error) {
        toast({
          title: 'Error creating group',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [createGroup, toast],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await deleteGroup(groupId);
        toast({
          title: 'Group deleted',
          description: 'Group and its photos have been removed',
        });
      } catch (error) {
        toast({
          title: 'Error deleting group',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [deleteGroup, toast],
  );

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading photo groups</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-pink-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || hookLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* Grouped Photos */}
          <SortableContext
            items={groups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group) => (
              <PhotoGroup
                key={group.id}
                group={group}
                onDelete={() => handleDeleteGroup(group.id)}
                onEdit={(updatedGroup) => updateGroup(group.id, updatedGroup)}
                isActive={activeId !== null}
              />
            ))}
          </SortableContext>

          {/* Ungrouped Photos */}
          {ungroupedPhotos.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Ungrouped Photos ({ungroupedPhotos.length})
                </h3>
              </div>
              <PhotoGrid
                photos={ungroupedPhotos}
                groupId="ungrouped"
                isDropTarget={true}
              />
            </div>
          )}

          {/* Empty State */}
          {groups.length === 0 && ungroupedPhotos.length === 0 && (
            <EmptyState onCreateGroup={() => setShowCreateModal(true)} />
          )}
        </div>
      </DndContext>

      {/* Floating Action Button */}
      <PhotoGroupFAB onClick={() => setShowCreateModal(true)} />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  );
}
