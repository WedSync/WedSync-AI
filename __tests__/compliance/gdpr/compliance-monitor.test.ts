/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Unit tests for GDPR Compliance Monitor
 * 
 * @fileoverview Comprehensive test suite for the real-time GDPR compliance 
 * monitoring system with >80% coverage requirement
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { GDPRComplianceMonitor } from '../../../src/lib/compliance/gdpr/compliance-monitor';
import { ComplianceIssue, ComplianceEvent, ComplianceStatus } from '../../../src/types/gdpr-compliance';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  }))
}));

// Mock audit logger
vi.mock('../../../src/lib/middleware/audit', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('GDPRComplianceMonitor', () => {
  let monitor: GDPRComplianceMonitor;
  let mockSupabase: any;

  beforeEach(() => {
    monitor = (GDPRComplianceMonitor as any).getInstance();
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }))
    };

    // Reset singleton instance for testing
    (GDPRComplianceMonitor as any).instance = null;
    monitor = (GDPRComplianceMonitor as any).getInstance();
    (monitor as any).supabase = mockSupabase;
  });

  afterEach(async () => {
    await monitor.stopMonitoring();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance when called multiple times', () => {
      const monitor1 = (GDPRComplianceMonitor as any).getInstance();
      const monitor2 = (GDPRComplianceMonitor as any).getInstance();
      expect(monitor1).toBe(monitor2);
    });

    test('should initialize with default monitors', () => {
      const activeMonitors = monitor.getActiveMonitors();
      expect(activeMonitors.length).toBeGreaterThan(0);
      expect(activeMonitors.some(m => m.type === 'consent_expiry')).toBe(true);
      expect(activeMonitors.some(m => m.type === 'retention_compliance')).toBe(true);
      expect(activeMonitors.some(m => m.type === 'breach_indicators')).toBe(true);
    });
  });

  describe('Monitoring Lifecycle', () => {
    test('should start monitoring successfully', async () => {
      await expect(monitor.startMonitoring()).resolves.not.toThrow();
    });

    test('should throw error when starting already running monitor', async () => {
      await monitor.startMonitoring();
      await expect(monitor.startMonitoring()).rejects.toThrow('Monitoring is already running');
    });

    test('should stop monitoring successfully', async () => {
      await monitor.startMonitoring();
      await expect(monitor.stopMonitoring()).resolves.not.toThrow();
    });

    test('should not throw when stopping already stopped monitor', async () => {
      await expect(monitor.stopMonitoring()).resolves.not.toThrow();
    });
  });

  describe('Compliance Status', () => {
    test('should get compliance status for global jurisdiction', async () => {
      // Mock database responses
      const mockIssues = [
        { id: '1', type: 'consent_expired', severity: 'high', affected_data_subjects: 5 }
      ];
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockIssues, error: null })
      });

      const status = await monitor.getComplianceStatus();
      
      expect(status).toBeDefined();
      expect(status.compliant).toBeDefined();
      expect(status.score).toBeGreaterThanOrEqual(0);
      expect(status.score).toBeLessThanOrEqual(100);
      expect(status.issues).toBeDefined();
      expect(status.lastChecked).toBeInstanceOf(Date);
      expect(status.nextReviewDate).toBeInstanceOf(Date);
    });

    test('should get compliance status for specific jurisdiction', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      const status = await monitor.getComplianceStatus('EU');
      expect(status).toBeDefined();
      expect(status.compliant).toBe(true); // No issues means compliant
      expect(status.score).toBe(100); // Perfect score with no issues
    });
  });

  describe('Compliance Event Recording', () => {
    test('should record compliance event successfully', async () => {
      const eventId = crypto.randomUUID();
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: eventId }], error: null })
      });

      const eventData = {
        type: 'data_collected' as const,
        userId: 'user-123',
        dataType: 'contact_info' as const,
        jurisdiction: 'EU' as const,
        legalBasis: 'consent' as const,
        metadata: { source: 'registration_form' }
      };

      const recordedEventId = await monitor.recordComplianceEvent(eventData);
      expect(recordedEventId).toBeDefined();
      expect(typeof recordedEventId).toBe('string');
    });

    test('should handle database error when recording event', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        })
      });

      const eventData = {
        type: 'data_collected' as const,
        dataType: 'contact_info' as const,
        jurisdiction: 'EU' as const,
        legalBasis: 'consent' as const,
        metadata: {}
      };

      await expect(monitor.recordComplianceEvent(eventData))
        .rejects.toThrow('Failed to record compliance event');
    });
  });

  describe('Monitor Management', () => {
    test('should add custom monitor', () => {
      const customMonitor = {
        id: 'custom-test-monitor',
        name: 'Test Monitor',
        description: 'Testing custom monitor',
        type: 'consent_expiry' as const,
        jurisdiction: 'EU' as const,
        schedule: {
          frequency: 'daily' as const,
          times: ['09:00'],
          timezone: 'UTC'
        },
        thresholds: [],
        isActive: true
      };

      monitor.addMonitor(customMonitor);
      const activeMonitors = monitor.getActiveMonitors();
      const addedMonitor = activeMonitors.find(m => m.id === 'custom-test-monitor');
      
      expect(addedMonitor).toBeDefined();
      expect(addedMonitor?.name).toBe('Test Monitor');
    });

    test('should remove monitor', () => {
      const customMonitor = {
        id: 'removable-monitor',
        name: 'Removable Monitor',
        description: 'Testing monitor removal',
        type: 'retention_compliance' as const,
        jurisdiction: 'EU' as const,
        schedule: {
          frequency: 'hourly' as const,
          timezone: 'UTC'
        },
        thresholds: [],
        isActive: true
      };

      monitor.addMonitor(customMonitor);
      const removed = monitor.removeMonitor('removable-monitor');
      
      expect(removed).toBe(true);
      
      const activeMonitors = monitor.getActiveMonitors();
      const removedMonitor = activeMonitors.find(m => m.id === 'removable-monitor');
      expect(removedMonitor).toBeUndefined();
    });

    test('should return false when removing non-existent monitor', () => {
      const removed = monitor.removeMonitor('non-existent-monitor');
      expect(removed).toBe(false);
    });
  });

  describe('Consent Expiry Monitoring', () => {
    test('should check consent expiry and find no issues', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      const issues = await monitor.checkConsentExpiry();
      expect(issues).toHaveLength(0);
    });

    test('should check consent expiry and find expired consents', async () => {
      const expiredConsents = [
        { user_id: 'user1', consent_type: 'marketing', expires_at: '2023-01-01', jurisdiction: 'EU' },
        { user_id: 'user2', consent_type: 'analytics', expires_at: '2023-01-01', jurisdiction: 'EU' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: expiredConsents, error: null })
      });

      const issues = await monitor.checkConsentExpiry('EU');
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('consent_expired');
      expect(issues[0].severity).toBe('high');
      expect(issues[0].affectedDataSubjects).toBe(2);
    });

    test('should handle database error during consent expiry check', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      });

      await expect(monitor.checkConsentExpiry())
        .rejects.toThrow('Failed to check consent expiry');
    });
  });

  describe('Retention Compliance Monitoring', () => {
    test('should check retention compliance with no violations', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      const issues = await monitor.checkRetentionCompliance();
      expect(issues).toHaveLength(0);
    });

    test('should detect retention violations', async () => {
      const overdueData = [
        { user_id: 'user1', data_type: 'contact_info', scheduled_deletion_date: '2023-01-01', jurisdiction: 'EU' },
        { user_id: 'user1', data_type: 'behavioral', scheduled_deletion_date: '2023-01-01', jurisdiction: 'EU' },
        { user_id: 'user2', data_type: 'contact_info', scheduled_deletion_date: '2023-01-01', jurisdiction: 'EU' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: overdueData, error: null })
      });

      const issues = await monitor.checkRetentionCompliance('EU');
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('retention_violation');
      expect(issues[0].affectedDataSubjects).toBe(2); // Unique users
    });

    test('should set critical severity for large retention violations', async () => {
      const largeOverdueData = Array.from({ length: 15 }, (_, i) => ({
        user_id: `user${i}`,
        data_type: 'contact_info',
        scheduled_deletion_date: '2023-01-01',
        jurisdiction: 'EU'
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: largeOverdueData, error: null })
      });

      const issues = await monitor.checkRetentionCompliance('EU');
      expect(issues[0].severity).toBe('critical');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty database responses gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      const status = await monitor.getComplianceStatus();
      expect(status.issues).toEqual([]);
    });

    test('should handle invalid jurisdiction gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      // Should not throw error for unknown jurisdiction
      const status = await monitor.getComplianceStatus('INVALID' as any);
      expect(status).toBeDefined();
    });

    test('should calculate compliance score correctly with mixed severity issues', async () => {
      const mixedIssues = [
        { id: '1', type: 'consent_expired', severity: 'critical' },
        { id: '2', type: 'retention_violation', severity: 'high' },
        { id: '3', type: 'unauthorized_access', severity: 'medium' },
        { id: '4', type: 'missing_legal_basis', severity: 'low' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mixedIssues, error: null })
      });

      const status = await monitor.getComplianceStatus();
      expect(status.compliant).toBe(false); // Should be false due to critical issue
      expect(status.score).toBeLessThan(100);
    });
  });

  describe('Real-time Event Analysis', () => {
    test('should analyze compliance events for suspicious patterns', async () => {
      // Mock recent access events to simulate rapid access pattern
      const recentAccesses = Array.from({ length: 60 }, (_, i) => ({
        id: `access-${i}`,
        user_id: 'user-123',
        type: 'data_accessed',
        timestamp: new Date(Date.now() - (i * 1000)).toISOString()
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: recentAccesses, error: null }),
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'issue-1' }], error: null })
      });

      // This would be called internally by the event analysis
      const eventData = {
        type: 'data_accessed' as const,
        userId: 'user-123',
        dataType: 'contact_info' as const,
        jurisdiction: 'EU' as const,
        legalBasis: 'consent' as const,
        metadata: {}
      };

      const eventId = await monitor.recordComplianceEvent(eventData);
      expect(eventId).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large number of compliance events efficiently', async () => {
      const startTime = Date.now();
      
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
      });

      // Record multiple events
      const promises = Array.from({ length: 100 }, (_, i) => 
        monitor.recordComplianceEvent({
          type: 'data_accessed',
          userId: `user-${i}`,
          dataType: 'contact_info',
          jurisdiction: 'EU',
          legalBasis: 'consent',
          metadata: { batch: 'performance-test' }
        })
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});