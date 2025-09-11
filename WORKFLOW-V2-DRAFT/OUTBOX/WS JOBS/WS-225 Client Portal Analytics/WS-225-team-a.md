# TEAM A - ROUND 1: WS-225 - Client Portal Analytics
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive client portal analytics dashboard for wedding suppliers to monitor client engagement and portal usage
**FEATURE ID:** WS-225 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about client engagement metrics, portal usage analytics, and supplier business intelligence

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/analytics/
cat $WS_ROOT/wedsync/src/components/analytics/ClientPortalAnalytics.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test client-analytics
# MUST show: "All tests passing"
```

## =Ú STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("analytics dashboard client-metrics engagement");
await mcp__serena__find_symbol("Analytics Dashboard ClientMetrics", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**=¨ CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS
```typescript
# Use Ref MCP to search for:
# - "React analytics dashboard components"
# - "Client engagement tracking metrics"
# - "Real-time analytics data-visualization"
```

## >Ð STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Client Portal Analytics Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Client portal analytics needs: engagement metrics (page views, time spent), feature usage tracking, communication analytics, document download metrics, task completion rates. Wedding suppliers need insights into how their clients interact with portal features.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## >ó NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### Dashboard Navigation Integration:
```typescript
// MUST update dashboard navigation
{
  title: "Client Analytics",
  href: "/dashboard/client-analytics",
  icon: BarChart3
}
```

## <¯ SPECIFIC DELIVERABLES

### Core Analytics Components:
- [ ] **ClientPortalAnalytics.tsx** - Main analytics dashboard with engagement metrics
- [ ] **EngagementMetrics.tsx** - Client portal usage and activity tracking
- [ ] **FeatureUsage.tsx** - Individual feature usage analytics
- [ ] **CommunicationAnalytics.tsx** - Message and notification engagement
- [ ] **ClientJourney.tsx** - Client onboarding and milestone progression
- [ ] **AnalyticsOverview.tsx** - High-level client engagement summary
- [ ] **useClientAnalytics.ts** - Custom hook for analytics data management

### Wedding Client Features:
- [ ] Portal engagement tracking (logins, page views, session duration)
- [ ] Feature adoption rates (timeline usage, photo gallery views)
- [ ] Communication effectiveness (message response rates, notification opens)
- [ ] Task completion analytics (checklist progress, document uploads)
- [ ] Client satisfaction and feedback correlation

## <­ PLAYWRIGHT TESTING

```javascript
// Client Portal Analytics Testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/client-analytics"});
const analyticsInterface = await mcp__playwright__browser_snapshot();

// Test analytics filter interactions
await mcp__playwright__browser_click({
  element: "date range filter",
  ref: "[data-testid='date-filter']"
});

// Test metric drill-down functionality
await mcp__playwright__browser_click({
  element: "engagement metric",
  ref: "[data-testid='engagement-chart']"
});
```

## =¾ WHERE TO SAVE

- **Components**: `$WS_ROOT/wedsync/src/components/analytics/`
- **Hooks**: `$WS_ROOT/wedsync/src/hooks/useClientAnalytics.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/analytics.ts`
- **Tests**: `$WS_ROOT/wedsync/src/components/analytics/__tests__/`

##   CRITICAL WARNINGS

- Client analytics data must comply with privacy regulations
- Personal information must be anonymized in aggregate views
- Analytics queries must be optimized for large datasets
- Real-time metrics should be throttled to prevent performance issues

---

**Real Wedding Scenario:** A wedding photographer analyzes their client portal to discover that couples spend 65% of their time in the photo gallery section, 23% reviewing timelines, and rarely use the vendor directory. This insight helps them optimize portal layout and focus communication on the most engaging features.

**EXECUTE IMMEDIATELY - Build comprehensive client portal analytics for supplier business intelligence!**