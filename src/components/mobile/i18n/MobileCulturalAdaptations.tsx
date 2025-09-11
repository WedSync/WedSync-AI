'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Cultural context interfaces
export interface CulturalPreferences {
  language: string;
  region: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  weekStart: number; // 0 = Sunday, 1 = Monday
  rtl: boolean;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  culturalNorms: {
    formalAddressing: boolean;
    showHonorificTitles: boolean;
    familyNameFirst: boolean;
    ceremonialImportance: 'high' | 'medium' | 'low';
    giftGivingExpected: boolean;
    dietaryConsiderations: string[];
    colorSymbolism: Record<string, string>;
    gestureAlternatives: Record<string, string>;
  };
}

export interface MobileInteractionPatterns {
  tapGesture: 'single' | 'double' | 'long';
  swipeDirection: 'horizontal' | 'vertical' | 'both';
  feedbackType: 'haptic' | 'audio' | 'visual' | 'combined';
  navigationStyle: 'tabs' | 'drawer' | 'stack';
  contentFlow: 'top-down' | 'bottom-up' | 'center-out';
  actionPlacement: 'top' | 'bottom' | 'context';
  confirmationStyle: 'explicit' | 'implicit' | 'gesture';
}

export interface WeddingCulturalNorms {
  ceremonialElements: string[];
  requiredRoles: string[];
  traditionalColors: { preferred: string[]; avoided: string[] };
  giftRegistryExpected: boolean;
  rsvpEtiquette: string;
  dressCodes: string[];
  ceremonialOrder: string[];
  familyInvolvementLevel: 'high' | 'medium' | 'low';
  photographyRestrictions: string[];
  musicPreferences: string[];
}

// Cultural presets for different regions/cultures
export const CULTURAL_PRESETS: Record<string, CulturalPreferences> = {
  'en-US': {
    language: 'en',
    region: 'US',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    weekStart: 0,
    rtl: false,
    numberFormat: { decimal: '.', thousands: ',' },
    culturalNorms: {
      formalAddressing: false,
      showHonorificTitles: false,
      familyNameFirst: false,
      ceremonialImportance: 'medium',
      giftGivingExpected: true,
      dietaryConsiderations: [],
      colorSymbolism: { white: 'purity', red: 'love', black: 'formal' },
      gestureAlternatives: {},
    },
  },
  'ar-SA': {
    language: 'ar',
    region: 'SA',
    currency: 'SAR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'h:mm a',
    weekStart: 6, // Saturday
    rtl: true,
    numberFormat: { decimal: '.', thousands: ',' },
    culturalNorms: {
      formalAddressing: true,
      showHonorificTitles: true,
      familyNameFirst: false,
      ceremonialImportance: 'high',
      giftGivingExpected: true,
      dietaryConsiderations: ['halal', 'no-alcohol'],
      colorSymbolism: { white: 'purity', green: 'islam', gold: 'luxury' },
      gestureAlternatives: { 'thumbs-up': 'ok-hand' },
    },
  },
  'zh-CN': {
    language: 'zh',
    region: 'CN',
    currency: 'CNY',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm',
    weekStart: 1,
    rtl: false,
    numberFormat: { decimal: '.', thousands: ',' },
    culturalNorms: {
      formalAddressing: true,
      showHonorificTitles: true,
      familyNameFirst: true,
      ceremonialImportance: 'high',
      giftGivingExpected: true,
      dietaryConsiderations: [],
      colorSymbolism: { red: 'luck', gold: 'prosperity', white: 'mourning' },
      gestureAlternatives: {},
    },
  },
  'ja-JP': {
    language: 'ja',
    region: 'JP',
    currency: 'JPY',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    weekStart: 0,
    rtl: false,
    numberFormat: { decimal: '.', thousands: ',' },
    culturalNorms: {
      formalAddressing: true,
      showHonorificTitles: true,
      familyNameFirst: true,
      ceremonialImportance: 'high',
      giftGivingExpected: true,
      dietaryConsiderations: [],
      colorSymbolism: { white: 'purity', red: 'celebration', black: 'formal' },
      gestureAlternatives: {},
    },
  },
  'hi-IN': {
    language: 'hi',
    region: 'IN',
    currency: 'INR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'h:mm a',
    weekStart: 0,
    rtl: false,
    numberFormat: { decimal: '.', thousands: ',' },
    culturalNorms: {
      formalAddressing: true,
      showHonorificTitles: true,
      familyNameFirst: false,
      ceremonialImportance: 'high',
      giftGivingExpected: true,
      dietaryConsiderations: ['vegetarian-options'],
      colorSymbolism: { red: 'purity', saffron: 'sacred', white: 'peace' },
      gestureAlternatives: { handshake: 'namaste' },
    },
  },
  'es-ES': {
    language: 'es',
    region: 'ES',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    weekStart: 1,
    rtl: false,
    numberFormat: { decimal: ',', thousands: '.' },
    culturalNorms: {
      formalAddressing: true,
      showHonorificTitles: false,
      familyNameFirst: false,
      ceremonialImportance: 'high',
      giftGivingExpected: true,
      dietaryConsiderations: [],
      colorSymbolism: { white: 'purity', red: 'passion', gold: 'luxury' },
      gestureAlternatives: {},
    },
  },
};

// Wedding cultural norms by region
export const WEDDING_CULTURAL_NORMS: Record<string, WeddingCulturalNorms> = {
  'en-US': {
    ceremonialElements: [
      'processional',
      'vows',
      'rings',
      'kiss',
      'recessional',
    ],
    requiredRoles: ['officiant', 'bride', 'groom', 'witnesses'],
    traditionalColors: {
      preferred: ['white', 'ivory', 'blush'],
      avoided: ['black', 'red'],
    },
    giftRegistryExpected: true,
    rsvpEtiquette: 'Response required within 3 weeks',
    dressCodes: ['black-tie', 'cocktail', 'casual', 'beach'],
    ceremonialOrder: [
      'prelude',
      'processional',
      'ceremony',
      'recessional',
      'reception',
    ],
    familyInvolvementLevel: 'medium',
    photographyRestrictions: ['ceremony-allowed', 'reception-allowed'],
    musicPreferences: ['contemporary', 'classical', 'popular'],
  },
  'ar-SA': {
    ceremonialElements: ['nikah', 'mahr', 'walima'],
    requiredRoles: ['imam', 'bride', 'groom', 'witnesses', 'wali'],
    traditionalColors: {
      preferred: ['white', 'gold', 'green'],
      avoided: ['black'],
    },
    giftRegistryExpected: false,
    rsvpEtiquette: 'Family representative confirms attendance',
    dressCodes: ['modest', 'formal', 'traditional'],
    ceremonialOrder: ['nikah', 'signing', 'celebration', 'walima'],
    familyInvolvementLevel: 'high',
    photographyRestrictions: [
      'men-women-separate',
      'religious-ceremony-restricted',
    ],
    musicPreferences: ['traditional', 'religious', 'cultural'],
  },
  'zh-CN': {
    ceremonialElements: [
      'tea-ceremony',
      'door-games',
      'hair-combing',
      'red-envelope',
    ],
    requiredRoles: ['bride', 'groom', 'parents', 'matchmaker'],
    traditionalColors: {
      preferred: ['red', 'gold', 'pink'],
      avoided: ['white', 'black', 'blue'],
    },
    giftRegistryExpected: false,
    rsvpEtiquette: 'Red envelope amount indicates attendance',
    dressCodes: ['qipao', 'changshan', 'western', 'modern'],
    ceremonialOrder: ['pickup', 'tea-ceremony', 'wedding', 'banquet'],
    familyInvolvementLevel: 'high',
    photographyRestrictions: ['family-photos-important'],
    musicPreferences: ['traditional', 'modern-chinese', 'classical'],
  },
  'hi-IN': {
    ceremonialElements: ['mehndi', 'sangeet', 'haldi', 'baraat', 'phere'],
    requiredRoles: ['bride', 'groom', 'pandit', 'parents', 'siblings'],
    traditionalColors: {
      preferred: ['red', 'gold', 'saffron', 'green'],
      avoided: ['white', 'black'],
    },
    giftRegistryExpected: false,
    rsvpEtiquette: 'Family invitation includes extended family',
    dressCodes: ['lehenga', 'saree', 'sherwani', 'traditional'],
    ceremonialOrder: ['mehndi', 'sangeet', 'haldi', 'wedding', 'reception'],
    familyInvolvementLevel: 'high',
    photographyRestrictions: ['religious-ceremony-with-permission'],
    musicPreferences: ['bollywood', 'classical', 'devotional'],
  },
};

// Mobile interaction patterns by culture
export const MOBILE_INTERACTION_PATTERNS: Record<
  string,
  MobileInteractionPatterns
> = {
  western: {
    tapGesture: 'single',
    swipeDirection: 'horizontal',
    feedbackType: 'haptic',
    navigationStyle: 'tabs',
    contentFlow: 'top-down',
    actionPlacement: 'bottom',
    confirmationStyle: 'explicit',
  },
  'east-asian': {
    tapGesture: 'single',
    swipeDirection: 'both',
    feedbackType: 'visual',
    navigationStyle: 'drawer',
    contentFlow: 'top-down',
    actionPlacement: 'context',
    confirmationStyle: 'implicit',
  },
  'middle-eastern': {
    tapGesture: 'single',
    swipeDirection: 'horizontal',
    feedbackType: 'combined',
    navigationStyle: 'stack',
    contentFlow: 'top-down',
    actionPlacement: 'top',
    confirmationStyle: 'explicit',
  },
  'south-asian': {
    tapGesture: 'single',
    swipeDirection: 'vertical',
    feedbackType: 'visual',
    navigationStyle: 'tabs',
    contentFlow: 'center-out',
    actionPlacement: 'bottom',
    confirmationStyle: 'explicit',
  },
};

// Context for cultural adaptations
export const CulturalAdaptationContext = createContext<{
  preferences: CulturalPreferences;
  weddingNorms: WeddingCulturalNorms;
  mobilePatterns: MobileInteractionPatterns;
  updateCulture: (cultureCode: string) => void;
} | null>(null);

export interface MobileCulturalAdaptationsProps {
  children: React.ReactNode;
  defaultCulture?: string;
  autoDetect?: boolean;
}

export const MobileCulturalAdaptations: React.FC<
  MobileCulturalAdaptationsProps
> = ({ children, defaultCulture = 'en-US', autoDetect = true }) => {
  const [currentCulture, setCurrentCulture] = useState(defaultCulture);
  const [preferences, setPreferences] = useState(
    CULTURAL_PRESETS[defaultCulture],
  );
  const [weddingNorms, setWeddingNorms] = useState(
    WEDDING_CULTURAL_NORMS[defaultCulture] || WEDDING_CULTURAL_NORMS['en-US'],
  );
  const [mobilePatterns, setMobilePatterns] = useState(
    MOBILE_INTERACTION_PATTERNS[getCulturalRegion(defaultCulture)] ||
      MOBILE_INTERACTION_PATTERNS['western'],
  );

  // Auto-detect user's cultural preferences
  useEffect(() => {
    if (autoDetect && typeof window !== 'undefined') {
      const detectedCulture = detectUserCulture();
      if (detectedCulture !== currentCulture) {
        updateCulture(detectedCulture);
      }
    }
  }, [autoDetect, currentCulture]);

  const updateCulture = (cultureCode: string) => {
    const newPreferences =
      CULTURAL_PRESETS[cultureCode] || CULTURAL_PRESETS[defaultCulture];
    const newWeddingNorms =
      WEDDING_CULTURAL_NORMS[cultureCode] || WEDDING_CULTURAL_NORMS['en-US'];
    const culturalRegion = getCulturalRegion(cultureCode);
    const newMobilePatterns =
      MOBILE_INTERACTION_PATTERNS[culturalRegion] ||
      MOBILE_INTERACTION_PATTERNS['western'];

    setCurrentCulture(cultureCode);
    setPreferences(newPreferences);
    setWeddingNorms(newWeddingNorms);
    setMobilePatterns(newMobilePatterns);

    // Update document properties
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newPreferences.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = newPreferences.language;
    }

    // Store preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cultural-preference', cultureCode);
    }
  };

  const contextValue = {
    preferences,
    weddingNorms,
    mobilePatterns,
    updateCulture,
  };

  return (
    <CulturalAdaptationContext.Provider value={contextValue}>
      <motion.div
        className="cultural-adaptation-container"
        dir={preferences.rtl ? 'rtl' : 'ltr'}
        initial={false}
        animate={{
          direction: preferences.rtl ? 'rtl' : 'ltr',
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </CulturalAdaptationContext.Provider>
  );
};

// Helper functions
function detectUserCulture(): string {
  if (typeof navigator === 'undefined') return 'en-US';

  // Try to get saved preference first
  const saved = localStorage.getItem('cultural-preference');
  if (saved && CULTURAL_PRESETS[saved]) return saved;

  // Detect from browser language
  const language = navigator.language || 'en-US';

  // Map browser languages to our cultural presets
  const languageMap: Record<string, string> = {
    ar: 'ar-SA',
    zh: 'zh-CN',
    ja: 'ja-JP',
    hi: 'hi-IN',
    es: 'es-ES',
    en: 'en-US',
  };

  const langCode = language.split('-')[0];
  return languageMap[langCode] || 'en-US';
}

function getCulturalRegion(cultureCode: string): string {
  const regionMap: Record<string, string> = {
    'en-US': 'western',
    'es-ES': 'western',
    'fr-FR': 'western',
    'de-DE': 'western',
    'ar-SA': 'middle-eastern',
    'he-IL': 'middle-eastern',
    'zh-CN': 'east-asian',
    'ja-JP': 'east-asian',
    'ko-KR': 'east-asian',
    'hi-IN': 'south-asian',
  };

  return regionMap[cultureCode] || 'western';
}

// Hook to use cultural adaptations
export const useCulturalAdaptations = () => {
  const context = useContext(CulturalAdaptationContext);
  if (!context) {
    throw new Error(
      'useCulturalAdaptations must be used within MobileCulturalAdaptations',
    );
  }
  return context;
};

// Cultural UI components
export const CulturallyAdaptedButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ children, onClick, variant = 'primary', className = '' }) => {
  const { preferences, mobilePatterns } = useCulturalAdaptations();

  const getButtonStyles = () => {
    let styles = `px-6 py-3 rounded-lg font-medium transition-all duration-200 ${className}`;

    if (variant === 'primary') {
      styles += ` bg-blue-500 text-white hover:bg-blue-600`;
    } else {
      styles += ` bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200`;
    }

    // Cultural adaptations
    if (preferences.culturalNorms.formalAddressing) {
      styles += ` text-sm`; // More formal, smaller text
    }

    // RTL adjustments
    if (preferences.rtl) {
      styles += ` text-right`;
    }

    return styles;
  };

  const handleClick = () => {
    // Add haptic feedback if supported and preferred
    if (
      mobilePatterns.feedbackType.includes('haptic') &&
      'vibrate' in navigator
    ) {
      navigator.vibrate(50);
    }
    onClick();
  };

  return (
    <button
      className={getButtonStyles()}
      onClick={handleClick}
      dir={preferences.rtl ? 'rtl' : 'ltr'}
    >
      {children}
    </button>
  );
};

export const CulturallyAdaptedForm: React.FC<{
  children: React.ReactNode;
  title: string;
  className?: string;
}> = ({ children, title, className = '' }) => {
  const { preferences, weddingNorms } = useCulturalAdaptations();

  return (
    <div
      className={`${className} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6`}
      dir={preferences.rtl ? 'rtl' : 'ltr'}
    >
      <div className={`mb-6 ${preferences.rtl ? 'text-right' : 'text-left'}`}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        {weddingNorms.familyInvolvementLevel === 'high' && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {preferences.language === 'ar'
              ? 'يرجى استشارة العائلة قبل المتابعة'
              : preferences.language === 'zh'
                ? '请在继续之前咨询家人'
                : preferences.language === 'hi'
                  ? 'कृपया आगे बढ़ने से पहले परिवार से सलाह लें'
                  : 'Please consult with family before proceeding'}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export const CulturalColorPicker: React.FC<{
  onColorSelect: (color: string) => void;
  selectedColor?: string;
}> = ({ onColorSelect, selectedColor }) => {
  const { weddingNorms } = useCulturalAdaptations();

  const colorOptions = [
    ...weddingNorms.traditionalColors.preferred.map((color) => ({
      color,
      type: 'preferred' as const,
    })),
    // Add neutral colors that aren't specifically avoided
    { color: 'gray', type: 'neutral' as const },
    { color: 'beige', type: 'neutral' as const },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {colorOptions.map(({ color, type }) => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          className={`
            w-12 h-12 rounded-full border-2 transition-all duration-200
            ${selectedColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'}
            ${type === 'preferred' ? 'shadow-lg' : 'opacity-75'}
          `}
          style={{ backgroundColor: color }}
          aria-label={`Select ${color} color`}
        >
          {type === 'preferred' && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-white">✓</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export const CulturalDateTimePicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  type: 'date' | 'time';
}> = ({ value, onChange, type }) => {
  const { preferences } = useCulturalAdaptations();

  const formatPlaceholder = () => {
    if (type === 'date') {
      return preferences.dateFormat.toLowerCase();
    } else {
      return preferences.timeFormat === 'HH:mm' ? 'hh:mm' : 'h:mm am/pm';
    }
  };

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={formatPlaceholder()}
      className={`
        w-full px-4 py-3 border border-gray-300 rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        ${preferences.rtl ? 'text-right' : 'text-left'}
      `}
      dir={preferences.rtl ? 'rtl' : 'ltr'}
    />
  );
};

export default MobileCulturalAdaptations;
