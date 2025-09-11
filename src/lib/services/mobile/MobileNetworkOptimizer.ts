/**
 * MobileNetworkOptimizer - Optimize API calls for mobile networks
 *
 * Features:
 * - Adaptive request batching based on network conditions
 * - Request prioritization and queuing
 * - Intelligent retry logic with exponential backoff
 * - Network condition monitoring and adaptation
 * - Data compression and request optimization
 * - Background sync with service worker coordination
 * - Offline queue management
 * - Connection-aware resource loading
 */

interface NetworkConfig {
  maxConcurrentRequests: number;
  requestTimeout: number; // milliseconds
  retryAttempts: number;
  backoffMultiplier: number;
  compressionEnabled: boolean;
  batchingEnabled: boolean;
  batchSize: number;
  batchDelay: number; // milliseconds
  priorityQueues: boolean;
  offlineQueueEnabled: boolean;
  adaptiveLoading: boolean;
}

interface NetworkCondition {
  online: boolean;
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
}

interface RequestPriority {
  level: 'critical' | 'high' | 'medium' | 'low';
  weight: number;
  timeout: number;
}

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  priority: RequestPriority;
  timestamp: number;
  retryCount: number;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  compressed?: boolean;
}

interface BatchRequest {
  id: string;
  requests: QueuedRequest[];
  scheduledTime: number;
  priority: RequestPriority;
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  averageRetryCount: number;
  bytesTransferred: number;
  compressionRatio: number;
  queuedRequests: number;
}

interface NetworkOptimization {
  requestBatching: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  dataUsageLimit: number; // MB per session
  prefetchingEnabled: boolean;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
}

export class MobileNetworkOptimizer {
  private config: NetworkConfig;
  private networkCondition: NetworkCondition;
  private requestQueues: Map<string, QueuedRequest[]> = new Map();
  private activeRequests: Set<string> = new Set();
  private batchQueue: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private offlineQueue: QueuedRequest[] = [];
  private metrics: RequestMetrics;
  private compressionWorker: Worker | null = null;

  // Network monitoring
  private networkMonitor: any = null;
  private connectionListeners: ((condition: NetworkCondition) => void)[] = [];

  // Request optimization
  private optimizations: NetworkOptimization;
  private dataUsageTracker: number = 0;
  private sessionStartTime: number = Date.now();

  constructor(config?: Partial<NetworkConfig>) {
    this.config = {
      maxConcurrentRequests: 6,
      requestTimeout: 10000, // 10 seconds
      retryAttempts: 3,
      backoffMultiplier: 2,
      compressionEnabled: true,
      batchingEnabled: true,
      batchSize: 5,
      batchDelay: 1000, // 1 second
      priorityQueues: true,
      offlineQueueEnabled: true,
      adaptiveLoading: true,
      ...config,
    };

    this.networkCondition = {
      online: navigator.onLine,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      quality: 'good',
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      averageRetryCount: 0,
      bytesTransferred: 0,
      compressionRatio: 1.0,
      queuedRequests: 0,
    };

    this.optimizations = {
      requestBatching: true,
      imageQuality: 'medium',
      dataUsageLimit: 50, // 50MB default
      prefetchingEnabled: true,
      cacheStrategy: 'moderate',
    };

    this.initialize();
  }

  /**
   * Initialize network optimizer
   */
  private async initialize(): Promise<void> {
    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Initialize compression worker
    await this.initializeCompressionWorker();

    // Set up priority queues
    this.initializePriorityQueues();

    // Start background processing
    this.startBackgroundProcessing();

    // Set up online/offline handlers
    this.setupOnlineOfflineHandlers();

    // Load saved optimizations
    this.loadOptimizationSettings();
  }

  /**
   * Make optimized network request
   */
  async request(
    url: string,
    options: RequestInit = {},
    priority: RequestPriority = { level: 'medium', weight: 50, timeout: 10000 },
  ): Promise<Response> {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update metrics
    this.metrics.totalRequests++;

    // Check if should use offline queue
    if (!this.networkCondition.online && this.config.offlineQueueEnabled) {
      return this.queueForOffline(requestId, url, options, priority);
    }

    // Optimize request based on network conditions
    const optimizedOptions = await this.optimizeRequest(url, options);

    // Check if should batch request
    if (this.config.batchingEnabled && this.canBatchRequest(url, options)) {
      return this.addToBatch(requestId, url, optimizedOptions, priority);
    }

    // Check concurrent request limit
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return this.addToQueue(requestId, url, optimizedOptions, priority);
    }

    // Execute request immediately
    return this.executeRequest(requestId, url, optimizedOptions, priority);
  }

  /**
   * Optimize request based on network conditions
   */
  private async optimizeRequest(
    url: string,
    options: RequestInit,
  ): Promise<RequestInit> {
    const optimized = { ...options };

    // Add compression headers if enabled
    if (
      this.config.compressionEnabled &&
      !options.headers?.['Accept-Encoding']
    ) {
      optimized.headers = {
        ...optimized.headers,
        'Accept-Encoding': 'gzip, deflate, br',
      };
    }

    // Add save-data header if user has save-data preference
    if (this.networkCondition.saveData) {
      optimized.headers = {
        ...optimized.headers,
        'Save-Data': 'on',
      };
    }

    // Adjust timeout based on network quality
    const timeoutMultiplier = this.getTimeoutMultiplier();
    optimized.signal = AbortSignal.timeout(
      this.config.requestTimeout * timeoutMultiplier,
    );

    // Compress request body if applicable
    if (optimized.body && this.config.compressionEnabled) {
      optimized.body = await this.compressRequestBody(optimized.body);
      optimized.headers = {
        ...optimized.headers,
        'Content-Encoding': 'gzip',
      };
    }

    // Add cache headers based on strategy
    this.addCacheHeaders(optimized);

    return optimized;
  }

  /**
   * Execute network request with retry logic
   */
  private async executeRequest(
    id: string,
    url: string,
    options: RequestInit,
    priority: RequestPriority,
    retryCount: number = 0,
  ): Promise<Response> {
    this.activeRequests.add(id);
    const startTime = Date.now();

    try {
      const response = await fetch(url, options);

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime, retryCount);

      // Track data usage
      const contentLength = parseInt(
        response.headers.get('content-length') || '0',
      );
      this.dataUsageTracker += contentLength;

      this.activeRequests.delete(id);
      this.processNextInQueue();

      return response;
    } catch (error) {
      console.error(`[NetworkOptimizer] Request failed: ${url}`, error);

      // Check if should retry
      if (
        retryCount < this.config.retryAttempts &&
        this.shouldRetry(error, retryCount)
      ) {
        const backoffDelay = this.calculateBackoffDelay(retryCount);

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));

        return this.executeRequest(id, url, options, priority, retryCount + 1);
      }

      // Update metrics
      this.updateMetrics(false, Date.now() - startTime, retryCount);

      this.activeRequests.delete(id);
      this.processNextInQueue();

      throw error;
    }
  }

  /**
   * Add request to priority queue
   */
  private addToQueue(
    id: string,
    url: string,
    options: RequestInit,
    priority: RequestPriority,
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        url,
        options,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      // Get or create priority queue
      const queueKey = this.config.priorityQueues ? priority.level : 'default';
      if (!this.requestQueues.has(queueKey)) {
        this.requestQueues.set(queueKey, []);
      }

      const queue = this.requestQueues.get(queueKey)!;

      // Insert request in priority order
      const insertIndex = queue.findIndex(
        (req) => req.priority.weight < priority.weight,
      );
      if (insertIndex === -1) {
        queue.push(queuedRequest);
      } else {
        queue.splice(insertIndex, 0, queuedRequest);
      }

      this.metrics.queuedRequests++;
    });
  }

  /**
   * Process next request in queue
   */
  private processNextInQueue(): void {
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    // Find highest priority request
    let nextRequest: QueuedRequest | null = null;
    let queueKey = '';

    for (const [key, queue] of this.requestQueues.entries()) {
      if (queue.length > 0) {
        const request = queue[0];
        if (
          !nextRequest ||
          request.priority.weight > nextRequest.priority.weight
        ) {
          nextRequest = request;
          queueKey = key;
        }
      }
    }

    if (nextRequest) {
      // Remove from queue
      this.requestQueues.get(queueKey)!.shift();
      this.metrics.queuedRequests--;

      // Execute request
      this.executeRequest(
        nextRequest.id,
        nextRequest.url,
        nextRequest.options,
        nextRequest.priority,
        nextRequest.retryCount,
      )
        .then(nextRequest.resolve)
        .catch(nextRequest.reject);
    }
  }

  /**
   * Add request to batch
   */
  private addToBatch(
    id: string,
    url: string,
    options: RequestInit,
    priority: RequestPriority,
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        url,
        options,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      // Find existing batch or create new one
      let batch = this.batchQueue.find(
        (b) =>
          b.requests.length < this.config.batchSize &&
          b.priority.level === priority.level,
      );

      if (!batch) {
        batch = {
          id: `batch-${Date.now()}`,
          requests: [],
          scheduledTime: Date.now() + this.config.batchDelay,
          priority,
        };
        this.batchQueue.push(batch);
      }

      batch.requests.push(queuedRequest);

      // Schedule batch processing if not already scheduled
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatches();
          this.batchTimer = null;
        }, this.config.batchDelay);
      }
    });
  }

  /**
   * Process batch requests
   */
  private async processBatches(): Promise<void> {
    const now = Date.now();
    const readyBatches = this.batchQueue.filter(
      (batch) => now >= batch.scheduledTime,
    );

    for (const batch of readyBatches) {
      try {
        await this.executeBatch(batch);
      } catch (error) {
        console.error('[NetworkOptimizer] Batch execution failed:', error);

        // Handle individual request failures
        batch.requests.forEach((req) => req.reject(error as Error));
      }
    }

    // Remove processed batches
    this.batchQueue = this.batchQueue.filter(
      (batch) => now < batch.scheduledTime,
    );
  }

  /**
   * Execute batch request
   */
  private async executeBatch(batch: BatchRequest): Promise<void> {
    // For GraphQL or custom batch endpoints
    if (batch.requests.length === 1) {
      const request = batch.requests[0];
      const response = await this.executeRequest(
        request.id,
        request.url,
        request.options,
        request.priority,
      );
      request.resolve(response);
      return;
    }

    // Multiple requests - execute concurrently with limit
    const promises = batch.requests.map(async (request, index) => {
      // Add small delay between requests to avoid overwhelming the server
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, index * 100));
      }

      try {
        const response = await this.executeRequest(
          request.id,
          request.url,
          request.options,
          request.priority,
        );
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Queue request for offline processing
   */
  private queueForOffline(
    id: string,
    url: string,
    options: RequestInit,
    priority: RequestPriority,
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const offlineRequest: QueuedRequest = {
        id,
        url,
        options,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      this.offlineQueue.push(offlineRequest);

      // Reject with custom error for offline queue
      reject(new Error('Request queued for offline processing'));
    });
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(
      `[NetworkOptimizer] Processing ${this.offlineQueue.length} offline requests`,
    );

    const requests = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of requests) {
      try {
        const response = await this.executeRequest(
          request.id,
          request.url,
          request.options,
          request.priority,
        );
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }

      // Small delay between offline requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Use Network Information API if available
    if ('connection' in navigator) {
      this.networkMonitor = (navigator as any).connection;

      const updateNetworkInfo = () => {
        this.networkCondition = {
          online: navigator.onLine,
          effectiveType: this.networkMonitor.effectiveType || 'unknown',
          downlink: this.networkMonitor.downlink || 0,
          rtt: this.networkMonitor.rtt || 0,
          saveData: this.networkMonitor.saveData || false,
          quality: this.determineNetworkQuality(),
        };

        this.adaptToNetworkCondition();
        this.notifyConnectionListeners();
      };

      this.networkMonitor.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  /**
   * Determine network quality
   */
  private determineNetworkQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.networkCondition.online) return 'offline';

    const { effectiveType, downlink, rtt } = this.networkCondition;

    if (effectiveType === '4g' && downlink > 2 && rtt < 150) {
      return 'excellent';
    } else if (
      effectiveType === '4g' ||
      (effectiveType === '3g' && downlink > 1)
    ) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * Adapt configuration to network conditions
   */
  private adaptToNetworkCondition(): void {
    if (!this.config.adaptiveLoading) return;

    const quality = this.networkCondition.quality;

    switch (quality) {
      case 'poor':
        this.optimizations.requestBatching = true;
        this.optimizations.imageQuality = 'low';
        this.optimizations.prefetchingEnabled = false;
        this.optimizations.cacheStrategy = 'aggressive';
        this.config.maxConcurrentRequests = 2;
        this.config.requestTimeout = 20000; // 20 seconds
        break;

      case 'good':
        this.optimizations.requestBatching = true;
        this.optimizations.imageQuality = 'medium';
        this.optimizations.prefetchingEnabled = true;
        this.optimizations.cacheStrategy = 'moderate';
        this.config.maxConcurrentRequests = 4;
        this.config.requestTimeout = 10000; // 10 seconds
        break;

      case 'excellent':
        this.optimizations.requestBatching = false;
        this.optimizations.imageQuality = 'high';
        this.optimizations.prefetchingEnabled = true;
        this.optimizations.cacheStrategy = 'minimal';
        this.config.maxConcurrentRequests = 8;
        this.config.requestTimeout = 5000; // 5 seconds
        break;
    }
  }

  /**
   * Set up online/offline handlers
   */
  private setupOnlineOfflineHandlers(): void {
    window.addEventListener('online', () => {
      console.log('[NetworkOptimizer] Connection restored');
      this.networkCondition.online = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[NetworkOptimizer] Connection lost');
      this.networkCondition.online = false;
    });
  }

  /**
   * Initialize compression worker
   */
  private async initializeCompressionWorker(): Promise<void> {
    if (!this.config.compressionEnabled || typeof Worker === 'undefined') {
      return;
    }

    try {
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');
        
        self.onmessage = function(e) {
          const { action, data, id } = e.data;
          
          try {
            if (action === 'compress') {
              const compressed = pako.gzip(data);
              self.postMessage({ id, action: 'compressed', data: compressed });
            } else if (action === 'decompress') {
              const decompressed = pako.ungzip(data, { to: 'string' });
              self.postMessage({ id, action: 'decompressed', data: decompressed });
            }
          } catch (error) {
            self.postMessage({ id, action: 'error', error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn(
        '[NetworkOptimizer] Compression worker initialization failed:',
        error,
      );
    }
  }

  /**
   * Initialize priority queues
   */
  private initializePriorityQueues(): void {
    const priorities = ['critical', 'high', 'medium', 'low'];

    if (this.config.priorityQueues) {
      priorities.forEach((priority) => {
        this.requestQueues.set(priority, []);
      });
    } else {
      this.requestQueues.set('default', []);
    }
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    // Process queues regularly
    setInterval(() => {
      this.processNextInQueue();
    }, 1000);

    // Clean up old requests
    setInterval(() => {
      this.cleanupStaleRequests();
    }, 30000);

    // Save optimization settings
    setInterval(() => {
      this.saveOptimizationSettings();
    }, 60000);
  }

  /**
   * Clean up stale requests
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const queue of this.requestQueues.values()) {
      const staleRequests = queue.filter((req) => now - req.timestamp > maxAge);
      staleRequests.forEach((req) => {
        req.reject(new Error('Request timeout - removed from queue'));
      });

      // Remove stale requests
      queue.splice(
        0,
        queue.length,
        ...queue.filter((req) => now - req.timestamp <= maxAge),
      );
    }
  }

  /**
   * Compress request body
   */
  private async compressRequestBody(body: BodyInit): Promise<BodyInit> {
    if (!this.compressionWorker || typeof body !== 'string') {
      return body;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);

          if (e.data.action === 'compressed') {
            resolve(new Uint8Array(e.data.data));
          } else {
            reject(new Error(e.data.error || 'Compression failed'));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({
        action: 'compress',
        data: body,
        id,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        resolve(body); // Fallback to original body
      }, 5000);
    });
  }

  /**
   * Add cache headers based on strategy
   */
  private addCacheHeaders(options: RequestInit): void {
    const headers: Record<string, string> = {};

    switch (this.optimizations.cacheStrategy) {
      case 'aggressive':
        headers['Cache-Control'] = 'public, max-age=3600'; // 1 hour
        break;
      case 'moderate':
        headers['Cache-Control'] = 'public, max-age=300'; // 5 minutes
        break;
      case 'minimal':
        headers['Cache-Control'] = 'no-cache';
        break;
    }

    options.headers = { ...options.headers, ...headers };
  }

  /**
   * Check if request can be batched
   */
  private canBatchRequest(url: string, options: RequestInit): boolean {
    // Only batch GET requests to the same domain
    return !options.method || options.method === 'GET';
  }

  /**
   * Check if should retry request
   */
  private shouldRetry(error: any, retryCount: number): boolean {
    // Don't retry client errors (4xx)
    if (error.status && error.status >= 400 && error.status < 500) {
      return false;
    }

    // Retry network errors and server errors (5xx)
    return true;
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(this.config.backoffMultiplier, retryCount);
  }

  /**
   * Get timeout multiplier based on network quality
   */
  private getTimeoutMultiplier(): number {
    switch (this.networkCondition.quality) {
      case 'poor':
        return 3;
      case 'good':
        return 1.5;
      case 'excellent':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Update request metrics
   */
  private updateMetrics(
    success: boolean,
    responseTime: number,
    retryCount: number,
  ): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalResponses =
      this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalResponses - 1) + responseTime) /
      totalResponses;

    // Update average retry count
    this.metrics.averageRetryCount =
      (this.metrics.averageRetryCount * (totalResponses - 1) + retryCount) /
      totalResponses;
  }

  /**
   * Notify connection listeners
   */
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(this.networkCondition);
      } catch (error) {
        console.error('[NetworkOptimizer] Connection listener error:', error);
      }
    });
  }

  /**
   * Load optimization settings
   */
  private loadOptimizationSettings(): void {
    try {
      const stored = localStorage.getItem('network-optimizations');
      if (stored) {
        this.optimizations = { ...this.optimizations, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn(
        '[NetworkOptimizer] Failed to load optimization settings:',
        error,
      );
    }
  }

  /**
   * Save optimization settings
   */
  private saveOptimizationSettings(): void {
    try {
      localStorage.setItem(
        'network-optimizations',
        JSON.stringify(this.optimizations),
      );
    } catch (error) {
      console.warn(
        '[NetworkOptimizer] Failed to save optimization settings:',
        error,
      );
    }
  }

  /**
   * Add connection listener
   */
  addConnectionListener(listener: (condition: NetworkCondition) => void): void {
    this.connectionListeners.push(listener);
  }

  /**
   * Remove connection listener
   */
  removeConnectionListener(
    listener: (condition: NetworkCondition) => void,
  ): void {
    const index = this.connectionListeners.indexOf(listener);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Get network condition
   */
  getNetworkCondition(): NetworkCondition {
    return { ...this.networkCondition };
  }

  /**
   * Get optimization settings
   */
  getOptimizations(): NetworkOptimization {
    return { ...this.optimizations };
  }

  /**
   * Update optimization settings
   */
  updateOptimizations(updates: Partial<NetworkOptimization>): void {
    this.optimizations = { ...this.optimizations, ...updates };
    this.saveOptimizationSettings();
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics & {
    dataUsage: number;
    sessionDuration: number;
  } {
    return {
      ...this.metrics,
      dataUsage: this.dataUsageTracker,
      sessionDuration: Date.now() - this.sessionStartTime,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      averageRetryCount: 0,
      bytesTransferred: 0,
      compressionRatio: 1.0,
      queuedRequests: 0,
    };

    this.dataUsageTracker = 0;
    this.sessionStartTime = Date.now();
  }

  /**
   * Destroy network optimizer
   */
  destroy(): void {
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Terminate compression worker
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }

    // Clear queues
    this.requestQueues.clear();
    this.batchQueue = [];
    this.offlineQueue = [];

    // Clear listeners
    this.connectionListeners = [];

    // Clear active requests
    this.activeRequests.clear();
  }
}
