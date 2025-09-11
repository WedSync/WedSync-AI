# TEAM C — BATCH 21 — ROUND 1 — WS-170: Viral Optimization System - Analytics Integration

**Date:** 2025-08-26  
**Feature ID:** WS-170 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build viral coefficient analytics and growth metrics integration  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before Round 2.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync
**I want to:** Leverage happy clients to refer other couples and suppliers
**So that:** I can grow my business through word-of-mouth while helping WedSync expand

**Real Wedding Problem This Solves:**
A photographer completes a wedding and their happy couple shares their WedSync experience with 3 other engaged couples. Each referral that signs up gives both the photographer and couple rewards. This viral loop reduces customer acquisition cost by 60%.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-170:**
- Build viral coefficient calculation system
- Implement sharing rate analytics tracking
- Create growth metrics dashboard integration
- Build attribution modeling for viral flows
- Implement A/B testing for viral mechanics

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Analytics: Custom metrics engine, PostgreSQL analytics
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Team A Frontend: Analytics display components
- Team B Backend: Referral data from API endpoints  
- Team D Rewards: Conversion tracking integration
- Database: viral_metrics, sharing_events tables

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Analytics Core):
- [ ] Viral coefficient calculation engine
- [ ] Sharing rate tracking and analysis
- [ ] Attribution modeling for referral sources
- [ ] Growth metrics aggregation system
- [ ] Analytics data pipeline setup
- [ ] Database views for viral metrics
- [ ] Unit tests with >80% coverage
- [ ] Analytics validation tests

**Objective:** Create comprehensive viral growth analytics system
**Scope In:** Analytics calculations, data aggregation, metrics modeling
**Scope Out:** Frontend dashboards, API endpoints, reward processing
**Affected Paths:** /src/lib/analytics/viral-metrics.ts, /src/lib/analytics/growth-modeling.ts
**Dependencies:** Team B referral data structure, Team D conversion events
**Acceptance Criteria:**
- Viral coefficient calculates accurately using K = (invites × conversion rate)
- Attribution models track referral source effectiveness
- Growth metrics aggregate daily, weekly, monthly
- Analytics pipeline processes data reliably
- All calculations are mathematically validated

**NFRs:** Analytics processing <1s, 99.9% calculation accuracy
**Test Plan:** Unit tests for calculations, integration tests for data flow
**Risk/Mitigation:** Calculation errors - implement validation checks
**Handoff Notes:** Export analytics interfaces for dashboard integration
**Overlap Guard:** Team C handles analytics only, not frontend display

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
- FROM Team B: Referral data structure - Required for viral calculations
- FROM Team D: Conversion event tracking - Needed for attribution modeling

### What other teams NEED from you:
- TO Team A: Analytics data interfaces - They need this for dashboard display
- TO Team E: Analytics test scenarios - Required for validation testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### ANALYTICS DATA SECURITY

```typescript
// ✅ SECURE ANALYTICS CALCULATIONS:
import { supabase } from '@/lib/supabase';

export async function calculateViralCoefficient(
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<ViralMetrics> {
  // Verify user has permission to view analytics
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('id', userId)
    .single();
    
  if (!userProfile || !['admin', 'analytics'].includes(userProfile.role)) {
    throw new Error('Unauthorized access to analytics');
  }

  // Use aggregated data, never expose individual referrer details
  const { data: aggregatedData } = await supabase
    .rpc('get_viral_metrics', {
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString(),
      requesting_user: userId
    });

  return processViralMetrics(aggregatedData);
}

// Secure aggregation function
async function processViralMetrics(data: any[]): Promise<ViralMetrics> {
  const totalUsers = data.reduce((sum, item) => sum + item.new_users, 0);
  const totalInvites = data.reduce((sum, item) => sum + item.invites_sent, 0);
  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);
  
  const conversionRate = totalInvites > 0 ? totalConversions / totalInvites : 0;
  const invitesPerUser = totalUsers > 0 ? totalInvites / totalUsers : 0;
  const viralCoefficient = invitesPerUser * conversionRate;
  
  return {
    viralCoefficient,
    conversionRate,
    invitesPerUser,
    period: 'calculated',
    // Never include individual user data
  };
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// VIRAL ANALYTICS TESTING

// 1. VIRAL COEFFICIENT CALCULATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/test-analytics"});

const viralCoefficientTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test viral coefficient calculation
    const testData = {
      newUsers: 100,
      invitesSent: 250,
      conversions: 75
    };
    
    // Expected: (250 invites / 100 users) * (75 conversions / 250 invites) = 2.5 * 0.3 = 0.75
    const expectedCoefficient = (testData.invitesSent / testData.newUsers) * (testData.conversions / testData.invitesSent);
    
    const result = await window.calculateViralCoefficient(testData);
    
    return {
      calculated: result.viralCoefficient,
      expected: expectedCoefficient,
      accurate: Math.abs(result.viralCoefficient - expectedCoefficient) < 0.001
    };
  }`
});

// 2. ATTRIBUTION MODELING TESTING
const attributionTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const testSources = [
      { source: 'email', conversions: 25, cost: 0 },
      { source: 'social', conversions: 30, cost: 0 },
      { source: 'referral', conversions: 20, cost: 0 }
    ];
    
    const attribution = await window.calculateAttributionModel(testSources);
    
    return {
      hasAttribution: !!attribution,
      totalConversions: attribution?.totalConversions,
      topSource: attribution?.topPerformingSource
    };
  }`
});

// 3. GROWTH METRICS AGGREGATION
const growthTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const dateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    };
    
    const metrics = await window.aggregateGrowthMetrics(dateRange);
    
    return {
      hasDaily: Array.isArray(metrics.daily),
      hasWeekly: Array.isArray(metrics.weekly),
      hasMonthly: Array.isArray(metrics.monthly),
      dataPointCount: metrics.daily?.length || 0
    };
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Viral coefficient calculation is mathematically correct
- [ ] Attribution modeling tracks source effectiveness
- [ ] Growth metrics aggregate properly by time period
- [ ] Data privacy is maintained (no individual exposure)
- [ ] Analytics pipeline handles missing data gracefully
- [ ] Performance meets sub-second requirements


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
- [ ] Viral coefficient engine calculates accurately
- [ ] Attribution modeling tracks all referral sources
- [ ] Growth metrics aggregate across time periods
- [ ] Analytics pipeline processes data reliably
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] All privacy requirements implemented

### Integration & Performance:
- [ ] Analytics processing completes in <1s
- [ ] 99.9% calculation accuracy maintained
- [ ] Integrates with Team B data sources
- [ ] Coordinates with Team A display requirements
- [ ] All data is properly aggregated (no individual exposure)

### Evidence Package Required:
- [ ] Viral coefficient calculation validation
- [ ] Attribution modeling test results
- [ ] Growth metrics aggregation proof
- [ ] Performance benchmarking results
- [ ] Privacy compliance validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Analytics: `/wedsync/src/lib/analytics/viral-metrics.ts`
- Modeling: `/wedsync/src/lib/analytics/growth-modeling.ts`
- Tests: `/wedsync/tests/analytics/viral/`
- Database: `/wedsync/supabase/functions/viral-analytics/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch21/WS-170-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Never expose individual user referral data
- Validate all mathematical calculations thoroughly
- Ensure analytics aggregation preserves privacy
- Test edge cases with zero/null data
- Coordinate data interfaces with other teams

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY