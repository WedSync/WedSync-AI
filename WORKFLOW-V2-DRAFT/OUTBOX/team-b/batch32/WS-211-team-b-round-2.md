# TEAM B - ROUND 2: WS-211 - Client Dashboard Templates - Advanced Backend & Real-time Collaboration

**Date:** 2025-08-28  
**Feature ID:** WS-211 (Track all work with this ID)  
**Priority:** P1 (High value for supplier efficiency)  
**Mission:** Build advanced backend features with real-time collaboration and scalability optimization  
**Context:** You are Team B building on Round 1's foundation. ALL teams must complete before Round 3.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photography business scaling to 500+ concurrent template operations during peak season  
**I want to:** Handle real-time collaborative editing with conflict resolution and advanced caching  
**So that:** Multiple team members can work simultaneously without performance degradation or data corruption  

**Real Wedding Problem This Solves:**  
During wedding season (May-October), large photography businesses have 10+ team members creating and modifying templates simultaneously. The backend must handle operational transformation for real-time collaboration, resolve conflicts when team members edit the same section, cache frequently used templates, and provide sub-100ms response times even under peak load.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Real-time collaboration with operational transformation
- Advanced caching with invalidation strategies
- Template analytics and usage tracking
- Horizontal scalability for high concurrency
- Conflict resolution algorithms
- Template import/export with version control
- Performance monitoring and auto-scaling

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes with Edge Runtime
- Real-time: Supabase Realtime with custom conflict resolution
- Caching: Redis with multi-tier caching strategy
- Database: PostgreSQL 15 with optimized indexing and partitioning
- Monitoring: Custom metrics with alerting and auto-scaling

**Integration Points:**
- Collaboration Frontend: Team A's real-time collaborative editor
- Advanced Assignment: Team C's inheritance and rule-based assignment
- Mobile Backend: Team D's mobile-optimized API responses
- Performance Testing: Team E's load testing and monitoring validation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Load advanced backend documentation:
await mcp__Ref__ref_search_documentation({query: "Supabase realtime operational transformation conflict resolution"});
await mcp__Ref__ref_search_documentation({query: "Redis caching Next.js API routes performance"});
await mcp__Ref__ref_search_documentation({query: "PostgreSQL 15 partitioning JSONB optimization"});
await mcp__Ref__ref_search_documentation({query: "Next.js 15 Edge Runtime scaling patterns"});

// 2. Review Round 1 implementations:
await Read({
  file_path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch32/WS-211-team-b-round-1.md"
});

// 3. Check existing backend patterns:
await Task({
  description: "Analyze advanced backend patterns",
  prompt: "Use PostgreSQL MCP to: 1) Check current template table performance, 2) Identify optimization opportunities, 3) Review existing caching patterns",
  subagent_type: "postgresql-database-expert"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build advanced template backend with real-time collaboration"
2. **supabase-specialist** --real-time-collaboration "Implement operational transformation for templates"
3. **postgresql-database-expert** --performance-optimization "Optimize template queries and indexing"
4. **performance-optimization-expert** --caching-strategy "Build multi-tier caching architecture"
5. **nextjs-fullstack-developer** --edge-runtime "Implement scalable API routes"
6. **security-compliance-officer** --collaboration-security "Secure real-time collaboration"
7. **integration-specialist** --conflict-resolution "Build advanced conflict resolution"

---

## 🎯 ROUND 2 DELIVERABLES

### **REAL-TIME COLLABORATION BACKEND:**
- [ ] Operational transformation engine for conflict-free template editing
- [ ] Real-time presence system with user activity tracking
- [ ] Advanced conflict resolution with merge strategies
- [ ] Template locking and collaborative permissions
- [ ] Change broadcasting with efficient delta compression
- [ ] Collaborative session management and recovery

### **ADVANCED CACHING & PERFORMANCE:**
- [ ] Multi-tier caching strategy (Redis, CDN, in-memory)
- [ ] Template query optimization with smart indexing
- [ ] Database partitioning for template data
- [ ] Connection pooling and query batching
- [ ] Template analytics and usage tracking
- [ ] Performance monitoring with auto-scaling triggers

### Code Files to Create:
```sql
-- /wedsync/supabase/migrations/[timestamp]_advanced_template_system.sql
-- Advanced indexing for template operations
CREATE INDEX CONCURRENTLY idx_templates_usage_analytics 
ON dashboard_templates USING GIN ((sections->'analytics'));

CREATE INDEX CONCURRENTLY idx_templates_collaboration 
ON dashboard_templates (supplier_id, updated_at) 
WHERE is_active = true;

-- Partitioning for template versions
CREATE TABLE dashboard_template_versions (
  LIKE dashboard_templates INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Advanced conflict resolution tables
CREATE TABLE template_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES dashboard_templates(id),
  conflict_data JSONB NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time collaboration tracking
CREATE TABLE template_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES dashboard_templates(id),
  user_id UUID REFERENCES auth.users(id),
  session_data JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

```typescript
// /wedsync/src/lib/backend/operational-transform.ts
export class OperationalTransformEngine {
  async applyOperation(templateId: string, operation: TemplateOperation): Promise<TransformResult> {
    // Implement operational transformation algorithm
    // Handle insert, delete, retain operations on template sections
    // Resolve conflicts using priority-based transformation
    // Broadcast changes to all active collaborators
  }
  
  async transformOperation(
    operation: TemplateOperation, 
    conflictingOp: TemplateOperation
  ): Promise<TemplateOperation> {
    // Transform operations to maintain consistency
    // Handle position adjustments after concurrent edits
    // Preserve user intent while avoiding conflicts
  }
  
  async resolveConflict(conflict: TemplateConflict): Promise<ConflictResolution> {
    // Automatic conflict resolution strategies
    // Last-writer-wins, operational precedence, user-defined rules
    // Merge strategies for compatible changes
  }
}

// /wedsync/src/lib/backend/template-caching.ts
export class AdvancedTemplateCache {
  private redis: Redis;
  private localCache: Map<string, CachedTemplate>;
  
  async getTemplate(templateId: string, userId: string): Promise<Template | null> {
    // Multi-tier cache lookup: local → Redis → database
    // Cache invalidation based on user permissions and template changes
    // Optimized for read-heavy workloads with smart prefetching
  }
  
  async invalidateTemplate(templateId: string, reason: InvalidationReason): Promise<void> {
    // Intelligent cache invalidation
    // Cascade invalidation for dependent templates
    // Partial cache updates for section-level changes
  }
  
  async warmCache(supplierId: string): Promise<void> {
    // Predictive cache warming for frequently used templates
    // Background cache population during low-traffic periods
    // Usage pattern analysis for optimal cache strategies
  }
}

// /wedsync/src/app/api/templates/collaboration/[templateId]/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  // Handle real-time collaboration operations
  // Validate user permissions and session state
  // Apply operational transformation and broadcast changes
  // Update template with conflict resolution
}

// /wedsync/src/lib/backend/template-analytics.ts
export class TemplateAnalyticsEngine {
  async trackTemplateUsage(templateId: string, event: AnalyticsEvent): Promise<void> {
    // Track template usage patterns and performance metrics
    // Collect section interaction data for optimization insights
    // Monitor template assignment success rates
  }
  
  async generateUsageReport(supplierId: string, period: DateRange): Promise<UsageReport> {
    // Generate comprehensive usage analytics
    // Template performance metrics and optimization recommendations
    // User behavior analysis for UX improvements
  }
}
```

### Advanced Backend Services:
```typescript
// /wedsync/src/lib/backend/template-import-export.ts
export class TemplateImportExportService {
  async exportTemplate(templateId: string, format: ExportFormat): Promise<ExportedTemplate> {
    // Export templates with full version history
    // Include section configurations and dependencies
    // Generate portable template packages
  }
  
  async importTemplate(
    data: ImportedTemplate, 
    supplierId: string
  ): Promise<ImportResult> {
    // Import templates with conflict detection
    // Merge with existing templates and resolve naming conflicts
    // Validate section compatibility and dependencies
  }
  
  async migrateTemplate(
    templateId: string, 
    targetVersion: string
  ): Promise<MigrationResult> {
    // Template schema migration and version compatibility
    // Backward compatibility with older template formats
    // Data integrity validation during migration
  }
}

// /wedsync/src/lib/backend/template-scaling.ts
export class TemplateScalingManager {
  async handleLoadSpike(metrics: LoadMetrics): Promise<ScalingAction> {
    // Auto-scaling based on template operation load
    // Connection pool management and optimization
    // Database read replica routing for template queries
  }
  
  async optimizeQueries(supplierId: string): Promise<QueryOptimization> {
    // Dynamic query optimization based on usage patterns
    // Index recommendations and database tuning
    // Query plan analysis and performance improvements
  }
}
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Collaboration event specifications and conflict resolution requirements
- FROM Team C: Advanced assignment rule requirements and template inheritance patterns
- FROM Team D: Mobile API optimization requirements and offline sync specifications

### What other teams NEED from you:
- TO Team A: Real-time collaboration APIs and operational transformation endpoints
- TO Team C: Advanced template inheritance APIs and conflict resolution webhooks  
- TO Team D: Mobile-optimized collaboration APIs with delta sync
- TO Team E: Performance monitoring APIs and load testing endpoints

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Collaboration Security:
- [ ] Real-time operations validated for user permissions
- [ ] Operational transformation prevents data injection
- [ ] Session hijacking protection for collaborative editing
- [ ] Template access control in real-time broadcasts
- [ ] Conflict resolution validates data integrity

### Advanced Backend Security:
- [ ] Cache poisoning prevention in multi-tier architecture
- [ ] Template import validation prevents malicious data
- [ ] Analytics data anonymization and privacy protection
- [ ] Auto-scaling security prevents resource exhaustion
- [ ] Database query optimization prevents injection attacks

---

## 🎭 ADVANCED BACKEND TESTING

```javascript
// Real-time collaboration testing
describe('Operational Transformation Engine', () => {
  test('Concurrent template editing with conflict resolution', async () => {
    const templateId = 'test-template-123';
    
    // Simulate two users editing simultaneously
    const user1Operation = {
      type: 'insert',
      position: 2,
      content: { type: 'welcome', title: 'User 1 Section' }
    };
    
    const user2Operation = {
      type: 'insert',
      position: 2,
      content: { type: 'timeline', title: 'User 2 Section' }
    };
    
    // Apply operations concurrently
    const [result1, result2] = await Promise.all([
      transformEngine.applyOperation(templateId, user1Operation),
      transformEngine.applyOperation(templateId, user2Operation)
    ]);
    
    // Verify both operations applied without conflicts
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    // Verify final template state is consistent
    const finalTemplate = await getTemplate(templateId);
    expect(finalTemplate.sections).toHaveLength(4); // Original 2 + 2 new sections
  });
  
  test('Template caching performance under load', async () => {
    const supplierId = 'test-supplier-123';
    
    // Warm cache with frequently used templates
    await templateCache.warmCache(supplierId);
    
    // Simulate high concurrent read load
    const requests = Array.from({ length: 1000 }, (_, i) => 
      templateCache.getTemplate(`template-${i % 10}`, supplierId)
    );
    
    const startTime = Date.now();
    await Promise.all(requests);
    const endTime = Date.now();
    
    // Verify cache performance meets SLA
    const avgResponseTime = (endTime - startTime) / 1000;
    expect(avgResponseTime).toBeLessThan(50); // Average < 50ms
  });
});

// Template analytics testing
describe('Template Analytics Engine', () => {
  test('Usage tracking and reporting', async () => {
    const templateId = 'analytics-test-template';
    const supplierId = 'test-supplier-123';
    
    // Simulate various template events
    await analyticsEngine.trackTemplateUsage(templateId, {
      type: 'template_viewed',
      userId: 'user-1',
      timestamp: new Date()
    });
    
    await analyticsEngine.trackTemplateUsage(templateId, {
      type: 'section_added',
      userId: 'user-1', 
      sectionType: 'welcome',
      timestamp: new Date()
    });
    
    // Generate usage report
    const report = await analyticsEngine.generateUsageReport(supplierId, {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date()
    });
    
    // Verify report contains expected metrics
    expect(report.templateViews).toBeGreaterThan(0);
    expect(report.mostUsedSections).toContain('welcome');
    expect(report.performanceMetrics.avgLoadTime).toBeLessThan(200);
  });
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Real-time Collaboration:
- [ ] Operational transformation handles all concurrent editing scenarios
- [ ] Conflict resolution maintains data integrity under high concurrency
- [ ] Real-time broadcasts deliver within 100ms with 99.9% reliability
- [ ] Collaborative sessions handle network interruptions gracefully
- [ ] Template locking prevents destructive concurrent operations

### Performance & Scalability:
- [ ] Multi-tier caching achieves 95%+ cache hit rate for template operations
- [ ] Database queries optimized for sub-50ms response times
- [ ] System handles 1000+ concurrent collaborative sessions
- [ ] Auto-scaling responds to load spikes within 30 seconds
- [ ] Template analytics processing doesn't impact real-time performance

### Data Integrity & Security:
- [ ] Template import/export preserves complete data integrity
- [ ] All collaborative operations validate user permissions
- [ ] Analytics data collection respects privacy requirements
- [ ] Cache invalidation maintains consistency across all tiers
- [ ] Database migrations handle version compatibility seamlessly

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Advanced APIs: `/wedsync/src/app/api/templates/collaboration/`
- Backend Services: `/wedsync/src/lib/backend/`
- Database Migrations: `/wedsync/supabase/migrations/`
- Caching Layer: `/wedsync/src/lib/cache/`
- Tests: `/wedsync/tests/backend/template-system/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch32/WS-211-team-b-round-2-complete.md`

**Evidence Package Required:**
- Real-time collaboration performance benchmarks
- Operational transformation conflict resolution test results
- Multi-tier caching performance metrics
- Template analytics dashboard with usage insights
- Database optimization results and query performance
- Load testing results for concurrent collaborative sessions

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Operational transformation engine implemented and tested
- [ ] Real-time collaboration backend with conflict resolution
- [ ] Multi-tier caching architecture with intelligent invalidation
- [ ] Template analytics and usage tracking system
- [ ] Advanced database optimizations and partitioning
- [ ] Template import/export with version control
- [ ] Performance monitoring and auto-scaling
- [ ] Comprehensive backend testing suite
- [ ] Evidence package with performance benchmarks

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY