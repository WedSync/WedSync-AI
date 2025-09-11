'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  CopyIcon,
  ShareIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MoreHorizontalIcon,
  SendIcon,
  BookmarkIcon,
  ClockIcon,
  BarChart3Icon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useHapticFeedback,
  useSwipeGesture,
  useLongPress,
  SwipeableCard,
  BottomSheet,
} from '@/components/mobile/MobileEnhancedFeatures';

// Types
interface EmailTemplate {
  id: string;
  subject: string;
  content: string;
  tone: 'professional' | 'friendly' | 'warm' | 'urgent';
  stage: 'inquiry' | 'booking' | 'pre-wedding' | 'post-wedding';
  confidence: number;
  wordCount: number;
  estimatedReadTime: string;
}

interface TouchOptimizedVariantSelectorProps {
  templates: EmailTemplate[];
  onTemplateSelect: (template: EmailTemplate) => void;
  onTemplateEdit: (template: EmailTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

interface PinchZoomState {
  scale: number;
  isPinching: boolean;
  initialDistance: number;
}

// Pinch-to-zoom hook for preview text
function usePinchZoom(minScale: number = 0.8, maxScale: number = 2.0) {
  const [zoomState, setZoomState] = useState<PinchZoomState>({
    scale: 1,
    isPinching: false,
    initialDistance: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );

      setZoomState((prev) => ({
        ...prev,
        isPinching: true,
        initialDistance: distance,
      }));
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && zoomState.isPinching) {
        e.preventDefault();

        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );

        const scaleChange = currentDistance / zoomState.initialDistance;
        const newScale = Math.max(
          minScale,
          Math.min(maxScale, zoomState.scale * scaleChange),
        );

        setZoomState((prev) => ({
          ...prev,
          scale: newScale,
          initialDistance: currentDistance,
        }));
      }
    },
    [
      zoomState.isPinching,
      zoomState.initialDistance,
      zoomState.scale,
      minScale,
      maxScale,
    ],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setZoomState((prev) => ({
        ...prev,
        isPinching: false,
        initialDistance: 0,
      }));
    }
  }, []);

  const resetZoom = useCallback(() => {
    setZoomState((prev) => ({ ...prev, scale: 1 }));
  }, []);

  return {
    scale: zoomState.scale,
    isPinching: zoomState.isPinching,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom,
  };
}

// Virtual scrolling for large template lists
function useVirtualScrolling(
  items: any[],
  itemHeight: number = 200,
  containerHeight: number = 400,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight),
  );

  const visibleItems = items.slice(visibleStart, visibleEnd + 1);

  return {
    visibleItems,
    visibleStart,
    totalHeight: items.length * itemHeight,
    offsetY: visibleStart * itemHeight,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

export function TouchOptimizedVariantSelector({
  templates,
  onTemplateSelect,
  onTemplateEdit,
  selectedTemplateId,
  className,
}: TouchOptimizedVariantSelectorProps) {
  const { toast } = useToast();
  const haptic = useHapticFeedback();

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedForAB, setSelectedForAB] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Pinch zoom for current template
  const pinchZoom = usePinchZoom(0.7, 3.0);

  // Touch target size
  const TOUCH_TARGET_SIZE = 48;

  // Current template
  const currentTemplate = templates[currentIndex];

  // Virtual scrolling for performance
  const virtualScroll = useVirtualScrolling(templates, 250, 500);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      haptic.light();
    }
  }, [currentIndex, haptic]);

  const goToNext = useCallback(() => {
    if (currentIndex < templates.length - 1) {
      setCurrentIndex(currentIndex + 1);
      haptic.light();
    }
  }, [currentIndex, templates.length, haptic]);

  // Swipe navigation
  const swipeHandlers = useSwipeGesture(
    (direction) => {
      if (direction === 'left' && currentIndex < templates.length - 1) {
        goToNext();
      } else if (direction === 'right' && currentIndex > 0) {
        goToPrevious();
      }
    },
    {
      threshold: 50,
      velocity: 0.2,
    },
  );

  // Long press for options menu
  const longPressHandlers = useLongPress(() => {
    setIsDetailViewOpen(true);
    haptic.heavy();
  }, 800);

  // A/B Testing selection
  const toggleABSelection = useCallback(
    (templateId: string) => {
      setSelectedForAB((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(templateId)) {
          newSet.delete(templateId);
        } else {
          if (newSet.size < 3) {
            // Max 3 for A/B/C testing
            newSet.add(templateId);
          } else {
            toast({
              title: 'Maximum 3 templates',
              description: 'Select up to 3 templates for A/B testing',
            });
          }
        }
        return newSet;
      });
      haptic.light();
    },
    [toast, haptic],
  );

  // Double tap to quick select
  const handleDoubleClick = useCallback(() => {
    if (currentTemplate) {
      onTemplateSelect(currentTemplate);
      haptic.success();
      toast({ title: `Selected: ${currentTemplate.subject}` });
    }
  }, [currentTemplate, onTemplateSelect, haptic, toast]);

  // Drag gesture handling for variant selection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setDragOffset(0);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        const offset = currentX - dragStartX;
        setDragOffset(offset);

        // Provide visual feedback at swipe thresholds
        const threshold = 80;
        if (Math.abs(offset) > threshold) {
          haptic.light();
        }
      }
    },
    [isDragging, dragStartX, haptic],
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      const threshold = 100;

      if (dragOffset > threshold && currentIndex > 0) {
        goToPrevious();
      } else if (
        dragOffset < -threshold &&
        currentIndex < templates.length - 1
      ) {
        goToNext();
      }

      setIsDragging(false);
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, currentIndex, goToPrevious, goToNext]);

  // Template confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Template actions
  const templateActions = [
    {
      icon: <EditIcon className="w-5 h-5" />,
      label: 'Edit',
      action: () => {
        onTemplateEdit(currentTemplate);
        haptic.medium();
      },
    },
    {
      icon: <CopyIcon className="w-5 h-5" />,
      label: 'Copy',
      action: () => {
        navigator.clipboard.writeText(
          `${currentTemplate.subject}\n\n${currentTemplate.content}`,
        );
        toast({ title: 'Template copied!' });
        haptic.light();
      },
    },
    {
      icon: <ShareIcon className="w-5 h-5" />,
      label: 'Share',
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: currentTemplate.subject,
            text: currentTemplate.content,
          });
        }
        haptic.light();
      },
    },
    {
      icon: <BookmarkIcon className="w-5 h-5" />,
      label: 'Save',
      action: () => {
        toast({ title: 'Template saved!' });
        haptic.success();
      },
    },
  ];

  if (!currentTemplate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No templates generated yet</p>
      </div>
    );
  }

  return (
    <div className={cn('touch-variant-selector', className)}>
      {/* Header with navigation indicators */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Template {currentIndex + 1} of {templates.length}
          </span>
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getConfidenceColor(currentTemplate.confidence),
            )}
          >
            {Math.round(currentTemplate.confidence * 100)}% confidence
          </div>
        </div>

        <button
          onClick={() => toggleABSelection(currentTemplate.id)}
          className={cn(
            'p-2 rounded-lg transition-all active:scale-95',
            selectedForAB.has(currentTemplate.id)
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600',
            `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
          )}
        >
          <BarChart3Icon className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center space-x-2 mb-6">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              haptic.light();
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex ? 'bg-blue-600' : 'bg-gray-300',
              `min-w-[${TOUCH_TARGET_SIZE - 32}px] min-h-[${TOUCH_TARGET_SIZE - 32}px]`,
            )}
          />
        ))}
      </div>

      {/* Main template card with swipe gestures */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl"
        {...swipeHandlers}
        {...longPressHandlers}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <SwipeableCard
          leftAction={{
            icon: <ChevronLeftIcon className="w-6 h-6" />,
            color: 'bg-blue-500',
            onAction: goToPrevious,
            label: 'Previous',
          }}
          rightAction={{
            icon: <ChevronRightIcon className="w-6 h-6" />,
            color: 'bg-blue-500',
            onAction: goToNext,
            label: 'Next',
          }}
          className="bg-white border border-gray-200 shadow-sm"
        >
          <div
            className="p-6 space-y-4"
            style={{
              transform: `translateX(${dragOffset}px) scale(${pinchZoom.scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
            }}
            {...pinchZoom}
          >
            {/* Subject Line */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Subject Line
              </label>
              <h3 className="text-lg font-semibold text-gray-900 mt-1">
                {currentTemplate.subject}
              </h3>
            </div>

            {/* Template Metadata */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{currentTemplate.estimatedReadTime}</span>
              </div>
              <div>{currentTemplate.wordCount} words</div>
              <div className="capitalize">{currentTemplate.tone} tone</div>
            </div>

            {/* Email Content */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Email Content
              </label>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {currentTemplate.content}
                </p>
              </div>
            </div>

            {/* Zoom hint */}
            {pinchZoom.scale !== 1 && (
              <div className="flex justify-center">
                <button
                  onClick={pinchZoom.resetZoom}
                  className="text-xs text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full"
                >
                  Reset Zoom ({Math.round(pinchZoom.scale * 100)}%)
                </button>
              </div>
            )}
          </div>
        </SwipeableCard>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {templateActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={cn(
              'flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg',
              'transition-all active:scale-95 active:bg-gray-100',
              `min-h-[${TOUCH_TARGET_SIZE + 16}px]`,
            )}
          >
            {action.icon}
            <span className="text-xs font-medium text-gray-700 mt-2">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Primary Action */}
      <button
        onClick={() => {
          onTemplateSelect(currentTemplate);
          haptic.success();
        }}
        className={cn(
          'w-full mt-6 py-4 bg-blue-600 text-white rounded-lg font-semibold',
          'transition-all active:scale-98 flex items-center justify-center space-x-2',
          `min-h-[${TOUCH_TARGET_SIZE + 8}px]`,
        )}
      >
        <SendIcon className="w-5 h-5" />
        <span>Use This Template</span>
      </button>

      {/* A/B Testing Selection Display */}
      {selectedForAB.size > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              A/B Testing: {selectedForAB.size} template
              {selectedForAB.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => {
                setSelectedForAB(new Set());
                haptic.light();
              }}
              className="text-blue-600 p-1"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Usage Hints */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
        <p>
          💡 <strong>Tip:</strong> Swipe left/right to navigate, long press for
          options
        </p>
        <p>
          🔍 <strong>Zoom:</strong> Pinch to zoom in/out on template content
        </p>
        <p>
          ⚡ <strong>Quick select:</strong> Double tap to use template
          immediately
        </p>
      </div>

      {/* Detail View Bottom Sheet */}
      <BottomSheet
        isOpen={isDetailViewOpen}
        onClose={() => setIsDetailViewOpen(false)}
        snapPoints={[0.5, 0.8, 0.95]}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Template Details</h2>
            <button
              onClick={() => setIsDetailViewOpen(false)}
              className="p-2 rounded-lg bg-gray-100"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Detailed template information */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">
                {currentTemplate.subject}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getConfidenceColor(currentTemplate.confidence),
                  )}
                >
                  {Math.round(currentTemplate.confidence * 100)}% Confidence
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                  {currentTemplate.tone}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                  {currentTemplate.stage}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {currentTemplate.content}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  onTemplateEdit(currentTemplate);
                  setIsDetailViewOpen(false);
                }}
                className={cn(
                  'py-3 bg-blue-600 text-white rounded-lg font-medium',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              >
                Edit Template
              </button>
              <button
                onClick={() => {
                  onTemplateSelect(currentTemplate);
                  setIsDetailViewOpen(false);
                }}
                className={cn(
                  'py-3 bg-green-600 text-white rounded-lg font-medium',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
