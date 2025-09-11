/**
 * 🔒 SECURE TEST ENVIRONMENT CONFIGURATION
 * 
 * This module provides secure test environment setup that prevents
 * hardcoded API keys from being exposed in production builds.
 * 
 * SECURITY REQUIREMENTS:
 * - NO hardcoded secrets in any form
 * - Dynamic mock generation for all API keys
 * - Environment variable validation
 * - Production safety checks
 */

import { randomBytes, createHmac } from 'crypto';

interface SecureTestEnvironment {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  OPENAI_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  [key: string]: string;
}

/**
 * 🔐 Security-First Test Environment Generator
 * 
 * Generates secure, unique test keys for each test run
 * WITHOUT any hardcoded secrets that could leak to production
 */
export class SecureTestEnvironmentManager {
  private static instance: SecureTestEnvironmentManager;
  private testEnvironment: SecureTestEnvironment;
  private readonly SESSION_ID: string;

  private constructor() {
    // Generate unique session ID for this test run
    this.SESSION_ID = randomBytes(16).toString('hex');
    
    // SECURITY CHECK: Ensure we're in test environment
    this.validateTestEnvironment();
    
    // Generate secure test environment
    this.testEnvironment = this.generateSecureTestEnvironment();
  }

  public static getInstance(): SecureTestEnvironmentManager {
    if (!SecureTestEnvironmentManager.instance) {
      SecureTestEnvironmentManager.instance = new SecureTestEnvironmentManager();
    }
    return SecureTestEnvironmentManager.instance;
  }

  /**
   * 🚨 CRITICAL: Validates we're in test environment
   * Prevents accidental production usage
   */
  private validateTestEnvironment(): void {
    const nodeEnv = process.env.NODE_ENV;
    const isTestEnvironment = nodeEnv === 'test' || 
                              process.env.VITEST === 'true' || 
                              process.env.JEST_WORKER_ID !== undefined;

    if (!isTestEnvironment) {
      throw new Error(`
🚨 SECURITY VIOLATION: SecureTestEnvironmentManager cannot be used outside test environment!
Current NODE_ENV: ${nodeEnv}
This prevents production exposure of test keys.
      `);
    }
  }

  /**
   * 🔒 Generates cryptographically secure test environment
   * Each key is unique, traceable, and safe for testing
   */
  private generateSecureTestEnvironment(): SecureTestEnvironment {
    const timestamp = Date.now();
    const testRunId = `test_${timestamp}_${this.SESSION_ID.slice(0, 8)}`;

    return {
      // Supabase Configuration - Isolated Test Instance
      NEXT_PUBLIC_SUPABASE_URL: `https://test-${testRunId}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: `sb-test-service-${randomBytes(32).toString('hex')}`,
      SUPABASE_ANON_KEY: `sb-test-anon-${randomBytes(32).toString('hex')}`,

      // Webhook Security - Cryptographically Strong Secrets
      RESEND_WEBHOOK_SECRET: this.generateWebhookSecret('resend'),
      
      // API Keys - Service-Specific Test Keys
      RESEND_API_KEY: `re_test_${randomBytes(24).toString('hex')}`,
      STRIPE_SECRET_KEY: `sk_test_${randomBytes(32).toString('hex')}`,
      OPENAI_API_KEY: `sk-test-${randomBytes(32).toString('base64url')}`,

      // Twilio Configuration - Test Credentials
      TWILIO_ACCOUNT_SID: `AC${randomBytes(16).toString('hex')}`,
      TWILIO_AUTH_TOKEN: randomBytes(32).toString('hex'),
      TWILIO_PHONE_NUMBER: '+15551234567', // Standard test number

      // Redis & Cache
      REDIS_URL: 'redis://localhost:6379/15', // Test DB
      CACHE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),

      // Google Cloud (for PDF processing)
      GOOGLE_CLOUD_PROJECT_ID: `test-project-${testRunId}`,
      GOOGLE_CLOUD_KEY_FILE: `/tmp/test-gcp-key-${testRunId}.json`,

      // Database URLs
      DATABASE_URL: `postgresql://test:test@localhost:5432/wedsync_test_${timestamp}`,
      
      // Wedding-specific test configuration
      NEXT_PUBLIC_APP_URL: `https://test-${testRunId}.wedsync.com`,
      WEBHOOK_BASE_URL: `https://webhook-test-${testRunId}.wedsync.com`,
      
      // Security tokens
      JWT_SECRET: randomBytes(64).toString('hex'),
      ENCRYPTION_KEY: randomBytes(32).toString('hex'),
      
      // Third-party integrations
      TAVE_WEBHOOK_SECRET: this.generateWebhookSecret('tave'),
      HONEYBOOK_WEBHOOK_SECRET: this.generateWebhookSecret('honeybook'),
    };
  }

  /**
   * 🔐 Generates HMAC-based webhook secrets
   * Cryptographically secure and service-specific
   */
  private generateWebhookSecret(service: string): string {
    const serviceKey = createHmac('sha256', this.SESSION_ID)
      .update(`webhook_${service}_${Date.now()}`)
      .digest('hex');
    
    return `whsec_test_${service}_${serviceKey.slice(0, 32)}`;
  }

  /**
   * 🌍 Applies secure test environment to process.env
   * Safe for CI/CD - no hardcoded secrets
   */
  public applyTestEnvironment(): void {
    // Clear any existing potentially unsafe variables
    this.clearUnsafeEnvironmentVariables();
    
    // Apply secure test environment
    Object.entries(this.testEnvironment).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Set test-specific flags
    process.env.NODE_ENV = 'test';
    process.env.TEST_SESSION_ID = this.SESSION_ID;
    process.env.SECURE_TEST_MODE = 'true';
    
    console.log(`🔒 Secure test environment applied - Session: ${this.SESSION_ID.slice(0, 8)}`);
  }

  /**
   * 🧹 Clears potentially unsafe environment variables
   */
  private clearUnsafeEnvironmentVariables(): void {
    const unsafePatterns = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY', 
      'RESEND_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'STRIPE_SECRET_KEY',
      'OPENAI_API_KEY',
      'TWILIO_AUTH_TOKEN',
    ];

    unsafePatterns.forEach(pattern => {
      if (process.env[pattern]) {
        delete process.env[pattern];
      }
    });
  }

  /**
   * 📊 Validates test environment is secure
   */
  public validateSecureEnvironment(): boolean {
    const checks = [
      // Ensure no hardcoded test values
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('test-service-role-key'),
      !process.env.RESEND_WEBHOOK_SECRET?.includes('test-webhook-secret'),
      !process.env.SUPABASE_ANON_KEY?.includes('test-anon-key'),
      
      // Ensure dynamic generation
      process.env.TEST_SESSION_ID === this.SESSION_ID,
      process.env.SECURE_TEST_MODE === 'true',
    ];

    return checks.every(check => check === true);
  }

  /**
   * 🔍 Gets secure environment variable for testing
   */
  public getSecureVar(key: keyof SecureTestEnvironment): string {
    return this.testEnvironment[key];
  }

  /**
   * 🧪 Creates mock Supabase client with secure configuration
   */
  public getMockSupabaseConfig() {
    return {
      url: this.testEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      key: this.testEnvironment.SUPABASE_SERVICE_ROLE_KEY,
      options: {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    };
  }

  /**
   * 🔒 Cleanup - Removes test environment variables
   */
  public cleanup(): void {
    Object.keys(this.testEnvironment).forEach(key => {
      delete process.env[key];
    });
    
    delete process.env.TEST_SESSION_ID;
    delete process.env.SECURE_TEST_MODE;
    
    console.log(`🧹 Test environment cleaned - Session: ${this.SESSION_ID.slice(0, 8)}`);
  }
}

/**
 * 🚀 Easy-to-use test setup functions
 */

/**
 * Setup secure test environment for Vitest/Jest
 */
export function setupSecureTestEnvironment(): SecureTestEnvironmentManager {
  const manager = SecureTestEnvironmentManager.getInstance();
  manager.applyTestEnvironment();
  
  if (!manager.validateSecureEnvironment()) {
    throw new Error('🚨 SECURITY FAILURE: Test environment validation failed!');
  }
  
  return manager;
}

/**
 * Cleanup test environment after tests
 */
export function cleanupSecureTestEnvironment(): void {
  const manager = SecureTestEnvironmentManager.getInstance();
  manager.cleanup();
}

/**
 * Get mock environment for specific service testing
 */
export function getMockEnvironment(service: 'supabase' | 'resend' | 'stripe' | 'twilio' | 'openai') {
  const manager = SecureTestEnvironmentManager.getInstance();
  
  switch (service) {
    case 'supabase':
      return {
        url: manager.getSecureVar('NEXT_PUBLIC_SUPABASE_URL'),
        serviceKey: manager.getSecureVar('SUPABASE_SERVICE_ROLE_KEY'),
        anonKey: manager.getSecureVar('SUPABASE_ANON_KEY'),
      };
    
    case 'resend':
      return {
        apiKey: manager.getSecureVar('RESEND_API_KEY'),
        webhookSecret: manager.getSecureVar('RESEND_WEBHOOK_SECRET'),
      };
    
    case 'stripe':
      return {
        secretKey: manager.getSecureVar('STRIPE_SECRET_KEY'),
      };
    
    case 'twilio':
      return {
        accountSid: manager.getSecureVar('TWILIO_ACCOUNT_SID'),
        authToken: manager.getSecureVar('TWILIO_AUTH_TOKEN'),
        phoneNumber: manager.getSecureVar('TWILIO_PHONE_NUMBER'),
      };
    
    case 'openai':
      return {
        apiKey: manager.getSecureVar('OPENAI_API_KEY'),
      };
    
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

// Export singleton for consistent access
export const secureTestEnv = SecureTestEnvironmentManager.getInstance();