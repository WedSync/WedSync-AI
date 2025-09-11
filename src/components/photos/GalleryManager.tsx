'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Folder,
  Share2,
  Download,
  Settings,
  Search,
  Grid3x3,
  List,
  Filter,
  ChevronDown,
  Eye,
  Lock,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import type { Gallery, Photo, PhotoFilters } from '@/types/photos';

interface GalleryManagerProps {
  clientId: string;
  onGallerySelect?: (gallery: Gallery) => void;
  onPhotoSelect?: (photo: Photo) => void;
}

export function GalleryManager({
  clientId,
  onGallerySelect,
  onPhotoSelect,
}: GalleryManagerProps) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);
  const [filters, setFilters] = useState<PhotoFilters>({
    clientId,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load galleries on mount
  useEffect(() => {
    loadGalleries();
  }, [clientId]);

  const loadGalleries = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setGalleries([
        {
          id: '1',
          name: 'Ceremony & Reception',
          description:
            'Beautiful moments from the wedding ceremony and reception',
          clientId,
          photoCount: 342,
          coverPhotoUrl: '/api/placeholder/400/300',
          eventDate: '2024-06-15',
          shareSettings: {
            isPublic: false,
            allowDownload: true,
            allowComments: true,
            watermarkEnabled: false,
          },
          createdAt: '2024-06-16T10:00:00Z',
          updatedAt: '2024-06-18T14:30:00Z',
        },
        {
          id: '2',
          name: 'Pre-Wedding Photoshoot',
          description: 'Engagement session at the botanical gardens',
          clientId,
          photoCount: 156,
          coverPhotoUrl: '/api/placeholder/400/300',
          eventDate: '2024-05-10',
          shareSettings: {
            isPublic: true,
            shareableLink: 'https://wedsync.com/gallery/abc123',
            allowDownload: true,
            allowComments: false,
            watermarkEnabled: true,
          },
          createdAt: '2024-05-11T09:00:00Z',
          updatedAt: '2024-05-12T16:00:00Z',
        },
        {
          id: '3',
          name: 'Family Portraits',
          description: 'Family group photos and individual portraits',
          clientId,
          photoCount: 89,
          coverPhotoUrl: '/api/placeholder/400/300',
          eventDate: '2024-06-15',
          shareSettings: {
            isPublic: false,
            password: 'family2024',
            allowDownload: true,
            allowComments: true,
            watermarkEnabled: false,
          },
          createdAt: '2024-06-16T11:00:00Z',
          updatedAt: '2024-06-17T10:00:00Z',
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  const loadPhotos = async (galleryId: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockPhotos: Photo[] = Array.from({ length: 24 }, (_, i) => ({
        id: `photo-${i}`,
        url: `/api/placeholder/800/600`,
        thumbnailUrl: `/api/placeholder/400/300`,
        filename: `IMG_${1000 + i}.jpg`,
        size: Math.floor(Math.random() * 10000000) + 1000000,
        mimeType: 'image/jpeg',
        width: 4000,
        height: 3000,
        uploadedAt: new Date(
          Date.now() - Math.random() * 10000000000,
        ).toISOString(),
        uploadedBy: 'photographer@wedsync.com',
        clientId,
        galleryId,
        tags: [
          {
            id: '1',
            name: 'ceremony',
            type: 'manual',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'couple',
            type: 'ai',
            confidence: 0.95,
            createdAt: new Date().toISOString(),
          },
        ],
        metadata: {
          camera: 'Canon EOS R5',
          lens: 'RF 24-70mm F2.8L IS USM',
          iso: 400,
          aperture: 'f/2.8',
          shutterSpeed: '1/250',
          focalLength: '50mm',
          dateTaken: new Date(
            Date.now() - Math.random() * 10000000000,
          ).toISOString(),
        },
      }));
      setPhotos(mockPhotos);
      setIsLoading(false);
    }, 500);
  };

  const handleGallerySelect = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    loadPhotos(gallery.id);
    if (onGallerySelect) {
      onGallerySelect(gallery);
    }
  };

  const handlePhotoSelect = (photo: Photo) => {
    if (onPhotoSelect) {
      onPhotoSelect(photo);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleBulkDownload = () => {
    console.log('Downloading', selectedPhotos.size, 'photos');
  };

  const handleShareGallery = (gallery: Gallery) => {
    console.log('Sharing gallery:', gallery.name);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex">
      {/* Sidebar - Gallery List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setIsCreatingGallery(true)}
            className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Gallery
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {galleries.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => handleGallerySelect(gallery)}
                className={`
                  w-full text-left p-3 rounded-lg transition-all
                  ${
                    selectedGallery?.id === gallery.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {gallery.name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {gallery.photoCount} photos
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {gallery.shareSettings.isPublic ? (
                        <span className="text-xs text-success-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Public
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </span>
                      )}
                      {gallery.eventDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(gallery.eventDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Photo Grid */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedGallery ? (
          <>
            {/* Gallery Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedGallery.name}
                  </h2>
                  {selectedGallery.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedGallery.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareGallery(selectedGallery)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search photos..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Filters */}
                  <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Bulk Actions */}
                  {selectedPhotos.size > 0 && (
                    <div className="flex items-center gap-2 pl-4 border-l border-gray-300">
                      <span className="text-sm text-gray-600">
                        {selectedPhotos.size} selected
                      </span>
                      <button
                        onClick={handleBulkDownload}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => setSelectedPhotos(new Set())}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* View Mode */}
                <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Grid/List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading photos...</p>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      onClick={() => handlePhotoSelect(photo)}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>

                      {/* Selection Checkbox */}
                      <div
                        className="absolute top-2 left-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePhotoSelection(photo.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPhotos.has(photo.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                      </div>

                      {/* Photo Info Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">
                          {photo.filename}
                        </p>
                        <p className="text-white/80 text-xs">
                          {formatFileSize(photo.size)}
                        </p>
                      </div>

                      {/* AI Tags */}
                      {photo.tags.filter((t) => t.type === 'ai').length > 0 && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                            AI
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left p-3">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPhotos(
                                  new Set(photos.map((p) => p.id)),
                                );
                              } else {
                                setSelectedPhotos(new Set());
                              }
                            }}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">
                          Preview
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">
                          Name
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">
                          Size
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">
                          Date
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">
                          Tags
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {photos.map((photo) => (
                        <tr
                          key={photo.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePhotoSelect(photo)}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedPhotos.has(photo.id)}
                              onChange={() => togglePhotoSelection(photo.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="p-3">
                            <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                              <img
                                src={photo.thumbnailUrl}
                                alt={photo.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {photo.filename}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {formatFileSize(photo.size)}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">
                              {formatDate(photo.uploadedAt)}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {photo.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {photo.tags.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  +{photo.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a Gallery
              </h3>
              <p className="text-sm text-gray-500">
                Choose a gallery from the sidebar to view and manage photos
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
