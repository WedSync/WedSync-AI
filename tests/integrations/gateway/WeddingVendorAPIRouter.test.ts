import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WeddingVendorAPIRouter } from '../../../src/integrations/api-gateway/WeddingVendorAPIRouter';

// Mock dependencies
vi.mock('../../../src/integrations/api-gateway/ExternalAPIConnector');
vi.mock('../../../src/integrations/api-gateway/VendorAPIAggregator');

describe('WeddingVendorAPIRouter', () => {
  let router: WeddingVendorAPIRouter;
  const mockConfig = {
    enableIntelligentRouting: true,
    enableLoadBalancing: true,
    enableCircuitBreaker: true,
    maxRetries: 3,
    timeoutMs: 30000,
    healthCheckInterval: 60000,
    weddingSpecificRules: {
      prioritizeWeddingDay: true,
      emergencyRouting: true,
      seasonalOverrides: true,
      vendorCategoryOptimization: true
    },
    routingStrategies: {
      default: 'intelligent',
      wedding_day: 'priority',
      peak_season: 'load_balanced'
    }
  };

  beforeEach(() => {
    router = new WeddingVendorAPIRouter(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Routing Rule Management', () => {
    it('should create basic routing rule', async () => {
      const rule = {
        ruleId: 'photography-routing-v1',
        name: 'Photography Vendor Routing',
        priority: 100,
        conditions: {
          vendorCategory: 'photography',
          requestType: 'search'
        },
        actions: {
          routeTo: 'photography-api-cluster',
          headers: {
            'X-Vendor-Category': 'photography',
            'X-Request-Priority': 'standard'
          }
        },
        metadata: {
          description: 'Routes all photography vendor searches to specialized cluster',
          createdBy: 'api-gateway-system'
        }
      };

      const result = await router.addRoutingRule(rule);

      expect(result.success).toBe(true);
      expect(result.ruleId).toBe('photography-routing-v1');
    });

    it('should create wedding day priority routing rule', async () => {
      const weddingDayRule = {
        ruleId: 'wedding-day-priority-v1',
        name: 'Wedding Day Priority Routing',
        priority: 1000, // Highest priority
        conditions: {
          headers: {
            'X-Wedding-Date': 'today'
          },
          metadata: {
            urgent: true,
            weddingDay: true
          }
        },
        actions: {
          routeTo: 'priority-api-cluster',
          headers: {
            'X-Request-Priority': 'urgent',
            'X-Wedding-Day': 'true'
          },
          timeout: 10000, // Shorter timeout for urgent requests
          retries: 1 // Fewer retries for speed
        },
        metadata: {
          description: 'High priority routing for wedding day requests',
          emergencyProtocol: true
        }
      };

      const result = await router.addRoutingRule(weddingDayRule);
      expect(result.success).toBe(true);

      // Verify rule is added with correct priority
      const rules = await router.getRoutingRules();
      const addedRule = rules.find(r => r.ruleId === 'wedding-day-priority-v1');
      expect(addedRule?.priority).toBe(1000);
    });

    it('should validate routing rule configuration', async () => {
      const invalidRule = {
        ruleId: '',
        name: 'Invalid Rule',
        priority: -1, // Invalid priority
        conditions: {}, // Empty conditions
        actions: {
          routeTo: '', // Empty route target
        },
        metadata: {}
      };

      await expect(router.addRoutingRule(invalidRule)).rejects.toThrow('Invalid routing rule configuration');
    });

    it('should handle rule priority conflicts', async () => {
      const rule1 = {
        ruleId: 'rule-1',
        name: 'Rule 1',
        priority: 100,
        conditions: { vendorCategory: 'photography' },
        actions: { routeTo: 'cluster-1' },
        metadata: {}
      };

      const rule2 = {
        ruleId: 'rule-2',
        name: 'Rule 2', 
        priority: 100, // Same priority
        conditions: { vendorCategory: 'photography' },
        actions: { routeTo: 'cluster-2' },
        metadata: {}
      };

      await router.addRoutingRule(rule1);
      const result = await router.addRoutingRule(rule2);

      expect(result.success).toBe(true);
      expect(result.message).toContain('priority adjusted');
    });
  });

  describe('Request Routing', () => {
    beforeEach(async () => {
      // Set up test routing rules
      const rules = [
        {
          ruleId: 'photography-rule',
          name: 'Photography Routing',
          priority: 100,
          conditions: { vendorCategory: 'photography' },
          actions: { routeTo: 'photography-cluster' },
          metadata: {}
        },
        {
          ruleId: 'catering-rule',
          name: 'Catering Routing',
          priority: 90,
          conditions: { vendorCategory: 'catering' },
          actions: { routeTo: 'catering-cluster' },
          metadata: {}
        },
        {
          ruleId: 'emergency-rule',
          name: 'Emergency Routing',
          priority: 1000,
          conditions: { 
            headers: { 'X-Emergency': 'true' }
          },
          actions: { routeTo: 'emergency-cluster' },
          metadata: {}
        }
      ];

      for (const rule of rules) {
        await router.addRoutingRule(rule);
      }
    });

    it('should route photography vendor requests correctly', async () => {
      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Vendor-Category': 'photography'
        },
        body: {
          location: { city: 'New York', state: 'NY' },
          date: '2024-06-15',
          filters: { style: 'modern' }
        },
        metadata: {
          vendorCategory: 'photography',
          requestType: 'search'
        }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.targetCluster).toBe('photography-cluster');
      expect(routing.appliedRules).toContain('photography-rule');
    });

    it('should prioritize emergency requests', async () => {
      const emergencyRequest = {
        path: '/vendors/urgent',
        method: 'POST',
        headers: {
          'X-Emergency': 'true',
          'X-Vendor-Category': 'photography'
        },
        body: {
          weddingId: 'wedding-123',
          issue: 'photographer_cancelled',
          date: 'today'
        },
        metadata: {
          urgent: true,
          requestType: 'emergency'
        }
      };

      const routing = await router.routeRequest(emergencyRequest);

      expect(routing.success).toBe(true);
      expect(routing.targetCluster).toBe('emergency-cluster'); // Should override photography routing
      expect(routing.priority).toBe('emergency');
      expect(routing.appliedRules[0]).toBe('emergency-rule');
    });

    it('should apply intelligent routing based on vendor health', async () => {
      // Mock vendor health data
      await router.updateVendorHealth('photography-cluster-1', {
        healthy: true,
        responseTime: 150,
        errorRate: 0.02,
        capacity: 85
      });

      await router.updateVendorHealth('photography-cluster-2', {
        healthy: true,
        responseTime: 300,
        errorRate: 0.05,
        capacity: 95
      });

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {},
        metadata: { vendorCategory: 'photography' }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      // Should route to healthier cluster (cluster-1 has better metrics)
      expect(routing.healthBasedRouting).toBe(true);
      expect(routing.selectedForHealth).toBe(true);
    });

    it('should handle vendor category routing with fallbacks', async () => {
      const unknownCategoryRequest = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'unknown-category' },
        body: {},
        metadata: { vendorCategory: 'unknown-category' }
      };

      const routing = await router.routeRequest(unknownCategoryRequest);

      expect(routing.success).toBe(true);
      expect(routing.fallbackUsed).toBe(true);
      expect(routing.targetCluster).toBe('default-cluster');
    });
  });

  describe('Wedding-Specific Routing Features', () => {
    it('should handle wedding day emergency routing', async () => {
      const weddingDayEmergency = {
        path: '/vendors/emergency-replacement',
        method: 'POST',
        headers: {
          'X-Wedding-Date': 'today',
          'X-Emergency': 'true',
          'X-Vendor-Category': 'photography'
        },
        body: {
          originalVendor: 'photographer-123',
          cancellationReason: 'illness',
          weddingDetails: {
            location: 'Central Park, NYC',
            time: '16:00',
            style: 'traditional'
          },
          budget: 3000
        },
        metadata: {
          weddingDay: true,
          emergency: true,
          replacementNeeded: true
        }
      };

      const routing = await router.routeRequest(weddingDayEmergency);

      expect(routing.success).toBe(true);
      expect(routing.priority).toBe('emergency');
      expect(routing.weddingDayProtocol).toBe(true);
      expect(routing.emergencyReplacementFlow).toBe(true);
      expect(routing.responseTimeGuarantee).toBeLessThan(300000); // 5 minutes max
    });

    it('should implement seasonal routing adjustments', async () => {
      // Mock peak wedding season (June)
      const mockDate = new Date(2024, 5, 15); // June 15, 2024
      vi.setSystemTime(mockDate);

      const peakSeasonRequest = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {
          date: '2024-06-22', // Saturday in peak season
          location: { city: 'Napa', state: 'CA' } // Popular wedding destination
        },
        metadata: {
          vendorCategory: 'photography',
          seasonalDemand: 'peak'
        }
      };

      const routing = await router.routeRequest(peakSeasonRequest);

      expect(routing.success).toBe(true);
      expect(routing.seasonalAdjustment).toBe('peak');
      expect(routing.loadBalancingStrategy).toBe('distribute'); // Spread load during peak season
      expect(routing.cachingStrategy).toBe('aggressive'); // More caching in peak season
    });

    it('should route based on vendor specialization', async () => {
      const destinationWeddingRequest = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {
          weddingType: 'destination',
          location: { country: 'Italy', city: 'Tuscany' },
          specialRequirements: ['travel', 'international-experience', 'multiple-days']
        },
        metadata: {
          vendorCategory: 'photography',
          specialization: 'destination-weddings'
        }
      };

      const routing = await router.routeRequest(destinationWeddingRequest);

      expect(routing.success).toBe(true);
      expect(routing.specializationRouting).toBe(true);
      expect(routing.vendorFilters).toContain('travel-experience');
      expect(routing.targetCluster).toBe('specialized-photography-cluster');
    });

    it('should handle multi-vendor coordination routing', async () => {
      const multiVendorRequest = {
        path: '/vendors/coordinate',
        method: 'POST',
        headers: { 'X-Multi-Vendor': 'true' },
        body: {
          weddingId: 'wedding-456',
          vendors: [
            { category: 'photography', vendorId: 'photo-123' },
            { category: 'videography', vendorId: 'video-456' },
            { category: 'florist', vendorId: 'flowers-789' }
          ],
          coordinationNeeds: ['timeline-sync', 'space-sharing', 'equipment-coordination']
        },
        metadata: {
          requestType: 'coordination',
          multiVendor: true
        }
      };

      const routing = await router.routeRequest(multiVendorRequest);

      expect(routing.success).toBe(true);
      expect(routing.coordinationFlow).toBe(true);
      expect(routing.multiVendorHandling).toBe(true);
      expect(routing.orchestrationRequired).toBe(true);
    });
  });

  describe('Load Balancing and Health Management', () => {
    beforeEach(async () => {
      // Set up multiple clusters for load balancing
      const clusters = [
        { id: 'photography-cluster-1', category: 'photography', capacity: 100 },
        { id: 'photography-cluster-2', category: 'photography', capacity: 80 },
        { id: 'photography-cluster-3', category: 'photography', capacity: 120 }
      ];

      for (const cluster of clusters) {
        await router.registerCluster(cluster);
      }
    });

    it('should distribute load across healthy clusters', async () => {
      const requests = Array.from({ length: 15 }, (_, i) => ({
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: { requestId: `request-${i}` },
        metadata: { vendorCategory: 'photography' }
      }));

      const routingResults = await Promise.all(
        requests.map(req => router.routeRequest(req))
      );

      const clusterCounts = {};
      routingResults.forEach(result => {
        const cluster = result.targetCluster;
        clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
      });

      // Should distribute across multiple clusters
      expect(Object.keys(clusterCounts).length).toBeGreaterThan(1);
    });

    it('should avoid unhealthy clusters', async () => {
      // Mark one cluster as unhealthy
      await router.updateVendorHealth('photography-cluster-2', {
        healthy: false,
        responseTime: 5000,
        errorRate: 0.8,
        capacity: 20
      });

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {},
        metadata: { vendorCategory: 'photography' }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.targetCluster).not.toBe('photography-cluster-2');
      expect(routing.healthFiltering).toBe(true);
    });

    it('should implement circuit breaker for failing clusters', async () => {
      // Simulate repeated failures to trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        await router.recordFailure('photography-cluster-1', {
          error: 'Connection timeout',
          timestamp: Date.now(),
          responseTime: 30000
        });
      }

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {},
        metadata: { vendorCategory: 'photography' }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.targetCluster).not.toBe('photography-cluster-1');
      expect(routing.circuitBreakerActive).toBe(true);

      const circuitStatus = await router.getCircuitBreakerStatus('photography-cluster-1');
      expect(circuitStatus.state).toBe('open');
    });
  });

  describe('Performance Optimization', () => {
    it('should cache routing decisions', async () => {
      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: { location: { city: 'Austin', state: 'TX' } },
        metadata: { vendorCategory: 'photography' }
      };

      const start = Date.now();
      await router.routeRequest(request);
      const firstCallTime = Date.now() - start;

      const start2 = Date.now();
      await router.routeRequest(request);
      const secondCallTime = Date.now() - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime); // Should be faster due to caching
    });

    it('should precompute routing for common patterns', async () => {
      const commonPatterns = [
        { vendorCategory: 'photography', location: 'New York' },
        { vendorCategory: 'catering', location: 'Los Angeles' },
        { vendorCategory: 'venue', location: 'Chicago' }
      ];

      await router.precomputeRoutingPatterns(commonPatterns);

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: { location: { city: 'New York', state: 'NY' } },
        metadata: { vendorCategory: 'photography' }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.precomputed).toBe(true);
      expect(routing.responseTime).toBeLessThan(50); // Very fast due to precomputation
    });

    it('should optimize routing based on historical data', async () => {
      // Simulate historical routing data
      const historicalData = {
        'photography-cluster-1': {
          avgResponseTime: 200,
          successRate: 0.98,
          peakHours: [10, 11, 12, 14, 15, 16]
        },
        'photography-cluster-2': {
          avgResponseTime: 180,
          successRate: 0.99,
          peakHours: [9, 13, 17, 18, 19]
        }
      };

      await router.updateHistoricalData(historicalData);

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {},
        metadata: { 
          vendorCategory: 'photography',
          timestamp: new Date().setHours(11) // Peak hour for cluster-1
        }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.historicalOptimization).toBe(true);
      // Should prefer cluster-2 during cluster-1's peak hours
      expect(routing.targetCluster).toBe('photography-cluster-2');
    });
  });

  describe('Monitoring and Analytics', () => {
    it('should collect routing metrics', async () => {
      const metrics = await router.getRoutingMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.averageRoutingTime).toBeDefined();
      expect(metrics.routingAccuracy).toBeDefined();
      expect(metrics.clusterDistribution).toBeDefined();
    });

    it('should track vendor health trends', async () => {
      const healthTrends = await router.getVendorHealthTrends({
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          end: new Date()
        },
        clusters: ['photography-cluster-1', 'photography-cluster-2']
      });

      expect(healthTrends.trends).toBeDefined();
      expect(healthTrends.degradationAlerts).toBeDefined();
      expect(healthTrends.improvementTrends).toBeDefined();
    });

    it('should generate routing effectiveness report', async () => {
      const report = await router.generateRoutingReport({
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: new Date()
        },
        includeMetrics: ['response_time', 'error_rate', 'throughput'],
        includeRecommendations: true
      });

      expect(report.summary).toBeDefined();
      expect(report.clusterPerformance).toBeDefined();
      expect(report.routingRuleEffectiveness).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.optimizationSuggestions).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle routing rule conflicts', async () => {
      const conflictingRules = [
        {
          ruleId: 'rule-1',
          name: 'Rule 1',
          priority: 100,
          conditions: { vendorCategory: 'photography' },
          actions: { routeTo: 'cluster-1' },
          metadata: {}
        },
        {
          ruleId: 'rule-2',
          name: 'Rule 2',
          priority: 100,
          conditions: { vendorCategory: 'photography' },
          actions: { routeTo: 'cluster-2' },
          metadata: {}
        }
      ];

      await router.addRoutingRule(conflictingRules[0]);
      const result = await router.addRoutingRule(conflictingRules[1]);

      expect(result.success).toBe(true);
      expect(result.conflictResolution).toBeDefined();
    });

    it('should provide fallback routing when all clusters fail', async () => {
      // Mark all photography clusters as unhealthy
      const clusters = ['photography-cluster-1', 'photography-cluster-2', 'photography-cluster-3'];
      for (const cluster of clusters) {
        await router.updateVendorHealth(cluster, {
          healthy: false,
          responseTime: 10000,
          errorRate: 1.0,
          capacity: 0
        });
      }

      const request = {
        path: '/vendors/search',
        method: 'GET',
        headers: { 'X-Vendor-Category': 'photography' },
        body: {},
        metadata: { vendorCategory: 'photography' }
      };

      const routing = await router.routeRequest(request);

      expect(routing.success).toBe(true);
      expect(routing.fallbackUsed).toBe(true);
      expect(routing.targetCluster).toBe('emergency-fallback-cluster');
    });

    it('should handle malformed routing requests', async () => {
      const malformedRequest = {
        path: '/vendors/search',
        method: 'INVALID_METHOD',
        headers: null,
        body: 'invalid-json',
        metadata: {}
      };

      const routing = await router.routeRequest(malformedRequest);

      expect(routing.success).toBe(false);
      expect(routing.error).toBeDefined();
      expect(routing.errorType).toBe('malformed_request');
    });
  });
});