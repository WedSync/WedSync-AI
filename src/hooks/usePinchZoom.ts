import { useState, useRef, useEffect, RefObject } from 'react';

interface UsePinchZoomOptions {
  ref: RefObject<HTMLElement>;
  minScale?: number;
  maxScale?: number;
  disabled?: boolean;
}

interface PinchZoomState {
  scale: number;
  centerX: number;
  centerY: number;
}

export function usePinchZoom({
  ref,
  minScale = 0.5,
  maxScale = 3,
  disabled = false,
}: UsePinchZoomOptions): PinchZoomState {
  const [scale, setScale] = useState(1);
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);

  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const lastCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  useEffect(() => {
    if (!ref.current || disabled) return;

    const element = ref.current;

    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;

      const touch1 = touches[0];
      const touch2 = touches[1];

      return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2),
      );
    };

    const getCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) return { x: 0, y: 0 };

      const touch1 = touches[0];
      const touch2 = touches[1];

      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        isPinching.current = true;
        initialDistance.current = getDistance(e.touches);
        initialScale.current = scale;
        lastCenter.current = getCenter(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching.current) {
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const currentCenter = getCenter(e.touches);

        if (initialDistance.current > 0) {
          const scaleChange = currentDistance / initialDistance.current;
          const newScale = Math.max(
            minScale,
            Math.min(maxScale, initialScale.current * scaleChange),
          );

          setScale(newScale);

          // Update center position
          setCenterX(currentCenter.x - lastCenter.current.x);
          setCenterY(currentCenter.y - lastCenter.current.y);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching.current = false;
        initialDistance.current = 0;

        // Reset center if scale is back to 1
        if (scale === 1) {
          setCenterX(0);
          setCenterY(0);
        }
      }
    };

    // Add event listeners with passive: false to prevent default behavior
    element.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, minScale, maxScale, scale, disabled]);

  return { scale, centerX, centerY };
}
