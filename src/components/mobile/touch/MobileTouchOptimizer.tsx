/**
 * WedSync Mobile Touch Optimizer Component
 * WS-189: Core mobile touch optimization with adaptive sizing and equipment-friendly design
 *
 * CORE FEATURES:
 * - Adaptive touch target sizing based on device screen density and user preferences
 * - Equipment-friendly design with glove-compatible touch targets and enhanced feedback
 * - Device capability detection with automatic optimization recommendations
 * - Battery-efficient processing with intelligent gesture recognition and optimization
 * - Performance monitoring and analytics for continuous improvement
 *
 * @version 1.0.0
 * @author WedSync Mobile Touch Team
 */

'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMobileTouch, TouchTargetSize } from '@/hooks/useMobileTouch';

/**
 * Touch optimization modes
 */
export type TouchOptimizationMode =
  | 'auto'
  | 'manual'
  | 'equipment'
  | 'accessibility';

/**
 * Device type detection
 */
export type DeviceType = 'ios' | 'android' | 'pwa' | 'desktop';

/**
 * Component props for mobile touch optimizer
 */
export interface MobileTouchOptimizerProps {
  children: React.ReactNode;
  className?: string;

  // Core configuration
  deviceType?: DeviceType;
  equipmentMode?: boolean;
  hapticEnabled?: boolean;
  wedmeIntegration?: boolean;

  // Touch optimization settings
  minTouchTarget?: number;
  adaptiveResize?: boolean;
  optimizationMode?: TouchOptimizationMode;

  // Performance settings
  performanceMonitoring?: boolean;
  batteryOptimization?: boolean;

  // Event handlers
  onOptimizationChange?: (optimization: any) => void;
  onPerformanceUpdate?: (metrics: any) => void;
  onTouchInteraction?: (interaction: any) => void;
}

/**
 * Touch target analysis data
 */
interface TouchTargetAnalysis {
  element: HTMLElement;
  currentSize: { width: number; height: number };
  recommendedSize: { width: number; height: number };
  meetsGuidelines: boolean;
  needsOptimization: boolean;
  context: string;
}

/**
 * Mobile Touch Optimizer Component
 * Provides comprehensive touch optimization for mobile wedding professionals
 */
export const MobileTouchOptimizer: React.FC<MobileTouchOptimizerProps> = ({
  children,
  className,
  deviceType = 'auto',
  equipmentMode = false,
  hapticEnabled = true,
  wedmeIntegration = false,
  minTouchTarget = 44,
  adaptiveResize = true,
  optimizationMode = 'auto',
  performanceMonitoring = true,
  batteryOptimization = false,
  onOptimizationChange,
  onPerformanceUpdate,
  onTouchInteraction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [touchTargets, setTouchTargets] = useState<TouchTargetAnalysis[]>([]);
  const [optimizationStats, setOptimizationStats] = useState({
    targetsOptimized: 0,
    improvementScore: 0,
    batteryImpact: 0,
  });

  const {
    touchConfig,
    deviceCapabilities,
    optimizeTouchTargets,
    calculateOptimalTouchSize,
    trackGesture,
    getTouchPerformanceMetrics,
    optimizeForBattery,
    getAccessibilityRecommendations,
  } = useMobileTouch({
    targetSize: getInitialTouchSize(),
    equipmentMode,
    performanceMode: batteryOptimization ? 'battery' : 'balanced',
    hapticFeedback: hapticEnabled,
    analytics: performanceMonitoring,
  });

  /**
   * Get initial touch size based on props and device
   */
  function getInitialTouchSize(): TouchTargetSize {
    if (optimizationMode === 'accessibility') return 'xl';
    if (equipmentMode) return 'large';
    if (optimizationMode === 'auto') return 'adaptive';
    return 'standard';
  }

  /**
   * Detect device type if set to auto
   */
  const detectDeviceType = useCallback((): DeviceType => {
    if (deviceType !== 'auto') return deviceType;

    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else if (userAgent.includes('android')) {
      return 'android';
    } else if ('serviceWorker' in navigator && 'PushManager' in window) {
      return 'pwa';
    } else {
      return 'desktop';
    }
  }, [deviceType]);

  /**
   * Analyze touch targets in the container
   */
  const analyzeTouchTargets = useCallback(() => {
    if (!containerRef.current || !adaptiveResize) return;

    const interactiveElements = containerRef.current.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex], [onclick]',
    );

    const analyses: TouchTargetAnalysis[] = [];

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const context = getElementContext(htmlElement);

      const currentSize = { width: rect.width, height: rect.height };
      const optimalTouchSize = calculateOptimalTouchSize(
        minTouchTarget,
        context,
      );
      const recommendedSize = {
        width: Math.max(currentSize.width, optimalTouchSize),
        height: Math.max(currentSize.height, optimalTouchSize),
      };

      const meetsGuidelines =
        currentSize.width >= minTouchTarget &&
        currentSize.height >= minTouchTarget;

      analyses.push({
        element: htmlElement,
        currentSize,
        recommendedSize,
        meetsGuidelines,
        needsOptimization:
          !meetsGuidelines ||
          (equipmentMode &&
            optimalTouchSize > Math.min(currentSize.width, currentSize.height)),
        context,
      });
    });

    setTouchTargets(analyses);

    // Update optimization stats
    const needsOptimization = analyses.filter(
      (a) => a.needsOptimization,
    ).length;
    const improvementScore = Math.max(
      0,
      100 - (needsOptimization / analyses.length) * 100,
    );

    setOptimizationStats((prev) => ({
      ...prev,
      targetsOptimized: analyses.length - needsOptimization,
      improvementScore: Math.round(improvementScore),
    }));

    return analyses;
  }, [
    adaptiveResize,
    minTouchTarget,
    calculateOptimalTouchSize,
    equipmentMode,
  ]);

  /**
   * Get element context for optimization
   */
  const getElementContext = (element: HTMLElement): string => {
    // Emergency actions
    if (
      element.dataset.emergency ||
      element.closest('[data-emergency]') ||
      element.textContent?.toLowerCase().includes('emergency')
    ) {
      return 'emergency';
    }

    // Navigation elements
    if (
      element.closest('nav') ||
      element.getAttribute('role') === 'navigation' ||
      element.classList.contains('nav')
    ) {
      return 'navigation';
    }

    // Form elements
    if (
      element.closest('form') ||
      ['input', 'select', 'textarea', 'button[type="submit"]'].includes(
        element.tagName.toLowerCase(),
      )
    ) {
      return 'form';
    }

    // Wedding-specific contexts
    if (element.dataset.vendor || element.closest('[data-vendor]')) {
      return 'vendor';
    }

    if (element.dataset.timeline || element.closest('[data-timeline]')) {
      return 'timeline';
    }

    if (element.dataset.photo || element.closest('[data-photo]')) {
      return 'photo';
    }

    return 'content';
  };

  /**
   * Apply touch optimizations to elements
   */
  const applyOptimizations = useCallback(async () => {
    if (!containerRef.current || isOptimizing) return;

    setIsOptimizing(true);

    try {
      const analyses = analyzeTouchTargets();
      if (!analyses) return;

      // Apply optimizations to elements that need them
      const optimizationsApplied = analyses.filter((analysis) => {
        if (!analysis.needsOptimization) return false;

        const { element, recommendedSize, context } = analysis;

        // Apply CSS optimizations
        const currentStyle = window.getComputedStyle(element);
        const isInlineBlock =
          currentStyle.display === 'inline-block' ||
          currentStyle.display === 'inline-flex';

        if (!isInlineBlock) {
          element.style.display = 'inline-block';
        }

        // Set minimum touch target size
        element.style.minWidth = `${recommendedSize.width}px`;
        element.style.minHeight = `${recommendedSize.height}px`;

        // Add equipment-friendly styling if needed
        if (equipmentMode) {
          element.style.border = '2px solid rgba(59, 130, 246, 0.3)';
          element.style.borderRadius = '6px';
          element.style.padding = '8px';
        }

        // Context-specific optimizations
        switch (context) {
          case 'emergency':
            element.style.backgroundColor =
              element.style.backgroundColor || '#fee2e2';
            element.style.border = '3px solid #dc2626';
            element.style.fontWeight = 'bold';
            break;

          case 'navigation':
            element.style.padding = element.style.padding || '12px';
            break;

          case 'form':
            element.style.padding = element.style.padding || '10px';
            element.style.fontSize = element.style.fontSize || '16px'; // Prevent zoom on iOS
            break;
        }

        // Add accessibility attributes
        if (
          !element.getAttribute('aria-label') &&
          !element.textContent?.trim()
        ) {
          const contextLabel = `${context} ${element.tagName.toLowerCase()}`;
          element.setAttribute('aria-label', contextLabel);
        }

        // Track optimization
        trackGesture('optimization_applied', {
          context,
          originalSize: analysis.currentSize,
          newSize: recommendedSize,
          equipmentMode,
        });

        return true;
      });

      // Update statistics
      setOptimizationStats((prev) => ({
        ...prev,
        targetsOptimized: optimizationsApplied.length,
        batteryImpact: batteryOptimization ? -5 : 0, // Estimated % battery savings
      }));

      // Notify parent component
      onOptimizationChange?.({
        optimizationsApplied: optimizationsApplied.length,
        totalTargets: analyses.length,
        improvementScore: optimizationStats.improvementScore,
        recommendations: getAccessibilityRecommendations(),
      });
    } catch (error) {
      console.error('Touch optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [
    analyzeTouchTargets,
    isOptimizing,
    equipmentMode,
    trackGesture,
    batteryOptimization,
    optimizationStats.improvementScore,
    getAccessibilityRecommendations,
    onOptimizationChange,
  ]);

  /**
   * Handle touch interactions for analytics
   */
  const handleTouchInteraction = useCallback(
    (event: TouchEvent) => {
      if (!performanceMonitoring) return;

      const target = event.target as HTMLElement;
      const touchData = {
        type: 'touch_start',
        target: target.tagName.toLowerCase(),
        context: getElementContext(target),
        touches: event.touches.length,
        timestamp: Date.now(),
        deviceType: detectDeviceType(),
      };

      trackGesture('touch_interaction', touchData);
      onTouchInteraction?.(touchData);
    },
    [
      performanceMonitoring,
      trackGesture,
      getElementContext,
      detectDeviceType,
      onTouchInteraction,
    ],
  );

  /**
   * Monitor performance metrics
   */
  const updatePerformanceMetrics = useCallback(() => {
    if (!performanceMonitoring) return;

    const metrics = getTouchPerformanceMetrics();

    onPerformanceUpdate?.({
      ...metrics,
      optimizationStats,
      deviceCapabilities,
      touchConfig,
    });
  }, [
    performanceMonitoring,
    getTouchPerformanceMetrics,
    optimizationStats,
    deviceCapabilities,
    touchConfig,
    onPerformanceUpdate,
  ]);

  /**
   * Initialize touch optimization
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Set up touch optimization
    optimizeTouchTargets(getInitialTouchSize(), equipmentMode);

    // Apply initial optimizations
    const timeoutId = setTimeout(() => {
      applyOptimizations();
    }, 100); // Allow DOM to settle

    // Set up event listeners
    container.addEventListener('touchstart', handleTouchInteraction, {
      passive: true,
    });

    // Set up performance monitoring
    const performanceInterval = performanceMonitoring
      ? setInterval(updatePerformanceMetrics, 5000) // Every 5 seconds
      : null;

    // Set up resize observer for responsive optimization
    const resizeObserver = new ResizeObserver(() => {
      if (adaptiveResize) {
        setTimeout(applyOptimizations, 100);
      }
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      if (performanceInterval) clearInterval(performanceInterval);
      container.removeEventListener('touchstart', handleTouchInteraction);
      resizeObserver.disconnect();
    };
  }, [
    equipmentMode,
    adaptiveResize,
    performanceMonitoring,
    optimizeTouchTargets,
    applyOptimizations,
    handleTouchInteraction,
    updatePerformanceMetrics,
  ]);

  /**
   * Handle battery optimization changes
   */
  useEffect(() => {
    optimizeForBattery(batteryOptimization);
  }, [batteryOptimization, optimizeForBattery]);

  /**
   * Apply WedMe integration styles if enabled
   */
  useEffect(() => {
    if (!wedmeIntegration || !containerRef.current) return;

    const container = containerRef.current;

    // Add WedMe-specific styling
    container.style.setProperty('--wedme-primary-color', '#6366f1');
    container.style.setProperty('--wedme-secondary-color', '#e0e7ff');
    container.classList.add('wedme-integrated');

    // Add gesture coordination attributes
    container.setAttribute('data-wedme-sync', 'true');
    container.setAttribute('data-touch-optimized', 'true');

    return () => {
      container.classList.remove('wedme-integrated');
      container.removeAttribute('data-wedme-sync');
      container.removeAttribute('data-touch-optimized');
    };
  }, [wedmeIntegration]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'mobile-touch-optimized',
        {
          'equipment-mode': equipmentMode,
          'accessibility-mode': optimizationMode === 'accessibility',
          optimizing: isOptimizing,
          'wedme-integrated': wedmeIntegration,
        },
        className,
      )}
      data-device-type={detectDeviceType()}
      data-optimization-mode={optimizationMode}
      data-touch-targets={touchTargets.length}
      style={
        {
          // CSS custom properties for dynamic optimization
          '--touch-target-min': `${minTouchTarget}px`,
          '--equipment-mode': equipmentMode ? '1' : '0',
          '--haptic-enabled': hapticEnabled ? '1' : '0',
          '--battery-optimized': batteryOptimization ? '1' : '0',
        } as React.CSSProperties
      }
    >
      {children}

      {/* Optimization Status Indicator (Debug Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Targets: {touchTargets.length}</div>
          <div>Optimized: {optimizationStats.targetsOptimized}</div>
          <div>Score: {optimizationStats.improvementScore}%</div>
          {batteryOptimization && (
            <div>Battery: -{optimizationStats.batteryImpact}%</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileTouchOptimizer;
