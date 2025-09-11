# TEAM C — BATCH 29 — ROUND 2 — WS-199 — Rate Limiting System — Adaptive Intelligence & Optimization

**Date:** 2025-01-20  
**Feature ID:** WS-199 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Enhance rate limiting with adaptive intelligence, machine learning optimization, and advanced abuse detection  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform performance engineer implementing intelligent rate limiting  
**I want to:** Add adaptive rate limiting that learns user behavior patterns, predictive abuse detection, and intelligent traffic shaping  
**So that:** I can ensure that during unpredictable traffic spikes (like viral TikTok posts about wedding vendors), the system automatically adjusts rate limits based on user behavior patterns; detect sophisticated abuse attempts before they impact legitimate users; and provide intelligent traffic prioritization that ensures couples planning weddings get priority access during peak booking seasons while maintaining fair resource allocation

**Real Wedding Problem This Solves:**
A wedding planning influencer posts about a specific venue supplier, causing a 2000% traffic spike in 30 minutes. The adaptive rate limiting system detects the unusual pattern, distinguishes between legitimate couples seeking venue information and automated scrapers, and dynamically adjusts limits: verified couples get higher limits for portfolio browsing, premium suppliers maintain their consultation booking capabilities, while suspicious bot traffic gets progressively restricted. The ML-based system learns from this event to better handle similar viral spikes in the future.

---

## 🎯 TECHNICAL REQUIREMENTS

**Building on Round 1 Foundation:**
- Adaptive rate limiting with machine learning behavior analysis
- Predictive abuse detection using pattern recognition and anomaly detection
- Intelligent traffic shaping with priority queuing for different user types
- Dynamic limit adjustment based on system load and user behavior
- Advanced analytics dashboard for rate limiting insights and optimization

**Integration with Other Teams (Round 2):**
- Middleware: Advanced security context from Team A
- Error Handling: Intelligent error responses from Team B
- API Routes: Performance optimization patterns from Team D
- Frontend: Smart error recovery components from Team E

---

## 📚 STEP 1: ENHANCED DOCUMENTATION LOADING

```typescript
// ROUND 2 ADVANCED PATTERNS:
await mcp__Ref__ref_search_documentation({query: "tfjs pattern-recognition latest documentation"});
await mcp__Ref__ref_search_documentation({query: "workers adaptive-rate-limiting latest documentation"});
await mcp__Ref__ref_search_documentation({query: "zuul intelligent-routing latest documentation"});

// Review Round 1 implementations:
await mcp__serena__find_symbol("ratelimit", "lib/rate-limiting", true);
await mcp__serena__get_symbols_overview("lib/rate-limiting");
```


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

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Adaptive Intelligence & ML):
- [ ] Adaptive rate limiter in `/wedsync/lib/rate-limiting/adaptive-limiter.ts`
- [ ] ML behavior analyzer in `/wedsync/lib/rate-limiting/behavior-analyzer.ts`
- [ ] Predictive abuse detector in `/wedsync/lib/rate-limiting/predictive-abuse.ts`
- [ ] Traffic shaper in `/wedsync/lib/rate-limiting/traffic-shaper.ts`
- [ ] Dynamic limit adjuster in `/wedsync/lib/rate-limiting/dynamic-adjuster.ts`
- [ ] Rate limiting analytics dashboard components
- [ ] ML model training pipeline for behavior analysis
- [ ] Advanced load testing with adaptive behavior validation

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

## 🔗 DEPENDENCIES & INTEGRATION

### Integration with Round 1 Outputs:
- FROM Team A: Bot detection data - Required for enhanced abuse detection
- FROM Team B: Error analytics - Dependency for intelligent error-based rate adjustments
- FROM Team D: API performance metrics - Required for dynamic limit optimization
- FROM Team E: User experience data - Need for behavior-based limit adjustments

### Advanced Features to Provide:
- TO Team A: Behavioral security insights for advanced threat detection
- TO Team B: Rate limiting intelligence for error pattern analysis
- TO Team D: Traffic shaping recommendations for API optimization
- TO Team E: Intelligent rate limit messaging for user guidance

---

## 🔒 ADVANCED ADAPTIVE RATE LIMITING

```typescript
// ✅ ROUND 2 PATTERN - Adaptive Rate Limiting:
export class AdaptiveRateLimiter {
  async adaptLimits(
    identifier: string, 
    request: NextRequest,
    currentLimits: RateLimitConfig
  ): Promise<{
    adaptedLimits: RateLimitConfig;
    confidence: number;
    reason: string;
    adjustmentFactor: number;
  }> {
    // Analyze user behavior patterns
    const behaviorPattern = await this.analyzeBehavior(identifier);
    
    // Check system load and capacity
    const systemMetrics = await this.getSystemMetrics();
    
    // Apply ML-based recommendations
    const mlRecommendation = await this.getMlRecommendation(
      behaviorPattern, 
      systemMetrics, 
      currentLimits
    );
    
    // Calculate adaptive adjustment
    const adaptedLimits = this.calculateAdaptiveLimits(
      currentLimits,
      mlRecommendation,
      systemMetrics
    );
    
    return {
      adaptedLimits,
      confidence: mlRecommendation.confidence,
      reason: this.explainAdjustment(mlRecommendation),
      adjustmentFactor: this.calculateAdjustmentFactor(currentLimits, adaptedLimits)
    };
  }
}

// ✅ ROUND 2 PATTERN - Predictive Abuse Detection:
export class PredictiveAbuseDetector {
  async analyzeThreatLevel(
    identifier: string,
    requestPattern: RequestPattern
  ): Promise<{
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    indicators: ThreatIndicator[];
    recommendedAction: 'allow' | 'monitor' | 'restrict' | 'block';
    adaptiveResponse: AdaptiveResponse;
  }> {
    // Pattern recognition analysis
    const patternAnalysis = await this.analyzeRequestPatterns(requestPattern);
    
    // Behavioral anomaly detection
    const anomalyScore = await this.detectAnomalies(identifier, requestPattern);
    
    // ML-based threat classification
    const mlClassification = await this.classifyThreat(patternAnalysis, anomalyScore);
    
    return {
      ...mlClassification,
      adaptiveResponse: await this.generateAdaptiveResponse(mlClassification)
    };
  }
}
```

---

## ✅ ROUND 2 SUCCESS CRITERIA

### Advanced Technical Implementation:
- [ ] Adaptive rate limiting adjusting limits based on behavior patterns
- [ ] ML behavior analyzer with >92% accuracy in user classification
- [ ] Predictive abuse detection identifying threats 85% before impact
- [ ] Traffic shaping prioritizing legitimate users during high load
- [ ] Dynamic limit adjustment responding to system conditions
- [ ] Advanced test coverage >90% including ML model validation
- [ ] Integration testing with adaptive behavior scenarios
- [ ] Performance optimization maintaining <3ms overhead

### Intelligence & Analytics Metrics:
- [ ] Adaptive limits improving user experience by 40% during traffic spikes
- [ ] Abuse detection preventing 95% of sophisticated attacks
- [ ] Traffic shaping maintaining service quality during 500% load increases
- [ ] ML models accurately predicting user behavior patterns
- [ ] Analytics dashboard providing actionable optimization insights

---

## 💾 ROUND 2 FILE LOCATIONS

### Advanced Code Files:
- Adaptive: `/wedsync/lib/rate-limiting/adaptive-limiter.ts`
- Behavior: `/wedsync/lib/rate-limiting/behavior-analyzer.ts`
- Predictive: `/wedsync/lib/rate-limiting/predictive-abuse.ts`
- Shaper: `/wedsync/lib/rate-limiting/traffic-shaper.ts`
- Dynamic: `/wedsync/lib/rate-limiting/dynamic-adjuster.ts`
- ML Pipeline: `/wedsync/lib/ml/rate-limiting-models.ts`
- Dashboard: `/wedsync/components/admin/RateLimitingDashboard.tsx`
- Advanced Tests: `/wedsync/tests/rate-limiting/adaptive/`

### CRITICAL - Round 2 Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch29/WS-199-team-c-round-2-complete.md`

---

**🚨 ROUND 2 FOCUS: Machine learning intelligence and adaptive behavior. Transform rate limiting from static rules to intelligent adaptation.**

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY