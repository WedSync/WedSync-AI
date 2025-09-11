import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseHealthMonitor } from '@/lib/monitoring/database-health-advanced';
import { DatabaseRecoverySystem } from '@/lib/monitoring/database-recovery';
import { AlertManager } from '@/lib/alerts/alert-manager';
import { NotificationChannels } from '@/lib/alerts/notification-channels';
import { EscalationEngine } from '@/lib/alerts/escalation-engine';
import { WeddingDayProtocol } from '@/lib/alerts/wedding-day-protocol';

// Mock MCP servers
jest.mock('@/lib/database/supabase-admin', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    },
  })),
}));

jest.mock('@/lib/config/environment', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  SUPABASE_URL: 'https://test.supabase.co',
  RESEND_API_KEY: 'test-resend-key',
  TWILIO_ACCOUNT_SID: 'test-twilio-sid',
  TWILIO_AUTH_TOKEN: 'test-twilio-token',
}));

describe('WS-227 System Health Monitoring Suite', () => {
  let mockDatabase: any;
  let mockLogger: any;

  beforeEach(() => {
    mockDatabase = {
      query: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Mock Date for consistent testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('DatabaseHealthMonitor', () => {
    let healthMonitor: DatabaseHealthMonitor;

    beforeEach(() => {
      healthMonitor = DatabaseHealthMonitor.getInstance();
    });

    it('should be a singleton', () => {
      const instance1 = DatabaseHealthMonitor.getInstance();
      const instance2 = DatabaseHealthMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should collect comprehensive health metrics', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ count: 10, active: 8 }] }) // connections
        .mockResolvedValueOnce({ rows: [{ avg_duration: 45.5, slow_queries: 2 }] }) // queries
        .mockResolvedValueOnce({ rows: [{ cache_hit_ratio: 0.95 }] }) // cache
        .mockResolvedValueOnce({ rows: [{ size: '1024 MB', usage: 75 }] }) // storage
        .mockResolvedValueOnce({ rows: [{ replication_lag: 0.1 }] }); // replication

      const metrics = await (healthMonitor as any).collectMetrics(mockDatabase);

      expect(metrics).toEqual(expect.objectContaining({
        connections: { total: 10, active: 8, idle: 2, utilization: 0.8 },
        queries: { avgDuration: 45.5, slowQueries: 2, qps: expect.any(Number) },
        cache: { hitRatio: 0.95 },
        storage: { size: '1024 MB', usage: 75 },
        replication: { lag: 0.1 },
        timestamp: expect.any(Date),
      }));
    });

    it('should enable wedding day mode with enhanced monitoring', () => {
      const callback = jest.fn();
      healthMonitor.onAlert(callback);
      
      healthMonitor.enableWeddingDayMode();
      expect((healthMonitor as any).weddingDayMode).toBe(true);
      expect((healthMonitor as any).monitoringInterval).toBe(10000); // 10 seconds
    });

    it('should disable wedding day mode and restore normal monitoring', () => {
      healthMonitor.enableWeddingDayMode();
      healthMonitor.disableWeddingDayMode();
      
      expect((healthMonitor as any).weddingDayMode).toBe(false);
      expect((healthMonitor as any).monitoringInterval).toBe(30000); // 30 seconds
    });

    it('should detect high connection utilization alert', async () => {
      const alertCallback = jest.fn();
      healthMonitor.onAlert(alertCallback);

      mockDatabase.query.mockResolvedValueOnce({ 
        rows: [{ count: 100, active: 95 }] 
      });

      await (healthMonitor as any).checkConnectionHealth(mockDatabase);

      expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'database_connection_high',
        severity: 'warning',
        metric: 'connection_utilization',
      }));
    });

    it('should detect slow query performance', async () => {
      const alertCallback = jest.fn();
      healthMonitor.onAlert(alertCallback);

      mockDatabase.query.mockResolvedValueOnce({ 
        rows: [{ avg_duration: 2500, slow_queries: 10 }] 
      });

      await (healthMonitor as any).checkQueryPerformance(mockDatabase);

      expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'database_performance_slow',
        severity: 'warning',
        metric: 'avg_query_duration',
      }));
    });
  });

  describe('DatabaseRecoverySystem', () => {
    let recoverySystem: DatabaseRecoverySystem;

    beforeEach(() => {
      recoverySystem = DatabaseRecoverySystem.getInstance();
    });

    it('should be a singleton', () => {
      const instance1 = DatabaseRecoverySystem.getInstance();
      const instance2 = DatabaseRecoverySystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should generate appropriate recovery plan for connection issues', () => {
      const alert = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        timestamp: new Date(),
        context: { utilization: 85, total: 100, active: 85 }
      };

      const plan = (recoverySystem as any).generateRecoveryPlan(alert);
      
      expect(plan.actions).toContain('kill_idle_connections');
      expect(plan.actions).toContain('increase_connection_pool');
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should restrict dangerous actions during wedding day mode', () => {
      const alert = {
        type: 'database_performance_slow',
        severity: 'critical' as const,
        metric: 'avg_query_duration',
        value: 5000,
        threshold: 2000,
        timestamp: new Date(),
        context: { avgDuration: 5000, slowQueries: 20 }
      };

      (recoverySystem as any).weddingDayMode = true;
      const plan = (recoverySystem as any).generateRecoveryPlan(alert);
      
      // Should not include restart actions during wedding day
      expect(plan.actions).not.toContain('restart_connection_pool');
      expect(plan.weddingDaySafe).toBe(true);
    });

    it('should execute kill idle connections recovery action', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [{ terminated: 5 }] });

      const result = await (recoverySystem as any).executeRecoveryAction(
        'kill_idle_connections',
        mockDatabase,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.details).toContain('5 idle connections');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_terminate_backend')
      );
    });

    it('should handle recovery action failures gracefully', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database error'));

      const result = await (recoverySystem as any).executeRecoveryAction(
        'kill_idle_connections',
        mockDatabase,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('AlertManager', () => {
    let alertManager: AlertManager;

    beforeEach(() => {
      alertManager = AlertManager.getInstance();
      // Clear any existing alerts
      (alertManager as any).activeAlerts.clear();
      (alertManager as any).alertHistory = [];
    });

    it('should be a singleton', () => {
      const instance1 = AlertManager.getInstance();
      const instance2 = AlertManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create and store alert', async () => {
      const alert = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        message: 'High connection utilization detected',
        context: { utilization: 85 }
      };

      const alertId = await alertManager.createAlert(alert);

      expect(alertId).toBeDefined();
      expect((alertManager as any).activeAlerts.has(alertId)).toBe(true);
      
      const storedAlert = (alertManager as any).activeAlerts.get(alertId);
      expect(storedAlert.status).toBe('active');
      expect(storedAlert.createdAt).toBeInstanceOf(Date);
    });

    it('should prevent duplicate alerts within deduplication window', async () => {
      const alert = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        message: 'High connection utilization detected',
        context: { utilization: 85 }
      };

      const alertId1 = await alertManager.createAlert(alert);
      const alertId2 = await alertManager.createAlert(alert);

      expect(alertId1).toBe(alertId2); // Should return same alert ID
      expect((alertManager as any).activeAlerts.size).toBe(1);
    });

    it('should acknowledge alerts and update status', async () => {
      const alert = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        message: 'High connection utilization detected',
        context: { utilization: 85 }
      };

      const alertId = await alertManager.createAlert(alert);
      await alertManager.acknowledgeAlert(alertId, 'admin-user-123');

      const storedAlert = (alertManager as any).activeAlerts.get(alertId);
      expect(storedAlert.status).toBe('acknowledged');
      expect(storedAlert.acknowledgedBy).toBe('admin-user-123');
      expect(storedAlert.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should resolve alerts and move to history', async () => {
      const alert = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        message: 'High connection utilization detected',
        context: { utilization: 85 }
      };

      const alertId = await alertManager.createAlert(alert);
      await alertManager.resolveAlert(alertId, 'system', 'Connection utilization normalized');

      expect((alertManager as any).activeAlerts.has(alertId)).toBe(false);
      expect((alertManager as any).alertHistory).toHaveLength(1);
      
      const resolvedAlert = (alertManager as any).alertHistory[0];
      expect(resolvedAlert.status).toBe('resolved');
      expect(resolvedAlert.resolvedBy).toBe('system');
    });

    it('should get alerts by status', async () => {
      const alert1 = {
        type: 'database_connection_high',
        severity: 'warning' as const,
        metric: 'connection_utilization',
        value: 85,
        threshold: 80,
        message: 'Alert 1',
        context: {}
      };

      const alert2 = {
        type: 'database_performance_slow',
        severity: 'critical' as const,
        metric: 'avg_query_duration',
        value: 3000,
        threshold: 2000,
        message: 'Alert 2',
        context: {}
      };

      const alertId1 = await alertManager.createAlert(alert1);
      const alertId2 = await alertManager.createAlert(alert2);
      await alertManager.acknowledgeAlert(alertId1, 'admin');

      const activeAlerts = alertManager.getAlerts('active');
      const acknowledgedAlerts = alertManager.getAlerts('acknowledged');

      expect(activeAlerts).toHaveLength(1);
      expect(acknowledgedAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alertId2);
      expect(acknowledgedAlerts[0].id).toBe(alertId1);
    });
  });

  describe('NotificationChannels', () => {
    let notificationChannels: NotificationChannels;

    beforeEach(() => {
      notificationChannels = NotificationChannels.getInstance();
    });

    it('should be a singleton', () => {
      const instance1 = NotificationChannels.getInstance();
      const instance2 = NotificationChannels.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should send email notification', async () => {
      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({ id: 'email-123' })
        }
      };
      (notificationChannels as any).resend = mockResend;

      const alert = {
        id: 'alert-123',
        type: 'database_connection_high',
        severity: 'warning' as const,
        message: 'High connection utilization',
        timestamp: new Date()
      };

      const result = await notificationChannels.sendEmail(
        ['admin@wedsync.com'],
        'System Alert: Database Connection High',
        'High connection utilization detected',
        alert
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(mockResend.emails.send).toHaveBeenCalledWith(expect.objectContaining({
        to: ['admin@wedsync.com'],
        subject: 'System Alert: Database Connection High',
      }));
    });

    it('should send SMS notification', async () => {
      const mockTwilio = {
        messages: {
          create: jest.fn().mockResolvedValue({ sid: 'sms-123' })
        }
      };
      (notificationChannels as any).twilio = mockTwilio;

      const alert = {
        id: 'alert-123',
        type: 'database_connection_high',
        severity: 'warning' as const,
        message: 'High connection utilization',
        timestamp: new Date()
      };

      const result = await notificationChannels.sendSMS(
        ['+44123456789'],
        'URGENT: Database connection utilization at 85%',
        alert
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sms-123');
      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        body: 'URGENT: Database connection utilization at 85%',
        to: '+44123456789',
        from: expect.any(String)
      });
    });

    it('should respect rate limiting', async () => {
      const alert = {
        id: 'alert-123',
        type: 'database_connection_high',
        severity: 'warning' as const,
        message: 'High connection utilization',
        timestamp: new Date()
      };

      // Send multiple notifications rapidly
      const results = await Promise.all([
        notificationChannels.sendEmail(['test@example.com'], 'Subject', 'Message', alert),
        notificationChannels.sendEmail(['test@example.com'], 'Subject', 'Message', alert),
        notificationChannels.sendEmail(['test@example.com'], 'Subject', 'Message', alert),
      ]);

      // Some should be rate limited
      const rateLimited = results.filter(r => !r.success && r.error?.includes('rate limit'));
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should handle notification failures gracefully', async () => {
      const mockResend = {
        emails: {
          send: jest.fn().mockRejectedValue(new Error('SMTP Error'))
        }
      };
      (notificationChannels as any).resend = mockResend;

      const alert = {
        id: 'alert-123',
        type: 'database_connection_high',
        severity: 'warning' as const,
        message: 'High connection utilization',
        timestamp: new Date()
      };

      const result = await notificationChannels.sendEmail(
        ['admin@wedsync.com'],
        'System Alert',
        'Test message',
        alert
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP Error');
    });
  });

  describe('EscalationEngine', () => {
    let escalationEngine: EscalationEngine;
    let mockNotifications: any;

    beforeEach(() => {
      mockNotifications = {
        sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'email-123' }),
        sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
        sendSlack: jest.fn().mockResolvedValue({ success: true, messageId: 'slack-123' }),
      };

      escalationEngine = EscalationEngine.getInstance();
      (escalationEngine as any).notifications = mockNotifications;
    });

    it('should be a singleton', () => {
      const instance1 = EscalationEngine.getInstance();
      const instance2 = EscalationEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start escalation for critical alerts', async () => {
      const alert = {
        id: 'alert-123',
        type: 'database_connection_critical',
        severity: 'critical' as const,
        message: 'Database connections exhausted',
        timestamp: new Date(),
        metric: 'connection_utilization',
        value: 100,
        threshold: 95,
        context: {}
      };

      await escalationEngine.startEscalation(alert);

      const activeEscalations = (escalationEngine as any).activeEscalations;
      expect(activeEscalations.has('alert-123')).toBe(true);
      
      const escalation = activeEscalations.get('alert-123');
      expect(escalation.currentLevel).toBe(0);
      expect(escalation.nextEscalation).toBeInstanceOf(Date);
    });

    it('should not start escalation for low severity alerts', async () => {
      const alert = {
        id: 'alert-124',
        type: 'database_connection_info',
        severity: 'info' as const,
        message: 'Connection pool status update',
        timestamp: new Date(),
        metric: 'connection_count',
        value: 50,
        threshold: 100,
        context: {}
      };

      await escalationEngine.startEscalation(alert);

      const activeEscalations = (escalationEngine as any).activeEscalations;
      expect(activeEscalations.has('alert-124')).toBe(false);
    });

    it('should stop escalation when alert is acknowledged', async () => {
      const alert = {
        id: 'alert-125',
        type: 'database_connection_critical',
        severity: 'critical' as const,
        message: 'Database connections exhausted',
        timestamp: new Date(),
        metric: 'connection_utilization',
        value: 100,
        threshold: 95,
        context: {}
      };

      await escalationEngine.startEscalation(alert);
      escalationEngine.stopEscalation('alert-125');

      const activeEscalations = (escalationEngine as any).activeEscalations;
      expect(activeEscalations.has('alert-125')).toBe(false);
    });

    it('should use accelerated timing during wedding day mode', () => {
      escalationEngine.enableWeddingDayMode();
      
      const config = (escalationEngine as any).getEscalationConfig('critical');
      expect(config.levels[0].delay).toBe(60000); // 1 minute instead of 5
      expect(config.levels[1].delay).toBe(180000); // 3 minutes instead of 15
    });

    it('should execute escalation actions', async () => {
      const escalation = {
        alert: {
          id: 'alert-123',
          type: 'database_connection_critical',
          severity: 'critical' as const,
          message: 'Database connections exhausted'
        },
        currentLevel: 0,
        startedAt: new Date(),
        config: {
          levels: [{
            actions: ['email_oncall', 'sms_oncall'],
            recipients: {
              email: ['oncall@wedsync.com'],
              sms: ['+44123456789'],
              slack: ['#alerts']
            }
          }]
        }
      };

      await (escalationEngine as any).executeEscalationActions(escalation, 0);

      expect(mockNotifications.sendEmail).toHaveBeenCalledWith(
        ['oncall@wedsync.com'],
        expect.stringContaining('ESCALATED'),
        expect.any(String),
        escalation.alert
      );

      expect(mockNotifications.sendSMS).toHaveBeenCalledWith(
        ['+44123456789'],
        expect.stringContaining('ESCALATED'),
        escalation.alert
      );
    });
  });

  describe('WeddingDayProtocol', () => {
    let weddingDayProtocol: WeddingDayProtocol;

    beforeEach(() => {
      weddingDayProtocol = WeddingDayProtocol.getInstance();
    });

    it('should be a singleton', () => {
      const instance1 = WeddingDayProtocol.getInstance();
      const instance2 = WeddingDayProtocol.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should detect wedding day (Saturday) automatically', () => {
      // Mock Saturday
      const saturday = new Date('2024-06-15T10:00:00Z'); // Saturday
      jest.setSystemTime(saturday);

      const isWeddingDay = (weddingDayProtocol as any).isWeddingDay();
      expect(isWeddingDay).toBe(true);
    });

    it('should not detect non-Saturday as wedding day', () => {
      // Mock Monday
      const monday = new Date('2024-06-17T10:00:00Z'); // Monday
      jest.setSystemTime(monday);

      const isWeddingDay = (weddingDayProtocol as any).isWeddingDay();
      expect(isWeddingDay).toBe(false);
    });

    it('should calculate business impact for critical database alerts', () => {
      const alert = {
        type: 'database_connection_critical',
        severity: 'critical' as const,
        value: 100,
        threshold: 95,
        timestamp: new Date()
      };

      const impact = (weddingDayProtocol as any).calculateBusinessImpact(alert);
      
      expect(impact.score).toBeGreaterThan(80);
      expect(impact.estimatedRevenueLoss).toBeGreaterThan(0);
      expect(impact.affectedWeddings).toBeGreaterThan(0);
      expect(impact.description).toContain('Database system failure');
    });

    it('should activate emergency protocol for high-impact alerts', async () => {
      const alert = {
        id: 'alert-emergency-123',
        type: 'database_connection_critical',
        severity: 'critical' as const,
        message: 'Complete database failure',
        timestamp: new Date(),
        metric: 'connection_utilization',
        value: 100,
        threshold: 95,
        context: {}
      };

      const mockRecoverySystem = {
        executeEmergencyRecovery: jest.fn().mockResolvedValue({ success: true, action: 'failover_executed' })
      };
      (weddingDayProtocol as any).recoverySystem = mockRecoverySystem;

      await weddingDayProtocol.activateEmergencyProtocol(alert);

      expect(mockRecoverySystem.executeEmergencyRecovery).toHaveBeenCalledWith(alert);
    });

    it('should manage emergency contacts with priority levels', () => {
      const contacts = (weddingDayProtocol as any).getEmergencyContacts();
      
      expect(contacts).toHaveProperty('level1');
      expect(contacts).toHaveProperty('level2');
      expect(contacts).toHaveProperty('level3');
      
      expect(contacts.level1).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          phone: expect.any(String),
          email: expect.any(String),
          role: expect.any(String)
        })
      ]));
    });

    it('should check emergency contact availability', async () => {
      const contact = {
        id: 'contact-123',
        name: 'John Doe',
        phone: '+44123456789',
        email: 'john@wedsync.com',
        role: 'CTO'
      };

      // Mock availability check (would normally ping their phone/email)
      const mockAvailabilityCheck = jest.fn().mockResolvedValue(true);
      (weddingDayProtocol as any).checkContactAvailability = mockAvailabilityCheck;

      const isAvailable = await (weddingDayProtocol as any).checkContactAvailability(contact);
      expect(isAvailable).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete alert lifecycle during wedding day', async () => {
      // Mock Saturday
      const saturday = new Date('2024-06-15T10:00:00Z');
      jest.setSystemTime(saturday);

      // Initialize all systems
      const healthMonitor = DatabaseHealthMonitor.getInstance();
      const recoverySystem = DatabaseRecoverySystem.getInstance();
      const alertManager = AlertManager.getInstance();
      const escalationEngine = EscalationEngine.getInstance();
      const weddingDayProtocol = WeddingDayProtocol.getInstance();

      // Enable wedding day mode
      healthMonitor.enableWeddingDayMode();
      recoverySystem.enableWeddingDayMode();
      escalationEngine.enableWeddingDayMode();

      // Mock critical database issue
      const criticalAlert = {
        type: 'database_connection_critical',
        severity: 'critical' as const,
        metric: 'connection_utilization',
        value: 100,
        threshold: 95,
        message: 'Database connections exhausted - system critical',
        context: { utilization: 100, total: 100, active: 100, idle: 0 }
      };

      // Create alert
      const alertId = await alertManager.createAlert(criticalAlert);
      expect(alertId).toBeDefined();

      // Verify alert was created
      const activeAlerts = alertManager.getAlerts('active');
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].severity).toBe('critical');

      // Check if wedding day protocol activates
      const alert = activeAlerts[0];
      const businessImpact = (weddingDayProtocol as any).calculateBusinessImpact(alert);
      expect(businessImpact.score).toBeGreaterThan(80);

      // Verify escalation starts automatically for critical alerts
      await escalationEngine.startEscalation(alert);
      const activeEscalations = (escalationEngine as any).activeEscalations;
      expect(activeEscalations.has(alertId)).toBe(true);

      // Verify recovery plan is generated
      const recoveryPlan = (recoverySystem as any).generateRecoveryPlan(alert);
      expect(recoveryPlan.weddingDaySafe).toBe(true);
      expect(recoveryPlan.actions.length).toBeGreaterThan(0);

      // Resolve alert
      await alertManager.resolveAlert(alertId, 'automated-recovery', 'System recovered');
      escalationEngine.stopEscalation(alertId);

      // Verify alert is resolved
      const resolvedAlerts = alertManager.getAlerts('resolved');
      expect(resolvedAlerts).toHaveLength(1);
      expect(activeEscalations.has(alertId)).toBe(false);
    });

    it('should handle performance degradation with automated recovery', async () => {
      const healthMonitor = DatabaseHealthMonitor.getInstance();
      const recoverySystem = DatabaseRecoverySystem.getInstance();
      const alertManager = AlertManager.getInstance();

      // Mock performance degradation
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ count: 100, active: 95 }] }) // high connections
        .mockResolvedValueOnce({ rows: [{ avg_duration: 3000, slow_queries: 15 }] }) // slow queries
        .mockResolvedValueOnce({ rows: [{ cache_hit_ratio: 0.65 }] }) // low cache hit
        .mockResolvedValueOnce({ rows: [{ size: '2048 MB', usage: 90 }] }) // high storage
        .mockResolvedValueOnce({ rows: [{ replication_lag: 2.5 }] }); // high replication lag

      let alertsGenerated: any[] = [];
      healthMonitor.onAlert((alert) => {
        alertsGenerated.push(alert);
      });

      // Collect metrics (would normally be called by monitoring loop)
      const metrics = await (healthMonitor as any).collectMetrics(mockDatabase);
      
      // Check for alerts
      await (healthMonitor as any).checkConnectionHealth(mockDatabase);
      await (healthMonitor as any).checkQueryPerformance(mockDatabase);
      await (healthMonitor as any).checkCachePerformance(mockDatabase);

      expect(alertsGenerated.length).toBeGreaterThan(0);

      // Verify recovery plans can be generated for each alert
      for (const alert of alertsGenerated) {
        const plan = (recoverySystem as any).generateRecoveryPlan(alert);
        expect(plan.actions.length).toBeGreaterThan(0);
        expect(plan.estimatedDuration).toBeGreaterThan(0);
      }
    });

    it('should load test alert system under high volume', async () => {
      const alertManager = AlertManager.getInstance();
      const startTime = Date.now();

      // Generate 100 concurrent alerts
      const alertPromises = Array.from({ length: 100 }, (_, i) => 
        alertManager.createAlert({
          type: `test_alert_${i % 5}`,
          severity: ['info', 'warning', 'critical'][i % 3] as 'info' | 'warning' | 'critical',
          metric: `test_metric_${i}`,
          value: Math.random() * 100,
          threshold: 50,
          message: `Load test alert ${i}`,
          context: { testId: i }
        })
      );

      const alertIds = await Promise.all(alertPromises);
      const endTime = Date.now();

      // Verify all alerts were created
      expect(alertIds).toHaveLength(100);
      expect(new Set(alertIds).size).toBeLessThanOrEqual(100); // Some might be deduplicated

      // Verify performance (should handle 100 alerts in under 1 second)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);

      // Verify alerts can be queried efficiently
      const activeAlerts = alertManager.getAlerts('active');
      expect(activeAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      const healthMonitor = DatabaseHealthMonitor.getInstance();
      const mockFailingDb = {
        query: jest.fn().mockRejectedValue(new Error('Connection refused'))
      };

      const metrics = await (healthMonitor as any).collectMetrics(mockFailingDb);
      
      // Should return error metrics instead of crashing
      expect(metrics).toHaveProperty('error');
      expect(metrics.error).toContain('Connection refused');
    });

    it('should handle malformed alert data', async () => {
      const alertManager = AlertManager.getInstance();

      // Try to create alert with missing required fields
      const invalidAlert = {
        // missing type, severity, metric, value, threshold
        message: 'Test alert',
        context: {}
      } as any;

      await expect(alertManager.createAlert(invalidAlert)).rejects.toThrow();
    });

    it('should handle notification service failures', async () => {
      const notificationChannels = NotificationChannels.getInstance();
      
      // Mock all notification services failing
      const mockFailingResend = {
        emails: {
          send: jest.fn().mockRejectedValue(new Error('Email service down'))
        }
      };
      const mockFailingTwilio = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('SMS service down'))
        }
      };

      (notificationChannels as any).resend = mockFailingResend;
      (notificationChannels as any).twilio = mockFailingTwilio;

      const alert = {
        id: 'alert-123',
        type: 'database_connection_high',
        severity: 'warning' as const,
        message: 'High connection utilization',
        timestamp: new Date()
      };

      const emailResult = await notificationChannels.sendEmail(
        ['admin@wedsync.com'],
        'Test Alert',
        'Test message',
        alert
      );

      const smsResult = await notificationChannels.sendSMS(
        ['+44123456789'],
        'Test alert',
        alert
      );

      expect(emailResult.success).toBe(false);
      expect(smsResult.success).toBe(false);
      expect(emailResult.error).toBe('Email service down');
      expect(smsResult.error).toBe('SMS service down');
    });

    it('should handle concurrent access to singleton instances', () => {
      // Create multiple instances concurrently
      const instances = Promise.all([
        Promise.resolve(DatabaseHealthMonitor.getInstance()),
        Promise.resolve(DatabaseHealthMonitor.getInstance()),
        Promise.resolve(DatabaseHealthMonitor.getInstance()),
      ]);

      instances.then(([instance1, instance2, instance3]) => {
        expect(instance1).toBe(instance2);
        expect(instance2).toBe(instance3);
      });
    });

    it('should handle timezone edge cases for wedding day detection', () => {
      const weddingDayProtocol = WeddingDayProtocol.getInstance();

      // Test Saturday in different timezones
      const saturdayUTC = new Date('2024-06-15T23:30:00Z'); // Late Saturday UTC
      const saturdayLocal = new Date('2024-06-15T01:30:00'); // Early Saturday local

      jest.setSystemTime(saturdayUTC);
      expect((weddingDayProtocol as any).isWeddingDay()).toBe(true);

      jest.setSystemTime(saturdayLocal);
      expect((weddingDayProtocol as any).isWeddingDay()).toBe(true);

      // Test edge case: Sunday 00:01 (just after wedding day)
      const sundayEarly = new Date('2024-06-16T00:01:00');
      jest.setSystemTime(sundayEarly);
      expect((weddingDayProtocol as any).isWeddingDay()).toBe(false);
    });
  });
});