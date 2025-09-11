'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
// useDragControls // useDragControls removed - use onDrag props
import { TaskCategory } from '@/types/task-categories';
import { cn } from '@/lib/utils';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface TouchDragDropCategoriesProps {
  categories: TaskCategory[];
  onReorder: (categories: TaskCategory[]) => void;
  onCategorySelect?: (category: TaskCategory) => void;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  targetIndex: number | null;
  initialY: number;
  currentY: number;
}

export default function TouchDragDropCategories({
  categories: initialCategories,
  onReorder,
  onCategorySelect,
  className,
}: TouchDragDropCategoriesProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    targetIndex: null,
    initialY: 0,
    currentY: 0,
  });

  const dragControls = useDragControls();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hapticTriggered = useRef(false);

  // Update categories when props change
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Handle reorder with haptic feedback
  const handleReorder = useCallback(
    (newOrder: TaskCategory[]) => {
      setCategories(newOrder);
      triggerHaptic(10);
      onReorder(newOrder);
    },
    [onReorder, triggerHaptic],
  );

  // Handle touch start for drag handle
  const handleDragStart = useCallback(
    (index: number, event: React.TouchEvent | React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const touch = 'touches' in event ? event.touches[0] : event;

      setDragState({
        isDragging: true,
        draggedIndex: index,
        targetIndex: index,
        initialY: touch.clientY,
        currentY: touch.clientY,
      });

      // Strong haptic for drag start
      triggerHaptic([50, 30, 50]);
      hapticTriggered.current = true;

      // Add global touch listeners
      if ('touches' in event) {
        document.addEventListener('touchmove', handleTouchMove as any);
        document.addEventListener('touchend', handleTouchEnd as any);
      } else {
        document.addEventListener('mousemove', handleTouchMove as any);
        document.addEventListener('mouseup', handleTouchEnd as any);
      }
    },
    [triggerHaptic],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (event: TouchEvent | MouseEvent) => {
      if (!dragState.isDragging || dragState.draggedIndex === null) return;

      const touch = 'touches' in event ? event.touches[0] : event;
      const currentY = touch.clientY;

      // Calculate which item we're over
      const draggedElement = itemRefs.current[dragState.draggedIndex];
      if (!draggedElement) return;

      const itemHeight = draggedElement.offsetHeight;
      const deltaY = currentY - dragState.initialY;
      const itemsMoved = Math.round(deltaY / itemHeight);
      const newTargetIndex = Math.max(
        0,
        Math.min(categories.length - 1, dragState.draggedIndex + itemsMoved),
      );

      // Trigger haptic when crossing boundaries
      if (
        newTargetIndex !== dragState.targetIndex &&
        !hapticTriggered.current
      ) {
        triggerHaptic(10);
        hapticTriggered.current = true;

        // Reset haptic trigger after a short delay
        setTimeout(() => {
          hapticTriggered.current = false;
        }, 100);
      }

      setDragState((prev) => ({
        ...prev,
        currentY,
        targetIndex: newTargetIndex,
      }));

      // Visual feedback for target position
      itemRefs.current.forEach((ref, idx) => {
        if (!ref) return;

        if (idx === dragState.draggedIndex) {
          ref.style.opacity = '0.5';
          ref.style.transform = `translateY(${deltaY}px) scale(1.05)`;
          ref.style.zIndex = '100';
        } else if (idx === newTargetIndex) {
          ref.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
        } else {
          ref.style.backgroundColor = '';
        }
      });
    },
    [dragState, categories.length, triggerHaptic],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (
      !dragState.isDragging ||
      dragState.draggedIndex === null ||
      dragState.targetIndex === null
    )
      return;

    // Perform the reorder
    if (dragState.draggedIndex !== dragState.targetIndex) {
      const newCategories = [...categories];
      const [removed] = newCategories.splice(dragState.draggedIndex, 1);
      newCategories.splice(dragState.targetIndex, 0, removed);

      handleReorder(newCategories);

      // Success haptic
      triggerHaptic([20, 10, 20]);
    }

    // Reset visual states
    itemRefs.current.forEach((ref) => {
      if (!ref) return;
      ref.style.opacity = '';
      ref.style.transform = '';
      ref.style.zIndex = '';
      ref.style.backgroundColor = '';
    });

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      initialY: 0,
      currentY: 0,
    });

    // Remove global listeners
    document.removeEventListener('touchmove', handleTouchMove as any);
    document.removeEventListener('touchend', handleTouchEnd as any);
    document.removeEventListener('mousemove', handleTouchMove as any);
    document.removeEventListener('mouseup', handleTouchEnd as any);
  }, [dragState, categories, handleReorder, triggerHaptic, handleTouchMove]);

  // Handle long press to enable drag mode
  const handleLongPress = useCallback(
    (index: number) => {
      longPressTimer.current = setTimeout(() => {
        triggerHaptic([100, 50, 100]);
        // Could enable a special drag mode here
      }, 500);
    },
    [triggerHaptic],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div ref={listRef} className={cn('space-y-2', className)}>
      <Reorder.Group
        axis="y"
        values={categories}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {categories.map((category, index) => (
          <Reorder.Item
            key={category.id}
            value={category}
            dragListener={false}
            dragControls={dragControls}
            className="touch-manipulation"
          >
            <motion.div
              ref={(el) => (itemRefs.current[index] = el)}
              className={cn(
                'flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-3',
                'transition-all duration-200 cursor-move select-none',
                dragState.draggedIndex === index && 'shadow-lg',
              )}
              whileTap={{ scale: 0.98 }}
              onTouchStart={() => handleLongPress(index)}
              onTouchEnd={cancelLongPress}
              onMouseDown={() => handleLongPress(index)}
              onMouseUp={cancelLongPress}
              onClick={() => onCategorySelect?.(category)}
            >
              {/* Drag Handle */}
              <button
                className="p-2 -m-2 mr-3 touch-manipulation cursor-grab active:cursor-grabbing"
                onTouchStart={(e) => handleDragStart(index, e)}
                onMouseDown={(e) => handleDragStart(index, e)}
                onClick={(e) => e.stopPropagation()}
              >
                <Bars3Icon className="w-5 h-5 text-gray-400" />
              </button>

              {/* Category Info */}
              <div
                className="flex-1 flex items-center space-x-3"
                style={{
                  borderLeftColor: category.color,
                  borderLeftWidth: '3px',
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {category.display_name}
                  </h4>
                  {category.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Sort Order Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 font-mono">
                  #{index + 1}
                </span>
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Drag Indicator Overlay */}
      {dragState.isDragging && dragState.targetIndex !== null && (
        <motion.div
          className="fixed inset-x-4 bg-purple-500 h-1 rounded-full z-50"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.5,
            top: itemRefs.current[dragState.targetIndex]?.offsetTop || 0,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </div>
  );
}
