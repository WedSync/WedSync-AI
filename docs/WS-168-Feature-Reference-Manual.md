# WS-168 Customer Success Dashboard - Feature Reference Manual

**Version:** 1.0  
**Date:** January 2025  
**Audience:** Technical Users, System Administrators, Developers

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Health Scoring Engine](#health-scoring-engine)
3. [Intervention Management](#intervention-management)
4. [Real-time Monitoring](#real-time-monitoring)
5. [Data Integration](#data-integration)
6. [API Reference](#api-reference)
7. [Configuration Options](#configuration-options)
8. [Performance & Scaling](#performance--scaling)

---

## System Architecture

### Technology Stack

#### Frontend Components
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state
- **Real-time Updates**: Supabase Realtime subscriptions

#### Backend Infrastructure
- **Database**: PostgreSQL 15 with Supabase
- **API Layer**: Next.js API routes with server-side rendering
- **Edge Functions**: Supabase Edge Functions for automated processing
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **File Storage**: Supabase Storage for reports and exports

#### Deployment & Monitoring
- **Hosting**: Vercel with global CDN
- **Monitoring**: Sentry for error tracking and performance
- **Analytics**: Custom events with Vercel Analytics
- **Caching**: Multi-layer caching with Redis and React Query

### Database Schema

#### Core Tables

```sql
-- Customer Health Dashboard
customer_health_dashboard (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  overall_health_score INTEGER CHECK (0 <= overall_health_score <= 100),
  engagement_score INTEGER CHECK (0 <= engagement_score <= 100),
  adoption_score INTEGER CHECK (0 <= adoption_score <= 100),
  satisfaction_score INTEGER CHECK (0 <= satisfaction_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  last_login_at TIMESTAMPTZ,
  active_users_count INTEGER DEFAULT 0,
  feature_usage JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success Milestones
success_milestones (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  milestone_type TEXT CHECK (milestone_type IN (
    'onboarding_complete', 'first_wedding_created', 'first_vendor_connected',
    'guest_list_imported', 'timeline_created', 'payment_processed'
  )),
  milestone_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  progress_percentage INTEGER CHECK (0 <= progress_percentage <= 100),
  completed_at TIMESTAMPTZ,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Interactions
support_interactions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  interaction_type TEXT CHECK (interaction_type IN (
    'ticket', 'chat', 'email', 'phone', 'meeting', 'training'
  )),
  subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  satisfaction_rating INTEGER CHECK (1 <= satisfaction_rating <= 5),
  response_time_hours DECIMAL(10,2),
  resolution_time_hours DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Intervention Logs
health_intervention_logs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  trigger_type TEXT CHECK (trigger_type IN (
    'health_score_drop', 'engagement_decline', 'support_escalation',
    'usage_pattern_change', 'contract_renewal_risk', 'churn_prediction'
  )),
  intervention_type TEXT CHECK (intervention_type IN (
    'automated_email', 'csm_outreach', 'training_scheduled',
    'health_check_call', 'escalation_created'
  )),
  intervention_title TEXT NOT NULL,
  status TEXT CHECK (status IN ('planned', 'executed', 'completed', 'cancelled')),
  outcome TEXT CHECK (outcome IN ('successful', 'partially_successful', 'unsuccessful', 'pending')),
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Indexes for Performance

```sql
-- Health Dashboard Indexes
CREATE INDEX idx_customer_health_org_id ON customer_health_dashboard(organization_id);
CREATE INDEX idx_customer_health_score ON customer_health_dashboard(overall_health_score);
CREATE INDEX idx_customer_health_risk ON customer_health_dashboard(risk_level);
CREATE INDEX idx_customer_health_updated ON customer_health_dashboard(updated_at);

-- Milestone Indexes
CREATE INDEX idx_milestones_org_status ON success_milestones(organization_id, status);
CREATE INDEX idx_milestones_type_completed ON success_milestones(milestone_type, completed_at);

-- Support Indexes  
CREATE INDEX idx_support_org_status ON support_interactions(organization_id, status);
CREATE INDEX idx_support_priority_created ON support_interactions(priority, created_at);

-- Intervention Indexes
CREATE INDEX idx_interventions_trigger_scheduled ON health_intervention_logs(trigger_type, scheduled_at);
CREATE INDEX idx_interventions_org_status ON health_intervention_logs(organization_id, status);
```

### Security Implementation

#### Row Level Security (RLS) Policies

```sql
-- Admin-only access to customer health dashboard
CREATE POLICY "customer_health_admin_access" ON customer_health_dashboard
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'customer_success_manager')
    )
  );

-- Organization members can read their own health data
CREATE POLICY "customer_health_org_read" ON customer_health_dashboard
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

---

## Health Scoring Engine

### Algorithm Components

#### 1. Engagement Score Calculation (40% weight)

```typescript
interface EngagementFactors {
  lastLoginDays: number;        // Days since last login
  activeUsers: number;          // Active users in organization
  totalUsers: number;           // Total users in organization  
  featureUsageCount: number;    // Number of features used
  sessionDuration: number;      // Average session duration
  dailyActiveUsers: number;     // 30-day daily active users
}

function calculateEngagementScore(factors: EngagementFactors): number {
  let score = 0;
  
  // Login recency (40 points max)
  if (factors.lastLoginDays <= 1) score += 40;
  else if (factors.lastLoginDays <= 7) score += 30;
  else if (factors.lastLoginDays <= 30) score += 20;
  else if (factors.lastLoginDays <= 90) score += 10;
  
  // Active users ratio (30 points max)
  if (factors.totalUsers > 0) {
    const activeRatio = factors.activeUsers / factors.totalUsers;
    score += Math.min(30, activeRatio * 30);
  }
  
  // Feature usage diversity (30 points max)
  score += Math.min(30, factors.featureUsageCount * 3);
  
  return Math.max(0, Math.min(100, score));
}
```

#### 2. Adoption Score Calculation (40% weight)

```typescript
interface AdoptionFactors {
  completedMilestones: number;  // Number of completed milestones
  totalMilestones: number;      // Total available milestones
  clientCount: number;          // Active wedding clients
  featureDepth: number;         // Advanced feature usage
  integrationCount: number;     // Connected integrations
  customFieldsUsed: number;     // Custom field utilization
}

function calculateAdoptionScore(factors: AdoptionFactors): number {
  let score = 0;
  
  // Milestone completion (50 points max)
  if (factors.totalMilestones > 0) {
    const completionRate = factors.completedMilestones / factors.totalMilestones;
    score += completionRate * 50;
  }
  
  // Client portfolio size (25 points max)
  score += Math.min(25, factors.clientCount * 2.5);
  
  // Feature depth usage (15 points max)
  score += Math.min(15, factors.featureDepth * 15);
  
  // Integration connectivity (10 points max)
  score += Math.min(10, factors.integrationCount * 2);
  
  return Math.max(0, Math.min(100, score));
}
```

#### 3. Satisfaction Score Calculation (20% weight)

```typescript
interface SatisfactionFactors {
  averageSupportRating: number; // 1-5 star rating average
  supportTicketCount: number;   // Open support tickets
  escalationCount: number;      // Escalated issues
  responseTimeHours: number;    // Average response time
  resolutionTimeHours: number;  // Average resolution time
  npsScore: number;            // Net Promoter Score (-100 to 100)
}

function calculateSatisfactionScore(factors: SatisfactionFactors): number {
  let score = 80; // Start with neutral score
  
  // Support rating impact (40 points swing)
  if (factors.averageSupportRating > 0) {
    score = factors.averageSupportRating * 20; // 5 stars = 100 points
  }
  
  // Penalty for open tickets (up to -20 points)
  score -= Math.min(20, factors.supportTicketCount * 4);
  
  // Penalty for escalations (up to -30 points)
  score -= Math.min(30, factors.escalationCount * 10);
  
  // Response time impact (up to ±10 points)
  if (factors.responseTimeHours < 2) score += 10;
  else if (factors.responseTimeHours > 24) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}
```

### Composite Health Score

```typescript
interface HealthScoreComponents {
  engagement: number;   // 0-100
  adoption: number;     // 0-100  
  satisfaction: number; // 0-100
}

function calculateOverallHealthScore(components: HealthScoreComponents): number {
  const weights = {
    engagement: 0.4,    // 40%
    adoption: 0.4,      // 40%
    satisfaction: 0.2   // 20%
  };
  
  const weightedScore = 
    (components.engagement * weights.engagement) +
    (components.adoption * weights.adoption) + 
    (components.satisfaction * weights.satisfaction);
  
  return Math.round(weightedScore);
}
```

### Risk Level Determination

```typescript
interface RiskFactors {
  healthScore: number;
  contractEndDays: number;
  openTicketCount: number;
  engagementScore: number;
  paymentStatus: 'current' | 'overdue' | 'failed';
  churnPrediction: number; // ML model output 0-1
}

function determineRiskLevel(factors: RiskFactors): 'low' | 'medium' | 'high' | 'critical' {
  // Critical risk conditions
  if (
    factors.healthScore < 30 ||
    factors.contractEndDays < 30 ||
    factors.openTicketCount > 5 ||
    factors.paymentStatus === 'failed' ||
    factors.churnPrediction > 0.8
  ) {
    return 'critical';
  }
  
  // High risk conditions
  if (
    factors.healthScore < 50 ||
    factors.contractEndDays < 60 ||
    factors.engagementScore < 30 ||
    factors.openTicketCount > 2 ||
    factors.churnPrediction > 0.6
  ) {
    return 'high';
  }
  
  // Medium risk conditions
  if (
    factors.healthScore < 70 ||
    factors.contractEndDays < 120 ||
    factors.engagementScore < 60 ||
    factors.churnPrediction > 0.4
  ) {
    return 'medium';
  }
  
  return 'low';
}
```

### Automated Health Updates

#### Database Functions

```sql
-- Main health update function
CREATE OR REPLACE FUNCTION update_customer_health(org_id UUID)
RETURNS VOID AS $$
DECLARE
  eng_score INTEGER;
  adopt_score INTEGER;
  sat_score INTEGER;
  overall_score INTEGER;
  risk_level_val TEXT;
BEGIN
  -- Calculate component scores
  eng_score := calculate_engagement_score(org_id);
  adopt_score := calculate_adoption_score(org_id);  
  sat_score := calculate_satisfaction_score(org_id);
  
  -- Calculate overall health score
  overall_score := ROUND((eng_score * 0.4 + adopt_score * 0.4 + sat_score * 0.2));
  
  -- Determine risk level
  risk_level_val := calculate_risk_level(overall_score, org_id);
  
  -- Update or insert health dashboard record
  INSERT INTO customer_health_dashboard (
    organization_id, overall_health_score, engagement_score,
    adoption_score, satisfaction_score, risk_level, updated_at
  ) VALUES (
    org_id, overall_score, eng_score, adopt_score, sat_score, risk_level_val, NOW()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    overall_health_score = EXCLUDED.overall_health_score,
    engagement_score = EXCLUDED.engagement_score,
    adoption_score = EXCLUDED.adoption_score,
    satisfaction_score = EXCLUDED.satisfaction_score,
    risk_level = EXCLUDED.risk_level,
    updated_at = NOW();
    
  -- Trigger intervention checks if needed
  PERFORM check_intervention_triggers(org_id);
END;
$$ LANGUAGE plpgsql;

-- Scheduled batch update function  
CREATE OR REPLACE FUNCTION daily_health_automation()
RETURNS VOID AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Update health scores for all active organizations
  FOR org_record IN 
    SELECT DISTINCT o.id
    FROM organizations o
    JOIN user_profiles up ON o.id = up.organization_id
    WHERE up.last_login_at > NOW() - INTERVAL '180 days'
  LOOP
    PERFORM update_customer_health(org_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### Cron Job Scheduling

```sql
-- Schedule daily health updates at 2 AM UTC
SELECT cron.schedule(
  'daily-customer-health',
  '0 2 * * *',
  'SELECT daily_health_automation();'
);

-- Schedule hourly updates for critical customers
SELECT cron.schedule(
  'hourly-critical-health',
  '0 * * * *',
  'SELECT update_customer_health(organization_id) 
   FROM customer_health_dashboard 
   WHERE risk_level = ''critical'''
);
```

---

## Intervention Management

### Automated Trigger System

#### Trigger Configuration

```typescript
interface InterventionTrigger {
  id: string;
  name: string;
  condition: TriggerCondition;
  intervention: InterventionConfig;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownHours: number; // Prevent trigger spam
}

interface TriggerCondition {
  type: 'health_score_drop' | 'engagement_decline' | 'support_escalation' | 'contract_renewal';
  threshold: number;
  timeWindow: string; // PostgreSQL interval format
  additionalFilters?: Record<string, any>;
}

const defaultTriggers: InterventionTrigger[] = [
  {
    id: 'critical_health_drop',
    name: 'Critical Health Score Drop',
    condition: {
      type: 'health_score_drop',
      threshold: 20, // 20+ point drop
      timeWindow: '24 hours'
    },
    intervention: {
      type: 'csm_outreach',
      template: 'critical_health_drop',
      assignee: 'senior_csm'
    },
    priority: 'critical',
    enabled: true,
    cooldownHours: 48
  },
  {
    id: 'engagement_decline',  
    name: 'Engagement Decline',
    condition: {
      type: 'engagement_decline',
      threshold: 30, // Engagement score below 30
      timeWindow: '7 days'
    },
    intervention: {
      type: 'automated_email',
      template: 'reengagement_campaign',
      assignee: 'auto'
    },
    priority: 'medium',
    enabled: true,
    cooldownHours: 168 // 1 week
  }
];
```

#### Trigger Evaluation Function

```sql
CREATE OR REPLACE FUNCTION check_intervention_triggers(org_id UUID)
RETURNS VOID AS $$
DECLARE
  health_record RECORD;
  prev_health_score INTEGER;
  trigger_needed BOOLEAN;
BEGIN
  -- Get current health metrics
  SELECT * INTO health_record
  FROM customer_health_dashboard
  WHERE organization_id = org_id;
  
  -- Get previous health score (from 24 hours ago)
  SELECT overall_health_score INTO prev_health_score
  FROM customer_health_snapshots
  WHERE organization_id = org_id
    AND snapshot_date = CURRENT_DATE - INTERVAL '1 day';
    
  -- Health score drop trigger
  IF health_record.overall_health_score < COALESCE(prev_health_score, 100) - 20 THEN
    INSERT INTO health_intervention_logs (
      organization_id, trigger_type, intervention_type,
      intervention_title, intervention_description, scheduled_at
    ) VALUES (
      org_id, 'health_score_drop', 'csm_outreach',
      'Critical Health Score Drop - Immediate Attention Required',
      format('Health score dropped from %s to %s in 24 hours', 
             prev_health_score, health_record.overall_health_score),
      NOW() + INTERVAL '2 hours'
    );
  END IF;
  
  -- Engagement decline trigger  
  IF health_record.engagement_score < 30 THEN
    INSERT INTO health_intervention_logs (
      organization_id, trigger_type, intervention_type,
      intervention_title, intervention_description, scheduled_at
    ) VALUES (
      org_id, 'engagement_decline', 'automated_email',
      'Low Engagement - Re-engagement Campaign',
      format('Customer engagement score is %s, starting re-engagement sequence',
             health_record.engagement_score),
      NOW() + INTERVAL '12 hours'
    );
  END IF;
  
  -- Contract renewal risk trigger
  SELECT COUNT(*) > 0 INTO trigger_needed
  FROM organizations o
  WHERE o.id = org_id
    AND o.contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
    AND health_record.overall_health_score < 70;
    
  IF trigger_needed THEN
    INSERT INTO health_intervention_logs (
      organization_id, trigger_type, intervention_type,
      intervention_title, intervention_description, scheduled_at
    ) VALUES (
      org_id, 'contract_renewal_risk', 'escalation_created',
      'Contract Renewal at Risk - Low Health Score',
      format('Contract renews in ≤60 days with health score of %s',
             health_record.overall_health_score),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Manual Intervention Creation

#### API Endpoint

```typescript
// /api/interventions/create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      interventionType,
      priority,
      scheduledAt,
      notes,
      assignedTo
    } = body;

    // Validate required fields
    const validation = validateInterventionData(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors },
        { status: 400 }
      );
    }

    // Create intervention record
    const intervention = await createIntervention({
      organizationId,
      triggerType: 'manual',
      interventionType,
      interventionTitle: generateTitle(interventionType, priority),
      interventionDescription: notes,
      status: 'planned',
      priority,
      scheduledAt: new Date(scheduledAt),
      assignedCsm: assignedTo,
      createdBy: user.id
    });

    // Send notifications
    await sendInterventionNotifications(intervention);

    // Log activity
    await logActivity('intervention_created', {
      interventionId: intervention.id,
      organizationId,
      createdBy: user.id
    });

    return NextResponse.json({
      success: true,
      intervention
    });
    
  } catch (error) {
    console.error('Intervention creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create intervention' },
      { status: 500 }
    );
  }
}
```

### Intervention Templates

#### Email Templates

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // Available variables for substitution
  category: 'reengagement' | 'health_check' | 'renewal' | 'onboarding';
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'reengagement_welcome_back',
    name: 'Welcome Back - Re-engagement',
    subject: 'We miss you, {{organizationName}}! 💍',
    body: `
      Hi {{contactName}},
      
      We noticed you haven't been active on WedSync lately, and we wanted to reach out. 
      Wedding planning can be overwhelming, and we're here to help make it easier.
      
      Here's what's new since your last visit:
      • {{newFeatures}}
      • {{industryInsights}}
      
      Need help getting back on track? I'm here to assist:
      • Book a 15-minute success call: {{calendarLink}}
      • Browse our latest tutorials: {{tutorialLink}}
      • Contact me directly: {{csmEmail}}
      
      Your wedding planning success is our priority!
      
      Best regards,
      {{csmName}}
      Customer Success Manager
    `,
    variables: ['organizationName', 'contactName', 'newFeatures', 'industryInsights', 'calendarLink', 'tutorialLink', 'csmEmail', 'csmName'],
    category: 'reengagement'
  },
  
  {
    id: 'health_check_proactive',
    name: 'Proactive Health Check',
    subject: 'How is your wedding season going, {{organizationName}}?',
    body: `
      Hi {{contactName}},
      
      I hope your wedding season is going wonderfully! I wanted to check in and see how 
      things are progressing with WedSync.
      
      Based on your recent activity, I noticed:
      {{healthInsights}}
      
      I'd love to help you:
      • Optimize your current workflow
      • Explore features that could save you time
      • Address any challenges you're facing
      
      Would you be open to a brief 15-minute call this week?
      {{calendarLink}}
      
      Looking forward to hearing from you!
      
      {{csmName}}
    `,
    variables: ['organizationName', 'contactName', 'healthInsights', 'calendarLink', 'csmName'],
    category: 'health_check'
  }
];
```

### Intervention Tracking

#### Status Updates

```typescript
interface InterventionStatus {
  id: string;
  interventionId: string;
  status: 'planned' | 'executed' | 'responded' | 'completed' | 'cancelled';
  outcome?: 'successful' | 'partially_successful' | 'unsuccessful';
  notes?: string;
  updatedBy: string;
  updatedAt: Date;
  nextAction?: string;
}

async function updateInterventionStatus(
  interventionId: string,
  status: InterventionStatus['status'],
  outcome?: InterventionStatus['outcome'],
  notes?: string
): Promise<void> {
  await database.interventions.update({
    where: { id: interventionId },
    data: {
      status,
      outcome,
      outcomeNotes: notes,
      executedAt: status === 'executed' ? new Date() : undefined,
      completedAt: status === 'completed' ? new Date() : undefined,
      updatedAt: new Date()
    }
  });
  
  // Update customer health score after successful intervention
  if (outcome === 'successful') {
    const intervention = await database.interventions.findUnique({
      where: { id: interventionId }
    });
    
    if (intervention) {
      await updateCustomerHealth(intervention.organizationId);
    }
  }
  
  // Send status update notifications
  await sendStatusUpdateNotifications(interventionId, status, outcome);
}
```

---

## Real-time Monitoring

### WebSocket Integration

#### Supabase Realtime Setup

```typescript
// Real-time subscription for health score updates
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRealtimeHealthScores() {
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  
  useEffect(() => {
    // Subscribe to health score changes
    const subscription = supabase
      .channel('health-score-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_health_dashboard'
        },
        (payload) => {
          console.log('Health score updated:', payload);
          
          // Update local state
          if (payload.eventType === 'UPDATE') {
            setHealthScores(current => 
              current.map(score => 
                score.organizationId === payload.new.organization_id
                  ? { ...score, ...payload.new }
                  : score
              )
            );
          }
          
          // Trigger toast notification for significant changes
          if (payload.new.overall_health_score < payload.old?.overall_health_score - 10) {
            showNotification({
              type: 'warning',
              title: 'Health Score Drop Alert',
              message: `Customer ${payload.new.organization_name} health score dropped to ${payload.new.overall_health_score}`
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return healthScores;
}
```

#### Real-time Dashboard Updates

```typescript
// React component with real-time updates
export function CustomerHealthDashboard() {
  const { data: healthScores, isLoading } = useQuery({
    queryKey: ['customer-health'],
    queryFn: fetchCustomerHealthScores,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute backup polling
  });
  
  const queryClient = useQueryClient();
  
  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customer_health_dashboard' },
        () => {
          // Invalidate and refetch data
          queryClient.invalidateQueries(['customer-health']);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'health_intervention_logs' },
        () => {
          queryClient.invalidateQueries(['interventions']);
        }
      )
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [queryClient]);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="dashboard-grid">
      <HealthMetricsCards scores={healthScores} />
      <CustomerHealthList customers={healthScores} />
      <InterventionQueue />
    </div>
  );
}
```

### Alert System

#### Alert Configuration

```typescript
interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  channels: NotificationChannel[];
  enabled: boolean;
  cooldownMinutes: number;
}

interface AlertCondition {
  metric: 'health_score' | 'engagement_score' | 'satisfaction_score';
  operator: 'lt' | 'gt' | 'eq' | 'changed_by';
  threshold: number;
  timeWindow?: string;
}

const alertRules: AlertRule[] = [
  {
    id: 'critical_health_score',
    name: 'Critical Health Score Alert',
    condition: {
      metric: 'health_score',
      operator: 'lt',
      threshold: 40
    },
    channels: ['email', 'slack', 'sms'],
    enabled: true,
    cooldownMinutes: 60
  },
  {
    id: 'health_score_drop',
    name: 'Significant Health Score Drop',
    condition: {
      metric: 'health_score', 
      operator: 'changed_by',
      threshold: -20,
      timeWindow: '24 hours'
    },
    channels: ['email', 'slack'],
    enabled: true,
    cooldownMinutes: 180
  }
];
```

#### Alert Processing

```sql
-- Function to process alerts based on health score changes
CREATE OR REPLACE FUNCTION process_health_score_alerts()
RETURNS TRIGGER AS $$
DECLARE
  score_change INTEGER;
  alert_needed BOOLEAN := FALSE;
BEGIN
  -- Calculate score change
  IF OLD.overall_health_score IS NOT NULL THEN
    score_change := NEW.overall_health_score - OLD.overall_health_score;
  END IF;
  
  -- Critical health score alert
  IF NEW.overall_health_score < 40 THEN
    INSERT INTO alert_queue (
      organization_id, alert_type, severity, message, channels
    ) VALUES (
      NEW.organization_id, 'critical_health_score', 'critical',
      format('Customer health score is critically low: %s', NEW.overall_health_score),
      '["email", "slack", "sms"]'::jsonb
    );
    alert_needed := TRUE;
  END IF;
  
  -- Significant score drop alert
  IF score_change IS NOT NULL AND score_change <= -20 THEN
    INSERT INTO alert_queue (
      organization_id, alert_type, severity, message, channels  
    ) VALUES (
      NEW.organization_id, 'health_score_drop', 'high',
      format('Health score dropped by %s points (from %s to %s)', 
             ABS(score_change), OLD.overall_health_score, NEW.overall_health_score),
      '["email", "slack"]'::jsonb
    );
    alert_needed := TRUE;
  END IF;
  
  -- Process alert queue if alerts were added
  IF alert_needed THEN
    PERFORM process_alert_queue();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time alert processing
CREATE TRIGGER health_score_alert_trigger
  AFTER UPDATE ON customer_health_dashboard
  FOR EACH ROW 
  EXECUTE FUNCTION process_health_score_alerts();
```

---

## Data Integration

### External System Connections

#### Webhook Integration

```typescript
// Incoming webhook processor for external data
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-webhook-signature');
    const body = await request.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const data = JSON.parse(body);
    
    // Process different webhook events
    switch (data.event) {
      case 'user.login':
        await updateEngagementMetrics(data.organizationId, 'login');
        break;
        
      case 'feature.used':
        await updateFeatureUsage(data.organizationId, data.feature);
        break;
        
      case 'support.ticket.created':
        await updateSupportMetrics(data.organizationId, data.ticket);
        break;
        
      case 'payment.failed':
        await triggerBillingIntervention(data.organizationId, data.payment);
        break;
        
      default:
        console.log('Unknown webhook event:', data.event);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

#### API Integrations

```typescript
// Integration with external CRM systems
class CRMIntegration {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: CRMConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }
  
  async syncCustomerData(organizationId: string): Promise<void> {
    try {
      // Fetch customer data from CRM
      const crmData = await this.fetchCustomerFromCRM(organizationId);
      
      // Update health dashboard with CRM insights
      await updateHealthDashboard(organizationId, {
        crmScore: crmData.healthScore,
        lastContact: crmData.lastContactDate,
        dealStage: crmData.currentDealStage,
        contractValue: crmData.totalContractValue
      });
      
      // Sync intervention history
      await this.syncInterventionHistory(organizationId, crmData.activities);
      
    } catch (error) {
      console.error('CRM sync error:', error);
      throw new Error(`Failed to sync CRM data for ${organizationId}`);
    }
  }
  
  private async fetchCustomerFromCRM(organizationId: string): Promise<CRMCustomer> {
    const response = await fetch(`${this.baseUrl}/customers/${organizationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CRM API error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

### Data Export & Reporting

#### CSV Export Function

```typescript
// Export customer health data as CSV
export async function exportHealthData(
  filters: HealthDataFilters,
  format: 'csv' | 'xlsx' | 'pdf'
): Promise<string> {
  
  // Fetch filtered data
  const healthData = await fetchHealthDataWithFilters(filters);
  
  switch (format) {
    case 'csv':
      return generateCSV(healthData);
    case 'xlsx':
      return generateExcel(healthData);
    case 'pdf':
      return generatePDFReport(healthData);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function generateCSV(data: HealthData[]): string {
  const headers = [
    'Organization Name',
    'Health Score', 
    'Engagement Score',
    'Adoption Score',
    'Satisfaction Score',
    'Risk Level',
    'Last Activity',
    'Active Users',
    'Support Tickets',
    'Contract End Date',
    'Monthly Revenue'
  ];
  
  const rows = data.map(item => [
    item.organizationName,
    item.overallHealthScore,
    item.engagementScore,
    item.adoptionScore,
    item.satisfactionScore,
    item.riskLevel,
    item.lastActivityAt?.toISOString() || '',
    item.activeUsersCount,
    item.openTicketsCount,
    item.contractEndDate?.toISOString() || '',
    item.monthlyRevenue || 0
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(',')
    )
  ].join('\n');
  
  return csvContent;
}
```

---

## Configuration Options

### Feature Flags

```typescript
interface FeatureFlags {
  realTimeUpdates: boolean;
  automatedInterventions: boolean;
  predictiveScoring: boolean;
  emailAutomation: boolean;
  slackIntegration: boolean;
  customReporting: boolean;
  mobileNotifications: boolean;
  aiInsights: boolean;
}

const defaultFeatureFlags: FeatureFlags = {
  realTimeUpdates: true,
  automatedInterventions: true,
  predictiveScoring: false, // Premium feature
  emailAutomation: true,
  slackIntegration: false,
  customReporting: true,
  mobileNotifications: false,
  aiInsights: false // Future feature
};

// Feature flag management
export class FeatureFlagManager {
  private static flags: FeatureFlags = defaultFeatureFlags;
  
  static isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] || false;
  }
  
  static enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
  }
  
  static disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
  }
  
  static getAll(): FeatureFlags {
    return { ...this.flags };
  }
}
```

### Environment Configuration

```bash
# .env.production
# Customer Success Dashboard Configuration

# Core Settings
CUSTOMER_SUCCESS_ENABLED=true
HEALTH_SCORE_UPDATE_INTERVAL=300000  # 5 minutes
INTERVENTION_QUEUE_SIZE=100
REAL_TIME_UPDATES_ENABLED=true

# Email Configuration  
EMAIL_AUTOMATION_ENABLED=true
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
DEFAULT_FROM_EMAIL=success@yourcompany.com

# Notification Settings
SLACK_WEBHOOK_URL=your_slack_webhook
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Alert Thresholds
CRITICAL_HEALTH_THRESHOLD=40
HIGH_RISK_THRESHOLD=60
ALERT_COOLDOWN_MINUTES=60

# Performance Settings
HEALTH_SCORE_CACHE_TTL=300  # 5 minutes
MAX_CONCURRENT_UPDATES=50
DATABASE_CONNECTION_POOL_SIZE=20

# Security
WEBHOOK_SECRET_KEY=your_webhook_secret
API_RATE_LIMIT_PER_MINUTE=100
ADMIN_SESSION_TIMEOUT=3600  # 1 hour

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
METRICS_ENABLED=true
```

---

## Performance & Scaling

### Caching Strategy

#### Multi-Layer Caching

```typescript
// Cache configuration
const cacheConfig = {
  // Browser cache (React Query)
  browser: {
    healthScores: { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
    interventions: { staleTime: 2 * 60 * 1000, cacheTime: 5 * 60 * 1000 },
    reports: { staleTime: 15 * 60 * 1000, cacheTime: 30 * 60 * 1000 }
  },
  
  // Redis cache (Server-side)
  redis: {
    healthScores: { ttl: 300 }, // 5 minutes
    aggregateMetrics: { ttl: 900 }, // 15 minutes
    reports: { ttl: 1800 } // 30 minutes
  },
  
  // CDN cache (Static assets)
  cdn: {
    staticAssets: { maxAge: 31536000 }, // 1 year
    apiResponses: { maxAge: 300 } // 5 minutes
  }
};

// Cache implementation
class HealthScoreCache {
  private redis: Redis;
  
  constructor(redisConfig: RedisConfig) {
    this.redis = new Redis(redisConfig);
  }
  
  async getHealthScores(key: string): Promise<HealthScore[] | null> {
    const cached = await this.redis.get(`health:${key}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setHealthScores(key: string, data: HealthScore[]): Promise<void> {
    await this.redis.setex(
      `health:${key}`,
      cacheConfig.redis.healthScores.ttl,
      JSON.stringify(data)
    );
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`health:${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Database Optimization

#### Query Optimization

```sql
-- Optimized health score query with proper indexing
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  o.id,
  o.name,
  chd.overall_health_score,
  chd.engagement_score,
  chd.adoption_score,
  chd.satisfaction_score,
  chd.risk_level,
  chd.last_login_at,
  chd.updated_at,
  COUNT(si.id) as open_tickets,
  COUNT(hil.id) as active_interventions
FROM organizations o
JOIN customer_health_dashboard chd ON o.id = chd.organization_id
LEFT JOIN support_interactions si ON o.id = si.organization_id 
  AND si.status IN ('open', 'in_progress')
LEFT JOIN health_intervention_logs hil ON o.id = hil.organization_id 
  AND hil.status IN ('planned', 'executed')
WHERE chd.risk_level IN ('high', 'critical')
GROUP BY o.id, o.name, chd.overall_health_score, chd.engagement_score,
         chd.adoption_score, chd.satisfaction_score, chd.risk_level,
         chd.last_login_at, chd.updated_at
ORDER BY chd.overall_health_score ASC, chd.updated_at DESC
LIMIT 100;

-- Performance indexes
CREATE INDEX CONCURRENTLY idx_health_risk_score 
ON customer_health_dashboard (risk_level, overall_health_score);

CREATE INDEX CONCURRENTLY idx_support_org_status
ON support_interactions (organization_id, status) 
WHERE status IN ('open', 'in_progress');

CREATE INDEX CONCURRENTLY idx_interventions_org_active
ON health_intervention_logs (organization_id, status)
WHERE status IN ('planned', 'executed');
```

### Scaling Architecture

#### Horizontal Scaling Strategy

```yaml
# docker-compose.yml for scaled deployment
version: '3.8'
services:
  app:
    image: wedsync/customer-success:latest
    replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis-cluster:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/wedsync
    depends_on:
      - postgres
      - redis-cluster
    
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=wedsync
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
      
  redis-cluster:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

#### Load Balancing Configuration

```nginx
# nginx.conf
upstream app_servers {
    least_conn;
    server app:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app:3001 weight=1 max_fails=3 fail_timeout=30s;  
    server app:3002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location /api/customer-success/ {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Enable caching for read operations
        proxy_cache_valid 200 5m;
        proxy_cache_key "$request_uri";
        
        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
    
    location /admin/customer-health {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # WebSocket support for real-time updates
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Monitoring & Observability

#### Performance Metrics

```typescript
// Performance monitoring setup
import { createPrometheusMetrics } from '@prometheus/client';

const metrics = {
  healthScoreCalculationTime: new Histogram({
    name: 'health_score_calculation_duration_seconds',
    help: 'Time taken to calculate health scores',
    labelNames: ['organization_type', 'calculation_type']
  }),
  
  interventionCreationRate: new Counter({
    name: 'interventions_created_total',
    help: 'Total number of interventions created',
    labelNames: ['intervention_type', 'trigger_type']
  }),
  
  dashboardLoadTime: new Histogram({
    name: 'dashboard_load_duration_seconds',
    help: 'Time taken to load customer health dashboard',
    labelNames: ['user_role', 'filter_type']
  }),
  
  alertProcessingTime: new Gauge({
    name: 'alert_processing_duration_seconds',
    help: 'Time taken to process health score alerts'
  })
};

// Usage in health score calculation
export async function calculateHealthScore(organizationId: string): Promise<number> {
  const timer = metrics.healthScoreCalculationTime.startTimer({
    calculation_type: 'full'
  });
  
  try {
    const score = await performHealthScoreCalculation(organizationId);
    return score;
  } finally {
    timer();
  }
}
```

---

**Document Version**: 1.0  
**Technical Accuracy**: Production-ready implementation  
**Last Updated**: January 28, 2025  
**Next Review**: April 28, 2025

This feature reference manual provides comprehensive technical documentation for developers, system administrators, and technical users working with the WS-168 Customer Success Dashboard system.