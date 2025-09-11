'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import {
  type WeddingMarketLocale,
  type TextDirection,
  type SupportedLanguageCode,
} from '@/types/i18n';

// =============================================================================
// RTL CONFIGURATION & UTILITIES
// =============================================================================

const RTL_LANGUAGES: Set<SupportedLanguageCode> = new Set([
  'ar', // Arabic
  'he', // Hebrew (if added later)
  'fa', // Persian/Farsi (if added later)
  'ur', // Urdu (if added later)
]);

const RTL_LOCALES: Set<WeddingMarketLocale> = new Set([
  'ar-AE', // UAE Arabic
  'ar-SA', // Saudi Arabic
  'ar-EG', // Egyptian Arabic
  'ar-JO', // Jordanian Arabic
  'ar-LB', // Lebanese Arabic
  'ar-MA', // Moroccan Arabic
  'ar-QA', // Qatari Arabic
  'ar-KW', // Kuwaiti Arabic
  'ar-BH', // Bahraini Arabic
  'ar-OM', // Omani Arabic
  'ar-YE', // Yemeni Arabic
  'ar-SY', // Syrian Arabic
  'ar-IQ', // Iraqi Arabic
  'ar-PS', // Palestinian Arabic
  'ar-SD', // Sudanese Arabic
  'ar-LY', // Libyan Arabic
  'ar-TN', // Tunisian Arabic
  'ar-DZ', // Algerian Arabic
]);

const CULTURAL_LAYOUT_PREFERENCES: Record<
  WeddingMarketLocale,
  {
    direction: TextDirection;
    readingPattern: 'left-to-right' | 'right-to-left' | 'top-to-bottom';
    navigationSide: 'left' | 'right';
    iconPlacement: 'leading' | 'trailing';
    textAlignment: 'start' | 'end' | 'center';
    menuDirection: 'ltr' | 'rtl';
    dateFormat: 'western' | 'arabic' | 'persian' | 'hebrew';
    numberDirection: 'ltr' | 'rtl'; // Numbers are usually LTR even in RTL text
  }
> = {
  // Arabic locales - RTL
  'ar-AE': {
    direction: 'rtl',
    readingPattern: 'right-to-left',
    navigationSide: 'right',
    iconPlacement: 'trailing',
    textAlignment: 'end',
    menuDirection: 'rtl',
    dateFormat: 'arabic',
    numberDirection: 'ltr',
  },
  'ar-SA': {
    direction: 'rtl',
    readingPattern: 'right-to-left',
    navigationSide: 'right',
    iconPlacement: 'trailing',
    textAlignment: 'end',
    menuDirection: 'rtl',
    dateFormat: 'arabic',
    numberDirection: 'ltr',
  },
  'ar-EG': {
    direction: 'rtl',
    readingPattern: 'right-to-left',
    navigationSide: 'right',
    iconPlacement: 'trailing',
    textAlignment: 'end',
    menuDirection: 'rtl',
    dateFormat: 'arabic',
    numberDirection: 'ltr',
  },
  // Default LTR for all other locales
  'en-US': {
    direction: 'ltr',
    readingPattern: 'left-to-right',
    navigationSide: 'left',
    iconPlacement: 'leading',
    textAlignment: 'start',
    menuDirection: 'ltr',
    dateFormat: 'western',
    numberDirection: 'ltr',
  },
  'en-GB': {
    direction: 'ltr',
    readingPattern: 'left-to-right',
    navigationSide: 'left',
    iconPlacement: 'leading',
    textAlignment: 'start',
    menuDirection: 'ltr',
    dateFormat: 'western',
    numberDirection: 'ltr',
  },
};

// Generate LTR defaults for all other locales
const generateDefaultLayoutPreferences = (locale: WeddingMarketLocale) => {
  if (CULTURAL_LAYOUT_PREFERENCES[locale]) {
    return CULTURAL_LAYOUT_PREFERENCES[locale];
  }

  // Check if it's an RTL locale
  const isRTL = RTL_LOCALES.has(locale) || locale.startsWith('ar-');

  return {
    direction: isRTL ? 'rtl' : 'ltr',
    readingPattern: isRTL ? 'right-to-left' : 'left-to-right',
    navigationSide: isRTL ? 'right' : 'left',
    iconPlacement: isRTL ? 'trailing' : 'leading',
    textAlignment: isRTL ? 'end' : 'start',
    menuDirection: isRTL ? 'rtl' : 'ltr',
    dateFormat: isRTL ? 'arabic' : 'western',
    numberDirection: 'ltr',
  } as const;
};

// =============================================================================
// CONTEXT INTERFACE & CREATION
// =============================================================================

export interface RTLLayoutContextValue {
  // Current state
  locale: WeddingMarketLocale;
  direction: TextDirection;
  isRTL: boolean;

  // Layout preferences
  layoutPreferences: ReturnType<typeof generateDefaultLayoutPreferences>;

  // Methods
  setLocale: (locale: WeddingMarketLocale) => void;
  toggleDirection: () => void;

  // CSS utilities
  getDirectionClasses: (baseClasses: string) => string;
  getFlexDirection: (
    normalDirection: 'row' | 'row-reverse' | 'col' | 'col-reverse',
  ) => string;
  getTextAlign: (alignment?: 'start' | 'end' | 'center' | 'justify') => string;
  getMarginPadding: (property: string, value: string) => Record<string, string>;

  // Wedding-specific utilities
  getWeddingCardLayout: () => 'ltr' | 'rtl';
  getFormLabelPosition: () => 'top' | 'inline-start' | 'inline-end';
  getImageCaptionPosition: () => 'bottom' | 'start' | 'end';
}

const RTLLayoutContext = createContext<RTLLayoutContextValue | undefined>(
  undefined,
);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface RTLLayoutProviderProps {
  children: ReactNode;
  initialLocale?: WeddingMarketLocale;
  enableTransitions?: boolean;
  className?: string;
}

export const RTLLayoutProvider: React.FC<RTLLayoutProviderProps> = ({
  children,
  initialLocale = 'en-US',
  enableTransitions = true,
  className = '',
}) => {
  const [locale, setLocale] = useState<WeddingMarketLocale>(initialLocale);
  const [direction, setDirection] = useState<TextDirection>('ltr');
  const [layoutPreferences, setLayoutPreferences] = useState(() =>
    generateDefaultLayoutPreferences(initialLocale),
  );

  // Update direction and layout preferences when locale changes
  useEffect(() => {
    const preferences = generateDefaultLayoutPreferences(locale);
    setLayoutPreferences(preferences);
    setDirection(preferences.direction);

    // Update document direction
    document.documentElement.dir = preferences.direction;
    document.documentElement.setAttribute('data-locale', locale);

    // Add CSS custom properties for dynamic styling
    document.documentElement.style.setProperty(
      '--text-direction',
      preferences.direction,
    );
    document.documentElement.style.setProperty(
      '--reading-start',
      preferences.direction === 'rtl' ? 'right' : 'left',
    );
    document.documentElement.style.setProperty(
      '--reading-end',
      preferences.direction === 'rtl' ? 'left' : 'right',
    );
  }, [locale]);

  // CSS utilities
  const getDirectionClasses = (baseClasses: string): string => {
    const rtlClasses =
      layoutPreferences.direction === 'rtl'
        ? baseClasses.replace(/\b(left|right)\b/g, (match) =>
            match === 'left' ? 'right' : 'left',
          )
        : baseClasses;

    return `${rtlClasses} ${layoutPreferences.direction === 'rtl' ? 'rtl' : 'ltr'}`;
  };

  const getFlexDirection = (
    normalDirection: 'row' | 'row-reverse' | 'col' | 'col-reverse',
  ): string => {
    if (layoutPreferences.direction === 'ltr') return normalDirection;

    // Flip row directions for RTL
    switch (normalDirection) {
      case 'row':
        return 'row-reverse';
      case 'row-reverse':
        return 'row';
      default:
        return normalDirection;
    }
  };

  const getTextAlign = (
    alignment: 'start' | 'end' | 'center' | 'justify' = 'start',
  ): string => {
    if (alignment === 'center' || alignment === 'justify') return alignment;

    if (layoutPreferences.direction === 'rtl') {
      return alignment === 'start' ? 'right' : 'left';
    }

    return alignment === 'start' ? 'left' : 'right';
  };

  const getMarginPadding = (
    property: string,
    value: string,
  ): Record<string, string> => {
    const isMargin = property.startsWith('margin') || property.startsWith('m');
    const isPadding =
      property.startsWith('padding') || property.startsWith('p');

    if (!isMargin && !isPadding) return { [property]: value };

    // Handle directional properties
    if (property.includes('left') || property.includes('right')) {
      const isLeft = property.includes('left');
      const newProperty =
        layoutPreferences.direction === 'rtl'
          ? property.replace(
              isLeft ? 'left' : 'right',
              isLeft ? 'right' : 'left',
            )
          : property;
      return { [newProperty]: value };
    }

    return { [property]: value };
  };

  // Wedding-specific utilities
  const getWeddingCardLayout = (): 'ltr' | 'rtl' => {
    return layoutPreferences.direction === 'rtl' ? 'rtl' : 'ltr';
  };

  const getFormLabelPosition = (): 'top' | 'inline-start' | 'inline-end' => {
    // For wedding forms, keep labels on top for better mobile experience
    // But provide inline options for specific use cases
    return 'top';
  };

  const getImageCaptionPosition = (): 'bottom' | 'start' | 'end' => {
    return 'bottom'; // Keep captions at bottom regardless of direction
  };

  const toggleDirection = () => {
    const newDirection = direction === 'ltr' ? 'rtl' : 'ltr';
    const newLocale = newDirection === 'rtl' ? 'ar-AE' : 'en-US'; // Example toggle
    setLocale(newLocale);
  };

  const contextValue: RTLLayoutContextValue = {
    locale,
    direction,
    isRTL: direction === 'rtl',
    layoutPreferences,
    setLocale,
    toggleDirection,
    getDirectionClasses,
    getFlexDirection,
    getTextAlign,
    getMarginPadding,
    getWeddingCardLayout,
    getFormLabelPosition,
    getImageCaptionPosition,
  };

  return (
    <RTLLayoutContext.Provider value={contextValue}>
      <motion.div
        className={`rtl-layout-provider ${direction} ${className}`}
        dir={direction}
        initial={enableTransitions ? { opacity: 0 } : undefined}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          direction,
          textAlign: layoutPreferences.textAlignment,
        }}
      >
        {children}
      </motion.div>
    </RTLLayoutContext.Provider>
  );
};

// =============================================================================
// HOOKS & UTILITIES
// =============================================================================

export const useRTLLayout = (): RTLLayoutContextValue => {
  const context = useContext(RTLLayoutContext);
  if (!context) {
    throw new Error('useRTLLayout must be used within RTLLayoutProvider');
  }
  return context;
};

// Utility hook for component-specific RTL styling
export const useDirectionalStyles = (styles: {
  ltr: Record<string, any>;
  rtl: Record<string, any>;
}) => {
  const { isRTL } = useRTLLayout();
  return isRTL ? styles.rtl : styles.ltr;
};

// Utility for conditional classes based on direction
export const useDirectionalClasses = (classes: {
  ltr: string;
  rtl: string;
  common?: string;
}) => {
  const { isRTL } = useRTLLayout();
  const directionClasses = isRTL ? classes.rtl : classes.ltr;
  return classes.common
    ? `${classes.common} ${directionClasses}`
    : directionClasses;
};

// =============================================================================
// COMPONENT UTILITIES
// =============================================================================

// Higher-order component for RTL-aware components
export function withRTL<T extends {}>(Component: React.ComponentType<T>) {
  return function RTLAwareComponent(props: T) {
    const rtlContext = useRTLLayout();
    return <Component {...props} rtlContext={rtlContext} />;
  };
}

// Direction-aware flex container
export interface DirectionalFlexProps {
  direction?: 'row' | 'col';
  reverse?: boolean;
  className?: string;
  children: ReactNode;
}

export const DirectionalFlex: React.FC<DirectionalFlexProps> = ({
  direction = 'row',
  reverse = false,
  className = '',
  children,
}) => {
  const { getFlexDirection } = useRTLLayout();

  const flexDirection = getFlexDirection(
    reverse
      ? (`${direction}-reverse` as 'row-reverse' | 'col-reverse')
      : direction,
  );

  return <div className={`flex ${flexDirection} ${className}`}>{children}</div>;
};

// Direction-aware text component
export interface DirectionalTextProps {
  align?: 'start' | 'end' | 'center' | 'justify';
  className?: string;
  children: ReactNode;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const DirectionalText: React.FC<DirectionalTextProps> = ({
  align = 'start',
  className = '',
  children,
  as: Component = 'p',
}) => {
  const { getTextAlign } = useRTLLayout();

  const textAlign = getTextAlign(align);

  return (
    <Component className={className} style={{ textAlign }}>
      {children}
    </Component>
  );
};

// Wedding card with RTL-aware layout
export interface WeddingCardProps {
  title: string;
  content: ReactNode;
  image?: string;
  actions?: ReactNode;
  className?: string;
}

export const WeddingCard: React.FC<WeddingCardProps> = ({
  title,
  content,
  image,
  actions,
  className = '',
}) => {
  const { isRTL, layoutPreferences } = useRTLLayout();

  return (
    <motion.div
      className={`
        bg-white rounded-lg shadow-lg overflow-hidden
        ${className}
      `}
      dir={layoutPreferences.direction}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {image && (
        <div className="aspect-w-16 aspect-h-9">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>

        <div className="text-gray-600 mb-4">{content}</div>

        {actions && (
          <DirectionalFlex className="gap-3">{actions}</DirectionalFlex>
        )}
      </div>
    </motion.div>
  );
};

// =============================================================================
// CSS-IN-JS UTILITIES
// =============================================================================

export const rtlStyles = {
  // Common RTL-aware styles
  container: (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left',
  }),

  flexRow: (isRTL: boolean) => ({
    display: 'flex',
    flexDirection: isRTL ? 'row-reverse' : 'row',
  }),

  marginStart: (value: string, isRTL: boolean) => ({
    [isRTL ? 'marginRight' : 'marginLeft']: value,
  }),

  marginEnd: (value: string, isRTL: boolean) => ({
    [isRTL ? 'marginLeft' : 'marginRight']: value,
  }),

  paddingStart: (value: string, isRTL: boolean) => ({
    [isRTL ? 'paddingRight' : 'paddingLeft']: value,
  }),

  paddingEnd: (value: string, isRTL: boolean) => ({
    [isRTL ? 'paddingLeft' : 'paddingRight']: value,
  }),

  borderStart: (value: string, isRTL: boolean) => ({
    [isRTL ? 'borderRight' : 'borderLeft']: value,
  }),

  borderEnd: (value: string, isRTL: boolean) => ({
    [isRTL ? 'borderLeft' : 'borderRight']: value,
  }),
};

// =============================================================================
// TYPE GUARDS & UTILITIES
// =============================================================================

export const isRTLLocale = (locale: WeddingMarketLocale): boolean => {
  return RTL_LOCALES.has(locale) || locale.startsWith('ar-');
};

export const isRTLLanguage = (language: SupportedLanguageCode): boolean => {
  return RTL_LANGUAGES.has(language);
};

export const getTextDirectionFromLocale = (
  locale: WeddingMarketLocale,
): TextDirection => {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
};

export default RTLLayoutProvider;
