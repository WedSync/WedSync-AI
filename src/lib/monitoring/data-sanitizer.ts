/**
 * Data Sanitizer for Monitoring Events
 * Removes sensitive information from monitoring data before processing
 */

interface MonitoringEvent {
  message: string;
  level?: 'info' | 'warning' | 'error' | 'critical';
  context?: Record<string, any>;
  tags?: Record<string, string>;
  user?: Record<string, any>;
  extra?: Record<string, any>;
}

interface SanitizedEvent extends MonitoringEvent {
  sanitized: boolean;
  sanitizedAt: string;
  originalKeys?: string[];
}

/**
 * Sanitize monitoring event data to remove sensitive information
 */
export function sanitizeMonitoringEvent(
  event: MonitoringEvent,
): SanitizedEvent {
  const sanitized: SanitizedEvent = {
    ...event,
    sanitized: true,
    sanitizedAt: new Date().toISOString(),
  };

  // Track original keys for debugging
  const originalKeys: string[] = [];

  if (event.context) {
    originalKeys.push(...Object.keys(event.context));
    sanitized.context = sanitizeObject(event.context);
  }

  if (event.user) {
    originalKeys.push(...Object.keys(event.user));
    sanitized.user = sanitizeUserData(event.user);
  }

  if (event.extra) {
    originalKeys.push(...Object.keys(event.extra));
    sanitized.extra = sanitizeObject(event.extra);
  }

  if (event.tags) {
    sanitized.tags = sanitizeTags(event.tags);
  }

  sanitized.originalKeys = originalKeys;

  return sanitized;
}

/**
 * Sanitize generic object data
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'auth',
    'authorization',
    'cookie',
    'session',
    'csrf',
    'xsrf',
    'creditCard',
    'credit_card',
    'ssn',
    'social_security',
    'socialSecurityNumber',
    'taxId',
    'tax_id',
    'bankAccount',
    'bank_account',
    'routingNumber',
    'routing_number',
    'phoneNumber',
    'phone_number',
    'zipCode',
    'zip_code',
    'postalCode',
    'postal_code',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    if (
      sensitiveKeys.some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey.toLowerCase()),
      )
    ) {
      // Remove sensitive data entirely
      continue;
    }

    // Special handling for email addresses
    if (
      lowerKey.includes('email') &&
      typeof value === 'string' &&
      value.includes('@')
    ) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'object' ? sanitizeObject(item) : item,
        );
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize user data specifically
 */
function sanitizeUserData(user: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Keep safe user fields
  const safeUserFields = [
    'id',
    'userId',
    'user_id',
    'organizationId',
    'organization_id',
    'role',
    'userType',
    'user_type',
    'subscriptionTier',
    'subscription_tier',
    'weddingId',
    'wedding_id',
    'vendorId',
    'vendor_id',
    'createdAt',
    'created_at',
    'lastLoginAt',
    'last_login_at',
  ];

  for (const [key, value] of Object.entries(user)) {
    if (safeUserFields.includes(key)) {
      sanitized[key] = value;
    } else if (key.toLowerCase() === 'email' && typeof value === 'string') {
      // Only keep email domain for analytics
      const emailDomain = value.split('@')[1];
      sanitized.email_domain = emailDomain;
    } else if (
      key.toLowerCase().includes('name') &&
      typeof value === 'string'
    ) {
      // Redact names but keep length info for analytics
      sanitized[`${key}_length`] = value.length;
    }
  }

  return sanitized;
}

/**
 * Sanitize tags data
 */
function sanitizeTags(tags: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  const sensitiveTags = ['user_id', 'email', 'api_key', 'session_id'];

  for (const [key, value] of Object.entries(tags)) {
    if (sensitiveTags.includes(key.toLowerCase())) {
      // Hash sensitive tag values for debugging while preserving privacy
      sanitized[key] = `[HASHED:${hashString(value).substring(0, 8)}]`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Simple hash function for debugging purposes
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Sanitize network request data
 */
export function sanitizeNetworkData(data: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  response?: any;
}): any {
  const sanitized = { ...data };

  // Sanitize headers
  if (sanitized.headers) {
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
      'x-auth-token',
      'x-csrf-token',
    ];

    sanitized.headers = { ...sanitized.headers };
    for (const header of sensitiveHeaders) {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = '[REDACTED]';
      }
    }
  }

  // Sanitize request body
  if (sanitized.body) {
    if (typeof sanitized.body === 'string') {
      try {
        const parsed = JSON.parse(sanitized.body);
        sanitized.body = JSON.stringify(sanitizeObject(parsed));
      } catch {
        // If not JSON, truncate if too long
        if (sanitized.body.length > 1000) {
          sanitized.body = sanitized.body.substring(0, 1000) + '...[TRUNCATED]';
        }
      }
    } else if (typeof sanitized.body === 'object') {
      sanitized.body = sanitizeObject(sanitized.body);
    }
  }

  // Sanitize response data
  if (sanitized.response) {
    sanitized.response = sanitizeObject(sanitized.response);
  }

  return sanitized;
}

/**
 * Validate event data for security
 */
export function validateEventSecurity(event: MonitoringEvent): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check message length
  if (!event.message) {
    errors.push('Event message is required');
  } else if (event.message.length > 5000) {
    warnings.push('Event message is very long and may be truncated');
  }

  // Check for potential injection attempts
  if (
    event.message &&
    /(<script|javascript:|data:|vbscript:)/i.test(event.message)
  ) {
    errors.push('Event message contains potentially malicious content');
  }

  // Check context size
  if (event.context && JSON.stringify(event.context).length > 50000) {
    warnings.push('Event context is very large and may impact performance');
  }

  // Check for obvious sensitive data in message
  const sensitivePatterns = [
    /password\s*[=:]\s*\S+/i,
    /token\s*[=:]\s*\S+/i,
    /api[_-]?key\s*[=:]\s*\S+/i,
    /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/, // Credit card pattern
    /\d{3}-\d{2}-\d{4}/, // SSN pattern
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(event.message)) {
      warnings.push('Event message may contain sensitive information');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create sanitized error summary for logging
 */
export function createErrorSummary(
  error: Error,
  context?: Record<string, any>,
): {
  name: string;
  message: string;
  type: string;
  sanitizedContext?: Record<string, any>;
  timestamp: string;
} {
  return {
    name: error.name,
    message: error.message,
    type: error.constructor.name,
    sanitizedContext: context ? sanitizeObject(context) : undefined,
    timestamp: new Date().toISOString(),
  };
}
