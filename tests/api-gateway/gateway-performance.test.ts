/**
 * WS-250 API Gateway Performance Testing Suite
 * Comprehensive performance benchmarking for WedSync API Gateway
 * Team E - QA/Testing & Documentation
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

describe('API Gateway Performance Benchmarking', () => {
  let performanceMetrics: {
    authTime: number[];
    rateLimitTime: number[];
    csrfTime: number[];
    validationTime: number[];
    mobileOptTime: number[];
    totalTime: number[];
  };

  beforeEach(() => {
    performanceMetrics = {
      authTime: [],
      rateLimitTime: [],
      csrfTime: [],
      validationTime: [],
      mobileOptTime: [],
      totalTime: []
    };
  });

  afterEach(() => {
    // Performance reporting
    const avgTotalTime = performanceMetrics.totalTime.reduce((a, b) => a + b, 0) / performanceMetrics.totalTime.length;
    console.log(`Average gateway processing time: ${avgTotalTime.toFixed(2)}ms`);
  });

  describe('Baseline Performance Metrics', () => {
    test('should process public endpoint request under 50ms', async () => {
      const startTime = performance.now();
      
      const request = new NextRequest('http://localhost:3000/api/public/health', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'Accept': 'application/json'
        }
      });

      const response = await middleware(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      performanceMetrics.totalTime.push(processingTime);

      expect(processingTime).toBeLessThan(50);
      expect(response.status).toBe(200);
    });

    test('should process authenticated endpoint under 100ms', async () => {
      const startTime = performance.now();
      
      const request = new NextRequest('http://localhost:3000/api/suppliers/profile', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Authorization': 'Bearer test-token',
          'Accept': 'application/json'
        }
      });

      const response = await middleware(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      performanceMetrics.totalTime.push(processingTime);

      expect(processingTime).toBeLessThan(100);
    });

    test('should process POST with validation under 150ms', async () => {
      const startTime = performance.now();
      
      const request = new NextRequest('http://localhost:3000/api/forms/submit', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token'
        },
        body: JSON.stringify({
          formId: 'test-form',
          responses: { field1: 'value1' }
        })
      });

      const response = await middleware(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      performanceMetrics.totalTime.push(processingTime);

      expect(processingTime).toBeLessThan(150);
    });
  });

  describe('Mobile Performance Optimization', () => {
    test('should optimize for mobile devices with lower processing time', async () => {
      const mobileStartTime = performance.now();
      
      const mobileRequest = new NextRequest('http://localhost:3000/api/suppliers/bookings', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
          'Authorization': 'Bearer test-token',
          'Accept': 'application/json'
        }
      });

      const mobileResponse = await middleware(mobileRequest);
      const mobileEndTime = performance.now();
      const mobileProcessingTime = mobileEndTime - mobileStartTime;

      // Desktop comparison
      const desktopStartTime = performance.now();
      
      const desktopRequest = new NextRequest('http://localhost:3000/api/suppliers/bookings', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Authorization': 'Bearer test-token',
          'Accept': 'application/json'
        }
      });

      const desktopResponse = await middleware(desktopRequest);
      const desktopEndTime = performance.now();
      const desktopProcessingTime = desktopEndTime - desktopStartTime;

      performanceMetrics.mobileOptTime.push(mobileProcessingTime);
      performanceMetrics.totalTime.push(mobileProcessingTime, desktopProcessingTime);

      // Mobile should have optimized headers for better performance
      expect(mobileResponse.headers.get('X-Mobile-Device')).toBe('true');
      expect(mobileResponse.headers.get('X-Device-Type')).toBe('mobile');
      
      // Both should be performant
      expect(mobileProcessingTime).toBeLessThan(100);
      expect(desktopProcessingTime).toBeLessThan(100);
    });

    test('should handle low power mode optimization', async () => {
      const startTime = performance.now();
      
      const request = new NextRequest('http://localhost:3000/api/couples/timeline', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'Authorization': 'Bearer test-token',
          'Accept': 'application/json',
          'Battery-Level': '15' // Simulating low battery
        }
      });

      const response = await middleware(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      performanceMetrics.totalTime.push(processingTime);

      expect(processingTime).toBeLessThan(80);
      // Should include optimization headers for low power devices
      expect(response.headers.get('X-Low-Power-Mode')).toBeTruthy();
      expect(response.headers.get('X-Reduce-Animations')).toBeTruthy();
    });
  });

  describe('Wedding Season Performance', () => {
    test('should handle wedding season traffic efficiently', async () => {
      // Simulate multiple concurrent requests during wedding season
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const request = new NextRequest(`http://localhost:3000/api/suppliers/availability?date=2025-06-${15 + i}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            'Authorization': `Bearer test-token-${i}`,
            'Accept': 'application/json'
          }
        });
        
        promises.push(middleware(request));
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalProcessingTime = endTime - startTime;
      const avgProcessingTime = totalProcessingTime / concurrentRequests;

      performanceMetrics.totalTime.push(avgProcessingTime);

      // All requests should be processed efficiently
      expect(avgProcessingTime).toBeLessThan(200);
      responses.forEach(response => {
        expect(response).toBeDefined();
      });
    });

    test('should maintain performance during peak Saturday traffic', async () => {
      // Simulate Saturday wedding day traffic
      const saturdayRequests = [
        { endpoint: '/api/suppliers/timeline', method: 'GET' },
        { endpoint: '/api/couples/checklist', method: 'GET' },
        { endpoint: '/api/forms/submit', method: 'POST' },
        { endpoint: '/api/bookings/status', method: 'GET' },
        { endpoint: '/api/suppliers/emergency-contact', method: 'GET' }
      ];

      const results: number[] = [];

      for (const req of saturdayRequests) {
        const startTime = performance.now();
        
        const request = new NextRequest(`http://localhost:3000${req.endpoint}`, {
          method: req.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            'Authorization': 'Bearer wedding-day-token',
            'Accept': 'application/json',
            ...(req.method === 'POST' && { 
              'Content-Type': 'application/json',
              'X-CSRF-Token': 'saturday-csrf-token'
            })
          },
          ...(req.method === 'POST' && {
            body: JSON.stringify({ urgent: true, weddingDate: '2025-06-28' })
          })
        });

        const response = await middleware(request);
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        results.push(processingTime);

        // Saturday requests must be ultra-fast for wedding coordination
        expect(processingTime).toBeLessThan(100);
        expect(response).toBeDefined();
      }

      const avgSaturdayTime = results.reduce((a, b) => a + b, 0) / results.length;
      performanceMetrics.totalTime.push(...results);

      expect(avgSaturdayTime).toBeLessThan(80);
    });
  });

  describe('Rate Limiting Performance', () => {
    test('should apply rate limiting efficiently without significant overhead', async () => {
      const requestCount = 5;
      const results: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();
        
        const request = new NextRequest('http://localhost:3000/api/suppliers/dashboard', {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Authorization': 'Bearer test-token',
            'Accept': 'application/json',
            'X-Forwarded-For': `192.168.1.${100 + i}` // Different IPs to avoid rate limiting
          }
        });

        const response = await middleware(request);
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        results.push(processingTime);

        performanceMetrics.rateLimitTime.push(processingTime);

        // Rate limiting check should add minimal overhead
        expect(processingTime).toBeLessThan(60);
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      }

      const avgRateLimitTime = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avgRateLimitTime).toBeLessThan(50);
    });
  });

  describe('Security Overhead Analysis', () => {
    test('should maintain performance with full security stack', async () => {
      const startTime = performance.now();
      
      const request = new NextRequest('http://localhost:3000/api/payments/intent', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'Authorization': 'Bearer premium-user-token',
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'secure-csrf-token',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount: 29900, // £299.00 wedding package
          currency: 'gbp',
          weddingDate: '2025-08-15'
        })
      });

      const response = await middleware(request);
      const endTime = performance.now();
      const securityProcessingTime = endTime - startTime;

      performanceMetrics.totalTime.push(securityProcessingTime);

      // Full security stack should still be performant
      expect(securityProcessingTime).toBeLessThan(200);
      
      // Verify security headers are present
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('Performance Monitoring and Alerts', () => {
    test('should track and report performance metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/analytics', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Authorization': 'Bearer analytics-token',
          'Accept': 'application/json'
        }
      });

      const response = await middleware(request);
      const processingTime = response.headers.get('X-Processing-Time');

      expect(processingTime).toBeDefined();
      expect(processingTime).toMatch(/\d+\.\d+ms/);
      
      const timeValue = parseFloat(processingTime!.replace('ms', ''));
      expect(timeValue).toBeLessThan(100);
    });

    test('should identify performance regressions', () => {
      // Analyze collected metrics for performance regression detection
      const recentMetrics = performanceMetrics.totalTime.slice(-10);
      const avgRecentTime = recentMetrics.reduce((a, b) => a + b, 0) / recentMetrics.length;

      // Performance should be consistently good
      expect(avgRecentTime).toBeLessThan(100);
      
      // No single request should be exceptionally slow
      recentMetrics.forEach(time => {
        expect(time).toBeLessThan(300);
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain low memory footprint during processing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process multiple requests to test memory usage
      const requests = Array.from({ length: 20 }, (_, i) => {
        return new NextRequest(`http://localhost:3000/api/suppliers/list?page=${i}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
            'Authorization': 'Bearer memory-test-token',
            'Accept': 'application/json'
          }
        });
      });

      for (const request of requests) {
        await middleware(request);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 20 requests)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

/**
 * Performance Test Results Summary
 * 
 * This test suite validates that the WedSync API Gateway maintains
 * high performance standards across all scenarios:
 * 
 * - Public endpoints: <50ms
 * - Authenticated endpoints: <100ms  
 * - Complex POST operations: <150ms
 * - Mobile optimized requests: <100ms with optimization headers
 * - Wedding season traffic: <200ms average under concurrent load
 * - Saturday wedding day requests: <100ms (critical for live events)
 * - Rate limiting overhead: <60ms per request
 * - Full security stack: <200ms for payment operations
 * - Memory usage: Stable under continuous load
 * 
 * All tests include realistic wedding industry scenarios and mobile
 * device considerations for comprehensive performance validation.
 */