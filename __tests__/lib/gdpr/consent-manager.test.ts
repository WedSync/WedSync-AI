/**
 * GDPR Consent Manager Unit Tests
 * WS-176 - GDPR Compliance System
 * 
 * Comprehensive test suite for consent management functionality
 * Testing all GDPR consent lifecycle operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConsentManager } from '@/lib/gdpr/consent-manager';
import {
  ConsentType,
  ConsentStatus,
  GDPRLegalBasis,
  SecurityContext
} from '@/types/gdpr';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  match: jest.fn(() => mockSupabaseClient)
};

// Mock createClient
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

describe('ConsentManager', () => {
  let consentManager: ConsentManager;
  let mockSecurityContext: SecurityContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    consentManager = new ConsentManager();
    
    mockSecurityContext = {
      user_id: 'test-user-123',
      session_id: 'test-session-123',
      ip_address_hash: 'hashed-ip',
      user_agent_hash: 'hashed-agent',
      timestamp: new Date('2025-08-29T10:00:00Z'),
      api_endpoint: '/api/gdpr/consent',
      rate_limit_key: 'test-key'
    };
  });

  describe('recordConsent', () => {
    it('should successfully record new consent', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123' },
        error: null
      });

      // Mock no existing consent
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock successful insert
      const mockConsentRecord = {
        id: 'consent-123',
        user_id: 'test-user-123',
        consent_type: ConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
        legal_basis: GDPRLegalBasis.CONSENT,
        granted_at: '2025-08-29T10:00:00Z',
        version: '1.0',
        created_at: '2025-08-29T10:00:00Z',
        updated_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockConsentRecord,
        error: null
      });

      const result = await consentManager.recordConsent(
        'test-user-123',
        ConsentType.MARKETING,
        true,
        mockSecurityContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.consent_type).toBe(ConsentType.MARKETING);
      expect(result.data?.status).toBe(ConsentStatus.GRANTED);
      
      // Verify database calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('consent_records');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED
        })
      );
    });

    it('should handle user not found error', async () => {
      // Mock user not found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: new Error('User not found')
      });

      const result = await consentManager.recordConsent(
        'nonexistent-user',
        ConsentType.MARKETING,
        true,
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
      expect(result.error?.message).toBe('User not found or unauthorized');
    });

    it('should record denial of consent', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123' },
        error: null
      });

      // Mock no existing consent
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockConsentRecord = {
        id: 'consent-123',
        user_id: 'test-user-123',
        consent_type: ConsentType.MARKETING,
        status: ConsentStatus.DENIED,
        legal_basis: GDPRLegalBasis.CONSENT,
        granted_at: null,
        version: '1.0',
        created_at: '2025-08-29T10:00:00Z',
        updated_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockConsentRecord,
        error: null
      });

      const result = await consentManager.recordConsent(
        'test-user-123',
        ConsentType.MARKETING,
        false,
        mockSecurityContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(ConsentStatus.DENIED);
      expect(result.data?.granted_at).toBeUndefined();
    });

    it('should handle database insert errors', async () => {
      // Mock user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123' },
        error: null
      });

      // Mock no existing consent
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock database error
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database constraint violation')
      });

      const result = await consentManager.recordConsent(
        'test-user-123',
        ConsentType.MARKETING,
        true,
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });

  describe('withdrawConsent', () => {
    it('should successfully withdraw non-required consent', async () => {
      // Mock the recordConsent call for withdrawal
      const consentManagerSpy = jest.spyOn(consentManager, 'recordConsent');
      consentManagerSpy.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'consent-123',
          user_id: 'test-user-123',
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.WITHDRAWN,
          legal_basis: GDPRLegalBasis.CONSENT,
          withdrawn_at: new Date(),
          version: '1.0',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const result = await consentManager.withdrawConsent(
        'test-user-123',
        ConsentType.MARKETING,
        mockSecurityContext,
        'No longer interested'
      );

      expect(result.success).toBe(true);
      expect(consentManagerSpy).toHaveBeenCalledWith(
        'test-user-123',
        ConsentType.MARKETING,
        false,
        mockSecurityContext,
        expect.objectContaining({
          withdrawal_reason: 'No longer interested',
          consent_method: 'withdrawal'
        })
      );

      consentManagerSpy.mockRestore();
    });

    it('should prevent withdrawal of required consent', async () => {
      const result = await consentManager.withdrawConsent(
        'test-user-123',
        ConsentType.FUNCTIONAL, // Required consent
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WITHDRAWAL_NOT_ALLOWED');
      expect(result.error?.message).toContain('required for service operation');
    });
  });

  describe('getConsentBundle', () => {
    it('should return complete consent bundle', async () => {
      const mockConsents = [
        {
          id: 'consent-1',
          user_id: 'test-user-123',
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
          granted_at: '2025-08-29T10:00:00Z',
          created_at: '2025-08-29T10:00:00Z',
          metadata: { ip_address_hash: 'test-hash' }
        },
        {
          id: 'consent-2',
          user_id: 'test-user-123',
          consent_type: ConsentType.ANALYTICS,
          status: ConsentStatus.DENIED,
          granted_at: null,
          created_at: '2025-08-29T09:00:00Z',
          metadata: { ip_address_hash: 'test-hash' }
        }
      ];

      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockConsents,
        error: null
      });

      const result = await consentManager.getConsentBundle('test-user-123');

      expect(result.success).toBe(true);
      expect(result.data?.consents).toHaveLength(2);
      expect(result.data?.consents[0].consent_type).toBe(ConsentType.MARKETING);
      expect(result.data?.consents[0].status).toBe(ConsentStatus.GRANTED);
    });

    it('should handle empty consent records', async () => {
      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await consentManager.getConsentBundle('test-user-123');

      expect(result.success).toBe(true);
      expect(result.data?.consents).toHaveLength(0);
    });
  });

  describe('validateConsent', () => {
    it('should validate granted and unexpired consent', async () => {
      const mockConsent = {
        id: 'consent-123',
        user_id: 'test-user-123',
        consent_type: ConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
        legal_basis: GDPRLegalBasis.CONSENT,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year future
        created_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockConsent,
        error: null
      });

      const result = await consentManager.validateConsent(
        'test-user-123',
        ConsentType.MARKETING
      );

      expect(result.valid).toBe(true);
      expect(result.status).toBe(ConsentStatus.GRANTED);
      expect(result.legal_basis).toBe(GDPRLegalBasis.CONSENT);
    });

    it('should detect expired consent', async () => {
      const mockConsent = {
        id: 'consent-123',
        user_id: 'test-user-123',
        consent_type: ConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
        legal_basis: GDPRLegalBasis.CONSENT,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        created_at: '2025-08-29T10:00:00Z'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockConsent,
        error: null
      });

      const result = await consentManager.validateConsent(
        'test-user-123',
        ConsentType.MARKETING
      );

      expect(result.valid).toBe(false);
      expect(result.status).toBe(ConsentStatus.EXPIRED);
      expect(result.reasons).toContain('Consent has expired');
    });

    it('should handle missing consent for required types', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await consentManager.validateConsent(
        'test-user-123',
        ConsentType.FUNCTIONAL // Required consent
      );

      expect(result.valid).toBe(false);
      expect(result.status).toBe(ConsentStatus.DENIED);
      expect(result.reasons).toContain('Required consent not found');
    });

    it('should handle missing consent for optional types', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await consentManager.validateConsent(
        'test-user-123',
        ConsentType.MARKETING // Optional consent
      );

      expect(result.valid).toBe(false);
      expect(result.status).toBe(ConsentStatus.DENIED);
      expect(result.reasons).toContain('Optional consent not provided');
    });
  });

  describe('bulkUpdateConsents', () => {
    it('should successfully update multiple consents', async () => {
      const consentManagerSpy = jest.spyOn(consentManager, 'recordConsent');
      
      // Mock successful consent recordings
      consentManagerSpy
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'consent-1',
            user_id: 'test-user-123',
            consent_type: ConsentType.MARKETING,
            status: ConsentStatus.GRANTED,
            legal_basis: GDPRLegalBasis.CONSENT,
            version: '1.0',
            metadata: {},
            created_at: new Date(),
            updated_at: new Date()
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'consent-2',
            user_id: 'test-user-123',
            consent_type: ConsentType.ANALYTICS,
            status: ConsentStatus.DENIED,
            legal_basis: GDPRLegalBasis.LEGITIMATE_INTEREST,
            version: '1.0',
            metadata: {},
            created_at: new Date(),
            updated_at: new Date()
          }
        });

      // Mock getConsentBundle for final response
      const getConsentBundleSpy = jest.spyOn(consentManager, 'getConsentBundle');
      getConsentBundleSpy.mockResolvedValueOnce({
        success: true,
        data: {
          user_id: 'test-user-123',
          consents: [
            {
              consent_type: ConsentType.MARKETING,
              status: ConsentStatus.GRANTED,
              granted_at: new Date()
            },
            {
              consent_type: ConsentType.ANALYTICS,
              status: ConsentStatus.DENIED,
              granted_at: undefined
            }
          ],
          last_updated: new Date(),
          ip_address_hash: 'test-hash',
          user_agent_hash: 'test-hash',
          consent_method: 'explicit'
        }
      });

      const consentsToUpdate = [
        {
          consent_type: ConsentType.MARKETING,
          granted: true,
          metadata: { source: 'bulk_update' }
        },
        {
          consent_type: ConsentType.ANALYTICS,
          granted: false,
          metadata: { source: 'bulk_update' }
        }
      ];

      const result = await consentManager.bulkUpdateConsents(
        'test-user-123',
        consentsToUpdate,
        mockSecurityContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.consents).toHaveLength(2);
      expect(consentManagerSpy).toHaveBeenCalledTimes(2);

      consentManagerSpy.mockRestore();
      getConsentBundleSpy.mockRestore();
    });

    it('should handle partial failures in bulk update', async () => {
      const consentManagerSpy = jest.spyOn(consentManager, 'recordConsent');
      
      // Mock one success and one failure
      consentManagerSpy
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'consent-1',
            user_id: 'test-user-123',
            consent_type: ConsentType.MARKETING,
            status: ConsentStatus.GRANTED,
            legal_basis: GDPRLegalBasis.CONSENT,
            version: '1.0',
            metadata: {},
            created_at: new Date(),
            updated_at: new Date()
          }
        })
        .mockResolvedValueOnce({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to record consent'
          }
        });

      const consentsToUpdate = [
        { consent_type: ConsentType.MARKETING, granted: true },
        { consent_type: ConsentType.ANALYTICS, granted: false }
      ];

      const result = await consentManager.bulkUpdateConsents(
        'test-user-123',
        consentsToUpdate,
        mockSecurityContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BULK_UPDATE_PARTIAL_FAILURE');
      expect(result.error?.details?.successful_count).toBe(1);
      expect(result.error?.details?.errors).toHaveLength(1);

      consentManagerSpy.mockRestore();
    });
  });

  describe('checkConsentRenewal', () => {
    it('should identify consents needing renewal', async () => {
      // Mock getConsentBundle with expiring consents
      const getConsentBundleSpy = jest.spyOn(consentManager, 'getConsentBundle');
      getConsentBundleSpy.mockResolvedValueOnce({
        success: true,
        data: {
          user_id: 'test-user-123',
          consents: [
            {
              consent_type: ConsentType.MARKETING,
              status: ConsentStatus.GRANTED,
              granted_at: new Date()
            }
          ],
          last_updated: new Date(),
          ip_address_hash: 'test-hash',
          user_agent_hash: 'test-hash',
          consent_method: 'explicit'
        }
      });

      // Mock database call to get consent with expiry
      const expiringDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          expires_at: expiringDate.toISOString(),
          status: ConsentStatus.GRANTED
        },
        error: null
      });

      const result = await consentManager.checkConsentRenewal('test-user-123');

      expect(result.expiring_soon).toContain(ConsentType.MARKETING);
      expect(result.needs_renewal).toContain(ConsentType.MARKETING);

      getConsentBundleSpy.mockRestore();
    });
  });
});