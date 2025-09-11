'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface RTLContextValue {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  setRTL: (isRTL: boolean) => void;
  rtlClass: (className: string) => string;
}

export const RTLContext = createContext<RTLContextValue | null>(null);

export interface MobileRTLLayoutProps {
  children: React.ReactNode;
  isRTL?: boolean;
  className?: string;
  enableTransitions?: boolean;
}

export interface RTLAdaptiveProps {
  children: React.ReactNode;
  className?: string;
  rtlClassName?: string;
  ltrClassName?: string;
}

// RTL-aware CSS class utilities
export const rtlUtils = {
  // Margin utilities
  mr: (size: string) => ({ marginRight: size, marginLeft: 'auto' }),
  ml: (size: string) => ({ marginLeft: size, marginRight: 'auto' }),

  // Padding utilities
  pr: (size: string) => ({ paddingRight: size }),
  pl: (size: string) => ({ paddingLeft: size }),

  // Position utilities
  left: (value: string) => ({ left: value, right: 'auto' }),
  right: (value: string) => ({ right: value, left: 'auto' }),

  // Flexbox utilities
  flexStart: () => ({ justifyContent: 'flex-start' }),
  flexEnd: () => ({ justifyContent: 'flex-end' }),

  // Transform utilities
  scaleX: (factor: number) => ({ transform: `scaleX(${factor})` }),

  // Border utilities
  borderLeft: (border: string) => ({ borderLeft: border }),
  borderRight: (border: string) => ({ borderRight: border }),
};

// RTL-aware CSS classes mapper
export const createRTLClassMapper = (isRTL: boolean) => {
  const rtlMappings: Record<string, string> = {
    // Margin classes
    'ml-1': isRTL ? 'mr-1' : 'ml-1',
    'ml-2': isRTL ? 'mr-2' : 'ml-2',
    'ml-3': isRTL ? 'mr-3' : 'ml-3',
    'ml-4': isRTL ? 'mr-4' : 'ml-4',
    'ml-6': isRTL ? 'mr-6' : 'ml-6',
    'ml-8': isRTL ? 'mr-8' : 'ml-8',
    'mr-1': isRTL ? 'ml-1' : 'mr-1',
    'mr-2': isRTL ? 'ml-2' : 'mr-2',
    'mr-3': isRTL ? 'ml-3' : 'mr-3',
    'mr-4': isRTL ? 'ml-4' : 'mr-4',
    'mr-6': isRTL ? 'ml-6' : 'mr-6',
    'mr-8': isRTL ? 'ml-8' : 'mr-8',

    // Padding classes
    'pl-1': isRTL ? 'pr-1' : 'pl-1',
    'pl-2': isRTL ? 'pr-2' : 'pl-2',
    'pl-3': isRTL ? 'pr-3' : 'pl-3',
    'pl-4': isRTL ? 'pr-4' : 'pl-4',
    'pl-6': isRTL ? 'pr-6' : 'pl-6',
    'pl-8': isRTL ? 'pr-8' : 'pl-8',
    'pr-1': isRTL ? 'pl-1' : 'pr-1',
    'pr-2': isRTL ? 'pl-2' : 'pr-2',
    'pr-3': isRTL ? 'pl-3' : 'pr-3',
    'pr-4': isRTL ? 'pl-4' : 'pr-4',
    'pr-6': isRTL ? 'pl-6' : 'pr-6',
    'pr-8': isRTL ? 'pl-8' : 'pr-8',

    // Position classes
    'left-0': isRTL ? 'right-0' : 'left-0',
    'left-1': isRTL ? 'right-1' : 'left-1',
    'left-2': isRTL ? 'right-2' : 'left-2',
    'left-4': isRTL ? 'right-4' : 'left-4',
    'right-0': isRTL ? 'left-0' : 'right-0',
    'right-1': isRTL ? 'left-1' : 'right-1',
    'right-2': isRTL ? 'left-2' : 'right-2',
    'right-4': isRTL ? 'left-4' : 'right-4',

    // Flexbox classes
    'justify-start': isRTL ? 'justify-end' : 'justify-start',
    'justify-end': isRTL ? 'justify-start' : 'justify-end',
    'items-start': isRTL ? 'items-end' : 'items-start',
    'items-end': isRTL ? 'items-start' : 'items-end',
    'text-left': isRTL ? 'text-right' : 'text-left',
    'text-right': isRTL ? 'text-left' : 'text-right',

    // Border classes
    'border-l': isRTL ? 'border-r' : 'border-l',
    'border-r': isRTL ? 'border-l' : 'border-r',
    'border-l-2': isRTL ? 'border-r-2' : 'border-l-2',
    'border-r-2': isRTL ? 'border-l-2' : 'border-r-2',

    // Rounded corners
    'rounded-l': isRTL ? 'rounded-r' : 'rounded-l',
    'rounded-r': isRTL ? 'rounded-l' : 'rounded-r',
    'rounded-tl': isRTL ? 'rounded-tr' : 'rounded-tl',
    'rounded-tr': isRTL ? 'rounded-tl' : 'rounded-tr',
    'rounded-bl': isRTL ? 'rounded-br' : 'rounded-bl',
    'rounded-br': isRTL ? 'rounded-bl' : 'rounded-br',

    // Transform classes for icons/arrows
    'rotate-0': isRTL ? 'rotate-180' : 'rotate-0',
    'rotate-90': isRTL ? 'rotate-270' : 'rotate-90',
    'rotate-180': isRTL ? 'rotate-0' : 'rotate-180',
    'rotate-270': isRTL ? 'rotate-90' : 'rotate-270',
  };

  return (className: string): string => {
    return className
      .split(' ')
      .map((cls) => rtlMappings[cls] || cls)
      .join(' ');
  };
};

export const MobileRTLLayout: React.FC<MobileRTLLayoutProps> = ({
  children,
  isRTL = false,
  className = '',
  enableTransitions = true,
}) => {
  const [currentRTL, setCurrentRTL] = useState(isRTL);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const direction = currentRTL ? 'rtl' : 'ltr';
  const rtlClass = createRTLClassMapper(currentRTL);

  const setRTL = (newRTL: boolean) => {
    if (newRTL === currentRTL) return;

    if (enableTransitions) {
      setIsTransitioning(true);
      // Small delay to allow for smooth transitions
      setTimeout(() => {
        setCurrentRTL(newRTL);
        setTimeout(() => setIsTransitioning(false), 150);
      }, 50);
    } else {
      setCurrentRTL(newRTL);
    }
  };

  // Update document direction when RTL changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
    }
  }, [direction]);

  const contextValue: RTLContextValue = {
    isRTL: currentRTL,
    direction,
    setRTL,
    rtlClass,
  };

  return (
    <RTLContext.Provider value={contextValue}>
      <motion.div
        className={`
          ${className}
          ${isTransitioning ? 'opacity-90' : 'opacity-100'}
          transition-opacity duration-150
        `}
        dir={direction}
        style={{
          direction,
        }}
        animate={{
          opacity: isTransitioning ? 0.9 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </RTLContext.Provider>
  );
};

// RTL-aware container component
export const RTLAdaptive: React.FC<RTLAdaptiveProps> = ({
  children,
  className = '',
  rtlClassName = '',
  ltrClassName = '',
}) => {
  const rtlContext = useContext(RTLContext);

  if (!rtlContext) {
    console.warn('RTLAdaptive must be used within MobileRTLLayout');
    return <div className={className}>{children}</div>;
  }

  const { isRTL, rtlClass } = rtlContext;

  const combinedClassName = [
    rtlClass(className),
    isRTL ? rtlClassName : ltrClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={combinedClassName}>{children}</div>;
};

// Hook to use RTL context
export const useRTL = () => {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within MobileRTLLayout');
  }
  return context;
};

// Mobile-specific RTL components
export const MobileRTLContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const { rtlClass } = useRTL();

  return (
    <div
      className={rtlClass(
        `${className} relative min-h-screen touch-manipulation`,
      )}
    >
      {children}
    </div>
  );
};

export const MobileRTLHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}> = ({ children, className = '', showBackButton = false, onBack }) => {
  const { isRTL, rtlClass } = useRTL();

  return (
    <header
      className={rtlClass(`
      ${className}
      flex items-center justify-between
      px-4 py-3 bg-white dark:bg-gray-800
      border-b border-gray-200 dark:border-gray-700
      sticky top-0 z-40 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80
    `)}
    >
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className={`
            p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors touch-manipulation
            ${isRTL ? 'order-last' : 'order-first'}
          `}
          aria-label={isRTL ? 'Forward' : 'Back'}
        >
          <svg
            className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
      <div className="flex-1 text-center">{children}</div>
      {showBackButton && <div className="w-9" />} {/* Spacer for centering */}
    </header>
  );
};

export const MobileRTLCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const { rtlClass } = useRTL();

  return (
    <div
      className={rtlClass(`
      ${className}
      bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
      p-4 mb-4 touch-manipulation
    `)}
    >
      {children}
    </div>
  );
};

// Utility function for dynamic RTL class generation
export const generateRTLClass = (
  baseClass: string,
  isRTL: boolean,
  rtlOverrides?: Record<string, string>,
): string => {
  const mapper = createRTLClassMapper(isRTL);
  let result = mapper(baseClass);

  if (rtlOverrides) {
    Object.entries(rtlOverrides).forEach(([key, value]) => {
      if (isRTL && baseClass.includes(key)) {
        result = result.replace(key, value);
      }
    });
  }

  return result;
};

// Wedding-specific RTL layout components
export const MobileWeddingRTLForm: React.FC<{
  children: React.ReactNode;
  title: string;
  className?: string;
}> = ({ children, title, className = '' }) => {
  const { rtlClass } = useRTL();

  return (
    <div className={rtlClass(`${className} space-y-4`)}>
      <h2
        className={rtlClass(
          'text-2xl font-bold text-gray-900 dark:text-gray-100 text-center',
        )}
      >
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default MobileRTLLayout;
