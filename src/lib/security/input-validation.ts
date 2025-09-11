/**
 * Comprehensive input validation and sanitization utilities
 * SECURITY: Prevents SQL injection, XSS, and other input-based attacks
 */

import DOMPurify from 'isomorphic-dompurify';

// UUID validation pattern
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Email validation pattern (RFC 5322 compliant)
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Validates if a string is a valid email
 */
export function isValidEmail(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    EMAIL_PATTERN.test(value)
  );
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes and validates string input with length limits
 */
export function sanitizeString(
  value: unknown,
  maxLength: number = 1000,
  allowEmpty: boolean = false,
): string | null {
  if (typeof value !== 'string') {
    return allowEmpty ? '' : null;
  }

  const trimmed = value.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    return null;
  }

  // Remove potential SQL injection patterns
  const sqlPattern =
    /('|(--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript))/gi;
  if (sqlPattern.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Validates and sanitizes phone numbers
 */
export function sanitizePhone(value: string): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  // Remove all non-numeric characters except + and spaces
  const cleaned = value.replace(/[^\d+\s()-]/g, '');

  if (cleaned.length < 10 || cleaned.length > 20) {
    return null;
  }

  return cleaned;
}

/**
 * Validates object structure and sanitizes allowed fields
 */
export function validateAndSanitizeObject<T>(
  input: unknown,
  allowedFields: Record<
    string,
    'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'phone' | 'html'
  >,
  required: string[] = [],
): Partial<T> | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const inputObj = input as Record<string, unknown>;
  const result: Partial<T> = {};

  // Check required fields
  for (const field of required) {
    if (
      !(field in inputObj) ||
      inputObj[field] === null ||
      inputObj[field] === undefined
    ) {
      return null;
    }
  }

  // Process allowed fields
  for (const [field, type] of Object.entries(allowedFields)) {
    if (!(field in inputObj)) {
      continue;
    }

    const value = inputObj[field];

    switch (type) {
      case 'string':
        const sanitizedString = sanitizeString(value, 1000, true);
        if (sanitizedString !== null) {
          (result as any)[field] = sanitizedString;
        }
        break;

      case 'email':
        if (typeof value === 'string' && isValidEmail(value)) {
          (result as any)[field] = value.toLowerCase();
        }
        break;

      case 'uuid':
        if (typeof value === 'string' && isValidUUID(value)) {
          (result as any)[field] = value;
        }
        break;

      case 'phone':
        const sanitizedPhone = sanitizePhone(value as string);
        if (sanitizedPhone) {
          (result as any)[field] = sanitizedPhone;
        }
        break;

      case 'html':
        if (typeof value === 'string') {
          (result as any)[field] = sanitizeHTML(value);
        }
        break;

      case 'number':
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
          (result as any)[field] = value;
        } else if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed) && isFinite(parsed)) {
            (result as any)[field] = parsed;
          }
        }
        break;

      case 'boolean':
        if (typeof value === 'boolean') {
          (result as any)[field] = value;
        }
        break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Rate limiting key generation for consistent hashing
 */
export function generateRateLimitKey(ip: string, endpoint?: string): string {
  const sanitizedIp = ip.replace(/[^\d.:a-f]/gi, '');
  const sanitizedEndpoint = endpoint
    ? endpoint.replace(/[^\w/-]/g, '')
    : 'global';
  return `rate_limit:${sanitizedIp}:${sanitizedEndpoint}`;
}

/**
 * File upload validation
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
}

export function validateUploadedFile(
  file: File,
  allowedTypes: string[],
  maxSize: number = 50 * 1024 * 1024, // 50MB default
): FileValidationResult {
  const errors: string[] = [];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  // File type validation
  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    );
  }

  // File size validation
  if (file.size > maxSize) {
    errors.push(
      `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
    );
  }

  // File name sanitization and validation
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255);

  if (sanitizedName.length === 0) {
    errors.push('Invalid file name');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName,
  };
}
