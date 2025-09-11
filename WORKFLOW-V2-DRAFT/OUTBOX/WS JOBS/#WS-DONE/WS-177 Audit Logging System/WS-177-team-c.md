# TEAM C - ROUND 1: WS-177 - Audit Logging System - Real-Time Integration & Storage

**Date:** 2025-01-20  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build real-time audit log storage system with intelligent routing and secure data persistence  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business compliance officer
**I want to:** Real-time audit data storage with intelligent categorization and secure access
**So that:** All system events are captured and available for forensic analysis and regulatory compliance

**Real Wedding Problem This Solves:**
A destination wedding coordinator manages 50 vendors across 3 countries for a single wedding. When a guest's dietary restriction data is modified, the system must instantly log: who changed it, when, why, and notify relevant vendors automatically. This storage system ensures no audit event is lost and all changes are traceable across the entire vendor network.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Real-time audit log ingestion and storage
- Intelligent log routing by severity and type
- Secure data persistence with retention policies
- Integration with existing database layer
- Performance optimization for high-volume logging
- Backup and disaster recovery compliance

**Technology Stack (VERIFIED):**
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Real-time: Supabase Realtime subscriptions
- Storage: JSONB for flexible audit data
- Indexing: Multi-column indexes for fast queries
- Retention: Automated archival system
- Security: Row Level Security (RLS) policies

**Integration Points:**
- Team A log viewer requires query API
- Team B logging engine feeds data here
- Team D security policies protect data
- Team E testing validates storage performance

---

## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This audit storage system needs to handle high-volume logging from multiple sources while maintaining query performance for the UI. Need to analyze data flow patterns and storage optimization strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: Multiple services → audit ingestion → intelligent routing → storage optimization → query API. Each step needs validation, error handling, and performance monitoring.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team B provides logging data, Team A needs query performance, Team D requires security controls. Need to design APIs that satisfy all requirements while maintaining data integrity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: Ingestion endpoints need batching support, query APIs need filtering and pagination, security layer needs role-based access control.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Performance Analysis
```typescript
// When implementing high-performance systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding businesses generate thousands of audit events daily. Peak wedding season could see 10x volume. Storage system needs horizontal scaling, efficient indexing, and automated cleanup.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance optimization: Use time-series partitioning, implement read replicas, design efficient indexes, and implement intelligent caching strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load database architecture and patterns
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/database/query-optimizer.ts" 
});

await mcp__supabase__search_docs({
  graphql_query: `
    query {
      searchDocs(query: "real-time subscriptions performance postgresql indexing", limit: 10) {
        nodes {
          title
          href
          content
        }
      }
    }
  `
});

await mcp__Ref__ref_search_documentation({ 
  query: "PostgreSQL JSONB indexing performance time-series data" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **database-mcp-specialist** --storage-optimization "Design audit log storage with performance"
2. **supabase-specialist** --realtime-subscriptions "Configure audit event streaming"
3. **performance-optimization-expert** --database-performance "Optimize query performance"
4. **security-compliance-officer** --data-retention "Implement retention policies"
5. **test-automation-architect** --storage-testing "Test storage performance and reliability"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Audit Log Storage Service
**File:** `/wedsync/src/lib/audit/storage/audit-storage.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AuditLogSchema = z.object({
  user_id: z.string().uuid().optional(),
  action: z.string().min(1),
  resource_type: z.string().min(1),
  resource_id: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  details: z.record(z.any()).optional(),
  severity: z.enum(['info', 'warning', 'critical']).default('info')
});

export type AuditLogEntry = z.infer<typeof AuditLogSchema>;

export class AuditStorage {
  private static supabase = createClient();

  static async store(entry: AuditLogEntry): Promise<void> {
    // Validate entry
    const validated = AuditLogSchema.parse(entry);
    
    // Store with automatic partitioning
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        ...validated,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Audit storage failed:', error);
      // Implement fallback storage
      await this.storeFallback(validated);
    }
  }

  static async storeBatch(entries: AuditLogEntry[]): Promise<void> {
    const validated = entries.map(entry => AuditLogSchema.parse(entry));
    
    const { error } = await this.supabase
      .from('audit_logs')
      .insert(validated.map(entry => ({
        ...entry,
        created_at: new Date().toISOString()
      })));

    if (error) {
      console.error('Batch audit storage failed:', error);
      // Process individually as fallback
      for (const entry of validated) {
        await this.store(entry);
      }
    }
  }

  private static async storeFallback(entry: AuditLogEntry): Promise<void> {
    // Implement local storage or queue for retry
    console.warn('Using fallback storage for audit entry');
  }
}
```

#### 2. Real-Time Audit Event Handler
**File:** `/wedsync/src/lib/audit/storage/realtime-handler.ts`
```typescript
import { createClient } from '@/lib/supabase/client';
import { AuditStorage, AuditLogEntry } from './audit-storage';

export class RealtimeAuditHandler {
  private static client = createClient();
  private static batchQueue: AuditLogEntry[] = [];
  private static batchTimer: NodeJS.Timeout | null = null;

  static init() {
    // Set up real-time subscription for audit events
    this.client
      .channel('audit_events')
      .on('broadcast', { event: 'audit_log' }, (payload) => {
        this.handleAuditEvent(payload.payload as AuditLogEntry);
      })
      .subscribe();

    // Start batch processor
    this.startBatchProcessor();
  }

  private static handleAuditEvent(entry: AuditLogEntry) {
    // Route by severity
    if (entry.severity === 'critical') {
      // Immediate storage for critical events
      AuditStorage.store(entry);
    } else {
      // Batch non-critical events
      this.addToBatch(entry);
    }
  }

  private static addToBatch(entry: AuditLogEntry) {
    this.batchQueue.push(entry);
    
    // Trigger immediate batch if queue is large
    if (this.batchQueue.length >= 100) {
      this.processBatch();
    }
  }

  private static startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, 5000); // Process every 5 seconds
  }

  private static async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      await AuditStorage.storeBatch(batch);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Re-queue failed entries
      this.batchQueue.unshift(...batch);
    }
  }

  static destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
  }
}
```

#### 3. Query API for Log Retrieval
**File:** `/wedsync/src/lib/audit/storage/query-service.ts`
```typescript
import { createClient } from '@/lib/supabase/server';

interface QueryFilters {
  severity?: string[];
  actions?: string[];
  users?: string[];
  resourceTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

export class AuditQueryService {
  private static supabase = createClient();

  static async queryLogs(filters: QueryFilters = {}) {
    let query = this.supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        severity,
        details,
        created_at,
        user_profiles!inner(email, full_name)
      `);

    // Apply filters
    if (filters.severity?.length) {
      query = query.in('severity', filters.severity);
    }

    if (filters.actions?.length) {
      query = query.in('action', filters.actions);
    }

    if (filters.users?.length) {
      query = query.in('user_id', filters.users);
    }

    if (filters.resourceTypes?.length) {
      query = query.in('resource_type', filters.resourceTypes);
    }

    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
    }

    // Order by created_at DESC for latest first
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Audit query failed:', error);
      throw error;
    }

    return data;
  }

  static async getLogStats(dateRange?: { start: string; end: string }) {
    let query = this.supabase
      .from('audit_logs')
      .select('severity, action, resource_type');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Audit stats query failed:', error);
      throw error;
    }

    // Process stats
    const stats = {
      total: data?.length || 0,
      bySeverity: this.groupBy(data || [], 'severity'),
      byAction: this.groupBy(data || [], 'action'),
      byResourceType: this.groupBy(data || [], 'resource_type')
    };

    return stats;
  }

  private static groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || 0;
      groups[group]++;
      return groups;
    }, {});
  }
}
```

#### 4. Data Retention Service
**File:** `/wedsync/src/lib/audit/storage/retention-service.ts`
```typescript
import { createClient } from '@/lib/supabase/server';

interface RetentionPolicy {
  severity: string;
  retentionDays: number;
  archiveAfterDays?: number;
}

export class AuditRetentionService {
  private static supabase = createClient();
  
  private static policies: RetentionPolicy[] = [
    { severity: 'critical', retentionDays: 2555, archiveAfterDays: 365 }, // 7 years, archive after 1 year
    { severity: 'warning', retentionDays: 1095, archiveAfterDays: 180 }, // 3 years, archive after 6 months
    { severity: 'info', retentionDays: 365, archiveAfterDays: 90 } // 1 year, archive after 3 months
  ];

  static async enforceRetention() {
    for (const policy of this.policies) {
      await this.cleanupBySeverity(policy);
    }
  }

  private static async cleanupBySeverity(policy: RetentionPolicy) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Delete old logs
    const { error: deleteError } = await this.supabase
      .from('audit_logs')
      .delete()
      .eq('severity', policy.severity)
      .lt('created_at', cutoffDate.toISOString());

    if (deleteError) {
      console.error(`Retention cleanup failed for ${policy.severity}:`, deleteError);
    }

    // Archive if policy specifies
    if (policy.archiveAfterDays) {
      await this.archiveBySeverity(policy);
    }
  }

  private static async archiveBySeverity(policy: RetentionPolicy) {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays!);

    // Move old logs to archive table
    const { data: logsToArchive } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('severity', policy.severity)
      .lt('created_at', archiveDate.toISOString());

    if (logsToArchive?.length) {
      // Insert into archive table
      const { error: archiveError } = await this.supabase
        .from('audit_logs_archive')
        .insert(logsToArchive);

      if (!archiveError) {
        // Delete from main table
        const { error: deleteError } = await this.supabase
          .from('audit_logs')
          .delete()
          .eq('severity', policy.severity)
          .lt('created_at', archiveDate.toISOString());

        if (deleteError) {
          console.error(`Archive deletion failed for ${policy.severity}:`, deleteError);
        }
      }
    }
  }

  static async getRetentionStats() {
    const stats = [];
    
    for (const policy of this.policies) {
      const { count } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', policy.severity);

      stats.push({
        severity: policy.severity,
        currentCount: count || 0,
        retentionDays: policy.retentionDays,
        archiveAfterDays: policy.archiveAfterDays
      });
    }

    return stats;
  }
}
```

#### 5. Storage API Routes
**File:** `/wedsync/src/app/api/audit/storage/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuditQueryService } from '@/lib/audit/storage/query-service';
import { withSecureValidation } from '@/lib/api/middleware';
import { z } from 'zod';

const QuerySchema = z.object({
  severity: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  users: z.array(z.string().uuid()).optional(),
  resourceTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0)
});

export async function GET(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      // Parse query parameters
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams);
      
      // Validate and parse filters
      const filters = QuerySchema.parse({
        ...queryParams,
        severity: queryParams.severity?.split(','),
        actions: queryParams.actions?.split(','),
        users: queryParams.users?.split(','),
        resourceTypes: queryParams.resourceTypes?.split(','),
        limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
        offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
        dateRange: queryParams.startDate && queryParams.endDate ? {
          start: queryParams.startDate,
          end: queryParams.endDate
        } : undefined
      });

      // Query audit logs
      const logs = await AuditQueryService.queryLogs(filters);
      const stats = await AuditQueryService.getLogStats(filters.dateRange);

      return NextResponse.json({
        success: true,
        data: {
          logs,
          stats,
          pagination: {
            limit: filters.limit,
            offset: filters.offset,
            total: stats.total
          }
        }
      });
    },
    {
      requiredRole: 'admin',
      rateLimit: { requests: 100, window: '1h' }
    }
  )(request);
}

export async function POST(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      const body = await req.json();
      
      // Handle bulk storage requests from other services
      if (body.entries && Array.isArray(body.entries)) {
        const { AuditStorage } = await import('@/lib/audit/storage/audit-storage');
        await AuditStorage.storeBatch(body.entries);
        
        return NextResponse.json({ 
          success: true, 
          message: `Stored ${body.entries.length} audit entries` 
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    },
    {
      requiredRole: 'service',
      rateLimit: { requests: 1000, window: '1h' }
    }
  )(request);
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Complete audit log storage system with performance optimization
- [x] Real-time event processing with intelligent routing
- [x] Query API with advanced filtering and pagination
- [x] Data retention policies with automated cleanup
- [x] Batch processing for high-volume scenarios
- [x] Fallback storage mechanisms for reliability
- [x] Performance monitoring and statistics
- [x] Integration APIs for other teams

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature provides backend storage services that power the audit UI navigation and admin workflows.

### Navigation Implementation Requirements

**1. API Breadcrumb Support**
```tsx
// Provide breadcrumb data in API responses
{
  "logs": [...],
  "navigation": {
    "breadcrumbs": [
      { "label": "Dashboard", "href": "/dashboard" },
      { "label": "Admin", "href": "/admin" },
      { "label": "Audit Logs", "href": "/admin/audit" }
    ]
  }
}
```

**2. Deep Link Support**
```tsx
// Support filtered URL generation
/api/audit/storage?severity=critical&dateRange=2024-01-01,2024-01-31
// Should generate shareable audit report URLs
```

**3. Context Preservation**
- Maintain filter state across navigation
- Support bookmark-able audit queries
- Preserve session context for audit access

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Audit log data format - Required for storage optimization
- FROM Team D: Security access policies - Required for RLS implementation

### What other teams NEED from you:
- TO Team A: Query API endpoints - Required for log viewer
- TO Team E: Storage performance APIs - Required for testing
- TO All Teams: Storage capacity metrics - Needed for monitoring

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Storage Security:
- [x] Row Level Security (RLS) policies for all audit tables
- [x] Encrypted storage for sensitive audit data
- [x] Access logging for audit log access
- [x] Data integrity verification
- [x] Secure deletion with overwrite
- [x] Backup encryption compliance
- [x] Network encryption for data transfer
- [x] Role-based storage access control

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Test audit log storage performance
await mcp__supabase__execute_sql({
  query: `
    INSERT INTO audit_logs (action, resource_type, severity, details)
    SELECT 
      'test_action_' || generate_series,
      'test_resource',
      CASE WHEN random() < 0.1 THEN 'critical'
           WHEN random() < 0.3 THEN 'warning'
           ELSE 'info' END,
      '{"test": true}'::jsonb
    FROM generate_series(1, 10000);
  `
});

// Test query performance
const startTime = performance.now();
const result = await fetch('/api/audit/storage?limit=1000&severity=critical');
const endTime = performance.now();

// Verify response time < 500ms
console.assert(endTime - startTime < 500, 'Query performance test failed');

// Test batch processing
const batchEntries = Array.from({length: 100}, (_, i) => ({
  action: `batch_test_${i}`,
  resource_type: 'test_batch',
  severity: 'info'
}));

await fetch('/api/audit/storage', {
  method: 'POST',
  body: JSON.stringify({ entries: batchEntries })
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] Single log storage < 10ms
- [x] Batch storage (100 logs) < 100ms
- [x] Query response < 500ms for 1000 logs
- [x] Real-time processing < 50ms latency
- [x] 99.9% storage reliability
- [x] Automated retention policies functional
- [x] Zero data loss during failures

### Evidence Package Required:
- [x] Performance benchmarks for storage operations
- [x] Load testing results for high-volume scenarios
- [x] Retention policy execution logs
- [x] Security audit of storage implementation
- [x] Integration test results with other teams
- [x] Disaster recovery validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Storage Service: `/wedsync/src/lib/audit/storage/`
- API Routes: `/wedsync/src/app/api/audit/storage/`
- Migrations: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/__tests__/audit/storage/`
- Types: `/wedsync/src/types/audit-storage.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch23/WS-177-team-c-round-1-complete.md`

---

END OF ROUND PROMPT