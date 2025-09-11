/**
 * WS-238 Knowledge Base System - Webhook Processing Service
 * Team C - Round 1 Implementation
 *
 * Handles webhook processing for external content updates
 * Secure validation, processing, and routing of webhook events
 */

import crypto from 'crypto';
import { Logger } from '@/lib/logging/Logger';
import { ContentSyncService } from './ContentSyncService';
import { AnalyticsIntegrationService } from './AnalyticsIntegrationService';

export interface WebhookPayload {
  id: string;
  provider: 'github' | 'confluence' | 'notion' | 'stripe' | 'custom';
  event: string;
  data: any;
  timestamp: string;
  signature: string;
  headers: Record<string, string>;
  rawBody: string;
  metadata: {
    sourceIp?: string;
    userAgent?: string;
    contentLength: number;
  };
}

export interface WebhookConfig {
  provider: string;
  secret: string;
  signatureHeader: string;
  timestampHeader?: string;
  eventTypeHeader?: string;
  toleranceSeconds: number;
  retryAttempts: number;
  rateLimitWindow: number; // minutes
  rateLimitMax: number;
}

export interface ProcessingResult {
  success: boolean;
  processed: boolean;
  contentUpdated?: number;
  errors?: string[];
  metadata: {
    processingTime: number;
    webhookId: string;
    provider: string;
    event: string;
  };
}

export interface WebhookStats {
  provider: string;
  totalReceived: number;
  totalProcessed: number;
  totalFailed: number;
  avgProcessingTime: number;
  lastReceived?: string;
  recentErrors: Array<{
    timestamp: string;
    error: string;
    webhookId: string;
  }>;
}

export class WebhookProcessor {
  private logger: Logger;
  private configs = new Map<string, WebhookConfig>();
  private rateLimitTracker = new Map<string, number[]>();
  private processingStats = new Map<string, WebhookStats>();
  private contentSyncService: ContentSyncService;
  private analyticsService: AnalyticsIntegrationService;

  // Wedding-specific content keywords for prioritization
  private readonly URGENT_WEDDING_KEYWORDS = [
    'emergency',
    'urgent',
    'critical',
    'wedding day',
    'ceremony',
    'reception',
    'vendor issue',
    'timeline change',
    'cancellation',
    'replacement',
  ];

  constructor(
    contentSyncService: ContentSyncService,
    analyticsService: AnalyticsIntegrationService,
  ) {
    this.logger = Logger.create('webhook-processor');
    this.contentSyncService = contentSyncService;
    this.analyticsService = analyticsService;

    this.setupDefaultConfigs();
    this.logger.info('WebhookProcessor initialized');
  }

  /**
   * Register webhook configuration for a provider
   */
  registerWebhookConfig(config: WebhookConfig): void {
    this.configs.set(config.provider, config);

    this.logger.info('Webhook config registered', {
      provider: config.provider,
      signatureHeader: config.signatureHeader,
      toleranceSeconds: config.toleranceSeconds,
    });
  }

  /**
   * Process incoming webhook requests
   * Main entry point for webhook handling
   */
  async processWebhook(
    provider: string,
    headers: Record<string, string>,
    rawBody: string,
    sourceIp?: string,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const webhookId = `webhook_${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    try {
      this.logger.info('Processing webhook', {
        webhookId,
        provider,
        bodyLength: rawBody.length,
        sourceIp,
        headers: Object.keys(headers),
      });

      // Get provider configuration
      const config = this.configs.get(provider);
      if (!config) {
        throw new Error(`No configuration found for provider: ${provider}`);
      }

      // Check rate limiting
      if (!this.checkRateLimit(provider, config)) {
        throw new Error(`Rate limit exceeded for provider: ${provider}`);
      }

      // Validate webhook signature and timestamp
      const isValid = await this.validateWebhook(
        provider,
        headers,
        rawBody,
        config,
      );
      if (!isValid) {
        throw new Error('Webhook signature validation failed');
      }

      // Parse webhook payload
      const payload = await this.parseWebhookPayload(
        provider,
        headers,
        rawBody,
        webhookId,
        sourceIp,
      );

      // Check if content is wedding-relevant
      const isWeddingRelevant = this.isWeddingRelevantContent(payload);

      this.logger.info('Webhook payload parsed', {
        webhookId,
        provider,
        event: payload.event,
        weddingRelevant: isWeddingRelevant,
        dataKeys: Object.keys(payload.data),
      });

      // Process webhook based on provider and event type
      const processingResult = await this.processWebhookEvent(payload);

      // Update statistics
      this.updateProcessingStats(provider, startTime, true);

      // Track analytics
      await this.trackWebhookAnalytics(payload, processingResult);

      const result: ProcessingResult = {
        success: true,
        processed: processingResult.processed,
        contentUpdated: processingResult.contentUpdated,
        metadata: {
          processingTime: Date.now() - startTime,
          webhookId,
          provider,
          event: payload.event,
        },
      };

      this.logger.info('Webhook processed successfully', {
        webhookId,
        result,
      });

      return result;
    } catch (error) {
      // Update statistics for failed processing
      this.updateProcessingStats(
        provider,
        startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );

      this.logger.error('Webhook processing failed', {
        webhookId,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceIp,
      });

      return {
        success: false,
        processed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          processingTime: Date.now() - startTime,
          webhookId,
          provider,
          event: 'unknown',
        },
      };
    }
  }

  /**
   * Validate webhook signature and authenticity
   */
  private async validateWebhook(
    provider: string,
    headers: Record<string, string>,
    rawBody: string,
    config: WebhookConfig,
  ): Promise<boolean> {
    try {
      // Get signature from headers
      const signature = headers[config.signatureHeader.toLowerCase()];
      if (!signature) {
        this.logger.warn('Missing signature header', {
          provider,
          expectedHeader: config.signatureHeader,
          availableHeaders: Object.keys(headers),
        });
        return false;
      }

      // Validate timestamp if provided
      if (config.timestampHeader) {
        const timestamp = headers[config.timestampHeader.toLowerCase()];
        if (
          timestamp &&
          !this.validateTimestamp(timestamp, config.toleranceSeconds)
        ) {
          this.logger.warn('Timestamp validation failed', {
            provider,
            timestamp,
            tolerance: config.toleranceSeconds,
          });
          return false;
        }
      }

      // Validate signature based on provider
      const isValid = this.validateProviderSignature(
        provider,
        signature,
        rawBody,
        config,
      );

      this.logger.debug('Webhook signature validation result', {
        provider,
        isValid,
        signatureLength: signature.length,
      });

      return isValid;
    } catch (error) {
      this.logger.error('Webhook validation error', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate provider-specific webhook signatures
   */
  private validateProviderSignature(
    provider: string,
    signature: string,
    rawBody: string,
    config: WebhookConfig,
  ): boolean {
    try {
      switch (provider.toLowerCase()) {
        case 'github':
          return this.validateGitHubSignature(
            signature,
            rawBody,
            config.secret,
          );

        case 'confluence':
          return this.validateConfluenceSignature(
            signature,
            rawBody,
            config.secret,
          );

        case 'notion':
          return this.validateNotionSignature(
            signature,
            rawBody,
            config.secret,
          );

        case 'stripe':
          return this.validateStripeSignature(
            signature,
            rawBody,
            config.secret,
          );

        default:
          return this.validateGenericHMACSignature(
            signature,
            rawBody,
            config.secret,
          );
      }
    } catch (error) {
      this.logger.error('Provider signature validation error', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * GitHub webhook signature validation
   */
  private validateGitHubSignature(
    signature: string,
    rawBody: string,
    secret: string,
  ): boolean {
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Confluence webhook signature validation
   */
  private validateConfluenceSignature(
    signature: string,
    rawBody: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Notion webhook signature validation
   */
  private validateNotionSignature(
    signature: string,
    rawBody: string,
    secret: string,
  ): boolean {
    // Notion uses a different validation approach
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Stripe webhook signature validation
   */
  private validateStripeSignature(
    signature: string,
    rawBody: string,
    secret: string,
  ): boolean {
    try {
      const elements = signature.split(',');
      const timestamp = elements
        .find((el) => el.startsWith('t='))
        ?.substring(2);
      const sig = elements.find((el) => el.startsWith('v1='))?.substring(3);

      if (!timestamp || !sig) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic HMAC signature validation
   */
  private validateGenericHMACSignature(
    signature: string,
    rawBody: string,
    secret: string,
  ): boolean {
    const cleanSignature = signature.replace('sha256=', '');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  private validateTimestamp(
    timestamp: string,
    toleranceSeconds: number,
  ): boolean {
    const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeDifference = Math.abs(now - webhookTime);

    return timeDifference <= toleranceSeconds * 1000;
  }

  /**
   * Parse webhook payload into standardized format
   */
  private async parseWebhookPayload(
    provider: string,
    headers: Record<string, string>,
    rawBody: string,
    webhookId: string,
    sourceIp?: string,
  ): Promise<WebhookPayload> {
    try {
      const data = JSON.parse(rawBody);
      const config = this.configs.get(provider)!;

      // Extract event type based on provider
      let event = 'unknown';
      if (config.eventTypeHeader) {
        event = headers[config.eventTypeHeader.toLowerCase()] || 'unknown';
      } else {
        // Try to extract from payload
        event = data.action || data.event_type || data.type || 'unknown';
      }

      return {
        id: webhookId,
        provider: provider as any,
        event,
        data,
        timestamp: new Date().toISOString(),
        signature: headers[config.signatureHeader.toLowerCase()] || '',
        headers,
        rawBody,
        metadata: {
          sourceIp,
          userAgent: headers['user-agent'],
          contentLength: rawBody.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse webhook payload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process webhook events based on provider and event type
   */
  private async processWebhookEvent(payload: WebhookPayload): Promise<{
    processed: boolean;
    contentUpdated: number;
  }> {
    try {
      // Check if this is a wedding-relevant content update
      if (!this.isWeddingRelevantContent(payload)) {
        this.logger.debug('Webhook content not wedding-relevant, skipping', {
          webhookId: payload.id,
          provider: payload.provider,
          event: payload.event,
        });
        return { processed: true, contentUpdated: 0 };
      }

      // Check if this is an urgent wedding update
      const isUrgent = this.isUrgentWeddingContent(payload);
      if (isUrgent) {
        this.logger.warn('Urgent wedding content update detected', {
          webhookId: payload.id,
          provider: payload.provider,
          event: payload.event,
        });
      }

      let contentUpdated = 0;

      switch (payload.provider) {
        case 'github':
          contentUpdated = await this.processGitHubWebhook(payload);
          break;

        case 'confluence':
          contentUpdated = await this.processConfluenceWebhook(payload);
          break;

        case 'notion':
          contentUpdated = await this.processNotionWebhook(payload);
          break;

        case 'stripe':
          contentUpdated = await this.processStripeWebhook(payload);
          break;

        default:
          this.logger.warn('Unknown webhook provider', {
            provider: payload.provider,
            webhookId: payload.id,
          });
          return { processed: false, contentUpdated: 0 };
      }

      return { processed: true, contentUpdated };
    } catch (error) {
      this.logger.error('Webhook event processing failed', {
        webhookId: payload.id,
        provider: payload.provider,
        event: payload.event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process GitHub webhook events
   */
  private async processGitHubWebhook(payload: WebhookPayload): Promise<number> {
    const { data, event } = payload;
    let contentUpdated = 0;

    switch (event) {
      case 'push':
        // Handle repository push events
        if (data.commits && Array.isArray(data.commits)) {
          for (const commit of data.commits) {
            const modifiedFiles = [
              ...(commit.added || []),
              ...(commit.modified || []),
            ];

            for (const file of modifiedFiles) {
              if (this.isDocumentationFile(file)) {
                await this.processDocumentationUpdate(
                  payload.provider,
                  file,
                  commit,
                );
                contentUpdated++;
              }
            }
          }
        }
        break;

      case 'release':
        // Handle new releases
        if (data.action === 'published') {
          await this.processReleaseUpdate(payload.provider, data.release);
          contentUpdated++;
        }
        break;

      case 'issues':
        // Handle issue updates that might be wedding-related
        if (data.action === 'opened' || data.action === 'closed') {
          if (
            this.containsWeddingKeywords(
              data.issue.title + ' ' + data.issue.body,
            )
          ) {
            await this.processIssueUpdate(
              payload.provider,
              data.issue,
              data.action,
            );
            contentUpdated++;
          }
        }
        break;
    }

    return contentUpdated;
  }

  /**
   * Process Confluence webhook events
   */
  private async processConfluenceWebhook(
    payload: WebhookPayload,
  ): Promise<number> {
    const { data, event } = payload;
    let contentUpdated = 0;

    switch (event) {
      case 'page_created':
      case 'page_updated':
        if (data.page && this.containsWeddingKeywords(data.page.title)) {
          await this.processPageUpdate(payload.provider, data.page, event);
          contentUpdated++;
        }
        break;

      case 'page_removed':
        if (data.page) {
          await this.processPageDeletion(payload.provider, data.page.id);
          contentUpdated++;
        }
        break;
    }

    return contentUpdated;
  }

  /**
   * Process Notion webhook events
   */
  private async processNotionWebhook(payload: WebhookPayload): Promise<number> {
    const { data, event } = payload;
    let contentUpdated = 0;

    switch (event) {
      case 'page.created':
      case 'page.updated':
        if (data.object === 'page' && this.isWeddingRelevantNotionPage(data)) {
          await this.processNotionPageUpdate(payload.provider, data, event);
          contentUpdated++;
        }
        break;

      case 'database.updated':
        if (data.object === 'database') {
          await this.processNotionDatabaseUpdate(payload.provider, data);
          contentUpdated++;
        }
        break;
    }

    return contentUpdated;
  }

  /**
   * Process Stripe webhook events (for billing-related knowledge base updates)
   */
  private async processStripeWebhook(payload: WebhookPayload): Promise<number> {
    // This would handle billing events that might trigger knowledge base updates
    // For example, subscription changes that affect feature access
    return 0;
  }

  /**
   * Check if content is wedding industry relevant
   */
  private isWeddingRelevantContent(payload: WebhookPayload): boolean {
    const content = JSON.stringify(payload.data).toLowerCase();
    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'marriage',
      'ceremony',
      'reception',
      'photographer',
      'venue',
      'florist',
      'catering',
      'dj',
      'planner',
      'guest',
      'invitation',
      'rsvp',
      'timeline',
      'vendor',
    ];

    return weddingKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * Check if content contains urgent wedding keywords
   */
  private isUrgentWeddingContent(payload: WebhookPayload): boolean {
    const content = JSON.stringify(payload.data).toLowerCase();
    return this.URGENT_WEDDING_KEYWORDS.some((keyword) =>
      content.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Check rate limiting for webhook provider
   */
  private checkRateLimit(provider: string, config: WebhookConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.rateLimitWindow * 60 * 1000;

    const timestamps = this.rateLimitTracker.get(provider) || [];
    const recentTimestamps = timestamps.filter((time) => time > windowStart);

    if (recentTimestamps.length >= config.rateLimitMax) {
      return false;
    }

    recentTimestamps.push(now);
    this.rateLimitTracker.set(provider, recentTimestamps);
    return true;
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(
    provider: string,
    startTime: number,
    success: boolean,
    error?: string,
  ): void {
    const stats = this.processingStats.get(provider) || {
      provider,
      totalReceived: 0,
      totalProcessed: 0,
      totalFailed: 0,
      avgProcessingTime: 0,
      recentErrors: [],
    };

    stats.totalReceived++;
    const processingTime = Date.now() - startTime;

    if (success) {
      stats.totalProcessed++;
      stats.avgProcessingTime =
        (stats.avgProcessingTime * (stats.totalProcessed - 1) +
          processingTime) /
        stats.totalProcessed;
    } else {
      stats.totalFailed++;
      stats.recentErrors.push({
        timestamp: new Date().toISOString(),
        error: error || 'Unknown error',
        webhookId: `webhook_${provider}_${startTime}`,
      });

      // Keep only last 10 errors
      if (stats.recentErrors.length > 10) {
        stats.recentErrors = stats.recentErrors.slice(-10);
      }
    }

    stats.lastReceived = new Date().toISOString();
    this.processingStats.set(provider, stats);
  }

  /**
   * Track webhook analytics
   */
  private async trackWebhookAnalytics(
    payload: WebhookPayload,
    result: { processed: boolean; contentUpdated: number },
  ): Promise<void> {
    try {
      // This would integrate with the analytics service
      this.logger.debug('Webhook analytics tracked', {
        provider: payload.provider,
        event: payload.event,
        processed: result.processed,
        contentUpdated: result.contentUpdated,
      });
    } catch (error) {
      this.logger.warn('Failed to track webhook analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get webhook processing statistics
   */
  getWebhookStats(): Map<string, WebhookStats> {
    return new Map(this.processingStats);
  }

  /**
   * Get webhook processing statistics for a specific provider
   */
  getProviderStats(provider: string): WebhookStats | undefined {
    return this.processingStats.get(provider);
  }

  // Helper methods for content processing

  private isDocumentationFile(filename: string): boolean {
    const docExtensions = ['.md', '.mdx', '.rst', '.txt', '.html'];
    return docExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  private containsWeddingKeywords(text: string): boolean {
    const keywords = [
      'wedding',
      'bride',
      'groom',
      'vendor',
      'ceremony',
      'reception',
    ];
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword));
  }

  private isWeddingRelevantNotionPage(data: any): boolean {
    const title = data.properties?.title?.title?.[0]?.text?.content || '';
    return this.containsWeddingKeywords(title);
  }

  // Content update processing methods (simplified implementations)

  private async processDocumentationUpdate(
    provider: string,
    file: string,
    commit: any,
  ): Promise<void> {
    this.logger.info('Processing documentation update', {
      provider,
      file,
      commit: commit.id,
    });
    // Implementation would trigger content sync for this specific file
  }

  private async processReleaseUpdate(
    provider: string,
    release: any,
  ): Promise<void> {
    this.logger.info('Processing release update', {
      provider,
      release: release.tag_name,
    });
    // Implementation would create knowledge base article for release notes
  }

  private async processIssueUpdate(
    provider: string,
    issue: any,
    action: string,
  ): Promise<void> {
    this.logger.info('Processing issue update', {
      provider,
      issue: issue.number,
      action,
    });
    // Implementation would update knowledge base with issue resolution
  }

  private async processPageUpdate(
    provider: string,
    page: any,
    event: string,
  ): Promise<void> {
    this.logger.info('Processing page update', {
      provider,
      page: page.id,
      event,
    });
    // Implementation would sync updated page content
  }

  private async processPageDeletion(
    provider: string,
    pageId: string,
  ): Promise<void> {
    this.logger.info('Processing page deletion', { provider, pageId });
    // Implementation would remove content from knowledge base
  }

  private async processNotionPageUpdate(
    provider: string,
    page: any,
    event: string,
  ): Promise<void> {
    this.logger.info('Processing Notion page update', {
      provider,
      page: page.id,
      event,
    });
    // Implementation would sync Notion page content
  }

  private async processNotionDatabaseUpdate(
    provider: string,
    database: any,
  ): Promise<void> {
    this.logger.info('Processing Notion database update', {
      provider,
      database: database.id,
    });
    // Implementation would sync database changes
  }

  /**
   * Setup default webhook configurations
   */
  private setupDefaultConfigs(): void {
    // GitHub configuration
    this.registerWebhookConfig({
      provider: 'github',
      secret: process.env.GITHUB_WEBHOOK_SECRET || '',
      signatureHeader: 'x-hub-signature-256',
      eventTypeHeader: 'x-github-event',
      toleranceSeconds: 300,
      retryAttempts: 3,
      rateLimitWindow: 15, // 15 minutes
      rateLimitMax: 100,
    });

    // Confluence configuration
    this.registerWebhookConfig({
      provider: 'confluence',
      secret: process.env.CONFLUENCE_WEBHOOK_SECRET || '',
      signatureHeader: 'x-confluence-signature',
      toleranceSeconds: 300,
      retryAttempts: 3,
      rateLimitWindow: 15,
      rateLimitMax: 50,
    });

    // Notion configuration
    this.registerWebhookConfig({
      provider: 'notion',
      secret: process.env.NOTION_WEBHOOK_SECRET || '',
      signatureHeader: 'notion-signature',
      timestampHeader: 'notion-timestamp',
      toleranceSeconds: 300,
      retryAttempts: 3,
      rateLimitWindow: 15,
      rateLimitMax: 50,
    });

    // Stripe configuration
    this.registerWebhookConfig({
      provider: 'stripe',
      secret: process.env.STRIPE_WEBHOOK_SECRET || '',
      signatureHeader: 'stripe-signature',
      toleranceSeconds: 300,
      retryAttempts: 3,
      rateLimitWindow: 15,
      rateLimitMax: 100,
    });
  }
}

export default WebhookProcessor;
