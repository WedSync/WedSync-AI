export interface KeyboardLayout {
  id: string;
  name: string;
  language: string;
  script: string;
  inputMode:
    | 'text'
    | 'numeric'
    | 'decimal'
    | 'tel'
    | 'email'
    | 'url'
    | 'search';
  direction: 'ltr' | 'rtl';
  hasSpecialChars: boolean;
  commonChars: string[];
  numericSeparator: '.' | ',';
  dateFormat: string;
  timeFormat: 'HH:mm' | 'h:mm a';
}

export interface MobileInputConfig {
  language: string;
  inputMode?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  spellCheck?: boolean;
  autoComplete?: string;
  pattern?: string;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
}

export interface WeddingFieldConfig extends MobileInputConfig {
  fieldType:
    | 'name'
    | 'email'
    | 'phone'
    | 'address'
    | 'date'
    | 'time'
    | 'currency'
    | 'text'
    | 'number';
  culturalFormat?: boolean;
  validation?: RegExp;
  mask?: string;
}

// Keyboard layouts for different languages
export const KEYBOARD_LAYOUTS: KeyboardLayout[] = [
  // Western European
  {
    id: 'en-US',
    name: 'English (US)',
    language: 'en',
    script: 'Latin',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: false,
    commonChars: ['a-z', 'A-Z', '0-9', '.', ',', '!', '?', "'", '"'],
    numericSeparator: '.',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
  },
  {
    id: 'es-ES',
    name: 'Spanish',
    language: 'es',
    script: 'Latin',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: [
      'a-z',
      'A-Z',
      '0-9',
      'ñ',
      'Ñ',
      'á',
      'é',
      'í',
      'ó',
      'ú',
      'ü',
      '¿',
      '¡',
    ],
    numericSeparator: ',',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
  },
  {
    id: 'fr-FR',
    name: 'French',
    language: 'fr',
    script: 'Latin',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: [
      'a-z',
      'A-Z',
      '0-9',
      'à',
      'â',
      'ä',
      'ç',
      'é',
      'è',
      'ê',
      'ë',
      'î',
      'ï',
      'ô',
      'ù',
      'û',
      'ü',
      'ÿ',
    ],
    numericSeparator: ',',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
  },
  {
    id: 'de-DE',
    name: 'German',
    language: 'de',
    script: 'Latin',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: ['a-z', 'A-Z', '0-9', 'ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
    numericSeparator: ',',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
  },
  {
    id: 'it-IT',
    name: 'Italian',
    language: 'it',
    script: 'Latin',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: [
      'a-z',
      'A-Z',
      '0-9',
      'à',
      'è',
      'é',
      'ì',
      'í',
      'î',
      'ò',
      'ó',
      'ù',
      'ú',
    ],
    numericSeparator: ',',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
  },

  // RTL Languages
  {
    id: 'ar-SA',
    name: 'Arabic',
    language: 'ar',
    script: 'Arabic',
    inputMode: 'text',
    direction: 'rtl',
    hasSpecialChars: true,
    commonChars: [
      'ا',
      'ب',
      'ت',
      'ث',
      'ج',
      'ح',
      'خ',
      'د',
      'ذ',
      'ر',
      'ز',
      'س',
      'ش',
      'ص',
      'ض',
      'ط',
      'ظ',
      'ع',
      'غ',
      'ف',
      'ق',
      'ك',
      'ل',
      'م',
      'ن',
      'ه',
      'و',
      'ي',
      '0-9',
    ],
    numericSeparator: '.',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'h:mm a',
  },
  {
    id: 'he-IL',
    name: 'Hebrew',
    language: 'he',
    script: 'Hebrew',
    inputMode: 'text',
    direction: 'rtl',
    hasSpecialChars: true,
    commonChars: [
      'א',
      'ב',
      'ג',
      'ד',
      'ה',
      'ו',
      'ז',
      'ח',
      'ט',
      'י',
      'כ',
      'ל',
      'מ',
      'נ',
      'ס',
      'ע',
      'פ',
      'צ',
      'ק',
      'ר',
      'ש',
      'ת',
      '0-9',
    ],
    numericSeparator: '.',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
  },

  // Asian Languages
  {
    id: 'zh-CN',
    name: 'Chinese Simplified',
    language: 'zh',
    script: 'Chinese',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: ['a-z', '0-9'], // Pinyin input
    numericSeparator: '.',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
  },
  {
    id: 'ja-JP',
    name: 'Japanese',
    language: 'ja',
    script: 'Japanese',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: ['a-z', '0-9'], // Romaji input
    numericSeparator: '.',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
  },
  {
    id: 'ko-KR',
    name: 'Korean',
    language: 'ko',
    script: 'Korean',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: ['a-z', '0-9'], // Hangul input
    numericSeparator: '.',
    dateFormat: 'yyyy. MM. dd.',
    timeFormat: 'h:mm a',
  },
  {
    id: 'hi-IN',
    name: 'Hindi',
    language: 'hi',
    script: 'Devanagari',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: [
      'क',
      'ख',
      'ग',
      'घ',
      'ङ',
      'च',
      'छ',
      'ज',
      'झ',
      'ञ',
      'ट',
      'ठ',
      'ड',
      'ढ',
      'ण',
      'त',
      'थ',
      'द',
      'ध',
      'न',
      'प',
      'फ',
      'ब',
      'भ',
      'म',
      'य',
      'र',
      'ल',
      'व',
      'श',
      'ष',
      'स',
      'ह',
      '0-9',
    ],
    numericSeparator: '.',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'h:mm a',
  },
  {
    id: 'ru-RU',
    name: 'Russian',
    language: 'ru',
    script: 'Cyrillic',
    inputMode: 'text',
    direction: 'ltr',
    hasSpecialChars: true,
    commonChars: [
      'а',
      'б',
      'в',
      'г',
      'д',
      'е',
      'ё',
      'ж',
      'з',
      'и',
      'й',
      'к',
      'л',
      'м',
      'н',
      'о',
      'п',
      'р',
      'с',
      'т',
      'у',
      'ф',
      'х',
      'ц',
      'ч',
      'ш',
      'щ',
      'ъ',
      'ы',
      'ь',
      'э',
      'ю',
      'я',
      '0-9',
    ],
    numericSeparator: ',',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
  },
];

export class MobileKeyboardSupport {
  private currentLayout: KeyboardLayout;
  private inputConfigs: Map<string, WeddingFieldConfig>;

  constructor(defaultLanguage: string = 'en') {
    this.currentLayout = this.getLayoutByLanguage(defaultLanguage);
    this.inputConfigs = new Map();
    this.initializeWeddingFieldConfigs();
  }

  // Get keyboard layout by language
  public getLayoutByLanguage(language: string): KeyboardLayout {
    return (
      KEYBOARD_LAYOUTS.find(
        (layout) =>
          layout.language === language || layout.id.startsWith(language),
      ) || KEYBOARD_LAYOUTS[0]
    ); // Default to English
  }

  // Set current keyboard layout
  public setLayout(language: string): void {
    this.currentLayout = this.getLayoutByLanguage(language);
  }

  // Initialize wedding-specific field configurations
  private initializeWeddingFieldConfigs(): void {
    // Name fields
    this.inputConfigs.set('name', {
      fieldType: 'name',
      language: this.currentLayout.language,
      inputMode: 'text',
      autoCapitalize: 'words',
      autoCorrect: true,
      spellCheck: false,
      autoComplete: 'name',
      dir: this.currentLayout.direction,
      minLength: 2,
      maxLength: 50,
    });

    // Email fields
    this.inputConfigs.set('email', {
      fieldType: 'email',
      language: this.currentLayout.language,
      inputMode: 'email',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      autoComplete: 'email',
      dir: 'ltr', // Email is always LTR
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    });

    // Phone fields
    this.inputConfigs.set('phone', {
      fieldType: 'phone',
      language: this.currentLayout.language,
      inputMode: 'tel',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      autoComplete: 'tel',
      dir: 'ltr', // Phone numbers are always LTR
      pattern: '^[+]?[0-9\\s\\-\\(\\)]+$',
    });

    // Address fields
    this.inputConfigs.set('address', {
      fieldType: 'address',
      language: this.currentLayout.language,
      inputMode: 'text',
      autoCapitalize: 'words',
      autoCorrect: true,
      spellCheck: true,
      autoComplete: 'street-address',
      dir: this.currentLayout.direction,
      maxLength: 200,
    });

    // Date fields
    this.inputConfigs.set('date', {
      fieldType: 'date',
      language: this.currentLayout.language,
      inputMode: 'numeric',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      autoComplete: 'bday',
      dir: 'ltr',
      culturalFormat: true,
      mask: this.getDateMask(),
    });

    // Time fields
    this.inputConfigs.set('time', {
      fieldType: 'time',
      language: this.currentLayout.language,
      inputMode: 'numeric',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      dir: 'ltr',
      culturalFormat: true,
      mask: this.getTimeMask(),
    });

    // Currency fields
    this.inputConfigs.set('currency', {
      fieldType: 'currency',
      language: this.currentLayout.language,
      inputMode: 'decimal',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      dir: 'ltr',
      culturalFormat: true,
      pattern: '^[0-9]+[\\.,]?[0-9]*$',
    });

    // General text fields
    this.inputConfigs.set('text', {
      fieldType: 'text',
      language: this.currentLayout.language,
      inputMode: 'text',
      autoCapitalize: 'sentences',
      autoCorrect: true,
      spellCheck: true,
      dir: this.currentLayout.direction,
      maxLength: 500,
    });

    // Number fields
    this.inputConfigs.set('number', {
      fieldType: 'number',
      language: this.currentLayout.language,
      inputMode: 'numeric',
      autoCapitalize: 'none',
      autoCorrect: false,
      spellCheck: false,
      dir: 'ltr',
      pattern: '^[0-9]+$',
    });
  }

  // Get input configuration for a field type
  public getFieldConfig(fieldType: string): WeddingFieldConfig {
    const config = this.inputConfigs.get(fieldType);
    if (!config) {
      console.warn(`No configuration found for field type: ${fieldType}`);
      return this.inputConfigs.get('text')!;
    }

    // Update with current layout settings
    return {
      ...config,
      language: this.currentLayout.language,
      dir:
        config.fieldType === 'email' ||
        config.fieldType === 'phone' ||
        config.fieldType === 'date' ||
        config.fieldType === 'time' ||
        config.fieldType === 'currency' ||
        config.fieldType === 'number'
          ? 'ltr'
          : this.currentLayout.direction,
    };
  }

  // Get HTML input attributes for a field
  public getInputAttributes(
    fieldType: string,
    customConfig?: Partial<WeddingFieldConfig>,
  ): Record<string, any> {
    const config = { ...this.getFieldConfig(fieldType), ...customConfig };

    const attributes: Record<string, any> = {
      inputMode: config.inputMode,
      autoCapitalize: config.autoCapitalize,
      autoCorrect: config.autoCorrect ? 'on' : 'off',
      spellCheck: config.spellCheck,
      dir: config.dir,
      lang: config.language,
    };

    // Add optional attributes
    if (config.autoComplete) attributes.autoComplete = config.autoComplete;
    if (config.pattern) attributes.pattern = config.pattern;
    if (config.maxLength) attributes.maxLength = config.maxLength;
    if (config.minLength) attributes.minLength = config.minLength;
    if (config.placeholder) attributes.placeholder = config.placeholder;

    return attributes;
  }

  // Format input value based on cultural preferences
  public formatValue(value: string, fieldType: string): string {
    switch (fieldType) {
      case 'date':
        return this.formatDate(value);
      case 'time':
        return this.formatTime(value);
      case 'currency':
        return this.formatCurrency(value);
      case 'phone':
        return this.formatPhone(value);
      case 'number':
        return this.formatNumber(value);
      default:
        return value;
    }
  }

  // Validate input based on cultural and technical requirements
  public validateInput(
    value: string,
    fieldType: string,
  ): {
    isValid: boolean;
    errors: string[];
    suggestions?: string[];
  } {
    const config = this.getFieldConfig(fieldType);
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Length validation
    if (config.minLength && value.length < config.minLength) {
      errors.push(`Minimum length is ${config.minLength} characters`);
    }
    if (config.maxLength && value.length > config.maxLength) {
      errors.push(`Maximum length is ${config.maxLength} characters`);
    }

    // Pattern validation
    if (config.pattern && !new RegExp(config.pattern).test(value)) {
      errors.push('Invalid format');

      // Add suggestions based on field type
      switch (fieldType) {
        case 'email':
          suggestions.push('Use format: name@example.com');
          break;
        case 'phone':
          suggestions.push('Include country code for international numbers');
          break;
        case 'date':
          suggestions.push(`Use format: ${this.currentLayout.dateFormat}`);
          break;
      }
    }

    // RTL text validation for RTL languages
    if (
      (this.currentLayout.direction === 'rtl' && fieldType === 'text') ||
      fieldType === 'name'
    ) {
      const hasRTLChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(
        value,
      );
      const hasLTRChars = /[A-Za-z]/.test(value);

      if (hasRTLChars && hasLTRChars) {
        suggestions.push(
          'Mixed text directions detected. Consider separating RTL and LTR text.',
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  // Get appropriate keyboard type for mobile devices
  public getMobileKeyboardType(fieldType: string): string {
    const config = this.getFieldConfig(fieldType);

    const keyboardMap: Record<string, string> = {
      text: 'default',
      email: 'email-address',
      tel: 'phone-pad',
      numeric: 'numeric',
      decimal: 'decimal-pad',
      url: 'url',
      search: 'web-search',
    };

    return keyboardMap[config.inputMode || 'text'] || 'default';
  }

  // Private formatting methods
  private formatDate(value: string): string {
    if (!value) return value;

    // Remove non-numeric characters except separators
    const cleanValue = value.replace(/[^\d]/g, '');

    if (cleanValue.length === 0) return '';

    const format = this.currentLayout.dateFormat;
    const separator = format.includes('/')
      ? '/'
      : format.includes('.')
        ? '.'
        : '-';

    // Apply format based on current layout
    if (cleanValue.length <= 2) {
      return cleanValue;
    } else if (cleanValue.length <= 4) {
      return `${cleanValue.slice(0, 2)}${separator}${cleanValue.slice(2)}`;
    } else {
      return `${cleanValue.slice(0, 2)}${separator}${cleanValue.slice(2, 4)}${separator}${cleanValue.slice(4, 8)}`;
    }
  }

  private formatTime(value: string): string {
    if (!value) return value;

    const cleanValue = value.replace(/[^\d]/g, '');

    if (cleanValue.length === 0) return '';

    if (cleanValue.length <= 2) {
      return cleanValue;
    } else {
      const hours = cleanValue.slice(0, 2);
      const minutes = cleanValue.slice(2, 4);

      if (this.currentLayout.timeFormat === 'h:mm a') {
        const hour24 = parseInt(hours);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const period = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${period}`;
      } else {
        return `${hours}:${minutes}`;
      }
    }
  }

  private formatCurrency(value: string): string {
    if (!value) return value;

    const separator = this.currentLayout.numericSeparator;
    const parts = value.split(separator);

    if (parts.length > 2) {
      // Remove extra separators
      return `${parts[0]}${separator}${parts.slice(1).join('')}`;
    }

    return value;
  }

  private formatPhone(value: string): string {
    if (!value) return value;

    // Basic phone formatting - keep only numbers, +, -, (), and spaces
    return value.replace(/[^\d+\-\(\)\s]/g, '');
  }

  private formatNumber(value: string): string {
    if (!value) return value;

    // Keep only digits
    return value.replace(/[^\d]/g, '');
  }

  private getDateMask(): string {
    return this.currentLayout.dateFormat.replace(/[yMd]/g, '9');
  }

  private getTimeMask(): string {
    return this.currentLayout.timeFormat === 'h:mm a' ? '9:99 aa' : '99:99';
  }

  // Get current layout info
  public getCurrentLayout(): KeyboardLayout {
    return this.currentLayout;
  }

  // Check if current layout supports RTL
  public isRTL(): boolean {
    return this.currentLayout.direction === 'rtl';
  }

  // Get cultural number format
  public getCulturalNumberFormat(): {
    decimal: string;
    thousands: string;
    currency: string;
  } {
    const decimalSeparator = this.currentLayout.numericSeparator;
    const thousandsSeparator = decimalSeparator === '.' ? ',' : ' ';

    // Currency symbols by language
    const currencyMap: Record<string, string> = {
      en: '$',
      es: '€',
      fr: '€',
      de: '€',
      it: '€',
      ar: 'ر.س',
      he: '₪',
      ja: '¥',
      ko: '₩',
      zh: '¥',
      hi: '₹',
      ru: '₽',
    };

    return {
      decimal: decimalSeparator,
      thousands: thousandsSeparator,
      currency: currencyMap[this.currentLayout.language] || '$',
    };
  }

  // Get all available layouts
  public getAvailableLayouts(): KeyboardLayout[] {
    return KEYBOARD_LAYOUTS;
  }
}

// Singleton instance
export const mobileKeyboardSupport = new MobileKeyboardSupport();

// React hook for keyboard support
export const useMobileKeyboard = (language?: string) => {
  const keyboardSupport = new MobileKeyboardSupport(language);

  return {
    getFieldConfig: keyboardSupport.getFieldConfig.bind(keyboardSupport),
    getInputAttributes:
      keyboardSupport.getInputAttributes.bind(keyboardSupport),
    formatValue: keyboardSupport.formatValue.bind(keyboardSupport),
    validateInput: keyboardSupport.validateInput.bind(keyboardSupport),
    getMobileKeyboardType:
      keyboardSupport.getMobileKeyboardType.bind(keyboardSupport),
    isRTL: keyboardSupport.isRTL.bind(keyboardSupport),
    getCurrentLayout: keyboardSupport.getCurrentLayout.bind(keyboardSupport),
    getCulturalNumberFormat:
      keyboardSupport.getCulturalNumberFormat.bind(keyboardSupport),
    setLayout: keyboardSupport.setLayout.bind(keyboardSupport),
  };
};

export default MobileKeyboardSupport;
