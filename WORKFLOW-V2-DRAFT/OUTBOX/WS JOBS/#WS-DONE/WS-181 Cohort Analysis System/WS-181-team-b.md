# TEAM B - ROUND 1: WS-181 - Cohort Analysis System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build cohort calculation engine with complex analytics processing, caching optimization, and business intelligence APIs
**FEATURE ID:** WS-181 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about cohort calculation accuracy and large dataset performance optimization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/cohort-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/analytics/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("cohort.*calculation");
await mcp__serena__search_for_pattern("analytics.*engine");
await mcp__serena__get_symbols_overview("src/lib/analytics/");
```

### B. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("PostgreSQL cohort analysis queries optimization");
await mcp__Ref__ref_search_documentation("Node.js data processing large datasets");
await mcp__Ref__ref_search_documentation("Redis caching strategies analytics");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Cohort analysis engine requires sophisticated data processing architecture: 1) Complex SQL queries for cohort grouping by signup month with retention calculations 2) Multi-metric analysis (retention, revenue, LTV) with time-series data 3) Efficient caching layer to handle repeated cohort requests 4) Background processing for large cohort calculations 5) Real-time data updates while maintaining calculation accuracy. Must handle wedding industry seasonality and supplier lifecycle patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

### 1. **postgresql-database-expert**: Advanced cohort SQL optimization
**Mission**: Design optimized PostgreSQL queries for complex cohort analysis calculations
```typescript
await Task({
  subagent_type: "postgresql-database-expert",
  prompt: `Design advanced PostgreSQL cohort analysis queries for WS-181 system. Must include:
  
  1. Complex Cohort Calculation Queries:
  - Cohort segmentation by supplier signup month with wedding season consideration
  - Retention rate calculations across multiple time periods (3m, 6m, 12m, 24m)
  - Revenue cohort analysis with lifetime value progression
  - Cross-cohort comparison queries for performance benchmarking
  
  2. Query Performance Optimization:
  - Optimized indexing strategies for large supplier datasets
  - Materialized view creation for frequently accessed cohort data
  - Query plan optimization for complex aggregate calculations
  - Partitioning strategies for time-series cohort data
  
  3. Real-Time Data Processing:
  - Incremental cohort updates as new supplier data arrives
  - Efficient delta processing for cohort recalculations
  - Data consistency maintenance during concurrent cohort analysis
  
  Focus on handling wedding industry data patterns and seasonal supplier behaviors.`,
  description: "Cohort SQL optimization"
});
```

### 2. **api-architect**: Cohort analytics API design
**Mission**: Create comprehensive APIs for cohort analysis data access and business intelligence
```typescript
await Task({
  subagent_type: "api-architect",
  prompt: `Design comprehensive API architecture for WS-181 cohort analysis system. Must include:
  
  1. Cohort Data APIs:
  - GET /api/analytics/cohorts - List available cohort analyses
  - POST /api/analytics/cohorts/calculate - Trigger cohort calculation
  - GET /api/analytics/cohorts/{id}/metrics - Get cohort metrics and KPIs
  - PUT /api/analytics/cohorts/{id}/baseline - Update cohort baseline
  
  2. Business Intelligence APIs:
  - GET /api/analytics/cohorts/insights - Automated business insights
  - GET /api/analytics/cohorts/trends - Cohort trend analysis
  - POST /api/analytics/cohorts/compare - Compare multiple cohorts
  - GET /api/analytics/cohorts/export - Export cohort data
  
  3. Real-Time Analytics APIs:
  - WebSocket endpoints for real-time cohort updates
  - Server-sent events for cohort calculation progress
  - Webhook endpoints for cohort milestone notifications
  
  Design for high-performance analytics with caching and rate limiting.`,
  description: "Cohort analytics APIs"
});
```

### 3. **performance-optimization-expert**: Analytics caching and optimization
**Mission**: Implement high-performance caching and optimization for cohort calculations
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Implement performance optimization for WS-181 cohort analysis system. Must include:
  
  1. Advanced Caching Strategy:
  - Redis caching for frequently accessed cohort results
  - Intelligent cache invalidation based on data updates
  - Multi-level caching (database, application, CDN)
  - Cache warming strategies for popular cohort analyses
  
  2. Background Processing Optimization:
  - Queue-based cohort calculation processing
  - Parallel processing for large cohort datasets
  - Progressive cohort calculation with partial results
  - Resource allocation optimization for analytics workloads
  
  3. Database Performance Optimization:
  - Query optimization for complex cohort calculations
  - Index strategy optimization for cohort queries
  - Connection pooling for analytics workloads
  - Read replica utilization for analytics queries
  
  Focus on maintaining sub-second response times for cohort dashboard interactions.`,
  description: "Analytics optimization"
});
```

### 4. **data-analytics-engineer**: Business intelligence and insights generation
**Mission**: Create automated business intelligence and insight generation for cohort analysis
```typescript
await Task({
  subagent_type: "data-analytics-engineer",
  prompt: `Create business intelligence engine for WS-181 cohort analysis system. Must include:
  
  1. Automated Insights Generation:
  - Best/worst performing cohort identification
  - Seasonal pattern recognition in cohort behavior
  - Actionable recommendations for retention improvement
  - Anomaly detection in cohort performance trends
  
  2. Advanced Analytics Calculations:
  - Customer Lifetime Value (LTV) prediction by cohort
  - Churn risk scoring for cohort segments
  - Revenue forecasting based on cohort trends
  - Market opportunity analysis using cohort data
  
  3. Business Reporting Integration:
  - Executive dashboard data preparation
  - KPI calculation and trend analysis
  - ROI analysis for retention initiatives
  - Competitor benchmarking using cohort metrics
  
  Focus on translating complex cohort data into actionable business insights for wedding platform growth.`,
  description: "Business intelligence"
});
```

### 5. **database-mcp-specialist**: Database architecture and migration
**Mission**: Design database schema and migration strategy for cohort analysis
```typescript
await Task({
  subagent_type: "database-mcp-specialist",
  prompt: `Design database architecture for WS-181 cohort analysis system. Must include:
  
  1. Cohort Analysis Schema Design:
  - Cohort definitions table with flexible segmentation criteria
  - Cohort metrics table with historical performance data
  - Cohort insights table for storing automated business intelligence
  - Cohort baseline table for performance benchmarking
  
  2. Performance Optimization Schema:
  - Materialized views for complex cohort calculations
  - Partitioning strategy for time-series cohort data
  - Indexing strategy for fast cohort query performance
  - Archive strategy for historical cohort data
  
  3. Data Pipeline Architecture:
  - ETL processes for cohort data preparation
  - Data quality validation for cohort calculations
  - Real-time data synchronization for cohort updates
  - Backup and recovery procedures for analytics data
  
  Design for scalability to handle millions of supplier records and thousands of cohorts.`,
  description: "Database architecture"
});
```

### 6. **security-compliance-officer**: Analytics security and compliance
**Mission**: Implement security measures and compliance for business analytics data
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security and compliance for WS-181 cohort analysis system. Must include:
  
  1. Data Privacy and Security:
  - Anonymization of sensitive supplier data in cohort analysis
  - Encryption of cohort calculation results and insights
  - Access control for business intelligence data
  - Audit logging for all cohort analysis activities
  
  2. Compliance Requirements:
  - GDPR compliance for cohort analysis data handling
  - SOC2 compliance for analytics data processing
  - Data retention policies for cohort historical data
  - Right to be forgotten implementation for cohort data
  
  3. Security Monitoring:
  - Anomaly detection for unusual cohort data access
  - Security scanning for analytics API endpoints
  - Penetration testing for business intelligence systems
  - Incident response procedures for analytics security breaches
  
  Ensure cohort analysis maintains highest security standards while enabling business insights.`,
  description: "Analytics security"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COHORT ANALYTICS SECURITY:
- [ ] **Business data access control** - Restrict sensitive cohort data to authorized analytics roles
- [ ] **Data anonymization** - Anonymize supplier personal data in cohort calculations  
- [ ] **API authentication** - Secure all cohort analytics API endpoints with proper authentication
- [ ] **Audit logging** - Log all cohort analysis activities and data access
- [ ] **Encryption at rest** - Encrypt stored cohort calculation results and insights
- [ ] **Rate limiting** - Prevent abuse of computationally expensive cohort calculations
- [ ] **Input validation** - Validate all cohort analysis parameters and configurations

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

### SPECIFIC DELIVERABLES FOR WS-181:

#### 1. CohortEngine.ts - Core cohort calculation engine
```typescript
export class CohortEngine {
  async calculateCohortAnalysis(
    config: CohortAnalysisConfig
  ): Promise<CohortAnalysisResult> {
    // Execute complex cohort calculations using optimized SQL queries
    // Process retention, revenue, and LTV metrics by time periods
    // Generate automated insights and recommendations
    // Cache results for performance optimization
  }
  
  async updateCohortBaselines(
    cohortId: string,
    newMetrics: CohortMetrics
  ): Promise<CohortBaseline> {
    // Update cohort performance baselines
    // Recalculate relative performance metrics
    // Trigger automated insight regeneration
  }
  
  private async executeCohortQuery(
    query: CohortSQLQuery,
    parameters: QueryParameters
  ): Promise<CohortRawData> {
    // Execute optimized PostgreSQL cohort queries
    // Handle query performance monitoring
    // Implement query result caching
  }
}
```

#### 2. /api/analytics/cohorts/route.ts - Cohort analysis APIs
```typescript
// GET /api/analytics/cohorts - List cohort analyses
// POST /api/analytics/cohorts/calculate - Trigger new cohort calculation
// PUT /api/analytics/cohorts/{id}/config - Update cohort configuration

interface CohortAnalysisRequest {
  timeRange: number; // months
  metric: 'retention' | 'revenue' | 'ltv';
  segmentation: CohortSegmentation;
  baselineComparison: boolean;
}

interface CohortAnalysisResponse {
  cohortId: string;
  status: 'calculating' | 'completed' | 'failed';
  results?: CohortAnalysisResult;
  insights?: AutomatedInsight[];
  estimatedCompletion?: string;
}
```

#### 3. cohort-cache-manager.ts - Advanced caching optimization
```typescript
export class CohortCacheManager {
  async getCachedCohortResult(
    cohortConfig: CohortAnalysisConfig
  ): Promise<CohortAnalysisResult | null> {
    // Retrieve cached cohort results from Redis
    // Validate cache freshness and data consistency
    // Handle cache warming for popular cohort analyses
  }
  
  async cacheCohortResult(
    config: CohortAnalysisConfig,
    result: CohortAnalysisResult,
    ttl: number
  ): Promise<void> {
    // Store cohort calculation results in optimized cache
    // Implement intelligent cache invalidation strategies
    // Handle cache versioning for cohort configuration changes
  }
  
  private async invalidateCohortCache(
    affectedCohorts: string[]
  ): Promise<void> {
    // Invalidate cache entries affected by data updates
    // Trigger background cache warming for critical cohorts
    // Notify dependent systems of cache invalidation
  }
}
```

#### 4. cohort-insights-generator.ts - Automated business intelligence
```typescript
export class CohortInsightsGenerator {
  async generateAutomatedInsights(
    cohortResults: CohortAnalysisResult[]
  ): Promise<AutomatedInsight[]> {
    // Analyze cohort performance patterns
    // Identify top/bottom performing cohorts and reasons
    // Generate actionable recommendations for retention improvement
    // Detect seasonal trends and anomalies
  }
  
  async predictCohortTrends(
    historicalData: CohortHistoricalData,
    forecastPeriod: number
  ): Promise<CohortTrendPrediction> {
    // Use statistical models to predict cohort performance
    // Factor in wedding industry seasonality
    // Generate confidence intervals for predictions
  }
  
  private async detectPerformanceAnomalies(
    cohortMetrics: CohortMetrics[]
  ): Promise<PerformanceAnomaly[]> {
    // Detect unusual patterns in cohort performance
    // Flag significant deviations from baseline performance
    // Generate alerts for business stakeholders
  }
}
```

## 📋 DATABASE SCHEMA IMPLEMENTATION

### MUST CREATE MIGRATION:
```sql
-- From WS-181 technical specification
CREATE TABLE IF NOT EXISTS cohort_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metric_type TEXT CHECK (metric_type IN ('retention', 'revenue', 'ltv')),
  time_range_months INT,
  segmentation_criteria JSONB,
  baseline_cohort_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohort calculation results with performance metrics
CREATE TABLE IF NOT EXISTS cohort_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_analysis_id UUID REFERENCES cohort_analyses(id),
  cohort_period DATE, -- signup month/period
  period_number INT, -- months since signup
  user_count INT,
  retention_rate DECIMAL(5,4),
  revenue_per_user DECIMAL(10,2),
  lifetime_value DECIMAL(10,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated business insights from cohort analysis
CREATE TABLE IF NOT EXISTS cohort_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_analysis_id UUID REFERENCES cohort_analyses(id),
  insight_type TEXT CHECK (insight_type IN ('performance', 'trend', 'anomaly', 'recommendation')),
  title TEXT NOT NULL,
  description TEXT,
  confidence_score DECIMAL(3,2),
  actionable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cohort_results_analysis_period ON cohort_results(cohort_analysis_id, cohort_period);
CREATE INDEX idx_cohort_insights_analysis_type ON cohort_insights(cohort_analysis_id, insight_type);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/analytics/cohort-engine.ts` - Core calculation engine
- [ ] `/src/lib/analytics/cohort-cache-manager.ts` - Caching optimization
- [ ] `/src/lib/analytics/cohort-insights-generator.ts` - Business intelligence
- [ ] `/src/app/api/analytics/cohorts/route.ts` - Main cohort APIs
- [ ] `/src/app/api/analytics/cohorts/calculate/route.ts` - Calculation endpoint
- [ ] `/src/app/api/analytics/cohorts/insights/route.ts` - Insights API
- [ ] `/supabase/migrations/WS-181-cohort-analysis.sql` - Database schema
- [ ] `/__tests__/lib/analytics/cohort-engine.test.ts` - Comprehensive testing

### MUST IMPLEMENT:
- [ ] Complex PostgreSQL queries for cohort analysis with optimization
- [ ] Multi-metric cohort calculations (retention, revenue, LTV)
- [ ] Advanced Redis caching with intelligent invalidation
- [ ] Automated business intelligence and insights generation
- [ ] Background processing for large cohort calculations
- [ ] Real-time cohort updates with data consistency
- [ ] API rate limiting and authentication for analytics endpoints
- [ ] Comprehensive error handling and logging

## 💾 WHERE TO SAVE YOUR WORK
- Analytics Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/analytics/`
- SQL Queries: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/queries/cohort/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/analytics/`

## 🏁 COMPLETION CHECKLIST
- [ ] Cohort calculation engine implemented with complex SQL optimization
- [ ] Multi-metric cohort analysis functional (retention, revenue, LTV)
- [ ] Advanced caching system deployed with Redis optimization
- [ ] Automated insights generation working with business intelligence
- [ ] Background processing implemented for large datasets
- [ ] Database schema created and migrated successfully  
- [ ] API endpoints secured and performance optimized
- [ ] Comprehensive testing suite completed

**WEDDING CONTEXT REMINDER:** Your cohort analysis engine helps WedSync understand which groups of wedding suppliers (photographers who joined in January vs. June) generate the most revenue and stay active longest. This data guides marketing investment decisions, helps identify successful onboarding periods, and reveals which supplier acquisition channels convert wedding professionals into profitable long-term platform users.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**