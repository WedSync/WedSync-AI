/**
 * WS-238 Knowledge Base System - Content Synchronization Service
 * Team C - Round 1 Implementation
 *
 * Handles synchronization with external content sources
 * Validates, transforms, and imports content from GitHub, Confluence, Notion, etc.
 */

import { Logger } from '@/lib/logging/Logger';
import { AISearchService } from './AISearchService';

export interface ContentSource {
  id: string;
  name: string;
  type: 'github' | 'confluence' | 'notion' | 'documentation' | 'rss' | 'api';
  url: string;
  config: {
    apiKey?: string;
    username?: string;
    repository?: string;
    branch?: string;
    path?: string;
    spaceKey?: string;
    databaseId?: string;
    headers?: Record<string, string>;
    syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
    lastSync?: string;
    isActive: boolean;
  };
  filters: {
    includePatterns: string[];
    excludePatterns: string[];
    weddingKeywords: string[];
    vendorTypes?: string[];
    categories?: string[];
  };
}

export interface ContentItem {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  content: string;
  contentType: 'markdown' | 'html' | 'plain' | 'json';
  category: string;
  tags: string[];
  metadata: {
    author?: string;
    lastModified: string;
    url?: string;
    path?: string;
    version?: string;
    language?: string;
    estimatedReadTime?: number;
  };
  weddingRelevance: {
    isRelevant: boolean;
    vendorTypes: string[];
    confidence: number;
    reasoning: string;
  };
  validationStatus: 'pending' | 'valid' | 'invalid' | 'needs_review';
  embedding?: number[];
}

export interface SyncResult {
  sourceId: string;
  status: 'success' | 'partial' | 'failed';
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: Array<{
    item: string;
    error: string;
    code: string;
  }>;
  duration: number;
  timestamp: string;
}

export interface SyncOptions {
  forceFullSync?: boolean;
  includeDrafts?: boolean;
  validateOnly?: boolean;
  maxItems?: number;
  filterByDate?: {
    since: string;
    until?: string;
  };
}

export class ContentSyncService {
  private logger: Logger;
  private aiSearchService: AISearchService;
  private activeSync = new Map<string, boolean>();
  private syncStats = new Map<string, SyncResult[]>();

  // Wedding industry keywords for content relevance filtering
  private readonly WEDDING_KEYWORDS = [
    'wedding',
    'bride',
    'groom',
    'marriage',
    'ceremony',
    'reception',
    'photographer',
    'photography',
    'venue',
    'catering',
    'florist',
    'flowers',
    'dj',
    'music',
    'planner',
    'planning',
    'coordinator',
    'decoration',
    'invitation',
    'guest',
    'rsvp',
    'timeline',
    'budget',
    'vendor',
    'honeymoon',
    'engagement',
    'bridal',
    'bachelor',
    'bachelorette',
  ];

  constructor(aiSearchService: AISearchService) {
    this.logger = Logger.create('content-sync-service');
    this.aiSearchService = aiSearchService;

    this.logger.info('ContentSyncService initialized');
  }

  /**
   * Synchronize content from an external source
   * Main entry point for content synchronization
   */
  async syncSource(
    source: ContentSource,
    options: SyncOptions = {},
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const syncId = `${source.id}_${Date.now()}`;

    try {
      this.logger.info('Starting content sync', {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        syncId,
        options,
      });

      // Check if sync is already in progress
      if (this.activeSync.get(source.id)) {
        throw new Error(`Sync already in progress for source ${source.id}`);
      }

      this.activeSync.set(source.id, true);

      // Validate source configuration
      this.validateSourceConfig(source);

      // Fetch content from external source
      const externalContent = await this.fetchExternalContent(source, options);

      this.logger.info('External content fetched', {
        sourceId: source.id,
        itemsFound: externalContent.length,
        syncId,
      });

      // Filter content for wedding relevance
      const relevantContent = await this.filterWeddingRelevantContent(
        externalContent,
        source.filters,
      );

      this.logger.info('Content filtered for wedding relevance', {
        sourceId: source.id,
        originalCount: externalContent.length,
        relevantCount: relevantContent.length,
        syncId,
      });

      // Process and validate content
      const processedContent = await this.processContentItems(
        relevantContent,
        source,
        options.validateOnly || false,
      );

      // Store content in database (if not validation-only)
      let storeResult = { added: 0, updated: 0, skipped: 0 };
      if (!options.validateOnly) {
        storeResult = await this.storeContentInDatabase(
          processedContent,
          source.id,
        );
      }

      // Update source last sync time
      await this.updateSourceLastSync(source.id);

      const result: SyncResult = {
        sourceId: source.id,
        status: 'success',
        itemsProcessed: processedContent.length,
        itemsAdded: storeResult.added,
        itemsUpdated: storeResult.updated,
        itemsSkipped: storeResult.skipped,
        errors: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.recordSyncResult(source.id, result);

      this.logger.info('Content sync completed successfully', {
        sourceId: source.id,
        result,
        syncId,
      });

      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        sourceId: source.id,
        status: 'failed',
        itemsProcessed: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        errors: [
          {
            item: 'sync_process',
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'SYNC_FAILED',
          },
        ],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      this.recordSyncResult(source.id, errorResult);

      this.logger.error('Content sync failed', {
        sourceId: source.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncId,
      });

      throw error;
    } finally {
      this.activeSync.set(source.id, false);
    }
  }

  /**
   * Validate content format and wedding industry relevance
   * Used for quality control before content ingestion
   */
  async validateContent(
    content: string,
    metadata: Partial<ContentItem['metadata']> = {},
  ): Promise<{
    isValid: boolean;
    issues: string[];
    weddingRelevance: ContentItem['weddingRelevance'];
    sanitizedContent: string;
  }> {
    const issues: string[] = [];

    try {
      // Basic content validation
      if (!content || content.trim().length < 10) {
        issues.push('Content is too short or empty');
      }

      if (content.length > 100000) {
        issues.push('Content exceeds maximum length (100KB)');
      }

      // Check for malicious content
      const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /onclick\s*=/gi,
        /onerror\s*=/gi,
      ];

      const hasMaliciousContent = maliciousPatterns.some((pattern) =>
        pattern.test(content),
      );
      if (hasMaliciousContent) {
        issues.push('Content contains potentially malicious code');
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(content);

      // Analyze wedding industry relevance
      const weddingRelevance =
        await this.analyzeWeddingRelevance(sanitizedContent);

      this.logger.info('Content validation completed', {
        contentLength: content.length,
        issueCount: issues.length,
        weddingRelevant: weddingRelevance.isRelevant,
        confidence: weddingRelevance.confidence,
      });

      return {
        isValid: issues.length === 0,
        issues,
        weddingRelevance,
        sanitizedContent,
      };
    } catch (error) {
      this.logger.error('Content validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content.length,
      });

      return {
        isValid: false,
        issues: ['Validation process failed'],
        weddingRelevance: {
          isRelevant: false,
          vendorTypes: [],
          confidence: 0,
          reasoning: 'Validation failed',
        },
        sanitizedContent: content,
      };
    }
  }

  /**
   * Transform content from external format to standardized format
   * Handles different content types (markdown, HTML, JSON, etc.)
   */
  async transformContent(
    rawContent: any,
    sourceType: ContentSource['type'],
    contentPath?: string,
  ): Promise<Partial<ContentItem>> {
    try {
      let transformedContent: Partial<ContentItem>;

      switch (sourceType) {
        case 'github':
          transformedContent = await this.transformGitHubContent(rawContent);
          break;
        case 'confluence':
          transformedContent =
            await this.transformConfluenceContent(rawContent);
          break;
        case 'notion':
          transformedContent = await this.transformNotionContent(rawContent);
          break;
        case 'documentation':
          transformedContent =
            await this.transformDocumentationContent(rawContent);
          break;
        case 'rss':
          transformedContent = await this.transformRSSContent(rawContent);
          break;
        case 'api':
          transformedContent = await this.transformAPIContent(rawContent);
          break;
        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      // Add common transformations
      if (transformedContent.content) {
        // Estimate read time (average 200 words per minute)
        const wordCount = transformedContent.content.split(/\s+/).length;
        transformedContent.metadata = {
          ...transformedContent.metadata,
          estimatedReadTime: Math.max(1, Math.ceil(wordCount / 200)),
        };

        // Extract and enhance tags
        transformedContent.tags = this.extractAndEnhanceTags(
          transformedContent.content,
          transformedContent.tags || [],
        );
      }

      this.logger.info('Content transformed successfully', {
        sourceType,
        contentPath,
        title: transformedContent.title?.substring(0, 50),
        contentLength: transformedContent.content?.length || 0,
        tagCount: transformedContent.tags?.length || 0,
      });

      return transformedContent;
    } catch (error) {
      this.logger.error('Content transformation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceType,
        contentPath,
      });
      throw error;
    }
  }

  /**
   * Get synchronization status and statistics for all sources
   */
  getSyncStats(): Record<
    string,
    {
      isActive: boolean;
      lastSync?: SyncResult;
      recentSyncs: SyncResult[];
      avgDuration: number;
      successRate: number;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [sourceId, results] of this.syncStats.entries()) {
      const recentSyncs = results.slice(-10); // Last 10 syncs
      const successful = recentSyncs.filter((r) => r.status === 'success');
      const totalDuration = recentSyncs.reduce((sum, r) => sum + r.duration, 0);

      stats[sourceId] = {
        isActive: this.activeSync.get(sourceId) || false,
        lastSync: results[results.length - 1],
        recentSyncs,
        avgDuration:
          recentSyncs.length > 0 ? totalDuration / recentSyncs.length : 0,
        successRate:
          recentSyncs.length > 0 ? successful.length / recentSyncs.length : 0,
      };
    }

    return stats;
  }

  /**
   * Schedule automatic synchronization for a source
   */
  async scheduleSync(source: ContentSource): Promise<void> {
    if (source.config.syncFrequency === 'manual') {
      return;
    }

    const interval = this.getScheduleInterval(source.config.syncFrequency);

    this.logger.info('Scheduling automatic sync', {
      sourceId: source.id,
      frequency: source.config.syncFrequency,
      intervalMs: interval,
    });

    // In a real implementation, this would use a job queue or cron system
    setTimeout(async () => {
      try {
        await this.syncSource(source);
        // Reschedule for next interval
        this.scheduleSync(source);
      } catch (error) {
        this.logger.error('Scheduled sync failed', {
          sourceId: source.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Still reschedule to retry later
        this.scheduleSync(source);
      }
    }, interval);
  }

  // Private helper methods

  private validateSourceConfig(source: ContentSource): void {
    if (!source.url) {
      throw new Error('Source URL is required');
    }

    if (!source.config.isActive) {
      throw new Error('Source is not active');
    }

    // Type-specific validation
    switch (source.type) {
      case 'github':
        if (!source.config.apiKey) {
          throw new Error('GitHub API key is required');
        }
        break;
      case 'confluence':
        if (!source.config.apiKey || !source.config.spaceKey) {
          throw new Error('Confluence API key and space key are required');
        }
        break;
      case 'notion':
        if (!source.config.apiKey || !source.config.databaseId) {
          throw new Error('Notion API key and database ID are required');
        }
        break;
    }
  }

  private async fetchExternalContent(
    source: ContentSource,
    options: SyncOptions,
  ): Promise<any[]> {
    // This would implement actual fetching logic for each source type
    // For now, returning mock data structure
    return [];
  }

  private async filterWeddingRelevantContent(
    content: any[],
    filters: ContentSource['filters'],
  ): Promise<any[]> {
    const relevantContent = [];

    for (const item of content) {
      // Check for wedding keywords
      const text = (item.title + ' ' + item.content).toLowerCase();
      const hasWeddingKeywords = this.WEDDING_KEYWORDS.some((keyword) =>
        text.includes(keyword.toLowerCase()),
      );

      const hasFilterKeywords =
        filters.weddingKeywords.length === 0 ||
        filters.weddingKeywords.some((keyword) =>
          text.includes(keyword.toLowerCase()),
        );

      if (hasWeddingKeywords || hasFilterKeywords) {
        relevantContent.push(item);
      }
    }

    return relevantContent;
  }

  private async processContentItems(
    content: any[],
    source: ContentSource,
    validateOnly: boolean,
  ): Promise<ContentItem[]> {
    const processedItems: ContentItem[] = [];

    for (const item of content) {
      try {
        // Transform content to standard format
        const transformed = await this.transformContent(item, source.type);

        // Validate content
        const validation = await this.validateContent(
          transformed.content || '',
        );

        if (!validation.isValid && !validateOnly) {
          this.logger.warn('Skipping invalid content', {
            sourceId: source.id,
            itemId: item.id,
            issues: validation.issues,
          });
          continue;
        }

        // Generate embedding if not validation-only
        let embedding: number[] | undefined;
        if (!validateOnly && validation.isValid) {
          const embeddingResult = await this.aiSearchService.generateEmbedding(
            validation.sanitizedContent,
            {
              vendorType: validation.weddingRelevance.vendorTypes[0],
              category: transformed.category,
            },
          );
          embedding = embeddingResult.embedding;
        }

        const processedItem: ContentItem = {
          id: `${source.id}_${item.id}`,
          sourceId: source.id,
          externalId: item.id,
          title: transformed.title || 'Untitled',
          content: validation.sanitizedContent,
          contentType: transformed.contentType || 'plain',
          category: transformed.category || 'general',
          tags: transformed.tags || [],
          metadata: transformed.metadata || {
            lastModified: new Date().toISOString(),
          },
          weddingRelevance: validation.weddingRelevance,
          validationStatus: validation.isValid ? 'valid' : 'invalid',
          embedding,
        };

        processedItems.push(processedItem);
      } catch (error) {
        this.logger.error('Failed to process content item', {
          sourceId: source.id,
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return processedItems;
  }

  private sanitizeContent(content: string): string {
    // Basic HTML/script tag removal and sanitization
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  private async analyzeWeddingRelevance(
    content: string,
  ): Promise<ContentItem['weddingRelevance']> {
    // Simplified analysis - would use AI service in real implementation
    const text = content.toLowerCase();
    const weddingKeywordCount = this.WEDDING_KEYWORDS.filter((keyword) =>
      text.includes(keyword),
    ).length;

    const confidence = Math.min(weddingKeywordCount / 5, 1); // Max 5 keywords for full confidence
    const isRelevant = confidence > 0.2;

    return {
      isRelevant,
      vendorTypes: this.extractVendorTypes(text),
      confidence,
      reasoning: `Found ${weddingKeywordCount} wedding-related keywords`,
    };
  }

  private extractVendorTypes(text: string): string[] {
    const vendorKeywords = {
      photographer: ['photo', 'picture', 'shoot', 'album', 'portrait'],
      venue: ['venue', 'location', 'hall', 'garden', 'ballroom'],
      florist: ['flower', 'bouquet', 'arrangement', 'floral'],
      caterer: ['food', 'catering', 'menu', 'dining', 'cuisine'],
      dj: ['music', 'dj', 'sound', 'playlist', 'dance'],
      planner: ['planning', 'coordinator', 'timeline', 'schedule'],
    };

    const vendorTypes: string[] = [];
    for (const [vendor, keywords] of Object.entries(vendorKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        vendorTypes.push(vendor);
      }
    }

    return vendorTypes;
  }

  private extractAndEnhanceTags(
    content: string,
    existingTags: string[],
  ): string[] {
    const tags = new Set(existingTags);

    // Extract hashtags
    const hashtagMatches = content.match(/#(\w+)/g) || [];
    hashtagMatches.forEach((tag) => tags.add(tag.substring(1).toLowerCase()));

    // Add wedding-specific tags based on content analysis
    const text = content.toLowerCase();
    this.WEDDING_KEYWORDS.forEach((keyword) => {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags);
  }

  private recordSyncResult(sourceId: string, result: SyncResult): void {
    if (!this.syncStats.has(sourceId)) {
      this.syncStats.set(sourceId, []);
    }

    const results = this.syncStats.get(sourceId)!;
    results.push(result);

    // Keep only last 100 results
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }
  }

  private getScheduleInterval(frequency: string): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  // Content transformation methods for different source types
  private async transformGitHubContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.name || content.path?.split('/').pop(),
      content: content.content || '',
      contentType: content.name?.endsWith('.md') ? 'markdown' : 'plain',
      category: 'documentation',
      metadata: {
        author: content.author?.name,
        lastModified: content.updated_at,
        url: content.html_url,
        path: content.path,
      },
    };
  }

  private async transformConfluenceContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.title,
      content: content.body?.storage?.value || content.content,
      contentType: 'html',
      category: content.type === 'page' ? 'documentation' : 'blog',
      metadata: {
        author: content.history?.createdBy?.displayName,
        lastModified: content.history?.when,
        url: content._links?.webui,
        version: content.version?.number.toString(),
      },
    };
  }

  private async transformNotionContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.properties?.title?.title?.[0]?.text?.content || 'Untitled',
      content: content.content || '',
      contentType: 'plain',
      category: 'knowledge',
      metadata: {
        lastModified: content.last_edited_time,
        url: content.url,
      },
    };
  }

  private async transformDocumentationContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.title,
      content: content.content,
      contentType: content.format === 'html' ? 'html' : 'markdown',
      category: 'documentation',
      metadata: {
        lastModified: content.lastModified,
        url: content.url,
      },
    };
  }

  private async transformRSSContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.title,
      content: content.description || content.content,
      contentType: 'html',
      category: 'blog',
      metadata: {
        author: content.author,
        lastModified: content.pubDate,
        url: content.link,
      },
    };
  }

  private async transformAPIContent(
    content: any,
  ): Promise<Partial<ContentItem>> {
    return {
      title: content.title || content.name,
      content: JSON.stringify(content.data || content, null, 2),
      contentType: 'json',
      category: 'api',
      metadata: {
        lastModified: content.updated_at || new Date().toISOString(),
        url: content.url,
      },
    };
  }

  // Mock database operations
  private async storeContentInDatabase(
    items: ContentItem[],
    sourceId: string,
  ): Promise<{ added: number; updated: number; skipped: number }> {
    // This would implement actual database storage with Supabase
    return {
      added: items.filter((i) => i.validationStatus === 'valid').length,
      updated: 0,
      skipped: items.filter((i) => i.validationStatus !== 'valid').length,
    };
  }

  private async updateSourceLastSync(sourceId: string): Promise<void> {
    // This would update the content source record in the database
  }
}

export default ContentSyncService;
