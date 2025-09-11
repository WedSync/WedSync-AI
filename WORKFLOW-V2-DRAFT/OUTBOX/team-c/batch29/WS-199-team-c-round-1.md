# TEAM C — BATCH 29 — ROUND 1 — WS-199 — Rate Limiting System — Core Rate Limiter Engine

**Date:** 2025-01-20  
**Feature ID:** WS-199 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive rate limiting system with tiered access, endpoint-specific limits, and abuse protection for WedSync platform  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform infrastructure engineer managing API performance and abuse prevention  
**I want to:** Implement comprehensive rate limiting with tiered access, endpoint-specific limits, and abuse protection  
**So that:** I can ensure that during peak wedding season when 500+ suppliers are simultaneously managing clients, the API remains responsive for all users; prevent abuse from bad actors attempting to scrape wedding vendor data; and provide premium subscribers with higher rate limits that support their larger business operations while maintaining fair access for free tier users

**Real Wedding Problem This Solves:**
During a Saturday evening in peak wedding season, a premium photography supplier with 25 active couples is bulk-importing client information while couples are simultaneously submitting consultation forms. The rate limiting system allows the premium supplier 2000 API requests per hour versus 400 for free accounts, preventing them from overwhelming the system while ensuring fair access. Meanwhile, a competitor attempting to scrape vendor portfolios hits their 100 requests/hour limit after 15 minutes and receives a clear error message with upgrade options.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Comprehensive rate limiting with subscription tier multipliers and endpoint-specific limits
- Redis-based rate limiting store with sliding window algorithm
- Abuse detection with progressive backoff and automatic banning
- Wedding industry context with seasonal multipliers and vendor-type specific limits
- Integration with subscription tiers and billing system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Cache: Redis for rate limiting buckets
- Rate Limiting: Custom sliding window implementation

**Integration Points:**
- Middleware: Rate limiting middleware integration
- Billing: Subscription tier limits and enforcement
- Database: Rate limiting configuration and logging
- Authentication: User-based and IP-based rate limiting

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
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL rate limiting and system features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next middleware rate-limiting latest documentation"});
await mcp__Ref__ref_search_documentation({query: "node redis client commands latest documentation"});
await mcp__Ref__ref_search_documentation({query: "ratelimit sliding-window latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing rate limiting patterns:
await mcp__serena__find_symbol("ratelimit", "", true);
await mcp__serena__get_symbols_overview("lib/ratelimit");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --rate-limiting-focus --performance-first "Rate limiting system implementation"
2. **security-compliance-officer** --abuse-prevention --ddos-protection "Rate limiting security and abuse prevention"
3. **nextjs-fullstack-developer** --middleware-integration --api-protection "Next.js rate limiting middleware"
4. **supabase-specialist** --database-integration --subscription-tiers "Supabase integration and billing tiers"
5. **test-automation-architect** --load-testing --rate-limit-validation "Rate limiting test coverage"
6. **code-quality-guardian** --performance-patterns --caching-standards "Rate limiting code quality"

**AGENT INSTRUCTIONS:** "Use Ref MCP docs for Redis and rate limiting. Focus on performance and scalability."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing rate limiting implementations in middleware
- Review Redis configuration and caching patterns
- Check billing system integration for subscription tiers
- Understand current API usage patterns and limits

### **PLAN PHASE (THINK HARD!)**
- Design sliding window rate limiting algorithm
- Plan Redis-based storage with efficient data structures
- Design subscription tier multiplier system
- Plan abuse detection and progressive backoff

### **CODE PHASE (PARALLEL AGENTS!)**
- Core rate limiter with sliding window algorithm
- Redis store implementation for rate limiting data
- Subscription tier configuration and enforcement
- Abuse detection with automatic banning
- Rate limiting middleware integration

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Core rate limiter in `/wedsync/lib/rate-limiting/rate-limiter.ts`
- [ ] Redis store implementation in `/wedsync/lib/rate-limiting/redis-store.ts`
- [ ] Tier configuration in `/wedsync/lib/rate-limiting/tier-configuration.ts`
- [ ] Abuse detection in `/wedsync/lib/rate-limiting/abuse-detection.ts`
- [ ] Rate limit middleware in `/wedsync/middleware/rate-limit.ts`
- [ ] Database migration for rate limiting configuration
- [ ] Unit tests with >80% coverage for all rate limiting components
- [ ] Load testing with Playwright for rate limit validation

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
- FROM Team A: Core middleware foundation - Required for rate limiting middleware integration
- FROM Team B: Error handling system - Need standardized rate limit error responses
- FROM Team D: API route patterns - Required for endpoint-specific rate limiting
- FROM Team E: Billing tier integration - Dependency for subscription-based limits

### What other teams NEED from you:
- TO Team A: Rate limiting configuration - They need this for middleware chain integration
- TO Team B: Rate limit error format - Blocking their error handling system
- TO Team D: Rate limiting headers - They need this for API response headers
- TO Team E: Usage tracking data - Required for their billing and analytics features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY rate limiter MUST implement:**

```typescript
// ✅ MANDATORY PATTERN - Secure rate limiting:
import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  constructor(private config: RateLimitConfig, private store: RedisStore) {}

  async isAllowed(
    identifier: string, 
    request: NextRequest
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    // Get user context for tier-based limits
    const userId = request.headers.get('x-user-id');
    const subscription = await this.getUserSubscription(userId);
    
    // Calculate tier-specific limits
    const limits = this.getTierLimits(subscription?.tier || 'free');
    
    // Apply seasonal multipliers for wedding industry
    const seasonalLimits = this.applySeasonalMultipliers(limits);
    
    // Check sliding window
    const result = await this.store.checkLimit(
      identifier, 
      seasonalLimits,
      this.config.window
    );
    
    // Log for abuse detection
    if (!result.allowed) {
      await this.logRateLimitViolation(identifier, request);
    }
    
    return result;
  }
}
```

### SECURITY CHECKLIST FOR RATE LIMITING
- [ ] **Multi-layer Identification**: Rate limit by user ID, IP address, and API key
- [ ] **Abuse Detection**: Monitor for suspicious patterns and progressive penalties
- [ ] **DDoS Protection**: Implement IP-based rate limiting for unauthenticated requests
- [ ] **Subscription Enforcement**: Verify subscription tier before applying higher limits
- [ ] **Bypass Protection**: Prevent rate limit bypass through multiple identifiers
- [ ] **Logging**: Log all rate limit violations for security analysis
- [ ] **Graceful Degradation**: Maintain service availability under attack
- [ ] **Cache Security**: Secure Redis connection and prevent data exposure

---

## ⚠️ DATABASE MIGRATIONS:

```sql
-- CREATE migration files in /wedsync/supabase/migrations/
-- DO NOT run migrations yourself
-- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-199.md

-- Rate limiting configuration
CREATE TABLE rate_limit_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_pattern TEXT UNIQUE NOT NULL,
  
  -- Rate limiting rules
  requests_per_minute INTEGER NOT NULL DEFAULT 60,
  requests_per_hour INTEGER NOT NULL DEFAULT 1000,
  requests_per_day INTEGER NOT NULL DEFAULT 10000,
  burst_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Subscription tier multipliers
  free_tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
  basic_tier_multiplier DECIMAL(3,2) DEFAULT 2.0,
  premium_tier_multiplier DECIMAL(3,2) DEFAULT 5.0,
  enterprise_tier_multiplier DECIMAL(3,2) DEFAULT 10.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// RATE LIMITING TESTING WITH PLAYWRIGHT MCP

// 1. RATE LIMIT ENFORCEMENT TESTING
const rateLimitTest = async () => {
  const responses = [];
  for (let i = 0; i < 105; i++) {
    const response = await fetch('http://localhost:3000/api/test-endpoint', {
      method: 'GET',
      headers: { 'x-test-user': 'free-tier-user' }
    });
    responses.push({
      status: response.status,
      remaining: response.headers.get('x-ratelimit-remaining'),
      resetTime: response.headers.get('x-ratelimit-reset')
    });
  }
  return responses;
};

// 2. SUBSCRIPTION TIER LIMIT VALIDATION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test different subscription tiers
    return Promise.all([
      fetch('/api/test', { headers: { 'x-subscription': 'free' } }),
      fetch('/api/test', { headers: { 'x-subscription': 'premium' } })
    ]).then(responses => responses.map(r => ({
      status: r.status,
      headers: Object.fromEntries(r.headers.entries())
    })));
  }`
});

// 3. ABUSE DETECTION VALIDATION
const abuseTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate rapid requests from same IP
    const promises = [];
    for (let i = 0; i < 200; i++) {
      promises.push(fetch('/api/suppliers', { method: 'GET' }));
    }
    return Promise.all(promises);
  }`
});

// 4. PERFORMANCE UNDER LOAD
const loadTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const startTime = performance.now();
    return fetch('/api/rate-limited-endpoint')
      .then(() => performance.now() - startTime);
  }`
});
```



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

### REQUIRED TEST COVERAGE:
- [ ] Rate limit enforcement with proper HTTP status codes and headers
- [ ] Subscription tier multipliers working correctly
- [ ] Abuse detection and progressive penalties
- [ ] Performance impact under normal and high load
- [ ] Redis store reliability and data consistency
- [ ] Graceful degradation under cache failures

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Core rate limiter with sliding window algorithm
- [ ] Redis-based store with efficient data structures
- [ ] Subscription tier configuration and enforcement
- [ ] Abuse detection with automatic penalties
- [ ] Rate limiting middleware integration
- [ ] All tests written FIRST and passing (>80% coverage)
- [ ] Load tests validating performance under high traffic
- [ ] Zero TypeScript errors in rate limiting code
- [ ] Redis connection properly secured and monitored

### Integration & Performance:
- [ ] Rate limiting adds <5ms latency to requests
- [ ] Subscription tier limits properly enforced
- [ ] Rate limit headers included in all responses
- [ ] Abuse detection working with real traffic patterns
- [ ] Redis store handles concurrent requests correctly
- [ ] Works with all API endpoints and middleware

### Evidence Package Required:
- [ ] Load testing results showing rate limit enforcement
- [ ] Subscription tier validation with different limits
- [ ] Abuse detection log entries with penalties applied
- [ ] Performance metrics under normal and high load
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core: `/wedsync/lib/rate-limiting/rate-limiter.ts`
- Store: `/wedsync/lib/rate-limiting/redis-store.ts`
- Config: `/wedsync/lib/rate-limiting/tier-configuration.ts`
- Abuse: `/wedsync/lib/rate-limiting/abuse-detection.ts`
- Middleware: `/wedsync/middleware/rate-limit.ts`
- Tests: `/wedsync/tests/rate-limiting/`
- Migration: `/wedsync/supabase/migrations/[timestamp]_rate_limiting_system.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch29/WS-199-team-c-round-1-complete.md`
- **Include:** Feature ID (WS-199) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-199 | ROUND_1_COMPLETE | team-c | batch29" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT implement rate limiting without proper Redis configuration
- Do NOT skip subscription tier validation - this affects billing
- Do NOT ignore performance impact - rate limiting affects all requests
- REMEMBER: All 5 teams work in PARALLEL - coordinate rate limiting integration

---

**🚨 OVERLAP GUARD: You are responsible for CORE RATE LIMITING ENGINE only. Do not implement middleware integration details (Team A), error handling responses (Team B), or API route integration patterns (Team D).**

END OF ROUND PROMPT - EXECUTE IMMEDIATELY