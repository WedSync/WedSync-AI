'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { PhotoGrid } from './PhotoGrid';
import { GroupActionsSheet } from './GroupActionsSheet';
import type { PhotoGroup as PhotoGroupType } from '@/types/photos';

interface PhotoGroupProps {
  group: PhotoGroupType;
  onDelete: () => void;
  onEdit: (updatedGroup: Partial<PhotoGroupType>) => void;
  isActive: boolean;
}

export function PhotoGroup({
  group,
  onDelete,
  onEdit,
  isActive,
}: PhotoGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white rounded-lg border border-gray-200 overflow-hidden touch-manipulation ${
          isDragging ? 'shadow-lg ring-2 ring-pink-500/50' : ''
        } ${isActive ? 'opacity-50' : ''}`}
        {...attributes}
      >
        {/* Group Header */}
        <div
          className="flex items-center px-4 py-3 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-200"
          onClick={handleToggleExpand}
        >
          <button
            className="p-1 -ml-1 mr-2 rounded-full touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <div className="flex-1 min-w-0" {...listeners}>
            <h3 className="font-semibold text-gray-900 truncate">
              {group.name}
            </h3>
            <p className="text-sm text-gray-600">
              {group.photos?.length || 0} photos
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(true);
            }}
            className="p-2 -mr-2 rounded-full touch-manipulation active:bg-gray-200 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Group actions"
          >
            <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Group Content */}
        {isExpanded && (
          <div className="p-4">
            {group.description && (
              <p className="text-sm text-gray-600 mb-4">{group.description}</p>
            )}

            {group.photos && group.photos.length > 0 ? (
              <PhotoGrid
                photos={group.photos}
                groupId={group.id}
                isDropTarget={true}
              />
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <EyeIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  No photos in this group yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Drag photos here to add them
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Bottom Sheet */}
      <GroupActionsSheet
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        group={group}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}
