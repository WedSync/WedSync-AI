/**
 * WS-177 Audit Logging System - Security Alert System Tests
 * Team D - Round 1: Unit tests for real-time security monitoring
 * 
 * Coverage target: >80%
 * Focus: Security pattern detection, real-time alerts, wedding-specific threats
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import {
  SecurityAlertSystem,
  createSecurityAlertSystem,
  SecurityAlertRule,
  AlertNotificationConfig,
  NotificationChannel
} from '../../../src/lib/performance/audit/security-alert-system';
import {
  AuditEvent,
  SecurityAlert,
  SecurityAlertType,
  AuditSeverity,
  AuditEventType,
  AuditAction,
  SupplierRole
} from '../../../src/types/audit-performance';

// Mock Supabase client with realtime support
const mockRealtimeChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  send: jest.fn()
};

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  channel: jest.fn(() => mockRealtimeChannel),
  removeChannel: jest.fn(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn()
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock fetch for webhook notifications
global.fetch = jest.fn();

describe('SecurityAlertSystem', () => {
  let alertSystem: SecurityAlertSystem;
  let testConfig: AlertNotificationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    
    testConfig = {
      channels: [NotificationChannel.DATABASE, NotificationChannel.REALTIME],
      webhookUrls: ['https://test.webhook.com/alerts'],
      emailRecipients: ['admin@wedding.com'],
      weddingCoordinatorEmails: ['coordinator@wedding.com'],
      supplierNotificationEnabled: true,
      clientNotificationThreshold: AuditSeverity.HIGH
    };

    alertSystem = new SecurityAlertSystem(testConfig);
  });

  afterEach(async () => {
    await alertSystem.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize security alert system', () => {
      expect(alertSystem).toBeInstanceOf(SecurityAlertSystem);
      expect(alertSystem).toBeInstanceOf(EventEmitter);
    });

    it('should create system with factory function', () => {
      const factorySystem = createSecurityAlertSystem({
        channels: [NotificationChannel.EMAIL],
        emailRecipients: ['test@example.com']
      });
      expect(factorySystem).toBeInstanceOf(SecurityAlertSystem);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start monitoring successfully', async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null });

      await alertSystem.startMonitoring();

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('security-monitoring');
      expect(mockRealtimeChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'audit_events'
        }),
        expect.any(Function)
      );
      expect(mockRealtimeChannel.subscribe).toHaveBeenCalled();
    });

    it('should handle monitoring startup errors', async () => {
      mockSupabaseClient.channel.mockImplementation(() => {
        throw new Error('Channel creation failed');
      });

      await expect(alertSystem.startMonitoring()).rejects.toThrow('Channel creation failed');
    });

    it('should load existing alerts on startup', async () => {
      const existingAlerts = [
        {
          id: 'alert-1',
          timestamp: '2025-01-20T10:00:00Z',
          alert_type: SecurityAlertType.GUEST_DATA_EXPOSURE,
          severity: AuditSeverity.CRITICAL,
          description: 'Guest data exposed',
          triggered_by: ['event-1'],
          event_ids: ['event-1'],
          pattern: 'guest-exposure-org-123',
          organization_id: 'org-123',
          acknowledged: false,
          resolved: false
        }
      ];

      mockSupabaseClient.select.mockResolvedValue({ data: existingAlerts, error: null });

      await alertSystem.startMonitoring();

      const activeAlerts = await alertSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe('alert-1');
      expect(activeAlerts[0].alertType).toBe(SecurityAlertType.GUEST_DATA_EXPOSURE);
    });
  });

  describe('Security Pattern Detection', () => {
    const createAuditEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
      id: 'event-123',
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.USER_ACTION,
      severity: AuditSeverity.MEDIUM,
      organizationId: 'org-123',
      resource: 'guest_list',
      action: AuditAction.READ,
      metadata: {},
      executionTimeMs: 100,
      ...overrides
    });

    it('should detect guest data exposure immediately', async () => {
      const guestDataEvent = createAuditEvent({
        resource: 'guest_profiles',
        action: AuditAction.EXPORT,
        severity: AuditSeverity.HIGH,
        metadata: { guestsAffected: 50 }
      });

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'alert-1' }], error: null });

      // Simulate processing the event
      await alertSystem['processAuditEvent'](guestDataEvent);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.GUEST_DATA_EXPOSURE,
          severity: AuditSeverity.CRITICAL
        })
      ]);
    });

    it('should detect supplier impersonation attempts', async () => {
      const impersonationEvent = createAuditEvent({
        eventType: AuditEventType.AUTHORIZATION,
        action: AuditAction.UPDATE,
        severity: AuditSeverity.HIGH,
        supplierRole: SupplierRole.WEDDING_PLANNER,
        metadata: { attemptedRoleEscalation: true }
      });

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'alert-2' }], error: null });

      await alertSystem['processAuditEvent'](impersonationEvent);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.SUPPLIER_IMPERSONATION,
          severity: AuditSeverity.HIGH
        })
      ]);
    });

    it('should detect unauthorized wedding access', async () => {
      const unauthorizedEvent = createAuditEvent({
        eventType: AuditEventType.AUTHORIZATION,
        action: AuditAction.READ,
        severity: AuditSeverity.HIGH,
        weddingId: 'wedding-456',
        resource: 'wedding_details'
      });

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'alert-3' }], error: null });

      await alertSystem['processAuditEvent'](unauthorizedEvent);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.UNAUTHORIZED_API_ACCESS,
          severity: AuditSeverity.HIGH
        })
      ]);
    });

    it('should detect bulk data access patterns', async () => {
      const bulkEvents = Array(5).fill(null).map((_, i) => createAuditEvent({
        id: `bulk-event-${i}`,
        action: AuditAction.READ,
        metadata: { guestsAffected: 15 }
      }));

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'bulk-alert' }], error: null });

      // Add events to buffer
      bulkEvents.forEach(event => alertSystem['eventBuffer'].push(event));

      // Trigger batch analysis
      await alertSystem['analyzeBatchPatterns']();

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.BULK_DATA_EXPORT,
          severity: AuditSeverity.HIGH,
          description: expect.stringContaining('Bulk data access pattern detected')
        })
      ]);
    });

    it('should detect multiple failed login attempts', async () => {
      const failedLogins = Array(6).fill(null).map((_, i) => createAuditEvent({
        id: `failed-login-${i}`,
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        severity: AuditSeverity.HIGH, // Failed login
        ipAddress: '192.168.1.100'
      }));

      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'login-alert' }], error: null });

      // Add events to buffer
      failedLogins.forEach(event => alertSystem['eventBuffer'].push(event));

      // Trigger batch analysis
      await alertSystem['analyzeBatchPatterns']();

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
          severity: AuditSeverity.MEDIUM,
          description: expect.stringContaining('Multiple failed login attempts from IP: 192.168.1.100')
        })
      ]);
    });
  });

  describe('Alert Rule Matching', () => {
    const testRule: SecurityAlertRule = {
      id: 'test-rule',
      name: 'Test Security Rule',
      description: 'Test rule for unit tests',
      enabled: true,
      alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
      severity: AuditSeverity.MEDIUM,
      eventTypes: [AuditEventType.AUTHENTICATION],
      actions: [AuditAction.LOGIN],
      timeWindowMinutes: 10,
      thresholdCount: 3,
      weddingDataConditions: {
        protectGuestData: true,
        protectPaymentInfo: false,
        protectVendorInfo: false,
        protectPhotoMetadata: false
      },
      ipWhitelist: ['192.168.1.1'],
      userAgentBlacklist: ['BadBot'],
      notifyImmediately: true,
      autoBlock: false,
      requireAcknowledgment: true
    };

    beforeEach(() => {
      alertSystem['alertRules'].set('test-rule', testRule);
    });

    it('should match events against rules correctly', () => {
      const matchingEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        metadata: { guestsAffected: 1 }
      });

      const matches = alertSystem['matchesRule'](matchingEvent, testRule);
      expect(matches).toBe(true);
    });

    it('should not match events that do not meet rule criteria', () => {
      const nonMatchingEvent = createAuditEvent({
        eventType: AuditEventType.USER_ACTION, // Wrong event type
        action: AuditAction.LOGIN
      });

      const matches = alertSystem['matchesRule'](nonMatchingEvent, testRule);
      expect(matches).toBe(false);
    });

    it('should respect IP whitelist', () => {
      const whitelistedEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        ipAddress: '192.168.1.1' // Whitelisted IP
      });

      const matches = alertSystem['matchesRule'](whitelistedEvent, testRule);
      expect(matches).toBe(false); // Should not trigger alert for whitelisted IP
    });

    it('should detect blacklisted user agents', () => {
      const blacklistedEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        userAgent: 'BadBot/1.0',
        metadata: { guestsAffected: 1 }
      });

      const matches = alertSystem['matchesRule'](blacklistedEvent, testRule);
      expect(matches).toBe(true);
    });

    it('should check wedding data conditions', () => {
      const rule = { 
        ...testRule, 
        weddingDataConditions: { 
          protectGuestData: true, 
          protectPaymentInfo: false, 
          protectVendorInfo: false, 
          protectPhotoMetadata: false 
        } 
      };

      const eventWithGuestData = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        resource: 'guest_profiles'
      });

      const eventWithoutGuestData = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        resource: 'system_settings'
      });

      expect(alertSystem['matchesRule'](eventWithGuestData, rule)).toBe(true);
      expect(alertSystem['matchesRule'](eventWithoutGuestData, rule)).toBe(false);
    });
  });

  describe('Alert Processing and Thresholds', () => {
    it('should process rule thresholds correctly', async () => {
      const rule: SecurityAlertRule = {
        id: 'threshold-rule',
        name: 'Threshold Test Rule',
        description: 'Test threshold processing',
        enabled: true,
        alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: AuditSeverity.MEDIUM,
        eventTypes: [AuditEventType.AUTHENTICATION],
        actions: [AuditAction.LOGIN],
        timeWindowMinutes: 5,
        thresholdCount: 3,
        notifyImmediately: false,
        autoBlock: false,
        requireAcknowledgment: false
      };

      alertSystem['alertRules'].set('threshold-rule', rule);
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'threshold-alert' }], error: null });

      const testEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        organizationId: 'org-123',
        ipAddress: '192.168.1.100'
      });

      // Process events below threshold - should not trigger alert
      await alertSystem['processAlertRule'](testEvent, rule);
      await alertSystem['processAlertRule'](testEvent, rule);
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();

      // Third event should trigger alert
      await alertSystem['processAlertRule'](testEvent, rule);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_type: SecurityAlertType.SUSPICIOUS_LOGIN
        })
      ]);
    });

    it('should reset pattern counters after time window', async () => {
      const rule: SecurityAlertRule = {
        id: 'time-window-rule',
        name: 'Time Window Test Rule',
        description: 'Test time window reset',
        enabled: true,
        alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: AuditSeverity.MEDIUM,
        eventTypes: [AuditEventType.AUTHENTICATION],
        actions: [AuditAction.LOGIN],
        timeWindowMinutes: 0.001, // Very short window for testing
        thresholdCount: 2,
        notifyImmediately: false,
        autoBlock: false,
        requireAcknowledgment: false
      };

      alertSystem['alertRules'].set('time-window-rule', rule);

      const testEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        organizationId: 'org-123',
        ipAddress: '192.168.1.100'
      });

      // First event
      await alertSystem['processAlertRule'](testEvent, rule);

      // Wait for time window to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second event should reset counter due to expired time window
      await alertSystem['processAlertRule'](testEvent, rule);

      // Pattern should be reset, so we should have count of 1, not 2
      const patternKey = `time-window-rule-org-123-192.168.1.100`;
      const pattern = alertSystem['suspiciousPatterns'].get(patternKey);
      expect(pattern?.count).toBe(1);
    });

    it('should auto-block threats when configured', async () => {
      const autoBlockRule: SecurityAlertRule = {
        id: 'auto-block-rule',
        name: 'Auto Block Rule',
        description: 'Test auto-blocking',
        enabled: true,
        alertType: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
        severity: AuditSeverity.HIGH,
        eventTypes: [AuditEventType.AUTHENTICATION],
        actions: [AuditAction.LOGIN],
        timeWindowMinutes: 10,
        thresholdCount: 1,
        notifyImmediately: true,
        autoBlock: true,
        requireAcknowledgment: true
      };

      alertSystem['alertRules'].set('auto-block-rule', autoBlockRule);
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'auto-block-alert' }], error: null });

      const testEvent = createAuditEvent({
        eventType: AuditEventType.AUTHENTICATION,
        action: AuditAction.LOGIN,
        ipAddress: '192.168.1.100',
        userId: 'user-123'
      });

      await alertSystem['processAlertRule'](testEvent, autoBlockRule);

      // IP should be blocked
      expect(alertSystem.isBlocked('192.168.1.100')).toBe(true);
    });
  });

  describe('Alert Notifications', () => {
    let mockAlert: SecurityAlert;

    beforeEach(() => {
      mockAlert = {
        id: 'test-alert',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.GUEST_DATA_EXPOSURE,
        severity: AuditSeverity.CRITICAL,
        description: 'Test alert for notifications',
        triggeredBy: ['event-123'],
        eventIds: ['event-123'],
        pattern: 'test-pattern',
        organizationId: 'org-123',
        acknowledged: false,
        resolved: false,
        guestDataExposed: true
      };
    });

    it('should send database notifications', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: [{ id: 'notification-1' }], error: null });

      await alertSystem['sendNotifications'](mockAlert);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('security_notifications');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          alert_id: 'test-alert',
          message: expect.stringContaining('Security Alert'),
          severity: AuditSeverity.CRITICAL
        })
      ]);
    });

    it('should send realtime notifications', async () => {
      await alertSystem['sendNotifications'](mockAlert);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('security-alerts');
      expect(mockRealtimeChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'security_alert',
        payload: mockAlert
      });
    });

    it('should send webhook notifications', async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      await alertSystem['sendNotifications'](mockAlert);

      expect(fetch).toHaveBeenCalledWith('https://test.webhook.com/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"alert_id":"test-alert"')
      });
    });

    it('should handle webhook notification failures gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw error
      await expect(alertSystem['sendNotifications'](mockAlert)).resolves.not.toThrow();
    });

    it('should emit events for real-time listeners', async () => {
      const eventListener = jest.fn();
      alertSystem.on('securityAlert', eventListener);

      await alertSystem['handleSecurityAlert'](mockAlert);

      expect(eventListener).toHaveBeenCalledWith(mockAlert);
    });
  });

  describe('Critical Alert Handling', () => {
    it('should handle critical alerts with immediate response', async () => {
      const criticalAlert: SecurityAlert = {
        id: 'critical-alert',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.GUEST_DATA_EXPOSURE,
        severity: AuditSeverity.CRITICAL,
        description: 'Critical guest data exposure',
        triggeredBy: ['event-123'],
        eventIds: ['event-123'],
        pattern: 'critical-pattern',
        organizationId: 'org-123',
        ipAddress: '192.168.1.100',
        userId: 'user-123',
        acknowledged: false,
        resolved: false,
        guestDataExposed: true
      };

      await alertSystem['handleCriticalAlert'](criticalAlert);

      // IP should be blocked for guest data exposure
      expect(alertSystem.isBlocked('192.168.1.100')).toBe(true);
    });

    it('should block users for supplier impersonation', async () => {
      const impersonationAlert: SecurityAlert = {
        id: 'impersonation-alert',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.SUPPLIER_IMPERSONATION,
        severity: AuditSeverity.CRITICAL,
        description: 'Supplier impersonation detected',
        triggeredBy: ['event-123'],
        eventIds: ['event-123'],
        pattern: 'impersonation-pattern',
        organizationId: 'org-123',
        userId: 'user-123',
        acknowledged: false,
        resolved: false,
        guestDataExposed: false
      };

      await alertSystem['handleCriticalAlert'](impersonationAlert);

      // User should be blocked for impersonation
      expect(alertSystem.isBlocked(undefined, 'user-123')).toBe(true);
    });
  });

  describe('Alert Management', () => {
    it('should acknowledge alerts', async () => {
      const alert: SecurityAlert = {
        id: 'ack-alert',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: AuditSeverity.MEDIUM,
        description: 'Test acknowledgment',
        triggeredBy: ['event-123'],
        eventIds: ['event-123'],
        pattern: 'ack-pattern',
        organizationId: 'org-123',
        acknowledged: false,
        resolved: false
      };

      alertSystem['activeAlerts'].set('ack-alert', alert);
      mockSupabaseClient.update.mockResolvedValue({ data: [{ id: 'ack-alert' }], error: null });

      await alertSystem.acknowledgeAlert('ack-alert', 'admin-user');

      expect(alert.acknowledged).toBe(true);
      expect(alert.acknowledgedBy).toBe('admin-user');
      expect(alert.acknowledgedAt).toBeDefined();
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        acknowledged: true,
        acknowledged_by: 'admin-user',
        acknowledged_at: expect.any(String)
      });
    });

    it('should resolve alerts', async () => {
      const alert: SecurityAlert = {
        id: 'resolve-alert',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: AuditSeverity.MEDIUM,
        description: 'Test resolution',
        triggeredBy: ['event-123'],
        eventIds: ['event-123'],
        pattern: 'resolve-pattern',
        organizationId: 'org-123',
        acknowledged: false,
        resolved: false
      };

      alertSystem['activeAlerts'].set('resolve-alert', alert);
      mockSupabaseClient.update.mockResolvedValue({ data: [{ id: 'resolve-alert' }], error: null });

      await alertSystem.resolveAlert('resolve-alert', 'admin-user');

      expect(alert.resolved).toBe(true);
      expect(alert.resolvedBy).toBe('admin-user');
      expect(alert.resolvedAt).toBeDefined();
      expect(alertSystem['activeAlerts'].has('resolve-alert')).toBe(false);
    });

    it('should get active alerts', async () => {
      const alert1: SecurityAlert = {
        id: 'active-1',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.SUSPICIOUS_LOGIN,
        severity: AuditSeverity.MEDIUM,
        description: 'Active alert 1',
        triggeredBy: ['event-1'],
        eventIds: ['event-1'],
        pattern: 'pattern-1',
        organizationId: 'org-123',
        acknowledged: false,
        resolved: false
      };

      const alert2: SecurityAlert = {
        id: 'active-2',
        timestamp: new Date().toISOString(),
        alertType: SecurityAlertType.GUEST_DATA_EXPOSURE,
        severity: AuditSeverity.HIGH,
        description: 'Active alert 2',
        triggeredBy: ['event-2'],
        eventIds: ['event-2'],
        pattern: 'pattern-2',
        organizationId: 'org-123',
        acknowledged: false,
        resolved: false
      };

      alertSystem['activeAlerts'].set('active-1', alert1);
      alertSystem['activeAlerts'].set('active-2', alert2);

      const activeAlerts = await alertSystem.getActiveAlerts();

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts.map(a => a.id)).toContain('active-1');
      expect(activeAlerts.map(a => a.id)).toContain('active-2');
    });
  });

  describe('Helper Methods', () => {
    it('should detect guest data involvement correctly', () => {
      const guestEvent = createAuditEvent({
        resource: 'guest_profiles',
        metadata: { guestsAffected: 10 }
      });

      const nonGuestEvent = createAuditEvent({
        resource: 'system_settings',
        metadata: {}
      });

      expect(alertSystem['isGuestDataExposure'](guestEvent)).toBe(true);
      expect(alertSystem['isGuestDataExposure'](nonGuestEvent)).toBe(false);
    });

    it('should group events by IP correctly', () => {
      const events = [
        createAuditEvent({ id: 'event-1', ipAddress: '192.168.1.1' }),
        createAuditEvent({ id: 'event-2', ipAddress: '192.168.1.1' }),
        createAuditEvent({ id: 'event-3', ipAddress: '192.168.1.2' }),
        createAuditEvent({ id: 'event-4', ipAddress: undefined })
      ];

      const groupedByIP = alertSystem['groupByIP'](events);

      expect(groupedByIP.get('192.168.1.1')).toHaveLength(2);
      expect(groupedByIP.get('192.168.1.2')).toHaveLength(1);
      expect(groupedByIP.get('unknown')).toHaveLength(1);
    });

    it('should check blocking status correctly', () => {
      alertSystem['blockedIPs'].add('192.168.1.100');
      alertSystem['blockedUsers'].add('user-123');

      expect(alertSystem.isBlocked('192.168.1.100')).toBe(true);
      expect(alertSystem.isBlocked(undefined, 'user-123')).toBe(true);
      expect(alertSystem.isBlocked('192.168.1.200')).toBe(false);
      expect(alertSystem.isBlocked(undefined, 'user-456')).toBe(false);
      expect(alertSystem.isBlocked()).toBe(false);
    });
  });

  describe('Default Security Rules', () => {
    it('should load default security rules on initialization', () => {
      const rules = Array.from(alertSystem['alertRules'].values());

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'failed-login-attempts')).toBe(true);
      expect(rules.some(rule => rule.id === 'guest-data-exposure')).toBe(true);
      expect(rules.some(rule => rule.id === 'bulk-data-export')).toBe(true);
      expect(rules.some(rule => rule.id === 'supplier-impersonation')).toBe(true);
    });

    it('should have appropriate thresholds for wedding-specific rules', () => {
      const guestDataRule = alertSystem['alertRules'].get('guest-data-exposure');
      const supplierRule = alertSystem['alertRules'].get('supplier-impersonation');

      expect(guestDataRule?.severity).toBe(AuditSeverity.CRITICAL);
      expect(guestDataRule?.thresholdCount).toBe(1); // Immediate alert
      expect(guestDataRule?.autoBlock).toBe(true);

      expect(supplierRule?.severity).toBe(AuditSeverity.HIGH);
      expect(supplierRule?.weddingDataConditions?.protectVendorInfo).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const testEvent = createAuditEvent({
        severity: AuditSeverity.CRITICAL,
        metadata: { guestsAffected: 50 }
      });

      // Should not throw error
      await expect(alertSystem['processAuditEvent'](testEvent)).resolves.not.toThrow();
    });

    it('should handle alert acknowledgment errors', async () => {
      mockSupabaseClient.update.mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      await expect(alertSystem.acknowledgeAlert('non-existent', 'admin')).rejects.toThrow('Failed to update retention policy'); // Using the error from the implementation
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await alertSystem.startMonitoring();
      
      await alertSystem.shutdown();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
      expect(alertSystem['alertRules'].size).toBe(0);
      expect(alertSystem['activeAlerts'].size).toBe(0);
      expect(alertSystem.listenerCount('securityAlert')).toBe(0);
    });
  });
});

describe('Factory Functions', () => {
  it('should create security alert system with default configuration', () => {
    const system = createSecurityAlertSystem();
    expect(system).toBeInstanceOf(SecurityAlertSystem);
  });

  it('should create security alert system with custom configuration', () => {
    const customConfig = {
      channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
      emailRecipients: ['security@wedding.com'],
      slackWebhookUrl: 'https://hooks.slack.com/services/test'
    };

    const system = createSecurityAlertSystem(customConfig);
    expect(system).toBeInstanceOf(SecurityAlertSystem);
  });

  it('should export singleton instance', async () => {
    const { securityAlertSystem } = await import('../../../src/lib/performance/audit/security-alert-system');
    expect(securityAlertSystem).toBeInstanceOf(SecurityAlertSystem);
  });
});

// Helper function for creating audit events
function createAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'event-123',
    timestamp: new Date().toISOString(),
    eventType: AuditEventType.USER_ACTION,
    severity: AuditSeverity.MEDIUM,
    organizationId: 'org-123',
    resource: 'test_resource',
    action: AuditAction.READ,
    metadata: {},
    executionTimeMs: 100,
    ...overrides
  };
}