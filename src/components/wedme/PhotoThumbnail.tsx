'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { PhotoIcon } from '@heroicons/react/24/outline';
import type { Photo } from '@/types/photos';

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
  className?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function PhotoThumbnail({
  photo,
  onClick,
  className = '',
  isSelectable = false,
  isSelected = false,
  onSelect,
}: PhotoThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id: photo.id,
    data: { photo },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isSelectable && onSelect) {
      onSelect(!isSelected);
    } else {
      onClick();
    }
  };

  const handleLongPress = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isSelectable && onSelect) {
      onSelect(!isSelected);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group cursor-pointer touch-manipulation
        ${className}
        ${isDragging ? 'opacity-50 scale-105 z-50' : ''}
        ${isSelected ? 'ring-2 ring-pink-500' : ''}
      `}
      onClick={handleClick}
      onTouchStart={handleLongPress}
      {...attributes}
      {...listeners}
    >
      {/* Image */}
      <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
        {!imageError ? (
          <Image
            src={photo.thumbnailUrl || photo.url}
            alt={photo.caption || 'Wedding photo'}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className={`
              object-cover transition-opacity duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Selection Overlay */}
        {isSelectable && (
          <div
            className={`
            absolute top-2 right-2 z-10 transition-opacity
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          >
            <div
              className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center
              ${
                isSelected
                  ? 'bg-pink-500 border-pink-500 text-white'
                  : 'bg-white/90 border-white text-gray-600'
              }
            `}
            >
              {isSelected && <CheckCircleIcon className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Drag Handle */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Photo Caption */}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-xs truncate">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}
