import { useState, useEffect, useRef, useCallback } from 'react';
import { Guest } from '@/types/guest-management';

interface UseVirtualScrollingProps {
  items: Guest[];
  itemHeight: number;
  containerHeight: number;
  enabled: boolean;
}

interface UseVirtualScrollingReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  visibleItems: Guest[];
  totalHeight: number;
  scrollToItem: (index: number) => void;
}

export function useVirtualScrolling({
  items,
  itemHeight,
  containerHeight,
  enabled,
}: UseVirtualScrollingProps): UseVirtualScrollingReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleItems, setVisibleItems] = useState<Guest[]>([]);

  const totalHeight = items.length * itemHeight;

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length,
  );

  const scrollToItem = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight],
  );

  useEffect(() => {
    if (!enabled) {
      setVisibleItems(items);
      return;
    }

    const newVisibleItems = items.slice(startIndex, endIndex);
    setVisibleItems(newVisibleItems);
  }, [enabled, items, startIndex, endIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [enabled]);

  return {
    containerRef,
    visibleItems: enabled ? visibleItems : items,
    totalHeight: enabled ? totalHeight : 0,
    scrollToItem,
  };
}
