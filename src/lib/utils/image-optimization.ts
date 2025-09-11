/**
 * Image Optimization Utilities - WS-079 Photo Gallery System
 * Supabase Storage image transformations and CDN optimization
 */

import { createClient } from '@supabase/supabase-js';
import { Photo } from '@/types/photos';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type ImageQuality = 'thumbnail' | 'preview' | 'optimized' | 'original';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'origin' | 'auto' | 'webp' | 'jpg' | 'png';
  quality?: number;
}

/**
 * Get optimized image URL from Supabase Storage with transformations
 */
export function getOptimizedImageUrl(
  photo: Photo,
  quality: ImageQuality = 'preview',
  transforms?: ImageTransformOptions,
): string {
  // Select the appropriate file path based on quality
  let filePath: string;

  switch (quality) {
    case 'thumbnail':
      filePath =
        photo.thumbnailPath ||
        photo.previewPath ||
        photo.optimizedPath ||
        photo.filePath;
      break;
    case 'preview':
      filePath = photo.previewPath || photo.optimizedPath || photo.filePath;
      break;
    case 'optimized':
      filePath = photo.optimizedPath || photo.filePath;
      break;
    case 'original':
      filePath = photo.filePath;
      break;
    default:
      filePath = photo.filePath;
  }

  // Get public URL
  const { data } = supabase.storage.from('photos').getPublicUrl(filePath);

  let url = data.publicUrl;

  // Apply Supabase image transformations if provided
  if (transforms && Object.keys(transforms).length > 0) {
    const transformParams = new URLSearchParams();

    if (transforms.width)
      transformParams.append('width', transforms.width.toString());
    if (transforms.height)
      transformParams.append('height', transforms.height.toString());
    if (transforms.resize) transformParams.append('resize', transforms.resize);
    if (transforms.format) transformParams.append('format', transforms.format);
    if (transforms.quality)
      transformParams.append('quality', transforms.quality.toString());

    // Add transform parameters to URL
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${transformParams.toString()}`;
  }

  return url;
}

/**
 * Get responsive image URLs for different screen sizes
 */
export function getResponsiveImageUrls(photo: Photo): {
  mobile: string;
  tablet: string;
  desktop: string;
  original: string;
} {
  return {
    mobile: getOptimizedImageUrl(photo, 'preview', {
      width: 400,
      quality: 85,
      format: 'webp',
    }),
    tablet: getOptimizedImageUrl(photo, 'preview', {
      width: 800,
      quality: 85,
      format: 'webp',
    }),
    desktop: getOptimizedImageUrl(photo, 'optimized', {
      width: 1200,
      quality: 90,
      format: 'webp',
    }),
    original: getOptimizedImageUrl(photo, 'original'),
  };
}

/**
 * Generate Next.js Image component compatible srcSet
 */
export function generateSrcSet(photo: Photo): string {
  const urls = getResponsiveImageUrls(photo);

  return [
    `${urls.mobile} 400w`,
    `${urls.tablet} 800w`,
    `${urls.desktop} 1200w`,
    `${urls.original} 2048w`,
  ].join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(breakpoints?: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const defaultBreakpoints = {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
    ...breakpoints,
  };

  return [
    `(max-width: 640px) ${defaultBreakpoints.mobile}`,
    `(max-width: 1024px) ${defaultBreakpoints.tablet}`,
    defaultBreakpoints.desktop,
  ].join(', ');
}

/**
 * Generate blur placeholder for loading state
 */
export function generateBlurPlaceholder(photo: Photo): string {
  // Generate a low-quality placeholder
  const thumbnailUrl = getOptimizedImageUrl(photo, 'thumbnail', {
    width: 10,
    height: 10,
    quality: 10,
    format: 'jpg',
  });

  // For now, return a generic blur data URL
  // In production, you might want to generate actual blur data from the thumbnail
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(
  url: string,
  priority: 'high' | 'low' = 'low',
): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;

  if (priority === 'high') {
    link.fetchPriority = 'high';
  }

  document.head.appendChild(link);
}

/**
 * Get image metadata for optimization decisions
 */
export function getImageMetadata(photo: Photo): {
  aspectRatio: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isSquare: boolean;
  megapixels?: number;
} {
  const width = photo.width || 0;
  const height = photo.height || 0;
  const aspectRatio = width && height ? width / height : 1;

  return {
    aspectRatio,
    isLandscape: aspectRatio > 1,
    isPortrait: aspectRatio < 1,
    isSquare: Math.abs(aspectRatio - 1) < 0.1,
    megapixels:
      width && height
        ? Math.round(((width * height) / 1000000) * 10) / 10
        : undefined,
  };
}

/**
 * Calculate optimal image dimensions for container
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  photo: Photo,
  fit: 'cover' | 'contain' = 'cover',
): { width: number; height: number } {
  const photoWidth = photo.width || containerWidth;
  const photoHeight = photo.height || containerHeight;

  const containerAspect = containerWidth / containerHeight;
  const photoAspect = photoWidth / photoHeight;

  if (fit === 'cover') {
    if (photoAspect > containerAspect) {
      // Photo is wider than container
      return {
        width: containerHeight * photoAspect,
        height: containerHeight,
      };
    } else {
      // Photo is taller than container
      return {
        width: containerWidth,
        height: containerWidth / photoAspect,
      };
    }
  } else {
    // contain
    if (photoAspect > containerAspect) {
      // Photo is wider than container
      return {
        width: containerWidth,
        height: containerWidth / photoAspect,
      };
    } else {
      // Photo is taller than container
      return {
        width: containerHeight * photoAspect,
        height: containerHeight,
      };
    }
  }
}

/**
 * CDN cache optimization headers
 */
export const CDN_CACHE_CONFIG = {
  // Cache thumbnail images for 1 week
  thumbnail: 'public, max-age=604800, s-maxage=2592000',
  // Cache preview images for 1 month
  preview: 'public, max-age=2592000, s-maxage=7776000',
  // Cache optimized images for 3 months
  optimized: 'public, max-age=7776000, s-maxage=31536000',
  // Cache original images for 1 year
  original: 'public, max-age=31536000, s-maxage=31536000',
};
