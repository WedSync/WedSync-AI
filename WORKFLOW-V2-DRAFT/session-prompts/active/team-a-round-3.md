# TEAM A - ROUND 3: WS-015 - Analytics Dashboard - Interactive Visualizations

**Date:** 2025-01-21  
**Feature ID:** WS-015 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build interactive analytics dashboard with real-time wedding metrics, customizable widgets, and data visualizations  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planner/coordinator
**I want to:** See comprehensive analytics about all my weddings in progress, vendor performance, and timeline adherence
**So that:** I can identify bottlenecks, optimize workflows, and ensure every wedding runs smoothly

**Real Wedding Problem This Solves:**
Planners manage 10-20 weddings simultaneously. They need to know which weddings are on track, which vendors are reliable, which timelines are at risk. Currently they use spreadsheets and gut feelings. This dashboard provides data-driven insights to prevent wedding day disasters before they happen.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Interactive chart components with drill-down capabilities
- Real-time metric updates via WebSocket
- Customizable widget layout with drag-and-drop
- Export functionality for reports (PDF/Excel)
- Responsive data visualizations
- Performance metrics and KPIs
- Trend analysis and forecasting
- Mobile-optimized views

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Charts: Recharts or Chart.js for visualizations
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: WebSocket from Team A Round 2

**Integration Points:**
- [Team A Round 2]: Real-time WebSocket infrastructure
- [Team D Round 2]: Report engine for data aggregation
- [Team B Round 1]: Timeline data for metrics
- [Database]: analytics_metrics, performance_kpis tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This dashboard uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "app-router dynamic-imports optimization", 5000);
await mcp__context7__get-library-docs("/recharts/recharts", "responsive-charts real-time-updates", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "grid-layout responsive-design", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__find_symbol("Analytics", "", true);
await mcp__serena__search_for_pattern("chart|graph|visualization");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build analytics dashboard with charts and KPIs"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create interactive data visualizations with Untitled UI + Magic UI"
3. **data-analytics-engineer** --think-ultra-hard --follow-existing-patterns "Implement metrics aggregation and calculations"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --test-interactive-charts
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Review Team A Round 1 & 2 implementations
- Understand existing dashboard structure
- Check available metrics and data sources
- Review report engine from Team D
- Continue until you FULLY understand the data architecture

### **PLAN PHASE (THINK HARD!)**
- Design widget architecture
- Plan data aggregation strategy
- Design responsive chart layouts
- Plan export functionality
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests for data calculations first
- Implement chart components
- Add interactive features
- Create customizable widgets
- Focus on performance with large datasets

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including data accuracy
- Test chart responsiveness
- Verify with Playwright
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Analytics & Visualization):
- [ ] Main analytics dashboard layout with grid system
- [ ] Interactive chart components (line, bar, pie, heatmap)
- [ ] KPI cards with trend indicators
- [ ] Customizable widget system with drag-and-drop
- [ ] Export functionality (PDF and Excel)
- [ ] Real-time metric updates using existing WebSocket
- [ ] Mobile-responsive data views
- [ ] Comprehensive test coverage

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A Round 2: WebSocket infrastructure for real-time updates
- FROM Team D Round 2: Report engine and data aggregation
- FROM Team B Round 1: Timeline metrics and optimization data

### What other teams NEED from you:
- TO All Teams: Analytics insights about their features
- TO Management: Complete analytics platform

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Role-based access to metrics
- [ ] No sensitive data in exports
- [ ] Audit logging for data access
- [ ] Secure data aggregation queries
- [ ] Rate limiting on export functions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ANALYTICS TESTING APPROACH:**

```javascript
// INTERACTIVE CHART TESTING

// 1. TEST CHART RENDERING AND INTERACTIVITY
await mcp__playwright__browser_navigate({url: "http://localhost:3000/analytics"});
await mcp__playwright__browser_wait_for({text: "Analytics Dashboard", time: 5});

// 2. TEST CHART INTERACTIONS
await mcp__playwright__browser_hover({
  element: "Chart data point", ref: "[data-testid='chart-point-q1']"
});
await mcp__playwright__browser_wait_for({text: "Q1: $125,000"}); // Tooltip appears

// 3. TEST DRAG-AND-DROP WIDGETS
await mcp__playwright__browser_drag({
  startElement: "Revenue widget", startRef: "[data-testid='widget-revenue']",
  endElement: "Drop zone", endRef: "[data-testid='grid-position-2']"
});

// 4. TEST EXPORT FUNCTIONALITY
await mcp__playwright__browser_click({
  element: "Export button", ref: "button[data-testid='export-pdf']"
});
await mcp__playwright__browser_wait_for({text: "Export complete"});

// 5. RESPONSIVE CHART VALIDATION
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  
  // Verify charts are responsive
  const chartVisible = await mcp__playwright__browser_evaluate({
    function: `() => {
      const chart = document.querySelector('[data-testid="main-chart"]');
      return chart && chart.offsetWidth > 0;
    }`
  });
}

// 6. PERFORMANCE WITH LARGE DATASETS
const performanceMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    renderTime: window.__chartRenderTime || 0,
    dataPoints: window.__chartDataPoints || 0,
    memoryUsage: performance.memory?.usedJSHeapSize || 0
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] All chart types render correctly
- [ ] Interactive features work (hover, click, drill-down)
- [ ] Drag-and-drop widget customization
- [ ] Export generates valid files
- [ ] Real-time updates reflect in charts
- [ ] Performance with 10,000+ data points

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All chart types implemented and interactive
- [ ] Customizable dashboard works with drag-and-drop
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating interactions
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Charts render in <1 second
- [ ] Real-time updates within 500ms
- [ ] Export completes in <5 seconds
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Video proof of interactive charts
- [ ] Screenshot of customized dashboard
- [ ] Export samples (PDF and Excel)
- [ ] Performance metrics report
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/analytics/`
- Charts: `/wedsync/src/components/analytics/charts/`
- Widgets: `/wedsync/src/components/analytics/widgets/`
- Tests: `/wedsync/__tests__/components/analytics/`
- Types: `/wedsync/src/types/analytics.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-015-round-3-complete.md`
- **Include:** Feature ID (WS-015) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-015-round-3-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- This is FINAL ROUND - ensure full integration

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies integrated
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY