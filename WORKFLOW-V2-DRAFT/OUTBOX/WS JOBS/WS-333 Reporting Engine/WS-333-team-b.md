# WS-333 Team B: Backend Reporting Engine Infrastructure

## Team B Development Prompt

### Overview
Build a high-performance, scalable backend reporting engine that processes massive wedding datasets, generates complex reports, and delivers insights to millions of wedding suppliers. This system must handle real-time data aggregation, automated report generation, and enterprise-scale data processing.

### Wedding-Specific User Stories
1. **Photography Studio Chain** with 500 photographers needs automated monthly business reports aggregating 10,000+ weddings with revenue analysis, client satisfaction metrics, and seasonal booking trends
2. **Venue Management Company** requires real-time occupancy reports across 50 venues, processing 200,000 annual events with revenue optimization recommendations and demand forecasting
3. **Enterprise Wedding Platform** needs automated compliance reports for 1,000+ suppliers, processing GDPR data requests, financial audits, and operational metrics within regulatory timeframes
4. **Catering Enterprise** requires inventory and cost analysis reports processing 50,000 meals annually with ingredient tracking, waste analysis, and profit margin optimization
5. **Multi-location Wedding Planner** needs consolidated portfolio reports across 20 offices, aggregating 2,000 annual weddings with performance benchmarking and growth analytics

### Core Technical Requirements

#### TypeScript Interfaces
```typescript
interface ReportingEngineBackend {
  generateReport(request: ReportGenerationRequest): Promise<ReportGenerationResult>;
  scheduleReport(schedule: ReportSchedule): Promise<ScheduledReportId>;
  processDataAggregation(aggregation: DataAggregationRequest): Promise<AggregatedData>;
  optimizeReportQuery(query: ReportQuery): Promise<OptimizedQuery>;
  validateReportData(data: ReportData): Promise<ValidationResult>;
}

interface ReportGenerationRequest {
  reportId: string;
  userId: string;
  organizationId: string;
  reportType: ReportType;
  configuration: ReportConfiguration;
  dataFilters: DataFilters;
  outputFormat: OutputFormat[];
  priority: ProcessingPriority;
  deliveryOptions: DeliveryOptions;
  cacheStrategy: CacheStrategy;
}

interface DataAggregationRequest {
  aggregationId: string;
  dataSource: DataSource[];
  groupBy: string[];
  metrics: MetricDefinition[];
  timeRange: TimeRange;
  filters: FilterCriteria[];
  samplingStrategy?: SamplingStrategy;
}

interface ReportQuery {
  queryId: string;
  baseQuery: string;
  joins: QueryJoin[];
  aggregations: QueryAggregation[];
  filters: QueryFilter[];
  orderBy: QueryOrder[];
  limit?: number;
  offset?: number;
}

interface ReportGenerationResult {
  reportId: string;
  status: GenerationStatus;
  generatedAt: Date;
  processingTime: number;
  dataSize: number;
  outputUrls: ReportOutput[];
  metadata: ReportMetadata;
  cacheInfo: CacheInfo;
}

interface ReportSchedule {
  scheduleId: string;
  reportConfiguration: ReportConfiguration;
  cronExpression: string;
  timezone: string;
  deliveryMethod: DeliveryMethod;
  retryPolicy: RetryPolicy;
  expirationDate?: Date;
}

interface PerformanceMetrics {
  queryExecutionTime: number;
  dataProcessingTime: number;
  reportRenderingTime: number;
  totalGenerationTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
type ProcessingPriority = 'low' | 'normal' | 'high' | 'critical';
type OutputFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'powerpoint';
```

#### High-Performance Data Processing Engine
```typescript
import { Worker } from 'worker_threads';
import { Queue } from 'bull';
import { createConnection } from 'typeorm';

class WeddingReportProcessor {
  private reportQueue: Queue;
  private dataProcessorPool: Worker[];
  private cacheManager: ReportCacheManager;

  constructor() {
    this.reportQueue = new Queue('report processing', {
      redis: { host: 'redis', port: 6379 },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: 'exponential'
      }
    });

    this.initializeWorkerPool();
    this.setupQueueProcessors();
  }

  async generateReport(request: ReportGenerationRequest): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedResult = await this.cacheManager.getCachedReport(request);
      if (cachedResult && this.isCacheValid(cachedResult, request)) {
        return this.enhanceCachedResult(cachedResult);
      }

      // Queue report for processing
      const job = await this.reportQueue.add('generate-report', request, {
        priority: this.getPriorityScore(request.priority),
        delay: this.calculateOptimalDelay(request)
      });

      // Monitor job progress
      const result = await this.monitorJobExecution(job);
      
      // Cache successful results
      if (result.status === 'completed') {
        await this.cacheManager.cacheReport(request, result);
      }

      return {
        ...result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Report generation failed:', error);
      throw new ReportGenerationError('Failed to generate report', error);
    }
  }

  private async processWeddingDataAggregation(request: DataAggregationRequest): Promise<AggregatedData> {
    const connection = await createConnection('reporting');
    const queryBuilder = connection.createQueryBuilder();

    // Build optimized query for wedding data
    const query = queryBuilder
      .select(this.buildSelectClause(request.metrics))
      .from('weddings', 'w')
      .leftJoin('w.supplier', 's')
      .leftJoin('w.client', 'c')
      .leftJoin('w.bookings', 'b')
      .where(this.buildWhereClause(request.filters))
      .groupBy(request.groupBy.join(', '))
      .orderBy('w.wedding_date', 'DESC');

    // Apply time-based partitioning for large datasets
    if (request.timeRange.months > 12) {
      query.addSelect('DATE_TRUNC(\'month\', w.wedding_date) as period');
    }

    const rawData = await query.getRawMany();
    
    // Process aggregations in parallel
    const aggregatedResults = await Promise.all([
      this.calculateRevenueMetrics(rawData),
      this.calculateSatisfactionMetrics(rawData),
      this.calculateSeasonalTrends(rawData),
      this.calculatePerformanceBenchmarks(rawData)
    ]);

    return {
      aggregationId: request.aggregationId,
      processedAt: new Date(),
      totalRecords: rawData.length,
      results: this.mergeAggregationResults(aggregatedResults),
      metadata: {
        queryExecutionTime: performance.now(),
        dataProcessingTime: performance.now(),
        cacheStrategy: request.samplingStrategy
      }
    };
  }
}
```

### Advanced Query Optimization

#### Intelligent Query Builder
```typescript
class WeddingQueryOptimizer {
  async optimizeReportQuery(query: ReportQuery): Promise<OptimizedQuery> {
    const analysis = await this.analyzeQueryComplexity(query);
    
    // Apply wedding-specific optimizations
    const optimizations = [
      this.optimizeWeddingDateFilters(query),
      this.optimizeSupplierJoins(query),
      this.optimizeSeasonalAggregations(query),
      this.optimizeClientMetrics(query)
    ];

    const optimizedQuery = await this.applyOptimizations(query, optimizations);
    
    // Validate optimization effectiveness
    const performancePrediction = await this.predictQueryPerformance(optimizedQuery);
    
    if (performancePrediction.estimatedTime > 10000) { // 10 seconds
      // Apply additional aggressive optimizations
      return this.applyAggressiveOptimizations(optimizedQuery);
    }

    return optimizedQuery;
  }

  private optimizeWeddingDateFilters(query: ReportQuery): QueryOptimization {
    // Wedding dates are frequently queried - optimize with proper indexing strategy
    const dateFilters = query.filters.filter(f => f.field.includes('wedding_date'));
    
    if (dateFilters.length > 0) {
      return {
        type: 'index_hint',
        suggestion: 'USE INDEX (idx_wedding_date_composite)',
        estimatedImprovement: '60%',
        reason: 'Wedding date queries benefit from composite indexing'
      };
    }

    return null;
  }

  private async applySeasonalOptimization(query: ReportQuery): Promise<QueryOptimization[]> {
    // Wedding industry has strong seasonal patterns - optimize accordingly
    const seasonalOptimizations = [];

    // Summer wedding season optimization (May-September)
    if (this.isSeasonalQuery(query)) {
      seasonalOptimizations.push({
        type: 'partition_pruning',
        suggestion: 'Partition by wedding_season',
        estimatedImprovement: '40%'
      });
    }

    // Saturday wedding optimization (80% of weddings)
    if (this.includesWeekendAnalysis(query)) {
      seasonalOptimizations.push({
        type: 'materialized_view',
        suggestion: 'Use saturday_weddings_mv materialized view',
        estimatedImprovement: '70%'
      });
    }

    return seasonalOptimizations;
  }
}
```

### Real-Time Data Processing

#### Stream Processing Engine
```typescript
import { Kafka, Consumer, Producer } from 'kafkajs';

class WeddingDataStreamProcessor {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private realtimeMetrics: Map<string, MetricAccumulator>;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'wedding-reporting-engine',
      brokers: ['kafka:9092']
    });

    this.consumer = this.kafka.consumer({ groupId: 'reporting-group' });
    this.producer = this.kafka.producer();
    this.realtimeMetrics = new Map();
  }

  async startStreamProcessing(): Promise<void> {
    await this.consumer.subscribe({ 
      topics: [
        'wedding-bookings',
        'payment-events', 
        'client-interactions',
        'supplier-activities'
      ]
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        await this.processRealtimeEvent(topic, data);
      }
    });
  }

  private async processRealtimeEvent(topic: string, data: any): Promise<void> {
    switch (topic) {
      case 'wedding-bookings':
        await this.updateBookingMetrics(data);
        break;
      case 'payment-events':
        await this.updateRevenueMetrics(data);
        break;
      case 'client-interactions':
        await this.updateSatisfactionMetrics(data);
        break;
      case 'supplier-activities':
        await this.updatePerformanceMetrics(data);
        break;
    }

    // Trigger real-time report updates if needed
    if (this.shouldTriggerRealtimeUpdate(topic, data)) {
      await this.triggerRealtimeReportUpdate(data);
    }
  }

  private async updateBookingMetrics(bookingData: BookingEvent): Promise<void> {
    const supplierId = bookingData.supplierId;
    const accumulator = this.realtimeMetrics.get(supplierId) || new MetricAccumulator();

    accumulator.addBooking({
      amount: bookingData.amount,
      weddingDate: bookingData.weddingDate,
      bookingDate: new Date(),
      clientType: bookingData.clientType
    });

    this.realtimeMetrics.set(supplierId, accumulator);

    // Publish updated metrics for real-time dashboards
    await this.producer.send({
      topic: 'realtime-metrics-updates',
      messages: [{
        key: supplierId,
        value: JSON.stringify({
          supplierId,
          metrics: accumulator.getCurrentMetrics(),
          timestamp: new Date()
        })
      }]
    });
  }
}
```

### Automated Report Scheduling

#### Cron-Based Report Generator
```typescript
import cron from 'node-cron';
import { ReportScheduler } from './report-scheduler';

class AutomatedReportingSystem {
  private scheduler: ReportScheduler;
  private activeSchedules: Map<string, cron.ScheduledTask>;

  constructor() {
    this.scheduler = new ReportScheduler();
    this.activeSchedules = new Map();
  }

  async scheduleReport(schedule: ReportSchedule): Promise<ScheduledReportId> {
    const scheduleId = schedule.scheduleId;
    
    // Validate cron expression
    if (!cron.validate(schedule.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Create scheduled task
    const task = cron.schedule(schedule.cronExpression, async () => {
      try {
        await this.executeScheduledReport(schedule);
      } catch (error) {
        console.error(`Scheduled report ${scheduleId} failed:`, error);
        await this.handleScheduledReportFailure(schedule, error);
      }
    }, {
      scheduled: false,
      timezone: schedule.timezone
    });

    this.activeSchedules.set(scheduleId, task);
    task.start();

    // Store schedule in database
    await this.persistSchedule(schedule);

    return scheduleId;
  }

  private async executeScheduledReport(schedule: ReportSchedule): Promise<void> {
    const reportRequest: ReportGenerationRequest = {
      reportId: `scheduled-${schedule.scheduleId}-${Date.now()}`,
      userId: schedule.reportConfiguration.userId,
      organizationId: schedule.reportConfiguration.organizationId,
      reportType: schedule.reportConfiguration.reportType,
      configuration: schedule.reportConfiguration,
      dataFilters: this.generateCurrentFilters(schedule.reportConfiguration.dataFilters),
      outputFormat: schedule.reportConfiguration.outputFormat,
      priority: 'normal',
      deliveryOptions: {
        method: schedule.deliveryMethod,
        recipients: schedule.reportConfiguration.recipients,
        autoArchive: true
      },
      cacheStrategy: 'skip' // Always generate fresh data for scheduled reports
    };

    const result = await this.scheduler.generateReport(reportRequest);
    
    if (result.status === 'completed') {
      await this.deliverScheduledReport(schedule, result);
      await this.logScheduledReportSuccess(schedule, result);
    } else {
      throw new Error(`Report generation failed: ${result.status}`);
    }
  }

  private async deliverScheduledReport(schedule: ReportSchedule, result: ReportGenerationResult): Promise<void> {
    switch (schedule.deliveryMethod.type) {
      case 'email':
        await this.emailReportDelivery(schedule, result);
        break;
      case 'webhook':
        await this.webhookReportDelivery(schedule, result);
        break;
      case 'sftp':
        await this.sftpReportDelivery(schedule, result);
        break;
      case 'api':
        await this.apiReportDelivery(schedule, result);
        break;
      default:
        throw new Error(`Unsupported delivery method: ${schedule.deliveryMethod.type}`);
    }
  }
}
```

### Caching Strategy

#### Multi-Level Report Caching
```typescript
class ReportCacheManager {
  private redisClient: Redis;
  private memoryCache: LRUCache<string, ReportResult>;
  private diskCache: DiskCacheManager;

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL);
    this.memoryCache = new LRUCache({ max: 1000, ttl: 5 * 60 * 1000 }); // 5 minutes
    this.diskCache = new DiskCacheManager('./cache/reports');
  }

  async getCachedReport(request: ReportGenerationRequest): Promise<ReportGenerationResult | null> {
    const cacheKey = this.generateCacheKey(request);
    
    // Level 1: Memory cache (fastest)
    let cached = this.memoryCache.get(cacheKey);
    if (cached && this.isCacheValid(cached, request)) {
      this.updateCacheStats('memory', 'hit');
      return cached;
    }

    // Level 2: Redis cache (fast)
    const redisCached = await this.redisClient.get(cacheKey);
    if (redisCached) {
      cached = JSON.parse(redisCached);
      if (this.isCacheValid(cached, request)) {
        this.memoryCache.set(cacheKey, cached); // Promote to memory cache
        this.updateCacheStats('redis', 'hit');
        return cached;
      }
    }

    // Level 3: Disk cache (slower but persistent)
    cached = await this.diskCache.get(cacheKey);
    if (cached && this.isCacheValid(cached, request)) {
      this.memoryCache.set(cacheKey, cached);
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(cached));
      this.updateCacheStats('disk', 'hit');
      return cached;
    }

    this.updateCacheStats('all', 'miss');
    return null;
  }

  async cacheReport(request: ReportGenerationRequest, result: ReportGenerationResult): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.calculateTTL(request);

    // Cache at all levels
    this.memoryCache.set(cacheKey, result);
    await this.redisClient.setex(cacheKey, ttl, JSON.stringify(result));
    await this.diskCache.set(cacheKey, result, ttl);
  }

  private generateCacheKey(request: ReportGenerationRequest): string {
    const keyComponents = [
      request.reportType,
      request.organizationId,
      JSON.stringify(request.dataFilters),
      JSON.stringify(request.configuration)
    ];
    
    return crypto
      .createHash('sha256')
      .update(keyComponents.join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  private calculateTTL(request: ReportGenerationRequest): number {
    // Wedding data changes less frequently than other business data
    switch (request.reportType) {
      case 'financial':
        return 1800; // 30 minutes - financial data changes frequently
      case 'operational':
        return 3600; // 1 hour - operational metrics moderate changes
      case 'seasonal_analysis':
        return 86400; // 24 hours - seasonal data changes slowly
      case 'wedding_portfolio':
        return 43200; // 12 hours - portfolio data changes moderately
      default:
        return 3600; // Default 1 hour
    }
  }
}
```

### Database Performance Optimization

#### Query Performance Monitoring
```typescript
class ReportingDatabaseManager {
  private connection: DataSource;
  private performanceMonitor: QueryPerformanceMonitor;

  async executeOptimizedQuery(query: ReportQuery): Promise<QueryResult> {
    const startTime = performance.now();
    
    try {
      // Pre-execution optimization
      const optimizedQuery = await this.optimizeQuery(query);
      
      // Execute with performance monitoring
      const result = await this.connection.query(
        optimizedQuery.sql,
        optimizedQuery.parameters
      );
      
      const executionTime = performance.now() - startTime;
      
      // Log performance metrics
      await this.performanceMonitor.recordQueryPerformance({
        queryId: query.queryId,
        executionTime,
        resultSize: result.length,
        cacheHit: optimizedQuery.cacheHit,
        indexesUsed: optimizedQuery.indexesUsed
      });

      // Alert on slow queries
      if (executionTime > 5000) { // 5 seconds
        await this.alertSlowQuery(query, executionTime);
      }

      return result;

    } catch (error) {
      await this.handleQueryError(query, error);
      throw error;
    }
  }

  private async optimizeQuery(query: ReportQuery): Promise<OptimizedQuery> {
    // Wedding-specific query optimizations
    const optimizations = [];

    // 1. Wedding date range optimization
    if (this.hasDateRangeFilter(query)) {
      optimizations.push(this.optimizeDateRange(query));
    }

    // 2. Supplier performance optimization
    if (this.hasSupplierMetrics(query)) {
      optimizations.push(this.optimizeSupplierJoins(query));
    }

    // 3. Seasonal pattern optimization
    if (this.hasSeasonalAnalysis(query)) {
      optimizations.push(this.optimizeSeasonalQueries(query));
    }

    return this.applyOptimizations(query, optimizations);
  }

  async createReportingIndexes(): Promise<void> {
    // Wedding-specific indexes for optimal report performance
    const indexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weddings_date_supplier ON weddings (wedding_date, supplier_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weddings_season ON weddings (EXTRACT(month FROM wedding_date))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_amount_date ON bookings (amount, created_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_satisfaction ON client_feedback (rating, created_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance ON supplier_metrics (supplier_id, metric_date)'
    ];

    for (const indexSql of indexes) {
      try {
        await this.connection.query(indexSql);
        console.log(`Created index: ${indexSql}`);
      } catch (error) {
        console.error(`Failed to create index: ${indexSql}`, error);
      }
    }
  }
}
```

### Evidence of Reality Requirements

#### File Structure Evidence
```
src/
├── services/
│   ├── reporting/
│   │   ├── ReportingEngineBackend.ts ✓
│   │   ├── WeddingReportProcessor.ts ✓
│   │   ├── ReportScheduler.ts ✓
│   │   ├── WeddingQueryOptimizer.ts ✓
│   │   └── ReportCacheManager.ts ✓
├── lib/
│   ├── database/
│   │   ├── ReportingDatabaseManager.ts ✓
│   │   └── QueryPerformanceMonitor.ts ✓
│   ├── streaming/
│   │   └── WeddingDataStreamProcessor.ts ✓
│   └── scheduling/
│       └── AutomatedReportingSystem.ts ✓
├── workers/
│   ├── report-generation-worker.ts ✓
│   └── data-aggregation-worker.ts ✓
└── types/
    ├── reporting-backend.ts ✓
    └── query-optimization.ts ✓
```

#### Performance Benchmarks
```bash
# Query performance tests
npm run test:query-performance
✓ Simple wedding queries <100ms
✓ Complex aggregation queries <2s
✓ Large dataset queries (1M+ records) <10s
✓ Real-time stream processing <50ms latency

# Load testing results
npm run test:load-reporting
✓ 1000 concurrent report generations handled
✓ Memory usage <2GB under full load
✓ 99.9% uptime during peak wedding season
✓ Cache hit ratio >85% for common reports
```

#### Wedding Context Testing
```typescript
describe('WeddingReportingBackend', () => {
  it('processes large wedding datasets efficiently', async () => {
    const request = createLargeDatasetRequest(100000); // 100k weddings
    const result = await reportProcessor.generateReport(request);
    expect(result.processingTime).toBeLessThan(10000);
    expect(result.status).toBe('completed');
  });

  it('handles seasonal wedding reporting peaks', async () => {
    const summerReports = await generateSeasonalReports('summer');
    expect(summerReports.every(r => r.processingTime < 5000)).toBe(true);
  });

  it('optimizes weekend wedding queries', async () => {
    const weekendQuery = createWeekendWeddingQuery();
    const optimized = await queryOptimizer.optimizeReportQuery(weekendQuery);
    expect(optimized.estimatedImprovement).toBeGreaterThan(50);
  });
});
```

### Performance Targets
- **Query Execution**: Simple queries <100ms, Complex aggregations <2s
- **Report Generation**: Standard reports <3s, Enterprise reports <10s
- **Data Processing**: 1M records processed <30s
- **Cache Performance**: >85% hit ratio for common report patterns
- **Concurrent Processing**: 1000+ simultaneous report generations
- **Memory Efficiency**: <2GB RAM usage under peak load
- **Stream Processing**: <50ms real-time event processing latency

### Security & Compliance
- Row-level security for all report data queries
- Encrypted data processing and temporary storage
- Audit logging for all report generation activities
- GDPR-compliant data retention and deletion
- Role-based access control for report configurations
- Secure API endpoints with rate limiting and authentication

### Business Success Metrics
- Report generation success rate >99.5%
- Average processing time reduction >60% vs previous system
- Cache effectiveness >85% hit ratio
- Real-time data accuracy >99.9%
- System uptime >99.95% during wedding seasons
- Concurrent user support scaled to 10,000+ active reporters

This comprehensive backend reporting engine will power the enterprise-scale wedding reporting system, processing millions of data points while maintaining the performance and reliability needed for the wedding industry's mission-critical operations.