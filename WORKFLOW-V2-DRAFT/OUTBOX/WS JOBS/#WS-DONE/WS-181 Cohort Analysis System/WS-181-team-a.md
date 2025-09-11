# TEAM A - ROUND 1: WS-181 - Cohort Analysis System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create comprehensive cohort analysis dashboard with heatmap visualizations for WedSync supplier retention analytics
**FEATURE ID:** WS-181 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about cohort data visualization clarity and actionable business insights presentation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/analytics/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/analytics/CohortAnalysisHeatmap.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/admin/analytics/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("cohort.*analysis");
await mcp__serena__search_for_pattern("analytics.*dashboard");
await mcp__serena__get_symbols_overview("src/components/admin/analytics/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("React data visualization cohort heatmap");
await mcp__Ref__ref_search_documentation("Recharts cohort analysis charts");
await mcp__Ref__ref_search_documentation("Next.js admin analytics dashboards");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Cohort analysis dashboard requires intuitive business intelligence visualization: 1) Heatmap showing retention rates by signup month with color-coded performance 2) Time-series selector for different analysis periods (3m, 6m, 12m, 24m) 3) Metric switcher between retention, revenue, and LTV analysis 4) Drill-down capability to individual cohort details 5) Automated insights highlighting best/worst performing cohorts. Must translate complex data into executive-level actionable insights.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ANALYTICS DASHBOARD SECURITY:
- [ ] **Admin authentication required** - Verify analytics admin role access
- [ ] **Business data access control** - Restrict sensitive revenue data appropriately
- [ ] **Audit logging for data views** - Log cohort analysis dashboard access
- [ ] **Data export restrictions** - Control cohort data export permissions
- [ ] **Session timeout handling** - Secure timeout for analytics sessions

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Admin navigation link for "Analytics" → "Cohort Analysis"
- [ ] Analytics section breadcrumbs: Admin → Analytics → Cohorts
- [ ] Mobile analytics navigation support
- [ ] Navigation active states for analytics section

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

### SPECIFIC DELIVERABLES FOR WS-181:

#### 1. CohortAnalysisHeatmap.tsx - Primary visualization component
```typescript
interface CohortAnalysisHeatmapProps {
  cohortData: CohortData[];
  selectedMetric: 'retention' | 'revenue' | 'ltv';
  timeRange: number; // months
  onCohortSelect: (cohort: CohortData) => void;
}

// Key features:
// - Color-coded heatmap cells based on performance (green=high, red=low)
// - Hover tooltips with detailed metrics and user counts
// - Interactive cell selection for drill-down analysis
// - Responsive design supporting 12+ months of cohort data
// - Legend explaining color coding and metric meanings
```

#### 2. CohortMetricsSelector.tsx - Analysis control panel
```typescript
interface CohortMetricsSelectorProps {
  selectedMetric: 'retention' | 'revenue' | 'ltv';
  onMetricChange: (metric: string) => void;
  timeRangeOptions: TimeRange[];
  selectedTimeRange: number;
  onTimeRangeChange: (range: number) => void;
}

// Key features:
// - Metric toggle buttons with clear descriptions
// - Time range selector (3, 6, 12, 24 months)
// - Performance period selector (monthly, quarterly)
// - Export controls for cohort data and visualizations
```

#### 3. CohortInsightsPanel.tsx - Automated business intelligence
```typescript
interface CohortInsightsPanelProps {
  cohortAnalysis: CohortAnalysisResult;
  insights: AutomatedInsight[];
  trends: CohortTrend[];
}

// Key features:
// - Automated insights highlighting best/worst performing cohorts
// - Trend analysis showing improving/declining cohort performance
// - Actionable recommendations for retention improvement
// - Key performance indicators with benchmark comparisons
```

#### 4. CohortDetailModal.tsx - Individual cohort deep-dive
```typescript
interface CohortDetailModalProps {
  cohort: CohortData;
  isOpen: boolean;
  onClose: () => void;
  detailMetrics: CohortDetailMetrics;
}

// Key features:
// - Detailed retention curve for selected cohort
// - User journey analysis within the cohort
// - Revenue progression and LTV calculations
// - Comparison against average cohort performance
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-181 technical specification:
- **Cohort Heatmap**: Visual display of retention rates by signup month
- **Metrics**: Retention, revenue, LTV analysis with color-coded performance
- **Time Ranges**: 3, 6, 12, 24 month analysis periods
- **Business Intelligence**: Automated insights for retention optimization

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/components/admin/analytics/CohortAnalysisHeatmap.tsx` - Primary heatmap
- [ ] `/src/components/admin/analytics/CohortMetricsSelector.tsx` - Analysis controls
- [ ] `/src/components/admin/analytics/CohortInsightsPanel.tsx` - Business intelligence
- [ ] `/src/components/admin/analytics/CohortDetailModal.tsx` - Detailed cohort view
- [ ] `/src/components/admin/analytics/CohortAnalysisDashboard.tsx` - Main dashboard
- [ ] `/src/components/admin/analytics/index.ts` - Component exports

### MUST IMPLEMENT:
- [ ] Interactive cohort heatmap with color-coded performance visualization
- [ ] Metric switching between retention, revenue, and LTV analysis
- [ ] Time range controls for different analysis periods
- [ ] Automated insights generation highlighting actionable findings
- [ ] Responsive design supporting mobile analytics viewing
- [ ] Export functionality for cohort data and visualizations

## 💾 WHERE TO SAVE YOUR WORK
- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/analytics/`
- Charts: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/charts/cohort/`
- Hooks: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/hooks/useCohortAnalytics.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/components/admin/analytics/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/cohort-analysis.ts`

## 🏁 COMPLETION CHECKLIST
- [ ] Cohort analysis heatmap created with interactive color-coded visualization
- [ ] Metric selection controls implemented with retention/revenue/LTV switching
- [ ] Automated insights panel generating actionable business intelligence
- [ ] Detailed cohort drill-down modal with comprehensive metrics
- [ ] Responsive design tested on desktop and mobile
- [ ] Navigation integration complete with analytics section access

**WEDDING CONTEXT REMINDER:** Your cohort analysis helps WedSync understand which monthly groups of wedding suppliers (photographers joining in January vs. June) have the highest lifetime value and retention. This data guides marketing spend decisions and helps identify successful onboarding periods that convert wedding professionals into long-term platform users.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**