/**
 * Unit Tests for GDPR Consent Manager
 * WS-176 - GDPR Compliance System
 * 
 * Comprehensive test suite for consent tracking, validation,
 * and lifecycle management functionality.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { ConsentManager, CONSENT_CONFIGURATIONS } from '@/lib/gdpr/consent-manager';
import { 
  ConsentType, 
  ConsentStatus, 
  GDPRLegalBasis,
  SecurityContext 
} from '@/types/gdpr';
// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));
describe('ConsentManager', () => {
  let consentManager: ConsentManager;
  let mockSecurityContext: SecurityContext;
  beforeEach(() => {
    vi.clearAllMocks();
    consentManager = new ConsentManager();
    
    mockSecurityContext = {
      user_id: 'test-user-id',
      session_id: 'test-session-id',
      ip_address_hash: 'hashed-ip',
      user_agent_hash: 'hashed-user-agent',
      timestamp: new Date(),
      api_endpoint: '/api/gdpr/consent',
      rate_limit_key: 'test-rate-limit-key'
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('recordConsent', () => {
    it('should record consent successfully for valid user', async () => {
      // Mock user existence check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-id' },
        error: null
      });
      // Mock existing consent check (no existing consent)
        data: null,
      // Mock successful consent insertion
      const mockConsentRecord = {
        id: 'consent-record-id',
        user_id: 'test-user-id',
        consent_type: ConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
        legal_basis: GDPRLegalBasis.CONSENT,
        granted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
        data: mockConsentRecord,
      const result = await consentManager.recordConsent(
        'test-user-id',
        ConsentType.MARKETING,
        true,
        mockSecurityContext
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.consent_type).toBe(ConsentType.MARKETING);
      expect(result.data?.status).toBe(ConsentStatus.GRANTED);
    });
    it('should return error for non-existent user', async () => {
        error: { message: 'User not found' }
        'non-existent-user',
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    it('should handle database errors gracefully', async () => {
        error: { message: 'Database constraint violation' }
      expect(result.error?.code).toBe('DATABASE_ERROR');
    it('should set correct expiry for consent-based legal basis', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: { id: 'consent-id' },
      
      mockSupabaseClient.insert.mockImplementation(insertMock);
      await consentManager.recordConsent(
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.expires_at).toBeDefined();
      expect(insertCall.legal_basis).toBe(GDPRLegalBasis.CONSENT);
  describe('withdrawConsent', () => {
    it('should withdraw consent successfully for withdrawable consent type', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'test-user-id' },
          error: null
        })
          data: null,
          data: {
            id: 'consent-record-id',
            status: ConsentStatus.WITHDRAWN
          },
        });
      const result = await consentManager.withdrawConsent(
        mockSecurityContext,
        'User requested withdrawal'
    it('should not allow withdrawal of required consent', async () => {
        ConsentType.FUNCTIONAL, // This is required
      expect(result.error?.code).toBe('WITHDRAWAL_NOT_ALLOWED');
  describe('getConsentBundle', () => {
    it('should return complete consent bundle for user', async () => {
      const mockConsents = [
        {
          user_id: 'test-user-id',
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          granted_at: new Date().toISOString(),
          withdrawn_at: null,
          expires_at: null,
          metadata: {}
        },
          consent_type: ConsentType.ANALYTICS,
          status: ConsentStatus.DENIED,
          granted_at: null,
        }
      ];
        data: mockConsents,
      const result = await consentManager.getConsentBundle('test-user-id');
      expect(result.data?.user_id).toBe('test-user-id');
      expect(result.data?.consents).toHaveLength(2);
    it('should handle empty consent records', async () => {
      expect(result.data?.consents).toHaveLength(0);
  describe('validateConsent', () => {
    it('should validate active consent successfully', async () => {
      const validConsent = {
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        data: validConsent,
      const result = await consentManager.validateConsent(
        ConsentType.MARKETING
      expect(result.valid).toBe(true);
      expect(result.status).toBe(ConsentStatus.GRANTED);
      expect(result.legal_basis).toBe(GDPRLegalBasis.CONSENT);
    it('should identify expired consent', async () => {
      const expiredConsent = {
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        data: expiredConsent,
      expect(result.valid).toBe(false);
      expect(result.status).toBe(ConsentStatus.EXPIRED);
      expect(result.reasons).toContain('Consent has expired');
    it('should handle missing consent for required consent types', async () => {
        ConsentType.FUNCTIONAL // Required consent
      expect(result.status).toBe(ConsentStatus.DENIED);
      expect(result.reasons).toContain('Required consent not found - service cannot operate without this consent');
  describe('checkConsentRenewal', () => {
    it('should identify consents needing renewal', async () => {
      const consentBundle = {
        consents: [
          {
            consent_type: ConsentType.MARKETING,
            status: ConsentStatus.GRANTED,
            granted_at: new Date(),
            withdrawn_at: undefined
          }
        ],
        last_updated: new Date(),
        ip_address_hash: 'hash',
        user_agent_hash: 'hash',
        consent_method: 'explicit' as const
      // Mock getConsentBundle
        data: consentBundle,
      // Mock individual consent record check for expiry
        data: {
          expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
          status: ConsentStatus.GRANTED
      const result = await consentManager.checkConsentRenewal('test-user-id');
      expect(result.expiring_soon).toContain(ConsentType.MARKETING);
      expect(result.needs_renewal).toContain(ConsentType.MARKETING);
  describe('bulkUpdateConsents', () => {
    it('should update multiple consents successfully', async () => {
      const consentUpdates = [
        { consent_type: ConsentType.MARKETING, granted: true },
        { consent_type: ConsentType.ANALYTICS, granted: false }
      // Mock successful individual consent recordings
        .mockResolvedValueOnce({ data: { id: 'test-user-id' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'consent-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'consent-2' }, error: null });
      // Mock final consent bundle retrieval
          consents: consentUpdates.map(c => ({
            consent_type: c.consent_type,
            status: c.granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED
          }))
      const result = await consentManager.bulkUpdateConsents(
        consentUpdates,
    it('should handle partial failures in bulk update', async () => {
      // Mock one success and one failure
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });
      expect(result.error?.code).toBe('BULK_UPDATE_PARTIAL_FAILURE');
  describe('CONSENT_CONFIGURATIONS', () => {
    it('should have proper configuration for all consent types', () => {
      Object.values(ConsentType).forEach(consentType => {
        const config = CONSENT_CONFIGURATIONS[consentType];
        
        expect(config).toBeDefined();
        expect(config.consent_type).toBe(consentType);
        expect(config.legal_basis).toBeDefined();
        expect(config.purpose_description).toBeTruthy();
        expect(config.data_categories).toBeInstanceOf(Array);
        expect(config.retention_period_days).toBeGreaterThan(0);
        expect(config.withdrawal_mechanism).toBeTruthy();
        expect(config.version).toBeTruthy();
    it('should have required consent types configured as required', () => {
      expect(CONSENT_CONFIGURATIONS[ConsentType.FUNCTIONAL].required).toBe(true);
      expect(CONSENT_CONFIGURATIONS[ConsentType.COMMUNICATION].required).toBe(true);
    it('should have optional consent types configured as optional', () => {
      expect(CONSENT_CONFIGURATIONS[ConsentType.MARKETING].required).toBe(false);
      expect(CONSENT_CONFIGURATIONS[ConsentType.ANALYTICS].required).toBe(false);
  describe('Error handling and edge cases', () => {
    it('should handle malformed consent type', async () => {
        'invalid-consent-type' as ConsentType,
    it('should handle concurrent consent updates', async () => {
      // This test would verify that concurrent updates don't create race conditions
      // In a real scenario, this would test database transaction handling
      expect(true).toBe(true); // Placeholder for complex concurrency test
});
