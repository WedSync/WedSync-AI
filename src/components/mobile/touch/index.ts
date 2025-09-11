/**
 * WedSync Mobile Touch Components Export Index
 * WS-189: Mobile touch optimization system exports
 *
 * COMPONENT EXPORTS:
 * - Core mobile touch optimization components
 * - Advanced gesture recognition and handling
 * - Cross-platform WedMe integration components
 * - Wedding-specific workflow optimization
 * - Security and performance utilities
 *
 * @version 1.0.0
 * @author WedSync Mobile Touch Team
 */

// Core Mobile Touch Components
export { MobileTouchOptimizer } from './MobileTouchOptimizer';
export type { MobileTouchOptimizerProps } from './MobileTouchOptimizer';

export { ResponsiveGestureHandler } from './ResponsiveGestureHandler';
export type { ResponsiveGestureHandlerProps } from './ResponsiveGestureHandler';

export { TouchOptimizedButton } from './TouchOptimizedButton';
export type { TouchOptimizedButtonProps } from './TouchOptimizedButton';

export { GestureHandler } from './GestureHandler';
export type { GestureHandlerProps } from './GestureHandler';

// Advanced Mobile Touch Components
export { ThumbZoneInterface } from './ThumbZoneInterface';
export type { ThumbZoneInterfaceProps } from './ThumbZoneInterface';

export { MobileHapticButton } from './MobileHapticButton';
export type { MobileHapticButtonProps } from './MobileHapticButton';

// Wedding Professional Workflow Components
export { MobileWeddingWorkflow } from './MobileWeddingWorkflow';
export type {
  MobileWeddingWorkflowProps,
  WeddingPhase,
  WeddingWorkflowContext,
  TeamMember,
  EmergencyContact,
} from './MobileWeddingWorkflow';

// Cross-Platform Integration Components
export { WedMeMobileTouchSync } from './WedMeMobileTouchSync';
export type {
  WedMeMobileTouchSyncProps,
  TouchPreferences,
  AuthState,
  CrossPlatformSyncStatus,
} from './WedMeMobileTouchSync';

// Security Components
export { BiometricAuth } from './BiometricAuth';
export type { BiometricAuthProps } from './BiometricAuth';

// Utility Components and Types
export type {
  TouchTargetSize,
  TouchInteractionType,
} from '@/hooks/useMobileTouch';

/**
 * Mobile Touch System Configuration
 * Default configurations for common wedding scenarios
 */
export const MOBILE_TOUCH_PRESETS = {
  // Wedding preparation phase
  PREP_PHASE: {
    targetSize: 'large' as const,
    equipmentMode: false,
    gestureEnabled: true,
    hapticIntensity: 'medium' as const,
  },

  // Wedding ceremony phase (minimal interruption)
  CEREMONY_PHASE: {
    targetSize: 'xl' as const,
    equipmentMode: false,
    gestureEnabled: false,
    hapticIntensity: 'light' as const,
  },

  // Wedding reception phase
  RECEPTION_PHASE: {
    targetSize: 'large' as const,
    equipmentMode: false,
    gestureEnabled: true,
    hapticIntensity: 'medium' as const,
  },

  // Equipment handling mode (gloves, outdoor conditions)
  EQUIPMENT_MODE: {
    targetSize: 'xl' as const,
    equipmentMode: true,
    gestureEnabled: true,
    hapticIntensity: 'strong' as const,
  },

  // Emergency access mode
  EMERGENCY_MODE: {
    targetSize: 'xl' as const,
    equipmentMode: true,
    gestureEnabled: false,
    hapticIntensity: 'strong' as const,
  },

  // Accessibility optimized
  ACCESSIBILITY_MODE: {
    targetSize: 'xl' as const,
    equipmentMode: false,
    gestureEnabled: true,
    hapticIntensity: 'medium' as const,
    highContrast: true,
    largerTouchTargets: true,
  },
} as const;

/**
 * Touch Target Size Specifications
 * Based on WCAG AAA guidelines and mobile best practices
 */
export const TOUCH_TARGET_SIZES = {
  STANDARD: 44, // WCAG AAA minimum
  LARGE: 56, // Recommended for mobile
  XL: 64, // Equipment-friendly and accessibility
  ADAPTIVE: 'adaptive', // Calculated based on device and context
} as const;

/**
 * Gesture Recognition Thresholds
 * Optimized for wedding professional workflows
 */
export const GESTURE_THRESHOLDS = {
  SWIPE_DISTANCE: 50, // Minimum pixels for swipe recognition
  SWIPE_VELOCITY: 0.3, // Minimum velocity for swipe
  LONG_PRESS_DELAY: 500, // Milliseconds for long press
  DOUBLE_TAP_DELAY: 300, // Maximum time between taps
  PINCH_SENSITIVITY: 0.1, // Minimum scale change for pinch

  // Equipment-friendly adjustments
  EQUIPMENT_SWIPE_DISTANCE: 75,
  EQUIPMENT_LONG_PRESS_DELAY: 750,
} as const;

/**
 * Performance Optimization Levels
 */
export const PERFORMANCE_MODES = {
  BATTERY: {
    animationsReduced: true,
    backgroundSyncLimited: true,
    renderOptimization: 'aggressive',
    gestureDebounce: 100,
  },
  BALANCED: {
    animationsReduced: false,
    backgroundSyncLimited: false,
    renderOptimization: 'moderate',
    gestureDebounce: 50,
  },
  PERFORMANCE: {
    animationsReduced: false,
    backgroundSyncLimited: false,
    renderOptimization: 'minimal',
    gestureDebounce: 16,
  },
} as const;

/**
 * Wedding Context Classifications
 * For context-aware touch optimization
 */
export const WEDDING_CONTEXTS = {
  VENDOR_COORDINATION: 'vendor_coordination',
  PHOTO_MANAGEMENT: 'photo_management',
  TIMELINE_UPDATE: 'timeline_update',
  EMERGENCY_ACTION: 'emergency_action',
  CLIENT_COMMUNICATION: 'client_communication',
  TEAM_COLLABORATION: 'team_collaboration',
} as const;

/**
 * Cross-Platform Sync Events
 * For WedMe integration coordination
 */
export const SYNC_EVENTS = {
  PREFERENCE_UPDATE: 'preference_update',
  GESTURE_SYNC: 'gesture_sync',
  PORTFOLIO_ACTION: 'portfolio_action',
  WORKFLOW_CHANGE: 'workflow_change',
  DEEP_LINK_NAVIGATION: 'deep_link_navigation',
} as const;

/**
 * Security Classifications
 * For touch data encryption and analytics
 */
export const SECURITY_CLASSIFICATIONS = {
  PUBLIC: 'public', // UI interactions, non-sensitive
  INTERNAL: 'internal', // App navigation, preferences
  CONFIDENTIAL: 'confidential', // Wedding data interactions
  RESTRICTED: 'restricted', // Payment, vendor contacts
} as const;

/**
 * Utility Functions for Mobile Touch Optimization
 */
export const MobileTouchUtils = {
  /**
   * Get recommended touch target size for context
   */
  getRecommendedTouchSize: (
    context: keyof typeof WEDDING_CONTEXTS,
    equipmentMode: boolean = false,
    accessibilityMode: boolean = false,
  ): number => {
    let baseSize = TOUCH_TARGET_SIZES.STANDARD;

    // Context-specific adjustments
    if (context === WEDDING_CONTEXTS.EMERGENCY_ACTION) {
      baseSize = TOUCH_TARGET_SIZES.XL;
    } else if (
      context === WEDDING_CONTEXTS.VENDOR_COORDINATION ||
      context === WEDDING_CONTEXTS.TIMELINE_UPDATE
    ) {
      baseSize = TOUCH_TARGET_SIZES.LARGE;
    }

    // Equipment mode adjustment
    if (equipmentMode) {
      baseSize = Math.max(baseSize, TOUCH_TARGET_SIZES.LARGE);
    }

    // Accessibility adjustment
    if (accessibilityMode) {
      baseSize = Math.max(baseSize, TOUCH_TARGET_SIZES.XL);
    }

    return baseSize;
  },

  /**
   * Get gesture configuration for wedding phase
   */
  getGestureConfigForPhase: (phase: string, equipmentMode: boolean = false) => {
    const baseConfig = equipmentMode
      ? {
          swipeThreshold: GESTURE_THRESHOLDS.EQUIPMENT_SWIPE_DISTANCE,
          longPressDelay: GESTURE_THRESHOLDS.EQUIPMENT_LONG_PRESS_DELAY,
          pinchSensitivity: GESTURE_THRESHOLDS.PINCH_SENSITIVITY * 1.5,
        }
      : {
          swipeThreshold: GESTURE_THRESHOLDS.SWIPE_DISTANCE,
          longPressDelay: GESTURE_THRESHOLDS.LONG_PRESS_DELAY,
          pinchSensitivity: GESTURE_THRESHOLDS.PINCH_SENSITIVITY,
        };

    // Phase-specific adjustments
    if (phase === 'ceremony') {
      return {
        ...baseConfig,
        swipeThreshold: baseConfig.swipeThreshold * 1.5, // Reduce accidental triggers
        longPressDelay: baseConfig.longPressDelay * 1.2,
      };
    }

    return baseConfig;
  },

  /**
   * Calculate adaptive spacing for touch elements
   */
  calculateAdaptiveSpacing: (
    touchTargetSize: number,
    screenWidth: number,
  ): number => {
    const baseSpacing = Math.max(touchTargetSize * 0.2, 8);

    // Adjust for screen size
    if (screenWidth < 375) {
      // Small screens
      return baseSpacing * 0.8;
    } else if (screenWidth > 414) {
      // Large screens
      return baseSpacing * 1.2;
    }

    return baseSpacing;
  },

  /**
   * Validate touch target accessibility
   */
  validateTouchAccessibility: (
    element: HTMLElement,
  ): {
    isAccessible: boolean;
    recommendations: string[];
  } => {
    const rect = element.getBoundingClientRect();
    const recommendations: string[] = [];
    let isAccessible = true;

    // Size validation
    if (
      rect.width < TOUCH_TARGET_SIZES.STANDARD ||
      rect.height < TOUCH_TARGET_SIZES.STANDARD
    ) {
      isAccessible = false;
      recommendations.push(
        `Touch target should be at least ${TOUCH_TARGET_SIZES.STANDARD}px in both dimensions`,
      );
    }

    // Spacing validation
    const siblings = element.parentElement?.children;
    if (siblings) {
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i] as HTMLElement;
        if (sibling !== element && sibling.offsetParent) {
          const siblingRect = sibling.getBoundingClientRect();
          const distance = Math.sqrt(
            Math.pow(rect.left - siblingRect.left, 2) +
              Math.pow(rect.top - siblingRect.top, 2),
          );

          if (distance < TOUCH_TARGET_SIZES.STANDARD) {
            recommendations.push('Increase spacing between touch targets');
            break;
          }
        }
      }
    }

    return { isAccessible, recommendations };
  },
};

/**
 * Default Export - Main Mobile Touch System
 */
export default {
  // Components
  MobileTouchOptimizer,
  ResponsiveGestureHandler,
  TouchOptimizedButton,
  GestureHandler,
  ThumbZoneInterface,
  MobileHapticButton,
  MobileWeddingWorkflow,
  WedMeMobileTouchSync,
  BiometricAuth,

  // Presets and Configurations
  MOBILE_TOUCH_PRESETS,
  TOUCH_TARGET_SIZES,
  GESTURE_THRESHOLDS,
  PERFORMANCE_MODES,
  WEDDING_CONTEXTS,
  SYNC_EVENTS,
  SECURITY_CLASSIFICATIONS,

  // Utilities
  MobileTouchUtils,
};
