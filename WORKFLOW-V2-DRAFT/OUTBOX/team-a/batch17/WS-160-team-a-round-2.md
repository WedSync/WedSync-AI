# TEAM A - ROUND 2: WS-160 - Master Timeline - Advanced Timeline Builder UI

**Date:** 2025-01-25  
**Feature ID:** WS-160 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build advanced timeline builder interface with drag-drop scheduling and conflict detection  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating their wedding day schedule
**I want to:** Create a comprehensive timeline from getting ready to send-off with automatic time calculations and conflict detection
**So that:** All suppliers and helpers know exactly when and where to be, preventing delays and ensuring smooth transitions between events

**Real Wedding Problem This Solves:**
A couple currently emails separate timeline documents to their photographer, DJ, caterer, and officiant, leading to conflicting schedules. With this feature, they create one master timeline where "Cocktail Hour 5:00pm-6:00pm" automatically calculates that "Reception Setup" must complete by 4:45pm with buffer time. All suppliers see the same synchronized schedule, eliminating the "I thought ceremony started at 4:30pm" confusion that causes wedding delays.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build interactive timeline builder with drag-drop functionality
- Implement automatic time calculation and conflict detection
- Create timeline template library with pre-built wedding day schedules
- Build real-time collaboration features for multiple users editing
- Implement timeline export to multiple formats (PDF, calendar)
- Create mobile-responsive timeline interface

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Drag-Drop: React DnD, Framer Motion for animations
- Calendar: React Big Calendar, date-fns for calculations
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- WS-159 Task Tracking: Links timeline events to tasks
- WS-161 Supplier Schedules: Provides master timeline data
- Existing wedding profile data for couple preferences
- Supplier management system for vendor assignments

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
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "react beautiful dnd drag-drop timeline latest documentation"});
await mcp__Ref__ref_search_documentation({query: "motion animations drag-gestures latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react big calendar calendar-views timeline latest documentation"});
await mcp__Ref__ref_search_documentation({query: "date fns date-calculations latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss timeline layouts responsive latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("TimelineBuilder", "", true);
await mcp__serena__get_symbols_overview("/src/components/timeline/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Master timeline UI coordination"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Timeline builder and drag-drop interfaces"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Timeline data management"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-device --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant timeline and calendar files
- Understand existing drag-drop patterns in codebase
- Check integration points with task system
- Review similar timeline implementations
- Continue until you FULLY understand the timeline requirements

### **PLAN PHASE (THINK HARD!)**
- Create detailed timeline builder UI architecture
- Write test cases FIRST (TDD) including drag-drop scenarios
- Plan conflict detection algorithms
- Consider timeline template patterns
- Don't rush - proper planning prevents complex UI issues

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation including drag-drop tests
- Build TimelineBuilder main component with drag-drop
- Create TimelineEvent components with conflict detection
- Implement AutoTimeCalculator service
- Build TimelineTemplateLibrary component
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including drag-drop functionality
- Verify conflict detection working
- Test timeline calculations accuracy
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Timeline Builder):
- [ ] TimelineBuilder component with drag-drop functionality
- [ ] TimelineEvent components with time conflict detection
- [ ] AutoTimeCalculator service for automatic scheduling
- [ ] TimelineTemplateLibrary with pre-built wedding schedules
- [ ] ConflictDetector component with visual warnings
- [ ] Timeline export functionality (PDF, CSV, calendar)
- [ ] Real-time collaboration features for multiple editors
- [ ] Unit tests with >80% coverage including drag-drop scenarios
- [ ] Advanced Playwright tests for timeline interactions

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Timeline data APIs and event management - Required for timeline CRUD operations
- FROM Team C: Real-time collaboration features - Dependency for multi-user editing

### What other teams NEED from you:
- TO Team B: Timeline UI component interfaces - They need this for API design
- TO Team D: Timeline mobile interface patterns - Blocking their mobile timeline
- TO Team E: Timeline component testing contracts - Required for their test suite

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION

**Timeline-specific security considerations:**

```typescript
// ✅ TIMELINE SECURITY PATTERN:
import { validateTimelineAccess } from '@/lib/security/timeline-validation';

export async function TimelineBuilder({ coupleId }: { coupleId: string }) {
  // Verify user can access this couple's timeline
  const hasAccess = await validateTimelineAccess(coupleId);
  if (!hasAccess) {
    return <UnauthorizedAccess />;
  }

  const handleEventUpdate = async (eventData: TimelineEvent) => {
    // Sanitize timeline event data
    const sanitizedEvent = {
      ...eventData,
      title: sanitizeString(eventData.title),
      description: sanitizeString(eventData.description),
      location: sanitizeString(eventData.location)
    };

    // Validate time constraints
    if (!isValidTimeRange(sanitizedEvent.startTime, sanitizedEvent.endTime)) {
      throw new Error('Invalid time range');
    }

    // Check for scheduling conflicts
    const conflicts = await detectTimelineConflicts(sanitizedEvent);
    if (conflicts.length > 0) {
      setConflictWarnings(conflicts);
    }
  };
}
```

### SECURITY CHECKLIST FOR TIMELINE FEATURES

- [ ] **Timeline Access Control**: Verify user can access wedding timeline
- [ ] **Event Data Validation**: Sanitize all timeline event inputs
- [ ] **Time Validation**: Validate all time ranges and calculations
- [ ] **Supplier Access**: Control which suppliers can view timeline sections
- [ ] **Export Security**: Validate timeline export permissions
- [ ] **Real-time Security**: Secure collaborative editing sessions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ADVANCED TIMELINE INTERACTION TESTING:**

```javascript
// COMPREHENSIVE TIMELINE BUILDER TESTING

describe('Timeline Builder Advanced Interactions', () => {
  test('Drag and drop timeline event', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/builder"});
    
    // Wait for timeline to load
    await mcp__playwright__browser_wait_for({text: "Timeline Builder"});
    
    // Drag ceremony event to new time
    await mcp__playwright__browser_drag({
      startElement: "Ceremony Event",
      startRef: "[data-testid=ceremony-event]",
      endElement: "4:00 PM Slot",
      endRef: "[data-timeline-time='16:00']"
    });
    
    // Verify automatic time calculations
    await mcp__playwright__browser_wait_for({text: "Cocktail Hour: 4:30 PM"});
    await mcp__playwright__browser_wait_for({text: "Reception: 6:00 PM"});
  });

  test('Conflict detection and warnings', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/builder"});
    
    // Create conflicting events
    await mcp__playwright__browser_click({element: "Add Event", ref: "[data-testid=add-event]"});
    await mcp__playwright__browser_type({
      element: "Event Title",
      ref: "[data-testid=event-title]",
      text: "Photo Session"
    });
    
    // Set conflicting time
    await mcp__playwright__browser_click({element: "Time Slot", ref: "[data-timeline-time='16:00']"});
    
    // Verify conflict warning appears
    await mcp__playwright__browser_wait_for({text: "Schedule Conflict Detected"});
    
    const conflictWarning = await mcp__playwright__browser_snapshot();
    expect(conflictWarning).toContain("conflict-warning");
  });

  test('Timeline template library', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/builder"});
    
    // Open template library
    await mcp__playwright__browser_click({element: "Template Library", ref: "[data-testid=template-library]"});
    
    // Select traditional wedding template
    await mcp__playwright__browser_click({
      element: "Traditional Wedding Template",
      ref: "[data-testid=traditional-template]"
    });
    
    // Verify template loads with events
    await mcp__playwright__browser_wait_for({text: "Ceremony"});
    await mcp__playwright__browser_wait_for({text: "Cocktail Hour"});
    await mcp__playwright__browser_wait_for({text: "Reception"});
    
    // Verify automatic timing
    const timelineSnapshot = await mcp__playwright__browser_snapshot();
    expect(timelineSnapshot).toContain("timeline-event");
  });

  test('Real-time collaboration', async () => {
    // User 1: Open timeline
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/builder"});
    
    // User 2: Open same timeline in new tab
    await mcp__playwright__browser_tab_new({url: "/timeline/builder"});
    
    // User 1: Make change
    await mcp__playwright__browser_tab_select({index: 0});
    await mcp__playwright__browser_click({element: "Edit Ceremony", ref: "[data-testid=edit-ceremony]"});
    await mcp__playwright__browser_type({
      element: "Start Time",
      ref: "[data-testid=start-time]",
      text: "4:30 PM"
    });
    
    // User 2: Verify real-time update
    await mcp__playwright__browser_tab_select({index: 1});
    await mcp__playwright__browser_wait_for({text: "4:30 PM"});
  });

  test('Timeline export functionality', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/timeline/builder"});
    
    // Create complete timeline
    await mcp__playwright__browser_wait_for({text: "Timeline Builder"});
    
    // Export to PDF
    await mcp__playwright__browser_click({element: "Export", ref: "[data-testid=export-timeline]"});
    await mcp__playwright__browser_click({element: "PDF Export", ref: "[data-testid=export-pdf]"});
    
    // Verify download initiated
    await mcp__playwright__browser_wait_for({text: "Timeline exported successfully"});
  });
});
```

**REQUIRED ADVANCED TEST COVERAGE:**
- [ ] Drag-drop functionality for all timeline events
- [ ] Automatic time calculation accuracy
- [ ] Conflict detection and warning system
- [ ] Template library functionality
- [ ] Real-time collaboration across multiple users
- [ ] Timeline export in multiple formats
- [ ] Mobile-responsive timeline interface
- [ ] Accessibility for timeline navigation


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

**You CANNOT claim completion unless:**

### Advanced UI Implementation:
- [ ] All deliverables for this round complete
- [ ] Drag-drop functionality working smoothly
- [ ] Conflict detection accurately identifying issues
- [ ] Automatic time calculations correct
- [ ] Template library fully functional
- [ ] Real-time collaboration working

### Technical Excellence:
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests covering all drag-drop interactions
- [ ] Zero TypeScript errors
- [ ] Performance optimized for complex timelines
- [ ] Accessibility standards met

### Evidence Package Required:
- [ ] Drag-drop interaction demonstrations
- [ ] Conflict detection proof
- [ ] Template library functionality proof
- [ ] Real-time collaboration evidence
- [ ] Export functionality validation
- [ ] Performance metrics for complex timelines

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Timeline UI: `/wedsync/src/components/timeline/`
- Timeline Services: `/wedsync/src/lib/services/timelineService.ts`
- Timeline Types: `/wedsync/src/types/timeline.ts`
- Tests: `/wedsync/tests/timeline/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch17/WS-160-team-a-round-2-complete.md`
- **Include:** Feature ID (WS-160) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-160 | ROUND_2_COMPLETE | team-a | batch17" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip drag-drop testing - it's complex and prone to issues
- Do NOT ignore conflict detection accuracy
- Do NOT claim completion without real-time collaboration working
- REMEMBER: All 5 teams work in PARALLEL - coordinate through dependencies

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Advanced timeline functionality working
- [ ] Drag-drop interactions smooth and accurate
- [ ] Conflict detection identifying issues correctly
- [ ] Template library fully functional
- [ ] Real-time collaboration operational
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY