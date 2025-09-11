/**
 * WS-339 Performance Monitoring System - CDN Performance Tracker
 * Wedding-focused CDN performance monitoring for photo galleries and assets
 * Critical for vendor workflows and client experience
 */

import { createClient } from '@/lib/supabase/client';
import { APMIntegrationService } from './apm-integration';

export interface CDNPerformanceMetrics {
  url: string;
  resourceType: 'image' | 'video' | 'stylesheet' | 'script' | 'font' | 'other';
  loadTime: number;
  fileSize: number;
  cdnRegion?: string;
  cacheHit: boolean;
  statusCode: number;
  initiatorType: string;
  weddingContext?: {
    weddingDate?: string;
    galleryId?: string;
    clientId?: string;
    isWeddingDay?: boolean;
  };
}

export interface WebVitalsMetrics {
  url: string;
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint (replaces FID)
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  weddingContext?: {
    weddingDate?: string;
    vendorType?: string;
    isWeddingDay?: boolean;
  };
}

export class CDNPerformanceTracker {
  private supabase = createClient();
  private apmService: APMIntegrationService;
  private performanceObserver?: PerformanceObserver;
  private organizationId?: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.apmService = new APMIntegrationService();

    if (typeof window !== 'undefined') {
      this.initializePerformanceObserver();
      this.initializeWebVitals();
    }
  }

  /**
   * Initialize Performance Observer for resource timing
   */
  private initializePerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          this.processResourceTiming(entry as PerformanceResourceTiming);
        } else if (entry.entryType === 'navigation') {
          this.processNavigationTiming(entry as PerformanceNavigationTiming);
        }
      });
    });

    this.performanceObserver.observe({
      entryTypes: [
        'resource',
        'navigation',
        'paint',
        'largest-contentful-paint',
      ],
    });
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    this.observeINP();

    // Cumulative Layout Shift (CLS)
    this.observeCLS();

    // Time to First Byte (TTFB)
    this.observeTTFB();
  }

  /**
   * Process resource timing data
   */
  private async processResourceTiming(entry: PerformanceResourceTiming) {
    // Focus on wedding-related assets
    if (!this.isWeddingRelevantResource(entry.name)) return;

    const cdnMetrics: CDNPerformanceMetrics = {
      url: entry.name,
      resourceType: this.getResourceType(entry.name),
      loadTime: entry.responseEnd - entry.startTime,
      fileSize: entry.transferSize || 0,
      cdnRegion: this.extractCDNRegion(entry.name),
      cacheHit: this.determineCacheHit(entry),
      statusCode: this.extractStatusCode(entry),
      initiatorType: entry.initiatorType,
      weddingContext: await this.extractWeddingContext(entry.name),
    };

    // Track in APM system
    await this.trackCDNPerformance(cdnMetrics);

    // Store for analysis
    await this.storeCDNMetrics(cdnMetrics);

    // Check for performance issues
    await this.checkCDNAlerts(cdnMetrics);
  }

  /**
   * Process navigation timing for page loads
   */
  private async processNavigationTiming(entry: PerformanceNavigationTiming) {
    const webVitals: Partial<WebVitalsMetrics> = {
      url: window.location.href,
      ttfb: entry.responseStart - entry.requestStart,
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType(),
      weddingContext: await this.getPageWeddingContext(),
    };

    // Will be completed by other observers
    await this.storeWebVitals(webVitals);
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      this.updateWebVitals({
        lcp: lastEntry.startTime,
        url: window.location.href,
      });
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  /**
   * Observe Interaction to Next Paint (INP)
   */
  private observeINP() {
    let maxINP = 0;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        // INP calculation
        const inp = entry.processingEnd - entry.startTime;
        if (inp > maxINP) {
          maxINP = inp;
          this.updateWebVitals({
            inp: inp,
            fid: inp, // For backwards compatibility
            url: window.location.href,
          });
        }
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS() {
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.updateWebVitals({
            cls: clsValue,
            url: window.location.href,
          });
        }
      });
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  }

  /**
   * Observe Time to First Byte
   */
  private observeTTFB() {
    const navEntry = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      this.updateWebVitals({
        ttfb,
        url: window.location.href,
      });
    }
  }

  /**
   * Track CDN performance in APM system
   */
  private async trackCDNPerformance(metrics: CDNPerformanceMetrics) {
    if (!this.organizationId) return;

    await this.apmService.trackPhotoUploadPerformance(this.organizationId, {
      fileSize: metrics.fileSize,
      uploadTime: metrics.loadTime,
      weddingDate: metrics.weddingContext?.weddingDate,
      clientName: metrics.weddingContext?.clientId,
      success: metrics.statusCode >= 200 && metrics.statusCode < 300,
      cdn_region: metrics.cdnRegion,
    });
  }

  /**
   * Store CDN metrics in database
   */
  private async storeCDNMetrics(metrics: CDNPerformanceMetrics) {
    if (!this.organizationId) return;

    await this.supabase.from('apm_performance_metrics').insert({
      organization_id: this.organizationId,
      service_name: 'cdn_delivery',
      metric_name: `${metrics.resourceType}_load_time`,
      metric_value: metrics.loadTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        resource_type: metrics.resourceType,
        file_size_kb: Math.round(metrics.fileSize / 1024),
        cdn_region: metrics.cdnRegion,
        cache_hit: metrics.cacheHit,
        status_code: metrics.statusCode,
        initiator: metrics.initiatorType,
      },
      wedding_context: {
        wedding_date: metrics.weddingContext?.weddingDate,
        is_wedding_day: metrics.weddingContext?.isWeddingDay,
        gallery_id: metrics.weddingContext?.galleryId,
        client_id: metrics.weddingContext?.clientId,
      },
      amp_source: 'custom',
    });
  }

  /**
   * Store Web Vitals metrics
   */
  private async storeWebVitals(vitals: Partial<WebVitalsMetrics>) {
    if (!this.organizationId || !vitals.url) return;

    const metricsToStore = [
      { name: 'lcp', value: vitals.lcp, unit: 'ms' },
      { name: 'fid', value: vitals.fid, unit: 'ms' },
      { name: 'inp', value: vitals.inp, unit: 'ms' },
      { name: 'cls', value: vitals.cls, unit: 'score' },
      { name: 'ttfb', value: vitals.ttfb, unit: 'ms' },
    ].filter((metric) => metric.value !== undefined);

    for (const metric of metricsToStore) {
      await this.supabase.from('apm_performance_metrics').insert({
        organization_id: this.organizationId,
        service_name: 'web_vitals',
        metric_name: metric.name,
        metric_value: metric.value!,
        metric_type: 'gauge',
        unit: metric.unit,
        tags: {
          url: vitals.url,
          device_type: vitals.deviceType,
          connection_type: vitals.connectionType,
          page_type: this.getPageType(vitals.url),
        },
        wedding_context: {
          wedding_date: vitals.weddingContext?.weddingDate,
          is_wedding_day: vitals.weddingContext?.isWeddingDay,
          vendor_type: vitals.weddingContext?.vendorType,
        },
        apm_source: 'custom',
      });
    }
  }

  /**
   * Update Web Vitals incrementally
   */
  private async updateWebVitals(update: Partial<WebVitalsMetrics>) {
    // Store individual metric updates
    for (const [key, value] of Object.entries(update)) {
      if (key === 'url' || value === undefined) continue;

      await this.supabase.from('apm_performance_metrics').insert({
        organization_id: this.organizationId!,
        service_name: 'web_vitals',
        metric_name: key,
        metric_value: value as number,
        metric_type: 'gauge',
        unit: key === 'cls' ? 'score' : 'ms',
        tags: {
          url: update.url || window.location.href,
          device_type: this.getDeviceType(),
          connection_type: this.getConnectionType(),
        },
        wedding_context: await this.getPageWeddingContext(),
        apm_source: 'custom',
      });
    }
  }

  /**
   * Check for CDN performance alerts
   */
  private async checkCDNAlerts(metrics: CDNPerformanceMetrics) {
    // Wedding day has stricter thresholds
    const isWeddingDay = metrics.weddingContext?.isWeddingDay;
    const loadTimeThreshold = isWeddingDay ? 2000 : 5000; // 2s on wedding days, 5s normally
    const errorRateThreshold = isWeddingDay ? 0.001 : 0.01; // 0.1% vs 1%

    // Check load time
    if (metrics.loadTime > loadTimeThreshold) {
      await this.triggerCDNAlert('slow_load_time', {
        metric: 'load_time',
        value: metrics.loadTime,
        threshold: loadTimeThreshold,
        resource: metrics.url,
        isWeddingDay,
      });
    }

    // Check for errors
    if (metrics.statusCode >= 400) {
      await this.triggerCDNAlert('resource_error', {
        metric: 'status_code',
        value: metrics.statusCode,
        threshold: 400,
        resource: metrics.url,
        isWeddingDay,
      });
    }

    // Check cache miss rate for wedding images
    if (
      metrics.resourceType === 'image' &&
      !metrics.cacheHit &&
      metrics.weddingContext?.weddingDate
    ) {
      await this.triggerCDNAlert('cache_miss', {
        metric: 'cache_hit_rate',
        value: 0,
        threshold: 0.95,
        resource: metrics.url,
        isWeddingDay,
      });
    }
  }

  /**
   * Trigger CDN performance alert
   */
  private async triggerCDNAlert(alertType: string, data: any) {
    console.warn(`🚨 CDN Performance Alert: ${alertType}`, data);

    // In a real implementation, this would integrate with the alerting system
    // For now, we'll log it and potentially send to external monitoring

    if (data.isWeddingDay) {
      // Escalate wedding day alerts immediately
      console.error('🚨 WEDDING DAY CDN ALERT 🚨', data);
      // Would send to PagerDuty/Slack/etc.
    }
  }

  /**
   * Utility methods
   */
  private isWeddingRelevantResource(url: string): boolean {
    const weddingPatterns = [
      '/wedding-photos/',
      '/galleries/',
      '/client-images/',
      '/vendor-assets/',
      '/portfolio/',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.mp4',
    ];

    return weddingPatterns.some((pattern) => url.includes(pattern));
  }

  private getResourceType(url: string): CDNPerformanceMetrics['resourceType'] {
    const extension = url.split('.').pop()?.toLowerCase();

    if (
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')
    ) {
      return 'image';
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
      return 'video';
    }
    if (['css'].includes(extension || '')) {
      return 'stylesheet';
    }
    if (['js'].includes(extension || '')) {
      return 'script';
    }
    if (['woff', 'woff2', 'ttf', 'eot'].includes(extension || '')) {
      return 'font';
    }

    return 'other';
  }

  private extractCDNRegion(url: string): string {
    // Extract CDN region from URL patterns
    const regionPatterns = [
      { pattern: /cdn-(\w+)\./, group: 1 },
      { pattern: /(\w+)\.cloudfront\.net/, group: 1 },
      { pattern: /\.(\w+)\.amazonaws\.com/, group: 1 },
    ];

    for (const { pattern, group } of regionPatterns) {
      const match = url.match(pattern);
      if (match) return match[group];
    }

    return 'unknown';
  }

  private determineCacheHit(entry: PerformanceResourceTiming): boolean {
    // Heuristics to determine cache hit
    // Very fast load times often indicate cache hits
    const loadTime = entry.responseEnd - entry.startTime;

    // If load time is very fast and there's no network time, likely cache hit
    const networkTime = entry.responseStart - entry.requestStart;
    return loadTime < 50 && networkTime < 10;
  }

  private extractStatusCode(entry: PerformanceResourceTiming): number {
    // Status code extraction is limited in Performance API
    // This would typically come from server logs or additional monitoring
    return 200; // Default assumption
  }

  private async extractWeddingContext(
    url: string,
  ): Promise<CDNPerformanceMetrics['weddingContext']> {
    // Extract wedding context from URL patterns
    const galleryMatch = url.match(/\/galleries\/([^\/]+)/);
    const clientMatch = url.match(/\/clients\/([^\/]+)/);

    if (galleryMatch || clientMatch) {
      // Query database for wedding context
      const { data } = await this.supabase
        .from('clients')
        .select('id, wedding_date, partner_1_name, partner_2_name')
        .eq('organization_id', this.organizationId)
        .single();

      if (data) {
        const isWeddingDay =
          data.wedding_date &&
          new Date(data.wedding_date).toDateString() ===
            new Date().toDateString();

        return {
          weddingDate: data.wedding_date,
          galleryId: galleryMatch?.[1],
          clientId: data.id,
          isWeddingDay,
        };
      }
    }

    return undefined;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string {
    // @ts-ignore - navigator.connection is experimental
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private async getPageWeddingContext() {
    const url = window.location.href;
    const pathSegments = window.location.pathname.split('/');

    // Detect wedding-related pages
    if (pathSegments.includes('clients') || pathSegments.includes('weddings')) {
      const { data } = await this.supabase
        .from('clients')
        .select('wedding_date')
        .eq('organization_id', this.organizationId)
        .single();

      if (data) {
        const isWeddingDay =
          data.wedding_date &&
          new Date(data.wedding_date).toDateString() ===
            new Date().toDateString();

        return {
          wedding_date: data.wedding_date,
          is_wedding_day: isWeddingDay,
          vendor_type: 'photographer', // Would be determined from org
        };
      }
    }

    return {};
  }

  private getPageType(url: string): string {
    const path = new URL(url).pathname;

    if (path.includes('/gallery')) return 'gallery';
    if (path.includes('/forms')) return 'form';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/clients')) return 'client';
    if (path.includes('/weddings')) return 'wedding';

    return 'other';
  }

  /**
   * Public methods for manual tracking
   */

  /**
   * Manually track a photo gallery load
   */
  async trackGalleryLoad(
    galleryId: string,
    loadTime: number,
    photoCount: number,
  ) {
    if (!this.organizationId) return;

    await this.supabase.from('apm_performance_metrics').insert({
      organization_id: this.organizationId,
      service_name: 'wedding_galleries',
      metric_name: 'gallery_load_time',
      metric_value: loadTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        gallery_id: galleryId,
        photo_count: photoCount,
        photos_per_second: Math.round(photoCount / (loadTime / 1000)),
      },
      wedding_context: await this.getPageWeddingContext(),
      apm_source: 'custom',
    });
  }

  /**
   * Manually track photo upload to CDN
   */
  async trackPhotoUpload(uploadData: {
    fileName: string;
    fileSize: number;
    uploadTime: number;
    success: boolean;
    weddingDate?: string;
  }) {
    if (!this.organizationId) return;

    await this.supabase.from('apm_performance_metrics').insert({
      organization_id: this.organizationId,
      service_name: 'photo_uploads',
      metric_name: 'upload_time',
      metric_value: uploadData.uploadTime,
      metric_type: 'timer',
      unit: 'ms',
      tags: {
        file_name: uploadData.fileName,
        file_size_mb: Math.round(uploadData.fileSize / 1024 / 1024),
        success: uploadData.success,
        upload_speed_mbps: Math.round(
          uploadData.fileSize / 1024 / 1024 / (uploadData.uploadTime / 1000),
        ),
      },
      wedding_context: {
        wedding_date: uploadData.weddingDate,
        is_wedding_day:
          uploadData.weddingDate &&
          new Date(uploadData.weddingDate).toDateString() ===
            new Date().toDateString(),
        vendor_type: 'photographer',
      },
      apm_source: 'custom',
    });
  }

  /**
   * Get CDN performance summary for organization
   */
  async getCDNPerformanceSummary(timeRange: '1h' | '24h' | '7d' = '24h') {
    if (!this.organizationId) return null;

    const timeRangeHours = { '1h': 1, '24h': 24, '7d': 168 }[timeRange];

    const { data } = await this.supabase
      .from('apm_performance_metrics')
      .select('*')
      .eq('organization_id', this.organizationId)
      .in('service_name', [
        'cdn_delivery',
        'web_vitals',
        'wedding_galleries',
        'photo_uploads',
      ])
      .gte(
        'created_at',
        new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
      );

    if (!data || data.length === 0) return null;

    // Calculate summary statistics
    const summary = {
      totalRequests: data.length,
      avgLoadTime:
        data.reduce((sum, metric) => sum + metric.metric_value, 0) /
        data.length,
      weddingDayMetrics: data.filter((m) => m.wedding_context?.is_wedding_day)
        .length,
      errorRate:
        data.filter((m) => m.tags?.status_code >= 400).length / data.length,
      cacheHitRate: data.filter((m) => m.tags?.cache_hit).length / data.length,
      by_resource_type: {} as Record<string, number>,
    };

    // Group by resource type
    data.forEach((metric) => {
      const resourceType = metric.tags?.resource_type || 'unknown';
      summary.by_resource_type[resourceType] =
        (summary.by_resource_type[resourceType] || 0) + 1;
    });

    return summary;
  }

  /**
   * Cleanup method
   */
  cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}
