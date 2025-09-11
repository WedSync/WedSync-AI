'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl max-w-md mx-auto">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Photo Group
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full touch-manipulation active:bg-gray-200"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Group Name *
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ceremony Photos"
              className="
                w-full px-3 py-3 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
                touch-manipulation text-base
              "
              style={{ minHeight: '44px' }}
              maxLength={50}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="group-description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description (optional)
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this group..."
              rows={3}
              className="
                w-full px-3 py-3 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
                touch-manipulation text-base resize-none
              "
              maxLength={200}
            />
          </div>

          <div className="flex gap-3 pt-2 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 py-3 px-4 border border-gray-300 rounded-lg
                font-medium text-gray-700 touch-manipulation
                active:bg-gray-50 transition-colors
              "
              style={{ minHeight: '44px' }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="
                flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500
                text-white font-medium rounded-lg touch-manipulation
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95 transition-transform
              "
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
