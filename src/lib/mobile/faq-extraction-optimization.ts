/**
 * Mobile FAQ Extraction Optimization Service
 *
 * Optimizes FAQ extraction specifically for mobile devices with:
 * - Reduced payload sizes for mobile data
 * - Progressive loading of FAQ content
 * - Background sync for extraction jobs
 * - Battery usage optimization
 * - Network state awareness
 */

import { compress, decompress } from 'lz-string';

export interface FAQExtractionRequest {
  url: string;
  maxPagesPerSite?: number;
  timeoutPerPage?: number;
  enableImageExtraction?: boolean;
  prioritizeMobileContent?: boolean;
  extractionDepth?: number;
  maxContentLength?: number;
}

export interface MobileOptimizedExtraction {
  faqs: OptimizedFAQ[];
  metadata: ExtractionMetadata;
  cacheKey: string;
  compressionRatio: number;
  estimatedBandwidthUsed: number;
}

export interface OptimizedFAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  confidence: number;
  source: string;
  priority: number;
  compressedContent?: string;
  estimatedSize: number;
}

export interface ExtractionMetadata {
  extractionId: string;
  timestamp: number;
  url: string;
  totalFAQs: number;
  processingTime: number;
  networkUsage: number;
  batteryImpact: 'low' | 'medium' | 'high';
  cacheability: number; // 0-1 score
}

export interface NetworkStats {
  connectionType: string;
  downlinkMbps: number;
  rtt: number;
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

export class MobileFAQOptimizer {
  private networkInfo: NetworkStats | null = null;
  private batteryInfo: BatteryInfo | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private cache = new Map<string, MobileOptimizedExtraction>();
  private extractionQueue: FAQExtractionRequest[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeDeviceMonitoring();
  }

  private async initializeDeviceMonitoring(): Promise<void> {
    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkInfo = {
        connectionType: connection.type || 'unknown',
        downlinkMbps: connection.downlink || 0,
        rtt: connection.rtt || 0,
        effectiveType: connection.effectiveType || '4g',
      };

      connection.addEventListener('change', () => {
        this.networkInfo = {
          connectionType: connection.type || 'unknown',
          downlinkMbps: connection.downlink || 0,
          rtt: connection.rtt || 0,
          effectiveType: connection.effectiveType || '4g',
        };
      });
    }

    // Battery Status API
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryInfo = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };

        battery.addEventListener('levelchange', () => {
          if (this.batteryInfo) {
            this.batteryInfo.level = battery.level;
          }
        });

        battery.addEventListener('chargingchange', () => {
          if (this.batteryInfo) {
            this.batteryInfo.charging = battery.charging;
          }
        });
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === 'measure' &&
            entry.name.includes('faq-extraction')
          ) {
            this.logPerformanceMetrics(entry);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  async optimizeExtractionForMobile(
    request: FAQExtractionRequest,
  ): Promise<MobileOptimizedExtraction> {
    const startTime = performance.now();
    performance.mark('faq-extraction-start');

    try {
      // Optimize request parameters for mobile
      const mobileRequest = this.optimizeRequestForMobile(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(mobileRequest);
      const cached = this.cache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        performance.mark('faq-extraction-end');
        performance.measure(
          'faq-extraction-cached',
          'faq-extraction-start',
          'faq-extraction-end',
        );
        return cached;
      }

      // Execute extraction with mobile optimizations
      const extraction =
        await this.extractWithMobileOptimization(mobileRequest);

      // Cache the result
      this.cache.set(cacheKey, extraction);

      performance.mark('faq-extraction-end');
      performance.measure(
        'faq-extraction-complete',
        'faq-extraction-start',
        'faq-extraction-end',
      );

      return extraction;
    } catch (error) {
      performance.mark('faq-extraction-error');
      performance.measure(
        'faq-extraction-failed',
        'faq-extraction-start',
        'faq-extraction-error',
      );
      throw error;
    }
  }

  private optimizeRequestForMobile(
    request: FAQExtractionRequest,
  ): FAQExtractionRequest {
    const networkMultiplier = this.getNetworkSpeedMultiplier();
    const batteryMultiplier = this.getBatteryOptimizationMultiplier();

    return {
      ...request,
      maxPagesPerSite: Math.min(
        request.maxPagesPerSite || 10,
        5 * networkMultiplier,
      ),
      timeoutPerPage: Math.max(
        request.timeoutPerPage || 30000,
        15000 / networkMultiplier,
      ),
      enableImageExtraction:
        request.enableImageExtraction && networkMultiplier > 0.5,
      prioritizeMobileContent: true,
      extractionDepth: Math.min(request.extractionDepth || 3, 2),
      maxContentLength: Math.min(
        request.maxContentLength || 5000,
        2000 * batteryMultiplier,
      ),
    };
  }

  private getNetworkSpeedMultiplier(): number {
    if (!this.networkInfo) return 1;

    switch (this.networkInfo.effectiveType) {
      case 'slow-2g':
        return 0.2;
      case '2g':
        return 0.4;
      case '3g':
        return 0.7;
      case '4g':
        return 1.0;
      default:
        return 0.8;
    }
  }

  private getBatteryOptimizationMultiplier(): number {
    if (!this.batteryInfo) return 1;

    if (this.batteryInfo.charging) return 1;

    if (this.batteryInfo.level < 0.2) return 0.3; // Low battery mode
    if (this.batteryInfo.level < 0.5) return 0.7; // Power saving mode

    return 1;
  }

  private async extractWithMobileOptimization(
    request: FAQExtractionRequest,
  ): Promise<MobileOptimizedExtraction> {
    const extractionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let networkUsage = 0;

    try {
      // Simulate FAQ extraction (replace with actual extraction logic)
      const response = await fetch('/api/faq/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mobile-Optimized': 'true',
          'X-Network-Type': this.networkInfo?.effectiveType || 'unknown',
        },
        body: JSON.stringify(request),
      });

      networkUsage = this.estimateNetworkUsage(response);

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const rawFAQs = await response.json();

      // Optimize and compress FAQs for mobile
      const optimizedFAQs = await this.optimizeFAQsForMobile(rawFAQs);
      const compressedData = this.compressFAQData(optimizedFAQs);

      const processingTime = Date.now() - startTime;
      const batteryImpact = this.calculateBatteryImpact(
        processingTime,
        networkUsage,
      );

      const extraction: MobileOptimizedExtraction = {
        faqs: compressedData.faqs,
        metadata: {
          extractionId,
          timestamp: startTime,
          url: request.url,
          totalFAQs: optimizedFAQs.length,
          processingTime,
          networkUsage,
          batteryImpact,
          cacheability: this.calculateCacheability(request.url, optimizedFAQs),
        },
        cacheKey: this.generateCacheKey(request),
        compressionRatio: compressedData.compressionRatio,
        estimatedBandwidthUsed: networkUsage,
      };

      return extraction;
    } catch (error) {
      throw new Error(
        `Mobile FAQ extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async optimizeFAQsForMobile(rawFAQs: any[]): Promise<OptimizedFAQ[]> {
    return rawFAQs
      .map((faq, index) => ({
        id: `faq_${index}_${Date.now()}`,
        question: this.truncateForMobile(faq.question, 200),
        answer: this.truncateForMobile(faq.answer, 800),
        category: faq.category,
        confidence: faq.confidence || 0.5,
        source: faq.source || 'unknown',
        priority: this.calculatePriority(faq),
        estimatedSize: new Blob([JSON.stringify(faq)]).size,
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 50); // Limit to 50 most important FAQs for mobile
  }

  private truncateForMobile(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > maxLength * 0.8
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  private calculatePriority(faq: any): number {
    let priority = faq.confidence || 0.5;

    // Boost priority for common mobile use cases
    const mobileKeywords = [
      'mobile',
      'phone',
      'app',
      'touch',
      'swipe',
      'notification',
    ];
    const questionLower = faq.question.toLowerCase();

    for (const keyword of mobileKeywords) {
      if (questionLower.includes(keyword)) {
        priority += 0.1;
      }
    }

    // Boost priority for short, clear answers
    if (faq.answer && faq.answer.length < 300) {
      priority += 0.05;
    }

    return Math.min(priority, 1);
  }

  private compressFAQData(faqs: OptimizedFAQ[]): {
    faqs: OptimizedFAQ[];
    compressionRatio: number;
  } {
    const originalSize = new Blob([JSON.stringify(faqs)]).size;

    const compressedFAQs = faqs.map((faq) => {
      const compressedAnswer = compress(faq.answer);
      return {
        ...faq,
        answer: faq.answer, // Keep original for immediate use
        compressedContent: compressedAnswer,
        estimatedSize: new Blob([compressedAnswer]).size,
      };
    });

    const compressedSize = compressedFAQs.reduce(
      (total, faq) => total + faq.estimatedSize,
      0,
    );
    const compressionRatio = compressedSize / originalSize;

    return { faqs: compressedFAQs, compressionRatio };
  }

  private estimateNetworkUsage(response: Response): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  private calculateBatteryImpact(
    processingTime: number,
    networkUsage: number,
  ): 'low' | 'medium' | 'high' {
    const baseImpact = processingTime / 1000 + networkUsage / (1024 * 1024); // seconds + MB

    if (baseImpact < 5) return 'low';
    if (baseImpact < 15) return 'medium';
    return 'high';
  }

  private calculateCacheability(url: string, faqs: OptimizedFAQ[]): number {
    let score = 0.5; // base score

    // Higher cacheability for documentation sites
    if (
      url.includes('docs') ||
      url.includes('help') ||
      url.includes('support')
    ) {
      score += 0.2;
    }

    // Higher cacheability for FAQs with high confidence
    const avgConfidence =
      faqs.reduce((sum, faq) => sum + faq.confidence, 0) / faqs.length;
    score += avgConfidence * 0.3;

    return Math.min(score, 1);
  }

  private generateCacheKey(request: FAQExtractionRequest): string {
    const keyData = {
      url: request.url,
      maxPages: request.maxPagesPerSite,
      mobile: request.prioritizeMobileContent,
      depth: request.extractionDepth,
    };

    return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '');
  }

  private isCacheValid(cached: MobileOptimizedExtraction): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const age = Date.now() - cached.metadata.timestamp;

    return age < maxAge && cached.metadata.cacheability > 0.3;
  }

  private logPerformanceMetrics(entry: PerformanceEntry): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `FAQ Extraction Performance: ${entry.name} took ${entry.duration}ms`,
      );
    }
  }

  // Public methods for queue management
  async queueExtractionForBackgroundSync(
    request: FAQExtractionRequest,
  ): Promise<void> {
    this.extractionQueue.push(request);

    if (!this.isProcessingQueue) {
      this.processExtractionQueue();
    }
  }

  private async processExtractionQueue(): Promise<void> {
    if (this.isProcessingQueue || this.extractionQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      while (this.extractionQueue.length > 0) {
        // Only process if we have good network and battery conditions
        if (!this.shouldProcessQueue()) {
          setTimeout(() => this.processExtractionQueue(), 60000); // Try again in 1 minute
          break;
        }

        const request = this.extractionQueue.shift();
        if (request) {
          try {
            await this.optimizeExtractionForMobile(request);
          } catch (error) {
            console.error('Background extraction failed:', error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private shouldProcessQueue(): boolean {
    // Don't process on very slow networks
    if (
      this.networkInfo?.effectiveType === 'slow-2g' ||
      this.networkInfo?.effectiveType === '2g'
    ) {
      return false;
    }

    // Don't process when battery is very low and not charging
    if (
      this.batteryInfo &&
      !this.batteryInfo.charging &&
      this.batteryInfo.level < 0.15
    ) {
      return false;
    }

    return true;
  }

  // Public method to get cached data
  getCachedExtraction(
    request: FAQExtractionRequest,
  ): MobileOptimizedExtraction | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);

    return cached && this.isCacheValid(cached) ? cached : null;
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Public method to get cache statistics
  getCacheStats(): { size: number; hitRate: number; totalItems: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses in real implementation
      totalItems: this.cache.size,
    };
  }

  // Cleanup method
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.cache.clear();
    this.extractionQueue = [];
  }
}

// Singleton instance for global use
export const mobileFAQOptimizer = new MobileFAQOptimizer();

// Utility functions for mobile optimization
export const mobileUtils = {
  // Detect if user is on mobile device
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  },

  // Get optimal batch size for mobile processing
  getOptimalBatchSize(): number {
    if (!mobileFAQOptimizer['networkInfo']) return 5;

    switch (mobileFAQOptimizer['networkInfo'].effectiveType) {
      case 'slow-2g':
        return 1;
      case '2g':
        return 2;
      case '3g':
        return 5;
      case '4g':
        return 10;
      default:
        return 5;
    }
  },

  // Check if extraction should be deferred
  shouldDeferExtraction(): boolean {
    const battery = mobileFAQOptimizer['batteryInfo'];
    if (battery && !battery.charging && battery.level < 0.2) {
      return true;
    }

    const network = mobileFAQOptimizer['networkInfo'];
    if (
      network &&
      (network.effectiveType === 'slow-2g' || network.effectiveType === '2g')
    ) {
      return true;
    }

    return false;
  },
};
