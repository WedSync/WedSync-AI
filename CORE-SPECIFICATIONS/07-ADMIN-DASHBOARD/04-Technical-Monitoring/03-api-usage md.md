# 03-api-usage.md

# API Usage Monitoring & Management for WedSync/WedMe

## Overview

API usage monitoring is crucial for managing costs, preventing abuse, and ensuring optimal performance across all integrated services. WedSync relies on multiple external APIs that need careful monitoring and management.

## API Inventory

### Primary APIs Used

```tsx
interface APIServices {
  openai: {
    service: 'OpenAI GPT-4',
    purpose: 'AI form generation, smart suggestions',
    costModel: 'per-token',
    monthlyBudget: 300, // £
    criticalityLevel: 'high'
  },
  supabase: {
    service: 'Supabase',
    purpose: 'Database, Auth, Realtime, Storage',
    costModel: 'usage-based',
    monthlyBudget: 500, // £
    criticalityLevel: 'critical'
  },
  resend: {
    service: 'Resend Email',
    purpose: 'Transactional emails',
    costModel: 'per-email',
    monthlyBudget: 100, // £
    criticalityLevel: 'critical'
  },
  twilio: {
    service: 'Twilio',
    purpose: 'SMS/WhatsApp notifications',
    costModel: 'per-message',
    monthlyBudget: 150, // £
    criticalityLevel: 'medium'
  },
  vercel: {
    service: 'Vercel',
    purpose: 'Hosting, Edge Functions',
    costModel: 'usage-based',
    monthlyBudget: 200, // £
    criticalityLevel: 'critical'
  }
}

```

## Implementation Architecture

### 1. API Usage Tracker

```tsx
// lib/apiUsageTracker.ts
import { createClient } from '@supabase/supabase-js';

export class APIUsageTracker {
  private static instance: APIUsageTracker;
  private usageBuffer: Map<string, APIUsageEvent[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  static getInstance(): APIUsageTracker {
    if (!APIUsageTracker.instance) {
      APIUsageTracker.instance = new APIUsageTracker();
    }
    return APIUsageTracker.instance;
  }

  constructor() {
    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushUsageBuffer();
    }, 30000);
  }

  async trackUsage(event: APIUsageEvent) {
    const service = event.service;

    if (!this.usageBuffer.has(service)) {
      this.usageBuffer.set(service, []);
    }

    this.usageBuffer.get(service)!.push({
      ...event,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      userId: event.userId || 'system',
      requestId: this.generateRequestId()
    });

    // Check rate limits
    await this.checkRateLimits(service, event);

    // Check budget alerts
    await this.checkBudgetAlerts(service);

    // Immediate flush for high-cost operations
    if (event.cost && event.cost > 1) {
      await this.flushUsageBuffer();
    }
  }

  private async checkRateLimits(service: string, event: APIUsageEvent) {
    const limits = await this.getRateLimits(service);
    const currentUsage = await this.getCurrentUsage(service);

    if (currentUsage.requests >= limits.maxRequests * 0.8) {
      await this.triggerRateLimitWarning(service, currentUsage, limits);
    }

    if (currentUsage.requests >= limits.maxRequests) {
      throw new RateLimitError(`Rate limit exceeded for ${service}`);
    }
  }

  private async checkBudgetAlerts(service: string) {
    const budget = await this.getServiceBudget(service);
    const spent = await this.getMonthlySpend(service);
    const percentUsed = (spent / budget) * 100;

    if (percentUsed >= 90 && !this.hasAlert(service, 'budget_90')) {
      await this.sendBudgetAlert(service, percentUsed, 'critical');
    } else if (percentUsed >= 75 && !this.hasAlert(service, 'budget_75')) {
      await this.sendBudgetAlert(service, percentUsed, 'warning');
    }
  }

  private async flushUsageBuffer() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    for (const [service, events] of this.usageBuffer.entries()) {
      if (events.length === 0) continue;

      try {
        // Batch insert usage events
        const { error } = await supabase
          .from('api_usage_logs')
          .insert(events);

        if (error) throw error;

        // Update aggregated metrics
        await this.updateAggregatedMetrics(service, events);

        // Clear buffer for this service
        this.usageBuffer.set(service, []);
      } catch (error) {
        console.error(`Failed to flush usage for ${service}:`, error);
        // Keep events in buffer for retry
      }
    }
  }

  private async updateAggregatedMetrics(service: string, events: APIUsageEvent[]) {
    const metrics = {
      total_requests: events.length,
      total_tokens: events.reduce((sum, e) => sum + (e.tokens || 0), 0),
      total_cost: events.reduce((sum, e) => sum + (e.cost || 0), 0),
      avg_latency: events.reduce((sum, e) => sum + (e.latency || 0), 0) / events.length,
      error_count: events.filter(e => e.error).length
    };

    await this.storeMetrics(service, metrics);
  }
}

```

### 2. OpenAI API Usage Monitor

```tsx
// lib/apis/openaiMonitor.ts
export class OpenAIMonitor {
  private tracker: APIUsageTracker;

  constructor() {
    this.tracker = APIUsageTracker.getInstance();
  }

  async trackCompletion(
    prompt: string,
    completion: string,
    model: string = 'gpt-4'
  ) {
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(completion);
    const totalTokens = promptTokens + completionTokens;

    const cost = this.calculateCost(model, promptTokens, completionTokens);

    await this.tracker.trackUsage({
      service: 'openai',
      endpoint: '/v1/chat/completions',
      method: 'POST',
      tokens: totalTokens,
      cost,
      metadata: {
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        purpose: this.categorizePurpose(prompt)
      }
    });

    // Cache responses for common prompts
    if (cost > 0.05) {
      await this.cacheExpensiveResponse(prompt, completion);
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = {
      'gpt-4': {
        prompt: 0.03 / 1000,      // $0.03 per 1K tokens
        completion: 0.06 / 1000    // $0.06 per 1K tokens
      },
      'gpt-3.5-turbo': {
        prompt: 0.001 / 1000,      // $0.001 per 1K tokens
        completion: 0.002 / 1000   // $0.002 per 1K tokens
      }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    const cost = (promptTokens * modelPricing.prompt) +
                 (completionTokens * modelPricing.completion);

    // Convert USD to GBP (approximate)
    return cost * 0.79;
  }

  private categorizePurpose(prompt: string): string {
    if (prompt.includes('form') || prompt.includes('questionnaire')) {
      return 'form_generation';
    }
    if (prompt.includes('email') || prompt.includes('message')) {
      return 'email_composition';
    }
    if (prompt.includes('suggest') || prompt.includes('recommend')) {
      return 'suggestions';
    }
    return 'general';
  }

  async optimizeUsage() {
    // Implement caching strategies
    const cachedResponse = await this.checkCache(prompt);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Use cheaper models for simple tasks
    const complexity = this.assessComplexity(prompt);
    const model = complexity > 7 ? 'gpt-4' : 'gpt-3.5-turbo';

    // Implement prompt compression
    const compressedPrompt = this.compressPrompt(prompt);

    return { model, prompt: compressedPrompt };
  }
}

```

### 3. Supabase Usage Monitor

```tsx
// lib/apis/supabaseMonitor.ts
export class SupabaseMonitor {
  private metrics = {
    database: {
      queries: 0,
      avgLatency: 0,
      slowQueries: []
    },
    storage: {
      uploads: 0,
      downloads: 0,
      bandwidth: 0
    },
    realtime: {
      connections: 0,
      messages: 0
    }
  };

  async trackDatabaseQuery(query: string, duration: number) {
    this.metrics.database.queries++;
    this.updateAvgLatency(duration);

    if (duration > 1000) {
      this.metrics.database.slowQueries.push({
        query: this.sanitizeQuery(query),
        duration,
        timestamp: new Date().toISOString()
      });
    }

    await APIUsageTracker.getInstance().trackUsage({
      service: 'supabase',
      endpoint: 'database',
      method: 'QUERY',
      latency: duration,
      metadata: {
        query_type: this.getQueryType(query),
        table: this.extractTable(query),
        slow: duration > 1000
      }
    });
  }

  async trackStorageUsage(operation: 'upload' | 'download', bytes: number) {
    if (operation === 'upload') {
      this.metrics.storage.uploads++;
    } else {
      this.metrics.storage.downloads++;
    }

    this.metrics.storage.bandwidth += bytes;

    await APIUsageTracker.getInstance().trackUsage({
      service: 'supabase',
      endpoint: 'storage',
      method: operation.toUpperCase(),
      metadata: {
        bytes,
        bandwidth_gb: bytes / (1024 * 1024 * 1024)
      }
    });
  }

  getHealthStatus(): SupabaseHealth {
    const dbHealth = this.calculateDatabaseHealth();
    const storageHealth = this.calculateStorageHealth();
    const realtimeHealth = this.calculateRealtimeHealth();

    return {
      overall: Math.min(dbHealth.score, storageHealth.score, realtimeHealth.score),
      database: dbHealth,
      storage: storageHealth,
      realtime: realtimeHealth,
      recommendations: this.generateRecommendations()
    };
  }

  private calculateDatabaseHealth(): ComponentHealth {
    const avgLatency = this.metrics.database.avgLatency;
    const slowQueryRatio = this.metrics.database.slowQueries.length /
                          Math.max(this.metrics.database.queries, 1);

    let score = 100;
    if (avgLatency > 500) score -= 20;
    if (avgLatency > 1000) score -= 30;
    if (slowQueryRatio > 0.1) score -= 20;
    if (slowQueryRatio > 0.2) score -= 20;

    return {
      score: Math.max(score, 0),
      status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'unhealthy',
      metrics: {
        avgLatency,
        slowQueryRatio,
        totalQueries: this.metrics.database.queries
      }
    };
  }
}

```

### 4. Database Schema for API Usage

```sql
-- API usage logs table
CREATE TABLE api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255),
  method VARCHAR(20),
  user_id UUID REFERENCES users(id),
  request_id VARCHAR(100),
  tokens INTEGER,
  cost DECIMAL(10, 6),
  latency INTEGER, -- milliseconds
  status_code INTEGER,
  error BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB,
  environment VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_usage_timestamp ON api_usage_logs(timestamp DESC);
CREATE INDEX idx_api_usage_service ON api_usage_logs(service);
CREATE INDEX idx_api_usage_user ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_cost ON api_usage_logs(cost) WHERE cost > 0;

-- Aggregated metrics table
CREATE TABLE api_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hour INTEGER NOT NULL,
  service VARCHAR(50) NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  avg_latency DECIMAL(10, 2),
  p95_latency DECIMAL(10, 2),
  p99_latency DECIMAL(10, 2),
  unique_users INTEGER DEFAULT 0,
  UNIQUE(date, hour, service)
);

-- API budgets and limits
CREATE TABLE api_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service VARCHAR(50) NOT NULL UNIQUE,
  monthly_budget DECIMAL(10, 2) NOT NULL,
  daily_limit DECIMAL(10, 2),
  alert_threshold_percent INTEGER DEFAULT 75,
  hard_limit BOOLEAN DEFAULT FALSE,
  rate_limit_per_minute INTEGER,
  rate_limit_per_hour INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

```

### 5. Real-Time Usage Dashboard

```tsx
// components/APIUsageDashboard.tsx
export function APIUsageDashboard() {
  const { data: usage } = useAPIUsage();
  const { data: budgets } = useAPIBudgets();

  return (
    <div className="api-dashboard">
      <div className="usage-overview">
        <h2>API Usage Overview</h2>

        {Object.entries(usage).map(([service, data]) => (
          <ServiceUsageCard
            key={service}
            service={service}
            usage={data}
            budget={budgets[service]}
          />
        ))}
      </div>

      <div className="cost-breakdown">
        <h3>Cost Breakdown (MTD)</h3>
        <CostChart data={usage} />

        <div className="projections">
          <h4>End of Month Projections</h4>
          <ProjectedCosts current={usage} daysRemaining={getDaysRemaining()} />
        </div>
      </div>

      <div className="alerts-section">
        <h3>Active Alerts</h3>
        <APIAlerts />
      </div>
    </div>
  );
}

function ServiceUsageCard({ service, usage, budget }) {
  const percentUsed = (usage.cost / budget.monthly) * 100;
  const isWarning = percentUsed > 75;
  const isCritical = percentUsed > 90;

  return (
    <div className={`service-card ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`}>
      <h4>{service}</h4>

      <div className="metrics">
        <div className="metric">
          <span>Requests</span>
          <span>{usage.requests.toLocaleString()}</span>
        </div>

        <div className="metric">
          <span>Cost</span>
          <span>£{usage.cost.toFixed(2)}</span>
        </div>

        <div className="metric">
          <span>Avg Latency</span>
          <span>{usage.avgLatency}ms</span>
        </div>
      </div>

      <div className="budget-bar">
        <div
          className="usage-fill"
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
        <span className="budget-text">
          {percentUsed.toFixed(1)}% of £{budget.monthly}
        </span>
      </div>

      {isCritical && (
        <div className="alert">
          ⚠️ Critical: Approaching budget limit!
        </div>
      )}
    </div>
  );
}

```

### 6. Cost Optimization Engine

```tsx
// lib/costOptimizer.ts
export class CostOptimizer {
  async analyzeCostPatterns(): Promise<CostOptimizationReport> {
    const usage = await this.getHistoricalUsage(30); // Last 30 days

    return {
      openai: await this.optimizeOpenAI(usage.openai),
      supabase: await this.optimizeSupabase(usage.supabase),
      email: await this.optimizeEmail(usage.email),
      totalSavingsPotential: 0,
      recommendations: []
    };
  }

  private async optimizeOpenAI(usage: ServiceUsage): Promise<ServiceOptimization> {
    const recommendations = [];
    let savingsPotential = 0;

    // Analyze token usage patterns
    const tokenAnalysis = this.analyzeTokenUsage(usage);

    if (tokenAnalysis.avgTokensPerRequest > 1000) {
      recommendations.push({
        action: 'Implement prompt compression',
        impact: 'Could reduce token usage by 20-30%',
        savings: usage.monthlyCost * 0.25
      });
      savingsPotential += usage.monthlyCost * 0.25;
    }

    // Check for repeated prompts
    const duplicates = this.findDuplicatePrompts(usage);
    if (duplicates.percentage > 10) {
      recommendations.push({
        action: 'Cache frequent AI responses',
        impact: `${duplicates.percentage}% of requests are duplicates`,
        savings: usage.monthlyCost * (duplicates.percentage / 100)
      });
      savingsPotential += usage.monthlyCost * (duplicates.percentage / 100);
    }

    // Model selection optimization
    const modelUsage = this.analyzeModelUsage(usage);
    if (modelUsage.gpt4Percentage > 50) {
      recommendations.push({
        action: 'Use GPT-3.5 for simple tasks',
        impact: 'Reduce costs by 10x for suitable prompts',
        savings: usage.monthlyCost * 0.3
      });
      savingsPotential += usage.monthlyCost * 0.3;
    }

    return {
      service: 'openai',
      currentCost: usage.monthlyCost,
      optimizedCost: usage.monthlyCost - savingsPotential,
      savingsPotential,
      recommendations
    };
  }

  private async optimizeSupabase(usage: ServiceUsage): Promise<ServiceOptimization> {
    const recommendations = [];
    let savingsPotential = 0;

    // Database query optimization
    const slowQueries = await this.getSlowQueries();
    if (slowQueries.length > 0) {
      recommendations.push({
        action: 'Optimize slow database queries',
        impact: `${slowQueries.length} queries taking >1s`,
        savings: usage.monthlyCost * 0.1,
        details: slowQueries.map(q => ({
          query: q.query,
          avgTime: q.avgTime,
          suggestion: this.suggestQueryOptimization(q)
        }))
      });
      savingsPotential += usage.monthlyCost * 0.1;
    }

    // Storage optimization
    const storageAnalysis = await this.analyzeStorage();
    if (storageAnalysis.unusedFiles > 1000) {
      recommendations.push({
        action: 'Clean up unused files',
        impact: `${storageAnalysis.unusedSize}GB of unused storage`,
        savings: storageAnalysis.unusedSize * 0.02 // £0.02 per GB
      });
      savingsPotential += storageAnalysis.unusedSize * 0.02;
    }

    return {
      service: 'supabase',
      currentCost: usage.monthlyCost,
      optimizedCost: usage.monthlyCost - savingsPotential,
      savingsPotential,
      recommendations
    };
  }
}

```

### 7. Rate Limiting Implementation

```tsx
// lib/rateLimiter.ts
export class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  private usage: Map<string, UsageWindow[]> = new Map();

  constructor() {
    this.initializeLimits();
  }

  private initializeLimits() {
    this.limits.set('openai', {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000,
      costPerDay: 10 // £10 daily limit
    });

    this.limits.set('email', {
      perMinute: 10,
      perHour: 500,
      perDay: 5000
    });

    this.limits.set('sms', {
      perMinute: 5,
      perHour: 100,
      perDay: 1000
    });
  }

  async checkLimit(service: string, userId?: string): Promise<boolean> {
    const key = `${service}:${userId || 'global'}`;
    const limit = this.limits.get(service);

    if (!limit) return true;

    const now = Date.now();
    const windows = this.usage.get(key) || [];

    // Clean old entries
    const activeWindows = windows.filter(w =>
      now - w.timestamp < 86400000 // Keep 24 hours
    );

    // Check per-minute limit
    const lastMinute = activeWindows.filter(w =>
      now - w.timestamp < 60000
    );
    if (lastMinute.length >= limit.perMinute) {
      throw new RateLimitError('Per-minute limit exceeded');
    }

    // Check per-hour limit
    const lastHour = activeWindows.filter(w =>
      now - w.timestamp < 3600000
    );
    if (lastHour.length >= limit.perHour) {
      throw new RateLimitError('Per-hour limit exceeded');
    }

    // Check daily cost limit if applicable
    if (limit.costPerDay) {
      const todayCost = activeWindows
        .filter(w => this.isToday(w.timestamp))
        .reduce((sum, w) => sum + (w.cost || 0), 0);

      if (todayCost >= limit.costPerDay) {
        throw new RateLimitError('Daily cost limit exceeded');
      }
    }

    // Record usage
    activeWindows.push({ timestamp: now });
    this.usage.set(key, activeWindows);

    return true;
  }

  async getUserLimits(userId: string): Promise<UserLimits> {
    const userTier = await this.getUserTier(userId);

    const multipliers = {
      free: 0.1,
      starter: 0.5,
      professional: 1.0,
      scale: 2.0,
      enterprise: 5.0
    };

    const multiplier = multipliers[userTier] || 0.1;

    return {
      openai: {
        daily: Math.floor(100 * multiplier),
        costLimit: 0.5 * multiplier
      },
      email: {
        daily: Math.floor(100 * multiplier)
      },
      storage: {
        maxGB: 5 * multiplier
      }
    };
  }
}

```

### 8. Alert System

```tsx
// lib/apiAlerts.ts
export class APIAlertSystem {
  private alertThresholds = {
    cost: {
      daily: { warning: 0.75, critical: 0.9 },
      monthly: { warning: 0.75, critical: 0.9 }
    },
    errors: {
      rate: { warning: 0.05, critical: 0.1 }, // 5%, 10%
    },
    latency: {
      p95: { warning: 2000, critical: 5000 }, // ms
    }
  };

  async checkAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check cost alerts
    const costAlerts = await this.checkCostAlerts();
    alerts.push(...costAlerts);

    // Check error rate alerts
    const errorAlerts = await this.checkErrorRates();
    alerts.push(...errorAlerts);

    // Check latency alerts
    const latencyAlerts = await this.checkLatencyAlerts();
    alerts.push(...latencyAlerts);

    // Check unusual activity
    const anomalyAlerts = await this.detectAnomalies();
    alerts.push(...anomalyAlerts);

    return alerts;
  }

  private async detectAnomalies(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const recentUsage = await this.getRecentUsage(60); // Last hour
    const historicalAvg = await this.getHistoricalAverage();

    for (const [service, usage] of Object.entries(recentUsage)) {
      const historical = historicalAvg[service];

      // Check for spike in usage (3x normal)
      if (usage.requests > historical.avgRequests * 3) {
        alerts.push({
          type: 'anomaly',
          severity: 'warning',
          service,
          message: `Unusual spike in ${service} usage: ${usage.requests} requests (normal: ${historical.avgRequests})`,
          metadata: {
            current: usage.requests,
            normal: historical.avgRequests,
            spike: usage.requests / historical.avgRequests
          }
        });
      }

      // Check for unusual cost pattern
      if (usage.cost > historical.avgCost * 5) {
        alerts.push({
          type: 'anomaly',
          severity: 'critical',
          service,
          message: `Abnormal cost spike for ${service}: £${usage.cost} (normal: £${historical.avgCost})`,
          action: 'Investigate immediately - possible abuse or misconfiguration'
        });
      }
    }

    return alerts;
  }
}

```

## Monitoring Queries

### Daily API Usage Report

```sql
-- Daily API usage summary
WITH daily_usage AS (
  SELECT
    date_trunc('day', timestamp) as date,
    service,
    COUNT(*) as requests,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(cost) as total_cost,
    AVG(latency) as avg_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency,
    SUM(CASE WHEN error THEN 1 ELSE 0 END) as errors
  FROM api_usage_logs
  WHERE timestamp > NOW() - INTERVAL '30 days'
  GROUP BY date, service
)
SELECT
  date,
  service,
  requests,
  unique_users,
  ROUND(total_cost::numeric, 2) as cost_gbp,
  ROUND(avg_latency::numeric, 0) as avg_latency_ms,
  ROUND(p95_latency::numeric, 0) as p95_latency_ms,
  errors,
  ROUND((errors::float / requests * 100)::numeric, 2) as error_rate
FROM daily_usage
ORDER BY date DESC, total_cost DESC;

```

### Cost Projection Query

```sql
-- Monthly cost projection based on current usage
WITH current_month AS (
  SELECT
    service,
    SUM(cost) as mtd_cost,
    COUNT(*) as mtd_requests,
    EXTRACT(DAY FROM NOW()) as days_elapsed,
    EXTRACT(DAY FROM date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day') as days_in_month
  FROM api_usage_logs
  WHERE timestamp >= date_trunc('month', NOW())
  GROUP BY service
),
projections AS (
  SELECT
    service,
    mtd_cost,
    mtd_requests,
    days_elapsed,
    days_in_month,
    (mtd_cost / days_elapsed * days_in_month) as projected_cost
  FROM current_month
)
SELECT
  p.service,
  ROUND(p.mtd_cost::numeric, 2) as current_spend,
  ROUND(p.projected_cost::numeric, 2) as projected_spend,
  b.monthly_budget,
  ROUND((p.projected_cost / b.monthly_budget * 100)::numeric, 1) as projected_percent,
  CASE
    WHEN p.projected_cost > b.monthly_budget THEN 'OVER BUDGET'
    WHEN p.projected_cost > b.monthly_budget * 0.9 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM projections p
JOIN api_budgets b ON p.service = b.service
ORDER BY projected_percent DESC;

```

## Best Practices

### 1. Cost Management

- Implement tiered usage limits based on subscription
- Cache expensive API responses
- Use cheaper alternatives when possible (GPT-3.5 vs GPT-4)
- Batch API requests where feasible

### 2. Performance Optimization

- Implement request queuing for non-critical operations
- Use exponential backoff for retries
- Monitor and optimize slow database queries
- Implement circuit breakers for failing services

### 3. Security

- Never log API keys or sensitive data
- Implement per-user rate limiting
- Monitor for unusual usage patterns
- Rotate API keys regularly

### 4. Monitoring

- Set up automated alerts for budget thresholds
- Track usage patterns by feature and user segment
- Monitor API latency and error rates
- Regular review of cost optimization opportunities

## Success Metrics

- **Budget Adherence**: Stay within 95% of monthly budget
- **API Availability**: >99.9% uptime for critical APIs
- **Response Time**: P95 latency <2 seconds for all APIs
- **Error Rate**: <1% error rate for API calls
- **Cost Efficiency**: 20% reduction in API costs through optimization