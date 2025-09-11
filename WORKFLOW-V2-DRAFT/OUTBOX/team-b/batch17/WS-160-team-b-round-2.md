# TEAM B - ROUND 2: WS-160 - Master Timeline - Backend APIs & Data Management

**Date:** 2025-01-25  
**Feature ID:** WS-160 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build robust timeline management APIs with conflict detection and automatic scheduling logic  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating their wedding day schedule
**I want to:** Create a comprehensive timeline from getting ready to send-off with automatic time calculations and conflict detection
**So that:** All suppliers and helpers know exactly when and where to be, preventing delays and ensuring smooth transitions between events

**Real Wedding Problem This Solves:**
A couple currently emails separate timeline documents to their photographer, DJ, caterer, and officiant, leading to conflicting schedules. This backend system ensures one master timeline where "Cocktail Hour 5:00pm-6:00pm" automatically calculates that "Reception Setup" must complete by 4:45pm with buffer time, preventing the coordination chaos that causes wedding day delays.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build comprehensive timeline CRUD APIs with validation
- Implement automatic time calculation algorithms
- Create conflict detection service with overlap analysis  
- Build timeline template management system
- Implement real-time collaboration backend
- Create timeline export service for multiple formats

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Real-time: Supabase Realtime for collaborative editing
- Calculations: date-fns for time logic
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- WS-159 Task Tracking: Timeline events link to tasks
- WS-161 Supplier Schedules: Provides data for supplier views
- Wedding profile data for couple preferences
- Supplier management system for vendor assignments


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
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next route-handlers api-routes latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls realtime latest documentation"});
await mcp__Ref__ref_search_documentation({query: "date fns date-calculations intervals latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns:
await mcp__serena__find_symbol("timelineService", "", true);
await mcp__serena__get_symbols_overview("/src/app/api/timeline/");
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Timeline Backend & Business Logic):
- [ ] `/api/timeline/[id]` - CRUD operations for timeline management
- [ ] `/api/timeline/[id]/events` - Timeline event management APIs
- [ ] `/api/timeline/[id]/conflicts` - Conflict detection API
- [ ] `/api/timeline/templates` - Template management APIs
- [ ] Auto-scheduling service with buffer time calculations
- [ ] Real-time collaboration backend for multiple editors
- [ ] Timeline export service (PDF, calendar, CSV)
- [ ] Database migrations for timeline schema
- [ ] Unit tests with >80% coverage
- [ ] API integration tests

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION

```typescript
// ✅ TIMELINE API SECURITY PATTERN:
import { withSecureValidation } from '@/lib/validation/middleware';
import { timelineEventSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  timelineEventSchema.extend({
    timeline_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    event_type: z.enum(['ceremony', 'reception', 'photos', 'setup', 'other']),
    location: z.string().max(500).optional(),
    description: z.string().max(1000).optional()
  }).refine(data => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be after start time"
  }),
  async (request: NextRequest, validatedData) => {
    // Verify user owns this timeline
    const userId = request.headers.get('x-user-id');
    const timeline = await verifyTimelineOwnership(validatedData.timeline_id, userId);
    
    // Check for conflicts
    const conflicts = await detectTimelineConflicts(validatedData);
    
    // Create timeline event with validation
    const event = await createTimelineEvent(validatedData);
    return NextResponse.json({ event, conflicts });
  }
);
```

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Timeline APIs: `/wedsync/src/app/api/timeline/`
- Timeline Services: `/wedsync/src/lib/services/timelineService.ts`
- Conflict Detection: `/wedsync/src/lib/services/conflictDetectionService.ts`
- Tests: `/wedsync/tests/api/timeline/`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch17/WS-160-team-b-round-2-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY