'use client';

/**
 * CreateAlbumModal Component - WS-079 Photo Gallery System
 * Album creation modal using Untitled UI patterns
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  FolderPlus,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { PhotoAlbum } from '@/types/photos';
import { photoService } from '@/lib/services/photoService';

interface CreateAlbumModalProps {
  bucketId: string;
  onClose: () => void;
  onComplete: (album?: PhotoAlbum) => void;
  className?: string;
}

export function CreateAlbumModal({
  bucketId,
  onClose,
  onComplete,
  className = '',
}: CreateAlbumModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDate: '',
    location: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle form input changes
  const handleChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (error) setError(null);
    },
    [error],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        setError('Album name is required');
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        const album = await photoService.createAlbum(
          bucketId,
          formData.name.trim(),
          formData.description.trim() || undefined,
          formData.eventDate || undefined,
          formData.location.trim() || undefined,
        );

        setSuccess(true);

        setTimeout(() => {
          onComplete(album);
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create album');
        setIsCreating(false);
      }
    },
    [bucketId, formData, onComplete],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit(e as any);
      }
    },
    [isCreating, onClose, handleSubmit],
  );

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-success-100 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-success-600" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Album Created Successfully!
              </h3>
              <p className="text-sm text-gray-500">
                "{formData.name}" is ready for photos
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className={`bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FolderPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-display-xs font-bold text-gray-900">
                Create New Album
              </h2>
              <p className="text-sm text-gray-500">
                Organize photos into a collection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Album Name */}
            <div>
              <label
                htmlFor="albumName"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Album Name *
              </label>
              <input
                id="albumName"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Engagement Session, Venue Tour, Styling Photos"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all"
                disabled={isCreating}
                autoFocus
                maxLength={255}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="albumDescription"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Description
              </label>
              <textarea
                id="albumDescription"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description of what's included in this album"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all resize-none"
                disabled={isCreating}
                maxLength={1000}
              />
            </div>

            {/* Event Date */}
            <div>
              <label
                htmlFor="eventDate"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span>Event Date</span>
                </div>
              </label>
              <input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all"
                disabled={isCreating}
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span>Location</span>
                </div>
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. Central Park, The Plaza Hotel, Downtown Studio"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all"
                disabled={isCreating}
                maxLength={255}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error-700">{error}</p>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                💡 Album Organization Tips
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Group photos by event type (engagement, venue tour, styling)
                </li>
                <li>• Include the date to keep everything chronological</li>
                <li>• Use descriptive names that vendors will understand</li>
                <li>
                  • Add location for context when sharing with venue
                  coordinators
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <kbd className="px-2 py-1 text-xs bg-gray-100 border rounded">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 text-xs bg-gray-100 border rounded ml-1">
                Enter
              </kbd>
              <span className="ml-2">to create</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                disabled={isCreating}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!formData.name.trim() || isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 mr-2 inline-block" />
                    Create Album
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
