'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Info,
  Maximize2,
  RotateCw,
  Tag,
  Camera,
} from 'lucide-react';
import type { Photo } from '@/types/photos';

interface PhotoViewerProps {
  photos: Photo[];
  initialPhotoId: string;
  onClose: () => void;
  onPhotoChange?: (photo: Photo) => void;
  allowDownload?: boolean;
  allowSharing?: boolean;
  showInfo?: boolean;
}

export function PhotoViewer({
  photos,
  initialPhotoId,
  onClose,
  onPhotoChange,
  allowDownload = true,
  allowSharing = true,
  showInfo = true,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const index = photos.findIndex((p) => p.id === initialPhotoId);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [initialPhotoId, photos]);

  useEffect(() => {
    if (onPhotoChange && photos[currentIndex]) {
      onPhotoChange(photos[currentIndex]);
    }
  }, [currentIndex, photos, onPhotoChange]);

  const currentPhoto = photos[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    },
    [currentIndex, photos.length],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetView();
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetView();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setImagePosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = async () => {
    if (!currentPhoto) return;

    // Simulate download
    const link = document.createElement('a');
    link.href = currentPhoto.url;
    link.download = currentPhoto.filename;
    link.click();
  };

  const handleShare = () => {
    if (!currentPhoto) return;

    if (navigator.share) {
      navigator.share({
        title: currentPhoto.filename,
        text: `Check out this photo from WedSync`,
        url: window.location.href,
      });
    } else {
      // Fallback to copy link
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!currentPhoto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex">
      {/* Main Viewer */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Top Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <button
                onClick={handleZoomOut}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/80 text-sm w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-white/20 mx-2" />

              {/* Other Controls */}
              <button
                onClick={handleRotate}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Fullscreen (F)"
              >
                <Maximize2 className="w-5 h-5" />
              </button>

              {allowDownload && (
                <button
                  onClick={handleDownload}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}

              {allowSharing && (
                <button
                  onClick={handleShare}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}

              {showInfo && (
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Info"
                >
                  <Info className="w-5 h-5" />
                </button>
              )}

              <div className="w-px h-6 bg-white/20 mx-2" />

              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div
          className="relative overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <img
            src={currentPhoto.url}
            alt={currentPhoto.filename}
            className="max-w-full max-h-full select-none"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${imagePosition.x / zoom}px, ${imagePosition.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            draggable={false}
          />
        </div>

        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Bottom Actions Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isLiked
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">Like</span>
              </button>

              <button className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">Comment</span>
              </button>
            </div>

            <div className="text-white/80 text-sm">{currentPhoto.filename}</div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg max-w-2xl overflow-x-auto">
          {photos
            .slice(
              Math.max(0, currentIndex - 3),
              Math.min(photos.length, currentIndex + 4),
            )
            .map((photo, idx) => {
              const photoIndex = Math.max(0, currentIndex - 3) + idx;
              return (
                <button
                  key={photo.id}
                  onClick={() => {
                    setCurrentIndex(photoIndex);
                    resetView();
                  }}
                  className={`
                  w-16 h-16 rounded overflow-hidden border-2 transition-all
                  ${
                    photoIndex === currentIndex
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }
                `}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
        </div>
      </div>

      {/* Info Sidebar */}
      {showSidebar && (
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Photo Information
            </h3>

            {/* File Details */}
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-500">Filename</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentPhoto.filename}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Size</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatFileSize(currentPhoto.size)} • {currentPhoto.width} ×{' '}
                  {currentPhoto.height}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Uploaded</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(currentPhoto.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Camera Details */}
            {currentPhoto.metadata && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera Details
                </h4>
                <div className="space-y-2">
                  {currentPhoto.metadata.camera && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Camera</span>
                      <span className="text-gray-900">
                        {currentPhoto.metadata.camera}
                      </span>
                    </div>
                  )}
                  {currentPhoto.metadata.lens && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Lens</span>
                      <span className="text-gray-900">
                        {currentPhoto.metadata.lens}
                      </span>
                    </div>
                  )}
                  {currentPhoto.metadata.iso && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ISO</span>
                      <span className="text-gray-900">
                        {currentPhoto.metadata.iso}
                      </span>
                    </div>
                  )}
                  {currentPhoto.metadata.aperture && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Aperture</span>
                      <span className="text-gray-900">
                        {currentPhoto.metadata.aperture}
                      </span>
                    </div>
                  )}
                  {currentPhoto.metadata.shutterSpeed && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shutter</span>
                      <span className="text-gray-900">
                        {currentPhoto.metadata.shutterSpeed}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {currentPhoto.tags.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentPhoto.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`
                        px-2 py-1 text-xs rounded-full
                        ${
                          tag.type === 'ai'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      {tag.name}
                      {tag.confidence && (
                        <span className="ml-1 opacity-60">
                          {Math.round(tag.confidence * 100)}%
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
