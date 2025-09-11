import { TamperProofAuditLogger, AUDIT_EVENT_TYPES, RISK_LEVELS } from '@/lib/compliance/audit/tamper-proof-logging';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import crypto from 'crypto';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
}));
vi.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
  createHash: jest.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash-123')
  })),
  createHmac: jest.fn(() => ({
    digest: jest.fn(() => 'mock-signature-123')
  timingSafeEqual: jest.fn(() => true)
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis()
};
describe('TamperProofAuditLogger', () => {
  let auditLogger: TamperProofAuditLogger;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  beforeEach(() => {
    auditLogger = new TamperProofAuditLogger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    vi.clearAllMocks();
  });
  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  describe('logPrivacyEvent', () => {
    it('should log privacy request events', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_trail') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            insert: vi.fn().mockReturnThis()
          };
        }
        return mockSupabaseClient;
      });
      mockSupabaseClient.insert.mockResolvedValue({ data: { id: 'mock-uuid-123' }, error: null });
      await auditLogger.logPrivacyEvent({
        action: 'data_access_request',
        userId: 'user123',
        requestType: 'GDPR_ACCESS',
        requestId: 'req123',
        processorId: 'admin123',
        riskLevel: RISK_LEVELS.MEDIUM,
        metadata: { details: 'User requested data export' }
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_trail');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });
  describe('logConsentChange', () => {
    it('should log consent withdrawal with medium risk', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        insert: vi.fn().mockReturnThis()
      }));
      await auditLogger.logConsentChange({
        consentType: 'marketing',
        previousValue: true,
        newValue: false,
        purpose: 'email_marketing',
        legalBasis: 'consent'
    it('should log consent grant with low risk', async () => {
        consentType: 'analytics',
        previousValue: false,
        newValue: true,
        purpose: 'website_analytics',
  describe('logDataAccess', () => {
    it('should log high-risk data access for sensitive data', async () => {
      await auditLogger.logDataAccess({
        accessedBy: 'admin456',
        resourceType: 'financial_records',
        resourceId: 'payment123',
        purpose: 'payment_verification',
        dataTypes: ['personal_data', 'financial_data']
    it('should log medium-risk access for guest data', async () => {
        resourceType: 'guest_data',
        resourceId: 'guest789',
        purpose: 'wedding_planning',
        dataTypes: ['contact_info']
  describe('logDataBreach', () => {
    it('should log data breach incidents', async () => {
      await auditLogger.logDataBreach({
        severity: 'critical',
        affectedUsers: 1000,
        dataTypes: ['personal_data', 'contact_info'],
        discoveryMethod: 'security_scan',
        containmentMeasures: ['database_secured', 'passwords_reset'],
        notificationRequired: true
    it('should trigger breach notification for reportable breaches', async () => {
        severity: 'high',
        affectedUsers: 500,
        dataTypes: ['personal_data'],
        discoveryMethod: 'user_report',
        containmentMeasures: ['access_revoked'],
      expect(consoleSpy).toHaveBeenCalledWith(
        'Breach notification triggered for event:',
        'mock-uuid-123'
      );
  describe('logSecurityViolation', () => {
    it('should log security violations', async () => {
      await auditLogger.logSecurityViolation({
        violationType: 'unauthorized_access',
        severity: RISK_LEVELS.HIGH,
        actorId: 'user123',
        description: 'Attempted access to admin panel',
        preventedAction: 'admin_access'
  describe('verifyAuditTrailIntegrity', () => {
    it('should verify intact audit trail', async () => {
      const mockEvents = [
        {
          id: '1',
          hash: 'hash1',
          previous_hash: null,
          signature: 'sig1',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
          id: '2',
          hash: 'hash2',
          previous_hash: 'hash1',
          signature: 'sig2',
          timestamp: '2024-01-01T01:00:00.000Z'
      ];
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
      const verification = await auditLogger.verifyAuditTrailIntegrity();
      expect(verification.isValid).toBe(true);
      expect(verification.totalEvents).toBe(2);
    it('should detect broken hash chain', async () => {
          signature: 'sig1'
          previous_hash: 'wrong_hash',
          signature: 'sig2'
      expect(verification.isValid).toBe(false);
      expect(verification.brokenChainAt).toBe('2');
    it('should handle verification errors', async () => {
        lte: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      await expect(auditLogger.verifyAuditTrailIntegrity()).rejects.toThrow('Failed to verify audit trail');
  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
          event_type: AUDIT_EVENT_TYPES.PRIVACY_REQUEST,
          risk_level: RISK_LEVELS.MEDIUM
          event_type: AUDIT_EVENT_TYPES.CONSENT_CHANGE,
          risk_level: RISK_LEVELS.LOW
          event_type: AUDIT_EVENT_TYPES.DATA_BREACH,
          risk_level: RISK_LEVELS.CRITICAL
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const report = await auditLogger.generateComplianceReport(startDate, endDate);
      expect(report).toMatchObject({
        period: { start: startDate, end: endDate },
        privacyRequests: 1,
        dataBreaches: 1,
        consentChanges: 1,
        complianceScore: expect.any(Number),
        recommendations: expect.any(Array)
      expect(report.eventCounts[AUDIT_EVENT_TYPES.PRIVACY_REQUEST]).toBe(1);
      expect(report.riskDistribution[RISK_LEVELS.CRITICAL]).toBe(1);
    it('should include recommendations based on compliance issues', async () => {
      const report = await auditLogger.generateComplianceReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      expect(report.recommendations).toContain('Review and strengthen data security measures');
  describe('searchAuditEvents', () => {
    it('should search events with multiple filters', async () => {
      const mockResults = [
          event_type: AUDIT_EVENT_TYPES.DATA_ACCESS,
          actor_id: 'user123',
          resource_type: 'guest_data',
          risk_level: RISK_LEVELS.MEDIUM,
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockResults, error: null })
      const filters = {
        eventType: AUDIT_EVENT_TYPES.DATA_ACCESS,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 10
      };
      const results = await auditLogger.searchAuditEvents(filters);
      expect(results).toEqual(mockResults);
  describe('Tamper-Proof Features', () => {
    it('should generate cryptographic hash for events', async () => {
        single: vi.fn().mockResolvedValue({ data: { hash: 'previous-hash' }, error: null }),
        action: 'test_action',
        userId: 'user123'
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    it('should generate digital signature for events', async () => {
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', expect.any(String));
    it('should escalate audit failures', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      await expect(auditLogger.logPrivacyEvent({
      })).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'CRITICAL: Audit logging failure escalated:',
        expect.any(Object)
});
