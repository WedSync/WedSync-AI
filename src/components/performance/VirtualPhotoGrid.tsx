'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { MemoizedProgressiveImage } from './ProgressiveImage';
import {
  useVirtualScrolling,
  useMemoryOptimization,
  usePerformanceMonitor,
} from '@/hooks/usePerformanceOptimization';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import {
  CheckCircle,
  Square,
  Download,
  Share2,
  Eye,
  MoreHorizontal,
} from 'lucide-react';

interface PhotoItem {
  id: string;
  src: string;
  thumbnailSrc?: string;
  webpSrc?: string;
  avifSrc?: string;
  alt: string;
  title?: string;
  width: number;
  height: number;
  size?: number;
  tags?: string[];
  createdAt?: string;
}

interface VirtualPhotoGridProps {
  photos: PhotoItem[];
  columns?: number;
  itemHeight?: number;
  gap?: number;
  containerHeight?: number;
  onPhotoSelect?: (photoId: string) => void;
  onBulkSelect?: (photoIds: string[]) => void;
  selectedPhotoIds?: string[];
  showSelection?: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
  'data-testid'?: string;
}

// Memoized photo grid item
const PhotoGridItem = React.memo(
  ({
    photo,
    index,
    selected,
    showSelection,
    onSelect,
    itemWidth,
    gap,
  }: {
    photo: PhotoItem;
    index: number;
    selected: boolean;
    showSelection: boolean;
    onSelect: (id: string) => void;
    itemWidth: number;
    gap: number;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { logMetric } = usePerformanceMonitor('PhotoGridItem');

    const handleLoad = useCallback(() => {
      logMetric('photoLoadTime', performance.now());
    }, [logMetric]);

    const calculateAspectRatio = (width: number, height: number) => {
      return height / width;
    };

    const aspectRatio = calculateAspectRatio(photo.width, photo.height);
    const itemHeight = itemWidth * aspectRatio;

    return (
      <div
        className="relative group cursor-pointer"
        style={{
          width: itemWidth,
          height: itemHeight,
          marginRight: gap,
          marginBottom: gap,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`photo-item-${photo.id}`}
      >
        {/* Selection overlay */}
        {showSelection && (
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id);
            }}
          >
            <button className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all">
              {selected ? (
                <CheckCircle className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        )}

        {/* Progressive image */}
        <MemoizedProgressiveImage
          src={photo.src}
          thumbnailSrc={photo.thumbnailSrc}
          webpSrc={photo.webpSrc}
          avifSrc={photo.avifSrc}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          className="rounded-lg overflow-hidden"
          onLoad={handleLoad}
          data-testid={`photo-image-${photo.id}`}
        />

        {/* Hover overlay */}
        {(isHovered || selected) && (
          <div
            className={`absolute inset-0 bg-black/20 rounded-lg transition-opacity duration-200 ${
              isHovered || selected ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all">
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
              <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all">
                <Download className="w-4 h-4 text-gray-700" />
              </button>
              <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all">
                <MoreHorizontal className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {/* Selection highlight */}
        {selected && (
          <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
        )}

        {/* Photo info overlay */}
        {photo.title && isHovered && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-3">
            <p className="text-white text-sm font-medium truncate">
              {photo.title}
            </p>
          </div>
        )}
      </div>
    );
  },
);

PhotoGridItem.displayName = 'PhotoGridItem';

// Bulk selection toolbar
const BulkSelectionToolbar = React.memo(
  ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onBulkAction,
  }: {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkAction: (action: string) => void;
  }) => {
    if (selectedCount === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} of {totalCount} photos selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={
                  selectedCount === totalCount ? onDeselectAll : onSelectAll
                }
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkAction('download')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => onBulkAction('share')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={() => onBulkAction('delete')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  },
);

BulkSelectionToolbar.displayName = 'BulkSelectionToolbar';

// Infinite scroll trigger
const InfiniteScrollTrigger = React.memo(
  ({
    onLoadMore,
    hasMore,
    loading,
  }: {
    onLoadMore: () => void;
    hasMore: boolean;
    loading: boolean;
  }) => {
    const [triggerRef, isVisible] = useIntersectionObserver({
      rootMargin: '100px',
      threshold: 0.1,
    });

    useEffect(() => {
      if (isVisible && hasMore && !loading) {
        onLoadMore();
      }
    }, [isVisible, hasMore, loading, onLoadMore]);

    if (!hasMore) return null;

    return (
      <div
        ref={triggerRef}
        className="col-span-full py-8 flex items-center justify-center"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            Loading more photos...
          </div>
        ) : (
          <button
            onClick={onLoadMore}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            Load More Photos
          </button>
        )}
      </div>
    );
  },
);

InfiniteScrollTrigger.displayName = 'InfiniteScrollTrigger';

export const VirtualPhotoGrid: React.FC<VirtualPhotoGridProps> = ({
  photos,
  columns = 4,
  itemHeight = 200,
  gap = 16,
  containerHeight = 600,
  onPhotoSelect,
  onBulkSelect,
  selectedPhotoIds = [],
  showSelection = false,
  onLoadMore,
  hasMore = false,
  loading = false,
  className = '',
  'data-testid': testId,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addObserver } = useMemoryOptimization();
  const { logMetric } = usePerformanceMonitor('VirtualPhotoGrid');

  // Calculate layout dimensions
  const containerWidth = containerRef.current?.clientWidth || 0;
  const availableWidth = containerWidth - gap * (columns - 1);
  const itemWidth = Math.floor(availableWidth / columns);

  // Virtual scrolling calculations with dynamic heights
  const photoWithCalculatedHeights = useMemo(() => {
    return photos.map((photo) => {
      const aspectRatio = photo.height / photo.width;
      const calculatedHeight = itemWidth * aspectRatio;
      return {
        ...photo,
        calculatedHeight: calculatedHeight + gap,
      };
    });
  }, [photos, itemWidth, gap]);

  // Group photos into rows for virtualization
  const photoRows = useMemo(() => {
    const rows: PhotoItem[][] = [];
    for (let i = 0; i < photoWithCalculatedHeights.length; i += columns) {
      rows.push(photoWithCalculatedHeights.slice(i, i + columns));
    }
    return rows;
  }, [photoWithCalculatedHeights, columns]);

  // Calculate row heights (use max height in each row)
  const rowHeights = useMemo(() => {
    return photoRows.map((row) =>
      Math.max(...row.map((photo) => photo.calculatedHeight || itemHeight)),
    );
  }, [photoRows, itemHeight]);

  // Virtual scrolling with dynamic row heights
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    let currentHeight = 0;
    let visibleStart = -1;
    let visibleEnd = -1;

    for (let i = 0; i < rowHeights.length; i++) {
      const rowHeight = rowHeights[i];

      if (visibleStart === -1 && currentHeight + rowHeight >= scrollTop) {
        visibleStart = Math.max(0, i - 1); // Overscan
      }

      if (visibleEnd === -1 && currentHeight >= scrollTop + containerHeight) {
        visibleEnd = Math.min(rowHeights.length, i + 2); // Overscan
        break;
      }

      currentHeight += rowHeight;
    }

    if (visibleEnd === -1) {
      visibleEnd = rowHeights.length;
    }

    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);
    const offsetY = rowHeights
      .slice(0, visibleStart)
      .reduce((sum, height) => sum + height, 0);

    return {
      startIndex: visibleStart,
      endIndex: visibleEnd,
      totalHeight,
      offsetY,
    };
  }, [scrollTop, containerHeight, rowHeights]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      logMetric('scrollPosition', newScrollTop);
    },
    [logMetric],
  );

  // Selection handlers
  const handlePhotoSelect = useCallback(
    (photoId: string) => {
      onPhotoSelect?.(photoId);
    },
    [onPhotoSelect],
  );

  const handleSelectAll = useCallback(() => {
    const allPhotoIds = photos.map((p) => p.id);
    onBulkSelect?.(allPhotoIds);
  }, [photos, onBulkSelect]);

  const handleDeselectAll = useCallback(() => {
    onBulkSelect?.([]);
  }, [onBulkSelect]);

  const handleBulkAction = useCallback(
    (action: string) => {
      console.log(
        `Bulk action: ${action} on ${selectedPhotoIds.length} photos`,
      );
      // Implementation would depend on specific action
    },
    [selectedPhotoIds],
  );

  // Load more handler
  const handleLoadMore = useCallback(async () => {
    if (!loading && hasMore && onLoadMore) {
      await onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  const visibleRows = photoRows.slice(startIndex, endIndex);

  return (
    <div className={`w-full ${className}`} data-testid={testId}>
      {/* Bulk selection toolbar */}
      {showSelection && (
        <BulkSelectionToolbar
          selectedCount={selectedPhotoIds.length}
          totalCount={photos.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkAction={handleBulkAction}
        />
      )}

      {/* Virtual grid container */}
      <div
        ref={containerRef}
        className="relative overflow-auto border border-gray-200 rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
        data-testid="virtual-photo-grid-container"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              width: '100%',
            }}
          >
            {visibleRows.map((row, rowIndex) => {
              const actualRowIndex = startIndex + rowIndex;
              const rowHeight = rowHeights[actualRowIndex];

              return (
                <div
                  key={actualRowIndex}
                  className="flex"
                  style={{
                    height: rowHeight,
                    marginBottom: gap,
                    padding: `0 ${gap / 2}px`,
                  }}
                >
                  {row.map((photo, photoIndex) => (
                    <PhotoGridItem
                      key={photo.id}
                      photo={photo}
                      index={actualRowIndex * columns + photoIndex}
                      selected={selectedPhotoIds.includes(photo.id)}
                      showSelection={showSelection}
                      onSelect={handlePhotoSelect}
                      itemWidth={itemWidth}
                      gap={gap}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Infinite scroll trigger */}
        {hasMore && (
          <InfiniteScrollTrigger
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            loading={loading}
          />
        )}
      </div>

      {/* Performance metrics (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500">
          Visible: {startIndex}-{endIndex} of {photoRows.length} rows (
          {photos.length} photos)
        </div>
      )}
    </div>
  );
};

export default VirtualPhotoGrid;
