'use client';

// WS-119: Portfolio Gallery Component
// Team B Batch 9 Round 2

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Grid,
  RotateCcw,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { PortfolioProject, PortfolioMedia } from '@/types/portfolio';

interface PortfolioGalleryProps {
  project: PortfolioProject;
  isOpen: boolean;
  onClose: () => void;
  initialMediaIndex?: number;
}

export function PortfolioGallery({
  project,
  isOpen,
  onClose,
  initialMediaIndex = 0,
}: PortfolioGalleryProps) {
  const [media, setMedia] = useState<PortfolioMedia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      trackView();
    }
  }, [isOpen, project.id]);

  useEffect(() => {
    setCurrentIndex(Math.min(initialMediaIndex, media.length - 1));
  }, [initialMediaIndex, media.length]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/portfolio/media?project_id=${project.id}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }

      const { media: projectMedia } = await response.json();
      setMedia(
        projectMedia.sort(
          (a: PortfolioMedia, b: PortfolioMedia) =>
            a.display_order - b.display_order,
        ),
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await fetch('/api/portfolio/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_id: project.vendor_id,
          project_id: project.id,
        }),
      });
    } catch (err) {
      console.warn('Failed to track view:', err);
    }
  };

  const currentMedia = media[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setZoom(1);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const goToMedia = (index: number) => {
    setCurrentIndex(index);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const toggleVideo = () => {
    const video = document.querySelector('video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying(true);
      } else {
        video.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    const video = document.querySelector('video');
    if (video) {
      video.muted = !video.muted;
      setIsVideoMuted(video.muted);
    }
  };

  const handleDownload = async () => {
    if (!currentMedia) return;

    try {
      const response = await fetch(currentMedia.media_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentMedia.title || `media-${currentIndex + 1}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = async () => {
    if (!currentMedia) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: currentMedia.caption || currentMedia.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

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
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        resetZoom();
        break;
      case ' ':
        if (currentMedia?.media_type === 'video') {
          e.preventDefault();
          toggleVideo();
        }
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, currentIndex, currentMedia]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-screen-xl h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || media.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              {error || 'No media found for this project'}
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isVideo = currentMedia?.media_type === 'video';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-xl h-screen p-0 bg-black">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex justify-between items-start text-white">
              <div>
                <h2 className="text-lg font-semibold">{project.title}</h2>
                <p className="text-sm text-gray-300">
                  {currentIndex + 1} of {media.length}
                  {currentMedia?.title && ` • ${currentMedia.title}`}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className="text-white hover:bg-white/20"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={handleShare}
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-24">
            <div className="relative max-w-full max-h-full">
              {isVideo ? (
                <div className="relative">
                  <video
                    src={currentMedia.media_url}
                    className="max-w-full max-h-full"
                    style={{ transform: `scale(${zoom})` }}
                    controls
                    autoPlay={false}
                    muted={isVideoMuted}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onVolumeChange={(e) => {
                      const target = e.target as HTMLVideoElement;
                      setIsVideoMuted(target.muted);
                    }}
                  />

                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                    <div className="flex gap-2">
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={toggleVideo}
                        className="text-white bg-black/50 hover:bg-black/70"
                      >
                        {isVideoPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={toggleMute}
                        className="text-white bg-black/50 hover:bg-black/70"
                      >
                        {isVideoMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={currentMedia.media_url}
                  alt={currentMedia.alt_text || currentMedia.title}
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              )}

              {/* Navigation Arrows */}
              {media.length > 1 && (
                <>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Zoom Controls */}
          {!isVideo && (
            <div className="absolute right-4 bottom-32 z-50 flex flex-col gap-2">
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white bg-black/50 hover:bg-black/70"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={resetZoom}
                className="text-white bg-black/50 hover:bg-black/70"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white bg-black/50 hover:bg-black/70"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Thumbnails */}
          {showThumbnails && media.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex gap-2 overflow-x-auto justify-center">
                {media.map((mediaItem, index) => (
                  <button
                    key={mediaItem.id}
                    onClick={() => goToMedia(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                      index === currentIndex
                        ? 'border-white'
                        : 'border-transparent hover:border-gray-400'
                    }`}
                  >
                    {mediaItem.media_type === 'video' ? (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    ) : (
                      <img
                        src={mediaItem.thumbnail_url || mediaItem.media_url}
                        alt={mediaItem.alt_text || mediaItem.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media Info */}
          {currentMedia?.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-40 text-center">
              <p className="text-white bg-black/50 rounded px-3 py-2 inline-block max-w-md">
                {currentMedia.caption}
              </p>
            </div>
          )}

          {/* Tags */}
          {currentMedia?.tags && currentMedia.tags.length > 0 && (
            <div className="absolute top-20 left-4 z-50">
              <div className="flex flex-wrap gap-1">
                {currentMedia.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-black/50 text-white"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
