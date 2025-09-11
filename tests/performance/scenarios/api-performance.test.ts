// API Performance Testing for WS-257
import { test, expect } from '@playwright/test';
import { LoadGenerator, PerformanceTimer, WeddingTestDataGenerator, performanceExpect } from '../utils/performance-utils';
import { defaultPerformanceConfig } from '../config/performance-config';

// API Performance Testing Suite
test.describe('API Performance Tests', () => {
  let loadGenerator: LoadGenerator;
  let performanceTimer: PerformanceTimer;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(() => {
    loadGenerator = new LoadGenerator();
    performanceTimer = new PerformanceTimer();
  });

  test.describe('Wedding API Endpoints', () => {
    test('should handle wedding data retrieval within performance targets', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      // Test individual API endpoints
      const endpoints = [
        { path: `/api/weddings/${wedding.id}`, name: 'Wedding Details' },
        { path: `/api/weddings/${wedding.id}/guests`, name: 'Guest List' },
        { path: `/api/weddings/${wedding.id}/vendors`, name: 'Vendor List' },
        { path: `/api/weddings/${wedding.id}/timeline`, name: 'Timeline' },
        { path: `/api/weddings/${wedding.id}/documents`, name: 'Documents' }
      ];

      const results: Array<{ name: string; responseTime: number; statusCode: number }> = [];

      for (const endpoint of endpoints) {
        performanceTimer.mark(`${endpoint.name}-start`);
        
        const response = await request.get(`${baseUrl}${endpoint.path}`, {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        const responseTime = performanceTimer.measure(endpoint.name, `${endpoint.name}-start`);
        
        results.push({
          name: endpoint.name,
          responseTime,
          statusCode: response.status()
        });

        // Verify response time target
        performanceExpect.responseTimeBelow(
          responseTime,
          defaultPerformanceConfig.targets.apiResponse,
          `${endpoint.name} API response time`
        );

        expect(response.status()).toBe(200);
      }

      console.log('Wedding API Performance Results:');
      results.forEach(result => {
        console.log(`- ${result.name}: ${result.responseTime.toFixed(2)}ms (${result.statusCode})`);
      });
    });

    test('should handle concurrent API requests efficiently', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      const concurrentRequests = 100;
      
      const apiRequestFunction = async () => {
        const endpoints = [
          `/api/weddings/${wedding.id}`,
          `/api/weddings/${wedding.id}/guests`,
          `/api/weddings/${wedding.id}/timeline`
        ];
        
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        const response = await request.get(`${baseUrl}${randomEndpoint}`, {
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 10000
        });

        if (response.status() !== 200) {
          throw new Error(`API request failed with status ${response.status()}`);
        }

        return response;
      };

      // Run concurrent API load test
      await loadGenerator.sustainedLoad({
        rps: 50, // 50 requests per second
        duration: 60000, // 1 minute
        requestFn: apiRequestFunction,
        onProgress: (stats) => {
          console.log(`API Load Progress: ${stats.totalRequests} requests, ${stats.errorRate.toFixed(2)}% errors`);
        }
      });

      const finalStats = loadGenerator.getStatistics();

      // Verify API performance under load
      performanceExpected.errorRateBelow(finalStats.errorRate, 1, 'API error rate under load');
      performanceExpected.responseTimeBelow(finalStats.responseTime.p95, 500, 'API P95 response time under load');
      performanceExpected.throughputAbove(finalStats.totalRequests / 60, 45, 'API throughput (RPS)');

      console.log('Concurrent API Load Test Results:');
      console.log(`- Total Requests: ${finalStats.totalRequests}`);
      console.log(`- Error Rate: ${finalStats.errorRate.toFixed(2)}%`);
      console.log(`- P50 Response Time: ${finalStats.responseTime.p50.toFixed(2)}ms`);
      console.log(`- P95 Response Time: ${finalStats.responseTime.p95.toFixed(2)}ms`);
      console.log(`- P99 Response Time: ${finalStats.responseTime.p99.toFixed(2)}ms`);
      console.log(`- Average RPS: ${(finalStats.totalRequests / 60).toFixed(2)}`);
    });

    test('should handle bulk operations efficiently', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      // Test bulk guest creation
      const guestData = Array(100).fill(null).map((_, index) => ({
        name: `Bulk Guest ${index}`,
        email: `bulkguest${index}@example.com`,
        phone: `+155512340${String(index).padStart(3, '0')}`,
        rsvp_status: 'pending'
      }));

      performanceTimer.mark('bulk-guest-creation-start');

      const bulkCreateResponse = await request.post(`${baseUrl}/api/weddings/${wedding.id}/guests/bulk`, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        data: { guests: guestData },
        timeout: 30000
      });

      const bulkCreateTime = performanceTimer.measure('bulk-guest-creation', 'bulk-guest-creation-start');

      expect(bulkCreateResponse.status()).toBe(200);
      
      // Bulk creation should complete within reasonable time
      expect(bulkCreateTime).toBeLessThan(10000); // 10 seconds for 100 guests

      // Test bulk guest updates
      const updateData = guestData.slice(0, 50).map((guest, index) => ({
        id: `guest-${index}`,
        rsvp_status: 'accepted'
      }));

      performanceTimer.mark('bulk-guest-update-start');

      const bulkUpdateResponse = await request.patch(`${baseUrl}/api/weddings/${wedding.id}/guests/bulk`, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        data: { updates: updateData },
        timeout: 30000
      });

      const bulkUpdateTime = performanceTimer.measure('bulk-guest-update', 'bulk-guest-update-start');

      expect(bulkUpdateResponse.status()).toBe(200);
      expect(bulkUpdateTime).toBeLessThan(5000); // 5 seconds for 50 updates

      console.log('Bulk Operations Performance:');
      console.log(`- Bulk Create (100 guests): ${bulkCreateTime.toFixed(2)}ms`);
      console.log(`- Bulk Update (50 guests): ${bulkUpdateTime.toFixed(2)}ms`);
    });
  });

  test.describe('Cache-Enabled API Performance', () => {
    test('should demonstrate cache performance improvements', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      const endpoint = `/api/weddings/${wedding.id}`;

      // First request (cache miss)
      performanceTimer.mark('cache-miss-start');
      const firstResponse = await request.get(`${baseUrl}${endpoint}`, {
        headers: { 
          'Authorization': 'Bearer test-token',
          'Cache-Control': 'no-cache'
        }
      });
      const cacheMissTime = performanceTimer.measure('cache-miss', 'cache-miss-start');

      expect(firstResponse.status()).toBe(200);

      // Second request (cache hit)
      performanceTimer.mark('cache-hit-start');
      const secondResponse = await request.get(`${baseUrl}${endpoint}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      const cacheHitTime = performanceTimer.measure('cache-hit', 'cache-hit-start');

      expect(secondResponse.status()).toBe(200);

      // Cache hit should be significantly faster
      const performanceImprovement = ((cacheMissTime - cacheHitTime) / cacheMissTime) * 100;
      expect(performanceImprovement).toBeGreaterThan(30); // At least 30% improvement

      console.log('Cache Performance Results:');
      console.log(`- Cache Miss: ${cacheMissTime.toFixed(2)}ms`);
      console.log(`- Cache Hit: ${cacheHitTime.toFixed(2)}ms`);
      console.log(`- Performance Improvement: ${performanceImprovement.toFixed(1)}%`);
    });

    test('should maintain cache performance under load', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      const endpoint = `/api/weddings/${wedding.id}`;

      // Warm the cache first
      await request.get(`${baseUrl}${endpoint}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      const cacheHitRequestFunction = async () => {
        const response = await request.get(`${baseUrl}${endpoint}`, {
          headers: { 'Authorization': 'Bearer test-token' }
        });

        if (response.status() !== 200) {
          throw new Error(`Cache request failed with status ${response.status()}`);
        }

        return response;
      };

      // Load test cached endpoint
      await loadGenerator.sustainedLoad({
        rps: 200, // 200 requests per second for cached data
        duration: 30000, // 30 seconds
        requestFn: cacheHitRequestFunction,
        onProgress: (stats) => {
          console.log(`Cache Load Progress: ${stats.totalRequests} requests, ${stats.responseTime.avg.toFixed(2)}ms avg`);
        }
      });

      const cacheStats = loadGenerator.getStatistics();

      // Cached endpoints should have very low response times
      performanceExpected.responseTimeBelow(cacheStats.responseTime.p95, 50, 'Cached API P95 response time');
      performanceExpected.errorRateBelow(cacheStats.errorRate, 0.1, 'Cached API error rate');

      console.log('Cache Load Test Results:');
      console.log(`- Total Cached Requests: ${cacheStats.totalRequests}`);
      console.log(`- Error Rate: ${cacheStats.errorRate.toFixed(2)}%`);
      console.log(`- Average Response Time: ${cacheStats.responseTime.avg.toFixed(2)}ms`);
      console.log(`- P95 Response Time: ${cacheStats.responseTime.p95.toFixed(2)}ms`);
    });
  });

  test.describe('Real-time API Performance', () => {
    test('should handle WebSocket connections efficiently', async ({ page }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      await page.goto(`${baseUrl}/dashboard/weddings/${wedding.id}`);
      
      // Test WebSocket connection performance
      const wsMetrics = await page.evaluate(async (weddingId) => {
        const startTime = performance.now();
        
        // Establish WebSocket connection
        const ws = new WebSocket(`ws://localhost:3000/api/ws/wedding/${weddingId}`);
        
        return new Promise((resolve) => {
          ws.onopen = () => {
            const connectionTime = performance.now() - startTime;
            
            // Test message round-trip time
            const messageStartTime = performance.now();
            
            ws.onmessage = (event) => {
              const roundTripTime = performance.now() - messageStartTime;
              
              resolve({
                connectionTime,
                roundTripTime,
                connected: true
              });
              
              ws.close();
            };
            
            // Send test message
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          };
          
          ws.onerror = () => {
            resolve({
              connectionTime: performance.now() - startTime,
              roundTripTime: 0,
              connected: false
            });
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            resolve({
              connectionTime: performance.now() - startTime,
              roundTripTime: 0,
              connected: false
            });
          }, 5000);
        });
      }, wedding.id);

      expect(wsMetrics.connected).toBeTruthy();
      expect(wsMetrics.connectionTime).toBeLessThan(1000); // 1 second connection time
      expect(wsMetrics.roundTripTime).toBeLessThan(100); // 100ms round-trip

      console.log('WebSocket Performance Results:');
      console.log(`- Connection Time: ${wsMetrics.connectionTime.toFixed(2)}ms`);
      console.log(`- Round-trip Time: ${wsMetrics.roundTripTime.toFixed(2)}ms`);
      console.log(`- Connected: ${wsMetrics.connected}`);
    });

    test('should handle multiple concurrent WebSocket connections', async ({ browser }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      const concurrentConnections = 50;
      
      const connectionPromises = Array(concurrentConnections).fill(null).map(async (_, index) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const connectionResult = await page.evaluate(async (weddingId, clientIndex) => {
          const startTime = performance.now();
          const ws = new WebSocket(`ws://localhost:3000/api/ws/wedding/${weddingId}`);
          
          return new Promise((resolve) => {
            ws.onopen = () => {
              const connectionTime = performance.now() - startTime;
              
              // Send a message and measure response time
              const messageStart = performance.now();
              
              ws.onmessage = () => {
                const responseTime = performance.now() - messageStart;
                resolve({ connectionTime, responseTime, success: true });
                ws.close();
              };
              
              ws.send(JSON.stringify({
                type: 'test',
                clientId: clientIndex,
                timestamp: Date.now()
              }));
            };
            
            ws.onerror = () => {
              resolve({ 
                connectionTime: performance.now() - startTime, 
                responseTime: 0, 
                success: false 
              });
            };
            
            setTimeout(() => {
              resolve({ 
                connectionTime: performance.now() - startTime, 
                responseTime: 0, 
                success: false 
              });
            }, 10000);
          });
        }, wedding.id, index);
        
        await context.close();
        return connectionResult;
      });

      const results = await Promise.all(connectionPromises);
      const successfulConnections = results.filter(r => r.success);
      const averageConnectionTime = successfulConnections.reduce((sum, r) => sum + r.connectionTime, 0) / successfulConnections.length;
      const averageResponseTime = successfulConnections.reduce((sum, r) => sum + r.responseTime, 0) / successfulConnections.length;

      // Verify WebSocket performance under load
      expect(successfulConnections.length / concurrentConnections).toBeGreaterThan(0.95); // 95% success rate
      expect(averageConnectionTime).toBeLessThan(2000); // 2 seconds average connection time
      expect(averageResponseTime).toBeLessThan(500); // 500ms average response time

      console.log('Concurrent WebSocket Performance Results:');
      console.log(`- Concurrent Connections: ${concurrentConnections}`);
      console.log(`- Successful Connections: ${successfulConnections.length} (${((successfulConnections.length / concurrentConnections) * 100).toFixed(1)}%)`);
      console.log(`- Average Connection Time: ${averageConnectionTime.toFixed(2)}ms`);
      console.log(`- Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    });
  });

  test.describe('Database Performance', () => {
    test('should handle complex queries efficiently', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding({
        guestCount: 500,
        vendorCount: 15
      });

      // Test complex wedding dashboard query that joins multiple tables
      performanceTimer.mark('complex-query-start');

      const complexQueryResponse = await request.get(`${baseUrl}/api/weddings/${wedding.id}/dashboard`, {
        headers: { 'Authorization': 'Bearer test-token' },
        timeout: 10000
      });

      const complexQueryTime = performanceTimer.measure('complex-query', 'complex-query-start');

      expect(complexQueryResponse.status()).toBe(200);
      
      const responseData = await complexQueryResponse.json();
      expect(responseData.wedding).toBeDefined();
      expect(responseData.guests).toBeDefined();
      expect(responseData.vendors).toBeDefined();
      expect(responseData.timeline).toBeDefined();

      // Complex query should still be fast
      performanceExpected.responseTimeBelow(complexQueryTime, 1000, 'Complex wedding dashboard query');

      // Test search functionality
      performanceTimer.mark('search-query-start');

      const searchResponse = await request.get(`${baseUrl}/api/weddings/${wedding.id}/guests/search?q=Smith&limit=50`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      const searchQueryTime = performanceTimer.measure('search-query', 'search-query-start');

      expect(searchResponse.status()).toBe(200);
      performanceExpected.responseTimeBelow(searchQueryTime, 300, 'Guest search query');

      console.log('Database Query Performance Results:');
      console.log(`- Complex Dashboard Query: ${complexQueryTime.toFixed(2)}ms`);
      console.log(`- Guest Search Query: ${searchQueryTime.toFixed(2)}ms`);
    });

    test('should handle database connection pooling under load', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      
      const dbRequestFunction = async () => {
        // Mix of different query types to test connection pool
        const queryTypes = [
          `/api/weddings/${wedding.id}`,
          `/api/weddings/${wedding.id}/guests`,
          `/api/weddings/${wedding.id}/vendors`,
          `/api/analytics/wedding/${wedding.id}/summary`
        ];

        const randomQuery = queryTypes[Math.floor(Math.random() * queryTypes.length)];
        
        const response = await request.get(`${baseUrl}${randomQuery}`, {
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 5000
        });

        if (response.status() !== 200) {
          throw new Error(`Database query failed with status ${response.status()}`);
        }

        return response;
      };

      // Test database connection pool with high concurrent load
      await loadGenerator.sustainedLoad({
        rps: 100, // 100 database queries per second
        duration: 30000, // 30 seconds
        requestFn: dbRequestFunction,
        onProgress: (stats) => {
          console.log(`DB Load Progress: ${stats.totalRequests} queries, ${stats.errorRate.toFixed(2)}% errors`);
        }
      });

      const dbStats = loadGenerator.getStatistics();

      // Database should handle high load efficiently
      performanceExpected.errorRateBelow(dbStats.errorRate, 1, 'Database error rate under load');
      performanceExpected.responseTimeBelow(dbStats.responseTime.p95, 800, 'Database P95 response time under load');

      console.log('Database Connection Pool Results:');
      console.log(`- Total DB Queries: ${dbStats.totalRequests}`);
      console.log(`- Error Rate: ${dbStats.errorRate.toFixed(2)}%`);
      console.log(`- P95 Response Time: ${dbStats.responseTime.p95.toFixed(2)}ms`);
      console.log(`- Average Response Time: ${dbStats.responseTime.avg.toFixed(2)}ms`);
    });
  });

  test.describe('API Rate Limiting', () => {
    test('should enforce rate limits correctly', async ({ request }) => {
      const wedding = WeddingTestDataGenerator.generateWedding();
      const endpoint = `/api/weddings/${wedding.id}`;
      
      // Test rate limiting by making rapid requests
      const rapidRequests = Array(200).fill(null).map(async (_, index) => {
        try {
          const response = await request.get(`${baseUrl}${endpoint}`, {
            headers: { 
              'Authorization': 'Bearer test-token',
              'X-Client-ID': 'rate-limit-test'
            },
            timeout: 5000
          });
          
          return {
            index,
            status: response.status(),
            headers: Object.fromEntries(
              ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
                .map(h => [h, response.headers()[h]])
                .filter(([, v]) => v)
            )
          };
        } catch (error) {
          return {
            index,
            status: 0,
            error: error.message,
            headers: {}
          };
        }
      });

      const results = await Promise.allSettled(rapidRequests);
      const responses = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(rateLimitedRequests.length).toBeGreaterThan(0); // Rate limiting should kick in
      expect(successfulRequests.length).toBeGreaterThan(0); // Some requests should succeed

      console.log('Rate Limiting Test Results:');
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Successful Requests: ${successfulRequests.length}`);
      console.log(`- Rate Limited Requests: ${rateLimitedRequests.length}`);
      
      if (rateLimitedRequests.length > 0) {
        const rateLimitHeaders = rateLimitedRequests[0].headers;
        console.log('Rate Limit Headers:', rateLimitHeaders);
      }
    });
  });

  test.afterEach(async () => {
    const testName = expect.getState().currentTestName || 'Unknown Test';
    const duration = performanceTimer.getDuration();
    
    console.log(`\n${testName} completed in ${duration.toFixed(2)}ms`);
    
    // Reset load generator for next test
    loadGenerator.reset();
  });
});

// API Security Performance Tests
test.describe('API Security Performance', () => {
  test('should handle authentication efficiently', async ({ request }) => {
    const authEndpoint = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/login`;
    
    const authFunction = async () => {
      const response = await request.post(authEndpoint, {
        data: {
          email: 'test@example.com',
          password: 'testpassword123'
        },
        timeout: 5000
      });

      if (response.status() !== 200 && response.status() !== 401) {
        throw new Error(`Auth request failed with status ${response.status()}`);
      }

      return response;
    };

    // Test authentication under load
    const loadGenerator = new LoadGenerator();
    await loadGenerator.sustainedLoad({
      rps: 20, // 20 auth attempts per second
      duration: 10000, // 10 seconds
      requestFn: authFunction,
      onProgress: (stats) => {
        console.log(`Auth Load Progress: ${stats.totalRequests} attempts, ${stats.errorRate.toFixed(2)}% errors`);
      }
    });

    const authStats = loadGenerator.getStatistics();

    // Authentication should remain performant under load
    expect(authStats.responseTime.p95).toBeLessThan(1000); // 1 second P95
    console.log(`Authentication Performance: ${authStats.responseTime.avg.toFixed(2)}ms average`);
  });
});

test.afterAll(async () => {
  console.log('\n=== API Performance Testing Complete ===');
  console.log('All API performance targets validated');
});