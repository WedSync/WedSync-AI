'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderSrc?: string;
  thumbnailSrc?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  priority?: boolean;
  quality?: number;
  loading?: 'lazy' | 'eager';
  'data-testid'?: string;
  webpSrc?: string;
  avifSrc?: string;
  fallbackSrc?: string;
  // WS-173: Wedding-specific optimization props
  isWeddingPhoto?: boolean;
  venue?: string;
  geographic?: 'auto' | 'us' | 'eu' | 'asia';
  networkOptimization?: boolean;
  preloadCritical?: boolean;
  cdnRegion?: string;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// Format detection utility
const supportsFormat = {
  webp:
    typeof window !== 'undefined' &&
    (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })(),
  avif:
    typeof window !== 'undefined' &&
    (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      try {
        return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      } catch {
        return false;
      }
    })(),
};

// Generate srcset for responsive images
const generateSrcSet = (
  baseSrc: string,
  webpSrc?: string,
  avifSrc?: string,
) => {
  const sources = [];

  // Add AVIF if supported and provided
  if (avifSrc && supportsFormat.avif) {
    sources.push({
      srcSet: avifSrc,
      type: 'image/avif',
    });
  }

  // Add WebP if supported and provided
  if (webpSrc && supportsFormat.webp) {
    sources.push({
      srcSet: webpSrc,
      type: 'image/webp',
    });
  }

  // Add original format as fallback
  sources.push({
    srcSet: baseSrc,
    type: 'image/jpeg',
  });

  return sources;
};

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderSrc,
  thumbnailSrc,
  sizes,
  onLoad,
  onError,
  priority = false,
  quality = 80,
  loading = 'lazy',
  'data-testid': testId,
  webpSrc,
  avifSrc,
  fallbackSrc,
  isWeddingPhoto = false,
  venue,
  geographic = 'auto',
  networkOptimization = true,
  preloadCritical = false,
  cdnRegion,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    thumbnailSrc || placeholderSrc || null,
  );
  const [isVisible, setIsVisible] = useState(priority || loading === 'eager');
  const [networkType, setNetworkType] = useState<string>('unknown');
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const fullImageRef = useRef<HTMLImageElement | null>(null);

  const { logMetric } = usePerformanceMonitor('ProgressiveImage');

  // WS-173: Network condition detection for wedding photo optimization
  useEffect(() => {
    if (
      networkOptimization &&
      typeof window !== 'undefined' &&
      'connection' in navigator
    ) {
      const connection = (navigator as any).connection;
      if (connection) {
        setNetworkType(connection.effectiveType || 'unknown');

        // Listen for network changes during wedding day
        const handleNetworkChange = () => {
          setNetworkType(connection.effectiveType || 'unknown');
          if (isWeddingPhoto) {
            logMetric('networkChange', {
              newType: connection.effectiveType,
              venue,
              geographic,
            });
          }
        };

        connection.addEventListener('change', handleNetworkChange);
        return () =>
          connection.removeEventListener('change', handleNetworkChange);
      }
    }
  }, [networkOptimization, isWeddingPhoto, venue, geographic, logMetric]);

  // WS-173: Geographic CDN optimization
  const optimizeSrcForLocation = useCallback(
    (originalSrc: string): string => {
      if (
        !originalSrc.includes('supabase.co') &&
        !originalSrc.includes('cdn.')
      ) {
        return originalSrc;
      }

      const url = new URL(originalSrc);

      // Add geographic hints for CDN routing
      if (geographic !== 'auto') {
        url.searchParams.set('geo', geographic);
      }

      if (cdnRegion) {
        url.searchParams.set('region', cdnRegion);
      }

      // Network-based quality optimization for wedding photos
      const baseQuality = quality;
      if (networkType === 'slow-2g' || networkType === '2g') {
        url.searchParams.set('q', Math.max(baseQuality - 30, 40).toString());
        url.searchParams.set('format', 'webp');
        if (isWeddingPhoto) {
          url.searchParams.set('w', '800'); // Smaller width for slow connections
        }
      } else if (networkType === '3g') {
        url.searchParams.set('q', Math.max(baseQuality - 15, 60).toString());
        url.searchParams.set('format', 'webp');
        if (isWeddingPhoto) {
          url.searchParams.set('w', '1200'); // Medium width for 3g
        }
      } else if (networkType === '4g' && isWeddingPhoto) {
        url.searchParams.set('format', 'avif');
        url.searchParams.set('w', '1920'); // Full width for good connections
      }

      // Wedding photo specific optimizations
      if (isWeddingPhoto) {
        url.searchParams.set('auto', 'compress,enhance');
        if (venue) {
          url.searchParams.set('venue', encodeURIComponent(venue));
        }
      }

      return url.toString();
    },
    [quality, networkType, geographic, cdnRegion, isWeddingPhoto, venue],
  );

  // WS-173: Get optimized sizes for wedding photos
  const getOptimizedSizes = useCallback((): string => {
    if (sizes) return sizes;

    if (isWeddingPhoto) {
      // Wedding photos often viewed full-screen on mobile at venues
      return '(max-width: 480px) 100vw, (max-width: 768px) 90vw, (max-width: 1200px) 50vw, 33vw';
    }

    return '(max-width: 768px) 100vw, 50vw';
  }, [sizes, isWeddingPhoto]);

  // WS-173: Get network-optimized quality
  const getOptimizedQuality = useCallback((): number => {
    if (!networkOptimization) return quality;

    if (networkType === 'slow-2g' || networkType === '2g') {
      return Math.max(quality - 25, 40);
    } else if (networkType === '3g') {
      return Math.max(quality - 15, 60);
    }
    return quality;
  }, [quality, networkType, networkOptimization]);

  // Intersection Observer for lazy loading
  const [containerRef, intersectionVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
    freezeOnceVisible: true,
  });

  // Update visibility based on intersection observer
  useEffect(() => {
    if (intersectionVisible && !isVisible) {
      setIsVisible(true);
    }
  }, [intersectionVisible, isVisible]);

  // WS-173: Enhanced progressive loading logic with wedding photo tracking
  const loadImage = useCallback(
    (imageSrc: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        const startTime = performance.now();

        img.onload = () => {
          const loadTime = performance.now() - startTime;

          // Enhanced metrics for wedding photos
          if (isWeddingPhoto) {
            logMetric('weddingPhotoLoadTime', {
              time: loadTime,
              venue,
              networkType,
              geographic,
              quality: getOptimizedQuality(),
              src: imageSrc,
            });

            // Track performance by venue and network
            if (window.gtag) {
              window.gtag('event', 'wedding_photo_performance', {
                event_category: 'performance',
                event_label: venue || 'unknown_venue',
                value: Math.round(loadTime),
                custom_map: {
                  network_type: networkType,
                  geographic_region: geographic,
                  load_time_ms: loadTime,
                },
              });
            }
          } else {
            logMetric('imageLoadTime', loadTime);
          }

          resolve(imageSrc);
        };

        img.onerror = () => {
          const errorTime = performance.now() - startTime;
          if (isWeddingPhoto) {
            logMetric('weddingPhotoLoadError', {
              time: errorTime,
              venue,
              networkType,
              src: imageSrc,
            });
          }
          reject(new Error(`Failed to load image: ${imageSrc}`));
        };

        // Use optimized source for wedding photos
        const optimizedSrc = isWeddingPhoto
          ? optimizeSrcForLocation(imageSrc)
          : imageSrc;

        // Try the best supported format first
        const sources = generateSrcSet(optimizedSrc, webpSrc, avifSrc);
        const bestSource = sources[0];

        img.src = bestSource.srcSet;
      });
    },
    [
      webpSrc,
      avifSrc,
      logMetric,
      isWeddingPhoto,
      venue,
      networkType,
      geographic,
      getOptimizedQuality,
      optimizeSrcForLocation,
    ],
  );

  // Load high-quality image when visible
  useEffect(() => {
    if (!isVisible || loadingState === 'loaded' || loadingState === 'loading') {
      return;
    }

    const loadHighQualityImage = async () => {
      setLoadingState('loading');

      try {
        // First try loading thumbnail if not already loaded
        if (thumbnailSrc && currentSrc !== thumbnailSrc) {
          const thumbnailLoaded = await loadImage(thumbnailSrc);
          setCurrentSrc(thumbnailLoaded);

          // Small delay to show thumbnail before loading full image
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Load full quality image
        let fullImageSrc = src;

        // Try best format first
        if (avifSrc && supportsFormat.avif) {
          fullImageSrc = avifSrc;
        } else if (webpSrc && supportsFormat.webp) {
          fullImageSrc = webpSrc;
        }

        const fullImageLoaded = await loadImage(fullImageSrc);

        // Store reference to full image for cleanup
        if (fullImageRef.current) {
          fullImageRef.current.src = fullImageLoaded;
        }

        setCurrentSrc(fullImageLoaded);
        setLoadingState('loaded');
        onLoad?.();
      } catch (error) {
        // Try fallback sources
        const fallbacks = [fallbackSrc, src].filter(Boolean);

        let fallbackLoaded = false;
        for (const fallback of fallbacks) {
          try {
            const fallbackImage = await loadImage(fallback as string);
            setCurrentSrc(fallbackImage);
            setLoadingState('loaded');
            fallbackLoaded = true;
            break;
          } catch {
            continue;
          }
        }

        if (!fallbackLoaded) {
          setLoadingState('error');
          onError?.(error as Error);
        }
      }
    };

    loadHighQualityImage();
  }, [
    isVisible,
    src,
    thumbnailSrc,
    webpSrc,
    avifSrc,
    fallbackSrc,
    currentSrc,
    loadingState,
    loadImage,
    onLoad,
    onError,
  ]);

  // Cleanup
  useEffect(() => {
    const currentRef = fullImageRef.current;
    return () => {
      if (currentRef) {
        currentRef.src = '';
      }
    };
  }, []);

  // WS-173: Use optimized sources and sizes for wedding photos
  const optimizedSrc = isWeddingPhoto ? optimizeSrcForLocation(src) : src;
  const optimizedSizes = getOptimizedSizes();
  const sources = generateSrcSet(optimizedSrc, webpSrc, avifSrc);

  // WS-173: Preload critical wedding photos
  useEffect(() => {
    if (preloadCritical && isWeddingPhoto && optimizedSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      if (optimizedSizes) {
        link.setAttribute('imagesizes', optimizedSizes);
      }
      document.head.appendChild(link);

      return () => {
        try {
          document.head.removeChild(link);
        } catch (e) {
          // Link may have been removed already
        }
      };
    }
  }, [preloadCritical, isWeddingPhoto, optimizedSrc, optimizedSizes]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden transition-all duration-300 ${
        !loadingState || loadingState === 'idle' ? 'animate-pulse' : ''
      } ${className}`}
      data-testid={testId}
      style={{ width, height }}
    >
      {/* Picture element for modern format support */}
      <picture className="block w-full h-full">
        {sources.slice(0, -1).map((source, index) => (
          <source
            key={index}
            srcSet={isVisible ? source.srcSet : undefined}
            type={source.type}
            sizes={optimizedSizes}
          />
        ))}

        <img
          ref={imageRef}
          src={currentSrc || (isVisible ? optimizedSrc : placeholderSrc || '')}
          alt={alt}
          width={width}
          height={height}
          sizes={optimizedSizes}
          loading={loading}
          className={`block w-full h-full object-cover transition-opacity duration-300 ${
            loadingState === 'loaded' ? 'opacity-100' : 'opacity-80'
          }`}
          style={{
            // Prevent layout shift
            aspectRatio: width && height ? `${width} / ${height}` : undefined,
          }}
        />
      </picture>

      {/* Loading placeholder */}
      {!currentSrc && loadingState !== 'error' && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      )}

      {/* WS-173: Enhanced loading overlay for wedding photos */}
      {loadingState === 'loading' && currentSrc && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px] transition-opacity duration-300">
          {isWeddingPhoto ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-50/90 to-purple-50/90">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-600 mx-auto mb-2"></div>
                <p className="text-sm text-pink-700 font-medium">
                  Loading wedding photo...
                </p>
                {venue && <p className="text-xs text-pink-600 mt-1">{venue}</p>}
                {networkType && networkType !== 'unknown' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Network: {networkType}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          )}
        </div>
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}

      {/* Hidden full image reference for memory management */}
      <img ref={fullImageRef} src="" alt="" className="hidden" />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

// High-performance memoized version
export const MemoizedProgressiveImage = React.memo(
  ProgressiveImage,
  (prevProps, nextProps) => {
    // Custom comparison for better memoization
    const keys: (keyof ProgressiveImageProps)[] = [
      'src',
      'alt',
      'width',
      'height',
      'className',
      'priority',
      'webpSrc',
      'avifSrc',
    ];

    return keys.every((key) => prevProps[key] === nextProps[key]);
  },
);

MemoizedProgressiveImage.displayName = 'MemoizedProgressiveImage';

export default MemoizedProgressiveImage;
