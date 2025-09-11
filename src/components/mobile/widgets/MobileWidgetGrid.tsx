'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, List, Maximize2, Minimize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Widget {
  id: string;
  component: React.ComponentType<any>;
  props: any;
  title: string;
  priority: number;
  category: 'schedule' | 'tasks' | 'stats' | 'activity' | 'weather' | 'vendor';
  minHeight?: number;
  supportsCompact: boolean;
}

interface MobileWidgetGridProps {
  widgets: Widget[];
  className?: string;
  initialLayout?: 'grid' | 'list';
  onLayoutChange?: (layout: 'grid' | 'list') => void;
}

export function MobileWidgetGrid({
  widgets,
  className,
  initialLayout = 'grid',
  onLayoutChange,
}: MobileWidgetGridProps) {
  const [layout, setLayout] = useState<'grid' | 'list'>(initialLayout);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCompact, setIsCompact] = useState(true);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Sort widgets by priority
  const sortedWidgets = [...widgets].sort((a, b) => a.priority - b.priority);

  // Pagination for mobile - 4 widgets per page in grid, 6 in list
  const widgetsPerPage = layout === 'grid' ? 4 : 6;
  const totalPages = Math.ceil(sortedWidgets.length / widgetsPerPage);
  const startIndex = currentPage * widgetsPerPage;
  const currentWidgets = sortedWidgets.slice(
    startIndex,
    startIndex + widgetsPerPage,
  );

  const handleLayoutChange = (newLayout: 'grid' | 'list') => {
    setLayout(newLayout);
    setCurrentPage(0); // Reset to first page
    onLayoutChange?.(newLayout);
  };

  const handleWidgetExpand = (widgetId: string) => {
    setExpandedWidget(expandedWidget === widgetId ? null : widgetId);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }

    if (isRightSwipe && currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Auto-compact on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsCompact(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderWidget = (widget: Widget, index: number) => {
    const isExpanded = expandedWidget === widget.id;
    const shouldUseCompact = isCompact && !isExpanded && widget.supportsCompact;

    const WidgetComponent = widget.component;

    return (
      <div
        key={widget.id}
        className={cn(
          'relative transition-all duration-300 ease-in-out',
          layout === 'grid'
            ? isExpanded
              ? 'col-span-2 row-span-2'
              : 'col-span-1'
            : 'w-full',
          isExpanded && 'z-10',
        )}
        style={{
          minHeight:
            widget.minHeight || (layout === 'grid' ? '160px' : '120px'),
          height: isExpanded ? 'auto' : undefined,
        }}
      >
        <Card
          className={cn(
            'h-full relative overflow-hidden',
            'hover:shadow-md transition-shadow duration-200',
            isExpanded && 'shadow-lg ring-2 ring-blue-500',
          )}
        >
          {/* Widget header with expand/collapse */}
          <div className="absolute top-2 right-2 z-20">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-white/80 backdrop-blur-sm"
              onClick={() => handleWidgetExpand(widget.id)}
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          </div>

          {/* Widget content */}
          <WidgetComponent
            {...widget.props}
            compact={shouldUseCompact}
            className="h-full"
          />
        </Card>
      </div>
    );
  };

  return (
    <div className={cn('w-full h-full', className)}>
      {/* Header controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          <Button
            variant={layout === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLayoutChange('grid')}
            className="h-8"
          >
            <Grid className="w-4 h-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={layout === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLayoutChange('list')}
            className="h-8"
          >
            <List className="w-4 h-4 mr-1" />
            List
          </Button>
        </div>

        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentPage ? 'bg-blue-500' : 'bg-gray-300',
                )}
                onClick={() => setCurrentPage(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Widget container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'touch-pan-y select-none',
          layout === 'grid'
            ? 'grid grid-cols-2 gap-3 auto-rows-min'
            : 'flex flex-col space-y-3',
          'min-h-0 overflow-hidden',
        )}
      >
        {currentWidgets.map((widget, index) => renderWidget(widget, index))}
      </div>

      {/* Swipe hint for first time users */}
      {totalPages > 1 && currentPage === 0 && (
        <div className="text-center mt-4 px-4">
          <p className="text-xs text-gray-500">← Swipe to see more widgets →</p>
        </div>
      )}

      {/* Touch performance optimizations */}
      <style jsx>{`
        .touch-pan-y {
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
}

// Helper hook for managing widget state
export function useWidgetGrid(initialWidgets: Widget[]) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id ? { ...widget, ...updates } : widget,
      ),
    );
  };

  const reorderWidgets = (startIndex: number, endIndex: number) => {
    setWidgets((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  return {
    widgets,
    layout,
    setLayout,
    updateWidget,
    reorderWidgets,
  };
}
