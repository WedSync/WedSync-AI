'use client';

/**
 * OptimizedImage Component - WS-079 Photo Gallery System
 * Next.js Image component wrapper with Supabase Storage integration and CDN optimization
 */

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { Photo } from '@/types/photos';
import {
  getOptimizedImageUrl,
  generateBlurPlaceholder,
  generateSrcSet,
  generateSizes,
  ImageQuality,
} from '@/lib/utils/image-optimization';

interface OptimizedImageProps
  extends Omit<ImageProps, 'src' | 'alt' | 'srcSet'> {
  photo: Photo;
  quality?: ImageQuality;
  fallbackQuality?: ImageQuality;
  alt?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  responsive?: boolean;
  breakpoints?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

export function OptimizedImage({
  photo,
  quality = 'preview',
  fallbackQuality = 'thumbnail',
  alt,
  onLoad,
  onError,
  className = '',
  responsive = true,
  breakpoints,
  ...imageProps
}: OptimizedImageProps) {
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = getOptimizedImageUrl(photo, currentQuality);
  const fallbackUrl =
    fallbackQuality !== currentQuality
      ? getOptimizedImageUrl(photo, fallbackQuality)
      : undefined;

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);

    // Try fallback quality if available and different
    if (fallbackUrl && currentQuality !== fallbackQuality && !hasError) {
      setCurrentQuality(fallbackQuality);
      setHasError(false);
      return;
    }

    setHasError(true);
    onError?.(new Error(`Failed to load image: ${photo.filename}`));
  };

  // Generate alt text
  const altText =
    alt || photo.title || photo.altText || `Photo: ${photo.filename}`;

  // Calculate blur data URL for loading placeholder
  const blurDataURL = generateBlurPlaceholder(photo);

  // Generate responsive attributes
  const srcSet = responsive ? generateSrcSet(photo) : undefined;
  const sizes = responsive ? generateSizes(breakpoints) : undefined;

  return (
    <div className={`relative ${className}`}>
      <Image
        src={imageUrl}
        alt={altText}
        srcSet={srcSet}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        placeholder="blur"
        blurDataURL={blurDataURL}
        {...imageProps}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-inherit" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-inherit">
          <div className="text-center text-gray-500">
            <div className="w-8 h-8 mx-auto mb-2">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
}
