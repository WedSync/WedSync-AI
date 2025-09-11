/**
 * Content Distribution Service
 * Intelligent article distribution to client dashboards based on wedding characteristics
 * Team C Round 3 - WS-069: Educational Content Management
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  differenceInDays,
  differenceInMonths,
  format,
  parseISO,
} from 'date-fns';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import type {
  Article,
  ContentDistributionRule,
  ContentDistributionResponse,
  RecommendedArticle,
  DistributionReason,
  EngagementPrediction,
  DistributionConditionType,
  WeddingType,
  ClientSegment,
} from '@/types/articles';

interface ClientWeddingData {
  id: string;
  user_id: string;
  wedding_date: string;
  budget_range: string;
  guest_count: number;
  venue_type: string;
  wedding_style: WeddingType;
  planning_stage: string;
  client_tags: string[];
  preferences: {
    vendor_categories: string[];
    style_preferences: string[];
    priority_areas: string[];
  };
  engagement_history: {
    articles_viewed: string[];
    articles_shared: string[];
    avg_read_time: number;
    preferred_content_types: string[];
  };
}

export class ContentDistributionService {
  private supabase = createClientComponentClient();

  /**
   * Get intelligent article recommendations for a client
   */
  async getRecommendedArticles(
    clientId: string,
  ): Promise<ContentDistributionResponse> {
    const startTime = Date.now();

    try {
      // Get client wedding data and preferences
      const clientData = await this.getClientWeddingData(clientId);
      if (!clientData) {
        throw new Error('Client data not found');
      }

      // Get published articles with distribution rules
      const articles = await this.getPublishedArticles();

      // Calculate recommendations
      const recommendations = await this.calculateRecommendations(
        clientData,
        articles,
      );

      // Generate engagement predictions
      const engagementPredictions = await this.predictEngagement(
        clientData,
        recommendations,
      );

      // Log successful distribution
      metrics.recordHistogram(
        'content.distribution.duration',
        Date.now() - startTime,
      );
      metrics.incrementCounter('content.distribution.success', 1, {
        client_id: clientId,
        recommendations_count: recommendations.length,
      });

      logger.info('Content distribution completed', {
        clientId,
        recommendationsCount: recommendations.length,
        duration: Date.now() - startTime,
      });

      return {
        client_id: clientId,
        recommended_articles: recommendations,
        distribution_reasons: this.extractDistributionReasons(recommendations),
        engagement_predictions: engagementPredictions,
      };
    } catch (error) {
      metrics.incrementCounter('content.distribution.error', 1, {
        client_id: clientId,
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      logger.error('Content distribution failed', error as Error, { clientId });
      throw error;
    }
  }

  /**
   * Calculate article recommendations based on client characteristics
   */
  private async calculateRecommendations(
    clientData: ClientWeddingData,
    articles: Article[],
  ): Promise<RecommendedArticle[]> {
    const recommendations: RecommendedArticle[] = [];

    for (const article of articles) {
      const relevanceScore = await this.calculateRelevanceScore(
        clientData,
        article,
      );

      if (relevanceScore > 0.3) {
        // Minimum threshold for relevance
        const matchReasons = this.getMatchReasons(clientData, article);
        const optimalDeliveryTime = this.calculateOptimalDeliveryTime(
          clientData,
          article,
        );

        recommendations.push({
          article,
          relevance_score: relevanceScore,
          match_reasons: matchReasons,
          optimal_delivery_time: optimalDeliveryTime,
        });
      }
    }

    // Sort by relevance score and return top recommendations
    return recommendations
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Calculate relevance score for an article based on client data
   */
  private async calculateRelevanceScore(
    clientData: ClientWeddingData,
    article: Article,
  ): Promise<number> {
    let score = 0;
    const weights = {
      weddingDate: 0.25,
      budgetRange: 0.15,
      weddingStyle: 0.2,
      planningStage: 0.15,
      guestCount: 0.1,
      venueType: 0.1,
      previousEngagement: 0.05,
    };

    // Wedding date relevance
    score +=
      this.calculateDateRelevance(clientData, article) * weights.weddingDate;

    // Budget range relevance
    score +=
      this.calculateBudgetRelevance(clientData, article) * weights.budgetRange;

    // Wedding style relevance
    score +=
      this.calculateStyleRelevance(clientData, article) * weights.weddingStyle;

    // Planning stage relevance
    score +=
      this.calculatePlanningStageRelevance(clientData, article) *
      weights.planningStage;

    // Guest count relevance
    score +=
      this.calculateGuestCountRelevance(clientData, article) *
      weights.guestCount;

    // Venue type relevance
    score +=
      this.calculateVenueTypeRelevance(clientData, article) * weights.venueType;

    // Previous engagement relevance
    score +=
      this.calculateEngagementRelevance(clientData, article) *
      weights.previousEngagement;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calculate date-based relevance (seasonal content, timeline-based)
   */
  private calculateDateRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    const weddingDate = parseISO(clientData.wedding_date);
    const now = new Date();
    const daysUntilWedding = differenceInDays(weddingDate, now);
    const weddingMonth = weddingDate.getMonth() + 1;

    let score = 0;

    // Check for season-based content
    const seasons = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      fall: [9, 10, 11],
      winter: [12, 1, 2],
    };

    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(weddingMonth)) {
        const seasonKeywords = [
          `${season} wedding`,
          `${season} flowers`,
          `${season} venue`,
        ];
        if (
          seasonKeywords.some(
            (keyword) =>
              article.title.toLowerCase().includes(keyword.toLowerCase()) ||
              article.content_html
                .toLowerCase()
                .includes(keyword.toLowerCase()),
          )
        ) {
          score += 0.8;
        }
      }
    }

    // Check for month-specific content
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    const weddingMonthName = monthNames[weddingMonth - 1];

    if (
      article.title.toLowerCase().includes(weddingMonthName) ||
      article.content_html.toLowerCase().includes(weddingMonthName)
    ) {
      score += 0.9;
    }

    // Timeline-based relevance
    if (daysUntilWedding > 365) {
      // Early planning stage
      if (
        article.tags.includes('early-planning') ||
        article.title.toLowerCase().includes('planning timeline')
      ) {
        score += 0.7;
      }
    } else if (daysUntilWedding > 180) {
      // Mid planning stage
      if (
        article.tags.includes('vendor-selection') ||
        article.title.toLowerCase().includes('vendor')
      ) {
        score += 0.8;
      }
    } else if (daysUntilWedding > 60) {
      // Final details stage
      if (
        article.tags.includes('final-details') ||
        article.title.toLowerCase().includes('timeline')
      ) {
        score += 0.9;
      }
    }

    return score;
  }

  /**
   * Calculate budget-based relevance
   */
  private calculateBudgetRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    const budgetKeywords = {
      'budget-friendly': ['budget', 'affordable', 'cost-effective', 'savings'],
      'mid-range': ['moderate', 'reasonable', 'value'],
      luxury: ['luxury', 'premium', 'high-end', 'exclusive'],
    };

    let score = 0;
    const clientBudgetRange = clientData.budget_range.toLowerCase();

    if (budgetKeywords[clientBudgetRange as keyof typeof budgetKeywords]) {
      const keywords =
        budgetKeywords[clientBudgetRange as keyof typeof budgetKeywords];

      keywords.forEach((keyword) => {
        if (
          article.title.toLowerCase().includes(keyword) ||
          article.content_html.toLowerCase().includes(keyword) ||
          article.tags.includes(keyword)
        ) {
          score += 0.3;
        }
      });
    }

    return Math.min(1, score);
  }

  /**
   * Calculate wedding style relevance
   */
  private calculateStyleRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    let score = 0;
    const weddingStyle = clientData.wedding_style.toLowerCase();

    // Direct style match
    if (article.target_wedding_types.includes(clientData.wedding_style)) {
      score += 0.9;
    }

    // Keyword-based style matching
    if (
      article.title.toLowerCase().includes(weddingStyle) ||
      article.content_html.toLowerCase().includes(weddingStyle) ||
      article.tags.includes(weddingStyle)
    ) {
      score += 0.8;
    }

    // Style-related keyword matching
    const styleKeywords = {
      traditional: ['classic', 'timeless', 'elegant', 'formal'],
      modern: ['contemporary', 'minimalist', 'sleek', 'trendy'],
      rustic: ['barn', 'country', 'vintage', 'natural'],
      beach: ['coastal', 'seaside', 'nautical', 'tropical'],
      garden: ['outdoor', 'botanical', 'floral', 'natural'],
      destination: ['travel', 'exotic', 'international', 'resort'],
      intimate: ['small', 'cozy', 'private', 'family'],
      luxury: ['upscale', 'glamorous', 'opulent', 'lavish'],
    };

    const relatedKeywords =
      styleKeywords[weddingStyle as keyof typeof styleKeywords] || [];
    relatedKeywords.forEach((keyword) => {
      if (
        article.title.toLowerCase().includes(keyword) ||
        article.content_html.toLowerCase().includes(keyword)
      ) {
        score += 0.2;
      }
    });

    return Math.min(1, score);
  }

  /**
   * Calculate planning stage relevance
   */
  private calculatePlanningStageRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    const planningStageKeywords = {
      early: ['planning', 'checklist', 'timeline', 'getting started'],
      venue: ['venue', 'location', 'booking', 'site'],
      vendors: ['vendor', 'photographer', 'caterer', 'florist', 'DJ'],
      details: ['details', 'decorations', 'favors', 'stationery'],
      final: ['final', 'week of', 'day of', 'rehearsal'],
    };

    let score = 0;
    const stage = clientData.planning_stage.toLowerCase();

    if (planningStageKeywords[stage as keyof typeof planningStageKeywords]) {
      const keywords =
        planningStageKeywords[stage as keyof typeof planningStageKeywords];

      keywords.forEach((keyword) => {
        if (
          article.title.toLowerCase().includes(keyword) ||
          article.tags.includes(keyword)
        ) {
          score += 0.4;
        }
      });
    }

    return Math.min(1, score);
  }

  /**
   * Calculate guest count relevance
   */
  private calculateGuestCountRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    let score = 0;
    const guestCount = clientData.guest_count;

    if (guestCount <= 50) {
      if (
        article.title.toLowerCase().includes('intimate') ||
        article.title.toLowerCase().includes('small') ||
        article.tags.includes('intimate-wedding')
      ) {
        score += 0.8;
      }
    } else if (guestCount <= 150) {
      if (
        article.title.toLowerCase().includes('medium') ||
        article.title.toLowerCase().includes('traditional')
      ) {
        score += 0.6;
      }
    } else {
      if (
        article.title.toLowerCase().includes('large') ||
        article.title.toLowerCase().includes('grand') ||
        article.tags.includes('large-wedding')
      ) {
        score += 0.8;
      }
    }

    return score;
  }

  /**
   * Calculate venue type relevance
   */
  private calculateVenueTypeRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    let score = 0;
    const venueType = clientData.venue_type.toLowerCase();

    if (
      article.title.toLowerCase().includes(venueType) ||
      article.content_html.toLowerCase().includes(venueType) ||
      article.tags.includes(venueType)
    ) {
      score += 0.8;
    }

    return score;
  }

  /**
   * Calculate engagement-based relevance
   */
  private calculateEngagementRelevance(
    clientData: ClientWeddingData,
    article: Article,
  ): number {
    let score = 0;
    const engagement = clientData.engagement_history;

    // Check if similar articles were previously engaged with
    const articleCategories = article.category_ids;
    const preferredTypes = engagement.preferred_content_types;

    if (preferredTypes.some((type) => articleCategories.includes(type))) {
      score += 0.6;
    }

    // Boost score if article hasn't been viewed yet
    if (!engagement.articles_viewed.includes(article.id)) {
      score += 0.4;
    }

    return score;
  }

  /**
   * Get match reasons for an article recommendation
   */
  private getMatchReasons(
    clientData: ClientWeddingData,
    article: Article,
  ): string[] {
    const reasons: string[] = [];
    const weddingDate = parseISO(clientData.wedding_date);
    const weddingMonth = format(weddingDate, 'MMMM');

    // Seasonal matching
    if (article.title.toLowerCase().includes(weddingMonth.toLowerCase())) {
      reasons.push(`Perfect for ${weddingMonth} weddings`);
    }

    // Style matching
    if (article.target_wedding_types.includes(clientData.wedding_style)) {
      reasons.push(`Matches your ${clientData.wedding_style} wedding style`);
    }

    // Budget matching
    if (article.tags.includes(clientData.budget_range)) {
      reasons.push(`Fits your budget range`);
    }

    // Planning stage matching
    if (article.tags.includes(clientData.planning_stage)) {
      reasons.push(`Relevant to your current planning stage`);
    }

    // Guest count matching
    const guestCount = clientData.guest_count;
    if (
      (guestCount <= 50 && article.tags.includes('intimate-wedding')) ||
      (guestCount > 150 && article.tags.includes('large-wedding'))
    ) {
      reasons.push(`Suitable for your guest count (${guestCount})`);
    }

    return reasons;
  }

  /**
   * Calculate optimal delivery time for an article
   */
  private calculateOptimalDeliveryTime(
    clientData: ClientWeddingData,
    article: Article,
  ): string | undefined {
    const weddingDate = parseISO(clientData.wedding_date);
    const now = new Date();
    const daysUntilWedding = differenceInDays(weddingDate, now);

    // Time-sensitive content
    if (article.tags.includes('seasonal') && daysUntilWedding > 90) {
      return format(
        new Date(weddingDate.getTime() - 90 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd'T'09:00:00.000'Z'",
      );
    }

    if (article.tags.includes('early-planning') && daysUntilWedding > 180) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next week
    }

    return undefined;
  }

  /**
   * Extract distribution reasons from recommendations
   */
  private extractDistributionReasons(
    recommendations: RecommendedArticle[],
  ): DistributionReason[] {
    const reasons: DistributionReason[] = [];

    recommendations.forEach((rec) => {
      rec.match_reasons.forEach((reason, index) => {
        reasons.push({
          rule_id: `rule_${rec.article.id}_${index}`,
          condition_matched: reason,
          weight: rec.relevance_score,
          explanation: reason,
        });
      });
    });

    return reasons;
  }

  /**
   * Predict engagement scores for recommended articles
   */
  private async predictEngagement(
    clientData: ClientWeddingData,
    recommendations: RecommendedArticle[],
  ): Promise<EngagementPrediction[]> {
    const predictions: EngagementPrediction[] = [];

    for (const rec of recommendations) {
      // Simple engagement prediction based on relevance and historical data
      let engagementScore = rec.relevance_score * 100;

      // Adjust based on historical engagement
      const avgReadTime = clientData.engagement_history.avg_read_time;
      if (avgReadTime > 300) {
        // High engagement user
        engagementScore *= 1.2;
      } else if (avgReadTime < 120) {
        // Low engagement user
        engagementScore *= 0.8;
      }

      // Adjust based on article characteristics
      if (rec.article.reading_time_minutes > 10) {
        engagementScore *= 0.9; // Longer articles might have lower engagement
      }

      const factors = [
        'Relevance to wedding style',
        'Seasonal timing',
        'Planning stage match',
        'Historical engagement patterns',
      ];

      predictions.push({
        article_id: rec.article.id,
        predicted_engagement_score: Math.min(100, Math.max(0, engagementScore)),
        confidence_level: rec.relevance_score * 90 + 10, // 10-100% confidence
        factors,
      });
    }

    return predictions;
  }

  /**
   * Get client wedding data from database
   */
  private async getClientWeddingData(
    clientId: string,
  ): Promise<ClientWeddingData | null> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select(
          `
          *,
          wedding_details (*),
          client_preferences (*),
          engagement_analytics (*)
        `,
        )
        .eq('id', clientId)
        .single();

      if (error || !data) {
        logger.warn('Client data not found', { clientId, error });
        return null;
      }

      // Transform database data to ClientWeddingData format
      return {
        id: data.id,
        user_id: data.user_id,
        wedding_date: data.wedding_details?.wedding_date || data.wedding_date,
        budget_range: data.wedding_details?.budget_range || 'mid-range',
        guest_count: data.wedding_details?.guest_count || 100,
        venue_type: data.wedding_details?.venue_type || 'indoor',
        wedding_style: data.wedding_details?.wedding_style || 'traditional',
        planning_stage: data.planning_stage || 'early',
        client_tags: data.tags || [],
        preferences: {
          vendor_categories: data.client_preferences?.vendor_categories || [],
          style_preferences: data.client_preferences?.style_preferences || [],
          priority_areas: data.client_preferences?.priority_areas || [],
        },
        engagement_history: {
          articles_viewed: data.engagement_analytics?.articles_viewed || [],
          articles_shared: data.engagement_analytics?.articles_shared || [],
          avg_read_time: data.engagement_analytics?.avg_read_time || 180,
          preferred_content_types:
            data.engagement_analytics?.preferred_content_types || [],
        },
      };
    } catch (error) {
      logger.error('Failed to get client wedding data', error as Error, {
        clientId,
      });
      return null;
    }
  }

  /**
   * Get published articles with distribution rules
   */
  private async getPublishedArticles(): Promise<Article[]> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get published articles', error as Error);
      throw error;
    }
  }

  /**
   * Bulk update article distribution for multiple clients
   */
  async bulkUpdateDistribution(clientIds: string[]): Promise<void> {
    const startTime = Date.now();

    try {
      const promises = clientIds.map((clientId) =>
        this.getRecommendedArticles(clientId),
      );
      await Promise.all(promises);

      metrics.recordHistogram(
        'content.bulk_distribution.duration',
        Date.now() - startTime,
      );
      metrics.incrementCounter('content.bulk_distribution.success', 1, {
        client_count: clientIds.length,
      });

      logger.info('Bulk content distribution completed', {
        clientCount: clientIds.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      metrics.incrementCounter('content.bulk_distribution.error', 1, {
        client_count: clientIds.length,
      });

      logger.error('Bulk content distribution failed', error as Error, {
        clientIds: clientIds.slice(0, 5), // Log first 5 for debugging
      });
      throw error;
    }
  }
}

// Export singleton instance
export const contentDistributionService = new ContentDistributionService();
