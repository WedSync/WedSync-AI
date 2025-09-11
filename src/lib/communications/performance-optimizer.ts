import { createClient } from '@/lib/supabase/server';
import { BulkMessageQueue } from './bulk-queue';
import { Database } from '@/types/database';
import pLimit from 'p-limit';
import { Redis } from '@upstash/redis';

interface OptimizationConfig {
  maxConcurrentConnections: number;
  batchSize: number;
  connectionPoolSize: number;
  maxRetriesPerMessage: number;
  circuitBreakerThreshold: number;
  rateLimitPerSecond: number;
}

interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{ recipientId: string; error: string }>;
  totalTime: number;
}

/**
 * High-performance message delivery system optimized for 1000+ recipients
 * Implements connection pooling, batch processing, and circuit breaker patterns
 */
export class MessagePerformanceOptimizer {
  private static config: OptimizationConfig = {
    maxConcurrentConnections: 100,
    batchSize: 100, // Optimized batch size for parallel processing
    connectionPoolSize: 10,
    maxRetriesPerMessage: 3,
    circuitBreakerThreshold: 50, // Trip circuit if 50% fail
    rateLimitPerSecond: 50,
  };

  private static redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  private static circuitBreakerOpen = false;
  private static failureCount = 0;
  private static successCount = 0;
  private static connectionPool: any[] = [];

  /**
   * Process large-scale message campaign with optimizations
   */
  static async processBulkCampaign(
    campaignId: string,
    recipients: Array<{
      id: string;
      email?: string;
      phone?: string;
      name: string;
    }>,
    message: {
      subject: string;
      content: string;
      templateType: string;
      channels: ('email' | 'sms')[];
      priority: 'low' | 'normal' | 'high' | 'urgent';
    },
    organizationId: string,
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results: BatchResult = {
      successful: 0,
      failed: 0,
      errors: [],
      totalTime: 0,
    };

    try {
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        const isRecovered = await this.checkCircuitBreaker();
        if (!isRecovered) {
          throw new Error('Circuit breaker is open - too many failures');
        }
      }

      // Initialize connection pool
      await this.initializeConnectionPool();

      // Split recipients into batches
      const batches = this.createBatches(recipients, this.config.batchSize);

      // Create concurrency limiter
      const limit = pLimit(this.config.maxConcurrentConnections);

      // Process batches in parallel with rate limiting
      const batchPromises = batches.map((batch, index) =>
        limit(async () => {
          // Rate limiting
          await this.applyRateLimit(index);

          return this.processBatch(
            batch,
            campaignId,
            message,
            organizationId,
            index,
          );
        }),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Aggregate results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.successful += result.value.successful;
          results.failed += result.value.failed;
          results.errors.push(...result.value.errors);
        } else {
          results.failed += this.config.batchSize;
        }
      });

      // Update circuit breaker stats
      this.updateCircuitBreaker(results.successful, results.failed);

      results.totalTime = Date.now() - startTime;

      // Store performance metrics
      await this.storePerformanceMetrics(campaignId, results);

      return results;
    } catch (error) {
      console.error('Bulk campaign processing error:', error);
      throw error;
    } finally {
      // Cleanup connection pool
      await this.cleanupConnectionPool();
    }
  }

  /**
   * Process a single batch of recipients
   */
  private static async processBatch(
    batch: Array<{ id: string; email?: string; phone?: string; name: string }>,
    campaignId: string,
    message: any,
    organizationId: string,
    batchIndex: number,
  ): Promise<BatchResult> {
    const results: BatchResult = {
      successful: 0,
      failed: 0,
      errors: [],
      totalTime: 0,
    };

    const startTime = Date.now();
    const supabase = await this.getConnectionFromPool();

    try {
      // Prepare batch insert data
      const bulkRecipients = batch.map((recipient) => ({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        recipient_type: 'guest' as const,
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        recipient_name: recipient.name,
        channels: message.channels,
        email_status:
          recipient.email && message.channels.includes('email')
            ? 'queued'
            : null,
        sms_status:
          recipient.phone && message.channels.includes('sms') ? 'queued' : null,
        created_at: new Date().toISOString(),
      }));

      // Bulk insert recipients
      const { error: insertError } = await supabase
        .from('bulk_message_recipients')
        .upsert(bulkRecipients, {
          onConflict: 'campaign_id,recipient_id',
        });

      if (insertError) {
        throw insertError;
      }

      // Queue messages for processing
      const queuePromises = batch.map(async (recipient) => {
        try {
          if (recipient.email && message.channels.includes('email')) {
            await BulkMessageQueue.addEmailToQueue({
              campaignId,
              recipientId: recipient.id,
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              subject: message.subject,
              message: message.content,
              templateType: message.templateType,
              organizationId,
              priority: message.priority,
            });
          }

          if (recipient.phone && message.channels.includes('sms')) {
            await BulkMessageQueue.addSMSToQueue({
              campaignId,
              recipientId: recipient.id,
              recipientPhone: recipient.phone,
              recipientName: recipient.name,
              message: message.content,
              templateType: message.templateType,
              organizationId,
              organizationTier: 'PROFESSIONAL', // Get from org data
              priority: message.priority,
            });
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            recipientId: recipient.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.allSettled(queuePromises);

      // Cache batch status for monitoring
      await this.cacheBatchStatus(campaignId, batchIndex, results);
    } catch (error) {
      console.error(`Batch ${batchIndex} processing error:`, error);
      batch.forEach((recipient) => {
        results.failed++;
        results.errors.push({
          recipientId: recipient.id,
          error:
            error instanceof Error ? error.message : 'Batch processing failed',
        });
      });
    }

    results.totalTime = Date.now() - startTime;
    return results;
  }

  /**
   * Initialize connection pool for database operations
   */
  private static async initializeConnectionPool(): Promise<void> {
    this.connectionPool = [];
    for (let i = 0; i < this.config.connectionPoolSize; i++) {
      const connection = await createClient();
      this.connectionPool.push(connection);
    }
  }

  /**
   * Get a connection from the pool
   */
  private static async getConnectionFromPool() {
    if (this.connectionPool.length === 0) {
      return await createClient();
    }
    // Round-robin connection selection
    const connection = this.connectionPool.shift();
    this.connectionPool.push(connection);
    return connection;
  }

  /**
   * Cleanup connection pool
   */
  private static async cleanupConnectionPool(): Promise<void> {
    this.connectionPool = [];
  }

  /**
   * Create optimized batches for processing
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Apply rate limiting to prevent overwhelming services
   */
  private static async applyRateLimit(batchIndex: number): Promise<void> {
    const delayMs = (batchIndex * 1000) / this.config.rateLimitPerSecond;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Update circuit breaker statistics
   */
  private static updateCircuitBreaker(
    successful: number,
    failed: number,
  ): void {
    this.successCount += successful;
    this.failureCount += failed;

    const totalRequests = this.successCount + this.failureCount;
    const failureRate = (this.failureCount / totalRequests) * 100;

    if (failureRate > this.config.circuitBreakerThreshold) {
      this.circuitBreakerOpen = true;
      // Reset after 30 seconds
      setTimeout(() => {
        this.circuitBreakerOpen = false;
        this.successCount = 0;
        this.failureCount = 0;
      }, 30000);
    }
  }

  /**
   * Check if circuit breaker has recovered
   */
  private static async checkCircuitBreaker(): Promise<boolean> {
    // Send a test message to check if service is healthy
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('bulk_message_recipients')
        .select('id')
        .limit(1);

      if (!error) {
        this.circuitBreakerOpen = false;
        this.successCount = 0;
        this.failureCount = 0;
        return true;
      }
    } catch (error) {
      console.error('Circuit breaker check failed:', error);
    }
    return false;
  }

  /**
   * Cache batch processing status for real-time monitoring
   */
  private static async cacheBatchStatus(
    campaignId: string,
    batchIndex: number,
    results: BatchResult,
  ): Promise<void> {
    const key = `campaign:${campaignId}:batch:${batchIndex}`;
    await this.redis.setex(
      key,
      3600,
      JSON.stringify({
        ...results,
        processedAt: new Date().toISOString(),
      }),
    );
  }

  /**
   * Store performance metrics for analysis
   */
  private static async storePerformanceMetrics(
    campaignId: string,
    results: BatchResult,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('campaign_performance_metrics').insert({
      campaign_id: campaignId,
      total_recipients: results.successful + results.failed,
      successful_deliveries: results.successful,
      failed_deliveries: results.failed,
      processing_time_ms: results.totalTime,
      messages_per_second: (
        results.successful /
        (results.totalTime / 1000)
      ).toFixed(2),
      error_rate: (
        (results.failed / (results.successful + results.failed)) *
        100
      ).toFixed(2),
      created_at: new Date().toISOString(),
    });

    // Store in Redis for real-time dashboard
    await this.redis.setex(
      `metrics:${campaignId}`,
      86400,
      JSON.stringify({
        ...results,
        messagesPerSecond: results.successful / (results.totalTime / 1000),
        errorRate:
          (results.failed / (results.successful + results.failed)) * 100,
      }),
    );
  }

  /**
   * Get real-time campaign status
   */
  static async getCampaignStatus(campaignId: string): Promise<{
    totalBatches: number;
    processedBatches: number;
    successfulMessages: number;
    failedMessages: number;
    processingTime: number;
    messagesPerSecond: number;
    errorRate: number;
  }> {
    const metrics = await this.redis.get(`metrics:${campaignId}`);
    if (!metrics) {
      return {
        totalBatches: 0,
        processedBatches: 0,
        successfulMessages: 0,
        failedMessages: 0,
        processingTime: 0,
        messagesPerSecond: 0,
        errorRate: 0,
      };
    }

    const parsedMetrics = JSON.parse(metrics as string);

    // Count processed batches
    const batchKeys = await this.redis.keys(`campaign:${campaignId}:batch:*`);

    return {
      totalBatches: Math.ceil(
        (parsedMetrics.successful + parsedMetrics.failed) /
          this.config.batchSize,
      ),
      processedBatches: batchKeys.length,
      successfulMessages: parsedMetrics.successful,
      failedMessages: parsedMetrics.failed,
      processingTime: parsedMetrics.totalTime,
      messagesPerSecond: parsedMetrics.messagesPerSecond,
      errorRate: parsedMetrics.errorRate,
    };
  }

  /**
   * Optimize configuration based on current performance
   */
  static async optimizeConfiguration(organizationTier: string): void {
    // Adjust settings based on organization tier
    switch (organizationTier) {
      case 'ENTERPRISE':
        this.config.maxConcurrentConnections = 200;
        this.config.batchSize = 200;
        this.config.connectionPoolSize = 20;
        this.config.rateLimitPerSecond = 100;
        break;
      case 'SCALE':
        this.config.maxConcurrentConnections = 150;
        this.config.batchSize = 150;
        this.config.connectionPoolSize = 15;
        this.config.rateLimitPerSecond = 75;
        break;
      case 'PROFESSIONAL':
        this.config.maxConcurrentConnections = 100;
        this.config.batchSize = 100;
        this.config.connectionPoolSize = 10;
        this.config.rateLimitPerSecond = 50;
        break;
      default:
        this.config.maxConcurrentConnections = 50;
        this.config.batchSize = 50;
        this.config.connectionPoolSize = 5;
        this.config.rateLimitPerSecond = 25;
    }
  }
}

export const messagePerformanceOptimizer = new MessagePerformanceOptimizer();
