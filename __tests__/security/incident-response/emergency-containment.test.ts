/**
 * WS-190 Team E: Emergency Containment Test Suite
 * 
 * Testing P1 incident response and containment procedures with <5 minute response times
 * and wedding-specific emergency scenarios.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmergencyContainment } from '@/lib/security/emergency-containment';
import { IncidentCommander } from '@/lib/security/incident-commander';
import { SecurityOrchestrator } from '@/lib/security/orchestrator';
import { WeddingEmergencyProtocol } from '@/lib/security/wedding-emergency';

// Mock dependencies
vi.mock('@/lib/security/incident-commander');
vi.mock('@/lib/security/orchestrator');
vi.mock('@/lib/security/wedding-emergency');

describe('WS-190: Emergency Containment System', () => {
  let emergencyContainment: EmergencyContainment;
  let mockIncidentCommander: any;
  let mockOrchestrator: any;
  let mockWeddingProtocol: any;

  beforeEach(() => {
    mockIncidentCommander = {
      declareEmergency: vi.fn(),
      activateResponseTeam: vi.fn(),
      coordinateContainment: vi.fn(),
      trackResponseTime: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockOrchestrator = {
      isolateAffectedSystems: vi.fn(),
      activateFailsafes: vi.fn(),
      initiateLockdown: vi.fn(),
      preserveEvidence: vi.fn(),
      notifyStakeholders: vi.fn(),
    };

    mockWeddingProtocol = {
      protectWeddingData: vi.fn(),
      notifyCouples: vi.fn(),
      activateVendorBackup: vi.fn(),
      maintainWeddingService: vi.fn(),
    };

    (IncidentCommander as any).mockImplementation(() => mockIncidentCommander);
    (SecurityOrchestrator as any).mockImplementation(() => mockOrchestrator);
    (WeddingEmergencyProtocol as any).mockImplementation(() => mockWeddingProtocol);

    emergencyContainment = new EmergencyContainment();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('P1 Response Procedures', () => {
    test('should contain data breach within 5 minutes', async () => {
      const startTime = Date.now();
      
      const dataBreachIncident = {
        id: 'incident-p1-001',
        type: 'data_breach',
        severity: 'CRITICAL',
        affectedTables: ['guest_profiles', 'payment_methods'],
        affectedRecords: 5000,
        weddingIds: ['wedding-123', 'wedding-456'],
        detectedAt: new Date(),
      };

      const containmentResult = await emergencyContainment.containP1Incident(dataBreachIncident);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(300000); // Less than 5 minutes
      expect(containmentResult.status).toBe('CONTAINED');
      expect(containmentResult.responseTime).toBeLessThan(300);
      expect(mockIncidentCommander.declareEmergency).toHaveBeenCalledWith({
        incidentId: 'incident-p1-001',
        severity: 'CRITICAL',
        containmentDeadline: 300 // 5 minutes in seconds
      });
    });

    test('should immediately isolate affected systems during security breach', async () => {
      const systemBreachIncident = {
        id: 'incident-system-001',
        type: 'system_compromise',
        severity: 'CRITICAL',
        affectedServices: ['payment-api', 'guest-data-service'],
        compromisedNodes: ['api-server-1', 'db-replica-2'],
      };

      await emergencyContainment.containSystemBreach(systemBreachIncident);

      expect(mockOrchestrator.isolateAffectedSystems).toHaveBeenCalledWith([
        'payment-api', 'guest-data-service'
      ]);
      expect(mockOrchestrator.initiateLockdown).toHaveBeenCalledWith([
        'api-server-1', 'db-replica-2'
      ]);
      expect(mockOrchestrator.activateFailsafes).toHaveBeenCalled();
    });

    test('should activate wedding day emergency protocols', async () => {
      const weddingDayIncident = {
        id: 'incident-wedding-001',
        type: 'service_outage',
        severity: 'HIGH',
        isWeddingDay: true,
        affectedWeddings: [
          { id: 'wedding-today-1', status: 'CEREMONY_IN_PROGRESS' },
          { id: 'wedding-today-2', status: 'RECEPTION_STARTING' }
        ],
        estimatedDowntime: '15 minutes'
      };

      await emergencyContainment.handleWeddingDayEmergency(weddingDayIncident);

      expect(mockWeddingProtocol.protectWeddingData).toHaveBeenCalledWith([
        'wedding-today-1', 'wedding-today-2'
      ]);
      expect(mockWeddingProtocol.activateVendorBackup).toHaveBeenCalled();
      expect(mockWeddingProtocol.maintainWeddingService).toHaveBeenCalledWith({
        priority: 'MAXIMUM',
        gracefulDegradation: true
      });
    });

    test('should coordinate multi-team emergency response', async () => {
      const complexIncident = {
        id: 'incident-complex-001',
        type: 'coordinated_attack',
        severity: 'CRITICAL',
        attackVectors: ['sql_injection', 'ddos', 'social_engineering'],
        requiredTeams: ['security', 'infrastructure', 'development', 'communications']
      };

      await emergencyContainment.coordinateMultiTeamResponse(complexIncident);

      expect(mockIncidentCommander.activateResponseTeam).toHaveBeenCalledWith({
        teams: ['security', 'infrastructure', 'development', 'communications'],
        escalationLevel: 'P1',
        coordinationMode: 'UNIFIED_COMMAND'
      });
      expect(mockIncidentCommander.coordinateContainment).toHaveBeenCalled();
    });
  });

  describe('Automated Containment Actions', () => {
    test('should automatically block malicious traffic during DDoS attack', async () => {
      const ddosIncident = {
        id: 'incident-ddos-001',
        type: 'ddos_attack',
        severity: 'HIGH',
        sourceIPs: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        requestRate: 10000, // requests per second
        targetEndpoints: ['/api/payments', '/api/guest-data']
      };

      await emergencyContainment.containDDoSAttack(ddosIncident);

      expect(mockOrchestrator.isolateAffectedSystems).toHaveBeenCalledWith([
        '/api/payments', '/api/guest-data'
      ]);
      expect(mockOrchestrator.activateFailsafes).toHaveBeenCalledWith({
        type: 'rate_limiting',
        blockIPs: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        emergencyThrottling: true
      });
    });

    test('should automatically revoke compromised API keys', async () => {
      const apiKeyCompromiseIncident = {
        id: 'incident-api-001',
        type: 'api_key_compromise',
        severity: 'HIGH',
        compromisedKeys: ['sk_live_123', 'pk_live_456'],
        suspiciousActivity: {
          unusualRequests: 500,
          newEndpoints: ['/admin/users', '/internal/settings'],
          foreignIPs: ['192.168.999.1']
        }
      };

      await emergencyContainment.containAPIKeyCompromise(apiKeyCompromiseIncident);

      expect(mockOrchestrator.isolateAffectedSystems).toHaveBeenCalledWith({
        revokeKeys: ['sk_live_123', 'pk_live_456'],
        generateNewKeys: true,
        notifyIntegrations: true
      });
    });

    test('should automatically backup critical data during containment', async () => {
      const criticalIncident = {
        id: 'incident-critical-001',
        type: 'data_corruption',
        severity: 'CRITICAL',
        affectedData: ['wedding_bookings', 'guest_lists', 'vendor_contracts'],
        corruptionLevel: 'PARTIAL'
      };

      await emergencyContainment.containDataCorruption(criticalIncident);

      expect(mockOrchestrator.preserveEvidence).toHaveBeenCalledWith({
        tables: ['wedding_bookings', 'guest_lists', 'vendor_contracts'],
        snapshotType: 'FORENSIC',
        priority: 'IMMEDIATE'
      });
      expect(mockWeddingProtocol.protectWeddingData).toHaveBeenCalledWith({
        backupMode: 'EMERGENCY',
        integrityCheck: true
      });
    });
  });

  describe('Stakeholder Notification', () => {
    test('should notify wedding couples during security incidents', async () => {
      const guestDataIncident = {
        id: 'incident-guest-001',
        type: 'guest_data_breach',
        severity: 'HIGH',
        affectedWeddings: ['wedding-001', 'wedding-002'],
        affectedGuests: 250,
        dataTypes: ['email', 'phone', 'dietary_preferences']
      };

      await emergencyContainment.notifyAffectedCouples(guestDataIncident);

      expect(mockWeddingProtocol.notifyCouples).toHaveBeenCalledWith({
        weddingIds: ['wedding-001', 'wedding-002'],
        incidentType: 'guest_data_breach',
        affectedDataTypes: ['email', 'phone', 'dietary_preferences'],
        notificationTemplate: 'SECURITY_INCIDENT_COUPLE'
      });
    });

    test('should escalate to executive team for critical incidents', async () => {
      const criticalSystemIncident = {
        id: 'incident-executive-001',
        type: 'platform_wide_outage',
        severity: 'CRITICAL',
        estimatedAffectedUsers: 50000,
        businessImpact: 'SEVERE',
        reputationRisk: 'HIGH'
      };

      await emergencyContainment.escalateToExecutive(criticalSystemIncident);

      expect(mockOrchestrator.notifyStakeholders).toHaveBeenCalledWith({
        escalationLevel: 'C_LEVEL',
        incidentSummary: expect.any(String),
        businessImpact: 'SEVERE',
        immediateActions: expect.any(Array),
        mediaStrategy: expect.any(Object)
      });
    });

    test('should notify regulatory bodies for GDPR breaches', async () => {
      const gdprBreachIncident = {
        id: 'incident-gdpr-001',
        type: 'personal_data_breach',
        severity: 'CRITICAL',
        affectedRecords: 1000,
        dataCategories: ['personal_identifiers', 'financial_data'],
        requiresRegulatorNotification: true,
        breachDetectedAt: new Date(),
        maxNotificationTime: 72 // hours
      };

      await emergencyContainment.handleGDPRBreach(gdprBreachIncident);

      expect(mockOrchestrator.notifyStakeholders).toHaveBeenCalledWith({
        type: 'REGULATORY_NOTIFICATION',
        authority: 'ICO_UK',
        deadline: expect.any(Date),
        breachDetails: expect.objectContaining({
          affectedRecords: 1000,
          dataCategories: ['personal_identifiers', 'financial_data']
        })
      });
    });
  });

  describe('Recovery Coordination', () => {
    test('should coordinate system recovery after containment', async () => {
      const containedIncident = {
        id: 'incident-recovery-001',
        status: 'CONTAINED',
        affectedSystems: ['payment-service', 'notification-service'],
        recoveryPlan: {
          steps: ['validate_data_integrity', 'restore_services', 'resume_operations'],
          estimatedDuration: '30 minutes'
        }
      };

      const recoveryResult = await emergencyContainment.initiateRecovery(containedIncident);

      expect(recoveryResult.status).toBe('RECOVERY_INITIATED');
      expect(mockOrchestrator.isolateAffectedSystems).toHaveBeenCalledWith({
        action: 'RESTORE',
        systems: ['payment-service', 'notification-service']
      });
    });

    test('should validate system integrity before full restoration', async () => {
      const validationChecks = {
        dataIntegrity: true,
        securityPatches: true,
        vulnerabilityScans: true,
        performanceBaseline: true
      };

      const validationResult = await emergencyContainment.validateSystemIntegrity(validationChecks);

      expect(validationResult.allChecksPassed).toBe(true);
      expect(validationResult.readyForProduction).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent P1 incidents', async () => {
      const concurrentIncidents = [
        { id: 'p1-001', type: 'data_breach', severity: 'CRITICAL' },
        { id: 'p1-002', type: 'system_outage', severity: 'CRITICAL' },
        { id: 'p1-003', type: 'payment_fraud', severity: 'HIGH' }
      ];

      const startTime = Date.now();
      
      const results = await Promise.all(
        concurrentIncidents.map(incident => 
          emergencyContainment.containP1Incident(incident)
        )
      );
      
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(600000); // Less than 10 minutes for all 3
      expect(results.every(r => r.status === 'CONTAINED')).toBe(true);
    });

    test('should scale containment resources during peak wedding season', async () => {
      const peakSeasonConfig = {
        period: 'WEDDING_SEASON_PEAK',
        expectedLoad: '10x_normal',
        additionalResources: {
          responseTeams: 3,
          containmentSystems: 5,
          backupCapacity: '200%'
        }
      };

      await emergencyContainment.configureForPeakSeason(peakSeasonConfig);

      expect(mockOrchestrator.activateFailsafes).toHaveBeenCalledWith({
        scalingMode: 'PEAK_SEASON',
        resourceMultiplier: 10,
        autoScaling: true
      });
    });
  });

  describe('Integration and Workflow Testing', () => {
    test('should integrate with external security services', async () => {
      const externalSecurityEvent = {
        source: 'cloudflare',
        type: 'threat_detected',
        severity: 'HIGH',
        details: {
          attackType: 'SQL_INJECTION',
          blockedRequests: 150,
          sourceCountries: ['Unknown', 'CN', 'RU']
        }
      };

      await emergencyContainment.handleExternalSecurityAlert(externalSecurityEvent);

      expect(mockOrchestrator.isolateAffectedSystems).toHaveBeenCalledWith({
        externalSource: 'cloudflare',
        additionalProtection: true
      });
    });

    test('should maintain audit trail throughout containment process', async () => {
      const auditableIncident = {
        id: 'incident-audit-001',
        type: 'compliance_violation',
        severity: 'HIGH'
      };

      await emergencyContainment.containWithAuditTrail(auditableIncident);

      expect(mockOrchestrator.preserveEvidence).toHaveBeenCalledWith({
        type: 'AUDIT_TRAIL',
        includeAllActions: true,
        complianceRequirement: 'SOX_GDPR'
      });
    });
  });
});