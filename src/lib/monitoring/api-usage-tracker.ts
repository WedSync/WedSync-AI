/**
 * WS-233 API Usage Tracking System - Team C Integration
 * Core service for monitoring external API usage, costs, and rate limits
 * Integrates with OpenAI, Supabase, Resend, Twilio, and Vercel APIs
 */

import { createClient } from '@/lib/supabase/server';

// API Service Types
export type APIService = 'openai' | 'supabase' | 'resend' | 'twilio' | 'vercel';

// Usage Event Interface
export interface APIUsageEvent {
  id?: string;
  apiService: APIService;
  endpoint: string;
  method: string;
  requestId: string;
  organizationId: string;
  userId?: string;
  requestSize?: number;
  responseSize?: number;
  duration: number;
  statusCode: number;
  cost: number;
  tokens?: number;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTime: Date;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Budget Configuration
export interface APIBudget {
  id?: string;
  organizationId: string;
  apiService: APIService;
  monthlyLimit: number;
  currentUsage: number;
  warningThreshold: number; // 80% by default
  criticalThreshold: number; // 95% by default
  isActive: boolean;
  notificationsSent: number;
  lastResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Rate Limit Configuration
export interface APIRateLimit {
  id?: string;
  organizationId: string;
  apiService: APIService;
  endpoint: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Usage Buffer for Batch Processing
interface UsageBuffer {
  events: APIUsageEvent[];
  lastFlush: Date;
  size: number;
}

// Cost Configuration per API Service
const API_COST_CONFIG = {
  openai: {
    'gpt-4': {
      inputTokens: 0.00003, // $0.03 per 1K tokens
      outputTokens: 0.00006, // $0.06 per 1K tokens
    },
    'gpt-4-vision-preview': {
      inputTokens: 0.00003,
      outputTokens: 0.00006,
    },
    'text-embedding-3-small': {
      inputTokens: 0.00000002, // $0.02 per 1M tokens
      outputTokens: 0,
    },
  },
  supabase: {
    database: 0.00000125, // $0.0125 per 10K rows
    auth: 0.00000099, // $0.00099 per MAU
    storage: 0.021, // $0.021 per GB
    realtime: 0.00000249, // $2.49 per million messages
  },
  resend: {
    email: 0.0004, // $0.40 per 1K emails
  },
  twilio: {
    sms: 0.0075, // $0.0075 per SMS
    voice: 0.0225, // $0.0225 per minute
  },
  vercel: {
    function: 0.0000002, // $0.20 per 1M invocations
    bandwidth: 0.15, // $0.15 per GB
  },
} as const;

/**
 * Core API Usage Tracker
 * Handles monitoring, cost calculation, and rate limiting for all external APIs
 */
export class APIUsageTracker {
  private static instance: APIUsageTracker;
  private usageBuffer: Map<string, UsageBuffer> = new Map();
  private rateLimitCache: Map<string, Map<string, number[]>> = new Map();

  // Singleton pattern
  static getInstance(): APIUsageTracker {
    if (!APIUsageTracker.instance) {
      APIUsageTracker.instance = new APIUsageTracker();
    }
    return APIUsageTracker.instance;
  }

  private constructor() {
    // Start buffer flush timer (every 30 seconds)
    setInterval(() => this.flushBuffers(), 30000);
  }

  /**
   * Track API usage event
   */
  async trackAPIUsage(
    usage: Omit<APIUsageEvent, 'id' | 'cost' | 'createdAt'>,
  ): Promise<void> {
    try {
      // Calculate cost
      const cost = this.calculateCost(usage);

      // Create complete usage event
      const completeEvent: APIUsageEvent = {
        ...usage,
        cost,
        createdAt: new Date(),
      };

      // Add to buffer for batch processing
      this.addToBuffer(completeEvent);

      // Check if we need immediate attention (errors, high costs)
      if (usage.statusCode >= 400 || cost > 1.0) {
        await this.handleImmediateEvent(completeEvent);
      }

      // Update rate limit tracking
      this.updateRateLimitTracking(
        usage.organizationId,
        usage.apiService,
        usage.endpoint,
      );
    } catch (error) {
      console.error('Failed to track API usage:', error);
      // Don't throw - tracking failures shouldn't break API calls
    }
  }

  /**
   * Get current budget status for organization
   */
  async getBudgetStatus(
    organizationId: string,
    apiService?: APIService,
  ): Promise<APIBudget[]> {
    const supabase = await createClient();

    let query = supabase
      .from('api_budgets')
      .select('*')
      .eq('organizationId', organizationId)
      .eq('isActive', true);

    if (apiService) {
      query = query.eq('apiService', apiService);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get budget status:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if API usage is within budget and rate limits
   */
  async checkUsageLimits(
    organizationId: string,
    apiService: APIService,
    endpoint: string,
    estimatedCost: number = 0,
  ): Promise<{
    allowed: boolean;
    budgetExceeded: boolean;
    rateLimitExceeded: boolean;
    warnings: string[];
  }> {
    try {
      const warnings: string[] = [];
      let budgetExceeded = false;
      let rateLimitExceeded = false;

      // Check budget limits
      const budgets = await this.getBudgetStatus(organizationId, apiService);
      const budget = budgets[0];

      if (budget) {
        const projectedUsage = budget.currentUsage + estimatedCost;
        const monthlyLimit = budget.monthlyLimit;

        if (projectedUsage > monthlyLimit) {
          budgetExceeded = true;
          warnings.push(
            `Budget exceeded: $${projectedUsage.toFixed(4)} > $${monthlyLimit.toFixed(2)}`,
          );
        } else if (
          projectedUsage >
          monthlyLimit * (budget.warningThreshold / 100)
        ) {
          warnings.push(
            `Budget warning: $${projectedUsage.toFixed(4)} (${((projectedUsage / monthlyLimit) * 100).toFixed(1)}% of limit)`,
          );
        }
      }

      // Check rate limits
      const rateLimitKey = `${organizationId}_${apiService}_${endpoint}`;
      const requests =
        this.rateLimitCache.get(rateLimitKey)?.get('minute') || [];
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Clean old requests
      const recentRequests = requests.filter((time) => time > oneMinuteAgo);

      // Get rate limit config
      const rateLimit = await this.getRateLimit(
        organizationId,
        apiService,
        endpoint,
      );
      if (rateLimit && recentRequests.length >= rateLimit.requestsPerMinute) {
        rateLimitExceeded = true;
        warnings.push(
          `Rate limit exceeded: ${recentRequests.length}/${rateLimit.requestsPerMinute} requests per minute`,
        );
      }

      return {
        allowed: !budgetExceeded && !rateLimitExceeded,
        budgetExceeded,
        rateLimitExceeded,
        warnings,
      };
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      // Return conservative response on error
      return {
        allowed: true,
        budgetExceeded: false,
        rateLimitExceeded: false,
        warnings: ['Unable to verify limits - proceeding with caution'],
      };
    }
  }

  /**
   * Get usage analytics for dashboard
   */
  async getUsageAnalytics(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    apiService?: APIService,
  ): Promise<{
    totalCost: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; cost: number; requests: number }>;
    dailyUsage: Array<{ date: string; cost: number; requests: number }>;
    serviceBreakdown: Array<{
      service: APIService;
      cost: number;
      requests: number;
    }>;
  }> {
    const supabase = await createClient();

    let query = supabase
      .from('api_usage_events')
      .select('*')
      .eq('organizationId', organizationId)
      .gte('createdAt', dateRange.start.toISOString())
      .lte('createdAt', dateRange.end.toISOString());

    if (apiService) {
      query = query.eq('apiService', apiService);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Failed to get usage analytics:', error);
      return {
        totalCost: 0,
        totalRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        topEndpoints: [],
        dailyUsage: [],
        serviceBreakdown: [],
      };
    }

    // Calculate analytics
    const totalCost = data.reduce((sum, event) => sum + event.cost, 0);
    const totalRequests = data.length;
    const errorRequests = data.filter(
      (event) => event.statusCode >= 400,
    ).length;
    const errorRate =
      totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    const averageResponseTime =
      data.length > 0
        ? data.reduce((sum, event) => sum + event.duration, 0) / data.length
        : 0;

    // Top endpoints
    const endpointStats = new Map<string, { cost: number; requests: number }>();
    data.forEach((event) => {
      const current = endpointStats.get(event.endpoint) || {
        cost: 0,
        requests: 0,
      };
      endpointStats.set(event.endpoint, {
        cost: current.cost + event.cost,
        requests: current.requests + 1,
      });
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Daily usage
    const dailyStats = new Map<string, { cost: number; requests: number }>();
    data.forEach((event) => {
      const date = event.createdAt.split('T')[0];
      const current = dailyStats.get(date) || { cost: 0, requests: 0 };
      dailyStats.set(date, {
        cost: current.cost + event.cost,
        requests: current.requests + 1,
      });
    });

    const dailyUsage = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Service breakdown
    const serviceStats = new Map<
      APIService,
      { cost: number; requests: number }
    >();
    data.forEach((event) => {
      const current = serviceStats.get(event.apiService) || {
        cost: 0,
        requests: 0,
      };
      serviceStats.set(event.apiService, {
        cost: current.cost + event.cost,
        requests: current.requests + 1,
      });
    });

    const serviceBreakdown = Array.from(serviceStats.entries()).map(
      ([service, stats]) => ({ service, ...stats }),
    );

    return {
      totalCost,
      totalRequests,
      errorRate,
      averageResponseTime,
      topEndpoints,
      dailyUsage,
      serviceBreakdown,
    };
  }

  /**
   * Create or update budget for organization
   */
  async setBudget(
    budget: Omit<APIBudget, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from('api_budgets').upsert(
      {
        ...budget,
        updatedAt: new Date().toISOString(),
      },
      {
        onConflict: 'organizationId,apiService',
      },
    );

    if (error) {
      console.error('Failed to set budget:', error);
      throw new Error(`Failed to set budget: ${error.message}`);
    }
  }

  /**
   * Calculate cost for API usage
   */
  private calculateCost(
    usage: Omit<APIUsageEvent, 'id' | 'cost' | 'createdAt'>,
  ): number {
    const serviceConfig = API_COST_CONFIG[usage.apiService];
    if (!serviceConfig) return 0;

    try {
      switch (usage.apiService) {
        case 'openai': {
          const model = usage.metadata?.model || 'gpt-4';
          const modelConfig =
            serviceConfig[model as keyof typeof serviceConfig];
          if (!modelConfig || typeof modelConfig === 'number') return 0;

          const inputTokens = usage.metadata?.usage?.prompt_tokens || 0;
          const outputTokens = usage.metadata?.usage?.completion_tokens || 0;

          return (
            inputTokens * modelConfig.inputTokens +
            outputTokens * modelConfig.outputTokens
          );
        }

        case 'supabase': {
          const operationType = usage.metadata?.operationType || 'database';
          const costPerUnit = serviceConfig[
            operationType as keyof typeof serviceConfig
          ] as number;
          const units = usage.metadata?.units || 1;

          return units * costPerUnit;
        }

        case 'resend': {
          return serviceConfig.email;
        }

        case 'twilio': {
          const messageType = usage.metadata?.messageType || 'sms';
          const costPerMessage = serviceConfig[
            messageType as keyof typeof serviceConfig
          ] as number;
          const segments = usage.metadata?.segments || 1;

          return segments * costPerMessage;
        }

        case 'vercel': {
          const operationType = usage.metadata?.operationType || 'function';
          const costPerUnit = serviceConfig[
            operationType as keyof typeof serviceConfig
          ] as number;
          const units = usage.metadata?.units || 1;

          return units * costPerUnit;
        }

        default:
          return 0;
      }
    } catch (error) {
      console.error('Cost calculation failed:', error);
      return 0;
    }
  }

  /**
   * Add usage event to buffer for batch processing
   */
  private addToBuffer(event: APIUsageEvent): void {
    const bufferKey = `${event.organizationId}_${event.apiService}`;
    let buffer = this.usageBuffer.get(bufferKey);

    if (!buffer) {
      buffer = {
        events: [],
        lastFlush: new Date(),
        size: 0,
      };
      this.usageBuffer.set(bufferKey, buffer);
    }

    buffer.events.push(event);
    buffer.size += 1;

    // Flush if buffer is full
    if (buffer.size >= 50) {
      this.flushBuffer(bufferKey);
    }
  }

  /**
   * Flush all buffers to database
   */
  private async flushBuffers(): Promise<void> {
    for (const [key] of this.usageBuffer) {
      await this.flushBuffer(key);
    }
  }

  /**
   * Flush specific buffer to database
   */
  private async flushBuffer(bufferKey: string): Promise<void> {
    const buffer = this.usageBuffer.get(bufferKey);
    if (!buffer || buffer.events.length === 0) return;

    try {
      const supabase = await createClient();

      const { error } = await supabase.from('api_usage_events').insert(
        buffer.events.map((event) => ({
          apiService: event.apiService,
          endpoint: event.endpoint,
          method: event.method,
          requestId: event.requestId,
          organizationId: event.organizationId,
          userId: event.userId,
          requestSize: event.requestSize,
          responseSize: event.responseSize,
          duration: event.duration,
          statusCode: event.statusCode,
          cost: event.cost,
          tokens: event.tokens,
          rateLimit: event.rateLimit,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
        })),
      );

      if (error) {
        console.error('Failed to flush usage buffer:', error);
      } else {
        // Clear buffer after successful flush
        buffer.events = [];
        buffer.size = 0;
        buffer.lastFlush = new Date();
      }
    } catch (error) {
      console.error('Buffer flush error:', error);
    }
  }

  /**
   * Handle immediate events (errors, high costs)
   */
  private async handleImmediateEvent(event: APIUsageEvent): Promise<void> {
    // Update budget immediately for high-cost events
    if (event.cost > 0.1) {
      await this.updateBudgetUsage(
        event.organizationId,
        event.apiService,
        event.cost,
      );
    }

    // Send alerts for errors or budget warnings
    if (event.statusCode >= 400 || event.cost > 1.0) {
      // In production, this would send notifications
      console.warn('API Usage Alert:', {
        organization: event.organizationId,
        service: event.apiService,
        endpoint: event.endpoint,
        status: event.statusCode,
        cost: event.cost,
        error: event.statusCode >= 400,
      });
    }
  }

  /**
   * Update budget usage in real-time
   */
  private async updateBudgetUsage(
    organizationId: string,
    apiService: APIService,
    cost: number,
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('increment_budget_usage', {
      org_id: organizationId,
      service: apiService,
      cost_increment: cost,
    });

    if (error) {
      console.error('Failed to update budget usage:', error);
    }
  }

  /**
   * Update rate limit tracking
   */
  private updateRateLimitTracking(
    organizationId: string,
    apiService: APIService,
    endpoint: string,
  ): void {
    const key = `${organizationId}_${apiService}_${endpoint}`;
    const now = Date.now();

    if (!this.rateLimitCache.has(key)) {
      this.rateLimitCache.set(
        key,
        new Map([
          ['minute', []],
          ['hour', []],
          ['day', []],
        ]),
      );
    }

    const cache = this.rateLimitCache.get(key)!;

    // Add current request to all time windows
    cache.get('minute')!.push(now);
    cache.get('hour')!.push(now);
    cache.get('day')!.push(now);

    // Clean old requests
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    cache.set(
      'minute',
      cache.get('minute')!.filter((time) => time > oneMinuteAgo),
    );
    cache.set(
      'hour',
      cache.get('hour')!.filter((time) => time > oneHourAgo),
    );
    cache.set(
      'day',
      cache.get('day')!.filter((time) => time > oneDayAgo),
    );
  }

  /**
   * Get rate limit configuration
   */
  private async getRateLimit(
    organizationId: string,
    apiService: APIService,
    endpoint: string,
  ): Promise<APIRateLimit | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('organizationId', organizationId)
      .eq('apiService', apiService)
      .eq('endpoint', endpoint)
      .eq('isActive', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

// Export singleton instance
export const apiUsageTracker = APIUsageTracker.getInstance();

// Convenience functions for common operations
export const trackOpenAIUsage = (
  organizationId: string,
  endpoint: string,
  method: string,
  requestId: string,
  duration: number,
  statusCode: number,
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  },
  model?: string,
  userId?: string,
) =>
  apiUsageTracker.trackAPIUsage({
    apiService: 'openai',
    endpoint,
    method,
    requestId,
    organizationId,
    userId,
    duration,
    statusCode,
    tokens: usage?.total_tokens,
    metadata: { usage, model },
  });

export const trackSupabaseUsage = (
  organizationId: string,
  endpoint: string,
  method: string,
  requestId: string,
  duration: number,
  statusCode: number,
  operationType: 'database' | 'auth' | 'storage' | 'realtime',
  units: number = 1,
  userId?: string,
) =>
  apiUsageTracker.trackAPIUsage({
    apiService: 'supabase',
    endpoint,
    method,
    requestId,
    organizationId,
    userId,
    duration,
    statusCode,
    metadata: { operationType, units },
  });

export const trackResendUsage = (
  organizationId: string,
  endpoint: string,
  requestId: string,
  duration: number,
  statusCode: number,
  emailCount: number = 1,
  userId?: string,
) =>
  apiUsageTracker.trackAPIUsage({
    apiService: 'resend',
    endpoint,
    method: 'POST',
    requestId,
    organizationId,
    userId,
    duration,
    statusCode,
    metadata: { emailCount },
  });

export const trackTwilioUsage = (
  organizationId: string,
  endpoint: string,
  requestId: string,
  duration: number,
  statusCode: number,
  messageType: 'sms' | 'voice',
  segments: number = 1,
  userId?: string,
) =>
  apiUsageTracker.trackAPIUsage({
    apiService: 'twilio',
    endpoint,
    method: 'POST',
    requestId,
    organizationId,
    userId,
    duration,
    statusCode,
    metadata: { messageType, segments },
  });

export const trackVercelUsage = (
  organizationId: string,
  endpoint: string,
  requestId: string,
  duration: number,
  statusCode: number,
  operationType: 'function' | 'bandwidth',
  units: number = 1,
  userId?: string,
) =>
  apiUsageTracker.trackAPIUsage({
    apiService: 'vercel',
    endpoint,
    method: 'POST',
    requestId,
    organizationId,
    userId,
    duration,
    statusCode,
    metadata: { operationType, units },
  });
