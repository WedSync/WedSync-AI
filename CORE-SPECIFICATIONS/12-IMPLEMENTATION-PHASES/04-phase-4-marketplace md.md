# 04-phase-4-marketplace.md

## What to Build

Template marketplace system where suppliers sell their proven forms, email sequences, and customer journeys to other suppliers. This creates additional revenue streams and network effects.

## Month 4: Marketplace Infrastructure

### Technical Requirements

```
interface MarketplaceSystem {
  templateTypes: [
    'forms',
    'email_sequences',
    'customer_journeys',
    'bundle_packages'
  ]
  commerce: {
    payment: 'stripe_connect'
    commission: 30 // Platform takes 30%
    payout: 'monthly'
  }
  discovery: {
    search: 'vector_similarity'
    filters: ['vendor_type', 'price', 'rating']
    recommendations: 'ai_powered'
  }
}
```

### Database Schema

```
CREATE TABLE marketplace_templates (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES suppliers(id),
  type TEXT NOT NULL, -- 'form', 'journey', 'email_sequence'
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  preview_data JSONB,
  full_data JSONB, -- Encrypted until purchase
  category TEXT,
  vendor_types TEXT[],
  status TEXT DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_purchases (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES marketplace_templates(id),
  buyer_id UUID REFERENCES suppliers(id),
  price_paid DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_reviews (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES marketplace_templates(id),
  reviewer_id UUID REFERENCES suppliers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  verified_purchase BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stripe Connect Integration

```
// Creator onboarding for payouts
const onboardCreator = async (supplierId: string) => {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    capabilities: {
      transfers: { requested: true }
    },
    business_type: 'individual'
  })
  
  // Save Stripe account ID
  await supabase
    .from('supplier_stripe_accounts')
    .insert({
      supplier_id: supplierId,
      stripe_account_id: [account.id](http://account.id),
      onboarding_complete: false
    })
  
  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: [account.id](http://account.id),
    refresh_url: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_URL}/marketplace/onboarding`,
    return_url: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_URL}/marketplace/success`,
    type: 'account_onboarding'
  })
  
  return accountLink.url
}

// Process template purchase
const purchaseTemplate = async (
  templateId: string, 
  buyerId: string
) => {
  const template = await getTemplate(templateId)
  const creator = await getCreatorStripeAccount(template.creator_id)
  
  // Create payment intent with application fee
  const paymentIntent = await stripe.paymentIntents.create({
    amount: template.price * 100, // Convert to cents
    currency: 'usd',
    application_fee_amount: template.price * 30, // 30% commission
    transfer_data: {
      destination: creator.stripe_account_id
    }
  })
  
  return paymentIntent
}
```

## Month 5: Template Creation Tools

### Template Builder Studio

```
// Template packaging interface
const TemplateCreator = () => {
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    type: 'form',
    price: 0,
    preview: null,
    content: null
  })
  
  const packageForm = async (formId: string) => {
    const form = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single()
    
    // Remove sensitive data
    const sanitized = {
      ...form,
      supplier_id: undefined,
      created_at: undefined
    }
    
    return sanitized
  }
  
  const validateTemplate = () => {
    const rules = {
      minFields: 5,
      hasDescription: true,
      hasPreview: true,
      priceRange: { min: 19, max: 499 }
    }
    
    // Validation logic
    return validateAgainstRules(template, rules)
  }
}
```

### Quality Control System

```
interface QualityControl {
  autoChecks: [
    'no_personal_data',
    'complete_documentation',
    'working_logic',
    'appropriate_pricing'
  ]
  manualReview: {
    required: true
    reviewers: 'verified_creators'
    criteria: ['originality', 'value', 'completeness']
  }
  metrics: {
    minUsageBeforeSale: 10 // Must use with 10 real clients
    minSuccessRate: 80 // 80% completion rate
  }
}
```

### Template Import System

```
// One-click template installation
const installTemplate = async (
  templateId: string, 
  buyerId: string
) => {
  // Verify purchase
  const purchase = await verifyPurchase(templateId, buyerId)
  if (!purchase) throw new Error('Invalid purchase')
  
  // Get decrypted template data
  const template = await getTemplateData(templateId)
  
  switch(template.type) {
    case 'form':
      return importFormTemplate(template, buyerId)
    case 'journey':
      return importJourneyTemplate(template, buyerId)
    case 'email_sequence':
      return importEmailSequence(template, buyerId)
  }
}

const importFormTemplate = async (template: any, supplierId: string) => {
  // Clone form structure
  const newForm = await supabase
    .from('forms')
    .insert({
      supplier_id: supplierId,
      name: `${[template.name](http://template.name)} (Template)`,
      schema: template.schema,
      settings: template.settings
    })
    .select()
    .single()
  
  // Clone fields
  const fields = [template.fields.map](http://template.fields.map)(field => ({
    ...field,
    form_id: [newForm.id](http://newForm.id)
  }))
  
  await supabase.from('form_fields').insert(fields)
  
  return newForm
}
```

## Month 6: Discovery & Analytics

### Search Implementation

```
// Vector similarity search using pgvector
const searchTemplates = async (query: string) => {
  // Generate embedding for search query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  })
  
  // Search using pgvector
  const results = await supabase.rpc('search_templates', {
    query_embedding: [embedding.data](http://embedding.data)[0].embedding,
    match_threshold: 0.7,
    match_count: 20
  })
  
  return results
}

// SQL function for vector search
CREATE OR REPLACE FUNCTION search_templates(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    [mt.id](http://mt.id),
    [mt.name](http://mt.name),
    mt.description,
    1 - (mt.embedding <=> query_embedding) as similarity
  FROM marketplace_templates mt
  WHERE 1 - (mt.embedding <=> query_embedding) > match_threshold
  ORDER BY mt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Creator Analytics Dashboard

```
interface CreatorAnalytics {
  revenue: {
    total: number
    monthly: number[]
    byTemplate: Map<string, number>
  }
  performance: {
    views: number
    conversions: number
    rating: number
    reviews: Review[]
  }
  insights: {
    topSearchTerms: string[]
    buyerDemographics: Demographics
    competitorPricing: PriceAnalysis
  }
}

// Analytics component
const CreatorDashboard = ({ creatorId }) => {
  const stats = useCreatorStats(creatorId)
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        title="Total Revenue"
        value={`$${[stats.revenue.total](http://stats.revenue.total)}`}
        change={stats.revenue.changePercent}
      />
      <StatCard
        title="Templates Sold"
        value={stats.totalSales}
        subtitle={`${stats.conversionRate}% conversion`}
      />
      <StatCard
        title="Average Rating"
        value={stats.averageRating}
        subtitle={`${stats.reviewCount} reviews`}
      />
    </div>
  )
}
```

## API Endpoints

```
const marketplaceEndpoints = [
  // Browse & Search
  'GET /api/marketplace/templates',
  'GET /api/marketplace/templates/:id',
  'POST /api/marketplace/search',
  'GET /api/marketplace/recommendations',
  
  // Creator
  'POST /api/marketplace/templates',
  'PUT /api/marketplace/templates/:id',
  'DELETE /api/marketplace/templates/:id',
  'GET /api/marketplace/creator/analytics',
  'POST /api/marketplace/creator/onboard',
  
  // Purchasing
  'POST /api/marketplace/purchase',
  'GET /api/marketplace/purchases',
  'POST /api/marketplace/install/:templateId',
  
  // Reviews
  'POST /api/marketplace/reviews',
  'GET /api/marketplace/templates/:id/reviews'
]
```

## Critical Implementation Notes

1. **Template data must be sanitized** - Remove all PII and supplier-specific data
2. **Implement version control** - Templates can be updated, buyers get updates
3. **Escrow payments for 7 days** - Allow refund period
4. **Cache popular templates** - Reduce database load
5. **Moderate all content** - Automated + manual review before publishing

## Success Criteria

1. 100+ templates listed within first month
2. 20% of Professional tier users make a purchase
3. Top creators earn $500+/month
4. Average template rating >4.0 stars
5. <2% refund rate

## Revenue Projections

- Average template price: $75
- Expected monthly transactions: 500
- Gross merchandise value: $37,500/month
- Platform revenue (30%): $11,250/month
- Creator earnings (70%): $26,250/month