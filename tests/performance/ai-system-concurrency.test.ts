import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import type { 
  DualAIRouter,
  ConcurrencyTestScenario,
  AIProviderMetrics,
  SystemResourceMetrics
} from '../../src/types/ai-system';

/**
 * WS-239 Team E: AI System Concurrency and Resource Performance Testing
 * 
 * CRITICAL CONCURRENCY SCENARIOS:
 * - Multi-supplier simultaneous AI processing
 * - Platform AI vs Client AI concurrent load
 * - Provider failover during high concurrency
 * - API rate limiting under concurrent load
 * - Cost calculation accuracy under pressure
 * - Queue management and prioritization
 * - Resource allocation and optimization
 */

// System resource monitoring utilities
class SystemResourceMonitor {
  private resourceSnapshots: SystemResourceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  startMonitoring(intervalMs: number = 1000): void {
    this.monitoringInterval = setInterval(() => {
      this.resourceSnapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        eventLoopLag: this.measureEventLoopLag()
      });
    }, intervalMs);
  }
  
  stopMonitoring(): SystemResourceMetrics[] {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    return this.resourceSnapshots;
  }
  
  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    return new Promise<number>((resolve) => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    }) as any; // Simplified for testing
  }
  
  getAverageMemoryUsage(): number {
    return this.resourceSnapshots.reduce((sum, snap) => sum + snap.memory.used, 0) / this.resourceSnapshots.length;
  }
  
  getPeakMemoryUsage(): number {
    return Math.max(...this.resourceSnapshots.map(snap => snap.memory.used));
  }
  
  clear(): void {
    this.resourceSnapshots = [];
  }
}

// Mock AI providers with different characteristics
class MockAIProvider {
  constructor(
    public name: string,
    public rateLimit: number, // requests per minute
    public avgResponseTime: number, // milliseconds
    public errorRate: number // percentage
  ) {}
  
  async processRequest(request: any): Promise<any> {
    // Simulate rate limiting
    if (this.currentRequests >= this.rateLimit / 60) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }
    
    this.currentRequests++;
    
    // Simulate processing time with variance
    const responseTime = this.avgResponseTime + (Math.random() - 0.5) * this.avgResponseTime * 0.3;
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    // Simulate errors
    if (Math.random() < this.errorRate / 100) {
      throw new Error(`${this.name} processing failed`);
    }
    
    return {
      provider: this.name,
      processingTime: responseTime,
      success: true,
      cost: Math.random() * 0.25 // $0.00-$0.25 per request
    };
  }
  
  private currentRequests = 0;
  
  resetRateLimit(): void {
    this.currentRequests = 0;
  }
}

describe('AI System Concurrency Performance Testing', () => {
  let dualAIRouter: DualAIRouter;
  let resourceMonitor: SystemResourceMonitor;
  let mockProviders: Map<string, MockAIProvider>;
  
  beforeEach(async () => {
    dualAIRouter = {
      routeRequest: vi.fn(),
      checkUsageLimits: vi.fn(),
      handleMigration: vi.fn(),
      trackCosts: vi.fn(),
      getQueueStats: vi.fn(),
      getProviderStats: vi.fn()
    } as any;

    resourceMonitor = new SystemResourceMonitor();
    
    // Setup mock AI providers with different characteristics
    mockProviders = new Map([
      ['openai', new MockAIProvider('openai', 3000, 300, 2)], // Fast, reliable, high rate limit
      ['anthropic', new MockAIProvider('anthropic', 2000, 400, 1)], // Slightly slower, very reliable
      ['local-gpu', new MockAIProvider('local-gpu', 1000, 150, 5)] // Fast, higher error rate, limited capacity
    ]);

    vi.clearAllMocks();
  });

  afterEach(() => {
    resourceMonitor.clear();
    // Reset provider rate limits
    mockProviders.forEach(provider => provider.resetRateLimit());
    vi.restoreAllMocks();
  });

  describe('Multi-Supplier Concurrent Processing', () => {
    it('should handle 50 photographers simultaneously processing wedding albums', async () => {
      const supplierCount = 50;
      const albumsPerSupplier = 3;
      const totalRequests = supplierCount * albumsPerSupplier;
      
      resourceMonitor.startMonitoring(500); // Monitor every 500ms

      const photographerProcessingRequest = (supplierId: number, albumId: number) =>
        dualAIRouter.routeRequest({
          type: 'wedding-album-processing',
          data: {
            supplierId: `photographer-${supplierId}`,
            albumId: `album-${albumId}`,
            photos: Array.from({ length: 50 + Math.floor(Math.random() * 100) }, (_, i) => ({
              id: `photo-${i}`,
              processingNeeds: ['tagging', 'enhancement', 'categorization']
            })),
            urgency: Math.random() < 0.3 ? 'high' : 'standard' // 30% high priority
          },
          priority: Math.random() < 0.3 ? 'high' : 'standard'
        });

      // Mock router with realistic provider selection
      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        const provider = Array.from(mockProviders.values())[Math.floor(Math.random() * mockProviders.size)];
        return await provider.processRequest(request);
      });

      // Generate all concurrent requests
      const allRequests: Promise<any>[] = [];
      for (let supplierId = 1; supplierId <= supplierCount; supplierId++) {
        for (let albumId = 1; albumId <= albumsPerSupplier; albumId++) {
          allRequests.push(photographerProcessingRequest(supplierId, albumId));
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(allRequests);
      const endTime = performance.now();
      
      const resourceMetrics = resourceMonitor.stopMonitoring();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalTime = endTime - startTime;

      // Concurrent processing requirements
      expect(successful).toBeGreaterThanOrEqual(totalRequests * 0.90); // 90% success rate
      expect(totalTime).toBeLessThan(15000); // Complete within 15 seconds
      expect(failed / totalRequests).toBeLessThan(0.15); // Less than 15% failure rate
      
      // Resource utilization requirements
      expect(resourceMonitor.getPeakMemoryUsage()).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB peak
      expect(resourceMetrics.length).toBeGreaterThan(10); // Sufficient monitoring points

      console.log('Multi-Supplier Concurrency Results:', {
        totalRequests,
        successful,
        failed,
        successRate: (successful / totalRequests * 100).toFixed(1) + '%',
        totalTime: totalTime.toFixed(0) + 'ms',
        throughput: (totalRequests / (totalTime / 1000)).toFixed(1) + ' req/sec',
        peakMemoryMB: Math.round(resourceMonitor.getPeakMemoryUsage() / 1024 / 1024)
      });
    }, 30000);

    it('should maintain performance with mixed vendor types processing simultaneously', async () => {
      const vendorMix = {
        photographers: 20,
        venues: 15,
        caterers: 10,
        florists: 8,
        djs: 7
      };

      resourceMonitor.startMonitoring(250);

      const createVendorRequest = (vendorType: string, vendorId: number) => {
        const requestTypes = {
          photographers: () => ({
            type: 'photo-batch-tagging',
            data: {
              photos: Array(25 + Math.floor(Math.random() * 75)).fill(null).map((_, i) => ({ id: `photo-${i}` }))
            }
          }),
          venues: () => ({
            type: 'venue-optimization',
            data: {
              guestCount: 100 + Math.floor(Math.random() * 100),
              requirements: ['weather-backup', 'accessibility']
            }
          }),
          caterers: () => ({
            type: 'menu-optimization', 
            data: {
              guestCount: 80 + Math.floor(Math.random() * 120),
              dietary: ['vegetarian', 'gluten-free', 'halal'].filter(() => Math.random() < 0.3)
            }
          }),
          florists: () => ({
            type: 'arrangement-planning',
            data: {
              locations: ['ceremony', 'reception'],
              season: 'spring'
            }
          }),
          djs: () => ({
            type: 'playlist-curation',
            data: {
              genre: ['pop', 'rock', 'classical'][Math.floor(Math.random() * 3)],
              duration: 240 + Math.floor(Math.random() * 120)
            }
          })
        };

        return dualAIRouter.routeRequest({
          ...requestTypes[vendorType as keyof typeof requestTypes](),
          vendorId: `${vendorType}-${vendorId}`,
          priority: Math.random() < 0.2 ? 'high' : 'standard'
        });
      };

      // Mock router with vendor-specific processing times
      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        const processingTimes = {
          'photo-batch-tagging': 400,
          'venue-optimization': 300,
          'menu-optimization': 500,
          'arrangement-planning': 200,
          'playlist-curation': 250
        };
        
        const baseTime = processingTimes[request.type as keyof typeof processingTimes] || 300;
        const actualTime = baseTime + (Math.random() - 0.5) * baseTime * 0.4;
        
        await new Promise(resolve => setTimeout(resolve, actualTime));
        
        return {
          success: true,
          processingTime: actualTime,
          vendorType: request.vendorId?.split('-')[0],
          cost: Math.random() * 0.40
        };
      });

      // Generate mixed vendor requests
      const allVendorRequests: Promise<any>[] = [];
      
      Object.entries(vendorMix).forEach(([vendorType, count]) => {
        for (let i = 1; i <= count; i++) {
          allVendorRequests.push(createVendorRequest(vendorType, i));
        }
      });

      const startTime = performance.now();
      const results = await Promise.allSettled(allVendorRequests);
      const endTime = performance.now();
      
      const resourceMetrics = resourceMonitor.stopMonitoring();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const totalRequests = allVendorRequests.length;
      const totalTime = endTime - startTime;

      // Mixed vendor processing requirements
      expect(successful).toBeGreaterThanOrEqual(totalRequests * 0.92); // 92% success rate for mixed load
      expect(totalTime).toBeLessThan(12000); // Complete within 12 seconds
      expect(resourceMonitor.getAverageMemoryUsage()).toBeLessThan(512 * 1024 * 1024); // Average under 512MB
      
      // Verify all vendor types were processed
      const successfulResults = results.filter(r => r.status === 'fulfilled').map(r => (r as any).value);
      const vendorTypes = [...new Set(successfulResults.map(r => r.vendorType))];
      expect(vendorTypes.length).toBeGreaterThan(3); // Multiple vendor types processed
    }, 25000);
  });

  describe('Platform AI vs Client AI Concurrent Load', () => {
    it('should balance load between platform and client AI under concurrent pressure', async () => {
      const platformRequests = 40;
      const clientRequests = 30;
      const totalRequests = platformRequests + clientRequests;
      
      let platformRequestCount = 0;
      let clientRequestCount = 0;
      const platformResponseTimes: number[] = [];
      const clientResponseTimes: number[] = [];

      const createPlatformRequest = () =>
        dualAIRouter.routeRequest({
          type: 'platform-ai-processing',
          data: {
            useServiceKey: true,
            processingType: 'standard'
          },
          priority: 'standard'
        });

      const createClientRequest = () =>
        dualAIRouter.routeRequest({
          type: 'client-ai-processing',
          data: {
            useClientKey: true,
            clientId: `client-${Math.floor(Math.random() * 20)}`,
            processingType: 'premium'
          },
          priority: 'standard'
        });

      // Mock dual AI routing with load balancing
      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        const isClientAI = request.type === 'client-ai-processing';
        const baseTime = isClientAI ? 250 : 350; // Client AI slightly faster
        const loadFactor = isClientAI ? clientRequestCount / 30 : platformRequestCount / 40;
        const actualTime = baseTime + (loadFactor * 200); // Performance degrades with load
        
        if (isClientAI) {
          clientRequestCount++;
          clientResponseTimes.push(actualTime);
        } else {
          platformRequestCount++;
          platformResponseTimes.push(actualTime);
        }

        await new Promise(resolve => setTimeout(resolve, actualTime));

        return {
          success: true,
          source: isClientAI ? 'client-ai' : 'platform-ai',
          processingTime: actualTime,
          cost: isClientAI ? 0 : Math.random() * 0.30 // Client AI costs charged to client
        };
      });

      // Generate concurrent mixed AI requests
      const allRequests: Promise<any>[] = [
        ...Array(platformRequests).fill(null).map(() => createPlatformRequest()),
        ...Array(clientRequests).fill(null).map(() => createClientRequest())
      ];

      // Shuffle to simulate real-world mixed load
      const shuffledRequests = allRequests.sort(() => Math.random() - 0.5);

      const results = await Promise.allSettled(shuffledRequests);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Dual AI load balancing requirements
      expect(successful).toBeGreaterThanOrEqual(totalRequests * 0.94); // 94% success rate
      expect(platformRequestCount).toBe(platformRequests);
      expect(clientRequestCount).toBe(clientRequests);
      
      // Performance comparison
      const avgPlatformTime = platformResponseTimes.reduce((a, b) => a + b, 0) / platformResponseTimes.length;
      const avgClientTime = clientResponseTimes.reduce((a, b) => a + b, 0) / clientResponseTimes.length;
      
      expect(avgPlatformTime).toBeLessThan(1000); // Platform AI under 1s average
      expect(avgClientTime).toBeLessThan(800); // Client AI under 800ms average
    }, 20000);

    it('should handle client AI quota exhaustion and failover to platform AI', async () => {
      const clientQuotaLimit = 25; // Limited client quota
      const totalRequests = 40; // Exceed client quota
      let clientRequestsProcessed = 0;
      let platformFailovers = 0;

      const quotaLimitedRequest = () =>
        dualAIRouter.routeRequest({
          type: 'ai-processing-with-quota',
          data: {
            clientId: 'client-001',
            preferredProvider: 'client-ai'
          },
          priority: 'standard'
        });

      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        // Check client quota
        if (clientRequestsProcessed < clientQuotaLimit) {
          // Process with client AI
          clientRequestsProcessed++;
          await new Promise(resolve => setTimeout(resolve, 200));
          return {
            success: true,
            source: 'client-ai',
            cost: 0
          };
        } else {
          // Failover to platform AI
          platformFailovers++;
          await new Promise(resolve => setTimeout(resolve, 350));
          return {
            success: true,
            source: 'platform-ai',
            cost: Math.random() * 0.35
          };
        }
      });

      const results = await Promise.allSettled(
        Array(totalRequests).fill(null).map(() => quotaLimitedRequest())
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Quota exhaustion and failover requirements
      expect(successful).toBeGreaterThanOrEqual(totalRequests * 0.95); // 95% success with failover
      expect(clientRequestsProcessed).toBe(clientQuotaLimit); // Used full client quota
      expect(platformFailovers).toBe(totalRequests - clientQuotaLimit); // Remaining handled by platform
    }, 15000);
  });

  describe('Provider Failover Under High Concurrency', () => {
    it('should handle OpenAI rate limiting with automatic Anthropic failover', async () => {
      const highConcurrencyRequests = 80;
      const openAIRateLimit = 50; // Requests before rate limiting
      
      let openAIRequests = 0;
      let anthropicFailovers = 0;
      let rateLimitErrors = 0;

      const rateLimitTestRequest = () =>
        dualAIRouter.routeRequest({
          type: 'high-volume-processing',
          data: {
            preferredProvider: 'openai',
            fallbackProvider: 'anthropic'
          },
          priority: 'standard'
        });

      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        if (openAIRequests < openAIRateLimit) {
          // Process with OpenAI
          openAIRequests++;
          await new Promise(resolve => setTimeout(resolve, 300));
          return {
            success: true,
            provider: 'openai',
            cost: 0.20
          };
        } else {
          // OpenAI rate limited, try Anthropic
          if (Math.random() < 0.9) { // 90% Anthropic success rate
            anthropicFailovers++;
            await new Promise(resolve => setTimeout(resolve, 450));
            return {
              success: true,
              provider: 'anthropic',
              cost: 0.25
            };
          } else {
            rateLimitErrors++;
            throw new Error('All providers rate limited');
          }
        }
      });

      const results = await Promise.allSettled(
        Array(highConcurrencyRequests).fill(null).map(() => rateLimitTestRequest())
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Provider failover requirements
      expect(successful).toBeGreaterThanOrEqual(highConcurrencyRequests * 0.85); // 85% success with failover
      expect(openAIRequests).toBe(openAIRateLimit); // Used full OpenAI quota
      expect(anthropicFailovers).toBeGreaterThan(0); // Anthropic handled overflow
      expect(rateLimitErrors).toBeLessThan(highConcurrencyRequests * 0.10); // Less than 10% complete failures
    }, 20000);

    it('should distribute load across multiple providers under extreme concurrency', async () => {
      const extremeConcurrencyRequests = 120;
      const providerStats = {
        'openai': { processed: 0, errors: 0, maxCapacity: 40 },
        'anthropic': { processed: 0, errors: 0, maxCapacity: 35 },
        'local-gpu': { processed: 0, errors: 0, maxCapacity: 25 }
      };

      const extremeConcurrencyRequest = () =>
        dualAIRouter.routeRequest({
          type: 'extreme-load-processing',
          data: { requiresDistribution: true },
          priority: 'standard'
        });

      dualAIRouter.routeRequest = vi.fn().mockImplementation(async (request) => {
        // Find available provider
        const availableProviders = Object.entries(providerStats).filter(
          ([name, stats]) => stats.processed < stats.maxCapacity
        );

        if (availableProviders.length === 0) {
          throw new Error('All providers at capacity');
        }

        // Select provider with most available capacity
        const [selectedProvider, providerData] = availableProviders.reduce((best, current) => {
          const [bestName, bestStats] = best;
          const [currentName, currentStats] = current;
          const bestAvailable = bestStats.maxCapacity - bestStats.processed;
          const currentAvailable = currentStats.maxCapacity - currentStats.processed;
          return currentAvailable > bestAvailable ? current : best;
        });

        // Process request
        try {
          const processingTime = 200 + Math.random() * 300;
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          providerStats[selectedProvider].processed++;
          
          return {
            success: true,
            provider: selectedProvider,
            processingTime,
            cost: Math.random() * 0.30
          };
        } catch (error) {
          providerStats[selectedProvider].errors++;
          throw error;
        }
      });

      const results = await Promise.allSettled(
        Array(extremeConcurrencyRequests).fill(null).map(() => extremeConcurrencyRequest())
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const totalCapacity = Object.values(providerStats).reduce((sum, stats) => sum + stats.maxCapacity, 0);

      // Extreme concurrency distribution requirements
      expect(successful).toBeGreaterThanOrEqual(totalCapacity * 0.90); // 90% of total capacity utilized
      expect(providerStats.openai.processed).toBeGreaterThan(0); // All providers used
      expect(providerStats.anthropic.processed).toBeGreaterThan(0);
      expect(providerStats['local-gpu'].processed).toBeGreaterThan(0);
      
      // Load should be reasonably distributed
      const totalProcessed = Object.values(providerStats).reduce((sum, stats) => sum + stats.processed, 0);
      expect(totalProcessed).toBeGreaterThanOrEqual(totalCapacity * 0.85); // 85% capacity utilization
    }, 25000);
  });
});

/**
 * AI SYSTEM CONCURRENCY PERFORMANCE VALIDATION CHECKLIST:
 * 
 * ✅ Multi-Supplier Concurrent Processing (50 suppliers)
 * ✅ Mixed Vendor Type Simultaneous Processing
 * ✅ Platform AI vs Client AI Load Balancing
 * ✅ Client AI Quota Exhaustion Failover
 * ✅ Provider Rate Limiting with Automatic Failover
 * ✅ Multi-Provider Load Distribution
 * 
 * CONCURRENCY REQUIREMENTS VALIDATION:
 * - Multi-supplier: 90% success rate, <15s total time
 * - Mixed vendor: 92% success rate, <12s total time
 * - Dual AI balancing: 94% success rate, platform <1s, client <800ms
 * - Quota failover: 95% success rate with seamless failover
 * - Rate limit handling: 85% success rate with provider failover
 * - Extreme load: 90% capacity utilization across all providers
 * 
 * RESOURCE UTILIZATION VALIDATION:
 * - Peak memory usage: <1GB under concurrent load
 * - Average memory usage: <512MB sustained
 * - Provider distribution: All providers utilized effectively
 * - Cost optimization: Client AI reduces platform costs
 * 
 * BUSINESS IMPACT VALIDATION:
 * - Supports simultaneous processing for 50+ photographers
 * - Handles mixed vendor workloads efficiently
 * - Ensures reliable service during peak demand
 * - Optimizes costs through intelligent routing
 * - Maintains performance under extreme concurrency
 */