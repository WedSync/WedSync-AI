# TEAM D - ROUND 1: WS-343 - CRM Integration Hub Performance & Infrastructure
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the high-performance infrastructure for CRM integration, including background job processing, caching layers, mobile optimization, and scalability systems
**FEATURE ID:** WS-343 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about handling thousands of client records efficiently while maintaining sub-second response times for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/services/performance/
cat $WS_ROOT/wedsync/src/services/CRMSyncJobProcessor.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **PERFORMANCE TEST RESULTS:**
```bash
npm run test:performance crm-integration
# MUST show: "All performance benchmarks passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing performance and infrastructure patterns
await mcp__serena__search_for_pattern("JobProcessor|Queue|Cache|Performance|Background");
await mcp__serena__find_symbol("BackgroundJob", "", true);
await mcp__serena__get_symbols_overview("src/services/jobs/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load performance optimization and infrastructure documentation
mcp__Ref__ref_search_documentation("Node.js background job processing Bull Redis queues");
mcp__Ref__ref_search_documentation("Supabase database performance optimization indexing");
mcp__Ref__ref_search_documentation("Next.js performance optimization caching strategies");
mcp__Ref__ref_search_documentation("mobile optimization PWA performance metrics");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "The CRM Integration Hub needs to handle massive data imports (500+ clients in <5 minutes), concurrent sync jobs for multiple suppliers, real-time progress updates, and mobile-responsive interfaces. I need a robust background job processing system, intelligent caching layers, database optimization, and mobile-first performance optimizations.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down performance and infrastructure components
2. **performance-optimization-expert** - Design caching and optimization strategies
3. **security-compliance-officer** - Secure background job processing
4. **code-quality-guardian** - Performance monitoring standards
5. **test-automation-architect** - Performance testing and benchmarking
6. **documentation-chronicler** - Document performance architecture

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INFRASTRUCTURE SECURITY CHECKLIST:
- [ ] **Job queue security** - Encrypt sensitive data in job payloads
- [ ] **Cache security** - No sensitive data in Redis/memory caches
- [ ] **Database connection security** - Connection pooling with encrypted connections
- [ ] **Background job isolation** - Jobs run in separate security contexts
- [ ] **Resource limits** - CPU, memory, and time limits on all jobs
- [ ] **Error handling security** - No sensitive data in error logs
- [ ] **Monitoring security** - Secure metrics collection and alerting
- [ ] **Rate limiting enforcement** - Protect against resource exhaustion

## 🎯 TEAM D SPECIALIZATION: PERFORMANCE/INFRASTRUCTURE FOCUS

**PERFORMANCE/INFRASTRUCTURE REQUIREMENTS:**
- Mobile-first design principles with <3s load times
- PWA functionality for offline capability
- WedMe platform features optimization
- Cross-platform compatibility testing
- Mobile performance optimization (<200ms response)
- Background job processing at scale

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Context
**Performance Challenge:** During wedding season (May-October), 500+ photographers simultaneously import their client bases. Peak load: 50,000 clients being processed per hour across 100 concurrent sync jobs. Mobile suppliers need real-time progress updates while on-location at venues with poor signal.

**Critical Requirements:**
- Import 500+ clients in <5 minutes
- Handle 10+ concurrent sync jobs per supplier
- Sub-second response times for mobile interfaces
- 99.9% uptime during wedding season
- Graceful degradation during peak loads

### Background Job Processing System

#### 1. CRM Sync Job Processor
```typescript
// File: src/services/CRMSyncJobProcessor.ts
import { createClient } from '@supabase/supabase-js';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import type { CRMSyncJob, CRMIntegration } from '@/types/crm';

export class CRMSyncJobProcessor {
  private redis: Redis;
  private syncQueue: Queue;
  private worker: Worker;
  private supabase;
  private progressCache: Map<string, number> = new Map();

  constructor() {
    // Redis connection with clustering support
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // High-performance job queue
    this.syncQueue = new Queue('crm-sync', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    // Background worker with concurrency
    this.worker = new Worker('crm-sync', this.processSyncJob.bind(this), {
      connection: this.redis,
      concurrency: 10, // Process up to 10 jobs concurrently
      limiter: {
        max: 100, // Maximum 100 jobs per period
        duration: 60000 // 1 minute period
      }
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.setupWorkerEventHandlers();
  }

  async queueSyncJob(syncJob: CRMSyncJob): Promise<void> {
    await this.syncQueue.add(
      `sync-${syncJob.job_type}`,
      {
        syncJobId: syncJob.id,
        integrationId: syncJob.integration_id,
        jobType: syncJob.job_type,
        jobConfig: syncJob.job_config
      },
      {
        // Priority based on job type (full imports get lower priority)
        priority: syncJob.job_type === 'full_import' ? 1 : 10,
        // Delay incremental syncs to batch them
        delay: syncJob.job_type === 'incremental_sync' ? 5000 : 0,
        // Job-specific timeouts
        jobId: syncJob.id,
        opts: {
          timeout: this.getJobTimeout(syncJob.job_type)
        }
      }
    );

    // Update job status in database
    await this.updateSyncJobStatus(syncJob.id, 'pending');
  }

  private async processSyncJob(job: Job): Promise<void> {
    const { syncJobId, integrationId, jobType, jobConfig } = job.data;
    
    try {
      // Update job status to running
      await this.updateSyncJobStatus(syncJobId, 'running', {
        started_at: new Date().toISOString()
      });

      // Get integration details
      const { data: integration, error } = await this.supabase
        .from('crm_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (error || !integration) {
        throw new Error(`Integration not found: ${integrationId}`);
      }

      // Process based on job type
      switch (jobType) {
        case 'full_import':
          await this.processFullImport(job, integration);
          break;
        case 'incremental_sync':
          await this.processIncrementalSync(job, integration);
          break;
        case 'export_to_crm':
          await this.processExportToCRM(job, integration);
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      // Mark job as completed
      await this.updateSyncJobStatus(syncJobId, 'completed', {
        completed_at: new Date().toISOString(),
        progress_percent: 100
      });

      // Update integration last sync time
      await this.supabase
        .from('crm_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          connection_status: 'connected'
        })
        .eq('id', integrationId);

    } catch (error) {
      console.error(`Sync job ${syncJobId} failed:`, error);
      
      await this.updateSyncJobStatus(syncJobId, 'failed', {
        error_details: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      });

      // Update integration with error status
      await this.supabase
        .from('crm_integrations')
        .update({
          last_sync_status: 'failed',
          sync_error_details: { message: error.message }
        })
        .eq('id', integrationId);

      throw error; // Re-throw for Bull to handle retry logic
    }
  }

  private async processFullImport(job: Job, integration: CRMIntegration): Promise<void> {
    const { syncJobId } = job.data;
    const provider = this.getCRMProvider(integration.crm_provider);
    
    // Get total count estimate for progress tracking
    job.updateProgress(0);
    await this.updateJobProgress(syncJobId, 0, 0);

    // Stream client data in batches for memory efficiency
    const batchSize = 100;
    let processedCount = 0;
    let totalEstimate = 0;

    try {
      // Get all clients in batches
      const clientStream = await provider.getClientStream(
        integration.auth_config,
        { batchSize }
      );

      for await (const clientBatch of clientStream) {
        if (totalEstimate === 0 && clientBatch.totalCount) {
          totalEstimate = clientBatch.totalCount;
          await this.updateJobProgress(syncJobId, 0, processedCount, totalEstimate);
        }

        // Process batch with parallel processing
        const batchPromises = clientBatch.clients.map(async (client: any) => {
          try {
            await this.processClientRecord(integration.id, client, integration.field_mappings);
            return { success: true, clientId: client.id };
          } catch (error) {
            console.error(`Failed to process client ${client.id}:`, error);
            return { success: false, clientId: client.id, error: error.message };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const successCount = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        processedCount += successCount;
        
        // Update progress
        const progressPercent = totalEstimate > 0 
          ? Math.round((processedCount / totalEstimate) * 100)
          : Math.round((processedCount / (processedCount + 100)) * 100);
        
        job.updateProgress(progressPercent);
        await this.updateJobProgress(syncJobId, progressPercent, processedCount, totalEstimate);

        // Cache progress for real-time updates
        this.progressCache.set(syncJobId, progressPercent);

        // Rate limiting - respect CRM provider limits
        await this.rateLimitDelay(provider.rateLimits.requestsPerMinute);
      }

    } catch (error) {
      console.error('Full import stream processing failed:', error);
      throw error;
    }
  }

  private async updateJobProgress(
    jobId: string,
    progressPercent: number,
    recordsProcessed: number,
    recordsTotal?: number
  ): Promise<void> {
    await Promise.all([
      // Update database
      this.supabase
        .from('crm_sync_jobs')
        .update({
          progress_percent: progressPercent,
          records_processed: recordsProcessed,
          records_total: recordsTotal
        })
        .eq('id', jobId),
      
      // Update cache for real-time API
      this.redis.setex(`sync_progress:${jobId}`, 300, JSON.stringify({
        progress_percent: progressPercent,
        records_processed: recordsProcessed,
        records_total: recordsTotal,
        updated_at: Date.now()
      }))
    ]);
  }

  // Real-time progress API endpoint
  async getSyncProgress(jobId: string): Promise<any> {
    // Try cache first (sub-millisecond response)
    const cached = await this.redis.get(`sync_progress:${jobId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const { data } = await this.supabase
      .from('crm_sync_jobs')
      .select('progress_percent, records_processed, records_total, updated_at')
      .eq('id', jobId)
      .single();

    return data;
  }

  private setupWorkerEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
      this.progressCache.delete(job.id!);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
      this.progressCache.delete(job?.id!);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`Job ${jobId} stalled`);
    });
  }

  private getJobTimeout(jobType: string): number {
    const timeouts = {
      'full_import': 30 * 60 * 1000, // 30 minutes
      'incremental_sync': 5 * 60 * 1000, // 5 minutes
      'export_to_crm': 10 * 60 * 1000 // 10 minutes
    };
    return timeouts[jobType] || 10 * 60 * 1000;
  }

  private async rateLimitDelay(requestsPerMinute: number): Promise<void> {
    const delayMs = (60 * 1000) / (requestsPerMinute * 0.8); // 20% buffer
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
```

#### 2. High-Performance Caching Layer
```typescript
// File: src/services/performance/CRMCacheService.ts
import Redis from 'ioredis';
import { createHash } from 'crypto';

export class CRMCacheService {
  private redis: Redis;
  private localCache: Map<string, { data: any; expires: number }> = new Map();
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'crm:',
      retryDelayOnFailover: 100,
      lazyConnect: true
    });

    // Cleanup local cache every 5 minutes
    setInterval(() => this.cleanupLocalCache(), 5 * 60 * 1000);
  }

  // Multi-tier caching: Local memory -> Redis -> Database
  async get<T>(key: string): Promise<T | null> {
    // Level 1: Local memory cache (fastest)
    const localEntry = this.localCache.get(key);
    if (localEntry && localEntry.expires > Date.now()) {
      return localEntry.data as T;
    }

    // Level 2: Redis cache
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached) as T;
        
        // Populate local cache
        this.localCache.set(key, {
          data,
          expires: Date.now() + (30 * 1000) // 30 seconds local cache
        });
        
        return data;
      }
    } catch (error) {
      console.error('Redis cache error:', error);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    
    // Set in both caches
    await Promise.all([
      // Redis with TTL
      this.redis.setex(key, ttlSeconds, serialized),
      
      // Local cache with shorter TTL
      Promise.resolve(this.localCache.set(key, {
        data: value,
        expires: Date.now() + Math.min(ttlSeconds * 1000, 30 * 1000)
      }))
    ]);
  }

  // Cache CRM provider data with intelligent invalidation
  async cacheProviderData(providerId: string, integrationId: string, data: any): Promise<void> {
    const key = `provider:${providerId}:${integrationId}`;
    await this.set(key, data, 15 * 60); // 15 minutes
  }

  async getCachedProviderData(providerId: string, integrationId: string): Promise<any> {
    const key = `provider:${providerId}:${integrationId}`;
    return await this.get(key);
  }

  // Cache field mappings (rarely change)
  async cacheFieldMappings(integrationId: string, mappings: any[]): Promise<void> {
    const key = `mappings:${integrationId}`;
    await this.set(key, mappings, 60 * 60); // 1 hour
  }

  // Cache sync job progress for real-time updates
  async cacheSyncProgress(jobId: string, progress: any): Promise<void> {
    const key = `progress:${jobId}`;
    await this.set(key, progress, 5 * 60); // 5 minutes
  }

  // Batch operations for efficiency
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(entries: Array<[string, any, number?]>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    entries.forEach(([key, value, ttl = 300]) => {
      pipeline.setex(key, ttl, JSON.stringify(value));
    });
    
    await pipeline.exec();
  }

  // Cache warming for frequently accessed data
  async warmCache(integrationId: string): Promise<void> {
    try {
      // Pre-load frequently accessed data
      const promises = [
        this.warmProviderCache(integrationId),
        this.warmFieldMappingsCache(integrationId),
        this.warmSyncHistoryCache(integrationId)
      ];
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  private async warmProviderCache(integrationId: string): Promise<void> {
    // Implementation depends on specific provider data
  }

  private async warmFieldMappingsCache(integrationId: string): Promise<void> {
    // Pre-load field mappings
  }

  private async warmSyncHistoryCache(integrationId: string): Promise<void> {
    // Pre-load recent sync history
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expires <= now) {
        this.localCache.delete(key);
      }
    }
  }

  // Generate cache keys with consistent hashing
  generateKey(...parts: string[]): string {
    const combined = parts.join(':');
    return createHash('md5').update(combined).digest('hex');
  }
}
```

#### 3. Mobile PWA Optimization
```typescript
// File: src/services/performance/MobilePWAService.ts
export class MobilePWAService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  async initializePWA(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.serviceWorkerRegistration);

        // Handle service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                this.showUpdateAvailableNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Offline-first sync status
  async getCachedSyncStatus(integrationId: string): Promise<any> {
    try {
      const cache = await caches.open('crm-sync-status');
      const response = await cache.match(`/api/crm/integrations/${integrationId}/status`);
      
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get cached sync status:', error);
    }
    
    return null;
  }

  // Background sync for offline actions
  async queueOfflineAction(action: string, data: any): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      // Store action in IndexedDB
      await this.storeOfflineAction(action, data);
      
      // Register background sync
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`crm-${action}`);
    }
  }

  private async storeOfflineAction(action: string, data: any): Promise<void> {
    // Implementation would use IndexedDB to store offline actions
    // for later sync when connection is restored
  }

  // Performance monitoring
  measurePerformance(name: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();
    
    return fn().finally(() => {
      const duration = performance.now() - start;
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      // Report to analytics
      if ('PerformanceObserver' in window) {
        // Custom performance entries
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
    });
  }

  // Network-aware operations
  async adaptToConnectionQuality(): Promise<void> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        // Reduce background sync frequency
        // Increase cache TTL
        // Disable non-essential features
        this.enableLowBandwidthMode();
      } else if (connection.effectiveType === '4g') {
        // Enable full functionality
        // Reduce cache TTL for fresher data
        this.enableHighBandwidthMode();
      }
    }
  }

  private enableLowBandwidthMode(): void {
    // Reduce image quality
    // Increase cache TTL
    // Disable real-time updates
    console.log('Enabled low bandwidth mode');
  }

  private enableHighBandwidthMode(): void {
    // Enable full image quality
    // Reduce cache TTL
    // Enable real-time updates
    console.log('Enabled high bandwidth mode');
  }

  private showUpdateAvailableNotification(): void {
    // Show user notification about available update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WedSync Update Available', {
        body: 'A new version of WedSync is available. Refresh to update.',
        icon: '/icons/icon-192x192.png'
      });
    }
  }
}
```

#### 4. Database Performance Optimization
```typescript
// File: src/services/performance/DatabaseOptimizationService.ts
import { createClient } from '@supabase/supabase-js';

export class DatabaseOptimizationService {
  private supabase;
  private connectionPool: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public'
        },
        auth: {
          persistSession: false
        }
      }
    );
  }

  // Optimized bulk client insertion
  async bulkInsertClients(clients: any[], batchSize: number = 100): Promise<void> {
    const batches = this.chunkArray(clients, batchSize);
    
    for (const batch of batches) {
      try {
        const { error } = await this.supabase
          .from('clients')
          .upsert(batch, {
            onConflict: 'external_crm_id,crm_integration_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Bulk insert error:', error);
          // Try individual inserts for the failed batch
          await this.insertBatchIndividually(batch);
        }
      } catch (error) {
        console.error('Bulk insert failed:', error);
        await this.insertBatchIndividually(batch);
      }
    }
  }

  // Optimized queries with proper indexing
  async getIntegrationWithOptimization(integrationId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('crm_integrations')
      .select(`
        *,
        suppliers!inner (
          id,
          subscription_tier,
          user_id
        )
      `)
      .eq('id', integrationId)
      .single();

    if (error) throw error;
    return data;
  }

  // Efficient pagination for large datasets
  async getPaginatedSyncJobs(
    integrationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: any[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;
    
    const [dataResult, countResult] = await Promise.all([
      this.supabase
        .from('crm_sync_jobs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      
      this.supabase
        .from('crm_sync_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId)
    ]);

    const data = dataResult.data || [];
    const total = countResult.count || 0;
    const hasMore = offset + data.length < total;

    return { data, total, hasMore };
  }

  // Connection pooling for high-concurrency operations
  async executeWithPool<T>(operation: () => Promise<T>): Promise<T> {
    // Implementation would use pgbouncer or similar connection pooling
    return operation();
  }

  // Database health monitoring
  async checkDatabaseHealth(): Promise<{
    connectionCount: number;
    slowQueries: any[];
    indexUsage: any[];
    tableStats: any[];
  }> {
    try {
      const [
        connectionResult,
        slowQueriesResult,
        indexUsageResult,
        tableStatsResult
      ] = await Promise.all([
        this.supabase.rpc('get_connection_count'),
        this.supabase.rpc('get_slow_queries'),
        this.supabase.rpc('get_index_usage'),
        this.supabase.rpc('get_table_stats')
      ]);

      return {
        connectionCount: connectionResult.data || 0,
        slowQueries: slowQueriesResult.data || [],
        indexUsage: indexUsageResult.data || [],
        tableStats: tableStatsResult.data || []
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        connectionCount: 0,
        slowQueries: [],
        indexUsage: [],
        tableStats: []
      };
    }
  }

  private async insertBatchIndividually(batch: any[]): Promise<void> {
    for (const item of batch) {
      try {
        await this.supabase
          .from('clients')
          .upsert(item, { onConflict: 'external_crm_id,crm_integration_id' });
      } catch (error) {
        console.error('Individual insert failed:', error, item);
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Background Job Processing (PRIORITY 1)
- [ ] CRM sync job processor with Bull queue
- [ ] Redis-based job queuing with retry logic
- [ ] Concurrent job processing (10+ jobs simultaneously)
- [ ] Real-time progress tracking and caching
- [ ] Exponential backoff for failed jobs

### Performance Optimization (PRIORITY 2)
- [ ] Multi-tier caching system (memory, Redis, database)
- [ ] Database query optimization and indexing
- [ ] Bulk data processing with streaming
- [ ] Connection pooling for high concurrency
- [ ] Performance monitoring and alerting

### Mobile PWA Features (PRIORITY 3)
- [ ] Service worker for offline functionality
- [ ] Background sync for offline actions
- [ ] Network-aware performance adaptations
- [ ] Push notifications for sync status
- [ ] IndexedDB for offline data storage

## 💾 WHERE TO SAVE YOUR WORK

**Performance Services:**
- `$WS_ROOT/wedsync/src/services/CRMSyncJobProcessor.ts`
- `$WS_ROOT/wedsync/src/services/performance/CRMCacheService.ts`
- `$WS_ROOT/wedsync/src/services/performance/MobilePWAService.ts`
- `$WS_ROOT/wedsync/src/services/performance/DatabaseOptimizationService.ts`

**Infrastructure Files:**
- `$WS_ROOT/wedsync/public/sw.js` (Service Worker)
- `$WS_ROOT/wedsync/public/manifest.json` (PWA Manifest)
- `$WS_ROOT/wedsync/src/lib/redis.ts` (Redis configuration)

**Performance Tests:**
- `$WS_ROOT/wedsync/src/services/performance/__tests__/performance.test.ts`

## 🧪 TESTING REQUIREMENTS

### Performance Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/src/services/__tests__/CRMSyncJobProcessor.performance.test.ts
$WS_ROOT/wedsync/src/services/performance/__tests__/CRMCacheService.test.ts
$WS_ROOT/wedsync/src/services/performance/__tests__/DatabaseOptimization.test.ts
```

### Performance Benchmarks
- [ ] Import 500 clients in <5 minutes
- [ ] Handle 10 concurrent sync jobs
- [ ] API response times <200ms (p95)
- [ ] Cache hit rates >80%
- [ ] Mobile page load <3 seconds
- [ ] PWA offline functionality working

## 🏁 COMPLETION CHECKLIST

### Infrastructure Implementation
- [ ] Background job processing system functional
- [ ] Redis caching layer operational
- [ ] Database optimization strategies implemented
- [ ] Connection pooling configured
- [ ] Performance monitoring enabled

### Mobile & PWA
- [ ] Service worker registered and functional
- [ ] Offline functionality working
- [ ] Background sync implemented
- [ ] Push notifications configured
- [ ] Mobile performance optimized

### Performance Metrics
- [ ] Sub-second API response times
- [ ] Efficient bulk data processing
- [ ] Cache invalidation strategies working
- [ ] Database query optimization verified
- [ ] Mobile-first design principles followed

### Wedding Context
- [ ] Performance optimized for wedding season peaks
- [ ] Mobile interface optimized for venue locations
- [ ] Background processing handles large client imports
- [ ] Real-time progress updates for suppliers
- [ ] Offline capability for poor signal areas

---

**EXECUTE IMMEDIATELY - Build the high-performance infrastructure that can handle wedding season traffic while keeping suppliers happy with lightning-fast response times!**