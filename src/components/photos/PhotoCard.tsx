'use client';

/**
 * PhotoCard Component - WS-079 Photo Gallery System
 * Individual photo display with selection and actions using Untitled UI patterns
 */

import React from 'react';
import {
  Check,
  Download,
  Share2,
  Heart,
  Eye,
  Calendar,
  User,
  MapPin,
} from 'lucide-react';
import { Photo } from '@/types/photos';
import { OptimizedImage } from './OptimizedImage';

interface PhotoCardProps {
  photo: Photo;
  layoutMode: 'grid' | 'list';
  selected: boolean;
  onSelect: () => void;
  showSelection: boolean;
  onClick?: () => void;
  className?: string;
}

export function PhotoCard({
  photo,
  layoutMode,
  selected,
  onSelect,
  showSelection,
  onClick,
  className = '',
}: PhotoCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  if (layoutMode === 'list') {
    return (
      <div
        className={`group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all duration-200 ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-4">
          {/* Selection Checkbox */}
          {showSelection && (
            <div className="flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  selected
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                {selected && <Check className="w-3 h-3 text-white" />}
              </button>
            </div>
          )}

          {/* Thumbnail */}
          <div className="flex-shrink-0 relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
            <OptimizedImage
              photo={photo}
              quality="thumbnail"
              alt={photo.title || photo.filename}
              fill
              className="object-cover"
              responsive={false}
              sizes="64px"
            />

            {photo.isFeatured && (
              <div className="absolute top-1 left-1">
                <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {photo.title || photo.filename}
                </h3>

                {photo.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {photo.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {photo.width && photo.height && (
                    <span>
                      {photo.width} × {photo.height}
                    </span>
                  )}
                  {photo.fileSizeBytes && (
                    <span>{formatFileSize(photo.fileSizeBytes)}</span>
                  )}
                  <span>{formatDate(photo.createdAt)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 ml-4">
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{photo.viewCount || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>{photo.downloadCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={`group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-all ${
              selected
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white/80 border-white/80 hover:border-primary-400'
            }`}
          >
            {selected && <Check className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      )}

      {/* Featured Indicator */}
      {photo.isFeatured && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-3 h-3 bg-primary-600 rounded-full border-2 border-white"></div>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square bg-gray-100">
        <OptimizedImage
          photo={photo}
          quality="preview"
          alt={photo.title || photo.filename}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          breakpoints={{
            mobile: '50vw',
            tablet: '33vw',
            desktop: '25vw',
          }}
        />

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle download
              }}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle share
              }}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Approval Status Badge */}
        {photo.approvalStatus !== 'approved' && (
          <div className="absolute bottom-2 left-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                photo.approvalStatus === 'pending'
                  ? 'bg-warning-100 text-warning-700'
                  : 'bg-error-100 text-error-700'
              }`}
            >
              {photo.approvalStatus === 'pending' ? 'Pending' : 'Rejected'}
            </span>
          </div>
        )}

        {/* Stats Overlay */}
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          {(photo.viewCount || 0) > 0 && (
            <div className="inline-flex items-center px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
              <Eye className="w-3 h-3 mr-1" />
              {photo.viewCount}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {photo.title || photo.filename}
          </h3>

          {photo.description && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {photo.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              {photo.takenAt && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(photo.takenAt)}</span>
                </div>
              )}

              {photo.photographerCredit && (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-20">
                    {photo.photographerCredit}
                  </span>
                </div>
              )}
            </div>

            {photo.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-16">{photo.location}</span>
              </div>
            )}
          </div>

          {/* Compression Info */}
          {photo.compressionRatio && photo.compressionRatio > 0 && (
            <div className="text-xs text-gray-400">
              {Math.round(photo.compressionRatio)}% compressed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
