# 03-churn-intelligence.md

## What to Build

Churn prediction and analysis system identifying at-risk customers, churn patterns, and automated retention workflows.

## Key Technical Requirements

### Churn Analysis Engine

```
interface ChurnMetrics {
  rate: number // Monthly churn rate
  count: number // Users churned
  mrr: number // MRR lost
  reasons: ChurnReason[]
  predictions: ChurnPrediction[]
  trends: ChurnTrend[]
}

interface ChurnPrediction {
  userId: string
  riskScore: number // 0-100
  predictedChurnDate: Date
  reasons: string[]
  recommendedActions: RetentionAction[]
}

interface ChurnSignals {
  loginFrequency: number
  featureUsage: number
  supportTickets: number
  paymentFailures: number
  engagementScore: number
}
```

### Churn Predictor Implementation

```
class ChurnPredictor {
  private readonly RISK_THRESHOLDS = {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20
  }
  
  async predictChurnRisk(userId: string): Promise<ChurnPrediction> {
    const signals = await this.collectSignals(userId)
    const score = this.calculateRiskScore(signals)
    const reasons = this.identifyRiskFactors(signals)
    
    return {
      userId,
      riskScore: score,
      predictedChurnDate: this.estimateChurnDate(score),
      reasons,
      recommendedActions: this.getRetentionActions(score, reasons)
    }
  }
  
  private async collectSignals(userId: string): Promise<ChurnSignals> {
    const [activity, usage, support, billing] = await Promise.all([
      this.getActivityMetrics(userId),
      this.getFeatureUsage(userId),
      this.getSupportMetrics(userId),
      this.getBillingHealth(userId)
    ])
    
    return {
      loginFrequency: activity.dayssSinceLastLogin,
      featureUsage: usage.featuresUsedLast30Days,
      supportTickets: support.openTickets,
      paymentFailures: billing.failedPayments,
      engagementScore: this.calculateEngagement(activity, usage)
    }
  }
  
  private calculateRiskScore(signals: ChurnSignals): number {
    let score = 0
    
    // Login frequency (30 points)
    if (signals.loginFrequency > 30) score += 30
    else if (signals.loginFrequency > 14) score += 20
    else if (signals.loginFrequency > 7) score += 10
    
    // Feature usage (25 points)
    if (signals.featureUsage < 2) score += 25
    else if (signals.featureUsage < 5) score += 15
    else if (signals.featureUsage < 10) score += 5
    
    // Support issues (20 points)
    if (signals.supportTickets > 3) score += 20
    else if (signals.supportTickets > 1) score += 10
    
    // Payment issues (15 points)
    if (signals.paymentFailures > 0) score += 15
    
    // Low engagement (10 points)
    if (signals.engagementScore < 30) score += 10
    
    return Math.min(score, 100)
  }
}
```

### Churn Dashboard Component

```
const ChurnDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d')
  const churnData = useChurnData(timeRange)
  const atRiskUsers = useAtRiskUsers()
  
  return (
    <div className="churn-dashboard">
      {/* Key Metrics */}
      <div className="metrics-row">
        <MetricCard
          title="Churn Rate"
          value={`${churnData.rate}%`}
          change={churnData.rateChange}
          target={2.0}
        />
        <MetricCard
          title="At Risk Users"
          value={atRiskUsers.critical.length}
          subtitle="Critical risk"
          color="red"
        />
        <MetricCard
          title="MRR at Risk"
          value={formatCurrency(churnData.mrrAtRisk)}
          subtitle="Next 30 days"
        />
        <MetricCard
          title="Save Rate"
          value={`${churnData.saveRate}%`}
          subtitle="Retention success"
        />
      </div>
      
      {/* At-Risk Users List */}
      <AtRiskUsersList
        users={atRiskUsers}
        onAction={(user, action) => executeRetentionAction(user, action)}
      />
      
      {/* Churn Reasons */}
      <ChurnReasonChart reasons={churnData.reasons} />
      
      {/* Retention Campaigns */}
      <ActiveRetentionCampaigns campaigns={churnData.campaigns} />
    </div>
  )
}
```

### Automated Retention Workflows

```
class RetentionAutomation {
  async executeRetentionWorkflow(user: ChurnPrediction) {
    const workflow = this.selectWorkflow(user.riskScore)
    
    switch(workflow) {
      case 'critical':
        await this.criticalRetention(user)
        break
      case 'high':
        await this.highRiskRetention(user)
        break
      case 'medium':
        await this.mediumRiskRetention(user)
        break
      default:
        await this.lowRiskMonitoring(user)
    }
  }
  
  private async criticalRetention(user: ChurnPrediction) {
    // Immediate personal outreach
    await this.assignToAccountManager(user.userId)
    
    // Send retention offer
    await emailService.send({
      to: user.userId,
      template: 'critical-retention',
      data: {
        discount: 50,
        validFor: 3 // months
      }
    })
    
    // Schedule follow-up call
    await calendar.scheduleCall({
      userId: user.userId,
      type: 'retention',
      priority: 'urgent'
    })
    
    // Alert management
    await slack.notify({
      channel: '#customer-success',
      message: `🚨 Critical churn risk: ${user.userId}`
    })
  }
  
  private async highRiskRetention(user: ChurnPrediction) {
    // Automated email sequence
    await this.startEmailSequence(user.userId, 'win-back')
    
    // Offer discount
    await this.createDiscount(user.userId, 30, 2)
    
    // In-app messaging
    await this.showRetentionModal(user.userId)
  }
}
```

### Churn Analysis Queries

```
// Identify churn patterns
const analyzeChurnPatterns = async () => {
  return await db.query(`
    WITH churned_users AS (
      SELECT 
        user_id,
        churned_at,
        churned_reason,
        lifetime_value,
        months_active
      FROM subscriptions
      WHERE status = 'churned'
        AND churned_at > NOW() - INTERVAL '90 days'
    ),
    user_behavior AS (
      SELECT 
        cu.user_id,
        COUNT(DISTINCT [al.date](http://al.date)) as active_days,
        COUNT(DISTINCT [f.id](http://f.id)) as forms_created,
        COUNT(DISTINCT [c.id](http://c.id)) as clients_managed
      FROM churned_users cu
      LEFT JOIN activity_logs al ON cu.user_id = al.user_id
      LEFT JOIN forms f ON cu.user_id = f.supplier_id
      LEFT JOIN clients c ON cu.user_id = c.supplier_id
      WHERE al.created_at > cu.churned_at - INTERVAL '30 days'
      GROUP BY cu.user_id
    )
    SELECT 
      churned_reason,
      AVG(lifetime_value) as avg_ltv,
      AVG(months_active) as avg_tenure,
      AVG(active_days) as avg_activity,
      COUNT(*) as count
    FROM churned_users cu
    JOIN user_behavior ub ON cu.user_id = ub.user_id
    GROUP BY churned_reason
    ORDER BY count DESC
  `)
}
```

## Critical Implementation Notes

- Run churn predictions daily at 2 AM UTC
- Weight recent activity more heavily than historical
- Consider seasonal patterns in churn analysis
- Don't over-communicate with at-risk users
- Track retention campaign effectiveness
- Implement gradual discount escalation

## Database Structure

```
-- Churn predictions table
CREATE TABLE churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  predicted_churn_date DATE,
  risk_factors JSONB,
  recommended_actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_actions JSONB
);

CREATE INDEX idx_churn_predictions_risk ON churn_predictions(risk_score DESC);
CREATE INDEX idx_churn_predictions_user ON churn_predictions(user_id, created_at DESC);

-- Retention campaigns
CREATE TABLE retention_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  campaign_type TEXT,
  risk_score INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('saved', 'churned', 'pending')),
  actions_taken JSONB,
  cost DECIMAL(10, 2)
);

-- Churn reasons tracking
CREATE TABLE churn_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  reason_category TEXT,
  reason_details TEXT,
  feedback TEXT,
  would_recommend INTEGER CHECK (would_recommend >= 0 AND would_recommend <= 10),
  churned_at TIMESTAMPTZ DEFAULT NOW()
);
```