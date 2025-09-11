import { createClient } from '@/lib/supabase/client';

interface TranslationCache {
  [websiteId: string]: {
    [languageCode: string]: {
      [fieldKey: string]: string;
    };
  };
}

class TranslationService {
  private cache: TranslationCache = {};
  private defaultLanguage = 'en';

  async loadTranslations(
    websiteId: string,
    languageCode: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/wedding-website/translations?websiteId=${websiteId}&language=${languageCode}`,
      );

      if (!response.ok) {
        throw new Error('Failed to load translations');
      }

      const { translations } = await response.json();

      if (!this.cache[websiteId]) {
        this.cache[websiteId] = {};
      }

      this.cache[websiteId][languageCode] = translations[languageCode] || {};
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }

  translate(
    websiteId: string,
    fieldKey: string,
    languageCode: string,
    defaultValue?: string,
  ): string {
    const websiteTranslations = this.cache[websiteId];

    if (!websiteTranslations) {
      return defaultValue || fieldKey;
    }

    const languageTranslations = websiteTranslations[languageCode];

    if (!languageTranslations || !languageTranslations[fieldKey]) {
      const defaultTranslations = websiteTranslations[this.defaultLanguage];

      if (defaultTranslations && defaultTranslations[fieldKey]) {
        return defaultTranslations[fieldKey];
      }

      return defaultValue || fieldKey;
    }

    return languageTranslations[fieldKey];
  }

  async saveTranslations(
    websiteId: string,
    languageCode: string,
    translations: Record<string, string>,
  ): Promise<void> {
    try {
      const response = await fetch('/api/wedding-website/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          languageCode,
          translations,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save translations');
      }

      if (!this.cache[websiteId]) {
        this.cache[websiteId] = {};
      }

      this.cache[websiteId][languageCode] = translations;
    } catch (error) {
      console.error('Error saving translations:', error);
      throw error;
    }
  }

  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    nativeName: string;
  }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'pl', name: 'Polish', nativeName: 'Polski' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    ];
  }

  getDefaultTranslations(): Record<string, string> {
    return {
      'hero.welcome': 'Welcome to Our Wedding',
      'hero.date': 'Save the Date',
      'nav.home': 'Home',
      'nav.story': 'Our Story',
      'nav.party': 'Wedding Party',
      'nav.registry': 'Registry',
      'nav.travel': 'Travel',
      'nav.rsvp': 'RSVP',
      'story.title': 'Our Love Story',
      'story.how_we_met': 'How We Met',
      'story.first_date': 'First Date',
      'story.proposal': 'The Proposal',
      'party.title': 'Wedding Party',
      'party.bride_side': "Bride's Side",
      'party.groom_side': "Groom's Side",
      'party.maid_of_honor': 'Maid of Honor',
      'party.best_man': 'Best Man',
      'party.bridesmaid': 'Bridesmaid',
      'party.groomsman': 'Groomsman',
      'registry.title': 'Gift Registry',
      'registry.message':
        'Your presence is the greatest gift, but if you wish to honor us with a gift, we have registered at:',
      'travel.title': 'Travel Information',
      'travel.accommodation': 'Accommodation',
      'travel.transportation': 'Transportation',
      'travel.attractions': 'Local Attractions',
      'rsvp.title': 'RSVP',
      'rsvp.accept': 'Joyfully Accept',
      'rsvp.decline': 'Regretfully Decline',
      'rsvp.dietary': 'Dietary Restrictions',
      'rsvp.guests': 'Number of Guests',
      'venue.ceremony': 'Ceremony',
      'venue.reception': 'Reception',
      'venue.directions': 'Get Directions',
      'footer.created_with': 'Created with love using WedSync',
      'password.title': 'This website is password protected',
      'password.prompt': 'Please enter the password to continue',
      'password.submit': 'Enter',
      'password.incorrect': 'Incorrect password. Please try again.',
    };
  }

  clearCache(websiteId?: string): void {
    if (websiteId) {
      delete this.cache[websiteId];
    } else {
      this.cache = {};
    }
  }
}

export const translationService = new TranslationService();
