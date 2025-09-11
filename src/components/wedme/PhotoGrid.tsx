'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import type { Photo } from '@/types/photos';

interface PhotoGridProps {
  photos: Photo[];
  groupId: string;
  isDropTarget?: boolean;
  onPhotoSelect?: (photo: Photo) => void;
}

export function PhotoGrid({
  photos,
  groupId,
  isDropTarget = false,
  onPhotoSelect,
}: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { isOver, setNodeRef } = useDroppable({
    id: groupId,
    disabled: !isDropTarget,
  });

  const handlePhotoTap = (photo: Photo) => {
    if (onPhotoSelect) {
      onPhotoSelect(photo);
    } else {
      setSelectedPhoto(photo);
      setShowPreview(true);
    }
  };

  const gridCols =
    photos.length === 1
      ? 1
      : photos.length === 2
        ? 2
        : photos.length === 3
          ? 3
          : 2;

  return (
    <>
      <div
        ref={setNodeRef}
        className={`
          grid gap-2 p-2 rounded-lg transition-colors
          ${isOver ? 'bg-pink-50 border-2 border-dashed border-pink-300' : ''}
          ${
            gridCols === 1
              ? 'grid-cols-1'
              : gridCols === 2
                ? 'grid-cols-2'
                : 'grid-cols-3'
          }
        `}
      >
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            onClick={() => handlePhotoTap(photo)}
            className={`
              aspect-square rounded-lg overflow-hidden touch-manipulation
              ${photos.length === 1 ? 'aspect-[4/3]' : 'aspect-square'}
              ${index === 0 && photos.length === 3 ? 'col-span-2' : ''}
            `}
          />
        ))}
      </div>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        photo={selectedPhoto}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedPhoto(null);
        }}
      />
    </>
  );
}
