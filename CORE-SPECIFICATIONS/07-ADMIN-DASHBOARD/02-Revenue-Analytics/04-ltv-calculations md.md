# 04-ltv-calculations.md

## What to Build

Lifetime Value (LTV) calculation engine with predictive modeling, segment analysis, and LTV:CAC ratio tracking.

## Key Technical Requirements

### LTV Calculation Models

```
interface LTVMetrics {
  historical: number // Actual revenue to date
  predicted: number // Expected future revenue
  total: number // Historical + predicted
  confidence: number // Prediction confidence 0-100
  paybackPeriod: number // Months to recover CAC
  ltvcac: number // LTV to CAC ratio
}

interface LTVSegment {
  segment: string
  avgLTV: number
  medianLTV: number
  topDecileLTV: number
  churnRate: number
  avgTenure: number
}

class LTVCalculator {
  // Simple historical LTV
  calculateHistoricalLTV(userId: string): number {
    const revenue = db.query(`
      SELECT SUM(amount) as total
      FROM payments
      WHERE user_id = $1
        AND status = 'succeeded'
    `, [userId])
    
    return [revenue.total](http://revenue.total) || 0
  }
  
  // Predictive LTV using cohort-based model
  async calculatePredictiveLTV(userId: string): Promise<LTVMetrics> {
    const user = await this.getUserMetrics(userId)
    
    // Get cohort behavior
    const cohortData = await this.getCohortBehavior(
      user.signupDate,
      user.plan,
      user.vendorType
    )
    
    // Calculate using multiple models
    const models = [
      this.cohortBasedModel(user, cohortData),
      this.probabilisticModel(user),
      this.machinelearningModel(user)
    ]
    
    // Weighted average of models
    const predicted = this.weightedAverage(models)
    
    return {
      historical: user.revenue,
      predicted: predicted.value,
      total: user.revenue + predicted.value,
      confidence: predicted.confidence,
      paybackPeriod: this.calculatePayback(user.cac, user.monthlyRevenue),
      ltvcac: (user.revenue + predicted.value) / user.cac
    }
  }
  
  // Cohort-based prediction
  private cohortBasedModel(user: any, cohort: any) {
    const monthsActive = user.monthsActive
    const avgTenure = cohort.avgTenure
    const remainingMonths = Math.max(0, avgTenure - monthsActive)
    
    return {
      value: remainingMonths * user.monthlyRevenue,
      confidence: 70
    }
  }
  
  // Probabilistic survival model
  private probabilisticModel(user: any) {
    const survivalRate = this.calculateSurvivalProbability(user)
    const expectedMonths = this.expectedRemainingLifetime(survivalRate)
    
    return {
      value: expectedMonths * user.monthlyRevenue * (1 + user.expansionRate),
      confidence: 60
    }
  }
}
```

### LTV Dashboard Component

```
const LTVDashboard = () => {
  const [segment, setSegment] = useState('all')
  const [timeframe, setTimeframe] = useState('12m')
  const ltvData = useLTVData(segment, timeframe)
  
  return (
    <div className="ltv-dashboard">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Average LTV"
          value={formatCurrency(ltvData.avgLTV)}
          change={ltvData.ltvGrowth}
        />
        <MetricCard
          title="LTV:CAC Ratio"
          value={ltvData.ltvcac.toFixed(2)}
          target={3.0}
          status={ltvData.ltvcac > 3 ? 'good' : 'warning'}
        />
        <MetricCard
          title="Payback Period"
          value={`${ltvData.avgPayback} months`}
          target="< 12 months"
        />
        <MetricCard
          title="Top 10% LTV"
          value={formatCurrency(ltvData.topDecileLTV)}
          subtitle="Power users"
        />
      </div>
      
      {/* LTV Distribution */}
      <LTVDistributionChart data={ltvData.distribution} />
      
      {/* Segment Analysis */}
      <LTVBySegment segments={ltvData.segments} />
      
      {/* LTV Trajectory */}
      <LTVGrowthCurve cohorts={ltvData.cohortCurves} />
    </div>
  )
}
```

### LTV Segmentation Analysis

```
const analyzeLTVSegments = async () => {
  const segments = [
    { name: 'vendor_type', field: 'vendor_type' },
    { name: 'plan', field: 'subscription_plan' },
    { name: 'acquisition_channel', field: 'utm_source' },
    { name: 'engagement_level', field: 'engagement_score' }
  ]
  
  const analysis = await Promise.all(
    [segments.map](http://segments.map)(async (segment) => {
      const data = await db.query(`
        SELECT 
          ${segment.field} as segment_value,
          AVG(lifetime_value) as avg_ltv,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lifetime_value) as median_ltv,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY lifetime_value) as p90_ltv,
          AVG(months_active) as avg_tenure,
          COUNT(*) as user_count
        FROM user_ltv
        GROUP BY ${segment.field}
        ORDER BY avg_ltv DESC
      `)
      
      return {
        segmentType: [segment.name](http://segment.name),
        segments: data
      }
    })
  )
  
  return analysis
}
```

### CAC vs LTV Tracking

```
interface CACMetrics {
  blended: number // Total spend / total customers
  paid: number // Paid marketing / paid customers
  organic: number // Operating costs / organic customers
  byChannel: ChannelCAC[]
}

class CACCalculator {
  async calculateCAC(startDate: Date, endDate: Date): Promise<CACMetrics> {
    // Get marketing spend
    const marketingSpend = await this.getMarketingSpend(startDate, endDate)
    
    // Get new customers
    const newCustomers = await this.getNewCustomers(startDate, endDate)
    
    // Calculate by channel
    const channelMetrics = await Promise.all(
      [marketingSpend.channels.map](http://marketingSpend.channels.map)(async (channel) => {
        const customers = newCustomers.filter(
          c => c.acquisition_channel === [channel.name](http://channel.name)
        )
        return {
          channel: [channel.name](http://channel.name),
          spend: channel.spend,
          customers: customers.length,
          cac: channel.spend / customers.length,
          ltv: await this.getChannelLTV([channel.name](http://channel.name)),
          ratio: 0 // Will calculate
        }
      })
    )
    
    // Calculate ratios
    channelMetrics.forEach(m => {
      m.ratio = m.ltv / m.cac
    })
    
    return {
      blended: [marketingSpend.total](http://marketingSpend.total) / newCustomers.length,
      paid: marketingSpend.paid / newCustomers.filter(c => c.isPaid).length,
      organic: marketingSpend.operational / newCustomers.filter(c => !c.isPaid).length,
      byChannel: channelMetrics
    }
  }
}
```

## Critical Implementation Notes

- Recalculate LTV nightly for all users
- Use 12-month window for predictive models
- Weight recent behavior more heavily
- Account for seasonality in wedding industry
- Include expansion revenue in calculations
- Track model accuracy and adjust weights

## Database Structure

```
-- User LTV tracking
CREATE TABLE user_ltv (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  historical_ltv DECIMAL(10, 2) NOT NULL DEFAULT 0,
  predicted_ltv DECIMAL(10, 2),
  total_ltv DECIMAL(10, 2),
  confidence_score INTEGER,
  months_active INTEGER,
  last_payment_date DATE,
  churn_probability DECIMAL(3, 2),
  expansion_rate DECIMAL(3, 2),
  cac DECIMAL(10, 2),
  ltv_cac_ratio DECIMAL(5, 2),
  payback_months INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_ltv_total ON user_ltv(total_ltv DESC);
CREATE INDEX idx_user_ltv_ratio ON user_ltv(ltv_cac_ratio DESC);

-- LTV by segment
CREATE TABLE ltv_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_type TEXT NOT NULL,
  segment_value TEXT NOT NULL,
  avg_ltv DECIMAL(10, 2),
  median_ltv DECIMAL(10, 2),
  p90_ltv DECIMAL(10, 2),
  user_count INTEGER,
  avg_tenure DECIMAL(5, 2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_type, segment_value, calculated_at)
);

-- CAC tracking
CREATE TABLE customer_acquisition_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  channel TEXT,
  marketing_spend DECIMAL(10, 2),
  operational_spend DECIMAL(10, 2),
  new_customers INTEGER,
  cac DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```