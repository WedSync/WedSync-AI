# TEAM E - ROUND 1: WS-291 - Revenue Model System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive test suite for subscription billing system, create user documentation, and ensure quality assurance across all revenue model components
**FEATURE ID:** WS-291 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about billing system test coverage, edge cases, and user documentation for wedding industry context

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/__tests__/billing/
cat $WS_ROOT/wedsync/docs/billing/user-guide.md | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test billing -- --coverage
# MUST show: ">90% coverage, All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing test patterns and documentation
await mcp__serena__search_for_pattern("test billing payment subscription");
await mcp__serena__find_symbol("describe test expect", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/__tests__/");
```

### B. ANALYZE EXISTING TEST PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing test infrastructure
await mcp__serena__find_referencing_symbols("jest playwright test");
await mcp__serena__search_for_pattern("integration test API");
await mcp__serena__read_file("$WS_ROOT/wedsync/jest.config.js");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Jest testing-library React-testing"
# - "Playwright browser-automation testing"
# - "Stripe testing-webhooks mock"
# - "Next.js API-route testing"
```

### D. DOCUMENTATION PATTERN ANALYSIS (MINUTES 5-10)
```typescript
// Find existing documentation patterns
await mcp__serena__find_symbol("documentation guide manual", "", true);
await mcp__serena__search_for_pattern("user guide tutorial");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE QA STRATEGY

### QA-Specific Sequential Thinking Patterns

#### Pattern 1: Comprehensive Testing Strategy
```typescript
// Before creating test plans
mcp__sequential-thinking__sequential_thinking({
  thought: "Revenue model testing needs: Unit tests for pricing calculations, integration tests for Stripe workflows, E2E tests for complete subscription flows, accessibility tests for billing UI, performance tests for usage dashboards, security tests for payment handling, mobile tests for PWA billing, and cross-browser compatibility for payment forms.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific test scenarios: Photographer hits form limit during busy wedding season, venue subscription lapses during event coordination, failed payment during critical wedding week, mobile billing on wedding day with poor connectivity, couple loses access to wedding portal, supplier downgrade affects multiple active weddings.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation requirements: Billing setup guide for photographers, subscription management tutorial, troubleshooting guide for payment failures, upgrade flow walkthrough, mobile billing guide, WedMe benefits explanation for couples, API documentation for integrations, security best practices for handling billing data.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Quality assurance process: Test all team implementations for integration compatibility, validate user flows across mobile and desktop, verify accessibility compliance for billing forms, test error handling for payment failures, validate security measures for sensitive data, ensure performance meets targets on slow networks, create comprehensive bug tracking and resolution workflow.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Track testing progress across all team implementations
2. **test-automation-architect** - Use Serena to identify critical test paths and edge cases
3. **security-compliance-officer** - Ensure billing tests cover security vulnerabilities
4. **code-quality-guardian** - Validate test quality and coverage standards
5. **documentation-chronicler** - Create comprehensive user guides and technical docs
6. **plain-english-explainer** - Translate technical billing concepts for wedding professionals

## 🎯 TECHNICAL SPECIFICATION: WS-291 TESTING & DOCUMENTATION REQUIREMENTS

### **COMPREHENSIVE TEST SUITE ARCHITECTURE:**

#### 1. **Unit Tests - Billing Logic**
```typescript
// Location: $WS_ROOT/wedsync/__tests__/lib/revenue/pricing-engine.test.ts
describe('RevenueEngine', () => {
  describe('MRR Calculation', () => {
    test('calculates MRR correctly with mixed billing periods', () => {
      const engine = new RevenueEngine();
      const subscriptions = [
        { tier: 'starter', billing: 'monthly', price: 19 },
        { tier: 'professional', billing: 'annual', price: 588 }, // £49 * 12
        { tier: 'scale', billing: 'monthly', price: 79 }
      ];
      
      const expectedMRR = 19 + 49 + 79; // Annual subscription normalized to monthly
      expect(engine.calculateMRR(subscriptions)).toBe(expectedMRR);
    });
    
    test('handles prorations correctly for mid-month upgrades', () => {
      const engine = new RevenueEngine();
      const upgradeDate = new Date('2025-01-15'); // Mid-month
      const fromTier = { price: 19, name: 'starter' };
      const toTier = { price: 49, name: 'professional' };
      
      const proration = engine.calculateProration(fromTier, toTier, upgradeDate);
      
      // Should calculate remaining days in billing period
      expect(proration.credited_amount).toBeCloseTo(9.5); // Half month credit
      expect(proration.charged_amount).toBeCloseTo(24.5); // Half month charge
    });
    
    test('excludes failed payments from active MRR', () => {
      const subscriptions = [
        { tier: 'starter', billing: 'monthly', price: 19, status: 'active' },
        { tier: 'professional', billing: 'monthly', price: 49, status: 'past_due' },
      ];
      
      expect(engine.calculateActiveMRR(subscriptions)).toBe(19);
    });
  });
  
  describe('Churn Analysis', () => {
    test('calculates monthly churn rate correctly', () => {
      const engine = new RevenueEngine();
      const periodData = {
        startingUsers: 100,
        canceledUsers: 5,
        trialCancellations: 2 // Should be excluded
      };
      
      const churnRate = engine.calculateChurnRate(periodData, 'monthly');
      expect(churnRate).toBe(0.03); // 3% (5-2)/100
    });
    
    test('identifies at-risk users based on usage patterns', () => {
      const engine = new RevenueEngine();
      const users = [
        { id: '1', lastLogin: new Date('2025-01-01'), formsCreated: 0 },
        { id: '2', lastLogin: new Date('2025-01-20'), formsCreated: 15 },
      ];
      
      const atRisk = engine.identifyAtRiskUsers(users);
      expect(atRisk).toContain('1'); // No activity
      expect(atRisk).not.toContain('2'); // Active user
    });
  });
  
  describe('Upgrade Trigger Logic', () => {
    test('triggers starter upgrade when form limit reached', () => {
      const engine = new RevenueEngine();
      const usage = {
        tier: 'free',
        formsCreated: 1,
        formsLimit: 1,
        clientsManaged: 2
      };
      
      const triggers = engine.checkUpgradeTriggers(usage);
      expect(triggers).toContainEqual({
        type: 'form_limit_reached',
        recommendedTier: 'starter',
        urgency: 'high'
      });
    });
    
    test('suggests professional tier for high-volume users', () => {
      const usage = {
        tier: 'starter',
        formsCreated: 25,
        clientsManaged: 22,
        weddingsThisSeason: 15
      };
      
      const triggers = engine.checkUpgradeTriggers(usage);
      expect(triggers.some(t => t.recommendedTier === 'professional')).toBe(true);
    });
  });
});
```

#### 2. **Integration Tests - API Endpoints**
```typescript
// Location: $WS_ROOT/wedsync/__tests__/api/billing/subscription.test.ts
describe('/api/billing/subscribe', () => {
  test('creates subscription with proper validation', async () => {
    const validPayload = {
      tier_id: 'tier-professional',
      billing_period: 'monthly',
      payment_method_id: 'pm_test_123'
    };
    
    const response = await request(app)
      .post('/api/billing/subscribe')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(validPayload)
      .expect(200);
      
    expect(response.body).toMatchObject({
      subscription_id: expect.any(String),
      status: 'active',
      current_period_end: expect.any(String)
    });
    
    // Verify database record created
    const dbSubscription = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', response.body.subscription_id)
      .single();
      
    expect(dbSubscription.data).toBeTruthy();
  });
  
  test('prevents duplicate subscriptions for same user', async () => {
    // First subscription succeeds
    await createTestSubscription(testUserId);
    
    // Second subscription should fail
    const response = await request(app)
      .post('/api/billing/subscribe')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(validPayload)
      .expect(400);
      
    expect(response.body.error).toContain('existing subscription');
  });
  
  test('handles Stripe API failures gracefully', async () => {
    // Mock Stripe failure
    jest.spyOn(stripe.subscriptions, 'create').mockRejectedValue(
      new Error('Your card was declined')
    );
    
    const response = await request(app)
      .post('/api/billing/subscribe')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(validPayload)
      .expect(402);
      
    expect(response.body.error).not.toContain('declined'); // Sanitized error
    expect(response.body.error).toBe('Payment failed');
  });
});

describe('Webhook Processing', () => {
  test('processes subscription.created webhook idempotently', async () => {
    const webhookPayload = createStripeWebhookEvent('customer.subscription.created', {
      id: 'sub_test_123',
      customer: 'cus_test_123',
      metadata: { user_id: testUserId }
    });
    
    // Process webhook twice
    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', createWebhookSignature(webhookPayload))
      .send(webhookPayload)
      .expect(200);
      
    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', createWebhookSignature(webhookPayload))
      .send(webhookPayload)
      .expect(200);
    
    // Verify only one database record created
    const records = await supabase
      .from('webhook_events')
      .select('*')
      .eq('stripe_event_id', webhookPayload.id);
      
    expect(records.data.length).toBe(1);
  });
});
```

#### 3. **E2E Tests - Complete User Flows**
```typescript
// Location: $WS_ROOT/wedsync/__tests__/e2e/billing/subscription-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Subscription Management Flow', () => {
  test('complete signup to professional tier upgrade', async ({ page, browserName }) => {
    // Start from pricing page
    await page.goto('/pricing');
    
    // Test responsive pricing display
    if (browserName === 'webkit') {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone
    }
    
    // Take baseline screenshot
    await expect(page).toHaveScreenshot(`pricing-${browserName}.png`);
    
    // Select professional tier
    await page.click('[data-testid="select-professional"]');
    
    // Verify upgrade modal appears
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
    
    // Fill payment form
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/30');
    await page.fill('[data-testid="card-cvc"]', '123');
    
    // Complete subscription
    await page.click('[data-testid="complete-subscription"]');
    
    // Wait for success confirmation
    await expect(page.locator('[data-testid="subscription-success"]')).toBeVisible();
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify professional tier features are now available
    await expect(page.locator('[data-testid="professional-features"]')).toBeVisible();
  });
  
  test('usage dashboard triggers upgrade flow', async ({ page }) => {
    await page.goto('/settings/billing');
    
    // Mock user approaching limits
    await page.route('/api/billing/usage/*', route => {
      route.fulfill({
        json: {
          forms_created: 15,
          forms_limit: 20,
          upgrade_triggers: [{
            type: 'approaching_limit',
            recommendedTier: 'professional',
            message: 'You\'re approaching your form limit'
          }]
        }
      });
    });
    
    await page.reload();
    
    // Verify upgrade trigger appears
    await expect(page.locator('[data-testid="upgrade-trigger"]')).toBeVisible();
    
    // Click upgrade trigger
    await page.click('[data-testid="upgrade-professional"]');
    
    // Verify upgrade flow starts
    await expect(page.locator('[data-testid="upgrade-flow"]')).toBeVisible();
  });
  
  test('mobile billing management works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/settings/billing');
    
    // Test mobile pricing display
    await expect(page.locator('[data-testid="mobile-pricing"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="billing-period-toggle"]');
    
    // Verify annual pricing shows
    await expect(page.locator(':text("20% off")')).toBeVisible();
    
    // Test bottom sheet modal
    await page.tap('[data-testid="manage-payment-methods"]');
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('mobile-billing.png');
  });
});

test.describe('Accessibility Testing', () => {
  test('billing forms meet WCAG standards', async ({ page }) => {
    await page.goto('/settings/billing');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test screen reader compatibility
    const ariaLabels = await page.locator('[aria-label]').count();
    expect(ariaLabels).toBeGreaterThan(0);
    
    // Test color contrast (manual verification)
    await expect(page).toHaveScreenshot('billing-accessibility.png');
    
    // Verify form validation announcements
    await page.fill('[data-testid="card-number"]', 'invalid');
    await page.keyboard.press('Tab');
    
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
```

### **USER DOCUMENTATION SUITE:**

#### 1. **Billing Setup Guide for Wedding Professionals**
```markdown
// Location: $WS_ROOT/wedsync/docs/billing/getting-started.md
# Getting Started with WedSync Billing

## Overview
WedSync uses a freemium model designed specifically for wedding professionals. This guide will help you understand our pricing tiers and choose the right subscription for your business.

## Pricing Tiers

### Free Tier - Perfect for Testing
- **Cost**: £0/month
- **Best for**: Trying WedSync with your first wedding
- **Limitations**: 1 form only, basic features
- **Wedding Context**: Ideal for photographers handling 1-2 weddings per year

### Starter Tier - Growing Photographers
- **Cost**: £19/month or £182/year (20% savings)
- **Best for**: Photographers with 3-10 weddings per year
- **Features**: Unlimited forms, 2 team logins, email automation
- **Wedding Context**: Perfect for photographers building their wedding business

### Professional Tier - Established Businesses ⭐ Most Popular
- **Cost**: £49/month or £470/year (20% savings)
- **Best for**: Photographers with 15+ weddings per year
- **Features**: AI chatbot, SMS automation, marketplace selling (70% revenue share)
- **Wedding Context**: Ideal for busy wedding photographers who need automation

### Scale Tier - High-Volume Studios
- **Cost**: £79/month or £758/year (20% savings)
- **Best for**: Studios handling 30+ weddings per year
- **Features**: API access, advanced analytics, 5 team logins
- **Wedding Context**: Perfect for multi-photographer studios

### Enterprise Tier - Venue Operations
- **Cost**: £149/month or £1,428/year (20% savings)
- **Best for**: Wedding venues and large operations
- **Features**: White-label portal, unlimited logins, custom integrations
- **Wedding Context**: Built for venues managing hundreds of weddings

## Upgrading Your Account

### When You Hit Limits
WedSync will automatically suggest upgrades when you approach your tier limits:
- **Form Limit Reached**: Create unlimited forms with Starter tier
- **Need Team Access**: Add more logins with higher tiers
- **Want Automation**: Upgrade to Professional for SMS and AI features

### Upgrade Process
1. Go to Settings → Billing in your dashboard
2. Click "Upgrade" on your desired tier
3. Enter payment information (secure Stripe processing)
4. Changes take effect immediately
5. You'll only pay the prorated difference for the current period

### Payment Methods
- All major credit and debit cards accepted
- Secure processing through Stripe
- Monthly or annual billing options
- Easy payment method updates

## Wedding-Specific Benefits

### For Couples (WedMe Portal)
Your subscription tier determines what features couples see in their wedding portal:
- **Free**: Basic wedding information only
- **Starter+**: Full guest list management and timeline access
- **Professional+**: AI-powered wedding planning assistance
- **Scale+**: Advanced analytics and insights
- **Enterprise**: Custom-branded experience

### Peak Wedding Season
- Upgrade anytime during busy season (April-October)
- Downgrade during slower months (November-March)
- No long-term contracts - change as your business needs change

## Billing Support

### Common Questions
**Q: Can I change my subscription anytime?**
A: Yes! Upgrade instantly or schedule downgrades for your next billing cycle.

**Q: What happens if a payment fails?**
A: We'll retry the payment and send friendly reminders. Your account remains active during retry attempts.

**Q: Can I get a refund?**
A: We offer prorated refunds for downgrades and full refunds within 14 days of upgrade.

### Getting Help
- Email: billing@wedsync.com
- Live Chat: Available in your dashboard
- Phone: +44 (0) 20 1234 5678 (business hours)

## Next Steps
1. **Choose Your Tier**: Start with Starter if you're doing 3+ weddings per year
2. **Set Up Payment**: Add your payment method in Settings → Billing
3. **Explore Features**: Check out the features included in your tier
4. **Invite Your Team**: Add team members if your tier includes multiple logins

Ready to upgrade? [Visit your billing settings](https://app.wedsync.com/settings/billing) to get started!
```

#### 2. **Troubleshooting Guide**
```markdown
// Location: $WS_ROOT/wedsync/docs/billing/troubleshooting.md
# Billing Troubleshooting Guide

## Payment Issues

### Payment Failed
**Problem**: Your card was declined or payment failed
**Solutions**:
1. Check your card has sufficient funds
2. Verify card details are correct (number, expiry, CVC)
3. Contact your bank - they may be blocking international charges
4. Try a different card or payment method
5. Contact our support team for assistance

**Wedding Day Emergency**: If this happens during a wedding week, contact support immediately at +44 (0) 20 1234 5678 for instant resolution.

### Subscription Not Active
**Problem**: Paid for subscription but features aren't available
**Solutions**:
1. Wait 2-3 minutes for payment processing
2. Check your email for payment confirmation
3. Refresh your browser and log in again
4. Clear browser cache and cookies
5. Contact support with your order reference

### Wrong Tier Charged
**Problem**: Charged for different tier than selected
**Solutions**:
1. Check your billing history in Settings → Billing
2. Verify which tier you selected during signup
3. Contact support for immediate refund/correction
4. We'll process refunds within 24 hours

## Usage and Limits

### Still Seeing Limits After Upgrade
**Problem**: Upgraded but still can't create unlimited forms
**Solutions**:
1. Log out and log back in to refresh permissions
2. Clear browser cache
3. Check subscription status in Settings → Billing
4. If payment is processing, wait 5 minutes and try again

### Usage Not Updating
**Problem**: Created forms but usage dashboard shows old numbers
**Solutions**:
1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Usage updates every 15 minutes
3. Check if you're logged into the correct account
4. Contact support if usage is off by more than 24 hours

## Account Access

### Can't Access Billing Settings
**Problem**: Billing section not appearing in settings
**Solutions**:
1. Ensure you're the account owner (not a team member)
2. Check your user role in Settings → Team
3. Team members can't access billing - ask account owner
4. Contact support to transfer ownership if needed

### Lost Access After Payment Failure
**Problem**: Account suspended due to failed payment
**Solutions**:
1. Update payment method in billing settings
2. We'll automatically retry payment within 24 hours
3. Contact support for immediate reactivation
4. Your data is safe and will be restored when payment succeeds

## Mobile and Technical Issues

### Mobile Billing Not Working
**Problem**: Can't manage subscription on mobile device
**Solutions**:
1. Use Chrome or Safari (other browsers may not work)
2. Enable JavaScript and cookies
3. Switch to desktop for payment method changes
4. Use the WedSync mobile app if available
5. Clear mobile browser cache

### Payment Form Won't Load
**Problem**: Credit card form not appearing
**Solutions**:
1. Disable ad blockers and privacy extensions
2. Allow third-party cookies (required for Stripe)
3. Check your internet connection
4. Try incognito/private browsing mode
5. Switch to a different browser

## Wedding Day Emergencies

### Critical Access Needed During Wedding
If billing issues prevent access during a wedding:
1. **Call immediately**: +44 (0) 20 1234 5678
2. **WhatsApp**: +44 7XXX XXXXXX (24/7 wedding emergency line)
3. **Email**: emergency@wedsync.com (monitored 24/7)

We understand weddings can't wait - our emergency team will resolve billing issues within 15 minutes during wedding hours.

### Temporary Access
For urgent wedding day needs:
1. We can provide temporary 24-hour access
2. Billing issues can be resolved after the wedding
3. Your couples will never lose access to their wedding portal
4. All wedding data is always protected and accessible

## Contact Support

### Before Contacting Support
Please have ready:
- Your account email address
- Order or subscription ID (from email confirmation)
- Description of what you were trying to do
- Any error messages you received
- Screenshots if helpful

### How to Reach Us
- **Email**: billing@wedsync.com (response within 4 hours)
- **Live Chat**: Available in your dashboard (9am-6pm GMT)
- **Phone**: +44 (0) 20 1234 5678 (business hours)
- **Emergency**: +44 7XXX XXXXXX (wedding day emergencies only)

### Response Times
- General billing questions: Within 4 hours
- Payment issues: Within 2 hours  
- Account access problems: Within 1 hour
- Wedding day emergencies: Within 15 minutes

We're here to help make your billing experience as smooth as your weddings! 💍
```

## 🎭 COMPREHENSIVE TESTING REQUIREMENTS

### Test Coverage Requirements:
- **Unit Tests**: >95% coverage for all billing logic
- **Integration Tests**: 100% coverage for API endpoints
- **E2E Tests**: All critical user journeys tested
- **Accessibility Tests**: WCAG 2.1 AA compliance verified
- **Performance Tests**: Load times measured and optimized
- **Security Tests**: Payment handling security validated
- **Mobile Tests**: Cross-device compatibility confirmed
- **Cross-Browser Tests**: Chrome, Safari, Firefox, Edge

### Documentation Coverage Requirements:
- **User Guides**: Complete setup and troubleshooting guides
- **Technical Docs**: API documentation with examples
- **Video Tutorials**: Screen recordings for complex flows
- **FAQ Section**: Common questions and answers
- **Emergency Procedures**: Wedding day support protocols

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Comprehensive Test Suite**: Unit, integration, E2E tests with >90% coverage
- [ ] **User Documentation**: Complete billing guides for wedding professionals
- [ ] **Technical Documentation**: API docs and integration guides
- [ ] **Accessibility Validation**: WCAG 2.1 AA compliance testing
- [ ] **Performance Benchmarks**: Load time and responsiveness testing
- [ ] **Security Validation**: Payment security and data protection testing
- [ ] **Mobile Compatibility**: Cross-device and cross-browser testing
- [ ] **Bug Tracking System**: Comprehensive issue tracking and resolution

## 💾 WHERE TO SAVE YOUR WORK

- **Tests**: `$WS_ROOT/wedsync/__tests__/billing/`
- **E2E Tests**: `$WS_ROOT/wedsync/__tests__/e2e/billing/`
- **Documentation**: `$WS_ROOT/wedsync/docs/billing/`
- **Test Reports**: `$WS_ROOT/wedsync/test-reports/`
- **Screenshots**: `$WS_ROOT/wedsync/test-results/screenshots/`

## ⚠️ CRITICAL WARNINGS

- **Test billing with Stripe test mode only** - Never use real cards
- **Cover all edge cases** - Payment failures, network issues, browser problems
- **Document real wedding scenarios** - Industry-specific context required
- **Test accessibility thoroughly** - Many wedding pros have accessibility needs
- **Performance critical** - Wedding day operations cannot be slow

## 🏁 COMPLETION CHECKLIST

### Testing Verification:
```bash
# Run comprehensive test suite
npm test -- --coverage --watchAll=false
# Must show >90% coverage, all tests passing

# Run E2E tests across browsers
npm run test:e2e
# Must pass on Chrome, Safari, Firefox

# Run accessibility tests
npm run test:a11y
# Must meet WCAG 2.1 AA standards

# Performance testing
npm run test:performance
# Must meet load time targets
```

### Documentation Verification:
- [ ] User guides written in plain English
- [ ] Technical docs include code examples
- [ ] Troubleshooting covers common issues
- [ ] Wedding-specific scenarios documented
- [ ] Emergency procedures clearly outlined

### Quality Assurance Evidence:
- [ ] Test coverage report shows >90%
- [ ] All user flows tested end-to-end
- [ ] Accessibility compliance verified
- [ ] Performance benchmarks met
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsiveness validated
- [ ] Security tests pass
- [ ] Documentation reviewed and approved

---

**EXECUTE IMMEDIATELY - Build bulletproof testing suite with comprehensive documentation for wedding industry professionals!**