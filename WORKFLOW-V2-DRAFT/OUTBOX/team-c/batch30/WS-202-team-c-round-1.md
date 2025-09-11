# TEAM C - ROUND 1: WS-202 - Supabase Realtime Integration - Core Subscription System

**Date:** 2025-08-26  
**Feature ID:** WS-202 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Implement comprehensive Supabase Realtime integration for instant wedding coordination updates without browser refresh  
**Context:** You are Team C working in parallel with Teams A, B, D, E. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer or venue coordinator
**I want to:** See form responses and updates from couples instantly without refreshing my browser
**So that:** I can react immediately to changes and provide better service, saving 2-3 hours per wedding on follow-ups

**Real Wedding Problem This Solves:**
A couple updates their ceremony time from 2pm to 3pm on Wednesday night. With realtime sync, the photographer immediately sees the change on their dashboard and can adjust their schedule. The venue coordinator also sees it instantly and can notify the catering team. Without this feature, suppliers might not notice the change until days later, causing coordination disasters on the wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Supabase Realtime subscriptions for critical wedding coordination tables
- Real-time form response notifications for suppliers  
- Instant client updates across supplier dashboards
- Connection state management with automatic reconnection
- Row Level Security enforcement on all realtime subscriptions

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)  
- Realtime: Supabase Realtime with WebSocket connections
- State Management: React Context with custom hooks
- Security: Row Level Security (RLS) policies on all tables

**Integration Points:**
- Database Schema: Enable REPLICA IDENTITY FULL on critical tables
- Client Management: Real-time client updates and form responses
- Journey Tracking: Live journey progress notifications
- Core Fields: Wedding details change notifications

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
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "supabase realtime-subscriptions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next app-router-websockets latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase postgres-changes latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("supabase", "", true);
await mcp__serena__get_symbols_overview("src/lib/supabase");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Supabase Realtime integration implementation"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "Realtime table configuration"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Realtime React hooks and context"
4. **nextjs-fullstack-developer** --think-ultra-hard --supabase-realtime-patterns
5. **security-compliance-officer** --think-ultra-hard --check-rls-policies
6. **test-automation-architect** --tdd-approach --realtime-testing-patterns

**AGENT INSTRUCTIONS:** "Use Ref MCP Supabase Realtime docs. Focus on wedding coordination use cases."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing Supabase client configuration
- Understand current database schema and RLS policies
- Check integration points with form system and client management
- Review similar realtime implementations for reference patterns

### **PLAN PHASE (THINK HARD!)**
- Design realtime subscription architecture for wedding coordination
- Plan React Context and hook patterns for realtime data
- Write test cases FIRST (TDD approach) for subscription management
- Plan connection state management and error handling
- Design wedding industry specific subscription patterns

### **CODE PHASE (PARALLEL AGENTS!)**
- Enable REPLICA IDENTITY on critical tables
- Create realtime subscription manager with channel factory
- Implement React hooks for realtime subscriptions
- Build connection indicator and status management
- Add wedding industry specific subscription patterns

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests and ensure >80% coverage
- Verify realtime subscriptions with integration tests
- Test connection recovery and error handling
- Generate evidence package with realtime update timings

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] **Database Configuration**: Enable REPLICA IDENTITY FULL on critical wedding tables
- [ ] **Subscription Manager**: RealtimeSubscriptionManager with channel management and cleanup
- [ ] **React Integration**: useRealtimeSubscription hook and RealtimeProvider context
- [ ] **Connection Management**: Connection state tracking with automatic reconnection logic
- [ ] **Wedding Event Types**: Subscription patterns for form responses, client updates, journey progress
- [ ] **Security Validation**: RLS policy enforcement on all realtime subscriptions  
- [ ] **Unit Tests**: >80% coverage for subscription logic and connection handling

**Key Files to Create:**
- `/wedsync/lib/realtime/subscription-manager.ts` - Core subscription management
- `/wedsync/lib/realtime/channel-factory.ts` - Channel creation and configuration  
- `/wedsync/hooks/useRealtimeSubscription.ts` - React hook for subscriptions
- `/wedsync/components/providers/RealtimeProvider.tsx` - React context provider
- `/wedsync/components/ui/RealtimeIndicator.tsx` - Connection status component
- Database migration: Enable realtime on tables

**Affected Paths:**
- `/wedsync/src/lib/supabase/client.ts` - Add realtime configuration
- `/wedsync/src/types/realtime.ts` - TypeScript interfaces for realtime system

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
- FROM Team A: API version context for realtime subscriptions - Required for version-aware subscription management
- FROM Team B: Webhook event specifications - Required for realtime webhook status integration

### What other teams NEED from you:
- TO Team A: Realtime subscription patterns - They need this for version-aware realtime channels
- TO Team B: Real-time webhook status updates - Required for their webhook monitoring system
- TO Team D: Connection status APIs - Blocking their admin dashboard realtime indicators

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ DATABASE MIGRATIONS:**
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself  
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-202.md`
- SQL Expert will handle application and conflict resolution

### MANDATORY SECURITY IMPLEMENTATION FOR REALTIME

**EVERY realtime subscription MUST enforce RLS:**
```typescript
// Secure realtime subscription with RLS enforcement
export function useRealtimeSubscription<T>(
  table: string,
  filter?: string,
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  // CRITICAL: All subscriptions must respect RLS policies
  // Users can only receive updates for data they're authorized to access
  
  const { data: userContext } = await supabase.auth.getUser();
  if (!userContext.user) {
    throw new Error('Realtime subscriptions require authenticated user');
  }
  
  // Apply supplier-specific or couple-specific filters
  const secureFilter = `${filter} AND user_id=eq.${userContext.user.id}`;
}
```

### SECURITY CHECKLIST FOR REALTIME SYSTEM
- [ ] **RLS Enforcement**: All realtime subscriptions respect existing Row Level Security policies
- [ ] **User Context Validation**: Subscriptions only receive data user is authorized to access  
- [ ] **Connection Authentication**: All realtime connections require valid authentication
- [ ] **Subscription Filtering**: User-specific filters prevent unauthorized data access
- [ ] **Channel Isolation**: Suppliers can only subscribe to their own data channels
- [ ] **Data Sanitization**: Realtime payloads sanitized to prevent XSS in UI updates
- [ ] **Rate Limiting**: Connection and subscription limits prevent realtime abuse
- [ ] **Audit Logging**: Realtime subscription events logged for security monitoring

**Critical Security Patterns:**
```typescript
// RLS-compliant realtime subscription
const channel = supabase
  .channel(`form_responses_${supplierId}`)
  .on<FormResponse>(
    'postgres_changes',
    {
      event: '*',
      schema: 'public', 
      table: 'form_responses',
      filter: `supplier_id=eq.${supplierId}` // RLS automatically enforced
    },
    (payload) => {
      // Handle authenticated, authorized updates only
      onFormResponseUpdate(payload);
    }
  );
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// SUPABASE REALTIME TESTING WITH WEDDING SCENARIOS

// 1. REALTIME FORM RESPONSE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});

// Set up realtime subscription monitoring
await page.evaluate(() => {
  window.realtimeUpdates = [];
  window.addEventListener('realtime-update', (event) => {
    window.realtimeUpdates.push(event.detail);
  });
});

// Open second tab to simulate couple submitting form
await mcp__playwright__browser_tabs({action: "new"});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/forms/wedding-details"});

// Fill and submit form as couple
await mcp__playwright__browser_fill_form({
  fields: [{
    name: 'ceremony_time',
    type: 'textbox', 
    ref: 'ceremony-time-input',
    value: '3:00 PM'
  }, {
    name: 'guest_count',
    type: 'textbox',
    ref: 'guest-count-input', 
    value: '150'
  }]
});

await mcp__playwright__browser_click({
  element: 'Submit Form Button',
  ref: 'submit-form-button'
});

// Switch back to supplier dashboard tab
await mcp__playwright__browser_tabs({action: "select", index: 0});

// Verify realtime update received within 500ms
await page.waitForFunction(() => window.realtimeUpdates.length > 0, { timeout: 1000 });
const updates = await page.evaluate(() => window.realtimeUpdates);
expect(updates[0].eventType).toBe('INSERT');
expect(updates[0].new.ceremony_time).toBe('15:00'); // Time converted to 24hr

// 2. CONNECTION STATUS TESTING
const connectionStatus = await page.evaluate(() => window.realtimeConnectionStatus);
expect(connectionStatus).toBe('connected');

// Test connection recovery
await page.evaluate(() => window.supabaseClient.realtime.disconnect());
await page.waitForFunction(() => window.realtimeConnectionStatus === 'disconnected');

// Verify automatic reconnection
await page.waitForFunction(() => window.realtimeConnectionStatus === 'connected', { timeout: 5000 });

// 3. MULTI-CLIENT UPDATE TESTING  
await mcp__playwright__browser_tabs({action: "new"});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});

// Update client info in one tab
await page.fill('[data-testid=wedding-venue-input]', 'Grand Ballroom');
await page.click('[data-testid=save-changes-button]');

// Verify other tab receives update
await mcp__playwright__browser_tabs({action: "select", index: 0}); 
await expect(page.locator('[data-testid=wedding-venue-display]')).toContainText('Grand Ballroom');
```

**REQUIRED TEST COVERAGE:**
- [ ] Real-time form response notifications appear within 500ms
- [ ] Connection indicator shows accurate status (connected/disconnected/reconnecting)
- [ ] Automatic reconnection after network interruption works reliably
- [ ] Multiple suppliers receive only their authorized data updates
- [ ] RLS policies prevent unauthorized realtime data access
- [ ] Subscription cleanup prevents memory leaks on component unmount


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

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Realtime updates appear within 500ms of database change
- [ ] Connection indicator shows accurate status with visual feedback
- [ ] Subscriptions automatically reconnect after network interruption
- [ ] Memory leaks prevented by proper subscription cleanup on unmount
- [ ] RLS policies enforced on all realtime subscriptions

### Security & Performance:
- [ ] Row Level Security prevents unauthorized realtime data access
- [ ] Performance: Realtime system uses <2% CPU during normal operation
- [ ] Subscription filtering ensures users only receive authorized data
- [ ] Connection management handles network interruptions gracefully

### Evidence Package Required:
- [ ] Realtime update timing measurements (sub-500ms requirement)
- [ ] Connection recovery test results with network simulation
- [ ] RLS policy validation showing security enforcement
- [ ] Performance benchmarks showing CPU and memory usage
- [ ] Multi-client update synchronization demonstration

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core System: `/wedsync/lib/realtime/subscription-manager.ts`
- React Integration: `/wedsync/hooks/useRealtimeSubscription.ts` 
- Provider: `/wedsync/components/providers/RealtimeProvider.tsx`
- Database: `/wedsync/supabase/migrations/[timestamp]_enable_realtime.sql`
- Tests: `/wedsync/tests/realtime/`
- Types: `/wedsync/src/types/realtime.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch30/WS-202-team-c-round-1-complete.md`
- **Include:** Feature ID (WS-202) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch30)  
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-202 | ROUND_1_COMPLETE | team-c | batch30" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify webhook delivery systems assigned to Team B (causes conflicts)
- Do NOT skip RLS policy validation - security enforcement is mandatory  
- Do NOT ignore connection cleanup - memory leaks will crash production
- REMEMBER: Teams A and B need your realtime APIs for their integration features
- WAIT: Do not start Round 2 until ALL teams complete Round 1

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY