'use client';

/**
 * PhotoGallery Component - WS-079 Photo Gallery System
 * Main gallery interface with album organization using Untitled UI patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Upload,
  Grid,
  List,
  Filter,
  Share2,
  Download,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { PhotoBucket, PhotoAlbum, Photo, VendorType } from '@/types/photos';
import { photoService } from '@/lib/services/photoService';
import { PhotoUpload } from './PhotoUpload';
import { PhotoAlbumCard } from './PhotoAlbumCard';
import { PhotoCard } from './PhotoCard';
import { VendorSharingModal } from './VendorSharingModal';
import { CreateAlbumModal } from './CreateAlbumModal';

interface PhotoGalleryProps {
  bucketId?: string;
  albumId?: string;
  vendorType?: VendorType;
  showUpload?: boolean;
  showSharing?: boolean;
  className?: string;
}

type ViewMode = 'albums' | 'photos';
type LayoutMode = 'grid' | 'list';

export function PhotoGallery({
  bucketId,
  albumId,
  vendorType,
  showUpload = true,
  showSharing = true,
  className = '',
}: PhotoGalleryProps) {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(
    albumId ? 'photos' : 'albums',
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [createAlbumModalOpen, setCreateAlbumModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    if (!bucketId && !albumId) return;

    setLoading(true);
    setError(null);

    try {
      if (viewMode === 'albums' && bucketId) {
        // Load albums for bucket - this would need an API endpoint
        // For now, we'll simulate with empty array
        setAlbums([]);
      } else {
        // Load photos
        const result = await photoService.getPhotos(
          bucketId,
          albumId,
          vendorType,
        );
        setPhotos(result.photos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [bucketId, albumId, vendorType, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Event handlers
  const handleUploadComplete = () => {
    setUploadModalOpen(false);
    loadData();
  };

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  };

  const handleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(photos.map((p) => p.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedPhotos.length} photos?`)) return;

    try {
      // Implementation would depend on photo service having delete method
      setSelectedPhotos([]);
      loadData();
    } catch (err) {
      setError('Failed to delete photos');
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      !searchQuery ||
      photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) =>
        photo.tags?.some((photoTag) => photoTag.name === tag),
      );

    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-error-600 hover:text-error-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-display-sm font-bold text-gray-900">
            {albumId ? 'Photos' : 'Photo Gallery'}
          </h2>

          {/* View mode toggle */}
          {!albumId && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('albums')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'albums'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Albums
              </button>
              <button
                onClick={() => setViewMode('photos')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'photos'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Photos
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {showUpload && (
            <>
              {viewMode === 'albums' && (
                <button
                  onClick={() => setCreateAlbumModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Album
                </button>
              )}

              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters & Controls */}
      {viewMode === 'photos' && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all"
              />
            </div>

            {/* Filter button */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>

            {/* Selection info */}
            {selectedPhotos.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedPhotos.length} selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {selectedPhotos.length === photos.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Bulk actions */}
            {selectedPhotos.length > 0 && (
              <div className="flex items-center space-x-2">
                {showSharing && (
                  <button
                    onClick={() => setSharingModalOpen(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                )}

                <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>

                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-error-600 bg-white border border-error-300 rounded-lg hover:bg-error-50 focus:outline-none focus:ring-4 focus:ring-error-100 transition-all"
                >
                  Delete
                </button>
              </div>
            )}

            {/* Layout toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  layoutMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  layoutMode === 'list'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'albums' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums.map((album) => (
            <PhotoAlbumCard
              key={album.id}
              album={album}
              onClick={() => {
                setViewMode('photos');
                // Would need to update albumId in parent component
              }}
            />
          ))}

          {albums.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <FolderPlus className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No albums yet
              </h3>
              <p className="text-gray-500 text-center mb-4">
                Create your first album to organize photos by event or category.
              </p>
              <button
                onClick={() => setCreateAlbumModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Album
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={
            layoutMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'space-y-4'
          }
        >
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              layoutMode={layoutMode}
              selected={selectedPhotos.includes(photo.id)}
              onSelect={() => handlePhotoSelect(photo.id)}
              showSelection={selectedPhotos.length > 0}
            />
          ))}

          {filteredPhotos.length === 0 && photos.length > 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No photos found
              </h3>
              <p className="text-gray-500 text-center">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {photos.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No photos yet
              </h3>
              <p className="text-gray-500 text-center mb-4">
                Upload your first photos to get started with your gallery.
              </p>
              {showUpload && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {uploadModalOpen && (
        <PhotoUpload
          bucketId={bucketId}
          albumId={albumId}
          onClose={() => setUploadModalOpen(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {sharingModalOpen && (
        <VendorSharingModal
          photoIds={selectedPhotos}
          onClose={() => setSharingModalOpen(false)}
          onComplete={() => {
            setSharingModalOpen(false);
            setSelectedPhotos([]);
          }}
        />
      )}

      {createAlbumModalOpen && (
        <CreateAlbumModal
          bucketId={bucketId!}
          onClose={() => setCreateAlbumModalOpen(false)}
          onComplete={() => {
            setCreateAlbumModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
