# TEAM A - ROUND 1: WS-177 - Audit Logging System - Log Viewer Interface

**Date:** 2025-01-26  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build comprehensive audit log viewer with real-time monitoring and advanced filtering for security events  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business compliance officer
**I want to:** Real-time visibility into all data access and system events
**So that:** I can investigate security incidents and demonstrate compliance during audits

**Real Wedding Problem This Solves:**
During a destination wedding in Italy, a guest claims their dietary information was shared inappropriately. The compliance officer needs to prove exactly who accessed what data when, showing the audit trail to both the guest and regulatory authorities. This interface provides instant access to comprehensive logs with filtering and export capabilities.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Real-time audit log display
- Advanced filtering (user, action, resource, time)
- Search functionality across all log fields
- Export capabilities for compliance reports
- Severity-based color coding
- Drill-down for detailed event information

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Real-time: Supabase Realtime subscriptions
- Tables: TanStack Table with virtual scrolling
- Export: CSV/PDF generation
- Testing: Playwright MCP, Browser MCP for log interactions

**Integration Points:**
- Audit logger from Team B
- Log storage from Team C
- Security events from Team D
- API audit data from Team E


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
// Load audit interface requirements
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md" 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/tanstack/table", 
  topic: "virtual scrolling filtering", 
  maxTokens: 3000 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --audit-interface "Track WS-177 log viewer"
2. **react-ui-specialist** --table-virtualization "Build log viewer table"
3. **security-compliance-officer** --audit-requirements "Validate compliance UI"
4. **test-automation-architect** --ui-testing "Create audit interface tests"
5. **performance-optimization-expert** --table-performance "Optimize large log rendering"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Main Audit Log Viewer
**File:** `/wedsync/src/components/audit/AuditLogViewer.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, any>;
  created_at: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState({
    severity: 'all',
    action: '',
    user: '',
    timeRange: '24h'
  });

  // Real-time subscription to new logs
  useEffect(() => {
    const supabase = createClient();
    
    const subscription = supabase
      .channel('audit_logs')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs(current => [payload.new as AuditLogEntry, ...current]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="audit-log-viewer">
      <AuditLogFilters filters={filters} onFiltersChange={setFilters} />
      <AuditLogTable logs={logs} />
      <AuditLogExport logs={logs} />
    </div>
  );
}
```

#### 2. Advanced Filtering System
**File:** `/wedsync/src/components/audit/AuditLogFilters.tsx`
```typescript
'use client';

export function AuditLogFilters({ filters, onFiltersChange }) {
  return (
    <div className="audit-filters">
      {/* Severity filter */}
      <SeverityFilter 
        value={filters.severity}
        onChange={(severity) => onFiltersChange({...filters, severity})}
      />
      
      {/* Action filter */}
      <ActionFilter 
        value={filters.action}
        onChange={(action) => onFiltersChange({...filters, action})}
      />
      
      {/* User filter */}
      <UserFilter 
        value={filters.user}
        onChange={(user) => onFiltersChange({...filters, user})}
      />
      
      {/* Time range filter */}
      <TimeRangeFilter 
        value={filters.timeRange}
        onChange={(timeRange) => onFiltersChange({...filters, timeRange})}
      />
    </div>
  );
}
```

#### 3. Virtualized Log Table
**File:** `/wedsync/src/components/audit/AuditLogTable.tsx`
```typescript
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';

export function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Row height
    overscan: 10
  });

  return (
    <div ref={parentRef} className="audit-table-container">
      <div className="audit-table-header">
        <div>Time</div>
        <div>User</div>
        <div>Action</div>
        <div>Resource</div>
        <div>Severity</div>
        <div>Details</div>
      </div>
      
      <div 
        className="audit-table-body"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const log = logs[virtualRow.index];
          return (
            <AuditLogRow
              key={log.id}
              log={log}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
```

#### 4. Log Export Component
**File:** `/wedsync/src/components/audit/AuditLogExport.tsx`
```typescript
'use client';

export function AuditLogExport({ logs }: { logs: AuditLogEntry[] }) {
  const exportToCSV = () => {
    const csvContent = [
      ['Time', 'User', 'Action', 'Resource', 'Severity', 'IP', 'Details'],
      ...logs.map(log => [
        log.created_at,
        log.user_email || 'System',
        log.action,
        `${log.resource_type}:${log.resource_id || ''}`,
        log.severity,
        log.ip_address || '',
        JSON.stringify(log.details || {})
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="audit-export">
      <button onClick={exportToCSV}>
        Export to CSV
      </button>
      <button onClick={() => window.print()}>
        Print Report
      </button>
    </div>
  );
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Complete audit log viewer with real-time updates
- [x] Advanced filtering system (severity, user, action, time)
- [x] Virtualized table for performance with large datasets
- [x] Search functionality across all log fields
- [x] Export capabilities (CSV, Print)
- [x] Severity-based visual indicators
- [x] Drill-down detail views
- [x] Mobile responsive design

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
- FROM Team B: Audit log data format - Required for display structure
- FROM Team C: Log storage query API - Required for data retrieval

### What other teams NEED from you:
- TO Team D: Security event display patterns - They need for alert UI
- TO All Teams: Log filtering requirements - Needed for consistent logging

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Audit Interface Security:
- [x] Role-based access control for log viewing
- [x] No sensitive data displayed in UI
- [x] Audit log access is itself logged
- [x] Export functionality requires admin role
- [x] Real-time updates secured with RLS
- [x] Session timeout for audit screens
- [x] No client-side log caching
- [x] Watermarked exports for compliance

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Test audit log viewer functionality
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/audit"});

// Test real-time updates
const initialLogCount = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelectorAll('.audit-log-row').length`
});

// Trigger an action to generate a log
await mcp__playwright__browser_click({element: "Test Action", ref: "test-btn"});

// Verify real-time update
await mcp__playwright__browser_wait_for({text: "Test Action"});

// Test filtering
await mcp__playwright__browser_select_option({
  element: "Severity filter",
  ref: "severity-select",
  values: ["critical"]
});

// Verify only critical logs shown
const criticalLogs = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelectorAll('.audit-log-row[data-severity="critical"]').length`
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] Real-time log updates < 100ms
- [x] Table virtualization handles 10k+ logs
- [x] Filtering response < 500ms
- [x] Export generation < 5s for 1000 logs
- [x] Zero memory leaks in long sessions

### Evidence Package Required:
- [x] Screenshot of log viewer in action
- [x] Video of real-time updates
- [x] Performance metrics for large datasets
- [x] Export functionality demonstration
- [x] Accessibility audit results

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/audit/`
- Hooks: `/wedsync/src/hooks/useAuditLogs.ts`
- Utils: `/wedsync/src/lib/audit/log-utils.ts`
- Tests: `/wedsync/tests/audit-ui/`
- Types: `/wedsync/src/types/audit.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch23/WS-177-team-a-round-1-complete.md`

---

END OF ROUND PROMPT