/**
 * LocaleManager Service - WS-247 Multilingual Platform System
 *
 * Manages supported locales, language preferences, and cultural wedding data.
 * Handles locale detection, switching, formatting, and regional customizations.
 *
 * @author WedSync Development Team
 * @version 1.0.0
 * @since 2025-01-03
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

/**
 * Supported locale codes for WedSync platform
 */
export type SupportedLocale =
  | 'en-US'
  | 'en-GB'
  | 'en-CA'
  | 'en-AU'
  | 'en-NZ'
  | 'en-IE'
  | 'en-ZA'
  | 'fr-FR'
  | 'fr-CA'
  | 'fr-BE'
  | 'fr-CH'
  | 'es-ES'
  | 'es-MX'
  | 'es-AR'
  | 'es-CO'
  | 'es-PE'
  | 'de-DE'
  | 'de-AT'
  | 'de-CH'
  | 'it-IT'
  | 'it-CH'
  | 'pt-PT'
  | 'pt-BR'
  | 'nl-NL'
  | 'nl-BE'
  | 'sv-SE'
  | 'no-NO'
  | 'da-DK'
  | 'fi-FI'
  | 'pl-PL'
  | 'cs-CZ'
  | 'sk-SK'
  | 'hu-HU'
  | 'ru-RU'
  | 'uk-UA'
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-CN'
  | 'zh-TW'
  | 'zh-HK'
  | 'hi-IN'
  | 'bn-BD'
  | 'ur-PK'
  | 'ar-SA'
  | 'he-IL'
  | 'th-TH'
  | 'vi-VN'
  | 'id-ID'
  | 'ms-MY'
  | 'tl-PH';

/**
 * Wedding cultural traditions and customs by region
 */
export interface WeddingCultureData {
  /** Traditional ceremony types for this culture */
  ceremonyTypes: Array<{
    id: string;
    name: string;
    description: string;
    duration: number;
    requirements: string[];
  }>;

  /** Cultural color significance */
  colorTraditions: {
    lucky: string[];
    unlucky: string[];
    bridal: string[];
    ceremonial: string[];
  };

  /** Traditional wedding phases/events */
  weddingPhases: Array<{
    phase: string;
    name: string;
    description: string;
    typicalDuration: string;
    participants: string[];
  }>;

  /** Regional date preferences */
  datePreferences: {
    luckyMonths: number[];
    unluckyMonths: number[];
    preferredDays: number[];
    avoidedDays: number[];
    specialDates: Array<{
      date: string;
      significance: string;
      recommended: boolean;
    }>;
  };

  /** Gift and monetary customs */
  giftTraditions: {
    typicalGifts: string[];
    moneyGiftCustoms: string;
    registryPreferences: string[];
  };

  /** Vendor type preferences */
  vendorPreferences: {
    essential: string[];
    traditional: string[];
    modern: string[];
  };
}

/**
 * Complete locale configuration including cultural data
 */
export interface LocaleConfig {
  /** Locale code (e.g., 'en-US') */
  code: SupportedLocale;

  /** Native language name */
  nativeName: string;

  /** English language name */
  englishName: string;

  /** Country/region code */
  countryCode: string;

  /** Currency code for pricing */
  currencyCode: string;

  /** Currency symbol */
  currencySymbol: string;

  /** Date format pattern */
  dateFormat: string;

  /** Time format (12h/24h) */
  timeFormat: '12h' | '24h';

  /** Number format settings */
  numberFormat: {
    decimal: string;
    thousands: string;
    grouping: number[];
  };

  /** Text direction */
  direction: 'ltr' | 'rtl';

  /** Cultural wedding data */
  weddingCulture: WeddingCultureData;

  /** Whether locale is fully supported */
  isFullySupported: boolean;

  /** Fallback locale if translations missing */
  fallbackLocale: SupportedLocale;
}

/**
 * User locale preferences stored in database
 */
export interface UserLocalePreference {
  userId: string;
  localeCode: SupportedLocale;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currencyCode?: string;
  timezone?: string;
  updatedAt: Date;
}

/**
 * Locale detection result
 */
export interface LocaleDetectionResult {
  /** Detected locale code */
  locale: SupportedLocale;

  /** Detection method used */
  method: 'cookie' | 'header' | 'ip' | 'browser' | 'default';

  /** Confidence score (0-100) */
  confidence: number;

  /** Whether locale is fully supported */
  isSupported: boolean;
}

/**
 * Formatting options for wedding-specific contexts
 */
export interface WeddingFormatOptions {
  /** Include cultural context */
  includeCultural?: boolean;

  /** Timezone for event formatting */
  timezone?: string;

  /** Wedding date for cultural calculations */
  weddingDate?: Date;

  /** Ceremony type for context */
  ceremonyType?: string;
}

/**
 * LocaleManager Service
 *
 * Singleton service for managing locales, preferences, and cultural data.
 * Provides comprehensive locale detection, formatting, and wedding-specific features.
 */
export class LocaleManager {
  private static instance: LocaleManager | null = null;
  private localeConfigs: Map<SupportedLocale, LocaleConfig> = new Map();
  private isInitialized = false;
  private currentLocale: SupportedLocale = 'en-US';

  /**
   * Default fallback locale
   */
  public static readonly DEFAULT_LOCALE: SupportedLocale = 'en-US';

  /**
   * Cookie name for storing locale preference
   */
  public static readonly LOCALE_COOKIE = 'wedsync-locale';

  /**
   * Get singleton instance of LocaleManager
   */
  public static getInstance(): LocaleManager {
    if (!LocaleManager.instance) {
      LocaleManager.instance = new LocaleManager();
    }
    return LocaleManager.instance;
  }

  /**
   * Private constructor - use getInstance()
   */
  private constructor() {
    this.initializeLocales();
  }

  /**
   * Initialize locale configurations with cultural data
   */
  private initializeLocales(): void {
    // English locales
    this.localeConfigs.set('en-US', {
      code: 'en-US',
      nativeName: 'English (United States)',
      englishName: 'English (United States)',
      countryCode: 'US',
      currencyCode: 'USD',
      currencySymbol: '$',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: { decimal: '.', thousands: ',', grouping: [3] },
      direction: 'ltr',
      isFullySupported: true,
      fallbackLocale: 'en-US',
      weddingCulture: {
        ceremonyTypes: [
          {
            id: 'traditional',
            name: 'Traditional American Wedding',
            description:
              'Classic ceremony with processional, vows, ring exchange',
            duration: 30,
            requirements: ['Officiant', 'Venue', 'Witnesses'],
          },
          {
            id: 'destination',
            name: 'Destination Wedding',
            description: 'Intimate ceremony in exotic location',
            duration: 45,
            requirements: ['Travel permits', 'Local officiant', 'Witnesses'],
          },
        ],
        colorTraditions: {
          lucky: ['white', 'ivory', 'blush', 'gold'],
          unlucky: ['black', 'red'],
          bridal: ['white', 'ivory', 'champagne'],
          ceremonial: ['white', 'gold', 'silver', 'blush'],
        },
        weddingPhases: [
          {
            phase: 'engagement',
            name: 'Engagement Period',
            description: 'Planning and preparation phase',
            typicalDuration: '12-18 months',
            participants: ['Couple', 'Wedding planner', 'Family'],
          },
          {
            phase: 'ceremony',
            name: 'Wedding Ceremony',
            description: 'Official marriage ceremony',
            typicalDuration: '30-45 minutes',
            participants: ['Couple', 'Officiant', 'Wedding party', 'Guests'],
          },
          {
            phase: 'reception',
            name: 'Wedding Reception',
            description: 'Celebration party following ceremony',
            typicalDuration: '4-6 hours',
            participants: ['Couple', 'Guests', 'Entertainment', 'Catering'],
          },
        ],
        datePreferences: {
          luckyMonths: [5, 6, 9, 10],
          unluckyMonths: [1, 2, 12],
          preferredDays: [6, 0], // Saturday, Sunday
          avoidedDays: [1, 2], // Monday, Tuesday
          specialDates: [
            {
              date: '02-14',
              significance: "Valentine's Day - romantic but expensive",
              recommended: false,
            },
          ],
        },
        giftTraditions: {
          typicalGifts: ['Household items', 'Cash', 'Experience gifts'],
          moneyGiftCustoms: 'Cash gifts in cards, registry preferred',
          registryPreferences: ['Home goods', 'Experiences', 'Cash funds'],
        },
        vendorPreferences: {
          essential: ['Photographer', 'Venue', 'Catering', 'Music'],
          traditional: ['Florist', 'Transportation', 'Videographer'],
          modern: ['Photo booth', 'Live streaming', 'Social media manager'],
        },
      },
    });

    this.localeConfigs.set('en-GB', {
      code: 'en-GB',
      nativeName: 'English (United Kingdom)',
      englishName: 'English (United Kingdom)',
      countryCode: 'GB',
      currencyCode: 'GBP',
      currencySymbol: '£',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: { decimal: '.', thousands: ',', grouping: [3] },
      direction: 'ltr',
      isFullySupported: true,
      fallbackLocale: 'en-US',
      weddingCulture: {
        ceremonyTypes: [
          {
            id: 'church_england',
            name: 'Church of England Wedding',
            description: 'Traditional Anglican ceremony',
            duration: 45,
            requirements: ['Banns reading', 'Church booking', 'Licensed venue'],
          },
          {
            id: 'civil_ceremony',
            name: 'Civil Ceremony',
            description: 'Non-religious ceremony at approved venue',
            duration: 30,
            requirements: ['Registrar', 'Approved venue', 'Notice given'],
          },
        ],
        colorTraditions: {
          lucky: ['white', 'ivory', 'blue'],
          unlucky: ['green', 'yellow'],
          bridal: ['white', 'ivory', 'cream'],
          ceremonial: ['white', 'blue', 'silver'],
        },
        weddingPhases: [
          {
            phase: 'engagement',
            name: 'Engagement',
            description: 'Formal announcement and planning',
            typicalDuration: '12-24 months',
            participants: ['Couple', 'Families', 'Wedding planner'],
          },
        ],
        datePreferences: {
          luckyMonths: [4, 5, 6, 7, 8, 9],
          unluckyMonths: [1, 2, 11, 12],
          preferredDays: [6, 0],
          avoidedDays: [5], // Friday
          specialDates: [],
        },
        giftTraditions: {
          typicalGifts: ['China sets', 'Silver', 'Household items'],
          moneyGiftCustoms: 'Traditional gift list preferred over cash',
          registryPreferences: ['John Lewis', 'Harrods', 'Traditional items'],
        },
        vendorPreferences: {
          essential: ['Photographer', 'Venue', 'Catering'],
          traditional: ['Florist', 'Cars', 'String quartet'],
          modern: ['DJ', 'Photo booth', 'Videographer'],
        },
      },
    });

    // Add more locales as needed...
    this.isInitialized = true;
  }

  /**
   * Get all supported locale codes
   */
  public getSupportedLocales(): SupportedLocale[] {
    return Array.from(this.localeConfigs.keys());
  }

  /**
   * Get locale configuration by code
   */
  public getLocaleConfig(localeCode: SupportedLocale): LocaleConfig | null {
    return this.localeConfigs.get(localeCode) || null;
  }

  /**
   * Check if locale is supported
   */
  public isLocaleSupported(localeCode: string): localeCode is SupportedLocale {
    return this.localeConfigs.has(localeCode as SupportedLocale);
  }

  /**
   * Detect user's preferred locale from various sources
   */
  public async detectLocale(): Promise<LocaleDetectionResult> {
    // 1. Check cookie preference (highest priority)
    const cookieLocale = await this.getLocaleFromCookie();
    if (cookieLocale) {
      return {
        locale: cookieLocale,
        method: 'cookie',
        confidence: 100,
        isSupported: true,
      };
    }

    // 2. Check Accept-Language header
    const headerLocale = await this.getLocaleFromHeaders();
    if (headerLocale) {
      return {
        locale: headerLocale.locale,
        method: 'header',
        confidence: headerLocale.confidence,
        isSupported: this.isLocaleSupported(headerLocale.locale),
      };
    }

    // 3. Fallback to default
    return {
      locale: LocaleManager.DEFAULT_LOCALE,
      method: 'default',
      confidence: 50,
      isSupported: true,
    };
  }

  /**
   * Get locale from cookie
   */
  private async getLocaleFromCookie(): Promise<SupportedLocale | null> {
    try {
      if (typeof window !== 'undefined') {
        // Client-side
        const cookieValue = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${LocaleManager.LOCALE_COOKIE}=`))
          ?.split('=')[1];

        if (cookieValue && this.isLocaleSupported(cookieValue)) {
          return cookieValue as SupportedLocale;
        }
      } else {
        // Server-side
        const cookieStore = await cookies();
        const cookieValue = cookieStore.get(LocaleManager.LOCALE_COOKIE)?.value;

        if (cookieValue && this.isLocaleSupported(cookieValue)) {
          return cookieValue as SupportedLocale;
        }
      }
    } catch (error) {
      console.warn('Error reading locale cookie:', error);
    }

    return null;
  }

  /**
   * Get locale from Accept-Language headers
   */
  private async getLocaleFromHeaders(): Promise<{
    locale: SupportedLocale;
    confidence: number;
  } | null> {
    try {
      if (typeof window === 'undefined') {
        // Server-side
        const headersList = await headers();
        const acceptLanguage = headersList.get('accept-language');

        if (acceptLanguage) {
          return this.parseAcceptLanguage(acceptLanguage);
        }
      } else {
        // Client-side - use navigator.languages
        if (navigator.languages && navigator.languages.length > 0) {
          for (const lang of navigator.languages) {
            const locale = this.normalizeLocaleCode(lang);
            if (locale && this.isLocaleSupported(locale)) {
              return { locale, confidence: 90 };
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error reading locale headers:', error);
    }

    return null;
  }

  /**
   * Parse Accept-Language header
   */
  private parseAcceptLanguage(
    acceptLanguage: string,
  ): { locale: SupportedLocale; confidence: number } | null {
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q = '1.0'] = lang.trim().split(';q=');
        return {
          code: this.normalizeLocaleCode(code),
          quality: parseFloat(q),
        };
      })
      .filter((lang) => lang.code && this.isLocaleSupported(lang.code))
      .sort((a, b) => b.quality - a.quality);

    if (languages.length > 0) {
      return {
        locale: languages[0].code as SupportedLocale,
        confidence: Math.min(95, languages[0].quality * 100),
      };
    }

    return null;
  }

  /**
   * Normalize locale code to supported format
   */
  private normalizeLocaleCode(code: string): SupportedLocale | null {
    // Remove any extra parts and normalize
    const normalized = code.toLowerCase().replace(/_/g, '-');

    // Try exact match first
    const exact = this.getSupportedLocales().find(
      (locale) => locale.toLowerCase() === normalized,
    );
    if (exact) return exact;

    // Try language match with default region
    const language = normalized.split('-')[0];
    const languageMatch = this.getSupportedLocales().find((locale) =>
      locale.toLowerCase().startsWith(language + '-'),
    );
    if (languageMatch) return languageMatch;

    return null;
  }

  /**
   * Set user's locale preference
   */
  public async setLocale(localeCode: SupportedLocale): Promise<void> {
    if (!this.isLocaleSupported(localeCode)) {
      throw new Error(`Unsupported locale: ${localeCode}`);
    }

    this.currentLocale = localeCode;

    // Set cookie
    await this.setLocaleCookie(localeCode);

    // Update database preference if user is logged in
    await this.updateUserLocalePreference(localeCode);
  }

  /**
   * Set locale cookie
   */
  private async setLocaleCookie(localeCode: SupportedLocale): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Client-side
        document.cookie = `${LocaleManager.LOCALE_COOKIE}=${localeCode}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        // Server-side
        const cookieStore = await cookies();
        cookieStore.set(LocaleManager.LOCALE_COOKIE, localeCode, {
          path: '/',
          maxAge: 31536000, // 1 year
          sameSite: 'lax',
        });
      }
    } catch (error) {
      console.warn('Error setting locale cookie:', error);
    }
  }

  /**
   * Update user locale preference in database
   */
  private async updateUserLocalePreference(
    localeCode: SupportedLocale,
  ): Promise<void> {
    try {
      const supabase =
        typeof window !== 'undefined'
          ? createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            )
          : createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  async getAll() {
                    return (await cookies()).getAll();
                  },
                  async setAll(cookiesToSet) {
                    const cookieStore = await cookies();
                    cookiesToSet.forEach(({ name, value, options }) =>
                      cookieStore.set(name, value, options),
                    );
                  },
                },
              },
            );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('user_locale_preferences').upsert({
          user_id: user.id,
          locale_code: localeCode,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('Error updating user locale preference:', error);
    }
  }

  /**
   * Get current locale
   */
  public getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Format date for wedding context
   */
  public formatWeddingDate(
    date: Date,
    localeCode: SupportedLocale = this.currentLocale,
    options: WeddingFormatOptions = {},
  ): string {
    const config = this.getLocaleConfig(localeCode);
    if (!config) {
      throw new Error(`Locale configuration not found: ${localeCode}`);
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    if (options.timezone) {
      formatOptions.timeZone = options.timezone;
    }

    const formatter = new Intl.DateTimeFormat(localeCode, formatOptions);
    let formattedDate = formatter.format(date);

    // Add cultural context if requested
    if (options.includeCultural && options.weddingDate) {
      const culturalNote = this.getCulturalDateSignificance(date, config);
      if (culturalNote) {
        formattedDate += ` (${culturalNote})`;
      }
    }

    return formattedDate;
  }

  /**
   * Format currency for pricing
   */
  public formatCurrency(
    amount: number,
    localeCode: SupportedLocale = this.currentLocale,
    currencyCode?: string,
  ): string {
    const config = this.getLocaleConfig(localeCode);
    if (!config) {
      throw new Error(`Locale configuration not found: ${localeCode}`);
    }

    const currency = currencyCode || config.currencyCode;

    return new Intl.NumberFormat(localeCode, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Format number with locale-specific formatting
   */
  public formatNumber(
    value: number,
    localeCode: SupportedLocale = this.currentLocale,
    options: Intl.NumberFormatOptions = {},
  ): string {
    return new Intl.NumberFormat(localeCode, options).format(value);
  }

  /**
   * Get cultural significance of a wedding date
   */
  private getCulturalDateSignificance(
    date: Date,
    config: LocaleConfig,
  ): string | null {
    const month = date.getMonth() + 1;
    const { datePreferences } = config.weddingCulture;

    if (datePreferences.luckyMonths.includes(month)) {
      return 'Traditionally lucky month for weddings';
    }

    if (datePreferences.unluckyMonths.includes(month)) {
      return 'Less traditional month for weddings';
    }

    // Check special dates
    const dateStr = `${String(month).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const specialDate = datePreferences.specialDates.find(
      (sd) => sd.date === dateStr,
    );

    if (specialDate) {
      return specialDate.significance;
    }

    return null;
  }

  /**
   * Get wedding cultural data for locale
   */
  public getWeddingCultureData(
    localeCode: SupportedLocale = this.currentLocale,
  ): WeddingCultureData {
    const config = this.getLocaleConfig(localeCode);
    if (!config) {
      throw new Error(`Locale configuration not found: ${localeCode}`);
    }

    return config.weddingCulture;
  }

  /**
   * Get recommended vendors for locale
   */
  public getRecommendedVendorTypes(
    localeCode: SupportedLocale = this.currentLocale,
  ): {
    essential: string[];
    traditional: string[];
    modern: string[];
  } {
    const cultureData = this.getWeddingCultureData(localeCode);
    return cultureData.vendorPreferences;
  }

  /**
   * Validate locale code format
   */
  public static isValidLocaleFormat(code: string): boolean {
    return /^[a-z]{2}-[A-Z]{2}$/.test(code);
  }

  /**
   * Get user's stored locale preference from database
   */
  public async getUserLocalePreference(
    userId: string,
  ): Promise<UserLocalePreference | null> {
    try {
      const supabase =
        typeof window !== 'undefined'
          ? createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            )
          : createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  async getAll() {
                    return (await cookies()).getAll();
                  },
                  async setAll(cookiesToSet) {
                    const cookieStore = await cookies();
                    cookiesToSet.forEach(({ name, value, options }) =>
                      cookieStore.set(name, value, options),
                    );
                  },
                },
              },
            );

      const { data, error } = await supabase
        .from('user_locale_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        localeCode: data.locale_code,
        dateFormat: data.date_format,
        timeFormat: data.time_format,
        currencyCode: data.currency_code,
        timezone: data.timezone,
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.warn('Error fetching user locale preference:', error);
      return null;
    }
  }

  /**
   * Get organization default locale
   */
  public async getOrganizationLocale(
    organizationId: string,
  ): Promise<SupportedLocale> {
    try {
      const supabase =
        typeof window !== 'undefined'
          ? createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            )
          : createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  async getAll() {
                    return (await cookies()).getAll();
                  },
                  async setAll(cookiesToSet) {
                    const cookieStore = await cookies();
                    cookiesToSet.forEach(({ name, value, options }) =>
                      cookieStore.set(name, value, options),
                    );
                  },
                },
              },
            );

      const { data } = await supabase
        .from('organizations')
        .select('default_locale')
        .eq('id', organizationId)
        .single();

      if (data?.default_locale && this.isLocaleSupported(data.default_locale)) {
        return data.default_locale as SupportedLocale;
      }
    } catch (error) {
      console.warn('Error fetching organization locale:', error);
    }

    return LocaleManager.DEFAULT_LOCALE;
  }

  /**
   * Initialize locale for current session
   */
  public async initialize(): Promise<void> {
    if (!this.isInitialized) {
      this.initializeLocales();
    }

    const detectionResult = await this.detectLocale();
    this.currentLocale = detectionResult.locale;
  }
}

/**
 * Convenience function to get LocaleManager singleton
 */
export const getLocaleManager = (): LocaleManager =>
  LocaleManager.getInstance();

/**
 * Export default instance
 */
export default LocaleManager.getInstance();
