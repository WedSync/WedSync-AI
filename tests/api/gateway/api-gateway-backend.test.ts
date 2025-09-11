/**
 * API Gateway Backend Tests - WS-250
 * Comprehensive testing for API gateway functionality
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { apiRoutingEngine } from '@/lib/services/api-gateway/APIRoutingEngine';
import { loadBalancingService } from '@/lib/services/api-gateway/LoadBalancingService';
import { rateLimitingEngine } from '@/lib/services/api-gateway/RateLimitingEngine';
import { weddingAPIProtection } from '@/lib/services/api-gateway/WeddingAPIProtection';
import { GatewayRequest, BackendServer, APIRoute } from '@/types/api-gateway';

describe('API Gateway Backend - WS-250', () => {
  beforeAll(async () => {
    // Setup test servers and routes
    const testServer: BackendServer = {
      id: 'test-server-1',
      url: 'http://localhost:3001',
      weight: 1,
      healthScore: 100,
      currentConnections: 0,
      responseTime: 50,
      lastHealthCheck: new Date(),
      status: 'healthy',
      region: 'primary',
      capabilities: ['wedding-optimized', 'high-availability']
    };

    const testRoute: APIRoute = {
      id: 'test-route-1',
      path: '/api/test',
      method: 'GET',
      target: 'test-backend',
      priority: 'normal',
      version: '1.0.0',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    apiRoutingEngine.registerBackendServer(testServer);
    apiRoutingEngine.registerRoute(testRoute);
  });

  describe('APIRoutingEngine', () => {
    test('should route requests correctly', async () => {
      const testRequest: GatewayRequest = {
        id: 'test-req-1',
        timestamp: new Date(),
        method: 'GET',
        path: '/api/test',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const result = await apiRoutingEngine.routeRequest(testRequest);
      
      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.route).toBeDefined();
      expect(result.routingDecision).toBeDefined();
    });

    test('should provide routing statistics', () => {
      const stats = apiRoutingEngine.getRoutingStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalServers).toBe('number');
      expect(typeof stats.totalRoutes).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
    });
  });

  describe('LoadBalancingService', () => {
    test('should select servers based on strategy', async () => {
      const servers: BackendServer[] = [{
        id: 'server-1',
        url: 'http://localhost:3001',
        weight: 1,
        healthScore: 90,
        currentConnections: 5,
        responseTime: 100,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'primary',
        capabilities: ['standard']
      }];

      const testRequest: GatewayRequest = {
        id: 'test-req-2',
        timestamp: new Date(),
        method: 'GET',
        path: '/api/test',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const selected = await loadBalancingService.selectServer(testRequest, servers, 'round-robin');
      expect(selected).toBe(servers[0]);
    });

    test('should provide load balancing statistics', () => {
      const stats = loadBalancingService.getLoadBalancingStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalServers).toBe('number');
      expect(typeof stats.healthyServers).toBe('number');
    });
  });

  describe('RateLimitingEngine', () => {
    test('should enforce rate limits', async () => {
      const testRequest: GatewayRequest = {
        id: 'test-req-3',
        timestamp: new Date(),
        method: 'GET',
        path: '/api/test',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        vendorContext: {
          vendorId: 'test-vendor',
          tier: 'professional',
          subscriptionStatus: 'active'
        }
      };

      const result = await rateLimitingEngine.checkRateLimit(testRequest);
      
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(result.tier).toBe('professional');
    });

    test('should provide rate limiting statistics', () => {
      const stats = rateLimitingEngine.getRateLimitingStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalRules).toBe('number');
      expect(typeof stats.activeCounters).toBe('number');
    });
  });

  describe('WeddingAPIProtection', () => {
    test('should determine wedding protection correctly', async () => {
      const weddingRequest: GatewayRequest = {
        id: 'test-req-4',
        timestamp: new Date(),
        method: 'POST',
        path: '/api/weddings/emergency',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: true,
          vendorTier: 'professional',
          seasonalPriority: true
        }
      };

      const result = await weddingAPIProtection.shouldProtectRequest(weddingRequest);
      
      expect(result).toBeDefined();
      expect(typeof result.shouldProtect).toBe('boolean');
      expect(Array.isArray(result.reason)).toBe(true);
    });

    test('should provide protection status', () => {
      const status = weddingAPIProtection.getProtectionStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.saturdayProtectionActive).toBe('boolean');
      expect(typeof status.emergencyModeActive).toBe('boolean');
    });
  });

  describe('Wedding-specific scenarios', () => {
    test('should handle Saturday wedding traffic', async () => {
      // Mock Saturday
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = () => 6; // Saturday

      const saturdayRequest: GatewayRequest = {
        id: 'test-req-5',
        timestamp: new Date(),
        method: 'GET',
        path: '/api/vendors/schedule',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: true,
          vendorTier: 'professional',
          seasonalPriority: false
        }
      };

      const protectionResult = await weddingAPIProtection.shouldProtectRequest(saturdayRequest);
      expect(protectionResult.shouldProtect).toBe(true);

      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    test('should handle peak wedding season traffic', async () => {
      // Mock peak season (July)
      const originalGetMonth = Date.prototype.getMonth;
      Date.prototype.getMonth = () => 6; // July (0-indexed)

      const seasonalRequest: GatewayRequest = {
        id: 'test-req-6',
        timestamp: new Date(),
        method: 'POST',
        path: '/api/timeline/critical',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: false,
          vendorTier: 'scale',
          seasonalPriority: true
        }
      };

      const rateLimitResult = await rateLimitingEngine.checkRateLimit(seasonalRequest);
      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.tier).toBe('scale');

      // Restore original method
      Date.prototype.getMonth = originalGetMonth;
    });
  });

  describe('Error handling and resilience', () => {
    test('should handle invalid requests gracefully', async () => {
      const invalidRequest: GatewayRequest = {
        id: 'test-req-7',
        timestamp: new Date(),
        method: 'GET',
        path: '/nonexistent/path',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };

      await expect(async () => {
        await apiRoutingEngine.routeRequest(invalidRequest);
      }).rejects.toThrow();
    });

    test('should maintain system health under load', () => {
      // Simulate multiple concurrent requests
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        const testRequest: GatewayRequest = {
          id: `load-test-req-${i}`,
          timestamp: new Date(),
          method: 'GET',
          path: '/api/test',
          headers: {},
          query: {},
          ip: `127.0.0.${i % 255}`,
          userAgent: 'load-test-agent',
          vendorContext: {
            vendorId: `vendor-${i}`,
            tier: 'professional',
            subscriptionStatus: 'active'
          }
        };

        promises.push(rateLimitingEngine.checkRateLimit(testRequest));
      }

      return Promise.all(promises).then(results => {
        expect(results.length).toBe(100);
        results.forEach(result => {
          expect(result).toBeDefined();
          expect(typeof result.allowed).toBe('boolean');
        });
      });
    });
  });
});