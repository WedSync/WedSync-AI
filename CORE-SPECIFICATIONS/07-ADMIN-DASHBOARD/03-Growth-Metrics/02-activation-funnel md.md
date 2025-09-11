# 02-activation-funnel.md

## What to Build

User activation funnel tracking system monitoring conversion from signup through key value moments to activated power users.

## Key Technical Requirements

### Activation Funnel Structure

```
interface ActivationFunnel {
  stages: FunnelStage[]
  overallConversion: number
  timeToActivation: number // Average days
  dropoffAnalysis: DropoffPoint[]
}

interface FunnelStage {
  name: string
  description: string
  users: number
  conversionRate: number
  avgTimeToReach: number // Hours from signup
  dropoffRate: number
}

interface ActivationMetrics {
  signups: number
  emailVerified: number
  profileCompleted: number
  firstFormCreated: number
  firstClientAdded: number
  firstInviteSent: number
  activated: number // Reached "aha moment"
}
```

### Activation Tracker Implementation

```
class ActivationTracker {
  // Define activation criteria per user type
  private readonly ACTIVATION_CRITERIA = {
    supplier: {
      requiredActions: [
        'email_verified',
        'profile_completed',
        'form_created',
        'client_added',
        'journey_started'
      ],
      minActions: 3,
      timeframe: 7 // days
    },
    couple: {
      requiredActions: [
        'email_verified',
        'wedding_date_set',
        'venue_added',
        'supplier_connected'
      ],
      minActions: 3,
      timeframe: 3
    }
  }
  
  async trackUserActivation(userId: string, userType: 'supplier' | 'couple') {
    const criteria = this.ACTIVATION_CRITERIA[userType]
    const userActions = await this.getUserActions(userId)
    
    const completedActions = criteria.requiredActions.filter(
      action => userActions[action]
    )
    
    const isActivated = completedActions.length >= criteria.minActions &&
      userActions.daysSinceSignup <= criteria.timeframe
    
    if (isActivated && !userActions.activatedAt) {
      await this.markAsActivated(userId)
      await this.triggerActivationEvent(userId)
    }
    
    return {
      activated: isActivated,
      progress: completedActions.length / criteria.requiredActions.length,
      completedActions,
      missingActions: criteria.requiredActions.filter(
        action => !userActions[action]
      )
    }
  }
}
```

### Funnel Analytics Dashboard

```
const ActivationFunnelDashboard = () => {
  const [cohort, setCohort] = useState('last_30_days')
  const [userType, setUserType] = useState<'supplier' | 'couple'>('supplier')
  const funnelData = useActivationFunnel(cohort, userType)
  
  return (
    <div className="activation-funnel">
      {/* Funnel Visualization */}
      <FunnelChart
        stages={[
          { name: 'Signed Up', count: funnelData.signups, rate: 100 },
          { name: 'Verified Email', count: funnelData.emailVerified, rate: 89 },
          { name: 'Completed Profile', count: funnelData.profileCompleted, rate: 67 },
          { name: 'Created First Form', count: funnelData.firstFormCreated, rate: 45 },
          { name: 'Added Client', count: funnelData.firstClientAdded, rate: 34 },
          { name: 'Activated', count: funnelData.activated, rate: 28 }
        ]}
      />
      
      {/* Stage Analysis */}
      <StageBreakdown
        stages={funnelData.stages}
        onStageClick={(stage) => showStageDetails(stage)}
      />
      
      {/* Time to Activation */}
      <TimeToActivation
        distribution={funnelData.timeDistribution}
        average={funnelData.avgTimeToActivation}
      />
      
      {/* Dropoff Analysis */}
      <DropoffAnalysis
        dropoffPoints={funnelData.dropoffAnalysis}
        recommendations={funnelData.recommendations}
      />
    </div>
  )
}
```

### Activation Experiments

```
class ActivationExperiments {
  async runExperiment(experiment: ActivationExperiment) {
    const control = await this.getControlGroup(experiment.size)
    const treatment = await this.getTreatmentGroup(experiment.size)
    
    // Apply treatment
    await this.applyTreatment(treatment, experiment.treatment)
    
    // Wait for results
    await this.waitForPeriod(experiment.duration)
    
    // Analyze results
    const results = await this.analyzeResults(control, treatment)
    
    return {
      experiment: [experiment.name](http://experiment.name),
      control: {
        activationRate: results.control.activated / control.length,
        timeToActivation: results.control.avgTime
      },
      treatment: {
        activationRate: results.treatment.activated / treatment.length,
        timeToActivation: results.treatment.avgTime
      },
      lift: (
        (results.treatment.activated / treatment.length) -
        (results.control.activated / control.length)
      ) / (results.control.activated / control.length),
      significant: results.pValue < 0.05
    }
  }
  
  // Example experiments
  experiments = [
    {
      name: 'Interactive Onboarding Tour',
      treatment: 'guided_tour',
      hypothesis: 'Guided tour increases form creation by 20%'
    },
    {
      name: 'Email Drip Campaign',
      treatment: 'activation_emails',
      hypothesis: 'Daily tips for 7 days increases activation by 15%'
    },
    {
      name: 'Incentivized Actions',
      treatment: 'progress_rewards',
      hypothesis: 'Gamification increases activation by 25%'
    }
  ]
}
```

### Behavioral Cohort Analysis

```
const analyzeBehavioralCohorts = async () => {
  // Segment users by their first action
  const firstActionCohorts = await db.query(`
    WITH first_actions AS (
      SELECT 
        user_id,
        MIN(created_at) as signup_date,
        FIRST_VALUE(action_type) OVER (
          PARTITION BY user_id 
          ORDER BY created_at
        ) as first_action
      FROM user_events
      WHERE action_type != 'signup'
      GROUP BY user_id
    )
    SELECT 
      first_action,
      COUNT(*) as cohort_size,
      AVG(CASE WHEN activated THEN 1 ELSE 0 END) as activation_rate,
      AVG(EXTRACT(EPOCH FROM (activated_at - signup_date))/3600) as hours_to_activation
    FROM first_actions fa
    JOIN users u ON fa.user_id = [u.id](http://u.id)
    GROUP BY first_action
    ORDER BY activation_rate DESC
  `)
  
  return firstActionCohorts
}
```

### Activation Nudges

```
class ActivationNudges {
  async sendContextualNudge(userId: string) {
    const progress = await this.getActivationProgress(userId)
    const nextAction = this.determineNextBestAction(progress)
    
    switch(nextAction) {
      case 'create_form':
        await this.sendInAppMessage(userId, {
          title: 'Create Your First Form in 2 Minutes',
          message: 'Use our AI to generate a form instantly',
          cta: 'Create Form',
          link: '/forms/new?ai=true'
        })
        break
        
      case 'add_client':
        await this.sendEmail(userId, {
          template: 'import_clients',
          data: {
            importLink: '/clients/import',
            videoTutorial: '/help/importing-clients'
          }
        })
        break
        
      case 'connect_supplier':
        await this.showModal(userId, {
          type: 'supplier_discovery',
          message: 'Find wedding suppliers in your area',
          suggestions: await this.getLocalSuppliers(userId)
        })
        break
    }
  }
}
```

## Critical Implementation Notes

- Track every micro-action in first 7 days
- Define clear "activated" state per user type
- Monitor funnel conversion daily
- A/B test every funnel stage
- Send activation nudges at optimal times
- Celebrate activation moments with users

## Database Structure

```
-- User activation tracking
CREATE TABLE user_activation (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  user_type TEXT NOT NULL,
  signup_at TIMESTAMPTZ NOT NULL,
  email_verified_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ,
  first_form_created_at TIMESTAMPTZ,
  first_client_added_at TIMESTAMPTZ,
  first_invite_sent_at TIMESTAMPTZ,
  first_journey_started_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  activation_score INTEGER,
  days_to_activation INTEGER
);

CREATE INDEX idx_activation_status ON user_activation(activated_at);

-- Funnel events
CREATE TABLE funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_user ON funnel_events(user_id, created_at);

-- Activation experiments
CREATE TABLE activation_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hypothesis TEXT,
  control_group UUID[],
  treatment_group UUID[],
  treatment_type TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  results JSONB
);
```