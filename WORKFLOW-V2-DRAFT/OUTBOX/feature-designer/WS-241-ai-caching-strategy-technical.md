# WS-241: AI Caching Strategy System - Technical Specification

## User Story
**As a wedding supplier using AI features across WedSync,**  
**I want intelligent multi-layer caching that delivers instant responses for common wedding queries,**  
**So that I can provide immediate answers to clients while minimizing AI costs and maintaining high performance.**

**Business Scenario:**
Photography studio "Eternal Moments" processes 200+ client inquiries monthly during peak season. Common questions include "What's your wedding package pricing?", "Do you travel to destination weddings?", and "Can you accommodate same-day edits?". 

Without caching: Each inquiry costs £0.12-0.45 in AI processing (total: £24-90/month).
With WS-241: 85% cache hit rate reduces costs to £3.60-13.50/month, while delivering instant <100ms responses for cached queries.

## Database Schema

```sql
-- Multi-layer AI cache system
CREATE TABLE ai_cache_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  cache_key VARCHAR(255) NOT NULL, -- Hashed query key
  cache_type VARCHAR(50) NOT NULL, -- 'form_generation', 'email_template', 'chatbot', 'content_generation'
  prompt_text TEXT NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL, -- SHA256 of normalized prompt
  prompt_embedding vector(1536), -- OpenAI embedding for semantic search
  result_data JSONB NOT NULL,
  model_used VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(4,3) DEFAULT 1.000, -- 0.000-1.000
  quality_rating INTEGER, -- 1-5 stars from user feedback
  wedding_context JSONB, -- Season, venue type, guest count, etc.
  usage_metadata JSONB DEFAULT '{}', -- Performance tracking
  
  -- Cache management
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason VARCHAR(100),
  
  -- Performance tracking
  original_generation_time_ms INTEGER,
  original_cost_pounds DECIMAL(6,4),
  total_cost_saved_pounds DECIMAL(8,4) DEFAULT 0.0000,
  
  UNIQUE(supplier_id, cache_key, cache_type),
  INDEX idx_cache_supplier_type (supplier_id, cache_type),
  INDEX idx_cache_hash (prompt_hash),
  INDEX idx_cache_expires (expires_at) WHERE invalidated_at IS NULL,
  INDEX idx_cache_embedding USING ivfflat (prompt_embedding vector_cosine_ops) WITH (lists = 100),
  INDEX idx_cache_wedding_context USING gin (wedding_context)
);

-- Cache performance analytics
CREATE TABLE ai_cache_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INTEGER NOT NULL DEFAULT EXTRACT(hour FROM NOW()),
  cache_type VARCHAR(50) NOT NULL,
  
  -- Hit/miss statistics
  total_requests INTEGER DEFAULT 0,
  exact_hits INTEGER DEFAULT 0, -- Exact cache key match
  semantic_hits INTEGER DEFAULT 0, -- Similarity match
  cache_misses INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms DECIMAL(8,2) DEFAULT 0.00,
  total_cost_saved_pounds DECIMAL(8,4) DEFAULT 0.0000,
  total_generation_time_saved_ms INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_confidence_score DECIMAL(4,3) DEFAULT 1.000,
  avg_quality_rating DECIMAL(3,2), -- User feedback ratings
  false_positive_count INTEGER DEFAULT 0, -- User reported poor matches
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, date, hour, cache_type)
);

-- Cache warming configuration
CREATE TABLE ai_cache_warming_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  cache_type VARCHAR(50) NOT NULL,
  warming_strategy VARCHAR(30) NOT NULL, -- 'popular_queries', 'seasonal_content', 'template_variations'
  enabled BOOLEAN DEFAULT true,
  
  -- Trigger conditions
  trigger_on_new_season BOOLEAN DEFAULT true,
  trigger_on_low_hit_rate BOOLEAN DEFAULT true,
  min_hit_rate_threshold DECIMAL(4,2) DEFAULT 0.60, -- Trigger warming if hit rate < 60%
  
  -- Warming parameters
  max_entries_to_warm INTEGER DEFAULT 100,
  warm_during_hours INTEGER[] DEFAULT ARRAY[2, 3, 4], -- 2-4 AM
  priority INTEGER DEFAULT 1, -- 1=low, 5=high
  
  -- Content parameters
  query_templates TEXT[],
  seasonal_variations JSONB, -- Month-specific content variations
  last_warmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, cache_type, warming_strategy)
);

-- Cache invalidation tracking
CREATE TABLE ai_cache_invalidations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invalidation_trigger VARCHAR(50) NOT NULL, -- 'template_update', 'pricing_change', 'manual', 'ttl_expired'
  pattern_matched VARCHAR(255), -- Cache key pattern that was invalidated
  entries_invalidated INTEGER DEFAULT 0,
  invalidated_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semantic similarity search function
CREATE OR REPLACE FUNCTION match_ai_cache(
  query_embedding vector(1536),
  p_supplier_id UUID,
  p_cache_type VARCHAR(50),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  cache_key varchar(255),
  result_data jsonb,
  similarity float,
  confidence_score decimal(4,3),
  hit_count integer,
  wedding_context jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ace.id,
    ace.cache_key,
    ace.result_data,
    (1 - (ace.prompt_embedding <=> query_embedding))::float as similarity,
    ace.confidence_score,
    ace.hit_count,
    ace.wedding_context
  FROM ai_cache_entries ace
  WHERE ace.supplier_id = p_supplier_id
    AND ace.cache_type = p_cache_type
    AND ace.invalidated_at IS NULL
    AND ace.expires_at > NOW()
    AND (1 - (ace.prompt_embedding <=> query_embedding)) > match_threshold
  ORDER BY ace.prompt_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Cache warming job queue
CREATE TABLE ai_cache_warming_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  warming_rule_id UUID NOT NULL REFERENCES ai_cache_warming_rules(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  job_type VARCHAR(30) NOT NULL, -- 'seasonal_refresh', 'popular_queries', 'template_variations'
  
  -- Job parameters
  queries_to_warm TEXT[],
  priority INTEGER DEFAULT 1,
  estimated_cost_pounds DECIMAL(6,4),
  actual_cost_pounds DECIMAL(6,4),
  
  -- Results
  entries_created INTEGER DEFAULT 0,
  entries_failed INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Timing
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_warming_jobs_status (status, scheduled_for),
  INDEX idx_warming_jobs_supplier (supplier_id, status)
);

-- Wedding season cache optimization
CREATE TABLE ai_seasonal_cache_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  season_name VARCHAR(20) NOT NULL, -- 'peak', 'high', 'medium', 'low'
  cache_multiplier DECIMAL(3,2) NOT NULL, -- 1.6 for peak season
  
  -- Popular query patterns by season
  common_queries JSONB NOT NULL, -- Most frequent queries for this season
  query_volumes JSONB NOT NULL, -- Expected query volumes by type
  
  -- Cache configuration
  recommended_ttl_hours INTEGER NOT NULL,
  recommended_warming_threshold DECIMAL(4,2), -- When to trigger warming
  precompute_templates BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month)
);

-- Cache performance dashboard views
CREATE VIEW ai_cache_performance_summary AS
SELECT 
  ace.supplier_id,
  ace.cache_type,
  COUNT(*) as total_entries,
  SUM(ace.hit_count) as total_hits,
  AVG(ace.confidence_score) as avg_confidence,
  AVG(ace.quality_rating) as avg_quality,
  SUM(ace.total_cost_saved_pounds) as total_savings,
  
  -- Hit rates over time
  (SELECT AVG(
    CASE WHEN aca.total_requests > 0 
    THEN (aca.exact_hits + aca.semantic_hits)::DECIMAL / aca.total_requests * 100
    ELSE 0 END
  ) FROM ai_cache_analytics aca 
   WHERE aca.supplier_id = ace.supplier_id 
   AND aca.cache_type = ace.cache_type 
   AND aca.date >= CURRENT_DATE - INTERVAL '30 days') as hit_rate_30d,
   
  -- Performance metrics
  MIN(ace.created_at) as first_cache_entry,
  MAX(ace.last_accessed) as most_recent_access,
  
  -- Storage stats
  pg_size_pretty(SUM(pg_column_size(ace.result_data))) as storage_used
FROM ai_cache_entries ace
WHERE ace.invalidated_at IS NULL
GROUP BY ace.supplier_id, ace.cache_type;

-- Insert default seasonal patterns
INSERT INTO ai_seasonal_cache_patterns (month, season_name, cache_multiplier, common_queries, query_volumes, recommended_ttl_hours, recommended_warming_threshold) VALUES
(1, 'low', 0.6, '{"wedding_planning": ["venue selection", "budget planning"], "inquiries": ["availability", "pricing"]}', '{"total": 100, "chatbot": 60, "content": 40}', 168, 0.70),
(2, 'low', 0.7, '{"valentines": ["engagement sessions", "proposal planning"], "planning": ["vendor selection"]}', '{"total": 120, "chatbot": 70, "content": 50}', 168, 0.70),
(3, 'medium', 1.1, '{"spring_planning": ["outdoor venues", "garden parties"], "vendor_search": ["photographers", "florists"]}', '{"total": 200, "chatbot": 120, "content": 80}', 120, 0.65),
(4, 'high', 1.3, '{"spring_weddings": ["venue prep", "vendor coordination"], "seasonal": ["spring flowers", "outdoor ceremonies"]}', '{"total": 300, "chatbot": 180, "content": 120}', 96, 0.60),
(5, 'high', 1.5, '{"peak_prep": ["final details", "vendor confirmations"], "may_weddings": ["last minute changes"]}', '{"total": 400, "chatbot": 240, "content": 160}', 72, 0.55),
(6, 'peak', 1.6, '{"peak_season": ["day_of_coordination", "emergency_support"], "june_weddings": ["weather_contingency", "timeline_adjustments"]}', '{"total": 500, "chatbot": 350, "content": 150}', 48, 0.50),
(7, 'peak', 1.5, '{"summer_weddings": ["heat_management", "outdoor_logistics"], "july_events": ["family_coordination"]}', '{"total": 450, "chatbot": 300, "content": 150}', 48, 0.50),
(8, 'high', 1.4, '{"late_summer": ["harvest_themes", "outdoor_celebrations"], "august_weddings": ["venue_coordination"]}', '{"total": 380, "chatbot": 250, "content": 130}', 72, 0.55),
(9, 'high', 1.3, '{"fall_weddings": ["autumn_themes", "weather_planning"], "september_events": ["school_schedule_coordination"]}', '{"total": 320, "chatbot": 200, "content": 120}', 96, 0.60),
(10, 'medium', 1.2, '{"fall_season": ["indoor_venues", "cozy_themes"], "october_weddings": ["halloween_considerations"]}', '{"total": 250, "chatbot": 150, "content": 100}', 120, 0.65),
(11, 'low', 0.8, '{"planning_2026": ["venue_booking", "vendor_selection"], "thanksgiving": ["family_considerations"]}', '{"total": 150, "chatbot": 90, "content": 60}', 168, 0.70),
(12, 'low', 0.6, '{"holiday_season": ["new_year_planning", "engagement_announcements"], "christmas": ["family_time", "vendor_availability"]}', '{"total": 100, "chatbot": 60, "content": 40}', 168, 0.70);
```

## API Endpoints

### Cache Management

```typescript
// GET /api/ai/cache/stats
interface GetCacheStatsResponse {
  overall: {
    totalEntries: number;
    totalHits: number;
    hitRate: number; // Overall percentage
    storageUsed: string; // "1.2 GB"
    totalSavings: number; // Pounds saved
  };
  
  byType: Array<{
    cacheType: string;
    entries: number;
    hitRate: number;
    avgConfidence: number;
    avgQuality: number;
    savingsThisMonth: number;
    responseTimes: {
      cached: number; // ms average
      generated: number; // ms average
      improvement: number; // % faster
    };
  }>;
  
  seasonal: {
    currentSeason: string;
    seasonMultiplier: number;
    recommendedSettings: {
      ttlHours: number;
      warmingThreshold: number;
      precomputeTemplates: boolean;
    };
  };
  
  recentActivity: Array<{
    timestamp: string;
    type: 'hit' | 'miss' | 'warming' | 'invalidation';
    cacheType: string;
    details: string;
  }>;
}

// GET /api/ai/cache/performance/{period}
interface GetCachePerformanceResponse {
  period: 'day' | 'week' | 'month';
  metrics: Array<{
    timestamp: string;
    hitRate: number;
    responseTime: number;
    costSaved: number;
    quality: number;
  }>;
  
  comparisons: {
    previousPeriod: {
      hitRateChange: number; // % change
      performanceChange: number; // % change
      savingsChange: number; // £ change
    };
  };
  
  topQueries: Array<{
    query: string; // Truncated for privacy
    hits: number;
    avgConfidence: number;
    lastHit: string;
  }>;
}

// POST /api/ai/cache/warm
interface WarmCacheRequest {
  cacheType?: string;
  strategy: 'popular_queries' | 'seasonal_content' | 'template_variations' | 'all';
  priority?: 1 | 2 | 3 | 4 | 5;
  maxQueries?: number;
  scheduledFor?: string; // ISO timestamp
}

interface WarmCacheResponse {
  jobId: string;
  estimatedCompletion: string;
  queriesQueued: number;
  estimatedCost: number;
  message: string;
}

// POST /api/ai/cache/invalidate
interface InvalidateCacheRequest {
  pattern?: string; // Cache key pattern
  cacheType?: string;
  reason: string;
  olderThan?: string; // ISO date
  belowQuality?: number; // 1-5 rating
}

interface InvalidateCacheResponse {
  entriesInvalidated: number;
  storageFreed: string; // "45 MB"
  estimatedRegenCost: number;
  message: string;
}

// GET /api/ai/cache/similar/{cacheId}
interface GetSimilarCacheResponse {
  original: {
    id: string;
    query: string; // Truncated
    cacheType: string;
    confidence: number;
    hits: number;
  };
  
  similar: Array<{
    id: string;
    query: string; // Truncated
    similarity: number;
    confidence: number;
    hits: number;
    canMerge: boolean;
  }>;
}

// POST /api/ai/cache/feedback
interface CacheFeedbackRequest {
  cacheId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  wasHelpful: boolean;
}
```

### Cache Configuration

```typescript
// GET /api/ai/cache/config
interface GetCacheConfigResponse {
  cacheTypes: Array<{
    type: string;
    enabled: boolean;
    ttlHours: number;
    maxEntries: number;
    semanticThreshold: number; // 0.0-1.0
    warmingEnabled: boolean;
  }>;
  
  warming: {
    enabled: boolean;
    scheduledHours: number[]; // Hours of day
    maxCostPerDay: number;
    strategies: Array<{
      strategy: string;
      enabled: boolean;
      priority: number;
    }>;
  };
  
  invalidation: {
    autoInvalidateOnUpdate: boolean;
    qualityThreshold: number; // Auto-invalidate below this rating
    maxAgeBeforeRefresh: number; // Days
  };
  
  performance: {
    maxResponseTime: number; // ms
    minHitRateAlert: number; // %
    storageLimit: string; // "10 GB"
  };
}

// POST /api/ai/cache/config
interface UpdateCacheConfigRequest {
  cacheTypes?: Array<{
    type: string;
    enabled?: boolean;
    ttlHours?: number;
    maxEntries?: number;
    semanticThreshold?: number;
    warmingEnabled?: boolean;
  }>;
  
  warming?: {
    enabled?: boolean;
    scheduledHours?: number[];
    maxCostPerDay?: number;
    strategies?: Array<{
      strategy: string;
      enabled?: boolean;
      priority?: number;
    }>;
  };
  
  invalidation?: {
    autoInvalidateOnUpdate?: boolean;
    qualityThreshold?: number;
    maxAgeBeforeRefresh?: number;
  };
}
```

## Frontend Components

### Cache Performance Dashboard

```typescript
// src/components/ai/CachePerformanceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock, Database, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CachePerformanceDashboardProps {
  supplierId: string;
}

export default function CachePerformanceDashboard({ supplierId }: CachePerformanceDashboardProps) {
  const [stats, setStats] = useState<GetCacheStatsResponse | null>(null);
  const [performance, setPerformance] = useState<GetCachePerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCacheData();
  }, [supplierId]);

  const loadCacheData = async () => {
    try {
      const [statsRes, performanceRes] = await Promise.all([
        fetch('/api/ai/cache/stats'),
        fetch('/api/ai/cache/performance/week')
      ]);

      setStats(await statsRes.json());
      setPerformance(await performanceRes.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading cache performance data...</div>;
  }

  const overallHitRate = stats?.overall.hitRate || 0;
  const totalSavings = stats?.overall.totalSavings || 0;

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallHitRate.toFixed(1)}%</div>
            <Progress value={overallHitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.overall.totalHits.toLocaleString()} cache hits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalSavings.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">
              {((performance?.comparisons.previousPeriod.savingsChange || 0) >= 0 ? '+' : '')}
              {performance?.comparisons.previousPeriod.savingsChange.toFixed(2)} vs last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(performance?.metrics[performance.metrics.length - 1]?.responseTime || 0)}ms
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {performance?.comparisons.previousPeriod.performanceChange.toFixed(1)}% improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overall.storageUsed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.overall.totalEntries.toLocaleString()} cached entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance?.metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any, name: string) => [
                    name === 'hitRate' ? `${value.toFixed(1)}%` :
                    name === 'responseTime' ? `${Math.round(value)}ms` :
                    name === 'costSaved' ? `£${value.toFixed(2)}` :
                    value.toFixed(2),
                    name === 'hitRate' ? 'Hit Rate' :
                    name === 'responseTime' ? 'Response Time' :
                    name === 'costSaved' ? 'Cost Saved' :
                    'Quality'
                  ]}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="hitRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="hitRate"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="responseTime"
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="costSaved" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="costSaved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cache Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Cache Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.byType.map((cacheType) => (
              <div key={cacheType.cacheType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {cacheType.cacheType.replace('_', ' ').toUpperCase()}
                    </span>
                    <Badge variant={cacheType.hitRate >= 80 ? 'default' : cacheType.hitRate >= 60 ? 'secondary' : 'destructive'}>
                      {cacheType.hitRate.toFixed(1)}% hit rate
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">£{cacheType.savingsThisMonth.toFixed(2)} saved</div>
                    <div className="text-sm text-gray-600">{cacheType.entries} entries</div>
                  </div>
                </div>

                <Progress value={cacheType.hitRate} className="h-2" />

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Quality:</span> {cacheType.avgQuality.toFixed(1)}/5
                  </div>
                  <div>
                    <span className="font-medium">Cached:</span> {Math.round(cacheType.responseTimes.cached)}ms
                  </div>
                  <div>
                    <span className="font-medium">Generated:</span> {Math.round(cacheType.responseTimes.generated)}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Current Season</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Season:</span>
                  <Badge>{stats?.seasonal.currentSeason.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multiplier:</span>
                  <span className="font-medium">{stats?.seasonal.seasonMultiplier}x</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>TTL:</span>
                  <span>{stats?.seasonal.recommendedSettings.ttlHours}h</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Top Performing Queries</h4>
              <div className="space-y-2">
                {performance?.topQueries.slice(0, 3).map((query, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 mr-2">
                      {query.query}...
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{query.hits} hits</Badge>
                      <Badge variant="secondary">{(query.avgConfidence * 100).toFixed(0)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cache Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.recentActivity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={activity.type === 'hit' ? 'default' : 
                            activity.type === 'miss' ? 'secondary' : 
                            activity.type === 'warming' ? 'outline' : 'destructive'}
                  >
                    {activity.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm">
                    {activity.cacheType.replace('_', ' ')} - {activity.details}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Cache Configuration Panel

```typescript
// src/components/ai/CacheConfigurationPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function CacheConfigurationPanel() {
  const [config, setConfig] = useState<GetCacheConfigResponse | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    const response = await fetch('/api/ai/cache/config');
    setConfig(await response.json());
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      await fetch('/api/ai/cache/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      // Show success toast
    } finally {
      setSaving(false);
    }
  };

  const triggerWarmCache = async (strategy: string) => {
    await fetch('/api/ai/cache/warm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        strategy,
        priority: 3,
        maxQueries: 100
      })
    });
  };

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cache Types Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Type Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.cacheTypes.map((cacheType, index) => (
            <div key={cacheType.type} className="space-y-4 p-4 border rounded">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {cacheType.type.replace('_', ' ').toUpperCase()}
                </h4>
                <Switch
                  checked={cacheType.enabled}
                  onCheckedChange={(checked) => {
                    const updated = [...config.cacheTypes];
                    updated[index] = { ...updated[index], enabled: checked };
                    setConfig({ ...config, cacheTypes: updated });
                  }}
                />
              </div>

              {cacheType.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>TTL Hours: {cacheType.ttlHours}</Label>
                    <Slider
                      value={[cacheType.ttlHours]}
                      onValueChange={([value]) => {
                        const updated = [...config.cacheTypes];
                        updated[index] = { ...updated[index], ttlHours: value };
                        setConfig({ ...config, cacheTypes: updated });
                      }}
                      max={720} // 30 days
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Max Entries: {cacheType.maxEntries.toLocaleString()}</Label>
                    <Slider
                      value={[cacheType.maxEntries]}
                      onValueChange={([value]) => {
                        const updated = [...config.cacheTypes];
                        updated[index] = { ...updated[index], maxEntries: value };
                        setConfig({ ...config, cacheTypes: updated });
                      }}
                      max={100000}
                      min={100}
                      step={100}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Semantic Threshold: {(cacheType.semanticThreshold * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[cacheType.semanticThreshold * 100]}
                      onValueChange={([value]) => {
                        const updated = [...config.cacheTypes];
                        updated[index] = { ...updated[index], semanticThreshold: value / 100 };
                        setConfig({ ...config, cacheTypes: updated });
                      }}
                      max={99}
                      min={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`warming-${cacheType.type}`}
                      checked={cacheType.warmingEnabled}
                      onCheckedChange={(checked) => {
                        const updated = [...config.cacheTypes];
                        updated[index] = { ...updated[index], warmingEnabled: checked };
                        setConfig({ ...config, cacheTypes: updated });
                      }}
                    />
                    <Label htmlFor={`warming-${cacheType.type}`}>Enable warming</Label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Warming Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Warming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="warming-enabled"
              checked={config.warming.enabled}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  warming: { ...config.warming, enabled: checked }
                })
              }
            />
            <Label htmlFor="warming-enabled">
              Enable automatic cache warming
            </Label>
          </div>

          {config.warming.enabled && (
            <>
              <div>
                <Label>Daily Budget: £{config.warming.maxCostPerDay}</Label>
                <Slider
                  value={[config.warming.maxCostPerDay]}
                  onValueChange={([value]) =>
                    setConfig({
                      ...config,
                      warming: { ...config.warming, maxCostPerDay: value }
                    })
                  }
                  max={50}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Warming Hours (24h format)</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        id={`hour-${hour}`}
                        checked={config.warming.scheduledHours.includes(hour)}
                        onChange={(e) => {
                          const hours = e.target.checked
                            ? [...config.warming.scheduledHours, hour]
                            : config.warming.scheduledHours.filter(h => h !== hour);
                          setConfig({
                            ...config,
                            warming: { ...config.warming, scheduledHours: hours }
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`hour-${hour}`} className="text-xs">
                        {hour.toString().padStart(2, '0')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label>Warming Strategies</Label>
                <div className="space-y-3 mt-2">
                  {config.warming.strategies.map((strategy, index) => (
                    <div key={strategy.strategy} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`strategy-${strategy.strategy}`}
                          checked={strategy.enabled}
                          onCheckedChange={(checked) => {
                            const updated = [...config.warming.strategies];
                            updated[index] = { ...updated[index], enabled: checked };
                            setConfig({
                              ...config,
                              warming: { ...config.warming, strategies: updated }
                            });
                          }}
                        />
                        <Label htmlFor={`strategy-${strategy.strategy}`}>
                          {strategy.strategy.replace('_', ' ').toUpperCase()}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Priority: {strategy.priority}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerWarmCache(strategy.strategy)}
                        >
                          Warm Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invalidation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Invalidation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-invalidate"
              checked={config.invalidation.autoInvalidateOnUpdate}
              onCheckedChange={(checked) =>
                setConfig({
                  ...config,
                  invalidation: { ...config.invalidation, autoInvalidateOnUpdate: checked }
                })
              }
            />
            <Label htmlFor="auto-invalidate">
              Automatically invalidate cache when templates are updated
            </Label>
          </div>

          <div>
            <Label>Quality Threshold: {config.invalidation.qualityThreshold}/5</Label>
            <Slider
              value={[config.invalidation.qualityThreshold]}
              onValueChange={([value]) =>
                setConfig({
                  ...config,
                  invalidation: { ...config.invalidation, qualityThreshold: value }
                })
              }
              max={5}
              min={1}
              step={0.1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Automatically invalidate cache entries rated below this threshold
            </p>
          </div>

          <div>
            <Label>Max Age Before Refresh: {config.invalidation.maxAgeBeforeRefresh} days</Label>
            <Slider
              value={[config.invalidation.maxAgeBeforeRefresh]}
              onValueChange={([value]) =>
                setConfig({
                  ...config,
                  invalidation: { ...config.invalidation, maxAgeBeforeRefresh: value }
                })
              }
              max={365}
              min={1}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Max Response Time: {config.performance.maxResponseTime}ms</Label>
            <Slider
              value={[config.performance.maxResponseTime]}
              onValueChange={([value]) =>
                setConfig({
                  ...config,
                  performance: { ...config.performance, maxResponseTime: value }
                })
              }
              max={5000}
              min={100}
              step={100}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Min Hit Rate Alert: {config.performance.minHitRateAlert}%</Label>
            <Slider
              value={[config.performance.minHitRateAlert]}
              onValueChange={([value]) =>
                setConfig({
                  ...config,
                  performance: { ...config.performance, minHitRateAlert: value }
                })
              }
              max={95}
              min={30}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Storage Limit</Label>
            <Input
              value={config.performance.storageLimit}
              onChange={(e) =>
                setConfig({
                  ...config,
                  performance: { ...config.performance, storageLimit: e.target.value }
                })
              }
              className="mt-1"
              placeholder="e.g., 10 GB"
            />
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
// src/lib/ai/mcp-cache-integration.ts
import { MCPServer } from '@/lib/mcp/server';

export class CacheMCPIntegration {
  constructor(private mcpServer: MCPServer) {}

  // Use Context7 for cache optimization patterns
  async getOptimizationPatterns() {
    const cachePatterns = await this.mcpServer.context7.getLibraryDocs({
      context7CompatibleLibraryID: '/redis/redis',
      topic: 'caching_patterns'
    });

    return this.applyCachingBestPractices(cachePatterns);
  }

  // Monitor cache performance with PostgreSQL MCP
  async trackCacheMetrics(operation: 'hit' | 'miss', metadata: any) {
    await this.mcpServer.postgres.query(`
      INSERT INTO ai_cache_analytics 
      (supplier_id, cache_type, total_requests, exact_hits, semantic_hits, cache_misses)
      VALUES ($1, $2, 1, $3, $4, $5)
      ON CONFLICT (supplier_id, date, hour, cache_type)
      DO UPDATE SET 
        total_requests = ai_cache_analytics.total_requests + 1,
        exact_hits = ai_cache_analytics.exact_hits + $3,
        semantic_hits = ai_cache_analytics.semantic_hits + $4,
        cache_misses = ai_cache_analytics.cache_misses + $5
    `, [
      metadata.supplierId,
      metadata.cacheType,
      operation === 'hit' && metadata.similarity >= 0.98 ? 1 : 0, // Exact hit
      operation === 'hit' && metadata.similarity < 0.98 ? 1 : 0,  // Semantic hit
      operation === 'miss' ? 1 : 0
    ]);
  }

  // Automated cache warming based on Supabase data
  async scheduleWarmingBasedOnUsage() {
    // Use Supabase MCP to analyze usage patterns
    const usagePatterns = await this.mcpServer.supabase.executeSQL(`
      SELECT 
        cache_type,
        COUNT(*) as requests,
        AVG(CASE WHEN exact_hits + semantic_hits > 0 
            THEN (exact_hits + semantic_hits)::DECIMAL / total_requests 
            ELSE 0 END) as hit_rate
      FROM ai_cache_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY cache_type
      HAVING AVG(CASE WHEN exact_hits + semantic_hits > 0 
                 THEN (exact_hits + semantic_hits)::DECIMAL / total_requests 
                 ELSE 0 END) < 0.60
    `);

    // Schedule warming for cache types with low hit rates
    for (const pattern of usagePatterns) {
      await this.scheduleWarmingJob({
        cacheType: pattern.cache_type,
        priority: pattern.hit_rate < 0.40 ? 5 : 3,
        strategy: 'popular_queries'
      });
    }
  }
}
```

### Wedding Context Integration

```typescript
// src/lib/ai/wedding-cache-optimization.ts
export class WeddingCacheOptimization {
  // Seasonal cache optimization
  async optimizeForSeason() {
    const currentMonth = new Date().getMonth() + 1;
    const seasonData = await this.getSeasonalData(currentMonth);

    return {
      ttlHours: seasonData.recommended_ttl_hours,
      warmingThreshold: seasonData.recommended_warming_threshold,
      commonQueries: seasonData.common_queries,
      cacheMultiplier: seasonData.cache_multiplier
    };
  }

  // Wedding timeline-based cache strategy
  async getCacheStrategyForWedding(weddingDate: Date) {
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilWedding <= 7) {
      // Wedding week - prioritize speed
      return {
        semanticThreshold: 0.90, // Higher precision
        ttlHours: 1, // Very short TTL for fresh data
        warmingEnabled: false, // No warming delays
        precomputeCommon: true
      };
    } else if (daysUntilWedding <= 30) {
      // Wedding month - balanced
      return {
        semanticThreshold: 0.85,
        ttlHours: 6,
        warmingEnabled: true,
        precomputeCommon: true
      };
    } else {
      // Planning phase - optimize for cost
      return {
        semanticThreshold: 0.80,
        ttlHours: 72,
        warmingEnabled: true,
        precomputeCommon: false
      };
    }
  }

  // Vendor-specific cache patterns
  async getVendorCachePatterns(supplierType: string) {
    const patterns = {
      photographer: {
        commonQueries: [
          'wedding photo package pricing',
          'engagement session availability',
          'photo editing timeline',
          'album design options',
          'travel fees for weddings'
        ],
        peakCacheTypes: ['content_generation', 'chatbot'],
        seasonalQueries: {
          peak: ['same day editing', 'outdoor ceremony backup', 'golden hour timing'],
          low: ['2025 package updates', 'new portfolio additions', 'winter wedding specials']
        }
      },
      wedding_planner: {
        commonQueries: [
          'wedding timeline template',
          'vendor coordination checklist',
          'budget planning guide',
          'emergency contact procedures',
          'day of coordination services'
        ],
        peakCacheTypes: ['form_generation', 'email_templates', 'chatbot'],
        seasonalQueries: {
          peak: ['vendor availability check', 'weather contingency plans', 'last minute changes'],
          low: ['2025 planning packages', 'new vendor partnerships', 'winter planning specials']
        }
      },
      venue: {
        commonQueries: [
          'venue availability calendar',
          'catering package options',
          'setup and breakdown timeline',
          'parking and accessibility',
          'weather backup options'
        ],
        peakCacheTypes: ['chatbot', 'content_generation'],
        seasonalQueries: {
          peak: ['last minute availability', 'weather policies', 'capacity adjustments'],
          low: ['2025 booking discounts', 'venue improvements', 'off-season packages']
        }
      }
    };

    return patterns[supplierType] || patterns.wedding_planner;
  }

  // Pre-warm cache for wedding season
  async prewarmForSeason(supplierId: string, supplierType: string) {
    const seasonData = await this.optimizeForSeason();
    const vendorPatterns = await this.getVendorCachePatterns(supplierType);
    
    const queriesToWarm = [
      ...vendorPatterns.commonQueries,
      ...vendorPatterns.seasonalQueries[seasonData.currentSeason] || []
    ];

    for (const query of queriesToWarm) {
      await this.warmCacheEntry({
        supplierId,
        cacheType: 'chatbot',
        query,
        priority: 2
      });
    }
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// src/__tests__/unit/ai-cache-system.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { AICacheSystem } from '@/lib/ai/cache-system';
import { mockSupabaseClient } from '@/test-utils/mocks';

describe('AI Cache System', () => {
  let cacheSystem: AICacheSystem;

  beforeEach(() => {
    cacheSystem = new AICacheSystem(mockSupabaseClient);
  });

  test('exact cache key matching', async () => {
    const query = 'What are your wedding photography packages?';
    const response = { packages: ['basic', 'premium', 'luxury'] };
    
    await cacheSystem.store('photographer_123', 'chatbot', query, response);
    
    const cached = await cacheSystem.get('photographer_123', 'chatbot', query);
    expect(cached.result).toEqual(response);
    expect(cached.similarity).toBe(1.0);
  });

  test('semantic similarity matching', async () => {
    await cacheSystem.store(
      'photographer_123', 
      'chatbot', 
      'What wedding photo packages do you offer?',
      { packages: ['basic', 'premium', 'luxury'] }
    );
    
    const cached = await cacheSystem.get(
      'photographer_123', 
      'chatbot', 
      'Can you tell me about your photography packages?'
    );
    
    expect(cached).toBeTruthy();
    expect(cached.similarity).toBeGreaterThan(0.85);
    expect(cached.result.packages).toBeDefined();
  });

  test('cache TTL expiration', async () => {
    const shortTTL = 1; // 1 hour
    await cacheSystem.store(
      'photographer_123',
      'chatbot',
      'Test query',
      { response: 'Test response' },
      { ttlHours: shortTTL }
    );
    
    // Mock time advancement
    jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours
    
    const cached = await cacheSystem.get('photographer_123', 'chatbot', 'Test query');
    expect(cached).toBeNull();
  });

  test('seasonal cache optimization', async () => {
    const juneOptimization = await cacheSystem.getSeasonalOptimization(6);
    const decemberOptimization = await cacheSystem.getSeasonalOptimization(12);
    
    expect(juneOptimization.ttlHours).toBeLessThan(decemberOptimization.ttlHours);
    expect(juneOptimization.cacheMultiplier).toBe(1.6);
    expect(decemberOptimization.cacheMultiplier).toBe(0.6);
  });

  test('wedding timeline affects cache strategy', async () => {
    const weddingNextWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const weddingNextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const urgentStrategy = await cacheSystem.getWeddingTimelineStrategy(weddingNextWeek);
    const planningStrategy = await cacheSystem.getWeddingTimelineStrategy(weddingNextYear);
    
    expect(urgentStrategy.semanticThreshold).toBeGreaterThan(planningStrategy.semanticThreshold);
    expect(urgentStrategy.ttlHours).toBeLessThan(planningStrategy.ttlHours);
  });

  test('cache warming prioritization', async () => {
    const warmingJobs = await cacheSystem.createWarmingJobs('photographer_123', {
      strategy: 'popular_queries',
      maxQueries: 50,
      priority: 3
    });
    
    expect(warmingJobs.length).toBeGreaterThan(0);
    expect(warmingJobs[0].priority).toBe(3);
    expect(warmingJobs[0].queries.length).toBeLessThanOrEqual(50);
  });

  test('cache invalidation patterns', async () => {
    await cacheSystem.store('photographer_123', 'chatbot', 'Pricing question 1', { price: 1000 });
    await cacheSystem.store('photographer_123', 'chatbot', 'Pricing question 2', { price: 1000 });
    await cacheSystem.store('photographer_123', 'content', 'Content question', { content: 'text' });
    
    const invalidated = await cacheSystem.invalidateByPattern('photographer_123', 'pricing:*');
    
    expect(invalidated.entriesInvalidated).toBe(2);
    
    const pricingCached = await cacheSystem.get('photographer_123', 'chatbot', 'Pricing question 1');
    const contentCached = await cacheSystem.get('photographer_123', 'content', 'Content question');
    
    expect(pricingCached).toBeNull();
    expect(contentCached).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/ai-cache-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestSupabaseClient } from '@/test-utils/supabase';
import { AICacheAPI } from '@/app/api/ai/cache/route';

describe('AI Cache System Integration', () => {
  let supabase: any;
  let testSupplierId: string;

  beforeAll(async () => {
    supabase = createTestSupabaseClient();
    testSupplierId = await createTestSupplier('photographer', 'professional');
  });

  afterAll(async () => {
    await cleanupTestData(testSupplierId);
  });

  test('complete cache workflow with semantic matching', async () => {
    // 1. Store initial cache entry
    const query1 = 'What are your wedding photography packages and pricing?';
    const response1 = { packages: ['basic: £800', 'premium: £1200', 'luxury: £1800'] };
    
    const storeResponse = await fetch('/api/ai/cache/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: testSupplierId,
        cacheType: 'chatbot',
        query: query1,
        response: response1,
        confidence: 0.95
      })
    });
    expect(storeResponse.ok).toBe(true);

    // 2. Test exact match retrieval
    const exactResponse = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=${encodeURIComponent(query1)}`);
    const exactData = await exactResponse.json();
    
    expect(exactData.cached).toBe(true);
    expect(exactData.similarity).toBe(1.0);
    expect(exactData.result).toEqual(response1);

    // 3. Test semantic similarity match
    const query2 = 'Can you tell me about your photo package prices?';
    const similarResponse = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=${encodeURIComponent(query2)}`);
    const similarData = await similarResponse.json();
    
    expect(similarData.cached).toBe(true);
    expect(similarData.similarity).toBeGreaterThan(0.8);
    expect(similarData.result).toEqual(response1);

    // 4. Test cache miss for unrelated query
    const query3 = 'What is your venue capacity?';
    const missResponse = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=${encodeURIComponent(query3)}`);
    const missData = await missResponse.json();
    
    expect(missData.cached).toBe(false);

    // 5. Verify analytics tracking
    const analyticsResponse = await fetch(`/api/ai/cache/analytics?period=day&supplierId=${testSupplierId}`);
    const analyticsData = await analyticsResponse.json();
    
    expect(analyticsData.totalRequests).toBe(3);
    expect(analyticsData.cacheHits).toBe(2);
    expect(analyticsData.hitRate).toBeCloseTo(66.67, 1);
  });

  test('cache warming workflow', async () => {
    // 1. Configure warming rules
    const warmingConfig = await fetch('/api/ai/cache/warming/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: testSupplierId,
        cacheType: 'chatbot',
        strategy: 'popular_queries',
        enabled: true,
        queryTemplates: [
          'What are your wedding photography packages?',
          'Do you offer engagement sessions?',
          'What is included in your wedding coverage?'
        ]
      })
    });
    expect(warmingConfig.ok).toBe(true);

    // 2. Trigger cache warming
    const warmResponse = await fetch('/api/ai/cache/warm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: testSupplierId,
        strategy: 'popular_queries',
        priority: 3,
        maxQueries: 10
      })
    });
    
    const warmResult = await warmResponse.json();
    expect(warmResult.jobId).toBeDefined();
    expect(warmResult.queriesQueued).toBeGreaterThan(0);

    // 3. Wait for warming completion (or mock)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Verify warmed cache entries exist
    const query = 'What are your wedding photography packages?';
    const warmedResponse = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=${encodeURIComponent(query)}`);
    const warmedData = await warmedResponse.json();
    
    expect(warmedData.cached).toBe(true);
    expect(warmedData.warmed).toBe(true);
  });

  test('seasonal optimization adjustments', async () => {
    // Test June (peak season) optimization
    const juneOptimization = await fetch(`/api/ai/cache/seasonal/6/optimization`);
    const juneData = await juneOptimization.json();
    
    expect(juneData.seasonMultiplier).toBe(1.6);
    expect(juneData.ttlHours).toBeLessThan(72);
    expect(juneData.commonQueries).toContain('day_of_coordination');

    // Test December (low season) optimization  
    const decemberOptimization = await fetch(`/api/ai/cache/seasonal/12/optimization`);
    const decemberData = await decemberOptimization.json();
    
    expect(decemberData.seasonMultiplier).toBe(0.6);
    expect(decemberData.ttlHours).toBeGreaterThan(120);
  });

  test('cache invalidation and cleanup', async () => {
    // 1. Create multiple cache entries
    const queries = [
      'pricing_related_query_1',
      'pricing_related_query_2', 
      'unrelated_query'
    ];
    
    for (const query of queries) {
      await fetch('/api/ai/cache/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: testSupplierId,
          cacheType: 'chatbot',
          query,
          response: { data: `response_${query}` }
        })
      });
    }

    // 2. Invalidate by pattern
    const invalidateResponse = await fetch('/api/ai/cache/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: testSupplierId,
        pattern: 'pricing_*',
        reason: 'Pricing update'
      })
    });
    
    const invalidateResult = await invalidateResponse.json();
    expect(invalidateResult.entriesInvalidated).toBe(2);

    // 3. Verify invalidation worked
    const pricingQuery1 = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=pricing_related_query_1`);
    const pricingData1 = await pricingQuery1.json();
    expect(pricingData1.cached).toBe(false);

    const unrelatedQuery = await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=unrelated_query`);
    const unrelatedData = await unrelatedQuery.json();
    expect(unrelatedData.cached).toBe(true);
  });

  test('performance monitoring and alerts', async () => {
    // Generate cache activity to create performance data
    const queries = Array.from({ length: 100 }, (_, i) => `test_query_${i}`);
    
    // Create some hits and misses
    for (let i = 0; i < queries.length; i++) {
      if (i < 30) {
        // Store first 30 for cache hits
        await fetch('/api/ai/cache/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: testSupplierId,
            cacheType: 'chatbot',
            query: queries[i],
            response: { data: `response_${i}` }
          })
        });
      }
      
      // Query all 100
      await fetch(`/api/ai/cache/get?supplierId=${testSupplierId}&cacheType=chatbot&query=${encodeURIComponent(queries[i])}`);
    }

    // Check performance stats
    const statsResponse = await fetch(`/api/ai/cache/stats?supplierId=${testSupplierId}`);
    const stats = await statsResponse.json();
    
    expect(stats.overall.hitRate).toBeCloseTo(30, 0); // 30% hit rate
    expect(stats.byType.length).toBeGreaterThan(0);
    expect(stats.recentActivity.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/ai-cache-complete-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { createTestSupplier, loginAsSupplier } from '../helpers/auth';
import { mockOpenAIResponses } from '../helpers/ai-mocks';

test.describe('AI Cache System Complete Workflow', () => {
  test('supplier configures and uses intelligent caching', async ({ page }) => {
    // Setup test data
    const supplierId = await createTestSupplier('photographer', 'professional');
    await loginAsSupplier(page, supplierId);
    
    await mockOpenAIResponses(page);

    // Navigate to AI cache dashboard
    await page.goto('/dashboard/ai/cache');
    
    // Verify initial empty state
    await expect(page.locator('[data-testid="cache-hit-rate"]')).toContainText('0.0%');
    await expect(page.locator('[data-testid="total-entries"]')).toContainText('0');

    // Configure cache settings
    await page.click('[data-testid="configure-cache"]');
    
    // Enable semantic caching
    await page.check('[data-testid="enable-semantic-cache"]');
    await page.fill('[data-testid="semantic-threshold"]', '85');
    
    // Configure TTL
    await page.fill('[data-testid="ttl-hours-chatbot"]', '24');
    await page.fill('[data-testid="max-entries-chatbot"]', '10000');
    
    // Enable cache warming
    await page.check('[data-testid="enable-cache-warming"]');
    await page.check('[data-testid="warming-strategy-popular"]');
    
    await page.click('[data-testid="save-cache-config"]');
    await expect(page.locator('[data-testid="config-saved"]')).toBeVisible();

    // Test AI chatbot with caching
    await page.goto('/dashboard/ai/assistant');
    
    // First query (cache miss)
    await page.fill('[data-testid="ai-query"]', 'What wedding photography packages do you offer?');
    await page.click('[data-testid="submit-query"]');
    await page.waitForSelector('[data-testid="ai-response"]');
    
    // Verify response appears
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('photography');
    await expect(page.locator('[data-testid="cache-status"]')).toContainText('Generated');

    // Similar query (should hit semantic cache)
    await page.fill('[data-testid="ai-query"]', 'Can you tell me about your photo packages?');
    await page.click('[data-testid="submit-query"]');
    await page.waitForSelector('[data-testid="ai-response"]');
    
    // Verify cached response
    await expect(page.locator('[data-testid="cache-status"]')).toContainText('Cached');
    await expect(page.locator('[data-testid="similarity-score"]')).toBeVisible();

    // Exact same query (should hit exact cache)
    await page.fill('[data-testid="ai-query"]', 'What wedding photography packages do you offer?');
    await page.click('[data-testid="submit-query"]');
    await page.waitForSelector('[data-testid="ai-response"]');
    
    await expect(page.locator('[data-testid="cache-status"]')).toContainText('Exact Match');

    // Return to cache dashboard and verify improvements
    await page.goto('/dashboard/ai/cache');
    
    await expect(page.locator('[data-testid="cache-hit-rate"]')).not.toContainText('0.0%');
    await expect(page.locator('[data-testid="total-entries"]')).not.toContainText('0');
    await expect(page.locator('[data-testid="cost-savings"]')).toBeVisible();

    // Test cache warming
    await page.click('[data-testid="warm-cache-now"]');
    await page.selectOption('[data-testid="warming-strategy"]', 'popular_queries');
    await page.fill('[data-testid="max-queries-to-warm"]', '20');
    await page.click('[data-testid="start-warming"]');
    
    // Verify warming job created
    await expect(page.locator('[data-testid="warming-job-created"]')).toBeVisible();
    await expect(page.locator('[data-testid="warming-progress"]')).toBeVisible();

    // Test performance analytics
    await page.click('[data-testid="view-analytics"]');
    
    // Verify analytics charts are displayed
    await expect(page.locator('[data-testid="hit-rate-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-savings-chart"]')).toBeVisible();

    // Test cache invalidation
    await page.click('[data-testid="manage-cache"]');
    await page.click('[data-testid="invalidate-cache"]');
    await page.selectOption('[data-testid="invalidation-pattern"]', 'chatbot:*');
    await page.fill('[data-testid="invalidation-reason"]', 'Testing invalidation');
    await page.click('[data-testid="confirm-invalidation"]');
    
    // Verify invalidation success
    await expect(page.locator('[data-testid="invalidation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="entries-invalidated"]')).toContainText(/\d+ entries/);

    // Test seasonal optimization notification
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 5 && currentMonth <= 9) {
      // Peak wedding season
      await expect(page.locator('[data-testid="seasonal-notice"]')).toContainText('peak season');
      await expect(page.locator('[data-testid="recommended-ttl"]')).toContainText(/\d+ hours/);
    }

    // Verify cache feedback system
    await page.goto('/dashboard/ai/assistant');
    await page.fill('[data-testid="ai-query"]', 'What are your availability dates?');
    await page.click('[data-testid="submit-query"]');
    await page.waitForSelector('[data-testid="ai-response"]');
    
    if (await page.locator('[data-testid="cache-status"]').textContent() === 'Cached') {
      // Rate the cached response
      await page.click('[data-testid="rate-response-5"]'); // 5 stars
      await page.fill('[data-testid="response-feedback"]', 'Very helpful and accurate!');
      await page.click('[data-testid="submit-feedback"]');
      
      await expect(page.locator('[data-testid="feedback-submitted"]')).toBeVisible();
    }

    // Final verification of complete workflow
    await page.goto('/dashboard/ai/cache');
    
    const finalStats = await page.locator('[data-testid="cache-summary"]').textContent();
    expect(finalStats).toMatch(/Hit Rate: \d+\.\d+%/);
    expect(finalStats).toMatch(/Saved: £\d+\.\d+/);
    expect(finalStats).toMatch(/Entries: \d+/);
  });
});
```

## Acceptance Criteria

### Performance Requirements
- **Cache Hit Rate**: Achieve 70%+ hit rate within 30 days of deployment
- **Response Time**: Cached responses serve in <100ms, 95th percentile <200ms
- **Semantic Accuracy**: Semantic matches maintain 85%+ user satisfaction rating
- **Storage Efficiency**: Vector embeddings compressed to <2KB average per entry

### Cache Effectiveness Requirements
- **Exact Matching**: 99%+ accuracy for identical queries
- **Semantic Matching**: 85%+ similarity threshold with 90%+ user approval
- **TTL Management**: Automatic expiration based on content type and seasonality
- **Warming Success**: 95%+ success rate for cache warming jobs

### Wedding Industry Requirements
- **Seasonal Optimization**: Automatic TTL and threshold adjustments by season
- **Timeline Awareness**: Wedding proximity affects cache strategy within 24 hours
- **Vendor Specialization**: Cache patterns optimized for photographer, planner, venue needs
- **Peak Performance**: System maintains performance during peak months (May-October)

### Cost Optimization Requirements
- **Cost Reduction**: Demonstrate 40-70% AI cost reduction through caching
- **Storage Costs**: Cache storage costs <10% of AI generation savings
- **Warming Efficiency**: Cache warming ROI positive within 14 days
- **Budget Control**: Configurable daily/monthly warming budgets enforced

### Technical Requirements
- **Database Performance**: Cache queries complete in <50ms with 100k+ entries
- **Vector Search**: Similarity search scales to 500k+ embeddings
- **Analytics Accuracy**: Real-time metrics with <1% deviation from actual usage
- **MCP Integration**: Seamless operation with Context7, PostgreSQL, and Supabase MCPs

## Effort Estimation

### Team B (Backend) - 68 hours
- Multi-layer cache system implementation (28h)
- Database schema and vector search (20h)
- API endpoints development (12h)
- Cache warming and invalidation systems (8h)

### Team D (AI/ML) - 42 hours
- Semantic similarity matching (18h)
- Embedding generation optimization (12h)
- Cache optimization algorithms (8h)
- Performance monitoring integration (4h)

### Team A (Frontend) - 32 hours
- Cache performance dashboard (20h)
- Configuration panels (8h)
- Analytics visualization (4h)

### Team C (Integration) - 18 hours
- MCP server integration (12h)
- Wedding context optimization (6h)

### Team E (Platform) - 12 hours
- Cache warming job scheduler (8h)
- Performance monitoring alerts (4h)

### Team F (General) - 28 hours
- Testing implementation (20h)
- Documentation and deployment (8h)

**Total Effort: 200 hours**

## Dependencies
- Vector similarity search infrastructure (pgvector)
- Redis cache layer setup
- OpenAI embeddings API access
- Wedding timeline data integration
- MCP server cache monitoring hooks

## Risks & Mitigations
- **Risk**: Vector search performance degradation with large datasets
- **Mitigation**: Index optimization and periodic maintenance
- **Risk**: Semantic matching false positives affecting quality
- **Mitigation**: Confidence thresholds and user feedback loops
- **Risk**: Cache warming costs exceeding benefits
- **Mitigation**: ROI monitoring and adaptive warming strategies