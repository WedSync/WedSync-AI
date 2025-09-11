# TEAM D — BATCH 21 — ROUND 1 — WS-170: Viral Optimization System - Reward System Logic

**Date:** 2025-08-26  
**Feature ID:** WS-170 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build reward system logic for viral referrals and double-sided incentives  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before Round 2.

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
- Build reward calculation engine for referral bonuses
- Implement double-sided incentive system (referrer + referee)
- Create reward tier management (discount, credit, feature unlock)
- Build reward eligibility validation
- Implement reward distribution automation

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Reward System Core):
- [ ] Reward calculation engine with tier-based logic
- [ ] Double-sided reward distribution system
- [ ] Reward eligibility validation and fraud prevention
- [ ] Reward tier configuration and management
- [ ] Automated reward processing workflows
- [ ] Unit tests with >80% coverage
- [ ] Reward system integration tests

**Objective:** Create comprehensive reward system for viral growth incentives
**Scope In:** Reward logic, eligibility validation, distribution automation
**Scope Out:** Frontend reward display, API endpoints, analytics integration
**Affected Paths:** /src/lib/rewards/reward-engine.ts, /src/lib/rewards/eligibility-validator.ts
**Dependencies:** Team B referral data, Team C analytics integration
**Acceptance Criteria:**
- Rewards calculate correctly based on referral tiers
- Double-sided incentives distribute to both parties
- Fraud prevention prevents gaming the system
- Reward eligibility validates properly
- Distribution automation works reliably


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
- FROM Team B: Referral conversion events - Required for reward triggers
- FROM Team C: Attribution data - Needed for reward calculations

### What other teams NEED from you:
- TO Team A: Reward status interfaces - They need this for UI display
- TO Team E: Reward test scenarios - Required for validation testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ SECURE REWARD SYSTEM:
export async function processReward(
  referralId: string,
  conversionEvent: ConversionEvent
): Promise<RewardResult> {
  // Validate referral legitimacy
  const referral = await validateReferralLegitimacy(referralId);
  if (!referral.isValid) {
    throw new Error('Invalid referral for reward processing');
  }
  
  // Prevent double-rewarding
  const existingReward = await checkExistingReward(referralId);
  if (existingReward) {
    throw new Error('Reward already processed for this referral');
  }
  
  // Calculate rewards securely
  const rewards = await calculateSecureRewards(referral, conversionEvent);
  
  // Distribute with transaction safety
  return await distributeRewardsTransactionally(rewards);
}
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Reward engine calculates all tiers correctly
- [ ] Double-sided distribution works reliably
- [ ] Fraud prevention prevents gaming
- [ ] Eligibility validation is comprehensive
- [ ] Tests written FIRST and passing (>80% coverage)

**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch21/WS-170-team-d-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY