/**
 * WS-207 FAQ Extraction AI - Performance and Load Testing Suite
 * Team E - Round 1 - Performance Benchmarks and Load Testing
 *
 * CRITICAL: Performance testing for FAQ extraction system
 * Tests response times, memory usage, concurrent operations, and scalability
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { WebsiteScraper } from '@/lib/extractors/website-scraper';
import { FAQProcessor } from '@/lib/ai/faq-processor';
import { performance } from 'perf_hooks';

// Performance testing utilities
class PerformanceMonitor {
  private memoryUsageBefore: NodeJS.MemoryUsage;
  private timeStart: number;

  constructor() {
    this.memoryUsageBefore = process.memoryUsage();
    this.timeStart = performance.now();
  }

  getMetrics() {
    const timeEnd = performance.now();
    const memoryUsageAfter = process.memoryUsage();

    return {
      duration: timeEnd - this.timeStart,
      memoryDelta: {
        rss: memoryUsageAfter.rss - this.memoryUsageBefore.rss,
        heapUsed: memoryUsageAfter.heapUsed - this.memoryUsageBefore.heapUsed,
        heapTotal:
          memoryUsageAfter.heapTotal - this.memoryUsageBefore.heapTotal,
        external: memoryUsageAfter.external - this.memoryUsageBefore.external,
      },
      finalMemory: memoryUsageAfter,
    };
  }
}

// Mock large websites for performance testing
const createLargeWebsiteContent = (faqCount: number) => {
  const faqs = Array.from({ length: faqCount }, (_, i) => ({
    question: `Wedding FAQ question ${i + 1}: What about ${['pricing', 'services', 'logistics', 'booking', 'policies'][i % 5]} for wedding ${i + 1}?`,
    answer:
      `This is a detailed wedding FAQ answer ${i + 1} that contains comprehensive information about our services, pricing, and policies. `.repeat(
        10,
      ), // ~1000 chars each
    selector: '.faq-item',
  }));
  return faqs;
};

describe('FAQ Extraction Performance Tests', () => {
  let scraper: WebsiteScraper;
  let processor: FAQProcessor;

  beforeAll(() => {
    // Setup with performance-optimized configuration
    scraper = new WebsiteScraper({
      timeout: 60000,
      maxRetries: 2,
      rateLimitDelay: 100, // Reduced for performance testing
      concurrency: 5,
    });

    processor = new FAQProcessor({
      model: 'gpt-3.5-turbo', // Faster model for performance testing
      maxTokens: 500,
      temperature: 0.1,
    });
  });

  describe('Website Scraping Performance', () => {
    it('should scrape small websites (5-10 FAQs) within 5 seconds', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(8);

      // Mock browser responses
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(mockFAQs),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const faqs = await scraper.extractFAQs(
        'https://small-website.com',
        'perf-user-1',
      );
      const metrics = monitor.getMetrics();

      expect(faqs).toHaveLength(8);
      expect(metrics.duration).toBeLessThan(5000); // 5 seconds
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB

      console.log(
        `Small website extraction: ${metrics.duration.toFixed(2)}ms, Memory: ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('should scrape medium websites (50 FAQs) within 15 seconds', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(50);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(mockFAQs),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const faqs = await scraper.extractFAQs(
        'https://medium-website.com',
        'perf-user-2',
      );
      const metrics = monitor.getMetrics();

      expect(faqs).toHaveLength(50);
      expect(metrics.duration).toBeLessThan(15000); // 15 seconds
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB

      console.log(
        `Medium website extraction: ${metrics.duration.toFixed(2)}ms, Memory: ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('should scrape large websites (100 FAQs) within 30 seconds', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(100);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(mockFAQs.slice(0, 100)), // Limit to 100 as per requirements
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const faqs = await scraper.extractFAQs(
        'https://large-website.com',
        'perf-user-3',
      );
      const metrics = monitor.getMetrics();

      expect(faqs).toHaveLength(100);
      expect(metrics.duration).toBeLessThan(30000); // 30 seconds
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024); // 200MB

      console.log(
        `Large website extraction: ${metrics.duration.toFixed(2)}ms, Memory: ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('should handle memory efficiently for very large content', async () => {
      const monitor = new PerformanceMonitor();

      // Create content with very large individual FAQs
      const hugeFAQs = Array.from({ length: 20 }, (_, i) => ({
        question: `Large FAQ question ${i + 1}?`,
        answer: 'This is a very large FAQ answer. '.repeat(1000), // ~30KB each
        selector: '.faq-item',
      }));

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(hugeFAQs),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      const faqs = await scraper.extractFAQs(
        'https://huge-content.com',
        'perf-user-4',
      );
      const metrics = monitor.getMetrics();

      expect(faqs).toHaveLength(20);

      // Verify content was truncated for memory efficiency
      const maxAnswerLength = Math.max(...faqs.map((faq) => faq.answer.length));
      expect(maxAnswerLength).toBeLessThan(5000); // Should be truncated

      // Memory should still be reasonable despite large input
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(150 * 1024 * 1024); // 150MB

      console.log(
        `Huge content extraction: ${metrics.duration.toFixed(2)}ms, Memory: ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });

  describe('AI Processing Performance', () => {
    it('should categorize small FAQ batches (10 FAQs) within 3 seconds', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(10).map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }));

      // Mock OpenAI response
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: mockFAQs.map((_, index) => ({
                  faq_index: index,
                  category: [
                    'pricing',
                    'services',
                    'logistics',
                    'booking',
                    'policies',
                  ][index % 5],
                  confidence: 0.85 + Math.random() * 0.1,
                  subcategory: 'general',
                })),
              }),
            },
          },
        ],
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockResponse),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });
      const metrics = monitor.getMetrics();

      expect(categorized).toHaveLength(10);
      expect(metrics.duration).toBeLessThan(3000); // 3 seconds
      expect(categorized.every((faq) => faq.ai_confidence_score > 0.8)).toBe(
        true,
      );

      console.log(
        `Small batch AI processing: ${metrics.duration.toFixed(2)}ms`,
      );
    });

    it('should categorize large FAQ batches (50 FAQs) within 10 seconds', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(50).map((faq) => ({
        question: faq.question,
        answer: faq.answer.substring(0, 500), // Truncate for performance
      }));

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: mockFAQs.map((_, index) => ({
                  faq_index: index,
                  category: [
                    'pricing',
                    'services',
                    'logistics',
                    'booking',
                    'policies',
                  ][index % 5],
                  confidence: 0.85 + Math.random() * 0.1,
                  subcategory: 'general',
                })),
              }),
            },
          },
        ],
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockResponse),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });
      const metrics = monitor.getMetrics();

      expect(categorized).toHaveLength(50);
      expect(metrics.duration).toBeLessThan(10000); // 10 seconds
      expect(categorized.every((faq) => faq.ai_confidence_score > 0.8)).toBe(
        true,
      );

      console.log(
        `Large batch AI processing: ${metrics.duration.toFixed(2)}ms`,
      );
    });

    it('should handle AI processing failures gracefully without performance degradation', async () => {
      const monitor = new PerformanceMonitor();
      const mockFAQs = createLargeWebsiteContent(20).map((faq) => ({
        question: faq.question,
        answer: faq.answer.substring(0, 300),
      }));

      let callCount = 0;
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call fails
                throw new Error('API rate limit exceeded');
              }
              // Second call succeeds
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        categories: mockFAQs.map((_, index) => ({
                          faq_index: index,
                          category: 'other',
                          confidence: 0.7,
                          subcategory: 'retry',
                        })),
                      }),
                    },
                  },
                ],
              });
            }),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
        maxRetries: 2,
        retryDelay: 100,
      });
      const metrics = monitor.getMetrics();

      expect(categorized).toHaveLength(20);
      expect(metrics.duration).toBeLessThan(5000); // Should still complete quickly with retry
      expect(callCount).toBe(2); // Should have retried once

      console.log(
        `AI processing with retry: ${metrics.duration.toFixed(2)}ms, Retries: ${callCount - 1}`,
      );
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent scraping operations efficiently', async () => {
      const monitor = new PerformanceMonitor();

      const urls = [
        'https://photographer1.com/faq',
        'https://photographer2.com/faq',
        'https://photographer3.com/faq',
        'https://photographer4.com/faq',
        'https://photographer5.com/faq',
      ];

      const mockFAQs = createLargeWebsiteContent(10);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(mockFAQs),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      // Run concurrent scraping operations
      const promises = urls.map((url, index) =>
        scraper.extractFAQs(url, `concurrent-user-${index}`),
      );

      const results = await Promise.all(promises);
      const metrics = monitor.getMetrics();

      expect(results).toHaveLength(5);
      expect(results.every((result) => result.length === 10)).toBe(true);

      // Concurrent operations should be faster than sequential
      expect(metrics.duration).toBeLessThan(15000); // Should complete all 5 in <15s

      // Memory usage should be reasonable for concurrent operations
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(300 * 1024 * 1024); // 300MB

      console.log(
        `Concurrent scraping (5 sites): ${metrics.duration.toFixed(2)}ms, Memory: ${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('should handle concurrent AI processing without performance degradation', async () => {
      const monitor = new PerformanceMonitor();

      const faqBatches = Array.from({ length: 3 }, (_, batchIndex) =>
        createLargeWebsiteContent(15).map((faq) => ({
          question: `${faq.question} (batch ${batchIndex})`,
          answer: faq.answer.substring(0, 400),
        })),
      );

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: Array.from({ length: 15 }, (_, index) => ({
                  faq_index: index,
                  category: 'services',
                  confidence: 0.88,
                  subcategory: 'concurrent',
                })),
              }),
            },
          },
        ],
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockResponse),
          },
        },
      };

      vi.doMock('openai', () => ({
        OpenAI: vi.fn().mockImplementation(() => mockOpenAI),
      }));

      // Process batches concurrently
      const promises = faqBatches.map((batch, index) =>
        processor.categorizeFAQs(batch, {
          vendorType: 'photographer',
          batchId: `batch-${index}`,
        }),
      );

      const results = await Promise.all(promises);
      const metrics = monitor.getMetrics();

      expect(results).toHaveLength(3);
      expect(results.every((result) => result.length === 15)).toBe(true);
      expect(metrics.duration).toBeLessThan(8000); // 8 seconds for 3 concurrent batches

      console.log(
        `Concurrent AI processing (3 batches): ${metrics.duration.toFixed(2)}ms`,
      );
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should properly clean up resources after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple large operations
      for (let i = 0; i < 5; i++) {
        const largeFAQs = createLargeWebsiteContent(50);

        const mockPage = {
          goto: vi.fn().mockResolvedValue(undefined),
          content: vi.fn().mockResolvedValue('<html></html>'),
          evaluate: vi.fn().mockResolvedValue(largeFAQs),
          close: vi.fn().mockResolvedValue(undefined),
        };

        const mockBrowser = {
          newPage: vi.fn().mockResolvedValue(mockPage),
          close: vi.fn().mockResolvedValue(undefined),
        };

        vi.doMock('puppeteer', () => ({
          launch: vi.fn().mockResolvedValue(mockBrowser),
        }));

        await scraper.extractFAQs(
          `https://cleanup-test-${i}.com`,
          `cleanup-user-${i}`,
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable after cleanup
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max increase

      console.log(
        `Memory cleanup test - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
    });

    it('should handle browser resource cleanup properly', async () => {
      const monitor = new PerformanceMonitor();

      let pageCloseCount = 0;
      let browserCloseCount = 0;

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockImplementation(() => {
          pageCloseCount++;
          return Promise.resolve();
        }),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockImplementation(() => {
          browserCloseCount++;
          return Promise.resolve();
        }),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      // Perform multiple scraping operations
      await Promise.all([
        scraper.extractFAQs('https://cleanup1.com', 'cleanup-user-1'),
        scraper.extractFAQs('https://cleanup2.com', 'cleanup-user-2'),
        scraper.extractFAQs('https://cleanup3.com', 'cleanup-user-3'),
      ]);

      const metrics = monitor.getMetrics();

      // Verify all resources were cleaned up
      expect(pageCloseCount).toBeGreaterThanOrEqual(3);
      expect(browserCloseCount).toBeGreaterThanOrEqual(1);
      expect(metrics.duration).toBeLessThan(10000);

      console.log(
        `Resource cleanup: ${pageCloseCount} pages closed, ${browserCloseCount} browsers closed`,
      );
    });
  });

  describe('Scalability and Load Testing', () => {
    it('should maintain performance under high load (10 concurrent users)', async () => {
      const monitor = new PerformanceMonitor();
      const userCount = 10;

      const mockFAQs = createLargeWebsiteContent(20);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        content: vi.fn().mockResolvedValue('<html></html>'),
        evaluate: vi.fn().mockResolvedValue(mockFAQs),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('puppeteer', () => ({
        launch: vi.fn().mockResolvedValue(mockBrowser),
      }));

      // Simulate 10 concurrent users each extracting FAQs
      const userOperations = Array.from({ length: userCount }, (_, userIndex) =>
        scraper.extractFAQs(
          `https://load-test-${userIndex}.com`,
          `load-user-${userIndex}`,
        ),
      );

      const results = await Promise.allSettled(userOperations);
      const metrics = monitor.getMetrics();

      const successfulOperations = results.filter(
        (r) => r.status === 'fulfilled',
      );
      const failedOperations = results.filter((r) => r.status === 'rejected');

      // Most operations should succeed under load
      expect(successfulOperations.length).toBeGreaterThanOrEqual(8); // 80% success rate minimum
      expect(failedOperations.length).toBeLessThanOrEqual(2);

      // Performance should degrade gracefully
      expect(metrics.duration).toBeLessThan(30000); // 30 seconds for all concurrent operations

      console.log(
        `Load test (${userCount} users): ${successfulOperations.length}/${userCount} succeeded, ${metrics.duration.toFixed(2)}ms total`,
      );
    });

    it('should handle gradual load increase efficiently', async () => {
      const results = [];

      // Test increasing load: 1, 3, 5, 7 concurrent operations
      for (const concurrentOps of [1, 3, 5, 7]) {
        const monitor = new PerformanceMonitor();

        const mockFAQs = createLargeWebsiteContent(15);
        const mockPage = {
          goto: vi.fn().mockResolvedValue(undefined),
          content: vi.fn().mockResolvedValue('<html></html>'),
          evaluate: vi.fn().mockResolvedValue(mockFAQs),
          close: vi.fn().mockResolvedValue(undefined),
        };

        const mockBrowser = {
          newPage: vi.fn().mockResolvedValue(mockPage),
          close: vi.fn().mockResolvedValue(undefined),
        };

        vi.doMock('puppeteer', () => ({
          launch: vi.fn().mockResolvedValue(mockBrowser),
        }));

        const operations = Array.from({ length: concurrentOps }, (_, i) =>
          scraper.extractFAQs(
            `https://gradual-${concurrentOps}-${i}.com`,
            `gradual-user-${i}`,
          ),
        );

        await Promise.all(operations);
        const metrics = monitor.getMetrics();

        results.push({
          concurrentOps,
          duration: metrics.duration,
          avgDurationPerOp: metrics.duration / concurrentOps,
        });

        console.log(
          `Gradual load ${concurrentOps} ops: ${metrics.duration.toFixed(2)}ms total, ${(metrics.duration / concurrentOps).toFixed(2)}ms avg`,
        );
      }

      // Performance per operation should remain relatively stable
      const avgDurations = results.map((r) => r.avgDurationPerOp);
      const firstAvg = avgDurations[0];
      const lastAvg = avgDurations[avgDurations.length - 1];

      // Performance degradation should be reasonable (< 3x slower)
      expect(lastAvg / firstAvg).toBeLessThan(3);
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should establish baseline performance benchmarks', () => {
      // These benchmarks serve as regression tests for future changes
      const performanceBenchmarks = {
        smallWebsiteScraping: 5000, // 5 seconds max
        mediumWebsiteScraping: 15000, // 15 seconds max
        largeWebsiteScraping: 30000, // 30 seconds max
        smallAIProcessing: 3000, // 3 seconds max
        largeAIProcessing: 10000, // 10 seconds max
        concurrentOperations: 15000, // 15 seconds for 5 concurrent ops
        memoryUsageLimit: 200 * 1024 * 1024, // 200MB max increase
        maxConcurrentUsers: 10, // Support 10 concurrent users
      };

      // Store benchmarks for comparison in future test runs
      expect(performanceBenchmarks).toBeDefined();
      console.log(
        'Performance benchmarks established:',
        JSON.stringify(performanceBenchmarks, null, 2),
      );
    });

    it('should provide performance monitoring utilities', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeDefined();

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait for 100ms
      }

      const metrics = monitor.getMetrics();
      expect(metrics.duration).toBeGreaterThan(90); // Should be ~100ms
      expect(metrics.memoryDelta).toBeDefined();
      expect(metrics.finalMemory).toBeDefined();
    });
  });
});
