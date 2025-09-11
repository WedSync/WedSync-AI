'use client';

/**
 * PWA Service Worker Integration for Rate Limiting
 * Handles offline rate limit caching and request queuing
 */

interface ServiceWorkerRateLimitCache {
  endpoint: string;
  current: number;
  limit: number;
  resetTime: number;
  tier: string;
  lastUpdated: number;
}

interface QueuedServiceWorkerRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  rateLimitInfo: {
    retryAfter: number;
    reason: string;
    tier: string;
  };
  queuedAt: number;
  priority: number;
}

export class ServiceWorkerRateLimitManager {
  private static instance: ServiceWorkerRateLimitManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isServiceWorkerReady = false;

  private constructor() {
    this.initializeServiceWorker();
  }

  static getInstance(): ServiceWorkerRateLimitManager {
    if (!ServiceWorkerRateLimitManager.instance) {
      ServiceWorkerRateLimitManager.instance =
        new ServiceWorkerRateLimitManager();
    }
    return ServiceWorkerRateLimitManager.instance;
  }

  /**
   * Initialize service worker with rate limiting capabilities
   */
  async initializeServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.isServiceWorkerReady = true;

      // Set up message handling
      this.setupMessageHandling();

      // Send rate limiting configuration to service worker
      await this.configureServiceWorkerRateLimiting();

      console.log('Service Worker rate limiting initialized');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Cache rate limit status in service worker
   */
  async cacheRateLimitStatus(
    rateLimits: ServiceWorkerRateLimitCache[],
  ): Promise<void> {
    if (!this.isServiceWorkerReady) return;

    try {
      await this.sendMessageToServiceWorker({
        type: 'CACHE_RATE_LIMITS',
        data: {
          rateLimits,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Failed to cache rate limits in service worker:', error);
    }
  }

  /**
   * Get cached rate limit status from service worker
   */
  async getCachedRateLimitStatus(
    endpoint: string,
  ): Promise<ServiceWorkerRateLimitCache | null> {
    if (!this.isServiceWorkerReady) return null;

    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_CACHED_RATE_LIMIT',
        data: { endpoint },
      });

      return response?.rateLimitStatus || null;
    } catch (error) {
      console.error('Failed to get cached rate limit:', error);
      return null;
    }
  }

  /**
   * Queue rate limited request in service worker
   */
  async queueRateLimitedRequestInServiceWorker(
    request: Request,
    rateLimitInfo: QueuedServiceWorkerRequest['rateLimitInfo'],
  ): Promise<string> {
    if (!this.isServiceWorkerReady) {
      throw new Error('Service Worker not ready');
    }

    const queuedRequest: QueuedServiceWorkerRequest = {
      id: this.generateRequestId(),
      url: request.url,
      method: request.method,
      headers: this.requestHeadersToObject(request.headers),
      body: request.method !== 'GET' ? await request.text() : undefined,
      rateLimitInfo,
      queuedAt: Date.now(),
      priority: this.calculateRequestPriority(request.url, rateLimitInfo),
    };

    try {
      await this.sendMessageToServiceWorker({
        type: 'QUEUE_RATE_LIMITED_REQUEST',
        data: queuedRequest,
      });

      return queuedRequest.id;
    } catch (error) {
      console.error('Failed to queue request in service worker:', error);
      throw error;
    }
  }

  /**
   * Get queue status from service worker
   */
  async getQueueStatus(): Promise<{
    queueSize: number;
    pendingCount: number;
    processingCount: number;
    nextProcessingTime: number;
  }> {
    if (!this.isServiceWorkerReady) {
      return {
        queueSize: 0,
        pendingCount: 0,
        processingCount: 0,
        nextProcessingTime: 0,
      };
    }

    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_QUEUE_STATUS',
      });

      return (
        response?.queueStatus || {
          queueSize: 0,
          pendingCount: 0,
          processingCount: 0,
          nextProcessingTime: 0,
        }
      );
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return {
        queueSize: 0,
        pendingCount: 0,
        processingCount: 0,
        nextProcessingTime: 0,
      };
    }
  }

  /**
   * Process queued requests (usually called when online)
   */
  async processQueuedRequests(): Promise<void> {
    if (!this.isServiceWorkerReady) return;

    try {
      await this.sendMessageToServiceWorker({
        type: 'PROCESS_QUEUED_REQUESTS',
      });
    } catch (error) {
      console.error('Failed to process queued requests:', error);
    }
  }

  /**
   * Configure service worker with rate limiting settings
   */
  private async configureServiceWorkerRateLimiting(): Promise<void> {
    const config = {
      cacheMaxAge: 5 * 60 * 1000, // 5 minutes
      queueMaxSize: 100,
      retryAttempts: 3,
      retryBackoff: 1.5,
      weddingPriorityBoost: true,
      offlineQueueing: true,
    };

    await this.sendMessageToServiceWorker({
      type: 'CONFIGURE_RATE_LIMITING',
      data: config,
    });
  }

  /**
   * Set up message handling with service worker
   */
  private setupMessageHandling(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'RATE_LIMIT_CACHE_UPDATED':
          this.handleRateLimitCacheUpdate(data);
          break;

        case 'QUEUED_REQUEST_PROCESSED':
          this.handleQueuedRequestProcessed(data);
          break;

        case 'QUEUE_PROCESSING_COMPLETE':
          this.handleQueueProcessingComplete(data);
          break;

        case 'RATE_LIMIT_ERROR':
          this.handleRateLimitError(data);
          break;

        default:
          console.log('Unknown service worker message:', type, data);
      }
    });
  }

  /**
   * Send message to service worker
   */
  private async sendMessageToServiceWorker(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [
        messageChannel.port2,
      ]);

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000);
    });
  }

  /**
   * Message handlers
   */
  private handleRateLimitCacheUpdate(data: any): void {
    console.log('Rate limit cache updated in service worker:', data);

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('serviceWorker:rateLimitCacheUpdated', {
          detail: data,
        }),
      );
    }
  }

  private handleQueuedRequestProcessed(data: any): void {
    console.log('Queued request processed:', data);

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('serviceWorker:queuedRequestProcessed', {
          detail: data,
        }),
      );
    }
  }

  private handleQueueProcessingComplete(data: any): void {
    console.log('Queue processing complete:', data);

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('serviceWorker:queueProcessingComplete', {
          detail: data,
        }),
      );
    }
  }

  private handleRateLimitError(data: any): void {
    console.error('Service worker rate limit error:', data);

    // Emit event for error handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('serviceWorker:rateLimitError', { detail: data }),
      );
    }
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `sw_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private requestHeadersToObject(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    return headerObj;
  }

  private calculateRequestPriority(
    url: string,
    rateLimitInfo: QueuedServiceWorkerRequest['rateLimitInfo'],
  ): number {
    let priority = 50; // Base priority

    // Wedding-related endpoints get higher priority
    if (url.includes('/api/wedding') || url.includes('/api/vendor')) {
      priority += 30;
    }

    // Critical operations
    if (url.includes('/emergency') || url.includes('/urgent')) {
      priority += 40;
    }

    // Time-sensitive operations
    if (url.includes('/timeline') || url.includes('/schedule')) {
      priority += 20;
    }

    // Tier-based priority
    const tierPriority = {
      free: 0,
      starter: 5,
      professional: 10,
      scale: 15,
      enterprise: 20,
    };

    priority +=
      tierPriority[rateLimitInfo.tier as keyof typeof tierPriority] || 0;

    return Math.min(100, priority); // Cap at 100
  }

  /**
   * Check if service worker is ready and rate limiting is configured
   */
  isReady(): boolean {
    return this.isServiceWorkerReady;
  }

  /**
   * Update service worker with new rate limiting configuration
   */
  async updateConfiguration(
    config: Partial<{
      cacheMaxAge: number;
      queueMaxSize: number;
      retryAttempts: number;
      retryBackoff: number;
      weddingPriorityBoost: boolean;
      offlineQueueing: boolean;
    }>,
  ): Promise<void> {
    if (!this.isServiceWorkerReady) return;

    await this.sendMessageToServiceWorker({
      type: 'UPDATE_CONFIGURATION',
      data: config,
    });
  }

  /**
   * Clear rate limit cache in service worker
   */
  async clearRateLimitCache(): Promise<void> {
    if (!this.isServiceWorkerReady) return;

    await this.sendMessageToServiceWorker({
      type: 'CLEAR_RATE_LIMIT_CACHE',
    });
  }

  /**
   * Get service worker performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    averageQueueTime: number;
    totalRequestsProcessed: number;
    errorRate: number;
  }> {
    if (!this.isServiceWorkerReady) {
      return {
        cacheHitRate: 0,
        averageQueueTime: 0,
        totalRequestsProcessed: 0,
        errorRate: 0,
      };
    }

    try {
      const response = await this.sendMessageToServiceWorker({
        type: 'GET_PERFORMANCE_METRICS',
      });

      return (
        response?.metrics || {
          cacheHitRate: 0,
          averageQueueTime: 0,
          totalRequestsProcessed: 0,
          errorRate: 0,
        }
      );
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        cacheHitRate: 0,
        averageQueueTime: 0,
        totalRequestsProcessed: 0,
        errorRate: 0,
      };
    }
  }
}

// Export singleton instance
export const serviceWorkerRateLimitManager =
  ServiceWorkerRateLimitManager.getInstance();

/**
 * Service Worker Script Content
 * This would be in the actual /public/sw.js file
 */
export const ServiceWorkerScript = `
// Rate Limiting Service Worker
const RATE_LIMIT_CACHE = 'wedsync-rate-limits-v1';
const REQUEST_QUEUE_CACHE = 'wedsync-request-queue-v1';

let rateLimitConfig = {
  cacheMaxAge: 5 * 60 * 1000, // 5 minutes
  queueMaxSize: 100,
  retryAttempts: 3,
  retryBackoff: 1.5,
  weddingPriorityBoost: true,
  offlineQueueing: true
};

let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  queuedRequests: 0,
  processedRequests: 0,
  errors: 0,
  totalQueueTime: 0
};

// Handle fetch events with rate limiting
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequestWithRateLimit(event.request));
  }
});

// Handle messages from main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  const port = event.ports[0];

  switch (type) {
    case 'CONFIGURE_RATE_LIMITING':
      handleConfigureRateLimiting(data, port);
      break;
    case 'CACHE_RATE_LIMITS':
      handleCacheRateLimits(data, port);
      break;
    case 'GET_CACHED_RATE_LIMIT':
      handleGetCachedRateLimit(data, port);
      break;
    case 'QUEUE_RATE_LIMITED_REQUEST':
      handleQueueRateLimitedRequest(data, port);
      break;
    case 'PROCESS_QUEUED_REQUESTS':
      handleProcessQueuedRequests(port);
      break;
    case 'GET_QUEUE_STATUS':
      handleGetQueueStatus(port);
      break;
    case 'GET_PERFORMANCE_METRICS':
      handleGetPerformanceMetrics(port);
      break;
    case 'CLEAR_RATE_LIMIT_CACHE':
      handleClearRateLimitCache(port);
      break;
    default:
      port.postMessage({ error: 'Unknown message type' });
  }
});

async function handleApiRequestWithRateLimit(request) {
  try {
    // First try to make the actual request
    const response = await fetch(request);
    
    // If successful, return response
    if (response.ok) {
      return response;
    }
    
    // If rate limited (429), handle appropriately
    if (response.status === 429) {
      const rateLimitData = await response.json();
      
      if (rateLimitConfig.offlineQueueing) {
        // Queue the request for later processing
        await queueRateLimitedRequest({
          id: generateRequestId(),
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: request.method !== 'GET' ? await request.text() : undefined,
          rateLimitInfo: {
            retryAfter: rateLimitData.retryAfter || 60,
            reason: rateLimitData.error || 'Rate limit exceeded',
            tier: rateLimitData.tier || 'unknown'
          },
          queuedAt: Date.now(),
          priority: calculateRequestPriority(request.url, rateLimitData)
        });
        
        // Return queued response
        return new Response(JSON.stringify({
          queued: true,
          message: 'Request queued due to rate limiting. Will process when limits reset.',
          retryAfter: rateLimitData.retryAfter,
          queuePosition: await getQueuePosition(request.url)
        }), {
          status: 202, // Accepted for processing
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return response;
  } catch (error) {
    // Network error - queue for later if offline queueing is enabled
    if (rateLimitConfig.offlineQueueing) {
      return handleNetworkErrorWithQueue(request, error);
    }
    
    throw error;
  }
}

function handleConfigureRateLimiting(data, port) {
  rateLimitConfig = { ...rateLimitConfig, ...data };
  port.postMessage({ success: true });
}

async function handleCacheRateLimits(data, port) {
  try {
    const cache = await caches.open(RATE_LIMIT_CACHE);
    
    for (const rateLimitStatus of data.rateLimits) {
      await cache.put(
        new Request(rateLimitStatus.endpoint),
        new Response(JSON.stringify({
          ...rateLimitStatus,
          cachedAt: Date.now()
        }))
      );
    }
    
    port.postMessage({ success: true });
  } catch (error) {
    port.postMessage({ error: error.message });
  }
}

async function handleGetCachedRateLimit(data, port) {
  try {
    const cache = await caches.open(RATE_LIMIT_CACHE);
    const response = await cache.match(new Request(data.endpoint));
    
    if (response) {
      const rateLimitStatus = await response.json();
      
      // Check if cache is still valid
      if (Date.now() - rateLimitStatus.cachedAt < rateLimitConfig.cacheMaxAge) {
        performanceMetrics.cacheHits++;
        port.postMessage({ rateLimitStatus });
        return;
      }
    }
    
    performanceMetrics.cacheMisses++;
    port.postMessage({ rateLimitStatus: null });
  } catch (error) {
    port.postMessage({ error: error.message });
  }
}

function generateRequestId() {
  return 'sw_req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateRequestPriority(url, rateLimitInfo) {
  let priority = 50;
  
  if (url.includes('/api/wedding') || url.includes('/api/vendor')) {
    priority += 30;
  }
  
  if (url.includes('/emergency') || url.includes('/urgent')) {
    priority += 40;
  }
  
  return Math.min(100, priority);
}

// Additional service worker functions would be implemented here
// This is a simplified version for demonstration
`;

export default ServiceWorkerRateLimitManager;
