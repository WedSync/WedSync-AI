'use client';

/**
 * WS-202: Supabase Realtime Integration - Accessibility Enhancements
 * WCAG 2.1 AA compliance for wedding industry realtime components
 * Features: Screen reader support, keyboard navigation, focus management, high contrast
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// Accessibility context for realtime components
interface AccessibilityContextType {
  announcements: string[];
  announceToScreenReader: (
    message: string,
    priority?: 'polite' | 'assertive',
  ) => void;
  focusedElement: string | null;
  setFocusedElement: (elementId: string | null) => void;
  keyboardNavigation: boolean;
  setKeyboardNavigation: (enabled: boolean) => void;
  reducedMotion: boolean;
  highContrast: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      'useAccessibility must be used within AccessibilityProvider',
    );
  }
  return context;
}

// Accessibility provider for realtime components
export function RealtimeAccessibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Detect user preferences
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    const updatePreferences = () => {
      setReducedMotion(mediaQueries.reducedMotion.matches);
      setHighContrast(mediaQueries.highContrast.matches);
    };

    updatePreferences();

    Object.values(mediaQueries).forEach((mq) =>
      mq.addEventListener('change', updatePreferences),
    );

    return () => {
      Object.values(mediaQueries).forEach((mq) =>
        mq.removeEventListener('change', updatePreferences),
      );
    };
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigation(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const announceToScreenReader = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      setAnnouncements((prev) => [...prev, message]);

      // Create temporary live region for announcement
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('class', 'sr-only');
      liveRegion.textContent = message;

      document.body.appendChild(liveRegion);

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);

      // Clean up announcements array
      setTimeout(() => {
        setAnnouncements((prev) => prev.filter((a) => a !== message));
      }, 5000);
    },
    [],
  );

  const value: AccessibilityContextType = {
    announcements,
    announceToScreenReader,
    focusedElement,
    setFocusedElement,
    keyboardNavigation,
    setKeyboardNavigation,
    reducedMotion,
    highContrast,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}

      {/* Screen reader only live regions */}
      <div className="sr-only">
        <div
          aria-live="polite"
          aria-atomic="true"
          id="realtime-polite-announcer"
        />
        <div
          aria-live="assertive"
          aria-atomic="true"
          id="realtime-assertive-announcer"
        />
      </div>
    </AccessibilityContext.Provider>
  );
}

// Accessible realtime status announcer
export function RealtimeStatusAnnouncer({
  connected,
  lastUpdate,
  messageCount,
}: {
  connected: boolean;
  lastUpdate?: Date | null;
  messageCount?: number;
}) {
  const { announceToScreenReader } = useAccessibility();
  const prevConnected = useRef(connected);
  const prevMessageCount = useRef(messageCount || 0);

  // Announce connection status changes
  useEffect(() => {
    if (prevConnected.current !== connected) {
      const message = connected
        ? 'Realtime connection established. You will now receive live wedding updates.'
        : 'Realtime connection lost. Wedding updates may be delayed.';

      announceToScreenReader(message, connected ? 'polite' : 'assertive');
      prevConnected.current = connected;
    }
  }, [connected, announceToScreenReader]);

  // Announce new messages
  useEffect(() => {
    if (messageCount && messageCount > prevMessageCount.current) {
      const newMessages = messageCount - prevMessageCount.current;
      const message =
        newMessages === 1
          ? 'New wedding update received'
          : `${newMessages} new wedding updates received`;

      announceToScreenReader(message, 'polite');
      prevMessageCount.current = messageCount;
    }
  }, [messageCount, announceToScreenReader]);

  return null;
}

// Accessible focus management hook
export function useFocusManagement(elementId: string) {
  const { focusedElement, setFocusedElement, keyboardNavigation } =
    useAccessibility();
  const elementRef = useRef<HTMLElement>(null);

  const focusElement = useCallback(() => {
    if (elementRef.current && keyboardNavigation) {
      elementRef.current.focus();
      setFocusedElement(elementId);
    }
  }, [elementId, keyboardNavigation, setFocusedElement]);

  const blurElement = useCallback(() => {
    if (focusedElement === elementId) {
      setFocusedElement(null);
    }
  }, [elementId, focusedElement, setFocusedElement]);

  return {
    elementRef,
    focusElement,
    blurElement,
    isFocused: focusedElement === elementId,
  };
}

// Accessible keyboard navigation for realtime components
export function useRealtimeKeyboardNavigation(
  items: Array<{ id: string; action: () => void }>,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    enableHomeEnd?: boolean;
  } = {},
) {
  const {
    loop = true,
    orientation = 'vertical',
    enableHomeEnd = true,
  } = options;
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      const moveNext = () => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          return loop ? next % items.length : Math.min(next, items.length - 1);
        });
      };

      const movePrevious = () => {
        setCurrentIndex((prev) => {
          const prev_idx = prev - 1;
          return loop
            ? prev_idx < 0
              ? items.length - 1
              : prev_idx
            : Math.max(prev_idx, 0);
        });
      };

      const moveToFirst = () => setCurrentIndex(0);
      const moveToLast = () => setCurrentIndex(items.length - 1);

      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            e.preventDefault();
            moveNext();
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            e.preventDefault();
            movePrevious();
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            e.preventDefault();
            moveNext();
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            e.preventDefault();
            movePrevious();
          }
          break;
        case 'Home':
          if (enableHomeEnd) {
            e.preventDefault();
            moveToFirst();
          }
          break;
        case 'End':
          if (enableHomeEnd) {
            e.preventDefault();
            moveToLast();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          items[currentIndex]?.action();
          break;
      }
    },
    [items, currentIndex, loop, orientation, enableHomeEnd],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    containerRef,
    currentIndex,
    setCurrentIndex,
  };
}

// High contrast color utilities
export function useHighContrastColors() {
  const { highContrast } = useAccessibility();

  return {
    isHighContrast: highContrast,
    getContrastClass: (normalClass: string, contrastClass: string) =>
      highContrast ? contrastClass : normalClass,
    getContrastColors: () => ({
      background: highContrast ? '#000000' : undefined,
      color: highContrast ? '#FFFFFF' : undefined,
      borderColor: highContrast ? '#FFFFFF' : undefined,
    }),
  };
}

// Accessible toast component wrapper
export function AccessibleRealtimeToast({
  children,
  id,
  role = 'status',
  priority = 'polite',
  title,
  description,
}: {
  children: ReactNode;
  id: string;
  role?: 'alert' | 'status';
  priority?: 'polite' | 'assertive';
  title?: string;
  description?: string;
}) {
  const {
    announceToScreenReader,
    keyboardNavigation,
    reducedMotion,
    highContrast,
  } = useAccessibility();
  const { elementRef, focusElement, isFocused } = useFocusManagement(id);

  // Announce toast to screen readers
  useEffect(() => {
    if (title) {
      const message = description ? `${title}. ${description}` : title;
      announceToScreenReader(message, priority);
    }
  }, [title, description, announceToScreenReader, priority]);

  // Focus management for keyboard users
  useEffect(() => {
    if (role === 'alert') {
      focusElement();
    }
  }, [role, focusElement]);

  return (
    <div
      ref={elementRef as any}
      role={role}
      aria-live={priority}
      aria-atomic="true"
      aria-label={title}
      aria-describedby={description ? `${id}-description` : undefined}
      tabIndex={keyboardNavigation ? 0 : -1}
      className={cn(
        'outline-none',
        isFocused && keyboardNavigation && 'ring-2 ring-blue-500 ring-offset-2',
        reducedMotion && 'transition-none motion-safe:transition-all',
        highContrast && 'border-2 border-current shadow-lg',
      )}
      data-testid={`accessible-toast-${id}`}
    >
      {children}
      {description && (
        <div id={`${id}-description`} className="sr-only">
          {description}
        </div>
      )}
    </div>
  );
}

// Accessible realtime indicator wrapper
export function AccessibleRealtimeIndicator({
  children,
  connected,
  connectionQuality = 'good',
  messageCount = 0,
  weddingDayMode = false,
}: {
  children: ReactNode;
  connected: boolean;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  messageCount?: number;
  weddingDayMode?: boolean;
}) {
  const { keyboardNavigation, highContrast } = useAccessibility();
  const { elementRef, focusElement, isFocused } =
    useFocusManagement('realtime-indicator');

  // Generate accessible description
  const getAccessibleDescription = () => {
    const connectionText = connected
      ? `Connected with ${connectionQuality} connection quality`
      : 'Disconnected from realtime updates';

    const messageText =
      messageCount > 0
        ? `. ${messageCount} message${messageCount === 1 ? '' : 's'} received today`
        : '';

    const weddingText = weddingDayMode ? '. Wedding day mode active' : '';

    return `Realtime status: ${connectionText}${messageText}${weddingText}`;
  };

  return (
    <div
      ref={elementRef as any}
      role="status"
      aria-live="polite"
      aria-label={getAccessibleDescription()}
      tabIndex={keyboardNavigation ? 0 : -1}
      onFocus={focusElement}
      className={cn(
        'outline-none',
        isFocused && keyboardNavigation && 'ring-2 ring-blue-500 ring-offset-2',
        highContrast && 'border border-current',
      )}
      data-testid="accessible-realtime-indicator"
    >
      {children}

      {/* Screen reader only status text */}
      <div className="sr-only" aria-live="polite">
        {getAccessibleDescription()}
      </div>
    </div>
  );
}

// Skip navigation for realtime components
export function RealtimeSkipNavigation({
  skipTargets,
}: {
  skipTargets: Array<{ id: string; label: string }>;
}) {
  const { keyboardNavigation } = useAccessibility();

  if (!keyboardNavigation || skipTargets.length === 0) {
    return null;
  }

  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50">
      <div className="bg-blue-600 text-white p-2 rounded-b-lg shadow-lg">
        <span className="text-sm font-medium">Skip to:</span>
        <div className="flex gap-2 mt-1">
          {skipTargets.map((target) => (
            <a
              key={target.id}
              href={`#${target.id}`}
              className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(target.id);
                if (element) {
                  element.focus();
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }
              }}
            >
              {target.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Accessible form for realtime settings
export function AccessibleRealtimeSettings({
  settings,
  onUpdateSetting,
  className,
}: {
  settings: Record<string, boolean>;
  onUpdateSetting: (key: string, value: boolean) => void;
  className?: string;
}) {
  const { keyboardNavigation, highContrast } = useAccessibility();
  const [focusedSetting, setFocusedSetting] = useState<string | null>(null);

  const settingsConfig = [
    {
      key: 'autoHideToasts',
      label: 'Auto-hide notifications',
      description: 'Automatically dismiss notifications after a delay',
    },
    {
      key: 'soundNotifications',
      label: 'Sound notifications',
      description: 'Play sound for important wedding updates',
    },
    {
      key: 'weddingDayMode',
      label: 'Wedding day mode',
      description: 'Enhanced monitoring and alerts for wedding days',
    },
    {
      key: 'showDebugInfo',
      label: 'Debug information',
      description: 'Show technical connection details for troubleshooting',
    },
  ];

  return (
    <fieldset className={cn('space-y-4', className)}>
      <legend className="text-lg font-semibold mb-4">
        Realtime Notification Settings
      </legend>

      {settingsConfig.map((config) => (
        <div
          key={config.key}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg transition-colors',
            focusedSetting === config.key &&
              keyboardNavigation &&
              'bg-blue-50 ring-2 ring-blue-500',
            highContrast && 'border border-current',
          )}
        >
          <input
            type="checkbox"
            id={config.key}
            checked={settings[config.key] || false}
            onChange={(e) => onUpdateSetting(config.key, e.target.checked)}
            onFocus={() => setFocusedSetting(config.key)}
            onBlur={() => setFocusedSetting(null)}
            className={cn(
              'mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500',
              highContrast && 'border-2 border-current',
            )}
            aria-describedby={`${config.key}-description`}
          />

          <div className="flex-1">
            <label
              htmlFor={config.key}
              className="text-sm font-medium cursor-pointer"
            >
              {config.label}
            </label>
            <p
              id={`${config.key}-description`}
              className="text-xs text-gray-600 mt-1"
            >
              {config.description}
            </p>
          </div>
        </div>
      ))}

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Accessibility Features
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use Tab and Shift+Tab to navigate between settings</li>
          <li>• Use Space or Enter to toggle checkboxes</li>
          <li>• All changes are announced to screen readers</li>
          <li>• High contrast mode is automatically detected</li>
        </ul>
      </div>
    </fieldset>
  );
}

// ARIA live region for dynamic updates
export function RealtimeAriaLiveRegion() {
  const { announcements } = useAccessibility();

  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        id="realtime-live-region-polite"
      >
        {announcements.filter((_, index) => index % 2 === 0).join('. ')}
      </div>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="realtime-live-region-assertive"
      >
        {announcements
          .filter((_, index) => index % 2 === 1)
          .slice(-1)
          .join('')}
      </div>
    </>
  );
}

export default RealtimeAccessibilityProvider;
