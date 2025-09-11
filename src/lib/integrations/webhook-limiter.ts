/**
 * Webhook Protection Integration
 * Protects incoming webhook endpoints from being overwhelmed
 * Team C - WS-199 Implementation
 */

import { RedisClusterManager, redisClusterManager } from './redis-cluster';
import { logger } from '@/lib/monitoring/structured-logger';
import crypto from 'crypto';

export interface WebhookProtectionResult {
  action: 'process_immediately' | 'queued' | 'rate_limited' | 'blocked';
  retryAfter?: number;
  queuePosition?: number;
  reason?: string;
  webhookId?: string;
}

export interface WebhookRateConfig {
  minute: number;
  hour: number;
  day?: number;
  burst?: number;
  priority: 'high' | 'medium' | 'low';
  retryAfter: number;
  maxQueueSize: number;
  signatureRequired: boolean;
}

export interface RetryResult {
  shouldRetry: boolean;
  retryAfter: number;
  backoffMs: number;
  attempt: number;
  maxAttempts: number;
}

export interface WebhookMetrics {
  source: string;
  endpoint: string;
  requestsLastMinute: number;
  requestsLastHour: number;
  queuedRequests: number;
  averageProcessingTime: number;
  successRate: number;
  lastProcessed: number;
}

interface QueuedWebhook {
  id: string;
  source: string;
  endpoint: string;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
  receivedAt: number;
  priority: 'high' | 'medium' | 'low';
  retryAttempts: number;
  maxRetryAttempts: number;
}

/**
 * Webhook Protection Integration for Wedding Platform
 * Protects against webhook flooding and ensures reliable processing
 */
export class WebhookProtectionIntegration extends RedisClusterManager {
  private webhookQueues: Map<string, QueuedWebhook[]> = new Map();
  private processingMetrics: Map<string, WebhookMetrics> = new Map();
  private readonly QUEUE_PROCESS_INTERVAL = 2000; // 2 seconds
  private readonly METRICS_UPDATE_INTERVAL = 30000; // 30 seconds

  // Wedding industry webhook configurations
  private readonly WEBHOOK_RATE_CONFIGS: Record<string, WebhookRateConfig> = {
    'stripe-billing': {
      minute: 50,
      hour: 1000,
      day: 5000,
      burst: 20,
      priority: 'high', // Billing events are critical
      retryAfter: 60,
      maxQueueSize: 100,
      signatureRequired: true,
    },
    'stripe-connect': {
      minute: 30,
      hour: 800,
      day: 3000,
      burst: 15,
      priority: 'high', // Connected account events
      retryAfter: 90,
      maxQueueSize: 80,
      signatureRequired: true,
    },
    'calendar-sync': {
      minute: 30,
      hour: 500,
      day: 2000,
      burst: 10,
      priority: 'high', // Wedding scheduling is time-sensitive
      retryAfter: 30,
      maxQueueSize: 50,
      signatureRequired: false,
    },
    'google-calendar': {
      minute: 25,
      hour: 600,
      day: 2500,
      burst: 8,
      priority: 'high', // Google Calendar webhooks for venue availability
      retryAfter: 45,
      maxQueueSize: 60,
      signatureRequired: true,
    },
    'tave-webhooks': {
      minute: 20,
      hour: 400,
      day: 1500,
      burst: 8,
      priority: 'medium', // Tave booking updates
      retryAfter: 120,
      maxQueueSize: 40,
      signatureRequired: true,
    },
    'honeybook-webhooks': {
      minute: 25,
      hour: 500,
      day: 2000,
      burst: 10,
      priority: 'medium', // HoneyBook client updates
      retryAfter: 90,
      maxQueueSize: 50,
      signatureRequired: true,
    },
    'photo-service': {
      minute: 20,
      hour: 400,
      day: 1600,
      burst: 8,
      priority: 'medium', // Portfolio updates can wait slightly
      retryAfter: 120,
      maxQueueSize: 30,
      signatureRequired: false,
    },
    'email-service': {
      minute: 40,
      hour: 1000,
      day: 5000,
      burst: 15,
      priority: 'medium', // Email delivery notifications
      retryAfter: 60,
      maxQueueSize: 80,
      signatureRequired: true,
    },
    'sms-service': {
      minute: 15,
      hour: 300,
      day: 1200,
      burst: 5,
      priority: 'high', // SMS is often urgent wedding communication
      retryAfter: 120,
      maxQueueSize: 25,
      signatureRequired: true,
    },
    'social-media': {
      minute: 10,
      hour: 200,
      day: 1000,
      burst: 5,
      priority: 'low', // Social media updates can wait
      retryAfter: 300,
      maxQueueSize: 20,
      signatureRequired: false,
    },
    'analytics-tracking': {
      minute: 30,
      hour: 800,
      day: 4000,
      burst: 12,
      priority: 'low', // Analytics can tolerate delays
      retryAfter: 180,
      maxQueueSize: 40,
      signatureRequired: false,
    },
    'backup-service': {
      minute: 5,
      hour: 100,
      day: 500,
      burst: 2,
      priority: 'low', // Backup notifications
      retryAfter: 600,
      maxQueueSize: 10,
      signatureRequired: false,
    },
    generic: {
      minute: 10,
      hour: 100,
      day: 500,
      burst: 3,
      priority: 'low',
      retryAfter: 300,
      maxQueueSize: 15,
      signatureRequired: false,
    },
  };

  constructor() {
    super();
    this.startQueueProcessor();
    this.startMetricsUpdater();
  }

  /**
   * Protect webhook endpoint from rate limiting and flooding
   */
  async protectWebhookEndpoint(
    source: string,
    endpoint: string,
    request: Request,
  ): Promise<WebhookProtectionResult> {
    const startTime = Date.now();

    try {
      // Get webhook configuration
      const config = this.getWebhookRateConfig(source);
      const identifier = this.extractWebhookIdentifier(source, request);

      // Validate webhook signature if required
      if (config.signatureRequired) {
        const signatureValid = await this.validateWebhookSignature(
          source,
          request,
        );
        if (!signatureValid) {
          await this.logWebhookViolation(
            source,
            endpoint,
            'invalid_signature',
            request,
          );
          return {
            action: 'blocked',
            reason: 'Invalid webhook signature',
          };
        }
      }

      // Check rate limits across multiple time windows
      const rateLimitResult = await this.checkWebhookRateLimits(
        identifier,
        config,
        endpoint,
      );

      if (!rateLimitResult.allowed) {
        // Queue webhook if source allows queueing and queue not full
        if (this.canQueueWebhook(source, config)) {
          const webhookId = await this.queueWebhook(
            source,
            endpoint,
            request,
            config,
          );

          return {
            action: 'queued',
            retryAfter: config.retryAfter,
            queuePosition: await this.getWebhookQueuePosition(source),
            webhookId,
            reason: `Rate limited - queued for processing`,
          };
        }

        // Rate limited and cannot queue
        await this.logWebhookViolation(
          source,
          endpoint,
          'rate_limit_exceeded',
          request,
        );
        return {
          action: 'rate_limited',
          retryAfter: config.retryAfter,
          reason: `Rate limit exceeded: ${rateLimitResult.reason}`,
        };
      }

      // Check for suspicious patterns (potential abuse)
      const suspiciousActivity = await this.detectSuspiciousWebhookActivity(
        source,
        identifier,
      );
      if (suspiciousActivity.isSuspicious) {
        await this.logWebhookViolation(
          source,
          endpoint,
          'suspicious_activity',
          request,
        );
        return {
          action: 'blocked',
          reason: `Suspicious activity detected: ${suspiciousActivity.reason}`,
        };
      }

      // Apply wedding season traffic adjustments
      const seasonAdjustment = await this.applyWeddingSeasonWebhookAdjustment(
        source,
        config,
      );
      if (!seasonAdjustment.allowed) {
        const webhookId = await this.queueWebhook(
          source,
          endpoint,
          request,
          config,
        );
        return {
          action: 'queued',
          retryAfter: seasonAdjustment.retryAfter,
          queuePosition: await this.getWebhookQueuePosition(source),
          webhookId,
          reason: 'Peak wedding season - queued for processing',
        };
      }

      // Webhook is allowed for immediate processing
      await this.incrementWebhookCounters(identifier, config);
      await this.updateWebhookMetrics(source, endpoint, Date.now() - startTime);

      logger.info(`Webhook allowed for immediate processing: ${source}`, {
        source,
        endpoint,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        action: 'process_immediately',
      };
    } catch (error) {
      logger.error(`Webhook protection failed for ${source}`, error);

      // Fail safe based on webhook priority
      const config = this.getWebhookRateConfig(source);
      const shouldFailOpen = config.priority === 'high';

      return {
        action: shouldFailOpen ? 'process_immediately' : 'rate_limited',
        retryAfter: shouldFailOpen ? undefined : 300,
        reason: shouldFailOpen
          ? 'Protection service unavailable - allowing'
          : 'Protection service unavailable - blocking',
      };
    }
  }

  /**
   * Handle webhook retry logic with exponential backoff
   */
  async handleWebhookRetry(
    source: string,
    webhookId: string,
    retryCount: number,
    lastError?: Error,
  ): Promise<RetryResult> {
    const config = this.getWebhookRateConfig(source);
    const maxAttempts = this.getMaxRetryAttempts(source, config);

    if (retryCount >= maxAttempts) {
      logger.error(`Webhook retry limit exceeded: ${source}`, {
        webhookId,
        retryCount,
        maxAttempts,
      });

      return {
        shouldRetry: false,
        retryAfter: 0,
        backoffMs: 0,
        attempt: retryCount,
        maxAttempts,
      };
    }

    // Calculate exponential backoff with jitter
    const baseBackoff = config.retryAfter * 1000; // Convert to ms
    const exponentialBackoff = Math.min(
      baseBackoff * Math.pow(2, retryCount),
      300000, // Max 5 minutes
    );
    const jitter = Math.random() * 0.2 * exponentialBackoff;
    const backoffMs = Math.floor(exponentialBackoff + jitter);

    // Wedding-specific retry logic
    const isWeddingCritical = this.isWeddingCriticalWebhook(source);
    const adjustedBackoff = isWeddingCritical
      ? Math.floor(backoffMs * 0.7) // Faster retry for wedding-critical webhooks
      : backoffMs;

    logger.info(`Webhook retry scheduled: ${source}`, {
      webhookId,
      attempt: retryCount + 1,
      maxAttempts,
      backoffMs: adjustedBackoff,
      isWeddingCritical,
    });

    return {
      shouldRetry: true,
      retryAfter: Math.floor(adjustedBackoff / 1000),
      backoffMs: adjustedBackoff,
      attempt: retryCount + 1,
      maxAttempts,
    };
  }

  /**
   * Queue webhook for later processing
   */
  private async queueWebhook(
    source: string,
    endpoint: string,
    request: Request,
    config: WebhookRateConfig,
  ): Promise<string> {
    const webhookId = this.generateWebhookId(source, endpoint);
    const payload = await this.extractWebhookPayload(request);
    const headers = this.extractWebhookHeaders(request);

    const queuedWebhook: QueuedWebhook = {
      id: webhookId,
      source,
      endpoint,
      payload,
      headers,
      signature: headers['x-signature'] || headers['stripe-signature'],
      receivedAt: Date.now(),
      priority: config.priority,
      retryAttempts: 0,
      maxRetryAttempts: this.getMaxRetryAttempts(source, config),
    };

    // Add to priority queue
    const sourceQueue = this.webhookQueues.get(source) || [];
    sourceQueue.push(queuedWebhook);

    // Sort by priority and received time
    sourceQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.receivedAt - b.receivedAt;
    });

    // Trim queue if it exceeds max size
    if (sourceQueue.length > config.maxQueueSize) {
      const removed = sourceQueue.splice(config.maxQueueSize);
      logger.warn(`Webhook queue overflow for ${source}`, {
        removedWebhooks: removed.length,
        queueSize: sourceQueue.length,
      });
    }

    this.webhookQueues.set(source, sourceQueue);

    logger.info(`Webhook queued: ${source}`, {
      webhookId,
      endpoint,
      priority: config.priority,
      queuePosition: sourceQueue.findIndex((w) => w.id === webhookId) + 1,
    });

    return webhookId;
  }

  /**
   * Check webhook rate limits across multiple time windows
   */
  private async checkWebhookRateLimits(
    identifier: string,
    config: WebhookRateConfig,
    endpoint: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check multiple time windows
      const [minuteCheck, hourCheck, dayCheck, burstCheck] = await Promise.all([
        this.checkWebhookWindow(identifier, 'minute', config.minute),
        this.checkWebhookWindow(identifier, 'hour', config.hour),
        config.day
          ? this.checkWebhookWindow(identifier, 'day', config.day)
          : Promise.resolve({ allowed: true }),
        config.burst
          ? this.checkWebhookWindow(identifier, 'burst', config.burst, 15000)
          : Promise.resolve({ allowed: true }),
      ]);

      if (!burstCheck.allowed) {
        return { allowed: false, reason: 'Burst limit exceeded' };
      }

      if (!minuteCheck.allowed) {
        return { allowed: false, reason: 'Minute limit exceeded' };
      }

      if (!hourCheck.allowed) {
        return { allowed: false, reason: 'Hourly limit exceeded' };
      }

      if (!dayCheck.allowed) {
        return { allowed: false, reason: 'Daily limit exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`Webhook rate limit check failed: ${identifier}`, error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check webhook rate limit for specific time window
   */
  private async checkWebhookWindow(
    identifier: string,
    window: string,
    limit: number,
    windowMs?: number,
  ): Promise<{ allowed: boolean; current: number; remaining: number }> {
    const windowDuration = windowMs || this.getWebhookWindowDuration(window);
    const key = `webhook:${window}:${identifier}`;

    const result = await this.checkSlidingWindow(key, windowDuration, limit);
    return {
      allowed: result.allowed,
      current: result.current,
      remaining: result.remaining,
    };
  }

  /**
   * Get webhook window duration in milliseconds
   */
  private getWebhookWindowDuration(window: string): number {
    const durations: Record<string, number> = {
      burst: 15000, // 15 seconds
      minute: 60000, // 1 minute
      hour: 3600000, // 1 hour
      day: 86400000, // 24 hours
    };
    return durations[window] || 60000;
  }

  /**
   * Increment webhook counters for successful processing
   */
  private async incrementWebhookCounters(
    identifier: string,
    config: WebhookRateConfig,
  ): Promise<void> {
    const incrementPromises = [
      this.distributedIncrement(
        `webhook:minute:${identifier}`,
        60000,
        config.minute,
      ),
      this.distributedIncrement(
        `webhook:hour:${identifier}`,
        3600000,
        config.hour,
      ),
    ];

    if (config.day) {
      incrementPromises.push(
        this.distributedIncrement(
          `webhook:day:${identifier}`,
          86400000,
          config.day,
        ),
      );
    }

    if (config.burst) {
      incrementPromises.push(
        this.distributedIncrement(
          `webhook:burst:${identifier}`,
          15000,
          config.burst,
        ),
      );
    }

    await Promise.all(incrementPromises);
  }

  /**
   * Extract webhook identifier from request
   */
  private extractWebhookIdentifier(source: string, request: Request): string {
    const url = new URL(request.url);
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Use combination of source, IP, and user agent for identification
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const identifier = `${source}:${ip}:${this.hashString(userAgent)}`;

    return identifier;
  }

  /**
   * Validate webhook signature for secure sources
   */
  private async validateWebhookSignature(
    source: string,
    request: Request,
  ): Promise<boolean> {
    try {
      const signature =
        request.headers.get('x-signature') ||
        request.headers.get('stripe-signature') ||
        request.headers.get('x-hub-signature-256');

      if (!signature) {
        return false;
      }

      // Get webhook secret from environment
      const secretKey =
        process.env[`WEBHOOK_SECRET_${source.toUpperCase().replace('-', '_')}`];
      if (!secretKey) {
        logger.warn(`No webhook secret configured for source: ${source}`);
        return false;
      }

      // Verify signature (implementation depends on webhook source)
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(body)
        .digest('hex');

      return (
        signature === expectedSignature ||
        signature === `sha256=${expectedSignature}`
      );
    } catch (error) {
      logger.error(`Webhook signature validation failed: ${source}`, error);
      return false;
    }
  }

  /**
   * Detect suspicious webhook activity patterns
   */
  private async detectSuspiciousWebhookActivity(
    source: string,
    identifier: string,
  ): Promise<{ isSuspicious: boolean; reason?: string }> {
    try {
      // Check for rapid fire requests (potential DDoS)
      const rapidFireKey = `suspicious:rapidfire:${identifier}`;
      const rapidFireCount = await this.getCurrentCount(rapidFireKey, 5000); // 5 second window

      if (rapidFireCount > 20) {
        return { isSuspicious: true, reason: 'Rapid fire requests detected' };
      }

      // Check for unusual payload patterns
      const suspiciousPatternKey = `suspicious:patterns:${identifier}`;
      const patternCount = await this.getCurrentCount(
        suspiciousPatternKey,
        300000,
      ); // 5 minute window

      if (patternCount > 100) {
        return {
          isSuspicious: true,
          reason: 'Unusual request patterns detected',
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      logger.error(`Suspicious activity detection failed: ${source}`, error);
      return { isSuspicious: false };
    }
  }

  /**
   * Apply wedding season webhook adjustments
   */
  private async applyWeddingSeasonWebhookAdjustment(
    source: string,
    config: WebhookRateConfig,
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = currentMonth >= 5 && currentMonth <= 9;

    // During peak season, apply stricter limits to low-priority webhooks
    if (isPeakSeason && config.priority === 'low') {
      // 30% chance of queuing low priority webhooks during peak season
      if (Math.random() < 0.3) {
        return {
          allowed: false,
          retryAfter: 180, // 3 minutes delay
        };
      }
    }

    // Saturday (wedding day) protection - queue non-critical webhooks
    const isSaturday = new Date().getDay() === 6;
    if (isSaturday && config.priority !== 'high') {
      return {
        allowed: false,
        retryAfter: 300, // 5 minutes delay on Saturdays
      };
    }

    return { allowed: true };
  }

  /**
   * Get webhook rate configuration with fallback
   */
  private getWebhookRateConfig(source: string): WebhookRateConfig {
    return (
      this.WEBHOOK_RATE_CONFIGS[source] || this.WEBHOOK_RATE_CONFIGS.generic
    );
  }

  /**
   * Check if webhook can be queued
   */
  private canQueueWebhook(source: string, config: WebhookRateConfig): boolean {
    const currentQueue = this.webhookQueues.get(source) || [];
    return currentQueue.length < config.maxQueueSize;
  }

  /**
   * Get webhook queue position
   */
  private async getWebhookQueuePosition(source: string): Promise<number> {
    const queue = this.webhookQueues.get(source) || [];
    return queue.length;
  }

  /**
   * Generate unique webhook ID
   */
  private generateWebhookId(source: string, endpoint: string): string {
    return `${source}:${endpoint}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract webhook payload safely
   */
  private async extractWebhookPayload(request: Request): Promise<any> {
    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        return await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        return Object.fromEntries(formData.entries());
      } else {
        return await request.text();
      }
    } catch (error) {
      logger.warn('Failed to extract webhook payload', error);
      return {};
    }
  }

  /**
   * Extract relevant webhook headers
   */
  private extractWebhookHeaders(request: Request): Record<string, string> {
    const relevantHeaders = [
      'content-type',
      'x-signature',
      'stripe-signature',
      'x-hub-signature-256',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
    ];

    const headers: Record<string, string> = {};
    for (const header of relevantHeaders) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    return headers;
  }

  /**
   * Get max retry attempts based on webhook importance
   */
  private getMaxRetryAttempts(
    source: string,
    config: WebhookRateConfig,
  ): number {
    const baseAttempts = 3;

    if (config.priority === 'high') {
      return baseAttempts + 2; // 5 attempts for high priority
    } else if (config.priority === 'medium') {
      return baseAttempts + 1; // 4 attempts for medium priority
    } else {
      return baseAttempts; // 3 attempts for low priority
    }
  }

  /**
   * Check if webhook is wedding-critical
   */
  private isWeddingCriticalWebhook(source: string): boolean {
    const criticalWebhooks = [
      'stripe-billing',
      'stripe-connect',
      'calendar-sync',
      'google-calendar',
      'sms-service',
      'tave-webhooks',
      'honeybook-webhooks',
    ];
    return criticalWebhooks.includes(source);
  }

  /**
   * Update webhook processing metrics
   */
  private async updateWebhookMetrics(
    source: string,
    endpoint: string,
    processingTimeMs: number,
  ): Promise<void> {
    const currentMetrics = this.processingMetrics.get(source) || {
      source,
      endpoint,
      requestsLastMinute: 0,
      requestsLastHour: 0,
      queuedRequests: 0,
      averageProcessingTime: 0,
      successRate: 1.0,
      lastProcessed: Date.now(),
    };

    // Update metrics (simplified - in real implementation, use sliding windows)
    currentMetrics.lastProcessed = Date.now();
    currentMetrics.averageProcessingTime =
      currentMetrics.averageProcessingTime * 0.9 + processingTimeMs * 0.1;

    this.processingMetrics.set(source, currentMetrics);
  }

  /**
   * Log webhook violations for security monitoring
   */
  private async logWebhookViolation(
    source: string,
    endpoint: string,
    violationType: string,
    request: Request,
  ): Promise<void> {
    const violationData = {
      source,
      endpoint,
      violationType,
      timestamp: Date.now(),
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
    };

    logger.warn(`Webhook violation detected: ${source}`, violationData);

    // In production, this would also log to security monitoring system
    // await securityMonitoring.logWebhookViolation(violationData);
  }

  /**
   * Hash string for identifier creation
   */
  private hashString(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex').substr(0, 8);
  }

  /**
   * Start webhook queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      try {
        await this.processWebhookQueues();
      } catch (error) {
        logger.error('Webhook queue processing failed', error);
      }
    }, this.QUEUE_PROCESS_INTERVAL);
  }

  /**
   * Process queued webhooks for all sources
   */
  private async processWebhookQueues(): Promise<void> {
    for (const [source, queue] of this.webhookQueues.entries()) {
      if (queue.length === 0) continue;

      const config = this.getWebhookRateConfig(source);
      const identifier = `${source}:queue_processor`;

      // Check if we can process webhooks for this source
      const canProcess = await this.checkWebhookWindow(
        identifier,
        'minute',
        config.minute,
      );

      if (canProcess.allowed) {
        const webhook = queue.shift();
        if (webhook) {
          await this.executeQueuedWebhook(webhook);
        }
      }
    }
  }

  /**
   * Execute a queued webhook
   */
  private async executeQueuedWebhook(webhook: QueuedWebhook): Promise<void> {
    try {
      logger.info(`Processing queued webhook: ${webhook.source}`, {
        webhookId: webhook.id,
        endpoint: webhook.endpoint,
        waitTime: Date.now() - webhook.receivedAt,
      });

      // In real implementation, execute the actual webhook processing
      // For now, just log successful processing
    } catch (error) {
      logger.error(
        `Failed to execute queued webhook: ${webhook.source}`,
        error,
      );

      // Retry if attempts remaining
      if (webhook.retryAttempts < webhook.maxRetryAttempts) {
        webhook.retryAttempts++;
        const sourceQueue = this.webhookQueues.get(webhook.source) || [];
        sourceQueue.push(webhook);
        this.webhookQueues.set(webhook.source, sourceQueue);
      }
    }
  }

  /**
   * Start metrics updater
   */
  private startMetricsUpdater(): void {
    setInterval(async () => {
      try {
        await this.updateAllWebhookMetrics();
      } catch (error) {
        logger.error('Webhook metrics update failed', error);
      }
    }, this.METRICS_UPDATE_INTERVAL);
  }

  /**
   * Update metrics for all webhook sources
   */
  private async updateAllWebhookMetrics(): Promise<void> {
    // Update queue sizes
    for (const [source, queue] of this.webhookQueues.entries()) {
      const metrics = this.processingMetrics.get(source);
      if (metrics) {
        metrics.queuedRequests = queue.length;
      }
    }
  }

  /**
   * Get webhook metrics for monitoring
   */
  getWebhookMetrics(source?: string): WebhookMetrics[] {
    if (source) {
      const metrics = this.processingMetrics.get(source);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.processingMetrics.values());
  }

  /**
   * Get webhook queue stats
   */
  getWebhookQueueStats(): Record<
    string,
    { queueSize: number; priority: string }
  > {
    const stats: Record<string, { queueSize: number; priority: string }> = {};

    for (const [source, queue] of this.webhookQueues.entries()) {
      const config = this.getWebhookRateConfig(source);
      stats[source] = {
        queueSize: queue.length,
        priority: config.priority,
      };
    }

    return stats;
  }

  /**
   * Clear webhook queue for source (emergency use)
   */
  clearWebhookQueue(source: string): number {
    const queue = this.webhookQueues.get(source) || [];
    const cleared = queue.length;
    this.webhookQueues.set(source, []);

    logger.warn(`Cleared webhook queue for source: ${source}`, {
      webhooksCleared: cleared,
    });
    return cleared;
  }
}

// Export singleton instance
export const webhookProtectionIntegration = new WebhookProtectionIntegration();

// Wedding-specific helper functions
export function getWebhookPriorityByContent(
  payload: any,
): 'high' | 'medium' | 'low' {
  const payloadStr = JSON.stringify(payload).toLowerCase();

  // High priority wedding events
  const highPriorityKeywords = [
    'payment',
    'billing',
    'wedding_day',
    'booking_confirmed',
    'venue_availability',
    'urgent',
    'cancelled',
  ];

  // Medium priority events
  const mediumPriorityKeywords = [
    'client_update',
    'contract',
    'invoice',
    'timeline',
    'vendor_assignment',
    'task_reminder',
  ];

  for (const keyword of highPriorityKeywords) {
    if (payloadStr.includes(keyword)) return 'high';
  }

  for (const keyword of mediumPriorityKeywords) {
    if (payloadStr.includes(keyword)) return 'medium';
  }

  return 'low';
}

export function isWeddingDayWebhook(
  payload: any,
  headers: Record<string, string>,
): boolean {
  const payloadStr = JSON.stringify(payload).toLowerCase();
  const weddingDayKeywords = [
    'wedding_day',
    'event_day',
    'ceremony',
    'reception',
    'coordinator',
    'day_of',
    'timeline_update',
  ];

  return weddingDayKeywords.some((keyword) => payloadStr.includes(keyword));
}
