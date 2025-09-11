# TEAM A - ROUND 1: WS-200 - Advanced Search Filters System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive search and filtering UI components for wedding data across clients, suppliers, and events
**FEATURE ID:** WS-200 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding professional search workflows and multi-entity filtering complexity

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/search/
cat $WS_ROOT/wedsync/src/components/search/AdvancedSearchFilters.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test search-filters
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query search-related components and patterns
await mcp__serena__search_for_pattern("search|filter|SearchBox|FilterComponent");
await mcp__serena__find_symbol("SearchInput", "", true);
await mcp__serena__get_symbols_overview("src/components/ui/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the SaaS UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for search/filtering components
mcp__Ref__ref_search_documentation("React advanced search components filtering UI patterns Untitled UI")
mcp__Ref__ref_search_documentation("TypeScript search interface filtering state management")
mcp__Ref__ref_search_documentation("Next.js 15 server components search API integration")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX SEARCH SYSTEM

### Use Sequential Thinking MCP for Search Architecture
```typescript
// Complex search system requires systematic analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Advanced search system for wedding data needs: 1) Multi-entity search (clients, suppliers, events), 2) Complex filtering with date ranges, status combinations, tags, 3) Saved search functionality, 4) Real-time filtering as user types, 5) Wedding-specific filters like venue type, guest count, budget ranges. The UI must be intuitive for busy wedding planners managing 50+ concurrent weddings.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: SearchFiltersContainer (main component), QuickFilters (one-click common searches), AdvancedFilterPanel (expandable detailed filters), SavedSearches (stored filter combinations), FilterChips (active filter display), SearchResultsGrid (filtered results display). State management with Zustand for complex filter state and real-time updates.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific filter categories needed: Client filters (wedding date, budget range, venue type, guest count, status), Supplier filters (category, availability, rating, location), Event filters (date ranges, status, venue type, season), Task filters (due dates, assignment, completion status). Each category needs different UI patterns - date pickers, range sliders, multi-select dropdowns.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance considerations: Debounced search input to avoid excessive API calls, virtual scrolling for large result sets, optimistic UI updates, pagination for search results, filter state persistence in URL for bookmarkable searches, loading states and skeleton components during search execution.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile-first responsive design: Collapsible filter panels on mobile, touch-friendly filter controls, bottom sheet filter modal on small screens, swipe gestures for filter chips, optimized for one-handed use during venue visits. Accessibility: proper ARIA labels, keyboard navigation, screen reader support for complex filter combinations.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track search component dependencies and integration points
2. **react-ui-specialist** - Ensure Untitled UI pattern compliance and responsive design
3. **security-compliance-officer** - Validate input sanitization and search injection prevention
4. **code-quality-guardian** - Maintain TypeScript strict typing and performance standards
5. **test-automation-architect** - Browser MCP + Playwright comprehensive search testing
6. **documentation-chronicler** - Evidence-based documentation with UI screenshots

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### SEARCH INPUT SECURITY CHECKLIST:
- [ ] **Input sanitization** - All search terms cleaned with DOMPurify
- [ ] **SQL injection prevention** - Parameterized queries only
- [ ] **XSS prevention** - HTML encode all search result displays
- [ ] **Search injection protection** - Validate search operators and syntax
- [ ] **Rate limiting** - Prevent search abuse with rateLimitService
- [ ] **Authentication check** - Verify user access to searched entities
- [ ] **Data access control** - Filter results by user permissions
- [ ] **Search logging** - Audit trail for sensitive searches

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone search without navigation integration**
**✅ MANDATORY: Advanced search must integrate with existing navigation patterns**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Global search header integration
- [ ] Section-specific search within dashboards
- [ ] Search result navigation breadcrumbs
- [ ] Deep-link support for search URLs
- [ ] Mobile navigation drawer search access
- [ ] Keyboard shortcuts for power users (Cmd+K, Cmd+F)

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance
- Component performance <200ms

### SEARCH UI PATTERNS TO IMPLEMENT:
1. **SearchFiltersContainer** - Main search interface with collapsible sections
2. **QuickFilters** - One-click buttons for common searches ("This Week's Weddings", "Overdue Tasks")
3. **AdvancedFilterPanel** - Expandable panel with detailed filter controls
4. **FilterChips** - Visual representation of active filters with remove buttons
5. **SavedSearches** - Dropdown of previously saved filter combinations
6. **SearchResultsGrid** - Responsive grid displaying filtered results
7. **FilterPresets** - Wedding-specific filter templates ("Summer Weddings", "Venue Issues")

### RESPONSIVE DESIGN REQUIREMENTS:
- **Mobile (375px)**: Bottom sheet filter modal, stacked filter chips
- **Tablet (768px)**: Side panel filters, grid view results
- **Desktop (1200px+)**: Full filter sidebar, advanced grid with sorting

## 📋 TECHNICAL SPECIFICATION: WS-200 DETAILS

**Wedding Professional User Story:**
A wedding planner managing 50+ weddings needs to quickly find "all outdoor weddings in June with photography supplier issues" or "all clients with pending menu selections." They require multiple filter combinations saved as presets for peak season efficiency.

**Core Search Features Required:**
- **Multi-entity search**: Clients, suppliers, events, tasks in unified interface
- **Advanced filters**: Date ranges, status combinations, tag-based filtering
- **Saved searches**: Store frequently used filter combinations
- **Quick filters**: One-click common searches
- **Real-time filtering**: Results update as user types/selects

**Filter Categories to Build:**
- **Client filters**: Wedding date, budget range, venue type, guest count, status
- **Supplier filters**: Category, availability, rating, location, reviews
- **Event filters**: Date ranges, season, venue type, weather dependency
- **Task filters**: Due dates, assignment, priority, completion status

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY DELIVERABLES:
- [ ] **SearchFiltersContainer** component with full TypeScript interfaces
- [ ] **QuickFilters** component with wedding-specific presets
- [ ] **AdvancedFilterPanel** with collapsible sections
- [ ] **FilterChips** component with remove functionality
- [ ] **SavedSearches** dropdown component
- [ ] **Mobile-responsive** search interface

### INTEGRATION REQUIREMENTS:
- [ ] Connect to Team B's search API endpoints
- [ ] Integrate with Team C's real-time update system
- [ ] Support Team D's mobile/PWA requirements
- [ ] Provide test hooks for Team E's automation

### PERFORMANCE TARGETS:
- [ ] Search input response time: <200ms
- [ ] Filter application: <300ms
- [ ] Large result set rendering: <500ms
- [ ] Mobile touch response: <100ms

## 💾 WHERE TO SAVE YOUR WORK
- Components: `$WS_ROOT/wedsync/src/components/search/`
- Types: `$WS_ROOT/wedsync/src/types/search.ts`
- Hooks: `$WS_ROOT/wedsync/src/hooks/useAdvancedSearch.ts`
- Tests: `$WS_ROOT/wedsync/tests/components/search/`
- Styles: `$WS_ROOT/wedsync/src/styles/search.css`

## 🏁 COMPLETION CHECKLIST
- [ ] All components created and verified to exist
- [ ] TypeScript compilation successful with strict mode
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Responsive design tested on all breakpoints
- [ ] Accessibility validation complete
- [ ] Performance benchmarks met
- [ ] Integration points documented
- [ ] Team coordination notes prepared
- [ ] Evidence package with screenshots
- [ ] Senior dev review prompt created

## 👥 TEAM COORDINATION NOTES
**Dependencies on other teams:**
- **Team B**: Search API endpoints, filter validation
- **Team C**: Real-time search updates, data synchronization
- **Team D**: Mobile PWA optimization, offline search
- **Team E**: Comprehensive testing, accessibility validation

**Integration points to coordinate:**
- API contract for search parameters
- Real-time update handling for search results
- Mobile-specific search patterns
- Test data and automation hooks

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**