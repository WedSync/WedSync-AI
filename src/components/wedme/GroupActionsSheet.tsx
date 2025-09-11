'use client';

import { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  ShareIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { PhotoGroup } from '@/types/photos';

interface GroupActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  group: PhotoGroup;
  onEdit: (updatedGroup: Partial<PhotoGroup>) => void;
  onDelete: () => void;
}

export function GroupActionsSheet({
  isOpen,
  onClose,
  group,
  onEdit,
  onDelete,
}: GroupActionsSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const actions = [
    {
      icon: EyeIcon,
      label: 'View Photos',
      onClick: () => {
        // Navigate to group detail view
        onClose();
      },
    },
    {
      icon: ShareIcon,
      label: 'Share Group',
      onClick: () => {
        // Share group functionality
        onClose();
      },
    },
    {
      icon: PencilIcon,
      label: 'Edit Group',
      onClick: () => {
        // Edit group functionality
        onClose();
      },
    },
    {
      icon: TrashIcon,
      label: 'Delete Group',
      onClick: () => setShowDeleteConfirm(true),
      destructive: true,
    },
  ];

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl max-w-md mx-auto">
        {!showDeleteConfirm ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 truncate">
                  {group.name}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full touch-manipulation active:bg-gray-200"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label="Close actions"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {group.photos?.length || 0} photos
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg
                    touch-manipulation active:bg-gray-100 transition-colors
                    ${action.destructive ? 'text-red-600' : 'text-gray-700'}
                  `}
                  style={{ minHeight: '48px' }}
                >
                  <action.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Delete Confirmation */
          <div className="p-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete "{group.name}"?
              </h3>
              <p className="text-sm text-gray-600">
                This action cannot be undone. All photos will be moved to
                ungrouped.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="
                  flex-1 py-3 px-4 border border-gray-300 rounded-lg
                  font-medium text-gray-700 touch-manipulation
                  active:bg-gray-50 transition-colors
                "
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="
                  flex-1 py-3 px-4 bg-red-600 text-white
                  font-medium rounded-lg touch-manipulation
                  active:bg-red-700 transition-colors
                "
                style={{ minHeight: '44px' }}
              >
                Delete Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
