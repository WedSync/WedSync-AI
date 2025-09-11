/**
 * Internationalization (i18n) Types for WS-247 Multilingual Platform System
 *
 * Comprehensive TypeScript types for wedding industry multilingual support.
 * Covers 16 languages, 35+ locales, cultural traditions, and wedding-specific
 * internationalization features.
 *
 * @author WedSync Development Team
 * @version 1.0.0
 * @since 2025-01-03
 */

// =============================================================================
// CORE LANGUAGE & LOCALE TYPES
// =============================================================================

/**
 * Supported language codes following ISO 639-1 standard
 */
export type SupportedLanguageCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'nl' // Dutch
  | 'sv' // Swedish
  | 'no' // Norwegian
  | 'da' // Danish
  | 'fi' // Finnish
  | 'pl' // Polish
  | 'cs' // Czech
  | 'sk' // Slovak
  | 'hu' // Hungarian
  | 'ru' // Russian
  | 'uk' // Ukrainian
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'zh' // Chinese
  | 'hi' // Hindi
  | 'bn' // Bengali
  | 'ur' // Urdu
  | 'ar' // Arabic
  | 'he'; // Hebrew

/**
 * Wedding market locales with country/region specificity
 * Following BCP 47 language tag format
 */
export type WeddingMarketLocale =
  // English variants
  | 'en-US'
  | 'en-GB'
  | 'en-CA'
  | 'en-AU'
  | 'en-NZ'
  | 'en-IE'
  | 'en-ZA'
  // Spanish variants
  | 'es-ES'
  | 'es-MX'
  | 'es-AR'
  | 'es-CO'
  | 'es-PE'
  | 'es-CL'
  | 'es-VE'
  // French variants
  | 'fr-FR'
  | 'fr-CA'
  | 'fr-BE'
  | 'fr-CH'
  // German variants
  | 'de-DE'
  | 'de-AT'
  | 'de-CH'
  // Italian variants
  | 'it-IT'
  | 'it-CH'
  // Portuguese variants
  | 'pt-PT'
  | 'pt-BR'
  // Dutch variants
  | 'nl-NL'
  | 'nl-BE'
  // Nordic languages
  | 'sv-SE'
  | 'no-NO'
  | 'da-DK'
  | 'fi-FI'
  // Central European
  | 'pl-PL'
  | 'cs-CZ'
  | 'sk-SK'
  | 'hu-HU'
  // Eastern European
  | 'ru-RU'
  | 'uk-UA'
  // East Asian
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-CN'
  | 'zh-TW'
  | 'zh-HK'
  // South Asian
  | 'hi-IN'
  | 'bn-BD'
  | 'ur-PK'
  // Middle Eastern
  | 'ar-SA'
  | 'ar-AE'
  | 'ar-EG'
  | 'ar-JO'
  | 'ar-LB'
  | 'ar-MA'
  | 'ar-QA'
  | 'ar-KW'
  | 'ar-BH'
  | 'ar-OM'
  | 'ar-YE'
  | 'ar-SY'
  | 'ar-IQ'
  | 'ar-PS'
  | 'ar-SD'
  | 'ar-LY'
  | 'ar-TN'
  | 'ar-DZ'
  | 'he-IL';

/**
 * Text direction for RTL/LTR support
 */
export type TextDirection = 'ltr' | 'rtl';

// =============================================================================
// WEDDING CULTURAL TYPES
// =============================================================================

/**
 * Wedding cultural traditions supported by the platform
 */
export type WeddingTraditionType =
  | 'western' // Western/European traditions
  | 'islamic' // Islamic wedding customs
  | 'hindu' // Hindu wedding traditions
  | 'jewish' // Jewish wedding customs
  | 'chinese' // Chinese wedding traditions
  | 'japanese' // Japanese wedding customs
  | 'korean' // Korean wedding traditions
  | 'indian_sikh' // Sikh wedding customs
  | 'buddhist' // Buddhist wedding traditions
  | 'latin_american' // Latin American customs
  | 'african' // African wedding traditions
  | 'nordic'; // Nordic/Scandinavian customs

/**
 * Wedding ceremony types with cultural context
 */
export type WeddingCeremonyType =
  | 'civil' // Civil ceremony
  | 'religious' // Religious ceremony
  | 'spiritual' // Spiritual/non-denominational
  | 'destination' // Destination wedding
  | 'elopement' // Intimate elopement
  | 'cultural_fusion' // Multi-cultural fusion
  | 'traditional' // Traditional cultural ceremony
  | 'modern_casual'; // Modern casual ceremony

// =============================================================================
// CURRENCY & FINANCIAL TYPES
// =============================================================================

/**
 * Supported currency codes for wedding markets
 */
export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'NZD'
  | 'CHF'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK'
  | 'HUF'
  | 'RUB'
  | 'UAH'
  | 'JPY'
  | 'KRW'
  | 'CNY'
  | 'HKD'
  | 'TWD'
  | 'INR'
  | 'PKR'
  | 'BDT'
  | 'SAR'
  | 'AED'
  | 'EGP'
  | 'JOD'
  | 'LBP'
  | 'MAD'
  | 'QAR'
  | 'KWD'
  | 'BHD'
  | 'OMR'
  | 'YER'
  | 'SYP'
  | 'IQD'
  | 'ILS';

/**
 * Currency display options
 */
export interface CurrencyDisplayOptions {
  readonly style: 'currency' | 'accounting' | 'code' | 'symbol';
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly useGrouping?: boolean;
  readonly currencyDisplay?: 'symbol' | 'code' | 'name';
}

/**
 * Wedding budget categories for localized financial planning
 */
export type WeddingBudgetCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'music_entertainment'
  | 'flowers_decor'
  | 'attire_beauty'
  | 'transportation'
  | 'stationery'
  | 'rings_jewelry'
  | 'honeymoon'
  | 'gifts_favors'
  | 'miscellaneous';

// =============================================================================
// DATE & TIME LOCALIZATION TYPES
// =============================================================================

/**
 * Date format patterns for different cultures
 */
export type DateFormatPattern =
  | 'MM/DD/YYYY' // US format
  | 'DD/MM/YYYY' // European format
  | 'YYYY-MM-DD' // ISO format
  | 'DD.MM.YYYY' // German format
  | 'DD/MM/YY' // Short European
  | 'MMM DD, YYYY' // Long US format
  | 'DD MMM YYYY'; // Long European format

/**
 * Calendar system types
 */
export type CalendarSystem =
  | 'gregorian' // Standard Western calendar
  | 'lunar' // Lunar calendar (Chinese, Islamic)
  | 'solar_hijri' // Persian calendar
  | 'hebrew' // Hebrew calendar
  | 'buddhist' // Buddhist calendar
  | 'thai'; // Thai calendar

/**
 * Time format preferences
 */
export type TimeFormat = '12h' | '24h';

// =============================================================================
// ADDRESS & LOCATION TYPES
// =============================================================================

/**
 * Address format patterns by country/region
 */
export type AddressFormat =
  | 'US' // United States format
  | 'UK' // United Kingdom format
  | 'EU' // European Union format
  | 'CA' // Canadian format
  | 'AU' // Australian format
  | 'JP' // Japanese format
  | 'CN' // Chinese format
  | 'IN' // Indian format
  | 'BR' // Brazilian format
  | 'MX' // Mexican format
  | 'AR_STANDARD' // Arabic countries standard
  | 'NORDIC'; // Nordic countries

/**
 * Address field configurations by format
 */
export interface AddressFieldConfig {
  readonly format: AddressFormat;
  readonly required_fields: readonly string[];
  readonly optional_fields: readonly string[];
  readonly field_order: readonly string[];
  readonly validation_patterns: Record<string, RegExp>;
  readonly labels: Record<WeddingMarketLocale, Record<string, string>>;
  readonly placeholders: Record<WeddingMarketLocale, Record<string, string>>;
}

// =============================================================================
// FORM & INPUT TYPES
// =============================================================================

/**
 * Multilingual form field types
 */
export type MultilingualFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'password'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime'
  | 'number'
  | 'currency'
  | 'address'
  | 'file'
  | 'image';

/**
 * Form field validation rules
 */
export interface ValidationRule {
  readonly pattern?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly required?: boolean;
  readonly custom?: (value: any) => string | null;
}

/**
 * Multilingual form field definition
 */
export interface MultilingualFormField {
  readonly name: string;
  readonly type: MultilingualFieldType;
  readonly label: Record<WeddingMarketLocale, string>;
  readonly placeholder?: Record<WeddingMarketLocale, string>;
  readonly help_text?: Record<WeddingMarketLocale, string>;
  readonly validation?: ValidationRule;
  readonly options?: readonly {
    readonly value: string;
    readonly label: Record<WeddingMarketLocale, string>;
  }[];
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly cultural_specific?: Record<
    WeddingTraditionType,
    Partial<MultilingualFormField>
  >;
}

// =============================================================================
// WEDDING TRADITION DETAILS
// =============================================================================

/**
 * Wedding tradition complexity levels
 */
export type TraditionComplexity =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'elaborate';

/**
 * Wedding tradition timing phases
 */
export type TraditionTiming =
  | 'pre_engagement'
  | 'engagement'
  | 'pre_wedding'
  | 'ceremony'
  | 'reception'
  | 'post_wedding'
  | 'anniversary';

/**
 * Cultural color significance
 */
export interface CulturalColorSignificance {
  readonly color: string;
  readonly hex_code: string;
  readonly significance: Record<WeddingMarketLocale, string>;
  readonly appropriate_uses: readonly string[];
  readonly cultural_restrictions?: Record<WeddingTraditionType, string>;
}

/**
 * Wedding tradition metadata
 */
export interface WeddingTraditionMetadata {
  readonly id: string;
  readonly name: Record<WeddingMarketLocale, string>;
  readonly tradition_type: WeddingTraditionType;
  readonly complexity: TraditionComplexity;
  readonly timing: readonly TraditionTiming[];
  readonly description: Record<WeddingMarketLocale, string>;
  readonly cultural_significance: Record<WeddingMarketLocale, string>;
  readonly modern_adaptations: Record<WeddingMarketLocale, readonly string[]>;
  readonly required_elements: readonly string[];
  readonly optional_elements: readonly string[];
  readonly color_significance: readonly CulturalColorSignificance[];
  readonly symbolic_items: Record<WeddingMarketLocale, readonly string[]>;
  readonly regional_variations: Record<
    string,
    Partial<WeddingTraditionMetadata>
  >;
}

// =============================================================================
// VENDOR & SERVICE TYPES
// =============================================================================

/**
 * Wedding vendor types with cultural specializations
 */
export type WeddingVendorType =
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'catering'
  | 'florist'
  | 'music_dj'
  | 'band'
  | 'officiant'
  | 'planner'
  | 'decorator'
  | 'transportation'
  | 'bakery'
  | 'bridal_attire'
  | 'groom_attire'
  | 'jewelry'
  | 'makeup_hair'
  | 'invitations'
  | 'cultural_specialist';

/**
 * Service pricing tiers by market
 */
export type PricingTier = 'budget' | 'moderate' | 'premium' | 'luxury';

/**
 * Vendor cultural specialization
 */
export interface VendorCulturalSpecialization {
  readonly vendor_type: WeddingVendorType;
  readonly specialized_traditions: readonly WeddingTraditionType[];
  readonly languages_spoken: readonly SupportedLanguageCode[];
  readonly cultural_expertise_level:
    | 'basic'
    | 'intermediate'
    | 'expert'
    | 'master';
  readonly certification_details?: Record<WeddingMarketLocale, string>;
  readonly portfolio_highlights: Record<WeddingMarketLocale, readonly string[]>;
}

// =============================================================================
// GUEST & INVITATION TYPES
// =============================================================================

/**
 * Guest relationship categories for cultural context
 */
export type GuestRelationship =
  | 'immediate_family'
  | 'extended_family'
  | 'close_friends'
  | 'friends'
  | 'colleagues'
  | 'family_friends'
  | 'community_members'
  | 'plus_ones';

/**
 * RSVP response options (culturally sensitive)
 */
export type RSVPResponse =
  | 'attending'
  | 'not_attending'
  | 'maybe'
  | 'attending_partially' // For multi-day weddings
  | 'pending';

/**
 * Invitation delivery preferences
 */
export type InvitationDeliveryMethod =
  | 'digital'
  | 'physical_mail'
  | 'hand_delivery'
  | 'mixed';

// =============================================================================
// ACCESSIBILITY & INCLUSION TYPES
// =============================================================================

/**
 * Accessibility requirements for multilingual content
 */
export interface AccessibilityRequirements {
  readonly screen_reader_support: boolean;
  readonly high_contrast_mode: boolean;
  readonly font_size_scaling: boolean;
  readonly keyboard_navigation: boolean;
  readonly audio_descriptions: boolean;
  readonly visual_indicators: boolean;
  readonly cognitive_assistance: boolean;
}

/**
 * Inclusive language options
 */
export interface InclusiveLanguageOptions {
  readonly gender_neutral_terms: Record<
    WeddingMarketLocale,
    Record<string, string>
  >;
  readonly relationship_terms: Record<WeddingMarketLocale, readonly string[]>;
  readonly family_structure_terms: Record<
    WeddingMarketLocale,
    readonly string[]
  >;
  readonly ceremony_role_terms: Record<WeddingMarketLocale, readonly string[]>;
}

// =============================================================================
// COMPONENT PROPS INTERFACES
// =============================================================================

/**
 * Base props for all multilingual components
 */
export interface MultilingualBaseProps {
  readonly locale?: WeddingMarketLocale;
  readonly tradition?: WeddingTraditionType;
  readonly textDirection?: TextDirection;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Language switcher component props
 */
export interface LanguageSwitcherProps extends MultilingualBaseProps {
  readonly onLanguageChange?: (locale: WeddingMarketLocale) => void;
  readonly supportedLanguages?: readonly WeddingMarketLocale[];
  readonly showFlags?: boolean;
  readonly showNativeNames?: boolean;
  readonly compact?: boolean;
  readonly disabled?: boolean;
}

/**
 * RTL layout provider props
 */
export interface RTLLayoutProviderProps extends MultilingualBaseProps {
  readonly children: React.ReactNode;
  readonly enableTransitions?: boolean;
  readonly forceDirection?: TextDirection;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Localized string map for text content
 */
export type LocalizedString = Partial<Record<WeddingMarketLocale, string>>;

/**
 * Localized string array for lists
 */
export type LocalizedStringArray = Partial<
  Record<WeddingMarketLocale, readonly string[]>
>;

/**
 * Cultural preference mapping
 */
export type CulturalPreferenceMap<T> = Partial<Record<WeddingTraditionType, T>>;

/**
 * Market-specific configuration
 */
export type MarketConfiguration<T> = Partial<Record<WeddingMarketLocale, T>>;

/**
 * Vendor specialization mapping
 */
export type VendorSpecializationMap = Record<
  WeddingVendorType,
  VendorCulturalSpecialization
>;

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

/**
 * Platform internationalization configuration
 */
export interface I18nConfiguration {
  readonly default_locale: WeddingMarketLocale;
  readonly fallback_locale: WeddingMarketLocale;
  readonly supported_locales: readonly WeddingMarketLocale[];
  readonly rtl_locales: readonly WeddingMarketLocale[];
  readonly date_formats: Record<WeddingMarketLocale, DateFormatPattern>;
  readonly time_formats: Record<WeddingMarketLocale, TimeFormat>;
  readonly currency_configs: Record<WeddingMarketLocale, CurrencyCode>;
  readonly address_formats: Record<WeddingMarketLocale, AddressFormat>;
  readonly cultural_traditions: Record<
    WeddingMarketLocale,
    readonly WeddingTraditionType[]
  >;
  readonly vendor_specializations: VendorSpecializationMap;
  readonly accessibility_settings: AccessibilityRequirements;
  readonly inclusive_language: InclusiveLanguageOptions;
}

/**
 * Wedding market metadata for each locale
 */
export interface WeddingMarketMetadata {
  readonly locale: WeddingMarketLocale;
  readonly language_code: SupportedLanguageCode;
  readonly country_code: string;
  readonly region: string;
  readonly market_size: 'small' | 'medium' | 'large' | 'major';
  readonly primary_traditions: readonly WeddingTraditionType[];
  readonly seasonal_preferences: Record<
    string,
    'peak' | 'moderate' | 'off-season'
  >;
  readonly average_budget_ranges: Record<
    PricingTier,
    { min: number; max: number; currency: CurrencyCode }
  >;
  readonly cultural_considerations: LocalizedString;
  readonly legal_requirements: LocalizedString;
  readonly popular_venues: LocalizedStringArray;
  readonly traditional_colors: readonly CulturalColorSignificance[];
  readonly gift_giving_customs: LocalizedString;
  readonly ceremony_duration_norms: { min_hours: number; max_hours: number };
  readonly guest_count_averages: { min: number; max: number; typical: number };
}

// =============================================================================
// ERROR & VALIDATION TYPES
// =============================================================================

/**
 * Internationalization error types
 */
export type I18nErrorType =
  | 'missing_translation'
  | 'invalid_locale'
  | 'unsupported_tradition'
  | 'currency_conversion_error'
  | 'date_format_error'
  | 'address_validation_error'
  | 'cultural_restriction_violation';

/**
 * Localized error messages
 */
export interface I18nError {
  readonly type: I18nErrorType;
  readonly message: LocalizedString;
  readonly details?: LocalizedString;
  readonly suggested_action?: LocalizedString;
  readonly error_code?: string;
}

// =============================================================================
// EXPORT ORGANIZATION
// =============================================================================

// Core types for immediate use
export type {
  SupportedLanguageCode,
  WeddingMarketLocale,
  TextDirection,
  WeddingTraditionType,
  WeddingCeremonyType,
  CurrencyCode,
  DateFormatPattern,
  CalendarSystem,
  TimeFormat,
  AddressFormat,
  MultilingualFieldType,
  TraditionComplexity,
  TraditionTiming,
  WeddingVendorType,
  PricingTier,
  GuestRelationship,
  RSVPResponse,
  InvitationDeliveryMethod,
};

// Configuration interfaces
export type {
  I18nConfiguration,
  WeddingMarketMetadata,
  MultilingualFormField,
  WeddingTraditionMetadata,
  VendorCulturalSpecialization,
  CulturalColorSignificance,
  AddressFieldConfig,
  AccessibilityRequirements,
  InclusiveLanguageOptions,
};

// Component props
export type {
  MultilingualBaseProps,
  LanguageSwitcherProps,
  RTLLayoutProviderProps,
};

// Utility types
export type {
  LocalizedString,
  LocalizedStringArray,
  CulturalPreferenceMap,
  MarketConfiguration,
  VendorSpecializationMap,
  I18nError,
  I18nErrorType,
};

// Additional interfaces
export type { CurrencyDisplayOptions, ValidationRule, WeddingBudgetCategory };

/**
 * Default export with common configurations
 */
export const I18nDefaults = {
  DEFAULT_LOCALE: 'en-US' as WeddingMarketLocale,
  FALLBACK_LOCALE: 'en-US' as WeddingMarketLocale,
  RTL_LOCALES: [
    'ar-SA',
    'ar-AE',
    'ar-EG',
    'ar-JO',
    'ar-LB',
    'ar-MA',
    'ar-QA',
    'ar-KW',
    'ar-BH',
    'ar-OM',
    'ar-YE',
    'ar-SY',
    'ar-IQ',
    'ar-PS',
    'ar-SD',
    'ar-LY',
    'ar-TN',
    'ar-DZ',
    'he-IL',
  ] as readonly WeddingMarketLocale[],
  SUPPORTED_CURRENCIES: [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'CNY',
    'INR',
    'SAR',
    'AED',
  ] as readonly CurrencyCode[],
  WEDDING_TRADITIONS: [
    'western',
    'islamic',
    'hindu',
    'jewish',
    'chinese',
    'japanese',
    'korean',
    'indian_sikh',
    'buddhist',
    'latin_american',
    'african',
    'nordic',
  ] as readonly WeddingTraditionType[],
} as const;

export default I18nDefaults;
