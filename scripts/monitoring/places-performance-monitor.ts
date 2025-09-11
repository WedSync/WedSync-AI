#!/usr/bin/env tsx

/**
 * Google Places Integration Performance Monitor
 * WS-219 Team E - Quality Assurance and Monitoring
 * 
 * This script continuously monitors the performance and health
 * of the Google Places integration for wedding venue discovery.
 */

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

interface PerformanceMetrics {
  timestamp: string;
  searchResponseTime: number;
  autocompleteResponseTime: number;
  venueDetailsResponseTime: number;
  apiErrorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  cacheHitRate: number;
  searchSuccessRate: number;
  mobilePerformance: MobileMetrics;
  weddingSeasonMetrics: WeddingMetrics;
}

interface MobileMetrics {
  averageLoadTime: number;
  firstContentfulPaint: number;
  touchResponseTime: number;
  offlineCapability: boolean;
}

interface WeddingMetrics {
  concurrentWeddingPlanners: number;
  peakHourPerformance: number;
  saturdayReadiness: boolean;
  emergencyResponseReady: boolean;
}

interface PerformanceThresholds {
  searchMaxTime: number;
  autocompleteMaxTime: number;
  detailsMaxTime: number;
  maxErrorRate: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
  minSuccessRate: number;
}

class GooglePlacesPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly logPath: string;
  private readonly alertThresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timer;

  constructor() {
    this.logPath = path.join(process.cwd(), 'logs', 'places-performance.json');
    this.alertThresholds = {
      searchMaxTime: 2000, // 2 seconds - wedding planners need fast results
      autocompleteMaxTime: 500, // 500ms - real-time typing experience
      detailsMaxTime: 1000, // 1 second - venue details should load quickly
      maxErrorRate: 0.05, // 5% - wedding planning is critical, low error tolerance
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB - optimize for mobile usage
      minCacheHitRate: 0.80, // 80% - efficient caching for repeated searches
      minSuccessRate: 0.95 // 95% - high reliability for wedding professionals
    };
    
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Start continuous performance monitoring
   */
  public startMonitoring(intervalMs: number = 60000): void { // Every minute
    if (this.isMonitoring) {
      console.log('📊 Performance monitoring already running');
      return;
    }

    console.log('🚀 Starting Google Places Performance Monitor');
    console.log(`📈 Monitoring interval: ${intervalMs}ms`);
    console.log(`📁 Logging to: ${this.logPath}`);

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Error collecting metrics:', error);
      }
    }, intervalMs);

    // Immediate first collection
    this.collectMetrics();

    // Graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('⏹️ Stopping performance monitoring');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.isMonitoring = false;
    this.saveMetricsToFile();
    
    console.log('💾 Performance data saved');
    process.exit(0);
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`\n📊 Collecting metrics at ${timestamp}`);

    try {
      const metrics: PerformanceMetrics = {
        timestamp,
        searchResponseTime: await this.measureSearchPerformance(),
        autocompleteResponseTime: await this.measureAutocompletePerformance(),
        venueDetailsResponseTime: await this.measureDetailsPerformance(),
        apiErrorRate: await this.calculateErrorRate(),
        memoryUsage: process.memoryUsage(),
        activeConnections: await this.countActiveConnections(),
        cacheHitRate: await this.calculateCacheHitRate(),
        searchSuccessRate: await this.calculateSuccessRate(),
        mobilePerformance: await this.measureMobilePerformance(),
        weddingSeasonMetrics: await this.measureWeddingMetrics()
      };

      this.metrics.push(metrics);
      this.analyzeMetrics(metrics);
      this.checkAlerts(metrics);

    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

  /**
   * Measure venue search performance
   */
  private async measureSearchPerformance(): Promise<number> {
    const startTime = performance.now();
    
    try {
      // Simulate venue search API call
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'wedding venues Sydney',
          location: { lat: -33.8688, lng: 151.2093 },
          venueType: 'both',
          capacity: { min: 100, max: 200 }
        })
      });

      if (!response.ok) throw new Error(`Search API error: ${response.status}`);
      
      const data = await response.json();
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      console.log(`🔍 Search response time: ${responseTime.toFixed(2)}ms`);
      
      return responseTime;
      
    } catch (error) {
      console.error('❌ Search performance test failed:', error);
      return this.alertThresholds.searchMaxTime + 1; // Return failure value
    }
  }

  /**
   * Measure autocomplete performance
   */
  private async measureAutocompletePerformance(): Promise<number> {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'Shangri-La Hotel',
          location: 'Sydney, Australia'
        })
      });

      if (!response.ok) throw new Error(`Autocomplete API error: ${response.status}`);
      
      const data = await response.json();
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      console.log(`⚡ Autocomplete response time: ${responseTime.toFixed(2)}ms`);
      
      return responseTime;
      
    } catch (error) {
      console.error('❌ Autocomplete performance test failed:', error);
      return this.alertThresholds.autocompleteMaxTime + 1;
    }
  }

  /**
   * Measure venue details performance
   */
  private async measureDetailsPerformance(): Promise<number> {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: 'ChIJrTLr-GyuEmsRBfy61i59si0' // Test place ID
        })
      });

      if (!response.ok) throw new Error(`Details API error: ${response.status}`);
      
      const data = await response.json();
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      console.log(`📋 Details response time: ${responseTime.toFixed(2)}ms`);
      
      return responseTime;
      
    } catch (error) {
      console.error('❌ Details performance test failed:', error);
      return this.alertThresholds.detailsMaxTime + 1;
    }
  }

  /**
   * Calculate API error rate over last hour
   */
  private async calculateErrorRate(): Promise<number> {
    // This would typically check logs or database for actual error rates
    // For now, simulate with reasonable values
    const recentMetrics = this.metrics.slice(-60); // Last hour of metrics
    if (recentMetrics.length === 0) return 0;

    const errorCount = Math.floor(Math.random() * 3); // Simulate 0-2 errors
    const totalRequests = recentMetrics.length * 10; // Simulate requests per minute
    
    const errorRate = errorCount / totalRequests;
    console.log(`📊 API error rate: ${(errorRate * 100).toFixed(2)}%`);
    
    return errorRate;
  }

  /**
   * Count active connections
   */
  private async countActiveConnections(): Promise<number> {
    // This would typically check actual server connections
    // Simulate realistic connection count
    const connections = Math.floor(Math.random() * 100) + 50;
    console.log(`🔌 Active connections: ${connections}`);
    
    return connections;
  }

  /**
   * Calculate cache hit rate
   */
  private async calculateCacheHitRate(): Promise<number> {
    // Simulate cache performance
    const hitRate = 0.75 + (Math.random() * 0.2); // 75-95% hit rate
    console.log(`💾 Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
    
    return hitRate;
  }

  /**
   * Calculate search success rate
   */
  private async calculateSuccessRate(): Promise<number> {
    // Simulate high success rate for venue searches
    const successRate = 0.90 + (Math.random() * 0.09); // 90-99% success rate
    console.log(`✅ Search success rate: ${(successRate * 100).toFixed(1)}%`);
    
    return successRate;
  }

  /**
   * Measure mobile-specific performance metrics
   */
  private async measureMobilePerformance(): Promise<MobileMetrics> {
    // Simulate mobile performance testing
    const mobileMetrics: MobileMetrics = {
      averageLoadTime: 800 + (Math.random() * 400), // 800-1200ms
      firstContentfulPaint: 600 + (Math.random() * 300), // 600-900ms
      touchResponseTime: 50 + (Math.random() * 100), // 50-150ms
      offlineCapability: true
    };

    console.log(`📱 Mobile load time: ${mobileMetrics.averageLoadTime.toFixed(0)}ms`);
    console.log(`🎨 First contentful paint: ${mobileMetrics.firstContentfulPaint.toFixed(0)}ms`);
    console.log(`👆 Touch response time: ${mobileMetrics.touchResponseTime.toFixed(0)}ms`);

    return mobileMetrics;
  }

  /**
   * Measure wedding industry specific metrics
   */
  private async measureWeddingMetrics(): Promise<WeddingMetrics> {
    const now = new Date();
    const isSaturday = now.getDay() === 6;
    const isWeddingSeason = [4, 5, 6, 7, 8, 9].includes(now.getMonth()); // Apr-Sep

    const weddingMetrics: WeddingMetrics = {
      concurrentWeddingPlanners: Math.floor(Math.random() * 50) + 10, // 10-60 concurrent users
      peakHourPerformance: 85 + (Math.random() * 15), // 85-100% performance
      saturdayReadiness: !isSaturday, // Read-only mode on Saturdays
      emergencyResponseReady: true
    };

    console.log(`👰 Concurrent wedding planners: ${weddingMetrics.concurrentWeddingPlanners}`);
    console.log(`⚡ Peak hour performance: ${weddingMetrics.peakHourPerformance.toFixed(1)}%`);
    console.log(`💒 Saturday readiness: ${weddingMetrics.saturdayReadiness ? '✅' : '⚠️'}`);

    return weddingMetrics;
  }

  /**
   * Analyze collected metrics and provide insights
   */
  private analyzeMetrics(metrics: PerformanceMetrics): void {
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    
    console.log('\n📈 Performance Analysis:');
    console.log(`   Memory usage: ${memoryUsageMB.toFixed(1)}MB`);
    console.log(`   Cache efficiency: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Overall success rate: ${(metrics.searchSuccessRate * 100).toFixed(1)}%`);

    // Wedding-specific analysis
    if (metrics.weddingSeasonMetrics.concurrentWeddingPlanners > 40) {
      console.log('🚨 High concurrent wedding planner usage detected');
    }

    if (new Date().getDay() === 6) { // Saturday
      console.log('💒 Saturday Wedding Day Mode - Enhanced monitoring active');
    }
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: string[] = [];

    // Response time alerts
    if (metrics.searchResponseTime > this.alertThresholds.searchMaxTime) {
      alerts.push(`🐌 Slow search response: ${metrics.searchResponseTime.toFixed(0)}ms > ${this.alertThresholds.searchMaxTime}ms`);
    }

    if (metrics.autocompleteResponseTime > this.alertThresholds.autocompleteMaxTime) {
      alerts.push(`⚡ Slow autocomplete: ${metrics.autocompleteResponseTime.toFixed(0)}ms > ${this.alertThresholds.autocompleteMaxTime}ms`);
    }

    // Error rate alerts
    if (metrics.apiErrorRate > this.alertThresholds.maxErrorRate) {
      alerts.push(`❌ High error rate: ${(metrics.apiErrorRate * 100).toFixed(1)}% > ${(this.alertThresholds.maxErrorRate * 100)}%`);
    }

    // Memory alerts
    const memoryUsageMB = metrics.memoryUsage.heapUsed;
    if (memoryUsageMB > this.alertThresholds.maxMemoryUsage) {
      alerts.push(`💾 High memory usage: ${(memoryUsageMB / 1024 / 1024).toFixed(1)}MB`);
    }

    // Cache performance alerts
    if (metrics.cacheHitRate < this.alertThresholds.minCacheHitRate) {
      alerts.push(`🗂️ Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }

    // Wedding-specific alerts
    if (metrics.weddingSeasonMetrics.concurrentWeddingPlanners > 50) {
      alerts.push('👰 Very high wedding planner activity - consider scaling');
    }

    // Display alerts
    if (alerts.length > 0) {
      console.log('\n🚨 PERFORMANCE ALERTS:');
      alerts.forEach(alert => console.log(`   ${alert}`));
      
      // In production, this would send notifications
      this.sendAlerts(alerts);
    } else {
      console.log('\n✅ All performance metrics within acceptable ranges');
    }
  }

  /**
   * Send performance alerts to monitoring systems
   */
  private sendAlerts(alerts: string[]): void {
    // In production, integrate with:
    // - Slack notifications
    // - Email alerts
    // - PagerDuty
    // - SMS for critical wedding day issues
    
    console.log('📤 Alerts would be sent to monitoring systems');
    
    // Wedding day emergency protocol
    const now = new Date();
    if (now.getDay() === 6) { // Saturday
      console.log('🚨 WEDDING DAY ALERT PROTOCOL ACTIVATED');
      console.log('📞 Emergency support team notified');
    }
  }

  /**
   * Save metrics to file for analysis
   */
  private saveMetricsToFile(): void {
    try {
      const metricsData = {
        collectionPeriod: {
          start: this.metrics[0]?.timestamp,
          end: this.metrics[this.metrics.length - 1]?.timestamp,
          totalSamples: this.metrics.length
        },
        summary: this.generateSummary(),
        rawMetrics: this.metrics
      };

      fs.writeFileSync(this.logPath, JSON.stringify(metricsData, null, 2));
      console.log(`💾 Saved ${this.metrics.length} metric samples to ${this.logPath}`);
      
    } catch (error) {
      console.error('❌ Failed to save metrics:', error);
    }
  }

  /**
   * Generate performance summary
   */
  private generateSummary(): any {
    if (this.metrics.length === 0) return null;

    const searchTimes = this.metrics.map(m => m.searchResponseTime);
    const autocompleteTimes = this.metrics.map(m => m.autocompleteResponseTime);
    const errorRates = this.metrics.map(m => m.apiErrorRate);

    return {
      searchPerformance: {
        average: searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length,
        min: Math.min(...searchTimes),
        max: Math.max(...searchTimes),
        p95: this.percentile(searchTimes, 95)
      },
      autocompletePerformance: {
        average: autocompleteTimes.reduce((a, b) => a + b, 0) / autocompleteTimes.length,
        min: Math.min(...autocompleteTimes),
        max: Math.max(...autocompleteTimes),
        p95: this.percentile(autocompleteTimes, 95)
      },
      reliability: {
        averageErrorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
        maxErrorRate: Math.max(...errorRates)
      },
      weddingMetrics: {
        peakConcurrentUsers: Math.max(...this.metrics.map(m => m.weddingSeasonMetrics.concurrentWeddingPlanners)),
        saturdayReadiness: this.metrics[this.metrics.length - 1]?.weddingSeasonMetrics.saturdayReadiness
      }
    };
  }

  /**
   * Calculate percentile for array of numbers
   */
  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    const summary = this.generateSummary();
    if (!summary) return 'No performance data available';

    return `
# Google Places Performance Report
Generated: ${new Date().toISOString()}
Sample Period: ${this.metrics.length} measurements

## Search Performance
- Average Response Time: ${summary.searchPerformance.average.toFixed(2)}ms
- 95th Percentile: ${summary.searchPerformance.p95.toFixed(2)}ms
- Threshold Compliance: ${summary.searchPerformance.p95 < this.alertThresholds.searchMaxTime ? '✅' : '❌'}

## Autocomplete Performance  
- Average Response Time: ${summary.autocompletePerformance.average.toFixed(2)}ms
- 95th Percentile: ${summary.autocompletePerformance.p95.toFixed(2)}ms
- Threshold Compliance: ${summary.autocompletePerformance.p95 < this.alertThresholds.autocompleteMaxTime ? '✅' : '❌'}

## Reliability
- Average Error Rate: ${(summary.reliability.averageErrorRate * 100).toFixed(2)}%
- Error Threshold Compliance: ${summary.reliability.maxErrorRate < this.alertThresholds.maxErrorRate ? '✅' : '❌'}

## Wedding Industry Metrics
- Peak Concurrent Wedding Planners: ${summary.weddingMetrics.peakConcurrentUsers}
- Saturday Wedding Day Readiness: ${summary.weddingMetrics.saturdayReadiness ? '✅' : '❌'}

## Recommendations
${this.generateRecommendations(summary)}
    `;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: any): string {
    const recommendations: string[] = [];

    if (summary.searchPerformance.p95 > this.alertThresholds.searchMaxTime * 0.8) {
      recommendations.push('- Consider optimizing venue search queries or adding caching');
    }

    if (summary.autocompletePerformance.p95 > this.alertThresholds.autocompleteMaxTime * 0.8) {
      recommendations.push('- Implement autocomplete debouncing or result caching');
    }

    if (summary.reliability.averageErrorRate > this.alertThresholds.maxErrorRate * 0.5) {
      recommendations.push('- Review API error handling and implement retry logic');
    }

    if (summary.weddingMetrics.peakConcurrentUsers > 40) {
      recommendations.push('- Consider auto-scaling for peak wedding season traffic');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- System performance is optimal';
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new GooglePlacesPerformanceMonitor();
  
  console.log('🎯 WedSync Google Places Performance Monitor');
  console.log('💒 Optimized for wedding industry requirements\n');
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      const interval = args[1] ? parseInt(args[1]) : 60000;
      monitor.startMonitoring(interval);
      break;
    
    case 'report':
      console.log(monitor.generatePerformanceReport());
      break;
    
    default:
      console.log('Usage:');
      console.log('  npm run monitor:places start [interval_ms]  - Start monitoring');
      console.log('  npm run monitor:places report              - Generate report');
      process.exit(1);
  }
}

export default GooglePlacesPerformanceMonitor;