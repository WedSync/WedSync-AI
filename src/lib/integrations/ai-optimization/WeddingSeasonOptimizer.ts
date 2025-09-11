/**
 * Wedding Season Optimizer for AI Cost Optimization
 * Peak season cost optimization specifically for wedding suppliers
 * Manages high-demand periods and optimizes resources during wedding season
 */

import { createClient } from '@supabase/supabase-js';
import { AIRequest, AIResponse } from './SmartCacheManager';

export interface SeasonalPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
  demandMultiplier: number;
  costMultiplier: number;
  recommendedStrategies: string[];
  peakDays: number[]; // Day of week (0=Sunday, 6=Saturday)
}

export interface WeddingSeasonAnalysis {
  currentSeason: SeasonalPeriod;
  upcomingPeaks: SeasonalPeriod[];
  demandForecast: DemandForecast[];
  optimizationOpportunities: OptimizationOpportunity[];
  recommendedActions: RecommendedAction[];
}

export interface DemandForecast {
  date: Date;
  expectedDemand: number;
  confidence: number;
  primaryContexts: string[];
  recommendedCapacity: number;
}

export interface OptimizationOpportunity {
  opportunity: string;
  description: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  applicableSuppliers: string[];
}

export interface RecommendedAction {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline: Date;
  expectedImpact: number;
  description: string;
  targetSuppliers: string[];
}

export interface SeasonalStrategy {
  strategy: string;
  description: string;
  seasonalEffectiveness: Record<string, number>;
  weddingContexts: string[];
  costReduction: number;
  qualityMaintenance: number;
}

export interface PeakLoadManagement {
  currentLoad: number;
  capacity: number;
  queuedRequests: number;
  estimatedWaitTime: number;
  recommendedActions: string[];
  fallbackOptions: FallbackOption[];
}

export interface FallbackOption {
  provider: string;
  model: string;
  availableCapacity: number;
  costPremium: number;
  qualityDelta: number;
  estimatedDelay: number;
}

export class WeddingSeasonOptimizer {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private seasonalPeriods: SeasonalPeriod[] = [
    {
      name: 'Peak Wedding Season',
      startDate: new Date(new Date().getFullYear(), 4, 1), // May 1
      endDate: new Date(new Date().getFullYear(), 9, 31), // October 31
      demandMultiplier: 2.5,
      costMultiplier: 1.4,
      recommendedStrategies: [
        'aggressive-caching',
        'batch-processing',
        'load-balancing',
      ],
      peakDays: [5, 6], // Friday, Saturday
    },
    {
      name: 'Spring Wedding Season',
      startDate: new Date(new Date().getFullYear(), 3, 1), // April 1
      endDate: new Date(new Date().getFullYear(), 4, 30), // May 30
      demandMultiplier: 1.8,
      costMultiplier: 1.2,
      recommendedStrategies: ['smart-caching', 'model-optimization'],
      peakDays: [5, 6], // Friday, Saturday
    },
    {
      name: 'Holiday Wedding Season',
      startDate: new Date(new Date().getFullYear(), 10, 15), // November 15
      endDate: new Date(new Date().getFullYear(), 11, 31), // December 31
      demandMultiplier: 1.6,
      costMultiplier: 1.1,
      recommendedStrategies: ['context-specialization', 'off-peak-processing'],
      peakDays: [5, 6], // Friday, Saturday
    },
    {
      name: 'Off Season',
      startDate: new Date(new Date().getFullYear(), 0, 1), // January 1
      endDate: new Date(new Date().getFullYear(), 2, 31), // March 31
      demandMultiplier: 0.6,
      costMultiplier: 0.8,
      recommendedStrategies: ['cost-optimization', 'infrastructure-prep'],
      peakDays: [5, 6], // Friday, Saturday (still peak days but lower volume)
    },
  ];

  /**
   * Analyze current wedding season and provide optimization recommendations
   */
  async analyzeWeddingSeason(
    supplierId?: string,
  ): Promise<WeddingSeasonAnalysis> {
    try {
      const currentSeason = this.getCurrentSeason();
      const upcomingPeaks = this.getUpcomingPeaks();
      const demandForecast = await this.generateDemandForecast(supplierId);
      const optimizationOppor =
        await this.identifyOptimizationOpportunities(supplierId);
      const recommendedActions = await this.generateRecommendedActions(
        currentSeason,
        demandForecast,
        supplierId,
      );

      return {
        currentSeason,
        upcomingPeaks,
        demandForecast,
        optimizationOpportunities: optimizationOppor,
        recommendedActions,
      };
    } catch (error) {
      console.error('Error analyzing wedding season:', error);
      throw error;
    }
  }

  /**
   * Optimize AI requests based on current season and load
   */
  async optimizeForSeason(request: AIRequest): Promise<{
    optimizedRequest: AIRequest;
    strategy: string;
    estimatedSavings: number;
    qualityImpact: number;
  }> {
    try {
      const currentSeason = this.getCurrentSeason();
      const loadManagement = await this.assessPeakLoadManagement();

      // Clone request for optimization
      const optimizedRequest = { ...request };
      let strategy = 'default';
      let estimatedSavings = 0;
      let qualityImpact = 0;

      // Apply seasonal optimizations
      if (currentSeason.name === 'Peak Wedding Season') {
        if (loadManagement.currentLoad > 0.8) {
          // High load - prioritize urgent requests, defer others
          if (request.priority === 'high') {
            strategy = 'premium-fast-track';
            optimizedRequest.parameters = {
              ...optimizedRequest.parameters,
              temperature: 0.7, // Consistent high-quality results
              max_tokens: Math.min(
                2000,
                (optimizedRequest.parameters.max_tokens as number) || 1000,
              ),
            };
            qualityImpact = 0.05; // Slight quality boost
          } else {
            strategy = 'batch-defer';
            // Schedule for off-peak processing
            const deferTime = this.calculateOptimalDeferTime();
            optimizedRequest.parameters = {
              ...optimizedRequest.parameters,
              scheduled_for: deferTime,
              priority: 'deferred',
            };
            estimatedSavings = this.calculateBatchingSavings(request);
            qualityImpact = 0; // No quality impact
          }
        } else {
          strategy = 'season-optimized';
          estimatedSavings = this.calculateSeasonalSavings(
            request,
            currentSeason,
          );
        }
      } else if (currentSeason.name === 'Off Season') {
        // Off-season - optimize for cost
        strategy = 'cost-aggressive';
        optimizedRequest.parameters = {
          ...optimizedRequest.parameters,
          use_cache_aggressively: true,
          model_preference: 'cost-optimized',
        };
        estimatedSavings = this.calculateOffSeasonSavings(request);
        qualityImpact = -0.02; // Minimal quality reduction for significant savings
      } else {
        // Moderate season - balanced approach
        strategy = 'balanced-seasonal';
        estimatedSavings = this.calculateBalancedSavings(
          request,
          currentSeason,
        );
        qualityImpact = 0;
      }

      // Apply wedding context-specific optimizations
      if (this.isWeddingWeekend()) {
        optimizedRequest.parameters = {
          ...optimizedRequest.parameters,
          weekend_priority: true,
          cache_ttl_extended: true,
        };
        strategy += '-weekend-optimized';
      }

      // Log optimization decision
      await this.logSeasonalOptimization(
        request,
        optimizedRequest,
        strategy,
        estimatedSavings,
      );

      return {
        optimizedRequest,
        strategy,
        estimatedSavings,
        qualityImpact,
      };
    } catch (error) {
      console.error('Error optimizing for season:', error);
      // Return original request if optimization fails
      return {
        optimizedRequest: request,
        strategy: 'fallback',
        estimatedSavings: 0,
        qualityImpact: 0,
      };
    }
  }

  /**
   * Get seasonal strategies for wedding suppliers
   */
  async getSeasonalStrategies(supplierId: string): Promise<SeasonalStrategy[]> {
    try {
      const currentSeason = this.getCurrentSeason();
      const supplierUsage = await this.getSupplierSeasonalUsage(supplierId);

      const strategies: SeasonalStrategy[] = [
        {
          strategy: 'aggressive-caching-peak',
          description:
            'Implement aggressive caching during peak wedding season',
          seasonalEffectiveness: {
            'Peak Wedding Season': 0.9,
            'Spring Wedding Season': 0.8,
            'Holiday Wedding Season': 0.7,
            'Off Season': 0.4,
          },
          weddingContexts: ['photography', 'venue', 'planning'],
          costReduction: 0.45,
          qualityMaintenance: 0.98,
        },
        {
          strategy: 'batch-weekend-processing',
          description:
            'Batch process non-urgent requests during wedding weekends',
          seasonalEffectiveness: {
            'Peak Wedding Season': 0.95,
            'Spring Wedding Season': 0.85,
            'Holiday Wedding Season': 0.8,
            'Off Season': 0.3,
          },
          weddingContexts: ['planning', 'catering', 'general'],
          costReduction: 0.35,
          qualityMaintenance: 1.0,
        },
        {
          strategy: 'context-specialization-seasonal',
          description:
            'Use specialized models based on seasonal wedding contexts',
          seasonalEffectiveness: {
            'Peak Wedding Season': 0.85,
            'Spring Wedding Season': 0.9,
            'Holiday Wedding Season': 0.8,
            'Off Season': 0.7,
          },
          weddingContexts: ['photography', 'planning'],
          costReduction: 0.25,
          qualityMaintenance: 1.05,
        },
        {
          strategy: 'off-season-preparation',
          description: 'Use off-season for template creation and cache warming',
          seasonalEffectiveness: {
            'Peak Wedding Season': 0.3,
            'Spring Wedding Season': 0.5,
            'Holiday Wedding Season': 0.4,
            'Off Season': 0.95,
          },
          weddingContexts: ['venue', 'catering', 'planning'],
          costReduction: 0.6,
          qualityMaintenance: 1.0,
        },
      ];

      // Filter strategies by current season effectiveness
      return strategies
        .filter((s) => s.seasonalEffectiveness[currentSeason.name] > 0.6)
        .sort(
          (a, b) =>
            b.seasonalEffectiveness[currentSeason.name] -
            a.seasonalEffectiveness[currentSeason.name],
        )
        .slice(0, 3); // Top 3 strategies
    } catch (error) {
      console.error('Error getting seasonal strategies:', error);
      throw error;
    }
  }

  /**
   * Assess current peak load management
   */
  async assessPeakLoadManagement(): Promise<PeakLoadManagement> {
    try {
      // Get current system load
      const { data: loadData, error } = await this.supabase
        .from('ai_system_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const currentLoad = loadData?.cpu_utilization || 0.5;
      const capacity = 1.0;

      // Get queued requests count
      const { count: queuedRequests } = await this.supabase
        .from('ai_batch_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      const estimatedWaitTime = this.calculateEstimatedWaitTime(
        queuedRequests || 0,
        currentLoad,
      );
      const recommendedActions = this.generateLoadManagementActions(
        currentLoad,
        queuedRequests || 0,
      );
      const fallbackOptions = await this.identifyFallbackOptions();

      return {
        currentLoad,
        capacity,
        queuedRequests: queuedRequests || 0,
        estimatedWaitTime,
        recommendedActions,
        fallbackOptions,
      };
    } catch (error) {
      console.error('Error assessing peak load management:', error);
      // Return conservative estimates if unable to get real data
      return {
        currentLoad: 0.7,
        capacity: 1.0,
        queuedRequests: 5,
        estimatedWaitTime: 300000, // 5 minutes
        recommendedActions: ['enable-aggressive-caching', 'defer-low-priority'],
        fallbackOptions: [],
      };
    }
  }

  /**
   * Private helper methods
   */
  private getCurrentSeason(): SeasonalPeriod {
    const now = new Date();
    return (
      this.seasonalPeriods.find(
        (period) => now >= period.startDate && now <= period.endDate,
      ) || this.seasonalPeriods[3]
    ); // Default to off-season
  }

  private getUpcomingPeaks(): SeasonalPeriod[] {
    const now = new Date();
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return this.seasonalPeriods
      .filter(
        (period) => period.startDate > now && period.startDate <= next90Days,
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  private async generateDemandForecast(
    supplierId?: string,
  ): Promise<DemandForecast[]> {
    // Generate demand forecast for next 30 days
    const forecasts: DemandForecast[] = [];
    const currentSeason = this.getCurrentSeason();

    for (let i = 0; i < 30; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);

      const isWeekend =
        forecastDate.getDay() === 5 || forecastDate.getDay() === 6;
      const baseDemand =
        currentSeason.demandMultiplier * (isWeekend ? 1.8 : 1.0);

      // Add seasonal variation
      const dayOfYear = Math.floor(
        (forecastDate.getTime() -
          new Date(forecastDate.getFullYear(), 0, 0).getTime()) /
          86400000,
      );
      const seasonalVariation = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.3;

      const expectedDemand = Math.max(0.1, baseDemand + seasonalVariation);

      forecasts.push({
        date: forecastDate,
        expectedDemand,
        confidence: isWeekend ? 0.9 : 0.7,
        primaryContexts: isWeekend
          ? ['photography', 'planning']
          : ['venue', 'catering'],
        recommendedCapacity: Math.ceil(expectedDemand * 1.2), // 20% buffer
      });
    }

    return forecasts;
  }

  private async identifyOptimizationOpportunities(
    supplierId?: string,
  ): Promise<OptimizationOpportunity[]> {
    const currentSeason = this.getCurrentSeason();

    const opportunities: OptimizationOpportunity[] = [
      {
        opportunity: 'peak-season-cache-warming',
        description:
          'Pre-warm caches with common wedding queries before peak weekends',
        potentialSavings: 2500,
        implementationEffort: 'medium',
        timeframe: 'short-term',
        applicableSuppliers: ['all'],
      },
      {
        opportunity: 'context-based-batching',
        description:
          'Group similar wedding context requests for batch processing',
        potentialSavings: 1800,
        implementationEffort: 'low',
        timeframe: 'immediate',
        applicableSuppliers: ['photographers', 'planners'],
      },
      {
        opportunity: 'off-season-template-generation',
        description:
          'Generate reusable templates during off-season for peak reuse',
        potentialSavings: 3200,
        implementationEffort: 'high',
        timeframe: 'long-term',
        applicableSuppliers: ['venues', 'caterers'],
      },
    ];

    return opportunities.filter(
      (opp) =>
        currentSeason.name !== 'Off Season' || opp.timeframe === 'long-term',
    );
  }

  private async generateRecommendedActions(
    currentSeason: SeasonalPeriod,
    demandForecast: DemandForecast[],
    supplierId?: string,
  ): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = [];

    const highDemandDays = demandForecast.filter((f) => f.expectedDemand > 2.0);

    if (highDemandDays.length > 0) {
      actions.push({
        action: 'enable-peak-optimization',
        priority: 'high',
        deadline: new Date(
          Math.min(...highDemandDays.map((d) => d.date.getTime())),
        ),
        expectedImpact: 0.4,
        description:
          'Enable peak season optimization strategies before high demand period',
        targetSuppliers: ['all'],
      });
    }

    if (currentSeason.name === 'Peak Wedding Season') {
      actions.push({
        action: 'implement-weekend-batching',
        priority: 'critical',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        expectedImpact: 0.3,
        description: 'Implement weekend batching for non-urgent requests',
        targetSuppliers: ['photographers', 'planners'],
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private isWeddingWeekend(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  }

  private calculateOptimalDeferTime(): Date {
    const now = new Date();
    const deferTime = new Date(now);

    // If it's weekend, defer to Monday
    if (this.isWeddingWeekend()) {
      const dayOfWeek = now.getDay();
      const daysToAdd = dayOfWeek === 5 ? 3 : 2; // Friday +3, Saturday +2
      deferTime.setDate(deferTime.getDate() + daysToAdd);
      deferTime.setHours(2, 0, 0, 0); // 2 AM Monday
    } else {
      // Defer to next day at 2 AM
      deferTime.setDate(deferTime.getDate() + 1);
      deferTime.setHours(2, 0, 0, 0);
    }

    return deferTime;
  }

  private calculateBatchingSavings(request: AIRequest): number {
    const tokenEstimate = request.content.length / 4;
    const baseCost = tokenEstimate * 0.01; // Estimate
    return baseCost * 0.3; // 30% savings from batching
  }

  private calculateSeasonalSavings(
    request: AIRequest,
    season: SeasonalPeriod,
  ): number {
    const tokenEstimate = request.content.length / 4;
    const baseCost = tokenEstimate * 0.01;
    return baseCost * (1 - season.costMultiplier) * 0.5;
  }

  private calculateOffSeasonSavings(request: AIRequest): number {
    const tokenEstimate = request.content.length / 4;
    const baseCost = tokenEstimate * 0.01;
    return baseCost * 0.4; // 40% off-season savings
  }

  private calculateBalancedSavings(
    request: AIRequest,
    season: SeasonalPeriod,
  ): number {
    const tokenEstimate = request.content.length / 4;
    const baseCost = tokenEstimate * 0.01;
    return baseCost * (1 - season.costMultiplier) * 0.25;
  }

  private calculateEstimatedWaitTime(
    queuedRequests: number,
    currentLoad: number,
  ): number {
    const baseProcessingTime = 2000; // 2 seconds per request
    const loadMultiplier = Math.max(1, currentLoad * 2);
    return queuedRequests * baseProcessingTime * loadMultiplier;
  }

  private generateLoadManagementActions(
    currentLoad: number,
    queuedRequests: number,
  ): string[] {
    const actions: string[] = [];

    if (currentLoad > 0.8) {
      actions.push('enable-aggressive-caching');
      actions.push('defer-low-priority');
    }

    if (queuedRequests > 10) {
      actions.push('enable-batch-processing');
      actions.push('activate-fallback-providers');
    }

    if (currentLoad > 0.9) {
      actions.push('emergency-load-shedding');
    }

    return actions;
  }

  private async identifyFallbackOptions(): Promise<FallbackOption[]> {
    // In production, query actual provider availability
    return [
      {
        provider: 'google',
        model: 'gemini-pro',
        availableCapacity: 0.8,
        costPremium: 1.1,
        qualityDelta: -0.05,
        estimatedDelay: 1000,
      },
      {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        availableCapacity: 0.9,
        costPremium: 1.2,
        qualityDelta: -0.02,
        estimatedDelay: 800,
      },
    ];
  }

  private async getSupplierSeasonalUsage(supplierId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('ai_seasonal_usage')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte(
        'date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('date', { ascending: false });

    return data || [];
  }

  private async logSeasonalOptimization(
    originalRequest: AIRequest,
    optimizedRequest: AIRequest,
    strategy: string,
    estimatedSavings: number,
  ): Promise<void> {
    try {
      await this.supabase.from('ai_seasonal_optimizations').insert({
        request_id: originalRequest.id,
        supplier_id: originalRequest.supplierId,
        original_parameters: JSON.stringify(originalRequest.parameters),
        optimized_parameters: JSON.stringify(optimizedRequest.parameters),
        strategy_applied: strategy,
        estimated_savings: estimatedSavings,
        season_name: this.getCurrentSeason().name,
        is_wedding_weekend: this.isWeddingWeekend(),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging seasonal optimization:', error);
    }
  }
}
