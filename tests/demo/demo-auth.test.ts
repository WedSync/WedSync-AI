/**
 * Demo Authentication System Tests
 * Critical tests for JWT-based demo authentication bypass
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  authenticateDemoUser, 
  validateDemoToken, 
  refreshDemoToken,
  getDemoAccounts,
  logDemoActivity
} from '@/lib/auth/demo-auth';

// Mock Supabase
jest.mock('@supabase/supabase-js');

describe('Demo Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-demo-auth-testing-purposes-only';
  });

  describe('authenticateDemoUser', () => {
    it('should authenticate valid demo supplier account', async () => {
      const result = await authenticateDemoUser('supplier_1');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.account).toBeDefined();
      expect(result.account?.id).toBe('supplier_1');
      expect(result.account?.type).toBe('supplier');
    });

    it('should authenticate valid demo couple account', async () => {
      const result = await authenticateDemoUser('couple_1');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.account).toBeDefined();
      expect(result.account?.id).toBe('couple_1');
      expect(result.account?.type).toBe('couple');
    });

    it('should reject invalid account ID', async () => {
      const result = await authenticateDemoUser('invalid_account');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid demo account');
      expect(result.token).toBeUndefined();
      expect(result.account).toBeUndefined();
    });

    it('should reject production account attempt', async () => {
      const result = await authenticateDemoUser('prod_user_123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid demo account');
    });

    it('should generate JWT token with correct claims', async () => {
      const result = await authenticateDemoUser('supplier_1');
      
      if (result.success && result.token) {
        const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString());
        
        expect(payload.accountId).toBe('supplier_1');
        expect(payload.accountType).toBe('supplier');
        expect(payload.isDemoUser).toBe(true);
        expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
      } else {
        throw new Error('Authentication should succeed');
      }
    });
  });

  describe('validateDemoToken', () => {
    it('should validate correct token', async () => {
      const authResult = await authenticateDemoUser('supplier_1');
      expect(authResult.success).toBe(true);
      
      if (authResult.token) {
        const validation = await validateDemoToken(authResult.token);
        
        expect(validation.valid).toBe(true);
        expect(validation.account?.id).toBe('supplier_1');
        expect(validation.account?.type).toBe('supplier');
      }
    });

    it('should reject invalid token signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJzdXBwbGllcl8xIn0.invalid';
      
      const validation = await validateDemoToken(invalidToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Invalid token');
    });

    it('should reject expired token', async () => {
      // Create expired token (past timestamp)
      const expiredPayload = {
        accountId: 'supplier_1',
        accountType: 'supplier',
        isDemoUser: true,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      
      // Mock JWT creation with expired timestamp
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET || (() => { throw new Error("Missing environment variable: JWT_SECRET") })());
      
      const validation = await validateDemoToken(expiredToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('expired');
    });

    it('should reject malformed token', async () => {
      const validation = await validateDemoToken('not.a.valid.jwt.token');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Invalid token');
    });
  });

  describe('refreshDemoToken', () => {
    it('should refresh valid token', async () => {
      const authResult = await authenticateDemoUser('supplier_1');
      expect(authResult.success).toBe(true);
      
      if (authResult.token) {
        const refreshResult = await refreshDemoToken(authResult.token);
        
        expect(refreshResult.success).toBe(true);
        expect(refreshResult.token).toBeDefined();
        expect(refreshResult.token).not.toBe(authResult.token); // New token
      }
    });

    it('should reject refresh of invalid token', async () => {
      const refreshResult = await refreshDemoToken('invalid.token.here');
      
      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error).toBeDefined();
    });
  });

  describe('getDemoAccounts', () => {
    it('should return all demo accounts', async () => {
      const accounts = await getDemoAccounts();
      
      expect(accounts).toBeDefined();
      expect(accounts.suppliers).toHaveLength(7);
      expect(accounts.couples).toHaveLength(2);
      
      // Verify supplier accounts
      const supplierIds = accounts.suppliers.map(s => s.id);
      expect(supplierIds).toContain('supplier_1');
      expect(supplierIds).toContain('supplier_7');
      
      // Verify couple accounts
      const coupleIds = accounts.couples.map(c => c.id);
      expect(coupleIds).toContain('couple_1');
      expect(coupleIds).toContain('couple_2');
    });

    it('should include business names for suppliers', async () => {
      const accounts = await getDemoAccounts();
      
      const skyLens = accounts.suppliers.find(s => s.id === 'supplier_1');
      expect(skyLens?.businessName).toBe('Sky Lens Studios');
      expect(skyLens?.supplierType).toBe('photographer');
      
      const oakBarn = accounts.suppliers.find(s => s.id === 'supplier_3');
      expect(oakBarn?.businessName).toBe('The Oak Barn');
      expect(oakBarn?.supplierType).toBe('venue');
    });

    it('should include couple names', async () => {
      const accounts = await getDemoAccounts();
      
      const emilyJack = accounts.couples.find(c => c.id === 'couple_1');
      expect(emilyJack?.names).toBe('Emily & Jack Harper');
      
      const sophiaLiam = accounts.couples.find(c => c.id === 'couple_2');
      expect(sophiaLiam?.names).toBe('Sophia & Liam Bennett');
    });
  });

  describe('logDemoActivity', () => {
    it('should log authentication activity', async () => {
      const mockLog = jest.fn();
      console.log = mockLog;
      
      await logDemoActivity('supplier_1', 'login', { 
        userAgent: 'test-browser',
        ipAddress: '127.0.0.1' 
      });
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Demo Activity'),
        expect.objectContaining({
          accountId: 'supplier_1',
          action: 'login'
        })
      );
    });

    it('should handle account switching logs', async () => {
      const mockLog = jest.fn();
      console.log = mockLog;
      
      await logDemoActivity('couple_1', 'account_switch', {
        previousAccount: 'supplier_1',
        newAccount: 'couple_1'
      });
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Demo Activity'),
        expect.objectContaining({
          action: 'account_switch',
          metadata: expect.objectContaining({
            previousAccount: 'supplier_1'
          })
        })
      );
    });

    it('should handle portal access logs', async () => {
      const mockLog = jest.fn();
      console.log = mockLog;
      
      await logDemoActivity('supplier_1', 'portal_access', {
        section: 'forms',
        timestamp: new Date().toISOString()
      });
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Demo Activity'),
        expect.objectContaining({
          action: 'portal_access'
        })
      );
    });
  });

  describe('Security Tests', () => {
    it('should not authenticate production user IDs', async () => {
      const productionIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        'real_user_id',
        'auth0|123456789',
        'user_abc123'
      ];
      
      for (const id of productionIds) {
        const result = await authenticateDemoUser(id);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid demo account');
      }
    });

    it('should include demo flag in all tokens', async () => {
      const demoIds = ['supplier_1', 'supplier_7', 'couple_1', 'couple_2'];
      
      for (const id of demoIds) {
        const result = await authenticateDemoUser(id);
        expect(result.success).toBe(true);
        
        if (result.token) {
          const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString());
          expect(payload.isDemoUser).toBe(true);
        }
      }
    });

    it('should have reasonable token expiry (24 hours)', async () => {
      const result = await authenticateDemoUser('supplier_1');
      expect(result.success).toBe(true);
      
      if (result.token) {
        const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString());
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeToExpiry = expiryTime - currentTime;
        
        // Should expire in approximately 24 hours (23-25 hours to account for processing time)
        expect(timeToExpiry).toBeGreaterThan(23 * 60 * 60 * 1000);
        expect(timeToExpiry).toBeLessThan(25 * 60 * 60 * 1000);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing JWT secret', async () => {
      delete process.env.JWT_SECRET;
      
      const result = await authenticateDemoUser('supplier_1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('configuration');
    });

    it('should handle malformed account IDs gracefully', async () => {
      const malformedIds = ['', null, undefined, 123, {}, []];
      
      for (const id of malformedIds) {
        const result = await authenticateDemoUser(id as any);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid demo account');
      }
    });

    it('should provide helpful error messages', async () => {
      const result = await authenticateDemoUser('invalid_account');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid demo account');
      expect(result.error).not.toContain('undefined');
      expect(result.error).not.toContain('null');
    });
  });

  describe('Performance Tests', () => {
    it('should authenticate quickly (< 100ms)', async () => {
      const startTime = Date.now();
      
      await authenticateDemoUser('supplier_1');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });

    it('should validate tokens quickly (< 50ms)', async () => {
      const authResult = await authenticateDemoUser('supplier_1');
      expect(authResult.success).toBe(true);
      
      if (authResult.token) {
        const startTime = Date.now();
        
        await validateDemoToken(authResult.token);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(50);
      }
    });

    it('should handle concurrent authentications', async () => {
      const promises = [
        authenticateDemoUser('supplier_1'),
        authenticateDemoUser('supplier_2'),
        authenticateDemoUser('couple_1'),
        authenticateDemoUser('couple_2')
      ];
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
      });
    });
  });
});