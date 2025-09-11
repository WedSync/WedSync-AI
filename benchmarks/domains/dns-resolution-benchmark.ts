/**
 * DNS Resolution Performance Benchmark (WS-222)
 * Benchmarks DNS lookup times, propagation verification, and resolution performance
 */

import { performance } from 'perf_hooks';
import dns from 'dns/promises';
import { createHash } from 'crypto';

interface DNSBenchmarkResult {
  domain: string;
  recordType: string;
  resolveTime: number;
  success: boolean;
  records: any[];
  error?: string;
  attempts: number;
}

interface DNSBenchmarkSummary {
  totalDomains: number;
  averageResolveTime: number;
  successRate: number;
  fastestResolve: number;
  slowestResolve: number;
  results: DNSBenchmarkResult[];
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

class DNSResolutionBenchmark {
  private results: DNSBenchmarkResult[] = [];
  private concurrentLimit = 10;

  constructor(concurrentLimit = 10) {
    this.concurrentLimit = concurrentLimit;
  }

  /**
   * Benchmark DNS A record resolution
   */
  async benchmarkARecord(domain: string, maxAttempts = 3): Promise<DNSBenchmarkResult> {
    let attempts = 0;
    let bestTime = Infinity;
    let lastError: string | undefined;
    let records: any[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      attempts++;
      const startTime = performance.now();

      try {
        const result = await dns.resolve4(domain);
        const resolveTime = performance.now() - startTime;
        
        if (resolveTime < bestTime) {
          bestTime = resolveTime;
          records = result;
        }

        return {
          domain,
          recordType: 'A',
          resolveTime: bestTime,
          success: true,
          records,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        // Wait before retry (exponential backoff)
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    return {
      domain,
      recordType: 'A',
      resolveTime: -1,
      success: false,
      records: [],
      error: lastError,
      attempts
    };
  }

  /**
   * Benchmark DNS CNAME record resolution
   */
  async benchmarkCNAMERecord(domain: string, maxAttempts = 3): Promise<DNSBenchmarkResult> {
    let attempts = 0;
    let bestTime = Infinity;
    let lastError: string | undefined;
    let records: any[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      attempts++;
      const startTime = performance.now();

      try {
        const result = await dns.resolveCname(domain);
        const resolveTime = performance.now() - startTime;
        
        if (resolveTime < bestTime) {
          bestTime = resolveTime;
          records = result;
        }

        return {
          domain,
          recordType: 'CNAME',
          resolveTime: bestTime,
          success: true,
          records,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    return {
      domain,
      recordType: 'CNAME',
      resolveTime: -1,
      success: false,
      records: [],
      error: lastError,
      attempts
    };
  }

  /**
   * Benchmark DNS TXT record resolution
   */
  async benchmarkTXTRecord(domain: string, maxAttempts = 3): Promise<DNSBenchmarkResult> {
    let attempts = 0;
    let bestTime = Infinity;
    let lastError: string | undefined;
    let records: any[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      attempts++;
      const startTime = performance.now();

      try {
        const result = await dns.resolveTxt(domain);
        const resolveTime = performance.now() - startTime;
        
        if (resolveTime < bestTime) {
          bestTime = resolveTime;
          records = result;
        }

        return {
          domain,
          recordType: 'TXT',
          resolveTime: bestTime,
          success: true,
          records,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    return {
      domain,
      recordType: 'TXT',
      resolveTime: -1,
      success: false,
      records: [],
      error: lastError,
      attempts
    };
  }

  /**
   * Benchmark DNS MX record resolution
   */
  async benchmarkMXRecord(domain: string, maxAttempts = 3): Promise<DNSBenchmarkResult> {
    let attempts = 0;
    let bestTime = Infinity;
    let lastError: string | undefined;
    let records: any[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      attempts++;
      const startTime = performance.now();

      try {
        const result = await dns.resolveMx(domain);
        const resolveTime = performance.now() - startTime;
        
        if (resolveTime < bestTime) {
          bestTime = resolveTime;
          records = result;
        }

        return {
          domain,
          recordType: 'MX',
          resolveTime: bestTime,
          success: true,
          records,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    return {
      domain,
      recordType: 'MX',
      resolveTime: -1,
      success: false,
      records: [],
      error: lastError,
      attempts
    };
  }

  /**
   * Benchmark comprehensive DNS resolution for a domain
   */
  async benchmarkDomain(domain: string): Promise<DNSBenchmarkResult[]> {
    const benchmarks = await Promise.allSettled([
      this.benchmarkARecord(domain),
      this.benchmarkCNAMERecord(domain),
      this.benchmarkTXTRecord(domain),
      this.benchmarkMXRecord(domain),
    ]);

    return benchmarks
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<DNSBenchmarkResult>).value);
  }

  /**
   * Benchmark multiple domains with concurrency control
   */
  async benchmarkMultipleDomains(domains: string[]): Promise<DNSBenchmarkSummary> {
    const startTime = performance.now();
    this.results = [];

    // Process domains in batches to control concurrency
    for (let i = 0; i < domains.length; i += this.concurrentLimit) {
      const batch = domains.slice(i, i + this.concurrentLimit);
      const batchPromises = batch.map(domain => this.benchmarkDomain(domain));
      
      const batchResults = await Promise.all(batchPromises);
      this.results.push(...batchResults.flat());
      
      // Small delay between batches to avoid overwhelming DNS servers
      if (i + this.concurrentLimit < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = performance.now() - startTime;
    return this.generateSummary(totalTime);
  }

  /**
   * Benchmark DNS propagation across multiple resolvers
   */
  async benchmarkDNSPropagation(
    domain: string, 
    recordType: 'A' | 'CNAME' | 'TXT' | 'MX',
    resolvers: string[] = ['8.8.8.8', '1.1.1.1', '208.67.222.222']
  ): Promise<{ resolver: string; result: DNSBenchmarkResult }[]> {
    const originalResolvers = dns.getServers();
    const results: { resolver: string; result: DNSBenchmarkResult }[] = [];

    for (const resolver of resolvers) {
      dns.setServers([resolver]);
      
      let result: DNSBenchmarkResult;
      switch (recordType) {
        case 'A':
          result = await this.benchmarkARecord(domain);
          break;
        case 'CNAME':
          result = await this.benchmarkCNAMERecord(domain);
          break;
        case 'TXT':
          result = await this.benchmarkTXTRecord(domain);
          break;
        case 'MX':
          result = await this.benchmarkMXRecord(domain);
          break;
      }

      results.push({ resolver, result });
    }

    // Restore original resolvers
    dns.setServers(originalResolvers);
    return results;
  }

  /**
   * Test DNS cache performance
   */
  async benchmarkDNSCache(domain: string, iterations = 10): Promise<{
    firstResolve: number;
    averageCachedResolve: number;
    cacheEfficiency: number;
  }> {
    // First resolve (cold cache)
    const firstResult = await this.benchmarkARecord(domain);
    const firstResolveTime = firstResult.resolveTime;

    // Subsequent resolves (warm cache)
    const cachedTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const result = await this.benchmarkARecord(domain);
      if (result.success) {
        cachedTimes.push(result.resolveTime);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const averageCachedResolve = cachedTimes.length > 0 
      ? cachedTimes.reduce((sum, time) => sum + time, 0) / cachedTimes.length
      : -1;

    const cacheEfficiency = firstResolveTime > 0 && averageCachedResolve > 0
      ? ((firstResolveTime - averageCachedResolve) / firstResolveTime) * 100
      : 0;

    return {
      firstResolve: firstResolveTime,
      averageCachedResolve,
      cacheEfficiency
    };
  }

  /**
   * Generate performance summary
   */
  private generateSummary(totalTime: number): DNSBenchmarkSummary {
    const successfulResults = this.results.filter(r => r.success);
    const resolveTimes = successfulResults.map(r => r.resolveTime);
    
    const averageResolveTime = resolveTimes.length > 0
      ? resolveTimes.reduce((sum, time) => sum + time, 0) / resolveTimes.length
      : 0;

    const successRate = this.results.length > 0
      ? (successfulResults.length / this.results.length) * 100
      : 0;

    const fastestResolve = resolveTimes.length > 0 ? Math.min(...resolveTimes) : 0;
    const slowestResolve = resolveTimes.length > 0 ? Math.max(...resolveTimes) : 0;

    // Performance grading
    let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (averageResolveTime < 50 && successRate > 95) {
      performanceGrade = 'A';
    } else if (averageResolveTime < 100 && successRate > 90) {
      performanceGrade = 'B';
    } else if (averageResolveTime < 200 && successRate > 80) {
      performanceGrade = 'C';
    } else if (averageResolveTime < 500 && successRate > 70) {
      performanceGrade = 'D';
    } else {
      performanceGrade = 'F';
    }

    return {
      totalDomains: this.results.length,
      averageResolveTime,
      successRate,
      fastestResolve,
      slowestResolve,
      results: this.results,
      performanceGrade
    };
  }

  /**
   * Export results to CSV
   */
  exportToCSV(): string {
    const headers = [
      'Domain',
      'Record Type',
      'Resolve Time (ms)',
      'Success',
      'Records Count',
      'Attempts',
      'Error'
    ];

    const rows = this.results.map(result => [
      result.domain,
      result.recordType,
      result.resolveTime.toFixed(2),
      result.success ? 'Yes' : 'No',
      result.records.length.toString(),
      result.attempts.toString(),
      result.error || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Generate detailed performance report
   */
  generateReport(summary: DNSBenchmarkSummary): string {
    const report = [
      '# DNS Resolution Performance Report',
      '',
      '## Summary',
      `- Total Domains Tested: ${summary.totalDomains}`,
      `- Average Resolve Time: ${summary.averageResolveTime.toFixed(2)}ms`,
      `- Success Rate: ${summary.successRate.toFixed(1)}%`,
      `- Fastest Resolve: ${summary.fastestResolve.toFixed(2)}ms`,
      `- Slowest Resolve: ${summary.slowestResolve.toFixed(2)}ms`,
      `- Performance Grade: ${summary.performanceGrade}`,
      '',
      '## Performance Thresholds',
      '- Excellent (A): <50ms average, >95% success rate',
      '- Good (B): <100ms average, >90% success rate',
      '- Fair (C): <200ms average, >80% success rate',
      '- Poor (D): <500ms average, >70% success rate',
      '- Failed (F): >500ms average or <70% success rate',
      '',
      '## Detailed Results',
    ];

    // Group by domain for better readability
    const byDomain = new Map<string, DNSBenchmarkResult[]>();
    summary.results.forEach(result => {
      if (!byDomain.has(result.domain)) {
        byDomain.set(result.domain, []);
      }
      byDomain.get(result.domain)!.push(result);
    });

    byDomain.forEach((results, domain) => {
      report.push(`\n### ${domain}`);
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const time = result.success ? `${result.resolveTime.toFixed(2)}ms` : 'Failed';
        report.push(`- ${result.recordType} Record: ${status} ${time} (${result.attempts} attempts)`);
        
        if (result.error) {
          report.push(`  Error: ${result.error}`);
        }
        
        if (result.records.length > 0) {
          report.push(`  Records: ${result.records.length}`);
        }
      });
    });

    return report.join('\n');
  }
}

// Example usage and benchmark execution
export async function runDNSBenchmarks(): Promise<void> {
  const benchmark = new DNSResolutionBenchmark(5); // 5 concurrent requests

  // Test domains (mix of real and test domains)
  const testDomains = [
    'wedsync.com',
    'google.com',
    'cloudflare.com',
    'github.com',
    'test.example.com',
    'nonexistent-domain-12345.com',
    'photos.wedsync.com',
    'api.wedsync.com',
  ];

  console.log('🚀 Starting DNS Resolution Benchmarks...');
  console.time('Total Benchmark Time');

  try {
    // Run comprehensive domain benchmarks
    console.log('\n📊 Benchmarking multiple domains...');
    const summary = await benchmark.benchmarkMultipleDomains(testDomains);
    
    // Test DNS propagation
    console.log('\n🌐 Testing DNS propagation across resolvers...');
    const propagationResults = await benchmark.benchmarkDNSPropagation(
      'wedsync.com',
      'A',
      ['8.8.8.8', '1.1.1.1', '208.67.222.222', '9.9.9.9']
    );

    // Test DNS cache performance
    console.log('\n⚡ Testing DNS cache performance...');
    const cacheResults = await benchmark.benchmarkDNSCache('wedsync.com', 10);

    // Generate and display report
    console.log('\n📋 Performance Report:');
    console.log(benchmark.generateReport(summary));

    console.log('\n🌐 DNS Propagation Results:');
    propagationResults.forEach(({ resolver, result }) => {
      const status = result.success ? '✅' : '❌';
      const time = result.success ? `${result.resolveTime.toFixed(2)}ms` : 'Failed';
      console.log(`${resolver}: ${status} ${time}`);
    });

    console.log('\n⚡ DNS Cache Performance:');
    console.log(`First Resolve: ${cacheResults.firstResolve.toFixed(2)}ms`);
    console.log(`Average Cached: ${cacheResults.averageCachedResolve.toFixed(2)}ms`);
    console.log(`Cache Efficiency: ${cacheResults.cacheEfficiency.toFixed(1)}%`);

    // Export results
    const csvData = benchmark.exportToCSV();
    console.log('\n💾 CSV Export Available (showing first 200 chars):');
    console.log(csvData.substring(0, 200) + '...');

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  } finally {
    console.timeEnd('Total Benchmark Time');
  }
}

export { DNSResolutionBenchmark };
export type { DNSBenchmarkResult, DNSBenchmarkSummary };

// Run benchmarks if called directly
if (require.main === module) {
  runDNSBenchmarks().catch(console.error);
}