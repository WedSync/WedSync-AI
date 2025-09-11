'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Share2,
  Heart,
  Star,
  MoreHorizontal,
  Grid3X3,
  Maximize2,
  Download,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PresentationImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  category: string;
  featured: boolean;
  metadata: {
    capturedAt: string;
    venue?: string;
    equipment?: string;
    settings?: Record<string, any>;
  };
  tags: string[];
}

export interface PresentationModeProps {
  images: PresentationImage[];
  initialIndex?: number;
  presentationStyle?: 'slideshow' | 'manual' | 'story';
  autoplayInterval?: number; // milliseconds
  onClose: () => void;
  onImageChange?: (index: number, image: PresentationImage) => void;
  onShare?: (image: PresentationImage) => void;
  onFavorite?: (imageId: string, favorited: boolean) => void;
  onInquiry?: (imageIds: string[], message?: string) => void;
  clientMode?: boolean;
  offlineCapable?: boolean;
  className?: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  images,
  initialIndex = 0,
  presentationStyle = 'manual',
  autoplayInterval = 5000,
  onClose,
  onImageChange,
  onShare,
  onFavorite,
  onInquiry,
  clientMode = false,
  offlineCapable = true,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(presentationStyle === 'slideshow');
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const autoplayTimeoutRef = useRef<NodeJS.Timeout>();

  const currentImage = images[currentIndex];

  // Navigation functions
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToIndex = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)));
    },
    [images.length],
  );

  // Autoplay functionality
  useEffect(() => {
    if (isPlaying && presentationStyle === 'slideshow') {
      autoplayTimeoutRef.current = setTimeout(() => {
        goToNext();
      }, autoplayInterval);
    }

    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }
    };
  }, [currentIndex, isPlaying, presentationStyle, autoplayInterval, goToNext]);

  // Controls auto-hide functionality
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      setShowControls(true);

      if (!clientMode) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    resetControlsTimeout();

    const handleMouseMove = () => resetControlsTimeout();
    const handleTouchStart = () => resetControlsTimeout();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchstart', handleTouchStart);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouchStart);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [clientMode]);

  // Notify parent of image changes
  useEffect(() => {
    if (onImageChange && currentImage) {
      onImageChange(currentIndex, currentImage);
    }
  }, [currentIndex, currentImage, onImageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose]);

  // Touch gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchStartX - touchEndX;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe left - next image
          goToNext();
        } else {
          // Swipe right - previous image
          goToPrevious();
        }
      }

      setTouchStartX(null);
    },
    [touchStartX, goToNext, goToPrevious],
  );

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(() => {
    if (!currentImage) return;

    const isFavorited = favorites.has(currentImage.id);
    const newFavorites = new Set(favorites);

    if (isFavorited) {
      newFavorites.delete(currentImage.id);
    } else {
      newFavorites.add(currentImage.id);
    }

    setFavorites(newFavorites);
    onFavorite?.(currentImage.id, !isFavorited);
  }, [currentImage, favorites, onFavorite]);

  // Handle share
  const handleShare = useCallback(() => {
    if (currentImage && onShare) {
      onShare(currentImage);
    }
  }, [currentImage, onShare]);

  // Handle inquiry
  const handleInquiry = useCallback(() => {
    const selectedImages = Array.from(favorites);
    if (selectedImages.length === 0 && currentImage) {
      selectedImages.push(currentImage.id);
    }

    onInquiry?.(selectedImages, inquiryMessage);
    setShowInquiryDialog(false);
    setInquiryMessage('');
  }, [favorites, currentImage, inquiryMessage, onInquiry]);

  if (!currentImage) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn('fixed inset-0 bg-black z-50 flex flex-col', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top controls */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-white">
              <span className="text-sm">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {presentationStyle === 'slideshow' && (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-gray-300 transition-colors p-2"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
            )}

            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center">
        <Image
          src={currentImage.url}
          alt={currentImage.alt}
          fill
          className="object-contain"
          priority
          sizes="100vw"
        />

        {/* Navigation arrows */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            onClick={goToPrevious}
            className="text-white hover:text-gray-300 transition-colors bg-black/20 rounded-full p-3 backdrop-blur-sm"
            disabled={images.length <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNext}
            className="text-white hover:text-gray-300 transition-colors bg-black/20 rounded-full p-3 backdrop-blur-sm"
            disabled={images.length <= 1}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Image info overlay */}
        {showImageInfo && (
          <div className="absolute bottom-20 left-4 right-4 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm">
            <h3 className="font-medium mb-2">{currentImage.alt}</h3>
            <div className="space-y-1 text-sm opacity-75">
              <p>Category: {currentImage.category}</p>
              {currentImage.metadata.venue && (
                <p>📍 {currentImage.metadata.venue}</p>
              )}
              {currentImage.metadata.equipment && (
                <p>📷 {currentImage.metadata.equipment}</p>
              )}
              <p>
                📅{' '}
                {new Date(
                  currentImage.metadata.capturedAt,
                ).toLocaleDateString()}
              </p>
              {currentImage.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentImage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white/20 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImageInfo(!showImageInfo)}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {clientMode && (
              <>
                <button
                  onClick={handleFavoriteToggle}
                  className={cn(
                    'transition-colors p-2',
                    favorites.has(currentImage.id)
                      ? 'text-pink-500 hover:text-pink-400'
                      : 'text-white hover:text-gray-300',
                  )}
                >
                  <Heart
                    className={cn(
                      'w-5 h-5',
                      favorites.has(currentImage.id) && 'fill-current',
                    )}
                  />
                </button>

                <button
                  onClick={() => setShowInquiryDialog(true)}
                  className="text-white hover:text-gray-300 transition-colors p-2"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </>
            )}

            <button
              onClick={handleShare}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {currentImage.featured && (
              <div className="text-yellow-400">
                <Star className="w-5 h-5 fill-current" />
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {images.length > 1 && (
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentIndex
                      ? 'bg-white'
                      : 'bg-white/30 hover:bg-white/50',
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {showThumbnails && (
        <div className="absolute bottom-16 left-0 right-0 bg-black/80 backdrop-blur-sm">
          <div className="flex overflow-x-auto py-2 px-4 space-x-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => goToIndex(index)}
                className={cn(
                  'relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors',
                  index === currentIndex
                    ? 'border-white'
                    : 'border-transparent hover:border-white/50',
                )}
              >
                <Image
                  src={image.thumbnailUrl}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inquiry Dialog */}
      {showInquiryDialog && clientMode && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Ask About These Photos
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {favorites.size > 0
                ? `Inquiry about ${favorites.size} favorite image${favorites.size > 1 ? 's' : ''}`
                : 'Inquiry about current image'}
            </p>

            <textarea
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              placeholder="What would you like to know about these photos?"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowInquiryDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInquiry}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Send Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationMode;
