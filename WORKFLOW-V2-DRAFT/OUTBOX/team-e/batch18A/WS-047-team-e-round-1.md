# TEAM E - ROUND 1: WS-047 - Review Collection System - Analytics Dashboard & Testing Framework

**Date:** 2025-01-20  
**Feature ID:** WS-047 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing framework and analytics dashboard for review collection system  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer Jake who invested in the review collection system
**I want to:** See detailed analytics on my review campaigns and know which strategies work best
**So that:** I can optimize my review request timing and messaging to get 80%+ response rates instead of guessing

**Real Wedding Problem This Solves:**
Jake sees his dashboard showing: "Post-Wedding Campaign: 47 requests sent, 34 opened (72% open rate), 28 reviews submitted (85% conversion), 4.8 average rating. Best performing: 12 days post-wedding timing. Poor performing: Generic message templates." This data helps him refine his approach and consistently get more positive reviews.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Comprehensive analytics system for review campaign performance and complete testing coverage for all review collection functionality. This is crucial SAAS intelligence helping suppliers optimize their review acquisition strategies.

**Technology Stack (VERIFIED):**
- Analytics: Custom dashboard with real-time metrics
- Charts: Chart.js or similar visualization library
- Testing: Vitest, Playwright MCP, API testing tools
- Database: PostgreSQL via MCP Server for analytics data
- Performance: Real-time updates via Supabase subscriptions

**Integration Points:**
- Review Analytics: Campaign performance tracking
- Platform Analytics: Google/Facebook review metrics
- Email Analytics: Open rates, click-through rates
- Business Impact: Review-to-booking attribution

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD UI STYLE GUIDE FOR ANALYTICS:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
# Use Ref MCP to search for:
# - "React chart libraries comparison 2024"
# - "Playwright testing best practices"
# - "Vitest testing patterns advanced"
# - "Real-time analytics dashboards React"
# - "Supabase realtime subscriptions"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing analytics and testing patterns:
await mcp__serena__find_symbol("analytics", "", true);
await mcp__serena__get_symbols_overview("src/components/analytics");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Review analytics and testing"
2. **test-automation-architect** --think-hard --use-loaded-docs "Comprehensive test coverage"
3. **data-analytics-engineer** --think-ultra-hard --follow-existing-patterns "Analytics dashboard design" 
4. **playwright-visual-testing-specialist** --comprehensive-testing --all-scenarios
5. **performance-optimization-expert** --analytics-performance --real-time-updates
6. **business-metrics-analyst** --roi-tracking --conversion-analytics
7. **security-compliance-officer** --data-privacy --analytics-security

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Analytics Dashboard Components:
- [ ] **ReviewAnalyticsDashboard** - `/src/components/reviews/analytics/ReviewAnalyticsDashboard.tsx`
  - Campaign performance overview
  - Response rate trends
  - Platform-specific metrics
  - Revenue attribution tracking
  - Comparative analysis between campaigns

- [ ] **ReviewMetricsCards** - `/src/components/reviews/analytics/MetricsCards.tsx`
  - Total requests sent
  - Open rates
  - Response rates
  - Average ratings
  - Revenue impact

- [ ] **ReviewPerformanceCharts** - `/src/components/reviews/analytics/PerformanceCharts.tsx`
  - Response rates over time
  - Platform performance comparison
  - Rating distribution
  - Timing optimization charts
  - A/B testing results

### Analytics API Endpoints:
- [ ] **GET** `/api/reviews/analytics/overview/[supplierId]` - Overall metrics
- [ ] **GET** `/api/reviews/analytics/campaigns/[campaignId]` - Campaign-specific data
- [ ] **GET** `/api/reviews/analytics/trends/[supplierId]` - Historical trends
- [ ] **GET** `/api/reviews/analytics/platforms/[supplierId]` - Platform breakdown

### Comprehensive Test Suite:
- [ ] **Unit Tests** - `/wedsync/tests/reviews/`
  - Component testing with Jest/Vitest
  - API endpoint testing
  - Analytics calculation testing
  - Edge case handling

- [ ] **Integration Tests** - `/wedsync/tests/integration/reviews/`
  - Full workflow testing
  - Platform integration testing
  - Email automation testing
  - Database consistency testing

- [ ] **E2E Tests** - `/wedsync/tests/e2e/reviews/`
  - Complete user journeys
  - Multi-platform scenarios
  - Mobile responsiveness
  - Performance validation

### Analytics Data Models:
- [ ] **ReviewAnalytics** - `/src/types/review-analytics.ts`
  - TypeScript interfaces for all analytics data
  - Calculation functions for metrics
  - Data transformation utilities

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Frontend component specifications - For testing scenarios
- FROM Team B: API endpoint contracts - For integration testing
- FROM Team C: Platform integration responses - For analytics data
- FROM Team D: Mobile component behavior - For mobile testing

### What other teams NEED from you:
- TO Team A: UI testing feedback - For component improvements
- TO Team B: API performance insights - For optimization
- TO Team C: Integration reliability metrics - For error handling
- TO Team D: Mobile performance benchmarks - For optimization
- TO All Teams: Test fixtures and mock data for development

---

## 🔒 SECURITY REQUIREMENTS FOR ANALYTICS (NON-NEGOTIABLE)

### SECURE ANALYTICS DATA HANDLING

```typescript
// ✅ SECURE ANALYTICS API (MANDATORY):
import { withSecureValidation } from '@/lib/validation/middleware';
import { analyticsQuerySchema } from '@/lib/validation/schemas';

export const GET = withSecureValidation(
  analyticsQuerySchema,
  async (request, validatedData) => {
    // Verify supplier can access this analytics data
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', validatedData.supplierId)
      .eq('user_id', request.userId)
      .single();
      
    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Return aggregated data only - no PII
    const analytics = await calculateReviewAnalytics(validatedData.supplierId);
    return NextResponse.json(analytics);
  }
);

// ✅ PII PROTECTION IN ANALYTICS:
export function sanitizeAnalyticsData(rawData: any[]): AnalyticsData {
  return {
    totalRequests: rawData.length,
    averageRating: rawData.reduce((sum, r) => sum + r.rating, 0) / rawData.length,
    responseRate: rawData.filter(r => r.status === 'completed').length / rawData.length,
    platformBreakdown: groupByPlatform(rawData),
    // NO personal information included
    recentReviews: rawData.map(r => ({
      rating: r.rating,
      reviewText: r.review_text?.substring(0, 100) + '...',
      platform: r.platform,
      publishedAt: r.published_at
      // NO names, emails, or personal details
    }))
  };
}
```

### ANALYTICS SECURITY CHECKLIST:
- [ ] No PII exposed in analytics APIs
- [ ] Supplier ownership verification on all analytics endpoints
- [ ] Rate limiting on analytics queries
- [ ] Audit logging for analytics access
- [ ] Data retention policies enforced
- [ ] Aggregated data only in dashboards
- [ ] GDPR compliance for analytics data

---

## 📊 ANALYTICS IMPLEMENTATION PATTERNS

### Real-time Metrics Dashboard:
```typescript
// ✅ REAL-TIME ANALYTICS WITH SUPABASE:
export function useReviewAnalytics(supplierId: string) {
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  
  useEffect(() => {
    // Initial data load
    fetchAnalytics(supplierId).then(setAnalytics);
    
    // Real-time updates
    const subscription = supabase
      .channel(`review_analytics_${supplierId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'collected_reviews',
          filter: `supplier_id=eq.${supplierId}`
        },
        (payload) => {
          // Update analytics in real-time
          setAnalytics(prev => prev ? updateAnalytics(prev, payload.new) : null);
        }
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [supplierId]);
  
  return analytics;
}

// ✅ ANALYTICS CALCULATIONS:
export function calculateReviewMetrics(reviews: CollectedReview[]): ReviewMetrics {
  const total = reviews.length;
  const completed = reviews.filter(r => r.rating > 0).length;
  const averageRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / completed;
  
  const platformBreakdown = reviews.reduce((acc, review) => {
    acc[review.platform] = (acc[review.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const responseRate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    totalReviews: total,
    completedReviews: completed,
    averageRating: Math.round(averageRating * 10) / 10,
    responseRate: Math.round(responseRate * 10) / 10,
    platformBreakdown,
    recentTrend: calculateTrend(reviews)
  };
}
```

---

## 🎭 COMPREHENSIVE TESTING WITH PLAYWRIGHT MCP (MANDATORY)

```javascript
// 1. COMPLETE REVIEW WORKFLOW TESTING
test('End-to-end review collection workflow', async () => {
  // Step 1: Supplier creates campaign
  await mcp__playwright__browser_navigate({url: '/reviews/campaigns'});
  await mcp__playwright__browser_click({element: 'Create Campaign', ref: 'button[data-testid="create-campaign"]'});
  
  await mcp__playwright__browser_type({
    element: 'campaign name',
    ref: 'input[name="name"]',
    text: 'Post-Wedding Reviews E2E Test'
  });
  
  await mcp__playwright__browser_click({element: 'Save Campaign', ref: 'button[type="submit"]'});
  
  // Step 2: System sends review request (mock email)
  const reviewToken = 'test-token-e2e-123';
  
  // Step 3: Couple submits review
  await mcp__playwright__browser_navigate({url: `/review/${reviewToken}`});
  await mcp__playwright__browser_snapshot();
  
  await mcp__playwright__browser_click({element: '5 stars', ref: 'button[data-rating="5"]'});
  await mcp__playwright__browser_type({
    element: 'review text',
    ref: 'textarea[name="reviewText"]',
    text: 'Outstanding photographer! Captured every perfect moment of our special day.'
  });
  
  await mcp__playwright__browser_click({element: 'Submit Review', ref: 'button[type="submit"]'});
  
  // Step 4: Verify analytics update
  await mcp__playwright__browser_navigate({url: '/reviews/analytics'});
  await mcp__playwright__browser_wait_for({text: 'Post-Wedding Reviews E2E Test'});
  
  const analyticsSnapshot = await mcp__playwright__browser_snapshot();
  expect(analyticsSnapshot).toContain('1 review'); // Verify count updated
});

// 2. ANALYTICS DASHBOARD TESTING
test('Review analytics dashboard functionality', async () => {
  await mcp__playwright__browser_navigate({url: '/reviews/analytics'});
  
  // Test metrics cards
  await mcp__playwright__browser_wait_for({text: 'Total Requests'});
  await mcp__playwright__browser_wait_for({text: 'Response Rate'});
  await mcp__playwright__browser_wait_for({text: 'Average Rating'});
  
  // Test chart interactions
  const charts = await page.locator('[data-testid="review-chart"]');
  expect(await charts.count()).toBeGreaterThan(0);
  
  // Test responsive behavior
  await mcp__playwright__browser_resize({width: 768, height: 1024});
  await mcp__playwright__browser_snapshot();
  
  await mcp__playwright__browser_resize({width: 375, height: 667});
  await mcp__playwright__browser_snapshot();
});

// 3. PERFORMANCE AND LOAD TESTING
test('Review system performance validation', async () => {
  // Test analytics dashboard load time
  const startTime = Date.now();
  await mcp__playwright__browser_navigate({url: '/reviews/analytics'});
  await page.waitForSelector('[data-testid="analytics-loaded"]');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(2000); // <2s load target
  
  // Test review submission performance
  const submissionStart = Date.now();
  await mcp__playwright__browser_navigate({url: '/review/test-token'});
  await mcp__playwright__browser_click({element: '5 stars', ref: 'button[data-rating="5"]'});
  await mcp__playwright__browser_click({element: 'Submit', ref: 'button[type="submit"]'});
  await page.waitForSelector('[data-testid="submission-success"]');
  const submissionTime = Date.now() - submissionStart;
  
  expect(submissionTime).toBeLessThan(3000); // <3s submission target
});

// 4. ERROR HANDLING AND EDGE CASES
test('Review system error scenarios', async () => {
  // Test expired token
  await mcp__playwright__browser_navigate({url: '/review/expired-token-123'});
  await mcp__playwright__browser_wait_for({text: 'Review Link Expired'});
  
  // Test invalid token
  await mcp__playwright__browser_navigate({url: '/review/invalid-token'});
  await mcp__playwright__browser_wait_for({text: 'Invalid Review Link'});
  
  // Test network failure simulation
  await page.route('**/api/reviews/collect', route => route.abort());
  await mcp__playwright__browser_navigate({url: '/review/test-token'});
  await mcp__playwright__browser_click({element: '5 stars', ref: 'button[data-rating="5"]'});
  await mcp__playwright__browser_click({element: 'Submit', ref: 'button[type="submit"]'});
  await mcp__playwright__browser_wait_for({text: 'Submission failed'});
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Analytics Implementation:
- [ ] Real-time analytics dashboard functional
- [ ] All key metrics accurately calculated
- [ ] Performance charts responsive and interactive
- [ ] Platform comparison data accurate
- [ ] Revenue attribution tracking working

### Testing Coverage:
- [ ] Unit test coverage >85% for all review components
- [ ] Integration tests covering all API endpoints
- [ ] E2E tests covering complete user journeys
- [ ] Performance tests validating load times
- [ ] Error scenario tests for edge cases
- [ ] Mobile testing across multiple viewports

### Evidence Package Required:
- [ ] Test coverage report showing >85% coverage
- [ ] Playwright test results with screenshots
- [ ] Performance benchmarks for all key operations
- [ ] Analytics accuracy validation report
- [ ] Security audit of analytics data handling

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Analytics: `/wedsync/src/components/reviews/analytics/`
- API Tests: `/wedsync/tests/api/reviews/`
- E2E Tests: `/wedsync/tests/e2e/reviews/`
- Unit Tests: `/wedsync/tests/components/reviews/`
- Types: `/wedsync/src/types/review-analytics.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch18A/WS-047-team-e-round-1-complete.md`
- **Test Results:** Include comprehensive test coverage report

---

**END OF ROUND PROMPT - EXECUTE IMMEDIATELY**