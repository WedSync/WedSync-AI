/**
 * Input sanitization utilities for security
 * Implements OWASP input validation best practices
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  allowSpecialChars?: boolean;
  stripWhitespace?: boolean;
  toLowerCase?: boolean;
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(
  input: string,
  options: SanitizationOptions = {},
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim whitespace if requested
  if (options.stripWhitespace) {
    sanitized = sanitized.trim();
  }

  // Convert to lowercase if requested
  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Limit length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Handle HTML content
  if (options.allowHtml) {
    // Use DOMPurify to clean HTML
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [
        'b',
        'i',
        'em',
        'strong',
        'a',
        'ul',
        'ol',
        'li',
        'p',
        'br',
      ],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
    });
  } else {
    // Strip all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove special characters if not allowed
  if (!options.allowSpecialChars) {
    // Allow alphanumeric, spaces, and basic punctuation
    sanitized = sanitized.replace(/[^\w\s\.\,\!\?\-\'\"]/g, '');
  }

  // Encode remaining special characters
  sanitized = encodeSpecialChars(sanitized);

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9@._-]/g, '');
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  return phone.replace(/[^0-9+\-\s\(\)]/g, '').trim();
}

/**
 * Sanitize URL to prevent XSS
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Only allow HTTP/HTTPS URLs
  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(url.trim())) {
    return '';
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.toString();
  } catch {
    return '';
  }
}

/**
 * Encode special characters for safe output
 */
function encodeSpecialChars(str: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=\/]/g, (char) => entityMap[char] || char);
}

/**
 * Validate and sanitize form data
 */
export function sanitizeFormData(
  data: Record<string, unknown>,
  schema: Record<string, SanitizationOptions>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && schema[key]) {
      sanitized[key] = sanitizeInput(value, schema[key]);
    }
  }

  return sanitized;
}

/**
 * Check for common SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b)/i,
    /(\bor\b|\band\b)\s*\d+\s*=\s*\d+/i,
    /['"]\s*(or|and)\s*['"]/i,
    /;\s*(select|insert|update|delete|drop)/i,
    /\/\*.*\*\//i,
    /--.*$/m,
    /@.*@/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function containsXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
    /onmouseover=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate message content for chat/messaging
 */
export function validateMessageContent(message: string): { isValid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Message is required' };
  }

  if (message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (message.length > 2000) {
    return { isValid: false, error: 'Message is too long (max 2000 characters)' };
  }

  if (containsSqlInjection(message)) {
    return { isValid: false, error: 'Message contains invalid content' };
  }

  if (containsXss(message)) {
    return { isValid: false, error: 'Message contains invalid content' };
  }

  return { isValid: true };
}

/**
 * Sanitization presets for common use cases
 */
export const SANITIZATION_PRESETS = {
  PLAIN_TEXT: {
    allowHtml: false,
    maxLength: 1000,
    allowSpecialChars: false,
    stripWhitespace: true,
  },
  RICH_TEXT: {
    allowHtml: true,
    maxLength: 10000,
    allowSpecialChars: true,
    stripWhitespace: false,
  },
  NAME: {
    allowHtml: false,
    maxLength: 100,
    allowSpecialChars: false,
    stripWhitespace: true,
  },
  DESCRIPTION: {
    allowHtml: false,
    maxLength: 2000,
    allowSpecialChars: true,
    stripWhitespace: true,
  },
  SEARCH_QUERY: {
    allowHtml: false,
    maxLength: 200,
    allowSpecialChars: false,
    stripWhitespace: true,
  },
};
