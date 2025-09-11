'use client';

import { PhotoIcon, PlusIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onCreateGroup: () => void;
}

export function EmptyState({ onCreateGroup }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
        <PhotoIcon className="w-10 h-10 text-pink-600" />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        No Photo Groups Yet
      </h2>

      <p className="text-gray-600 mb-8 leading-relaxed">
        Create your first photo group to organize your wedding photos by
        moments, locations, or themes.
      </p>

      <button
        onClick={onCreateGroup}
        className="
          inline-flex items-center gap-2 px-6 py-3
          bg-gradient-to-r from-pink-500 to-purple-500
          text-white font-medium rounded-full
          touch-manipulation active:scale-95 transition-transform
          shadow-lg hover:shadow-xl
        "
        style={{ minHeight: '48px' }}
      >
        <PlusIcon className="w-5 h-5" />
        Create Your First Group
      </button>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-2">💡 Pro Tips:</p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Drag and drop photos between groups</li>
          <li>• Long press to select multiple photos</li>
          <li>• Swipe groups to access quick actions</li>
        </ul>
      </div>
    </div>
  );
}
