'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSwipeNavigation, useHaptic } from '@/hooks/useTouch';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

interface SwipeableNavProps {
  items: NavItem[];
  className?: string;
  showIndicators?: boolean;
  enableSwipe?: boolean;
  enableHaptic?: boolean;
}

export function SwipeableNav({
  items,
  className,
  showIndicators = true,
  enableSwipe = true,
  enableHaptic = true,
}: SwipeableNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const haptic = useHaptic();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find current index based on pathname
  useEffect(() => {
    const index = items.findIndex((item) => item.path === pathname);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [pathname, items]);

  const navigateToIndex = (index: number) => {
    if (index < 0 || index >= items.length || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentIndex(index);

    if (enableHaptic) {
      haptic.light();
    }

    router.push(items[index].path);

    setTimeout(() => setIsTransitioning(false), 300);
  };

  const swipeHandlers = useSwipeNavigation({
    threshold: 50,
    velocity: 0.3,
    onSwipeLeft: () => {
      if (currentIndex < items.length - 1) {
        navigateToIndex(currentIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        navigateToIndex(currentIndex - 1);
      }
    },
  });

  return (
    <div className={cn('relative w-full', className)}>
      {/* Swipeable content area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        {...(enableSwipe ? swipeHandlers : {})}
      >
        {/* Navigation breadcrumb */}
        <div className="flex items-center justify-between mb-4 px-4">
          <button
            onClick={() => navigateToIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || isTransitioning}
            className={cn(
              'p-3 rounded-full transition-all',
              'min-w-[44px] min-h-[44px]', // Touch target size
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-gray-100 active:bg-gray-200',
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {items[currentIndex]?.label}
            </h2>
            <p className="text-sm text-gray-500">
              {currentIndex + 1} of {items.length}
            </p>
          </div>

          <button
            onClick={() => navigateToIndex(currentIndex + 1)}
            disabled={currentIndex === items.length - 1 || isTransitioning}
            className={cn(
              'p-3 rounded-full transition-all',
              'min-w-[44px] min-h-[44px]', // Touch target size
              currentIndex === items.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-gray-100 active:bg-gray-200',
            )}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Swipe hint */}
        {enableSwipe && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 text-xs text-gray-400">
            <ChevronLeft className="w-3 h-3" />
            <span>Swipe to navigate</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {showIndicators && items.length > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {items.map((item, index) => (
            <button
              key={item.path}
              onClick={() => navigateToIndex(index)}
              disabled={isTransitioning}
              className={cn(
                'transition-all duration-200',
                'min-w-[44px] min-h-[44px] p-3', // Touch target size
                index === currentIndex
                  ? 'bg-primary-600'
                  : 'bg-gray-300 hover:bg-gray-400',
              )}
              style={{
                width: index === currentIndex ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
              }}
              aria-label={`Go to ${item.label}`}
            />
          ))}
        </div>
      )}

      {/* Tab navigation alternative for larger screens */}
      <div className="hidden md:flex justify-center mt-6 border-b border-gray-200">
        {items.map((item, index) => (
          <button
            key={item.path}
            onClick={() => navigateToIndex(index)}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-all',
              'min-h-[48px]', // Touch target size
              index === currentIndex
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
