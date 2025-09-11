# TEAM B - ROUND 1: WS-332 - Analytics Dashboard
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive Analytics Dashboard backend infrastructure with real-time data processing, advanced analytics engines, and wedding business intelligence APIs for WedSync platform
**FEATURE ID:** WS-332 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about data processing performance when wedding professionals need instant insights during peak season

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/analytics/
cat $WS_ROOT/wedsync/src/lib/analytics/analytics-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test analytics-backend
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**ANALYTICS BACKEND ARCHITECTURE:**
- **Real-Time Analytics Engine**: High-performance data processing with sub-second latency
- **Wedding Business Intelligence**: Industry-specific metrics calculation and trend analysis
- **Data Aggregation Pipeline**: Efficient data processing for large-scale wedding operations
- **Predictive Analytics Service**: ML-powered forecasting for booking and revenue predictions
- **Performance Optimization**: Caching strategies and database optimization for analytics queries
- **Scalable Data Architecture**: Distributed processing for enterprise-scale analytics

## 📊 ANALYTICS BACKEND SPECIFICATIONS

### CORE BACKEND SERVICES TO BUILD:

**1. High-Performance Analytics Engine**
```typescript
// Create: src/lib/analytics/analytics-engine.ts
interface AnalyticsEngine {
  processRealTimeData(dataStream: DataStream): Promise<ProcessedAnalytics>;
  calculateMetrics(metricsRequest: MetricsCalculationRequest): Promise<CalculatedMetrics>;
  generateInsights(dataContext: AnalyticsContext): Promise<BusinessInsights>;
  optimizeQuery(query: AnalyticsQuery): Promise<OptimizedQuery>;
  cacheResults(cacheRequest: CacheRequest): Promise<CacheResult>;
}

interface DataStream {
  streamId: string;
  dataType: 'user_interaction' | 'booking_event' | 'financial_transaction' | 'communication_event' | 'system_metric';
  data: any[];
  timestamp: Date;
  sourceSystem: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  processingRequirements: ProcessingRequirement[];
}

interface MetricsCalculationRequest {
  vendorId: string;
  timeframe: AnalyticsTimeframe;
  metrics: MetricDefinition[];
  filters: AnalyticsFilter[];
  groupBy?: string[];
  aggregations: AggregationFunction[];
  compareWith?: ComparisonPeriod;
}

interface CalculatedMetrics {
  requestId: string;
  calculationTime: number; // milliseconds
  results: MetricResult[];
  dataQuality: DataQualityScore;
  cacheInfo: CacheInfo;
  nextUpdateTime: Date;
}

interface ProcessedAnalytics {
  processedAt: Date;
  dataPoints: number;
  processingTime: number;
  qualityScore: number; // 0-1
  anomaliesDetected: Anomaly[];
  trends: TrendData[];
  alerts: AnalyticsAlert[];
}

// Analytics engine features:
// - Real-time stream processing with Apache Kafka integration
// - Distributed computation using Redis clustering
// - Advanced caching with intelligent cache invalidation
// - Anomaly detection using statistical analysis
// - Performance optimization with query plan analysis
```

**2. Wedding Business Intelligence Service**
```typescript
// Create: src/lib/analytics/wedding-business-intelligence.ts
interface WeddingBusinessIntelligence {
  calculateWeddingMetrics(vendorId: string, timeframe: TimeRange): Promise<WeddingMetrics>;
  analyzeSeasonalPatterns(vendorId: string, years: number): Promise<SeasonalAnalysis>;
  generateMarketInsights(marketSegment: MarketSegment): Promise<MarketInsights>;
  predictBookingTrends(vendorId: string, forecastPeriod: number): Promise<BookingForecast>;
  benchmarkPerformance(vendorId: string, competitors: string[]): Promise<BenchmarkAnalysis>;
}

interface WeddingMetrics {
  vendorId: string;
  timeframe: TimeRange;
  financialMetrics: FinancialMetrics;
  operationalMetrics: OperationalMetrics;
  customerMetrics: CustomerMetrics;
  marketMetrics: MarketMetrics;
  weddingSpecificMetrics: WeddingSpecificMetrics;
}

interface WeddingSpecificMetrics {
  averageWeddingValue: number;
  weddingsByStyle: WeddingStyleMetric[];
  weddingsBySize: WeddingSizeMetric[];
  seasonalBookingDistribution: SeasonalDistribution;
  venueTypeBreakdown: VenueTypeMetric[];
  averageBookingLeadTime: number; // days
  repeatClientRate: number; // percentage
  referralRate: number;
}

interface SeasonalAnalysis {
  peakSeasons: PeakSeason[];
  lowSeasons: LowSeason[];
  seasonalMultipliers: SeasonalMultiplier[];
  bookingPatterns: BookingPattern[];
  revenueDistribution: RevenueDistribution[];
  capacityUtilization: CapacityUtilization[];
}

interface BookingForecast {
  forecastPeriod: number; // months
  predictedBookings: PredictedBooking[];
  revenueProjection: RevenueProjection;
  confidenceIntervals: ConfidenceInterval[];
  modelAccuracy: ModelAccuracy;
  factorsInfluencing: ForecastFactor[];
}

interface BenchmarkAnalysis {
  vendorPosition: MarketPosition;
  competitiveMetrics: CompetitiveMetric[];
  performanceGaps: PerformanceGap[];
  opportunityAreas: OpportunityArea[];
  recommendedActions: RecommendedAction[];
}

// Wedding BI features:
// - Industry-specific metric calculations for wedding businesses
// - Seasonal trend analysis with weather and holiday correlations
// - Wedding style and size analysis for market positioning
// - Booking lead time optimization recommendations
// - Competitive benchmarking against similar vendors
```

**3. Real-Time Data Processing Pipeline**
```typescript
// Create: src/lib/analytics/data-processing-pipeline.ts
interface DataProcessingPipeline {
  ingestData(dataPayload: DataPayload): Promise<IngestionResult>;
  transformData(rawData: RawData, transformations: DataTransformation[]): Promise<TransformedData>;
  aggregateData(timeSeriesData: TimeSeriesData, aggregationRules: AggregationRule[]): Promise<AggregatedData>;
  detectAnomalies(dataSet: DataSet): Promise<AnomalyDetectionResult>;
  updateRealTimeMetrics(metricsUpdate: MetricsUpdate): Promise<UpdateResult>;
}

interface DataPayload {
  sourceId: string;
  dataType: DataType;
  payload: any;
  timestamp: Date;
  metadata: DataMetadata;
  validationRules: ValidationRule[];
}

interface DataTransformation {
  transformationType: 'filter' | 'aggregate' | 'join' | 'calculate' | 'normalize';
  parameters: TransformationParameters;
  outputSchema: OutputSchema;
  validationRules: ValidationRule[];
}

interface AggregationRule {
  timeWindow: TimeWindow;
  groupByFields: string[];
  aggregationFunctions: AggregationFunction[];
  filterConditions: FilterCondition[];
  outputFields: OutputField[];
}

interface AnomalyDetectionResult {
  anomaliesFound: Anomaly[];
  confidenceScores: ConfidenceScore[];
  impactAnalysis: ImpactAnalysis;
  recommendedActions: AnomalyAction[];
  alertsGenerated: Alert[];
}

interface MetricsUpdate {
  vendorId: string;
  metrics: MetricUpdate[];
  updateType: 'increment' | 'decrement' | 'set' | 'calculate';
  timestamp: Date;
  priority: UpdatePriority;
}

// Data processing features:
// - High-throughput data ingestion with validation
// - Stream processing with Apache Kafka/Redis Streams
// - Real-time aggregation with sliding time windows
// - Machine learning-based anomaly detection
// - Event-driven architecture with pub/sub messaging
```

**4. Predictive Analytics & Machine Learning Service**
```typescript
// Create: src/lib/analytics/predictive-analytics.ts
interface PredictiveAnalyticsService {
  trainPredictionModel(trainingData: TrainingDataSet, modelConfig: ModelConfiguration): Promise<TrainedModel>;
  generatePredictions(modelId: string, inputData: PredictionInput): Promise<PredictionResult>;
  evaluateModelAccuracy(modelId: string, testData: TestDataSet): Promise<ModelEvaluation>;
  updateModelWithNewData(modelId: string, newData: TrainingDataSet): Promise<ModelUpdateResult>;
  recommendOptimalActions(vendorId: string, context: BusinessContext): Promise<ActionRecommendations>;
}

interface ModelConfiguration {
  modelType: 'linear_regression' | 'random_forest' | 'neural_network' | 'time_series' | 'ensemble';
  features: FeatureDefinition[];
  hyperparameters: Hyperparameter[];
  validationStrategy: ValidationStrategy;
  trainingParameters: TrainingParameters;
}

interface PredictionResult {
  predictions: Prediction[];
  confidenceIntervals: ConfidenceInterval[];
  featureImportance: FeatureImportance[];
  modelVersion: string;
  predictionTimestamp: Date;
  businessImpact: BusinessImpact;
}

interface Prediction {
  target: string; // 'revenue', 'bookings', 'satisfaction', etc.
  predictedValue: number;
  confidenceLevel: number; // 0-1
  timeHorizon: number; // days/months
  influencingFactors: InfluencingFactor[];
}

interface ActionRecommendations {
  vendorId: string;
  context: BusinessContext;
  recommendations: Recommendation[];
  expectedImpact: ExpectedImpact[];
  implementationComplexity: ComplexityScore[];
  priorityRanking: PriorityRanking[];
}

interface Recommendation {
  actionType: 'pricing_optimization' | 'marketing_focus' | 'service_expansion' | 'capacity_adjustment' | 'quality_improvement';
  description: string;
  expectedOutcome: ExpectedOutcome;
  requiredResources: RequiredResource[];
  timeline: ImplementationTimeline;
  riskFactors: RiskFactor[];
}

// Predictive analytics features:
// - Machine learning models for revenue and booking forecasting
// - Feature engineering for wedding industry variables
// - Model ensemble techniques for improved accuracy
// - Automated model retraining with new data
// - Business-focused recommendation engine
```

**5. High-Performance Database Optimization**
```typescript
// Create: src/lib/analytics/database-optimization.ts
interface DatabaseOptimizer {
  optimizeAnalyticsQueries(queries: AnalyticsQuery[]): Promise<QueryOptimizationResult>;
  createMaterializedViews(viewDefinitions: ViewDefinition[]): Promise<MaterializedViewResult>;
  manageDataPartitioning(partitionStrategy: PartitionStrategy): Promise<PartitioningResult>;
  implementCachingStrategy(cachingRules: CachingRule[]): Promise<CachingImplementationResult>;
  monitorQueryPerformance(timeframe: TimeRange): Promise<PerformanceReport>;
}

interface QueryOptimizationResult {
  originalQuery: AnalyticsQuery;
  optimizedQuery: AnalyticsQuery;
  performanceImprovement: PerformanceImprovement;
  indexRecommendations: IndexRecommendation[];
  executionPlan: ExecutionPlan;
}

interface ViewDefinition {
  viewName: string;
  sourceTables: string[];
  aggregationLogic: AggregationLogic;
  refreshStrategy: 'real_time' | 'scheduled' | 'on_demand';
  indexStrategy: IndexStrategy;
  retentionPolicy: RetentionPolicy;
}

interface PartitionStrategy {
  tableName: string;
  partitionType: 'range' | 'hash' | 'list';
  partitionColumn: string;
  partitionInterval: string; // 'daily', 'weekly', 'monthly'
  retentionPeriod: number; // days
  compressionEnabled: boolean;
}

interface CachingRule {
  queryPattern: string;
  ttl: number; // seconds
  invalidationTriggers: InvalidationTrigger[];
  cacheWarmingStrategy: WarmingStrategy;
  compressionEnabled: boolean;
}

interface PerformanceReport {
  timeframe: TimeRange;
  queryMetrics: QueryMetric[];
  slowQueries: SlowQuery[];
  resourceUtilization: ResourceUtilization;
  optimizationOpportunities: OptimizationOpportunity[];
}

// Database optimization features:
// - Automated query optimization with execution plan analysis
// - Intelligent materialized view creation and maintenance
// - Time-based data partitioning for historical analytics
// - Multi-layer caching strategy (Redis, CDN, application-level)
// - Continuous performance monitoring and alerting
```

**6. Analytics API Gateway**
```typescript
// Create: src/lib/analytics/analytics-api-gateway.ts
interface AnalyticsAPIGateway {
  routeAnalyticsRequest(request: AnalyticsAPIRequest): Promise<AnalyticsAPIResponse>;
  authenticateAnalyticsAccess(credentials: AnalyticsCredentials): Promise<AuthenticationResult>;
  enforceRateLimit(userId: string, endpoint: string): Promise<RateLimitResult>;
  logAnalyticsUsage(usageData: AnalyticsUsageData): Promise<void>;
  aggregateAPIMetrics(): Promise<APIMetricsReport>;
}

interface AnalyticsAPIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters: AnalyticsParameters;
  headers: RequestHeaders;
  userId: string;
  requestId: string;
  timestamp: Date;
}

interface AnalyticsParameters {
  vendorId?: string;
  timeframe: TimeRange;
  metrics: string[];
  filters?: AnalyticsFilter[];
  groupBy?: string[];
  format: 'json' | 'csv' | 'excel' | 'chart_data';
  realTime?: boolean;
}

interface AnalyticsAPIResponse {
  requestId: string;
  data: any;
  metadata: ResponseMetadata;
  executionTime: number;
  cacheHit: boolean;
  nextUpdateTime?: Date;
  dataQuality: DataQualityScore;
}

interface ResponseMetadata {
  totalRecords: number;
  processedRecords: number;
  dataFreshness: number; // minutes since last update
  queryComplexity: 'low' | 'medium' | 'high';
  resourceUsage: ResourceUsageInfo;
}

// API Gateway features:
// - High-performance API routing with load balancing
// - Comprehensive authentication and authorization
// - Intelligent rate limiting with burst capacity
// - Real-time API usage monitoring and analytics
// - Response optimization and compression
```

**7. Real-Time WebSocket Analytics Service**
```typescript
// Create: src/lib/analytics/realtime-websocket-service.ts
interface RealtimeWebSocketService {
  establishConnection(clientId: string, subscriptions: AnalyticsSubscription[]): Promise<WebSocketConnection>;
  broadcastAnalyticsUpdate(update: AnalyticsUpdate): Promise<BroadcastResult>;
  manageSubscriptions(connectionId: string, action: SubscriptionAction): Promise<SubscriptionResult>;
  monitorConnectionHealth(): Promise<ConnectionHealthReport>;
  optimizeDataTransmission(data: any, connectionSpeed: ConnectionSpeed): Promise<OptimizedData>;
}

interface AnalyticsSubscription {
  subscriptionId: string;
  vendorId: string;
  dataTypes: DataType[];
  updateFrequency: UpdateFrequency;
  filters: SubscriptionFilter[];
  compressionEnabled: boolean;
}

interface AnalyticsUpdate {
  subscriptionId: string;
  updateType: 'metric_change' | 'new_data' | 'alert' | 'insight' | 'forecast_update';
  data: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface WebSocketConnection {
  connectionId: string;
  clientId: string;
  subscriptions: AnalyticsSubscription[];
  connectionSpeed: ConnectionSpeed;
  lastActivity: Date;
  compressionSupported: boolean;
}

interface BroadcastResult {
  messagesSent: number;
  failedDeliveries: number;
  averageLatency: number;
  compressionRatio: number;
  bandwidthUsed: number; // bytes
}

interface ConnectionHealthReport {
  totalConnections: number;
  activeConnections: number;
  averageLatency: number;
  dataTransmissionRate: number; // MB/s
  errorRate: number;
  connectionIssues: ConnectionIssue[];
}

// WebSocket service features:
// - High-performance WebSocket connections with clustering
// - Intelligent data compression and transmission optimization
// - Connection pooling and load balancing
// - Automatic reconnection and error handling
// - Real-time latency monitoring and optimization
```

## 🎯 ANALYTICS API ENDPOINTS

### Core Analytics API Routes
```typescript
// Create: src/app/api/analytics/metrics/route.ts
export async function POST(request: Request) {
  const { vendorId, timeframe, metrics } = await request.json();
  
  const analyticsEngine = new AnalyticsEngine();
  const results = await analyticsEngine.calculateMetrics({
    vendorId,
    timeframe,
    metrics: metrics.map(m => ({ name: m, type: 'calculated' })),
    filters: [],
    aggregations: ['sum', 'average', 'count']
  });
  
  return Response.json({
    requestId: results.requestId,
    data: results.results,
    executionTime: results.calculationTime,
    cacheHit: results.cacheInfo.hit,
    dataQuality: results.dataQuality
  });
}

// Create: src/app/api/analytics/realtime/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');
  
  const realtimeService = new RealtimeWebSocketService();
  // Establish WebSocket upgrade logic here
  
  return new Response('WebSocket upgrade required', {
    status: 426,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    }
  });
}
```

### Wedding-Specific Analytics API
```typescript
// Create: src/app/api/analytics/wedding-insights/route.ts
export async function POST(request: Request) {
  const { vendorId, analysisType } = await request.json();
  
  const weddingBI = new WeddingBusinessIntelligence();
  
  switch (analysisType) {
    case 'seasonal':
      const seasonalData = await weddingBI.analyzeSeasonalPatterns(vendorId, 3);
      return Response.json(seasonalData);
      
    case 'forecast':
      const forecast = await weddingBI.predictBookingTrends(vendorId, 12);
      return Response.json(forecast);
      
    case 'benchmark':
      const competitors = await getCompetitorVendors(vendorId);
      const benchmark = await weddingBI.benchmarkPerformance(vendorId, competitors);
      return Response.json(benchmark);
      
    default:
      return Response.json({ error: 'Invalid analysis type' }, { status: 400 });
  }
}
```

## 🎯 DATABASE SCHEMA FOR ANALYTICS

```sql
-- Analytics-specific tables
CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES user_profiles(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,4) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    time_period TIMESTAMPTZ NOT NULL,
    aggregation_level VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES user_profiles(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    dashboard_name VARCHAR(255) NOT NULL,
    dashboard_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    shared_with TEXT[], -- User IDs who have access
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES user_profiles(id),
    alert_type VARCHAR(100) NOT NULL,
    alert_condition JSONB NOT NULL,
    notification_channels JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materialized views for performance
CREATE MATERIALIZED VIEW mv_vendor_daily_metrics AS
SELECT 
    vendor_id,
    DATE(time_period) as metric_date,
    metric_name,
    SUM(metric_value) as daily_value,
    COUNT(*) as data_points
FROM analytics_metrics
WHERE aggregation_level = 'hourly'
GROUP BY vendor_id, DATE(time_period), metric_name;

-- Indexes for performance
CREATE INDEX idx_analytics_metrics_vendor_time ON analytics_metrics(vendor_id, time_period DESC);
CREATE INDEX idx_analytics_metrics_name_time ON analytics_metrics(metric_name, time_period DESC);
CREATE INDEX idx_analytics_events_vendor_type ON analytics_events(vendor_id, event_type, timestamp DESC);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE (File existence will be verified):
- [ ] `src/lib/analytics/analytics-engine.ts` - High-performance analytics engine
- [ ] `src/lib/analytics/wedding-business-intelligence.ts` - Wedding-specific BI service
- [ ] `src/lib/analytics/data-processing-pipeline.ts` - Real-time data processing
- [ ] `src/lib/analytics/predictive-analytics.ts` - ML-powered predictions
- [ ] `src/lib/analytics/database-optimization.ts` - Database performance optimization
- [ ] `src/lib/analytics/analytics-api-gateway.ts` - Analytics API gateway
- [ ] `src/lib/analytics/realtime-websocket-service.ts` - Real-time WebSocket service
- [ ] `src/app/api/analytics/metrics/route.ts` - Core metrics API endpoint
- [ ] `src/app/api/analytics/realtime/route.ts` - Real-time analytics API
- [ ] `src/app/api/analytics/wedding-insights/route.ts` - Wedding-specific insights API
- [ ] Database migrations for analytics tables and views
- [ ] Tests for all analytics backend services

### WEDDING CONTEXT USER STORIES:
1. **"As a wedding photographer"** - My revenue analytics update in real-time as I book new weddings
2. **"As a wedding planner"** - I can get predictive insights about my busiest months ahead
3. **"As a venue manager"** - My performance benchmarks help me understand my market position
4. **"As a florist"** - I can see which wedding styles are trending and adjust my services

## 💾 WHERE TO SAVE YOUR WORK
- Analytics Backend: `$WS_ROOT/wedsync/src/lib/analytics/`
- API Endpoints: `$WS_ROOT/wedsync/src/app/api/analytics/`
- Database Migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/src/__tests__/analytics/`

## 🏁 COMPLETION CHECKLIST
- [ ] All analytics backend services created and functional
- [ ] TypeScript compilation successful
- [ ] Analytics engine processes queries in <200ms for standard requests
- [ ] Real-time data pipeline handles 10,000+ events per second
- [ ] Predictive analytics models achieve >85% accuracy
- [ ] Database optimization reduces query times by >60%
- [ ] WebSocket service supports 5,000+ concurrent connections
- [ ] Wedding BI service provides industry-specific insights
- [ ] All analytics backend tests passing (>95% coverage)

## 🎯 SUCCESS METRICS
- Analytics query response time <200ms for 95% of requests
- Real-time data processing latency <100ms end-to-end
- Prediction model accuracy >85% for booking forecasts
- WebSocket connection capacity >5,000 concurrent users
- Database query optimization improvement >60%
- API throughput >10,000 requests per minute
- Data processing pipeline uptime >99.9%

---

**EXECUTE IMMEDIATELY - This is comprehensive Analytics Dashboard backend infrastructure for enterprise wedding business intelligence platform!**