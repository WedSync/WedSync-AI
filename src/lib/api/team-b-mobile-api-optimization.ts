/**
 * WS-173 Team D Round 2: Team B Mobile API Optimization
 *
 * Optimizes API interactions between Team D's mobile optimizations and Team B's backend services
 * Focuses on mobile-specific concerns: request batching, compression, retry strategies, and offline handling
 */

import React from 'react';
import {
  mobileNetworkAdapter,
  type NetworkCondition,
  type AdaptationStrategy,
} from '../network/mobile-network-adapter';
import { weddingMobileCacheManager } from '../cache/wedding-mobile-cache-strategies';

export interface APIOptimizationConfig {
  enableRequestBatching: boolean;
  enableCompression: boolean;
  enableRetryStrategies: boolean;
  enableOfflineQueueing: boolean;
  enableResponseCaching: boolean;
  enableRequestDeduplication: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  batchSize: number;
  compressionThreshold: number; // bytes
}

export interface MobileAPIRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: any;
  headers?: Record<string, string>;
  priority: 'critical' | 'high' | 'normal' | 'low';
  retryable: boolean;
  cacheable: boolean;
  weddingContext?: {
    weddingId: string;
    supplierRole: string;
    eventPhase: string;
  };
  timeout?: number;
  requiresAuth: boolean;
  requiresNetwork: boolean;
}

export interface APIResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  fromCache: boolean;
  compressed: boolean;
  retryCount: number;
}

export interface BatchRequest {
  id: string;
  requests: MobileAPIRequest[];
  priority: 'critical' | 'high' | 'normal' | 'low';
  createdAt: number;
  maxWaitTime: number;
}

export interface RequestQueue {
  critical: MobileAPIRequest[];
  high: MobileAPIRequest[];
  normal: MobileAPIRequest[];
  low: MobileAPIRequest[];
}

export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  compressionSavings: number; // bytes
  batchedRequests: number;
  retriedRequests: number;
  offlineQueuedRequests: number;
}

class TeamBMobileAPIOptimizer {
  private config: APIOptimizationConfig;
  private requestQueue: RequestQueue;
  private activeRequests: Map<string, Promise<APIResponse>> = new Map();
  private offlineQueue: MobileAPIRequest[] = [];
  private batchQueue: Map<string, BatchRequest> = new Map();
  private requestCache: Map<
    string,
    { response: APIResponse; timestamp: number }
  > = new Map();
  private metrics: APIMetrics;
  private networkCondition: NetworkCondition | null = null;
  private adaptationStrategy: AdaptationStrategy | null = null;

  // Team B API endpoint configurations with mobile optimizations
  private static TEAM_B_API_ENDPOINTS = {
    // Wedding Management APIs
    'wedding-details': {
      endpoint: '/api/v2/weddings/{id}',
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      compressible: true,
      batchable: false,
      priority: 'high',
      timeout: 5000,
    },
    'wedding-timeline': {
      endpoint: '/api/v2/weddings/{id}/timeline',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      compressible: true,
      batchable: false,
      priority: 'critical',
      timeout: 3000,
    },

    // Supplier Management APIs
    'supplier-tasks': {
      endpoint: '/api/v2/suppliers/{id}/tasks',
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      compressible: true,
      batchable: true,
      priority: 'high',
      timeout: 4000,
    },
    'supplier-status-update': {
      endpoint: '/api/v2/suppliers/{id}/status',
      cacheTTL: 0, // No cache for updates
      compressible: false,
      batchable: true,
      priority: 'critical',
      timeout: 2000,
    },

    // Photo Management APIs
    'photo-groups': {
      endpoint: '/api/v2/photos/groups',
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      compressible: true,
      batchable: true,
      priority: 'high',
      timeout: 6000,
    },
    'photo-upload-metadata': {
      endpoint: '/api/v2/photos/metadata',
      cacheTTL: 0,
      compressible: true,
      batchable: true,
      priority: 'normal',
      timeout: 8000,
    },

    // Guest Management APIs
    'guest-assignments': {
      endpoint: '/api/v2/guests/assignments',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      compressible: true,
      batchable: true,
      priority: 'high',
      timeout: 4000,
    },
    'guest-updates': {
      endpoint: '/api/v2/guests/updates',
      cacheTTL: 0,
      compressible: false,
      batchable: true,
      priority: 'critical',
      timeout: 3000,
    },

    // Communication APIs
    messages: {
      endpoint: '/api/v2/messages',
      cacheTTL: 1 * 60 * 1000, // 1 minute
      compressible: true,
      batchable: true,
      priority: 'normal',
      timeout: 5000,
    },
    notifications: {
      endpoint: '/api/v2/notifications',
      cacheTTL: 30 * 1000, // 30 seconds
      compressible: true,
      batchable: true,
      priority: 'normal',
      timeout: 4000,
    },

    // Analytics APIs (low priority)
    'analytics-events': {
      endpoint: '/api/v2/analytics/events',
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      compressible: true,
      batchable: true,
      priority: 'low',
      timeout: 10000,
    },
  };

  constructor() {
    this.config = {
      enableRequestBatching: true,
      enableCompression: true,
      enableRetryStrategies: true,
      enableOfflineQueueing: true,
      enableResponseCaching: true,
      enableRequestDeduplication: true,
      maxConcurrentRequests: 4,
      requestTimeout: 8000,
      retryAttempts: 3,
      batchSize: 5,
      compressionThreshold: 1024, // 1KB
    };

    this.requestQueue = {
      critical: [],
      high: [],
      normal: [],
      low: [],
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      compressionSavings: 0,
      batchedRequests: 0,
      retriedRequests: 0,
      offlineQueuedRequests: 0,
    };

    this.initializeAPIOptimization();
  }

  /**
   * Initialize API optimization system
   */
  private initializeAPIOptimization(): void {
    // Integrate with network adapter
    this.setupNetworkIntegration();

    // Start request processing loop
    this.startRequestProcessor();

    // Start batch processor
    if (this.config.enableRequestBatching) {
      this.startBatchProcessor();
    }

    // Setup offline queue processor
    if (this.config.enableOfflineQueueing) {
      this.setupOfflineQueueProcessor();
    }

    // Start metrics collection
    this.startMetricsCollection();

    console.log('Team B mobile API optimization initialized');
  }

  /**
   * Setup network integration
   */
  private setupNetworkIntegration(): void {
    mobileNetworkAdapter.onAdaptationChange((strategy) => {
      this.adaptationStrategy = strategy;
      this.adaptConfigurationForStrategy(strategy);
    });

    mobileNetworkAdapter.onQualityChange((quality) => {
      this.adaptConfigurationForQuality(quality);
    });

    // Get current network condition
    this.networkCondition = mobileNetworkAdapter.getCurrentCondition();
    this.adaptationStrategy = mobileNetworkAdapter.getCurrentStrategy();

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('API optimization switched to offline mode');
    });
  }

  /**
   * Adapt configuration for network strategy
   */
  private adaptConfigurationForStrategy(strategy: AdaptationStrategy): void {
    this.config = {
      ...this.config,
      maxConcurrentRequests: strategy.maxConcurrentRequests,
      requestTimeout: strategy.requestTimeout,
      retryAttempts: strategy.retryAttempts,
      enableCompression: strategy.compressionLevel !== 'none',
      compressionThreshold:
        strategy.compressionLevel === 'aggressive' ? 512 : 1024,
    };

    console.log('API configuration adapted for network strategy:', this.config);
  }

  /**
   * Adapt configuration for network quality
   */
  private adaptConfigurationForQuality(quality: string): void {
    const qualityConfigs = {
      excellent: {
        batchSize: 10,
        requestTimeout: 5000,
        retryAttempts: 2,
      },
      good: {
        batchSize: 5,
        requestTimeout: 8000,
        retryAttempts: 3,
      },
      poor: {
        batchSize: 3,
        requestTimeout: 15000,
        retryAttempts: 5,
      },
      offline: {
        batchSize: 1,
        requestTimeout: 30000,
        retryAttempts: 8,
      },
    };

    const qualityConfig =
      qualityConfigs[quality as keyof typeof qualityConfigs] ||
      qualityConfigs.good;

    this.config = {
      ...this.config,
      ...qualityConfig,
    };
  }

  /**
   * Make optimized API request
   */
  async makeRequest<T = any>(
    request: MobileAPIRequest,
  ): Promise<APIResponse<T>> {
    const startTime = performance.now();
    const requestId = request.id || this.generateRequestId();

    this.metrics.totalRequests++;

    try {
      // Check if request is cacheable and cached
      if (request.cacheable && this.config.enableResponseCaching) {
        const cached = this.getCachedResponse(request);
        if (cached) {
          return cached as APIResponse<T>;
        }
      }

      // Check for request deduplication
      if (this.config.enableRequestDeduplication) {
        const activeRequest = this.activeRequests.get(requestId);
        if (activeRequest) {
          return (await activeRequest) as APIResponse<T>;
        }
      }

      // Handle offline requests
      if (!navigator.onLine && request.requiresNetwork) {
        if (this.config.enableOfflineQueueing && request.retryable) {
          this.queueOfflineRequest(request);
          throw new Error('Request queued for offline processing');
        } else {
          throw new Error('Network required but unavailable');
        }
      }

      // Queue request for processing
      const responsePromise = this.processRequest<T>(request);
      this.activeRequests.set(requestId, responsePromise);

      const response = await responsePromise;

      // Cache successful responses
      if (
        response.success &&
        request.cacheable &&
        this.config.enableResponseCaching
      ) {
        this.cacheResponse(request, response);
      }

      // Update metrics
      const responseTime = performance.now() - startTime;
      this.updateMetrics(response, responseTime);

      return response;
    } catch (error) {
      this.metrics.failedRequests++;

      const errorResponse: APIResponse<T> = {
        id: requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
        headers: {},
        responseTime: performance.now() - startTime,
        fromCache: false,
        compressed: false,
        retryCount: 0,
      };

      return errorResponse;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Process individual request
   */
  private async processRequest<T>(
    request: MobileAPIRequest,
  ): Promise<APIResponse<T>> {
    const endpoint = this.buildEndpoint(request);
    const headers = this.buildHeaders(request);
    const payload = await this.preparePayload(request);

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      body: payload,
      signal: this.createAbortSignal(
        request.timeout || this.config.requestTimeout,
      ),
    };

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.config.retryAttempts) {
      try {
        const response = await fetch(endpoint, fetchOptions);

        const apiResponse = await this.processResponse<T>(
          request,
          response,
          retryCount,
        );

        if (apiResponse.success || !request.retryable) {
          return apiResponse;
        }

        // If not successful but retryable, increment retry count
        retryCount++;
        this.metrics.retriedRequests++;

        if (retryCount <= this.config.retryAttempts) {
          await this.waitBeforeRetry(retryCount);
        }
      } catch (error) {
        lastError = error as Error;

        if (!request.retryable || retryCount >= this.config.retryAttempts) {
          break;
        }

        retryCount++;
        this.metrics.retriedRequests++;
        await this.waitBeforeRetry(retryCount);
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Build API endpoint URL
   */
  private buildEndpoint(request: MobileAPIRequest): string {
    let endpoint = request.endpoint;

    // Replace path parameters
    if (request.weddingContext) {
      endpoint = endpoint.replace('{id}', request.weddingContext.weddingId);
      endpoint = endpoint.replace(
        '{supplierId}',
        request.weddingContext.supplierRole,
      );
    }

    // Add query parameters for GET requests
    if (request.method === 'GET' && request.payload) {
      const params = new URLSearchParams(request.payload);
      endpoint += `?${params.toString()}`;
    }

    return endpoint;
  }

  /**
   * Build request headers
   */
  private buildHeaders(request: MobileAPIRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
      'X-Client-Version': '2.0.0',
      ...request.headers,
    };

    // Add compression headers
    if (this.config.enableCompression) {
      headers['Accept-Encoding'] = 'gzip, deflate, br';
    }

    // Add network quality headers
    if (this.networkCondition) {
      headers['X-Network-Quality'] = this.networkCondition.quality;
      headers['X-Connection-Type'] = this.networkCondition.type;
    }

    // Add wedding context headers
    if (request.weddingContext) {
      headers['X-Wedding-ID'] = request.weddingContext.weddingId;
      headers['X-Supplier-Role'] = request.weddingContext.supplierRole;
      headers['X-Event-Phase'] = request.weddingContext.eventPhase;
    }

    return headers;
  }

  /**
   * Prepare request payload
   */
  private async preparePayload(
    request: MobileAPIRequest,
  ): Promise<string | null> {
    if (!request.payload || request.method === 'GET') {
      return null;
    }

    let payload = JSON.stringify(request.payload);
    const payloadSize = new Blob([payload]).size;

    // Apply compression if enabled and payload is large enough
    if (
      this.config.enableCompression &&
      payloadSize > this.config.compressionThreshold
    ) {
      payload = await this.compressPayload(payload);
    }

    return payload;
  }

  /**
   * Compress payload
   */
  private async compressPayload(payload: string): Promise<string> {
    // Simple compression simulation - in production, use actual compression
    // This would integrate with Team B's compression standards
    try {
      const compressed = this.simpleCompress(payload);
      const savings = payload.length - compressed.length;
      this.metrics.compressionSavings += savings;
      return compressed;
    } catch (error) {
      console.warn('Payload compression failed:', error);
      return payload;
    }
  }

  /**
   * Simple compression simulation
   */
  private simpleCompress(data: string): string {
    // Simplified compression - remove extra whitespace and common patterns
    return data
      .replace(/\s+/g, ' ')
      .replace(/{\s+/g, '{')
      .replace(/\s+}/g, '}')
      .replace(/,\s+/g, ',')
      .replace(/:\s+/g, ':')
      .trim();
  }

  /**
   * Process API response
   */
  private async processResponse<T>(
    request: MobileAPIRequest,
    response: Response,
    retryCount: number,
  ): Promise<APIResponse<T>> {
    const responseTime = performance.now();

    // Check for compression
    const isCompressed = response.headers.get('content-encoding') !== null;

    // Parse response data
    let data: T | undefined;
    let error: string | undefined;

    try {
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as any;
        }
      } else {
        error = await response.text();
      }
    } catch (parseError) {
      error = 'Failed to parse response';
    }

    return {
      id: request.id,
      success: response.ok,
      data,
      error,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      responseTime,
      fromCache: false,
      compressed: isCompressed,
      retryCount,
    };
  }

  /**
   * Create abort signal with timeout
   */
  private createAbortSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * Wait before retry with exponential backoff
   */
  private async waitBeforeRetry(retryCount: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Max 10 seconds
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Start request processor
   */
  private startRequestProcessor(): void {
    setInterval(() => {
      this.processRequestQueues();
    }, 100); // Process every 100ms
  }

  /**
   * Process request queues by priority
   */
  private processRequestQueues(): void {
    const priorities: (keyof RequestQueue)[] = [
      'critical',
      'high',
      'normal',
      'low',
    ];

    for (const priority of priorities) {
      const queue = this.requestQueue[priority];

      while (
        queue.length > 0 &&
        this.activeRequests.size < this.config.maxConcurrentRequests
      ) {
        const request = queue.shift()!;
        this.makeRequest(request);
      }
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatchQueue();
    }, 1000); // Process batches every second
  }

  /**
   * Process batch queue
   */
  private processBatchQueue(): void {
    const now = Date.now();

    this.batchQueue.forEach((batch, batchId) => {
      const shouldProcess =
        batch.requests.length >= this.config.batchSize ||
        now - batch.createdAt >= batch.maxWaitTime;

      if (shouldProcess) {
        this.processBatch(batch);
        this.batchQueue.delete(batchId);
      }
    });
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(batch: BatchRequest): Promise<void> {
    console.log(
      `Processing batch ${batch.id} with ${batch.requests.length} requests`,
    );

    // Create batch API request to Team B
    const batchRequest: MobileAPIRequest = {
      id: batch.id,
      endpoint: '/api/v2/batch',
      method: 'POST',
      payload: {
        requests: batch.requests.map((req) => ({
          id: req.id,
          endpoint: req.endpoint,
          method: req.method,
          payload: req.payload,
          headers: req.headers,
        })),
      },
      priority: batch.priority,
      retryable: true,
      cacheable: false,
      requiresAuth: true,
      requiresNetwork: true,
    };

    try {
      const response = await this.processRequest(batchRequest);

      if (response.success && response.data) {
        this.processBatchResponse(batch.requests, response.data);
      }

      this.metrics.batchedRequests += batch.requests.length;
    } catch (error) {
      console.error('Batch processing failed:', error);

      // Process requests individually as fallback
      batch.requests.forEach((req) => {
        this.queueRequest(req);
      });
    }
  }

  /**
   * Process batch response from Team B
   */
  private processBatchResponse(
    requests: MobileAPIRequest[],
    batchResponseData: any,
  ): void {
    const responses = batchResponseData.responses || [];

    responses.forEach((response: any) => {
      const originalRequest = requests.find((req) => req.id === response.id);

      if (originalRequest && originalRequest.cacheable && response.success) {
        this.cacheResponse(originalRequest, response);
      }
    });
  }

  /**
   * Queue request by priority
   */
  queueRequest(request: MobileAPIRequest): void {
    // Check if request should be batched
    if (this.shouldBatchRequest(request)) {
      this.addToBatch(request);
    } else {
      this.requestQueue[request.priority].push(request);
    }
  }

  /**
   * Check if request should be batched
   */
  private shouldBatchRequest(request: MobileAPIRequest): boolean {
    if (!this.config.enableRequestBatching) return false;

    const endpointConfig = this.getEndpointConfig(request.endpoint);
    return endpointConfig?.batchable || false;
  }

  /**
   * Add request to batch
   */
  private addToBatch(request: MobileAPIRequest): void {
    const batchKey = `${request.priority}-${request.weddingContext?.weddingId || 'default'}`;

    let batch = this.batchQueue.get(batchKey);
    if (!batch) {
      batch = {
        id: this.generateBatchId(),
        requests: [],
        priority: request.priority,
        createdAt: Date.now(),
        maxWaitTime: this.getBatchWaitTime(request.priority),
      };
      this.batchQueue.set(batchKey, batch);
    }

    batch.requests.push(request);
  }

  /**
   * Get batch wait time based on priority
   */
  private getBatchWaitTime(priority: MobileAPIRequest['priority']): number {
    const waitTimes = {
      critical: 500, // 0.5 seconds
      high: 1000, // 1 second
      normal: 2000, // 2 seconds
      low: 5000, // 5 seconds
    };

    return waitTimes[priority];
  }

  /**
   * Setup offline queue processor
   */
  private setupOfflineQueueProcessor(): void {
    window.addEventListener('online', () => {
      this.processOfflineQueue();
    });
  }

  /**
   * Queue request for offline processing
   */
  private queueOfflineRequest(request: MobileAPIRequest): void {
    this.offlineQueue.push(request);
    this.metrics.offlineQueuedRequests++;

    console.log(`Request queued for offline processing: ${request.endpoint}`);
  }

  /**
   * Process offline queue when network is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline requests`);

    const offlineRequests = [...this.offlineQueue];
    this.offlineQueue = [];

    // Process offline requests with higher priority
    for (const request of offlineRequests) {
      try {
        await this.makeRequest(request);
      } catch (error) {
        console.warn('Offline request failed:', error);

        // Re-queue if still retryable
        if (request.retryable) {
          this.queueOfflineRequest(request);
        }
      }
    }
  }

  /**
   * Cache management
   */

  getCachedResponse(request: MobileAPIRequest): APIResponse | null {
    const cacheKey = this.getCacheKey(request);
    const cached = this.requestCache.get(cacheKey);

    if (!cached) return null;

    const endpointConfig = this.getEndpointConfig(request.endpoint);
    const ttl = endpointConfig?.cacheTTL || 300000; // 5 minutes default

    if (Date.now() - cached.timestamp > ttl) {
      this.requestCache.delete(cacheKey);
      return null;
    }

    const response = { ...cached.response, fromCache: true };
    this.metrics.cacheHitRate = this.calculateCacheHitRate();

    return response;
  }

  private cacheResponse(
    request: MobileAPIRequest,
    response: APIResponse,
  ): void {
    const cacheKey = this.getCacheKey(request);
    this.requestCache.set(cacheKey, {
      response: { ...response, fromCache: false },
      timestamp: Date.now(),
    });
  }

  private getCacheKey(request: MobileAPIRequest): string {
    const keyParts = [
      request.endpoint,
      request.method,
      request.weddingContext?.weddingId || '',
      JSON.stringify(request.payload || {}),
    ];

    return btoa(keyParts.join('|'));
  }

  /**
   * Metrics and monitoring
   */

  private startMetricsCollection(): void {
    setInterval(() => {
      this.reportMetrics();
    }, 60000); // Report every minute
  }

  private updateMetrics(response: APIResponse, responseTime: number): void {
    if (response.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
        responseTime) /
      this.metrics.totalRequests;
  }

  private calculateCacheHitRate(): number {
    const totalCachedRequests = Array.from(this.requestCache.values()).length;
    if (totalCachedRequests === 0) return 0;

    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  private reportMetrics(): void {
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/analytics/team-b-api-metrics',
        JSON.stringify({
          metrics: this.metrics,
          timestamp: Date.now(),
          networkCondition: this.networkCondition,
          config: this.config,
        }),
      );
    }

    console.log('Team B API Metrics:', this.metrics);
  }

  /**
   * Utility methods
   */

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEndpointConfig(endpoint: string): any {
    return Object.values(TeamBMobileAPIOptimizer.TEAM_B_API_ENDPOINTS).find(
      (config) => endpoint.includes(config.endpoint.split('{')[0]),
    );
  }

  /**
   * Public API methods
   */

  async get<T = any>(
    endpoint: string,
    options: Partial<MobileAPIRequest> = {},
  ): Promise<APIResponse<T>> {
    const request: MobileAPIRequest = {
      id: this.generateRequestId(),
      endpoint,
      method: 'GET',
      priority: 'normal',
      retryable: true,
      cacheable: true,
      requiresAuth: false,
      requiresNetwork: true,
      ...options,
    };

    return this.makeRequest<T>(request);
  }

  async post<T = any>(
    endpoint: string,
    payload: any,
    options: Partial<MobileAPIRequest> = {},
  ): Promise<APIResponse<T>> {
    const request: MobileAPIRequest = {
      id: this.generateRequestId(),
      endpoint,
      method: 'POST',
      payload,
      priority: 'high',
      retryable: true,
      cacheable: false,
      requiresAuth: true,
      requiresNetwork: true,
      ...options,
    };

    return this.makeRequest<T>(request);
  }

  async put<T = any>(
    endpoint: string,
    payload: any,
    options: Partial<MobileAPIRequest> = {},
  ): Promise<APIResponse<T>> {
    const request: MobileAPIRequest = {
      id: this.generateRequestId(),
      endpoint,
      method: 'PUT',
      payload,
      priority: 'high',
      retryable: true,
      cacheable: false,
      requiresAuth: true,
      requiresNetwork: true,
      ...options,
    };

    return this.makeRequest<T>(request);
  }

  async delete<T = any>(
    endpoint: string,
    options: Partial<MobileAPIRequest> = {},
  ): Promise<APIResponse<T>> {
    const request: MobileAPIRequest = {
      id: this.generateRequestId(),
      endpoint,
      method: 'DELETE',
      priority: 'high',
      retryable: false,
      cacheable: false,
      requiresAuth: true,
      requiresNetwork: true,
      ...options,
    };

    return this.makeRequest<T>(request);
  }

  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  getConfiguration(): APIOptimizationConfig {
    return { ...this.config };
  }

  updateConfiguration(config: Partial<APIOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('API configuration updated:', this.config);
  }

  clearCache(): void {
    this.requestCache.clear();
    console.log('API cache cleared');
  }

  getQueueStatus(): {
    active: number;
    queued: { critical: number; high: number; normal: number; low: number };
    offline: number;
  } {
    return {
      active: this.activeRequests.size,
      queued: {
        critical: this.requestQueue.critical.length,
        high: this.requestQueue.high.length,
        normal: this.requestQueue.normal.length,
        low: this.requestQueue.low.length,
      },
      offline: this.offlineQueue.length,
    };
  }
}

// Export singleton instance
export const teamBMobileAPI = new TeamBMobileAPIOptimizer();

// React hook for Team B mobile API integration
export function useTeamBMobileAPI() {
  const [metrics, setMetrics] = React.useState<APIMetrics | null>(null);
  const [queueStatus, setQueueStatus] = React.useState<any>(null);
  const [networkOptimized, setNetworkOptimized] = React.useState(false);

  React.useEffect(() => {
    // Update metrics periodically
    const updateMetrics = () => {
      setMetrics(teamBMobileAPI.getMetrics());
      setQueueStatus(teamBMobileAPI.getQueueStatus());
    };

    const interval = setInterval(updateMetrics, 5000); // Every 5 seconds
    updateMetrics(); // Initial update

    // Check if network optimizations are active
    const networkCondition = mobileNetworkAdapter.getCurrentCondition();
    setNetworkOptimized(networkCondition?.quality !== 'excellent');

    return () => clearInterval(interval);
  }, []);

  const api = React.useMemo(
    () => ({
      get: <T = any>(endpoint: string, options?: Partial<MobileAPIRequest>) =>
        teamBMobileAPI.get<T>(endpoint, options),
      post: <T = any>(
        endpoint: string,
        payload: any,
        options?: Partial<MobileAPIRequest>,
      ) => teamBMobileAPI.post<T>(endpoint, payload, options),
      put: <T = any>(
        endpoint: string,
        payload: any,
        options?: Partial<MobileAPIRequest>,
      ) => teamBMobileAPI.put<T>(endpoint, payload, options),
      delete: <T = any>(
        endpoint: string,
        options?: Partial<MobileAPIRequest>,
      ) => teamBMobileAPI.delete<T>(endpoint, options),
    }),
    [],
  );

  return {
    api,
    metrics,
    queueStatus,
    networkOptimized,
    isOnline: navigator.onLine,
    clearCache: () => teamBMobileAPI.clearCache(),
    updateConfig: (config: Partial<APIOptimizationConfig>) =>
      teamBMobileAPI.updateConfiguration(config),
  };
}
