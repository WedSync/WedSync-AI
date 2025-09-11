'use client';

import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Edit3,
  Trash2,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Camera,
  Target,
  UserPlus,
} from 'lucide-react';

// Types
import {
  PhotoGroup,
  PhotoGroupConflict,
  DraggableData,
} from '@/types/photo-groups';

interface PhotoGroupCardProps {
  photoGroup: PhotoGroup;
  onEdit: (group: PhotoGroup) => void;
  onDelete: (groupId: string) => void;
  onAssignGuest?: (groupId: string, guestId: string) => void;
  onUnassignGuest?: (groupId: string, guestId: string) => void;
  conflicts?: PhotoGroupConflict[];
  isSelected?: boolean;
  className?: string;
}

// Photo type color mapping
const PHOTO_TYPE_COLORS = {
  family: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  friends: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  bridal_party: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  groomsmen: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  bridesmaids: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  children: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  special: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  formal: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  candid: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
};

// Photo type icons
const PHOTO_TYPE_ICONS = {
  family: Users,
  friends: Users,
  bridal_party: Camera,
  groomsmen: Camera,
  bridesmaids: Camera,
  children: Users,
  special: Camera,
  formal: Camera,
  candid: Camera,
};

export function PhotoGroupCard({
  photoGroup,
  onEdit,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
  conflicts = [],
  isSelected = false,
  className = '',
  ...props
}: PhotoGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photoGroup.id,
    data: {
      type: 'group',
      id: photoGroup.id,
      dragType: 'group',
    } as DraggableData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get color scheme for photo type
  const colorScheme =
    PHOTO_TYPE_COLORS[photoGroup.photo_type] || PHOTO_TYPE_COLORS.formal;
  const IconComponent = PHOTO_TYPE_ICONS[photoGroup.photo_type] || Camera;

  // Get assigned guests
  const assignedGuests = photoGroup.assignments || [];
  const hasConflicts = conflicts.length > 0;

  // Handle delete confirmation
  const handleDelete = useCallback(() => {
    onDelete(photoGroup.id);
    setShowDeleteConfirm(false);
  }, [onDelete, photoGroup.id]);

  // Handle guest unassignment
  const handleUnassignGuest = useCallback(
    (guestId: string) => {
      onUnassignGuest?.(photoGroup.id, guestId);
    },
    [onUnassignGuest, photoGroup.id],
  );

  // Format photo type label
  const formatPhotoType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          bg-white border rounded-xl shadow-xs hover:shadow-md transition-all duration-200
          ${isDragging ? 'opacity-50 rotate-2' : ''}
          ${isSelected ? 'ring-2 ring-primary-500' : ''}
          ${hasConflicts ? 'border-red-300' : 'border-gray-200'}
          ${className}
        `}
        {...props}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Priority and Type Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                  <Target className="w-3 h-3" />
                  Priority {photoGroup.priority}
                </div>
                <span
                  className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                  ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border}
                `}
                >
                  <IconComponent className="w-3 h-3 mr-1" />
                  {formatPhotoType(photoGroup.photo_type)}
                </span>
              </div>

              {/* Group Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {photoGroup.name}
              </h3>

              {/* Description */}
              {photoGroup.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {photoGroup.description}
                </p>
              )}

              {/* Key Details */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {photoGroup.estimated_time_minutes} minutes
                </div>
                {photoGroup.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {photoGroup.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {assignedGuests.length} guest
                  {assignedGuests.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {/* Drag Handle */}
              <button
                {...attributes}
                {...listeners}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </button>

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Edit Button */}
              <button
                onClick={() => onEdit(photoGroup)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                aria-label="Edit group"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                aria-label="Delete group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conflicts Warning */}
          {hasConflicts && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-800 mb-1">
                    {conflicts.length} conflict
                    {conflicts.length !== 1 ? 's' : ''} detected
                  </h4>
                  {conflicts.slice(0, 2).map((conflict, index) => (
                    <p key={index} className="text-xs text-red-700">
                      {conflict.message}
                    </p>
                  ))}
                  {conflicts.length > 2 && (
                    <p className="text-xs text-red-600 mt-1">
                      +{conflicts.length - 2} more conflict
                      {conflicts.length - 2 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Guests */}
        <div className="p-4">
          {assignedGuests.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                No guests assigned
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Drag guests here or edit group to assign
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 flex items-center justify-between">
                Assigned Guests ({assignedGuests.length})
                {!isExpanded && assignedGuests.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Show all
                  </button>
                )}
              </h4>

              <div className="space-y-2">
                {(isExpanded ? assignedGuests : assignedGuests.slice(0, 3)).map(
                  (assignment) => (
                    <div
                      key={assignment.id}
                      data-testid={`guest-assignment-${assignment.guest_id}`}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        {/* Guest Avatar */}
                        <div
                          className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white
                        ${assignment.is_primary ? 'bg-primary-500' : 'bg-gray-400'}
                      `}
                        >
                          {assignment.guest?.first_name?.charAt(0)}
                          {assignment.guest?.last_name?.charAt(0)}
                        </div>

                        {/* Guest Details */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.guest?.first_name}{' '}
                            {assignment.guest?.last_name}
                            {assignment.is_primary && (
                              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">
                              {assignment.guest?.category}
                            </span>
                            <span>•</span>
                            <span className="capitalize">
                              {assignment.guest?.side === 'partner1'
                                ? 'Partner 1'
                                : assignment.guest?.side === 'partner2'
                                  ? 'Partner 2'
                                  : 'Mutual'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Unassign Button */}
                      <button
                        onClick={() => handleUnassignGuest(assignment.guest_id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remove from group"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ),
                )}

                {!isExpanded && assignedGuests.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full p-2 text-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    +{assignedGuests.length - 3} more guest
                    {assignedGuests.length - 3 !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {photoGroup.timeline_slot && (
                <div>
                  <span className="font-medium text-gray-700">Timeline:</span>
                  <span className="ml-2 text-gray-600 capitalize">
                    {photoGroup.timeline_slot.replace('_', ' ')}
                  </span>
                </div>
              )}

              {photoGroup.photographer_notes && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-gray-700">
                    Photographer Notes:
                  </span>
                  <p className="mt-1 text-gray-600 text-xs leading-relaxed">
                    {photoGroup.photographer_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Delete
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{photoGroup.name}"? This action
                cannot be undone.
                {assignedGuests.length > 0 && (
                  <span className="block mt-2 text-sm text-amber-700">
                    ⚠️ {assignedGuests.length} guest
                    {assignedGuests.length !== 1 ? 's' : ''} will be unassigned.
                  </span>
                )}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-all duration-200"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PhotoGroupCard;
