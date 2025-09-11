/**
 * WS-168: Data Protection Utilities
 * PII masking and sensitive data handling for admin components
 */

// PII field patterns for identification
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/gi,
  userId: /^user_[a-z0-9]{8,}$/gi,
} as const;

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
      return value.replace(/(\+?1)?(\d{3})(\d{3})(\d{4})/, '$1***$3***');

    case 'userId':
      return value.replace(/(user_)(.{3})(.*)(.{3})/, '$1***$3***');

    default:
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

// Simple audit logging function
export async function logAdminAccess(
  adminUserId: string,
  action: string,
  details?: Record<string, any>,
): Promise<void> {
  try {
    // In a real implementation, this would write to a secure audit log
    console.log('Admin Access Log:', {
      adminUserId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

// Sanitize admin dashboard data
export function sanitizeAdminData<T>(data: T): T {
  if (!data) {
    return data;
  }

  if (typeof data === 'string') {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAdminData(item)) as T;
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (key === 'user_id' && typeof value === 'string') {
        sanitized[key] = maskSensitiveData(value, 'userId');
      } else {
        sanitized[key] = sanitizeAdminData(value);
      }
    }

    return sanitized as T;
  }

  return data;
}
