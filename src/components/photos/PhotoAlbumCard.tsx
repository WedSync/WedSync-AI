'use client';

/**
 * PhotoAlbumCard Component - WS-079 Photo Gallery System
 * Album card display using Untitled UI patterns
 */

import React from 'react';
import { Calendar, MapPin, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { PhotoAlbum } from '@/types/photos';
import { OptimizedImage } from './OptimizedImage';

interface PhotoAlbumCardProps {
  album: PhotoAlbum;
  onClick: () => void;
  className?: string;
  showStats?: boolean;
}

export function PhotoAlbumCard({
  album,
  onClick,
  className = '',
  showStats = true,
}: PhotoAlbumCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative aspect-video bg-gray-50 overflow-hidden">
        {album.coverPhotoUrl ? (
          <img
            src={album.coverPhotoUrl}
            alt={album.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex flex-col items-center space-y-3 text-gray-400">
              <FolderOpen className="w-12 h-12" />
              <span className="text-sm font-medium">No photos yet</span>
            </div>
          </div>
        )}

        {/* Featured Badge */}
        {album.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-white shadow-sm">
              Featured
            </span>
          </div>
        )}

        {/* Photo Count Overlay */}
        {showStats &&
          album.photoCount !== undefined &&
          album.photoCount > 0 && (
            <div className="absolute bottom-3 right-3">
              <div className="inline-flex items-center px-2.5 py-1 bg-gray-900/70 backdrop-blur-sm rounded-lg">
                <ImageIcon className="w-3 h-3 text-white mr-1.5" />
                <span className="text-xs font-medium text-white">
                  {album.photoCount}
                </span>
              </div>
            </div>
          )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Album Name */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
              {album.name}
            </h3>

            {album.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {album.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            {album.eventDate && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatDate(album.eventDate)}</span>
              </div>
            )}

            {album.location && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{album.location}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          {showStats && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {album.photoCount === 0 && 'Empty album'}
                {album.photoCount === 1 && '1 photo'}
                {(album.photoCount || 0) > 1 && `${album.photoCount} photos`}
              </div>

              <div className="text-xs text-gray-400">
                {new Date(album.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
