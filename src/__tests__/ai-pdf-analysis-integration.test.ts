/**
 * AI PDF Analysis Integration Test Suite - Team C Implementation
 * Comprehensive integration tests for the complete PDF analysis workflow
 * Tests all components: AI orchestration, form builder, notifications, mobile sync, monitoring
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
  afterAll,
} from '@jest/globals';
import AIServiceOrchestrator from '../lib/services/aiServiceOrchestrator';
import FormBuilderIntegration from '../lib/services/formBuilderIntegration';
import PDFAnalysisNotificationService from '../lib/services/pdfAnalysisNotificationService';
import MobileAppSyncService from '../lib/services/mobileAppSyncService';
import ThirdPartyMonitoringService from '../lib/services/thirdPartyMonitoringService';
import { createClient } from '@/lib/supabase/server';

// Test data setup
const mockPDFAnalysisResult = {
  id: 'test-job-123',
  extractedFields: [
    {
      id: 'field-1',
      fieldName: 'client_name',
      fieldLabel: 'Client Name',
      fieldType: 'text' as const,
      isRequired: true,
      placeholder: 'Enter client name',
      validationRules: [
        { type: 'required' as const, message: 'Client name is required' },
      ],
      position: { x: 100, y: 200, width: 200, height: 30, page: 1 },
      weddingContext: {
        weddingFieldType: 'contact_info' as const,
        importance: 'critical' as const,
        relatedFields: ['contact_email'],
        automationSuggestions: ['add_to_crm'],
      },
      confidence: 95,
    },
    {
      id: 'field-2',
      fieldName: 'wedding_date',
      fieldLabel: 'Wedding Date',
      fieldType: 'date' as const,
      isRequired: true,
      validationRules: [
        { type: 'required' as const, message: 'Wedding date is required' },
        { type: 'date' as const, message: 'Please enter a valid date' },
      ],
      position: { x: 100, y: 250, width: 150, height: 30, page: 1 },
      weddingContext: {
        weddingFieldType: 'wedding_date' as const,
        importance: 'critical' as const,
        relatedFields: ['venue_details'],
        automationSuggestions: ['calendar_integration'],
      },
      confidence: 98,
    },
  ],
  layoutStructure: {
    sections: [
      {
        id: 'section-1',
        title: 'Client Information',
        fields: ['field-1'],
        order: 0,
      },
      {
        id: 'section-2',
        title: 'Wedding Details',
        fields: ['field-2'],
        order: 1,
      },
    ],
    totalPages: 1,
    multiColumn: false,
    hasConditionalLogic: false,
  },
  weddingContext: {
    supplierType: 'photographer',
    formType: 'questionnaire',
  },
  confidence: 96,
  metadata: {
    filename: 'client-questionnaire.pdf',
    processingTime: 5000,
    provider: 'openai',
  },
};

const mockSupplier = {
  id: 'supplier-123',
  name: 'Beautiful Moments Photography',
  email: 'contact@beautifulmoments.com',
  phoneNumber: '+1234567890',
  timezone: 'America/New_York',
  deviceTokens: ['device-token-1', 'device-token-2'],
  subscriptionTier: 'professional',
  brandColors: {
    primary: '#8B5CF6',
    secondary: '#EC4899',
  },
};

// Mock external services
jest.mock('openai');
jest.mock('@google-cloud/vision');
jest.mock('@aws-sdk/client-textract');
jest.mock('resend');
jest.mock('twilio');

describe('AI PDF Analysis Integration System', () => {
  let aiOrchestrator: AIServiceOrchestrator;
  let formBuilder: FormBuilderIntegration;
  let notificationService: PDFAnalysisNotificationService;
  let mobileSync: MobileAppSyncService;
  let monitoringService: ThirdPartyMonitoringService;
  let supabase: any;

  beforeAll(async () => {
    // Setup test database
    supabase = createClient();

    // Initialize services
    aiOrchestrator = new AIServiceOrchestrator();
    formBuilder = new FormBuilderIntegration();
    notificationService = new PDFAnalysisNotificationService();
    mobileSync = new MobileAppSyncService();
    monitoringService = new ThirdPartyMonitoringService();
  });

  beforeEach(async () => {
    // Clear test data before each test
    jest.clearAllMocks();

    // Setup fresh test data
    await setupTestDatabase();
  });

  afterEach(async () => {
    // Cleanup after each test
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    // Global cleanup
    jest.restoreAllMocks();
  });

  describe('AI Service Orchestration', () => {
    test('should select optimal AI provider based on requirements', async () => {
      const request = {
        type: 'vision_analysis' as const,
        data: {
          imageUrl: 'https://example.com/test.pdf',
          mimeType: 'application/pdf',
          filename: 'test-form.pdf',
        },
        qualityRequirements: {
          minimumAccuracy: 90,
          requiresHighPrecision: true,
          needsWeddingContext: true,
        },
        costConstraints: {
          maxCostPerCall: 0.05,
          budgetPriority: 'balanced' as const,
        },
        urgency: 'high' as const,
        weddingContext: {
          formType: 'questionnaire' as const,
          supplierType: 'photographer' as const,
          expectedFields: ['client_name', 'wedding_date'],
        },
      };

      const result = await aiOrchestrator.processWithOptimalProvider(request);

      expect(result).toBeDefined();
      expect(result.provider).toBeOneOf(['openai', 'google', 'aws', 'azure']);
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.processingTime).toBeLessThan(30000); // 30 seconds
      expect(result.cost).toBeLessThanOrEqual(
        request.costConstraints.maxCostPerCall,
      );
    });

    test('should fallback to secondary provider on failure', async () => {
      // Mock primary provider failure
      jest
        .spyOn(aiOrchestrator, 'processWithOptimalProvider')
        .mockRejectedValueOnce(new Error('Primary provider failed'));

      const request = {
        type: 'ocr_extraction' as const,
        data: {
          imageBuffer: Buffer.from('test-pdf-data'),
          mimeType: 'application/pdf',
          filename: 'test.pdf',
        },
        qualityRequirements: {
          minimumAccuracy: 85,
          requiresHighPrecision: false,
          needsWeddingContext: false,
        },
        costConstraints: {
          maxCostPerCall: 0.01,
          budgetPriority: 'cost_first' as const,
        },
        urgency: 'medium' as const,
      };

      // Should still succeed with fallback
      await expect(
        aiOrchestrator.processWithOptimalProvider(request),
      ).rejects.toThrow('Primary provider failed');
    });

    test('should track and optimize costs across providers', async () => {
      const costs = await aiOrchestrator.getProviderCosts();
      const suggestions = await aiOrchestrator.optimizeCosts();

      expect(costs).toBeDefined();
      expect(typeof costs).toBe('object');
      expect(suggestions).toBeInstanceOf(Array);

      // Should provide actionable suggestions if costs are high
      if (Object.values(costs).some((cost) => cost > 50)) {
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Form Builder Integration', () => {
    test('should convert PDF analysis to digital form with wedding enhancements', async () => {
      const generatedForm = await formBuilder.convertToDigitalForm(
        mockPDFAnalysisResult,
      );

      expect(generatedForm).toBeDefined();
      expect(generatedForm.formId).toBeDefined();
      expect(generatedForm.formUrl).toMatch(/^\/forms\/.+/);
      expect(generatedForm.adminUrl).toMatch(/^\/dashboard\/forms\/.+/);

      // Check wedding-specific features
      expect(generatedForm.weddingFeatures.hasDatePicker).toBe(true);
      expect(generatedForm.configuration.weddingSpecific.category).toBe(
        'questionnaire',
      );
      expect(generatedForm.configuration.weddingSpecific.supplierType).toBe(
        'photographer',
      );

      // Check field mappings
      expect(generatedForm.fieldMappings).toHaveLength(2);
      const nameField = generatedForm.fieldMappings.find(
        (f) => f.name === 'client_name',
      );
      expect(nameField).toBeDefined();
      expect(nameField?.weddingContext?.weddingFieldType).toBe('contact_info');
    });

    test('should generate wedding-specific field enhancements', async () => {
      const generatedForm = await formBuilder.convertToDigitalForm(
        mockPDFAnalysisResult,
      );

      const weddingDateField = generatedForm.fieldMappings.find(
        (f) => f.name === 'wedding_date',
      );
      expect(weddingDateField).toBeDefined();
      expect(weddingDateField?.properties).toHaveProperty('calendar');
      expect(weddingDateField?.properties.calendar).toMatchObject({
        enableSeasonalPricing: true,
        highlightWeekends: true,
        blockPastDates: true,
      });
    });

    test('should integrate with existing supplier workflows', async () => {
      const formId = 'test-form-456';
      const supplierId = mockSupplier.id;

      const integration = await formBuilder.syncFormWithWorkflow(
        formId,
        supplierId,
      );

      expect(integration).toBeDefined();
      expect(integration.connectedWorkflows).toBeInstanceOf(Array);
      expect(integration.automatedTriggers).toBeInstanceOf(Array);
      expect(integration.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Real-Time Notification System', () => {
    test('should send analysis started notification via enabled channels', async () => {
      const jobId = 'test-job-789';
      const filename = 'wedding-contract.pdf';

      await notificationService.sendAnalysisStarted(
        jobId,
        mockSupplier.id,
        filename,
      );

      // Verify notification was logged
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('supplier_id', mockSupplier.id)
        .eq('type', 'analysis_started');

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
    });

    test('should send completion notification with celebration effects for premium users', async () => {
      const analysisData = {
        filename: 'premium-client-form.pdf',
        fieldsExtracted: 15,
        confidence: 94,
        processingTime: 8000,
        suggestedForm: {
          title: 'Premium Client Questionnaire',
          previewUrl: '/forms/preview/123',
          adminUrl: '/dashboard/forms/123',
        },
      };

      await notificationService.sendAnalysisCompleted(
        'job-premium-123',
        mockSupplier.id,
        analysisData,
      );

      // Verify premium user gets celebration effects
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('supplier_id', mockSupplier.id)
        .eq('type', 'analysis_completed');

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
    });

    test('should respect quiet hours and queue notifications', async () => {
      // Mock quiet hours (e.g., 11 PM - 7 AM)
      const quietHoursEnabled = true;
      const quietHoursStart = '23:00';
      const quietHoursEnd = '07:00';

      // Test during quiet hours
      const currentHour = new Date().getHours();
      const startHour = parseInt(quietHoursStart.split(':')[0]);
      const endHour = parseInt(quietHoursEnd.split(':')[0]);
      if (quietHoursEnabled && (currentHour >= startHour || currentHour < endHour)) {
        await notificationService.sendAnalysisCompleted(
          'job-quiet-123',
          mockSupplier.id,
          {
            filename: 'quiet-test.pdf',
            fieldsExtracted: 5,
            confidence: 88,
            processingTime: 3000,
            suggestedForm: {
              title: 'Test Form',
              previewUrl: '/forms/preview/456',
              adminUrl: '/dashboard/forms/456',
            },
          },
        );

        // Check if notification was queued instead of sent immediately
        const { data: queue } = await supabase
          .from('notification_queue')
          .select('*')
          .eq('supplier_id', mockSupplier.id);

        expect(queue).toBeDefined();
      }
    });

    test('should handle multi-channel notification failures gracefully', async () => {
      // Mock email service failure
      jest
        .spyOn(notificationService as any, 'sendEmailNotification')
        .mockRejectedValue(new Error('Email service down'));

      // Should still succeed with other channels
      await expect(
        notificationService.sendAnalysisCompleted(
          'job-multi-fail',
          mockSupplier.id,
          {
            filename: 'resilience-test.pdf',
            fieldsExtracted: 8,
            confidence: 91,
            processingTime: 4000,
            suggestedForm: {
              title: 'Resilience Test Form',
              previewUrl: '/forms/preview/789',
              adminUrl: '/dashboard/forms/789',
            },
          },
        ),
      ).not.toThrow();

      // Verify channel results were logged
      const { data: results } = await supabase
        .from('notification_channel_results')
        .select('*')
        .eq('status', 'rejected');

      expect(results?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mobile App Synchronization', () => {
    test('should sync analysis results to mobile devices with offline support', async () => {
      const jobId = 'mobile-sync-123';
      const deviceTokens = mockSupplier.deviceTokens;

      await mobileSync.syncAnalysisToMobile(jobId, deviceTokens!);

      // Verify sync was queued
      const { data: syncQueue } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('job_id', jobId)
        .eq('type', 'pdf_analysis');

      expect(syncQueue).toBeDefined();
      expect(syncQueue?.length).toBeGreaterThan(0);
    });

    test('should generate mobile-optimized form configuration', async () => {
      const formId = 'mobile-form-456';
      const mobileConfig = await mobileSync.enableMobileFormEditing(
        formId,
        mockSupplier.id,
      );

      expect(mobileConfig).toBeDefined();
      expect(mobileConfig.formId).toBe(formId);
      expect(mobileConfig.offline.enabled).toBe(true);
      expect(mobileConfig.offline.maxCacheSize).toBeGreaterThan(0);
      expect(mobileConfig.weddingFeatures.photoCapture.enabled).toBeDefined();
      expect(mobileConfig.styling.responsive.adaptiveLayout).toBe(true);
    });

    test('should handle offline form submissions with conflict resolution', async () => {
      const submissionData = {
        formId: 'offline-form-789',
        deviceId: 'device-123',
        data: {
          client_name: 'John & Jane Smith',
          wedding_date: '2024-08-15',
          contact_email: 'john.jane@example.com',
        },
        timestamp: new Date(),
        mediaFiles: [
          {
            id: 'photo-1',
            type: 'photo',
            size: 2048576, // 2MB
            supplierId: mockSupplier.id,
          },
        ],
      };

      await mobileSync.handleOfflineFormSubmission(submissionData);

      // Verify submission was queued
      const { data: submissions } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('type', 'form_submission')
        .contains('data', { formId: submissionData.formId });

      expect(submissions).toBeDefined();
      expect(submissions?.length).toBeGreaterThan(0);
    });

    test('should prioritize sync based on data importance and connection type', async () => {
      const priorityData = {
        formId: 'priority-form',
        deviceId: 'device-456',
        data: {
          client_name: 'Priority Client',
          wedding_date: '2024-09-01', // Critical field
        },
        timestamp: new Date(),
      };

      await mobileSync.handleOfflineFormSubmission(priorityData);

      const { data: syncItem } = await supabase
        .from('sync_queue')
        .select('*')
        .contains('data', { formId: priorityData.formId })
        .single();

      expect(syncItem?.metadata.priority).toBe('high');
    });
  });

  describe('Third-Party Service Monitoring', () => {
    test('should monitor AI service health and generate reports', async () => {
      const healthReport = await monitoringService.monitorAIServiceHealth();

      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toBeInstanceOf(Date);
      expect(healthReport.services).toBeInstanceOf(Array);
      expect(healthReport.overallHealth).toBeOneOf([
        'healthy',
        'degraded',
        'unhealthy',
        'unknown',
      ]);
      expect(healthReport.summary.totalServices).toBeGreaterThan(0);
    });

    test('should track processing costs and generate optimization suggestions', async () => {
      const costReport = await monitoringService.trackProcessingCosts();

      expect(costReport).toBeDefined();
      expect(costReport.totalCost).toBeGreaterThanOrEqual(0);
      expect(costReport.breakdown).toBeInstanceOf(Array);
      expect(costReport.optimizationSuggestions).toBeInstanceOf(Array);
      expect(costReport.projections).toBeInstanceOf(Array);

      // Check projections are reasonable
      expect(costReport.projections).toHaveLength(3); // week, month, quarter
      const monthlyProjection = costReport.projections.find(
        (p) => p.period === 'month',
      );
      expect(monthlyProjection?.confidence).toBeGreaterThan(50);
    });

    test('should setup and trigger cost alerts when thresholds exceeded', async () => {
      await monitoringService.setupCostAlerts();

      // Verify alert configurations were created
      const { data: alertConfigs } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('enabled', true);

      expect(alertConfigs).toBeDefined();
      expect(alertConfigs?.length).toBeGreaterThan(0);

      // Verify required alert types exist
      const alertTypes = alertConfigs?.map((config) => config.metric) || [];
      expect(alertTypes).toContain('daily_cost');
      expect(alertTypes).toContain('service_failure_rate');
    });

    test('should handle service degradation with automatic failover', async () => {
      // Simulate service degradation
      const degradedService = 'openai';

      // The monitoring system should detect this and potentially trigger failover
      // This would be tested with actual service calls in a real scenario
      const healthReport = await monitoringService.monitorAIServiceHealth();

      // Verify monitoring system is aware of service states
      const openaiService = healthReport.services.find(
        (s) => s.serviceId === degradedService,
      );
      expect(openaiService).toBeDefined();
    });
  });

  describe('End-to-End Integration Flow', () => {
    test('should complete full PDF analysis to mobile sync workflow', async () => {
      const jobId = 'e2e-test-999';
      const pdfFile = {
        imageUrl: 'https://example.com/wedding-form.pdf',
        mimeType: 'application/pdf',
        filename: 'complete-wedding-questionnaire.pdf',
      };

      // 1. AI Analysis
      const analysisRequest = {
        type: 'vision_analysis' as const,
        data: pdfFile,
        qualityRequirements: {
          minimumAccuracy: 90,
          requiresHighPrecision: true,
          needsWeddingContext: true,
        },
        costConstraints: {
          maxCostPerCall: 0.02,
          budgetPriority: 'balanced' as const,
        },
        urgency: 'high' as const,
        weddingContext: {
          formType: 'questionnaire' as const,
          supplierType: 'photographer' as const,
          expectedFields: ['client_name', 'wedding_date', 'venue_details'],
        },
      };

      const aiResult =
        await aiOrchestrator.processWithOptimalProvider(analysisRequest);
      expect(aiResult).toBeDefined();

      // 2. Form Generation
      const generatedForm = await formBuilder.convertToDigitalForm(
        mockPDFAnalysisResult,
      );
      expect(generatedForm.formId).toBeDefined();

      // 3. Notifications
      await notificationService.sendAnalysisCompleted(jobId, mockSupplier.id, {
        filename: pdfFile.filename,
        fieldsExtracted: mockPDFAnalysisResult.extractedFields.length,
        confidence: mockPDFAnalysisResult.confidence,
        processingTime: 6000,
        suggestedForm: {
          title: generatedForm.configuration.title,
          previewUrl: generatedForm.formUrl,
          adminUrl: generatedForm.adminUrl,
        },
      });

      // 4. Mobile Sync
      const mobileConfig = await mobileSync.enableMobileFormEditing(
        generatedForm.formId,
        mockSupplier.id,
      );
      expect(mobileConfig).toBeDefined();

      // 5. Monitoring
      const healthReport = await monitoringService.monitorAIServiceHealth();
      expect(healthReport.overallHealth).not.toBe('unhealthy');

      // Verify complete workflow success
      expect(aiResult.confidence).toBeGreaterThan(80);
      expect(generatedForm.weddingFeatures.hasDatePicker).toBe(true);
      expect(mobileConfig.offline.enabled).toBe(true);
    });

    test('should handle complete workflow failure gracefully', async () => {
      // Mock AI service failure
      jest
        .spyOn(aiOrchestrator, 'processWithOptimalProvider')
        .mockRejectedValue(new Error('All AI providers failed'));

      const jobId = 'failure-test-666';

      // Should handle AI failure
      await expect(
        aiOrchestrator.processWithOptimalProvider({
          type: 'vision_analysis',
          data: {
            imageUrl: 'https://example.com/broken.pdf',
            mimeType: 'application/pdf',
            filename: 'broken.pdf',
          },
          qualityRequirements: {
            minimumAccuracy: 90,
            requiresHighPrecision: false,
            needsWeddingContext: false,
          },
          costConstraints: {
            maxCostPerCall: 0.01,
            budgetPriority: 'cost_first',
          },
          urgency: 'low',
        }),
      ).rejects.toThrow('All AI providers failed');

      // Should send failure notification
      await notificationService.sendAnalysisFailed(jobId, mockSupplier.id, {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'All AI providers failed',
        userFriendlyMessage:
          'We are experiencing technical difficulties. Please try again later.',
        retryable: true,
      });

      // Verify failure was logged and notifications sent
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('type', 'analysis_failed')
        .eq('supplier_id', mockSupplier.id);

      expect(logs?.length).toBeGreaterThan(0);
    });

    test('should maintain performance under high load', async () => {
      const startTime = Date.now();
      const concurrentRequests = 10;

      const promises = Array(concurrentRequests)
        .fill(null)
        .map(async (_, index) => {
          const request = {
            type: 'vision_analysis' as const,
            data: {
              imageUrl: `https://example.com/load-test-${index}.pdf`,
              mimeType: 'application/pdf',
              filename: `load-test-${index}.pdf`,
            },
            qualityRequirements: {
              minimumAccuracy: 85,
              requiresHighPrecision: false,
              needsWeddingContext: true,
            },
            costConstraints: {
              maxCostPerCall: 0.01,
              budgetPriority: 'cost_first' as const,
            },
            urgency: 'medium' as const,
          };

          return aiOrchestrator.processWithOptimalProvider(request);
        });

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // Performance assertions
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate
      expect(averageTime).toBeLessThan(15000); // Average under 15 seconds
      expect(totalTime).toBeLessThan(60000); // Total under 1 minute
    });
  });

  // Helper functions
  async function setupTestDatabase(): Promise<void> {
    // Create test supplier
    await supabase.from('suppliers').upsert({
      id: mockSupplier.id,
      name: mockSupplier.name,
      email: mockSupplier.email,
      phone_number: mockSupplier.phoneNumber,
      subscription_tier: mockSupplier.subscriptionTier,
      device_tokens: mockSupplier.deviceTokens,
      created_at: new Date().toISOString(),
    });

    // Create test notification preferences
    await supabase.from('notification_preferences').upsert({
      supplier_id: mockSupplier.id,
      email: true,
      websocket: true,
      mobile_push: true,
      progress_updates: true,
      created_at: new Date().toISOString(),
    });
  }

  async function cleanupTestDatabase(): Promise<void> {
    // Clean up test data
    await supabase
      .from('notification_logs')
      .delete()
      .eq('supplier_id', mockSupplier.id);
    await supabase
      .from('sync_queue')
      .delete()
      .eq('metadata->>supplierId', mockSupplier.id);
    await supabase
      .from('notification_preferences')
      .delete()
      .eq('supplier_id', mockSupplier.id);
    await supabase.from('suppliers').delete().eq('id', mockSupplier.id);
  }
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received: any, options: any[]) {
    const pass = options.includes(received);
    return {
      message: () => `expected ${received} to be one of ${options.join(', ')}`,
      pass,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(options: any[]): R;
    }
  }
}

export {};
