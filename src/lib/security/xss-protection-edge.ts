import { z } from 'zod';

/**
 * Edge Runtime Compatible XSS Protection System for WedSync
 * Provides XSS protection without DOM dependencies for middleware usage
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

/**
 * Edge Runtime XSS Protection Class
 * Uses regex-based sanitization instead of DOM-based for edge compatibility
 */
export class XSSProtectionEdge {
  /**
   * Simple HTML tag removal for edge runtime
   */
  static stripHTML(content: string): string {
    if (typeof content !== 'string') {
      return '';
    }

    return content
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
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

    // Remove obvious XSS patterns
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/setTimeout\s*\(/gi, '')
      .replace(/setInterval\s*\(/gi, '')
      .replace(/<[^>]*>/g, ''); // Remove all HTML tags for edge runtime

    // Type-specific validation
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
 * Enhanced Zod schemas with XSS protection for edge runtime
 */
export const XSSSafeSchemasEdge = {
  // Safe text input (strict filtering)
  safeText: (maxLength = 1000) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'text'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.strictText.test(val),
        'Contains unsafe characters',
      ),

  // Safe name input
  safeName: (maxLength = 100) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'name'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeName.test(val),
        'Invalid name format',
      ),

  // Safe email input
  safeEmail: () =>
    z
      .string()
      .email()
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'email'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeEmail.test(val),
        'Invalid email format',
      ),

  // Safe phone input
  safePhone: () =>
    z
      .string()
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'phone'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safePhone.test(val),
        'Invalid phone format',
      ),

  // Safe URL input
  safeUrl: () =>
    z
      .string()
      .url()
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'url'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeUrl.test(val),
        'Invalid URL format',
      ),

  // Safe UUID input
  safeUuid: () =>
    z
      .string()
      .uuid()
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'uuid'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeUuid.test(val),
        'Invalid UUID format',
      ),

  // Safe slug input
  safeSlug: (maxLength = 100) =>
    z
      .string()
      .max(maxLength)
      .transform((val) => XSSProtectionEdge.sanitizeInput(val, 'slug'))
      .refine(
        (val) => XSS_SAFE_PATTERNS.safeSlug.test(val),
        'Invalid slug format',
      ),
};

export default XSSProtectionEdge;
