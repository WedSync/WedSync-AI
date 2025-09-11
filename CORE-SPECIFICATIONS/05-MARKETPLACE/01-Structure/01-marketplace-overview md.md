# 01-marketplace-overview.md

## What to Build

A template marketplace where suppliers sell proven form templates, email sequences, and customer journey workflows to other suppliers. Built directly into WedSync, not a separate platform.

## Key Technical Requirements

### Database Schema

```
-- Core marketplace tables
CREATE TABLE marketplace_templates (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  template_type ENUM('form', 'email', 'journey', 'bundle'),
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  category VARCHAR(50), -- photography, catering, venue, etc
  preview_images JSONB, -- array of S3 URLs
  content_snapshot JSONB, -- preview data structure
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  status ENUM('draft', 'pending_review', 'active', 'suspended'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_purchases (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES marketplace_templates(id),
  buyer_id UUID REFERENCES suppliers(id),
  price_paid_cents INTEGER,
  commission_cents INTEGER, -- 30% platform fee
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  installed BOOLEAN DEFAULT false
);
```

### API Endpoints

```
// Template browsing
GET /api/marketplace/templates
  ?category=photography
  &sort=popular|newest|price
  &tier=starter|professional|scale

// Template details
GET /api/marketplace/templates/:id

// Purchase flow
POST /api/marketplace/purchase
  Body: { template_id, payment_method_id }

// Install template
POST /api/marketplace/install/:purchase_id
```

### Frontend Components

```
// Marketplace landing page component
const MarketplaceLanding = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CategoryFilter />
      <TemplateGrid />
      <CreatorLeaderboard />
    </div>
  );
};

// Template card with preview
const TemplateCard = ({ template }) => {
  const canPurchase = useSupplierTier() >= template.minimum_tier;
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <ImageCarousel images={template.preview_images} />
      <CardBody>
        <h3>{template.title}</h3>
        <p className="text-sm text-gray-600">
          by {[template.creator.name](http://template.creator.name)} • {template.install_count} installs
        </p>
        <Price amount={template.price_cents} />
        {!canPurchase && (
          <Badge>Requires {template.minimum_tier} tier</Badge>
        )}
      </CardBody>
    </Card>
  );
};
```

## Critical Implementation Notes

### Tier Restrictions

- Free tier: Browse only, cannot purchase
- Starter: Access to basic templates only
- Professional+: Full marketplace access + can sell
- Use RLS policies to enforce tier access

### Content Protection

- Templates stored encrypted in database
- Preview data limited to structure, not actual content
- One-click install copies template to buyer's account
- No ability to export/share purchased templates

### Commission Handling

- Stripe Connect for creator payouts
- 30% commission auto-calculated on purchase
- Monthly payout batch processing
- Tax forms (1099) for US creators earning >$600/year

### Quality Control

- Manual review for first-time creators
- Automated checks for inappropriate content
- Minimum 10 real uses before template can be listed
- Report button for copyright/quality issues

## Database/API Structure

### Search & Discovery

- Postgres full-text search on title/description
- Category filters using indexed columns
- Popularity algorithm: installs  *rating*  recency_factor
- Personalized recommendations based on supplier type

### Installation Process

1. Purchase creates transaction record
2. Payment processes through Stripe
3. Install button triggers deep clone of template
4. All IDs regenerated to prevent conflicts
5. Template appears in buyer's account immediately

### Analytics Tracking

- Track views, clicks, conversion rates per template
- Creator dashboard shows earnings, views, funnel metrics
- Platform admin sees marketplace health metrics