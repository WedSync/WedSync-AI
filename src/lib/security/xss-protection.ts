// Only import DOMPurify on client side or when window is available
let DOMPurify: any = null;
if (typeof window !== 'undefined') {
  DOMPurify = require('isomorphic-dompurify');
}
import { z } from 'zod';

/**
 * Comprehensive XSS Protection System for WedSync
 * Prevents cross-site scripting attacks through input sanitization and content filtering
 */

// XSS-safe content validation patterns
const XSS_SAFE_PATTERNS = {
  // Basic text: allows most characters but blocks script tags and event handlers
  safeText: /^[^<>]*$/,

  // Strict text: only alphanumeric, spaces, and basic punctuation
  strictText: /^[a-zA-Z0-9\s\-_.,!?()'"@#$%&*+=:;/\[\]{}|~`^\\]*$/,

  // Names: letters, spaces, hyphens, apostrophes
  safeName: /^[a-zA-ZÀ-ÿ\s\-'\.]{1,100}$/,

  // Email: standard email validation
  safeEmail: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Phone: international phone format
  safePhone: /^[\+]?[\d\s\-\(\)]{10,20}$/,

  // URL: HTTPS/HTTP only with domain validation
  safeUrl:
    /^https?:\/\/([\w.-]+\.)*[a-zA-Z]{2,}(\/[\w._~:/?#[\]@!$&'()*+,;=-]*)?$/,

  // Slugs: URL-safe strings
  safeSlug: /^[a-z0-9\-]+$/,

  // UUID: standard UUID format
  safeUuid:
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
};

// DOMPurify configuration profiles
const PURIFY_CONFIGS = {
  // Strictest: no HTML tags allowed
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    SAFE_FOR_TEMPLATES: true,
  },

  // Basic: minimal HTML for rich text
  basic: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    SAFE_FOR_TEMPLATES: true,
  },

  // Rich text: common formatting tags
  richText: {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'blockquote',
    ],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    SAFE_FOR_TEMPLATES: true,
  },
};

/**
 * Main XSS Protection Class
 */
export class XSSProtection {
  /**
   * Sanitize HTML content using DOMPurify
   */
  static sanitizeHTML(
    dirty: string,
    config: keyof typeof PURIFY_CONFIGS = 'strict',
  ): string {
    if (typeof dirty !== 'string') {
      return '';
    }

    // Server-side fallback sanitization
    if (!DOMPurify) {
      return this.basicServerSanitization(dirty);
    }

    return DOMPurify.sanitize(dirty, PURIFY_CONFIGS[config]);
  }

  /**
   * Basic server-side sanitization fallback
   */
  static basicServerSanitization(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '');
  }

  /**
   * Remove all HTML tags and dangerous content
   */
  static stripHTML(content: string): string {
    if (typeof content !== 'string') {
      return '';
    }

    if (!DOMPurify) {
      return this.basicServerSanitization(content);
    }

    return DOMPurify.sanitize(content, PURIFY_CONFIGS.strict);
  }

  /**
   * Comprehensive input sanitization with type-specific validation
   */
  static sanitizeInput(
    input: unknown,
    type:
      | 'text'
      | 'email'
      | 'phone'
      | 'url'
      | 'name'
      | 'slug'
      | 'uuid' = 'text',
  ): string {
    if (input === null || input === undefined) {
      return '';
    }

    let sanitized = String(input);

    // First pass: remove obvious XSS patterns
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/setTimeout\s*\(/gi, '')
      .replace(/setInterval\s*\(/gi, '');

    // Second pass: DOMPurify sanitization (if available)
    sanitized = DOMPurify
      ? DOMPurify.sanitize(sanitized, PURIFY_CONFIGS.strict)
      : this.basicServerSanitization(sanitized);

    // Third pass: type-specific validation
    switch (type) {
      case 'email':
        return XSS_SAFE_PATTERNS.safeEmail.test(sanitized) ? sanitized : '';
      case 'phone':
        return XSS_SAFE_PATTERNS.safePhone.test(sanitized) ? sanitized : '';
      case 'url':
        return XSS_SAFE_PATTERNS.safeUrl.test(sanitized) ? sanitized : '';
      case 'name':
        return XSS_SAFE_PATTERNS.safeName.test(sanitized) ? sanitized : '';
      case 'slug':
        return XSS_SAFE_PATTERNS.safeSlug.test(sanitized) ? sanitized : '';
      case 'uuid':
        return XSS_SAFE_PATTERNS.safeUuid.test(sanitized) ? sanitized : '';
      default:
        return XSS_SAFE_PATTERNS.strictText.test(sanitized) ? sanitized : '';
    }
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeInput(value) as T[keyof T];
      } else if (Array.isArray(value)) {
        sanitized[key as keyof T] = value.map((item) =>
          typeof item === 'string' ? this.sanitizeInput(item) : item,
        ) as T[keyof T];
      } else if (value && typeof value === 'object') {
        sanitized[key as keyof T] = this.sanitizeObject(value);
      } else {
        sanitized[key as keyof T] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize form field values
   */
  static sanitizeFormField(value: unknown, fieldType: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      switch (fieldType) {
        case 'email':
          return this.sanitizeInput(value, 'email');
        case 'tel':
        case 'phone':
          return this.sanitizeInput(value, 'phone');
        case 'url':
          return this.sanitizeInput(value, 'url');
        case 'name':
        case 'fullName':
        case 'firstName':
        case 'lastName':
          return this.sanitizeInput(value, 'name');
        case 'textarea':
          return this.sanitizeHTML(value, 'basic');
        default:
          return this.sanitizeInput(value, 'text');
      }
    }

    if (typeof value === 'number') {
      // Validate numeric ranges
      if (!isFinite(value) || value < -999999999 || value > 999999999) {
        return null;
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return Boolean(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeFormField(item, fieldType))
        .filter((item) => item !== null);
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    return null;
  }

  /**
   * Create Content Security Policy headers
   */
  static getCSPHeaders(): Record<string, string> {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
      'frame-src https://js.stripe.com https://hooks.stripe.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }
}

/**
 * Enhanced Zod schemas with XSS protection
 */
export const XSSSafeSchemas = {
  // Safe text input (strict filtering)
  safeText: (maxLength = 1000) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtection.sanitizeInput(val, 'text'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.strictText.test(val),
        'Contains unsafe characters',
      ),

  // Safe name input
  safeName: (maxLength = 100) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtection.sanitizeInput(val, 'name'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeName.test(val),
        'Invalid name format',
      ),

  // Safe email input
  safeEmail: () =>
    z
      .string()
      .email()
      .transform((val) => XSSProtection.sanitizeInput(val, 'email'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeEmail.test(val),
        'Invalid email format',
      ),

  // Safe phone input
  safePhone: () =>
    z
      .string()
      .transform((val) => XSSProtection.sanitizeInput(val, 'phone'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safePhone.test(val),
        'Invalid phone format',
      ),

  // Safe URL input
  safeUrl: () =>
    z
      .string()
      .url()
      .transform((val) => XSSProtection.sanitizeInput(val, 'url'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeUrl.test(val),
        'Invalid URL format',
      ),

  // Safe UUID input
  safeUuid: () =>
    z
      .string()
      .uuid()
      .transform((val) => XSSProtection.sanitizeInput(val, 'uuid'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeUuid.test(val),
        'Invalid UUID format',
      ),

  // Safe slug input
  safeSlug: (maxLength = 100) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtection.sanitizeInput(val, 'slug'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeSlug.test(val),
        'Invalid slug format',
      ),

  // Rich text with basic HTML sanitization
  richText: (maxLength = 10000) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtection.sanitizeHTML(val, 'basic'))
      .refine(
        (val) => val.length <= maxLength,
        'Content too long after sanitization',
      ),
};

export default XSSProtection;
