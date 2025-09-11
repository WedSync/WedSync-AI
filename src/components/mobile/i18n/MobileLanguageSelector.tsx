'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  CheckIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export interface MobileLanguageSelectorProps {
  selectedLanguage: Language;
  languages: Language[];
  onLanguageChange: (language: Language) => void;
  className?: string;
  isCompact?: boolean;
  showFlag?: boolean;
  showNativeName?: boolean;
}

// Common languages with wedding platform support
export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

export const MobileLanguageSelector: React.FC<MobileLanguageSelectorProps> = ({
  selectedLanguage,
  languages,
  onLanguageChange,
  className = '',
  isCompact = false,
  showFlag = true,
  showNativeName = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(languages);

  useEffect(() => {
    const filtered = languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredLanguages(filtered);
  }, [searchTerm, languages]);

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleBackdropClick = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-4 py-3 
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
          rounded-lg shadow-sm hover:shadow-md transition-all duration-200
          ${isCompact ? 'py-2 px-3' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          active:scale-98 touch-manipulation
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-2">
          {showFlag && (
            <span
              className="text-xl"
              role="img"
              aria-label={selectedLanguage.name}
            >
              {selectedLanguage.flag}
            </span>
          )}
          <div className="flex flex-col items-start">
            <span
              className={`font-medium text-gray-900 dark:text-gray-100 ${isCompact ? 'text-sm' : ''}`}
            >
              {showNativeName
                ? selectedLanguage.nativeName
                : selectedLanguage.name}
            </span>
            {!isCompact && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedLanguage.code.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={handleBackdropClick}
              aria-hidden="true"
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden"
              role="listbox"
              aria-label="Language options"
            >
              {/* Search Input for large language lists */}
              {languages.length > 8 && (
                <div className="sticky top-0 p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search languages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              {/* Language List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredLanguages.length > 0 ? (
                  filteredLanguages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => handleLanguageSelect(language)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                        transition-colors duration-150 text-left touch-manipulation
                        ${selectedLanguage.code === language.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                      role="option"
                      aria-selected={selectedLanguage.code === language.code}
                    >
                      <div className="flex items-center space-x-3">
                        {showFlag && (
                          <span
                            className="text-xl"
                            role="img"
                            aria-label={language.name}
                          >
                            {language.flag}
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {language.nativeName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {language.name} ({language.code.toUpperCase()})
                            {language.rtl && ' • RTL'}
                          </span>
                        </div>
                      </div>
                      {selectedLanguage.code === language.code && (
                        <CheckIcon className="w-5 h-5 text-blue-500" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <GlobeAltIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No languages found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing language state
export const useLanguageSelector = (
  initialLanguage: Language = DEFAULT_LANGUAGES[0],
  availableLanguages: Language[] = DEFAULT_LANGUAGES,
) => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language>(initialLanguage);
  const [isRTL, setIsRTL] = useState(initialLanguage.rtl || false);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setIsRTL(language.rtl || false);

    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language.code;
    }

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', JSON.stringify(language));
    }
  };

  // Load saved language on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('preferred-language');
      if (savedLanguage) {
        try {
          const language = JSON.parse(savedLanguage) as Language;
          if (availableLanguages.some((lang) => lang.code === language.code)) {
            handleLanguageChange(language);
          }
        } catch (error) {
          console.warn('Failed to load saved language preference:', error);
        }
      }
    }
  }, [availableLanguages]);

  return {
    selectedLanguage,
    isRTL,
    availableLanguages,
    handleLanguageChange,
  };
};

export default MobileLanguageSelector;
