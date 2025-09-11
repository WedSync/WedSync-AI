// Performance Testing Utilities for WS-257
import { performance } from 'perf_hooks';
import { expect } from '@jest/globals';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'seconds' | 'bytes' | 'percentage' | 'count';
  timestamp: number;
  threshold?: number;
  passed?: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  metrics: PerformanceMetric[];
  passed: boolean;
  errors: string[];
  environment: string;
  device?: string;
  weddingId?: string;
}

export class PerformanceTimer {
  private startTime: number;
  private markers: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  mark(name: string): void {
    this.markers.set(name, performance.now());
  }

  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? 
      (this.markers.get(startMark) || this.startTime) : 
      this.startTime;
    
    const duration = endTime - startTime;
    this.markers.set(name, duration);
    return duration;
  }

  getDuration(mark?: string): number {
    if (mark && this.markers.has(mark)) {
      return this.markers.get(mark)!;
    }
    return performance.now() - this.startTime;
  }

  getAllMarkers(): Map<string, number> {
    return new Map(this.markers);
  }

  reset(): void {
    this.startTime = performance.now();
    this.markers.clear();
  }
}

export class MemoryMonitor {
  private initialUsage: NodeJS.MemoryUsage;
  private measurements: NodeJS.MemoryUsage[] = [];

  constructor() {
    this.initialUsage = process.memoryUsage();
  }

  measure(): NodeJS.MemoryUsage {
    const current = process.memoryUsage();
    this.measurements.push(current);
    return current;
  }

  getMemoryDelta(): NodeJS.MemoryUsage {
    const current = this.measure();
    return {
      rss: current.rss - this.initialUsage.rss,
      heapTotal: current.heapTotal - this.initialUsage.heapTotal,
      heapUsed: current.heapUsed - this.initialUsage.heapUsed,
      external: current.external - this.initialUsage.external,
      arrayBuffers: current.arrayBuffers - this.initialUsage.arrayBuffers
    };
  }

  getPeakMemory(): NodeJS.MemoryUsage {
    if (this.measurements.length === 0) {
      return process.memoryUsage();
    }

    return this.measurements.reduce((peak, current) => ({
      rss: Math.max(peak.rss, current.rss),
      heapTotal: Math.max(peak.heapTotal, current.heapTotal),
      heapUsed: Math.max(peak.heapUsed, current.heapUsed),
      external: Math.max(peak.external, current.external),
      arrayBuffers: Math.max(peak.arrayBuffers, current.arrayBuffers)
    }));
  }

  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  getReport(): string {
    const peak = this.getPeakMemory();
    const delta = this.getMemoryDelta();
    
    return `Memory Report:
    Peak Usage: ${this.formatBytes(peak.heapUsed)} heap, ${this.formatBytes(peak.rss)} RSS
    Memory Delta: ${this.formatBytes(delta.heapUsed)} heap, ${this.formatBytes(delta.rss)} RSS
    Measurements: ${this.measurements.length}`;
  }
}

export class LoadGenerator {
  private concurrentRequests: number = 0;
  private totalRequests: number = 0;
  private errors: number = 0;
  private responseTimes: number[] = [];

  async rampUp(options: {
    targetRPS: number;
    duration: number;
    requestFn: () => Promise<any>;
    onProgress?: (stats: any) => void;
  }): Promise<void> {
    const { targetRPS, duration, requestFn, onProgress } = options;
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    let currentRPS = 0;
    const rampUpInterval = 1000; // Check every second
    const totalSteps = duration / rampUpInterval;
    const rpsIncrement = targetRPS / totalSteps;

    const timer = setInterval(async () => {
      currentRPS = Math.min(currentRPS + rpsIncrement, targetRPS);
      const requestsThisSecond = Math.floor(currentRPS);
      
      // Send requests for this second
      const requestPromises = Array(requestsThisSecond).fill(null).map(() => 
        this.makeRequest(requestFn)
      );
      
      const results = await Promise.allSettled(requestPromises);
      
      // Update statistics
      results.forEach(result => {
        if (result.status === 'rejected') {
          this.errors++;
        }
      });

      const stats = this.getStatistics();
      onProgress?.(stats);

      if (Date.now() >= endTime) {
        clearInterval(timer);
      }
    }, rampUpInterval);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, duration);
    });
  }

  async sustainedLoad(options: {
    rps: number;
    duration: number;
    requestFn: () => Promise<any>;
    onProgress?: (stats: any) => void;
  }): Promise<void> {
    const { rps, duration, requestFn, onProgress } = options;
    const startTime = Date.now();
    const interval = 1000 / rps; // Time between requests in ms

    return new Promise((resolve) => {
      const makeNextRequest = async () => {
        if (Date.now() - startTime >= duration) {
          resolve();
          return;
        }

        await this.makeRequest(requestFn);
        
        const stats = this.getStatistics();
        onProgress?.(stats);

        setTimeout(makeNextRequest, interval);
      };

      makeNextRequest();
    });
  }

  private async makeRequest(requestFn: () => Promise<any>): Promise<void> {
    this.concurrentRequests++;
    this.totalRequests++;
    const startTime = performance.now();

    try {
      await requestFn();
      const responseTime = performance.now() - startTime;
      this.responseTimes.push(responseTime);
    } catch (error) {
      this.errors++;
    } finally {
      this.concurrentRequests--;
    }
  }

  getStatistics() {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const total = sortedTimes.length;
    
    return {
      totalRequests: this.totalRequests,
      concurrentRequests: this.concurrentRequests,
      errors: this.errors,
      errorRate: this.totalRequests > 0 ? (this.errors / this.totalRequests) * 100 : 0,
      responseTime: {
        min: total > 0 ? sortedTimes[0] : 0,
        max: total > 0 ? sortedTimes[total - 1] : 0,
        avg: total > 0 ? sortedTimes.reduce((a, b) => a + b, 0) / total : 0,
        p50: total > 0 ? sortedTimes[Math.floor(total * 0.5)] : 0,
        p95: total > 0 ? sortedTimes[Math.floor(total * 0.95)] : 0,
        p99: total > 0 ? sortedTimes[Math.floor(total * 0.99)] : 0
      }
    };
  }

  reset(): void {
    this.concurrentRequests = 0;
    this.totalRequests = 0;
    this.errors = 0;
    this.responseTimes = [];
  }
}

export class WeddingTestDataGenerator {
  private static firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'
  ];

  private static lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'
  ];

  static generateWedding(options: {
    guestCount?: number;
    vendorCount?: number;
    timelineItemCount?: number;
    weddingDate?: Date;
  } = {}) {
    const {
      guestCount = 150,
      vendorCount = 8,
      timelineItemCount = 20,
      weddingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    } = options;

    return {
      id: `test-wedding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bride_name: this.generateRandomName(),
      groom_name: this.generateRandomName(),
      wedding_date: weddingDate.toISOString(),
      venue: this.generateVenue(),
      budget: Math.floor(Math.random() * 50000) + 20000,
      guest_count: guestCount,
      guests: this.generateGuests(guestCount),
      vendors: this.generateVendors(vendorCount),
      timeline: this.generateTimeline(timelineItemCount, weddingDate),
      created_at: new Date().toISOString()
    };
  }

  static generateGuests(count: number) {
    return Array(count).fill(null).map((_, index) => ({
      id: `guest-${index}`,
      name: this.generateRandomName(),
      email: this.generateRandomEmail(),
      phone: this.generateRandomPhone(),
      rsvp_status: Math.random() > 0.1 ? 'accepted' : Math.random() > 0.5 ? 'pending' : 'declined',
      dietary_restrictions: Math.random() > 0.8 ? ['vegetarian'] : [],
      plus_one: Math.random() > 0.6,
      table_assignment: Math.floor(Math.random() * 20) + 1
    }));
  }

  static generateVendors(count: number) {
    const vendorTypes = ['photographer', 'videographer', 'florist', 'caterer', 'musician', 'planner', 'baker', 'transport'];
    return Array(count).fill(null).map((_, index) => ({
      id: `vendor-${index}`,
      name: `${this.firstNames[Math.floor(Math.random() * this.firstNames.length)]}'s ${vendorTypes[index % vendorTypes.length]} Services`,
      type: vendorTypes[index % vendorTypes.length],
      contact_email: this.generateRandomEmail(),
      contact_phone: this.generateRandomPhone(),
      contract_value: Math.floor(Math.random() * 5000) + 500,
      payment_status: Math.random() > 0.3 ? 'paid' : 'pending'
    }));
  }

  static generateTimeline(count: number, weddingDate: Date) {
    const activities = [
      'Hair and Makeup', 'Getting Dressed', 'First Look', 'Ceremony Photos',
      'Ceremony', 'Cocktail Hour', 'Reception Entrance', 'First Dance',
      'Dinner Service', 'Speeches', 'Cake Cutting', 'Dancing', 'Send Off'
    ];

    const startTime = new Date(weddingDate);
    startTime.setHours(10, 0, 0, 0); // Start at 10 AM

    return Array(Math.min(count, activities.length)).fill(null).map((_, index) => {
      const itemTime = new Date(startTime.getTime() + (index * 45 * 60 * 1000)); // 45 minutes apart
      return {
        id: `timeline-${index}`,
        time: itemTime.toISOString(),
        activity: activities[index],
        duration: 30 + Math.floor(Math.random() * 60), // 30-90 minutes
        location: index < 4 ? 'Bridal Suite' : index < 8 ? 'Ceremony Site' : 'Reception Hall',
        vendor_responsible: `vendor-${Math.floor(Math.random() * 8)}`
      };
    });
  }

  private static generateRandomName(): string {
    const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private static generateRandomEmail(): string {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const name = Math.random().toString(36).substr(2, 8);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}@${domain}`;
  }

  private static generateRandomPhone(): string {
    return `+1${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`;
  }
}

export class PerformanceReporter {
  private reports: PerformanceReport[] = [];

  addReport(report: PerformanceReport): void {
    this.reports.push(report);
  }

  generateSummaryReport(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    totalDuration: number;
    criticalFailures: string[];
    performanceRegression: boolean;
  } {
    const totalTests = this.reports.length;
    const passedTests = this.reports.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.reports.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    const criticalFailures = this.reports
      .filter(r => !r.passed)
      .flatMap(r => r.errors)
      .filter(error => error.includes('critical') || error.includes('timeout'));

    // Simple performance regression detection (would need historical data in real implementation)
    const performanceRegression = this.reports.some(r => 
      r.metrics.some(m => m.threshold && m.value > m.threshold * 1.2)
    );

    return {
      totalTests,
      passedTests,
      failedTests,
      averageDuration,
      totalDuration,
      criticalFailures,
      performanceRegression
    };
  }

  exportToJSON(): string {
    return JSON.stringify({
      summary: this.generateSummaryReport(),
      reports: this.reports,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  exportToHTML(): string {
    const summary = this.generateSummaryReport();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>WedSync Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metric { margin: 10px 0; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>WedSync Performance Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">Total Tests: ${summary.totalTests}</div>
        <div class="metric passed">Passed: ${summary.passedTests}</div>
        <div class="metric failed">Failed: ${summary.failedTests}</div>
        <div class="metric">Average Duration: ${summary.averageDuration.toFixed(2)}ms</div>
        <div class="metric ${summary.performanceRegression ? 'failed' : 'passed'}">
            Performance Regression: ${summary.performanceRegression ? 'Detected' : 'None'}
        </div>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Key Metrics</th>
            </tr>
        </thead>
        <tbody>
            ${this.reports.map(report => `
                <tr>
                    <td>${report.testName}</td>
                    <td>${report.duration.toFixed(2)}ms</td>
                    <td class="${report.passed ? 'passed' : 'failed'}">${report.passed ? 'PASS' : 'FAIL'}</td>
                    <td>${report.metrics.slice(0, 3).map(m => `${m.name}: ${m.value}${m.unit}`).join(', ')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  clear(): void {
    this.reports = [];
  }
}

// Performance assertion helpers
export const performanceExpect = {
  responseTimeBelow(actual: number, threshold: number, description?: string): void {
    expect(actual).toBeLessThan(threshold);
    console.log(`✓ ${description || 'Response time'}: ${actual}ms < ${threshold}ms`);
  },

  throughputAbove(actual: number, threshold: number, description?: string): void {
    expect(actual).toBeGreaterThan(threshold);
    console.log(`✓ ${description || 'Throughput'}: ${actual} > ${threshold}`);
  },

  errorRateBelow(actual: number, threshold: number, description?: string): void {
    expect(actual).toBeLessThan(threshold);
    console.log(`✓ ${description || 'Error rate'}: ${actual}% < ${threshold}%`);
  },

  memoryUsageBelow(actual: number, threshold: number, description?: string): void {
    expect(actual).toBeLessThan(threshold);
    console.log(`✓ ${description || 'Memory usage'}: ${actual}MB < ${threshold}MB`);
  }
};

export default {
  PerformanceTimer,
  MemoryMonitor,
  LoadGenerator,
  WeddingTestDataGenerator,
  PerformanceReporter,
  performanceExpected
};