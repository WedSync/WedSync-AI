'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  'data-testid'?: string;
}

export const VirtualizedList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor = (_, index) => index.toString(),
  overscan = 3,
  onScroll,
  className = '',
  'data-testid': testId,
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Memoized calculations for performance
  const virtualizedData = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length,
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length, visibleEnd + overscan);

    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      startIndex,
      endIndex,
      totalHeight,
      offsetY,
    };
  }, [scrollTop, itemHeight, containerHeight, items, overscan]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll],
  );

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const currentScrollTop = scrollElementRef.current?.scrollTop || 0;
      let newScrollTop = currentScrollTop;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          newScrollTop = Math.min(
            currentScrollTop + itemHeight,
            virtualizedData.totalHeight - containerHeight,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          newScrollTop = Math.max(currentScrollTop - itemHeight, 0);
          break;
        case 'PageDown':
          e.preventDefault();
          newScrollTop = Math.min(
            currentScrollTop + containerHeight,
            virtualizedData.totalHeight - containerHeight,
          );
          break;
        case 'PageUp':
          e.preventDefault();
          newScrollTop = Math.max(currentScrollTop - containerHeight, 0);
          break;
        case 'Home':
          e.preventDefault();
          newScrollTop = 0;
          break;
        case 'End':
          e.preventDefault();
          newScrollTop = virtualizedData.totalHeight - containerHeight;
          break;
        default:
          return;
      }

      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = newScrollTop;
      }
    },
    [itemHeight, containerHeight, virtualizedData.totalHeight],
  );

  // Performance optimization: Use RAF for smooth scrolling
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      // Animation frame logic can be added here for smooth scrolling
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className={`relative focus:outline-none ${className}`}
      style={{ height: containerHeight }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid={testId || 'virtual-list'}
    >
      <div
        ref={scrollElementRef}
        className="h-full overflow-auto"
        onScroll={handleScroll}
        style={{ height: containerHeight }}
      >
        <div
          style={{
            height: virtualizedData.totalHeight,
            position: 'relative',
            // Ensure smooth scrolling on iOS
            WebkitOverflowScrolling: 'touch',
            // Promote to GPU layer for better performance
            willChange: 'transform',
          }}
        >
          <div
            style={{
              // Use transform3d for hardware acceleration - CRITICAL for mobile performance
              transform: `translate3d(0, ${virtualizedData.offsetY}px, 0)`,
              willChange: 'transform', // Hint to browser for optimization
            }}
          >
            {virtualizedData.visibleItems.map((item, virtualIndex) => {
              const actualIndex = virtualizedData.startIndex + virtualIndex;
              const key = keyExtractor(item, actualIndex);

              return (
                <div
                  key={key}
                  style={{
                    height: itemHeight,
                    // Ensure each item doesn't cause layout thrashing
                    contain: 'layout style size',
                  }}
                  className="w-full"
                >
                  {renderItem(item, actualIndex)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoized version for even better performance
export const MemoizedVirtualizedList = React.memo(
  VirtualizedList,
) as typeof VirtualizedList;

// Hook for virtualization calculations
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan = 3,
) => {
  return useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      itemCount,
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount, visibleEnd + overscan);

    return {
      startIndex,
      endIndex,
      visibleStart,
      visibleEnd,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
};

export default MemoizedVirtualizedList;
