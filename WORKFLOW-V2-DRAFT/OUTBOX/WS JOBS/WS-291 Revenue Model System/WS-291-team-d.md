# TEAM D - ROUND 1: WS-291 - Revenue Model System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Optimize revenue model for mobile platform, implement PWA billing features, and ensure seamless WedMe integration with subscription tiers
**FEATURE ID:** WS-291 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile billing UX, offline subscription status, and WedMe platform value proposition

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/mobile/billing/
cat $WS_ROOT/wedsync/src/lib/mobile/subscription-sync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test mobile billing
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

// Query mobile and platform patterns
await mcp__serena__search_for_pattern("mobile PWA responsive billing");
await mcp__serena__find_symbol("MobileBilling PWAManager", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/mobile/");
```

### B. ANALYZE EXISTING MOBILE PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing PWA and mobile implementation
await mcp__serena__find_referencing_symbols("serviceWorker offline mobile");
await mcp__serena__search_for_pattern("responsive mobile-first");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/pwa/");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "PWA service-worker billing-offline"
# - "React mobile-first responsive-design"
# - "Tailwind CSS mobile-optimization"
# - "Next.js mobile-performance"
```

### D. WEDME PLATFORM ANALYSIS (MINUTES 5-10)
```typescript
// Find existing WedMe platform patterns
await mcp__serena__search_for_pattern("WedMe couple platform");
await mcp__serena__find_symbol("WedMe platform integration", "", true);
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Platform-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile-First Revenue Strategy
```typescript
// Before building mobile billing features
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile revenue platform needs: touch-optimized pricing tables for small screens, offline subscription status display, PWA billing notifications, simplified upgrade flows for thumb navigation, mobile payment method management, and WedMe-specific subscription benefits. Each requires different mobile UX patterns and performance optimizations.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe integration considerations: Couples access wedding info on mobile primarily, subscription benefits must be visible in couple portal, usage tracking needs mobile context (forms filled on-the-go), upgrade prompts should relate to wedding planning activities, billing notifications must work offline at venues with poor connectivity.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile billing UX patterns: Bottom sheet modals for pricing, sticky upgrade CTAs, progress indicators for payment flows, touch-friendly payment forms, card scanning for mobile users, biometric authentication for subscription changes, offline capability for viewing billing status.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use PWA features for offline billing status, implement touch-optimized components, create mobile-specific usage dashboards, build responsive pricing tables, add mobile payment flows, ensure seamless integration between supplier billing and WedMe access.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Track mobile optimization requirements and PWA dependencies
2. **ui-ux-designer** - Use Serena to analyze mobile billing UX patterns and optimize for wedding context
3. **performance-optimization-expert** - Ensure mobile billing performs well on slow networks
4. **code-quality-guardian** - Ensure mobile patterns match existing PWA implementation
5. **test-automation-architect** - Build mobile-specific tests for billing flows
6. **documentation-chronicler** - Document mobile billing patterns and WedMe integration

## 🎯 TECHNICAL SPECIFICATION: WS-291 MOBILE PLATFORM OPTIMIZATION

### **MOBILE-FIRST BILLING COMPONENTS:**

#### 1. **MobilePricingDisplay Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/mobile/billing/MobilePricingDisplay.tsx
interface Props {
  currentTier?: string;
  showCompactView?: boolean;
  isWedMeContext?: boolean; // Special styling for couple portal
}

// Key mobile optimizations:
// - Vertical pricing cards for narrow screens
// - Touch-friendly buttons (minimum 48x48px)
// - Swipe gestures for tier comparison
// - Bottom sheet modal for upgrade flow
// - Reduced cognitive load (3 tiers max on mobile)
// - Clear value props with wedding-specific benefits

export function MobilePricingDisplay({ currentTier, showCompactView, isWedMeContext }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  return (
    <div className="mobile-pricing-container">
      {/* Billing Period Toggle - Touch Optimized */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <TouchButton 
          active={selectedPeriod === 'monthly'}
          onClick={() => setSelectedPeriod('monthly')}
          className="flex-1 py-3"
        >
          Monthly
        </TouchButton>
        <TouchButton 
          active={selectedPeriod === 'annual'}
          onClick={() => setSelectedPeriod('annual')}
          className="flex-1 py-3"
        >
          Annual <span className="text-green-600">(20% off)</span>
        </TouchButton>
      </div>
      
      {/* Mobile-Optimized Pricing Cards */}
      <div className="space-y-4">
        {tiers.map((tier) => (
          <MobilePricingCard 
            key={tier.name}
            tier={tier}
            billingPeriod={selectedPeriod}
            isCurrentTier={currentTier === tier.name}
            isWedMeContext={isWedMeContext}
            onUpgrade={() => handleMobileUpgrade(tier.name)}
          />
        ))}
      </div>
      
      {/* Bottom Sheet Upgrade Modal */}
      {showUpgradeModal && (
        <BottomSheetModal onClose={() => setShowUpgradeModal(false)}>
          <MobileUpgradeFlow />
        </BottomSheetModal>
      )}
    </div>
  );
}
```

#### 2. **MobileUsageDashboard Component**
```typescript
// Location: $WS_ROOT/wedsync/src/components/mobile/billing/MobileUsageDashboard.tsx
interface Props {
  userId: string;
  compactMode?: boolean;
  showWeddingContext?: boolean; // Show usage in wedding planning context
}

// Mobile-specific features:
// - Circular progress indicators for usage
// - Swipe-to-refresh for real-time data
// - Quick action buttons for common tasks
// - Wedding context messaging ("3 forms created for Sarah's wedding")
// - Offline mode with last-known usage

export function MobileUsageDashboard({ userId, compactMode, showWeddingContext }: Props) {
  const { usage, loading, refresh } = useUsageData(userId);
  const [pullToRefresh, setPullToRefresh] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setPullToRefresh(true);
    await refresh();
    setPullToRefresh(false);
  }, [refresh]);
  
  return (
    <div className="mobile-usage-dashboard">
      {/* Pull-to-refresh indicator */}
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={pullToRefresh}>
        
        {/* Usage Overview Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <UsageCard
            title="Forms Created"
            current={usage.forms_created}
            limit={usage.forms_limit}
            icon={<FormIcon className="w-6 h-6" />}
            weddingContext={showWeddingContext ? "for your clients' weddings" : undefined}
          />
          
          <UsageCard
            title="Team Logins"
            current={usage.logins_this_month}
            limit={usage.logins_limit}
            icon={<UsersIcon className="w-6 h-6" />}
            weddingContext={showWeddingContext ? "accessing wedding details" : undefined}
          />
        </div>
        
        {/* Mobile-Optimized Upgrade Triggers */}
        {usage.upgrade_triggers?.map((trigger) => (
          <MobileUpgradeTrigger 
            key={trigger.type}
            trigger={trigger}
            onUpgrade={() => handleMobileUpgrade(trigger.recommended_tier)}
          />
        ))}
        
      </PullToRefresh>
    </div>
  );
}
```

#### 3. **PWA Billing Notifications**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/mobile/billing-notifications.ts
export class MobileBillingNotifications {
  private sw: ServiceWorker | null = null;
  
  async initializePWANotifications() {
    if ('serviceWorker' in navigator) {
      this.sw = await navigator.serviceWorker.ready;
      
      // Request notification permission
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }
  
  async sendBillingReminder(data: BillingReminderData) {
    if (this.sw && Notification.permission === 'granted') {
      // Send notification even when app is closed
      await this.sw.showNotification('WedSync - Payment Due', {
        body: `Your ${data.tierName} subscription payment of £${data.amount} is due tomorrow`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'billing-reminder',
        data: {
          action: 'view-billing',
          url: '/settings/billing'
        },
        actions: [
          {
            action: 'pay-now',
            title: 'Pay Now'
          },
          {
            action: 'view-details',
            title: 'View Details'
          }
        ]
      });
    }
  }
  
  async sendUpgradeOpportunity(data: UpgradeOpportunityData) {
    await this.sw?.showNotification('WedSync - Upgrade Available', {
      body: `You've reached your ${data.currentTier} limits. Upgrade to ${data.recommendedTier} for unlimited access.`,
      icon: '/icons/icon-192x192.png',
      tag: 'upgrade-opportunity',
      data: {
        action: 'upgrade',
        tier: data.recommendedTier
      }
    });
  }
}
```

### **WEDME PLATFORM INTEGRATION:**

#### 1. **WedMe Subscription Benefits Display**
```typescript
// Location: $WS_ROOT/wedsync/src/components/wedme/billing/SubscriptionBenefits.tsx
interface Props {
  supplierTier: string;
  coupleId: string;
  isWeddingActive: boolean;
}

// WedMe-specific features based on supplier's subscription:
// - Free tier: Basic wedding info only
// - Starter: Unlimited forms + guest list
// - Professional: AI chatbot + premium features
// - Scale: Advanced analytics + automation
// - Enterprise: White-label WedMe portal

export function WedMeSubscriptionBenefits({ supplierTier, coupleId, isWeddingActive }: Props) {
  const benefits = getWedMeBenefits(supplierTier);
  
  return (
    <div className="wedme-benefits-display">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Your Wedding Portal Features
        </h3>
        <p className="text-sm text-gray-600">
          Powered by your photographer's {supplierTier.charAt(0).toUpperCase() + supplierTier.slice(1)} subscription
        </p>
      </div>
      
      <div className="space-y-3">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {benefit.available ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${
                benefit.available ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {benefit.name}
              </p>
              <p className="text-xs text-gray-500">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Encourage supplier upgrade if benefits are limited */}
      {supplierTier === 'free' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Want more features?</strong> Ask your photographer about upgrading 
            their WedSync subscription to unlock premium wedding planning tools.
          </p>
        </div>
      )}
    </div>
  );
}
```

#### 2. **Mobile-Optimized Billing Management**
```typescript
// Location: $WS_ROOT/wedsync/src/components/mobile/billing/MobileBillingManager.tsx
export function MobileBillingManager() {
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  
  return (
    <div className="mobile-billing-manager">
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <TouchActionCard
          title="Current Plan"
          subtitle="Professional - £49/month"
          icon={<CreditCardIcon />}
          onClick={() => setShowPricingModal(true)}
        />
        
        <TouchActionCard
          title="Next Payment"
          subtitle="Due in 3 days"
          icon={<CalendarIcon />}
          onClick={() => setShowBillingHistory(true)}
        />
      </div>
      
      {/* Mobile-Optimized Settings List */}
      <div className="space-y-2">
        <SettingsRow
          title="Payment Methods"
          subtitle="•••• 4242"
          onClick={() => setShowPaymentMethods(true)}
          showChevron
        />
        
        <SettingsRow
          title="Billing History"
          subtitle="View invoices"
          onClick={() => setShowBillingHistory(true)}
          showChevron
        />
        
        <SettingsRow
          title="Usage & Limits"
          subtitle="Forms: 45/unlimited"
          onClick={() => setShowUsageDashboard(true)}
          showChevron
        />
      </div>
      
      {/* Bottom Sheet Modals */}
      <BottomSheetModal 
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        title="Payment Methods"
      >
        <MobilePaymentMethods />
      </BottomSheetModal>
    </div>
  );
}
```

### **PWA OFFLINE CAPABILITIES:**

#### 1. **Offline Billing Status**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/mobile/offline-billing.ts
export class OfflineBillingManager {
  private cache = new Map<string, any>();
  
  async cacheBillingData(userId: string) {
    try {
      const billingData = await fetch(`/api/billing/status/${userId}`).then(r => r.json());
      
      // Cache in IndexedDB for offline access
      await this.storeInIndexedDB('billing-data', userId, {
        ...billingData,
        cached_at: new Date().toISOString()
      });
      
      this.cache.set(userId, billingData);
    } catch (error) {
      console.warn('Failed to cache billing data:', error);
    }
  }
  
  async getBillingStatus(userId: string): Promise<BillingStatus> {
    // Try network first, then cache
    try {
      if (navigator.onLine) {
        const fresh = await this.fetchFreshBillingData(userId);
        this.cache.set(userId, fresh);
        return fresh;
      }
    } catch (error) {
      console.warn('Network billing request failed, using cache');
    }
    
    // Fallback to cached data
    const cached = this.cache.get(userId) || await this.getFromIndexedDB('billing-data', userId);
    
    if (cached) {
      return {
        ...cached,
        is_offline: true,
        last_updated: cached.cached_at
      };
    }
    
    // Last resort - minimal offline state
    return {
      tier_name: 'unknown',
      status: 'offline',
      is_offline: true,
      error: 'No cached billing data available'
    };
  }
}
```

## 🎭 MOBILE TESTING REQUIREMENTS

### PWA Billing Tests:
```javascript
// Test mobile pricing display
await mcp__playwright__browser_resize({width: 375, height: 667}); // iPhone SE
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/billing"});

// Test touch interactions
await mcp__playwright__browser_click({
  element: "annual toggle", 
  ref: "[data-testid='billing-period-mobile']"
});

// Test bottom sheet modal
await mcp__playwright__browser_click({
  element: "upgrade button",
  ref: "[data-testid='mobile-upgrade-professional']"
});
await mcp__playwright__browser_wait_for({text: "Professional Plan Features"});

// Test offline billing status
await mcp__playwright__browser_evaluate({
  function: "() => { navigator.serviceWorker.controller.postMessage({type: 'SIMULATE_OFFLINE'}); }"
});
await mcp__playwright__browser_snapshot();

// Test payment method management on mobile
await mcp__playwright__browser_click({
  element: "payment methods",
  ref: "[data-testid='mobile-payment-methods']"
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Mobile Pricing Display**: Touch-optimized pricing tables for 375px+ screens
- [ ] **PWA Billing Notifications**: Offline payment reminders and upgrade prompts
- [ ] **WedMe Integration**: Subscription benefits display in couple portal
- [ ] **Mobile Usage Dashboard**: Real-time usage with wedding context
- [ ] **Offline Billing Status**: Cached subscription data for offline access
- [ ] **Touch-Optimized Controls**: All billing interactions thumb-friendly
- [ ] **Bottom Sheet Modals**: Native-feeling mobile upgrade flows
- [ ] **Mobile Performance**: <1s load time on 3G networks

## 💾 WHERE TO SAVE YOUR WORK

- **Mobile Components**: `$WS_ROOT/wedsync/src/components/mobile/billing/`
- **PWA Services**: `$WS_ROOT/wedsync/src/lib/mobile/`
- **WedMe Integration**: `$WS_ROOT/wedsync/src/components/wedme/billing/`
- **Offline Logic**: `$WS_ROOT/wedsync/src/lib/pwa/`
- **Tests**: `$WS_ROOT/wedsync/__tests__/mobile/billing/`

## ⚠️ CRITICAL WARNINGS

- **Touch targets minimum 48x48px** - Apple HIG requirement
- **Test on actual devices** - Emulators don't catch all issues  
- **Offline functionality required** - Wedding venues have poor connectivity
- **Performance critical** - Mobile users on slow networks
- **Accessibility mandatory** - Screen reader support on mobile

## 🏁 COMPLETION CHECKLIST

### Mobile UX Verification:
- [ ] All touch targets meet 48x48px minimum
- [ ] Pricing tables readable on 375px width
- [ ] Bottom sheets work on iOS Safari
- [ ] Offline billing status displays correctly
- [ ] PWA notifications work when app is closed

### Performance Evidence:
```javascript
// Required mobile metrics
const mobileMetrics = {
  pricingLoadTime: "0.8s",  // Target: <1s on 3G
  usageDashboardLoad: "0.6s", // Target: <1s
  offlineResponse: "0.1s", // Target: Instant
  bundleSize: "18kb", // Acceptable: <25kb for mobile components
}
```

### Integration Testing:
- [ ] WedMe portal shows correct tier benefits
- [ ] Mobile upgrade flow completes successfully
- [ ] Offline mode gracefully degrades
- [ ] PWA notifications trigger correctly
- [ ] Cross-device sync working (desktop ↔ mobile)

---

**EXECUTE IMMEDIATELY - Build seamless mobile billing experience with comprehensive PWA integration!**