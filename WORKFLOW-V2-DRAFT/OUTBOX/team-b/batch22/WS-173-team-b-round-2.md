# TEAM B - ROUND 2: WS-173 - Performance Optimization Targets - Advanced Caching & Query Optimization

**Date:** 2025-08-28  
**Feature ID:** WS-173 (Track all work with this ID)  
**Priority:** P0 (Critical for mobile usage)  
**Mission:** Implement advanced caching strategies and query optimization for production performance  
**Context:** You are Team B building on Round 1's foundation. ALL teams must complete before Round 3.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync on mobile at venues  
**I want to:** Fast loading pages even on slow 3G connections  
**So that:** I can quickly access client information during time-sensitive wedding coordination  

**Real Wedding Problem This Solves:**  
During peak wedding season, suppliers manage 5+ weddings per weekend. They need instant access to each wedding's details, guest counts, and vendor contacts. Cache misses during ceremony time cause unacceptable delays.

---

## 🎯 TECHNICAL REQUIREMENTS FROM ROUND 1

**Build upon Round 1 deliverables:**
- Performance metrics tracker service
- Basic Redis cache manager
- Database query optimizer
- Performance monitoring endpoints

**Round 2 Focus: Advanced optimization and production scalability**

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION

```typescript
// Load latest performance optimization docs
await mcp__Ref__ref_search_documentation({query: "Redis cluster configuration high availability"});
await mcp__Ref__ref_search_documentation({query: "PostgreSQL 15 query performance monitoring indexes"});
await mcp__Ref__ref_search_documentation({query: "Next.js 15 ISR revalidation caching strategies"});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **performance-optimization-expert** --advanced-caching "Implement multi-tier caching strategy"
2. **postgresql-database-expert** --query-optimization "Advanced query optimization and monitoring"
3. **devops-sre-engineer** --production-scaling "Production caching infrastructure"
4. **test-automation-architect** --load-testing "Advanced performance testing"
5. **security-compliance-officer** --cache-security "Advanced cache security patterns"

---

## 🎯 ROUND 2 DELIVERABLES

### **ADVANCED CACHING:**
- [ ] Multi-tier cache hierarchy (L1: Memory, L2: Redis, L3: CDN)
- [ ] Smart cache invalidation with tags
- [ ] Cache warming strategies for critical data
- [ ] Distributed cache consistency management
- [ ] Cache analytics and optimization recommendations
- [ ] Background cache population jobs

### **QUERY OPTIMIZATION:**
- [ ] Advanced database index strategies
- [ ] Query plan analysis and optimization
- [ ] Connection pooling fine-tuning
- [ ] Prepared statement optimization
- [ ] Query result streaming for large datasets
- [ ] Database performance monitoring dashboard

### **CODE FILES TO CREATE:**
```typescript
// /wedsync/src/lib/cache/multi-tier-cache.ts
export class MultiTierCache {
  async get(key: string): Promise<any> // L1 -> L2 -> L3 fallback
  async set(key: string, value: any, options: CacheOptions): Promise<void>
  async warmCache(pattern: string): Promise<void>
}

// /wedsync/src/lib/database/query-analyzer.ts
export class QueryAnalyzer {
  async analyzePerformance(query: string): Promise<QueryPlan>
  async recommendOptimizations(): Promise<Optimization[]>
}

// /wedsync/src/lib/performance/cache-warmer.ts
export class CacheWarmer {
  async warmCriticalData(): Promise<void>
  async scheduleWarmingJobs(): Promise<void>
}
```

---

## 🔗 DEPENDENCIES & INTEGRATION

### What you need from other teams:
- **Team A**: Component loading patterns for cache preloading
- **Team C**: CDN configuration for L3 cache integration

### What other teams need from you:
- **Team A**: Advanced performance metrics for monitoring
- **Team D**: Mobile-optimized cache strategies
- **Team E**: Performance benchmarking tools

---

## 🎭 ADVANCED PERFORMANCE TESTING

```javascript
// Multi-tier cache performance testing
test('Advanced caching performance validation', async () => {
  // Test cache hierarchy performance
  const startTime = Date.now();
  
  // L1 cache hit (should be < 1ms)
  const l1Result = await cache.get('hot-data');
  expect(Date.now() - startTime).toBeLessThan(1);
  
  // L2 cache hit (should be < 5ms)
  await cache.invalidateL1();
  const l2Result = await cache.get('warm-data');
  expect(Date.now() - startTime).toBeLessThan(5);
  
  // Cache warming effectiveness
  await cache.warmCache('/api/clients/*');
  const warmingEffectiveness = await cache.getHitRatio();
  expect(warmingEffectiveness).toBeGreaterThan(0.9);
});

// Database query optimization validation
test('Query performance optimization', async () => {
  const queryMetrics = await db.analyzeQuery(`
    SELECT c.*, g.guest_count 
    FROM clients c 
    LEFT JOIN guest_lists g ON c.id = g.client_id 
    WHERE c.organization_id = $1 
    AND c.wedding_date BETWEEN $2 AND $3
  `);
  
  expect(queryMetrics.executionTime).toBeLessThan(50); // ms
  expect(queryMetrics.indexUsage).toBe(true);
  expect(queryMetrics.fullTableScan).toBe(false);
});
```

---

## ✅ ROUND 2 SUCCESS CRITERIA

### **CACHING PERFORMANCE:**
- [ ] L1 cache hits < 1ms response time
- [ ] L2 cache hits < 5ms response time
- [ ] Overall cache hit ratio > 85%
- [ ] Cache warming reduces cold start latency by 70%
- [ ] Zero cache consistency issues

### **DATABASE PERFORMANCE:**
- [ ] All queries < 50ms execution time
- [ ] 100% index usage on filtered queries
- [ ] Connection pool efficiency > 95%
- [ ] Zero N+1 query patterns
- [ ] Query plan optimization recommendations implemented

---

## 💾 WHERE TO SAVE YOUR WORK

**Team Report:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch22/WS-173-team-b-round-2-complete.md`

**Evidence Package Required:**
- Cache performance benchmarks
- Database query analysis reports
- Performance monitoring dashboard screenshots
- Load testing results
- Cache hit ratio analytics

---

## 🏁 ROUND 2 COMPLETION CHECKLIST

- [ ] Multi-tier cache system implemented and tested
- [ ] Database queries optimized with performance validation
- [ ] Cache warming strategies deployed
- [ ] Performance monitoring enhanced
- [ ] Integration points ready for other teams
- [ ] Production readiness validated

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY