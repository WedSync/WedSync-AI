# 01-mrr-tracking.md

## What to Build

Monthly Recurring Revenue (MRR) tracking dashboard with real-time calculations, growth trends, and breakdown by segments.

## Key Technical Requirements

### MRR Calculation Engine

```
interface MRRMetrics {
  current: number
  new: number       // New subscriptions this month
  expansion: number // Upgrades
  contraction: number // Downgrades
  churned: number   // Cancellations
  net: number       // Net change
  growth: number    // Percentage growth
}

class MRRCalculator {
  async calculateMRR(date: Date = new Date()): Promise<MRRMetrics> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    // Get all active subscriptions
    const activeSubscriptions = await db.query(`
      SELECT 
        s.*,
        p.price,
        p.billing_interval
      FROM subscriptions s
      JOIN plans p ON s.plan_id = [p.id](http://p.id)
      WHERE s.status = 'active'
        AND s.created_at <= $1
    `, [endOfMonth])
    
    // Calculate current MRR
    const current = activeSubscriptions.reduce((total, sub) => {
      const monthlyAmount = this.normalizeToMonthly(
        sub.price, 
        sub.billing_interval
      )
      return total + monthlyAmount
    }, 0)
    
    // Calculate components
    const components = await this.calculateComponents(startOfMonth, endOfMonth)
    
    return {
      current,
      ...components,
      net: [components.new](http://components.new) + components.expansion - components.contraction - components.churned,
      growth: ((current - this.previousMRR) / this.previousMRR) * 100
    }
  }
  
  private normalizeToMonthly(price: number, interval: string): number {
    switch(interval) {
      case 'monthly': return price
      case 'quarterly': return price / 3
      case 'yearly': return price / 12
      default: return price
    }
  }
}
```

### MRR Tracking Dashboard

```
const MRRDashboard = () => {
  const [timeRange, setTimeRange] = useState('12months')
  const [segment, setSegment] = useState('all')
  const mrr = useMRRData(timeRange, segment)
  
  return (
    <div className="mrr-dashboard">
      {/* Current MRR Card */}
      <div className="mrr-current">
        <h2>Current MRR</h2>
        <div className="value">{formatCurrency(mrr.current)}</div>
        <div className="change">
          <TrendIndicator value={mrr.growth} />
          {mrr.growth}% vs last month
        </div>
      </div>
      
      {/* MRR Movement Waterfall */}
      <MRRWaterfall
        startMRR={mrr.previousMonth}
        newMRR={[mrr.new](http://mrr.new)}
        expansion={mrr.expansion}
        contraction={mrr.contraction}
        churn={mrr.churned}
        endMRR={mrr.current}
      />
      
      {/* Trend Chart */}
      <MRRTrendChart
        data={mrr.history}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      
      {/* Breakdown by Plan */}
      <MRRByPlan plans={mrr.planBreakdown} />
      
      {/* Cohort Performance */}
      <MRRByCohort cohorts={mrr.cohortBreakdown} />
    </div>
  )
}
```

### MRR Components Tracking

```
interface MRRMovement {
  date: Date
  type: 'new' | 'expansion' | 'contraction' | 'churn' | 'reactivation'
  amount: number
  subscriptionId: string
  customerId: string
  reason?: string
}

// Track all MRR movements
const trackMRRMovement = async (movement: MRRMovement) => {
  await db.mrr_movements.create(movement)
  
  // Update materialized view
  await db.query('REFRESH MATERIALIZED VIEW mrr_summary')
  
  // Send webhook if significant
  if (Math.abs(movement.amount) > 100) {
    await webhook.send('mrr.significant_change', movement)
  }
}
```

### Real-time MRR Updates

```
// WebSocket subscription for live updates
const useLiveMRR = () => {
  const [mrr, setMRR] = useState<number>(0)
  
  useEffect(() => {
    const subscription = supabase
      .channel('mrr-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'subscriptions' 
        },
        async (payload) => {
          // Recalculate MRR on subscription changes
          const newMRR = await calculateCurrentMRR()
          setMRR(newMRR)
          
          // Show notification for significant changes
          if (payload.eventType === 'INSERT') {
            toast.success(`New subscription: +${formatCurrency([payload.new](http://payload.new).amount)}`)
          }
        }
      )
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
  
  return mrr
}
```

## Critical Implementation Notes

- Calculate MRR at midnight UTC daily for consistency
- Handle prorated subscriptions correctly
- Account for discounts and credits
- Track failed payments separately (don't count as churn immediately)
- Include annual plans normalized to monthly value
- Cache calculations with 1-hour TTL

## Database Structure

```
-- MRR snapshot table
CREATE TABLE mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_mrr DECIMAL(10, 2) NOT NULL,
  new_mrr DECIMAL(10, 2) DEFAULT 0,
  expansion_mrr DECIMAL(10, 2) DEFAULT 0,
  contraction_mrr DECIMAL(10, 2) DEFAULT 0,
  churned_mrr DECIMAL(10, 2) DEFAULT 0,
  reactivation_mrr DECIMAL(10, 2) DEFAULT 0,
  active_subscriptions INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mrr_snapshots_date ON mrr_snapshots(date DESC);

-- MRR movements for detailed tracking
CREATE TABLE mrr_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  customer_id UUID REFERENCES users(id),
  movement_type TEXT CHECK (movement_type IN 
    ('new', 'expansion', 'contraction', 'churn', 'reactivation')),
  amount DECIMAL(10, 2) NOT NULL,
  previous_amount DECIMAL(10, 2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mrr_movements_date ON mrr_movements(date, movement_type);

-- Materialized view for quick queries
CREATE MATERIALIZED VIEW mrr_summary AS
  SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN movement_type = 'new' THEN amount ELSE 0 END) as new_mrr,
    SUM(CASE WHEN movement_type = 'expansion' THEN amount ELSE 0 END) as expansion_mrr,
    SUM(CASE WHEN movement_type = 'contraction' THEN ABS(amount) ELSE 0 END) as contraction_mrr,
    SUM(CASE WHEN movement_type = 'churn' THEN ABS(amount) ELSE 0 END) as churned_mrr
  FROM mrr_movements
  GROUP BY DATE_TRUNC('month', date);
```