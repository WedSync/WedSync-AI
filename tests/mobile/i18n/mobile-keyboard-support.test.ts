import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  MobileKeyboardSupport,
  KEYBOARD_LAYOUTS,
  mobileKeyboardSupport,
  useMobileKeyboard
} from '../../../src/lib/services/mobile-i18n/MobileKeyboardSupport';

describe('MobileKeyboardSupport', () => {
  let keyboardSupport: MobileKeyboardSupport;

  beforeEach(() => {
    keyboardSupport = new MobileKeyboardSupport();
  });

  describe('constructor', () => {
    it('initializes with default English layout', () => {
      const layout = keyboardSupport.getCurrentLayout();
      expect(layout.language).toBe('en');
      expect(layout.direction).toBe('ltr');
    });

    it('initializes with specified language', () => {
      const spanishKeyboard = new MobileKeyboardSupport('es');
      const layout = spanishKeyboard.getCurrentLayout();
      expect(layout.language).toBe('es');
    });
  });

  describe('getLayoutByLanguage', () => {
    it('returns correct layout for existing language', () => {
      const arabicLayout = keyboardSupport.getLayoutByLanguage('ar');
      expect(arabicLayout.language).toBe('ar');
      expect(arabicLayout.direction).toBe('rtl');
      expect(arabicLayout.script).toBe('Arabic');
    });

    it('returns default layout for non-existing language', () => {
      const unknownLayout = keyboardSupport.getLayoutByLanguage('unknown');
      expect(unknownLayout.language).toBe('en'); // Default to English
    });

    it('matches partial language codes', () => {
      const layout = keyboardSupport.getLayoutByLanguage('zh');
      expect(layout.language).toBe('zh');
      expect(layout.id).toBe('zh-CN');
    });
  });

  describe('setLayout', () => {
    it('updates current layout', () => {
      keyboardSupport.setLayout('ar');
      const layout = keyboardSupport.getCurrentLayout();
      expect(layout.language).toBe('ar');
      expect(layout.direction).toBe('rtl');
    });
  });

  describe('getFieldConfig', () => {
    it('returns correct config for name field', () => {
      const config = keyboardSupport.getFieldConfig('name');
      expect(config.fieldType).toBe('name');
      expect(config.autoCapitalize).toBe('words');
      expect(config.autoCorrect).toBe(true);
      expect(config.spellCheck).toBe(false);
    });

    it('returns correct config for email field', () => {
      const config = keyboardSupport.getFieldConfig('email');
      expect(config.fieldType).toBe('email');
      expect(config.inputMode).toBe('email');
      expect(config.autoCapitalize).toBe('none');
      expect(config.dir).toBe('ltr'); // Email is always LTR
    });

    it('returns correct config for phone field', () => {
      const config = keyboardSupport.getFieldConfig('phone');
      expect(config.fieldType).toBe('phone');
      expect(config.inputMode).toBe('tel');
      expect(config.dir).toBe('ltr'); // Phone is always LTR
    });

    it('returns correct config for date field', () => {
      const config = keyboardSupport.getFieldConfig('date');
      expect(config.fieldType).toBe('date');
      expect(config.inputMode).toBe('numeric');
      expect(config.culturalFormat).toBe(true);
    });

    it('adapts direction based on layout for text fields', () => {
      keyboardSupport.setLayout('ar'); // RTL language
      const config = keyboardSupport.getFieldConfig('text');
      expect(config.dir).toBe('rtl');
    });

    it('keeps LTR for structured fields in RTL layout', () => {
      keyboardSupport.setLayout('ar');
      const emailConfig = keyboardSupport.getFieldConfig('email');
      const phoneConfig = keyboardSupport.getFieldConfig('phone');
      const dateConfig = keyboardSupport.getFieldConfig('date');
      
      expect(emailConfig.dir).toBe('ltr');
      expect(phoneConfig.dir).toBe('ltr');
      expect(dateConfig.dir).toBe('ltr');
    });

    it('returns text config for unknown field types', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const config = keyboardSupport.getFieldConfig('unknown');
      expect(config.fieldType).toBe('text');
      expect(consoleWarnSpy).toHaveBeenCalledWith('No configuration found for field type: unknown');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getInputAttributes', () => {
    it('returns correct HTML attributes for name field', () => {
      const attrs = keyboardSupport.getInputAttributes('name');
      
      expect(attrs.inputMode).toBe('text');
      expect(attrs.autoCapitalize).toBe('words');
      expect(attrs.autoCorrect).toBe('on');
      expect(attrs.spellCheck).toBe(false);
      expect(attrs.autoComplete).toBe('name');
    });

    it('returns correct HTML attributes for email field', () => {
      const attrs = keyboardSupport.getInputAttributes('email');
      
      expect(attrs.inputMode).toBe('email');
      expect(attrs.autoCapitalize).toBe('none');
      expect(attrs.autoCorrect).toBe('off');
      expect(attrs.pattern).toMatch(/email/i);
    });

    it('includes custom configuration overrides', () => {
      const attrs = keyboardSupport.getInputAttributes('text', {
        maxLength: 100,
        placeholder: 'Custom placeholder'
      });
      
      expect(attrs.maxLength).toBe(100);
      expect(attrs.placeholder).toBe('Custom placeholder');
    });

    it('handles RTL language attributes', () => {
      keyboardSupport.setLayout('ar');
      const attrs = keyboardSupport.getInputAttributes('text');
      
      expect(attrs.dir).toBe('rtl');
      expect(attrs.lang).toBe('ar');
    });
  });

  describe('formatValue', () => {
    beforeEach(() => {
      keyboardSupport.setLayout('en'); // US format
    });

    it('formats date values', () => {
      const formatted = keyboardSupport.formatValue('12252023', 'date');
      expect(formatted).toBe('12/25/2023');
    });

    it('formats time values in 12-hour format', () => {
      const formatted = keyboardSupport.formatValue('1430', 'time');
      expect(formatted).toBe('2:30 PM');
    });

    it('formats time values in 24-hour format for appropriate locales', () => {
      keyboardSupport.setLayout('de'); // German uses 24-hour
      const formatted = keyboardSupport.formatValue('1430', 'time');
      expect(formatted).toBe('14:30');
    });

    it('formats phone numbers', () => {
      const formatted = keyboardSupport.formatValue('+1-555-123-4567', 'phone');
      expect(formatted).toBe('+1-555-123-4567'); // Keeps valid characters
    });

    it('formats currency values', () => {
      keyboardSupport.setLayout('en');
      const formatted = keyboardSupport.formatValue('123.45.67', 'currency');
      expect(formatted).toBe('123.4567'); // Removes extra decimal separator
    });

    it('formats numbers by removing non-digits', () => {
      const formatted = keyboardSupport.formatValue('abc123def456', 'number');
      expect(formatted).toBe('123456');
    });

    it('returns original value for unsupported field types', () => {
      const original = 'test value';
      const formatted = keyboardSupport.formatValue(original, 'unknown');
      expect(formatted).toBe(original);
    });
  });

  describe('validateInput', () => {
    it('validates required fields', () => {
      const result = keyboardSupport.validateInput('', 'name');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('validates email format', () => {
      const validEmail = keyboardSupport.validateInput('test@example.com', 'email');
      expect(validEmail.isValid).toBe(true);

      const invalidEmail = keyboardSupport.validateInput('invalid-email', 'email');
      expect(invalidEmail.isValid).toBe(false);
      expect(invalidEmail.suggestions).toContain('Use format: name@example.com');
    });

    it('validates phone format', () => {
      const validPhone = keyboardSupport.validateInput('+1-555-123-4567', 'phone');
      expect(validPhone.isValid).toBe(true);

      const invalidPhone = keyboardSupport.validateInput('abc123', 'phone');
      expect(invalidPhone.isValid).toBe(false);
    });

    it('validates date format', () => {
      keyboardSupport.setLayout('en');
      const validDate = keyboardSupport.validateInput('12/25/2023', 'date');
      expect(validDate.isValid).toBe(true);

      const invalidDate = keyboardSupport.validateInput('invalid-date', 'date');
      expect(invalidDate.isValid).toBe(false);
      expect(invalidDate.suggestions).toContain('Use format: MM/dd/yyyy');
    });

    it('detects mixed RTL/LTR text in RTL languages', () => {
      keyboardSupport.setLayout('ar');
      const mixedText = keyboardSupport.validateInput('مرحبا Hello', 'text');
      expect(mixedText.suggestions).toContain('Mixed text directions detected. Consider separating RTL and LTR text.');
    });

    it('validates length constraints', () => {
      const tooShort = keyboardSupport.validateInput('a', 'name'); // minLength is 2
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.errors).toContain('Minimum length is 2 characters');

      const tooLong = keyboardSupport.validateInput('a'.repeat(51), 'name'); // maxLength is 50
      expect(tooLong.isValid).toBe(false);
      expect(tooLong.errors).toContain('Maximum length is 50 characters');
    });
  });

  describe('getMobileKeyboardType', () => {
    it('returns correct keyboard types for different field types', () => {
      expect(keyboardSupport.getMobileKeyboardType('text')).toBe('default');
      expect(keyboardSupport.getMobileKeyboardType('email')).toBe('email-address');
      expect(keyboardSupport.getMobileKeyboardType('phone')).toBe('phone-pad');
      expect(keyboardSupport.getMobileKeyboardType('number')).toBe('numeric');
      expect(keyboardSupport.getMobileKeyboardType('currency')).toBe('decimal-pad');
    });
  });

  describe('isRTL', () => {
    it('returns false for LTR languages', () => {
      keyboardSupport.setLayout('en');
      expect(keyboardSupport.isRTL()).toBe(false);
    });

    it('returns true for RTL languages', () => {
      keyboardSupport.setLayout('ar');
      expect(keyboardSupport.isRTL()).toBe(true);
    });
  });

  describe('getCulturalNumberFormat', () => {
    it('returns correct format for US locale', () => {
      keyboardSupport.setLayout('en');
      const format = keyboardSupport.getCulturalNumberFormat();
      
      expect(format.decimal).toBe('.');
      expect(format.thousands).toBe(',');
      expect(format.currency).toBe('$');
    });

    it('returns correct format for European locale', () => {
      keyboardSupport.setLayout('de');
      const format = keyboardSupport.getCulturalNumberFormat();
      
      expect(format.decimal).toBe(',');
      expect(format.thousands).toBe(' ');
      expect(format.currency).toBe('€');
    });

    it('returns correct format for Arabic locale', () => {
      keyboardSupport.setLayout('ar');
      const format = keyboardSupport.getCulturalNumberFormat();
      
      expect(format.decimal).toBe('.');
      expect(format.currency).toBe('ر.س');
    });
  });

  describe('getAvailableLayouts', () => {
    it('returns all keyboard layouts', () => {
      const layouts = keyboardSupport.getAvailableLayouts();
      expect(layouts).toBe(KEYBOARD_LAYOUTS);
      expect(layouts.length).toBeGreaterThan(0);
    });
  });
});

describe('KEYBOARD_LAYOUTS', () => {
  it('contains layouts for major languages', () => {
    const languages = KEYBOARD_LAYOUTS.map(layout => layout.language);
    
    expect(languages).toContain('en');
    expect(languages).toContain('es');
    expect(languages).toContain('ar');
    expect(languages).toContain('zh');
    expect(languages).toContain('ja');
    expect(languages).toContain('hi');
  });

  it('has correct RTL designation', () => {
    const rtlLayouts = KEYBOARD_LAYOUTS.filter(layout => layout.direction === 'rtl');
    const rtlLanguages = rtlLayouts.map(layout => layout.language);
    
    expect(rtlLanguages).toContain('ar');
    expect(rtlLanguages).toContain('he');
  });

  it('has proper date formats', () => {
    KEYBOARD_LAYOUTS.forEach(layout => {
      expect(layout.dateFormat).toMatch(/[yMd]/); // Should contain date format characters
    });
  });

  it('has proper time formats', () => {
    KEYBOARD_LAYOUTS.forEach(layout => {
      expect(['HH:mm', 'h:mm a']).toContain(layout.timeFormat);
    });
  });

  it('has numeric separators', () => {
    KEYBOARD_LAYOUTS.forEach(layout => {
      expect(['.', ',']).toContain(layout.numericSeparator);
    });
  });
});

describe('mobileKeyboardSupport singleton', () => {
  it('is properly initialized', () => {
    expect(mobileKeyboardSupport).toBeInstanceOf(MobileKeyboardSupport);
    expect(mobileKeyboardSupport.getCurrentLayout()).toBeDefined();
  });

  it('maintains state across calls', () => {
    mobileKeyboardSupport.setLayout('ar');
    expect(mobileKeyboardSupport.isRTL()).toBe(true);
    
    mobileKeyboardSupport.setLayout('en');
    expect(mobileKeyboardSupport.isRTL()).toBe(false);
  });
});

describe('useMobileKeyboard hook', () => {
  it('returns keyboard support functions', () => {
    const { result } = renderHook(() => useMobileKeyboard());
    
    expect(typeof result.current.getFieldConfig).toBe('function');
    expect(typeof result.current.getInputAttributes).toBe('function');
    expect(typeof result.current.formatValue).toBe('function');
    expect(typeof result.current.validateInput).toBe('function');
    expect(typeof result.current.getMobileKeyboardType).toBe('function');
    expect(typeof result.current.isRTL).toBe('function');
    expect(typeof result.current.getCurrentLayout).toBe('function');
    expect(typeof result.current.getCulturalNumberFormat).toBe('function');
    expect(typeof result.current.setLayout).toBe('function');
  });

  it('initializes with specified language', () => {
    const { result } = renderHook(() => useMobileKeyboard('ar'));
    
    expect(result.current.isRTL()).toBe(true);
    expect(result.current.getCurrentLayout().language).toBe('ar');
  });

  it('functions work correctly', () => {
    const { result } = renderHook(() => useMobileKeyboard('en'));
    
    const config = result.current.getFieldConfig('name');
    expect(config.fieldType).toBe('name');
    expect(config.language).toBe('en');
    
    const attrs = result.current.getInputAttributes('email');
    expect(attrs.inputMode).toBe('email');
    
    const formatted = result.current.formatValue('123456', 'number');
    expect(formatted).toBe('123456');
    
    const validation = result.current.validateInput('test@example.com', 'email');
    expect(validation.isValid).toBe(true);
  });

  it('updates layout correctly', () => {
    const { result } = renderHook(() => useMobileKeyboard('en'));
    
    expect(result.current.isRTL()).toBe(false);
    
    act(() => {
      result.current.setLayout('ar');
    });
    
    expect(result.current.isRTL()).toBe(true);
    expect(result.current.getCurrentLayout().language).toBe('ar');
  });
});