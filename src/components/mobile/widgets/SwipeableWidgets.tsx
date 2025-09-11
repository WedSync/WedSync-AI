'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeableWidget {
  id: string;
  component: React.ComponentType<any>;
  props: any;
  title: string;
  category: string;
}

interface SwipeableWidgetsProps {
  widgets: SwipeableWidget[];
  className?: string;
  showNavigation?: boolean;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export function SwipeableWidgets({
  widgets,
  className,
  showNavigation = true,
  autoScroll = false,
  autoScrollInterval = 5000,
}: SwipeableWidgetsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const autoScrollTimer = useRef<NodeJS.Timeout>();

  const totalWidgets = widgets.length;

  // Auto-scroll functionality
  useEffect(() => {
    if (autoScroll && !isDragging && totalWidgets > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalWidgets);
      }, autoScrollInterval);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
        }
      };
    }
  }, [autoScroll, autoScrollInterval, totalWidgets, isDragging]);

  // Navigation functions
  const goToNext = () => {
    if (isTransitioning || totalWidgets <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalWidgets);
  };

  const goToPrevious = () => {
    if (isTransitioning || totalWidgets <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalWidgets) % totalWidgets);
  };

  const goToIndex = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setCurrentIndex(index);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;

    // Clear auto-scroll timer when user interacts
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;

    // Add resistance at boundaries
    const resistance = 0.3;
    const maxDrag = window.innerWidth * 0.3;

    if (containerRef.current) {
      const resistedDiff =
        Math.abs(diff) > maxDrag
          ? Math.sign(diff) *
            (maxDrag + (Math.abs(diff) - maxDrag) * resistance)
          : diff;

      containerRef.current.style.transform = `translateX(${resistedDiff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const diff = currentXRef.current - startXRef.current;
    const threshold = window.innerWidth * 0.2; // 20% of screen width

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) {
        goToPrevious();
      } else if (diff < 0 && currentIndex < totalWidgets - 1) {
        goToNext();
      }
    }

    // Reset transform
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }

    setIsDragging(false);
  };

  // Mouse event handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;

    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    const diff = currentXRef.current - startXRef.current;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) {
        goToPrevious();
      } else if (diff < 0 && currentIndex < totalWidgets - 1) {
        goToNext();
      }
    }

    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }

    setIsDragging(false);
  };

  // Handle transition events
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (totalWidgets === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48', className)}>
        <p className="text-gray-500">No widgets available</p>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {/* Main widget container */}
      <div
        ref={containerRef}
        className="relative w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          display: 'flex',
          width: `${totalWidgets * 100}%`,
        }}
      >
        {widgets.map((widget, index) => {
          const WidgetComponent = widget.component;

          return (
            <div
              key={widget.id}
              className="w-full flex-shrink-0 px-2"
              style={{ width: `${100 / totalWidgets}%` }}
            >
              <Card className="h-full">
                <WidgetComponent {...widget.props} className="h-full" />
              </Card>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {showNavigation && totalWidgets > 1 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm"
            onClick={goToPrevious}
            disabled={isTransitioning}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm"
            onClick={goToNext}
            disabled={isTransitioning}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Dot indicators */}
      {totalWidgets > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {widgets.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentIndex
                  ? 'bg-blue-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400',
              )}
              onClick={() => goToIndex(index)}
              disabled={isTransitioning}
            />
          ))}
        </div>
      )}

      {/* Widget info */}
      <div className="text-center mt-2">
        <p className="text-sm font-medium text-gray-700">
          {widgets[currentIndex]?.title}
        </p>
        <p className="text-xs text-gray-500">
          {currentIndex + 1} of {totalWidgets} •{' '}
          {widgets[currentIndex]?.category}
        </p>
      </div>
    </div>
  );
}

// Performance optimized version for mobile
export function SwipeableWidgetsOptimized({
  widgets,
  className,
  showNavigation = true,
}: Omit<SwipeableWidgetsProps, 'autoScroll' | 'autoScrollInterval'>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Simplified touch handlers for better performance
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance && currentIndex < widgets.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }

    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentWidget = widgets[currentIndex];

  if (!currentWidget) return null;

  const WidgetComponent = currentWidget.component;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full"
      >
        <Card>
          <WidgetComponent {...currentWidget.props} />
        </Card>
      </div>

      {widgets.length > 1 && (
        <div className="flex justify-center mt-3 space-x-1">
          {widgets.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
