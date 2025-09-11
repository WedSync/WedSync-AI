# 04-business-metrics.md

# Business Metrics Tracking

## What to Build

Implement comprehensive business metrics tracking to monitor MRR, churn, viral coefficient, and other key performance indicators. Build real-time dashboards for business health monitoring and investor reporting.

## Key Technical Requirements

### Metrics Database Schema
```sql
-- Create metrics tracking tables
CREATE TABLE business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(15, 2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(metric_date, metric_type)
);

CREATE INDEX idx_metrics_date ON business_metrics(metric_date DESC);
CREATE INDEX idx_metrics_type ON business_metrics(metric_type);

-- MRR tracking
CREATE TABLE mrr_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  movement_type VARCHAR(20) CHECK (movement_type IN ('new', 'expansion', 'contraction', 'churn', 'reactivation')),
  previous_mrr DECIMAL(10, 2),
  new_mrr DECIMAL(10, 2),
  delta DECIMAL(10, 2) GENERATED ALWAYS AS (new_mrr - COALESCE(previous_mrr, 0)) STORED,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### MRR Calculation Service
```typescript
// src/lib/metrics/mrr-calculator.ts
export class MRRCalculator {
  async calculateDailyMRR(): Promise<MRRSnapshot> {
    const subscriptions = await this.getActiveSubscriptions()
    
    const breakdown = {
      new: 0,
      expansion: 0,
      contraction: 0,
      churn: 0,
      reactivation: 0
    }
    
    for (const sub of subscriptions) {
      const previousMRR = await this.getPreviousMRR(sub.supplierId)
      const currentMRR = this.calculateSubscriptionMRR(sub)
      
      const movement = this.categorizeMovement(previousMRR, currentMRR)
      breakdown[movement.type] += movement.amount
      
      await this.recordMovement(sub.supplierId, movement)
    }
    
    const totalMRR = Object.values(breakdown).reduce((sum, val) => sum + val, 0)
    
    return {
      date: new Date(),
      total: totalMRR,
      breakdown,
      growthRate: this.calculateGrowthRate(totalMRR)
    }
  }
  
  private calculateSubscriptionMRR(subscription: Subscription): number {
    const basePrice = TIER_PRICING[subscription.tier]
    const addons = subscription.addons.reduce((sum, addon) => sum + addon.price, 0)
    const discount = subscription.discount || 0
    
    return (basePrice + addons) * (1 - discount)
  }
}
```

### Viral Coefficient Tracking
```typescript
// src/lib/metrics/viral-coefficient.ts
export class ViralCoefficientTracker {
  async calculateViralCoefficient(period: DateRange): Promise<ViralMetrics> {
    // Get all users who signed up in period
    const cohortUsers = await this.getUserCohort(period)
    
    // Track invitations sent
    const invitationsSent = await this.getInvitationsSent(cohortUsers)
    
    // Track successful conversions
    const conversions = await this.getConversions(invitationsSent)
    
    // Calculate K-factor
    const avgInvitesPerUser = invitationsSent.length / cohortUsers.length
    const conversionRate = conversions.length / invitationsSent.length
    const viralCoefficient = avgInvitesPerUser * conversionRate
    
    // Calculate viral cycle time
    const cycleTime = this.calculateAverageCycleTime(conversions)
    
    return {
      coefficient: viralCoefficient,
      invitesPerUser: avgInvitesPerUser,
      conversionRate,
      cycleTimeDays: cycleTime,
      projectedGrowth: this.projectGrowth(viralCoefficient, cycleTime)
    }
  }
}
```