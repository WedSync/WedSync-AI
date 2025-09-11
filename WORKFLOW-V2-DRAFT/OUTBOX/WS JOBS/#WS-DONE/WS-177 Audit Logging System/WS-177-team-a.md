# TEAM A - ROUND 1: WS-177 - Audit Logging System - Advanced Log Viewer Interface

**Date:** 2025-01-20  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build comprehensive audit log viewer with real-time monitoring, advanced filtering, and compliance reporting for security events  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business compliance officer
**I want to:** Real-time visibility into all data access and system events with powerful analysis tools
**So that:** I can investigate security incidents, demonstrate compliance during audits, and protect client privacy

**Real Wedding Problem This Solves:**
During a destination wedding in Italy, a guest claims their dietary information was shared inappropriately with a vendor they didn't approve. The compliance officer needs to prove exactly who accessed what data when, showing the complete audit trail to both the guest and regulatory authorities. This advanced interface provides instant access to comprehensive logs with filtering, search, export capabilities, and visual analytics to quickly identify the source of the issue and demonstrate compliance with privacy regulations.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Real-time audit log display with live updates
- Advanced filtering (user, action, resource, time, severity)
- Full-text search functionality across all log fields
- Export capabilities for compliance reports (CSV, PDF, JSON)
- Visual analytics and trend analysis
- Drill-down for detailed event information
- Performance optimization for large datasets
- Mobile-responsive audit interface

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Real-time: Supabase Realtime subscriptions
- Tables: TanStack Table with virtual scrolling
- Charts: Recharts for audit analytics
- Export: CSV/PDF generation with compliance formatting
- Search: Advanced filtering with debounced queries
- Testing: Playwright MCP, Browser MCP for interactive testing

**Integration Points:**
- Team B audit logger provides data format
- Team C storage system provides query APIs
- Team D security policies control access
- Team E testing validates UI performance

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
  thought: "This audit log viewer needs to handle millions of records while maintaining sub-second response times. Need to analyze data visualization patterns, virtual scrolling implementation, and real-time update strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI architecture analysis: Virtual table for performance, real-time subscriptions for live updates, advanced filtering with debouncing, export functionality, and responsive design for mobile compliance officers. Each component needs optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: User Experience Analysis  
```typescript
// When designing complex user interfaces
mcp__sequential-thinking__sequential_thinking({
  thought: "Compliance officers need to quickly find specific events in millions of logs during high-pressure audits. Interface must prioritize: speed of access, clarity of information, and ease of export for regulators.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UX optimization strategy: Contextual filtering shortcuts, visual severity indicators, one-click compliance exports, breadcrumb navigation for complex queries, and mobile-optimized emergency access.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Performance Optimization
```typescript
// When implementing high-performance UI components
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding businesses generate 100K+ audit events during peak season. UI must handle: virtual scrolling for large datasets, efficient re-rendering on real-time updates, optimized filtering without UI blocking.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance implementation: React.useMemo for expensive calculations, useCallback for stable references, virtual scrolling with overscan, debounced search, and efficient state management.",
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

## 🌐 BROWSER MCP INTERACTIVE TESTING (CRITICAL!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE AUDIT INTERFACE
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/audit"});
const snapshot = await mcp__playwright__browser_snapshot();

// 2. TEST ADVANCED FILTERING INTERACTIONS
await mcp__playwright__browser_click({
  element: "Severity filter dropdown",
  ref: snapshot.querySelector('[data-testid="severity-filter"]')
});

await mcp__playwright__browser_select_option({
  element: "Severity filter",
  ref: snapshot.querySelector('select[name="severity"]'),
  values: ["critical", "warning"]
});

// 3. TEST REAL-TIME LOG UPDATES
await mcp__playwright__browser_wait_for({text: "Real-time updates active"});

// Generate test audit event in background
await fetch('/api/audit/test-event', { method: 'POST' });

// Verify new log appears automatically
await mcp__playwright__browser_wait_for({text: "test_event"});

// 4. TEST EXPORT FUNCTIONALITY
await mcp__playwright__browser_click({
  element: "Export to CSV button",
  ref: snapshot.querySelector('[data-testid="export-csv-btn"]')
});

// Wait for download to complete
await mcp__playwright__browser_wait_for({time: 2});

// 5. RESPONSIVE DESIGN TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_wait_for({time: 1});
  
  // Capture responsive screenshots
  await mcp__playwright__browser_take_screenshot({
    filename: `audit-interface-${width}w.png`,
    fullPage: true
  });
  
  // Verify mobile navigation works
  if (width < 768) {
    const mobileNav = await mcp__playwright__browser_evaluate({
      function: `() => document.querySelector('[data-testid="mobile-audit-nav"]')?.style.display`
    });
    expect(mobileNav).not.toBe('none');
  }
}

// 6. PERFORMANCE TESTING DURING INTERACTION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Measure rendering performance
    performance.mark('filter-start');
    
    // Apply complex filter
    document.querySelector('[data-testid="apply-filter-btn"]').click();
    
    // Wait for results
    setTimeout(() => {
      performance.mark('filter-end');
      performance.measure('filter-duration', 'filter-start', 'filter-end');
      
      const filterTime = performance.getEntriesByName('filter-duration')[0].duration;
      console.log('Filter performance:', filterTime, 'ms');
    }, 100);
  }`
});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load audit interface requirements and patterns
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md" 
});

await mcp__Ref__ref_search_documentation({ 
  query: "TanStack Table virtual scrolling React 19 performance optimization" 
});

await mcp__supabase__search_docs({
  graphql_query: `
    query {
      searchDocs(query: "real-time subscriptions UI performance virtual scrolling", limit: 10) {
        nodes {
          title
          href
          content
        }
      }
    }
  `
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **react-ui-specialist** --audit-interface "Build advanced audit log viewer with performance optimization"
2. **performance-optimization-expert** --ui-performance "Optimize table virtualization and real-time updates"
3. **security-compliance-officer** --compliance-ui "Design compliance-focused audit interface"
4. **ui-ux-designer** --audit-ux "Create intuitive audit investigation workflows"
5. **test-automation-architect** --ui-testing "Comprehensive audit interface testing"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Advanced Audit Log Viewer
**File:** `/wedsync/src/components/audit/AuditLogViewer.tsx`
```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AuditLogTable } from './AuditLogTable';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogSearch } from './AuditLogSearch';
import { AuditLogExport } from './AuditLogExport';
import { AuditLogAnalytics } from './AuditLogAnalytics';
import { RealtimeIndicator } from './RealtimeIndicator';

interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, any>;
  created_at: string;
  integrity_hash?: string;
}

interface FilterState {
  severity: string[];
  actions: string[];
  users: string[];
  resourceTypes: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    severity: [],
    actions: [],
    users: [],
    resourceTypes: [],
    searchQuery: ''
  });

  const [pagination, setPagination] = useState({
    limit: 100,
    offset: 0,
    total: 0
  });

  const supabase = createClient();

  // Memoized filtered and sorted logs
  const processedLogs = useMemo(() => {
    let processed = [...logs];

    // Apply filters
    if (filters.severity.length > 0) {
      processed = processed.filter(log => filters.severity.includes(log.severity));
    }

    if (filters.actions.length > 0) {
      processed = processed.filter(log => filters.actions.includes(log.action));
    }

    if (filters.users.length > 0) {
      processed = processed.filter(log => 
        filters.users.includes(log.user_id || '') || 
        filters.users.some(user => log.user_email?.includes(user))
      );
    }

    if (filters.resourceTypes.length > 0) {
      processed = processed.filter(log => filters.resourceTypes.includes(log.resource_type));
    }

    if (filters.dateRange) {
      processed = processed.filter(log => {
        const logDate = new Date(log.created_at);
        const startDate = new Date(filters.dateRange!.start);
        const endDate = new Date(filters.dateRange!.end);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    // Apply search query
    if (filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase();
      processed = processed.filter(log =>
        log.action.toLowerCase().includes(searchLower) ||
        log.resource_type.toLowerCase().includes(searchLower) ||
        log.user_email?.toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.ip_address?.includes(searchLower) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending (newest first)
    processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return processed;
  }, [logs, filters]);

  // Load initial audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/audit/storage?' + new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load audit logs: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.data.stats.total
        }));
      } else {
        throw new Error(data.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('audit_logs_realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'audit_logs' 
        },
        (payload) => {
          const newLog = payload.new as AuditLogEntry;
          setLogs(current => [newLog, ...current]);
          setRealtimeConnected(true);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          const updatedLog = payload.new as AuditLogEntry;
          setLogs(current => 
            current.map(log => log.id === updatedLog.id ? updatedLog : log)
          );
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load initial data
  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Update filtered logs when processing changes
  useEffect(() => {
    setFilteredLogs(processedLogs);
  }, [processedLogs]);

  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(current => ({ ...current, ...newFilters }));
  }, []);

  const handleExport = useCallback((format: 'csv' | 'pdf' | 'json') => {
    // Export current filtered logs
    const exportData = {
      logs: filteredLogs,
      filters: filters,
      exported_at: new Date().toISOString(),
      total_count: filteredLogs.length
    };

    // Trigger export via the export component
    return exportData;
  }, [filteredLogs, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading audit logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800">Error Loading Audit Logs</h3>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button 
          onClick={() => loadAuditLogs()}
          className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="audit-log-viewer space-y-6">
      {/* Header with real-time indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log Viewer</h1>
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} logs
          </p>
        </div>
        
        <RealtimeIndicator connected={realtimeConnected} />
      </div>

      {/* Analytics Dashboard */}
      <AuditLogAnalytics logs={filteredLogs} />

      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AuditLogSearch 
            searchQuery={filters.searchQuery}
            onSearchChange={(query) => handleFiltersChange({ searchQuery: query })}
          />
        </div>
        <div>
          <AuditLogExport 
            logs={filteredLogs}
            onExport={handleExport}
          />
        </div>
      </div>

      <AuditLogFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableOptions={{
          severities: ['info', 'warning', 'critical'],
          actions: [...new Set(logs.map(log => log.action))],
          users: [...new Set(logs.map(log => log.user_email).filter(Boolean))],
          resourceTypes: [...new Set(logs.map(log => log.resource_type))]
        }}
      />

      {/* Main Audit Log Table */}
      <AuditLogTable 
        logs={filteredLogs}
        loading={loading}
        onRefresh={loadAuditLogs}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-gray-600">
          Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              offset: Math.max(0, prev.offset - prev.limit) 
            }))}
            disabled={pagination.offset === 0}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <button
            onClick={() => setPagination(prev => ({ 
              ...prev, 
              offset: prev.offset + prev.limit 
            }))}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2. High-Performance Virtualized Table
**File:** `/wedsync/src/components/audit/AuditLogTable.tsx`
```typescript
'use client';

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AuditLogEntry } from './types';
import { AuditLogRow } from './AuditLogRow';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  loading?: boolean;
  onRefresh?: () => void;
}

const severityColors = {
  info: 'bg-blue-50 text-blue-800',
  warning: 'bg-yellow-50 text-yellow-800',
  critical: 'bg-red-50 text-red-800'
};

const severityIcons = {
  info: '🔵',
  warning: '⚠️',
  critical: '🚨'
};

export function AuditLogTable({ logs, loading, onRefresh }: AuditLogTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Row height in pixels
    overscan: 10, // Render extra rows for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
          <p className="text-gray-600 mb-4">
            No logs match your current filters. Try adjusting your search criteria.
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Logs
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-medium text-sm text-gray-600">
        <div className="col-span-2">Time</div>
        <div className="col-span-1">Severity</div>
        <div className="col-span-2">User</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-2">Resource</div>
        <div className="col-span-2">IP Address</div>
        <div className="col-span-1">Details</div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const log = logs[virtualRow.index];
            const isEven = virtualRow.index % 2 === 0;
            
            return (
              <div
                key={log.id}
                data-testid="audit-log-row"
                data-severity={log.severity}
                className={`
                  absolute top-0 left-0 w-full grid grid-cols-12 gap-4 p-4 border-b border-gray-100
                  hover:bg-gray-50 transition-colors cursor-pointer
                  ${isEven ? 'bg-white' : 'bg-gray-25'}
                `}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => {
                  // Show detailed view modal
                  // Implementation would open a detailed audit log modal
                }}
              >
                {/* Time */}
                <div className="col-span-2 text-sm" data-field="timestamp">
                  <div className="font-medium text-gray-900">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Severity */}
                <div className="col-span-1" data-field="severity">
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${severityColors[log.severity]}
                  `}>
                    <span className="mr-1">{severityIcons[log.severity]}</span>
                    {log.severity}
                  </span>
                </div>

                {/* User */}
                <div className="col-span-2 text-sm" data-field="user">
                  <div className="font-medium text-gray-900">
                    {log.user_name || log.user_email || 'System'}
                  </div>
                  {log.user_email && log.user_name && (
                    <div className="text-xs text-gray-500">{log.user_email}</div>
                  )}
                </div>

                {/* Action */}
                <div className="col-span-2 text-sm" data-field="action">
                  <div className="font-medium text-gray-900">
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {log.action}
                  </div>
                </div>

                {/* Resource */}
                <div className="col-span-2 text-sm" data-field="resource">
                  <div className="font-medium text-gray-900">
                    {log.resource_type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  {log.resource_id && (
                    <div className="text-xs text-gray-500 font-mono">
                      ID: {log.resource_id.substring(0, 8)}...
                    </div>
                  )}
                </div>

                {/* IP Address */}
                <div className="col-span-2 text-sm font-mono" data-field="ip">
                  {log.ip_address || 'Unknown'}
                </div>

                {/* Details */}
                <div className="col-span-1" data-field="details">
                  {log.details && Object.keys(log.details).length > 0 && (
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Refreshing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. Advanced Filtering System
**File:** `/wedsync/src/components/audit/AuditLogFilters.tsx`
```typescript
'use client';

import { useState, useCallback } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FilterState {
  severity: string[];
  actions: string[];
  users: string[];
  resourceTypes: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

interface AuditLogFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  availableOptions: {
    severities: string[];
    actions: string[];
    users: string[];
    resourceTypes: string[];
  };
}

export function AuditLogFilters({ filters, onFiltersChange, availableOptions }: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSeverityChange = useCallback((severity: string, checked: boolean) => {
    const newSeverity = checked 
      ? [...filters.severity, severity]
      : filters.severity.filter(s => s !== severity);
    onFiltersChange({ severity: newSeverity });
  }, [filters.severity, onFiltersChange]);

  const handleActionChange = useCallback((action: string, checked: boolean) => {
    const newActions = checked 
      ? [...filters.actions, action]
      : filters.actions.filter(a => a !== action);
    onFiltersChange({ actions: newActions });
  }, [filters.actions, onFiltersChange]);

  const handleUserChange = useCallback((user: string, checked: boolean) => {
    const newUsers = checked 
      ? [...filters.users, user]
      : filters.users.filter(u => u !== user);
    onFiltersChange({ users: newUsers });
  }, [filters.users, onFiltersChange]);

  const handleResourceTypeChange = useCallback((resourceType: string, checked: boolean) => {
    const newResourceTypes = checked 
      ? [...filters.resourceTypes, resourceType]
      : filters.resourceTypes.filter(rt => rt !== resourceType);
    onFiltersChange({ resourceTypes: newResourceTypes });
  }, [filters.resourceTypes, onFiltersChange]);

  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const newDateRange = {
      ...filters.dateRange,
      [field]: value
    };
    onFiltersChange({ dateRange: newDateRange });
  }, [filters.dateRange, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      severity: [],
      actions: [],
      users: [],
      resourceTypes: [],
      dateRange: undefined,
      searchQuery: ''
    });
  }, [onFiltersChange]);

  const hasActiveFilters = filters.severity.length > 0 || 
                          filters.actions.length > 0 || 
                          filters.users.length > 0 || 
                          filters.resourceTypes.length > 0 || 
                          filters.dateRange || 
                          filters.searchQuery;

  const activeFilterCount = filters.severity.length + 
                           filters.actions.length + 
                           filters.users.length + 
                           filters.resourceTypes.length + 
                           (filters.dateRange ? 1 : 0) + 
                           (filters.searchQuery ? 1 : 0);

  return (
    <div className="bg-white border rounded-lg">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm font-medium text-gray-700"
        >
          <span>Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDownIcon 
            className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="datetime-local"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="datetime-local"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity Level
            </label>
            <div className="space-y-2">
              {availableOptions.severities.map(severity => (
                <label key={severity} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.severity.includes(severity)}
                    onChange={(e) => handleSeverityChange(severity, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`ml-2 text-sm capitalize ${
                    severity === 'critical' ? 'text-red-600 font-medium' :
                    severity === 'warning' ? 'text-yellow-600 font-medium' :
                    'text-gray-600'
                  }`}>
                    {severity} {severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : '🔵'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resource Types Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Types
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableOptions.resourceTypes.map(resourceType => (
                <label key={resourceType} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.resourceTypes.includes(resourceType)}
                    onChange={(e) => handleResourceTypeChange(resourceType, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 capitalize">
                    {resourceType.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableOptions.actions.slice(0, 20).map(action => (
                <label key={action} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.actions.includes(action)}
                    onChange={(e) => handleActionChange(action, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {action.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
            {availableOptions.actions.length > 20 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing first 20 actions. Use search to find specific actions.
              </p>
            )}
          </div>

          {/* Users Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Users
            </label>
            <div className="max-h-32 overflow-y-auto">
              {availableOptions.users.slice(0, 15).map(user => (
                <label key={user} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={filters.users.includes(user)}
                    onChange={(e) => handleUserChange(user, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {user}
                  </span>
                </label>
              ))}
            </div>
            {availableOptions.users.length > 15 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing first 15 users. Use search to find specific users.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="px-4 py-3 border-t bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFiltersChange({ severity: ['critical'] })}
            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs hover:bg-red-200"
          >
            Critical Only
          </button>
          <button
            onClick={() => onFiltersChange({ 
              dateRange: { 
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                end: new Date().toISOString().slice(0, 16)
              }
            })}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs hover:bg-blue-200"
          >
            Last 24 Hours
          </button>
          <button
            onClick={() => onFiltersChange({ actions: ['user_login', 'user_logout'] })}
            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200"
          >
            Authentication Events
          </button>
          <button
            onClick={() => onFiltersChange({ resourceTypes: ['guest', 'vendor'] })}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs hover:bg-purple-200"
          >
            Business Data Access
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Advanced audit log viewer with real-time updates and virtual scrolling
- [x] Comprehensive filtering system with quick filters and advanced options
- [x] Full-text search functionality with debounced queries
- [x] Visual analytics dashboard for audit trend analysis
- [x] Export capabilities (CSV, PDF, JSON) with compliance formatting
- [x] Mobile-responsive design for emergency audit access
- [x] Performance optimization for datasets > 100K logs
- [x] Integration with real-time security alerts

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This audit interface must integrate seamlessly with WedSync's navigation system to provide intuitive access for compliance officers and security teams.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add comprehensive breadcrumb support
import { Breadcrumb } from '@/components/ui/breadcrumb'

const auditBreadcrumbs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Admin', href: '/admin' },
  { label: 'Audit Logs', href: '/admin/audit' },
  // Dynamic breadcrumbs for filtered views
  ...(filters.severity.length > 0 ? [{ 
    label: `${filters.severity.join(', ')} Events`, 
    href: undefined 
  }] : [])
]
```

**2. Menu Integration Points**
- **Admin Navigation**: Primary access through admin security menu
- **Quick Access**: Emergency audit access from main navigation
- **Contextual Access**: Direct links from security alerts and incidents

**3. Mobile Navigation Optimization**
```tsx
// Mobile-first audit navigation
const AuditMobileNav = () => (
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
    <div className="grid grid-cols-4 gap-1 p-2">
      <button className="flex flex-col items-center p-2">
        <FilterIcon className="h-5 w-5" />
        <span className="text-xs">Filter</span>
      </button>
      <button className="flex flex-col items-center p-2">
        <SearchIcon className="h-5 w-5" />
        <span className="text-xs">Search</span>
      </button>
      <button className="flex flex-col items-center p-2">
        <DownloadIcon className="h-5 w-5" />
        <span className="text-xs">Export</span>
      </button>
      <button className="flex flex-col items-center p-2">
        <RefreshIcon className="h-5 w-5" />
        <span className="text-xs">Refresh</span>
      </button>
    </div>
  </div>
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Audit log data format and API contracts - Required for display
- FROM Team C: Storage query APIs and real-time subscriptions - Required for data
- FROM Team D: Security access policies and user roles - Required for UI access control

### What other teams NEED from you:
- TO Team D: UI security requirements - They need for access control implementation
- TO Team E: UI test scenarios and performance requirements - They need for testing
- TO All Teams: UI component patterns - Needed for consistent audit interfaces

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### UI Security:
- [x] Role-based interface access control
- [x] No sensitive data displayed in browser console
- [x] Secure export with watermarking
- [x] Session timeout warnings for audit screens  
- [x] Anti-screenshot protection for critical data
- [x] Audit log access is itself audited
- [x] Real-time security alert integration
- [x] Mobile device security compliance

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Comprehensive UI testing with Browser MCP
describe('Audit Log Viewer Interface Testing', () => {
  it('should handle large datasets without performance degradation', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/audit"});
    
    // Load large dataset
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Simulate loading 10,000 audit logs
        window.testLoadLargeDataset(10000);
      }`
    });
    
    const startTime = performance.now();
    
    // Test scrolling performance
    for (let i = 0; i < 10; i++) {
      await mcp__playwright__browser_evaluate({
        function: `() => {
          document.querySelector('.audit-table-container').scrollTop += 1000;
        }`
      });
      await mcp__playwright__browser_wait_for({time: 100});
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000); // Should scroll smoothly
  });

  it('should maintain real-time updates during user interactions', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/audit"});
    
    const initialCount = await mcp__playwright__browser_evaluate({
      function: `() => document.querySelectorAll('[data-testid="audit-log-row"]').length`
    });
    
    // Apply filters while new logs are coming in
    await mcp__playwright__browser_click({
      element: "Severity filter", 
      ref: '[data-testid="severity-filter"]'
    });
    
    // Generate new audit events in background
    await fetch('/api/audit/test-events', { 
      method: 'POST', 
      body: JSON.stringify({ count: 5 }) 
    });
    
    // Wait for real-time updates
    await mcp__playwright__browser_wait_for({time: 2000});
    
    const updatedCount = await mcp__playwright__browser_evaluate({
      function: `() => document.querySelectorAll('[data-testid="audit-log-row"]').length`
    });
    
    expect(updatedCount).toBeGreaterThan(initialCount);
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] Virtual scrolling handles 100K+ logs smoothly
- [x] Real-time updates < 100ms latency
- [x] Filter operations < 500ms response time
- [x] Export generation < 10s for 10K logs
- [x] Mobile interface fully functional
- [x] Accessibility compliance (WCAG 2.1 AA)
- [x] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

### Evidence Package Required:
- [x] Performance benchmarks with large datasets
- [x] Real-time update demonstration video
- [x] Mobile responsiveness across devices
- [x] Accessibility audit results
- [x] Export functionality with compliance formatting
- [x] Security access control validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/audit/`
- Hooks: `/wedsync/src/hooks/useAuditLogs.ts`
- Utils: `/wedsync/src/lib/audit/ui-utils.ts`
- Types: `/wedsync/src/types/audit-ui.ts`
- Styles: `/wedsync/src/components/audit/audit.css`
- Tests: `/wedsync/__tests__/components/audit/`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch23/WS-177-team-a-round-1-complete.md`

---

END OF ROUND PROMPT