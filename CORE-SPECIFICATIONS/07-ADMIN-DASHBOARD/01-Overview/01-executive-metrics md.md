# 01-executive-metrics.md

## What to Build

Real-time dashboard showing key business metrics for platform health monitoring and decision making.

## Key Technical Requirements

### Metrics Dashboard Component

```
interface ExecutiveMetrics {
  revenue: {
    mrr: number
    arr: number
    growth: number // Month-over-month percentage
    churn: number
  }
  users: {
    totalSuppliers: number
    totalCouples: number
    activeSuppliers: number // Logged in last 30 days
    activeCouples: number
    newSignupsToday: number
  }
  viral: {
    coefficient: number // Target > 1.0
    invitationsSent: number
    invitationsAccepted: number
    averageInvitesPerSupplier: number
  }
  engagement: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    averageSessionDuration: number
  }
}
```

### Real-time Data Aggregation

```
class MetricsAggregator {
  async getExecutiveMetrics(): Promise<ExecutiveMetrics> {
    const [revenue, users, viral, engagement] = await Promise.all([
      this.calculateRevenue(),
      this.calculateUsers(),
      this.calculateViralMetrics(),
      this.calculateEngagement()
    ])
    
    return { revenue, users, viral, engagement }
  }
  
  private async calculateRevenue() {
    const result = await db.query(`
      SELECT 
        SUM(amount) as mrr,
        COUNT(*) as active_subscriptions
      FROM subscriptions 
      WHERE status = 'active'
    `)
    
    return {
      mrr: result.mrr,
      arr: result.mrr * 12,
      growth: await this.calculateGrowth(),
      churn: await this.calculateChurn()
    }
  }
}
```

### Dashboard UI Layout

```
const ExecutiveDashboard = () => {
  const metrics = useRealtimeMetrics() // WebSocket subscription
  
  return (
    <Grid columns={4} gap={4}>
      <MetricCard 
        title="MRR" 
        value={formatCurrency(metrics.revenue.mrr)}
        change={metrics.revenue.growth}
        trend={metrics.revenue.growth > 0 ? 'up' : 'down'}
      />
      <MetricCard 
        title="Active Suppliers" 
        value={metrics.users.activeSuppliers}
        subtitle={`of ${metrics.users.totalSuppliers} total`}
      />
      <MetricCard 
        title="Viral Coefficient" 
        value={metrics.viral.coefficient.toFixed(2)}
        target={1.0}
        status={metrics.viral.coefficient > 1 ? 'success' : 'warning'}
      />
      <MetricCard 
        title="DAU/MAU" 
        value={`${((metrics.engagement.dailyActiveUsers / metrics.engagement.monthlyActiveUsers) * 100).toFixed(1)}%`}
        benchmark="40% (industry avg)"
      />
    </Grid>
  )
}
```

## Critical Implementation Notes

- Cache metrics with 5-minute TTL to reduce database load
- Use materialized views for complex calculations
- Implement WebSocket updates for real-time changes
- Add drill-down capability for each metric
- Export functionality for board reports

## Database Structure

```
CREATE MATERIALIZED VIEW daily_metrics AS
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT supplier_id) as active_suppliers,
    COUNT(DISTINCT couple_id) as active_couples,
    AVG(session_duration) as avg_session_duration
  FROM user_sessions
  GROUP BY DATE(created_at);

CREATE INDEX idx_metrics_date ON daily_metrics(date);
REFRESH MATERIALIZED VIEW daily_metrics;
```