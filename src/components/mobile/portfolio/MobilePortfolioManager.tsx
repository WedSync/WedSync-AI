'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Upload,
  Folder,
  Star,
  Heart,
  Share2,
  Filter,
  Grid3X3,
  List,
  Search,
  MoreVertical,
  Trash2,
  Move,
  Copy,
  Edit,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PortfolioImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  category: string;
  tags: string[];
  metadata: {
    capturedAt: string;
    fileSize: number;
    dimensions: { width: number; height: number };
    equipment?: string;
    location?: { lat: number; lng: number; venue?: string };
  };
  featured: boolean;
  coupleVisible: boolean;
  sortOrder: number;
  syncStatus: 'synced' | 'pending' | 'error' | 'offline';
}

export interface MobilePortfolioManagerProps {
  images: PortfolioImage[];
  isOnline: boolean;
  onImageSelect: (imageIds: string[]) => void;
  onImageDelete: (imageIds: string[]) => void;
  onImageFavorite: (imageId: string, favorited: boolean) => void;
  onImageMove: (imageId: string, targetCategory: string) => void;
  onBulkAction: (action: string, imageIds: string[]) => void;
  onUpload: () => void;
  onPresentationMode: (images: PortfolioImage[]) => void;
  className?: string;
}

export const MobilePortfolioManager: React.FC<MobilePortfolioManagerProps> = ({
  images,
  isOnline,
  onImageSelect,
  onImageDelete,
  onImageFavorite,
  onImageMove,
  onBulkAction,
  onUpload,
  onPresentationMode,
  className,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let filtered = images;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((img) => img.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.alt.toLowerCase().includes(query) ||
          img.category.toLowerCase().includes(query) ||
          img.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.metadata.capturedAt).getTime() -
            new Date(a.metadata.capturedAt).getTime()
          );
        case 'name':
          return a.alt.localeCompare(b.alt);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [images, selectedCategory, searchQuery, sortBy]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(images.map((img) => img.category))];
    return cats;
  }, [images]);

  // Handle image tap and long press for selection
  const handleImageInteraction = useCallback(
    (imageId: string, isLongPress: boolean = false) => {
      if (isLongPress || isMultiSelectMode) {
        setIsMultiSelectMode(true);
        const newSelected = new Set(selectedImages);

        if (newSelected.has(imageId)) {
          newSelected.delete(imageId);
        } else {
          newSelected.add(imageId);
        }

        setSelectedImages(newSelected);
        onImageSelect(Array.from(newSelected));

        if (newSelected.size === 0) {
          setIsMultiSelectMode(false);
        }
      } else {
        // Single image action - could open preview or details
        console.log('Single image tap:', imageId);
      }
    },
    [selectedImages, isMultiSelectMode, onImageSelect],
  );

  // Handle swipe gestures for quick actions
  const handleSwipeAction = useCallback(
    (imageId: string, direction: 'left' | 'right' | 'up' | 'down') => {
      switch (direction) {
        case 'right':
          // Favorite/unfavorite
          const image = images.find((img) => img.id === imageId);
          if (image) {
            onImageFavorite(imageId, !image.featured);
          }
          break;
        case 'left':
          // Delete (with confirmation)
          if (window.confirm('Delete this image?')) {
            onImageDelete([imageId]);
          }
          break;
        case 'up':
          // Move to featured category
          onImageMove(imageId, 'featured');
          break;
        case 'down':
          // Move to review category
          onImageMove(imageId, 'review');
          break;
      }
    },
    [images, onImageFavorite, onImageDelete, onImageMove],
  );

  // Handle bulk actions
  const handleBulkAction = useCallback(
    (action: string) => {
      const selectedIds = Array.from(selectedImages);
      onBulkAction(action, selectedIds);
      setSelectedImages(new Set());
      setIsMultiSelectMode(false);
    },
    [selectedImages, onBulkAction],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedImages(new Set());
    setIsMultiSelectMode(false);
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header with search and filters */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 space-y-4">
        {/* Top row - title and actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Portfolio</h1>
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                isOnline ? 'bg-green-500' : 'bg-red-500',
              )}
            />
            <button
              onClick={onUpload}
              className="p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search images, categories, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3">
            {/* Category filter */}
            <div className="flex overflow-x-auto space-x-2 pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    selectedCategory === category
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                  )}
                >
                  {category === 'all'
                    ? 'All'
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* View and sort controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'grid'
                      ? 'bg-pink-100 text-pink-600'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'list'
                      ? 'bg-pink-100 text-pink-600'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'date' | 'name' | 'category')
                }
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="category">Sort by Category</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Multi-select toolbar */}
      {isMultiSelectMode && (
        <div className="bg-pink-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{selectedImages.size} selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('favorite')}
              className="p-2 hover:bg-pink-700 rounded transition-colors"
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleBulkAction('share')}
              className="p-2 hover:bg-pink-700 rounded transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleBulkAction('move')}
              className="p-2 hover:bg-pink-700 rounded transition-colors"
            >
              <Move className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="p-2 hover:bg-pink-700 rounded transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-pink-700 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Image grid/list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Folder className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No images found</p>
            <p className="text-sm">Upload images or adjust your filters</p>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4',
            )}
          >
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className={cn(
                  'relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden',
                  selectedImages.has(image.id) && 'ring-2 ring-pink-500',
                  viewMode === 'list' && 'flex',
                )}
                onClick={() => handleImageInteraction(image.id)}
                onTouchStart={(e) => {
                  const timeoutId = setTimeout(() => {
                    e.preventDefault();
                    handleImageInteraction(image.id, true);
                  }, 500);

                  const cleanup = () => {
                    clearTimeout(timeoutId);
                    document.removeEventListener('touchend', cleanup);
                    document.removeEventListener('touchmove', cleanup);
                  };

                  document.addEventListener('touchend', cleanup);
                  document.addEventListener('touchmove', cleanup);
                }}
              >
                {/* Image */}
                <div
                  className={cn(
                    'relative',
                    viewMode === 'grid'
                      ? 'aspect-square'
                      : 'w-20 h-20 flex-shrink-0',
                  )}
                >
                  <Image
                    src={image.thumbnailUrl}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    sizes={
                      viewMode === 'grid'
                        ? '(max-width: 768px) 50vw, 33vw'
                        : '80px'
                    }
                  />

                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 flex space-x-1">
                    {image.featured && (
                      <div className="bg-yellow-500 text-white rounded-full p-1">
                        <Star className="w-3 h-3" />
                      </div>
                    )}
                    {!image.coupleVisible && (
                      <div className="bg-gray-500 text-white rounded-full p-1">
                        <Eye className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Sync status */}
                  <div className="absolute top-2 right-2">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        image.syncStatus === 'synced' && 'bg-green-500',
                        image.syncStatus === 'pending' && 'bg-yellow-500',
                        image.syncStatus === 'error' && 'bg-red-500',
                        image.syncStatus === 'offline' && 'bg-gray-500',
                      )}
                    />
                  </div>

                  {/* Selection indicator */}
                  {isMultiSelectMode && (
                    <div className="absolute bottom-2 right-2">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border-2 border-white flex items-center justify-center',
                          selectedImages.has(image.id)
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-200',
                        )}
                      >
                        {selectedImages.has(image.id) && '✓'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image info */}
                <div className={cn('p-3', viewMode === 'list' && 'flex-1')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded">
                      {image.category}
                    </span>
                    {image.metadata.location?.venue && (
                      <span className="text-xs text-gray-500">
                        📍 {image.metadata.location.venue}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-900 truncate">
                    {image.alt}
                  </p>

                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                      {new Date(image.metadata.capturedAt).toLocaleDateString()}
                    </span>
                    <span>
                      {Math.round(
                        (image.metadata.fileSize / 1024 / 1024) * 10,
                      ) / 10}
                      MB
                    </span>
                  </div>

                  {viewMode === 'list' && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {image.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating action button for presentation mode */}
      {filteredImages.length > 0 && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => onPresentationMode(filteredImages)}
            className="bg-pink-600 text-white rounded-full p-4 shadow-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
          >
            <Star className="w-5 h-5" />
            <span className="hidden sm:inline">Present</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobilePortfolioManager;
