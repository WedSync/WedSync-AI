# 🔌 Payment Integration Guide for Sessions A & B
**Last Updated: January 15, 2025**

---

## 🎯 Quick Integration Reference

This guide shows Sessions A & B how to integrate with the payment system for tier-based feature access.

---

## 📦 Import What You Need

```typescript
// Main configuration
import { 
  SUBSCRIPTION_TIERS,
  canCreateForm,
  canUsePdfImport,
  canUseAiChatbot,
  type SubscriptionTier 
} from '@/lib/stripe-config';

// Tier enforcement
import { tierLimitsManager } from '@/lib/tier-limits';

// Feature gates for API routes
import { enforceTierLimits } from '@/lib/feature-gates';
```

---

## 🔐 Session A: Forms System Integration

### 1. Check Form Creation Limits

```typescript
// In your form creation API or component
import { tierLimitsManager } from '@/lib/tier-limits';

export async function createForm(request: NextRequest) {
  // Get user's organization
  const organizationId = await getUserOrganizationId(request);
  
  // Check if user can create another form
  const canCreate = await tierLimitsManager.canCreateForm(organizationId);
  
  if (!canCreate.allowed) {
    return NextResponse.json({
      error: canCreate.message,
      upgradeUrl: canCreate.upgrade_url,
      suggestedTier: canCreate.upgrade_options?.[0]
    }, { status: 403 });
  }
  
  // Continue with form creation...
}
```

### 2. Display Form Limits in UI

```typescript
// In your dashboard component
const FormLimitDisplay = () => {
  const [limits, setLimits] = useState<any>(null);
  
  useEffect(() => {
    const checkLimits = async () => {
      const usage = await tierLimitsManager.getCurrentUsage();
      const tier = await tierLimitsManager.getCurrentTier();
      const tierLimits = TIER_LIMITS[tier];
      
      setLimits({
        used: usage.forms_count,
        max: tierLimits.forms,
        isUnlimited: tierLimits.forms === -1
      });
    };
    checkLimits();
  }, []);
  
  if (limits?.isUnlimited) {
    return <div>Forms: {limits.used} (Unlimited)</div>;
  }
  
  return (
    <div>
      Forms: {limits?.used}/{limits?.max}
      {limits?.used >= limits?.max && (
        <Link href="/pricing">Upgrade for more forms</Link>
      )}
    </div>
  );
};
```

### 3. Tier-Specific Features

```typescript
// FREE tier limitations
if (userTier === 'FREE') {
  // Can only have 1 form
  // Show "Powered by WedSync" branding
  // No email automation
}

// STARTER+ features
if (['STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE'].includes(userTier)) {
  // Unlimited forms
  // No branding
  // Email automation enabled
}
```

---

## 📄 Session B: PDF Import Integration

### 1. Gate PDF Import Feature

```typescript
// In your PDF upload API route
import { enforceTierLimits } from '@/lib/feature-gates';

export async function POST(request: NextRequest) {
  // Check tier access for PDF import
  const tierCheck = await enforceTierLimits(request, 'pdfImport');
  
  if (tierCheck) {
    // Return the tier enforcement error (user needs STARTER+)
    return tierCheck;
  }
  
  // Continue with PDF processing...
  const formData = await request.formData();
  const file = formData.get('pdf') as File;
  // ... process PDF
}
```

### 2. Show/Hide PDF Import UI

```typescript
// In your forms component
import { canUsePdfImport } from '@/lib/stripe-config';

const FormBuilder = () => {
  const [userTier, setUserTier] = useState<SubscriptionTier>('FREE');
  const [showPdfImport, setShowPdfImport] = useState(false);
  
  useEffect(() => {
    const checkAccess = async () => {
      const tier = await tierLimitsManager.getCurrentTier();
      setUserTier(tier);
      setShowPdfImport(canUsePdfImport(tier));
    };
    checkAccess();
  }, []);
  
  return (
    <div>
      {showPdfImport ? (
        <PDFImportButton />
      ) : (
        <UpgradePrompt 
          feature="PDF Import"
          minimumTier="STARTER"
          price="£19/month"
        />
      )}
    </div>
  );
};
```

### 3. Upgrade Prompt Component

```typescript
// Shared upgrade prompt component
const UpgradePrompt = ({ feature, minimumTier, price }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-semibold text-yellow-900">
        {feature} is a Premium Feature
      </h3>
      <p className="text-yellow-700 mt-1">
        Upgrade to {SUBSCRIPTION_TIERS[minimumTier].name} to unlock this feature
      </p>
      <div className="mt-3 flex items-center gap-4">
        <span className="text-2xl font-bold">{price}</span>
        <Link 
          href="/pricing" 
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
};
```

---

## 🎁 Trial Period Handling

### Check if User is in Trial

```typescript
import { checkTrialStatus } from '@/lib/stripe-config';

// In your component or API
const getEffectiveTier = async (user: User): Promise<SubscriptionTier> => {
  if (user.trial_end && user.trial_active) {
    const trialStatus = checkTrialStatus(user.trial_end);
    
    if (trialStatus.isActive) {
      // User is in trial, give them PROFESSIONAL features
      return 'PROFESSIONAL';
    }
  }
  
  // Trial expired or no trial, use actual tier
  return user.subscription_tier || 'FREE';
};

// Show trial banner
const TrialBanner = ({ trialEnd }) => {
  const status = checkTrialStatus(trialEnd);
  
  if (!status.isActive) return null;
  
  return (
    <div className="bg-blue-600 text-white p-3">
      🎁 You have {status.daysRemaining} days left in your Professional trial
      <Link href="/pricing" className="underline ml-2">
        Choose a plan
      </Link>
    </div>
  );
};
```

---

## 📊 Tier Information Display

### Show Current Plan

```typescript
const CurrentPlanDisplay = () => {
  const [planInfo, setPlanInfo] = useState<any>(null);
  
  useEffect(() => {
    const loadPlan = async () => {
      const tier = await tierLimitsManager.getCurrentTier();
      const usage = await tierLimitsManager.getCurrentUsage();
      const tierDef = SUBSCRIPTION_TIERS[tier];
      
      setPlanInfo({
        name: tierDef.name,
        price: formatPrice(tierDef.monthlyPrice),
        features: tierDef.highlights,
        usage: {
          forms: usage.forms_count,
          logins: usage.team_members_count
        }
      });
    };
    loadPlan();
  }, []);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold">{planInfo?.name} Plan</h2>
      <p className="text-3xl font-bold mt-2">{planInfo?.price}</p>
      <div className="mt-4">
        <h3 className="font-semibold">Your Usage:</h3>
        <ul>
          <li>Forms: {planInfo?.usage.forms}</li>
          <li>Team Members: {planInfo?.usage.logins}</li>
        </ul>
      </div>
      <Link href="/pricing" className="mt-4 inline-block text-blue-600">
        Change Plan →
      </Link>
    </div>
  );
};
```

---

## 🔄 API Response Standards

### When Feature is Blocked

```json
{
  "error": "PDF Import requires Starter subscription or higher",
  "upgradeUrl": "/pricing",
  "currentTier": "FREE",
  "suggestedTier": "STARTER",
  "price": "£19/month"
}
```

### When at Limit

```json
{
  "error": "You've reached your form limit (1 form on Free tier)",
  "currentUsage": 1,
  "limit": 1,
  "upgradeUrl": "/pricing",
  "upgradeOptions": [
    {
      "tier": "STARTER",
      "price": 19,
      "cta": "Upgrade to Starter (£19/mo)"
    }
  ]
}
```

---

## 🧪 Testing Your Integration

### 1. Test with Different Tiers

```typescript
// Mock different tiers for testing
const testTiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE'];

testTiers.forEach(tier => {
  console.log(`Testing ${tier}:`);
  console.log('- Can create form:', canCreateForm(tier, 0));
  console.log('- Can use PDF:', canUsePdfImport(tier));
  console.log('- Can use AI:', canUseAiChatbot(tier));
});
```

### 2. Test Upgrade Flows

```typescript
// Simulate hitting limits
const testUpgradeFlow = async () => {
  // Set user as FREE tier
  const freeUserCheck = await tierLimitsManager.canCreateForm();
  console.log('Free user creating 2nd form:', freeUserCheck);
  // Should return: { allowed: false, message: "Upgrade to Starter..." }
  
  // Test PDF import access
  const pdfCheck = await tierLimitsManager.canUsePdfImport();
  console.log('Free user accessing PDF:', pdfCheck);
  // Should return: { allowed: false, message: "PDF Import requires Starter..." }
};
```

---

## 📝 Quick Reference Table

| Feature | FREE | STARTER | PROFESSIONAL | SCALE | ENTERPRISE |
|---------|------|---------|--------------|-------|------------|
| Forms | 1 | Unlimited | Unlimited | Unlimited | Unlimited |
| PDF Import | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI Chatbot | ❌ | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ❌ | ✅ |
| Price (GBP) | £0 | £19 | £49 | £79 | £149 |

---

## 🆘 Need Help?

- **Tier Definitions**: `/wedsync/src/lib/stripe-config.ts`
- **Enforcement Logic**: `/wedsync/src/lib/tier-limits.ts`
- **Feature Gates**: `/wedsync/src/lib/feature-gates.ts`
- **Pricing Reference**: `/PRICING-MEMORY.md`

---

**Remember**: Always check tier access before showing premium features!