# 02-cohort-analysis.md

## What to Build

Cohort analysis system tracking user behavior and revenue patterns by signup month, showing retention, expansion, and lifetime value trends.

## Key Technical Requirements

### Cohort Data Structure

```
interface Cohort {
  cohortMonth: string // '2024-01'
  size: number // Users in cohort
  periods: CohortPeriod[] // Data for each month after signup
}

interface CohortPeriod {
  periodIndex: number // 0 = signup month, 1 = month 2, etc.
  activeUsers: number
  retentionRate: number
  revenue: number
  averageRevenue: number
  churnedUsers: number
  expandedUsers: number
}

interface CohortAnalysis {
  cohorts: Cohort[]
  metrics: {
    retention: number[][] // 2D array for heatmap
    revenue: number[][]
    ltv: number[][]
  }
}
```

### Cohort Calculator

```
class CohortAnalyzer {
  async generateCohortAnalysis(
    startDate: Date,
    endDate: Date,
    metric: 'retention' | 'revenue' | 'ltv'
  ): Promise<CohortAnalysis> {
    
    // Get all cohorts in range
    const cohorts = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as cohort_month,
        COUNT(*) as cohort_size,
        ARRAY_AGG(id) as user_ids
      FROM users
      WHERE created_at BETWEEN $1 AND $2
        AND user_type = 'supplier'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY cohort_month
    `, [startDate, endDate])
    
    // Calculate metrics for each cohort
    const analysisData = await Promise.all(
      [cohorts.map](http://cohorts.map)(cohort => this.analyzeCohort(cohort))
    )
    
    return {
      cohorts: analysisData,
      metrics: this.buildMetricsMatrix(analysisData, metric)
    }
  }
  
  private async analyzeCohort(cohort: any): Promise<Cohort> {
    const periods: CohortPeriod[] = []
    const currentDate = new Date()
    const cohortDate = new Date(cohort.cohort_month)
    
    // Calculate for each month since cohort creation
    let periodIndex = 0
    let periodDate = new Date(cohortDate)
    
    while (periodDate <= currentDate) {
      const periodEnd = new Date(periodDate)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      
      const periodData = await this.calculatePeriodMetrics(
        cohort.user_ids,
        periodDate,
        periodEnd,
        cohort.cohort_size
      )
      
      periods.push({
        periodIndex,
        ...periodData
      })
      
      periodIndex++
      periodDate.setMonth(periodDate.getMonth() + 1)
    }
    
    return {
      cohortMonth: cohort.cohort_month,
      size: cohort.cohort_size,
      periods
    }
  }
}
```

### Cohort Visualization Component

```
const CohortHeatmap = () => {
  const [metric, setMetric] = useState<'retention' | 'revenue' | 'ltv'>('retention')
  const [timeRange, setTimeRange] = useState(12) // months
  const cohortData = useCohortData(timeRange, metric)
  
  return (
    <div className="cohort-analysis">
      <div className="controls">
        <MetricSelector value={metric} onChange={setMetric} />
        <TimeRangeSlider value={timeRange} onChange={setTimeRange} />
      </div>
      
      <div className="cohort-grid">
        <table className="cohort-table">
          <thead>
            <tr>
              <th>Cohort</th>
              <th>Users</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i}>Month {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[cohortData.cohorts.map](http://cohortData.cohorts.map)(cohort => (
              <CohortRow
                key={cohort.cohortMonth}
                cohort={cohort}
                metric={metric}
                maxPeriods={12}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <CohortInsights data={cohortData} />
    </div>
  )
}

const CohortRow = ({ cohort, metric, maxPeriods }) => {
  const getColorIntensity = (value: number) => {
    // Color based on metric performance
    if (metric === 'retention') {
      if (value > 80) return 'bg-green-500'
      if (value > 60) return 'bg-green-400'
      if (value > 40) return 'bg-yellow-400'
      if (value > 20) return 'bg-orange-400'
      return 'bg-red-400'
    }
    // Similar logic for revenue and LTV
  }
  
  return (
    <tr>
      <td>{format(cohort.cohortMonth, 'MMM yyyy')}</td>
      <td>{cohort.size}</td>
      {cohort.periods.slice(0, maxPeriods).map(period => (
        <td 
          key={period.periodIndex}
          className={getColorIntensity(period[metric])}
        >
          {formatMetric(period[metric], metric)}
        </td>
      ))}
    </tr>
  )
}
```

### Cohort Insights Generator

```
const generateCohortInsights = (data: CohortAnalysis) => {
  const insights = []
  
  // Best performing cohort
  const bestCohort = data.cohorts.reduce((best, current) => {
    const currentLTV = calculateCohortLTV(current)
    const bestLTV = calculateCohortLTV(best)
    return currentLTV > bestLTV ? current : best
  })
  
  insights.push({
    type: 'success',
    title: 'Best Performing Cohort',
    message: `${bestCohort.cohortMonth} cohort has 43% higher LTV than average`
  })
  
  // Retention cliff detection
  const retentionCliff = findRetentionCliff(data)
  if (retentionCliff) {
    insights.push({
      type: 'warning',
      title: 'Retention Drop',
      message: `Most users churn at month ${retentionCliff.month}`
    })
  }
  
  // Expansion revenue opportunities
  const expansionRate = calculateExpansionRate(data)
  insights.push({
    type: 'info',
    title: 'Expansion Revenue',
    message: `${expansionRate}% of users upgrade within 6 months`
  })
  
  return insights
}
```

## Critical Implementation Notes

- Pre-calculate cohort data nightly for performance
- Use materialized views for common cohort queries
- Limit analysis to last 24 months for UI performance
- Handle incomplete months appropriately
- Account for seasonal variations in analysis
- Include statistical significance indicators

## Database Structure

```
-- Cohort summary table
CREATE TABLE cohort_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL,
  period_month DATE NOT NULL,
  period_index INTEGER NOT NULL,
  cohort_size INTEGER NOT NULL,
  active_users INTEGER,
  churned_users INTEGER,
  revenue DECIMAL(10, 2),
  new_revenue DECIMAL(10, 2),
  expansion_revenue DECIMAL(10, 2),
  contraction_revenue DECIMAL(10, 2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_month, period_month)
);

CREATE INDEX idx_cohort_analysis_cohort ON cohort_analysis(cohort_month);
CREATE INDEX idx_cohort_analysis_period ON cohort_analysis(period_index);

-- User cohort assignments
CREATE TABLE user_cohorts (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  cohort_month DATE NOT NULL,
  initial_plan TEXT,
  initial_mrr DECIMAL(10, 2),
  current_plan TEXT,
  current_mrr DECIMAL(10, 2),
  lifetime_value DECIMAL(10, 2),
  months_active INTEGER,
  last_active DATE
);

CREATE INDEX idx_user_cohorts_month ON user_cohorts(cohort_month);

-- Materialized view for quick cohort queries
CREATE MATERIALIZED VIEW cohort_retention AS
  SELECT 
    cohort_month,
    period_index,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT user_id)::FLOAT / cohort_size as retention_rate,
    AVG(revenue) as avg_revenue
  FROM cohort_analysis
  GROUP BY cohort_month, period_index, cohort_size;
```