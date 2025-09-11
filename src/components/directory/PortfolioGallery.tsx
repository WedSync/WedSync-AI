'use client';

// WS-186: Responsive portfolio display component for directory profiles

import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  List,
  Search,
  Filter,
  Eye,
  Heart,
  Share2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { GalleryImage } from '@/types/portfolio';

interface PortfolioGalleryProps {
  images: GalleryImage[];
  layout: 'grid' | 'masonry' | 'carousel';
  showControls: boolean;
  onImageSelect: (image: GalleryImage) => void;
  supplierId?: string;
  readonly?: boolean;
}

export function PortfolioGallery({
  images = [],
  layout = 'grid',
  showControls = true,
  onImageSelect,
  supplierId,
  readonly = true,
}: PortfolioGalleryProps) {
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>(images);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideshowRef = useRef<NodeJS.Timeout>();

  // Get unique categories
  const categories = React.useMemo(() => {
    const categorySet = new Set(
      images.map((img) => img.category).filter(Boolean),
    );
    return ['all', ...Array.from(categorySet)];
  }, [images]);

  // Filter images based on category and search
  useEffect(() => {
    let filtered = images;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((img) => img.category === selectedCategory);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.title?.toLowerCase().includes(searchLower) ||
          img.alt_text?.toLowerCase().includes(searchLower) ||
          img.ai_tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          img.manual_tags?.some((tag) =>
            tag.toLowerCase().includes(searchLower),
          ),
      );
    }

    setFilteredImages(filtered);
  }, [images, selectedCategory, searchTerm]);

  // Handle lightbox navigation
  const openLightbox = (image: GalleryImage) => {
    const index = filteredImages.findIndex((img) => img.id === image.id);
    setLightboxImage(image);
    setLightboxIndex(index);
    onImageSelect(image);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setIsSlideshow(false);
    if (slideshowRef.current) {
      clearInterval(slideshowRef.current);
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!lightboxImage) return;

    let newIndex = lightboxIndex;
    if (direction === 'next') {
      newIndex = (lightboxIndex + 1) % filteredImages.length;
    } else {
      newIndex =
        lightboxIndex === 0 ? filteredImages.length - 1 : lightboxIndex - 1;
    }

    setLightboxIndex(newIndex);
    setLightboxImage(filteredImages[newIndex]);
    onImageSelect(filteredImages[newIndex]);
  };

  // Slideshow functionality
  const toggleSlideshow = () => {
    if (isSlideshow) {
      setIsSlideshow(false);
      if (slideshowRef.current) {
        clearInterval(slideshowRef.current);
      }
    } else {
      setIsSlideshow(true);
      slideshowRef.current = setInterval(() => {
        navigateImage('next');
      }, 3000);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!lightboxImage) return;

      switch (e.key) {
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
        case 'Escape':
          closeLightbox();
          break;
        case ' ':
          e.preventDefault();
          toggleSlideshow();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxImage, lightboxIndex]);

  // Cleanup slideshow on unmount
  useEffect(() => {
    return () => {
      if (slideshowRef.current) {
        clearInterval(slideshowRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="portfolio-gallery">
      {/* Controls */}
      {showControls && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search portfolio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category}
                variant={
                  selectedCategory === category ? 'primary' : 'secondary'
                }
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Grid className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedCategory !== 'all'
              ? 'No images match your criteria'
              : 'No portfolio images available'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter'
              : "This supplier hasn't uploaded any portfolio images yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Grid Layout */}
          {layout === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onClick={() => openLightbox(image)}
                  readonly={readonly}
                />
              ))}
            </div>
          )}

          {/* Masonry Layout */}
          {layout === 'masonry' && (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="break-inside-avoid mb-4">
                  <ImageCard
                    image={image}
                    onClick={() => openLightbox(image)}
                    readonly={readonly}
                    masonry
                  />
                </div>
              ))}
            </div>
          )}

          {/* Carousel Layout */}
          {layout === 'carousel' && (
            <div className="relative">
              <div className="flex overflow-x-auto gap-4 pb-4">
                {filteredImages.map((image) => (
                  <div key={image.id} className="flex-shrink-0 w-64">
                    <ImageCard
                      image={image}
                      onClick={() => openLightbox(image)}
                      readonly={readonly}
                      carousel
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {filteredImages.length} of {images.length} images
          </div>
        </>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <LightboxModal
          image={lightboxImage}
          images={filteredImages}
          currentIndex={lightboxIndex}
          isSlideshow={isSlideshow}
          onClose={closeLightbox}
          onNavigate={navigateImage}
          onToggleSlideshow={toggleSlideshow}
          readonly={readonly}
        />
      )}
    </div>
  );
}

// Individual image card component
interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  readonly: boolean;
  masonry?: boolean;
  carousel?: boolean;
}

function ImageCard({
  image,
  onClick,
  readonly,
  masonry,
  carousel,
}: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        group relative bg-white rounded-lg overflow-hidden cursor-pointer
        transition-all duration-300 hover:shadow-lg
        ${carousel ? 'aspect-[4/3]' : masonry ? '' : 'aspect-square'}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className={`relative ${masonry ? 'aspect-auto' : 'w-full h-full'}`}>
        <img
          src={image.thumbnail_url || image.optimized_url}
          alt={image.alt_text || image.title}
          className={`
            w-full h-full object-cover transition-all duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${isHovered ? 'scale-105' : 'scale-100'}
          `}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />

        {/* Loading placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Overlay on hover */}
        <div
          className={`
          absolute inset-0 bg-black transition-opacity duration-300
          ${isHovered ? 'bg-opacity-30' : 'bg-opacity-0'}
        `}
        />

        {/* Image info overlay */}
        <div
          className={`
          absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent
          transform transition-transform duration-300
          ${isHovered ? 'translate-y-0' : 'translate-y-full'}
        `}
        >
          <div className="text-white">
            {image.title && (
              <h4 className="font-medium text-sm truncate">{image.title}</h4>
            )}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 text-xs">
                {image.category && (
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white text-xs"
                  >
                    {image.category}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {image.view_count || 0}
                </div>
                {image.likes_count && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {image.likes_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div
          className={`
          absolute top-2 right-2 flex gap-1 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
        >
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              // Handle zoom/expand
            }}
          >
            <ZoomIn className="w-3 h-3" />
          </Button>

          {!readonly && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/30"
              onClick={(e) => {
                e.stopPropagation();
                // Handle like/favorite
              }}
            >
              <Heart className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Lightbox modal component
interface LightboxModalProps {
  image: GalleryImage;
  images: GalleryImage[];
  currentIndex: number;
  isSlideshow: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToggleSlideshow: () => void;
  readonly: boolean;
}

function LightboxModal({
  image,
  images,
  currentIndex,
  isSlideshow,
  onClose,
  onNavigate,
  onToggleSlideshow,
  readonly,
}: LightboxModalProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const resetZoomAndPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);
    if (newZoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <h3 className="font-medium">{image.title || 'Untitled'}</h3>
            <span className="text-sm opacity-75">
              {currentIndex + 1} of {images.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="text-white hover:bg-white/10"
            >
              <Info className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSlideshow}
              className="text-white hover:bg-white/10"
            >
              {isSlideshow ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
            onClick={() => onNavigate('prev')}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
            onClick={() => onNavigate('next')}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Image */}
      <div className="relative flex items-center justify-center w-full h-full p-16">
        <img
          src={image.optimized_url || image.original_url}
          alt={image.alt_text || image.title}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(-0.25)}
              className="text-white hover:bg-white/10"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(0.25)}
              className="text-white hover:bg-white/10"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoomAndPan}
              className="text-white hover:bg-white/10"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {!readonly && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <Heart className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <Share2 className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-10 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Image Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {image.title && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Title
                  </label>
                  <p className="mt-1">{image.title}</p>
                </div>
              )}

              {image.alt_text && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="mt-1">{image.alt_text}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Category
                </label>
                <p className="mt-1">{image.category || 'Uncategorized'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Dimensions
                </label>
                <p className="mt-1">
                  {image.width} × {image.height} pixels
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Uploaded
                </label>
                <p className="mt-1">
                  {new Date(image.uploaded_at).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Views
                </label>
                <p className="mt-1">{image.view_count || 0}</p>
              </div>

              {(image.ai_tags?.length || image.manual_tags?.length) && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {image.ai_tags?.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {image.manual_tags?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
