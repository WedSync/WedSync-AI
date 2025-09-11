/**
 * @fileoverview Comprehensive test suite for IdentityProviderConnector
 * Tests multi-provider authentication orchestration
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdentityProviderConnector } from '../IdentityProviderConnector';
import type {
  IdentityProviderConfig,
  AuthenticationResult,
  EnterpriseUserAttributes,
} from '../IdentityProviderConnector';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js');
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => ({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
  })),
};

vi.mocked(createClient).mockReturnValue(mockSupabase as any);

describe('IdentityProviderConnector', () => {
  let connector: IdentityProviderConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new IdentityProviderConnector('fake-url', 'fake-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Registration', () => {
    it('should register a new identity provider successfully', async () => {
      const config: IdentityProviderConfig = {
        providerId: 'test-provider',
        name: 'Test Provider',
        type: 'oauth2',
        enabled: true,
        priority: 1,
        configuration: {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          authorizationUrl: 'https://provider.com/auth',
          tokenUrl: 'https://provider.com/token',
          userInfoUrl: 'https://provider.com/user',
        },
      };

      mockSupabase.from().insert.mockReturnValueOnce({
        data: [{ id: '123', ...config }],
        error: null,
      });

      const result = await connector.registerProvider(config);

      expect(result.success).toBe(true);
      expect(result.data?.providerId).toBe('test-provider');
      expect(mockSupabase.from).toHaveBeenCalledWith('identity_providers');
    });

    it('should handle provider registration errors', async () => {
      const config: IdentityProviderConfig = {
        providerId: 'test-provider',
        name: 'Test Provider',
        type: 'oauth2',
        enabled: true,
        priority: 1,
        configuration: {},
      };

      mockSupabase.from().insert.mockReturnValueOnce({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      const result = await connector.registerProvider(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to register provider: Database error');
    });
  });

  describe('Authentication Delegation', () => {
    it('should delegate authentication to correct provider', async () => {
      const mockProvider = {
        authenticate: vi.fn().mockResolvedValue({
          success: true,
          user: {
            id: 'user123',
            email: 'user@example.com',
            name: 'Test User',
          },
          token: 'mock-token',
        }),
      };

      // Mock provider retrieval
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            providerId: 'okta',
            configuration: { clientId: 'test' },
          },
          error: null,
        });

      connector.registerProviderInstance('okta', mockProvider as any);

      const result = await connector.authenticate('okta', {
        email: 'user@example.com',
        password: 'password',
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('user@example.com');
      expect(mockProvider.authenticate).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password',
      });
    });

    it('should handle authentication failures gracefully', async () => {
      const mockProvider = {
        authenticate: vi.fn().mockRejectedValue(new Error('Auth failed')),
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            providerId: 'okta',
            configuration: { clientId: 'test' },
          },
          error: null,
        });

      connector.registerProviderInstance('okta', mockProvider as any);

      const result = await connector.authenticate('okta', {
        email: 'user@example.com',
        password: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('User Provisioning', () => {
    it('should provision user successfully', async () => {
      const userAttributes: EnterpriseUserAttributes = {
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User',
        groups: ['admin', 'users'],
        department: 'Engineering',
        title: 'Developer',
        manager: 'manager@example.com',
        customAttributes: {
          office: 'Seattle',
          startDate: '2024-01-01',
        },
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        });

      mockSupabase.from().insert.mockReturnValueOnce({
        data: [{ id: 'new-user-id', ...userAttributes }],
        error: null,
      });

      const result = await connector.provisionUser('okta', userAttributes);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('user@example.com');
    });

    it('should update existing user during provisioning', async () => {
      const userAttributes: EnterpriseUserAttributes = {
        id: 'user123',
        email: 'user@example.com',
        name: 'Updated User',
        groups: ['admin', 'users'],
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: { id: 'existing-user', email: 'user@example.com' },
          error: null,
        });

      mockSupabase
        .from()
        .update()
        .eq.mockReturnValueOnce({
          data: [{ id: 'existing-user', ...userAttributes }],
          error: null,
        });

      const result = await connector.provisionUser('okta', userAttributes);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });
  });

  describe('Provider Health Checks', () => {
    it('should perform health check on all providers', async () => {
      const mockProvider1 = {
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      };
      const mockProvider2 = {
        healthCheck: vi
          .fn()
          .mockResolvedValue({ healthy: false, error: 'Connection failed' }),
      };

      mockSupabase.from().select.mockReturnValueOnce({
        data: [
          { providerId: 'provider1', enabled: true },
          { providerId: 'provider2', enabled: true },
        ],
        error: null,
      });

      connector.registerProviderInstance('provider1', mockProvider1 as any);
      connector.registerProviderInstance('provider2', mockProvider2 as any);

      const results = await connector.checkProvidersHealth();

      expect(results).toHaveLength(2);
      expect(results[0].providerId).toBe('provider1');
      expect(results[0].healthy).toBe(true);
      expect(results[1].providerId).toBe('provider2');
      expect(results[1].healthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider IDs gracefully', async () => {
      const result = await connector.authenticate('nonexistent', {
        email: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider not found');
    });

    it('should handle database connection errors', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: null,
          error: { message: 'Connection failed', code: 'CONNECTION_ERROR' },
        });

      const result = await connector.authenticate('okta', {
        email: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Wedding Industry Integration', () => {
    it('should handle vendor-specific authentication', async () => {
      const vendorAuth = {
        email: 'photographer@example.com',
        businessType: 'photographer',
        verificationCode: '123456',
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            providerId: 'wedding-vendor-sso',
            configuration: { vendorPortalUrl: 'https://vendors.example.com' },
          },
          error: null,
        });

      const mockProvider = {
        authenticate: vi.fn().mockResolvedValue({
          success: true,
          user: {
            id: 'vendor123',
            email: 'photographer@example.com',
            businessType: 'photographer',
            verificationStatus: 'verified',
          },
        }),
      };

      connector.registerProviderInstance(
        'wedding-vendor-sso',
        mockProvider as any,
      );

      const result = await connector.authenticate(
        'wedding-vendor-sso',
        vendorAuth,
      );

      expect(result.success).toBe(true);
      expect(result.user?.businessType).toBe('photographer');
    });
  });
});
