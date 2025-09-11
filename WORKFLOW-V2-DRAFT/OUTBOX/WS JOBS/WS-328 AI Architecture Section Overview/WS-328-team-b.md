# WS-328 AI Architecture Section Overview - Team B: Backend/API Development

## CRITICAL OVERVIEW
🎯 **PRIMARY MISSION**: Build robust AI Architecture API layer providing comprehensive system metrics, model management, performance monitoring, and cost optimization capabilities for the entire WedSync AI infrastructure.

🏗️ **BACKEND EXCELLENCE IMPERATIVE**: Create bulletproof APIs handling real-time AI metrics, model routing decisions, provider failover management, and cost analytics with enterprise-grade security and wedding day reliability.

⚡ **PERFORMANCE OBSESSION**: APIs must serve real-time metrics with sub-100ms response times, handle 10,000+ concurrent metric updates, and maintain 99.99% uptime during peak wedding season.

## SEQUENTIAL THINKING MCP REQUIREMENT
**MANDATORY**: Use Sequential Thinking MCP for ALL backend architecture decisions:
- AI metrics collection and aggregation pipeline design
- Model performance evaluation algorithms and scoring systems
- Cost optimization engine architecture and calculation methods
- Real-time monitoring data flow and subscription management
- Provider failover detection and automatic routing implementation
- Scalable database design for high-volume AI usage analytics

## ENHANCED SERENA MCP ACTIVATION PROTOCOL
**Phase 1 - Backend Architecture Analysis**
```typescript
// MANDATORY: Activate enhanced Serena MCP session
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/app/api/")
mcp__serena__find_symbol("APIRoute", "", true) // Current API patterns
mcp__serena__find_symbol("DatabaseService", "", true) // Database integration
mcp__serena__search_for_pattern("NextResponse|middleware|auth") // API security audit
```

**Phase 2 - Monitoring System Investigation**
```typescript
mcp__serena__find_referencing_symbols("MetricsCollector", "src/lib/") 
mcp__serena__get_symbols_overview("src/lib/monitoring/")
mcp__serena__find_symbol("RealtimeSubscription", "", true) // WebSocket patterns
mcp__serena__search_for_pattern("cron|schedule|worker") // Background job patterns
```

## CORE API SPECIFICATIONS

### 1. AI METRICS COLLECTION API
**File**: `src/app/api/ai/metrics/route.ts`

**Real-time Metrics Endpoint**:
```typescript
// GET /api/ai/metrics - Get current AI system metrics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('range') || '24h'
    const organizationId = searchParams.get('org')
    
    // Authenticate admin/system architect role
    const session = await getServerSession(authOptions)
    if (!session || !hasRole(session.user, ['admin', 'system_architect'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const metrics = await AIMetricsService.getSystemMetrics({
      timeRange,
      organizationId
    })
    
    return NextResponse.json({
      success: true,
      data: {
        system_health: {
          uptime: metrics.systemUptime,
          avg_response_time: metrics.avgResponseTime,
          error_rate: metrics.errorRate,
          active_requests: metrics.activeRequests,
          queue_depth: metrics.queueDepth
        },
        provider_status: metrics.providerStatus,
        model_performance: metrics.modelPerformance,
        cost_analytics: metrics.costAnalytics,
        usage_by_season: metrics.seasonalUsage,
        wedding_day_mode: metrics.weddingDayMode
      }
    })
    
  } catch (error) {
    console.error('AI metrics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI metrics' }, 
      { status: 500 }
    )
  }
}

// POST /api/ai/metrics - Record AI usage metrics
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      request_id,
      organization_id,
      model_name,
      provider,
      prompt_tokens,
      completion_tokens,
      response_time_ms,
      cost_usd,
      quality_score,
      error_type,
      wedding_context
    } = body
    
    // Validate required fields
    const validation = AIMetricsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid metrics data', details: validation.error.issues },
        { status: 400 }
      )
    }
    
    // Store metrics for real-time analytics
    await AIMetricsService.recordUsage({
      requestId: request_id,
      organizationId: organization_id,
      modelName: model_name,
      provider,
      usage: {
        promptTokens: prompt_tokens,
        completionTokens: completion_tokens,
        totalTokens: prompt_tokens + completion_tokens
      },
      performance: {
        responseTimeMs: response_time_ms,
        qualityScore: quality_score
      },
      cost: {
        amountUsd: cost_usd,
        amountGbp: cost_usd * await getExchangeRate()
      },
      error: error_type ? { type: error_type } : null,
      context: {
        isWeddingRelated: wedding_context?.is_wedding_related || false,
        weddingDate: wedding_context?.wedding_date,
        vendorType: wedding_context?.vendor_type
      },
      timestamp: new Date()
    })
    
    // Trigger real-time updates for dashboard
    await broadcastMetricsUpdate(organization_id, {
      type: 'usage_recorded',
      data: validation.data
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('AI metrics recording error:', error)
    return NextResponse.json(
      { error: 'Failed to record metrics' }, 
      { status: 500 }
    )
  }
}
```

### 2. AI MODEL MANAGEMENT API
**File**: `src/app/api/ai/models/route.ts`

**Model Configuration and Routing**:
```typescript
// GET /api/ai/models - Get available AI models and performance
export async function GET(request: Request) {
  try {
    const models = await AIModelService.getAvailableModels()
    
    const modelsWithPerformance = await Promise.all(
      models.map(async (model) => {
        const performance = await AIMetricsService.getModelPerformance(model.id, '7d')
        const costAnalysis = await CostOptimizer.getModelCostAnalysis(model.id)
        
        return {
          id: model.id,
          name: model.name,
          provider: model.provider,
          capabilities: model.capabilities,
          cost_per_token: model.costPerToken,
          performance: {
            avg_response_time: performance.avgResponseTime,
            quality_score: performance.avgQualityScore,
            success_rate: performance.successRate,
            wedding_specialization: performance.weddingSpecialization
          },
          cost_analysis: {
            cost_per_request: costAnalysis.avgCostPerRequest,
            monthly_usage: costAnalysis.monthlyUsage,
            cost_trend: costAnalysis.trend
          },
          status: model.isActive ? 'active' : 'inactive',
          last_used: performance.lastUsed
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: {
        models: modelsWithPerformance,
        recommendations: await ModelOptimizer.getOptimizationRecommendations()
      }
    })
    
  } catch (error) {
    console.error('AI models API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI models' }, 
      { status: 500 }
    )
  }
}

// PUT /api/ai/models/[modelId]/route.ts - Update model configuration
export async function PUT(
  request: Request,
  { params }: { params: { modelId: string } }
) {
  try {
    const body = await request.json()
    const { is_active, cost_per_token, priority, wedding_specialization } = body
    
    // Authenticate admin access
    const session = await getServerSession(authOptions)
    if (!session || !hasRole(session.user, ['admin'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const updatedModel = await AIModelService.updateModel(params.modelId, {
      isActive: is_active,
      costPerToken: cost_per_token,
      priority,
      weddingSpecialization: wedding_specialization
    })
    
    // Trigger model configuration refresh
    await ModelRouter.refreshConfiguration()
    
    return NextResponse.json({
      success: true,
      data: updatedModel
    })
    
  } catch (error) {
    console.error('AI model update error:', error)
    return NextResponse.json(
      { error: 'Failed to update model' }, 
      { status: 500 }
    )
  }
}
```

### 3. COST OPTIMIZATION ENGINE API
**File**: `src/app/api/ai/optimization/route.ts`

**Cost Analysis and Optimization**:
```typescript
// GET /api/ai/optimization - Get cost optimization recommendations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('org')
    const timeRange = searchParams.get('range') || '30d'
    
    const optimization = await CostOptimizationEngine.analyze({
      organizationId,
      timeRange
    })
    
    return NextResponse.json({
      success: true,
      data: {
        current_spending: {
          monthly_cost: optimization.currentMonthlyCost,
          cost_per_request: optimization.avgCostPerRequest,
          cost_by_model: optimization.costByModel,
          cost_by_use_case: optimization.costByUseCase
        },
        optimization_opportunities: {
          potential_savings: optimization.potentialSavings,
          recommendations: optimization.recommendations.map(rec => ({
            type: rec.type, // 'model_switch', 'prompt_optimization', 'caching'
            description: rec.description,
            estimated_savings: rec.estimatedSavings,
            implementation_effort: rec.effort, // 'low', 'medium', 'high'
            wedding_impact: rec.weddingImpact // 'none', 'minimal', 'moderate'
          }))
        },
        spending_forecast: {
          next_month_estimate: optimization.nextMonthEstimate,
          peak_season_estimate: optimization.peakSeasonEstimate,
          annual_projection: optimization.annualProjection
        },
        efficiency_metrics: {
          requests_per_pound: optimization.requestsPerPound,
          cost_trend_7d: optimization.costTrend7d,
          cost_trend_30d: optimization.costTrend30d
        }
      }
    })
    
  } catch (error) {
    console.error('Cost optimization API error:', error)
    return NextResponse.json(
      { error: 'Failed to get optimization data' }, 
      { status: 500 }
    )
  }
}

// POST /api/ai/optimization/apply - Apply optimization recommendations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { optimization_id, organization_id } = body
    
    // Authenticate admin access
    const session = await getServerSession(authOptions)
    if (!session || !hasRole(session.user, ['admin', 'organization_owner'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const result = await CostOptimizationEngine.applyOptimization({
      optimizationId: optimization_id,
      organizationId: organization_id
    })
    
    return NextResponse.json({
      success: true,
      data: {
        applied: result.applied,
        estimated_savings: result.estimatedSavings,
        effective_date: result.effectiveDate,
        changes: result.changes
      }
    })
    
  } catch (error) {
    console.error('Apply optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to apply optimization' }, 
      { status: 500 }
    )
  }
}
```

### 4. PROVIDER HEALTH MONITORING API
**File**: `src/app/api/ai/providers/health/route.ts`

**Real-time Provider Status**:
```typescript
// GET /api/ai/providers/health - Get provider health status
export async function GET(request: Request) {
  try {
    const healthStatus = await ProviderHealthMonitor.getCurrentStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        providers: healthStatus.providers.map(provider => ({
          name: provider.name,
          status: provider.status, // 'healthy', 'degraded', 'down'
          uptime: provider.uptime,
          avg_response_time: provider.avgResponseTime,
          error_rate: provider.errorRate,
          active_requests: provider.activeRequests,
          quota_used: provider.quotaUsed,
          quota_limit: provider.quotaLimit,
          last_health_check: provider.lastHealthCheck,
          capabilities: provider.capabilities
        })),
        failover_history: healthStatus.recentFailovers.map(event => ({
          timestamp: event.timestamp,
          from_provider: event.fromProvider,
          to_provider: event.toProvider,
          reason: event.reason,
          requests_affected: event.requestsAffected,
          recovery_time_ms: event.recoveryTimeMs
        })),
        system_health: {
          overall_status: healthStatus.overallStatus,
          healthy_providers: healthStatus.healthyProviderCount,
          degraded_providers: healthStatus.degradedProviderCount,
          down_providers: healthStatus.downProviderCount,
          failover_capability: healthStatus.failoverCapable
        }
      }
    })
    
  } catch (error) {
    console.error('Provider health API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider health' }, 
      { status: 500 }
    )
  }
}

// POST /api/ai/providers/[providerId]/test - Test provider health
export async function POST(
  request: Request,
  { params }: { params: { providerId: string } }
) {
  try {
    // Authenticate admin access
    const session = await getServerSession(authOptions)
    if (!session || !hasRole(session.user, ['admin'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const testResult = await ProviderHealthMonitor.testProvider(params.providerId)
    
    return NextResponse.json({
      success: true,
      data: {
        provider_id: params.providerId,
        test_timestamp: testResult.timestamp,
        status: testResult.status,
        response_time: testResult.responseTime,
        error_message: testResult.errorMessage,
        test_request_id: testResult.testRequestId
      }
    })
    
  } catch (error) {
    console.error('Provider test error:', error)
    return NextResponse.json(
      { error: 'Failed to test provider' }, 
      { status: 500 }
    )
  }
}
```

## DATABASE SCHEMA EXTENSIONS

### AI Architecture Tables
```sql
-- AI Models Management
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google'
  model_config JSONB DEFAULT '{}',
  cost_per_token NUMERIC(10,8),
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 100, -- Lower = higher priority
  wedding_specialization NUMERIC(3,2) DEFAULT 0.5, -- 0-1 wedding focus score
  capabilities TEXT[] DEFAULT '{}', -- ['text_generation', 'code_generation']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage Metrics (High Volume)
CREATE TABLE IF NOT EXISTS ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  model_id UUID REFERENCES ai_models(id),
  provider VARCHAR(50) NOT NULL,
  
  -- Usage Stats
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Performance
  response_time_ms INTEGER,
  quality_score NUMERIC(3,2), -- 0-1 quality rating
  
  -- Cost
  cost_usd NUMERIC(10,6),
  cost_gbp NUMERIC(10,6),
  
  -- Context
  use_case VARCHAR(100), -- 'email_template', 'form_generation', 'content_writing'
  is_wedding_related BOOLEAN DEFAULT FALSE,
  wedding_date DATE,
  vendor_type VARCHAR(50),
  
  -- Error Handling
  error_type VARCHAR(100),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_date ON ai_usage_metrics(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_date ON ai_usage_metrics(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_wedding_date ON ai_usage_metrics(wedding_date) WHERE wedding_date IS NOT NULL;

-- Provider Health Status
CREATE TABLE IF NOT EXISTS ai_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
  uptime_percentage NUMERIC(5,4) DEFAULT 1.0,
  avg_response_time_ms INTEGER,
  error_rate NUMERIC(5,4) DEFAULT 0.0,
  active_requests INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  quota_limit INTEGER,
  last_health_check TIMESTAMPTZ DEFAULT NOW(),
  capabilities JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failover Events Log
CREATE TABLE IF NOT EXISTS ai_failover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_provider VARCHAR(50) NOT NULL,
  to_provider VARCHAR(50) NOT NULL,
  reason VARCHAR(200),
  requests_affected INTEGER DEFAULT 0,
  recovery_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Optimization Recommendations
CREATE TABLE IF NOT EXISTS ai_cost_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  optimization_type VARCHAR(50) NOT NULL, -- 'model_switch', 'prompt_optimization'
  description TEXT NOT NULL,
  estimated_savings_monthly NUMERIC(10,2),
  implementation_effort VARCHAR(20), -- 'low', 'medium', 'high'
  wedding_impact VARCHAR(20), -- 'none', 'minimal', 'moderate'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'applied', 'rejected'
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## BACKGROUND SERVICES & WORKERS

### Real-time Metrics Aggregator
```typescript
// src/lib/workers/ai-metrics-aggregator.ts
export class AIMetricsAggregator {
  private aggregationWindow = 60000 // 1 minute
  private metrics: Map<string, AIMetric[]> = new Map()

  async startAggregation(): Promise<void> {
    setInterval(async () => {
      await this.aggregateAndStore()
    }, this.aggregationWindow)
  }

  private async aggregateAndStore(): Promise<void> {
    const aggregatedData = this.computeAggregations()
    
    // Store aggregated metrics
    await AIMetricsService.storeAggregatedMetrics(aggregatedData)
    
    // Broadcast to real-time dashboard
    await this.broadcastUpdates(aggregatedData)
    
    // Clear processed metrics
    this.metrics.clear()
  }

  private computeAggregations() {
    const aggregations = new Map()
    
    for (const [organizationId, metrics] of this.metrics) {
      aggregations.set(organizationId, {
        totalRequests: metrics.length,
        avgResponseTime: this.average(metrics.map(m => m.responseTimeMs)),
        totalCost: metrics.reduce((sum, m) => sum + m.costGbp, 0),
        errorRate: metrics.filter(m => m.errorType).length / metrics.length,
        topModels: this.getTopModels(metrics),
        weddingRequests: metrics.filter(m => m.isWeddingRelated).length
      })
    }
    
    return aggregations
  }
}
```

### Provider Health Monitor
```typescript
// src/lib/services/provider-health-monitor.ts
export class ProviderHealthMonitor {
  private checkInterval = 30000 // 30 seconds
  private providers = ['openai', 'anthropic', 'google']

  async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      await this.checkAllProviders()
    }, this.checkInterval)
  }

  private async checkAllProviders(): Promise<void> {
    const healthChecks = this.providers.map(async (provider) => {
      try {
        const startTime = Date.now()
        
        // Make test request
        const response = await this.makeTestRequest(provider)
        const responseTime = Date.now() - startTime
        
        await this.updateProviderHealth(provider, {
          status: 'healthy',
          responseTime,
          lastCheck: new Date()
        })
        
      } catch (error) {
        console.error(`Provider ${provider} health check failed:`, error)
        
        await this.updateProviderHealth(provider, {
          status: 'degraded',
          errorMessage: error.message,
          lastCheck: new Date()
        })
        
        // Trigger failover if necessary
        await this.evaluateFailover(provider, error)
      }
    })

    await Promise.allSettled(healthChecks)
  }

  private async evaluateFailover(
    failedProvider: string, 
    error: Error
  ): Promise<void> {
    const healthyProviders = await this.getHealthyProviders()
    
    if (healthyProviders.length === 0) {
      console.error('All AI providers are down!')
      await this.triggerEmergencyAlert()
      return
    }

    // Record failover event
    await AIFailoverService.recordFailover({
      fromProvider: failedProvider,
      toProvider: healthyProviders[0], // Use first available
      reason: error.message,
      timestamp: new Date()
    })

    // Update routing configuration
    await ModelRouter.updateFailoverConfiguration(
      failedProvider, 
      healthyProviders[0]
    )
  }
}
```

## WEDDING INDUSTRY SPECIFIC FEATURES

### Wedding Day Mode API
```typescript
// src/app/api/ai/wedding-day-mode/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { wedding_date, venue_location, priority_level } = body
    
    // Enable wedding day mode for enhanced performance
    await WeddingDayOptimizer.enableMode({
      weddingDate: wedding_date,
      venueLocation: venue_location,
      priorityLevel: priority_level, // 'high', 'critical', 'emergency'
      enhancements: {
        fasterRouting: true,
        reducedLatency: true,
        priorityQueuing: true,
        additionalRedundancy: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        mode: 'wedding_day_active',
        enhanced_features: [
          'Priority AI request routing',
          'Sub-1-second response guarantee',
          'Additional provider redundancy',
          'Real-time monitoring alerts'
        ],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })
    
  } catch (error) {
    console.error('Wedding day mode activation error:', error)
    return NextResponse.json(
      { error: 'Failed to activate wedding day mode' }, 
      { status: 500 }
    )
  }
}
```

### Seasonal Usage Analytics
```typescript
// src/lib/services/seasonal-analytics.ts
export class SeasonalAnalytics {
  async getWeddingSeasonTrends(timeRange: string = '12m') {
    const usage = await AIUsageService.getUsageByMonth(timeRange)
    
    return {
      peakSeason: {
        months: ['May', 'June', 'July', 'August', 'September'],
        avgRequestsPerDay: this.calculatePeakAverage(usage),
        costMultiplier: this.calculateCostMultiplier(usage)
      },
      offSeason: {
        months: ['January', 'February', 'March', 'November', 'December'],
        avgRequestsPerDay: this.calculateOffSeasonAverage(usage),
        savingsOpportunity: this.calculateSavingsOpportunity(usage)
      },
      shoulderSeason: {
        months: ['April', 'October'],
        avgRequestsPerDay: this.calculateShoulderAverage(usage),
        scalingStrategy: this.getScalingStrategy(usage)
      }
    }
  }

  private calculateCostMultiplier(usage: UsageData[]) {
    const peakUsage = usage.filter(u => this.isPeakMonth(u.month))
    const offSeasonUsage = usage.filter(u => !this.isPeakMonth(u.month))
    
    const peakAvg = peakUsage.reduce((sum, u) => sum + u.cost, 0) / peakUsage.length
    const offSeasonAvg = offSeasonUsage.reduce((sum, u) => sum + u.cost, 0) / offSeasonUsage.length
    
    return peakAvg / offSeasonAvg
  }
}
```

## SECURITY & MONITORING

### API Security Middleware
```typescript
// src/middleware/ai-api-security.ts
export function aiApiSecurityMiddleware() {
  return async (request: NextRequest) => {
    // Rate limiting for AI metrics endpoints
    const clientIP = request.ip || 'anonymous'
    const isExceeded = await rateLimiter.check(clientIP, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100 // 100 requests per minute
    })
    
    if (isExceeded) {
      return new NextResponse('Rate limit exceeded', { status: 429 })
    }
    
    // API key validation for external monitoring tools
    if (request.headers.get('x-api-key')) {
      const isValid = await validateMonitoringAPIKey(
        request.headers.get('x-api-key')
      )
      if (!isValid) {
        return new NextResponse('Invalid API key', { status: 401 })
      }
    }
    
    return NextResponse.next()
  }
}
```

### Audit Logging
```typescript
// src/lib/services/ai-audit-logger.ts
export class AIAuditLogger {
  async logAPIAccess(request: {
    endpoint: string
    userId?: string
    organizationId?: string
    action: string
    result: 'success' | 'error'
    duration: number
  }) {
    await supabase.from('ai_audit_logs').insert({
      endpoint: request.endpoint,
      user_id: request.userId,
      organization_id: request.organizationId,
      action: request.action,
      result: request.result,
      duration_ms: request.duration,
      timestamp: new Date().toISOString(),
      ip_address: this.getClientIP(),
      user_agent: this.getUserAgent()
    })
  }

  async logModelConfigChange(change: {
    modelId: string
    userId: string
    changes: Record<string, any>
    reason?: string
  }) {
    await supabase.from('ai_config_changes').insert({
      model_id: change.modelId,
      changed_by: change.userId,
      changes: change.changes,
      reason: change.reason,
      timestamp: new Date().toISOString()
    })
  }
}
```

## SUCCESS CRITERIA & VALIDATION

### API Performance Requirements
- ✅ Metrics API responds < 100ms (p95)
- ✅ Model management API < 200ms (p95)
- ✅ Real-time updates < 50ms latency
- ✅ Cost optimization API < 500ms (complex calculations)
- ✅ Provider health API < 50ms (cached data)

### Data Integrity Requirements
- ✅ 100% accurate cost tracking (verified against provider bills)
- ✅ Zero data loss in metrics collection
- ✅ Real-time metrics accuracy within 5% of actual
- ✅ Failover detection < 30 seconds
- ✅ Historical data retention for 2+ years

### Wedding Industry Requirements
- ✅ Wedding day mode activation < 1 second
- ✅ Peak season handling for 10x traffic
- ✅ Vendor cost transparency (detailed breakdowns)
- ✅ Wedding-specific optimization recommendations
- ✅ Seasonal trend analysis accuracy

## EVIDENCE-BASED REALITY REQUIREMENTS

### API Endpoint Proof
```bash
# All API routes created and functional
ls -la src/app/api/ai/
curl -X GET http://localhost:3000/api/ai/metrics
curl -X GET http://localhost:3000/api/ai/models
curl -X GET http://localhost:3000/api/ai/optimization
```

### Database Schema Proof  
```bash
# Database tables created
npx supabase db diff --linked
psql -c "\dt ai_*" # List AI architecture tables
```

### Background Services Proof
```bash
# Workers and services implemented
ls -la src/lib/workers/
ls -la src/lib/services/ai-*
npm run test src/lib/workers/
```

### Load Testing Proof
```bash
# API load testing results
npm run load-test:ai-apis
k6 run tests/load/ai-metrics-api.js
```

**BACKEND REALITY CHECK**: These APIs will serve real-time data to wedding vendors managing hundreds of weddings simultaneously during peak season. Every API call represents critical business intelligence for vendors investing thousands in AI tools. Performance and reliability are non-negotiable.

**WEDDING INDUSTRY INTEGRATION**: The backend must understand wedding seasonality, vendor workflows, and the critical nature of wedding day operations. Cost optimization recommendations must consider wedding industry profit margins and pricing sensitivity.