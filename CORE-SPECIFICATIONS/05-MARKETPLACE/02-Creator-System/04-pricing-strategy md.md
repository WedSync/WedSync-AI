# 04-pricing-strategy.md

## What to Build

Dynamic pricing system with market analysis, suggested pricing, and promotional tools for template creators.

## Key Technical Requirements

### Pricing Intelligence Engine

```
interface PricingStrategy {
  analysis: {
    marketRate: number // Average for similar templates
    demandScore: number // Based on searches/views
    competitionLevel: 'low' | 'medium' | 'high'
    priceElasticity: number // How price affects sales
  },
  recommendations: {
    suggested: number
    minimum: number // Platform minimum
    maximum: number // Based on tier/category
    optimal: number // ML-predicted best price
  },
  strategies: {
    penetration: number // Low price for market entry
    premium: number // High price for exclusivity
    competitive: number // Match market rate
    bundle: BundleOptions[]
  }
}
```

### Market Analysis System

```
class MarketAnalyzer {
  async analyzePricing(template: Template): Promise<PricingAnalysis> {
    // Find similar templates
    const similar = await this.findSimilarTemplates(template)
    
    const analysis = {
      averagePrice: this.calculateAverage([similar.map](http://similar.map)(t => t.price)),
      priceRange: {
        min: Math.min(...[similar.map](http://similar.map)(t => t.price)),
        max: Math.max(...[similar.map](http://similar.map)(t => t.price))
      },
      salesVolume: [similar.map](http://similar.map)(t => ({
        price: t.price,
        sales: t.salesCount
      })),
      optimalPrice: await this.predictOptimalPrice(template, similar)
    }
    
    return analysis
  }
  
  async predictOptimalPrice(template: Template, competition: Template[]): Promise<number> {
    // ML model considering:
    // - Creator reputation
    // - Template complexity
    // - Market saturation
    // - Seasonal demand
    
    const features = {
      creatorRating: template.creator.rating,
      templateComplexity: this.calculateComplexity(template),
      competitionCount: competition.length,
      seasonalMultiplier: this.getSeasonalFactor()
    }
    
    return this.mlModel.predict(features)
  }
}
```

### Dynamic Pricing Rules

```
class DynamicPricing {
  async adjustPrice(templateId: string): Promise<PriceAdjustment> {
    const metrics = await this.getTemplateMetrics(templateId)
    
    const rules = [
      {
        condition: metrics.views > 100 && metrics.sales < 2,
        action: 'decrease',
        amount: 0.1 // 10% decrease
      },
      {
        condition: metrics.conversionRate > 0.15,
        action: 'increase',
        amount: 0.05 // 5% increase
      },
      {
        condition: metrics.stockLevel === 'high_demand',
        action: 'increase',
        amount: 0.15
      }
    ]
    
    const applicable = rules.filter(rule => rule.condition)
    
    if (applicable.length > 0) {
      return this.applyAdjustment(templateId, applicable[0])
    }
    
    return null
  }
}
```

### Promotional Tools

```
interface PromotionalTools {
  discounts: {
    percentage: {
      amount: number // 10-50%
      duration: number // days
      maxUses?: number
    },
    fixed: {
      amount: number // Dollar amount off
      minimumPurchase?: number
    },
    bundle: {
      templates: string[]
      discountPercent: number
    },
    earlyBird: {
      duration: number // First X days
      discount: number
    }
  },
  campaigns: {
    flashSale: {
      duration: number // hours
      discount: number
      urgencyMessaging: boolean
    },
    seasonal: {
      event: 'black_friday' | 'new_year' | 'wedding_season'
      discount: number
    }
  }
}

class PromotionManager {
  async createPromotion(templateId: string, promo: Promotion) {
    // Validate promotion rules
    if ([promo.discount](http://promo.discount) > 0.5) {
      throw new Error('Maximum discount is 50%')
    }
    
    // Check for overlapping promotions
    const existing = await this.getActivePromotions(templateId)
    if (existing.length > 0) {
      throw new Error('Template already has active promotion')
    }
    
    // Create promotion
    await db.insert('promotions', {
      template_id: templateId,
      type: promo.type,
      config: promo.config,
      starts_at: promo.startsAt || new Date(),
      ends_at: promo.endsAt
    })
    
    // Update template listing
    await this.updateListingBadges(templateId, promo)
  }
}
```

## Critical Implementation Notes

- Minimum price of $9 to maintain quality perception
- Maximum 50% discount to protect value
- A/B test pricing on similar audiences
- Surge pricing during peak wedding planning seasons
- Bundle discounts encourage multiple purchases

## Database Structure

```
CREATE TABLE template_pricing (
  template_id UUID PRIMARY KEY,
  base_price INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  pricing_strategy TEXT,
  last_adjusted TIMESTAMPTZ
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY,
  template_id UUID,
  old_price INTEGER,
  new_price INTEGER,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE promotions (
  id UUID PRIMARY KEY,
  template_id UUID,
  type TEXT,
  config JSONB,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);
```