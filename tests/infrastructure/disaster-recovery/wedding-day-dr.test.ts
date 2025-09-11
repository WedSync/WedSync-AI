import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WeddingDayDRManager } from '../../../src/lib/services/infrastructure/wedding-day-dr-manager';
import { EmergencyNotificationService } from '../../../src/lib/services/infrastructure/emergency-notifications';
import { VendorImpactAssessment } from '../../../src/lib/services/infrastructure/vendor-impact-assessment';
import { CoupleProtectionService } from '../../../src/lib/services/infrastructure/couple-protection';

describe('Wedding Day Disaster Recovery Testing', () => {
  let weddingDR: WeddingDayDRManager;
  let notificationService: EmergencyNotificationService;
  let vendorImpact: VendorImpactAssessment;
  let coupleProtection: CoupleProtectionService;

  beforeEach(async () => {
    weddingDR = new WeddingDayDRManager();
    notificationService = new EmergencyNotificationService();
    vendorImpact = new VendorImpactAssessment();
    coupleProtection = new CoupleProtectionService();

    // Mock Saturday wedding day
    jest.spyOn(Date, 'now').mockImplementation(() =>
      new Date('2025-06-14T14:00:00Z').getTime() // Saturday 2PM wedding time
    );
  });

  describe('Saturday Wedding Protection', () => {
    test('should implement maximum protection mode for active weddings', async () => {
      const activeWeddings = [
        {
          id: 'wedding-001',
          coupleName: 'Smith-Johnson',
          startTime: new Date('2025-06-14T15:00:00Z'),
          endTime: new Date('2025-06-14T23:00:00Z'),
          guestCount: 200,
          vendors: [
            { id: 'photographer-1', type: 'photographer', critical: true },
            { id: 'venue-1', type: 'venue', critical: true },
            { id: 'catering-1', type: 'caterer', critical: true }
          ],
          status: 'active',
          priority: 'maximum'
        },
        {
          id: 'wedding-002', 
          coupleName: 'Davis-Wilson',
          startTime: new Date('2025-06-14T17:00:00Z'),
          endTime: new Date('2025-06-15T01:00:00Z'),
          guestCount: 150,
          vendors: [
            { id: 'photographer-2', type: 'photographer', critical: true },
            { id: 'venue-2', type: 'venue', critical: true }
          ],
          status: 'active',
          priority: 'maximum'
        }
      ];

      const protectionMode = await weddingDR.activateWeddingDayProtection({
        activeWeddings,
        protectionLevel: 'maximum',
        monitoringInterval: 15, // Every 15 seconds
        responseTimeTarget: 30 // 30 seconds
      });

      expect(protectionMode.activated).toBe(true);
      expect(protectionMode.weddingsProtected).toBe(2);
      expect(protectionMode.criticalVendors).toBe(5);
      expect(protectionMode.destructiveOpsBlocked).toBe(true);
      expect(protectionMode.monitoringFrequency).toBe(15);
      expect(protectionMode.emergencyResponseTeam).toBe('active');
    });

    test('should prevent all destructive operations during active ceremonies', async () => {
      const activeWedding = {
        id: 'wedding-ceremony-001',
        status: 'ceremony_in_progress',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
        endTime: new Date(Date.now() + 90 * 60 * 1000) // Ends in 90 min
      };

      await weddingDR.activateWeddingDayProtection({ activeWeddings: [activeWedding] });

      const destructiveOperations = [
        { type: 'DELETE_DATABASE', impact: 'critical', description: 'Delete wedding database' },
        { type: 'RESTART_SERVICE', impact: 'high', description: 'Restart photo upload service' },
        { type: 'SCALE_DOWN', impact: 'medium', description: 'Reduce server capacity' },
        { type: 'UPDATE_CONFIG', impact: 'medium', description: 'Update networking config' },
        { type: 'DEPLOY_CODE', impact: 'low', description: 'Deploy new feature' }
      ];

      const operationResults = await Promise.all(
        destructiveOperations.map(op => weddingDR.validateOperation(op))
      );

      // All operations should be blocked
      operationResults.forEach((result, index) => {
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('active wedding ceremony');
        expect(result.weddingProtection).toBe(true);
        expect(result.suggestedAlternative).toBeDefined();
      });
    });

    test('should allow emergency-only operations with multi-approval', async () => {
      const criticalEmergency = {
        type: 'EMERGENCY_SCALE_UP',
        reason: 'Photo upload service overloaded - guests cannot share photos',
        impact: 'critical',
        affectedWedding: 'wedding-001',
        requestedBy: 'on-call-engineer',
        approvalRequired: true
      };

      const emergencyApproval = await weddingDR.requestEmergencyOperation(criticalEmergency);
      
      expect(emergencyApproval.requiresApproval).toBe(true);
      expect(emergencyApproval.approversRequired).toBeGreaterThanOrEqual(2);
      expect(emergencyApproval.timeoutMinutes).toBeLessThanOrEqual(5); // Fast approval needed

      // Simulate approvals
      await weddingDR.approveEmergencyOperation(emergencyApproval.requestId, {
        approver: 'senior-engineer-1',
        approval: true,
        reason: 'Critical for guest experience'
      });
      
      await weddingDR.approveEmergencyOperation(emergencyApproval.requestId, {
        approver: 'wedding-day-manager',
        approval: true,
        reason: 'Approved for guest photo sharing'
      });

      const operationResult = await weddingDR.executeApprovedEmergencyOperation(emergencyApproval.requestId);
      
      expect(operationResult.executed).toBe(true);
      expect(operationResult.executionTime).toBeLessThan(60); // <1 minute
      expect(operationResult.weddingImpactMinimized).toBe(true);
    });
  });

  describe('Wedding-Specific Disaster Scenarios', () => {
    test('should handle photo upload service failure during peak moments', async () => {
      const photoServiceFailure = {
        service: 'photo-upload-api',
        failureTime: new Date('2025-06-14T18:00:00Z'), // During cocktail hour - peak photo time
        affectedWeddings: ['wedding-001', 'wedding-002'],
        expectedPhotoUploads: 500, // per hour during cocktail hour
        vendorDependencies: ['photographer-1', 'photographer-2', 'guests']
      };

      const recoveryStart = Date.now();
      const recovery = await weddingDR.handlePhotoServiceFailure(photoServiceFailure);
      const recoveryTime = Date.now() - recoveryStart;

      expect(recovery.success).toBe(true);
      expect(recoveryTime).toBeLessThan(60000); // <1 minute recovery
      expect(recovery.fallbackActivated).toBe(true);
      expect(recovery.photosQueued).toBeGreaterThan(0); // Photos queued for later processing
      expect(recovery.vendorNotificationsSent).toBe(2); // Notify both photographers
      expect(recovery.guestNotificationSent).toBe(true);
    });

    test('should handle payment system failure during wedding payments', async () => {
      const paymentFailure = {
        system: 'stripe-payments',
        failureType: 'api_outage',
        failureTime: new Date('2025-06-14T16:30:00Z'),
        pendingPayments: [
          { weddingId: 'wedding-001', vendorId: 'photographer-1', amount: 2500, type: 'final_payment' },
          { weddingId: 'wedding-001', vendorId: 'florist-1', amount: 800, type: 'day_of_payment' },
          { weddingId: 'wedding-002', vendorId: 'band-1', amount: 1200, type: 'performance_fee' }
        ]
      };

      const paymentRecovery = await weddingDR.handlePaymentSystemFailure(paymentFailure);

      expect(paymentRecovery.success).toBe(true);
      expect(paymentRecovery.paymentsSecured).toBe(3);
      expect(paymentRecovery.fallbackPaymentMethod).toBe('manual_processing');
      expect(paymentRecovery.vendorAssurance).toBe(true); // Vendors assured they'll be paid
      expect(paymentRecovery.auditTrailMaintained).toBe(true);
      expect(paymentRecovery.compliancePreserved).toBe(true);
    });

    test('should handle venue connectivity failure', async () => {
      const venueConnectivityIssue = {
        venue: 'Grand Ballroom Downtown',
        venueId: 'venue-001',
        connectivityType: 'wifi_and_cellular',
        affectedSystems: ['guest_checkin', 'vendor_coordination', 'live_streaming'],
        weddingInProgress: true,
        guestCount: 200,
        criticalTime: true // During ceremony
      };

      const connectivityRecovery = await weddingDR.handleVenueConnectivityFailure(venueConnectivityIssue);

      expect(connectivityRecovery.success).toBe(true);
      expect(connectivityRecovery.offlineModeActivated).toBe(true);
      expect(connectivityRecovery.dataCachedLocally).toBe(true);
      expect(connectivityRecovery.guestCheckinContinuous).toBe(true);
      expect(connectivityRecovery.syncWhenReconnected).toBe(true);
      expect(connectivityRecovery.vendorNotified).toBe(true);
    });
  });

  describe('Vendor and Guest Communication During DR', () => {
    test('should send immediate notifications to affected vendors', async () => {
      const systemOutage = {
        type: 'partial_outage',
        affectedServices: ['vendor_portal', 'timeline_management'],
        estimatedRecoveryTime: 15, // minutes
        affectedWeddings: ['wedding-001'],
        criticalVendors: [
          { id: 'photographer-1', type: 'photographer', phone: '+1234567890', email: 'photographer@example.com' },
          { id: 'wedding-planner-1', type: 'planner', phone: '+1234567891', email: 'planner@example.com' }
        ]
      };

      const notifications = await notificationService.sendVendorEmergencyNotifications(systemOutage);

      expect(notifications.sent).toBe(true);
      expect(notifications.vendorsNotified).toBe(2);
      expect(notifications.smsDelivered).toBe(2);
      expect(notifications.emailDelivered).toBe(2);
      expect(notifications.averageDeliveryTime).toBeLessThan(30); // <30 seconds
      
      // Check notification content
      expect(notifications.messages[0].content).toContain('system temporarily unavailable');
      expect(notifications.messages[0].content).toContain('estimated recovery: 15 minutes');
      expect(notifications.messages[0].content).toContain('alternative procedures');
    });

    test('should assess and minimize vendor business impact', async () => {
      const businessImpactScenario = {
        outageType: 'complete_system_failure',
        duration: 45, // minutes
        affectedVendors: [
          { 
            id: 'photographer-1', 
            type: 'photographer',
            dependentServices: ['photo_upload', 'timeline_sync', 'client_communication'],
            businessImpact: 'high',
            revenueAtRisk: 2500
          },
          {
            id: 'venue-1',
            type: 'venue',
            dependentServices: ['guest_checkin', 'seating_charts'],
            businessImpact: 'medium',
            revenueAtRisk: 500
          }
        ]
      };

      const impactAssessment = await vendorImpact.assessBusinessImpact(businessImpactScenario);
      
      expect(impactAssessment.totalRevenueAtRisk).toBe(3000);
      expect(impactAssessment.highImpactVendors).toBe(1);
      expect(impactAssessment.mediumImpactVendors).toBe(1);
      
      const mitigationPlan = await vendorImpact.createMitigationPlan(impactAssessment);
      
      expect(mitigationPlan.compensationOffered).toBe(true);
      expect(mitigationPlan.alternativeWorkflows.length).toBeGreaterThan(0);
      expect(mitigationPlan.prioritySupport).toBe(true);
      expect(mitigationPlan.serviceCreditCalculated).toBe(true);
    });

    test('should protect couple experience during system issues', async () => {
      const coupleProtectionScenario = {
        couple: {
          id: 'couple-001',
          names: ['Sarah Smith', 'Michael Johnson'],
          weddingId: 'wedding-001',
          contactInfo: {
            phone: '+1987654321',
            email: 'sarah.michael@example.com'
          }
        },
        systemIssue: {
          type: 'guest_management_failure',
          impact: 'guest_checkin_disabled',
          weddingMoment: 'pre_ceremony', // 30 minutes before ceremony
          guestsAffected: 200
        }
      };

      const coupleProtectionResponse = await coupleProtection.protectCoupleExperience(coupleProtectionScenario);

      expect(coupleProtectionResponse.coupleShielded).toBe(true);
      expect(coupleProtectionResponse.alternativeArrangements).toBe(true);
      expect(coupleProtectionResponse.manualProcessActivated).toBe(true);
      expect(coupleProtectionResponse.vendorCoordination).toBe(true);
      expect(coupleProtectionResponse.guestExperiencePreserved).toBe(true);
      
      // Couple should NOT be directly notified unless absolutely necessary
      expect(coupleProtectionResponse.coupleNotified).toBe(false);
      expect(coupleProtectionResponse.stressMinimized).toBe(true);
    });
  });

  describe('Recovery Time Optimization for Weddings', () => {
    test('should prioritize recovery based on wedding timeline criticality', async () => {
      const multiWeddingScenario = {
        systemFailure: 'database_cluster_failure',
        affectedWeddings: [
          {
            id: 'wedding-001',
            currentPhase: 'ceremony', // Most critical
            timeToNextPhase: 45, // minutes
            priority: 1
          },
          {
            id: 'wedding-002', 
            currentPhase: 'cocktail_hour', // Less critical
            timeToNextPhase: 90,
            priority: 2
          },
          {
            id: 'wedding-003',
            currentPhase: 'prep_time', // Least critical  
            timeToNextPhase: 180,
            priority: 3
          }
        ]
      };

      const prioritizedRecovery = await weddingDR.executePrioritizedWeddingRecovery(multiWeddingScenario);

      expect(prioritizedRecovery.success).toBe(true);
      expect(prioritizedRecovery.recoveryOrder).toEqual(['wedding-001', 'wedding-002', 'wedding-003']);
      expect(prioritizedRecovery.ceremonyProtected).toBe(true);
      
      // Most critical wedding should recover first
      const ceremonyRecovery = prioritizedRecovery.weddingRecoveries.find(r => r.weddingId === 'wedding-001');
      expect(ceremonyRecovery?.recoveryTime).toBeLessThan(120); // <2 minutes for ceremony
      expect(ceremonyRecovery?.dataIntegrity).toBe('complete');
    });

    test('should maintain wedding day SLA of 99.99% uptime', async () => {
      const weddingDaySLA = {
        targetUptime: 0.9999, // 99.99%
        maxDowntimeMinutes: 0.864, // ~52 seconds for 24-hour period
        testDuration: 24 * 60 * 60 * 1000, // 24 hours in ms
        simulatedFailures: [
          { time: 2 * 60 * 60 * 1000, duration: 30000, type: 'network_hiccup' }, // 2 hours in, 30s
          { time: 8 * 60 * 60 * 1000, duration: 15000, type: 'db_reconnect' },   // 8 hours in, 15s
          { time: 16 * 60 * 60 * 1000, duration: 5000, type: 'cache_refresh' }  // 16 hours in, 5s
        ]
      };

      const slaTest = await weddingDR.runWeddingDaySLATest(weddingDaySLA);
      
      expect(slaTest.actualUptime).toBeGreaterThanOrEqual(weddingDaySLA.targetUptime);
      expect(slaTest.totalDowntimeSeconds).toBeLessThan(weddingDaySLA.maxDowntimeMinutes * 60);
      expect(slaTest.slaViolations).toBe(0);
      expect(slaTest.recoveryTimeAverage).toBeLessThan(30); // <30s average recovery
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await weddingDR.cleanup();
    await notificationService.cleanup();
  });
});
