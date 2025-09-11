/**
 * AI Features Security Utilities
 * WS-239 Security Requirements Implementation
 *
 * Provides secure handling of API keys, usage data encryption, and input validation
 */

import crypto from 'crypto';
import { z } from 'zod';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Generate encryption key from environment secret
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AI_FEATURES_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'AI_FEATURES_ENCRYPTION_KEY environment variable is required',
    );
  }
  return crypto.scryptSync(secret, 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data (API keys, usage data)
 */
export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('AI_FEATURES'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine iv + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Extract components
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(
      encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2),
      'hex',
    );
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);

    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('AI_FEATURES'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Sanitize API key input
 */
export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key format');
  }

  // Remove any potential XSS characters and excessive whitespace
  const sanitized = apiKey
    .trim()
    .replace(/[<>'"&]/g, '') // Remove potential XSS characters
    .replace(/\s+/g, '') // Remove all whitespace
    .substring(0, 512); // Limit length

  if (sanitized.length < 8) {
    throw new Error('API key too short');
  }

  return sanitized;
}

/**
 * Validate API key format for different providers
 */
export function validateApiKeyFormat(
  apiKey: string,
  providerId: string,
): boolean {
  const sanitized = sanitizeApiKey(apiKey);

  switch (providerId) {
    case 'openai-vision':
    case 'openai-gpt':
      // OpenAI keys start with 'sk-' and are typically 51 characters
      return /^sk-[A-Za-z0-9]{48}$/.test(sanitized);

    case 'anthropic-claude':
      // Anthropic keys start with 'ant-'
      return /^ant-[A-Za-z0-9-_]{48,}$/.test(sanitized);

    case 'google-ai':
      // Google AI keys are typically 39 characters
      return /^[A-Za-z0-9_-]{32,48}$/.test(sanitized);

    default:
      // Generic validation - at least 16 characters, alphanumeric with common symbols
      return /^[A-Za-z0-9_-]{16,512}$/.test(sanitized);
  }
}

/**
 * Mask API key for display (show only first 8 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '••••••••';
  }

  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '•'.repeat(Math.max(4, apiKey.length - 12));

  return `${start}${middle}${end}`;
}

/**
 * Validation schemas using Zod
 */
export const aiFeatureSchemas = {
  apiKeyConfig: z.object({
    providerId: z.string().min(1).max(50),
    keyName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9\s-_]+$/),
    apiKey: z.string().min(8).max(512),
    isConfigured: z.boolean(),
    testStatus: z.enum(['success', 'error', 'pending', 'never_tested']),
  }),

  budgetAlert: z.object({
    featureId: z.string().min(1).max(100),
    threshold: z.number().min(0).max(10000),
    alertType: z.enum(['warning', 'critical', 'limit_reached']),
    message: z.string().min(1).max(500),
  }),

  usageMetrics: z.object({
    featureId: z.string().min(1).max(100),
    period: z.enum(['current_month', 'last_month', 'last_3_months']),
    totalUsage: z.number().min(0),
    totalCost: z.number().min(0),
    currency: z.enum(['GBP', 'USD']),
  }),

  costInput: z.object({
    amount: z.number().min(0).max(100000),
    currency: z.enum(['GBP', 'USD']),
  }),
};

/**
 * Sanitize user input for AI feature names and descriptions
 */
export function sanitizeFeatureInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Validate subscription tier access for features
 */
export function validateTierAccess(
  currentTier: string,
  requiredTier: string,
): { hasAccess: boolean; upgradeRequired: boolean } {
  const tierLevels: Record<string, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    scale: 3,
    enterprise: 4,
  };

  const currentLevel = tierLevels[currentTier] ?? 0;
  const requiredLevel = tierLevels[requiredTier] ?? 0;

  return {
    hasAccess: currentLevel >= requiredLevel,
    upgradeRequired: currentLevel < requiredLevel,
  };
}

/**
 * Generate secure audit log entries for AI feature operations
 */
export function createAuditLogEntry(
  userId: string,
  action: string,
  featureId?: string,
  metadata?: Record<string, any>,
): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    userId: sanitizeFeatureInput(userId),
    action: sanitizeFeatureInput(action),
    featureId: featureId ? sanitizeFeatureInput(featureId) : null,
    metadata: metadata ? JSON.stringify(metadata).substring(0, 1000) : null,
    ipAddress: null, // Should be populated by middleware
    userAgent: null, // Should be populated by middleware
    sessionId: null, // Should be populated by middleware
  };
}

/**
 * Rate limiting configuration for AI feature operations
 */
export const rateLimits = {
  apiKeyTest: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 tests per 15 minutes per user
    message: 'Too many API key test attempts. Please wait 15 minutes.',
  },
  budgetUpdate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 updates per minute per user
    message: 'Too many budget updates. Please wait a minute.',
  },
  featureToggle: {
    windowMs: 30 * 1000, // 30 seconds
    maxRequests: 20, // 20 toggles per 30 seconds per user
    message: 'Too many feature toggles. Please slow down.',
  },
};

/**
 * Validate wedding season configuration
 */
export function validateWeddingSeasonConfig(config: any): boolean {
  try {
    const schema = z.object({
      peakMonths: z.array(z.number().min(1).max(12)).min(1).max(12),
      multiplier: z.number().min(1).max(10),
      alertsEnabled: z.boolean(),
      budgetAdjustment: z.number().min(1).max(5),
    });

    schema.parse(config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Security headers for AI feature API responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Detect and prevent potential security threats in AI feature usage
 */
export function detectSecurityThreats(
  usage: any,
  previousUsage: any,
): { threats: string[]; riskLevel: 'low' | 'medium' | 'high' } {
  const threats: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Detect unusual usage spikes
  if (usage.totalUsage > previousUsage.totalUsage * 10) {
    threats.push('Unusual usage spike detected');
    riskLevel = 'medium';
  }

  // Detect cost anomalies
  if (usage.totalCost > previousUsage.totalCost * 20) {
    threats.push('Unusual cost increase detected');
    riskLevel = 'high';
  }

  // Detect rapid API key changes
  if (usage.apiKeyChanges && usage.apiKeyChanges > 5) {
    threats.push('Frequent API key changes detected');
    riskLevel = 'medium';
  }

  return { threats, riskLevel };
}

/**
 * Privacy-compliant data retention
 */
export function shouldRetainUsageData(timestamp: string): boolean {
  const retentionPeriod = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
  const dataAge = Date.now() - new Date(timestamp).getTime();

  return dataAge < retentionPeriod;
}

/**
 * GDPR-compliant data export for AI features
 */
export function exportUserAIData(userId: string): Record<string, any> {
  // This would query all AI feature data for the user
  return {
    userId,
    exportDate: new Date().toISOString(),
    apiConfigurations: [], // Masked API keys only
    usageHistory: [],
    budgetSettings: [],
    alertHistory: [],
    auditLog: [],
  };
}
