# TEAM A - ROUND 1: WS-291 - Revenue Model System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive subscription management UI with pricing tiers, usage dashboards, and upgrade flow components
**FEATURE ID:** WS-291 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about freemium conversion psychology and usage trigger UX patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/billing/
cat $WS_ROOT/wedsync/src/components/billing/PricingTiersDisplay.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test billing
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

// Query specific areas relevant to billing components
await mcp__serena__search_for_pattern("billing subscription pricing tier");
await mcp__serena__find_symbol("PricingTiers SubscriptionManager", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/billing/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for billing features
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Load existing billing component patterns
await mcp__serena__find_symbol("PaymentForm PaymentMethods", "", true);
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY) - for cards, buttons, forms
- **Magic UI**: Animations and visual enhancements (MANDATORY) - for upgrade triggers
- **Tailwind CSS 4.1.11**: Utility-first CSS for responsive pricing layouts
- **Lucide React**: Icons ONLY (CreditCard, TrendingUp, Users, etc.)

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "React pricing component patterns"
# - "Stripe subscription UI components"
# - "Tailwind CSS pricing table layouts"
# - "Untitled UI card component documentation"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing billing patterns
await mcp__serena__find_referencing_symbols("subscription tier pricing");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Frontend-Specific Sequential Thinking Patterns

#### Pattern 1: Complex UI Architecture Analysis
```typescript
// Before building pricing UI components
mcp__sequential-thinking__sequential_thinking({
  thought: "Revenue model UI needs: interactive pricing comparison table (5 tiers), annual/monthly toggle with discount visualization, usage dashboard showing current limits vs usage, upgrade trigger modals, billing history display, and payment method management. Each has different interaction patterns and conversion psychology requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "User psychology analysis: Free users hit form limit and need immediate upgrade path, professional users need automation value prop, usage warnings must be helpful not annoying. Pricing display needs social proof (testimonials), feature comparison matrix, and clear CTAs. Mobile users need simplified pricing flows.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: PricingTiersDisplay (reusable for marketing/settings), UsageDashboard (real-time limits), UpgradeTriggerModal (context-aware), BillingHistoryTable (Stripe integration), PaymentMethodsManager (card management). Each needs TypeScript interfaces and error boundaries.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding business UX considerations: Photographers will use billing dashboard while managing client weddings, need quick upgrade paths during busy season, clear value messaging around wedding-specific features, mobile-friendly billing for on-the-go access.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:

1. **task-tracker-coordinator** - Break down billing UI components, track dependencies
2. **react-ui-specialist** - Use Serena to find pricing component patterns, ensure Untitled UI consistency
3. **security-compliance-officer** - Ensure billing forms don't expose sensitive data
4. **code-quality-guardian** - Ensure code matches existing billing patterns found by Serena
5. **test-automation-architect** - Write tests BEFORE code for pricing components
6. **documentation-chronicler** - Document billing UI patterns and conversion optimization

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
Use Serena to understand the codebase BEFORE writing any code:
```typescript
// Find all existing billing components and their relationships
await mcp__serena__find_symbol("PaymentForm SubscriptionManager", "", true);
// Understand existing pricing patterns
await mcp__serena__search_for_pattern("pricing tier subscription");
// Analyze integration points
await mcp__serena__find_referencing_symbols("Stripe billing");
```
- [ ] Identified existing billing UI patterns to follow
- [ ] Found Stripe integration points
- [ ] Understood current subscription management UI
- [ ] Located similar pricing implementations

## 🔒 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

**🚨 BILLING FEATURES MUST INTEGRATE INTO SETTINGS NAVIGATION**

#### NAVIGATION INTEGRATION CHECKLIST

1. **Settings Dashboard Integration:**
```typescript
// MUST update settings navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/settings/layout.tsx
// Add billing navigation following existing pattern:
{
  title: "Billing & Usage",
  href: "/settings/billing",
  icon: CreditCard
}
```

2. **Usage Alert Integration:**
```typescript
// MUST integrate usage alerts into main dashboard
// File: $WS_ROOT/wedsync/src/app/(dashboard)/page.tsx
// Add usage widget component:
<UsageAlertWidget currentTier="starter" />
```

3. **Upgrade Flow Navigation:**
```typescript
// MUST create seamless upgrade paths from feature limits
// Modal overlays for upgrade triggers
// Breadcrumb: Dashboard → Settings → Billing → Upgrade
```

**COMPLETION CRITERIA: NAVIGATION INTEGRATION**
- [ ] Settings navigation updated with billing section
- [ ] Usage alerts integrated into main dashboard
- [ ] Upgrade triggers accessible from feature limit warnings
- [ ] Mobile navigation supports billing management
- [ ] Accessibility labels for all billing navigation

## 🎯 TECHNICAL SPECIFICATION: WS-291 REVENUE MODEL

### **CORE UI COMPONENTS TO BUILD:**

#### 1. **PricingTiersDisplay Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/billing/PricingTiersDisplay.tsx
interface Props {
  currentTier?: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  showAnnualToggle?: boolean;
  highlightUpgrade?: boolean;
  context: 'marketing' | 'settings' | 'upgrade';
}

// Key functionality:
// - Interactive 5-tier pricing comparison (Free, Starter £19, Professional £49, Scale £79, Enterprise £149)
// - Annual/monthly toggle with 20% discount visualization
// - Feature comparison matrix with checkmarks/crosses
// - Upgrade call-to-action buttons with context-aware messaging
// - Mobile-responsive card layout
// - Value proposition messaging per tier
```

#### 2. **UsageDashboard Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/billing/UsageDashboard.tsx
interface Props {
  userId: string;
  showUpgradeTriggers?: boolean;
  showUsageAlerts?: boolean;
}

// Key functionality:
// - Real-time usage tracking display (forms created, logins used)
// - Progress bars showing usage vs limits
// - Limit warnings and upgrade prompts
// - Usage trends and projections
// - Tier recommendation engine based on usage patterns
```

#### 3. **UpgradeTriggerModal Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/billing/UpgradeTriggerModal.tsx
interface Props {
  trigger: 'form_limit' | 'login_limit' | 'automation_needed';
  currentTier: string;
  recommendedTier: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

// Key functionality:
// - Context-aware upgrade messaging based on trigger
// - Before/after feature comparison
// - Immediate upgrade CTA with Stripe integration
// - "Maybe later" dismissal with snooze options
```

#### 4. **BillingHistoryTable Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/billing/BillingHistoryTable.tsx
// Key functionality:
// - Stripe invoice history display
// - Payment method management
// - Download invoice PDFs
// - Payment failure handling
```

### **WEDDING-SPECIFIC UX REQUIREMENTS:**

1. **Professional Photographer Context:**
   - Emphasize "unlimited forms" benefit for multiple clients
   - Show ROI calculation: "£49/month vs 2+ hours saved per wedding"
   - Wedding season upgrade prompts (spring/summer pricing urgency)

2. **Mobile-First Billing:**
   - Touch-friendly pricing tables
   - Simplified upgrade flows for mobile
   - Offline-capable billing status display

3. **Trust and Security Messaging:**
   - "Secure payments powered by Stripe" messaging
   - PCI compliance indicators
   - No hidden fees transparency

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### BILLING UI SECURITY CHECKLIST:
- [ ] **Never display sensitive payment data** - Use Stripe elements only
- [ ] **Secure form handling** - All billing forms use proper validation
- [ ] **XSS prevention** - All user tier/usage data properly escaped
- [ ] **Error message security** - No payment errors leak sensitive info
- [ ] **Session validation** - Check authentication before showing billing data
- [ ] **HTTPS enforcement** - All billing flows over secure connections

### REQUIRED SECURITY PATTERNS:
```typescript
// Always validate user session before showing billing
const session = await getServerSession(authOptions);
if (!session) {
  redirect('/login?return=/settings/billing');
}

// Never handle raw payment data in components
// Use Stripe Elements for all payment inputs
import { Elements, CardElement } from '@stripe/react-stripe-js';
```

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```javascript
// Test pricing tier selection flow
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/billing"});
const pricingStructure = await mcp__playwright__browser_snapshot();

// Test annual/monthly toggle
await mcp__playwright__browser_click({
  element: "annual toggle", 
  ref: "[data-testid='billing-period-toggle']"
});
await mcp__playwright__browser_wait_for({text: "20% discount"});

// Test upgrade flow
await mcp__playwright__browser_click({
  element: "professional upgrade",
  ref: "[data-testid='upgrade-professional']"
});
await mcp__playwright__browser_snapshot();

// Test mobile responsiveness
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({filename: `billing-${width}px.png`});
}

// Test accessibility
const consoleErrors = await mcp__playwright__browser_console_messages();
// Should have no accessibility violations
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **PricingTiersDisplay**: 5-tier comparison with annual toggle
- [ ] **UsageDashboard**: Real-time usage tracking with progress bars
- [ ] **UpgradeTriggerModal**: Context-aware upgrade prompts
- [ ] **Navigation Integration**: Billing section in settings navigation
- [ ] **Mobile Optimization**: Touch-friendly pricing on 375px+
- [ ] **Unit Tests**: >90% coverage for all billing components
- [ ] **Integration Tests**: Pricing display and usage tracking
- [ ] **Accessibility**: WCAG 2.1 AA compliance

## 💾 WHERE TO SAVE YOUR WORK

- **Components**: `$WS_ROOT/wedsync/src/components/billing/`
- **Types**: `$WS_ROOT/wedsync/src/types/billing.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/components/billing/`
- **Styles**: Use Tailwind classes (no separate CSS files)

## ⚠️ CRITICAL WARNINGS

- **NEVER handle raw payment data** - Use Stripe Elements only
- **NO hardcoded pricing** - Always fetch from API/database
- **Mobile-first design** - 60% of users are on mobile
- **Accessibility required** - Screen reader compatibility mandatory
- **Error boundaries needed** - Billing failures must not crash app

## 🏁 COMPLETION CHECKLIST

### Code Quality Verification:
- [ ] All deliverables complete WITH EVIDENCE
- [ ] Tests written FIRST and passing (show test-first commits)
- [ ] Serena patterns followed (list patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero console errors (show console screenshot)

### Integration Evidence:
- [ ] Navigation integration working (screenshots)
- [ ] Mobile responsive design (375px, 768px, 1920px screenshots)
- [ ] Accessibility compliance (Playwright accessibility tree)
- [ ] Usage dashboard shows real data (API integration working)

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const metrics = {
  pricingPageLoad: "0.8s",  // Target: <1s
  usageDashboardLoad: "0.5s", // Target: <1s
  bundleIncrease: "15kb", // Acceptable: <25kb for billing components
}
```

---

**EXECUTE IMMEDIATELY - Build conversion-optimized billing UI with comprehensive evidence package!**