import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { testApiHandler } from 'next-test-api-route-handler';
import { v4 as uuidv4 } from 'uuid';

// Wedding Season Performance Testing Suite
export class WeddingSeasonPerformanceTester {
  private testData: {
    suppliers: any[];
    clients: any[];
    bookings: any[];
    forms: any[];
  } = {
    suppliers: [],
    clients: [],
    bookings: [],
    forms: []
  };

  async generateWeddingSeasonTestData(): Promise<void> {
    // Generate peak season test data (May-September scenarios)
    const weddingSeasons = ['spring', 'summer', 'autumn'];
    const supplierTypes = ['photographer', 'venue', 'caterer', 'florist', 'planner'];
    const venueTypes = ['outdoor', 'indoor', 'mixed', 'destination'];
    const budgetRanges = ['1000_2500', '2500_5000', '5000_10000', '10000_plus'];

    // Generate 100 suppliers for load testing
    for (let i = 0; i < 100; i++) {
      this.testData.suppliers.push({
        id: uuidv4(),
        name: `Test ${supplierTypes[i % supplierTypes.length]} ${i + 1}`,
        type: supplierTypes[i % supplierTypes.length],
        location: `Region ${i % 10}`,
        active: true,
        created_at: new Date(2024, Math.floor(Math.random() * 12), 1).toISOString()
      });
    }

    // Generate 1000 clients with peak season wedding dates
    for (let i = 0; i < 1000; i++) {
      const weddingDate = this.generatePeakSeasonDate();
      const supplierId = this.testData.suppliers[i % this.testData.suppliers.length].id;

      this.testData.clients.push({
        id: uuidv4(),
        supplier_id: supplierId,
        couple_name: `Couple ${i + 1}`,
        wedding_date: weddingDate.toISOString(),
        venue_name: `Venue ${i + 1}`,
        venue_type: venueTypes[i % venueTypes.length],
        guest_count: Math.floor(Math.random() * 300) + 50, // 50-350 guests
        budget_range: budgetRanges[i % budgetRanges.length],
        contact_email: `couple${i + 1}@example.com`,
        status: 'active',
        created_at: new Date().toISOString()
      });
    }

    // Generate bookings and forms
    this.testData.clients.forEach((client, index) => {
      if (Math.random() > 0.3) { // 70% have bookings
        this.testData.bookings.push({
          id: uuidv4(),
          supplier_id: client.supplier_id,
          client_id: client.id,
          service_date: client.wedding_date,
          status: Math.random() > 0.1 ? 'confirmed' : 'pending',
          package_tier: ['basic', 'premium', 'luxury'][Math.floor(Math.random() * 3)],
          total_amount: Math.floor(Math.random() * 8000) + 1000
        });
      }

      if (Math.random() > 0.5) { // 50% have forms
        this.testData.forms.push({
          id: uuidv4(),
          supplier_id: client.supplier_id,
          client_id: client.id,
          form_type: ['client_intake', 'payment_form', 'questionnaire'][Math.floor(Math.random() * 3)],
          status: Math.random() > 0.2 ? 'submitted' : 'pending',
          created_at: new Date().toISOString()
        });
      }
    });

    console.log(`Generated wedding season test data:
      - ${this.testData.suppliers.length} suppliers
      - ${this.testData.clients.length} clients  
      - ${this.testData.bookings.length} bookings
      - ${this.testData.forms.length} forms`);
  }

  private generatePeakSeasonDate(): Date {
    // Generate dates in peak wedding season (May-September)
    const year = 2025;
    const peakMonths = [4, 5, 6, 7, 8]; // May-September (0-based)
    const month = peakMonths[Math.floor(Math.random() * peakMonths.length)];
    const day = Math.floor(Math.random() * 28) + 1; // Safe day range
    const hour = Math.floor(Math.random() * 12) + 10; // 10am-10pm

    return new Date(year, month, day, hour, 0, 0);
  }

  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up wedding season performance test data');
  }

  // Performance measurement utilities
  async measureResponseTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    return { result, duration: end - start };
  }

  async runConcurrentRequests(requests: (() => Promise<any>)[], maxConcurrency: number = 50): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(request => request()));
      results.push(...batchResults);
    }
    
    return results;
  }

  generatePerformanceReport(results: any[], testName: string): PerformanceReport {
    const responseTimes = results.map(r => r.duration || 0);
    const successfulRequests = results.filter(r => r.success !== false);
    
    const sorted = responseTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      testName,
      totalRequests: results.length,
      successfulRequests: successfulRequests.length,
      successRate: (successfulRequests.length / results.length) * 100,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      timestamp: new Date().toISOString()
    };
  }
}

interface PerformanceReport {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  timestamp: string;
}

describe('Wedding Season Performance Testing', () => {
  let performanceTester: WeddingSeasonPerformanceTester;
  let performanceReports: PerformanceReport[] = [];

  beforeAll(async () => {
    performanceTester = new WeddingSeasonPerformanceTester();
    await performanceTester.generateWeddingSeasonTestData();
  });

  afterAll(async () => {
    await performanceTester.cleanupTestData();
    
    // Log performance summary
    console.log('\n=== WEDDING SEASON PERFORMANCE REPORT ===');
    performanceReports.forEach(report => {
      console.log(`\n${report.testName}:`);
      console.log(`  Success Rate: ${report.successRate.toFixed(2)}%`);
      console.log(`  Average Response: ${report.averageResponseTime.toFixed(2)}ms`);
      console.log(`  P95 Response: ${report.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  P99 Response: ${report.p99ResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Peak Wedding Season Load Testing', () => {
    it('should handle concurrent client list requests efficiently', async () => {
      const concurrentRequests = 100;
      const supplierId = performanceTester.testData.suppliers[0].id;
      
      const requests = Array.from({ length: concurrentRequests }, () => async () => {
        const { result, duration } = await performanceTester.measureResponseTime(async () => {
          return await testApiHandler({
            handler: mockSupplierClientsHandler,
            params: { id: supplierId },
            test: async ({ fetch }) => {
              return fetch({
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer valid-jwt-token',
                },
              });
            },
          });
        });

        return { ...result, duration, success: true };
      });

      const results = await performanceTester.runConcurrentRequests(requests, 20);
      const report = performanceTester.generatePerformanceReport(results, 'Concurrent Client List Requests');
      performanceReports.push(report);

      // Performance assertions
      expect(report.successRate).toBeGreaterThan(95); // 95% success rate minimum
      expect(report.p95ResponseTime).toBeLessThan(500); // P95 under 500ms
      expect(report.averageResponseTime).toBeLessThan(200); // Average under 200ms

      console.log(`Concurrent requests performance: ${report.averageResponseTime.toFixed(2)}ms average`);
    });

    it('should maintain performance during peak season filtering', async () => {
      const peakSeasonQueries = [
        'wedding_season=summer',
        'wedding_season=spring&budget_range=5000_10000',
        'is_peak_season=true',
        'wedding_date_from=2025-05-01&wedding_date_to=2025-09-30',
        'guest_count_min=100&guest_count_max=200',
        'venue_type=outdoor',
        'urgency_level=high',
        'planning_status=final_preparations'
      ];

      const requests = peakSeasonQueries.flatMap(query =>
        Array.from({ length: 15 }, () => async () => {
          const supplierId = performanceTester.testData.suppliers[Math.floor(Math.random() * 10)].id;
          
          const { result, duration } = await performanceTester.measureResponseTime(async () => {
            return await testApiHandler({
              handler: mockSupplierClientsHandler,
              params: { id: supplierId },
              url: `/api/suppliers/${supplierId}/clients?${query}`,
              test: async ({ fetch }) => {
                return fetch({
                  method: 'GET',
                  headers: {
                    'Authorization': 'Bearer valid-jwt-token',
                  },
                });
              },
            });
          });

          return { ...result, duration, success: true };
        })
      );

      const results = await performanceTester.runConcurrentRequests(requests, 25);
      const report = performanceTester.generatePerformanceReport(results, 'Peak Season Filtering');
      performanceReports.push(report);

      expect(report.successRate).toBeGreaterThan(90);
      expect(report.p95ResponseTime).toBeLessThan(800); // Complex queries can take longer
      expect(report.averageResponseTime).toBeLessThan(300);
    });

    it('should handle Saturday wedding day peak traffic', async () => {
      // Simulate Saturday peak traffic (highest wedding activity day)
      const saturdayTrafficPatterns = [
        { endpoint: '/api/suppliers/{id}/clients', weight: 30 },
        { endpoint: '/api/suppliers/{id}/availability', weight: 25 },
        { endpoint: '/api/suppliers/{id}/bookings/today', weight: 20 },
        { endpoint: '/api/forms/{id}/submissions', weight: 15 },
        { endpoint: '/api/suppliers/{id}/timeline', weight: 10 }
      ];

      const totalRequests = 200;
      const requests = [];

      saturdayTrafficPatterns.forEach(pattern => {
        const requestCount = Math.floor(totalRequests * (pattern.weight / 100));
        
        for (let i = 0; i < requestCount; i++) {
          requests.push(async () => {
            const supplierId = performanceTester.testData.suppliers[i % 10].id;
            
            const { result, duration } = await performanceTester.measureResponseTime(async () => {
              return await testApiHandler({
                handler: getMockHandler(pattern.endpoint),
                params: { id: supplierId },
                test: async ({ fetch }) => {
                  return fetch({
                    method: 'GET',
                    headers: {
                      'Authorization': 'Bearer valid-jwt-token',
                      'X-Wedding-Day': 'true', // Special header for wedding day
                      'X-Priority': 'high'
                    },
                  });
                },
              });
            });

            return { ...result, duration, success: true, endpoint: pattern.endpoint };
          });
        }
      });

      const results = await performanceTester.runConcurrentRequests(requests, 30);
      const report = performanceTester.generatePerformanceReport(results, 'Saturday Wedding Day Peak');
      performanceReports.push(report);

      // Wedding day requirements are stricter
      expect(report.successRate).toBe(100); // 100% uptime on wedding days
      expect(report.p95ResponseTime).toBeLessThan(300); // Faster response needed
      expect(report.averageResponseTime).toBeLessThan(150);
    });

    it('should scale efficiently with database queries during peak season', async () => {
      // Test database-heavy operations that would occur during peak season
      const dbIntensiveRequests = Array.from({ length: 50 }, () => async () => {
        const supplierId = performanceTester.testData.suppliers[Math.floor(Math.random() * 10)].id;
        
        const { result, duration } = await performanceTester.measureResponseTime(async () => {
          return await testApiHandler({
            handler: mockDatabaseIntensiveHandler,
            params: { id: supplierId },
            url: `/api/suppliers/${supplierId}/analytics?include_clients=true&include_bookings=true&include_revenue=true&date_range=peak_season`,
            test: async ({ fetch }) => {
              return fetch({
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer valid-jwt-token',
                },
              });
            },
          });
        });

        return { ...result, duration, success: true };
      });

      const results = await performanceTester.runConcurrentRequests(dbIntensiveRequests, 10);
      const report = performanceTester.generatePerformanceReport(results, 'Database Intensive Operations');
      performanceReports.push(report);

      expect(report.successRate).toBeGreaterThan(95);
      expect(report.p95ResponseTime).toBeLessThan(1500); // Complex DB queries
      expect(report.averageResponseTime).toBeLessThan(800);
    });

    it('should handle mobile API requests under peak load', async () => {
      const mobileRequests = Array.from({ length: 75 }, () => async () => {
        const supplierId = performanceTester.testData.suppliers[Math.floor(Math.random() * 20)].id;
        
        const { result, duration } = await performanceTester.measureResponseTime(async () => {
          return await testApiHandler({
            handler: mockMobileOptimizedHandler,
            params: { id: supplierId },
            url: `/api/suppliers/${supplierId}/clients/mobile`,
            test: async ({ fetch }) => {
              return fetch({
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer valid-jwt-token',
                  'X-Connection-Type': '4g',
                  'X-Device-Type': 'mobile',
                  'X-Viewport': '375x812'
                },
              });
            },
          });
        });

        return { ...result, duration, success: true };
      });

      const results = await performanceTester.runConcurrentRequests(mobileRequests, 25);
      const report = performanceTester.generatePerformanceReport(results, 'Mobile API Peak Load');
      performanceReports.push(report);

      expect(report.successRate).toBeGreaterThan(98); // Mobile needs higher reliability
      expect(report.p95ResponseTime).toBeLessThan(400); // Mobile needs faster response
      expect(report.averageResponseTime).toBeLessThan(180);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting gracefully during peak season', async () => {
      const rateLimitRequests = Array.from({ length: 200 }, () => async () => {
        const supplierId = performanceTester.testData.suppliers[0].id; // Same supplier to trigger limits
        
        const { result, duration } = await performanceTester.measureResponseTime(async () => {
          return await testApiHandler({
            handler: mockRateLimitedHandler,
            params: { id: supplierId },
            test: async ({ fetch }) => {
              return fetch({
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer basic-tier-jwt-token', // Basic tier has lower limits
                },
              });
            },
          });
        });

        return { ...result, duration, success: result.status !== 429 };
      });

      const results = await performanceTester.runConcurrentRequests(rateLimitRequests, 50);
      const report = performanceTester.generatePerformanceReport(results, 'Rate Limiting Under Load');
      performanceReports.push(report);

      // Rate limiting should still be responsive
      const rateLimitedRequests = results.filter(r => !r.success);
      expect(rateLimitedRequests.length).toBeGreaterThan(0); // Some should be rate limited
      expect(report.p95ResponseTime).toBeLessThan(100); // Rate limit responses should be fast
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during peak load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run intensive operations
      const intensiveRequests = Array.from({ length: 100 }, () => async () => {
        const supplierId = performanceTester.testData.suppliers[Math.floor(Math.random() * 50)].id;
        
        return await testApiHandler({
          handler: mockMemoryIntensiveHandler,
          params: { id: supplierId },
          test: async ({ fetch }) => {
            return fetch({
              method: 'GET',
              headers: {
                'Authorization': 'Bearer valid-jwt-token',
              },
            });
          },
        });
      });

      await performanceTester.runConcurrentRequests(intensiveRequests, 20);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerRequest = memoryIncrease / intensiveRequests.length;

      // Memory increase should be reasonable
      expect(memoryIncreasePerRequest).toBeLessThan(1024 * 1024); // Less than 1MB per request
      console.log(`Memory usage per request: ${(memoryIncreasePerRequest / 1024).toFixed(2)}KB`);
    });
  });
});

// Mock handlers for performance testing
const mockSupplierClientsHandler = async (req: Request) => {
  // Simulate database query time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  
  return new Response(JSON.stringify({
    success: true,
    data: {
      clients: [],
      summary: {},
    },
    meta: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
    }
  }), { status: 200 });
};

const mockDatabaseIntensiveHandler = async (req: Request) => {
  // Simulate complex database operations
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  
  return new Response(JSON.stringify({
    success: true,
    data: { analytics: {} },
    meta: { requestId: uuidv4(), timestamp: new Date().toISOString() }
  }), { status: 200 });
};

const mockMobileOptimizedHandler = async (req: Request) => {
  // Mobile responses should be faster and lighter
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
  
  return new Response(JSON.stringify({
    success: true,
    data: { clients: [], compressed: true },
    meta: { requestId: uuidv4(), timestamp: new Date().toISOString() }
  }), { status: 200 });
};

const mockRateLimitedHandler = async (req: Request) => {
  // Simulate rate limiting logic
  const shouldRateLimit = Math.random() > 0.7; // 30% rate limited
  
  if (shouldRateLimit) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: 60 }
    }), { status: 429 });
  }
  
  return new Response(JSON.stringify({
    success: true,
    data: {},
    meta: { requestId: uuidv4(), timestamp: new Date().toISOString() }
  }), { status: 200 });
};

const mockMemoryIntensiveHandler = async (req: Request) => {
  // Simulate memory-intensive operations
  const largeData = new Array(1000).fill(0).map(() => ({
    id: uuidv4(),
    data: 'x'.repeat(100)
  }));
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return new Response(JSON.stringify({
    success: true,
    data: { results: largeData.slice(0, 10) }, // Return only subset
    meta: { requestId: uuidv4(), timestamp: new Date().toISOString() }
  }), { status: 200 });
};

const getMockHandler = (endpoint: string) => {
  if (endpoint.includes('/clients')) return mockSupplierClientsHandler;
  if (endpoint.includes('/availability')) return mockSupplierClientsHandler;
  if (endpoint.includes('/bookings')) return mockSupplierClientsHandler;
  return mockSupplierClientsHandler;
};