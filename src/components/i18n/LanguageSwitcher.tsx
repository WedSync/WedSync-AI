'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  SearchIcon,
  CheckIcon,
  GlobeIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type SupportedLanguageCode,
  type LanguageConfig,
  type WeddingMarketCurrency,
  type TextDirection,
} from '@/types/i18n';

// =============================================================================
// LANGUAGE CONFIGURATIONS
// =============================================================================

const WEDDING_MARKET_LANGUAGES: LanguageConfig[] = [
  // English variants - Primary market
  {
    code: 'en',
    locale: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
    isRTL: false,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western', 'jewish', 'interfaith', 'secular'],
    ceremonyTypes: [
      'church_wedding',
      'civil_ceremony',
      'destination_wedding',
      'outdoor_ceremony',
    ],
    giftCustoms: ['registry', 'honeymoon_fund', 'experience_gifts'],
  },
  {
    code: 'en',
    locale: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇬🇧',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western', 'celtic', 'jewish', 'interfaith'],
    ceremonyTypes: [
      'church_wedding',
      'civil_ceremony',
      'handfasting',
      'castle',
    ],
    giftCustoms: ['registry', 'money_gifts', 'experience_gifts'],
  },
  // Spanish variants - Major market
  {
    code: 'es',
    locale: 'es-ES',
    name: 'Español (España)',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currencyPosition: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western', 'latin'],
    ceremonyTypes: ['church_wedding', 'civil_ceremony', 'destination_wedding'],
    giftCustoms: ['money_gifts', 'household_items', 'registry'],
  },
  {
    code: 'es',
    locale: 'es-MX',
    name: 'Español (México)',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇲🇽',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['mexican', 'latin', 'western'],
    ceremonyTypes: [
      'church_wedding',
      'traditional_ceremony',
      'destination_wedding',
    ],
    giftCustoms: ['money_gifts', 'religious_items', 'family_heirloom'],
  },
  // French variants
  {
    code: 'fr',
    locale: 'fr-FR',
    name: 'Français (France)',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currencyPosition: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western'],
    ceremonyTypes: [
      'church_wedding',
      'civil_ceremony',
      'destination_wedding',
      'vineyard',
    ],
    giftCustoms: ['registry', 'money_gifts', 'experience_gifts'],
  },
  // Italian
  {
    code: 'it',
    locale: 'it-IT',
    name: 'Italiano (Italia)',
    nativeName: 'Italiano',
    direction: 'ltr',
    flag: '🇮🇹',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currencyPosition: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western'],
    ceremonyTypes: [
      'church_wedding',
      'civil_ceremony',
      'destination_wedding',
      'historic_site',
    ],
    giftCustoms: ['money_gifts', 'household_items', 'registry'],
  },
  // German
  {
    code: 'de',
    locale: 'de-DE',
    name: 'Deutsch (Deutschland)',
    nativeName: 'Deutsch',
    direction: 'ltr',
    flag: '🇩🇪',
    isRTL: false,
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    currencyPosition: 'after',
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
      decimalPlaces: 2,
    },
    weddingTraditions: ['western'],
    ceremonyTypes: [
      'church_wedding',
      'civil_ceremony',
      'castle',
      'outdoor_ceremony',
    ],
    giftCustoms: ['money_gifts', 'registry', 'household_items'],
  },
  // Arabic - RTL support
  {
    code: 'ar',
    locale: 'ar-AE',
    name: 'العربية (الإمارات)',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇦🇪',
    isRTL: true,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['islamic', 'persian'],
    ceremonyTypes: ['nikah', 'walima', 'henna_party'],
    giftCustoms: ['money_gifts', 'gold_jewelry', 'religious_items'],
  },
  // Hindi - Indian market
  {
    code: 'hi',
    locale: 'hi-IN',
    name: 'हिन्दी (भारत)',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    flag: '🇮🇳',
    isRTL: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['hindu', 'sikh', 'islamic'],
    ceremonyTypes: [
      'hindu_ceremony',
      'sikh_ceremony',
      'mehendi',
      'sangeet',
      'haldi',
    ],
    giftCustoms: ['gold_jewelry', 'money_gifts', 'religious_items'],
  },
  // Chinese
  {
    code: 'zh',
    locale: 'zh-CN',
    name: '中文 (简体)',
    nativeName: '中文',
    direction: 'ltr',
    flag: '🇨🇳',
    isRTL: false,
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
    currencyPosition: 'before',
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      decimalPlaces: 2,
    },
    weddingTraditions: ['chinese'],
    ceremonyTypes: ['tea_ceremony', 'traditional_ceremony', 'modern_wedding'],
    giftCustoms: ['money_gifts', 'gold_jewelry', 'household_items'],
  },
];

const POPULAR_MARKETS = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'];
const RECENT_LANGUAGES_KEY = 'wedsync_recent_languages';
const SELECTED_LANGUAGE_KEY = 'wedsync_selected_language';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface LanguageSwitcherProps {
  currentLocale?: WeddingMarketLocale;
  onLocaleChange?: (locale: WeddingMarketLocale) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'mobile';
  showPreview?: boolean;
}

interface LanguagePreviewProps {
  language: LanguageConfig;
}

// =============================================================================
// LANGUAGE PREVIEW COMPONENT
// =============================================================================

const LanguagePreview: React.FC<LanguagePreviewProps> = ({ language }) => (
  <div
    className={`p-3 border-t border-gray-100 ${language.isRTL ? 'text-right' : 'text-left'}`}
  >
    <div className="text-xs text-gray-500 mb-1">Preview</div>
    <div className="text-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Wedding Date:</span>
        <span className="font-medium">
          {language.dateFormat === 'MM/DD/YYYY'
            ? '06/15/2024'
            : language.dateFormat === 'DD/MM/YYYY'
              ? '15/06/2024'
              : language.dateFormat === 'DD.MM.YYYY'
                ? '15.06.2024'
                : '2024/06/15'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Ceremony:</span>
        <span className="font-medium text-primary-600">
          {language.ceremonyTypes[0]
            .replace('_', ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Budget:</span>
        <span className="font-medium">
          {language.currencyPosition === 'before' ? '$25,000' : '25.000€'}
        </span>
      </div>
    </div>
  </div>
);

// =============================================================================
// MAIN LANGUAGE SWITCHER COMPONENT
// =============================================================================

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLocale = 'en-US',
  onLocaleChange,
  className = '',
  variant = 'default',
  showPreview = true,
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentLanguages, setRecentLanguages] = useState<WeddingMarketLocale[]>(
    [],
  );
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageConfig | null>(null);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get current language configuration
  const currentLanguageConfig =
    WEDDING_MARKET_LANGUAGES.find((lang) => lang.locale === currentLocale) ||
    WEDDING_MARKET_LANGUAGES[0];

  // Load recent languages from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recent = localStorage.getItem(RECENT_LANGUAGES_KEY);
      if (recent) {
        setRecentLanguages(JSON.parse(recent));
      }

      const selected = localStorage.getItem(SELECTED_LANGUAGE_KEY);
      if (selected) {
        const langConfig = WEDDING_MARKET_LANGUAGES.find(
          (lang) => lang.locale === selected,
        );
        if (langConfig) {
          setSelectedLanguage(langConfig);
        }
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter languages based on search
  const filteredLanguages = WEDDING_MARKET_LANGUAGES.filter(
    (language) =>
      language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      language.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      language.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Group languages
  const popularLanguages = filteredLanguages.filter((lang) =>
    POPULAR_MARKETS.includes(lang.locale),
  );
  const otherLanguages = filteredLanguages.filter(
    (lang) => !POPULAR_MARKETS.includes(lang.locale),
  );
  const recentLanguagesConfigs = recentLanguages
    .map((locale) =>
      WEDDING_MARKET_LANGUAGES.find((lang) => lang.locale === locale),
    )
    .filter(Boolean) as LanguageConfig[];

  // Handle language selection
  const handleLanguageSelect = (language: LanguageConfig) => {
    setSelectedLanguage(language);
    setIsOpen(false);
    setSearchTerm('');

    // Update recent languages
    const updatedRecent = [
      language.locale,
      ...recentLanguages.filter((locale) => locale !== language.locale),
    ].slice(0, 5);
    setRecentLanguages(updatedRecent);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENT_LANGUAGES_KEY, JSON.stringify(updatedRecent));
      localStorage.setItem(SELECTED_LANGUAGE_KEY, language.locale);
    }

    // Call parent callback
    onLocaleChange?.(language.locale);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  // Render language item
  const renderLanguageItem = (
    language: LanguageConfig,
    isSelected: boolean = false,
  ) => (
    <button
      key={language.locale}
      className={`
        w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-50 
        transition-colors duration-150 group
        ${isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
        ${language.isRTL ? 'text-right' : 'text-left'}
      `}
      onClick={() => handleLanguageSelect(language)}
      aria-label={`Select ${language.name}`}
    >
      <span className="text-lg" role="img" aria-label={`${language.name} flag`}>
        {language.flag}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{language.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {language.nativeName}
        </div>
      </div>
      {language.isRTL && (
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          RTL
        </div>
      )}
      {isSelected && (
        <CheckIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />
      )}
    </button>
  );

  // Compact variant for mobile/small spaces
  if (variant === 'compact' || variant === 'mobile') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select language"
        >
          <span className="text-base">{currentLanguageConfig.flag}</span>
          <span className="font-medium">
            {currentLanguageConfig.code.toUpperCase()}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
            >
              <div className="max-h-80 overflow-y-auto">
                {filteredLanguages.map((language) =>
                  renderLanguageItem(
                    language,
                    language.locale === currentLocale,
                  ),
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default variant with full features
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        className={`
          flex items-center gap-3 px-4 py-3 w-full text-left border border-gray-300 rounded-lg 
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-all duration-200 bg-white
          ${currentLanguageConfig.isRTL ? 'text-right' : 'text-left'}
        `}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language and region"
      >
        <GlobeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span
          className="text-xl"
          role="img"
          aria-label={`${currentLanguageConfig.name} flag`}
        >
          {currentLanguageConfig.flag}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">
            {currentLanguageConfig.name}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {currentLanguageConfig.nativeName}
          </div>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-full min-w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search languages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-label="Search languages"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Recent Languages */}
              {recentLanguagesConfigs.length > 0 && searchTerm === '' && (
                <div className="py-2">
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Recently Used
                  </div>
                  {recentLanguagesConfigs.map((language) =>
                    renderLanguageItem(
                      language,
                      language.locale === currentLocale,
                    ),
                  )}
                </div>
              )}

              {/* Popular Languages */}
              {popularLanguages.length > 0 && (
                <div className="py-2">
                  {searchTerm === '' && (
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Popular Wedding Markets
                    </div>
                  )}
                  {popularLanguages.map((language) =>
                    renderLanguageItem(
                      language,
                      language.locale === currentLocale,
                    ),
                  )}
                </div>
              )}

              {/* Other Languages */}
              {otherLanguages.length > 0 && (
                <div className="py-2">
                  {searchTerm === '' && popularLanguages.length > 0 && (
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Other Languages
                    </div>
                  )}
                  {otherLanguages.map((language) =>
                    renderLanguageItem(
                      language,
                      language.locale === currentLocale,
                    ),
                  )}
                </div>
              )}

              {/* No Results */}
              {filteredLanguages.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <GlobeIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">No languages found</div>
                  <div className="text-xs text-gray-400">
                    Try a different search term
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section */}
            {showPreview && selectedLanguage && !searchTerm && (
              <LanguagePreview language={selectedLanguage} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// ADDITIONAL UTILITIES
// =============================================================================

export const useLanguageDirection = (
  locale: WeddingMarketLocale,
): TextDirection => {
  const languageConfig = WEDDING_MARKET_LANGUAGES.find(
    (lang) => lang.locale === locale,
  );
  return languageConfig?.direction || 'ltr';
};

export const useIsRTL = (locale: WeddingMarketLocale): boolean => {
  const languageConfig = WEDDING_MARKET_LANGUAGES.find(
    (lang) => lang.locale === locale,
  );
  return languageConfig?.isRTL || false;
};

export const getLanguageConfig = (
  locale: WeddingMarketLocale,
): LanguageConfig | null => {
  return (
    WEDDING_MARKET_LANGUAGES.find((lang) => lang.locale === locale) || null
  );
};

export default LanguageSwitcher;
