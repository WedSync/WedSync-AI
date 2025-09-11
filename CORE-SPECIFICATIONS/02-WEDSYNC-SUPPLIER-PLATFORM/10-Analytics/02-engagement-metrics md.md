# 02-engagement-metrics.md

# Engagement Metrics Dashboard

## What to Build

Analytics dashboard showing client engagement scores and behavioral patterns.

## Technical Requirements

- Engagement scoring algorithm
- Comparative benchmarks
- Trend visualization with Chart.js
- Export to CSV capability

## Implementation

typescript

`*// Engagement scoring*
interface EngagementScore {
  overall: number *// 0-100*
  components: {
    recency: number *// Last activity*
    frequency: number *// Sessions per week*  
    depth: number *// Actions per session*
    completion: number *// Tasks completed*
    responsiveness: number *// Message response time*
  }
}

*// Calculation query*
SELECT 
  client_id,
  (recency_score * 0.3 + 
   frequency_score * 0.2 + 
   depth_score * 0.2 + 
   completion_score * 0.2 + 
   response_score * 0.1) as engagement_score
FROM client_engagement_metrics
WHERE supplier_id = ?

*// Engagement segments*
- Hot (80-100): Highly engaged
- Warm (50-79): Moderately engaged  
- Cool (20-49): Low engagement
- Cold (0-19): At risk`

## Critical Notes

- Update scores daily at 2 AM
- Compare against vendor category averages
- Alert on engagement drops >30%
- Predictive churn based on patterns