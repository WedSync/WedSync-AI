# WS-240: AI Cost Optimization System - Technical Specification

## User Story
**As a wedding supplier using WedSync's AI features,**  
**I want intelligent cost optimization that minimizes AI expenses while maintaining performance,**  
**So that I can use AI tools extensively during peak wedding season (March-October) without budget concerns.**

**Business Scenario:**
Photography studio "Capture Moments" uses AI for photo tagging, client communication, and content generation. During June (peak season, 1.6x multiplier), they process 15 weddings with 800+ photos each, requiring:
- 12,000 photo tags/month (AI vision)
- 450 client emails (AI composition)
- 180 social media posts (AI content generation)

Without optimization: £380/month in AI costs. With WS-240: £95/month (75% reduction) through smart caching, batch processing, and model selection.

## Database Schema

```sql
-- Core cost optimization configuration
CREATE TABLE ai_cost_optimization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  feature_type VARCHAR(50) NOT NULL, -- 'photo_ai', 'content_generation', 'chatbot'
  optimization_level VARCHAR(20) DEFAULT 'balanced', -- 'aggressive', 'balanced', 'quality_first'
  monthly_budget_pounds DECIMAL(10,2) DEFAULT 50.00,
  daily_budget_pounds DECIMAL(8,2) DEFAULT 5.00,
  alert_threshold_percent INTEGER DEFAULT 80, -- Alert at 80% of budget
  auto_disable_at_limit BOOLEAN DEFAULT true,
  cache_strategy JSONB DEFAULT '{"semantic": true, "exact": true, "ttl_hours": 24}',
  batch_processing_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, feature_type)
);

-- Real-time cost tracking
CREATE TABLE ai_cost_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  feature_type VARCHAR(50) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INTEGER NOT NULL DEFAULT EXTRACT(hour FROM NOW()),
  api_calls INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_pounds DECIMAL(8,4) DEFAULT 0.0000,
  model_used VARCHAR(50),
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  batch_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, feature_type, date, hour)
);

-- Semantic cache for AI responses
CREATE TABLE ai_response_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  feature_type VARCHAR(50) NOT NULL,
  query_hash VARCHAR(64) NOT NULL, -- SHA256 of query
  query_text TEXT NOT NULL,
  query_embedding vector(1536), -- OpenAI embedding for semantic search
  response_data JSONB NOT NULL,
  confidence_score DECIMAL(4,3), -- 0.000-1.000
  model_used VARCHAR(50),
  tokens_saved INTEGER DEFAULT 0,
  cost_saved_pounds DECIMAL(6,4) DEFAULT 0.0000,
  hit_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_ai_cache_supplier_feature (supplier_id, feature_type),
  INDEX idx_ai_cache_embedding USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100),
  INDEX idx_ai_cache_expires (expires_at),
  INDEX idx_ai_cache_hash (query_hash)
);

-- Batch processing queue
CREATE TABLE ai_batch_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  feature_type VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100), -- OpenAI batch ID when submitted
  priority INTEGER DEFAULT 1, -- 1=low, 5=urgent
  query_data JSONB NOT NULL,
  callback_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'submitted', 'processing', 'completed', 'failed'
  estimated_cost_pounds DECIMAL(6,4),
  actual_cost_pounds DECIMAL(6,4),
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_batch_status_priority (status, priority DESC, created_at),
  INDEX idx_batch_supplier (supplier_id, status)
);

-- Cost alerts and notifications
CREATE TABLE ai_cost_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  alert_type VARCHAR(30) NOT NULL, -- 'budget_warning', 'budget_exceeded', 'unusual_spike'
  feature_type VARCHAR(50),
  threshold_percent INTEGER,
  current_spend_pounds DECIMAL(8,2),
  budget_limit_pounds DECIMAL(8,2),
  period VARCHAR(10) NOT NULL, -- 'daily', 'monthly'
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_alerts_supplier_unack (supplier_id, acknowledged, created_at)
);

-- Performance analytics
CREATE VIEW ai_cost_performance AS
SELECT 
  supplier_id,
  feature_type,
  DATE_TRUNC('day', created_at) as day,
  SUM(cost_pounds) as daily_cost,
  SUM(api_calls) as total_calls,
  SUM(cache_hits) as cache_hits,
  SUM(cache_misses) as cache_misses,
  ROUND(SUM(cache_hits)::DECIMAL / NULLIF(SUM(cache_hits + cache_misses), 0) * 100, 2) as cache_hit_rate,
  AVG(tokens_input + tokens_output) as avg_tokens_per_call,
  SUM(CASE WHEN batch_processed THEN 1 ELSE 0 END) as batch_processed_calls
FROM ai_cost_tracking
GROUP BY supplier_id, feature_type, DATE_TRUNC('day', created_at);

-- Wedding season cost projections
CREATE TABLE ai_seasonal_projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  season_multiplier DECIMAL(3,2) NOT NULL, -- June: 1.60, December: 0.60
  projected_usage JSONB NOT NULL, -- Feature-specific usage predictions
  recommended_budget DECIMAL(8,2) NOT NULL,
  optimization_recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, month)
);
```

## API Endpoints

### Cost Optimization Management

```typescript
// GET /api/ai/cost-optimization/config
interface GetCostConfigResponse {
  optimizationLevel: 'aggressive' | 'balanced' | 'quality_first';
  monthlyBudget: number;
  dailyBudget: number;
  alertThreshold: number;
  autoDisable: boolean;
  cacheStrategy: {
    semantic: boolean;
    exact: boolean;
    ttlHours: number;
  };
  batchProcessing: boolean;
  currentSpend: {
    daily: number;
    monthly: number;
    percentOfBudget: number;
  };
}

// POST /api/ai/cost-optimization/config
interface UpdateCostConfigRequest {
  optimizationLevel?: 'aggressive' | 'balanced' | 'quality_first';
  monthlyBudget?: number;
  dailyBudget?: number;
  alertThreshold?: number;
  autoDisable?: boolean;
  cacheStrategy?: {
    semantic?: boolean;
    exact?: boolean;
    ttlHours?: number;
  };
  batchProcessing?: boolean;
}

// GET /api/ai/cost-optimization/analytics
interface GetCostAnalyticsResponse {
  currentPeriod: {
    daily: {
      spent: number;
      budget: number;
      callsMade: number;
      cacheHitRate: number;
    };
    monthly: {
      spent: number;
      budget: number;
      projectedSpend: number;
      savingsFromOptimization: number;
    };
  };
  
  featureBreakdown: Array<{
    featureType: string;
    cost: number;
    calls: number;
    averageCostPerCall: number;
    cacheHitRate: number;
    optimizationPotential: number;
  }>;
  
  seasonalProjection: {
    nextThreeMonths: Array<{
      month: number;
      projectedCost: number;
      recommendedBudget: number;
      seasonMultiplier: number;
    }>;
  };
  
  optimizationRecommendations: Array<{
    type: 'cache_strategy' | 'model_selection' | 'batch_processing' | 'prompt_optimization';
    title: string;
    description: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

// GET /api/ai/cost-optimization/alerts
interface GetCostAlertsResponse {
  active: Array<{
    id: string;
    type: 'budget_warning' | 'budget_exceeded' | 'unusual_spike';
    featureType?: string;
    message: string;
    thresholdPercent: number;
    currentSpend: number;
    budgetLimit: number;
    createdAt: string;
  }>;
  
  settings: {
    emailNotifications: boolean;
    slackWebhook?: string;
    alertThresholds: number[];
  };
}

// POST /api/ai/cost-optimization/batch-submit
interface BatchSubmitRequest {
  items: Array<{
    id: string;
    featureType: string;
    queryData: any;
    priority: 1 | 2 | 3 | 4 | 5;
    callbackUrl?: string;
  }>;
  maxWaitTime?: number; // seconds
}

interface BatchSubmitResponse {
  batchId: string;
  estimatedCompletion: string;
  estimatedCost: number;
  itemsQueued: number;
  estimatedSavings: number; // vs individual calls
}
```

### Cache Management

```typescript
// GET /api/ai/cache/stats
interface CacheStatsResponse {
  overall: {
    totalEntries: number;
    hitRate: number;
    savingsThisMonth: number;
    storageUsed: string; // "245 MB"
  };
  
  byFeature: Array<{
    featureType: string;
    entries: number;
    hitRate: number;
    avgConfidenceScore: number;
    savingsThisMonth: number;
  }>;
  
  semanticSimilarity: {
    averageThreshold: number;
    topSimilarQueries: Array<{
      original: string;
      similar: string;
      similarity: number;
      timesSaved: number;
    }>;
  };
}

// POST /api/ai/cache/clear
interface CacheClearRequest {
  featureType?: string;
  olderThan?: string; // ISO date
  belowConfidence?: number;
}

// GET /api/ai/batch/status/{batchId}
interface BatchStatusResponse {
  batchId: string;
  status: 'pending' | 'submitted' | 'processing' | 'completed' | 'failed';
  itemsTotal: number;
  itemsCompleted: number;
  estimatedCompletion?: string;
  actualCost?: number;
  results?: Array<{
    itemId: string;
    status: 'completed' | 'failed';
    response?: any;
    error?: string;
  }>;
}
```

## Frontend Components

### Cost Optimization Dashboard

```typescript
// src/components/ai/CostOptimizationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, DollarSign, Clock } from 'lucide-react';

interface CostOptimizationDashboardProps {
  supplierId: string;
}

export default function CostOptimizationDashboard({ supplierId }: CostOptimizationDashboardProps) {
  const [analytics, setAnalytics] = useState<GetCostAnalyticsResponse | null>(null);
  const [alerts, setAlerts] = useState<GetCostAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCostData();
  }, [supplierId]);

  const loadCostData = async () => {
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        fetch('/api/ai/cost-optimization/analytics'),
        fetch('/api/ai/cost-optimization/alerts')
      ]);

      setAnalytics(await analyticsRes.json());
      setAlerts(await alertsRes.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading cost optimization data...</div>;
  }

  const dailyUsage = analytics?.currentPeriod.daily.spent || 0;
  const dailyBudget = analytics?.currentPeriod.daily.budget || 0;
  const usagePercent = dailyBudget > 0 ? (dailyUsage / dailyBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {alerts?.active.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Cost Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.active.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-gray-600">
                      £{alert.currentSpend.toFixed(2)} / £{alert.budgetLimit.toFixed(2)} 
                      ({alert.thresholdPercent}% threshold)
                    </p>
                  </div>
                  <Badge variant={alert.type === 'budget_exceeded' ? 'destructive' : 'secondary'}>
                    {alert.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{dailyUsage.toFixed(2)}</div>
            <Progress value={usagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usagePercent.toFixed(1)}% of daily budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Projection</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{analytics?.currentPeriod.monthly.projectedSpend.toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              £{analytics?.currentPeriod.monthly.savingsFromOptimization.toFixed(2)} saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.currentPeriod.daily.cacheHitRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Queries served from cache
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.featureBreakdown.map((feature) => (
              <div key={feature.featureType} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{feature.featureType.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-sm text-gray-600">£{feature.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{feature.calls} calls (£{feature.averageCostPerCall.toFixed(4)} avg)</span>
                    <span>{feature.cacheHitRate.toFixed(1)}% cached</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.optimizationRecommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded">
                <div className="flex-1">
                  <h4 className="font-medium">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-medium">
                    Save £{rec.potentialSavings.toFixed(2)}/month
                  </div>
                  <Badge variant={rec.effort === 'low' ? 'secondary' : rec.effort === 'medium' ? 'default' : 'destructive'}>
                    {rec.effort.toUpperCase()} EFFORT
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Projection */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Season Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {analytics?.seasonalProjection.nextThreeMonths.map((month) => (
              <div key={month.month} className="text-center p-4 border rounded">
                <div className="font-medium">
                  {new Date(2025, month.month - 1).toLocaleDateString('en-US', { month: 'long' })}
                </div>
                <div className="text-lg font-bold mt-2">£{month.projectedCost.toFixed(2)}</div>
                <div className="text-sm text-gray-600">
                  {month.seasonMultiplier}x multiplier
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Recommended: £{month.recommendedBudget.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Cost Configuration Panel

```typescript
// src/components/ai/CostConfigurationPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

export default function CostConfigurationPanel() {
  const [config, setConfig] = useState<GetCostConfigResponse | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    const response = await fetch('/api/ai/cost-optimization/config');
    setConfig(await response.json());
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      await fetch('/api/ai/cost-optimization/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      // Show success toast
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Optimization Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={config.optimizationLevel}
            onValueChange={(value: 'aggressive' | 'balanced' | 'quality_first') => 
              setConfig({ ...config, optimizationLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aggressive">
                Aggressive - Maximum cost savings (may impact response time)
              </SelectItem>
              <SelectItem value="balanced">
                Balanced - Good savings with maintained quality
              </SelectItem>
              <SelectItem value="quality_first">
                Quality First - Minimal optimization, fastest responses
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-600">
            {config.optimizationLevel === 'aggressive' && 
              'Uses extensive caching, batch processing, and smaller models where possible. 60-75% cost reduction.'
            }
            {config.optimizationLevel === 'balanced' && 
              'Smart caching with quality checks, selective batch processing. 40-60% cost reduction.'
            }
            {config.optimizationLevel === 'quality_first' && 
              'Minimal caching, individual requests, premium models. 10-25% cost reduction.'
            }
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="monthly-budget">Monthly Budget (£)</Label>
            <Input
              id="monthly-budget"
              type="number"
              value={config.monthlyBudget}
              onChange={(e) => setConfig({ ...config, monthlyBudget: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="daily-budget">Daily Budget (£)</Label>
            <Input
              id="daily-budget"
              type="number"
              value={config.dailyBudget}
              onChange={(e) => setConfig({ ...config, dailyBudget: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>

          <Separator />

          <div>
            <Label>Alert Threshold: {config.alertThreshold}%</Label>
            <Slider
              value={[config.alertThreshold]}
              onValueChange={([value]) => setConfig({ ...config, alertThreshold: value })}
              max={95}
              min={50}
              step={5}
              className="mt-2"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-disable"
              checked={config.autoDisable}
              onCheckedChange={(checked) => setConfig({ ...config, autoDisable: checked })}
            />
            <Label htmlFor="auto-disable">
              Automatically disable AI features when budget limit is reached
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="semantic-cache"
              checked={config.cacheStrategy.semantic}
              onCheckedChange={(checked) => 
                setConfig({ 
                  ...config, 
                  cacheStrategy: { ...config.cacheStrategy, semantic: checked }
                })
              }
            />
            <Label htmlFor="semantic-cache">
              Semantic caching (finds similar questions, 40-60% cache hit rate)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="exact-cache"
              checked={config.cacheStrategy.exact}
              onCheckedChange={(checked) => 
                setConfig({ 
                  ...config, 
                  cacheStrategy: { ...config.cacheStrategy, exact: checked }
                })
              }
            />
            <Label htmlFor="exact-cache">
              Exact matching cache (identical queries, 90%+ cache hit rate)
            </Label>
          </div>

          <div>
            <Label>Cache TTL: {config.cacheStrategy.ttlHours} hours</Label>
            <Slider
              value={[config.cacheStrategy.ttlHours]}
              onValueChange={([value]) => 
                setConfig({ 
                  ...config, 
                  cacheStrategy: { ...config.cacheStrategy, ttlHours: value }
                })
              }
              max={168} // 7 days
              min={1}
              step={1}
              className="mt-2"
            />
          </div>

          <Separator />

          <div className="flex items-center space-x-2">
            <Switch
              id="batch-processing"
              checked={config.batchProcessing}
              onCheckedChange={(checked) => setConfig({ ...config, batchProcessing: checked })}
            />
            <Label htmlFor="batch-processing">
              Batch processing (groups requests for 50% cost reduction)
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfiguration} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
```

## Integration Points

### MCP Server Integration

```typescript
// src/lib/ai/mcp-cost-optimization.ts
import { MCPServer } from '@/lib/mcp/server';

export class CostOptimizationMCPIntegration {
  constructor(private mcpServer: MCPServer) {}

  // Monitor OpenAI MCP usage and costs
  async trackOpenAIUsage(request: any, response: any) {
    const tokens = this.calculateTokens(request, response);
    const cost = this.calculateCost(tokens, request.model);

    await this.mcpServer.postgres.query(`
      INSERT INTO ai_cost_tracking 
      (supplier_id, feature_type, tokens_input, tokens_output, cost_pounds, model_used)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (supplier_id, feature_type, date, hour)
      DO UPDATE SET 
        api_calls = ai_cost_tracking.api_calls + 1,
        tokens_input = ai_cost_tracking.tokens_input + $3,
        tokens_output = ai_cost_tracking.tokens_output + $4,
        cost_pounds = ai_cost_tracking.cost_pounds + $5
    `, [request.supplierId, request.featureType, tokens.input, tokens.output, cost, request.model]);
  }

  // Batch optimize with Context7 documentation
  async optimizeBatchWithContext7(batchItems: any[]) {
    // Use Context7 to get latest OpenAI batch API documentation
    const batchApiDocs = await this.mcpServer.context7.getLibraryDocs({
      context7CompatibleLibraryID: '/openai/openai-node',
      topic: 'batch_api'
    });

    // Apply latest best practices from documentation
    return this.createOptimizedBatch(batchItems, batchApiDocs);
  }

  // Real-time cost monitoring with alerts
  async checkCostLimits(supplierId: string, featureType: string) {
    const usage = await this.mcpServer.postgres.query(`
      SELECT 
        SUM(cost_pounds) as daily_spend,
        (SELECT SUM(cost_pounds) FROM ai_cost_tracking 
         WHERE supplier_id = $1 AND date >= DATE_TRUNC('month', NOW())) as monthly_spend
      FROM ai_cost_tracking 
      WHERE supplier_id = $1 AND date = CURRENT_DATE
    `, [supplierId]);

    const config = await this.getCostConfig(supplierId, featureType);
    
    if (usage.daily_spend >= config.dailyBudget * (config.alertThreshold / 100)) {
      await this.sendCostAlert(supplierId, {
        type: 'budget_warning',
        currentSpend: usage.daily_spend,
        budget: config.dailyBudget,
        period: 'daily'
      });
    }

    return {
      withinBudget: usage.daily_spend < config.dailyBudget,
      canProceed: !config.autoDisable || usage.daily_spend < config.dailyBudget
    };
  }
}
```

### Wedding Context Integration

```typescript
// src/lib/ai/wedding-cost-optimization.ts
export class WeddingCostOptimization {
  // Adjust costs based on wedding season
  private getSeasonMultiplier(date: Date): number {
    const month = date.getMonth() + 1;
    const seasonMultipliers = {
      1: 0.7,   // January - Low season
      2: 0.8,   // February
      3: 1.1,   // March - Season starts
      4: 1.3,   // April
      5: 1.5,   // May - Peak season approaching
      6: 1.6,   // June - Peak season
      7: 1.5,   // July
      8: 1.4,   // August
      9: 1.3,   // September
      10: 1.2,  // October - Season winding down
      11: 0.8,  // November - Low season
      12: 0.6   // December - Lowest season
    };
    
    return seasonMultipliers[month] || 1.0;
  }

  // Optimize based on wedding proximity
  async optimizeForWeddingDay(supplierId: string, weddingDate: Date) {
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilWedding <= 7) {
      // Wedding week - prioritize speed over cost
      return {
        optimizationLevel: 'quality_first',
        batchProcessing: false,
        cacheStrategy: { semantic: true, exact: true, ttlHours: 1 },
        priorityMultiplier: 1.5
      };
    } else if (daysUntilWedding <= 30) {
      // Wedding month - balanced approach
      return {
        optimizationLevel: 'balanced',
        batchProcessing: true,
        cacheStrategy: { semantic: true, exact: true, ttlHours: 6 },
        priorityMultiplier: 1.2
      };
    } else {
      // Planning phase - maximize cost savings
      return {
        optimizationLevel: 'aggressive',
        batchProcessing: true,
        cacheStrategy: { semantic: true, exact: true, ttlHours: 24 },
        priorityMultiplier: 1.0
      };
    }
  }

  // Vendor-specific optimizations
  async getVendorOptimizations(supplierType: string) {
    const optimizations = {
      photographer: {
        features: ['photo_ai', 'content_generation'],
        peakMonths: [5, 6, 7, 8, 9, 10],
        typicalUsage: 'high_burst', // Heavy usage during wedding season
        recommendedBudget: { monthly: 150, daily: 15 }
      },
      wedding_planner: {
        features: ['chatbot', 'content_generation', 'client_communication'],
        peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        typicalUsage: 'consistent', // Steady usage year-round
        recommendedBudget: { monthly: 100, daily: 10 }
      },
      venue: {
        features: ['chatbot', 'booking_automation'],
        peakMonths: [3, 4, 5, 6, 7, 8, 9, 10],
        typicalUsage: 'seasonal', // High during booking season
        recommendedBudget: { monthly: 75, daily: 8 }
      }
    };

    return optimizations[supplierType] || optimizations.wedding_planner;
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// src/__tests__/unit/ai-cost-optimization.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { AICostOptimizer } from '@/lib/ai/cost-optimizer';
import { mockSupabaseClient } from '@/test-utils/mocks';

describe('AI Cost Optimization', () => {
  let optimizer: AICostOptimizer;

  beforeEach(() => {
    optimizer = new AICostOptimizer(mockSupabaseClient);
  });

  test('applies correct season multipliers', () => {
    const juneMultiplier = optimizer.getSeasonMultiplier(new Date('2025-06-15'));
    const decemberMultiplier = optimizer.getSeasonMultiplier(new Date('2025-12-15'));
    
    expect(juneMultiplier).toBe(1.6); // Peak season
    expect(decemberMultiplier).toBe(0.6); // Low season
  });

  test('semantic cache finds similar queries', async () => {
    await optimizer.storeInCache('What flowers work for June weddings?', 'roses_response', 0.95);
    
    const cached = await optimizer.getCachedResponse('Which flowers are best for summer weddings?');
    expect(cached).toBeTruthy();
    expect(cached.confidence).toBeGreaterThan(0.8);
  });

  test('batch processing groups requests efficiently', async () => {
    const requests = Array.from({ length: 25 }, (_, i) => ({
      id: `req_${i}`,
      query: `Query ${i}`,
      featureType: 'content_generation'
    }));

    const batches = await optimizer.createBatches(requests);
    expect(batches.length).toBe(2); // 20 + 5 items
    expect(batches[0].items.length).toBe(20);
    expect(batches[1].items.length).toBe(5);
  });

  test('enforces budget limits correctly', async () => {
    const supplierId = 'supplier_123';
    await optimizer.setDailyBudget(supplierId, 10.00);
    
    // Simulate spending £8
    await optimizer.recordCost(supplierId, 'chatbot', 8.00);
    
    const canProceed = await optimizer.checkBudgetLimit(supplierId, 3.00);
    expect(canProceed).toBe(false); // Would exceed £10 limit
  });

  test('wedding proximity affects optimization strategy', async () => {
    const weddingInWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const weddingInMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const urgentStrategy = await optimizer.getOptimizationStrategy(weddingInWeek);
    const planningStrategy = await optimizer.getOptimizationStrategy(weddingInMonths);

    expect(urgentStrategy.level).toBe('quality_first');
    expect(planningStrategy.level).toBe('aggressive');
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/ai-cost-optimization-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestSupabaseClient } from '@/test-utils/supabase';
import { AICostOptimizationAPI } from '@/app/api/ai/cost-optimization/route';

describe('AI Cost Optimization Integration', () => {
  let supabase: any;
  let testSupplierId: string;

  beforeAll(async () => {
    supabase = createTestSupabaseClient();
    testSupplierId = await createTestSupplier('photographer', 'professional');
  });

  afterAll(async () => {
    await cleanupTestData(testSupplierId);
  });

  test('complete cost optimization workflow', async () => {
    // 1. Set up cost configuration
    const configResponse = await fetch('/api/ai/cost-optimization/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        optimizationLevel: 'balanced',
        monthlyBudget: 100,
        dailyBudget: 10,
        alertThreshold: 80,
        cacheStrategy: { semantic: true, exact: true, ttlHours: 24 }
      })
    });
    expect(configResponse.ok).toBe(true);

    // 2. Process AI requests with optimization
    const requests = [
      { featureType: 'photo_ai', query: 'Tag wedding photos with bride and groom' },
      { featureType: 'photo_ai', query: 'Identify bride and groom in wedding images' }, // Similar
      { featureType: 'content_generation', query: 'Write thank you message for clients' }
    ];

    const results = [];
    for (const request of requests) {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      results.push(await response.json());
    }

    // 3. Verify optimization worked
    const analytics = await fetch('/api/ai/cost-optimization/analytics');
    const analyticsData = await analytics.json();

    expect(analyticsData.currentPeriod.daily.cacheHitRate).toBeGreaterThan(0);
    expect(analyticsData.currentPeriod.monthly.savingsFromOptimization).toBeGreaterThan(0);
    expect(results[1].cached).toBe(true); // Second similar request was cached
  });

  test('budget limit enforcement', async () => {
    // Set low daily budget
    await fetch('/api/ai/cost-optimization/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyBudget: 1.00 })
    });

    // Make expensive requests until budget exceeded
    let requestCount = 0;
    let budgetExceeded = false;

    while (requestCount < 10 && !budgetExceeded) {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureType: 'content_generation',
          query: `Generate detailed wedding timeline ${requestCount}`
        })
      });

      const result = await response.json();
      if (result.error?.code === 'BUDGET_EXCEEDED') {
        budgetExceeded = true;
      }
      requestCount++;
    }

    expect(budgetExceeded).toBe(true);

    // Check alert was created
    const alerts = await fetch('/api/ai/cost-optimization/alerts');
    const alertsData = await alerts.json();
    expect(alertsData.active.length).toBeGreaterThan(0);
  });

  test('batch processing cost savings', async () => {
    // Submit batch of requests
    const batchItems = Array.from({ length: 15 }, (_, i) => ({
      id: `batch_item_${i}`,
      featureType: 'content_generation',
      queryData: { prompt: `Generate wedding tip #${i}` },
      priority: 1
    }));

    const batchResponse = await fetch('/api/ai/cost-optimization/batch-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batchItems })
    });

    const batchResult = await batchResponse.json();
    expect(batchResult.estimatedSavings).toBeGreaterThan(0);
    expect(batchResult.itemsQueued).toBe(15);

    // Wait for batch completion (in real test, would use webhook)
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`/api/ai/batch/status/${batchResult.batchId}`);
    const status = await statusResponse.json();
    expect(status.status).toBe('completed');
    expect(status.results.length).toBe(15);
  });

  test('seasonal budget recommendations', async () => {
    const analytics = await fetch('/api/ai/cost-optimization/analytics');
    const analyticsData = await analytics.json();

    const juneProjection = analyticsData.seasonalProjection.nextThreeMonths
      .find(month => month.month === 6);
    
    expect(juneProjection.seasonMultiplier).toBe(1.6);
    expect(juneProjection.recommendedBudget).toBeGreaterThan(juneProjection.projectedCost);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/ai-cost-optimization-complete-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { createTestSupplier, loginAsSupplier } from '../helpers/auth';
import { mockOpenAIResponses } from '../helpers/ai-mocks';

test.describe('AI Cost Optimization Complete Workflow', () => {
  test('photographer manages AI costs through wedding season', async ({ page }) => {
    // Setup test data
    const supplierId = await createTestSupplier('photographer', 'professional');
    await loginAsSupplier(page, supplierId);
    
    await mockOpenAIResponses(page);

    // Navigate to AI cost optimization dashboard
    await page.goto('/dashboard/ai/cost-optimization');
    
    // Verify initial state
    await expect(page.locator('[data-testid="daily-spend"]')).toContainText('£0.00');
    await expect(page.locator('[data-testid="cache-hit-rate"]')).toContainText('0.0%');

    // Configure optimization settings
    await page.click('[data-testid="configure-costs"]');
    await page.selectOption('[data-testid="optimization-level"]', 'balanced');
    await page.fill('[data-testid="monthly-budget"]', '150');
    await page.fill('[data-testid="daily-budget"]', '15');
    await page.check('[data-testid="enable-semantic-cache"]');
    await page.check('[data-testid="enable-batch-processing"]');
    await page.click('[data-testid="save-configuration"]');

    // Wait for save confirmation
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Test AI photo tagging with optimization
    await page.goto('/dashboard/photos/manage');
    
    // Upload test photos
    const photoFiles = ['wedding1.jpg', 'wedding2.jpg', 'wedding3.jpg'];
    for (const file of photoFiles) {
      await page.setInputFiles('[data-testid="photo-upload"]', `tests/fixtures/${file}`);
    }

    // Trigger AI photo processing
    await page.click('[data-testid="process-with-ai"]');
    
    // Verify batch processing notification
    await expect(page.locator('[data-testid="batch-processing-notice"]'))
      .toContainText('Photos queued for batch processing (50% cost reduction)');

    // Wait for processing completion
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });

    // Return to cost dashboard and verify results
    await page.goto('/dashboard/ai/cost-optimization');
    
    // Check that costs were tracked
    await expect(page.locator('[data-testid="daily-spend"]')).not.toContainText('£0.00');
    await expect(page.locator('[data-testid="feature-photo-ai-cost"]')).toBeVisible();

    // Test semantic caching - ask similar question
    await page.goto('/dashboard/ai/assistant');
    await page.fill('[data-testid="ai-query"]', 'How to organize wedding photos?');
    await page.click('[data-testid="submit-query"]');
    await page.waitForSelector('[data-testid="ai-response"]');

    // Ask similar question
    await page.fill('[data-testid="ai-query"]', 'Best way to organize photos from weddings?');
    await page.click('[data-testid="submit-query"]');
    
    // Verify cache hit indicator
    await expect(page.locator('[data-testid="cache-hit-indicator"]')).toBeVisible();

    // Return to dashboard and verify cache hit rate improved
    await page.goto('/dashboard/ai/cost-optimization');
    await expect(page.locator('[data-testid="cache-hit-rate"]')).not.toContainText('0.0%');

    // Test budget alert by simulating high usage
    await mockHighUsageDay(page, supplierId);
    await page.reload();
    
    // Verify budget alert appears
    await expect(page.locator('[data-testid="budget-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-message"]'))
      .toContainText('80% of daily budget reached');

    // Test seasonal projection
    await expect(page.locator('[data-testid="june-projection"]'))
      .toContainText('1.6x multiplier');
    await expect(page.locator('[data-testid="june-recommended-budget"]'))
      .toContainText('£240.00'); // £150 * 1.6 multiplier

    // Test optimization recommendations
    const recommendations = page.locator('[data-testid="optimization-recommendation"]');
    await expect(recommendations).toHaveCountGreaterThan(0);
    
    const firstRec = recommendations.first();
    await expect(firstRec.locator('[data-testid="potential-savings"]'))
      .toContainText(/Save £\d+\.\d{2}/);
    
    // Apply a recommendation
    await firstRec.locator('[data-testid="apply-recommendation"]').click();
    await expect(page.locator('[data-testid="recommendation-applied"]')).toBeVisible();

    // Verify final state shows optimization working
    const finalAnalytics = await page.locator('[data-testid="savings-summary"]').textContent();
    expect(finalAnalytics).toMatch(/£\d+\.\d{2} saved this month/);
  });

  async function mockHighUsageDay(page: any, supplierId: string) {
    await page.route('/api/ai/process', async (route, request) => {
      // Mock expensive AI processing
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 'Mock AI response',
          cost: 2.50,
          tokens: 1000,
          cached: false
        })
      });
    });
    
    // Simulate multiple expensive requests
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureType: 'content_generation',
            query: `Expensive query ${Math.random()}`
          })
        });
      });
    }
  }
});
```

## Acceptance Criteria

### Performance Requirements
- **Cache Hit Rate**: Achieve 60%+ semantic cache hit rate within 30 days
- **Cost Reduction**: Deliver 40%+ cost reduction with balanced optimization
- **Batch Processing**: Process batches within 24 hours with 50% cost savings
- **Response Time**: Cached responses serve in <100ms, batch in <24h

### Budget Control Requirements
- **Real-time Tracking**: Cost tracking updates within 1 minute of API call
- **Alert Accuracy**: Budget alerts trigger at exact threshold percentages
- **Enforcement**: Hard budget limits prevent spending overages by >£1
- **Seasonal Accuracy**: Season multipliers reflect actual usage patterns

### Wedding Industry Requirements
- **Season Optimization**: Automatically adjust budgets for wedding seasons
- **Vendor Specialization**: Provide vendor-specific optimization recommendations
- **Emergency Handling**: Wedding week requests bypass all optimization delays
- **Context Awareness**: Understand wedding timeline urgency for prioritization

### User Experience Requirements
- **Transparency**: Clear breakdown of costs vs. savings in dashboard
- **Control**: Suppliers can adjust optimization level without losing data
- **Recommendations**: Actionable optimization suggestions with effort/savings ratios
- **Integration**: Seamless operation with existing AI features

### Technical Requirements
- **Database Performance**: Cost queries complete in <200ms with 10k+ records
- **Cache Efficiency**: Semantic similarity search in <50ms
- **Batch Reliability**: 99.5% batch completion rate
- **Monitoring**: Real-time cost tracking with 99.9% accuracy

## Effort Estimation

### Team D (AI/ML) - 74 hours
- Semantic caching implementation (24h)
- Batch processing system (20h)  
- Cost tracking and analytics (18h)
- Optimization algorithms (12h)

### Team A (Frontend) - 28 hours
- Cost optimization dashboard (16h)
- Configuration panels (8h)
- Alert notifications (4h)

### Team B (Backend) - 32 hours
- API endpoints development (20h)
- Database schema implementation (8h)
- Wedding context integration (4h)

### Team C (Integration) - 18 hours
- MCP server integration (12h)
- OpenAI batch API setup (6h)

### Team E (Platform) - 8 hours
- Cost monitoring alerts (4h)
- Performance optimization (4h)

### Team F (General) - 22 hours
- Testing implementation (16h)
- Documentation creation (6h)

**Total Effort: 182 hours**

## Dependencies
- OpenAI Batch API access
- Vector similarity search capability  
- Real-time cost tracking infrastructure
- Wedding timeline data integration
- MCP server cost monitoring hooks

## Risks & Mitigations
- **Risk**: Semantic cache false positives reducing quality
- **Mitigation**: Confidence thresholds and quality scoring
- **Risk**: Batch processing delays during peak season
- **Mitigation**: Priority queues and emergency bypass
- **Risk**: Cost tracking accuracy issues
- **Mitigation**: Multiple verification points and reconciliation