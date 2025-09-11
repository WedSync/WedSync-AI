/**
 * WS-339 Performance Monitoring System - APM Integration Tests
 * Comprehensive testing for wedding-specific APM integration
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { APMIntegrationService } from '../apm-integration';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock fetch for APM providers
global.fetch = vi.fn();

describe('APM Integration Service', () => {
  let apmService: APMIntegrationService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null })),
            order: vi.fn(() => ({ data: [] })),
            limit: vi.fn(() => ({ data: [] })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        rpc: vi.fn(() => Promise.resolve({ error: null })),
      })),
    };

    (createClient as Mock).mockReturnValue(mockSupabase);
    apmService = new APMIntegrationService();
    vi.clearAllMocks();
  });

  describe('Wedding Form Performance Tracking', () => {
    it('should track wedding form submission with wedding context', async () => {
      const organizationId = 'org-123';
      const formData = {
        formType: 'client_intake',
        formId: 'form-456',
        clientName: 'John & Jane Smith',
        weddingDate: '2025-06-15',
        responseTime: 1500,
        success: true,
      };

      // Mock organization type lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { industry: 'photography' },
            })),
          })),
        })),
      });

      const result = await apmService.trackWeddingFormPerformance(
        organizationId,
        formData,
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBe(1500);

      // Verify metric was stored in database
      expect(mockSupabase.from).toHaveBeenCalledWith('apm_performance_metrics');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          service_name: 'wedding_forms',
          metric_name: 'form_submission_time',
          metric_value: 1500,
          wedding_context: expect.objectContaining({
            wedding_date: '2025-06-15',
            vendor_type: 'photographer',
            couple_names: 'John & Jane Smith',
          }),
        }),
      );
    });

    it('should mark wedding day forms as critical', async () => {
      const organizationId = 'org-123';
      const today = new Date().toISOString().split('T')[0];

      const formData = {
        formType: 'urgent_change',
        formId: 'form-789',
        clientName: 'Emergency Client',
        weddingDate: today, // Today is wedding day
        responseTime: 800,
        success: true,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { industry: 'photography' },
            })),
          })),
        })),
      });

      await apmService.trackWeddingFormPerformance(organizationId, formData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            is_wedding_day: true,
            criticality_level: 'critical',
          }),
        }),
      );
    });
  });

  describe('Wedding Photo Upload Performance', () => {
    it('should track photo upload with wedding context', async () => {
      const organizationId = 'org-123';
      const uploadData = {
        fileName: 'wedding-photo-001.jpg',
        fileSize: 5242880, // 5MB
        uploadTime: 3000,
        success: true,
        weddingDate: '2025-06-15',
        clientName: 'John & Jane Smith',
        cdn_region: 'us-east-1',
      };

      await apmService.trackPhotoUploadPerformance(organizationId, uploadData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          service_name: 'wedding_photos',
          metric_name: 'photo_upload_time',
          metric_value: 3000,
          tags: expect.objectContaining({
            file_size_mb: 5,
            success: true,
            cdn_region: 'us-east-1',
            file_size_tier: 'medium',
          }),
          wedding_context: expect.objectContaining({
            vendor_type: 'photographer',
            criticality_level: 'high',
          }),
        }),
      );
    });

    it('should categorize file sizes correctly', async () => {
      const testCases = [
        { size: 500 * 1024, expectedTier: 'small' }, // 500KB
        { size: 5 * 1024 * 1024, expectedTier: 'medium' }, // 5MB
        { size: 25 * 1024 * 1024, expectedTier: 'large' }, // 25MB
        { size: 100 * 1024 * 1024, expectedTier: 'xl' }, // 100MB
      ];

      for (const testCase of testCases) {
        await apmService.trackPhotoUploadPerformance('org-123', {
          fileName: 'test.jpg',
          fileSize: testCase.size,
          uploadTime: 1000,
          success: true,
        });

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expect.objectContaining({
              file_size_tier: testCase.expectedTier,
            }),
          }),
        );
      }
    });
  });

  describe('Payment Processing Performance', () => {
    it('should track payment processing with critical priority', async () => {
      const organizationId = 'org-123';
      const paymentData = {
        amount: 50000, // £500
        processingTime: 2000,
        success: true,
        provider: 'stripe' as const,
        weddingDate: '2025-06-15',
        clientName: 'John & Jane Smith',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { industry: 'photography' },
            })),
          })),
        })),
      });

      await apmService.trackPaymentProcessing(organizationId, paymentData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          service_name: 'wedding_payments',
          metric_name: 'payment_processing_time',
          wedding_context: expect.objectContaining({
            criticality_level: 'critical',
          }),
          tags: expect.objectContaining({
            amount_tier: 'large',
            provider: 'stripe',
            currency: 'GBP',
          }),
        }),
      );
    });
  });

  describe('Client Communication Performance', () => {
    it('should track communication with appropriate criticality', async () => {
      const organizationId = 'org-123';
      const today = new Date().toISOString().split('T')[0];

      const communicationData = {
        type: 'email' as const,
        responseTime: 500,
        success: true,
        weddingDate: today, // Wedding day
        clientName: 'John & Jane Smith',
        urgency: 'urgent' as const,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { industry: 'photography' },
            })),
          })),
        })),
      });

      await apmService.trackClientCommunication(
        organizationId,
        communicationData,
      );

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          service_name: 'client_communications',
          wedding_context: expect.objectContaining({
            criticality_level: 'critical', // Wedding day + urgent = critical
          }),
        }),
      );
    });
  });

  describe('APM Provider Integration', () => {
    it('should send metrics to Datadog when configured', async () => {
      // Mock configuration
      const mockConfig = {
        organization_id: 'org-123',
        provider: 'datadog',
        config: {
          api_key: 'test-api-key',
          app_key: 'test-app-key',
        },
      };

      // Mock the configuration loading
      (apmService as any).configurations.set('org-123-datadog', mockConfig);

      const metric = {
        service_name: 'test_service',
        metric_name: 'test_metric',
        metric_value: 100,
        metric_type: 'gauge' as const,
        tags: { test: 'value' },
        wedding_context: { is_wedding_day: true },
        apm_source: 'custom' as const,
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      await (apmService as any).sendToAPMProviders('org-123', metric);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v1/series',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'DD-API-KEY': 'test-api-key',
            'DD-APPLICATION-KEY': 'test-app-key',
          }),
        }),
      );
    });

    it('should send metrics to New Relic when configured', async () => {
      const mockConfig = {
        organization_id: 'org-123',
        provider: 'newrelic',
        config: {
          license_key: 'test-license-key',
        },
      };

      (apmService as any).configurations.set('org-123-newrelic', mockConfig);

      const metric = {
        service_name: 'test_service',
        metric_name: 'test_metric',
        metric_value: 100,
        metric_type: 'gauge' as const,
        wedding_context: { is_wedding_day: true },
        amp_source: 'custom' as const,
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await (apmService as any).sendToAPMProviders('org-123', metric);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('insights-collector.newrelic.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Insert-Key': 'test-license-key',
          }),
        }),
      );
    });
  });

  describe('Alert Processing', () => {
    it('should trigger alerts when thresholds are exceeded', async () => {
      const organizationId = 'org-123';

      // Mock alert configuration
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [
                {
                  id: 'alert-123',
                  alert_name: 'High Response Time',
                  metric_pattern: 'wedding_forms.*',
                  threshold_value: 1000,
                  comparison_operator: 'gt',
                  severity: 'warning',
                  wedding_day_override: true,
                  wedding_day_threshold_value: 500,
                },
              ],
            })),
          })),
        })),
      });

      const metric = {
        service_name: 'wedding_forms',
        metric_name: 'form_submission_time',
        metric_value: 1500,
        metric_type: 'timer' as const,
        wedding_context: { is_wedding_day: true },
        apm_source: 'custom' as const,
      };

      await (apmService as any).checkAlertThresholds(organizationId, metric);

      // Should create alert incident with wedding day threshold (500ms instead of 1000ms)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_id: 'alert-123',
          metric_value: 1500,
          threshold_value: 500, // Wedding day threshold used
          was_wedding_day: true,
        }),
      );
    });

    it('should use regular thresholds on non-wedding days', async () => {
      const organizationId = 'org-123';

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [
                {
                  id: 'alert-123',
                  alert_name: 'High Response Time',
                  metric_pattern: 'wedding_forms.*',
                  threshold_value: 1000,
                  comparison_operator: 'gt',
                  severity: 'warning',
                  wedding_day_override: true,
                  wedding_day_threshold_value: 500,
                },
              ],
            })),
          })),
        })),
      });

      const metric = {
        service_name: 'wedding_forms',
        metric_name: 'form_submission_time',
        metric_value: 1500,
        metric_type: 'timer' as const,
        wedding_context: { is_wedding_day: false },
        apm_source: 'custom' as const,
      };

      await (apmService as any).checkAlertThresholds(organizationId, metric);

      // Should use regular threshold (1000ms)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold_value: 1000, // Regular threshold used
          was_wedding_day: false,
        }),
      );
    });
  });

  describe('Utility Functions', () => {
    it('should categorize file sizes correctly', () => {
      expect((apmService as any).getFileSizeTier(500 * 1024)).toBe('small');
      expect((apmService as any).getFileSizeTier(5 * 1024 * 1024)).toBe(
        'medium',
      );
      expect((apmService as any).getFileSizeTier(25 * 1024 * 1024)).toBe(
        'large',
      );
      expect((apmService as any).getFileSizeTier(100 * 1024 * 1024)).toBe('xl');
    });

    it('should categorize payment amounts correctly', () => {
      expect((apmService as any).getAmountTier(2500)).toBe('small'); // £25
      expect((apmService as any).getAmountTier(10000)).toBe('medium'); // £100
      expect((apmService as any).getAmountTier(50000)).toBe('large'); // £500
      expect((apmService as any).getAmountTier(200000)).toBe('enterprise'); // £2000
    });

    it('should determine communication criticality correctly', () => {
      const today = new Date().toISOString().split('T')[0];

      expect(
        (apmService as any).getCommunicationCriticality('urgent', today),
      ).toBe('critical');
      expect(
        (apmService as any).getCommunicationCriticality('high', '2025-06-15'),
      ).toBe('high');
      expect(
        (apmService as any).getCommunicationCriticality('normal', '2025-06-15'),
      ).toBe('medium');
      expect(
        (apmService as any).getCommunicationCriticality('urgent', '2025-06-15'),
      ).toBe('critical');
    });

    it('should match metric patterns correctly', () => {
      const metric = {
        service_name: 'wedding_forms',
        metric_name: 'submission_time',
      };

      expect(
        (apmService as any).metricMatchesPattern(metric, 'wedding_forms.*'),
      ).toBe(true);
      expect(
        (apmService as any).metricMatchesPattern(metric, 'wedding_.*'),
      ).toBe(true);
      expect(
        (apmService as any).metricMatchesPattern(metric, 'payment.*'),
      ).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle APM provider failures gracefully', async () => {
      (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      const metric = {
        service_name: 'test_service',
        metric_name: 'test_metric',
        metric_value: 100,
        metric_type: 'gauge' as const,
        apm_source: 'custom' as const,
      };

      // Should not throw error
      expect(() =>
        (apmService as any).sendToAPMProviders('org-123', metric),
      ).not.toThrow();
    });

    it('should handle database insertion failures', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => Promise.reject(new Error('Database error'))),
      });

      await expect(
        apmService.trackWeddingFormPerformance('org-123', {
          formType: 'test',
          formId: 'test',
          responseTime: 1000,
          success: true,
        }),
      ).rejects.toThrow('Database error');
    });
  });
});
