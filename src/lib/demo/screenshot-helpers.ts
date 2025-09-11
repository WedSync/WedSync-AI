'use client';

import { SCREENSHOT_MODE, DEMO_FROZEN_TIME } from './config';

/**
 * Screenshot helpers for demo mode
 * Provides utilities for optimizing UI for screenshots and presentations
 */

// Global screenshot mode state
let isScreenshotModeActive = false;
let originalDateNow: typeof Date.now;

/**
 * Initialize screenshot mode
 */
export const initializeScreenshotMode = (): void => {
  if (typeof window === 'undefined') return;

  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const screenshotParam = urlParams.get(SCREENSHOT_MODE.queryParam);
  
  if (screenshotParam === SCREENSHOT_MODE.enableValue) {
    enableScreenshotMode();
  }

  // Check localStorage
  const savedScreenshotMode = localStorage.getItem('wedsync_demo_screenshot_mode');
  if (savedScreenshotMode === 'true') {
    enableScreenshotMode();
  }
};

/**
 * Enable screenshot mode with all UI modifications
 */
export const enableScreenshotMode = (): void => {
  if (typeof window === 'undefined') return;
  
  isScreenshotModeActive = true;
  localStorage.setItem('wedsync_demo_screenshot_mode', 'true');

  // Freeze time if enabled
  if (SCREENSHOT_MODE.modifications.freezeTime) {
    freezeTime();
  }

  // Apply CSS modifications
  applyScreenshotStyles();

  // Hide debug banners
  if (SCREENSHOT_MODE.modifications.hideDebugBanners) {
    hideDebugElements();
  }

  // Expand panels
  if (SCREENSHOT_MODE.modifications.expandPanels) {
    expandCollapsiblePanels();
  }

  // Apply light theme
  if (SCREENSHOT_MODE.modifications.useLightTheme) {
    applyLightTheme();
  }

  // Hide tooltips
  if (SCREENSHOT_MODE.modifications.hideTooltips) {
    hideTooltips();
  }

  console.log('🔥 Screenshot mode enabled with frozen time:', DEMO_FROZEN_TIME);
};

/**
 * Disable screenshot mode and restore normal functionality
 */
export const disableScreenshotMode = (): void => {
  if (typeof window === 'undefined') return;

  isScreenshotModeActive = false;
  localStorage.removeItem('wedsync_demo_screenshot_mode');

  // Restore time
  restoreTime();

  // Remove CSS modifications
  removeScreenshotStyles();

  // Show debug elements
  showDebugElements();

  // Restore tooltips
  showTooltips();

  console.log('📱 Screenshot mode disabled - normal UI restored');
};

/**
 * Check if screenshot mode is currently active
 */
export const isScreenshotMode = (): boolean => {
  return isScreenshotModeActive;
};

/**
 * Freeze Date.now() to return consistent time for screenshots
 */
const freezeTime = (): void => {
  if (!originalDateNow) {
    originalDateNow = Date.now;
  }

  // Override Date.now to return frozen time
  Date.now = () => DEMO_FROZEN_TIME.getTime();

  // Override Date constructor for new Date() calls
  const OriginalDate = Date;
  (window as any).Date = class extends OriginalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(DEMO_FROZEN_TIME.getTime());
      } else {
        super(...args);
      }
    }

    static now() {
      return DEMO_FROZEN_TIME.getTime();
    }
  };

  // Copy static methods
  Object.setPrototypeOf(window.Date, OriginalDate);
  Object.defineProperty(window.Date, 'prototype', {
    value: OriginalDate.prototype,
    writable: false
  });
};

/**
 * Restore normal time functionality
 */
const restoreTime = (): void => {
  if (originalDateNow) {
    Date.now = originalDateNow;
    originalDateNow = undefined as any;
  }

  // Restore original Date constructor
  if (typeof window !== 'undefined') {
    window.Date = Date;
  }
};

/**
 * Apply CSS styles optimized for screenshots
 */
const applyScreenshotStyles = (): void => {
  if (typeof document === 'undefined') return;

  const styleId = 'screenshot-mode-styles';
  
  // Remove existing styles
  const existingStyles = document.getElementById(styleId);
  if (existingStyles) {
    existingStyles.remove();
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Screenshot mode optimizations */
    .screenshot-mode {
      --screenshot-bg: #ffffff;
      --screenshot-border: #e5e7eb;
      --screenshot-text: #1f2937;
      --screenshot-primary: #3b82f6;
    }

    /* Hide scrollbars for cleaner screenshots */
    .screenshot-mode ::-webkit-scrollbar {
      display: none;
    }
    .screenshot-mode {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    /* Ensure full visibility of content */
    .screenshot-mode [data-collapsed="true"] {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }

    /* Hide loading states and skeleton screens */
    .screenshot-mode .animate-pulse,
    .screenshot-mode .animate-spin,
    .screenshot-mode .loading-skeleton {
      display: none !important;
    }

    /* Ensure tooltips are hidden */
    .screenshot-mode [role="tooltip"],
    .screenshot-mode .tooltip,
    .screenshot-mode [data-tooltip] {
      display: none !important;
    }

    /* Hide debug indicators */
    .screenshot-mode .debug-banner,
    .screenshot-mode .dev-tools,
    .screenshot-mode .development-notice {
      display: none !important;
    }

    /* Optimize shadows and borders for printing/screenshots */
    .screenshot-mode .shadow-lg {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }

    /* Ensure proper contrast in light theme */
    .screenshot-mode .text-gray-400 {
      color: #6b7280 !important;
    }

    /* Force expanded state for collapsible elements */
    .screenshot-mode .collapsible {
      height: auto !important;
      overflow: visible !important;
    }

    /* Hide interactive hover effects */
    .screenshot-mode *:hover {
      transform: none !important;
      box-shadow: inherit !important;
    }
  `;

  document.head.appendChild(style);
  document.documentElement.classList.add('screenshot-mode');
};

/**
 * Remove screenshot-specific styles
 */
const removeScreenshotStyles = (): void => {
  if (typeof document === 'undefined') return;

  const styleId = 'screenshot-mode-styles';
  const existingStyles = document.getElementById(styleId);
  if (existingStyles) {
    existingStyles.remove();
  }

  document.documentElement.classList.remove('screenshot-mode');
};

/**
 * Hide debug elements and development notices
 */
const hideDebugElements = (): void => {
  if (typeof document === 'undefined') return;

  const selectors = [
    '.debug-banner',
    '.dev-tools',
    '.development-notice',
    '[data-debug]',
    '.demo-notice',
    '.error-boundary-fallback'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
      el.setAttribute('data-screenshot-hidden', 'true');
    });
  });
};

/**
 * Show previously hidden debug elements
 */
const showDebugElements = (): void => {
  if (typeof document === 'undefined') return;

  const hiddenElements = document.querySelectorAll('[data-screenshot-hidden="true"]');
  hiddenElements.forEach(el => {
    (el as HTMLElement).style.display = '';
    el.removeAttribute('data-screenshot-hidden');
  });
};

/**
 * Expand all collapsible panels for complete screenshots
 */
const expandCollapsiblePanels = (): void => {
  if (typeof document === 'undefined') return;

  // Common selectors for collapsible elements
  const selectors = [
    '[data-collapsed="true"]',
    '.collapsed',
    '[aria-expanded="false"]',
    '.collapsible:not(.expanded)'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Mark as expanded for screenshot
      el.setAttribute('data-screenshot-expanded', 'true');
      el.setAttribute('data-collapsed', 'false');
      el.setAttribute('aria-expanded', 'true');
      el.classList.add('expanded');
      el.classList.remove('collapsed');
      
      // Force display and height
      (el as HTMLElement).style.display = 'block';
      (el as HTMLElement).style.height = 'auto';
      (el as HTMLElement).style.overflow = 'visible';
    });
  });

  // Click buttons that expand content (like "Show more", "Expand all")
  const expandButtons = document.querySelectorAll('[aria-label*="expand"], [aria-label*="show"], button:has([data-lucide="chevron-down"])');
  expandButtons.forEach(button => {
    if (button.getAttribute('data-screenshot-clicked') !== 'true') {
      (button as HTMLElement).click();
      button.setAttribute('data-screenshot-clicked', 'true');
    }
  });
};

/**
 * Apply light theme optimizations for screenshots
 */
const applyLightTheme = (): void => {
  if (typeof document === 'undefined') return;

  // Force light theme classes
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
  
  // Override any dark theme styles
  const style = document.createElement('style');
  style.id = 'screenshot-light-theme';
  style.textContent = `
    .screenshot-mode {
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }
    
    .screenshot-mode .bg-gray-900,
    .screenshot-mode .bg-gray-800,
    .screenshot-mode .bg-black {
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }
    
    .screenshot-mode .text-white {
      color: #1f2937 !important;
    }
    
    .screenshot-mode .border-gray-700,
    .screenshot-mode .border-gray-600 {
      border-color: #d1d5db !important;
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Hide tooltips and hover content
 */
const hideTooltips = (): void => {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'screenshot-no-tooltips';
  style.textContent = `
    .screenshot-mode [data-tooltip]:before,
    .screenshot-mode [data-tooltip]:after,
    .screenshot-mode .tooltip,
    .screenshot-mode [role="tooltip"],
    .screenshot-mode .tippy-box {
      display: none !important;
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Show tooltips (restore normal behavior)
 */
const showTooltips = (): void => {
  const style = document.getElementById('screenshot-no-tooltips');
  if (style) {
    style.remove();
  }
};

/**
 * Get current demo time (frozen time in screenshot mode, real time otherwise)
 */
export const getDemoTime = (): Date => {
  if (isScreenshotModeActive && SCREENSHOT_MODE.modifications.freezeTime) {
    return new Date(DEMO_FROZEN_TIME);
  }
  return new Date();
};

/**
 * Format time for demo display (uses frozen time in screenshot mode)
 */
export const formatDemoTime = (format: 'time' | 'date' | 'datetime' = 'datetime'): string => {
  const time = getDemoTime();
  
  switch (format) {
    case 'time':
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    case 'date':
      return time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'datetime':
    default:
      return time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
  }
};

/**
 * React hook for screenshot mode state
 */
export const useScreenshotMode = () => {
  if (typeof window === 'undefined') {
    return {
      isScreenshotMode: false,
      enableScreenshotMode: () => {},
      disableScreenshotMode: () => {},
      getDemoTime: () => new Date(),
      formatDemoTime: (format?: 'time' | 'date' | 'datetime') => new Date().toLocaleString()
    };
  }

  return {
    isScreenshotMode: isScreenshotModeActive,
    enableScreenshotMode,
    disableScreenshotMode,
    getDemoTime,
    formatDemoTime
  };
};

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScreenshotMode);
  } else {
    initializeScreenshotMode();
  }
}