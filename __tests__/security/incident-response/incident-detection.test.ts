/**
 * WS-190 Team E: Incident Detection Test Suite
 * 
 * Comprehensive testing for security incident detection, automated response triggers,
 * and escalation procedures with wedding industry context.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { IncidentDetector } from '@/lib/security/incident-detector';
import { SecurityLogger } from '@/lib/security/logger';
import { AlertManager } from '@/lib/security/alert-manager';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/security/logger');
vi.mock('@/lib/security/alert-manager');

describe('WS-190: Incident Detection System', () => {
  let incidentDetector: IncidentDetector;
  let mockSupabase: any;
  let mockLogger: any;
  let mockAlertManager: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    };

    mockLogger = {
      logSecurityEvent: vi.fn(),
      logIncidentDetection: vi.fn(),
      logEscalation: vi.fn(),
    };

    mockAlertManager = {
      sendP1Alert: vi.fn(),
      sendP2Alert: vi.fn(),
      notifySecurityTeam: vi.fn(),
      notifyWeddingCoordinators: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    (SecurityLogger as any).mockImplementation(() => mockLogger);
    (AlertManager as any).mockImplementation(() => mockAlertManager);

    incidentDetector = new IncidentDetector();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Threat Detection Scenarios', () => {
    test('should detect multiple failed login attempts from same IP', async () => {
      // Simulate wedding supplier attempting multiple failed logins
      const failedAttempts = [
        { ip: '192.168.1.100', timestamp: new Date(), userId: 'photographer-123' },
        { ip: '192.168.1.100', timestamp: new Date(), userId: 'photographer-123' },
        { ip: '192.168.1.100', timestamp: new Date(), userId: 'photographer-123' },
        { ip: '192.168.1.100', timestamp: new Date(), userId: 'photographer-123' },
        { ip: '192.168.1.100', timestamp: new Date(), userId: 'photographer-123' },
      ];

      for (const attempt of failedAttempts) {
        await incidentDetector.recordFailedLogin(attempt);
      }

      const incidents = await incidentDetector.detectSuspiciousActivity();

      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('brute_force_attack');
      expect(incidents[0].severity).toBe('HIGH');
      expect(incidents[0].context).toContain('photographer-123');
      expect(mockLogger.logIncidentDetection).toHaveBeenCalledWith({
        type: 'brute_force_attack',
        ip: '192.168.1.100',
        userId: 'photographer-123',
        severity: 'HIGH'
      });
    });

    test('should detect unusual data access patterns during wedding season', async () => {
      // Simulate unusual guest data access during peak wedding season
      const dataAccess = {
        userId: 'venue-coordinator-456',
        resource: 'guest_data',
        accessCount: 500, // Unusual high access count
        timeWindow: '1h',
        weddingDate: new Date('2024-06-15'), // Peak wedding season
        guestCount: 1000
      };

      await incidentDetector.recordDataAccess(dataAccess);
      const incidents = await incidentDetector.analyzeDataAccessPatterns();

      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('unusual_data_access');
      expect(incidents[0].severity).toBe('MEDIUM');
      expect(incidents[0].context).toContain('wedding season peak');
      expect(incidents[0].metadata.guestCount).toBe(1000);
    });

    test('should detect payment fraud attempts', async () => {
      // Simulate payment fraud during wedding booking
      const paymentAttempts = [
        { cardNumber: '****1234', amount: 5000, declined: true, reason: 'insufficient_funds' },
        { cardNumber: '****5678', amount: 5000, declined: true, reason: 'invalid_card' },
        { cardNumber: '****9012', amount: 5000, declined: true, reason: 'fraud_detected' },
      ];

      for (const attempt of paymentAttempts) {
        await incidentDetector.recordPaymentAttempt(attempt);
      }

      const incidents = await incidentDetector.detectPaymentFraud();

      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('payment_fraud');
      expect(incidents[0].severity).toBe('HIGH');
      expect(incidents[0].metadata.attemptCount).toBe(3);
      expect(incidents[0].metadata.totalAmount).toBe(15000);
    });

    test('should detect data breach in guest information', async () => {
      // Simulate unauthorized access to guest personal data
      const breachIndicators = {
        table: 'guest_profiles',
        unauthorizedAccess: true,
        affectedRecords: 250,
        dataTypes: ['email', 'phone', 'dietary_requirements'],
        accessorIP: '10.0.0.1',
        timestamp: new Date()
      };

      await incidentDetector.analyzeDataBreach(breachIndicators);
      const incidents = await incidentDetector.getActiveIncidents();

      expect(incidents.some(i => i.type === 'data_breach')).toBe(true);
      const breachIncident = incidents.find(i => i.type === 'data_breach');
      expect(breachIncident.severity).toBe('CRITICAL');
      expect(breachIncident.metadata.affectedRecords).toBe(250);
      expect(breachIncident.gdprCompliance.notificationRequired).toBe(true);
    });
  });

  describe('Automated Response Triggers', () => {
    test('should trigger P1 response for critical security incidents', async () => {
      const criticalIncident = {
        type: 'data_breach',
        severity: 'CRITICAL',
        affectedUsers: 1000,
        context: 'Guest data exposure during wedding weekend',
        weddingIds: ['wedding-123', 'wedding-456']
      };

      await incidentDetector.processIncident(criticalIncident);

      expect(mockAlertManager.sendP1Alert).toHaveBeenCalledWith({
        incident: criticalIncident,
        responseTime: expect.any(Number),
        escalationLevel: 'IMMEDIATE'
      });
      expect(mockAlertManager.notifyWeddingCoordinators).toHaveBeenCalledWith([
        'wedding-123', 'wedding-456'
      ]);
    });

    test('should automatically block suspicious IP addresses', async () => {
      const suspiciousActivity = {
        ip: '192.168.1.999',
        type: 'brute_force_attack',
        attempts: 20,
        timeWindow: '5m'
      };

      await incidentDetector.handleSuspiciousIP(suspiciousActivity);

      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_ips');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ip_address: '192.168.1.999',
        reason: 'brute_force_attack',
        blocked_at: expect.any(Date),
        expires_at: expect.any(Date)
      });
    });

    test('should trigger account lockdown for compromised accounts', async () => {
      const compromisedAccount = {
        userId: 'vendor-789',
        indicators: ['unusual_login_location', 'multiple_failed_2fa'],
        riskScore: 95
      };

      await incidentDetector.handleCompromisedAccount(compromisedAccount);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        account_locked: true,
        lock_reason: 'security_incident',
        locked_at: expect.any(Date)
      });
      expect(mockAlertManager.sendP2Alert).toHaveBeenCalled();
    });
  });

  describe('Escalation Procedures', () => {
    test('should escalate wedding day security incidents immediately', async () => {
      const weddingDayIncident = {
        type: 'venue_security_breach',
        severity: 'HIGH',
        weddingDate: new Date(), // Today
        venueId: 'venue-abc-123',
        isWeddingDay: true
      };

      await incidentDetector.processWeddingDayIncident(weddingDayIncident);

      expect(mockAlertManager.sendP1Alert).toHaveBeenCalledWith({
        incident: weddingDayIncident,
        escalationReason: 'WEDDING_DAY_CRITICAL',
        responseTime: 300 // 5 minutes max
      });
      expect(mockLogger.logEscalation).toHaveBeenCalledWith({
        incidentId: expect.any(String),
        escalationLevel: 'P1',
        reason: 'Wedding day security incident requires immediate response'
      });
    });

    test('should escalate based on incident severity thresholds', async () => {
      const incidents = [
        { severity: 'LOW', type: 'failed_login' },
        { severity: 'MEDIUM', type: 'unusual_access' },
        { severity: 'HIGH', type: 'payment_fraud' },
        { severity: 'CRITICAL', type: 'data_breach' }
      ];

      const escalationResults = await Promise.all(
        incidents.map(incident => incidentDetector.determineEscalation(incident))
      );

      expect(escalationResults[0].level).toBe('P4'); // LOW -> P4
      expect(escalationResults[1].level).toBe('P3'); // MEDIUM -> P3
      expect(escalationResults[2].level).toBe('P2'); // HIGH -> P2
      expect(escalationResults[3].level).toBe('P1'); // CRITICAL -> P1
    });

    test('should escalate incidents affecting multiple weddings', async () => {
      const multiWeddingIncident = {
        type: 'system_outage',
        severity: 'HIGH',
        affectedWeddings: ['wedding-001', 'wedding-002', 'wedding-003'],
        estimatedImpact: 'Service disruption for 3 active weddings'
      };

      await incidentDetector.processMultiWeddingIncident(multiWeddingIncident);

      expect(mockAlertManager.sendP1Alert).toHaveBeenCalled();
      expect(mockAlertManager.notifyWeddingCoordinators).toHaveBeenCalledWith([
        'wedding-001', 'wedding-002', 'wedding-003'
      ]);
      expect(mockLogger.logEscalation).toHaveBeenCalledWith({
        incidentId: expect.any(String),
        escalationReason: 'Multiple wedding impact',
        affectedWeddingCount: 3
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should detect incidents within 30 seconds', async () => {
      const startTime = Date.now();
      
      const incident = {
        type: 'suspicious_login',
        ip: '10.0.0.1',
        userId: 'vendor-123'
      };

      await incidentDetector.recordSuspiciousActivity(incident);
      const detectedIncidents = await incidentDetector.detectSuspiciousActivity();
      
      const endTime = Date.now();
      const detectionTime = endTime - startTime;

      expect(detectionTime).toBeLessThan(30000); // Less than 30 seconds
      expect(detectedIncidents).toHaveLength(1);
    });

    test('should process high-volume events during wedding season', async () => {
      const events = Array.from({ length: 1000 }, (_, i) => ({
        type: 'login_attempt',
        userId: `vendor-${i}`,
        timestamp: new Date(),
        ip: `192.168.1.${i % 255}`
      }));

      const startTime = Date.now();
      
      await incidentDetector.processBatchEvents(events);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(10000); // Less than 10 seconds for 1000 events
    });
  });

  describe('Integration Testing', () => {
    test('should integrate with security monitoring dashboard', async () => {
      const incident = {
        type: 'data_breach',
        severity: 'CRITICAL',
        timestamp: new Date()
      };

      await incidentDetector.processIncident(incident);

      expect(mockSupabase.from).toHaveBeenCalledWith('security_incidents');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data_breach',
          severity: 'CRITICAL',
          status: 'active'
        })
      );
    });

    test('should integrate with external security services', async () => {
      const externalThreat = {
        source: 'threat_intelligence',
        indicators: ['malicious_ip', 'known_botnet'],
        confidence: 0.95
      };

      await incidentDetector.processExternalThreat(externalThreat);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith({
        source: 'external_threat_intel',
        threat: externalThreat,
        action: 'automated_block'
      });
    });
  });
});