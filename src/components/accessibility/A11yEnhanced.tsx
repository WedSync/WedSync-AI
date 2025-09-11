'use client';

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// B-MAD Accessibility Enhancement: Beyond WCAG AA to AAA compliance
interface A11ySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  largerText: boolean;
  dyslexicFont: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  screenReaderOptimized: boolean;
}

interface A11yContextType {
  settings: A11ySettings;
  updateSettings: (newSettings: Partial<A11ySettings>) => void;
  announceToScreenReader: (message: string) => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y must be used within an A11yProvider');
  }
  return context;
}

// B-MAD Enhanced Provider for Wedding Vendor Accessibility
export function A11yProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>({
    highContrast: false,
    reduceMotion: false,
    largerText: false,
    dyslexicFont: false,
    focusIndicators: true,
    skipLinks: true,
    screenReaderOptimized: true,
  });

  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Detect user preferences from system
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const prefersHighContrast = window.matchMedia(
      '(prefers-contrast: high)',
    ).matches;

    setSettings((prev) => ({
      ...prev,
      reduceMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
    }));
  }, []);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    root.classList.toggle('a11y-high-contrast', settings.highContrast);

    // Reduce motion
    root.classList.toggle('a11y-reduce-motion', settings.reduceMotion);

    // Larger text
    root.classList.toggle('a11y-larger-text', settings.largerText);

    // Dyslexic font
    root.classList.toggle('a11y-dyslexic-font', settings.dyslexicFont);

    // Enhanced focus indicators
    root.classList.toggle('a11y-enhanced-focus', settings.focusIndicators);
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<A11ySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncements((prev) => [...prev, message]);

    // Clear announcement after a short delay
    setTimeout(() => {
      setAnnouncements((prev) => prev.slice(1));
    }, 1000);
  }, []);

  return (
    <A11yContext.Provider
      value={{ settings, updateSettings, announceToScreenReader }}
    >
      {children}

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements.map((announcement, index) => (
          <span key={index}>{announcement}</span>
        ))}
      </div>

      {/* Skip links for keyboard navigation */}
      {settings.skipLinks && <SkipLinks />}
    </A11yContext.Provider>
  );
}

// B-MAD Enhanced Skip Links for Wedding Vendor Workflows
function SkipLinks() {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#client-forms', label: 'Skip to client forms' },
    { href: '#vendor-dashboard', label: 'Skip to dashboard' },
  ];

  return (
    <div className="skip-links">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// B-MAD Enhanced Accessible Button with Wedding Industry Context
interface AccessibleButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  loadingText?: string;
  loading?: boolean;
  className?: string;
}

export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  loadingText = 'Loading...',
  loading = false,
  className,
}: AccessibleButtonProps) {
  const { settings, announceToScreenReader } = useA11y();

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();

      // Announce action to screen reader
      if (settings.screenReaderOptimized) {
        announceToScreenReader(`${ariaLabel || 'Button'} activated`);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={cn(
        // Base styles with enhanced accessibility
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Enhanced focus indicators
        'focus:ring-4 focus:ring-offset-4',

        // High contrast mode support
        'a11y-high-contrast:border-2 a11y-high-contrast:border-current',

        // Reduced motion support
        'a11y-reduce-motion:transition-none',

        // Size variants with minimum 44px touch targets
        size === 'sm' && 'px-3 py-2 text-sm min-h-[44px]',
        size === 'md' && 'px-4 py-2 text-base min-h-[48px]',
        size === 'lg' && 'px-6 py-3 text-lg min-h-[52px]',

        // Color variants with sufficient contrast ratios
        variant === 'primary' &&
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        variant === 'secondary' &&
          'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        variant === 'danger' &&
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',

        className,
      )}
    >
      {loading && (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">{loadingText}</span>
        </>
      )}
      {children}
    </button>
  );
}

// B-MAD Enhanced Form Field with Wedding Industry Accessibility
interface AccessibleFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'textarea';
  required?: boolean;
  error?: string;
  help?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  weddingContext?: 'guest-info' | 'vendor-details' | 'event-planning';
}

export function AccessibleField({
  id,
  label,
  type = 'text',
  required = false,
  error,
  help,
  value,
  onChange,
  placeholder,
  disabled = false,
  autoComplete,
  weddingContext,
}: AccessibleFieldProps) {
  const { settings } = useA11y();

  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  // Wedding context specific placeholders and help text
  const getWeddingContextHelp = () => {
    switch (weddingContext) {
      case 'guest-info':
        return 'This information will be shared across all your wedding vendors';
      case 'vendor-details':
        return 'Your vendor information for wedding coordination';
      case 'event-planning':
        return 'Event details for wedding timeline planning';
      default:
        return help;
    }
  };

  const renderField = () => {
    const commonProps = {
      id,
      value: value || '',
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => onChange?.(e.target.value),
      placeholder,
      disabled,
      required,
      autoComplete,
      'aria-describedby': describedBy,
      'aria-invalid': !!error,
      className: cn(
        'block w-full rounded-md border px-3 py-2',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',

        // Enhanced accessibility styles
        'min-h-[44px]', // Minimum touch target
        'text-base', // Prevent zoom on mobile

        // High contrast support
        'a11y-high-contrast:border-2 a11y-high-contrast:border-black',

        // Larger text support
        'a11y-larger-text:text-lg',

        // Error states
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      ),
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={4}
          className={cn(commonProps.className, 'min-h-[120px] resize-y')}
        />
      );
    }

    return <input {...commonProps} type={type} />;
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={cn(
          'block font-medium text-gray-700',
          'a11y-larger-text:text-lg',
          'a11y-high-contrast:text-black a11y-high-contrast:font-bold',
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {renderField()}

      {help && (
        <p
          id={helpId}
          className={cn(
            'text-sm text-gray-600',
            'a11y-larger-text:text-base',
            'a11y-high-contrast:text-gray-900',
          )}
        >
          {getWeddingContextHelp()}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className={cn(
            'text-sm text-red-600 font-medium',
            'a11y-larger-text:text-base',
            'a11y-high-contrast:text-red-800',
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// B-MAD Accessibility Settings Panel
export function A11ySettings() {
  const { settings, updateSettings } = useA11y();

  const toggleSetting = (key: keyof A11ySettings) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border">
      <h2 className="text-lg font-semibold mb-4">Accessibility Settings</h2>
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <label key={key} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggleSetting(key as keyof A11ySettings)}
              className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
