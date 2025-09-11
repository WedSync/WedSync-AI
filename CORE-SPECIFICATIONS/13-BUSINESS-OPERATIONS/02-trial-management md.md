# 02-trial-management.md

## What to Build

A comprehensive 30-day trial system for WedSync Professional tier with intelligent extension offers, usage tracking, and conversion optimization. Couples always use WedMe free.

## Technical Requirements

### Database Schema

```
-- Trial tracking table
CREATE TABLE trial_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ,
  extended BOOLEAN DEFAULT false,
  extension_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  activity_score INT DEFAULT 0
);

-- Trial activity metrics
CREATE TABLE trial_activity (
  supplier_id UUID REFERENCES suppliers(id),
  date DATE,
  logins INT DEFAULT 0,
  forms_created INT DEFAULT 0,
  clients_imported INT DEFAULT 0,
  journeys_created INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  feature_usage JSONB
);
```

### Trial Activation Flow

```
export async function startTrial(supplierId: string) {
  const trialEnd = addDays(new Date(), 30);
  
  // Create trial record
  await supabase.from('trial_tracking').insert({
    supplier_id: supplierId,
    trial_end: trialEnd
  });
  
  // Give Professional features immediately
  await supabase.from('supplier_subscriptions').insert({
    supplier_id: supplierId,
    tier_id: PROFESSIONAL_TIER_ID,
    status: 'trialing',
    trial_ends_at: trialEnd
  });
  
  // Schedule onboarding emails
  await scheduleTrialEmails(supplierId);
  
  // Track activation event
  await trackEvent('trial_started', { supplierId });
}
```

### Extension Eligibility System

```
interface ExtensionCriteria {
  minActivityScore: 40; // Out of 100
  requirementsmet: {
    hasLoggedIn: boolean; // Min 5 times
    hasImportedClients: boolean; // Min 10
    hasCreatedForm: boolean; // Min 1
    hasStartedJourney: boolean; // Optional but adds points
  };
  notEligibleIf: {
    alreadyExtended: boolean;
    accountAge: number; // > 45 days
    previousTrialExists: boolean;
  };
}

export async function checkExtensionEligibility(
  supplierId: string
): Promise<{eligible: boolean; reason?: string}> {
  const trial = await getTrialData(supplierId);
  const activity = await getTrialActivity(supplierId);
  
  // Calculate activity score
  const score = calculateActivityScore(activity);
  
  if (trial.extended) {
    return {eligible: false, reason: 'Already extended'};
  }
  
  if (score < 40) {
    return {eligible: false, reason: 'Insufficient activity'};
  }
  
  return {eligible: true};
}
```

### Trial Communication Schedule

```
const TRIAL_EMAIL_SEQUENCE = [
  {
    day: 0,
    template: 'welcome_to_trial',
    subject: 'Welcome! Here\'s how to get started'
  },
  {
    day: 3,
    template: 'import_clients_reminder',
    condition: 'no_clients_imported'
  },
  {
    day: 7,
    template: 'week_one_checkin',
    includeUsageStats: true
  },
  {
    day: 14,
    template: 'halfway_point',
    showSuccessStories: true
  },
  {
    day: 25,
    template: 'extension_offer',
    condition: 'eligible_for_extension'
  },
  {
    day: 28,
    template: 'trial_ending_soon',
    includeSpecialOffer: true
  },
  {
    day: 30,
    template: 'trial_ended',
    showDowngradeOptions: true
  }
];
```

### Trial Dashboard Widget

```
// Component for supplier dashboard
export function TrialStatusWidget({ supplierId }: Props) {
  const trial = useTrialData(supplierId);
  const daysLeft = differenceInDays(trial.trial_end, new Date());
  
  return (
    <div className="trial-widget">
      <h3>Professional Trial</h3>
      <div className="days-remaining">
        {daysLeft} days left
      </div>
      
      <div className="trial-progress">
        <ProgressBar value={trial.activityScore} max={100} />
        <span>{trial.activityScore}% setup complete</span>
      </div>
      
      <div className="trial-checklist">
        <ChecklistItem done={trial.hasImportedClients}>
          Import your clients
        </ChecklistItem>
        <ChecklistItem done={trial.hasCreatedForm}>
          Create your first form
        </ChecklistItem>
        <ChecklistItem done={trial.hasSetupJourney}>
          Set up automation
        </ChecklistItem>
      </div>
      
      {trial.eligibleForExtension && (
        <button onClick={extendTrial}>
          Get 15 Extra Days Free
        </button>
      )}
    </div>
  );
}
```

### Conversion Tracking

```
export async function trackTrialConversion(
  supplierId: string,
  convertedToTier: string
) {
  const trial = await getTrialData(supplierId);
  const timeToConvert = differenceInDays(
    new Date(),
    trial.trial_start
  );
  
  await supabase.from('trial_tracking')
    .update({
      conversion_date: new Date(),
      converted_tier: convertedToTier
    })
    .eq('supplier_id', supplierId);
  
  // Track metrics
  await trackEvent('trial_converted', {
    supplierId,
    timeToConvert,
    tier: convertedToTier,
    wasExtended: trial.extended
  });
}
```

## Critical Implementation Notes

1. **Activity Scoring**: Weight actions by value (form creation = 20 points, client import = 2 points each)
2. **Extension Once Only**: Use database flag to prevent multiple extensions
3. **Grace Period**: 3-day grace after trial ends before removing features
4. **Data Retention**: Keep all data created during trial, make read-only if not converted
5. **Reactivation**: Previous trial users cannot get new trial on same email

## API Endpoints

```
// GET /api/trial/status
// Returns trial status, days left, activity score

// POST /api/trial/extend
// Extends trial by 15 days if eligible

// GET /api/trial/activity
// Returns detailed activity metrics

// POST /api/trial/convert
// Converts trial to paid subscription
```

## Monitoring Metrics

- Trial activation rate (from signup)
- Extension request rate (target: 30-40%)
- Extension to conversion rate (target: 45%)
- Average time to conversion
- Feature usage during trial
- Drop-off points in trial journey