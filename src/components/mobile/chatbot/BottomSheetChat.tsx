/**
 * WS-243 Bottom Sheet Chat Component
 * Team D - Mobile-First Draggable Chat Interface
 *
 * CORE FEATURES:
 * - Draggable bottom sheet with smooth animations
 * - Three states: half-screen, full-screen, minimized
 * - Keyboard-aware height adjustments
 * - Touch-friendly drag handles and gestures
 * - iOS Safari viewport handling
 * - Performance optimized animations at 60fps
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, PanInfo } from 'framer-motion';
// useMotionValue // useMotionValue removed - use useState
// useTransform // useTransform removed - use useState/useEffect
import { Minus } from 'lucide-react';

/**
 * Bottom sheet states
 */
export type BottomSheetState = 'hidden' | 'minimized' | 'half' | 'full';

/**
 * Bottom sheet chat props
 */
export interface BottomSheetChatProps {
  children: React.ReactNode;
  isVisible: boolean;
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
  onClose: () => void;

  // Mobile-specific props
  initialHeight?: number;
  maxHeight?: number;
  keyboardHeight?: number;
  keyboardAdjustment?: boolean;

  // Drag handling
  onDrag?: (event: any, info: PanInfo) => void;
  dragThreshold?: number;

  // Styling
  className?: string;
  backdropClassName?: string;

  // Accessibility
  ariaLabel?: string;
}

/**
 * Bottom Sheet Chat Component
 */
export function BottomSheetChat({
  children,
  isVisible,
  state,
  onStateChange,
  onClose,
  initialHeight = 400,
  maxHeight,
  keyboardHeight = 0,
  keyboardAdjustment = true,
  onDrag,
  dragThreshold = 100,
  className,
  backdropClassName,
  ariaLabel = 'Chat interface',
}: BottomSheetChatProps) {
  // Refs
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Motion values for smooth drag interactions
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 200], [1, 0]);

  // Calculate heights for different states
  const getHeightForState = useCallback(
    (currentState: BottomSheetState): number => {
      const viewportHeight = window.innerHeight;
      const adjustedHeight = keyboardAdjustment
        ? viewportHeight - keyboardHeight
        : viewportHeight;

      switch (currentState) {
        case 'full':
          return maxHeight
            ? Math.min(maxHeight, adjustedHeight - 60)
            : adjustedHeight - 60;
        case 'half':
          return Math.min(initialHeight, adjustedHeight * 0.6);
        case 'minimized':
          return 0;
        case 'hidden':
        default:
          return 0;
      }
    },
    [initialHeight, maxHeight, keyboardHeight, keyboardAdjustment],
  );

  // Handle drag end with velocity-based state changes
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const { offset, velocity } = info;
      const currentHeight = getHeightForState(state);

      // Call parent drag handler if provided
      if (onDrag) {
        onDrag(event, info);
        return;
      }

      // Velocity-based state changes (iOS-style behavior)
      if (Math.abs(velocity.y) > 500) {
        if (velocity.y > 0) {
          // Fast swipe down
          if (state === 'full') {
            onStateChange('half');
          } else if (state === 'half') {
            onStateChange('minimized');
          }
        } else {
          // Fast swipe up
          if (state === 'minimized') {
            onStateChange('half');
          } else if (state === 'half') {
            onStateChange('full');
          }
        }
      } else {
        // Distance-based state changes
        const dragRatio = offset.y / currentHeight;

        if (dragRatio > 0.3) {
          // Dragged down significantly
          if (state === 'full') {
            onStateChange('half');
          } else if (state === 'half') {
            onStateChange('minimized');
          }
        } else if (dragRatio < -0.3) {
          // Dragged up significantly
          if (state === 'minimized') {
            onStateChange('half');
          } else if (state === 'half') {
            onStateChange('full');
          }
        }
      }

      // Reset motion value
      y.set(0);
    },
    [state, onStateChange, onDrag, getHeightForState, y],
  );

  // Handle backdrop click to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  // Prevent body scroll when sheet is visible
  useEffect(() => {
    if (isVisible && (state === 'half' || state === 'full')) {
      document.body.style.overflow = 'hidden';
      // iOS Safari fix
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;

      return () => {
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      };
    }
  }, [isVisible, state]);

  // Auto-resize on keyboard show/hide
  useEffect(() => {
    if (keyboardAdjustment && sheetRef.current && keyboardHeight > 0) {
      const newHeight = getHeightForState(state);
      sheetRef.current.style.height = `${newHeight}px`;
    }
  }, [keyboardHeight, keyboardAdjustment, state, getHeightForState]);

  if (!isVisible) return null;

  const currentHeight = getHeightForState(state);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: state === 'full' ? 0.4 : 0.2 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        className={cn(
          'fixed inset-0 bg-black pointer-events-auto',
          backdropClassName,
        )}
        style={{ zIndex: 40 }}
      />

      {/* Bottom Sheet */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 200 }}
        dragElastic={{ top: 0, bottom: 0.2 }}
        onDragEnd={handleDragEnd}
        initial={{ y: currentHeight }}
        animate={{
          y: 0,
          height: currentHeight,
        }}
        exit={{ y: currentHeight }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 200,
          duration: 0.3,
        }}
        style={{
          y,
          opacity,
        }}
        className={cn(
          'fixed bottom-0 left-0 right-0 pointer-events-auto',
          'bg-white rounded-t-xl shadow-2xl',
          'border border-gray-200',
          'flex flex-col',
          'overflow-hidden',
          // Safe area insets for iOS
          'pb-safe',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          zIndex: 50,
          willChange: 'transform, height',
          // Hardware acceleration
          transform: 'translateZ(0)',
        }}
      >
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          className={cn(
            'flex justify-center items-center py-2 px-4',
            'bg-white rounded-t-xl',
            'cursor-grab active:cursor-grabbing',
            // Touch target size (minimum 48px)
            'min-h-[48px]',
          )}
          role="button"
          tabIndex={0}
          aria-label="Drag to resize chat"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Toggle between half and full on Enter/Space
              onStateChange(state === 'half' ? 'full' : 'half');
            }
          }}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Sheet Content */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            // Ensure proper height calculation
            height: `${currentHeight - 48}px`, // Subtract drag handle height
          }}
        >
          {children}
        </div>

        {/* iOS Safe Area Bottom Padding */}
        <div className="h-safe-bottom bg-white" />
      </motion.div>
    </>
  );
}

/**
 * Hook to get bottom sheet heights for different states
 */
export function useBottomSheetHeights(
  initialHeight: number = 400,
  maxHeight?: number,
  keyboardHeight: number = 0,
) {
  const getHeights = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const adjustedHeight = viewportHeight - keyboardHeight;

    return {
      full: maxHeight
        ? Math.min(maxHeight, adjustedHeight - 60)
        : adjustedHeight - 60,
      half: Math.min(initialHeight, adjustedHeight * 0.6),
      minimized: 0,
      hidden: 0,
    };
  }, [initialHeight, maxHeight, keyboardHeight]);

  return getHeights();
}

/**
 * Hook for bottom sheet drag behaviors
 */
export function useBottomSheetDrag(
  state: BottomSheetState,
  onStateChange: (state: BottomSheetState) => void,
  threshold: number = 100,
) {
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const { offset, velocity } = info;

      // Velocity-based transitions (feels more natural on mobile)
      if (Math.abs(velocity.y) > 500) {
        if (velocity.y > 0 && state === 'full') {
          onStateChange('half');
        } else if (velocity.y > 0 && state === 'half') {
          onStateChange('minimized');
        } else if (velocity.y < 0 && state === 'half') {
          onStateChange('full');
        } else if (velocity.y < 0 && state === 'minimized') {
          onStateChange('half');
        }
        return;
      }

      // Distance-based transitions
      if (Math.abs(offset.y) > threshold) {
        if (offset.y > 0 && state === 'full') {
          onStateChange('half');
        } else if (offset.y > 0 && state === 'half') {
          onStateChange('minimized');
        } else if (offset.y < 0 && state === 'half') {
          onStateChange('full');
        } else if (offset.y < 0 && state === 'minimized') {
          onStateChange('half');
        }
      }
    },
    [state, onStateChange, threshold],
  );

  return { handleDragEnd };
}

export default BottomSheetChat;
