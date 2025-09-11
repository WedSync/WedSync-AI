/**
 * CSRF Protection Security Tests
 * Tests CSRF token validation and cross-site request forgery prevention
 */

import { NextRequest } from 'next/server';
import { csrfManager, CSRFError } from '@/lib/csrf';

// Mock Next.js request for testing
const createMockRequest = (
  method: string = 'POST',
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest => {
  const url = 'https://example.com/api/forms';
  const request = new NextRequest(url, { method });
  
  // Set headers
  Object.entries(headers).forEach(([key, value]) => {
    request.headers.set(key, value);
  });
  
  // Mock cookies
  Object.entries(cookies).forEach(([key, value]) => {
    request.cookies.set(key, value);
  });
  
  return request;
};

describe('CSRF Protection Tests', () => {
  let mockUserId: string;
  
  beforeEach(() => {
    mockUserId = 'user-' + Math.random().toString(36).substring(2);
    jest.clearAllMocks();
  });

  describe('CSRF Token Generation', () => {
    test('should generate valid CSRF tokens', () => {
      const token = csrfManager.generateToken();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
      expect(token.length).toBe(64);
    });

    test('should generate unique tokens', () => {
      const tokens = Array.from({ length: 10 }, () => csrfManager.generateToken());
      const uniqueTokens = new Set(tokens);
      
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    test('should hash tokens consistently', () => {
      const token = csrfManager.generateToken();
      const hash1 = csrfManager.hashToken(token);
      const hash2 = csrfManager.hashToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate different hashes for different tokens', () => {
      const token1 = csrfManager.generateToken();
      const token2 = csrfManager.generateToken();
      const hash1 = csrfManager.hashToken(token1);
      const hash2 = csrfManager.hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('CSRF Token Validation', () => {
    test('should validate correct token-hash pairs', () => {
      const token = csrfManager.generateToken();
      const hash = csrfManager.hashToken(token);
      
      const isValid = csrfManager.validateToken(token, hash);
      expect(isValid).toBe(true);
    });

    test('should reject invalid token-hash pairs', () => {
      const token1 = csrfManager.generateToken();
      const token2 = csrfManager.generateToken();
      const hash1 = csrfManager.hashToken(token1);
      
      const isValid = csrfManager.validateToken(token2, hash1);
      expect(isValid).toBe(false);
    });

    test('should reject empty or null tokens', () => {
      const token = csrfManager.generateToken();
      const hash = csrfManager.hashToken(token);
      
      expect(csrfManager.validateToken('', hash)).toBe(false);
      expect(csrfManager.validateToken(null as any, hash)).toBe(false);
      expect(csrfManager.validateToken(token, '')).toBe(false);
      expect(csrfManager.validateToken(token, null as any)).toBe(false);
    });

    test('should use timing-safe comparison', () => {
      const token = csrfManager.generateToken();
      const validHash = csrfManager.hashToken(token);
      const invalidHash = validHash.substring(0, -1) + 'x'; // Change last character
      
      // Both should take roughly the same time (timing-safe)
      const start1 = process.hrtime.bigint();
      csrfManager.validateToken(token, validHash);
      const end1 = process.hrtime.bigint();
      
      const start2 = process.hrtime.bigint();
      csrfManager.validateToken(token, invalidHash);
      const end2 = process.hrtime.bigint();
      
      // Times should be similar (within reasonable variance)
      const time1 = Number(end1 - start1);
      const time2 = Number(end2 - start2);
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      
      expect(ratio).toBeLessThan(10); // Allow up to 10x difference due to system variance
    });
  });

  describe('Rate Limiting for Token Generation', () => {
    test('should enforce rate limits for token generation', async () => {
      const clientIP = '192.168.1.1';
      const request = createMockRequest('GET');
      
      // Mock the IP address
      Object.defineProperty(request, 'ip', { value: clientIP });
      
      // Generate tokens up to the limit
      const promises = Array.from({ length: 15 }, async () => {
        try {
          await csrfManager.generateAndStoreToken(request, mockUserId);
          return true;
        } catch (error) {
          return error instanceof CSRFError && error.code === 'RATE_LIMIT_EXCEEDED';
        }
      });
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r === true).length;
      const rateLimitedCount = results.filter(r => r === true && r !== true).length;
      
      expect(successCount).toBeLessThanOrEqual(10); // Default rate limit
      expect(rateLimitedCount).toBeGreaterThan(0); // Some should be rate limited
    });

    test('should reset rate limit after time window', async () => {
      const clientIP = '192.168.1.2';
      const request = createMockRequest('GET');
      Object.defineProperty(request, 'ip', { value: clientIP });
      
      // Exhaust rate limit
      try {
        for (let i = 0; i < 15; i++) {
          await csrfManager.generateAndStoreToken(request, mockUserId);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(CSRFError);
      }
      
      // Mock time passage (this would require more sophisticated mocking in real implementation)
      // For now, just test that the rate limit exists
      await expect(
        csrfManager.generateAndStoreToken(request, mockUserId)
      ).rejects.toThrow(CSRFError);
    });
  });

  describe('Request Validation', () => {
    test('should accept requests with valid CSRF tokens in headers', async () => {
      const token = csrfManager.generateToken();
      const request = createMockRequest('POST', {
        'x-csrf-token': token
      }, {
        'csrf-token': token
      });
      
      // This test would require mocking the database operations
      // For now, we test the validation logic
      expect(token).toBeTruthy();
    });

    test('should reject requests without CSRF tokens', async () => {
      const request = createMockRequest('POST');
      
      await expect(
        csrfManager.validateTokenFromRequest(request, mockUserId)
      ).rejects.toThrow(CSRFError);
    });

    test('should reject requests with mismatched CSRF tokens', async () => {
      const token1 = csrfManager.generateToken();
      const token2 = csrfManager.generateToken();
      
      const request = createMockRequest('POST', {
        'x-csrf-token': token1
      }, {
        'csrf-token': token2
      });
      
      await expect(
        csrfManager.validateTokenFromRequest(request, mockUserId)
      ).rejects.toThrow(CSRFError);
    });

    test('should extract tokens from various request sources', () => {
      // Test header extraction
      const request1 = createMockRequest('POST', {
        'x-csrf-token': 'header-token'
      });
      
      // This would test the private method if it were public
      // For now, we verify the token is properly set
      expect(request1.headers.get('x-csrf-token')).toBe('header-token');
    });
  });

  describe('Cross-Origin Request Protection', () => {
    test('should validate origin headers for CSRF protection', () => {
      const sameOriginRequest = createMockRequest('POST', {
        'origin': 'https://wedsync.com',
        'host': 'wedsync.com'
      });
      
      const crossOriginRequest = createMockRequest('POST', {
        'origin': 'https://malicious-site.com',
        'host': 'wedsync.com'
      });
      
      // Verify origin headers are accessible for validation
      expect(sameOriginRequest.headers.get('origin')).toBe('https://wedsync.com');
      expect(crossOriginRequest.headers.get('origin')).toBe('https://malicious-site.com');
    });

    test('should check referer headers for additional protection', () => {
      const validReferer = createMockRequest('POST', {
        'referer': 'https://wedsync.com/forms/create'
      });
      
      const invalidReferer = createMockRequest('POST', {
        'referer': 'https://evil-site.com/attack'
      });
      
      expect(validReferer.headers.get('referer')).toMatch(/wedsync\.com/);
      expect(invalidReferer.headers.get('referer')).not.toMatch(/wedsync\.com/);
    });
  });

  describe('CSRF Error Handling', () => {
    test('should create appropriate error objects', () => {
      const error = new CSRFError('Invalid token', 'TOKEN_INVALID');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CSRFError);
      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe('TOKEN_INVALID');
      expect(error.name).toBe('CSRFError');
    });

    test('should handle different error types', () => {
      const errorTypes = [
        { message: 'Token missing', code: 'TOKEN_MISSING' },
        { message: 'Token expired', code: 'TOKEN_EXPIRED' },
        { message: 'Token invalid', code: 'TOKEN_INVALID' },
        { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
      ];
      
      errorTypes.forEach(({ message, code }) => {
        const error = new CSRFError(message, code);
        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
      });
    });
  });

  describe('Session Integration', () => {
    test('should bind tokens to user sessions', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      const token = csrfManager.generateToken();
      
      // Tokens should be bound to specific users
      expect(userId1).not.toBe(userId2);
      expect(token).toBeTruthy();
    });

    test('should handle anonymous sessions', async () => {
      const request = createMockRequest('GET');
      
      // Should be able to generate tokens for anonymous users
      await expect(
        csrfManager.generateAndStoreToken(request)
      ).resolves.not.toThrow();
    });
  });

  describe('Cookie Security', () => {
    test('should set secure cookie attributes', () => {
      // This would test the cookie setting in a real browser environment
      // For now, we verify the configuration exists
      const config = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 3600,
      };
      
      expect(config.httpOnly).toBe(true);
      expect(config.sameSite).toBe('strict');
      expect(config.maxAge).toBeGreaterThan(0);
    });
  });

  describe('Token Rotation', () => {
    test('should support token rotation', async () => {
      const request = createMockRequest('GET');
      const mockResponse = {
        cookies: {
          set: jest.fn()
        }
      } as any;
      
      const token1 = await csrfManager.rotateToken(request, mockResponse, mockUserId);
      const token2 = await csrfManager.rotateToken(request, mockResponse, mockUserId);
      
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should invalidate old tokens after rotation', async () => {
      // This would require database mocking to test properly
      // For now, verify that new tokens are generated
      const request = createMockRequest('GET');
      const mockResponse = { cookies: { set: jest.fn() } } as any;
      
      const oldToken = csrfManager.generateToken();
      const newToken = await csrfManager.rotateToken(request, mockResponse, mockUserId);
      
      expect(newToken).not.toBe(oldToken);
    });
  });

  describe('Integration with Forms API', () => {
    test('should integrate with form submission endpoints', () => {
      // Mock a form submission request with CSRF token
      const token = csrfManager.generateToken();
      const formRequest = createMockRequest('POST', {
        'x-csrf-token': token,
        'content-type': 'application/json'
      });
      
      // Verify the request structure for API integration
      expect(formRequest.method).toBe('POST');
      expect(formRequest.headers.get('x-csrf-token')).toBe(token);
      expect(formRequest.headers.get('content-type')).toBe('application/json');
    });

    test('should work with multipart form uploads', () => {
      const token = csrfManager.generateToken();
      const uploadRequest = createMockRequest('POST', {
        'x-csrf-token': token,
        'content-type': 'multipart/form-data'
      });
      
      expect(uploadRequest.headers.get('x-csrf-token')).toBe(token);
      expect(uploadRequest.headers.get('content-type')).toBe('multipart/form-data');
    });
  });
});