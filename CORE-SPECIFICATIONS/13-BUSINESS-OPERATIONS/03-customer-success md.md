# 03-customer-success.md

## What to Build

A proactive customer success system that monitors supplier health, prevents churn, and drives feature adoption through automated interventions and personalized support.

## Technical Requirements

### Database Schema

```
-- Customer health scoring
CREATE TABLE customer_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  health_score INT, -- 0-100
  risk_level TEXT, -- 'healthy', 'at_risk', 'critical'
  last_login TIMESTAMPTZ,
  feature_adoption_score INT,
  client_engagement_score INT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success milestones tracking
CREATE TABLE success_milestones (
  supplier_id UUID REFERENCES suppliers(id),
  milestone_type TEXT, -- 'first_form', 'ten_clients', 'first_automation'
  achieved_at TIMESTAMPTZ,
  celebrated BOOLEAN DEFAULT false
);

-- Support interactions
CREATE TABLE support_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  type TEXT, -- 'onboarding_call', 'check_in', 'technical_support'
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Health Score Calculation

```
interface HealthMetrics {
  loginFrequency: number; // Days since last login
  featureAdoption: number; // % of key features used
  clientActivity: number; // Active clients / total clients
  formCompletionRate: number; // Client form completion %
  journeyPerformance: number; // Journey email open rates
}

export function calculateHealthScore(
  metrics: HealthMetrics
): {score: number; risk: string} {
  let score = 0;
  
  // Login frequency (30 points)
  if (metrics.loginFrequency < 3) score += 30;
  else if (metrics.loginFrequency < 7) score += 20;
  else if (metrics.loginFrequency < 14) score += 10;
  
  // Feature adoption (25 points)
  score += Math.min(25, metrics.featureAdoption * 25);
  
  // Client activity (25 points)
  score += Math.min(25, metrics.clientActivity * 25);
  
  // Form completion (10 points)
  score += Math.min(10, metrics.formCompletionRate * 10);
  
  // Journey performance (10 points)
  score += Math.min(10, metrics.journeyPerformance * 10);
  
  const risk = score < 40 ? 'critical' : 
               score < 70 ? 'at_risk' : 'healthy';
  
  return { score, risk };
}
```

### Automated Interventions

```
const INTERVENTION_TRIGGERS = [
  {
    condition: 'no_login_7_days',
    action: 'send_re_engagement_email',
    template: 'we_miss_you'
  },
  {
    condition: 'low_client_adoption',
    action: 'send_adoption_tips',
    template: 'boost_client_engagement'
  },
  {
    condition: 'stuck_onboarding',
    action: 'offer_setup_call',
    template: 'lets_get_you_started'
  },
  {
    condition: 'high_usage_no_upgrade',
    action: 'send_upgrade_benefits',
    template: 'unlock_more_features'
  },
  {
    condition: 'approaching_limits',
    action: 'notify_usage_limits',
    template: 'reaching_plan_limits'
  }
];

export async function runDailyInterventions() {
  const suppliers = await getAllActiveSuppliers();
  
  for (const supplier of suppliers) {
    const health = await calculateHealthScore([supplier.id](http://supplier.id));
    
    for (const trigger of INTERVENTION_TRIGGERS) {
      if (await checkCondition(trigger.condition, supplier)) {
        await executeIntervention(trigger.action, supplier);
        await logIntervention([supplier.id](http://supplier.id), trigger);
      }
    }
  }
}
```

### Onboarding Success Path

```
interface OnboardingSteps {
  day0: {
    actions: ['account_created', 'vendor_type_selected'],
    success_metric: 'completed_wizard'
  };
  day1: {
    actions: ['first_login', 'import_clients_started'],
    intervention_if_missed: 'send_getting_started_video'
  };
  day3: {
    actions: ['first_form_created', 'invite_sent_to_client'],
    intervention_if_missed: 'offer_form_creation_help'
  };
  day7: {
    actions: ['customer_journey_started', 'multiple_clients_active'],
    intervention_if_missed: 'schedule_onboarding_call'
  };
  day14: {
    milestone: 'fully_activated',
    celebration: 'send_success_certificate'
  };
}

// Track onboarding progress
export async function updateOnboardingProgress(
  supplierId: string,
  action: string
) {
  const progress = await getOnboardingProgress(supplierId);
  progress.completedActions.push(action);
  
  // Check for milestone completion
  const milestone = checkMilestone(progress);
  if (milestone) {
    await celebrateMilestone(supplierId, milestone);
  }
  
  await saveProgress(supplierId, progress);
}
```

### In-App Guidance System

```
export function InAppCoach({ supplierId }: Props) {
  const [tips, setTips] = useState<Tip[]>([]);
  const health = useHealthScore(supplierId);
  
  useEffect(() => {
    // Load contextual tips based on current page and user state
    const contextualTips = getContextualTips({
      page: router.pathname,
      userProgress: health.featureAdoption,
      riskLevel: health.risk
    });
    setTips(contextualTips);
  }, [router.pathname, health]);
  
  return (
    <div className="coach-widget">
      {health.risk === 'at_risk' && (
        <Alert type="warning">
          Need help? Let's schedule a quick call to get you on track.
          <button onClick={scheduleCall}>Book 15 min call</button>
        </Alert>
      )}
      
      {[tips.map](http://tips.map)(tip => (
        <TipCard key={[tip.id](http://tip.id)} tip={tip} onDismiss={dismissTip} />
      ))}
    </div>
  );
}
```

### Churn Prevention Workflow

```
export async function detectChurnRisk(
  supplierId: string
): Promise<ChurnRisk> {
  const signals = {
    lastLogin: await getLastLogin(supplierId),
    supportTickets: await getRecentTickets(supplierId),
    featureUsage: await getFeatureUsageDecline(supplierId),
    clientChurn: await getClientChurnRate(supplierId),
    billingIssues: await getBillingProblems(supplierId)
  };
  
  const riskScore = calculateChurnRisk(signals);
  
  if (riskScore > 0.7) {
    // High risk - immediate action
    await assignToCustomerSuccess(supplierId, 'high_priority');
    await sendPersonalizedRetentionOffer(supplierId);
  } else if (riskScore > 0.4) {
    // Medium risk - automated intervention
    await scheduleCheckInEmail(supplierId);
  }
  
  return { score: riskScore, signals };
}
```

## Critical Implementation Notes

1. **Segmentation**: Treat photographers differently from DJs - different success metrics
2. **Seasonality**: Account for wedding season in health scoring (November slowdown is normal)
3. **Personal Touch**: Automated emails should feel personal, use supplier's actual data
4. **Early Warning**: Detect issues before they become problems (3-day inactivity vs 30-day)
5. **Celebration**: Celebrate wins to reinforce positive behavior

## API Endpoints

```
// GET /api/health/score/:supplierId
// Returns current health score and risk level

// POST /api/success/milestone
// Records achievement of success milestone

// GET /api/success/recommendations/:supplierId  
// Returns personalized recommendations

// POST /api/support/schedule-call
// Books customer success call
```

## Monitoring Metrics

- Average health score by cohort
- Intervention success rate
- Time to first value (first form created)
- Feature adoption rate by tier
- Support ticket resolution time
- Churn prediction accuracy