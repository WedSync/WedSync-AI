/**
 * Model Selection Optimizer for AI Cost Optimization
 * Intelligently selects optimal AI models based on content complexity
 * Balances cost and quality for wedding supplier requirements
 */

import { createClient } from '@supabase/supabase-js';
import { AIRequest, AIResponse } from './SmartCacheManager';

export interface ModelRecommendation {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  confidence: number;
  estimatedCost: number;
  expectedQuality: number;
  reasonCode: string;
  alternativeModels: AlternativeModel[];
}

export interface AlternativeModel {
  provider: string;
  model: string;
  costDelta: number;
  qualityDelta: number;
  useCase: string;
}

export interface ContentComplexity {
  score: number;
  factors: {
    length: number;
    vocabulary: number;
    structure: number;
    context: number;
    creativity: number;
  };
  recommendedTier: 'basic' | 'standard' | 'premium';
}

export interface ModelPerformance {
  model: string;
  provider: string;
  avgCost: number;
  avgQuality: number;
  avgResponseTime: number;
  successRate: number;
  contextSpecialization: Record<string, number>;
}

export interface OptimizationStrategy {
  strategy: string;
  description: string;
  potentialSavings: number;
  qualityImpact: number;
  applicableContexts: string[];
  weddingSeasonAdjustment: number;
}

export interface ModelConfig {
  basic: ModelTier;
  standard: ModelTier;
  premium: ModelTier;
}

export interface ModelTier {
  models: {
    provider: string;
    model: string;
    costPerToken: number;
    qualityScore: number;
    specializations: string[];
  }[];
  maxComplexity: number;
  fallbackEnabled: boolean;
}

export class ModelSelectionOptimizer {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private modelConfig: ModelConfig = {
    basic: {
      models: [
        {
          provider: 'google',
          model: 'gemini-pro',
          costPerToken: 0.0005,
          qualityScore: 0.75,
          specializations: ['general', 'venue'],
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          costPerToken: 0.001,
          qualityScore: 0.8,
          specializations: ['general', 'planning'],
        },
      ],
      maxComplexity: 0.4,
      fallbackEnabled: true,
    },
    standard: {
      models: [
        {
          provider: 'openai',
          model: 'gpt-4-turbo',
          costPerToken: 0.01,
          qualityScore: 0.9,
          specializations: ['photography', 'planning', 'catering'],
        },
        {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          costPerToken: 0.008,
          qualityScore: 0.88,
          specializations: ['planning', 'venue', 'general'],
        },
      ],
      maxComplexity: 0.8,
      fallbackEnabled: true,
    },
    premium: {
      models: [
        {
          provider: 'openai',
          model: 'gpt-4',
          costPerToken: 0.03,
          qualityScore: 0.95,
          specializations: ['photography', 'creative'],
        },
        {
          provider: 'anthropic',
          model: 'claude-3-opus',
          costPerToken: 0.025,
          qualityScore: 0.93,
          specializations: ['planning', 'analysis'],
        },
      ],
      maxComplexity: 1.0,
      fallbackEnabled: false,
    },
  };

  /**
   * Recommend optimal model based on request characteristics
   */
  async recommendOptimalModel(
    request: AIRequest,
  ): Promise<ModelRecommendation> {
    try {
      // Analyze content complexity
      const complexity = this.analyzeContentComplexity(request);

      // Get historical performance data
      const performance = await this.getModelPerformance(
        request.context,
        request.supplierId,
      );

      // Determine model tier
      const tier = this.selectModelTier(
        complexity,
        request.priority,
        request.context,
      );

      // Select best model from tier
      const selectedModel = this.selectBestModelFromTier(
        tier,
        request,
        performance,
      );

      // Calculate alternatives
      const alternatives = this.generateAlternatives(
        selectedModel,
        tier,
        request,
      );

      // Apply wedding season adjustments
      const adjustedCost = this.applySeasonalAdjustments(
        selectedModel.estimatedCost,
        request.context,
      );

      const recommendation: ModelRecommendation = {
        provider: selectedModel.provider as 'openai' | 'anthropic' | 'google',
        model: selectedModel.model,
        confidence: this.calculateConfidence(
          complexity,
          performance,
          selectedModel,
        ),
        estimatedCost: adjustedCost,
        expectedQuality: selectedModel.expectedQuality,
        reasonCode: this.generateReasonCode(complexity, tier, selectedModel),
        alternativeModels: alternatives,
      };

      // Log recommendation for analytics
      await this.logModelRecommendation(request, recommendation, complexity);

      return recommendation;
    } catch (error) {
      console.error('Error recommending optimal model:', error);
      throw error;
    }
  }

  /**
   * Analyze content complexity for model selection
   */
  analyzeContentComplexity(request: AIRequest): ContentComplexity {
    const content = request.content;
    const words = content.split(/\s+/);
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    // Length complexity
    const lengthScore = Math.min(1.0, content.length / 2000); // Normalize to 2000 chars

    // Vocabulary complexity
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    const vocabularyScore = Math.min(
      1.0,
      (uniqueWords.size / words.length) * 2,
    );

    // Structure complexity
    const avgSentenceLength = words.length / sentences.length;
    const structureScore = Math.min(1.0, avgSentenceLength / 20); // Normalize to 20 words

    // Context complexity
    const contextComplexity = {
      photography: 0.8, // High creativity needed
      planning: 0.7, // Complex coordination
      catering: 0.6, // Moderate complexity
      venue: 0.5, // Descriptive content
      general: 0.4, // Simple queries
    };
    const contextScore =
      contextComplexity[request.context as keyof typeof contextComplexity] ||
      0.4;

    // Creativity requirements
    const creativeKeywords = [
      'creative',
      'artistic',
      'unique',
      'style',
      'mood',
      'atmosphere',
      'aesthetic',
      'vision',
      'concept',
      'inspiration',
      'design',
    ];
    const creativeCount = creativeKeywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().includes(keyword) ? 1 : 0);
    }, 0);
    const creativityScore = Math.min(1.0, creativeCount / 3);

    const overallScore =
      lengthScore * 0.2 +
      vocabularyScore * 0.2 +
      structureScore * 0.2 +
      contextScore * 0.3 +
      creativityScore * 0.1;

    const recommendedTier =
      overallScore < 0.4
        ? 'basic'
        : overallScore < 0.7
          ? 'standard'
          : 'premium';

    return {
      score: overallScore,
      factors: {
        length: lengthScore,
        vocabulary: vocabularyScore,
        structure: structureScore,
        context: contextScore,
        creativity: creativityScore,
      },
      recommendedTier,
    };
  }

  /**
   * Get historical model performance for context and supplier
   */
  private async getModelPerformance(
    context: string,
    supplierId: string,
  ): Promise<ModelPerformance[]> {
    try {
      const { data: performanceData, error } = await this.supabase
        .from('ai_model_performance')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('context', context)
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Last 30 days
        .order('avg_quality', { ascending: false });

      if (error || !performanceData?.length) {
        return this.getDefaultPerformanceData();
      }

      return performanceData.map((data) => ({
        model: data.model,
        provider: data.provider,
        avgCost: data.avg_cost,
        avgQuality: data.avg_quality,
        avgResponseTime: data.avg_response_time,
        successRate: data.success_rate,
        contextSpecialization: JSON.parse(data.context_specialization || '{}'),
      }));
    } catch (error) {
      console.error('Error getting model performance:', error);
      return this.getDefaultPerformanceData();
    }
  }

  /**
   * Select appropriate model tier based on complexity and priority
   */
  private selectModelTier(
    complexity: ContentComplexity,
    priority: string,
    context: string,
  ): 'basic' | 'standard' | 'premium' {
    // Priority override
    if (priority === 'high' && context === 'photography') {
      return 'premium';
    }

    if (priority === 'low' && complexity.score < 0.3) {
      return 'basic';
    }

    // Use complexity recommendation with context adjustments
    const tierAdjustments = {
      photography: 1, // Prefer higher tier
      planning: 0, // Use recommended tier
      catering: -1, // Can use lower tier
      venue: -1, // Can use lower tier
      general: -1, // Can use lower tier
    };

    const adjustment =
      tierAdjustments[context as keyof typeof tierAdjustments] || 0;
    const tiers = ['basic', 'standard', 'premium'] as const;
    const currentIndex = tiers.indexOf(complexity.recommendedTier);
    const adjustedIndex = Math.max(0, Math.min(2, currentIndex + adjustment));

    return tiers[adjustedIndex];
  }

  /**
   * Select best model from tier based on performance and specialization
   */
  private selectBestModelFromTier(
    tier: 'basic' | 'standard' | 'premium',
    request: AIRequest,
    performance: ModelPerformance[],
  ): {
    provider: string;
    model: string;
    estimatedCost: number;
    expectedQuality: number;
  } {
    const tierModels = this.modelConfig[tier].models;

    // Score each model
    const scoredModels = tierModels.map((model) => {
      const perf = performance.find(
        (p) => p.model === model.model && p.provider === model.provider,
      );
      const specializationBonus = model.specializations.includes(
        request.context,
      )
        ? 0.1
        : 0;
      const performanceScore = perf
        ? perf.avgQuality * perf.successRate
        : model.qualityScore;

      const totalScore = performanceScore + specializationBonus;
      const estimatedTokens = Math.ceil(request.content.length / 4);
      const estimatedCost = estimatedTokens * model.costPerToken;

      return {
        ...model,
        score: totalScore,
        estimatedCost,
        expectedQuality: performanceScore,
      };
    });

    // Select highest scoring model
    const bestModel = scoredModels.reduce((best, current) =>
      current.score > best.score ? current : best,
    );

    return {
      provider: bestModel.provider,
      model: bestModel.model,
      estimatedCost: bestModel.estimatedCost,
      expectedQuality: bestModel.expectedQuality,
    };
  }

  /**
   * Generate alternative model recommendations
   */
  private generateAlternatives(
    selectedModel: any,
    tier: 'basic' | 'standard' | 'premium',
    request: AIRequest,
  ): AlternativeModel[] {
    const alternatives: AlternativeModel[] = [];
    const allTiers = ['basic', 'standard', 'premium'] as const;

    // Add alternatives from other tiers
    for (const altTier of allTiers) {
      if (altTier === tier) continue;

      const tierModels = this.modelConfig[altTier].models;
      const bestInTier = tierModels.reduce((best, current) => {
        const specializationBonus = current.specializations.includes(
          request.context,
        )
          ? 0.1
          : 0;
        const score = current.qualityScore + specializationBonus;
        return score >
          best.qualityScore +
            (best.specializations.includes(request.context) ? 0.1 : 0)
          ? current
          : best;
      });

      const estimatedTokens = Math.ceil(request.content.length / 4);
      const costDelta =
        estimatedTokens * bestInTier.costPerToken - selectedModel.estimatedCost;
      const qualityDelta =
        bestInTier.qualityScore - selectedModel.expectedQuality;

      alternatives.push({
        provider: bestInTier.provider,
        model: bestInTier.model,
        costDelta,
        qualityDelta,
        useCase:
          altTier === 'basic'
            ? 'Cost savings'
            : altTier === 'premium'
              ? 'Maximum quality'
              : 'Balanced approach',
      });
    }

    return alternatives.slice(0, 2); // Return top 2 alternatives
  }

  /**
   * Apply seasonal cost adjustments for wedding season
   */
  private applySeasonalAdjustments(baseCost: number, context: string): number {
    const now = new Date();
    const isWeddingSeason = now.getMonth() >= 4 && now.getMonth() <= 9; // May-October

    if (!isWeddingSeason) {
      return baseCost * 0.9; // 10% discount off-season
    }

    // Wedding season adjustments by context
    const seasonalMultipliers = {
      photography: 1.2, // 20% increase for photography in wedding season
      planning: 1.15, // 15% increase for planning
      catering: 1.1, // 10% increase for catering
      venue: 1.05, // 5% increase for venue
      general: 1.0, // No change for general
    };

    const multiplier =
      seasonalMultipliers[context as keyof typeof seasonalMultipliers] || 1.0;
    return baseCost * multiplier;
  }

  /**
   * Calculate confidence in model recommendation
   */
  private calculateConfidence(
    complexity: ContentComplexity,
    performance: ModelPerformance[],
    selectedModel: any,
  ): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence if we have performance data
    if (performance.length > 0) {
      confidence += 0.2;
    }

    // Boost confidence for specialized models
    const modelConfig = Object.values(this.modelConfig)
      .flat()
      .find((m) =>
        m.models.some((model) => model.model === selectedModel.model),
      );

    if (
      modelConfig?.models.some((m) =>
        m.specializations.includes(complexity.recommendedTier),
      )
    ) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Generate human-readable reason code
   */
  private generateReasonCode(
    complexity: ContentComplexity,
    tier: string,
    selectedModel: any,
  ): string {
    const complexityLevel =
      complexity.score < 0.4
        ? 'low'
        : complexity.score < 0.7
          ? 'medium'
          : 'high';

    return `${tier.toUpperCase()}_${complexityLevel.toUpperCase()}_COMPLEXITY_${selectedModel.provider.toUpperCase()}`;
  }

  /**
   * Get default performance data when no history is available
   */
  private getDefaultPerformanceData(): ModelPerformance[] {
    return [
      {
        model: 'gpt-4-turbo',
        provider: 'openai',
        avgCost: 0.01,
        avgQuality: 0.9,
        avgResponseTime: 2000,
        successRate: 0.98,
        contextSpecialization: { photography: 0.95, planning: 0.9 },
      },
      {
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        avgCost: 0.008,
        avgQuality: 0.88,
        avgResponseTime: 1800,
        successRate: 0.97,
        contextSpecialization: { planning: 0.95, venue: 0.9 },
      },
      {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        avgCost: 0.001,
        avgQuality: 0.8,
        avgResponseTime: 1000,
        successRate: 0.95,
        contextSpecialization: { general: 0.85, catering: 0.8 },
      },
    ];
  }

  /**
   * Log model recommendation for analytics and learning
   */
  private async logModelRecommendation(
    request: AIRequest,
    recommendation: ModelRecommendation,
    complexity: ContentComplexity,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_model_recommendations')
        .insert({
          request_id: request.id,
          supplier_id: request.supplierId,
          context: request.context,
          priority: request.priority,
          recommended_provider: recommendation.provider,
          recommended_model: recommendation.model,
          confidence: recommendation.confidence,
          estimated_cost: recommendation.estimatedCost,
          expected_quality: recommendation.expectedQuality,
          reason_code: recommendation.reasonCode,
          complexity_score: complexity.score,
          complexity_factors: JSON.stringify(complexity.factors),
          alternatives: JSON.stringify(recommendation.alternativeModels),
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging model recommendation:', error);
      }
    } catch (error) {
      console.error('Error in logModelRecommendation:', error);
    }
  }

  /**
   * Get optimization strategies for wedding suppliers
   */
  async getOptimizationStrategies(
    supplierId: string,
  ): Promise<OptimizationStrategy[]> {
    try {
      // Get supplier's usage patterns
      const { data: usageData, error } = await this.supabase
        .from('ai_model_recommendations')
        .select('*')
        .eq('supplier_id', supplierId)
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Last 7 days
        .order('created_at', { ascending: false });

      if (error || !usageData?.length) {
        return this.getDefaultStrategies();
      }

      const strategies: OptimizationStrategy[] = [];

      // Analyze usage patterns
      const totalCost = usageData.reduce(
        (sum, usage) => sum + usage.estimated_cost,
        0,
      );
      const avgComplexity =
        usageData.reduce((sum, usage) => sum + usage.complexity_score, 0) /
        usageData.length;
      const contextUsage = this.groupByContext(usageData);

      // Strategy 1: Model downgrading for simple content
      const simpleContentRatio =
        usageData.filter((u) => u.complexity_score < 0.4).length /
        usageData.length;
      if (simpleContentRatio > 0.3) {
        strategies.push({
          strategy: 'smart-downgrading',
          description: 'Use basic models for simple content to reduce costs',
          potentialSavings: totalCost * 0.4 * simpleContentRatio,
          qualityImpact: -0.05,
          applicableContexts: ['venue', 'general'],
          weddingSeasonAdjustment: 0.8,
        });
      }

      // Strategy 2: Context specialization
      const photoRequests = contextUsage.photography || 0;
      if (photoRequests > usageData.length * 0.2) {
        strategies.push({
          strategy: 'context-specialization',
          description: 'Use photography-specialized models for better quality',
          potentialSavings: totalCost * 0.15,
          qualityImpact: 0.1,
          applicableContexts: ['photography'],
          weddingSeasonAdjustment: 1.2,
        });
      }

      // Strategy 3: Batch processing optimization
      if (usageData.length > 10) {
        strategies.push({
          strategy: 'batch-optimization',
          description: 'Process similar requests in batches for cost savings',
          potentialSavings: totalCost * 0.25,
          qualityImpact: 0,
          applicableContexts: Object.keys(contextUsage),
          weddingSeasonAdjustment: 1.0,
        });
      }

      return strategies.slice(0, 3); // Return top 3 strategies
    } catch (error) {
      console.error('Error getting optimization strategies:', error);
      return this.getDefaultStrategies();
    }
  }

  private groupByContext(usageData: any[]): Record<string, number> {
    return usageData.reduce((groups, usage) => {
      const context = usage.context;
      groups[context] = (groups[context] || 0) + 1;
      return groups;
    }, {});
  }

  private getDefaultStrategies(): OptimizationStrategy[] {
    return [
      {
        strategy: 'smart-caching',
        description: 'Cache frequently used AI responses to reduce costs',
        potentialSavings: 500,
        qualityImpact: 0,
        applicableContexts: ['photography', 'venue', 'planning'],
        weddingSeasonAdjustment: 1.0,
      },
      {
        strategy: 'off-peak-processing',
        description: 'Schedule non-urgent requests during off-peak hours',
        potentialSavings: 300,
        qualityImpact: 0,
        applicableContexts: ['general', 'planning'],
        weddingSeasonAdjustment: 0.7,
      },
    ];
  }
}
