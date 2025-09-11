/**
 * AI Features Security Utilities Tests
 * WS-239 Security Requirements Implementation
 */

import { jest } from '@jest/globals';
import {
  sanitizeApiKey,
  validateApiKeyFormat,
  maskApiKey,
  sanitizeFeatureInput,
  validateTierAccess,
  createAuditLogEntry,
  validateWeddingSeasonConfig,
  detectSecurityThreats,
  shouldRetainUsageData,
  exportUserAIData,
  aiFeatureSchemas
} from '@/lib/ai-features-security';

// Mock environment variables
const mockEnv = {
  AI_FEATURES_ENCRYPTION_KEY: 'test-encryption-key-for-testing-purposes-only'
};

beforeAll(() => {
  Object.assign(process.env, mockEnv);
});

describe('API Key Security', () => {
  describe('sanitizeApiKey', () => {
    it('removes XSS characters and whitespace', () => {
      const maliciousKey = '  sk-<script>alert("xss")</script>test  ';
      const sanitized = sanitizeApiKey(maliciousKey);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('script');
      expect(sanitized).not.toMatch(/\s/);
      expect(sanitized).toBe('sk-alertxssttest');
    });

    it('throws error for invalid input', () => {
      expect(() => sanitizeApiKey('')).toThrow('Invalid API key format');
      expect(() => sanitizeApiKey(null as any)).toThrow('Invalid API key format');
      expect(() => sanitizeApiKey('short')).toThrow('API key too short');
    });

    it('limits key length to prevent buffer overflow', () => {
      const longKey = 'sk-' + 'a'.repeat(600);
      const sanitized = sanitizeApiKey(longKey);
      
      expect(sanitized.length).toBe(512);
    });
  });

  describe('validateApiKeyFormat', () => {
    it('validates OpenAI API key format', () => {
      const validOpenAIKey = 'sk-' + 'a'.repeat(48);
      const invalidOpenAIKey = 'invalid-key';
      
      expect(validateApiKeyFormat(validOpenAIKey, 'openai-gpt')).toBe(true);
      expect(validateApiKeyFormat(invalidOpenAIKey, 'openai-gpt')).toBe(false);
    });

    it('validates Anthropic API key format', () => {
      const validAnthropicKey = 'ant-' + 'a'.repeat(48);
      const invalidAnthropicKey = 'sk-invalid';
      
      expect(validateApiKeyFormat(validAnthropicKey, 'anthropic-claude')).toBe(true);
      expect(validateApiKeyFormat(invalidAnthropicKey, 'anthropic-claude')).toBe(false);
    });

    it('validates generic API key format', () => {
      const validGenericKey = 'abc123def456ghi789jkl';
      const invalidGenericKey = 'short';
      
      expect(validateApiKeyFormat(validGenericKey, 'custom-provider')).toBe(true);
      expect(validateApiKeyFormat(invalidGenericKey, 'custom-provider')).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('masks API key correctly', () => {
      const apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      const masked = maskApiKey(apiKey);
      
      expect(masked).toMatch(/^sk-12345.+7890$/);
      expect(masked).toContain('••••');
      expect(masked.length).toBeGreaterThan(12);
    });

    it('handles short keys', () => {
      const shortKey = 'short';
      const masked = maskApiKey(shortKey);
      
      expect(masked).toBe('••••••••');
    });

    it('handles empty keys', () => {
      const masked = maskApiKey('');
      
      expect(masked).toBe('••••••••');
    });
  });
});

describe('Input Sanitization', () => {
  describe('sanitizeFeatureInput', () => {
    it('removes script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeFeatureInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('Hello World');
    });

    it('removes javascript protocol', () => {
      const maliciousInput = 'javascript:alert("xss")Hello World';
      const sanitized = sanitizeFeatureInput(maliciousInput);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toBe('alert("xss")Hello World');
    });

    it('removes event handlers', () => {
      const maliciousInput = 'onclick="alert(1)" Hello World';
      const sanitized = sanitizeFeatureInput(maliciousInput);
      
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toBe('" Hello World');
    });

    it('limits input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = sanitizeFeatureInput(longInput);
      
      expect(sanitized.length).toBe(1000);
    });

    it('handles invalid input types', () => {
      expect(sanitizeFeatureInput(null as any)).toBe('');
      expect(sanitizeFeatureInput(undefined as any)).toBe('');
      expect(sanitizeFeatureInput(123 as any)).toBe('');
    });
  });
});

describe('Access Control', () => {
  describe('validateTierAccess', () => {
    it('validates tier access correctly', () => {
      // User has professional, feature requires starter
      const result1 = validateTierAccess('professional', 'starter');
      expect(result1.hasAccess).toBe(true);
      expect(result1.upgradeRequired).toBe(false);

      // User has starter, feature requires professional
      const result2 = validateTierAccess('starter', 'professional');
      expect(result2.hasAccess).toBe(false);
      expect(result2.upgradeRequired).toBe(true);

      // Same tier
      const result3 = validateTierAccess('professional', 'professional');
      expect(result3.hasAccess).toBe(true);
      expect(result3.upgradeRequired).toBe(false);
    });

    it('handles invalid tier names', () => {
      const result = validateTierAccess('invalid', 'professional');
      expect(result.hasAccess).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });
  });
});

describe('Audit Logging', () => {
  describe('createAuditLogEntry', () => {
    it('creates valid audit log entry', () => {
      const entry = createAuditLogEntry('user123', 'API_KEY_UPDATED', 'photo-tagging', {
        providerId: 'openai-gpt'
      });

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('userId', 'user123');
      expect(entry).toHaveProperty('action', 'API_KEY_UPDATED');
      expect(entry).toHaveProperty('featureId', 'photo-tagging');
      expect(entry).toHaveProperty('metadata');
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('sanitizes input data', () => {
      const maliciousUserId = '<script>alert("xss")</script>';
      const entry = createAuditLogEntry(maliciousUserId, 'test');

      expect(entry.userId).not.toContain('<script>');
    });

    it('limits metadata size', () => {
      const largeMetadata = { data: 'a'.repeat(2000) };
      const entry = createAuditLogEntry('user123', 'test', undefined, largeMetadata);

      expect(entry.metadata?.length).toBe(1000);
    });
  });
});

describe('Validation Schemas', () => {
  describe('apiKeyConfig schema', () => {
    it('validates correct API key config', () => {
      const validConfig = {
        providerId: 'openai-gpt',
        keyName: 'Production Key',
        apiKey: 'sk-' + 'a'.repeat(48),
        isConfigured: true,
        testStatus: 'success' as const
      };

      const result = aiFeatureSchemas.apiKeyConfig.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('rejects invalid API key config', () => {
      const invalidConfig = {
        providerId: '',
        keyName: 'Invalid<script>',
        apiKey: 'short',
        isConfigured: 'true', // Wrong type
        testStatus: 'invalid_status'
      };

      const result = aiFeatureSchemas.apiKeyConfig.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('budgetAlert schema', () => {
    it('validates correct budget alert', () => {
      const validAlert = {
        featureId: 'photo-tagging',
        threshold: 100,
        alertType: 'warning' as const,
        message: 'Budget threshold reached'
      };

      const result = aiFeatureSchemas.budgetAlert.safeParse(validAlert);
      expect(result.success).toBe(true);
    });

    it('rejects invalid budget alert', () => {
      const invalidAlert = {
        featureId: '',
        threshold: -10, // Negative not allowed
        alertType: 'invalid',
        message: 'a'.repeat(600) // Too long
      };

      const result = aiFeatureSchemas.budgetAlert.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });
  });
});

describe('Wedding Season Configuration', () => {
  describe('validateWeddingSeasonConfig', () => {
    it('validates correct wedding season config', () => {
      const validConfig = {
        peakMonths: [5, 6, 7, 8, 9, 10],
        multiplier: 2.5,
        alertsEnabled: true,
        budgetAdjustment: 1.3
      };

      expect(validateWeddingSeasonConfig(validConfig)).toBe(true);
    });

    it('rejects invalid wedding season config', () => {
      const invalidConfig = {
        peakMonths: [13, 14], // Invalid months
        multiplier: 15, // Too high
        alertsEnabled: 'yes', // Wrong type
        budgetAdjustment: 0.5 // Too low
      };

      expect(validateWeddingSeasonConfig(invalidConfig)).toBe(false);
    });

    it('handles empty or invalid input', () => {
      expect(validateWeddingSeasonConfig(null)).toBe(false);
      expect(validateWeddingSeasonConfig({})).toBe(false);
      expect(validateWeddingSeasonConfig('invalid')).toBe(false);
    });
  });
});

describe('Security Threat Detection', () => {
  describe('detectSecurityThreats', () => {
    it('detects usage spikes', () => {
      const currentUsage = { totalUsage: 10000, totalCost: 100 };
      const previousUsage = { totalUsage: 500, totalCost: 10 };

      const result = detectSecurityThreats(currentUsage, previousUsage);

      expect(result.threats).toContain('Unusual usage spike detected');
      expect(result.riskLevel).toBe('medium');
    });

    it('detects cost anomalies', () => {
      const currentUsage = { totalUsage: 1000, totalCost: 2000 };
      const previousUsage = { totalUsage: 1000, totalCost: 50 };

      const result = detectSecurityThreats(currentUsage, previousUsage);

      expect(result.threats).toContain('Unusual cost increase detected');
      expect(result.riskLevel).toBe('high');
    });

    it('detects frequent API key changes', () => {
      const currentUsage = { totalUsage: 1000, totalCost: 100, apiKeyChanges: 8 };
      const previousUsage = { totalUsage: 1000, totalCost: 100 };

      const result = detectSecurityThreats(currentUsage, previousUsage);

      expect(result.threats).toContain('Frequent API key changes detected');
      expect(result.riskLevel).toBe('medium');
    });

    it('returns low risk for normal usage', () => {
      const currentUsage = { totalUsage: 1100, totalCost: 11 };
      const previousUsage = { totalUsage: 1000, totalCost: 10 };

      const result = detectSecurityThreats(currentUsage, previousUsage);

      expect(result.threats).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });
  });
});

describe('Data Retention', () => {
  describe('shouldRetainUsageData', () => {
    it('retains recent data', () => {
      const recentTimestamp = new Date().toISOString();
      expect(shouldRetainUsageData(recentTimestamp)).toBe(true);
    });

    it('discards old data', () => {
      const oldTimestamp = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(); // 400 days ago
      expect(shouldRetainUsageData(oldTimestamp)).toBe(false);
    });

    it('retains data within retention period', () => {
      const borderlineTimestamp = new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(); // 300 days ago
      expect(shouldRetainUsageData(borderlineTimestamp)).toBe(true);
    });
  });
});

describe('GDPR Compliance', () => {
  describe('exportUserAIData', () => {
    it('exports user data in correct format', () => {
      const userId = 'user123';
      const exportedData = exportUserAIData(userId);

      expect(exportedData).toHaveProperty('userId', userId);
      expect(exportedData).toHaveProperty('exportDate');
      expect(exportedData).toHaveProperty('apiConfigurations');
      expect(exportedData).toHaveProperty('usageHistory');
      expect(exportedData).toHaveProperty('budgetSettings');
      expect(exportedData).toHaveProperty('alertHistory');
      expect(exportedData).toHaveProperty('auditLog');

      // Verify export date is valid ISO string
      expect(exportedData.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

describe('Rate Limiting Configuration', () => {
  it('has proper rate limit configurations', () => {
    const { rateLimits } = require('@/lib/ai-features-security');

    expect(rateLimits.apiKeyTest).toHaveProperty('windowMs');
    expect(rateLimits.apiKeyTest).toHaveProperty('maxRequests');
    expect(rateLimits.apiKeyTest).toHaveProperty('message');

    expect(rateLimits.budgetUpdate).toHaveProperty('windowMs');
    expect(rateLimits.budgetUpdate).toHaveProperty('maxRequests');
    expect(rateLimits.budgetUpdate).toHaveProperty('message');

    expect(rateLimits.featureToggle).toHaveProperty('windowMs');
    expect(rateLimits.featureToggle).toHaveProperty('maxRequests');
    expect(rateLimits.featureToggle).toHaveProperty('message');
  });
});

describe('Security Headers', () => {
  it('includes all required security headers', () => {
    const { securityHeaders } = require('@/lib/ai-features-security');

    expect(securityHeaders).toHaveProperty('X-Content-Type-Options', 'nosniff');
    expect(securityHeaders).toHaveProperty('X-Frame-Options', 'DENY');
    expect(securityHeaders).toHaveProperty('X-XSS-Protection', '1; mode=block');
    expect(securityHeaders).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(securityHeaders).toHaveProperty('Content-Security-Policy');
    expect(securityHeaders).toHaveProperty('Strict-Transport-Security');
  });
});