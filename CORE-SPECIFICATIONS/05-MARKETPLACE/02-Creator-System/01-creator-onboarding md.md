# 01-creator-onboarding.md

## What to Build

Streamlined onboarding flow for suppliers wanting to sell their templates, including verification, quality checks, and tax setup.

## Key Technical Requirements

### Creator Application Flow

```
interface CreatorOnboarding {
  steps: [
    {
      id: 'eligibility',
      checks: [
        'professional_tier_subscription',
        'account_age_30_days',
        'minimum_50_clients',
        'completed_10_journeys'
      ]
    },
    {
      id: 'verification',
      requirements: [
        'business_verification',
        'portfolio_review',
        'quality_assessment'
      ]
    },
    {
      id: 'financial',
      setup: [
        'stripe_connect_account',
        'tax_information',
        'payout_preferences'
      ]
    },
    {
      id: 'content',
      submission: [
        'first_template_upload',
        'pricing_strategy',
        'marketing_materials'
      ]
    }
  ]
}
```

### Eligibility Checker

```
class CreatorEligibility {
  async checkEligibility(supplierId: string): Promise<EligibilityResult> {
    const supplier = await this.getSupplier(supplierId)
    
    const checks = {
      tier: supplier.subscriptionTier === 'professional' || supplier.subscriptionTier === 'scale',
      accountAge: daysSince(supplier.createdAt) >= 30,
      clientCount: supplier.totalClients >= 50,
      journeyCount: supplier.completedJourneys >= 10,
      satisfactionScore: supplier.averageRating >= 4.0
    }
    
    const eligible = Object.values(checks).every(check => check === true)
    
    return {
      eligible,
      checks,
      missingRequirements: Object.entries(checks)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key)
    }
  }
}
```

### Stripe Connect Integration

```
class CreatorFinancialSetup {
  async setupStripeConnect(supplierId: string) {
    // Create connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: [supplier.country](http://supplier.country),
      email: [supplier.email](http://supplier.email),
      capabilities: {
        transfers: { requested: true }
      },
      business_type: 'individual',
      metadata: {
        supplierId
      }
    })
    
    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: [account.id](http://account.id),
      refresh_url: `${BASE_URL}/marketplace/creator/refresh`,
      return_url: `${BASE_URL}/marketplace/creator/complete`,
      type: 'account_onboarding'
    })
    
    await this.saveStripeAccount(supplierId, [account.id](http://account.id))
    
    return accountLink.url
  }
}
```

### Quality Assessment

```
class QualityAssessment {
  async assessCreator(supplierId: string): Promise<QualityScore> {
    const metrics = await this.gatherMetrics(supplierId)
    
    const scores = {
      clientSatisfaction: this.scoreFromRating(metrics.averageRating),
      completionRate: this.scoreFromCompletion(metrics.formCompletionRate),
      responseTime: this.scoreFromResponseTime(metrics.avgResponseHours),
      templateComplexity: await this.assessTemplateQuality(supplierId)
    }
    
    const overall = Object.values(scores).reduce((a, b) => a + b) / Object.keys(scores).length
    
    return {
      overall,
      breakdown: scores,
      approved: overall >= 7.0,
      feedback: this.generateFeedback(scores)
    }
  }
}
```

## Critical Implementation Notes

- Manual review for first 3 templates from each creator
- Automatic approval after proven track record
- Sandbox environment for testing templates
- Clear rejection reasons with improvement guidance
- Fast-track for verified industry experts

## Database Structure

```
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'pending',
  eligibility_checks JSONB,
  quality_score DECIMAL(3,1),
  stripe_account_id TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  reviewer_notes TEXT
);

CREATE TABLE creator_profiles (
  supplier_id UUID PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  expertise TEXT[],
  social_links JSONB,
  verified_at TIMESTAMPTZ
);
```