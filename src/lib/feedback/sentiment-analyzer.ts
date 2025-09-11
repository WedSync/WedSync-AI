/**
 * WS-236: User Feedback System - SentimentAnalyzer Service
 *
 * Wedding industry specialized sentiment analysis using OpenAI
 * Analyzes feedback text for sentiment, keywords, themes, and actionable insights
 * with deep understanding of wedding industry terminology and context
 *
 * Features:
 * - Wedding industry specific sentiment analysis
 * - Keyword and theme extraction
 * - Actionable insight identification
 * - Emotional tone detection
 * - Business impact assessment
 * - Multi-language support preparation
 */

import { OpenAIService } from '@/lib/services/openai-service';

// Sentiment analysis types
export interface SentimentAnalysis {
  sentiment: number; // -1.0 (very negative) to 1.0 (very positive)
  confidence: number; // 0.0 to 1.0
  emotionalTone: EmotionalTone;
  keywords: string[];
  themes: string[];
  actionableInsights: string[];
  businessImpact: BusinessImpact;
  weddingContext: WeddingContext;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface EmotionalTone {
  primary: string; // 'positive', 'negative', 'neutral', 'mixed'
  emotions: Array<{
    emotion: string; // 'frustration', 'excitement', 'satisfaction', 'confusion', etc.
    intensity: number; // 0.0 to 1.0
  }>;
}

export interface BusinessImpact {
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectedAreas: string[]; // 'feature_usage', 'customer_satisfaction', 'churn_risk', 'referral_potential'
  recommendedActions: string[];
  timelineForAction: 'immediate' | 'within_24h' | 'within_week' | 'non_urgent';
}

export interface WeddingContext {
  vendorType?: string;
  weddingPhase?: string; // 'planning', 'week_of', 'day_of', 'post_wedding'
  featureMentions: string[]; // Mentioned features or tools
  painPoints: string[]; // Identified pain points
  positives: string[]; // Positive aspects mentioned
  competitorMentions: string[]; // Competitor references
}

export interface BatchSentimentResult {
  analyses: SentimentAnalysis[];
  aggregated: {
    averageSentiment: number;
    sentimentDistribution: Record<string, number>;
    topThemes: Array<{ theme: string; count: number; avgSentiment: number }>;
    topKeywords: Array<{
      keyword: string;
      count: number;
      avgSentiment: number;
    }>;
    urgentItems: SentimentAnalysis[];
    businessPriorities: string[];
  };
}

/**
 * Wedding industry specialized sentiment analyzer
 */
export class SentimentAnalyzer {
  private static instance: SentimentAnalyzer;
  private openAIService: OpenAIService;
  private weddingKeywords: Set<string>;
  private vendorTypes: Set<string>;
  private featureNames: Set<string>;
  private competitorNames: Set<string>;

  static getInstance(): SentimentAnalyzer {
    if (!SentimentAnalyzer.instance) {
      SentimentAnalyzer.instance = new SentimentAnalyzer();
    }
    return SentimentAnalyzer.instance;
  }

  constructor() {
    this.openAIService = new OpenAIService();
    this.initializeWeddingVocabulary();
  }

  /**
   * Initialize wedding industry vocabulary for better analysis
   */
  private initializeWeddingVocabulary(): void {
    this.weddingKeywords = new Set([
      'wedding',
      'bride',
      'groom',
      'couple',
      'ceremony',
      'reception',
      'venue',
      'guest',
      'invitation',
      'rsvp',
      'catering',
      'photography',
      'videography',
      'flowers',
      'music',
      'playlist',
      'timeline',
      'planning',
      'coordinator',
      'planner',
      'vendor',
      'supplier',
      'budget',
      'seating',
      'table',
      'menu',
      'dietary',
      'dance',
      'bouquet',
      'decoration',
      'centerpiece',
      'lighting',
      'sound',
      'microphone',
      'altar',
      'aisle',
      'processional',
      'rehearsal',
      'bachelor',
      'bachelorette',
      'engagement',
      'honeymoon',
      'registry',
      'favor',
      'gift',
      'thank_you',
      'save_the_date',
      'wedding_day',
      'big_day',
    ]);

    this.vendorTypes = new Set([
      'photographer',
      'videographer',
      'planner',
      'coordinator',
      'venue',
      'caterer',
      'florist',
      'dj',
      'band',
      'musician',
      'baker',
      'officiant',
      'transportation',
      'makeup',
      'hair',
      'dress',
      'tuxedo',
      'jewelry',
      'stationery',
      'decorator',
    ]);

    this.featureNames = new Set([
      'form_builder',
      'journey_canvas',
      'client_portal',
      'guest_list',
      'seating_chart',
      'timeline_builder',
      'budget_tracker',
      'vendor_management',
      'communication_hub',
      'pdf_import',
      'email_automation',
      'sms_messaging',
      'payment_tracking',
      'task_management',
      'calendar_integration',
      'photo_gallery',
      'website_builder',
      'analytics_dashboard',
      'mobile_app',
      'offline_mode',
    ]);

    this.competitorNames = new Set([
      'honeybook',
      'allseated',
      'planning_pod',
      'aisle_planner',
      'wedding_wire',
      'the_knot',
      'zola',
      'joy',
      'minted',
      'seventeen_hats',
      'tave',
      'pixiset',
      'shootproof',
      'dubsado',
      'studio_ninja',
      'iris_works',
    ]);
  }

  /**
   * Analyze sentiment of a single piece of feedback text
   */
  async analyze(
    text: string,
    context?: {
      userType?: 'supplier' | 'couple';
      vendorType?: string;
      feedbackType?: string;
      featureName?: string;
    },
  ): Promise<SentimentAnalysis> {
    if (!text || text.trim().length === 0) {
      return this.createEmptyAnalysis();
    }

    console.log('Analyzing feedback sentiment:', {
      textLength: text.length,
      context,
    });

    try {
      // Create comprehensive analysis prompt
      const analysisPrompt = this.createAnalysisPrompt(text, context);

      // Get AI analysis
      const aiAnalysis = await this.openAIService.generateText(analysisPrompt, {
        maxTokens: 800,
        temperature: 0.1, // Low temperature for consistent analysis
        model: 'gpt-4', // Use GPT-4 for better analysis quality
      });

      // Parse and validate AI response
      const parsedAnalysis = await this.parseAIAnalysis(
        aiAnalysis,
        text,
        context,
      );

      console.log('Sentiment analysis completed:', {
        sentiment: parsedAnalysis.sentiment,
        confidence: parsedAnalysis.confidence,
        themes: parsedAnalysis.themes.length,
        urgency: parsedAnalysis.urgency,
      });

      return parsedAnalysis;
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      return this.createFallbackAnalysis(text, context);
    }
  }

  /**
   * Analyze multiple feedback texts in batch
   */
  async analyzeBatch(
    texts: Array<{
      text: string;
      context?: {
        userType?: 'supplier' | 'couple';
        vendorType?: string;
        feedbackType?: string;
        featureName?: string;
      };
    }>,
  ): Promise<BatchSentimentResult> {
    console.log(`Analyzing batch of ${texts.length} feedback items`);

    if (texts.length === 0) {
      return this.createEmptyBatchResult();
    }

    try {
      // Analyze individual texts
      const analyses = await Promise.all(
        texts.map(({ text, context }) => this.analyze(text, context)),
      );

      // Create aggregated analysis
      const aggregated = this.createAggregatedAnalysis(analyses);

      return {
        analyses,
        aggregated,
      };
    } catch (error) {
      console.error('Error in batch sentiment analysis:', error);
      throw new Error(
        `Batch sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create comprehensive analysis prompt for OpenAI
   */
  private createAnalysisPrompt(text: string, context?: any): string {
    const contextInfo = context
      ? `
Context:
- User Type: ${context.userType || 'unknown'}
- Vendor Type: ${context.vendorType || 'unknown'}
- Feedback Type: ${context.feedbackType || 'general'}
- Feature: ${context.featureName || 'general platform'}
`
      : '';

    return `You are an expert in wedding industry feedback analysis. Analyze this feedback and return a detailed JSON analysis.

${contextInfo}

Feedback Text:
"${text}"

Wedding Industry Keywords: ${Array.from(this.weddingKeywords).slice(0, 20).join(', ')}
Wedding Vendor Types: ${Array.from(this.vendorTypes).slice(0, 10).join(', ')}
Platform Features: ${Array.from(this.featureNames).slice(0, 10).join(', ')}

Please analyze and return ONLY valid JSON with this exact structure:

{
  "sentiment": -1.0 to 1.0 (precise decimal),
  "confidence": 0.0 to 1.0,
  "emotionalTone": {
    "primary": "positive|negative|neutral|mixed",
    "emotions": [
      {"emotion": "emotion_name", "intensity": 0.0-1.0}
    ]
  },
  "keywords": ["max 10 important keywords from text"],
  "themes": ["max 5 themes like usability, pricing, support, features, performance"],
  "actionableInsights": ["max 3 specific actionable insights"],
  "businessImpact": {
    "impactLevel": "none|low|medium|high|critical",
    "affectedAreas": ["areas from: feature_usage, customer_satisfaction, churn_risk, referral_potential"],
    "recommendedActions": ["max 3 specific actions"],
    "timelineForAction": "immediate|within_24h|within_week|non_urgent"
  },
  "weddingContext": {
    "vendorType": "detected vendor type or null",
    "weddingPhase": "planning|week_of|day_of|post_wedding or null",
    "featureMentions": ["mentioned features"],
    "painPoints": ["identified pain points"],
    "positives": ["positive aspects mentioned"],
    "competitorMentions": ["competitor names if any"]
  },
  "urgency": "low|medium|high|critical"
}

Focus on:
1. Wedding industry context and terminology
2. Business impact for wedding vendors/couples
3. Feature-specific feedback
4. Emotional undertones related to wedding planning stress
5. Actionable insights for product improvement
6. Urgency based on wedding criticality (wedding day proximity, vendor relationships, etc.)`;
  }

  /**
   * Parse and validate AI analysis response
   */
  private async parseAIAnalysis(
    aiResponse: string,
    originalText: string,
    context?: any,
  ): Promise<SentimentAnalysis> {
    try {
      // Clean response and attempt to parse JSON
      const cleanedResponse = aiResponse.trim();
      let parsed: any;

      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (jsonError) {
        // Try to extract JSON from response if wrapped in other text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      // Validate and sanitize the parsed response
      return this.validateAndSanitizeAnalysis(parsed, originalText, context);
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      console.log('AI Response:', aiResponse);
      return this.createFallbackAnalysis(originalText, context);
    }
  }

  /**
   * Validate and sanitize AI analysis results
   */
  private validateAndSanitizeAnalysis(
    parsed: any,
    originalText: string,
    context?: any,
  ): SentimentAnalysis {
    // Ensure sentiment is valid number between -1 and 1
    const sentiment = Math.max(
      -1,
      Math.min(1, parseFloat(parsed.sentiment) || 0),
    );

    // Ensure confidence is valid
    const confidence = Math.max(
      0,
      Math.min(1, parseFloat(parsed.confidence) || 0.5),
    );

    // Validate emotional tone
    const emotionalTone: EmotionalTone = {
      primary: ['positive', 'negative', 'neutral', 'mixed'].includes(
        parsed.emotionalTone?.primary,
      )
        ? parsed.emotionalTone.primary
        : sentiment > 0.1
          ? 'positive'
          : sentiment < -0.1
            ? 'negative'
            : 'neutral',
      emotions: Array.isArray(parsed.emotionalTone?.emotions)
        ? parsed.emotionalTone.emotions.slice(0, 5).map((e: any) => ({
            emotion: String(e.emotion || 'neutral').toLowerCase(),
            intensity: Math.max(0, Math.min(1, parseFloat(e.intensity) || 0)),
          }))
        : [],
    };

    // Sanitize arrays
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .slice(0, 10)
          .map((k: any) => String(k))
          .filter(Boolean)
      : [];

    const themes = Array.isArray(parsed.themes)
      ? parsed.themes
          .slice(0, 5)
          .map((t: any) => String(t))
          .filter(Boolean)
      : [];

    const actionableInsights = Array.isArray(parsed.actionableInsights)
      ? parsed.actionableInsights
          .slice(0, 3)
          .map((i: any) => String(i))
          .filter(Boolean)
      : [];

    // Validate business impact
    const businessImpact: BusinessImpact = {
      impactLevel: ['none', 'low', 'medium', 'high', 'critical'].includes(
        parsed.businessImpact?.impactLevel,
      )
        ? parsed.businessImpact.impactLevel
        : sentiment < -0.5
          ? 'high'
          : sentiment > 0.5
            ? 'medium'
            : 'low',
      affectedAreas: Array.isArray(parsed.businessImpact?.affectedAreas)
        ? parsed.businessImpact.affectedAreas.slice(0, 4)
        : [],
      recommendedActions: Array.isArray(
        parsed.businessImpact?.recommendedActions,
      )
        ? parsed.businessImpact.recommendedActions
            .slice(0, 3)
            .map((a: any) => String(a))
            .filter(Boolean)
        : [],
      timelineForAction: [
        'immediate',
        'within_24h',
        'within_week',
        'non_urgent',
      ].includes(parsed.businessImpact?.timelineForAction)
        ? parsed.businessImpact.timelineForAction
        : sentiment < -0.6
          ? 'immediate'
          : sentiment < -0.3
            ? 'within_24h'
            : 'within_week',
    };

    // Validate wedding context
    const weddingContext: WeddingContext = {
      vendorType:
        parsed.weddingContext?.vendorType || context?.vendorType || undefined,
      weddingPhase: ['planning', 'week_of', 'day_of', 'post_wedding'].includes(
        parsed.weddingContext?.weddingPhase,
      )
        ? parsed.weddingContext.weddingPhase
        : undefined,
      featureMentions: Array.isArray(parsed.weddingContext?.featureMentions)
        ? parsed.weddingContext.featureMentions.slice(0, 5)
        : [],
      painPoints: Array.isArray(parsed.weddingContext?.painPoints)
        ? parsed.weddingContext.painPoints.slice(0, 5)
        : [],
      positives: Array.isArray(parsed.weddingContext?.positives)
        ? parsed.weddingContext.positives.slice(0, 5)
        : [],
      competitorMentions: Array.isArray(
        parsed.weddingContext?.competitorMentions,
      )
        ? parsed.weddingContext.competitorMentions.slice(0, 3)
        : [],
    };

    // Determine urgency
    const urgency = ['low', 'medium', 'high', 'critical'].includes(
      parsed.urgency,
    )
      ? parsed.urgency
      : this.calculateUrgency(
          sentiment,
          businessImpact.impactLevel,
          weddingContext,
        );

    return {
      sentiment,
      confidence,
      emotionalTone,
      keywords,
      themes,
      actionableInsights,
      businessImpact,
      weddingContext,
      urgency,
    };
  }

  /**
   * Calculate urgency based on multiple factors
   */
  private calculateUrgency(
    sentiment: number,
    impactLevel: string,
    weddingContext: WeddingContext,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical urgency for very negative sentiment with high impact
    if (sentiment <= -0.7 && ['high', 'critical'].includes(impactLevel)) {
      return 'critical';
    }

    // High urgency for negative sentiment with business impact
    if (sentiment <= -0.5 || impactLevel === 'critical') {
      return 'high';
    }

    // High urgency for wedding day issues
    if (
      weddingContext.weddingPhase === 'day_of' ||
      weddingContext.weddingPhase === 'week_of'
    ) {
      return 'high';
    }

    // Medium urgency for moderate negative sentiment or competitor mentions
    if (sentiment <= -0.2 || weddingContext.competitorMentions.length > 0) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Create aggregated analysis from multiple individual analyses
   */
  private createAggregatedAnalysis(
    analyses: SentimentAnalysis[],
  ): BatchSentimentResult['aggregated'] {
    if (analyses.length === 0) {
      return {
        averageSentiment: 0,
        sentimentDistribution: {},
        topThemes: [],
        topKeywords: [],
        urgentItems: [],
        businessPriorities: [],
      };
    }

    // Calculate average sentiment
    const averageSentiment =
      analyses.reduce((sum, a) => sum + a.sentiment, 0) / analyses.length;

    // Calculate sentiment distribution
    const sentimentDistribution = {
      positive: analyses.filter((a) => a.sentiment > 0.1).length,
      neutral: analyses.filter((a) => a.sentiment >= -0.1 && a.sentiment <= 0.1)
        .length,
      negative: analyses.filter((a) => a.sentiment < -0.1).length,
    };

    // Aggregate themes
    const themeCount = new Map<
      string,
      { count: number; sentiments: number[] }
    >();
    analyses.forEach((analysis) => {
      analysis.themes.forEach((theme) => {
        if (!themeCount.has(theme)) {
          themeCount.set(theme, { count: 0, sentiments: [] });
        }
        const themeData = themeCount.get(theme)!;
        themeData.count++;
        themeData.sentiments.push(analysis.sentiment);
      });
    });

    const topThemes = Array.from(themeCount.entries())
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        avgSentiment:
          data.sentiments.reduce((sum, s) => sum + s, 0) /
          data.sentiments.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Aggregate keywords
    const keywordCount = new Map<
      string,
      { count: number; sentiments: number[] }
    >();
    analyses.forEach((analysis) => {
      analysis.keywords.forEach((keyword) => {
        if (!keywordCount.has(keyword)) {
          keywordCount.set(keyword, { count: 0, sentiments: [] });
        }
        const keywordData = keywordCount.get(keyword)!;
        keywordData.count++;
        keywordData.sentiments.push(analysis.sentiment);
      });
    });

    const topKeywords = Array.from(keywordCount.entries())
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        avgSentiment:
          data.sentiments.reduce((sum, s) => sum + s, 0) /
          data.sentiments.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Find urgent items
    const urgentItems = analyses.filter((a) =>
      ['high', 'critical'].includes(a.urgency),
    );

    // Generate business priorities
    const businessPriorities = this.generateBusinessPriorities(
      analyses,
      topThemes,
    );

    return {
      averageSentiment,
      sentimentDistribution,
      topThemes,
      topKeywords,
      urgentItems,
      businessPriorities,
    };
  }

  /**
   * Generate business priorities from analyses
   */
  private generateBusinessPriorities(
    analyses: SentimentAnalysis[],
    topThemes: any[],
  ): string[] {
    const priorities: string[] = [];

    // Priority 1: Address critical/urgent issues
    const criticalCount = analyses.filter(
      (a) => a.urgency === 'critical',
    ).length;
    if (criticalCount > 0) {
      priorities.push(
        `Address ${criticalCount} critical feedback items immediately`,
      );
    }

    // Priority 2: Top negative themes
    const negativeThemes = topThemes.filter(
      (t) => t.avgSentiment < -0.2 && t.count >= 3,
    );
    if (negativeThemes.length > 0) {
      priorities.push(
        `Focus on improving: ${negativeThemes
          .slice(0, 2)
          .map((t) => t.theme)
          .join(', ')}`,
      );
    }

    // Priority 3: Wedding day issues
    const weddingDayIssues = analyses.filter(
      (a) => a.weddingContext.weddingPhase === 'day_of' && a.sentiment < -0.1,
    ).length;
    if (weddingDayIssues > 0) {
      priorities.push(`Resolve ${weddingDayIssues} wedding day related issues`);
    }

    // Priority 4: Feature improvement opportunities
    const featureIssues = analyses.filter(
      (a) => a.weddingContext.featureMentions.length > 0 && a.sentiment < -0.1,
    );
    if (featureIssues.length > 0) {
      const mentionedFeatures = new Set();
      featureIssues.forEach((a) =>
        a.weddingContext.featureMentions.forEach((f) =>
          mentionedFeatures.add(f),
        ),
      );
      priorities.push(
        `Improve features: ${Array.from(mentionedFeatures).slice(0, 3).join(', ')}`,
      );
    }

    // Priority 5: Leverage positive feedback
    const positiveCount = analyses.filter((a) => a.sentiment > 0.5).length;
    if (positiveCount > analyses.length * 0.3) {
      priorities.push(
        `Leverage positive feedback: ${positiveCount} satisfied customers for testimonials/referrals`,
      );
    }

    return priorities.slice(0, 5);
  }

  /**
   * Create fallback analysis when AI analysis fails
   */
  private createFallbackAnalysis(
    text: string,
    context?: any,
  ): SentimentAnalysis {
    // Simple rule-based sentiment analysis as fallback
    const positiveWords = [
      'great',
      'excellent',
      'amazing',
      'love',
      'perfect',
      'wonderful',
      'fantastic',
      'easy',
      'helpful',
    ];
    const negativeWords = [
      'terrible',
      'awful',
      'hate',
      'difficult',
      'confusing',
      'broken',
      'slow',
      'frustrating',
      'bug',
    ];

    const lowerText = text.toLowerCase();
    let sentimentScore = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) sentimentScore += 0.1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) sentimentScore -= 0.1;
    });

    const sentiment = Math.max(-1, Math.min(1, sentimentScore));

    return {
      sentiment,
      confidence: 0.3, // Low confidence for fallback
      emotionalTone: {
        primary:
          sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
        emotions: [],
      },
      keywords: this.extractBasicKeywords(text),
      themes: ['feedback_analysis_failed'],
      actionableInsights: [],
      businessImpact: {
        impactLevel: 'low',
        affectedAreas: [],
        recommendedActions: ['Review feedback manually'],
        timelineForAction: 'within_week',
      },
      weddingContext: {
        vendorType: context?.vendorType,
        weddingPhase: undefined,
        featureMentions: [],
        painPoints: [],
        positives: [],
        competitorMentions: [],
      },
      urgency: 'low',
    };
  }

  /**
   * Extract basic keywords from text using simple rules
   */
  private extractBasicKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const uniqueWords = [...new Set(words)];

    // Prioritize wedding industry keywords
    const weddingKeywords = uniqueWords.filter((word) =>
      this.weddingKeywords.has(word),
    );
    const featureKeywords = uniqueWords.filter((word) =>
      this.featureNames.has(word),
    );
    const otherKeywords = uniqueWords.filter(
      (word) => !this.weddingKeywords.has(word) && !this.featureNames.has(word),
    );

    return [...weddingKeywords, ...featureKeywords, ...otherKeywords].slice(
      0,
      10,
    );
  }

  /**
   * Create empty analysis for empty input
   */
  private createEmptyAnalysis(): SentimentAnalysis {
    return {
      sentiment: 0,
      confidence: 0,
      emotionalTone: {
        primary: 'neutral',
        emotions: [],
      },
      keywords: [],
      themes: [],
      actionableInsights: [],
      businessImpact: {
        impactLevel: 'none',
        affectedAreas: [],
        recommendedActions: [],
        timelineForAction: 'non_urgent',
      },
      weddingContext: {
        featureMentions: [],
        painPoints: [],
        positives: [],
        competitorMentions: [],
      },
      urgency: 'low',
    };
  }

  /**
   * Create empty batch result
   */
  private createEmptyBatchResult(): BatchSentimentResult {
    return {
      analyses: [],
      aggregated: {
        averageSentiment: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        topThemes: [],
        topKeywords: [],
        urgentItems: [],
        businessPriorities: [],
      },
    };
  }

  /**
   * Quick sentiment score for simple use cases
   */
  async getQuickSentiment(
    text: string,
  ): Promise<{ sentiment: number; confidence: number }> {
    try {
      if (!text || text.trim().length === 0) {
        return { sentiment: 0, confidence: 0 };
      }

      const prompt = `Analyze the sentiment of this wedding industry feedback on a scale from -1.0 (very negative) to 1.0 (very positive). Return only a JSON object with sentiment and confidence.

Text: "${text}"

Return format: {"sentiment": -1.0 to 1.0, "confidence": 0.0 to 1.0}`;

      const response = await this.openAIService.generateText(prompt, {
        maxTokens: 50,
        temperature: 0.1,
      });

      const parsed = JSON.parse(response);
      return {
        sentiment: Math.max(-1, Math.min(1, parseFloat(parsed.sentiment) || 0)),
        confidence: Math.max(
          0,
          Math.min(1, parseFloat(parsed.confidence) || 0.5),
        ),
      };
    } catch (error) {
      console.error('Error in quick sentiment analysis:', error);
      return { sentiment: 0, confidence: 0.3 };
    }
  }
}

// Export singleton instance
export const sentimentAnalyzer = SentimentAnalyzer.getInstance();
