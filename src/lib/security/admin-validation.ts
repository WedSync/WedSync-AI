/**
 * WS-168: Admin Data Validation and Sanitization
 * Comprehensive data protection for admin dashboard
 */

import DOMPurify from 'isomorphic-dompurify';

// Validation result interface
interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly sanitizedData?: any;
}

// PII field patterns for identification
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/gi,
  ssn: /\b(?:\d{3}-\d{2}-\d{4}|\d{3}\s\d{2}\s\d{4}|\d{9})\b/gi,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/gi,
  userId: /^user_[a-z0-9]{8,}$/gi,
} as const;

// Sensitive field names that should be masked
const SENSITIVE_FIELDS = [
  'email',
  'phone',
  'phone_number',
  'credit_card',
  'ssn',
  'social_security_number',
  'password',
  'token',
  'api_key',
  'secret',
  'private_key',
] as const;

// Data sanitization functions
export function sanitizeHtmlInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Use DOMPurify to sanitize HTML and prevent XSS
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

export function sanitizeJsonInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeHtmlInput(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeJsonInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeHtmlInput(key);
      sanitized[sanitizedKey] = sanitizeJsonInput(value);
    }

    return sanitized;
  }

  return input;
}

// Mask sensitive data for display
export function maskSensitiveData(
  value: string,
  fieldType?: keyof typeof PII_PATTERNS,
): string {
  if (!value || typeof value !== 'string') {
    return '[REDACTED]';
  }

  switch (fieldType) {
    case 'email':
      // Mask email: "test@example.com" -> "t***@ex***.com"
      const emailMatch = value.match(/^([^@]+)@(.+)$/);
      if (emailMatch) {
        const [, local, domain] = emailMatch;
        const maskedLocal =
          local.charAt(0) + '*'.repeat(Math.max(0, local.length - 1));
        const domainParts = domain.split('.');
        const maskedDomain = domainParts
          .map((part, index) =>
            index === domainParts.length - 1
              ? part
              : part.charAt(0) + '*'.repeat(Math.max(0, part.length - 1)),
          )
          .join('.');
        return `${maskedLocal}@${maskedDomain}`;
      }
      return '[REDACTED EMAIL]';

    case 'phone':
      // Mask phone: "+1234567890" -> "+1***567***"
      return value.replace(/(\+?1)?(\d{3})(\d{3})(\d{4})/, '$1***$3***');

    case 'userId':
      // Mask user ID: "user_abc123def" -> "user_***123***"
      return value.replace(/(user_)(.{3})(.*)(.{3})/, '$1***$3***');

    default:
      // Generic masking for unknown sensitive data
      if (value.length <= 4) {
        return '*'.repeat(value.length);
      }
      return (
        value.substring(0, 2) +
        '*'.repeat(value.length - 4) +
        value.substring(value.length - 2)
      );
  }
}

// Detect and mask PII in text content
export function maskPIIInText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let maskedText = text;

  // Mask emails
  maskedText = maskedText.replace(PII_PATTERNS.email, (match) =>
    maskSensitiveData(match, 'email'),
  );

  // Mask phone numbers
  maskedText = maskedText.replace(PII_PATTERNS.phone, '[PHONE]');

  // Mask SSNs
  maskedText = maskedText.replace(PII_PATTERNS.ssn, '[SSN]');

  // Mask credit cards
  maskedText = maskedText.replace(PII_PATTERNS.creditCard, '[CREDIT_CARD]');

  return maskedText;
}

// Sanitize admin dashboard data
export function sanitizeAdminData<T>(data: T): T {
  if (!data) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeHtmlInput(data) as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAdminData(item)) as T;
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if field contains sensitive data
      const isSensitiveField = SENSITIVE_FIELDS.some((field) =>
        lowerKey.includes(field),
      );

      if (isSensitiveField && typeof value === 'string') {
        // Mask sensitive fields
        sanitized[key] = maskSensitiveData(value);
      } else if (key === 'user_id' && typeof value === 'string') {
        // Specifically mask user IDs
        sanitized[key] = maskSensitiveData(value, 'userId');
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeAdminData(value);
      }
    }

    return sanitized as T;
  }

  return data;
}

// Validate admin input data
export function validateAdminInput(
  data: any,
  schema: Record<
    string,
    {
      required?: boolean;
      type?: string;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      allowedValues?: ReadonlyArray<string>;
    }
  >,
): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid input data format'],
    };
  }

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName];

    // Check required fields
    if (
      rules.required &&
      (value === undefined || value === null || value === '')
    ) {
      errors.push(`Field '${fieldName}' is required`);
      continue;
    }

    // Skip validation for optional empty fields
    if (
      !rules.required &&
      (value === undefined || value === null || value === '')
    ) {
      continue;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Field '${fieldName}' must be of type ${rules.type}`);
      continue;
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Sanitize string input
      const sanitizedValue = sanitizeHtmlInput(value);

      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(
          `Field '${fieldName}' must be at least ${rules.minLength} characters`,
        );
        continue;
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(
          `Field '${fieldName}' must not exceed ${rules.maxLength} characters`,
        );
        continue;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        errors.push(`Field '${fieldName}' format is invalid`);
        continue;
      }

      // Allowed values validation
      if (
        rules.allowedValues &&
        !rules.allowedValues.includes(sanitizedValue)
      ) {
        errors.push(
          `Field '${fieldName}' must be one of: ${rules.allowedValues.join(', ')}`,
        );
        continue;
      }

      sanitizedData[fieldName] = sanitizedValue;
    } else {
      // Non-string data passes through with recursive sanitization
      sanitizedData[fieldName] = sanitizeAdminData(value);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}

// Validate intervention request data
export function validateInterventionRequest(data: any): ValidationResult {
  return validateAdminInput(data, {
    user_id: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    intervention_type: {
      required: true,
      type: 'string',
      allowedValues: [
        'priority_contact',
        'urgent_meeting',
        'progress_review',
        'automated_campaign',
        'emergency_intervention',
      ],
    },
    message: {
      required: false,
      type: 'string',
      maxLength: 1000,
    },
    scheduled_for: {
      required: false,
      type: 'string',
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
    },
  });
}

// Validate export request data
export function validateExportRequest(data: any): ValidationResult {
  return validateAdminInput(data, {
    export_type: {
      required: true,
      type: 'string',
      allowedValues: [
        'health_metrics',
        'at_risk_users',
        'intervention_history',
        'engagement_trends',
      ],
    },
    date_range: {
      required: true,
      type: 'string',
      allowedValues: ['7d', '30d', '90d', '1y', 'all'],
    },
    format: {
      required: false,
      type: 'string',
      allowedValues: ['csv', 'json', 'xlsx'],
    },
    include_pii: {
      required: false,
      type: 'boolean',
    },
  });
}

// SQL injection prevention
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove or escape dangerous SQL characters and keywords
  return input
    .replace(/['";\\]/g, '') // Remove quotes and escape characters
    .replace(
      /\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|UNION|SELECT)\b/gi,
      '',
    ) // Remove SQL keywords
    .replace(/-{2,}/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove block comments
    .trim();
}

// XSS prevention for dynamic content
export function preventXSS(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORCE_BODY: true,
  });
}

// Rate limiting validation (for API endpoints)
export interface RateLimitConfig {
  readonly windowMs: number; // Time window in milliseconds
  readonly maxRequests: number; // Maximum requests per window
  readonly keyGenerator?: (req: any) => string; // Function to generate rate limit key
}

// Simple in-memory rate limiting (production should use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export type { ValidationResult, RateLimitConfig };
