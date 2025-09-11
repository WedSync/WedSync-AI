import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataQualityGovernance } from '@/lib/integrations/analytics/data-quality-governance';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null })),
    update: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        data: [],
        error: null,
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

// Mock quality check responses
const mockQualityCheckResponse = {
  overallScore: 87.5,
  categoryScores: {
    completeness: 92.0,
    accuracy: 88.5,
    consistency: 85.0,
    timeliness: 90.0,
    privacy: 95.0,
  },
  platformResults: [
    {
      platform: 'quickbooks',
      score: 89.0,
      recordsChecked: 1250,
      issues: [
        {
          category: 'completeness',
          severity: 'medium',
          platform: 'quickbooks',
          dataCategory: 'financial_data',
          description: '12 invoices missing client email addresses',
          affectedRecords: 12,
          suggestedAction:
            'Update invoice templates to require email addresses',
          autoFixable: false,
          weddingImpact: 'medium',
        },
      ],
      weddingDataQuality: {
        weddingRecordsChecked: 450,
        seasonalDataAccuracy: 94.0,
        vendorDataConsistency: 87.0,
        guestDataCompleteness: 91.5,
      },
    },
  ],
  issues: [
    {
      category: 'accuracy',
      severity: 'high',
      platform: 'google_analytics',
      dataCategory: 'marketing_data',
      description: 'Inconsistent conversion tracking between GA and Facebook',
      affectedRecords: 156,
      suggestedAction: 'Implement server-side conversion tracking',
      autoFixable: true,
      weddingImpact: 'high',
    },
  ],
};

const mockGDPRComplianceResponse = {
  complianceScore: 94.5,
  complianceAreas: {
    dataConsent: 98.0,
    dataRetention: 92.0,
    dataAccess: 95.0,
    dataPortability: 90.0,
    dataErasure: 96.0,
    privacyByDesign: 89.0,
  },
  violations: [
    {
      type: 'data_retention',
      severity: 'medium',
      description: 'Guest data retained beyond wedding date + 2 years policy',
      affectedRecords: 23,
      remediationRequired: true,
      autoFixable: true,
    },
  ],
  weddingSpecificCompliance: {
    guestDataProtection: 97.0,
    vendorDataSharing: 91.0,
    photographReleases: 88.0,
    marketingConsent: 95.0,
  },
};

const mockAuditTrailResponse = {
  totalEvents: 2456,
  eventTypes: {
    data_access: 1245,
    data_modification: 567,
    data_export: 234,
    data_deletion: 89,
    privacy_request: 45,
    consent_change: 276,
  },
  userActivity: [
    {
      userId: 'user-123',
      userName: 'Sarah Johnson',
      totalEvents: 145,
      riskScore: 'low',
      lastActivity: '2024-07-15T14:30:00Z',
    },
  ],
  complianceEvents: [
    {
      eventType: 'gdpr_data_request',
      timestamp: '2024-07-15T10:00:00Z',
      userId: 'user-456',
      details: {
        requestType: 'data_export',
        dataCategories: ['wedding_data', 'guest_data'],
        status: 'completed',
      },
    },
  ],
};

describe('DataQualityGovernance', () => {
  let governance: DataQualityGovernance;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    weddingOptimized: true,
    gdprEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    governance = new DataQualityGovernance(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(governance).toBeInstanceOf(DataQualityGovernance);
      expect((governance as any).organizationId).toBe(
        mockConfig.organizationId,
      );
      expect((governance as any).weddingOptimized).toBe(true);
      expect((governance as any).gdprEnabled).toBe(true);
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new DataQualityGovernance({
            organizationId: 'invalid-uuid',
            weddingOptimized: false,
            gdprEnabled: false,
          }),
      ).toThrow('Invalid organization ID format');
    });

    it('should initialize without wedding optimization and GDPR', () => {
      const basicGovernance = new DataQualityGovernance({
        organizationId: mockConfig.organizationId,
        weddingOptimized: false,
        gdprEnabled: false,
      });
      expect((basicGovernance as any).weddingOptimized).toBe(false);
      expect((basicGovernance as any).gdprEnabled).toBe(false);
    });
  });

  describe('executeQualityCheck', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQualityCheckResponse),
        }),
      ) as any;
    });

    it('should execute comprehensive quality check with wedding optimization', async () => {
      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174000',
        checkType: 'comprehensive',
        platforms: ['quickbooks', 'stripe', 'google_analytics'],
        dataCategories: ['financial_data', 'marketing_data', 'guest_data'],
        qualityRules: {
          completeness: {
            threshold: 90,
            criticalFields: ['wedding_date', 'client_email', 'booking_value'],
          },
          accuracy: {
            threshold: 95,
            validationRules: [
              'email_format',
              'phone_format',
              'date_validation',
            ],
          },
          privacy: {
            gdprCompliance: true,
            dataRetentionCheck: true,
            consentValidation: true,
          },
        },
        weddingSpecificChecks: {
          seasonalDataValidation: true,
          vendorPerformanceMetrics: true,
          guestDataIntegrity: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.overallScore).toBe(87.5);
      expect(result.categoryScores.completeness).toBe(92.0);
      expect(result.platformResults.length).toBeGreaterThan(0);
      expect(result.weddingInsights).toBeDefined();
      expect(result.weddingInsights.seasonalDataAccuracy).toBeDefined();
    });

    it('should execute incremental quality check', async () => {
      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174001',
        checkType: 'incremental',
        platforms: ['quickbooks'],
        lastCheckTimestamp: '2024-07-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.checkType).toBe('incremental');
      expect(result.incrementalChanges).toBeDefined();
    });

    it('should execute targeted quality check for specific issues', async () => {
      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174002',
        checkType: 'targeted',
        platforms: ['google_analytics', 'facebook_ads'],
        dataCategories: ['marketing_data'],
        targetedChecks: [
          'conversion_tracking_consistency',
          'attribution_accuracy',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.targetedResults).toBeDefined();
      expect(
        result.targetedResults.conversionTrackingConsistency,
      ).toBeDefined();
    });

    it('should handle quality check failures gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Quality check service unavailable')),
      ) as any;

      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174003',
        checkType: 'comprehensive',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quality check service unavailable');
    });
  });

  describe('ensureGDPRCompliance', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGDPRComplianceResponse),
        }),
      ) as any;
    });

    it('should perform comprehensive GDPR compliance assessment', async () => {
      const result = await governance.ensureGDPRCompliance({
        assessmentType: 'comprehensive',
        dataCategories: ['guest_data', 'vendor_data', 'financial_data'],
        includeWeddingSpecificChecks: true,
        generateComplianceReport: true,
      });

      expect(result.success).toBe(true);
      expect(result.complianceScore).toBe(94.5);
      expect(result.complianceAreas.dataConsent).toBe(98.0);
      expect(result.weddingSpecificCompliance).toBeDefined();
      expect(result.weddingSpecificCompliance.guestDataProtection).toBe(97.0);
      expect(result.violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate data consent mechanisms', async () => {
      const result = await governance.validateDataConsent({
        consentTypes: ['marketing', 'photography_release', 'data_processing'],
        includeGuestConsent: true,
        includeVendorConsent: true,
        validateConsentWithdrawal: true,
      });

      expect(result.success).toBe(true);
      expect(result.consentValidation).toBeDefined();
      expect(result.consentValidation.marketingConsent).toBeDefined();
      expect(result.consentValidation.photographyReleases).toBeDefined();
      expect(result.consentWithdrawalMechanisms).toBeDefined();
    });

    it('should implement data retention policies', async () => {
      const result = await governance.implementDataRetention({
        retentionPolicies: {
          guest_data: '2_years_after_wedding',
          financial_data: '7_years',
          marketing_data: '3_years',
          photography_data: '5_years',
        },
        automaticDeletion: true,
        notificationBeforeDeletion: true,
        weddingSpecificRetention: true,
      });

      expect(result.success).toBe(true);
      expect(result.retentionPoliciesImplemented).toBe(true);
      expect(result.automaticDeletionScheduled).toBe(true);
      expect(result.weddingSpecificPolicies).toBeDefined();
    });

    it('should handle data subject rights requests', async () => {
      const result = await governance.processDataSubjectRequest({
        requestType: 'data_export',
        subjectId: 'guest-123',
        dataCategories: ['personal_data', 'wedding_data'],
        requestedFormat: 'json',
        includeRelatedData: true,
      });

      expect(result.success).toBe(true);
      expect(result.requestProcessed).toBe(true);
      expect(result.dataPackage).toBeDefined();
      expect(result.processingTime).toBeDefined();
      expect(result.complianceStatus).toBe('compliant');
    });
  });

  describe('createAuditTrail', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuditTrailResponse),
        }),
      ) as any;
    });

    it('should create comprehensive audit trail', async () => {
      const result = await governance.createAuditTrail({
        auditScope: 'comprehensive',
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
        includeUserActivity: true,
        includeDataAccess: true,
        includeComplianceEvents: true,
        weddingSpecificAuditing: true,
      });

      expect(result.success).toBe(true);
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.totalEvents).toBe(2456);
      expect(result.auditTrail.userActivity.length).toBeGreaterThan(0);
      expect(result.auditTrail.complianceEvents.length).toBeGreaterThan(0);
    });

    it('should track data access patterns', async () => {
      const result = await governance.trackDataAccess({
        trackingScope: 'detailed',
        includeAuthorizationChecks: true,
        flagUnauthorizedAccess: true,
        weddingDataFocus: true,
      });

      expect(result.success).toBe(true);
      expect(result.dataAccessTracking).toBeDefined();
      expect(result.authorizationCompliance).toBeDefined();
      expect(result.unauthorizedAccessAlerts).toBeDefined();
    });

    it('should monitor privacy compliance events', async () => {
      const result = await governance.monitorPrivacyEvents({
        eventTypes: [
          'consent_given',
          'consent_withdrawn',
          'data_export',
          'data_deletion',
        ],
        realTimeMonitoring: true,
        alertThresholds: {
          high_volume_requests: 50,
          consent_withdrawal_rate: 0.05,
        },
      });

      expect(result.success).toBe(true);
      expect(result.privacyMonitoring).toBeDefined();
      expect(result.realTimeAlertsEnabled).toBe(true);
      expect(result.complianceMetrics).toBeDefined();
    });
  });

  describe('Wedding-specific data governance', () => {
    it('should validate wedding data integrity', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              weddingDataIntegrity: {
                weddingDateConsistency: 98.5,
                clientVendorRelationships: 96.0,
                guestListAccuracy: 92.0,
                photographyReleaseCompliance: 89.0,
                paymentRecordIntegrity: 95.5,
              },
              issues: [
                {
                  type: 'date_inconsistency',
                  description: '3 bookings have mismatched wedding dates',
                  severity: 'medium',
                  affectedWeddings: 3,
                },
              ],
            }),
        }),
      ) as any;

      const result = await governance.validateWeddingDataIntegrity({
        validationScope: 'comprehensive',
        includeGuestData: true,
        includeVendorRelationships: true,
        includePhotographyReleases: true,
        crossPlatformValidation: true,
      });

      expect(result.success).toBe(true);
      expect(result.weddingDataIntegrity).toBeDefined();
      expect(result.weddingDataIntegrity.weddingDateConsistency).toBe(98.5);
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it('should manage guest data privacy', async () => {
      const result = await governance.manageGuestDataPrivacy({
        privacyLevel: 'strict',
        includePhotographyConsent: true,
        manageDataSharing: true,
        implementDataMinimization: true,
        autoExpireGuestData: true,
      });

      expect(result.success).toBe(true);
      expect(result.guestPrivacyManagement).toBeDefined();
      expect(result.photographyConsentManagement).toBeDefined();
      expect(result.dataMinimizationImplemented).toBe(true);
      expect(result.autoExpirationScheduled).toBe(true);
    });

    it('should enforce vendor data sharing compliance', async () => {
      const result = await governance.enforceVendorCompliance({
        complianceLevel: 'enterprise',
        requireDataProcessingAgreements: true,
        monitorVendorAccess: true,
        enforceDataRetentionLimits: true,
        auditVendorSecurity: true,
      });

      expect(result.success).toBe(true);
      expect(result.vendorCompliance).toBeDefined();
      expect(result.dataProcessingAgreements).toBeDefined();
      expect(result.vendorAccessMonitoring).toBe(true);
      expect(result.securityAuditsScheduled).toBe(true);
    });
  });

  describe('Data quality automation', () => {
    it('should implement automated data quality monitoring', async () => {
      const result = await governance.implementAutomatedMonitoring({
        monitoringLevel: 'comprehensive',
        automatedChecks: [
          'data_completeness',
          'data_accuracy',
          'data_consistency',
          'privacy_compliance',
        ],
        alertThresholds: {
          quality_score_drop: 0.05, // 5% drop
          privacy_violation: 'immediate',
          data_inconsistency: 'daily',
        },
        automatedRemediation: true,
      });

      expect(result.success).toBe(true);
      expect(result.automatedMonitoringEnabled).toBe(true);
      expect(result.monitoringChecks.length).toBe(4);
      expect(result.alertingConfigured).toBe(true);
      expect(result.automatedRemediationEnabled).toBe(true);
    });

    it('should configure data quality rules engine', async () => {
      const result = await governance.configureQualityRules({
        ruleCategories: [
          'wedding_specific',
          'financial',
          'marketing',
          'compliance',
        ],
        customRules: [
          {
            name: 'wedding_date_future_validation',
            description: 'Ensure wedding dates are not in the past',
            severity: 'high',
            autoFix: false,
          },
          {
            name: 'guest_email_format_validation',
            description: 'Validate guest email addresses',
            severity: 'medium',
            autoFix: true,
          },
        ],
        enableRuleLearning: true,
      });

      expect(result.success).toBe(true);
      expect(result.qualityRulesConfigured).toBe(true);
      expect(result.customRules.length).toBe(2);
      expect(result.ruleLearningEnabled).toBe(true);
    });

    it('should schedule automated compliance checks', async () => {
      const result = await governance.scheduleComplianceChecks({
        checkSchedules: {
          gdpr_assessment: 'monthly',
          data_retention_review: 'quarterly',
          audit_trail_analysis: 'weekly',
          vendor_compliance_check: 'monthly',
        },
        alertOnFailure: true,
        generateReports: true,
        notifyStakeholders: true,
      });

      expect(result.success).toBe(true);
      expect(result.schedulesConfigured).toBe(4);
      expect(result.alertingEnabled).toBe(true);
      expect(result.reportGenerationEnabled).toBe(true);
      expect(result.stakeholderNotifications).toBe(true);
    });
  });

  describe('Data lineage and impact analysis', () => {
    it('should track data lineage across systems', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              dataLineage: {
                sources: ['quickbooks', 'stripe', 'google_analytics'],
                transformations: [
                  'data_cleansing',
                  'format_standardization',
                  'wedding_categorization',
                ],
                destinations: [
                  'data_warehouse',
                  'reporting_dashboard',
                  'analytics_platform',
                ],
                lineageMap: {
                  guest_data: {
                    source: 'form_submissions',
                    transformations: ['email_validation', 'duplicate_removal'],
                    destinations: ['guest_management', 'marketing_campaigns'],
                  },
                },
              },
            }),
        }),
      ) as any;

      const result = await governance.trackDataLineage({
        lineageScope: 'comprehensive',
        includeTransformations: true,
        includeDataFlow: true,
        weddingDataFocus: true,
      });

      expect(result.success).toBe(true);
      expect(result.dataLineage).toBeDefined();
      expect(result.dataLineage.sources.length).toBe(3);
      expect(result.dataLineage.lineageMap).toBeDefined();
    });

    it('should perform data impact analysis', async () => {
      const result = await governance.analyzeDataImpact({
        changeType: 'schema_modification',
        affectedSystems: ['quickbooks', 'reporting_dashboard'],
        impactAnalysis: 'comprehensive',
        includeDownstreamEffects: true,
        generateMigrationPlan: true,
      });

      expect(result.success).toBe(true);
      expect(result.impactAnalysis).toBeDefined();
      expect(result.affectedSystems.length).toBe(2);
      expect(result.downstreamEffects).toBeDefined();
      expect(result.migrationPlan).toBeDefined();
    });

    it('should validate data transformation integrity', async () => {
      const result = await governance.validateTransformationIntegrity({
        validationType: 'comprehensive',
        transformationSteps: [
          'data_cleansing',
          'format_standardization',
          'categorization',
        ],
        includeBeforeAfterComparison: true,
        detectDataLoss: true,
        validateBusinessRules: true,
      });

      expect(result.success).toBe(true);
      expect(result.transformationValidation).toBeDefined();
      expect(result.integrityScore).toBeGreaterThan(0);
      expect(result.dataLossDetection).toBeDefined();
      expect(result.businessRuleCompliance).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle data governance service outages gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Governance service unavailable')),
      ) as any;

      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174000',
        checkType: 'comprehensive',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Governance service unavailable');
      expect(result.retryStrategy).toBeDefined();
    });

    it('should validate governance operation parameters', async () => {
      await expect(
        governance.executeQualityCheck({
          checkId: 'invalid-uuid',
          checkType: 'comprehensive',
        }),
      ).rejects.toThrow('Invalid check ID format');

      await expect(
        governance.ensureGDPRCompliance({
          assessmentType: 'invalid_type' as any,
        }),
      ).rejects.toThrow('Invalid assessment type');
    });

    it('should handle partial compliance check failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockGDPRComplianceResponse,
              partialFailures: ['data_retention_check'],
              warnings: ['Some systems temporarily unavailable'],
            }),
        }),
      ) as any;

      const result = await governance.ensureGDPRCompliance({
        assessmentType: 'comprehensive',
        continueOnPartialFailure: true,
      });

      expect(result.success).toBe(true);
      expect(result.partialFailures).toContain('data_retention_check');
      expect(result.warnings).toContain('Some systems temporarily unavailable');
    });

    it('should maintain audit trail integrity during failures', async () => {
      // Simulate audit trail corruption
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              auditIntegrity: false,
              corruptedEvents: 15,
              recoveredEvents: 2441,
              backupRestored: true,
            }),
        }),
      ) as any;

      const result = await governance.validateAuditTrailIntegrity({
        validationType: 'comprehensive',
        repairCorruption: true,
        restoreFromBackup: true,
      });

      expect(result.success).toBe(true);
      expect(result.auditIntegrity).toBe(false);
      expect(result.backupRestored).toBe(true);
      expect(result.recoveredEvents).toBe(2441);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large-scale quality checks efficiently', async () => {
      const largeDatasetResponse = {
        ...mockQualityCheckResponse,
        platformResults: Array(10)
          .fill(null)
          .map((_, i) => ({
            platform: `platform_${i}`,
            score: 85 + (i % 10),
            recordsChecked: 10000 + i * 1000,
            issues: [],
          })),
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(largeDatasetResponse),
        }),
      ) as any;

      const startTime = Date.now();
      const result = await governance.executeQualityCheck({
        checkId: '123e4567-e89b-12d3-a456-426614174000',
        checkType: 'comprehensive',
        platforms: Array(10)
          .fill(null)
          .map((_, i) => `platform_${i}`),
        parallelProcessing: true,
        batchSize: 1000,
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.platformResults.length).toBe(10);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(result.parallelProcessingUsed).toBe(true);
    });

    it('should implement efficient GDPR compliance monitoring', async () => {
      const result = await governance.optimizeComplianceMonitoring({
        optimizationLevel: 'high_performance',
        enableIncrementalChecks: true,
        useCaching: true,
        batchComplianceOperations: true,
        prioritizeHighRiskAreas: true,
      });

      expect(result.success).toBe(true);
      expect(result.optimizationsApplied).toBeDefined();
      expect(result.performanceImprovement).toBeGreaterThan(0);
      expect(result.cachingEnabled).toBe(true);
    });

    it('should scale audit trail management for high-volume environments', async () => {
      const result = await governance.scaleAuditTrailManagement({
        scalingStrategy: 'distributed',
        enableEventStreaming: true,
        implementEventCompression: true,
        useAsyncProcessing: true,
        configureRetention: {
          highPriority: '10_years',
          mediumPriority: '7_years',
          lowPriority: '3_years',
        },
      });

      expect(result.success).toBe(true);
      expect(result.distributedProcessingEnabled).toBe(true);
      expect(result.eventStreamingEnabled).toBe(true);
      expect(result.compressionEnabled).toBe(true);
      expect(result.retentionPoliciesConfigured).toBe(true);
    });

    it('should optimize data quality rule execution', async () => {
      const result = await governance.optimizeRuleExecution({
        optimizationStrategy: 'performance_focused',
        enableRuleParallelization: true,
        implementRuleCaching: true,
        useIncrementalValidation: true,
        prioritizeBusinessCriticalRules: true,
      });

      expect(result.success).toBe(true);
      expect(result.ruleParallelizationEnabled).toBe(true);
      expect(result.ruleCachingEnabled).toBe(true);
      expect(result.incrementalValidationEnabled).toBe(true);
      expect(result.performanceGain).toBeGreaterThan(0);
    });
  });
});
