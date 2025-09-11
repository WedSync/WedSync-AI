# TEAM B - ROUND 1: WS-195 - Business Metrics Dashboard - Executive Dashboard Frontend

**Date:** 2025-01-20  
**Feature ID:** WS-195 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build executive business metrics dashboard with real-time MRR tracking, churn analysis, viral coefficient monitoring, and comprehensive business intelligence visualization for leadership team  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync executive monitoring business performance and investor reporting requirements
**I want to:** View comprehensive business metrics in real-time dashboard including MRR growth, churn analysis, viral coefficient tracking, customer acquisition costs, and business health indicators  
**So that:** I can make data-driven decisions during Q2 peak wedding season when supplier signups increase 300%, track the success of supplier acquisition campaigns with clear ROI metrics, identify growth opportunities as couple engagement rises 250%, and provide accurate financial reporting to investors with monthly recurring revenue trends

**Real Wedding Problem This Solves:**
During Q2 peak season, WedSync executives needed to track business health as MRR grew from £45K to £67K month-over-month while churn decreased to 3.2% due to suppliers seeing value during busy season. The business metrics dashboard shows viral coefficient increased to 1.8 as satisfied suppliers refer colleagues, customer acquisition costs decreased 40% due to word-of-mouth referrals, providing clear ROI data for continued platform investment and informed decisions about scaling operations during wedding season peaks.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Executive dashboard with real-time MRR tracking, growth rate analysis, and subscription movement categorization
- Churn rate monitoring with cohort analysis, retention curves, and customer lifecycle visualization
- Viral coefficient calculation with invitation tracking, conversion funnels, and growth projections
- Customer acquisition cost analysis by channel with LTV:CAC ratio monitoring and payback period calculations
- Business health scoring with comprehensive KPI tracking and automated insights generation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Charts: Recharts for business intelligence visualization, decimal.js for financial calculations

**Integration Points:**
- Team A MRR Engine: Subscription tracking and financial calculation results from MRR calculation engine
- Team C Data Pipeline: Aggregated business metrics from data pipeline integration and automated reporting
- Team D Metrics Visualization: Interactive chart components and business intelligence visualization tools
- Database: business_metrics, mrr_movements, viral_metrics, cac_metrics, business_health_indicators tables

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

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing dashboard patterns and business intelligence components:
await mcp__serena__find_symbol("BusinessDashboard", "", true);
await mcp__serena__get_symbols_overview("src/components/admin");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Track business metrics dashboard development with executive KPI visualization"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Build executive dashboard with business intelligence charts and real-time metrics" 
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Create business metrics visualization with MRR tracking and churn analysis"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Validate executive dashboard access controls and financial data security"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Design comprehensive testing for business metrics and executive dashboard"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab "Test executive dashboard with real-time updates and business intelligence charts" --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style "Ensure dashboard follows established executive UI patterns and business intelligence standards"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing executive dashboard components and business intelligence patterns
- Understand MRR calculation structures and financial data visualization requirements
- Check integration patterns with Supabase for business metrics and real-time updates
- Review similar implementations in analytics dashboards and financial reporting tools
- Continue until you FULLY understand the executive dashboard architecture and business metrics

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for executive dashboard with business intelligence visualization
- Write test cases FIRST (TDD) for dashboard components, metrics calculations, and chart interactions
- Plan error handling for financial data failures, calculation errors, and real-time update issues
- Consider edge cases like missing subscription data, calculation overflows, and chart rendering failures
- Design executive-focused layout optimized for business decision-making and investor presentations

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation for dashboard components and business metrics visualization
- Follow existing executive dashboard patterns and business intelligence component library
- Use Ref MCP examples for financial charts, real-time data display, and business metrics visualization
- Implement with parallel agents focusing on accurate MRR calculations and business health indicators
- Focus on data accuracy and executive usability, not development speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including business metrics calculation tests and dashboard component tests
- Verify with Playwright for responsive executive design and real-time business data updates
- Create evidence package showing dashboard functionality, metrics accuracy, and executive interface
- Generate reports on business metrics visualization, calculation accuracy, and dashboard performance
- Only mark complete when executive dashboard displays accurate business intelligence

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] **BusinessMetricsDashboard component** with real-time MRR display, churn rate monitoring, viral coefficient tracking, and executive KPI overview
- [ ] **MRROverview component** showing monthly recurring revenue with growth trends, movement categorization, and subscription analytics
- [ ] **ChurnAnalysis component** displaying churn rates with cohort analysis, retention curves, and customer lifecycle visualization
- [ ] **ViralCoefficient component** with referral tracking, conversion funnel analysis, and growth projection calculations
- [ ] **CACMetrics component** showing customer acquisition costs by channel with LTV:CAC ratios and payback period analysis
- [ ] **BusinessHealthScore component** with comprehensive KPI dashboard and automated business insights
- [ ] **MetricsTimeRange component** for date filtering with preset ranges and custom date selection for executive reporting
- [ ] **Dashboard API integration** with Supabase for real-time business metrics updates and financial data aggregation
- [ ] **Unit tests >80% coverage** for all dashboard components with financial calculation validation and chart rendering tests
- [ ] **Basic Playwright tests** for executive dashboard navigation, metrics filtering, and responsive business intelligence design

### Business Intelligence Features:
- [ ] **Real-time MRR tracking** with subscription movement visualization and growth trend analysis
- [ ] **Executive KPI summary** with key business health indicators and automated insight generation
- [ ] **Business metrics charts** using Recharts with interactive filtering and executive-focused data presentation
- [ ] **Financial calculation accuracy** with decimal.js for precise monetary calculations and MRR movement tracking

### Database Integration:
- [ ] **Supabase integration** for business_metrics, mrr_movements, viral_metrics, cac_metrics, business_health_indicators tables
- [ ] **Real-time subscriptions** for business metrics updates and executive dashboard refresh functionality
- [ ] **Financial data aggregation** with error handling and loading states for executive dashboard performance

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
- FROM Team A: MRR calculation engine results and subscription movement data - Required for dashboard metrics display
- FROM Team C: Data pipeline aggregated metrics and automated reporting data - Required for comprehensive business intelligence  
- FROM Team D: Interactive chart components and metrics visualization tools - Required for executive dashboard enhancement

### What other teams NEED from you:
- TO Team A: Dashboard component contracts and business metrics display interfaces - They need this for MRR calculation integration
- TO Team C: Business metrics requirements and dashboard data structure - Required for their data pipeline design
- TO Team E: Dashboard component test interfaces and metrics validation - Required for their comprehensive testing framework

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR EXECUTIVE DASHBOARD

**EVERY dashboard component MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN FOR EXECUTIVE DASHBOARDS):
import { withSecureExecutiveAccess } from '@/lib/validation/middleware';
import { businessMetricsSchema } from '@/lib/validation/schemas';

// Executive dashboard with proper financial data security
export const BusinessMetricsDashboard = withSecureExecutiveAccess(
  ['executive', 'finance'], // Required roles for business metrics access
  async (user: ExecutiveUser) => {
    // User is validated executive with financial data access
    // Dashboard implementation here
  }
);
```

### SECURITY CHECKLIST FOR EXECUTIVE DASHBOARD

Teams MUST implement ALL of these for EVERY dashboard component:

- [ ] **Executive Authentication**: Use existing middleware with executive/finance role validation
- [ ] **Financial Data Access Control**: MANDATORY role-based access for business metrics and financial reporting
- [ ] **Rate Limiting**: Dashboard API calls must respect executive tier rate limits - DO NOT bypass
- [ ] **CSRF Protection**: All executive forms use CSRF tokens - automatic via middleware
- [ ] **Data Sanitization**: All financial data display uses proper formatting - see `/src/lib/security/input-validation.ts`
- [ ] **Audit Logging**: All executive dashboard access logged - use existing audit framework
- [ ] **Session Security**: Executive sessions have proper timeout and security validation
- [ ] **Error Handling**: NEVER expose financial calculation details or sensitive business metrics in error messages

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// Executive dashboard testing with business metrics validation
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/business-metrics"});
const dashboardStructure = await mcp__playwright__browser_snapshot();

// Test MRR overview with real-time updates
await mcp__playwright__browser_click({
  element: "MRR overview card",
  ref: "[data-testid='mrr-overview-card']"
});

await mcp__playwright__browser_wait_for({text: "Monthly Recurring Revenue"});

// Test date range filtering for executive reporting
await mcp__playwright__browser_click({
  element: "last 90 days filter", 
  ref: "[data-testid='date-filter-90d']"
});

await mcp__playwright__browser_wait_for({text: "Metrics updated"});

// Verify business metrics accuracy and chart rendering
const metricsData = await mcp__playwright__browser_evaluate({
  function: `() => ({
    currentMRR: document.querySelector('[data-testid="current-mrr"]')?.textContent,
    churnRate: document.querySelector('[data-testid="churn-rate"]')?.textContent,
    viralCoefficient: document.querySelector('[data-testid="viral-coefficient"]')?.textContent,
    businessHealth: document.querySelector('[data-testid="health-score"]')?.textContent,
    chartsLoaded: document.querySelectorAll('.recharts-wrapper').length
  })`
});

// Test responsive design for executive workflows
for (const width of [1200, 1440, 1920]) {
  await mcp__playwright__browser_resize({width, height: 900});
  await mcp__playwright__browser_take_screenshot({filename: `business-dashboard-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Business metrics display with accurate MRR, churn, and viral coefficient calculations (accessibility tree validation)
- [ ] Executive dashboard navigation with date filtering and metrics drill-down (complex workflow testing)
- [ ] Real-time updates for business metrics with chart refresh functionality (time-based validation)
- [ ] Financial calculation accuracy with decimal precision and currency formatting (data integrity testing)
- [ ] Zero console errors during dashboard interactions and metrics updates (error monitoring)
- [ ] Responsive design optimized for executive presentations and investor reporting (1200px+)


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

### Technical Implementation:
- [ ] All Round 1 deliverables complete with executive dashboard functionality and business intelligence
- [ ] Tests written FIRST and passing (>80% coverage) for dashboard components and financial calculations
- [ ] Playwright tests validating business metrics accuracy and executive dashboard workflows  
- [ ] Zero TypeScript errors in dashboard components and business metrics integration
- [ ] Zero console errors during dashboard operations and real-time metrics updates

### Integration & Performance:
- [ ] Real-time integration with Supabase for business metrics updates working with executive dashboard
- [ ] Performance targets met (<2s dashboard load, <500ms metrics calculation updates)
- [ ] Accessibility validation passed for executive dashboard and business intelligence charts
- [ ] Security requirements met with executive access control and financial data protection
- [ ] Responsive design works optimally for executive workflows and investor presentations (1200px+)

### Evidence Package Required:
- [ ] Screenshot proof of working executive dashboard with accurate business metrics display
- [ ] Playwright test results showing business metrics calculations and dashboard functionality
- [ ] Performance metrics for dashboard load times and real-time business data updates
- [ ] Console error-free proof during executive dashboard interactions and metrics filtering  
- [ ] Test coverage report >80% for dashboard components and business intelligence features

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/admin/business/`
  - `BusinessMetricsDashboard.tsx` - Main executive dashboard with KPI overview
  - `MRROverview.tsx` - Monthly recurring revenue visualization
  - `ChurnAnalysis.tsx` - Churn rate and retention analysis
  - `ViralCoefficient.tsx` - Viral growth and referral tracking
  - `CACMetrics.tsx` - Customer acquisition cost analysis
  - `BusinessHealthScore.tsx` - Overall business health indicators
  - `MetricsTimeRange.tsx` - Date filtering for executive reporting
- Business Logic: `/wedsync/src/lib/business/`
  - `dashboard-api.ts` - Executive dashboard API integration
  - `metrics-calculations.ts` - Business metrics calculation utilities
  - `chart-configurations.ts` - Recharts configuration for business intelligence
- Tests: `/wedsync/tests/business/`
  - `business-dashboard.test.tsx` - Dashboard component unit tests
  - `metrics-calculations.test.ts` - Financial calculation accuracy tests
- E2E Tests: `/wedsync/tests/e2e/`
  - `business-dashboard.spec.ts` - Executive dashboard workflow tests

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch28/WS-195-team-b-round-1-complete.md`
- **Include:** Feature ID (WS-195) AND team identifier in all filenames  
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-195 | ROUND_1_COMPLETE | team-b | batch28" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (Team A MRR engine, Team C data pipeline)
- Do NOT skip tests - write them FIRST before dashboard implementation
- Do NOT ignore executive security requirements - use existing security middleware for financial data
- Do NOT claim completion without evidence of accurate business metrics display
- REMEMBER: All 5 teams work in PARALLEL on same features - complete Round 1 before others start Round 2
- CRITICAL: Financial calculations must be precise - use decimal.js for monetary calculations

---

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Executive dashboard components complete with business intelligence and metrics visualization
- [ ] MRR tracking, churn analysis, viral coefficient, and CAC metrics display with accurate calculations
- [ ] Business health scoring with comprehensive KPI tracking and automated insights
- [ ] Tests written FIRST and passing >80% coverage for dashboard functionality and financial calculations
- [ ] Security validation with executive access control and financial data protection
- [ ] Integration contracts defined for Team A MRR data and Team C pipeline integration
- [ ] Dashboard code committed to correct paths with proper business intelligence component organization
- [ ] Round 1 completion report created with evidence package and executive dashboard functionality proof

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY