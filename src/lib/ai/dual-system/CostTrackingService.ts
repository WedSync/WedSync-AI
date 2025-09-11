/**
 * WS-239: Cost Tracking Service - Team B Round 1
 * Tracks AI usage, costs, and billing for both platform and client systems
 * Provides real-time cost monitoring and budget alerts
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logging/Logger';

export type AIFeatureType =
  | 'photo_analysis'
  | 'content_generation'
  | 'email_templates'
  | 'chat_responses'
  | 'document_analysis'
  | 'wedding_planning'
  | 'vendor_matching'
  | 'budget_optimization';

export type ProviderType = 'platform' | 'client';

export interface UsageEvent {
  featureType: AIFeatureType;
  requestType: string;
  providerType: ProviderType;
  tokensInput: number;
  tokensOutput: number;
  costPounds: number;
  model: string;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
  weddingDate?: Date;
  retryCount?: number;
  requestMetadata?: Record<string, any>;
}

export interface UsageAnalytics {
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  topFeatures: Array<{ feature: AIFeatureType; count: number; cost: number }>;
  dailyBreakdown: Array<{ date: string; requests: number; cost: number }>;
  providerBreakdown: { platform: number; client: number };
}

export interface BudgetStatus {
  monthlyBudget: number;
  currentSpend: number;
  utilizationRate: number;
  daysRemaining: number;
  projectedSpend: number;
  onTrack: boolean;
  alertThresholds: number[];
  triggeredAlerts: number[];
}

/**
 * Cost Tracking Service for AI Features
 * Handles real-time usage tracking, cost calculation, and budget monitoring
 */
export class CostTrackingService {
  private logger: Logger;
  private supabase;

  constructor() {
    this.logger = new Logger('CostTrackingService');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Track AI usage event in real-time
   */
  async trackUsage(
    supplierId: string,
    userId: string,
    usage: UsageEvent,
  ): Promise<void> {
    try {
      const isPeakSeason = this.isPeakWeddingSeason(usage.weddingDate);

      const { error } = await this.supabase.from('ai_usage_tracking').insert({
        supplier_id: supplierId,
        user_id: userId,
        feature_type: usage.featureType,
        provider_type: usage.providerType,
        request_type: usage.requestType,
        tokens_input: usage.tokensInput,
        tokens_output: usage.tokensOutput,
        model_used: usage.model,
        cost_pounds: usage.costPounds,
        billing_period: this.getCurrentBillingPeriod(),
        response_time_ms: usage.responseTimeMs,
        success: usage.success,
        error_message: usage.errorMessage,
        retry_count: usage.retryCount || 0,
        request_metadata: usage.requestMetadata || {},
        wedding_date: usage.weddingDate?.toISOString().split('T')[0],
        is_peak_season: isPeakSeason,
      });

      if (error) {
        this.logger.error('Failed to track usage', {
          supplierId,
          usage,
          error,
        });
        throw error;
      }

      // Update real-time billing summary
      await this.updateBillingSummary(supplierId);

      // Log for monitoring
      this.logger.info('Usage tracked', {
        supplierId,
        featureType: usage.featureType,
        provider: usage.providerType,
        cost: usage.costPounds,
        success: usage.success,
      });
    } catch (error) {
      this.logger.error('Usage tracking failed', { supplierId, error });
      // Don't throw - tracking failures shouldn't break AI requests
    }
  }

  /**
   * Get real-time usage analytics for supplier
   */
  async getUsageAnalytics(
    supplierId: string,
    dateRange: { start: Date; end: Date },
    providerType?: ProviderType,
  ): Promise<UsageAnalytics> {
    try {
      let query = this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('supplier_id', supplierId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: true });

      if (providerType) {
        query = query.eq('provider_type', providerType);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch usage analytics', {
          supplierId,
          error,
        });
        throw error;
      }

      return this.calculateAnalytics(data);
    } catch (error) {
      this.logger.error('Usage analytics calculation failed', {
        supplierId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get current budget status for supplier
   */
  async getBudgetStatus(
    supplierId: string,
    providerType: ProviderType,
  ): Promise<BudgetStatus> {
    try {
      // Get current configuration
      const { data: config, error: configError } = await this.supabase
        .from('ai_feature_config')
        .select(
          'client_monthly_budget_pounds, client_alert_thresholds, platform_overage_rate_pounds',
        )
        .eq('supplier_id', supplierId)
        .single();

      if (configError) {
        throw configError;
      }

      // Get current month usage
      const currentMonth = this.getCurrentBillingPeriod();
      const { data: usage, error: usageError } = await this.supabase
        .from('ai_usage_tracking')
        .select('cost_pounds, created_at')
        .eq('supplier_id', supplierId)
        .eq('provider_type', providerType)
        .eq('billing_period', currentMonth);

      if (usageError) {
        throw usageError;
      }

      const totalSpend = usage.reduce(
        (sum, row) => sum + parseFloat(row.cost_pounds),
        0,
      );
      const monthlyBudget =
        providerType === 'client'
          ? parseFloat(config.client_monthly_budget_pounds)
          : 1000; // Platform has high default limit

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysElapsed = Math.floor(
        (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysRemaining = Math.floor(
        (monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const totalDaysInMonth = daysElapsed + daysRemaining;

      const dailyAverageSpend = totalSpend / Math.max(daysElapsed, 1);
      const projectedSpend = dailyAverageSpend * totalDaysInMonth;

      const utilizationRate = totalSpend / monthlyBudget;
      const onTrack = projectedSpend <= monthlyBudget;

      const alertThresholds = config.client_alert_thresholds || [
        0.5, 0.8, 0.95,
      ];
      const triggeredAlerts = alertThresholds.filter(
        (threshold) => utilizationRate >= threshold,
      );

      return {
        monthlyBudget,
        currentSpend: totalSpend,
        utilizationRate,
        daysRemaining,
        projectedSpend,
        onTrack,
        alertThresholds,
        triggeredAlerts,
      };
    } catch (error) {
      this.logger.error('Budget status calculation failed', {
        supplierId,
        error,
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive cost report for billing period
   */
  async generateCostReport(
    supplierId: string,
    billingPeriod: string,
  ): Promise<{
    summary: any;
    platformUsage: any;
    clientUsage: any;
    recommendations: string[];
  }> {
    try {
      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('billing_period', billingPeriod);

      if (error) throw error;

      const platformUsage = usage.filter((u) => u.provider_type === 'platform');
      const clientUsage = usage.filter((u) => u.provider_type === 'client');

      const platformCost = platformUsage.reduce(
        (sum, u) => sum + parseFloat(u.cost_pounds),
        0,
      );
      const clientCost = clientUsage.reduce(
        (sum, u) => sum + parseFloat(u.cost_pounds),
        0,
      );
      const totalCost = platformCost + clientCost;

      // Calculate what client usage would have cost on platform
      const estimatedPlatformCostForClientUsage = clientUsage.length * 0.01; // £0.01 per request
      const savings = Math.max(
        0,
        estimatedPlatformCostForClientUsage - clientCost,
      );
      const savingsPercentage =
        estimatedPlatformCostForClientUsage > 0
          ? (savings / estimatedPlatformCostForClientUsage) * 100
          : 0;

      const recommendations: string[] = [];

      // Generate recommendations
      if (clientUsage.length === 0 && platformCost > 10) {
        recommendations.push(
          'Consider adding your own API key to reduce costs by up to 70%',
        );
      }

      if (
        platformUsage.filter((u) => parseFloat(u.cost_pounds) > 0).length > 50
      ) {
        recommendations.push(
          'High platform usage detected - client API would save significant costs',
        );
      }

      if (savingsPercentage > 50) {
        recommendations.push(
          `Excellent API key usage - saving ${savingsPercentage.toFixed(1)}% vs platform`,
        );
      }

      const summary = {
        billingPeriod,
        totalRequests: usage.length,
        totalCost,
        platformCost,
        clientCost,
        savings,
        savingsPercentage,
        averageResponseTime:
          usage.reduce((sum, u) => sum + u.response_time_ms, 0) / usage.length,
        successRate: usage.filter((u) => u.success).length / usage.length,
      };

      return {
        summary,
        platformUsage: this.aggregateUsageByFeature(platformUsage),
        clientUsage: this.aggregateUsageByFeature(clientUsage),
        recommendations,
      };
    } catch (error) {
      this.logger.error('Cost report generation failed', { supplierId, error });
      throw error;
    }
  }

  /**
   * Calculate projected monthly costs based on current usage
   */
  async calculateProjectedCosts(supplierId: string): Promise<{
    platform: { current: number; projected: number };
    client: { current: number; projected: number };
    recommendations: string[];
  }> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysElapsed = Math.floor(
        (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();

      const currentMonth = this.getCurrentBillingPeriod();
      const { data: usage, error } = await this.supabase
        .from('ai_usage_tracking')
        .select('provider_type, cost_pounds')
        .eq('supplier_id', supplierId)
        .eq('billing_period', currentMonth);

      if (error) throw error;

      const platformCurrent = usage
        .filter((u) => u.provider_type === 'platform')
        .reduce((sum, u) => sum + parseFloat(u.cost_pounds), 0);

      const clientCurrent = usage
        .filter((u) => u.provider_type === 'client')
        .reduce((sum, u) => sum + parseFloat(u.cost_pounds), 0);

      const platformProjected =
        (platformCurrent / Math.max(daysElapsed, 1)) * daysInMonth;
      const clientProjected =
        (clientCurrent / Math.max(daysElapsed, 1)) * daysInMonth;

      const recommendations: string[] = [];

      if (platformProjected > 20 && clientCurrent === 0) {
        recommendations.push(
          'High platform costs detected - consider adding client API key',
        );
      }

      if (clientProjected > 100) {
        recommendations.push('High client API usage - monitor budget closely');
      }

      return {
        platform: { current: platformCurrent, projected: platformProjected },
        client: { current: clientCurrent, projected: clientProjected },
        recommendations,
      };
    } catch (error) {
      this.logger.error('Cost projection failed', { supplierId, error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private isPeakWeddingSeason(weddingDate?: Date): boolean {
    if (!weddingDate) return false;

    const dayOfWeek = weddingDate.getDay(); // 0 = Sunday, 6 = Saturday
    const month = weddingDate.getMonth(); // 0 = January

    // Peak season: Friday-Sunday (5,6,0) or peak months (May-October)
    return (
      dayOfWeek === 5 ||
      dayOfWeek === 6 ||
      dayOfWeek === 0 ||
      (month >= 4 && month <= 9)
    ); // May-October
  }

  private calculateAnalytics(data: any[]): UsageAnalytics {
    const totalRequests = data.length;
    const totalCost = data.reduce(
      (sum, row) => sum + parseFloat(row.cost_pounds),
      0,
    );
    const averageResponseTime =
      data.reduce((sum, row) => sum + row.response_time_ms, 0) / totalRequests;
    const successRate =
      data.filter((row) => row.success).length / totalRequests;

    // Feature breakdown
    const featureMap = new Map<
      AIFeatureType,
      { count: number; cost: number }
    >();
    data.forEach((row) => {
      const feature = row.feature_type as AIFeatureType;
      const current = featureMap.get(feature) || { count: 0, cost: 0 };
      featureMap.set(feature, {
        count: current.count + 1,
        cost: current.cost + parseFloat(row.cost_pounds),
      });
    });

    const topFeatures = Array.from(featureMap.entries())
      .map(([feature, stats]) => ({ feature, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily breakdown
    const dailyMap = new Map<string, { requests: number; cost: number }>();
    data.forEach((row) => {
      const date = row.created_at.split('T')[0];
      const current = dailyMap.get(date) || { requests: 0, cost: 0 };
      dailyMap.set(date, {
        requests: current.requests + 1,
        cost: current.cost + parseFloat(row.cost_pounds),
      });
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Provider breakdown
    const platformCount = data.filter(
      (row) => row.provider_type === 'platform',
    ).length;
    const clientCount = data.filter(
      (row) => row.provider_type === 'client',
    ).length;

    return {
      totalRequests,
      totalCost,
      averageResponseTime,
      successRate,
      topFeatures,
      dailyBreakdown,
      providerBreakdown: { platform: platformCount, client: clientCount },
    };
  }

  private aggregateUsageByFeature(usage: any[]): Record<string, any> {
    const result: Record<string, any> = {};

    usage.forEach((u) => {
      const feature = u.feature_type;
      if (!result[feature]) {
        result[feature] = {
          requests: 0,
          totalCost: 0,
          totalTokens: 0,
          averageResponseTime: 0,
          errors: 0,
        };
      }

      result[feature].requests++;
      result[feature].totalCost += parseFloat(u.cost_pounds);
      result[feature].totalTokens += u.tokens_input + u.tokens_output;
      result[feature].averageResponseTime += u.response_time_ms;
      if (!u.success) result[feature].errors++;
    });

    // Calculate averages
    Object.keys(result).forEach((feature) => {
      result[feature].averageResponseTime =
        result[feature].averageResponseTime / result[feature].requests;
      result[feature].errorRate =
        result[feature].errors / result[feature].requests;
    });

    return result;
  }

  /**
   * Update monthly billing summary (called after each usage event)
   */
  private async updateBillingSummary(supplierId: string): Promise<void> {
    try {
      const billingPeriod = this.getCurrentBillingPeriod();

      const { error } = await this.supabase.rpc(
        'generate_monthly_ai_billing_summary',
        {
          p_supplier_id: supplierId,
          p_billing_period: billingPeriod,
        },
      );

      if (error) {
        this.logger.error('Failed to update billing summary', {
          supplierId,
          error,
        });
      }
    } catch (error) {
      this.logger.error('Billing summary update failed', { supplierId, error });
    }
  }
}

export const costTrackingService = new CostTrackingService();
