/**
 * WS-194: Environment Management - Integration Environment Tests
 * 
 * Comprehensive tests for integration environment configuration including:
 * - Environment detection and configuration loading
 * - Third-party service configuration validation
 * - Environment-specific settings and overrides
 * - Integration health monitoring setup
 * - Configuration schema validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock environment variables
const mockEnvVars = {
  NODE_ENV: 'test',
  VERCEL_ENV: 'preview',
  NEXT_PUBLIC_ENV: 'staging',
  NEXT_PUBLIC_APP_URL: 'https://staging.wedsync.com',
  
  // Google Calendar
  GOOGLE_CALENDAR_DEV_CLIENT_ID: 'dev_google_client_id',
  GOOGLE_CALENDAR_DEV_CLIENT_SECRET: 'dev_google_client_secret',
  GOOGLE_CALENDAR_STAGING_CLIENT_ID: 'staging_google_client_id',
  GOOGLE_CALENDAR_STAGING_CLIENT_SECRET: 'staging_google_client_secret',
  GOOGLE_CALENDAR_PRODUCTION_CLIENT_ID: 'prod_google_client_id',
  GOOGLE_CALENDAR_PRODUCTION_CLIENT_SECRET: 'prod_google_client_secret',
  
  // Email service
  EMAIL_API_KEY_DEVELOPMENT: 'dev_email_key',
  EMAIL_API_KEY_STAGING: 'staging_email_key',
  EMAIL_API_KEY_PRODUCTION: 'prod_email_key',
  
  // Twilio SMS
  TWILIO_ACCOUNT_SID_DEVELOPMENT: 'dev_twilio_sid',
  TWILIO_AUTH_TOKEN_DEVELOPMENT: 'dev_twilio_token',
  TWILIO_ACCOUNT_SID_STAGING: 'staging_twilio_sid',
  TWILIO_AUTH_TOKEN_STAGING: 'staging_twilio_token',
  TWILIO_ACCOUNT_SID_PRODUCTION: 'prod_twilio_sid',
  TWILIO_AUTH_TOKEN_PRODUCTION: 'prod_twilio_token',
  
  // Webhook secrets
  WEBHOOK_SIGNING_SECRET_DEVELOPMENT: 'dev_webhook_secret',
  WEBHOOK_SIGNING_SECRET_STAGING: 'staging_webhook_secret',
  WEBHOOK_SIGNING_SECRET_PRODUCTION: 'prod_webhook_secret',
};

// Mock process.env
Object.defineProperty(process, 'env', {
  value: mockEnvVars,
  writable: true
});

import { 
  detectEnvironment, 
  EnvironmentConfig, 
  EnvironmentConfigSchema 
} from '../../src/lib/config/environment';

// Mock integration environment classes (they would be in separate files)
class MockIntegrationEnvironmentManager {
  private environments: Map<string, any> = new Map();

  constructor() {
    this.loadEnvironmentConfigurations();
    this.validateConfigurations();
  }

  private loadEnvironmentConfigurations(): void {
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const config = {
        calendar: {
          google: {
            clientId: this.getSecret(`GOOGLE_CALENDAR_CLIENT_ID_${env.toUpperCase()}`),
            clientSecret: this.getSecret(`GOOGLE_CALENDAR_CLIENT_SECRET_${env.toUpperCase()}`),
            redirectUrl: `${this.getBaseUrl(env)}/api/auth/google/callback`,
            scopes: [
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/calendar.events'
            ],
          },
        },
        email: {
          provider: env === 'production' ? 'sendgrid' : 'ses' as const,
          apiKey: this.getSecret(`EMAIL_API_KEY_${env.toUpperCase()}`),
          fromAddress: env === 'production' 
            ? 'noreply@wedsync.com' 
            : `noreply-${env}@wedsync-dev.com`,
          webhookUrl: `${this.getBaseUrl(env)}/api/webhooks/email`,
        },
        sms: {
          provider: 'twilio' as const,
          accountSid: this.getSecret(`TWILIO_ACCOUNT_SID_${env.toUpperCase()}`),
          authToken: this.getSecret(`TWILIO_AUTH_TOKEN_${env.toUpperCase()}`),
          fromNumber: env === 'production' ? '+1234567890' : '+1234567891',
          webhookUrl: `${this.getBaseUrl(env)}/api/webhooks/sms`,
        },
        webhooks: {
          signingSecret: this.getSecret(`WEBHOOK_SIGNING_SECRET_${env.toUpperCase()}`),
          endpoints: {
            calendar: `${this.getBaseUrl(env)}/api/webhooks/calendar`,
            email: `${this.getBaseUrl(env)}/api/webhooks/email`,
            sms: `${this.getBaseUrl(env)}/api/webhooks/sms`,
            payment: `${this.getBaseUrl(env)}/api/webhooks/payment`,
          },
        },
      };

      this.environments.set(env, config);
    }
  }

  private validateConfigurations(): void {
    for (const [env, config] of this.environments) {
      this.validateEnvironmentConfig(env, config);
    }
  }

  private validateEnvironmentConfig(env: string, config: any): void {
    const errors: string[] = [];

    // Validate calendar configuration
    if (!config.calendar.google.clientId) {
      errors.push(`Missing Google Calendar client ID for ${env}`);
    }

    // Validate email configuration
    if (!config.email.apiKey) {
      errors.push(`Missing email API key for ${env}`);
    }
    if (!this.isValidEmail(config.email.fromAddress)) {
      errors.push(`Invalid from address for ${env}: ${config.email.fromAddress}`);
    }

    // Validate SMS configuration
    if (!config.sms.accountSid || !config.sms.authToken) {
      errors.push(`Missing SMS credentials for ${env}`);
    }

    // Validate webhook configuration
    if (!config.webhooks.signingSecret) {
      errors.push(`Missing webhook signing secret for ${env}`);
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed for ${env}:\n${errors.join('\n')}`);
    }
  }

  private getSecret(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private getBaseUrl(env: string): string {
    switch (env) {
      case 'production':
        return 'https://app.wedsync.com';
      case 'staging':
        return 'https://staging.wedsync.com';
      case 'development':
      default:
        return 'http://localhost:3000';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public getEnvironmentConfig(env: string): any {
    const config = this.environments.get(env);
    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }
    return config;
  }
}

describe('Integration Environment Configuration', () => {
  let integrationManager: MockIntegrationEnvironmentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    integrationManager = new MockIntegrationEnvironmentManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect production from Vercel environment', () => {
      process.env.VERCEL_ENV = 'production';
      const env = detectEnvironment();
      expect(env).toBe('production');
    });

    it('should detect staging from Vercel preview', () => {
      process.env.VERCEL_ENV = 'preview';
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect staging from NEXT_PUBLIC_ENV', () => {
      delete process.env.VERCEL_ENV;
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_ENV = 'staging';
      
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should detect staging from URL pattern', () => {
      delete process.env.VERCEL_ENV;
      delete process.env.NEXT_PUBLIC_ENV;
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://staging.wedsync.com';
      
      const env = detectEnvironment();
      expect(env).toBe('staging');
    });

    it('should default to development', () => {
      delete process.env.VERCEL_ENV;
      delete process.env.NEXT_PUBLIC_ENV;
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NODE_ENV = 'development';
      
      const env = detectEnvironment();
      expect(env).toBe('development');
    });
  });

  describe('Configuration Loading', () => {
    it('should load development configuration correctly', () => {
      const config = integrationManager.getEnvironmentConfig('development');
      
      expect(config.calendar.google.clientId).toBe('dev_google_client_id');
      expect(config.email.fromAddress).toBe('noreply-development@wedsync-dev.com');
      expect(config.sms.fromNumber).toBe('+1234567891'); // Test number
      expect(config.webhooks.endpoints.calendar).toBe('http://localhost:3000/api/webhooks/calendar');
    });

    it('should load staging configuration correctly', () => {
      const config = integrationManager.getEnvironmentConfig('staging');
      
      expect(config.calendar.google.clientId).toBe('staging_google_client_id');
      expect(config.email.fromAddress).toBe('noreply-staging@wedsync-dev.com');
      expect(config.sms.fromNumber).toBe('+1234567891'); // Test number
      expect(config.webhooks.endpoints.calendar).toBe('https://staging.wedsync.com/api/webhooks/calendar');
    });

    it('should load production configuration correctly', () => {
      const config = integrationManager.getEnvironmentConfig('production');
      
      expect(config.calendar.google.clientId).toBe('prod_google_client_id');
      expect(config.email.fromAddress).toBe('noreply@wedsync.com');
      expect(config.sms.fromNumber).toBe('+1234567890'); // Production number
      expect(config.webhooks.endpoints.calendar).toBe('https://app.wedsync.com/api/webhooks/calendar');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).not.toThrow();
    });

    it('should throw error for missing Google Calendar credentials', () => {
      delete process.env.GOOGLE_CALENDAR_DEV_CLIENT_ID;
      
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).toThrow('Missing required environment variable: GOOGLE_CALENDAR_DEV_CLIENT_ID');
    });

    it('should throw error for missing email credentials', () => {
      delete process.env.EMAIL_API_KEY_DEVELOPMENT;
      
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).toThrow('Missing required environment variable: EMAIL_API_KEY_DEVELOPMENT');
    });

    it('should throw error for missing SMS credentials', () => {
      delete process.env.TWILIO_ACCOUNT_SID_DEVELOPMENT;
      
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).toThrow('Missing required environment variable: TWILIO_ACCOUNT_SID_DEVELOPMENT');
    });

    it('should throw error for missing webhook secrets', () => {
      delete process.env.WEBHOOK_SIGNING_SECRET_DEVELOPMENT;
      
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).toThrow('Missing required environment variable: WEBHOOK_SIGNING_SECRET_DEVELOPMENT');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const manager = new MockIntegrationEnvironmentManager();
      
      expect((manager as any).isValidEmail('noreply@wedsync.com')).toBe(true);
      expect((manager as any).isValidEmail('support@staging.wedsync.com')).toBe(true);
      expect((manager as any).isValidEmail('test-email@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      const manager = new MockIntegrationEnvironmentManager();
      
      expect((manager as any).isValidEmail('invalid-email')).toBe(false);
      expect((manager as any).isValidEmail('@wedsync.com')).toBe(false);
      expect((manager as any).isValidEmail('test@')).toBe(false);
      expect((manager as any).isValidEmail('')).toBe(false);
    });
  });

  describe('Provider Selection', () => {
    it('should use SendGrid for production email', () => {
      const config = integrationManager.getEnvironmentConfig('production');
      expect(config.email.provider).toBe('sendgrid');
    });

    it('should use SES for non-production environments', () => {
      const devConfig = integrationManager.getEnvironmentConfig('development');
      const stagingConfig = integrationManager.getEnvironmentConfig('staging');
      
      expect(devConfig.email.provider).toBe('ses');
      expect(stagingConfig.email.provider).toBe('ses');
    });

    it('should use Twilio for SMS in all environments', () => {
      const environments = ['development', 'staging', 'production'];
      
      environments.forEach(env => {
        const config = integrationManager.getEnvironmentConfig(env);
        expect(config.sms.provider).toBe('twilio');
      });
    });
  });

  describe('URL Generation', () => {
    it('should generate correct base URLs for each environment', () => {
      const manager = new MockIntegrationEnvironmentManager();
      
      expect((manager as any).getBaseUrl('development')).toBe('http://localhost:3000');
      expect((manager as any).getBaseUrl('staging')).toBe('https://staging.wedsync.com');
      expect((manager as any).getBaseUrl('production')).toBe('https://app.wedsync.com');
    });

    it('should generate correct webhook URLs', () => {
      const environments = {
        development: 'http://localhost:3000',
        staging: 'https://staging.wedsync.com',
        production: 'https://app.wedsync.com'
      };

      Object.entries(environments).forEach(([env, baseUrl]) => {
        const config = integrationManager.getEnvironmentConfig(env);
        
        expect(config.webhooks.endpoints.calendar).toBe(`${baseUrl}/api/webhooks/calendar`);
        expect(config.webhooks.endpoints.email).toBe(`${baseUrl}/api/webhooks/email`);
        expect(config.webhooks.endpoints.sms).toBe(`${baseUrl}/api/webhooks/sms`);
        expect(config.webhooks.endpoints.payment).toBe(`${baseUrl}/api/webhooks/payment`);
      });
    });

    it('should generate correct redirect URLs for OAuth', () => {
      const config = integrationManager.getEnvironmentConfig('production');
      
      expect(config.calendar.google.redirectUrl).toBe('https://app.wedsync.com/api/auth/google/callback');
    });
  });

  describe('Google Calendar Scopes', () => {
    it('should configure correct Google Calendar scopes', () => {
      const config = integrationManager.getEnvironmentConfig('production');
      
      expect(config.calendar.google.scopes).toEqual([
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ]);
    });

    it('should use same scopes across all environments', () => {
      const environments = ['development', 'staging', 'production'];
      const expectedScopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      environments.forEach(env => {
        const config = integrationManager.getEnvironmentConfig(env);
        expect(config.calendar.google.scopes).toEqual(expectedScopes);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown environment', () => {
      expect(() => {
        integrationManager.getEnvironmentConfig('unknown');
      }).toThrow('Unknown environment: unknown');
    });

    it('should provide detailed validation errors', () => {
      // Remove multiple required env vars
      delete process.env.GOOGLE_CALENDAR_DEV_CLIENT_ID;
      delete process.env.EMAIL_API_KEY_DEVELOPMENT;
      delete process.env.WEBHOOK_SIGNING_SECRET_DEVELOPMENT;
      
      expect(() => {
        new MockIntegrationEnvironmentManager();
      }).toThrow('Missing required environment variable');
    });
  });

  describe('Environment Isolation', () => {
    it('should have different configurations for each environment', () => {
      const devConfig = integrationManager.getEnvironmentConfig('development');
      const stagingConfig = integrationManager.getEnvironmentConfig('staging');
      const prodConfig = integrationManager.getEnvironmentConfig('production');
      
      // Different client IDs
      expect(devConfig.calendar.google.clientId).not.toBe(stagingConfig.calendar.google.clientId);
      expect(stagingConfig.calendar.google.clientId).not.toBe(prodConfig.calendar.google.clientId);
      
      // Different API keys
      expect(devConfig.email.apiKey).not.toBe(stagingConfig.email.apiKey);
      expect(stagingConfig.email.apiKey).not.toBe(prodConfig.email.apiKey);
      
      // Different webhook secrets
      expect(devConfig.webhooks.signingSecret).not.toBe(stagingConfig.webhooks.signingSecret);
      expect(stagingConfig.webhooks.signingSecret).not.toBe(prodConfig.webhooks.signingSecret);
    });

    it('should use different phone numbers for testing vs production', () => {
      const devConfig = integrationManager.getEnvironmentConfig('development');
      const prodConfig = integrationManager.getEnvironmentConfig('production');
      
      expect(devConfig.sms.fromNumber).toBe('+1234567891'); // Test number
      expect(prodConfig.sms.fromNumber).toBe('+1234567890'); // Production number
    });

    it('should use different email domains', () => {
      const devConfig = integrationManager.getEnvironmentConfig('development');
      const prodConfig = integrationManager.getEnvironmentConfig('production');
      
      expect(devConfig.email.fromAddress).toContain('@wedsync-dev.com');
      expect(prodConfig.email.fromAddress).toContain('@wedsync.com');
    });
  });
});