# 05-predictive-analytics.md

# Predictive Analytics Engine

## What to Build

ML-powered predictions for client behavior, churn risk, and upsell opportunities.

## Technical Requirements

- Churn prediction model
- Engagement forecasting
- Best time-to-contact algorithm
- Revenue prediction

## Implementation

typescript

`*// Prediction models*
interface PredictiveModels {
  churnRisk: {
    score: number *// 0-1 probability*
    factors: string[] *// Contributing factors*
    preventionActions: string[]
  }
  
  upsellProbability: {
    score: number
    recommendedProducts: string[]
    optimalTiming: Date
  }
  
  engagementForecast: {
    next7Days: number[]
    peakTimes: string[]
    recommendedActions: string[]
  }
}

*// Feature engineering for ML*
const extractFeatures = (clientId) => ({
  daysSinceLastActivity: number,
  formCompletionRate: number,
  emailOpenRate: number,
  sessionFrequency: number,
  daysUntilWedding: number,
  supplierInteractions: number,
  *// 20+ features total*
})

*// Update predictions daily*
CREATE MATERIALIZED VIEW client_predictions AS
SELECT ...`

## Critical Notes

- Use logistic regression for churn (simple, explainable)
- Retrain models weekly with new data
- Human-readable prediction explanations
- Track prediction accuracy for improvement