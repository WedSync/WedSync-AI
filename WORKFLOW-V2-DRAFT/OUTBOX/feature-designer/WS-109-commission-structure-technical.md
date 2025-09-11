# WS-109: Commission Structure - Technical Specification

## Overview
A tiered commission system that rewards successful creators with progressively better rates, incentivizing quality template creation and platform growth.

## User Stories with Real Wedding Context

### Story 1: New Creator Understanding Commission
**As Jessica (New Wedding Planner)** joining the marketplace  
**I want** clear visibility into commission rates and tier progression  
**So that** I understand how much I'll earn and what goals to work towards

**Wedding Business Context:**
- Jessica lists her first "Wedding Timeline Template" for £29
- Commission calculator shows: £29 gross → £25.13 after Stripe → £17.59 creator earnings (30% base rate)
- Dashboard displays: "Sell 10 templates to unlock 25% Verified rate" 
- Shows potential: Next template at Verified tier would earn £18.85 instead

### Story 2: Creator Tier Progression Motivation
**As David (Wedding Photographer)** with growing template sales  
**I want** to see real-time progress toward better commission tiers  
**So that** I stay motivated to create quality templates and hit milestones

**Wedding Business Context:**
- David has 47 template sales totaling £3,847 revenue
- Approaching "Performer" tier (50 sales OR £5,000 revenue)
- Progress widget shows: "3 more sales OR £1,153 more revenue to unlock 20% commission rate"
- Each future sale will earn 10% more when tier unlocks

### Story 3: Elite Creator Business Planning
**As Sarah (Wedding Venue Consultant)** with successful template business  
**I want** predictable commission rates and exclusive benefits  
**So that** I can build reliable income streams and plan business growth

**Wedding Business Context:**
- Sarah achieved Elite tier: 127 sales, £18,943 total revenue
- Earns 85% of each sale (15% commission vs 30% for new creators)
- £89 venue checklist template → £75.65 creator earnings vs £62.30 at base tier
- Elite perks: Dedicated account manager, co-marketing opportunities, API access

## Database Schema Design

```sql
-- Creator commission tier tracking and statistics
CREATE TABLE marketplace_creator_commission_tiers (
  creator_id UUID PRIMARY KEY REFERENCES suppliers(id),
  
  -- Current tier information
  current_tier TEXT DEFAULT 'base' CHECK (current_tier IN ('base', 'verified', 'performer', 'elite')),
  tier_achieved_date TIMESTAMPTZ DEFAULT NOW(),
  previous_tier TEXT,
  tier_upgrade_history JSONB DEFAULT '[]'::jsonb,
  
  -- Performance metrics for tier calculation
  total_marketplace_sales INTEGER DEFAULT 0,
  total_marketplace_revenue_cents BIGINT DEFAULT 0,
  total_creator_earnings_cents BIGINT DEFAULT 0,
  
  -- Quality metrics
  average_template_rating DECIMAL(3,2) DEFAULT 0,
  total_template_ratings INTEGER DEFAULT 0,
  refund_rate DECIMAL(5,4) DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  
  -- Time-based metrics
  first_sale_date TIMESTAMPTZ,
  last_sale_date TIMESTAMPTZ,
  months_active INTEGER DEFAULT 0,
  
  -- Special status tracking
  featured_creator BOOLEAN DEFAULT false,
  verified_creator BOOLEAN DEFAULT false,
  high_quality_creator BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed commission calculation records
CREATE TABLE marketplace_commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_purchase_id UUID REFERENCES template_purchases(id) NOT NULL,
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  template_id UUID REFERENCES marketplace_templates(id) NOT NULL,
  
  -- Sale details
  gross_sale_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  sale_timestamp TIMESTAMPTZ NOT NULL,
  
  -- Commission calculation
  creator_tier_at_sale TEXT NOT NULL,
  commission_rate DECIMAL(4,3) NOT NULL, -- e.g., 0.300 for 30%
  commission_amount_cents INTEGER NOT NULL,
  creator_earnings_cents INTEGER NOT NULL,
  
  -- Additional context
  promotional_rate_applied BOOLEAN DEFAULT false,
  promotional_code TEXT,
  bundle_sale BOOLEAN DEFAULT false,
  referral_bonus_applied BOOLEAN DEFAULT false,
  
  -- Platform fees (from revenue model)
  stripe_fee_cents INTEGER NOT NULL,
  vat_amount_cents INTEGER DEFAULT 0,
  net_sale_amount_cents INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission tier progression rules and requirements
CREATE TABLE marketplace_tier_requirements (
  tier_name TEXT PRIMARY KEY,
  minimum_sales INTEGER NOT NULL,
  minimum_revenue_cents BIGINT NOT NULL,
  maximum_refund_rate DECIMAL(5,4) DEFAULT 1.0000,
  minimum_rating DECIMAL(3,2) DEFAULT 0,
  minimum_months_active INTEGER DEFAULT 0,
  
  -- Commission rate for this tier
  commission_rate DECIMAL(4,3) NOT NULL,
  
  -- Tier benefits (JSON array of benefit descriptions)
  tier_benefits JSONB DEFAULT '[]'::jsonb,
  
  -- Special requirements
  requires_verification BOOLEAN DEFAULT false,
  requires_manual_review BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotional commission rates and special events
CREATE TABLE marketplace_commission_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_name TEXT NOT NULL,
  promotion_code TEXT UNIQUE,
  
  -- Date range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Commission adjustment
  commission_rate_override DECIMAL(4,3),
  commission_discount_percent DECIMAL(5,2), -- e.g., 20.00 for 20% off commission
  
  -- Eligibility criteria
  eligible_tiers TEXT[] DEFAULT ARRAY['base', 'verified', 'performer', 'elite'],
  eligible_creator_ids UUID[],
  eligible_template_categories TEXT[],
  
  -- Usage limits
  max_uses_per_creator INTEGER,
  max_total_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission adjustment history for auditing
CREATE TABLE marketplace_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_record_id UUID REFERENCES marketplace_commission_records(id),
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  -- Adjustment details
  adjustment_type TEXT NOT NULL, -- 'refund', 'chargeback', 'bonus', 'correction'
  original_commission_cents INTEGER NOT NULL,
  adjusted_commission_cents INTEGER NOT NULL,
  adjustment_amount_cents INTEGER NOT NULL, -- positive or negative
  
  -- Reason and context
  adjustment_reason TEXT NOT NULL,
  admin_user_id UUID,
  automated_adjustment BOOLEAN DEFAULT false,
  
  -- Related transaction references
  stripe_refund_id TEXT,
  stripe_chargeback_id TEXT,
  support_ticket_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_creator_tiers_tier_sales ON marketplace_creator_commission_tiers(current_tier, total_marketplace_sales);
CREATE INDEX idx_commission_records_creator_date ON marketplace_commission_records(creator_id, created_at);
CREATE INDEX idx_commission_records_tier_rate ON marketplace_commission_records(creator_tier_at_sale, commission_rate);
CREATE INDEX idx_tier_requirements_sales_revenue ON marketplace_tier_requirements(minimum_sales, minimum_revenue_cents);

-- Database functions for tier calculation
CREATE OR REPLACE FUNCTION calculate_creator_tier(p_creator_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_creator_stats RECORD;
  v_tier_name TEXT := 'base';
BEGIN
  -- Get current creator statistics
  SELECT 
    total_marketplace_sales,
    total_marketplace_revenue_cents,
    average_template_rating,
    refund_rate,
    months_active
  INTO v_creator_stats
  FROM marketplace_creator_commission_tiers
  WHERE creator_id = p_creator_id;
  
  -- Apply tier logic (check highest tier first)
  IF v_creator_stats.total_marketplace_sales >= 100 OR 
     v_creator_stats.total_marketplace_revenue_cents >= 1500000 THEN
    v_tier_name := 'elite';
  ELSIF v_creator_stats.total_marketplace_sales >= 50 OR 
        v_creator_stats.total_marketplace_revenue_cents >= 500000 THEN
    v_tier_name := 'performer';
  ELSIF v_creator_stats.total_marketplace_sales >= 10 AND
        v_creator_stats.average_template_rating >= 4.0 THEN
    v_tier_name := 'verified';
  END IF;
  
  RETURN v_tier_name;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update creator stats after each sale
CREATE OR REPLACE FUNCTION update_creator_commission_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tier TEXT;
  v_old_tier TEXT;
BEGIN
  -- Update creator statistics
  UPDATE marketplace_creator_commission_tiers
  SET 
    total_marketplace_sales = total_marketplace_sales + 1,
    total_marketplace_revenue_cents = total_marketplace_revenue_cents + NEW.gross_sale_amount_cents,
    total_creator_earnings_cents = total_creator_earnings_cents + NEW.creator_earnings_cents,
    last_sale_date = NEW.sale_timestamp,
    updated_at = NOW()
  WHERE creator_id = NEW.creator_id;
  
  -- Check for tier upgrade
  SELECT current_tier INTO v_old_tier 
  FROM marketplace_creator_commission_tiers 
  WHERE creator_id = NEW.creator_id;
  
  v_new_tier := calculate_creator_tier(NEW.creator_id);
  
  -- Update tier if changed
  IF v_new_tier != v_old_tier THEN
    UPDATE marketplace_creator_commission_tiers
    SET 
      previous_tier = current_tier,
      current_tier = v_new_tier,
      tier_achieved_date = NOW(),
      tier_upgrade_history = tier_upgrade_history || 
        json_build_object(
          'from_tier', v_old_tier,
          'to_tier', v_new_tier,
          'achieved_at', NOW(),
          'sales_at_upgrade', total_marketplace_sales + 1,
          'revenue_at_upgrade', total_marketplace_revenue_cents + NEW.gross_sale_amount_cents
        )::jsonb
    WHERE creator_id = NEW.creator_id;
    
    -- Trigger tier upgrade notification (handled by application layer)
    INSERT INTO system_notifications (creator_id, type, title, message)
    VALUES (
      NEW.creator_id,
      'tier_upgrade',
      'Congratulations! Tier Upgraded',
      'You''ve been upgraded to ' || v_new_tier || ' tier with better commission rates!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_commission_stats
  AFTER INSERT ON marketplace_commission_records
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_commission_stats();
```

## API Endpoint Design

```typescript
// Commission calculation and tier management interfaces
interface CreatorTierInfo {
  creator_id: string;
  current_tier: 'base' | 'verified' | 'performer' | 'elite';
  commission_rate: number;
  tier_achieved_date: string;
  tier_benefits: string[];
  
  // Progress to next tier
  next_tier?: {
    tier_name: string;
    commission_rate: number;
    requirements: {
      sales_needed: number;
      revenue_needed: number;
      current_sales: number;
      current_revenue: number;
      progress_percentage: number;
    };
  };
  
  // Performance metrics
  stats: {
    total_sales: number;
    total_revenue: number;
    total_earnings: number;
    average_rating: number;
    refund_rate: number;
    months_active: number;
  };
}

interface CommissionCalculation {
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  creator_earnings: number;
  creator_tier: string;
  
  // Breakdown details
  breakdown: {
    stripe_fee: number;
    vat_amount: number;
    net_amount: number;
    platform_commission: number;
    creator_payout: number;
  };
  
  // Tier comparison
  tier_comparison?: {
    current_tier_earnings: number;
    next_tier_earnings: number;
    potential_increase: number;
  };
}

interface TierProgressUpdate {
  creator_id: string;
  previous_tier: string;
  new_tier: string;
  tier_achieved_date: string;
  benefits_unlocked: string[];
  commission_rate_improvement: number;
}

// GET /api/marketplace/commission/tiers/:creatorId
interface GetCreatorTierResponse {
  success: boolean;
  tier_info: CreatorTierInfo;
  recent_tier_history: Array<{
    tier: string;
    achieved_date: string;
    sales_at_upgrade: number;
    revenue_at_upgrade: number;
  }>;
}

// POST /api/marketplace/commission/calculate
interface CalculateCommissionRequest {
  creator_id: string;
  sale_amount: number;
  template_id: string;
  promotional_code?: string;
  bundle_sale?: boolean;
}

interface CalculateCommissionResponse {
  success: boolean;
  calculation: CommissionCalculation;
  applicable_promotions?: Array<{
    promotion_name: string;
    discount_applied: number;
    savings_amount: number;
  }>;
}

// GET /api/marketplace/commission/tier-requirements
interface TierRequirementsResponse {
  success: boolean;
  tiers: Array<{
    tier_name: string;
    commission_rate: number;
    requirements: {
      minimum_sales: number;
      minimum_revenue: number;
      minimum_rating: number;
      minimum_months_active: number;
    };
    benefits: string[];
  }>;
}

// POST /api/marketplace/commission/record-sale
interface RecordCommissionRequest {
  template_purchase_id: string;
  creator_id: string;
  template_id: string;
  gross_amount: number;
  commission_calculation: CommissionCalculation;
}

interface RecordCommissionResponse {
  success: boolean;
  commission_record_id: string;
  tier_update?: TierProgressUpdate;
  next_milestone?: {
    tier: string;
    sales_needed: number;
    revenue_needed: number;
  };
}
```

## React Components Architecture

```typescript
// Creator Tier Progress Component
interface CreatorTierProgressProps {
  creatorId: string;
  showDetailed?: boolean;
}

export function CreatorTierProgress({ creatorId, showDetailed = false }: CreatorTierProgressProps) {
  const [tierInfo, setTierInfo] = useState<CreatorTierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTierInfo = async () => {
    try {
      const response = await fetch(`/api/marketplace/commission/tiers/${creatorId}`);
      const data = await response.json();
      setTierInfo(data.tier_info);
    } catch (error) {
      console.error('Failed to fetch tier info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTierInfo();
  }, [creatorId]);

  if (loading) return <ProgressSkeleton />;
  if (!tierInfo) return <ErrorState message="Unable to load tier information" />;

  const getTierColor = (tier: string) => {
    const colors = {
      base: 'bg-gray-500',
      verified: 'bg-blue-500',
      performer: 'bg-purple-500',
      elite: 'bg-gold-500'
    };
    return colors[tier] || colors.base;
  };

  const calculateProgress = () => {
    if (!tierInfo.next_tier) return 100;
    
    const { current_sales, sales_needed, current_revenue, revenue_needed } = tierInfo.next_tier.requirements;
    const salesProgress = (current_sales / (current_sales + sales_needed)) * 100;
    const revenueProgress = (current_revenue / (current_revenue + revenue_needed)) * 100;
    
    return Math.max(salesProgress, revenueProgress);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge className={`${getTierColor(tierInfo.current_tier)} text-white px-3 py-1`}>
              {tierInfo.current_tier.toUpperCase()} CREATOR
            </Badge>
            <div className="text-sm text-gray-600">
              Commission Rate: {((1 - tierInfo.commission_rate) * 100).toFixed(0)}% earnings
            </div>
          </div>
          {tierInfo.current_tier !== 'elite' && (
            <div className="text-xs text-gray-500">
              Next: {tierInfo.next_tier?.tier_name.toUpperCase()}
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Progress to Next Tier */}
        {tierInfo.next_tier && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to {tierInfo.next_tier.tier_name} tier</span>
              <span>{calculateProgress().toFixed(0)}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <div className="text-gray-600">Sales Progress</div>
                <div className="font-semibold">
                  {tierInfo.stats.total_sales} / {tierInfo.stats.total_sales + tierInfo.next_tier.requirements.sales_needed}
                </div>
                <div className="text-xs text-gray-500">
                  {tierInfo.next_tier.requirements.sales_needed} more needed
                </div>
              </div>
              <div>
                <div className="text-gray-600">Revenue Progress</div>
                <div className="font-semibold">
                  {formatCurrency(tierInfo.stats.total_revenue)} / {formatCurrency(tierInfo.stats.total_revenue + tierInfo.next_tier.requirements.revenue_needed)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(tierInfo.next_tier.requirements.revenue_needed)} more needed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Tier Benefits */}
        <div>
          <h4 className="font-semibold mb-2">Your {tierInfo.current_tier} Benefits</h4>
          <ul className="text-sm space-y-1">
            {tierInfo.tier_benefits.map((benefit, index) => (
              <li key={index} className="flex items-center space-x-2">
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detailed Stats */}
        {showDetailed && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(tierInfo.stats.total_earnings)}
              </div>
              <div className="text-xs text-gray-600">Total Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {tierInfo.stats.average_rating?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {((1 - tierInfo.stats.refund_rate) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Success Rate</div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Commission Calculator Component
interface CommissionCalculatorProps {
  creatorId: string;
  onCalculationComplete?: (calculation: CommissionCalculation) => void;
}

export function CommissionCalculator({ creatorId, onCalculationComplete }: CommissionCalculatorProps) {
  const [saleAmount, setSaleAmount] = useState<number>(0);
  const [calculation, setCalculation] = useState<CommissionCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [promotionalCode, setPromotionalCode] = useState<string>('');

  const calculateCommission = async () => {
    if (saleAmount <= 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/marketplace/commission/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          sale_amount: saleAmount * 100, // Convert to pence
          template_id: 'preview',
          promotional_code: promotionalCode || undefined
        })
      });
      
      const data = await response.json();
      setCalculation(data.calculation);
      onCalculationComplete?.(data.calculation);
    } catch (error) {
      console.error('Failed to calculate commission:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(calculateCommission, 500);
    return () => clearTimeout(debounceTimer);
  }, [saleAmount, promotionalCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Calculator</CardTitle>
        <CardDescription>
          See how much you'll earn from template sales
        </CardDescription>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Template Price (£)</label>
            <input
              type="number"
              value={saleAmount || ''}
              onChange={(e) => setSaleAmount(Number(e.target.value))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Promo Code (Optional)</label>
            <input
              type="text"
              value={promotionalCode}
              onChange={(e) => setPromotionalCode(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="LAUNCH10"
            />
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
        ) : calculation ? (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gross Sale Amount:</span>
                <span className="font-semibold">{formatCurrency(calculation.gross_amount)}</span>
              </div>
              
              <div className="flex justify-between items-center text-red-600">
                <span className="text-sm">Payment Processing Fees:</span>
                <span>-{formatCurrency(calculation.breakdown.stripe_fee)}</span>
              </div>
              
              {calculation.breakdown.vat_amount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">VAT (20%):</span>
                  <span>-{formatCurrency(calculation.breakdown.vat_amount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-orange-600">
                <span className="text-sm">Platform Commission ({(calculation.commission_rate * 100).toFixed(0)}%):</span>
                <span>-{formatCurrency(calculation.commission_amount)}</span>
              </div>
              
              <hr className="border-gray-300" />
              
              <div className="flex justify-between items-center text-green-600 font-bold text-lg">
                <span>Your Earnings:</span>
                <span>{formatCurrency(calculation.creator_earnings)}</span>
              </div>
              
              <div className="text-xs text-gray-600 text-center">
                You keep {((calculation.creator_earnings / calculation.gross_amount) * 100).toFixed(1)}% of the gross sale
              </div>
              
              {calculation.tier_comparison && (
                <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-xs font-medium text-yellow-800 mb-1">
                    Upgrade to next tier and earn:
                  </div>
                  <div className="text-sm font-bold text-yellow-700">
                    +{formatCurrency(calculation.tier_comparison.potential_increase)} more per sale
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Enter a template price to see commission breakdown
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Tier Benefits Comparison Component
export function TierBenefitsComparison() {
  const [tierRequirements, setTierRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTierRequirements = async () => {
      try {
        const response = await fetch('/api/marketplace/commission/tier-requirements');
        const data = await response.json();
        setTierRequirements(data.tiers);
      } catch (error) {
        console.error('Failed to fetch tier requirements:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTierRequirements();
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tierRequirements.map((tier) => (
        <Card key={tier.tier_name} className={`relative ${tier.tier_name === 'elite' ? 'ring-2 ring-gold-400' : ''}`}>
          {tier.tier_name === 'performer' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-500 text-white">Most Popular</Badge>
            </div>
          )}
          
          <CardHeader className="text-center">
            <CardTitle className="capitalize">{tier.tier_name}</CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {((1 - tier.commission_rate) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">earnings rate</div>
          </CardHeader>
          
          <CardBody>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Requirements:</div>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• {tier.requirements.minimum_sales} sales</li>
                  <li>• {formatCurrency(tier.requirements.minimum_revenue)} revenue</li>
                  {tier.requirements.minimum_rating > 0 && (
                    <li>• {tier.requirements.minimum_rating}+ rating</li>
                  )}
                </ul>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700">Benefits:</div>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  {tier.benefits.slice(0, 3).map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                  {tier.benefits.length > 3 && (
                    <li className="text-blue-600 text-xs">
                      +{tier.benefits.length - 3} more benefits
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

## Core Services Implementation

```typescript
// Commission calculation service
export class CommissionCalculationService {
  private static readonly TIER_RATES = {
    base: 0.30,
    verified: 0.25,
    performer: 0.20,
    elite: 0.15
  };

  async calculateCommission(params: {
    creatorId: string;
    saleAmount: number;
    templateId: string;
    promotionalCode?: string;
  }): Promise<CommissionCalculation> {
    const { creatorId, saleAmount, templateId, promotionalCode } = params;

    // Get creator tier information
    const creatorTier = await this.getCreatorTier(creatorId);
    
    // Calculate base commission rate
    let commissionRate = CommissionCalculationService.TIER_RATES[creatorTier.current_tier];
    
    // Apply promotional adjustments
    if (promotionalCode) {
      const promotion = await this.getActivePromotion(promotionalCode, creatorId);
      if (promotion) {
        commissionRate = promotion.commission_rate_override || 
                       (commissionRate * (1 - promotion.commission_discount_percent / 100));
      }
    }

    // Calculate revenue breakdown (integrates with WS-108)
    const revenueBreakdown = await this.revenueCalculationService.calculateRevenue({
      saleAmount,
      creatorId,
      templateId
    });

    // Calculate commission amounts
    const commissionAmount = Math.round(revenueBreakdown.net_after_fees * commissionRate);
    const creatorEarnings = revenueBreakdown.net_after_fees - commissionAmount;

    // Get tier comparison for motivation
    const tierComparison = await this.calculateTierComparison(creatorTier, saleAmount);

    return {
      gross_amount: saleAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      creator_earnings: creatorEarnings,
      creator_tier: creatorTier.current_tier,
      breakdown: {
        stripe_fee: revenueBreakdown.stripe_fee,
        vat_amount: revenueBreakdown.vat_amount,
        net_amount: revenueBreakdown.net_after_fees,
        platform_commission: commissionAmount,
        creator_payout: creatorEarnings
      },
      tier_comparison: tierComparison
    };
  }

  async recordCommissionSale(params: {
    templatePurchaseId: string;
    creatorId: string;
    templateId: string;
    grossAmount: number;
    calculation: CommissionCalculation;
  }): Promise<{ commissionRecordId: string; tierUpdate?: TierProgressUpdate }> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Record commission in ledger
    const { data: commissionRecord, error } = await supabase
      .from('marketplace_commission_records')
      .insert({
        template_purchase_id: params.templatePurchaseId,
        creator_id: params.creatorId,
        template_id: params.templateId,
        gross_sale_amount_cents: params.grossAmount,
        creator_tier_at_sale: params.calculation.creator_tier,
        commission_rate: params.calculation.commission_rate,
        commission_amount_cents: params.calculation.commission_amount,
        creator_earnings_cents: params.calculation.creator_earnings,
        stripe_fee_cents: params.calculation.breakdown.stripe_fee,
        vat_amount_cents: params.calculation.breakdown.vat_amount,
        net_sale_amount_cents: params.calculation.breakdown.net_amount,
        sale_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Check for tier upgrades (handled by database trigger)
    const tierUpdate = await this.checkForTierUpgrade(params.creatorId);

    return {
      commissionRecordId: commissionRecord.id,
      tierUpdate
    };
  }

  private async calculateTierComparison(
    creatorTier: CreatorTierInfo,
    saleAmount: number
  ): Promise<any> {
    if (creatorTier.current_tier === 'elite') return null;

    const nextTierRates = {
      base: 0.25,     // verified
      verified: 0.20, // performer
      performer: 0.15 // elite
    };

    const currentTierRate = CommissionCalculationService.TIER_RATES[creatorTier.current_tier];
    const nextTierRate = nextTierRates[creatorTier.current_tier];

    if (!nextTierRate) return null;

    // Simplified calculation for comparison
    const currentTierEarnings = Math.round(saleAmount * 0.9 * (1 - currentTierRate)); // Assume 90% after fees
    const nextTierEarnings = Math.round(saleAmount * 0.9 * (1 - nextTierRate));

    return {
      current_tier_earnings: currentTierEarnings,
      next_tier_earnings: nextTierEarnings,
      potential_increase: nextTierEarnings - currentTierEarnings
    };
  }

  async getCreatorTier(creatorId: string): Promise<CreatorTierInfo> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get current tier info
    const { data: tierData, error } = await supabase
      .from('marketplace_creator_commission_tiers')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no record exists, create base tier
    if (!tierData) {
      const { data: newTier } = await supabase
        .from('marketplace_creator_commission_tiers')
        .insert({
          creator_id: creatorId,
          current_tier: 'base'
        })
        .select()
        .single();
      
      return this.buildTierInfo(newTier);
    }

    return this.buildTierInfo(tierData);
  }

  private async buildTierInfo(tierData: any): Promise<CreatorTierInfo> {
    // Get tier requirements for next tier calculation
    const nextTierInfo = await this.getNextTierRequirements(tierData.current_tier, tierData);

    return {
      creator_id: tierData.creator_id,
      current_tier: tierData.current_tier,
      commission_rate: CommissionCalculationService.TIER_RATES[tierData.current_tier],
      tier_achieved_date: tierData.tier_achieved_date,
      tier_benefits: await this.getTierBenefits(tierData.current_tier),
      next_tier: nextTierInfo,
      stats: {
        total_sales: tierData.total_marketplace_sales,
        total_revenue: tierData.total_marketplace_revenue_cents,
        total_earnings: tierData.total_creator_earnings_cents,
        average_rating: tierData.average_template_rating,
        refund_rate: tierData.refund_rate,
        months_active: tierData.months_active
      }
    };
  }
}

// Tier progression service
export class TierProgressionService {
  async checkTierUpgrade(creatorId: string): Promise<TierProgressUpdate | null> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Use database function to calculate new tier
    const { data: newTier } = await supabase.rpc('calculate_creator_tier', {
      p_creator_id: creatorId
    });

    const currentTierInfo = await this.commissionService.getCreatorTier(creatorId);
    
    if (newTier !== currentTierInfo.current_tier) {
      // Tier upgrade detected
      const upgradeInfo: TierProgressUpdate = {
        creator_id: creatorId,
        previous_tier: currentTierInfo.current_tier,
        new_tier: newTier,
        tier_achieved_date: new Date().toISOString(),
        benefits_unlocked: await this.getTierBenefits(newTier),
        commission_rate_improvement: 
          CommissionCalculationService.TIER_RATES[currentTierInfo.current_tier] - 
          CommissionCalculationService.TIER_RATES[newTier]
      };

      // Send tier upgrade notification
      await this.notificationService.sendTierUpgradeNotification(upgradeInfo);

      return upgradeInfo;
    }

    return null;
  }

  private async getTierBenefits(tier: string): Promise<string[]> {
    const benefits = {
      base: [
        'Access to marketplace',
        'Standard commission rate',
        'Basic support'
      ],
      verified: [
        'Verified creator badge',
        'Priority support',
        'Monthly analytics report',
        '25% commission rate'
      ],
      performer: [
        'Featured creator spotlight',
        'Early access to features',
        'Custom storefront URL',
        '20% commission rate'
      ],
      elite: [
        'Dedicated account manager',
        'Co-marketing opportunities',
        'API access for automation',
        'Exclusive creator events',
        '15% commission rate'
      ]
    };

    return benefits[tier] || benefits.base;
  }
}
```

## Integration Points

### Integration with WS-108 (Revenue Model)
```typescript
// Commission service integrates with revenue calculation
export class IntegratedCommissionService {
  constructor(
    private revenueService: RevenueCalculationService,
    private commissionService: CommissionCalculationService
  ) {}

  async processTemplateSale(params: {
    templatePurchaseId: string;
    creatorId: string;
    templateId: string;
    saleAmount: number;
  }): Promise<SaleProcessingResult> {
    // Calculate revenue breakdown (WS-108)
    const revenueBreakdown = await this.revenueService.calculateRevenue({
      saleAmount: params.saleAmount,
      creatorId: params.creatorId,
      templateId: params.templateId
    });

    // Calculate commission structure (WS-109)
    const commissionCalculation = await this.commissionService.calculateCommission({
      creatorId: params.creatorId,
      saleAmount: params.saleAmount,
      templateId: params.templateId
    });

    // Record both revenue and commission
    await Promise.all([
      this.revenueService.recordRevenue(params.templatePurchaseId, revenueBreakdown, params.creatorId),
      this.commissionService.recordCommissionSale({
        templatePurchaseId: params.templatePurchaseId,
        creatorId: params.creatorId,
        templateId: params.templateId,
        grossAmount: params.saleAmount,
        calculation: commissionCalculation
      })
    ]);

    return {
      revenue_breakdown: revenueBreakdown,
      commission_calculation: commissionCalculation
    };
  }
}
```

### MCP Database Operations
```typescript
// Use PostgreSQL MCP for complex tier analytics
export async function getTierAnalytics(timeframe: string): Promise<TierAnalytics> {
  const query = `
    SELECT 
      ct.current_tier,
      COUNT(*) as creator_count,
      AVG(ct.total_marketplace_sales) as avg_sales,
      AVG(ct.total_marketplace_revenue_cents) as avg_revenue,
      COUNT(CASE WHEN ct.tier_achieved_date >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_upgrades
    FROM marketplace_creator_commission_tiers ct
    GROUP BY ct.current_tier
    ORDER BY 
      CASE ct.current_tier 
        WHEN 'elite' THEN 4
        WHEN 'performer' THEN 3  
        WHEN 'verified' THEN 2
        WHEN 'base' THEN 1
      END
  `;

  return await executePostgreSQLQuery(query);
}
```

## Test Requirements

### Unit Tests
```typescript
describe('CommissionCalculationService', () => {
  it('should apply correct commission rates by tier', async () => {
    const service = new CommissionCalculationService();
    
    // Mock different tier creators
    const baseCreator = { current_tier: 'base', total_sales: 5 };
    const verifiedCreator = { current_tier: 'verified', total_sales: 15 };
    
    const baseCommission = await service.calculateCommission({
      creatorId: 'base-creator',
      saleAmount: 5000,
      templateId: 'test'
    });
    
    const verifiedCommission = await service.calculateCommission({
      creatorId: 'verified-creator', 
      saleAmount: 5000,
      templateId: 'test'
    });
    
    expect(baseCommission.commission_rate).toBe(0.30);
    expect(verifiedCommission.commission_rate).toBe(0.25);
    expect(verifiedCommission.creator_earnings).toBeGreaterThan(baseCommission.creator_earnings);
  });

  it('should calculate tier progression correctly', async () => {
    const tierService = new TierProgressionService();
    
    // Mock creator at tier boundary
    const creatorStats = {
      total_sales: 10,
      total_revenue: 500000, // £5000
      average_rating: 4.2
    };
    
    const upgrade = await tierService.checkTierUpgrade('test-creator');
    expect(upgrade?.new_tier).toBe('verified');
  });
});
```

### Integration Tests
```typescript
describe('Commission and Revenue Integration', () => {
  it('should process complete sale with revenue and commission tracking', async () => {
    const integratedService = new IntegratedCommissionService(
      revenueService,
      commissionService
    );
    
    const result = await integratedService.processTemplateSale({
      templatePurchaseId: 'test-purchase',
      creatorId: 'test-creator',
      templateId: 'test-template',
      saleAmount: 8900 // £89
    });
    
    expect(result.revenue_breakdown).toBeDefined();
    expect(result.commission_calculation).toBeDefined();
    expect(result.commission_calculation.creator_earnings).toBeGreaterThan(0);
  });
});
```

## Acceptance Criteria

- [x] **Tier-Based Commission**: Automatic commission rate adjustment based on creator performance
- [x] **Real-Time Tier Tracking**: Live progress tracking toward next tier milestones
- [x] **Commission Transparency**: Clear breakdown of all fees and earnings calculations
- [x] **Tier Benefits System**: Progressive benefits unlocked at each tier level
- [x] **Promotional Commission**: Support for temporary commission rate adjustments
- [x] **Tier Upgrade Notifications**: Automatic notifications when creators reach new tiers
- [x] **Commission History**: Complete audit trail of all commission calculations
- [x] **Performance Metrics**: Tracking of sales, revenue, ratings for tier calculation
- [x] **Bulk Commission Processing**: Efficient processing of commission for multiple sales
- [x] **Integration with Revenue Model**: Seamless integration with WS-108 revenue calculations

## Deployment Notes

1. **Tier Requirements Setup**: Configure initial tier thresholds and benefits
2. **Commission Rate Configuration**: Set platform commission rates for each tier
3. **Promotional System**: Set up promotional commission rate management
4. **Database Migration**: Create tier tracking and commission record tables
5. **Notification System**: Configure tier upgrade notification templates

---

**Specification Status**: ✅ Complete  
**Implementation Priority**: High (Revenue Generation)  
**Estimated Effort**: 7-9 developer days  
**Dependencies**: WS-108 (Revenue Model), WS-076 (Stripe Payment Setup)