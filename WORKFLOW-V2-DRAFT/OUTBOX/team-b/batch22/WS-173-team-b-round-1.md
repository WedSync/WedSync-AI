# TEAM B - ROUND 1: WS-173 - Performance Optimization Targets - Backend APIs & Caching

**Date:** 2025-01-26  
**Feature ID:** WS-173 (Track all work with this ID)  
**Priority:** P0 (Critical for mobile usage)  
**Mission:** Build high-performance backend APIs with aggressive caching and optimized queries  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync on mobile at venues  
**I want to:** Fast loading pages even on slow 3G connections  
**So that:** I can quickly access client information during time-sensitive wedding coordination  

**Real Wedding Problem This Solves:**  
During wedding events, suppliers need instant data access. A caterer checking dietary requirements can't wait 10 seconds for an API response. A DJ confirming the first dance song needs immediate access. Performance directly impacts wedding day success.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API response time < 200ms
- Database queries optimized with indexes
- Redis caching for frequently accessed data
- Streaming responses for large datasets
- Connection pooling optimized

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes, Supabase Edge Functions
- Database: PostgreSQL 15 with query optimization
- Caching: Redis for API responses, CDN for static assets
- Testing: Performance benchmarks with autocannon

**Integration Points:**
- Database: Query optimization and indexing
- Redis: Cache management for hot data
- CDN: Edge caching configuration


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

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. Ref MCP - Load latest docs for performance:
await Task({
  description: "Load backend performance docs",
  prompt: "Use Ref MCP to get documentation for: Next.js 15 API route optimization, Supabase performance tuning, Redis caching patterns, database query optimization, streaming responses",
  subagent_type: "Ref MCP-documentation-specialist"
});

// 2. Check existing database schema:
await Task({
  description: "Analyze database performance",
  prompt: "Use PostgreSQL MCP to: 1) List all tables and their indexes, 2) Identify missing indexes for common queries, 3) Check for N+1 query patterns",
  subagent_type: "postgresql-database-expert"
});

// 3. Review existing API patterns:
await Grep({
  pattern: "cache|redis|unstable_cache|revalidate",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api",
  output_mode: "files_with_matches"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Create high-performance backend APIs with caching"
2. **nextjs-fullstack-developer** --think-hard "Build optimized API routes with streaming"
3. **postgresql-database-expert** --think-ultra-hard "Optimize queries and create indexes"
4. **performance-optimization-expert** --think-ultra-hard "Implement Redis caching strategy"
5. **test-automation-architect** --performance-testing "Create API performance benchmarks"
6. **security-compliance-officer** --cache-security "Ensure cache doesn't leak sensitive data"
7. **devops-sre-engineer** --monitoring "Set up performance monitoring"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Profile existing API response times
- Identify slow database queries
- Review current caching strategy
- Check connection pool settings

### **PLAN PHASE**
- Design caching layers (Redis, CDN, in-memory)
- Plan database indexes
- Define cache invalidation strategy
- Create performance SLAs

### **CODE PHASE**
- Implement metrics tracker service
- Create cache manager with Redis
- Optimize database queries
- Add streaming to large responses

### **COMMIT PHASE**
- Benchmark all API endpoints
- Validate cache hit ratios
- Ensure no data leaks in cache
- Create performance dashboard

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Performance metrics tracker service
- [ ] Redis cache manager implementation
- [ ] Database query optimizer utility
- [ ] Streaming API responses for lists
- [ ] Connection pool configuration
- [ ] Performance monitoring endpoints

### Code Files to Create:
```typescript
// /wedsync/src/lib/performance/metrics-tracker.ts
export class MetricsTracker {
  async trackAPICall(endpoint: string, duration: number) {
    // Track response times, cache hits, DB queries
  }
}

// /wedsync/src/lib/cache/redis-manager.ts
export class CacheManager {
  async get(key: string) { }
  async set(key: string, value: any, ttl?: number) { }
  async invalidate(pattern: string) { }
}

// /wedsync/src/lib/database/query-optimizer.ts
export class QueryOptimizer {
  async analyzeQuery(sql: string) { }
  async suggestIndexes(table: string) { }
}

// /wedsync/src/app/api/performance/metrics/route.ts
export async function GET() {
  // Return performance metrics dashboard data
}
```

### Database Migrations to Create:
```sql
-- /wedsync/supabase/migrations/[timestamp]_performance_indexes.sql
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_guest_lists_client_id ON guest_lists(client_id);
CREATE INDEX idx_journey_instances_status ON journey_instances(status);

-- Add more based on query analysis
```

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
- FROM Team A: Performance requirements for API endpoints
- FROM Team C: CDN configuration requirements

### What other teams NEED from you:
- TO Team A: Performance metrics API for client monitoring
- TO Team C: Cache invalidation webhooks
- TO Team D: Mobile-optimized API responses
- TO Team E: Performance test endpoints

---

## ⚠️ DATABASE MIGRATIONS
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-173.md
- SQL Expert will handle application and conflict resolution

---

## 🔒 SECURITY REQUIREMENTS

### Cache Security:
- [ ] No PII in cache keys
- [ ] Cache entries encrypted for sensitive data
- [ ] TTL configured to prevent stale auth data
- [ ] Cache isolation between organizations

### API Security:
- [ ] Rate limiting preserved with caching
- [ ] Authentication checked before cache
- [ ] No response caching for user-specific data without proper keys

---

## 🎭 PERFORMANCE TESTING

```javascript
// API Performance Benchmark
const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:3000/api/clients',
  connections: 10,
  duration: 10,
  headers: {
    'Authorization': 'Bearer test-token'
  }
});

instance.on('done', (results) => {
  console.assert(results.latency.p99 < 200, 'P99 latency exceeds 200ms');
  console.assert(results.throughput.average > 100, 'Throughput too low');
});
```

---

## ✅ SUCCESS CRITERIA

- [ ] All API endpoints < 200ms p99 latency
- [ ] Cache hit ratio > 80% for read operations
- [ ] Database queries use indexes (no full table scans)
- [ ] Zero N+1 query problems
- [ ] Connection pool optimized (no exhaustion)
- [ ] Monitoring dashboard shows real-time metrics

---

## 💾 WHERE TO SAVE YOUR WORK

- Services: `/wedsync/src/lib/performance/`
- Cache: `/wedsync/src/lib/cache/`
- APIs: `/wedsync/src/app/api/performance/`
- Migrations: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/tests/performance/api/`

### Team Report Output:
- `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch22/WS-173-team-b-round-1-complete.md`

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Metrics tracker implemented
- [ ] Cache manager working with Redis
- [ ] Database indexes created
- [ ] API benchmarks passing
- [ ] Performance dashboard live
- [ ] Migration request sent to SQL Expert

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY