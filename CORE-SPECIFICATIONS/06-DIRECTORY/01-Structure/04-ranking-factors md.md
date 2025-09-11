# 04-ranking-factors.md

## What to Build

A dynamic scoring system that determines supplier ranking in search results and featured placements.

## Key Technical Requirements

### Scoring Algorithm

```
interface SupplierScore {
  supplier_id: string;
  total_score: number;
  location_score: number;
  quality_score: number;
  engagement_score: number;
  premium_boost: number;
  last_calculated: Date;
}

interface ScoreFactors {
  // Quality factors (40%)
  average_rating: number; // 0-5
  review_count: number;
  profile_completeness: number; // 0-100%
  verification_status: boolean;
  portfolio_quality: number; // 0-100%
  
  // Engagement factors (30%)
  response_time_hours: number;
  last_active_days: number;
  booking_success_rate: number; // 0-100%
  client_retention_rate: number; // 0-100%
  
  // Platform factors (20%)
  wedme_connections: number;
  form_completion_rate: number; // 0-100%
  automation_usage: boolean;
  api_integration: boolean;
  
  // Business factors (10%)
  years_in_business: number;
  insurance_verified: boolean;
  license_verified: boolean;
  professional_membership: boolean;
}
```

### Dynamic Adjustments

- **Peak Season Boost**: +15% during wedding season
- **New Supplier Penalty**: -20% for first 90 days
- **Inactive Penalty**: -5% per week of inactivity
- **Premium Tier Boost**: +25% for Scale/Enterprise tiers

## Critical Implementation Notes

### Score Calculation Job

```
// Run nightly at 2 AM
export async function calculateSupplierScores() {
  const suppliers = await getActiveSuppliers();
  
  for (const supplier of suppliers) {
    const factors = await getScoreFactors([supplier.id](http://supplier.id));
    const score = calculateScore(factors);
    
    await updateSupplierScore([supplier.id](http://supplier.id), score);
  }
}

function calculateScore(factors: ScoreFactors): number {
  const qualityScore = (
    (factors.average_rating / 5) * 0.4 +
    Math.min([factors.review](http://factors.review)_count / 50, 1) * 0.2 +
    (factors.profile_completeness / 100) * 0.2 +
    (factors.verification_status ? 1 : 0) * 0.2
  ) * 40;
  
  // Additional calculations...
  
  return Math.min(qualityScore + engagementScore + platformScore + businessScore, 100);
}
```

### Monitoring & Analytics

- Track score distribution across suppliers
- Monitor ranking stability
- A/B test ranking algorithm changes
- Alert on significant score drops

### Database Structure

```
CREATE TABLE supplier_scores (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id),
  total_score DECIMAL(5,2) NOT NULL,
  quality_score DECIMAL(5,2),
  engagement_score DECIMAL(5,2),
  platform_score DECIMAL(5,2),
  business_score DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  factors JSONB
);

CREATE INDEX idx_supplier_scores_total 
ON supplier_scores(total_score DESC);
```