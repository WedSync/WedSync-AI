# 04-pricing-display.md

## What to Build

A flexible pricing display system that shows package information while maintaining supplier control and encouraging direct contact.

## Key Technical Requirements

### Pricing Structure

```
interface PricingDisplay {
  supplier_id: string;
  display_type: 'ranges' | 'packages' | 'starting_from' | 'contact_only';
  currency: string;
  pricing_data: PricingData;
  last_updated: Date;
  is_visible: boolean;
}

interface PricingData {
  packages?: Package[];
  price_ranges?: PriceRange[];
  starting_price?: number;
  custom_message?: string;
}

interface Package {
  id: string;
  name: string;
  description: string;
  base_price: number;
  features: string[];
  is_popular: boolean;
  add_ons: AddOn[];
}

interface PriceRange {
  category: string; // "Photography", "Videography", etc.
  min_price: number;
  max_price: number;
  typical_price?: number;
  notes?: string;
}
```

### Display Options

1. **Price Ranges**
    - Photography: £1,500 - £3,500
    - Videography: £800 - £2,000
    - Albums: £300 - £800
2. **Package Display**
    - Essential Package: £1,800
    - Premium Package: £2,800
    - Luxury Package: £4,200
3. **Starting From**
    - "Packages starting from £1,500"
    - Encourages inquiry for full pricing
4. **Contact Only**
    - "Contact for custom quote"
    - For bespoke/luxury suppliers

## Critical Implementation Notes

### Pricing Components

```
export function PricingDisplay({ pricing, supplierType }: Props) {
  const renderPricingDisplay = () => {
    switch (pricing.display_type) {
      case 'packages':
        return <PackageDisplay packages={pricing.pricing_data.packages} />;
      case 'ranges':
        return <RangeDisplay ranges={pricing.pricing_data.price_ranges} />;
      case 'starting_from':
        return <StartingFromDisplay price={pricing.pricing_data.starting_price} />;
      default:
        return <ContactOnlyDisplay message={pricing.pricing_data.custom_message} />;
    }
  };
  
  return (
    <div className="pricing-section">
      <h3>Investment</h3>
      {renderPricingDisplay()}
      <div className="pricing-disclaimer">
        <p>Prices may vary based on specific requirements. Contact for detailed quote.</p>
      </div>
    </div>
  );
}
```

### Regional Pricing Support

```
// Handle multiple currencies and regions
interface RegionalPricing {
  region: string;
  currency: string;
  price_modifier: number; // Multiplier for base price
  tax_rate?: number;
  local_notes?: string;
}

export function formatPrice(amount: number, currency: string, region: string): string {
  const formatter = new Intl.NumberFormat(getLocaleForRegion(region), {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
}
```

### Price Update Workflow

1. **Supplier Updates**
    - Simple form interface
    - Preview before publishing
    - Batch update for multiple packages
2. **Automatic Adjustments**
    - Inflation adjustments (annual)
    - Seasonal pricing updates
    - Peak/off-peak modifiers
3. **Competitor Analysis**
    - Track average pricing in category/region
    - Alert suppliers to significant differences
    - Suggest competitive positioning

### Analytics & Optimization

```
interface PricingAnalytics {
  view_count: number;
  inquiry_conversion_rate: number;
  price_point_performance: PricePointData[];
  competitor_comparison: CompetitorData;
}

// Track which pricing displays perform best
export async function trackPricingPerformance(supplierId: string, displayType: string) {
  await analytics.track('pricing_viewed', {
    supplier_id: supplierId,
    display_type: displayType,
    timestamp: new Date(),
    user_location: await getUserLocation()
  });
}
```

### Database Schema

```
CREATE TABLE supplier_pricing (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  display_type VARCHAR(50) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  pricing_data JSONB NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_pricing_supplier 
ON supplier_pricing(supplier_id);

CREATE INDEX idx_supplier_pricing_visible 
ON supplier_pricing(is_visible) WHERE is_visible = true;
```