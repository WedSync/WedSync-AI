import { SecurityAuditLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security/audit-logger';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis()
};
describe('SecurityAuditLogger', () => {
  let auditLogger: SecurityAuditLogger;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  beforeEach(() => {
    auditLogger = SecurityAuditLogger.getInstance();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset mocks
    vi.clearAllMocks();
  });
  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityAuditLogger.getInstance();
      const instance2 = SecurityAuditLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  describe('logEvent', () => {
    it('should log security events successfully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ error: null })
      }));
      const event = {
        event_type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecurityEventSeverity.LOW,
        user_id: 'user123',
        ip_address: '192.168.1.1',
        description: 'User logged in successfully'
      };
      await auditLogger.logEvent(event);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('security_audit_logs');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    it('should handle database insertion errors', async () => {
      const dbError = new Error('Database error');
        insert: vi.fn().mockResolvedValue({ error: dbError })
        event_type: SecurityEventType.LOGIN_FAILED,
        severity: SecurityEventSeverity.MEDIUM,
        description: 'Login attempt failed'
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log security event:', dbError);
    it('should trigger critical event notifications', async () => {
      const criticalEvent = {
        event_type: SecurityEventType.BRUTE_FORCE_DETECTED,
        severity: SecurityEventSeverity.CRITICAL,
        description: 'Brute force attack detected'
      await auditLogger.logEvent(criticalEvent);
      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL SECURITY EVENT:', expect.any(Object));
    it('should use fallback logging when database fails', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
        event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.HIGH,
        description: 'Suspicious activity detected'
      expect(consoleErrorSpy).toHaveBeenCalledWith('Security audit logging error:', expect.any(Error));
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_AUDIT] HIGH'),
        event
      );
  describe('logAuthEvent', () => {
    it('should log successful authentication events', async () => {
      await auditLogger.logAuthEvent(
        'user123',
        SecurityEventType.LOGIN_SUCCESS,
        true,
        { session_id: 'session123' }
    it('should assign higher severity to failed auth events', async () => {
        SecurityEventType.LOGIN_FAILED,
        false
  describe('logMFAEvent', () => {
    it('should log MFA enrollment events', async () => {
      await auditLogger.logMFAEvent(
        SecurityEventType.MFA_ENROLLED,
        'totp',
        true
    it('should log MFA failure events with medium severity', async () => {
        SecurityEventType.MFA_FAILED,
  describe('logDataAccessEvent', () => {
    it('should log data access events', async () => {
      await auditLogger.logDataAccessEvent(
        'guest_data',
        'guest456',
        'view_profile',
        { permission_level: 'read' }
  describe('logSecurityThreat', () => {
    it('should log security threats with critical severity', async () => {
      await auditLogger.logSecurityThreat(
        SecurityEventType.SQL_INJECTION_BLOCKED,
        '192.168.1.100',
        'Mozilla/5.0',
        { blocked_query: 'malicious sql' }
  describe('queryLogs', () => {
    it('should query logs with filters', async () => {
      const mockData = [
        {
          id: '1',
          event_type: SecurityEventType.LOGIN_SUCCESS,
          severity: SecurityEventSeverity.LOW,
          user_id: 'user123',
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ];
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null })
      const query = {
        userId: 'user123',
        eventType: SecurityEventType.LOGIN_SUCCESS,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 10
      const result = await auditLogger.queryLogs(query);
      expect(result).toEqual(mockData);
    it('should handle query errors gracefully', async () => {
      const dbError = new Error('Query failed');
        limit: vi.fn().mockResolvedValue({ data: null, error: dbError })
      const result = await auditLogger.queryLogs({});
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to query audit logs:', dbError);
  describe('getUserSecuritySummary', () => {
    it('should generate user security summary', async () => {
      const mockLogs = [
          created_at: new Date()
        },
          event_type: SecurityEventType.LOGIN_FAILED,
          severity: SecurityEventSeverity.MEDIUM,
          event_type: SecurityEventType.MFA_VERIFIED,
        limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null })
      const summary = await auditLogger.getUserSecuritySummary('user123', 30);
      expect(summary).toMatchObject({
        totalEvents: 3,
        loginAttempts: 2,
        failedLogins: 1,
        mfaEvents: 1,
        securityThreats: 0,
        suspiciousActivities: 0
  describe('exportAuditLogs', () => {
    it('should export logs in JSON format', async () => {
          created_at: new Date('2024-01-01')
      const result = await auditLogger.exportAuditLogs(
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        'json'
      expect(result).toBe(JSON.stringify(mockLogs, null, 2));
    it('should export logs in CSV format', async () => {
          ip_address: '192.168.1.1',
          description: 'User logged in',
        'csv'
      expect(result).toContain('ID,Event Type,Severity,User ID,IP Address,Description,Created At');
      expect(result).toContain('"1","login_success","low","user123","192.168.1.1"');
  describe('Security Alert Thresholds', () => {
    beforeEach(() => {
      // Mock the queryLogs method to return recent events for threshold testing
      vi.spyOn(auditLogger, 'queryLogs').mockImplementation(async (query) => {
        if (query.eventType === SecurityEventType.LOGIN_FAILED) {
          return Array(6).fill({
            event_type: SecurityEventType.LOGIN_FAILED,
            user_id: query.userId,
            created_at: new Date()
          });
        return [];
    it('should trigger security alerts when thresholds are exceeded', async () => {
        description: 'Login failed'
      // Should trigger alert for excessive login failures
});
