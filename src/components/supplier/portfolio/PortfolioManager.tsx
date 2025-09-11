'use client';

// WS-186: Portfolio Management System - Team A Round 1
// Advanced portfolio management interface with AI-powered organization

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Star,
  Tag,
  Image as ImageIcon,
  Eye,
  Settings,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ImageUploader } from './ImageUploader';
import { AITaggingInterface } from './AITaggingInterface';
import { FeaturedWorkEditor } from './FeaturedWorkEditor';
import type {
  GalleryImage,
  PortfolioFilters,
  UploadResult,
} from '@/types/portfolio';

interface PortfolioManagerProps {
  supplierId: string;
  initialImages: GalleryImage[];
  canEdit: boolean;
  onImagesUpdate: (images: GalleryImage[]) => void;
}

export function PortfolioManager({
  supplierId,
  initialImages = [],
  canEdit = false,
  onImagesUpdate,
}: PortfolioManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>(
    'grid',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PortfolioFilters>({});
  const [showUploader, setShowUploader] = useState(false);
  const [showAITagging, setShowAITagging] = useState(false);
  const [showFeaturedEditor, setShowFeaturedEditor] = useState(false);

  // Load portfolio images
  const loadPortfolioImages = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        supplier_id: supplierId,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== null,
          ),
        ),
      });

      const response = await fetch(`/api/portfolio/images?${queryParams}`);
      if (!response.ok) throw new Error('Failed to load images');

      const { images: loadedImages } = await response.json();
      setImages(loadedImages);
      onImagesUpdate(loadedImages);
    } catch (error) {
      console.error('Error loading portfolio images:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierId, filters, onImagesUpdate]);

  useEffect(() => {
    loadPortfolioImages();
  }, [loadPortfolioImages]);

  // Handle bulk upload completion
  const handleImagesUploaded = async (uploadResults: UploadResult[]) => {
    const successfulUploads = uploadResults.filter((result) => result.success);

    if (successfulUploads.length > 0) {
      await loadPortfolioImages();
      showUploadSuccess(successfulUploads.length);
    }

    const failedUploads = uploadResults.filter((result) => !result.success);
    if (failedUploads.length > 0) {
      showUploadErrors(failedUploads);
    }

    setShowUploader(false);
  };

  // Handle bulk tagging operations
  const handleBulkTagging = async (tags: string[]) => {
    if (selectedImages.size === 0) return;

    try {
      setLoading(true);
      await bulkUpdateTags([...selectedImages], tags);
      await loadPortfolioImages();
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Error applying bulk tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter images based on search and filters
  const filteredImages = images.filter((image) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        image.title?.toLowerCase().includes(searchLower) ||
        image.alt_text?.toLowerCase().includes(searchLower) ||
        image.ai_tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        image.manual_tags?.some((tag) =>
          tag.toLowerCase().includes(searchLower),
        );

      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category && image.category !== filters.category) return false;

    // Featured filter
    if (
      filters.featured !== undefined &&
      image.is_featured !== filters.featured
    )
      return false;

    return true;
  });

  // Handle image selection
  const handleImageSelection = (imageId: string, selected: boolean) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)));
    }
  };

  // Helper functions
  const showUploadSuccess = (count: number) => {
    // Toast notification implementation
    console.log(`Successfully uploaded ${count} images`);
  };

  const showUploadErrors = (failures: any[]) => {
    // Error notification implementation
    console.error('Upload errors:', failures);
  };

  const bulkUpdateTags = async (imageIds: string[], tags: string[]) => {
    const response = await fetch('/api/portfolio/images/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds, tags }),
    });

    if (!response.ok) throw new Error('Failed to update tags');
  };

  return (
    <div className="portfolio-manager space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="portfolio-stats">
          <h2 className="text-2xl font-semibold text-gray-900">
            Portfolio Management
          </h2>
          <p className="text-gray-600">
            {images.length} images • {selectedImages.size} selected
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setShowUploader(true)}
            >
              Bulk Upload
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Tag className="w-4 h-4" />}
              onClick={() => setShowAITagging(true)}
              disabled={selectedImages.size === 0}
            >
              AI Tagging ({selectedImages.size})
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Star className="w-4 h-4" />}
              onClick={() => setShowFeaturedEditor(true)}
            >
              Featured Work
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search images, tags, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => {
              /* Show filter panel */
            }}
          >
            Filters
          </Button>

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedImages.size > 0 && canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-blue-900">
                {selectedImages.size} image
                {selectedImages.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImages(new Set())}
              >
                Clear Selection
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAITagging(true)}
              >
                <Tag className="w-4 h-4 mr-1" />
                Tag Selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  /* Handle bulk feature toggle */
                }}
              >
                <Star className="w-4 h-4 mr-1" />
                Feature
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  /* Handle bulk delete */
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || Object.keys(filters).length > 0
              ? 'No images match your search'
              : 'No portfolio images yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search terms or filters'
              : 'Upload your first images to get started with portfolio management'}
          </p>
          {canEdit && !searchTerm && Object.keys(filters).length === 0 && (
            <Button
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setShowUploader(true)}
            >
              Upload Images
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`
          ${
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'space-y-4'
          }
        `}
        >
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              viewMode={viewMode}
              selected={selectedImages.has(image.id)}
              canEdit={canEdit}
              onSelectionChange={(selected) =>
                handleImageSelection(image.id, selected)
              }
              onImageUpdate={loadPortfolioImages}
            />
          ))}
        </div>
      )}

      {/* Bulk Selection Controls */}
      {canEdit && filteredImages.length > 0 && (
        <div className="flex justify-between items-center pt-4">
          <Button variant="ghost" onClick={handleSelectAll}>
            {selectedImages.size === filteredImages.length
              ? 'Deselect All'
              : 'Select All'}
          </Button>

          <p className="text-sm text-gray-600">
            Showing {filteredImages.length} of {images.length} images
          </p>
        </div>
      )}

      {/* Modals */}
      {showUploader && (
        <ImageUploader
          onUploadComplete={handleImagesUploaded}
          maxFiles={50}
          acceptedFormats={[
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heif',
          ]}
          enableAITagging={true}
          onClose={() => setShowUploader(false)}
        />
      )}

      {showAITagging && selectedImages.size > 0 && (
        <AITaggingInterface
          images={images.filter((img) => selectedImages.has(img.id))}
          aiSuggestions={[]} // Would be populated from AI service
          onTagsUpdate={handleBulkTagging}
          onCategoryUpdate={(imageId, category) => {
            // Handle category updates
          }}
          onClose={() => setShowAITagging(false)}
        />
      )}

      {showFeaturedEditor && (
        <FeaturedWorkEditor
          portfolioImages={images}
          currentFeatured={images
            .filter((img) => img.is_featured)
            .map((img) => img.id)}
          maxFeaturedCount={20}
          onFeaturedUpdate={async (imageIds) => {
            // Handle featured updates
            await loadPortfolioImages();
          }}
          onClose={() => setShowFeaturedEditor(false)}
        />
      )}
    </div>
  );
}

// Individual image card component
interface ImageCardProps {
  image: GalleryImage;
  viewMode: 'grid' | 'list';
  selected: boolean;
  canEdit: boolean;
  onSelectionChange: (selected: boolean) => void;
  onImageUpdate: () => void;
}

function ImageCard({
  image,
  viewMode,
  selected,
  canEdit,
  onSelectionChange,
  onImageUpdate,
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
        {canEdit && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectionChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
        )}

        <img
          src={image.thumbnail_url}
          alt={image.alt_text || image.title}
          className="w-16 h-16 object-cover rounded-lg"
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {image.title || 'Untitled'}
          </h4>
          <p className="text-sm text-gray-600">
            {image.category} •{' '}
            {new Date(image.uploaded_at).toLocaleDateString()}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {image.is_featured && (
              <Badge variant="warning" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {image.ai_tags?.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Eye className="w-4 h-4" />
          <span>{image.view_count || 0}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        relative bg-white rounded-lg overflow-hidden transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
        ${canEdit ? 'cursor-pointer' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Featured Badge */}
      {image.is_featured && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="warning" className="text-xs bg-yellow-400 text-white">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      {/* Selection Checkbox */}
      {canEdit && (
        <div
          className={`
          absolute top-2 right-2 z-10 transition-opacity duration-200
          ${isHovered || selected ? 'opacity-100' : 'opacity-0'}
        `}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectionChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-gray-100">
        <img
          src={image.thumbnail_url}
          alt={image.alt_text || image.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Quick Actions Overlay */}
      {canEdit && isHovered && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center space-x-2 transition-opacity duration-200">
          <Button variant="secondary" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Image Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {image.title || 'Untitled'}
          </h4>
          <div className="flex items-center text-xs text-gray-500">
            <Eye className="w-3 h-3 mr-1" />
            {image.view_count || 0}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {image.category}
          </Badge>
          {image.ai_tags?.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(image.ai_tags?.length || 0) > 2 && (
            <Badge variant="outline" className="text-xs">
              +{(image.ai_tags?.length || 0) - 2}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
