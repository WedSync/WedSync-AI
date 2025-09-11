# Payment-analytics

## What to Build

Payment processing analytics dashboard tracking transaction success rates, payment failures, revenue recovery, and payment method performance.

## Key Technical Requirements

### Payment Analytics Structure

```tsx
interface PaymentAnalytics {
  transactions: {
    successful: number
    failed: number
    pending: number
    successRate: number
    averageValue: number
    totalVolume: number
  }
  failures: {
    byReason: FailureReason[]
    recoverable: number
    recovered: number
    lostRevenue: number
  }
  methods: {
    card: PaymentMethodStats
    bankTransfer: PaymentMethodStats
    paypal: PaymentMethodStats
  }
  dunning: {
    activeRecovery: number
    recoveryRate: number
    averageRecoveryTime: number
    revenueRecovered: number
  }
}

interface FailureReason {
  code: string
  description: string
  count: number
  amount: number
  recoveryRate: number
  suggestedAction: string
}

interface DunningCampaign {
  userId: string
  attemptNumber: number
  nextAttempt: Date
  totalOwed: number
  strategy: 'soft' | 'medium' | 'aggressive'
}

```

### Payment Recovery Implementation

```tsx
class PaymentRecoveryEngine {
  private readonly RETRY_SCHEDULE = [
    { day: 3, template: 'friendly_reminder' },
    { day: 5, template: 'payment_failed' },
    { day: 7, template: 'service_suspension_warning' },
    { day: 14, template: 'final_notice' },
    { day: 21, template: 'account_closure' }
  ]

  async processFailedPayment(payment: FailedPayment) {
    const failureAnalysis = await this.analyzeFailure(payment)

    if (failureAnalysis.isRecoverable) {
      await this.initiateDunning(payment, failureAnalysis)
    } else {
      await this.handleUnrecoverable(payment, failureAnalysis)
    }
  }

  private async analyzeFailure(payment: FailedPayment) {
    const reason = payment.failure_code

    const recoverable = [
      'insufficient_funds',
      'card_declined',
      'expired_card',
      'processing_error'
    ].includes(reason)

    const strategy = this.determineStrategy(payment)

    return {
      isRecoverable: recoverable,
      reason,
      strategy,
      suggestedRetryDate: this.calculateRetryDate(reason),
      alternativePaymentMethods: await this.getAlternatives(payment.userId)
    }
  }

  async smartRetry(payment: FailedPayment) {
    // Intelligent retry based on failure reason
    const optimalTime = await this.getOptimalRetryTime(payment)

    // Check if card was updated
    const cardUpdated = await this.checkCardUpdate(payment.userId)
    if (cardUpdated) {
      return await this.retryPayment(payment)
    }

    // Try alternative payment method
    const altMethod = await this.getAlternativeMethod(payment.userId)
    if (altMethod) {
      return await this.tryAlternativeMethod(payment, altMethod)
    }

    // Schedule for optimal retry time
    return await this.scheduleRetry(payment, optimalTime)
  }
}

```

### Payment Dashboard Component

```tsx
const PaymentDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d')
  const payments = usePaymentAnalytics(timeRange)
  const dunning = useDunningCampaigns()

  return (
    <div className="payment-dashboard">
      {/* Payment Success Metrics */}
      <div className="payment-health">
        <MetricCard
          title="Success Rate"
          value={`${payments.transactions.successRate}%`}
          target=">95%"
          status={payments.transactions.successRate < 95 ? 'warning' : 'good'}
        />
        <MetricCard
          title="Failed Payments"
          value={formatCurrency(payments.failures.lostRevenue)}
          subtitle={`${payments.failures.failed} transactions`}
        />
        <MetricCard
          title="Recovery Rate"
          value={`${payments.dunning.recoveryRate}%`}
          subtitle={`£${payments.dunning.revenueRecovered} recovered`}
        />
      </div>

      {/* Failure Analysis */}
      <FailureAnalysisChart
        failures={payments.failures.byReason}
        onReasonClick={(reason) => showFailureDetails(reason)}
      />

      {/* Active Dunning Campaigns */}
      <DunningManager
        campaigns={dunning.active}
        onAction={(campaign, action) => handleDunningAction(campaign, action)}
      />

      {/* Payment Method Performance */}
      <PaymentMethodComparison
        methods={payments.methods}
        recommendations={payments.recommendations}
      />

      {/* Revenue Recovery Timeline */}
      <RecoveryTimeline
        attempts={dunning.attempts}
        recovered={dunning.recovered}
      />
    </div>
  )
}

```

### Intelligent Dunning Campaigns

```tsx
class DunningOptimizer {
  async optimizeCampaign(user: User): Promise<DunningStrategy> {
    const userProfile = await this.analyzeUser(user)

    // Segment users for personalized approach
    const segment = this.segmentUser(userProfile)

    // Choose strategy based on segment
    switch(segment) {
      case 'high_value_low_risk':
        return {
          strategy: 'soft',
          channels: ['email'],
          retryDays: [3, 7, 14],
          discount: 0,
          pauseService: false
        }

      case 'medium_value_medium_risk':
        return {
          strategy: 'medium',
          channels: ['email', 'in_app'],
          retryDays: [2, 5, 7, 10],
          discount: 10,
          pauseService: true,
          pauseAfterDay: 7
        }

      case 'low_value_high_risk':
        return {
          strategy: 'aggressive',
          channels: ['email', 'sms', 'in_app'],
          retryDays: [1, 3, 5, 7],
          discount: 20,
          pauseService: true,
          pauseAfterDay: 5
        }
    }
  }

  async trackRecoveryEffectiveness() {
    return await db.query(`
      WITH recovery_stats AS (
        SELECT
          strategy,
          COUNT(*) as attempts,
          COUNT(CASE WHEN recovered THEN 1 END) as successful,
          AVG(days_to_recovery) as avg_recovery_time,
          SUM(amount_recovered) as total_recovered
        FROM dunning_campaigns
        WHERE created_at > NOW() - INTERVAL '90 days'
        GROUP BY strategy
      )
      SELECT
        strategy,
        successful::FLOAT / attempts as success_rate,
        avg_recovery_time,
        total_recovered / attempts as avg_recovery_value
      FROM recovery_stats
    `)
  }
}

```

## Critical Implementation Notes

- Implement PCI compliance monitoring
- Use webhooks for real-time payment status updates
- Store minimal payment data (tokenize everything)
- Implement automatic card updater service
- Monitor for fraudulent patterns
- Set up instant payment failure alerts
- Track payment processor costs and optimize routing

## Database Structure

```sql
-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT CHECK (status IN
    ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  payment_method_id TEXT,
  processor TEXT,
  processor_fee DECIMAL(10, 2),
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON payment_transactions(status, created_at DESC);

-- Dunning campaigns
CREATE TABLE dunning_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  payment_id UUID REFERENCES payment_transactions(id),
  amount_owed DECIMAL(10, 2),
  strategy TEXT,
  attempt_number INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  recovered BOOLEAN DEFAULT false,
  recovered_at TIMESTAMPTZ,
  amount_recovered DECIMAL(10, 2),
  days_to_recovery INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dunning_active ON dunning_campaigns(recovered, next_attempt_at)
  WHERE recovered = false;

-- Payment method performance
CREATE TABLE payment_method_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT,
  date DATE,
  transaction_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  total_volume DECIMAL(12, 2),
  avg_transaction DECIMAL(10, 2),
  avg_fee DECIMAL(10, 2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payment_method_stats_date ON payment_method_stats(method_type, date);

```