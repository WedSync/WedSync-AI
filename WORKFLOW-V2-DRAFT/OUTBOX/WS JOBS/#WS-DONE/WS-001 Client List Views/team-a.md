# TEAM A - ROUND 1: WS-001 - Client List Views - Frontend/UI Components

**Date:** 2025-08-29  
**Feature ID:** WS-001 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Create comprehensive client list view system with 4 view types (list, grid, calendar, kanban) and advanced filtering  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/clients/
ls -la $WS_ROOT/wedsync/src/app/\(dashboard\)/clients/page.tsx
cat $WS_ROOT/wedsync/src/components/clients/ClientListView.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/clients
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## <¯ USER STORY & WEDDING CONTEXT

**As a:** Wedding photographer managing 50+ couples annually
**I want to:** View and organize all my clients in different formats (list, grid, calendar, kanban)
**So that:** I can quickly find specific couples and manage 50+ weddings without losing track of any client

**Real Wedding Problem This Solves:**
A photographer managing 40 weddings per year currently uses spreadsheets and loses 2 hours weekly searching for client info across multiple tools. With this feature, they see all clients in their preferred view (visual grid with photos or data table) and instantly filter by wedding date, status, or tags - saving 100+ hours annually on admin work.

---

## =Ú STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

**  CRITICAL: Load navigation and security requirements from centralized templates:**

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");

// This contains:
// - Navigation Integration Requirements (MANDATORY for all UI features)
// - Security Requirements (MANDATORY for all API routes)  
// - UI Technology Stack requirements
// - All centralized checklists
```

## >à STEP 2A: SEQUENTIAL THINKING FOR COMPLEX UI ARCHITECTURE

### Frontend-Specific Sequential Thinking Analysis

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This client list system requires 4 different view components (list, grid, calendar, kanban), each with unique layouts and interaction patterns. List view needs virtual scrolling for 500+ clients, grid view needs lazy loading images, calendar view needs date navigation, and kanban needs drag-drop. Each view shares the same data but presents it differently.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management complexity: Client data needs global state for sharing between views, filter state must persist across view switches, search needs debouncing, sorting affects all views, bulk selection state needs to survive view changes. Consider using Zustand for global state with react-query for server state caching.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: ClientViewContainer (manages state/routing), ClientListView (virtual scrolling table), ClientGridView (responsive cards), ClientCalendarView (date-based layout), ClientKanbanView (drag-drop columns), ClientViewSwitcher (tab navigation), ClientFilters (search/filter controls), ClientBulkActions (selection operations).",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding photographer UX needs: Photographers work on desktop for admin but check on mobile during events. Need responsive breakpoints, touch-friendly interactions, fast search (photographers remember couple names), visual grid with photos for quick recognition, calendar view for scheduling conflicts.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance considerations: Virtual scrolling essential for 500+ clients, image lazy loading for grid view, debounced search to prevent API spam, view preferences in localStorage, optimistic UI updates for filters, pagination for initial load performance.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## =Ú STEP 2B: ENHANCED SERENA + REF SETUP (Frontend Focus)

### A. SERENA UI PATTERN DISCOVERY
```typescript
// Activate Serena for semantic code understanding
await mcp__serena__activate_project("wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Find existing UI patterns to follow
await mcp__serena__search_for_pattern("component list grid view table");
await mcp__serena__find_symbol("ListView GridView ViewSwitcher", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/ui/");

// Analyze similar features for consistency
await mcp__serena__find_referencing_symbols("useDebounce useState useEffect");
```

### B. UI STYLE GUIDES & UNTITLED UI/MAGIC UI SETUP
```typescript
// MANDATORY FIRST - Load correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Load supporting documentation via Ref MCP:
# - "Untitled UI table components patterns"
# - "Magic UI list animations card effects"
# - "React Window virtual scrolling"
# - "Next.js app-router components"
# - "Tailwind CSS responsive-design grid"
```

## <¯ SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] ClientListView component with virtual scrolling (react-window)
- [ ] ClientGridView component with lazy loading images
- [ ] ClientViewSwitcher component with tab navigation
- [ ] ClientFilters component with search and filter controls
- [ ] Main clients page with navigation integration
- [ ] Zustand store for client list state management
- [ ] Unit tests with >80% coverage
- [ ] Evidence package proving completion

### Component Specifications:
- [ ] **ClientListView**: Virtual scrolling table, sortable columns, bulk selection
- [ ] **ClientGridView**: Responsive card grid, lazy loaded images, hover effects
- [ ] **ClientViewSwitcher**: Tab-based navigation, keyboard shortcuts (1-4)
- [ ] **ClientFilters**: Debounced search, status filters, date range picker
- [ ] **Navigation Integration**: Must integrate into dashboard layout

## = DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: API endpoints (/api/clients GET, preferences PATCH) - Required for data fetching
- FROM Team B: TypeScript interfaces (ClientListItem, GetClientsRequest) - Required for typing

### What other teams NEED from you:
- TO Team E: Component interfaces and test requirements - Blocking their test creation
- TO Teams B/C: UI behavior specifications - Needed for API contract design

## >í CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### EVERY UI FEATURE MUST INTEGRATE INTO PARENT NAVIGATION

**Dashboard Integration:**
```typescript
// MUST update main dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
// Add navigation item following existing pattern:
{
  title: "Clients",
  href: "/dashboard/clients",
  icon: Users
}
```

**Client Page Integration:**
```typescript
// MUST create proper page structure
// File: $WS_ROOT/wedsync/src/app/(dashboard)/clients/page.tsx
// Include breadcrumbs, proper layout, mobile navigation
```

## = SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Frontend Security Checklist:
- [ ] **Input sanitization** - All search inputs must use secure validation
- [ ] **XSS prevention** - HTML encode all client data display
- [ ] **CSRF protection** - Use Next.js built-in protection
- [ ] **Error handling** - Never expose API errors to user
- [ ] **Authentication check** - Verify user session before rendering
- [ ] **Rate limiting awareness** - Handle API rate limit responses

## =¾ WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `$WS_ROOT/wedsync/src/components/clients/`
- Main page: `$WS_ROOT/wedsync/src/app/(dashboard)/clients/page.tsx`
- Store: `$WS_ROOT/wedsync/src/lib/stores/clientListStore.ts`
- Types: `$WS_ROOT/wedsync/src/types/client.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/components/clients/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-001-client-list-views-team-a-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

## <¨ UI IMPLEMENTATION RULES (WITH SERENA VALIDATION)

**=¨ UI TECHNOLOGY STACK - MANDATORY:**
- **Untitled UI**: Primary component library (Table, Card, Button, Input components)
- **Magic UI**: Animations and visual enhancements (CardHover, FadeIn effects)
- **Tailwind CSS 4.1.11**: Utility-first CSS classes only
- **Lucide React**: Icons ONLY (Users, Grid, List, Calendar icons)

**L DO NOT USE:**
- Radix UI, shadcn/ui, Catalyst UI, or any other component libraries
- Custom animations (use Magic UI instead)

## <­ PLAYWRIGHT TESTING REQUIREMENTS

```javascript
// MANDATORY ACCESSIBILITY-FIRST TESTING:

// 1. View switching functionality
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. Test all 4 view types
const views = ['list', 'grid', 'calendar', 'kanban'];
for (const view of views) {
  await mcp__playwright__browser_click({
    element: `${view} view button`,
    ref: `[data-testid="view-${view}"]`
  });
  await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `client-${view}-view.png`});
}

// 3. Search and filter testing
await mcp__playwright__browser_type({
  element: 'Search input',
  ref: '[data-testid="client-search"]',
  text: 'Smith'
});
await mcp__playwright__browser_wait_for({text: 'Filtered results'});

// 4. Mobile responsiveness
const breakpoints = [375, 768, 1920];
for (const width of breakpoints) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_snapshot();
}
```

##  SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All 4 view types render correctly (show screenshots)
- [ ] Virtual scrolling handles 500+ clients smoothly (show performance metrics)
- [ ] Search filters results in under 200ms (show timing measurements)
- [ ] View preference persists across sessions (show localStorage evidence)
- [ ] Navigation integration complete (show navigation structure)
- [ ] Zero TypeScript errors (show typecheck output)

### Code Quality Evidence:
```typescript
// Include actual code showing pattern compliance
// Example from your ClientListView implementation:
export const ClientListView = ({ clients, onSelectClient }: ClientListViewProps) => {
  // Following pattern from existing components
  // Serena confirmed this matches Table component pattern
  return (
    <div className="overflow-hidden">
      <FixedSizeList height={600} itemCount={clients.length}>
        {/* Virtual scrolling implementation */}
      </FixedSizeList>
    </div>
  );
}
```

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const metrics = {
  initialLoad: "< 800ms",  // Target: <1s
  viewSwitch: "< 100ms",   // Target: <200ms
  searchResponse: "< 150ms", // Target: <200ms
  virtualScroll: "60fps"   // Target: smooth scrolling
}
```

## =Ê MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-001 and update:
```json
{
  "id": "WS-001-client-list-views",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-08-29",
  "testing_status": "needs-testing",
  "team": "Team A",
  "notes": "Frontend components completed in Round 1. All view types implemented with navigation integration."
}
```

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY