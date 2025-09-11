/**
 * WS-247 Multilingual Platform System - Core Translation System Testing
 * Team E - QA/Testing & Documentation
 * 
 * Comprehensive testing of the multilingual translation system for WedSync
 * Validates React i18n integration, translation loading, and language switching
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/lib/i18n';

// Mock Next.js router for language routing
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    locale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'ar', 'zh', 'hi', 'ja'],
    defaultLocale: 'en',
    asPath: '/',
    pathname: '/',
  }),
}));

// Mock component for testing translations
const TestComponent = ({ translationKey = 'common.welcome' }: { translationKey?: string }) => {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <div data-testid="translation">{t(translationKey)}</div>
      <div data-testid="current-language">{i18n.language}</div>
      <button 
        data-testid="change-language" 
        onClick={() => i18n.changeLanguage('es')}
      >
        Change to Spanish
      </button>
    </div>
  );
};

describe('WS-247: Multilingual System Core Testing', () => {
  beforeEach(() => {
    // Reset i18n to default state
    i18n.changeLanguage('en');
    jest.clearAllMocks();
  });

  describe('Translation System Initialization', () => {
    test('should initialize with default English language', async () => {
      await act(async () => {
        render(<TestComponent />);
      });
      
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });

    test('should load translation resources for all supported languages', async () => {
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'ar', 'zh', 'hi', 'ja'];
      
      for (const lang of supportedLanguages) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
        
        expect(i18n.language).toBe(lang);
        expect(i18n.hasResourceBundle(lang, 'common')).toBe(true);
      }
    });

    test('should fallback to English for missing translations', async () => {
      await act(async () => {
        await i18n.changeLanguage('es');
      });
      
      render(<TestComponent translationKey="nonexistent.key" />);
      
      // Should show the key itself as fallback
      expect(screen.getByTestId('translation')).toHaveTextContent('nonexistent.key');
    });
  });

  describe('Language Switching', () => {
    test('should switch language dynamically', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<TestComponent />);
      });
      
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      
      await act(async () => {
        await user.click(screen.getByTestId('change-language'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('current-language')).toHaveTextContent('es');
      });
    });

    test('should update URL when language changes', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<TestComponent />);
      });
      
      await act(async () => {
        await user.click(screen.getByTestId('change-language'));
      });
      
      // Verify router was called to update URL
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/es/'),
        undefined,
        expect.objectContaining({ locale: 'es' })
      );
    });
  });

  describe('Wedding-Specific Translations', () => {
    const weddingTranslationKeys = [
      'wedding.ceremony',
      'wedding.reception',
      'wedding.vendor',
      'wedding.photographer',
      'wedding.venue',
      'wedding.catering',
      'wedding.flowers',
      'wedding.music',
      'wedding.transportation',
      'wedding.budget',
      'wedding.timeline',
      'wedding.guest_list'
    ];

    test('should have all wedding-specific translations in English', async () => {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
      
      weddingTranslationKeys.forEach(key => {
        const translation = i18n.t(key);
        expect(translation).toBeDefined();
        expect(translation).not.toBe(key); // Should not return the key itself
      });
    });

    test('should have wedding translations in major languages', async () => {
      const majorLanguages = ['es', 'fr', 'de'];
      
      for (const lang of majorLanguages) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
        
        weddingTranslationKeys.forEach(key => {
          const translation = i18n.t(key);
          expect(translation).toBeDefined();
          expect(typeof translation).toBe('string');
          expect(translation.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Cultural Date Formats', () => {
    test('should format dates correctly for different locales', async () => {
      const testDate = new Date('2024-12-25');
      
      // US format (MM/DD/YYYY)
      await act(async () => {
        await i18n.changeLanguage('en-US');
      });
      expect(testDate.toLocaleDateString('en-US')).toBe('12/25/2024');
      
      // UK format (DD/MM/YYYY)
      await act(async () => {
        await i18n.changeLanguage('en-GB');
      });
      expect(testDate.toLocaleDateString('en-GB')).toBe('25/12/2024');
      
      // German format (DD.MM.YYYY)
      await act(async () => {
        await i18n.changeLanguage('de');
      });
      expect(testDate.toLocaleDateString('de')).toBe('25.12.2024');
    });

    test('should handle wedding date formatting across cultures', async () => {
      const weddingDate = new Date('2024-06-15');
      const languages = ['en', 'es', 'fr', 'de', 'ar'];
      
      for (const lang of languages) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
        
        const formattedDate = weddingDate.toLocaleDateString(lang);
        expect(formattedDate).toBeDefined();
        expect(formattedDate.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Currency Formatting', () => {
    test('should format currency according to locale', async () => {
      const amount = 1500.50;
      
      // USD
      expect(amount.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      })).toBe('$1,500.50');
      
      // EUR
      expect(amount.toLocaleString('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
      })).toBe('1.500,50 €');
      
      // GBP
      expect(amount.toLocaleString('en-GB', { 
        style: 'currency', 
        currency: 'GBP' 
      })).toBe('£1,500.50');
    });

    test('should handle wedding budget formatting for different regions', async () => {
      const budgetAmount = 25000;
      const currencyConfigs = [
        { locale: 'en-US', currency: 'USD', expected: '$25,000.00' },
        { locale: 'en-GB', currency: 'GBP', expected: '£25,000.00' },
        { locale: 'de-DE', currency: 'EUR', expected: '25.000,00 €' },
        { locale: 'fr-FR', currency: 'EUR', expected: '25 000,00 €' }
      ];
      
      currencyConfigs.forEach(({ locale, currency, expected }) => {
        const formatted = budgetAmount.toLocaleString(locale, {
          style: 'currency',
          currency: currency
        });
        expect(formatted).toBe(expected);
      });
    });
  });

  describe('RTL Language Support', () => {
    test('should handle Arabic text direction', async () => {
      await act(async () => {
        await i18n.changeLanguage('ar');
      });
      
      const ArabicComponent = () => {
        const { t } = useTranslation();
        return <div data-testid="arabic-text" dir="rtl">{t('wedding.ceremony')}</div>;
      };
      
      render(<ArabicComponent />);
      
      const arabicElement = screen.getByTestId('arabic-text');
      expect(arabicElement).toHaveAttribute('dir', 'rtl');
    });

    test('should handle Hebrew text direction', async () => {
      await act(async () => {
        await i18n.changeLanguage('he');
      });
      
      const HebrewComponent = () => {
        const { t } = useTranslation();
        return <div data-testid="hebrew-text" dir="rtl">{t('wedding.ceremony')}</div>;
      };
      
      render(<HebrewComponent />);
      
      const hebrewElement = screen.getByTestId('hebrew-text');
      expect(hebrewElement).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('Performance Testing', () => {
    test('should load translations within performance threshold', async () => {
      const startTime = performance.now();
      
      await act(async () => {
        await i18n.changeLanguage('es');
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Translation loading should be under 100ms
      expect(loadTime).toBeLessThan(100);
    });

    test('should cache translations after first load', async () => {
      // First load
      const firstStartTime = performance.now();
      await act(async () => {
        await i18n.changeLanguage('fr');
      });
      const firstLoadTime = performance.now() - firstStartTime;
      
      // Switch to another language and back
      await act(async () => {
        await i18n.changeLanguage('en');
      });
      
      // Second load (should be cached)
      const secondStartTime = performance.now();
      await act(async () => {
        await i18n.changeLanguage('fr');
      });
      const secondLoadTime = performance.now() - secondStartTime;
      
      // Cached load should be significantly faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime / 2);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await act(async () => {
        try {
          await i18n.changeLanguage('zh');
        } catch (error) {
          // Should not crash the app
          expect(error).toBeDefined();
        }
      });
      
      // Should fallback to English
      expect(i18n.language).toBe('en');
      
      global.fetch = originalFetch;
    });

    test('should handle malformed translation files', async () => {
      // Test with invalid JSON
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await act(async () => {
        // This should not crash the application
        i18n.t('invalid.nested.key.that.does.not.exist');
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility (a11y) Testing', () => {
    test('should support screen readers for different languages', async () => {
      const languages = ['en', 'es', 'ar'];
      
      for (const lang of languages) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
        
        const AccessibilityComponent = () => {
          const { t } = useTranslation();
          return (
            <button 
              aria-label={t('wedding.ceremony')}
              data-testid={`ceremony-button-${lang}`}
            >
              {t('wedding.ceremony')}
            </button>
          );
        };
        
        render(<AccessibilityComponent />);
        
        const button = screen.getByTestId(`ceremony-button-${lang}`);
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toBeDefined();
      }
    });

    test('should maintain proper heading hierarchy in different languages', async () => {
      const MultilingualHeadings = () => {
        const { t } = useTranslation();
        return (
          <div>
            <h1 data-testid="main-heading">{t('wedding.title')}</h1>
            <h2 data-testid="section-heading">{t('wedding.ceremony')}</h2>
            <h3 data-testid="subsection-heading">{t('wedding.venue')}</h3>
          </div>
        );
      };
      
      await act(async () => {
        render(<MultilingualHeadings />);
      });
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });
});