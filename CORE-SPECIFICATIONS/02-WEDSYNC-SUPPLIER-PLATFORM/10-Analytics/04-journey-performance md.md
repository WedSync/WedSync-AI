# 04-journey-performance.md

# Customer Journey Analytics

## What to Build

Analytics system tracking customer journey performance, bottlenecks, and conversion rates.

## Technical Requirements

- Journey funnel visualization
- Module-level metrics
- Cohort analysis
- Journey comparison tools

## Implementation

typescript

`*// Journey analytics*
journey_analytics {
  journey_id: uuid
  instance_id: uuid *// Per couple*
  module_id: text
  module_type: text
  scheduled_at: timestamp
  executed_at: timestamp
  opened_at: timestamp
  completed_at: timestamp
  status: text
  engagement_data: jsonb
}

*// Journey metrics*
interface JourneyMetrics {
  completionRate: number
  avgTimeToComplete: number
  modulePerformance: {
    [moduleId]: {
      openRate: number
      completionRate: number
      avgResponseTime: number
    }
  }
  bottlenecks: string[] *// Module IDs with >20% drop*
}

*// SQL for funnel analysis*
WITH journey_funnel AS (
  SELECT 
    module_order,
    COUNT(*) as total,
    COUNT(completed_at) as completed
  FROM journey_analytics
  GROUP BY module_order
)
SELECT * FROM journey_funnel ORDER BY module_order;`

## Critical Notes

- Compare journey variants (A/B tests)
- Identify optimal send times
- Track journey-to-booking conversion
- Alert on journey failures