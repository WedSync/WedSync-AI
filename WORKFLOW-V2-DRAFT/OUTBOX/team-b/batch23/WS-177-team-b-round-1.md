# TEAM B - ROUND 1: WS-177 - Audit Logging System - Core Logging Engine

**Date:** 2025-01-26  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build high-performance audit logging engine with comprehensive event capture and structured data recording  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business owner handling client data
**I want to:** Complete audit trail of who accessed what data when
**So that:** I can prove compliance during audits and investigate security incidents

**Real Wedding Problem This Solves:**
A wedding business processes data for 500+ couples yearly, each with 200+ guests. That's 100,000+ records with constant access by photographers, caterers, venues, and planners. When a guest reports a privacy concern, the business must instantly show exactly who accessed their data and when. This logging engine captures every interaction with forensic detail.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- High-performance structured logging system
- Support for multiple log sources and formats
- Automatic context injection (user, session, IP)
- Severity classification and routing
- Buffer management for high-volume logging
- Integration with existing middleware

**Technology Stack (VERIFIED):**
- Backend: Node.js with structured logging
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Queue: Background job processing for log writes
- Format: JSON structured logs with metadata
- Performance: Async logging with batching

**Integration Points:**
- All API routes and middleware
- Database operations
- Authentication events
- File access operations

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
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
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
// Load logging best practices
await mcp__Ref__ref_get_library_docs({ 
  library: "/nodejs/node", 
  topic: "logging performance async", 
  maxTokens: 3000 
});

// Review existing middleware
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/middleware.ts" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --logging-system "Track WS-177 audit engine"
2. **nextjs-fullstack-developer** --backend-focus "Build logging engine"
3. **postgresql-database-expert** --audit-schema "Design audit tables"
4. **performance-optimization-expert** --async-logging "Optimize log performance"
5. **security-compliance-officer** --audit-standards "Validate compliance"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Core Audit Logger
**File:** `/wedsync/src/lib/audit/audit-logger.ts`
```typescript
import crypto from 'crypto';

interface AuditLogEntry {
  id?: string;
  user_id?: string;
  session_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  timestamp?: Date;
  request_id?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logBuffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout;
  
  private constructor() {
    // Flush buffer every 5 seconds or when it reaches 100 entries
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 5000);
  }
  
  static getInstance(): AuditLogger {
    if (!this.instance) {
      this.instance = new AuditLogger();
    }
    return this.instance;
  }

  async logAction(entry: AuditLogEntry): Promise<void> {
    // Add metadata
    const enrichedEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      request_id: this.getRequestId()
    };
    
    // Add to buffer for batched writes
    this.logBuffer.push(enrichedEntry);
    
    // Flush immediately for critical events
    if (entry.severity === 'critical') {
      await this.flushBuffer();
    }
    
    // Flush if buffer is full
    if (this.logBuffer.length >= 100) {
      await this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // Batch insert to database
      await supabase
        .from('audit_logs')
        .insert(logsToFlush.map(log => ({
          user_id: log.user_id,
          session_id: log.session_id,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          details: log.details,
          severity: log.severity,
          created_at: log.timestamp
        })));
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }
  
  // Convenience methods for common actions
  static async logDataAccess(params: {
    userId?: string;
    resourceType: string;
    resourceId: string;
    action: string;
    ipAddress?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const logger = this.getInstance();
    await logger.logAction({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      ip_address: params.ipAddress,
      details: params.details,
      severity: 'info'
    });
  }
  
  static async logSecurityEvent(params: {
    action: string;
    severity: 'warning' | 'critical';
    details: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    const logger = this.getInstance();
    await logger.logAction({
      action: params.action,
      resource_type: 'security',
      severity: params.severity,
      details: params.details,
      ip_address: params.ipAddress
    });
  }
}
```

#### 2. Middleware Integration
**File:** `/wedsync/src/lib/audit/audit-middleware.ts`
```typescript
import { NextRequest } from 'next/server';
import { AuditLogger } from './audit-logger';

export async function auditMiddleware(
  request: NextRequest,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<void> {
  const session = await getSession(request);
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  await AuditLogger.logDataAccess({
    userId: session?.user?.id,
    action,
    resourceType,
    resourceId,
    ipAddress,
    details: {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }
  });
}

// Decorator for automatic API route logging
export function withAuditLogging(
  resourceType: string,
  action?: string
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      const auditAction = action || `${request.method.toLowerCase()}_${resourceType}`;
      
      // Log the action
      await auditMiddleware(request, auditAction, resourceType);
      
      // Execute original method
      const result = await originalMethod.apply(this, [request, ...args]);
      
      // Log completion
      await auditMiddleware(request, `${auditAction}_completed`, resourceType);
      
      return result;
    };
    
    return descriptor;
  };
}
```

#### 3. Database Schema
**File:** `/wedsync/supabase/migrations/[timestamp]_audit_logging_system.sql`
```sql
-- Comprehensive audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_resource (resource_type, resource_id),
  INDEX idx_audit_logs_created_at (created_at DESC),
  INDEX idx_audit_logs_severity (severity),
  INDEX idx_audit_logs_ip (ip_address)
);

-- Partitioning for performance (monthly partitions)
SELECT create_hypertable('audit_logs', 'created_at', chunk_time_interval => INTERVAL '1 month');

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow admin users to read audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to clean old logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job (run monthly)
SELECT cron.schedule('cleanup-audit-logs', '0 0 1 * *', 'SELECT cleanup_old_audit_logs();');
```

#### 4. Log Context Manager
**File:** `/wedsync/src/lib/audit/log-context.ts`
```typescript
export class LogContext {
  private static contexts = new Map<string, Record<string, any>>();
  
  static setContext(key: string, value: any): void {
    this.contexts.set(key, value);
  }
  
  static getContext(key?: string): any {
    if (key) {
      return this.contexts.get(key);
    }
    return Object.fromEntries(this.contexts);
  }
  
  static clearContext(): void {
    this.contexts.clear();
  }
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] High-performance audit logger with batching
- [x] Middleware integration for automatic logging
- [x] Database schema with partitioning
- [x] Security event logging methods
- [x] Context management system
- [x] Batch processing with error handling
- [x] Performance optimizations (async, buffering)
- [x] Comprehensive test suite


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team D: Security event types - Required for proper classification
- FROM Team C: Storage optimization requirements - Required for performance

### What other teams NEED from you:
- TO Team A: Log data structure - They need for UI display
- TO Team C: Logging API - Required for storage optimization
- TO Team E: Audit middleware - Needed for API route logging
- TO All Teams: AuditLogger class - Required for event logging

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Logging Security Checklist:
- [x] Never log sensitive data (passwords, tokens, PII)
- [x] Hash or mask sensitive identifiers
- [x] Secure log storage with RLS
- [x] Tamper-evident log structure
- [x] Encrypted log transmission
- [x] Rate limiting for log ingestion
- [x] Log integrity validation
- [x] Automated cleanup of old logs

### Database Security:
```typescript
// MANDATORY: Create migration request
// File: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-177.md
// Include: Audit table schema, partitioning, RLS policies
```

---

## 🎭 TESTING REQUIREMENTS

```typescript
describe('AuditLogger', () => {
  it('should batch log entries efficiently', async () => {
    const logger = AuditLogger.getInstance();
    
    // Add 50 entries
    for (let i = 0; i < 50; i++) {
      await logger.logAction({
        action: `test_action_${i}`,
        resource_type: 'test',
        severity: 'info'
      });
    }
    
    // Should not have flushed yet (buffer size = 100)
    expect(await getLogCount()).toBe(0);
    
    // Add 50 more to trigger flush
    for (let i = 50; i < 100; i++) {
      await logger.logAction({
        action: `test_action_${i}`,
        resource_type: 'test',
        severity: 'info'
      });
    }
    
    // Should have flushed
    await waitForFlush();
    expect(await getLogCount()).toBe(100);
  });
  
  it('should flush critical events immediately', async () => {
    const logger = AuditLogger.getInstance();
    
    await logger.logAction({
      action: 'critical_security_event',
      resource_type: 'security',
      severity: 'critical'
    });
    
    // Critical events flush immediately
    await waitForFlush(100); // Short wait
    expect(await getLogCount()).toBe(1);
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Performance Targets:
- [x] Log writing < 1ms per entry
- [x] Batch flush < 100ms for 100 entries
- [x] Zero data loss during high load
- [x] Memory usage stable during extended operation
- [x] Database performance maintained

### Evidence Package Required:
- [x] Performance benchmark results
- [x] High-load test results
- [x] Memory usage analysis
- [x] Database impact assessment
- [x] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Logger: `/wedsync/src/lib/audit/audit-logger.ts`
- Middleware: `/wedsync/src/lib/audit/audit-middleware.ts`
- Context: `/wedsync/src/lib/audit/log-context.ts`
- Migration: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/tests/audit/`
- Types: `/wedsync/src/types/audit.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch23/WS-177-team-b-round-1-complete.md`

---

END OF ROUND PROMPT