'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import type { Photo } from '@/types/photos';

interface PhotoPreviewModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoPreviewModal({
  photo,
  isOpen,
  onClose,
}: PhotoPreviewModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !photo) return null;

  const handleShare = async () => {
    if (navigator.share && photo.url) {
      try {
        await navigator.share({
          title: photo.caption || 'Wedding Photo',
          url: photo.url,
        });
      } catch (error) {
        // Fallback to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(photo.url);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between p-4 pt-safe">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 text-white touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Close preview"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-black/30 text-white touch-manipulation"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Share photo"
            >
              <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo */}
      <div className="flex items-center justify-center h-full p-4">
        <div className="relative w-full h-full max-w-2xl max-h-full">
          <Image
            src={photo.url}
            alt={photo.caption || 'Wedding photo'}
            fill
            sizes="100vw"
            className={`
              object-contain transition-opacity duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImageLoaded(true)}
            priority
          />

          {/* Loading State */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="p-4 pb-safe">
            <p className="text-white text-center">{photo.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}
