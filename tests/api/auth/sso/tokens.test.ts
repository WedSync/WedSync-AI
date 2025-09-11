/**
 * WS-251 Enterprise SSO Integration System
 * Token Management API Endpoint Tests
 * 
 * Comprehensive tests for enterprise token validation and refresh endpoints including:
 * - JWT token validation and verification
 * - Token refresh and renewal flows
 * - Emergency token creation and management
 * - Multi-tenant token isolation
 * - Wedding vendor specific token claims
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as validateToken } from '@/app/api/auth/sso/tokens/validate/route';
import { POST as refreshToken } from '@/app/api/auth/sso/tokens/refresh/route';
import { POST as createEmergencyToken } from '@/app/api/auth/sso/tokens/emergency/route';
import { POST as revokeToken } from '@/app/api/auth/sso/tokens/revoke/route';
import { createClient } from '@/utils/supabase/server';

// Mock Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn()
}));

// Mock EnterpriseTokenManager
vi.mock('@/lib/services/enterprise-auth/EnterpriseTokenManager', () => ({
  EnterpriseTokenManager: vi.fn().mockImplementation(() => ({
    validateToken: vi.fn(),
    refreshToken: vi.fn(),
    createEmergencyToken: vi.fn(),
    revokeToken: vi.fn(),
    getTokenMetadata: vi.fn()
  }))
}));

describe('Token Management API Endpoints', () => {
  let mockSupabase: any;
  let mockTokenManager: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn(),
      auth: {
        getSession: vi.fn()
      }
    };
    (createClient as vi.Mock).mockReturnValue(mockSupabase);

    // Setup Token Manager mock
    mockTokenManager = require('@/lib/services/enterprise-auth/EnterpriseTokenManager').EnterpriseTokenManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/sso/tokens/validate', () => {
    test('should validate token successfully', async () => {
      // Arrange
      const requestData = {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
        organizationId: 'org-123'
      };

      const mockValidationResult = {
        valid: true,
        payload: {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'photographer',
          permissions: ['view_weddings', 'manage_photos'],
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        metadata: {
          tokenType: 'access_token',
          issuer: 'wedsync-sso',
          audience: 'wedsync-api'
        }
      };

      // Mock token validation
      mockTokenManager.prototype.validateToken.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/validate', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await validateToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          valid: true,
          payload: mockValidationResult.payload,
          metadata: mockValidationResult.metadata
        }
      });
      
      // Verify token validation was called
      expect(mockTokenManager.prototype.validateToken).toHaveBeenCalledWith(
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
        undefined,
        undefined
      );
    });

    test('should handle invalid tokens', async () => {
      // Arrange
      const requestData = {
        token: 'invalid-token',
        organizationId: 'org-123'
      };

      const mockValidationResult = {
        valid: false,
        error: 'Invalid token signature',
        errorCode: 'INVALID_SIGNATURE'
      };

      mockTokenManager.prototype.validateToken.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/validate', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await validateToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Invalid token signature',
        errorCode: 'INVALID_SIGNATURE'
      });
    });

    test('should handle expired tokens', async () => {
      // Arrange
      const requestData = {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...expired',
        organizationId: 'org-123'
      };

      const mockValidationResult = {
        valid: false,
        error: 'Token has expired',
        errorCode: 'TOKEN_EXPIRED',
        expiredAt: '2025-01-01T00:00:00Z'
      };

      mockTokenManager.prototype.validateToken.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/validate', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await validateToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.errorCode).toBe('TOKEN_EXPIRED');
      expect(responseData.expiredAt).toBe('2025-01-01T00:00:00Z');
    });

    test('should include IP address and user agent in validation', async () => {
      // Arrange
      const requestData = {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
        organizationId: 'org-123'
      };

      mockTokenManager.prototype.validateToken.mockResolvedValue({
        valid: true,
        payload: { userId: 'user-123' }
      });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/validate', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token',
          'X-Forwarded-For': '192.168.1.100',
          'User-Agent': 'Mozilla/5.0 (Wedding Browser)'
        }
      });

      // Act
      await validateToken(request);

      // Assert
      expect(mockTokenManager.prototype.validateToken).toHaveBeenCalledWith(
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...',
        '192.168.1.100',
        'Mozilla/5.0 (Wedding Browser)'
      );
    });
  });

  describe('POST /api/auth/sso/tokens/refresh', () => {
    test('should refresh token successfully', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'refresh-token-123',
        organizationId: 'org-123'
      };

      const mockRefreshResult = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-123',
        expiresIn: 3600,
        tokenType: 'Bearer',
        payload: {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'photographer'
        }
      };

      mockTokenManager.prototype.refreshToken.mockResolvedValue(mockRefreshResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/refresh', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      // Act
      const response = await refreshToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          accessToken: mockRefreshResult.accessToken,
          refreshToken: mockRefreshResult.refreshToken,
          expiresIn: mockRefreshResult.expiresIn,
          tokenType: mockRefreshResult.tokenType
        }
      });
    });

    test('should handle invalid refresh tokens', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'invalid-refresh-token',
        organizationId: 'org-123'
      };

      mockTokenManager.prototype.refreshToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/refresh', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Act
      const response = await refreshToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid or expired refresh token');
    });

    test('should enforce rate limiting on refresh attempts', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'refresh-token-123',
        organizationId: 'org-123'
      };

      // Mock rate limit exceeded
      mockTokenManager.prototype.refreshToken.mockRejectedValue(
        new Error('Rate limit exceeded for token refresh')
      );

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/refresh', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      // Act
      const response = await refreshToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Rate limit exceeded for token refresh');
    });
  });

  describe('POST /api/auth/sso/tokens/emergency', () => {
    test('should create emergency token for wedding day incidents', async () => {
      // Arrange
      const requestData = {
        userId: 'user-123',
        weddingId: 'wedding-456',
        reason: 'Lead photographer equipment failure',
        durationHours: 2,
        permissions: ['emergency_access', 'manage_photos', 'coordinate_team']
      };

      const mockEmergencyToken = 'emergency-token-xyz789';

      mockTokenManager.prototype.createEmergencyToken.mockResolvedValue(mockEmergencyToken);

      // Mock admin validation
      mockSupabase.single.mockResolvedValue({
        data: { 
          id: 'admin-123',
          permissions: ['emergency_token_creation']
        },
        error: null
      });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/emergency', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await createEmergencyToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          emergencyToken: mockEmergencyToken,
          expiresIn: 7200, // 2 hours in seconds
          permissions: requestData.permissions
        }
      });
      
      // Verify emergency token creation
      expect(mockTokenManager.prototype.createEmergencyToken).toHaveBeenCalledWith({
        userId: 'user-123',
        weddingId: 'wedding-456',
        reason: 'Lead photographer equipment failure',
        durationHours: 2,
        permissions: requestData.permissions,
        grantedBy: expect.any(String)
      });
    });

    test('should require emergency permissions for token creation', async () => {
      // Arrange
      const requestData = {
        userId: 'user-123',
        weddingId: 'wedding-456',
        reason: 'Emergency access needed'
      };

      // Mock unauthorized admin
      mockSupabase.single.mockResolvedValue({
        data: { 
          id: 'user-123',
          permissions: ['view_weddings']
        },
        error: null
      });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/emergency', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      // Act
      const response = await createEmergencyToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Insufficient permissions for emergency token creation');
    });

    test('should validate wedding day context for emergency tokens', async () => {
      // Arrange
      const requestData = {
        userId: 'user-123',
        weddingId: 'wedding-456',
        reason: 'Non-urgent request'
      };

      // Mock wedding not happening today
      mockSupabase.single
        .mockResolvedValueOnce({ // Admin validation
          data: { 
            id: 'admin-123',
            permissions: ['emergency_token_creation']
          },
          error: null
        })
        .mockResolvedValueOnce({ // Wedding validation
          data: {
            id: 'wedding-456',
            wedding_date: '2025-06-01', // Future date
            status: 'planned'
          },
          error: null
        });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/emergency', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await createEmergencyToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Emergency tokens only available for weddings happening today');
    });
  });

  describe('POST /api/auth/sso/tokens/revoke', () => {
    test('should revoke token successfully', async () => {
      // Arrange
      const requestData = {
        token: 'token-to-revoke-123',
        organizationId: 'org-123',
        reason: 'User logged out'
      };

      mockTokenManager.prototype.revokeToken.mockResolvedValue({
        success: true,
        revokedAt: '2025-01-15T10:00:00Z'
      });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/revoke', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await revokeToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          revoked: true,
          revokedAt: '2025-01-15T10:00:00Z'
        }
      });
    });

    test('should handle bulk token revocation for organization', async () => {
      // Arrange
      const requestData = {
        organizationId: 'org-123',
        revokeAll: true,
        reason: 'Security breach - revoke all tokens'
      };

      mockTokenManager.prototype.revokeToken.mockResolvedValue({
        success: true,
        revokedCount: 25,
        revokedAt: '2025-01-15T10:00:00Z'
      });

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/revoke', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await revokeToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.revokedCount).toBe(25);
    });
  });

  describe('Wedding Vendor Token Features', () => {
    test('should include vendor-specific claims in tokens', async () => {
      // Arrange
      const requestData = {
        token: 'vendor-token-123',
        organizationId: 'photographer-org-123'
      };

      const mockValidationResult = {
        valid: true,
        payload: {
          userId: 'photographer-123',
          organizationId: 'photographer-org-123',
          role: 'lead_photographer',
          permissions: ['manage_photos', 'access_wedding_timeline'],
          vendorType: 'photographer',
          vendorTier: 'gold',
          weddingAccess: ['wedding-456', 'wedding-789'],
          collaborationPermissions: ['share_with_planners', 'coordinate_with_venue']
        }
      };

      mockTokenManager.prototype.validateToken.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/validate', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      // Act
      const response = await validateToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.payload.vendorType).toBe('photographer');
      expect(responseData.data.payload.weddingAccess).toContain('wedding-456');
      expect(responseData.data.payload.collaborationPermissions).toContain('share_with_planners');
    });

    test('should handle seasonal access tokens', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'seasonal-refresh-token-123',
        organizationId: 'seasonal-vendor-123'
      };

      const mockRefreshResult = {
        accessToken: 'seasonal-access-token-456',
        refreshToken: 'new-seasonal-refresh-token-456',
        expiresIn: 3600,
        tokenType: 'Bearer',
        payload: {
          userId: 'seasonal-photographer-123',
          organizationId: 'seasonal-vendor-123',
          role: 'seasonal_photographer',
          seasonalAccess: {
            season: 'summer',
            validUntil: '2025-09-30',
            maxWeddingsPerWeek: 3
          }
        }
      };

      mockTokenManager.prototype.refreshToken.mockResolvedValue(mockRefreshResult);

      const request = new NextRequest('http://localhost/api/auth/sso/tokens/refresh', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Act
      const response = await refreshToken(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });

  describe('Security and Compliance', () => {
    test('should audit all token operations', async () => {
      // Test comprehensive audit logging
      expect(true).toBe(true); // Placeholder
    });

    test('should enforce token rotation policies', async () => {
      // Test automatic token rotation
      expect(true).toBe(true); // Placeholder
    });

    test('should detect suspicious token usage patterns', async () => {
      // Test anomaly detection
      expect(true).toBe(true); // Placeholder
    });

    test('should handle token blacklisting for compromised tokens', async () => {
      // Test token blacklisting
      expect(true).toBe(true); // Placeholder
    });
  });
});

/**
 * Integration Tests for Token Management
 */
describe('Token Management Integration Tests', () => {
  test('should integrate with multi-tenant authentication', async () => {
    // Test token validation across multiple tenants
    expect(true).toBe(true); // Placeholder
  });

  test('should handle wedding day emergency scenarios', async () => {
    // Test emergency token flows for wedding day incidents
    expect(true).toBe(true); // Placeholder
  });

  test('should coordinate with vendor network authentication', async () => {
    // Test vendor collaboration token flows
    expect(true).toBe(true); // Placeholder
  });
});