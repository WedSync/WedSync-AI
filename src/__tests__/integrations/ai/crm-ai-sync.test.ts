import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CRMAISync } from '@/lib/integrations/ai/crm-ai-sync';
import type {
  CRMSyncConfig,
  LeadScoringRequest,
  WorkflowAutomationRequest,
  CRMSyncResult,
} from '@/lib/integrations/ai/types';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: [],
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/integrations/ai/external-ai-services', () => ({
  ExternalAIServices: {
    analyzeLeadQuality: vi.fn(),
    optimizeWorkflow: vi.fn(),
    predictConversion: vi.fn(),
  },
}));

describe('CRMAISync', () => {
  let crmAISync: CRMAISync;
  const mockConfig: CRMSyncConfig = {
    crmType: 'salesforce',
    organizationId: 'org_123',
    credentials: {
      apiKey: 'test_api_key',
      secretKey: 'test_secret',
      instanceUrl: 'https://test.salesforce.com',
    },
    syncSettings: {
      bidirectional: true,
      realTime: true,
      batchSize: 100,
      conflictResolution: 'crm-wins',
      syncFrequency: '5min',
    },
    aiOptimization: {
      enabled: true,
      leadScoring: true,
      workflowAutomation: true,
      predictiveAnalytics: true,
    },
  };

  beforeEach(() => {
    crmAISync = new CRMAISync();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRM Configuration Management', () => {
    it('should configure CRM integration successfully', async () => {
      const result = await crmAISync.configureCRMIntegration(mockConfig);

      expect(result.success).toBe(true);
      expect(result.crmType).toBe(mockConfig.crmType);
      expect(result.organizationId).toBe(mockConfig.organizationId);
      expect(result.features).toEqual(mockConfig.aiOptimization);
    });

    it('should validate CRM credentials during configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          ...mockConfig.credentials,
          apiKey: '',
        },
      };

      await expect(
        crmAISync.configureCRMIntegration(invalidConfig),
      ).rejects.toThrow('Invalid CRM credentials');
    });

    it('should support multiple CRM types', async () => {
      const crmTypes = ['salesforce', 'hubspot', 'pipedrive', 'zoho'];

      for (const crmType of crmTypes) {
        const config = { ...mockConfig, crmType: crmType as any };
        const result = await crmAISync.configureCRMIntegration(config);
        expect(result.crmType).toBe(crmType);
      }
    });
  });

  describe('Bidirectional Data Synchronization', () => {
    const testLeadData = {
      leadId: 'lead_123',
      contactInfo: {
        name: 'John & Jane Doe',
        email: 'john.jane@example.com',
        phone: '+44123456789',
      },
      weddingDetails: {
        date: new Date('2024-06-15'),
        venue: 'Test Venue',
        guestCount: 100,
        budget: 15000,
      },
      serviceRequirements: ['photography', 'catering', 'flowers'],
      source: 'website-inquiry',
      stage: 'qualified',
    };

    it('should sync lead data from WedSync to CRM', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);

      const result = await crmAISync.syncToExternalCRM('org_123', [
        testLeadData,
      ]);

      expect(result.success).toBe(true);
      expect(result.recordsSynced).toBe(1);
      expect(result.syncType).toBe('export');
      expect(result.errors).toHaveLength(0);
    });

    it('should sync lead updates from CRM to WedSync', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);

      const crmUpdates = [
        {
          ...testLeadData,
          stage: 'proposal-sent',
          lastActivity: new Date(),
          notes: 'Follow-up scheduled',
        },
      ];

      const result = await crmAISync.syncFromExternalCRM('org_123', crmUpdates);

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1);
      expect(result.syncType).toBe('import');
    });

    it('should handle conflict resolution during sync', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);

      const conflictingData = {
        ...testLeadData,
        budget: 20000, // Different from WedSync
        lastModified: new Date(),
      };

      const result = await crmAISync.syncFromExternalCRM('org_123', [
        conflictingData,
      ]);

      expect(result.conflicts).toBeDefined();
      expect(result.conflictsResolved).toBeGreaterThan(0);
      expect(result.resolutionStrategy).toBe(
        mockConfig.syncSettings.conflictResolution,
      );
    });

    it('should maintain sync audit trail', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);
      await crmAISync.syncToExternalCRM('org_123', [testLeadData]);

      const auditLog = await crmAISync.getSyncAuditLog('org_123');

      expect(auditLog).toBeDefined();
      expect(auditLog.entries).toHaveLength(1);
      expect(auditLog.entries[0]).toHaveProperty('timestamp');
      expect(auditLog.entries[0]).toHaveProperty('operation');
      expect(auditLog.entries[0]).toHaveProperty('recordCount');
    });
  });

  describe('AI-Powered Lead Scoring', () => {
    const leadScoringRequest: LeadScoringRequest = {
      leads: [
        {
          leadId: 'lead_123',
          demographics: {
            age: 28,
            location: 'London',
            occupation: 'Marketing Manager',
          },
          weddingDetails: {
            date: new Date('2024-08-15'),
            budget: 25000,
            guestCount: 120,
            planningStage: 'early',
          },
          engagement: {
            websiteVisits: 5,
            emailOpens: 3,
            downloadedResources: 2,
            socialMedia: 'active',
          },
          timeline: {
            inquiryDate: new Date('2024-01-15'),
            lastContact: new Date('2024-01-20'),
            responseTime: 2,
          },
        },
      ],
      scoringCriteria: {
        budgetWeight: 0.3,
        timelineWeight: 0.2,
        engagementWeight: 0.3,
        fitWeight: 0.2,
      },
      organizationId: 'org_123',
    };

    it('should calculate AI-powered lead scores', async () => {
      const result = await crmAISync.calculateLeadScores(leadScoringRequest);

      expect(result.success).toBe(true);
      expect(result.scoredLeads).toHaveLength(1);

      const scoredLead = result.scoredLeads[0];
      expect(scoredLead.leadId).toBe('lead_123');
      expect(scoredLead.aiScore).toBeGreaterThanOrEqual(0);
      expect(scoredLead.aiScore).toBeLessThanOrEqual(100);
      expect(scoredLead.scoreBreakdown).toBeDefined();
      expect(scoredLead.recommendations).toBeDefined();
    });

    it('should provide detailed scoring breakdown', async () => {
      const result = await crmAISync.calculateLeadScores(leadScoringRequest);
      const scoredLead = result.scoredLeads[0];

      expect(scoredLead.scoreBreakdown).toHaveProperty('budgetScore');
      expect(scoredLead.scoreBreakdown).toHaveProperty('timelineScore');
      expect(scoredLead.scoreBreakdown).toHaveProperty('engagementScore');
      expect(scoredLead.scoreBreakdown).toHaveProperty('fitScore');
      expect(scoredLead.scoreBreakdown).toHaveProperty('reasoning');
    });

    it('should categorize leads based on scores', async () => {
      const result = await crmAISync.calculateLeadScores(leadScoringRequest);
      const scoredLead = result.scoredLeads[0];

      expect(['hot', 'warm', 'cold', 'unqualified']).toContain(
        scoredLead.category,
      );
      expect(scoredLead.priority).toBeGreaterThanOrEqual(1);
      expect(scoredLead.priority).toBeLessThanOrEqual(5);
    });

    it('should update CRM with lead scores', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);
      const result = await crmAISync.calculateLeadScores(leadScoringRequest);

      expect(result.crmUpdated).toBe(true);
      expect(result.updatedRecords).toBeGreaterThan(0);
    });
  });

  describe('Workflow Automation', () => {
    const automationRequest: WorkflowAutomationRequest = {
      organizationId: 'org_123',
      triggers: [
        {
          event: 'lead-scored',
          conditions: {
            scoreThreshold: 70,
            category: 'hot',
          },
          actions: [
            {
              type: 'send-email',
              template: 'hot-lead-followup',
              delay: 0,
            },
            {
              type: 'assign-to-sales',
              assignee: 'sales-team',
              delay: 60,
            },
            {
              type: 'schedule-call',
              timeframe: '24-hours',
              delay: 120,
            },
          ],
        },
      ],
      aiOptimization: {
        enabled: true,
        learnFromOutcomes: true,
        optimizeTimings: true,
        personalizeContent: true,
      },
    };

    it('should create automated workflows', async () => {
      const result =
        await crmAISync.createWorkflowAutomation(automationRequest);

      expect(result.success).toBe(true);
      expect(result.workflowId).toBeDefined();
      expect(result.triggersCreated).toBe(1);
      expect(result.actionsCreated).toBe(3);
    });

    it('should execute workflow triggers', async () => {
      const workflowResult =
        await crmAISync.createWorkflowAutomation(automationRequest);

      // Simulate a trigger event
      const triggerResult = await crmAISync.executeWorkflowTrigger(
        workflowResult.workflowId!,
        'lead-scored',
        {
          leadId: 'lead_123',
          score: 85,
          category: 'hot',
        },
      );

      expect(triggerResult.success).toBe(true);
      expect(triggerResult.actionsTriggered).toBe(3);
      expect(triggerResult.executionId).toBeDefined();
    });

    it('should optimize workflows with AI', async () => {
      const result = await crmAISync.optimizeWorkflow('workflow_123', {
        performanceData: {
          conversionRate: 0.15,
          responseRate: 0.65,
          avgTimeToClose: 14,
        },
        optimization: 'conversion',
      });

      expect(result.success).toBe(true);
      expect(result.optimizations).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.estimatedImprovement).toBeGreaterThan(0);
    });
  });

  describe('Real-time Synchronization', () => {
    it('should establish real-time sync connection', async () => {
      await crmAISync.configureCRMIntegration({
        ...mockConfig,
        syncSettings: { ...mockConfig.syncSettings, realTime: true },
      });

      const connection = await crmAISync.establishRealTimeSync('org_123');

      expect(connection.success).toBe(true);
      expect(connection.connectionId).toBeDefined();
      expect(connection.status).toBe('connected');
    });

    it('should handle real-time data updates', async () => {
      await crmAISync.establishRealTimeSync('org_123');

      const updateData = {
        leadId: 'lead_123',
        field: 'stage',
        oldValue: 'qualified',
        newValue: 'proposal-sent',
        timestamp: new Date(),
      };

      const result = await crmAISync.processRealTimeUpdate(
        'org_123',
        updateData,
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.syncDirection).toBe('bidirectional');
    });

    it('should maintain connection health', async () => {
      await crmAISync.establishRealTimeSync('org_123');

      const health = await crmAISync.checkSyncHealth('org_123');

      expect(health.status).toBe('healthy');
      expect(health.lastSync).toBeDefined();
      expect(health.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(health.latency).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Integration Analytics', () => {
    it('should provide sync performance metrics', async () => {
      await crmAISync.configureCRMIntegration(mockConfig);

      const metrics = await crmAISync.getSyncMetrics('org_123');

      expect(metrics).toHaveProperty('syncFrequency');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('avgSyncTime');
      expect(metrics).toHaveProperty('recordsProcessed');
      expect(metrics).toHaveProperty('errorBreakdown');
    });

    it('should track lead conversion analytics', async () => {
      const analytics = await crmAISync.getLeadConversionAnalytics('org_123');

      expect(analytics).toHaveProperty('conversionRate');
      expect(analytics).toHaveProperty('avgTimeToConversion');
      expect(analytics).toHaveProperty('topPerformingSource');
      expect(analytics).toHaveProperty('scoreEffectiveness');
      expect(analytics).toHaveProperty('workflowPerformance');
    });

    it('should generate AI insights and recommendations', async () => {
      const insights = await crmAISync.generateAIInsights('org_123');

      expect(insights.success).toBe(true);
      expect(insights.insights).toBeInstanceOf(Array);
      expect(insights.insights.length).toBeGreaterThan(0);

      const insight = insights.insights[0];
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('title');
      expect(insight).toHaveProperty('description');
      expect(insight).toHaveProperty('recommendation');
      expect(insight).toHaveProperty('impact');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle CRM API failures gracefully', async () => {
      // Simulate CRM API failure
      const failingConfig = {
        ...mockConfig,
        credentials: { ...mockConfig.credentials, apiKey: 'invalid-key' },
      };

      const result = await crmAISync.syncToExternalCRM('org_123', [
        { leadId: 'lead_123', name: 'Test Lead' },
      ]);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.retryable).toBe(true);
    });

    it('should implement retry logic for failed syncs', async () => {
      const result = await crmAISync.retrySyncOperation('sync_123');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('retryCount');
      expect(result).toHaveProperty('nextRetryAt');
    });

    it('should maintain data integrity during failures', async () => {
      // Simulate partial failure during sync
      const result = await crmAISync.syncToExternalCRM('org_123', [
        { leadId: 'lead_valid', name: 'Valid Lead' },
        { leadId: 'lead_invalid', name: '' }, // Invalid data
      ]);

      expect(result.recordsSynced).toBe(1);
      expect(result.recordsFailed).toBe(1);
      expect(result.partialSuccess).toBe(true);
      expect(result.rollbackApplied).toBe(false); // Should not rollback successful records
    });
  });

  describe('Security and Compliance', () => {
    it('should encrypt sensitive CRM credentials', async () => {
      const result = await crmAISync.configureCRMIntegration(mockConfig);

      const storedConfig = await crmAISync.getCRMConfig('org_123');
      expect(storedConfig.credentials.apiKey).not.toBe(
        mockConfig.credentials.apiKey,
      );
      expect(storedConfig.credentials.apiKey).toMatch(/^encrypted:/);
    });

    it('should validate data before sync', async () => {
      const invalidData = [
        { leadId: '', name: 'Test' }, // Invalid leadId
        { leadId: 'lead_123' }, // Missing required name field
        { leadId: 'lead_456', name: 'Valid Lead' }, // Valid data
      ];

      const result = await crmAISync.syncToExternalCRM('org_123', invalidData);

      expect(result.recordsSynced).toBe(1); // Only valid record
      expect(result.validationErrors).toHaveLength(2);
      expect(result.recordsSkipped).toBe(2);
    });

    it('should audit all sync operations', async () => {
      await crmAISync.syncToExternalCRM('org_123', [
        { leadId: 'lead_123', name: 'Test Lead' },
      ]);

      const auditLog = await crmAISync.getSecurityAuditLog('org_123');

      expect(auditLog.entries).toBeDefined();
      expect(auditLog.entries.length).toBeGreaterThan(0);
      expect(auditLog.entries[0]).toHaveProperty('operation');
      expect(auditLog.entries[0]).toHaveProperty('timestamp');
      expect(auditLog.entries[0]).toHaveProperty('userId');
      expect(auditLog.entries[0]).toHaveProperty('dataAccessed');
    });
  });
});
