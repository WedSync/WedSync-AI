import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceMeshOrchestrator } from '../../../src/integrations/api-gateway/ServiceMeshOrchestrator';

// Mock dependencies
vi.mock('../../../src/integrations/api-gateway/ExternalAPIConnector');

describe('ServiceMeshOrchestrator', () => {
  let orchestrator: ServiceMeshOrchestrator;
  const mockConfig = {
    serviceMeshId: 'wedding-mesh-001',
    enableHealthChecks: true,
    healthCheckInterval: 30000,
    loadBalancingStrategy: 'weighted_round_robin' as const,
    circuitBreakerThreshold: 5,
    timeoutMs: 30000,
    retryAttempts: 3,
    enableDistributedTracing: true,
    weddingOptimizations: {
      prioritizeWeddingDay: true,
      emergencyFailover: true,
      seasonalScaling: true,
      vendorCategoryRouting: true
    }
  };

  beforeEach(() => {
    orchestrator = new ServiceMeshOrchestrator(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Registration', () => {
    it('should register a new service successfully', async () => {
      const serviceConfig = {
        serviceId: 'vendor-api-service',
        name: 'Wedding Vendor API',
        version: '1.0.0',
        endpoints: ['https://api.vendor.com/v1'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['vendor', 'photography'],
        metadata: {
          category: 'photography',
          region: 'us-east-1',
          capacity: 1000
        }
      };

      const result = await orchestrator.registerService(serviceConfig);

      expect(result.success).toBe(true);
      expect(result.serviceId).toBe('vendor-api-service');
    });

    it('should validate service configuration before registration', async () => {
      const invalidConfig = {
        serviceId: '',
        name: 'Test Service',
        version: '1.0.0',
        endpoints: [],
        healthCheckEndpoint: '/health',
        weight: -1,
        tags: ['vendor'],
        metadata: {}
      };

      await expect(orchestrator.registerService(invalidConfig)).rejects.toThrow('Invalid service configuration');
    });

    it('should handle duplicate service registration', async () => {
      const serviceConfig = {
        serviceId: 'vendor-api-service',
        name: 'Wedding Vendor API',
        version: '1.0.0',
        endpoints: ['https://api.vendor.com/v1'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['vendor', 'photography'],
        metadata: { category: 'photography' }
      };

      await orchestrator.registerService(serviceConfig);
      
      const result = await orchestrator.registerService(serviceConfig);
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated');
    });
  });

  describe('Load Balancing', () => {
    beforeEach(async () => {
      // Register test services
      const services = [
        {
          serviceId: 'vendor-1',
          name: 'Vendor API 1',
          version: '1.0.0',
          endpoints: ['https://api.vendor1.com'],
          healthCheckEndpoint: '/health',
          weight: 100,
          tags: ['photography'],
          metadata: { category: 'photography', region: 'us-east-1' }
        },
        {
          serviceId: 'vendor-2',
          name: 'Vendor API 2',
          version: '1.0.0',
          endpoints: ['https://api.vendor2.com'],
          healthCheckEndpoint: '/health',
          weight: 200,
          tags: ['photography'],
          metadata: { category: 'photography', region: 'us-west-1' }
        }
      ];

      for (const service of services) {
        await orchestrator.registerService(service);
      }
    });

    it('should select service using weighted round robin', async () => {
      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'photography' }
      };

      const selectedService = await orchestrator.selectService('photography', request);
      expect(selectedService).toBeDefined();
      expect(['vendor-1', 'vendor-2']).toContain(selectedService.serviceId);
    });

    it('should respect service weights in load balancing', async () => {
      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'photography' }
      };

      const selections: string[] = [];
      
      // Make multiple requests to test weight distribution
      for (let i = 0; i < 15; i++) {
        const service = await orchestrator.selectService('photography', request);
        selections.push(service.serviceId);
      }

      // vendor-2 has weight 200 vs vendor-1's weight 100, so should be selected ~2x more
      const vendor1Count = selections.filter(id => id === 'vendor-1').length;
      const vendor2Count = selections.filter(id => id === 'vendor-2').length;
      
      expect(vendor2Count).toBeGreaterThan(vendor1Count);
    });

    it('should handle service unavailability', async () => {
      // Mark a service as unhealthy
      await orchestrator.updateServiceHealth('vendor-1', false, 'Connection timeout');

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'photography' }
      };

      const selectedService = await orchestrator.selectService('photography', request);
      expect(selectedService.serviceId).toBe('vendor-2');
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks on registered services', async () => {
      const serviceConfig = {
        serviceId: 'test-service',
        name: 'Test Service',
        version: '1.0.0',
        endpoints: ['https://api.test.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['test'],
        metadata: { category: 'test' }
      };

      await orchestrator.registerService(serviceConfig);

      // Trigger health check
      await orchestrator.performHealthChecks();

      const healthStatus = await orchestrator.getServiceHealth('test-service');
      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus.isHealthy).toBe('boolean');
      expect(typeof healthStatus.lastChecked).toBe('number');
    });

    it('should update service health based on check results', async () => {
      const serviceConfig = {
        serviceId: 'test-service',
        name: 'Test Service',
        version: '1.0.0',
        endpoints: ['https://api.test.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['test'],
        metadata: { category: 'test' }
      };

      await orchestrator.registerService(serviceConfig);
      
      // Manually update health status
      await orchestrator.updateServiceHealth('test-service', false, 'Service down');

      const healthStatus = await orchestrator.getServiceHealth('test-service');
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.lastError).toBe('Service down');
    });

    it('should remove unhealthy services from load balancing', async () => {
      const serviceConfig = {
        serviceId: 'unhealthy-service',
        name: 'Unhealthy Service',
        version: '1.0.0',
        endpoints: ['https://api.unhealthy.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['test'],
        metadata: { category: 'test' }
      };

      await orchestrator.registerService(serviceConfig);
      await orchestrator.updateServiceHealth('unhealthy-service', false, 'Connection refused');

      const request = {
        path: '/test',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'test' }
      };

      await expect(orchestrator.selectService('test', request)).rejects.toThrow('No healthy services available');
    });
  });

  describe('Traffic Routing', () => {
    it('should route based on request metadata', async () => {
      const photographyService = {
        serviceId: 'photography-service',
        name: 'Photography Service',
        version: '1.0.0',
        endpoints: ['https://api.photography.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['photography'],
        metadata: { category: 'photography' }
      };

      const cateringService = {
        serviceId: 'catering-service',
        name: 'Catering Service',
        version: '1.0.0',
        endpoints: ['https://api.catering.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['catering'],
        metadata: { category: 'catering' }
      };

      await orchestrator.registerService(photographyService);
      await orchestrator.registerService(cateringService);

      const photographyRequest = {
        path: '/vendors/search',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'photography' }
      };

      const selectedService = await orchestrator.selectService('photography', photographyRequest);
      expect(selectedService.serviceId).toBe('photography-service');
    });

    it('should create custom routing rules', async () => {
      const routingRule = {
        ruleId: 'wedding-day-priority',
        priority: 100,
        conditions: {
          headers: { 'x-wedding-date': 'today' },
          metadata: { urgent: true }
        },
        actions: {
          routeTo: ['high-priority-service'],
          setHeaders: { 'x-priority': 'urgent' }
        }
      };

      await orchestrator.addRoutingRule(routingRule);

      const rules = await orchestrator.getRoutingRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].ruleId).toBe('wedding-day-priority');
    });

    it('should apply routing rules in priority order', async () => {
      const rule1 = {
        ruleId: 'rule-1',
        priority: 50,
        conditions: { metadata: { type: 'test' } },
        actions: { routeTo: ['service-1'] }
      };

      const rule2 = {
        ruleId: 'rule-2',
        priority: 100,
        conditions: { metadata: { type: 'test' } },
        actions: { routeTo: ['service-2'] }
      };

      await orchestrator.addRoutingRule(rule1);
      await orchestrator.addRoutingRule(rule2);

      const rules = await orchestrator.getRoutingRules();
      expect(rules[0].ruleId).toBe('rule-2'); // Higher priority first
      expect(rules[1].ruleId).toBe('rule-1');
    });
  });

  describe('Distributed Transactions', () => {
    it('should create distributed transaction', async () => {
      const transactionConfig = {
        transactionId: 'tx-001',
        services: ['vendor-service', 'payment-service'],
        timeout: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000
        }
      };

      const transaction = await orchestrator.createDistributedTransaction(transactionConfig);
      expect(transaction.transactionId).toBe('tx-001');
      expect(transaction.status).toBe('created');
    });

    it('should execute distributed transaction steps', async () => {
      const transactionConfig = {
        transactionId: 'tx-002',
        services: ['service-1', 'service-2'],
        timeout: 30000,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000 }
      };

      const transaction = await orchestrator.createDistributedTransaction(transactionConfig);

      const steps = [
        { serviceId: 'service-1', operation: 'create', data: { item: 'test' } },
        { serviceId: 'service-2', operation: 'update', data: { id: 1, status: 'active' } }
      ];

      const result = await orchestrator.executeTransaction(transaction.transactionId, steps);
      expect(result.success).toBe(true);
    });

    it('should rollback failed transactions', async () => {
      const transactionConfig = {
        transactionId: 'tx-003',
        services: ['service-1', 'service-2'],
        timeout: 30000,
        retryPolicy: { maxAttempts: 1, backoffMs: 1000 }
      };

      const transaction = await orchestrator.createDistributedTransaction(transactionConfig);

      // Mock a failing step
      const steps = [
        { serviceId: 'service-1', operation: 'create', data: { item: 'test' } },
        { serviceId: 'invalid-service', operation: 'update', data: { id: 1 } } // This will fail
      ];

      const result = await orchestrator.executeTransaction(transaction.transactionId, steps);
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
    });
  });

  describe('Wedding-Specific Features', () => {
    it('should prioritize wedding day requests', async () => {
      const normalService = {
        serviceId: 'normal-service',
        name: 'Normal Service',
        version: '1.0.0',
        endpoints: ['https://api.normal.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['vendor'],
        metadata: { category: 'photography' }
      };

      const priorityService = {
        serviceId: 'priority-service',
        name: 'Priority Service',
        version: '1.0.0',
        endpoints: ['https://api.priority.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['vendor', 'wedding-day-priority'],
        metadata: { category: 'photography', priority: 'high' }
      };

      await orchestrator.registerService(normalService);
      await orchestrator.registerService(priorityService);

      // Wedding day request
      const weddingDayRequest = {
        path: '/vendors/urgent',
        method: 'GET',
        headers: { 'x-wedding-date': 'today' },
        body: null,
        metadata: { category: 'photography', urgent: true }
      };

      const selectedService = await orchestrator.selectService('photography', weddingDayRequest);
      expect(selectedService.tags).toContain('wedding-day-priority');
    });

    it('should handle seasonal scaling', async () => {
      const scalingConfig = {
        season: 'peak', // May-October
        scalingFactor: 2.0,
        additionalCapacity: 100
      };

      await orchestrator.configureSeasonalScaling(scalingConfig);

      const metrics = await orchestrator.getOrchestrationMetrics();
      expect(metrics.scalingConfig.season).toBe('peak');
      expect(metrics.scalingConfig.scalingFactor).toBe(2.0);
    });

    it('should implement emergency failover protocols', async () => {
      const emergencyConfig = {
        enabled: true,
        fallbackServices: ['emergency-vendor-service'],
        activationThreshold: 0.8, // 80% of services down
        notifications: ['admin@wedsync.com']
      };

      await orchestrator.configureEmergencyProtocols(emergencyConfig);

      // Simulate multiple service failures
      await orchestrator.updateServiceHealth('service-1', false, 'Down');
      await orchestrator.updateServiceHealth('service-2', false, 'Down');

      const emergencyStatus = await orchestrator.checkEmergencyStatus();
      expect(emergencyStatus.activated).toBe(true);
      expect(emergencyStatus.fallbackActive).toBe(true);
    });

    it('should route by vendor category', async () => {
      const photographyService = {
        serviceId: 'photo-service',
        name: 'Photography Service',
        version: '1.0.0',
        endpoints: ['https://api.photo.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['photography'],
        metadata: { 
          category: 'photography',
          specializations: ['wedding', 'portrait', 'event']
        }
      };

      await orchestrator.registerService(photographyService);

      const categoryRequest = {
        path: '/vendors/category/photography',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'photography', specialization: 'wedding' }
      };

      const selectedService = await orchestrator.selectServiceByCategory('photography', categoryRequest);
      expect(selectedService.metadata.category).toBe('photography');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should collect orchestration metrics', async () => {
      const metrics = await orchestrator.getOrchestrationMetrics();

      expect(metrics).toHaveProperty('totalServices');
      expect(metrics).toHaveProperty('healthyServices');
      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should track request routing metrics', async () => {
      // Simulate some requests
      const request = {
        path: '/test',
        method: 'GET',
        headers: {},
        body: null,
        metadata: { category: 'test' }
      };

      // Add a service first
      await orchestrator.registerService({
        serviceId: 'metrics-test-service',
        name: 'Metrics Test',
        version: '1.0.0',
        endpoints: ['https://api.test.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['test'],
        metadata: { category: 'test' }
      });

      try {
        await orchestrator.selectService('test', request);
      } catch (error) {
        // Expected if no healthy services
      }

      const routingMetrics = await orchestrator.getRoutingMetrics();
      expect(routingMetrics).toHaveProperty('totalRequests');
      expect(routingMetrics).toHaveProperty('routingDecisions');
    });

    it('should export metrics for monitoring systems', async () => {
      const exportedMetrics = await orchestrator.exportMetrics('prometheus');
      
      expect(exportedMetrics).toContain('service_mesh_total_services');
      expect(exportedMetrics).toContain('service_mesh_healthy_services');
      expect(exportedMetrics).toContain('service_mesh_request_count');
    });
  });

  describe('Error Handling', () => {
    it('should handle service registration failures gracefully', async () => {
      const invalidService = {
        serviceId: 'invalid-service',
        name: '',
        version: 'invalid-version',
        endpoints: ['invalid-url'],
        healthCheckEndpoint: '',
        weight: -1,
        tags: [],
        metadata: {}
      };

      await expect(orchestrator.registerService(invalidService)).rejects.toThrow();
    });

    it('should handle network failures during health checks', async () => {
      const serviceConfig = {
        serviceId: 'unreachable-service',
        name: 'Unreachable Service',
        version: '1.0.0',
        endpoints: ['https://unreachable.example.com'],
        healthCheckEndpoint: '/health',
        weight: 100,
        tags: ['test'],
        metadata: { category: 'test' }
      };

      await orchestrator.registerService(serviceConfig);
      await orchestrator.performHealthChecks();

      const healthStatus = await orchestrator.getServiceHealth('unreachable-service');
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.lastError).toBeTruthy();
    });

    it('should maintain service registry consistency', async () => {
      // Test that the service registry maintains consistency even with failures
      const services = [];
      for (let i = 0; i < 5; i++) {
        services.push({
          serviceId: `service-${i}`,
          name: `Service ${i}`,
          version: '1.0.0',
          endpoints: [`https://api${i}.test.com`],
          healthCheckEndpoint: '/health',
          weight: 100,
          tags: ['test'],
          metadata: { category: 'test' }
        });
      }

      // Register services with some failures
      const results = await Promise.allSettled(
        services.map(service => orchestrator.registerService(service))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);

      // Verify registry consistency
      const registeredServices = await orchestrator.getRegisteredServices();
      expect(registeredServices.length).toBe(successCount);
    });
  });
});