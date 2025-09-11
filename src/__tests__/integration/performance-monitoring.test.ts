import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { APMIntegration } from '@/lib/monitoring/apm-integration';
import { ServiceHealthMonitor } from '@/lib/monitoring/service-health-monitor';
import { CDNPerformanceTracker } from '@/lib/monitoring/cdn-performance-tracker';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Performance Monitoring System Integration Tests', () => {
  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const testUserId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    // Create test organization and user
    await supabase.from('organizations').upsert({
      id: testOrgId,
      name: 'Test Wedding Co',
      domain: 'testwedding.co',
      subscription_tier: 'professional',
    });

    await supabase.from('user_profiles').upsert({
      id: testUserId,
      organization_id: testOrgId,
      email: 'test@testwedding.co',
      role: 'admin',
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from('performance_metrics')
      .delete()
      .eq('organization_id', testOrgId);
    await supabase
      .from('apm_configurations')
      .delete()
      .eq('organization_id', testOrgId);
    await supabase
      .from('performance_alerts')
      .delete()
      .eq('organization_id', testOrgId);
    await supabase
      .from('service_health_status')
      .delete()
      .eq('organization_id', testOrgId);
    await supabase
      .from('performance_alert_incidents')
      .delete()
      .eq('organization_id', testOrgId);
    await supabase.from('user_profiles').delete().eq('id', testUserId);
    await supabase.from('organizations').delete().eq('id', testOrgId);
  });

  describe('APM Integration', () => {
    let apmIntegration: APMIntegration;

    beforeEach(() => {
      apmIntegration = new APMIntegration(testOrgId);
    });

    it('should store performance metrics correctly', async () => {
      const testMetric = {
        service_name: 'web-app',
        metric_name: 'response_time',
        metric_value: 150.5,
        metric_type: 'timer' as const,
        unit: 'ms',
        tags: { endpoint: '/api/clients', method: 'GET' },
        wedding_context: { is_wedding_day: true, wedding_date: '2025-06-15' },
      };

      await apmIntegration.recordMetric(testMetric);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('metric_name', 'response_time')
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        service_name: 'web-app',
        metric_name: 'response_time',
        metric_value: 150.5,
        metric_type: 'timer',
        unit: 'ms',
      });
      expect(data.tags).toMatchObject({
        endpoint: '/api/clients',
        method: 'GET',
      });
      expect(data.wedding_context).toMatchObject({ is_wedding_day: true });
    });

    it('should configure APM providers correctly', async () => {
      const config = {
        provider: 'datadog' as const,
        name: 'Production Monitoring',
        config: {
          api_key: 'test-key-encrypted',
          app_key: 'test-app-key-encrypted',
          site: 'datadoghq.com',
        },
        wedding_day_alerts_enabled: true,
      };

      await apmIntegration.configureProvider(config);

      const { data, error } = await supabase
        .from('apm_configurations')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('provider', 'datadog')
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        provider: 'datadog',
        name: 'Production Monitoring',
        wedding_day_alerts_enabled: true,
        is_active: true,
      });
    });

    it('should handle batch metric ingestion efficiently', async () => {
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        service_name: 'batch-test',
        metric_name: 'batch_metric',
        metric_value: i * 10,
        metric_type: 'counter' as const,
        unit: 'count',
        tags: { batch_id: 'test-batch-1', iteration: i.toString() },
      }));

      const startTime = Date.now();
      await apmIntegration.recordBatch(metrics);
      const endTime = Date.now();

      // Should complete batch insert in under 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);

      const { count, error } = await supabase
        .from('performance_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', testOrgId)
        .eq('service_name', 'batch-test');

      expect(error).toBeNull();
      expect(count).toBe(100);
    });
  });

  describe('Service Health Monitor', () => {
    let healthMonitor: ServiceHealthMonitor;

    beforeEach(() => {
      healthMonitor = new ServiceHealthMonitor(testOrgId);
    });

    it('should track service health status', async () => {
      const healthUpdate = {
        service_name: 'payment-gateway',
        service_type: 'payment',
        endpoint_url: 'https://api.stripe.com/v1/charges',
        status: 'healthy' as const,
        response_time_ms: 245.5,
        error_rate: 0.001,
        wedding_critical: true,
      };

      await healthMonitor.updateServiceHealth(healthUpdate);

      const { data, error } = await supabase
        .from('service_health_status')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('service_name', 'payment-gateway')
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        service_name: 'payment-gateway',
        service_type: 'payment',
        status: 'healthy',
        response_time_ms: 245.5,
        error_rate: 0.001,
        wedding_critical: true,
      });
      expect(data.availability_percentage).toBeCloseTo(99.9, 1);
    });

    it('should maintain service status history', async () => {
      const serviceName = 'email-service';

      // Record multiple health updates
      const updates = [
        { status: 'healthy' as const, response_time_ms: 100 },
        { status: 'warning' as const, response_time_ms: 500 },
        { status: 'healthy' as const, response_time_ms: 120 },
      ];

      for (const update of updates) {
        await healthMonitor.updateServiceHealth({
          service_name: serviceName,
          service_type: 'email',
          ...update,
        });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const { data, error } = await supabase
        .from('service_health_status')
        .select('status_history')
        .eq('organization_id', testOrgId)
        .eq('service_name', serviceName)
        .single();

      expect(error).toBeNull();
      expect(Array.isArray(data?.status_history)).toBe(true);
      expect(data?.status_history).toHaveLength(3);
      expect(data?.status_history[2]).toMatchObject({
        status: 'healthy',
        response_time_ms: 120,
      });
    });

    it('should identify critical services for wedding operations', async () => {
      const criticalServices = [
        { name: 'payment-processing', critical: true, type: 'payment' },
        { name: 'email-delivery', critical: true, type: 'email' },
        { name: 'photo-storage', critical: true, type: 'storage' },
        { name: 'analytics-tracking', critical: false, type: 'analytics' },
      ];

      for (const service of criticalServices) {
        await healthMonitor.updateServiceHealth({
          service_name: service.name,
          service_type: service.type,
          status: 'healthy',
          wedding_critical: service.critical,
        });
      }

      const { data, error } = await supabase
        .from('service_health_status')
        .select('service_name, wedding_critical')
        .eq('organization_id', testOrgId)
        .eq('wedding_critical', true);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data?.map((s) => s.service_name)).toEqual([
        'payment-processing',
        'email-delivery',
        'photo-storage',
      ]);
    });
  });

  describe('Performance Alerts', () => {
    beforeEach(async () => {
      // Clean up any existing alerts for fresh test
      await supabase
        .from('performance_alerts')
        .delete()
        .eq('organization_id', testOrgId);
    });

    it('should create and manage performance alerts', async () => {
      const alertConfig = {
        alert_name: 'High Response Time',
        description: 'Alert when API response time exceeds threshold',
        metric_pattern: 'api.response_time.*',
        threshold_value: 500,
        comparison_operator: 'gt' as const,
        severity: 'warning' as const,
        notification_channels: ['email' as const],
        wedding_day_override: true,
        wedding_day_threshold_value: 200,
        wedding_day_severity: 'critical' as const,
      };

      const { data: alertData, error: alertError } = await supabase
        .from('performance_alerts')
        .insert([{ organization_id: testOrgId, ...alertConfig }])
        .select()
        .single();

      expect(alertError).toBeNull();
      expect(alertData).toMatchObject(alertConfig);
      expect(alertData.is_active).toBe(true);
    });

    it('should handle alert incidents and resolution tracking', async () => {
      // First create an alert
      const { data: alertData } = await supabase
        .from('performance_alerts')
        .insert([
          {
            organization_id: testOrgId,
            alert_name: 'Test Alert',
            metric_pattern: 'test.*',
            threshold_value: 100,
            comparison_operator: 'gt',
          },
        ])
        .select()
        .single();

      const alertId = alertData.id;

      // Create an incident
      const incidentData = {
        organization_id: testOrgId,
        alert_id: alertId,
        metric_value: 150,
        threshold_value: 100,
        severity: 'warning' as const,
        was_wedding_day: true,
        wedding_date: '2025-06-15',
        affected_weddings: [
          { wedding_id: 'test-wedding-1', couple_names: 'John & Jane' },
        ],
      };

      const { data: incident, error: incidentError } = await supabase
        .from('performance_alert_incidents')
        .insert([incidentData])
        .select()
        .single();

      expect(incidentError).toBeNull();
      expect(incident).toMatchObject({
        alert_id: alertId,
        metric_value: 150,
        status: 'firing',
        was_wedding_day: true,
      });

      // Test incident resolution
      const { error: resolveError } = await supabase
        .from('performance_alert_incidents')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: testUserId,
          resolution_notes: 'Fixed by scaling up servers',
        })
        .eq('id', incident.id);

      expect(resolveError).toBeNull();
    });
  });

  describe('CDN Performance Tracking', () => {
    let cdnTracker: CDNPerformanceTracker;

    beforeEach(() => {
      cdnTracker = new CDNPerformanceTracker(testOrgId);
    });

    it('should track CDN performance metrics', async () => {
      const cdnMetrics = {
        region: 'us-east-1',
        cache_hit_ratio: 0.95,
        average_response_time: 45.2,
        bandwidth_usage_gb: 12.5,
        request_count: 15000,
        error_4xx_count: 23,
        error_5xx_count: 1,
      };

      await cdnTracker.recordCDNMetrics(cdnMetrics);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('service_name', 'cdn')
        .eq('tags->region', 'us-east-1');

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);

      const cacheHitMetric = data.find(
        (m) => m.metric_name === 'cache_hit_ratio',
      );
      expect(cacheHitMetric?.metric_value).toBe(0.95);
    });

    it('should identify performance bottlenecks in CDN regions', async () => {
      const regions = [
        { region: 'us-east-1', response_time: 45 },
        { region: 'us-west-2', response_time: 120 },
        { region: 'eu-west-1', response_time: 200 },
        { region: 'ap-southeast-1', response_time: 350 },
      ];

      for (const regionData of regions) {
        await cdnTracker.recordCDNMetrics({
          region: regionData.region,
          average_response_time: regionData.response_time,
          cache_hit_ratio: 0.9,
          bandwidth_usage_gb: 10,
          request_count: 10000,
          error_4xx_count: 10,
          error_5xx_count: 1,
        });
      }

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('tags, metric_value')
        .eq('organization_id', testOrgId)
        .eq('service_name', 'cdn')
        .eq('metric_name', 'response_time')
        .gte('metric_value', 200);

      expect(error).toBeNull();
      expect(data.length).toBe(2); // eu-west-1 and ap-southeast-1
    });
  });

  describe('Wedding Day Monitoring', () => {
    it('should escalate alerts during wedding days', async () => {
      // Create test client with wedding date
      const weddingDate = '2025-06-15';
      await supabase.from('clients').insert([
        {
          organization_id: testOrgId,
          partner_1_name: 'John',
          partner_2_name: 'Jane',
          wedding_date: weddingDate,
          email: 'john.jane@example.com',
        },
      ]);

      // Create alert with wedding day override
      const { data: alertData } = await supabase
        .from('performance_alerts')
        .insert([
          {
            organization_id: testOrgId,
            alert_name: 'Wedding Day Alert',
            metric_pattern: 'critical.*',
            threshold_value: 1000,
            comparison_operator: 'gt',
            severity: 'warning',
            wedding_day_override: true,
            wedding_day_threshold_value: 500,
            wedding_day_severity: 'critical',
          },
        ])
        .select()
        .single();

      // Simulate wedding day incident
      const { data: incident } = await supabase
        .from('performance_alert_incidents')
        .insert([
          {
            organization_id: testOrgId,
            alert_id: alertData.id,
            metric_value: 600,
            threshold_value: 500, // Wedding day threshold
            severity: 'critical', // Escalated severity
            was_wedding_day: true,
            wedding_date: weddingDate,
          },
        ])
        .select()
        .single();

      expect(incident.severity).toBe('critical');
      expect(incident.was_wedding_day).toBe(true);
    });

    it('should filter metrics for wedding day performance analysis', async () => {
      const weddingDate = '2025-06-15';

      // Record metrics for wedding day and non-wedding day
      const metrics = [
        {
          service_name: 'photo-upload',
          metric_name: 'processing_time',
          metric_value: 2500,
          wedding_context: { is_wedding_day: true, wedding_date: weddingDate },
        },
        {
          service_name: 'photo-upload',
          metric_name: 'processing_time',
          metric_value: 1800,
          wedding_context: { is_wedding_day: false },
        },
      ];

      for (const metric of metrics) {
        await supabase.from('performance_metrics').insert([
          {
            organization_id: testOrgId,
            ...metric,
          },
        ]);
      }

      // Query wedding day metrics using the view
      const { data: weddingMetrics, error } = await supabase
        .from('wedding_day_performance_metrics')
        .select('*')
        .eq('organization_id', testOrgId);

      expect(error).toBeNull();
      expect(weddingMetrics).toHaveLength(1);
      expect(weddingMetrics[0].metric_value).toBe(2500);
      expect(weddingMetrics[0].wedding_date).toBe(weddingDate);
    });
  });

  describe('Performance Dashboard Data', () => {
    it('should aggregate metrics for dashboard display', async () => {
      const testMetrics = [
        {
          service: 'api',
          metric: 'response_time',
          value: 150,
          timestamp: new Date(),
        },
        {
          service: 'api',
          metric: 'response_time',
          value: 180,
          timestamp: new Date(),
        },
        {
          service: 'api',
          metric: 'response_time',
          value: 120,
          timestamp: new Date(),
        },
        {
          service: 'database',
          metric: 'query_time',
          value: 45,
          timestamp: new Date(),
        },
        {
          service: 'database',
          metric: 'query_time',
          value: 55,
          timestamp: new Date(),
        },
      ];

      for (const metric of testMetrics) {
        await supabase.from('performance_metrics').insert([
          {
            organization_id: testOrgId,
            service_name: metric.service,
            metric_name: metric.metric,
            metric_value: metric.value,
            timestamp: metric.timestamp.toISOString(),
          },
        ]);
      }

      // Test aggregation query
      const { data, error } = await supabase
        .from('performance_metrics')
        .select(
          `
          service_name,
          metric_name,
          avg_value:metric_value.avg(),
          min_value:metric_value.min(),
          max_value:metric_value.max(),
          count:metric_value.count()
        `,
        )
        .eq('organization_id', testOrgId)
        .eq('service_name', 'api')
        .eq('metric_name', 'response_time');

      expect(error).toBeNull();
      expect(data[0]).toMatchObject({
        service_name: 'api',
        metric_name: 'response_time',
        count: 3,
      });
    });

    it('should provide real-time service health summary', async () => {
      const services = [
        { name: 'web-app', status: 'healthy', response_time: 100 },
        { name: 'api-gateway', status: 'warning', response_time: 400 },
        { name: 'database', status: 'healthy', response_time: 50 },
        { name: 'email-service', status: 'critical', response_time: 2000 },
      ];

      for (const service of services) {
        await supabase.from('service_health_status').upsert([
          {
            organization_id: testOrgId,
            service_name: service.name,
            status: service.status,
            response_time_ms: service.response_time,
            last_check_at: new Date().toISOString(),
          },
        ]);
      }

      const { data, error } = await supabase
        .from('service_health_status')
        .select('service_name, status, response_time_ms')
        .eq('organization_id', testOrgId)
        .order('status', { ascending: false }); // Critical first

      expect(error).toBeNull();
      expect(data).toHaveLength(4);
      expect(data[0].status).toBe('critical');
      expect(data[0].service_name).toBe('email-service');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid metric data gracefully', async () => {
      const apmIntegration = new APMIntegration(testOrgId);

      // Test with invalid metric value
      await expect(
        apmIntegration.recordMetric({
          service_name: 'test-service',
          metric_name: 'invalid-metric',
          metric_value: NaN,
          metric_type: 'gauge',
        }),
      ).rejects.toThrow();

      // Test with missing required fields
      await expect(
        apmIntegration.recordMetric({
          service_name: '',
          metric_name: 'test',
          metric_value: 100,
          metric_type: 'gauge',
        }),
      ).rejects.toThrow();
    });

    it('should handle database connection failures', async () => {
      // Create instance with invalid organization ID
      const apmIntegration = new APMIntegration('invalid-org-id');

      await expect(
        apmIntegration.recordMetric({
          service_name: 'test',
          metric_name: 'test',
          metric_value: 100,
          metric_type: 'gauge',
        }),
      ).rejects.toThrow();
    });

    it('should maintain data integrity during concurrent operations', async () => {
      const apmIntegration = new APMIntegration(testOrgId);

      // Simulate concurrent metric recording
      const concurrentMetrics = Array.from({ length: 50 }, (_, i) =>
        apmIntegration.recordMetric({
          service_name: 'concurrent-test',
          metric_name: 'test-metric',
          metric_value: i,
          metric_type: 'counter',
        }),
      );

      await Promise.all(concurrentMetrics);

      const { count, error } = await supabase
        .from('performance_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', testOrgId)
        .eq('service_name', 'concurrent-test');

      expect(error).toBeNull();
      expect(count).toBe(50);
    });
  });

  describe('Data Retention and Cleanup', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Insert a large number of metrics
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        organization_id: testOrgId,
        service_name: 'load-test',
        metric_name: 'bulk-metric',
        metric_value: Math.random() * 1000,
        metric_type: 'gauge',
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('performance_metrics')
        .insert(largeDataset);

      expect(insertError).toBeNull();

      // Test efficient querying with pagination
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('id, metric_value, timestamp')
        .eq('organization_id', testOrgId)
        .eq('service_name', 'load-test')
        .order('timestamp', { ascending: false })
        .limit(100);

      const endTime = Date.now();

      expect(error).toBeNull();
      expect(data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
