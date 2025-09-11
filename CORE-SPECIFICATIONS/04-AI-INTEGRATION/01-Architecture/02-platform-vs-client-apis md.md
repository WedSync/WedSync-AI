# 02-platform-vs-client-apis.md

# Platform vs Client APIs Implementation

## What to Build

Create a clear separation between features powered by platform APIs (included in subscription) versus client APIs (supplier's own keys).

## Key Technical Requirements

### Platform API Features (WedSync's OpenAI Key)

```
// src/lib/ai/platform-features.ts
export const platformFeatures = {
  // Core onboarding features
  formGeneration: {
    enabled: true,
    costPerOperation: 0.50, // Absorbed by platform
    usage: 'one-time-per-form'
  },
  
  websiteAnalysis: {
    enabled: true,
    costPerOperation: 2.00,
    usage: 'one-time-per-setup'
  },
  
  templateGeneration: {
    enabled: true,
    costPerOperation: 0.25,
    maxPerMonth: 500 // Prevent abuse
  }
}
```

### Client API Features (Supplier's OpenAI Key)

```
// src/lib/ai/client-features.ts
export const clientFeatures = {
  chatbot: {
    requiredTier: 'professional',
    estimatedCost: '£15-50/month',
    setupRequired: true
  },
  
  contentGeneration: {
    requiredTier: 'professional', 
    variableCost: true,
    features: ['email_composition', 'personalization']
  },
  
  advancedAnalytics: {
    requiredTier: 'scale',
    features: ['predictive_insights', 'optimization']
  }
}
```

## Critical Implementation Notes

### Feature Gate Logic

```
// src/lib/ai/feature-gate.ts
export const checkAIFeatureAccess = async (
  supplierId: string,
  feature: string
) => {
  const supplier = await getSupplier(supplierId)
  
  if (platformFeatures[feature]) {
    // Platform feature - check subscription tier
    return supplier.tier !== 'free'
  }
  
  if (clientFeatures[feature]) {
    // Client feature - check API setup
    const apiConfig = await getClientAPIConfig(supplierId)
    return apiConfig?.enabled && hasValidAPIKey(apiConfig)
  }
  
  return false
}
```

### Setup Wizard Flow

1. **Platform Features**: Automatically enabled for paid tiers
2. **Client Features**: Require explicit setup:
    - API key entry
    - Test connection
    - Budget configuration
    - Usage monitoring setup

### Usage Dashboard

```
// Show clear breakdown of costs
interface AIUsageDashboard {
  platformFeatures: {
    included: true,
    thisMonth: {
      formGenerations: 12,
      websiteAnalyses: 3,
      templatesCreated: 47
    }
  },
  
  clientFeatures: {
    openaiCost: 23.45,
    budget: 50.00,
    features: {
      chatbot: { queries: 342, cost: 18.20 },
      contentGen: { requests: 89, cost: 5.25 }
    }
  }
}
```

### Migration Strategy

- Start with platform features to demonstrate value
- Introduce client features as upgrade path
- Provide cost calculators for decision making
- Offer trial credits for client API setup