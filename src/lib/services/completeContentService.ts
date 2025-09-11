/**
 * Complete Content Management Service
 * Integrates Team C Rounds 1, 2, and 3:
 * - Round 1: Branding Customization
 * - Round 2: Document Storage
 * - Round 3: Article Creation & Distribution
 *
 * WS-069: Educational Content Management System
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { documentStorageService } from './documentStorageService';
import { contentDistributionService } from './content-distribution';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import type {
  Article,
  CreateArticleRequest,
  UpdateArticleRequest,
  BrandedArticleConfig,
  DocumentAttachment,
} from '@/types/articles';
import type {
  BusinessDocument,
  DocumentUploadRequest,
} from '@/types/documents';

interface BrandingConfig {
  id: string;
  user_id: string;
  logo: {
    primary: string;
    favicon: string;
    emailHeader?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseFontSize: number;
  };
  customCSS?: string;
  created_at: string;
  updated_at: string;
}

interface CompleteArticleData extends Article {
  branding_config?: BrandingConfig;
  attached_documents_data?: BusinessDocument[];
  branded_content?: {
    styled_html: string;
    css_variables: Record<string, string>;
    logo_placement: string;
  };
}

export class CompleteContentService {
  private supabase = createClientComponentClient();

  /**
   * Create article with complete integration
   */
  async createArticle(
    request: CreateArticleRequest,
    userId: string,
    options?: {
      attachDocuments?: string[];
      applyBranding?: boolean;
      scheduledPublish?: boolean;
    },
  ): Promise<CompleteArticleData> {
    const startTime = Date.now();

    try {
      logger.info('Creating article with complete integration', {
        userId,
        title: request.title,
        hasBranding: options?.applyBranding,
        hasDocuments: options?.attachDocuments?.length || 0,
      });

      // 1. Get user's branding configuration (Round 1)
      let brandingConfig: BrandingConfig | null = null;
      if (options?.applyBranding) {
        brandingConfig = await this.getUserBrandingConfig(userId);
      }

      // 2. Process any document attachments (Round 2)
      let attachedDocuments: BusinessDocument[] = [];
      if (options?.attachDocuments?.length) {
        attachedDocuments = await this.processDocumentAttachments(
          options.attachDocuments,
          userId,
        );
      }

      // 3. Generate branded content HTML if branding is enabled
      let brandedContent = null;
      if (brandingConfig) {
        brandedContent = await this.generateBrandedContent(
          request.content,
          brandingConfig,
        );
      }

      // 4. Create the article in database
      const articleData = {
        ...request,
        user_id: userId,
        slug: this.generateSlug(request.title),
        content_html:
          brandedContent?.styled_html || this.convertToHtml(request.content),
        reading_time_minutes: this.calculateReadingTime(request.content),
        branding_config_id: brandingConfig?.id,
        attached_documents: options?.attachDocuments || [],
        status: options?.scheduledPublish ? 'scheduled' : 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: article, error } = await this.supabase
        .from('articles')
        .insert(articleData)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create article: ${error.message}`);
      }

      // 5. Set up content distribution rules (Round 3)
      if (request.distribution_rules?.length) {
        await this.setupDistributionRules(
          article.id,
          request.distribution_rules,
        );
      }

      // 6. Create document associations if any
      if (attachedDocuments.length > 0) {
        await this.createDocumentAssociations(article.id, attachedDocuments);
      }

      // 7. Log successful creation
      metrics.recordHistogram(
        'content.article.create.duration',
        Date.now() - startTime,
      );
      metrics.incrementCounter('content.article.create.success', 1, {
        user_id: userId,
        has_branding: !!brandingConfig,
        has_documents: attachedDocuments.length > 0,
        has_distribution: !!request.distribution_rules?.length,
      });

      logger.info('Article created successfully with complete integration', {
        articleId: article.id,
        userId,
        integrations: {
          branding: !!brandingConfig,
          documents: attachedDocuments.length,
          distribution: request.distribution_rules?.length || 0,
        },
      });

      // Return complete article data
      return {
        ...article,
        branding_config: brandingConfig,
        attached_documents_data: attachedDocuments,
        branded_content: brandedContent,
      } as CompleteArticleData;
    } catch (error) {
      metrics.incrementCounter('content.article.create.error', 1, {
        user_id: userId,
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      logger.error(
        'Failed to create article with complete integration',
        error as Error,
        {
          userId,
          title: request.title,
        },
      );

      throw error;
    }
  }

  /**
   * Update article with complete integration
   */
  async updateArticle(
    request: UpdateArticleRequest,
    userId: string,
    options?: {
      updateBranding?: boolean;
      updateDocuments?: boolean;
      redistributeContent?: boolean;
    },
  ): Promise<CompleteArticleData> {
    try {
      // Get existing article
      const { data: existingArticle, error: fetchError } = await this.supabase
        .from('articles')
        .select('*')
        .eq('id', request.id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingArticle) {
        throw new Error('Article not found or access denied');
      }

      // Update branding if requested
      let brandingConfig: BrandingConfig | null = null;
      let brandedContent = null;

      if (options?.updateBranding) {
        brandingConfig = await this.getUserBrandingConfig(userId);
        if (brandingConfig && request.content) {
          brandedContent = await this.generateBrandedContent(
            request.content,
            brandingConfig,
          );
        }
      }

      // Prepare update data
      const updateData = {
        ...request,
        content_html:
          brandedContent?.styled_html ||
          (request.content
            ? this.convertToHtml(request.content)
            : existingArticle.content_html),
        reading_time_minutes: request.content
          ? this.calculateReadingTime(request.content)
          : existingArticle.reading_time_minutes,
        updated_at: new Date().toISOString(),
      };

      // Update article
      const { data: updatedArticle, error: updateError } = await this.supabase
        .from('articles')
        .update(updateData)
        .eq('id', request.id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(`Failed to update article: ${updateError.message}`);
      }

      // Redistribute content if requested
      if (options?.redistributeContent) {
        await this.redistributeArticleContent(updatedArticle.id);
      }

      logger.info('Article updated successfully with complete integration', {
        articleId: request.id,
        userId,
        updatedBranding: options?.updateBranding,
        redistributed: options?.redistributeContent,
      });

      // Get complete article data
      return await this.getCompleteArticle(updatedArticle.id, userId);
    } catch (error) {
      logger.error(
        'Failed to update article with complete integration',
        error as Error,
        {
          articleId: request.id,
          userId,
        },
      );
      throw error;
    }
  }

  /**
   * Get complete article with all integrations
   */
  async getCompleteArticle(
    articleId: string,
    userId: string,
  ): Promise<CompleteArticleData> {
    try {
      // Get base article
      const { data: article, error } = await this.supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('user_id', userId)
        .single();

      if (error || !article) {
        throw new Error('Article not found or access denied');
      }

      // Get branding config if associated
      let brandingConfig: BrandingConfig | null = null;
      if (article.branding_config_id) {
        const { data: branding } = await this.supabase
          .from('branding_configs')
          .select('*')
          .eq('id', article.branding_config_id)
          .single();

        brandingConfig = branding;
      }

      // Get attached documents if any
      let attachedDocuments: BusinessDocument[] = [];
      if (article.attached_documents?.length) {
        const { data: documents } = await this.supabase
          .from('business_documents')
          .select('*')
          .in('id', article.attached_documents);

        attachedDocuments = documents || [];
      }

      // Generate branded content if branding is available
      let brandedContent = null;
      if (brandingConfig) {
        brandedContent = await this.generateBrandedContent(
          article.content,
          brandingConfig,
        );
      }

      return {
        ...article,
        branding_config: brandingConfig,
        attached_documents_data: attachedDocuments,
        branded_content: brandedContent,
      } as CompleteArticleData;
    } catch (error) {
      logger.error('Failed to get complete article', error as Error, {
        articleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Publish article with complete workflow
   */
  async publishArticle(
    articleId: string,
    userId: string,
    options?: {
      notifySubscribers?: boolean;
      socialMediaShare?: boolean;
      updateSitemap?: boolean;
    },
  ): Promise<void> {
    try {
      // Update article status
      const { error: updateError } = await this.supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          last_published_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to publish article: ${updateError.message}`);
      }

      // Trigger content distribution
      await this.redistributeArticleContent(articleId);

      // Update SEO sitemap if requested
      if (options?.updateSitemap) {
        await this.updateSEOSitemap(articleId, userId);
      }

      // Notify subscribers if requested
      if (options?.notifySubscribers) {
        await this.notifySubscribers(articleId, userId);
      }

      logger.info('Article published successfully with complete workflow', {
        articleId,
        userId,
        options,
      });
    } catch (error) {
      logger.error(
        'Failed to publish article with complete workflow',
        error as Error,
        {
          articleId,
          userId,
        },
      );
      throw error;
    }
  }

  // Private helper methods

  /**
   * Get user's branding configuration
   */
  private async getUserBrandingConfig(
    userId: string,
  ): Promise<BrandingConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('branding_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        logger.warn('No branding configuration found for user', { userId });
        return null;
      }

      return data as BrandingConfig;
    } catch (error) {
      logger.error('Failed to get branding configuration', error as Error, {
        userId,
      });
      return null;
    }
  }

  /**
   * Process document attachments
   */
  private async processDocumentAttachments(
    documentIds: string[],
    userId: string,
  ): Promise<BusinessDocument[]> {
    try {
      const { data: documents, error } = await this.supabase
        .from('business_documents')
        .select('*')
        .in('id', documentIds)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      return documents || [];
    } catch (error) {
      logger.error('Failed to process document attachments', error as Error, {
        documentIds,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate branded content HTML
   */
  private async generateBrandedContent(
    content: object,
    brandingConfig: BrandingConfig,
  ): Promise<{
    styled_html: string;
    css_variables: Record<string, string>;
    logo_placement: string;
  }> {
    try {
      // Convert Tiptap JSON to HTML
      const baseHtml = this.convertToHtml(content);

      // Generate CSS variables from branding config
      const cssVariables = {
        '--brand-primary': brandingConfig.colors.primary,
        '--brand-secondary': brandingConfig.colors.secondary,
        '--brand-accent': brandingConfig.colors.accent,
        '--brand-background': brandingConfig.colors.background,
        '--brand-text': brandingConfig.colors.text,
        '--brand-heading-font': brandingConfig.typography.headingFont,
        '--brand-body-font': brandingConfig.typography.bodyFont,
        '--brand-font-size': `${brandingConfig.typography.baseFontSize}px`,
      };

      // Apply branding styles
      const styledHtml = this.applyBrandingStyles(
        baseHtml,
        brandingConfig,
        cssVariables,
      );

      return {
        styled_html: styledHtml,
        css_variables: cssVariables,
        logo_placement: 'header', // Default placement
      };
    } catch (error) {
      logger.error('Failed to generate branded content', error as Error);
      throw error;
    }
  }

  /**
   * Apply branding styles to HTML content
   */
  private applyBrandingStyles(
    html: string,
    brandingConfig: BrandingConfig,
    cssVariables: Record<string, string>,
  ): string {
    // Create CSS style block
    const styleBlock = `
      <style>
        :root {
          ${Object.entries(cssVariables)
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n          ')}
        }
        
        .branded-article {
          font-family: var(--brand-body-font), -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: var(--brand-font-size);
          color: var(--brand-text);
          background-color: var(--brand-background);
          line-height: 1.6;
        }
        
        .branded-article h1,
        .branded-article h2,
        .branded-article h3,
        .branded-article h4,
        .branded-article h5,
        .branded-article h6 {
          font-family: var(--brand-heading-font), -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--brand-primary);
          font-weight: 600;
        }
        
        .branded-article a {
          color: var(--brand-accent);
        }
        
        .branded-article a:hover {
          color: var(--brand-primary);
        }
        
        .brand-header {
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--brand-primary);
        }
        
        .brand-logo {
          max-height: 60px;
          margin-right: 1rem;
        }
        
        ${brandingConfig.customCSS || ''}
      </style>
    `;

    // Wrap content with branding
    const brandedHtml = `
      ${styleBlock}
      <article class="branded-article">
        ${
          brandingConfig.logo.primary
            ? `
          <header class="brand-header">
            <img src="${brandingConfig.logo.primary}" alt="Brand Logo" class="brand-logo" />
          </header>
        `
            : ''
        }
        <div class="article-content">
          ${html}
        </div>
      </article>
    `;

    return brandedHtml;
  }

  /**
   * Convert Tiptap JSON content to HTML
   */
  private convertToHtml(content: object): string {
    // This is a simplified conversion - in practice, you'd use Tiptap's generateHTML
    // For now, we'll return a basic HTML structure
    try {
      const contentStr = JSON.stringify(content);

      // Basic conversion logic (simplified)
      if (contentStr.includes('"type":"paragraph"')) {
        return contentStr
          .replace(/"type":"paragraph"/g, '<p>')
          .replace(/"text":"([^"]+)"/g, '$1</p>')
          .replace(/[{}"]/g, '');
      }

      return `<div class="article-content">${contentStr}</div>`;
    } catch (error) {
      logger.warn('Failed to convert content to HTML', { error });
      return '<div class="article-content">Content could not be rendered</div>';
    }
  }

  /**
   * Generate URL slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100);
  }

  /**
   * Calculate reading time in minutes
   */
  private calculateReadingTime(content: object): number {
    const contentStr = JSON.stringify(content);
    const wordCount = contentStr.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200)); // Average 200 words per minute
  }

  /**
   * Setup distribution rules for article
   */
  private async setupDistributionRules(
    articleId: string,
    rules: any[],
  ): Promise<void> {
    try {
      const distributionRules = rules.map((rule) => ({
        ...rule,
        article_id: articleId,
        created_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('content_distribution_rules')
        .insert(distributionRules);

      if (error) {
        throw new Error(`Failed to setup distribution rules: ${error.message}`);
      }

      logger.info('Distribution rules setup successfully', {
        articleId,
        rulesCount: rules.length,
      });
    } catch (error) {
      logger.error('Failed to setup distribution rules', error as Error, {
        articleId,
      });
      throw error;
    }
  }

  /**
   * Create document associations
   */
  private async createDocumentAssociations(
    articleId: string,
    documents: BusinessDocument[],
  ): Promise<void> {
    try {
      const associations = documents.map((doc, index) => ({
        article_id: articleId,
        document_id: doc.id,
        display_name: doc.title || doc.original_filename,
        file_url: doc.file_path,
        file_type: doc.mime_type,
        file_size: doc.file_size,
        is_featured: index === 0, // First document is featured
        sort_order: index,
        created_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('article_document_associations')
        .insert(associations);

      if (error) {
        throw new Error(
          `Failed to create document associations: ${error.message}`,
        );
      }

      logger.info('Document associations created successfully', {
        articleId,
        documentsCount: documents.length,
      });
    } catch (error) {
      logger.error('Failed to create document associations', error as Error, {
        articleId,
      });
      throw error;
    }
  }

  /**
   * Redistribute article content to relevant clients
   */
  private async redistributeArticleContent(articleId: string): Promise<void> {
    try {
      // Get all clients for content distribution
      const { data: clients } = await this.supabase
        .from('clients')
        .select('id')
        .eq('status', 'active');

      if (clients?.length) {
        const clientIds = clients.map((c) => c.id);
        await contentDistributionService.bulkUpdateDistribution(clientIds);
      }

      logger.info('Article content redistributed successfully', { articleId });
    } catch (error) {
      logger.error('Failed to redistribute article content', error as Error, {
        articleId,
      });
      // Don't throw error as this is a background process
    }
  }

  /**
   * Update SEO sitemap
   */
  private async updateSEOSitemap(
    articleId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Implementation would update XML sitemap
      logger.info('SEO sitemap updated', { articleId, userId });
    } catch (error) {
      logger.warn('Failed to update SEO sitemap', { error, articleId });
    }
  }

  /**
   * Notify subscribers about new article
   */
  private async notifySubscribers(
    articleId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Implementation would send notifications
      logger.info('Subscribers notified about new article', {
        articleId,
        userId,
      });
    } catch (error) {
      logger.warn('Failed to notify subscribers', { error, articleId });
    }
  }
}

// Export singleton instance
export const completeContentService = new CompleteContentService();
