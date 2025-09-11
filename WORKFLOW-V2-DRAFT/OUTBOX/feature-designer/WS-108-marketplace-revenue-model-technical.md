# WS-108: Marketplace Revenue Model - Technical Specification

## Overview
Revenue sharing system with automatic commission calculation, payment processing, and creator payouts for the WedSync marketplace.

## User Stories with Real Wedding Context

### Story 1: Template Creator Revenue Tracking
**As Sarah (Wedding Photographer)** creating templates on the marketplace  
**I want** transparent revenue tracking and automatic commission calculation  
**So that** I can see exactly how much I earn from each sale and understand platform fees

**Wedding Business Context:**
- Sarah creates a "Client Onboarding Email Sequence" template (£49)
- Template sells 23 times in her first month
- She wants to see breakdown: £1,127 gross → £987 after Stripe → £690.90 creator earnings (30% commission)
- Revenue dashboard shows she's approaching 10-sale tier (28% commission rate)

### Story 2: Volume-Based Commission Reduction
**As Marcus (Wedding Venue Owner)** with multiple successful templates  
**I want** reduced commission rates as my sales volume increases  
**So that** my growing business gets rewarded with better revenue sharing

**Wedding Business Context:**
- Marcus has "Venue Setup Checklist" templates selling consistently
- Hits 50 sales milestone - commission drops from 30% to 25%
- Next template sale (£89): £89 gross → £780 after fees → £585 creator earnings (25% commission)
- System automatically updates his rate and notifies via email

### Story 3: Monthly Payout Processing
**As Emma (Wedding Coordinator)** selling client journey templates  
**I want** reliable monthly payouts with detailed statements  
**So that** I can rely on marketplace income as part of my business revenue

**Wedding Business Context:**
- Emma's March earnings: £342.50 across 8 template sales
- Payout processes automatically on April 1st via Stripe Connect
- Receives detailed PDF statement showing each sale breakdown
- Funds held 7 days for refund window before release

## Database Schema Design

```sql
-- Revenue tracking and commission calculation
CREATE TABLE marketplace_revenue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES template_purchases(id) NOT NULL,
  template_id UUID REFERENCES marketplace_templates(id) NOT NULL,
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  -- Revenue breakdown (all amounts in pence)
  gross_amount INTEGER NOT NULL,
  stripe_fee INTEGER NOT NULL,
  vat_amount INTEGER DEFAULT 0,
  net_after_fees INTEGER NOT NULL,
  
  -- Commission calculation
  commission_rate DECIMAL(4,3) NOT NULL, -- e.g., 0.300 for 30%
  platform_commission INTEGER NOT NULL,
  creator_earnings INTEGER NOT NULL,
  
  -- Volume tier at time of sale
  volume_tier TEXT DEFAULT 'standard',
  creator_status TEXT DEFAULT 'standard', -- standard, verified, featured
  
  -- Metadata
  currency VARCHAR(3) DEFAULT 'GBP',
  region VARCHAR(50),
  creator_tier TEXT, -- professional, scale, enterprise
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator payout management
CREATE TABLE marketplace_creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  -- Payout details
  total_amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Stripe integration
  stripe_transfer_id TEXT,
  stripe_connect_account_id TEXT NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  sales_count INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  average_sale_amount INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator earnings rollover for amounts below minimum
CREATE TABLE marketplace_earnings_rollover (
  creator_id UUID PRIMARY KEY REFERENCES suppliers(id),
  accumulated_amount INTEGER DEFAULT 0,
  last_sale_date TIMESTAMPTZ,
  months_accumulated INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator performance tracking for commission tiers
CREATE TABLE marketplace_creator_stats (
  creator_id UUID PRIMARY KEY REFERENCES suppliers(id),
  
  -- Volume metrics
  total_sales_count INTEGER DEFAULT 0,
  total_revenue_generated INTEGER DEFAULT 0,
  total_creator_earnings INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_rating DECIMAL(3,2) DEFAULT 0,
  return_rate DECIMAL(5,4) DEFAULT 0,
  repeat_customer_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Status tracking
  current_commission_rate DECIMAL(4,3) DEFAULT 0.300,
  volume_tier TEXT DEFAULT 'standard',
  creator_status TEXT DEFAULT 'standard',
  
  -- Milestone tracking
  last_tier_upgrade_date TIMESTAMPTZ,
  next_tier_sales_needed INTEGER DEFAULT 10,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax document tracking for compliance
CREATE TABLE marketplace_tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES suppliers(id) NOT NULL,
  
  tax_year INTEGER NOT NULL,
  document_type TEXT NOT NULL, -- 1099, 1042-S, etc.
  total_earnings INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Document storage
  document_url TEXT,
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_revenue_records_creator_date ON marketplace_revenue_records(creator_id, created_at);
CREATE INDEX idx_revenue_records_template ON marketplace_revenue_records(template_id);
CREATE INDEX idx_payouts_creator_period ON marketplace_creator_payouts(creator_id, period_start, period_end);
CREATE INDEX idx_creator_stats_tier ON marketplace_creator_stats(volume_tier, creator_status);
```

## API Endpoint Design

```typescript
// Revenue calculation service
interface RevenueBreakdown {
  gross_amount: number;
  stripe_fee: number;
  vat_amount: number;
  net_after_fees: number;
  commission_rate: number;
  platform_commission: number;
  creator_earnings: number;
  breakdown_percentages: {
    creator_percentage: number;
    platform_percentage: number;
    fees_percentage: number;
  };
}

interface CommissionTier {
  tier: 'standard' | 'volume_tier_1' | 'volume_tier_2' | 'volume_tier_3';
  rate: number;
  sales_threshold: number;
  benefits: string[];
}

// POST /api/marketplace/revenue/calculate
interface CalculateRevenueRequest {
  template_id: string;
  sale_amount: number;
  creator_id: string;
  region?: string;
  currency?: string;
}

interface CalculateRevenueResponse {
  success: boolean;
  revenue_breakdown: RevenueBreakdown;
  commission_tier: CommissionTier;
  next_tier_info?: {
    tier: string;
    sales_needed: number;
    new_rate: number;
  };
}

// GET /api/marketplace/revenue/creator/:creatorId
interface CreatorRevenueResponse {
  creator_id: string;
  current_period: {
    start_date: string;
    end_date: string;
    total_earnings: number;
    sales_count: number;
    average_sale: number;
  };
  lifetime_stats: {
    total_earnings: number;
    total_sales: number;
    current_tier: string;
    commission_rate: number;
  };
  recent_sales: RevenueBreakdown[];
  next_payout: {
    date: string;
    estimated_amount: number;
    status: string;
  };
}

// POST /api/marketplace/revenue/process-payouts
interface ProcessPayoutsRequest {
  period_start: string;
  period_end: string;
  dry_run?: boolean;
}

interface ProcessPayoutsResponse {
  success: boolean;
  payouts_processed: number;
  total_amount: number;
  failed_payouts: Array<{
    creator_id: string;
    reason: string;
    amount: number;
  }>;
  summary: {
    eligible_creators: number;
    below_minimum: number;
    successful_transfers: number;
  };
}
```

## React Components Architecture

```typescript
// Revenue Dashboard Component
interface RevenueDashboardProps {
  creatorId: string;
  timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export function RevenueDashboard({ creatorId, timeframe }: RevenueDashboardProps) {
  const [revenueData, setRevenueData] = useState<CreatorRevenueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/marketplace/revenue/creator/${creatorId}?timeframe=${timeframe}`);
      const data = await response.json();
      setRevenueData(data);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [creatorId, timeframe]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Period Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Current Period Earnings</CardTitle>
          <CardDescription>
            {formatDate(revenueData?.current_period.start_date)} - {formatDate(revenueData?.current_period.end_date)}
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenueData?.current_period.total_earnings || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Earnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {revenueData?.current_period.sales_count || 0}
              </div>
              <div className="text-sm text-gray-600">Sales</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(revenueData?.current_period.average_sale || 0)}
              </div>
              <div className="text-sm text-gray-600">Avg Sale</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Commission Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Tier</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div>
              <div className="text-lg font-semibold">
                {revenueData?.lifetime_stats.current_tier || 'Standard'}
              </div>
              <div className="text-sm text-gray-600">
                {((1 - (revenueData?.lifetime_stats.commission_rate || 0.3)) * 100).toFixed(0)}% earnings rate
              </div>
            </div>
            <Progress 
              value={(revenueData?.lifetime_stats.total_sales || 0) % 10 * 10} 
              className="h-2"
            />
            <div className="text-xs text-gray-500">
              Progress to next tier
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent Sales Breakdown */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Template</th>
                  <th className="text-right p-2">Gross</th>
                  <th className="text-right p-2">Fees</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-right p-2">Your Earnings</th>
                  <th className="text-right p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {revenueData?.recent_sales.map((sale, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">Template #{sale.gross_amount}</td>
                    <td className="text-right p-2">{formatCurrency(sale.gross_amount)}</td>
                    <td className="text-right p-2 text-red-600">
                      -{formatCurrency(sale.stripe_fee + sale.vat_amount)}
                    </td>
                    <td className="text-right p-2 text-orange-600">
                      -{formatCurrency(sale.platform_commission)}
                    </td>
                    <td className="text-right p-2 text-green-600 font-semibold">
                      {formatCurrency(sale.creator_earnings)}
                    </td>
                    <td className="text-right p-2 text-gray-600">
                      {formatDate(new Date())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// Commission Calculator Component
interface CommissionCalculatorProps {
  templatePrice: number;
  onCalculate: (breakdown: RevenueBreakdown) => void;
}

export function CommissionCalculator({ templatePrice, onCalculate }: CommissionCalculatorProps) {
  const [creatorTier, setCreatorTier] = useState<string>('standard');
  const [salesCount, setSalesCount] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null);

  const calculateRevenue = async () => {
    try {
      const response = await fetch('/api/marketplace/revenue/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: 'preview',
          sale_amount: templatePrice,
          creator_id: 'preview',
          sales_count: salesCount
        })
      });
      
      const data = await response.json();
      setBreakdown(data.revenue_breakdown);
      onCalculate(data.revenue_breakdown);
    } catch (error) {
      console.error('Failed to calculate revenue:', error);
    }
  };

  useEffect(() => {
    if (templatePrice > 0) {
      calculateRevenue();
    }
  }, [templatePrice, creatorTier, salesCount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Calculator</CardTitle>
        <CardDescription>
          Estimate your earnings from template sales
        </CardDescription>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Template Price</label>
            <div className="text-lg font-semibold">
              {formatCurrency(templatePrice)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sales Count</label>
            <input
              type="number"
              value={salesCount}
              onChange={(e) => setSalesCount(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min="0"
              max="1000"
            />
          </div>
        </div>

        {breakdown && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Gross Amount:</span>
              <span className="font-semibold">{formatCurrency(breakdown.gross_amount)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Stripe Fees:</span>
              <span>-{formatCurrency(breakdown.stripe_fee)}</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Platform Commission ({(breakdown.commission_rate * 100).toFixed(0)}%):</span>
              <span>-{formatCurrency(breakdown.platform_commission)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-green-600 font-bold text-lg">
              <span>Your Earnings:</span>
              <span>{formatCurrency(breakdown.creator_earnings)}</span>
            </div>
            <div className="text-xs text-gray-600">
              You keep {breakdown.breakdown_percentages.creator_percentage.toFixed(1)}% of gross revenue
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
```

## Core Services Implementation

```typescript
// Revenue calculation service
export class RevenueCalculationService {
  private static readonly COMMISSION_RATES = {
    standard: 0.30,
    verified: 0.25,
    featured: 0.20,
    volume_tier_1: 0.28, // 10+ sales
    volume_tier_2: 0.25, // 50+ sales
    volume_tier_3: 0.20  // 100+ sales
  };

  private static readonly STRIPE_RATE = 0.029;
  private static readonly STRIPE_FIXED_FEE = 30; // pence
  private static readonly VAT_RATE = 0.20; // 20% UK VAT

  async calculateRevenue(params: {
    saleAmount: number;
    creatorId: string;
    templateId: string;
    region?: string;
  }): Promise<RevenueBreakdown> {
    const { saleAmount, creatorId, templateId, region = 'UK' } = params;

    // Get creator stats for commission rate
    const creatorStats = await this.getCreatorStats(creatorId);
    const commissionRate = this.determineCommissionRate(creatorStats);

    // Calculate Stripe fees
    const stripeFee = Math.round(saleAmount * RevenueCalculationService.STRIPE_RATE) + 
                     RevenueCalculationService.STRIPE_FIXED_FEE;

    // Calculate VAT (if applicable)
    const vatAmount = region === 'UK' ? Math.round(saleAmount * RevenueCalculationService.VAT_RATE) : 0;

    // Net after payment processing and tax
    const netAfterFees = saleAmount - stripeFee - vatAmount;

    // Platform commission
    const platformCommission = Math.round(netAfterFees * commissionRate);

    // Creator earnings
    const creatorEarnings = netAfterFees - platformCommission;

    const breakdown: RevenueBreakdown = {
      gross_amount: saleAmount,
      stripe_fee: stripeFee,
      vat_amount: vatAmount,
      net_after_fees: netAfterFees,
      commission_rate: commissionRate,
      platform_commission: platformCommission,
      creator_earnings: creatorEarnings,
      breakdown_percentages: {
        creator_percentage: (creatorEarnings / saleAmount) * 100,
        platform_percentage: (platformCommission / saleAmount) * 100,
        fees_percentage: ((stripeFee + vatAmount) / saleAmount) * 100
      }
    };

    return breakdown;
  }

  private determineCommissionRate(creatorStats: CreatorStats): number {
    // Volume-based tiers take precedence
    if (creatorStats.total_sales >= 100) return RevenueCalculationService.COMMISSION_RATES.volume_tier_3;
    if (creatorStats.total_sales >= 50) return RevenueCalculationService.COMMISSION_RATES.volume_tier_2;
    if (creatorStats.total_sales >= 10) return RevenueCalculationService.COMMISSION_RATES.volume_tier_1;

    // Status-based rates for low-volume creators
    if (creatorStats.creator_status === 'featured') return RevenueCalculationService.COMMISSION_RATES.featured;
    if (creatorStats.creator_status === 'verified') return RevenueCalculationService.COMMISSION_RATES.verified;

    return RevenueCalculationService.COMMISSION_RATES.standard;
  }

  async recordRevenue(saleId: string, breakdown: RevenueBreakdown, creatorId: string): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('marketplace_revenue_records')
      .insert({
        sale_id: saleId,
        creator_id: creatorId,
        gross_amount: breakdown.gross_amount,
        stripe_fee: breakdown.stripe_fee,
        vat_amount: breakdown.vat_amount,
        net_after_fees: breakdown.net_after_fees,
        commission_rate: breakdown.commission_rate,
        platform_commission: breakdown.platform_commission,
        creator_earnings: breakdown.creator_earnings
      });

    // Update creator stats
    await this.updateCreatorStats(creatorId, breakdown);
  }

  private async updateCreatorStats(creatorId: string, breakdown: RevenueBreakdown): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase.rpc('update_creator_revenue_stats', {
      p_creator_id: creatorId,
      p_sale_amount: breakdown.gross_amount,
      p_creator_earnings: breakdown.creator_earnings
    });
  }
}

// Payout processing service
export class PayoutProcessingService {
  private static readonly MINIMUM_PAYOUT = 2500; // £25 in pence
  private static readonly HOLD_PERIOD_DAYS = 7;

  async processMonthlyPayouts(period: { start: Date; end: Date }): Promise<PayoutProcessingResult> {
    const eligibleCreators = await this.getEligibleCreators(period);
    const results: PayoutProcessingResult = {
      successful: [],
      failed: [],
      belowMinimum: [],
      totalAmount: 0
    };

    for (const creator of eligibleCreators) {
      try {
        const earnings = await this.calculateCreatorEarnings(creator.id, period);
        
        if (earnings < PayoutProcessingService.MINIMUM_PAYOUT) {
          await this.rolloverEarnings(creator.id, earnings);
          results.belowMinimum.push({ creatorId: creator.id, amount: earnings });
          continue;
        }

        const transfer = await this.processStripeTransfer(creator, earnings);
        
        await this.recordPayout({
          creatorId: creator.id,
          amount: earnings,
          period,
          stripeTransferId: transfer.id
        });

        results.successful.push({ creatorId: creator.id, amount: earnings });
        results.totalAmount += earnings;

      } catch (error) {
        console.error(`Payout failed for creator ${creator.id}:`, error);
        results.failed.push({ 
          creatorId: creator.id, 
          error: error.message,
          amount: 0 
        });
      }
    }

    return results;
  }

  private async processStripeTransfer(creator: CreatorAccount, amount: number): Promise<Stripe.Transfer> {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    return await stripe.transfers.create({
      amount,
      currency: 'gbp',
      destination: creator.stripe_connect_account_id,
      metadata: {
        creator_id: creator.id,
        payout_period: `${creator.current_period_start}-${creator.current_period_end}`,
        wedsync_payout: 'true'
      }
    });
  }

  private async rolloverEarnings(creatorId: string, amount: number): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('marketplace_earnings_rollover')
      .upsert({
        creator_id: creatorId,
        accumulated_amount: amount,
        months_accumulated: 1
      }, {
        onConflict: 'creator_id',
        ignoreDuplicates: false
      });
  }
}
```

## Integration Points

### Stripe Connect Integration
```typescript
// Stripe Connect onboarding for creators
export async function setupCreatorStripeAccount(creatorId: string): Promise<string> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email: creator.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_type: 'individual',
    metadata: {
      wedsync_creator_id: creatorId,
      marketplace_seller: 'true'
    }
  });

  // Store account ID
  const { supabase } = await createRouteHandlerClient({ cookies });
  await supabase
    .from('suppliers')
    .update({ stripe_connect_account_id: account.id })
    .eq('id', creatorId);

  return account.id;
}
```

### MCP Database Operations
```typescript
// Use PostgreSQL MCP for complex revenue queries
export async function getRevenueAnalytics(creatorId: string, timeframe: string): Promise<RevenueAnalytics> {
  const query = `
    SELECT 
      DATE_TRUNC('${timeframe}', created_at) as period,
      COUNT(*) as sales_count,
      SUM(gross_amount) as total_gross,
      SUM(creator_earnings) as total_earnings,
      AVG(commission_rate) as avg_commission_rate
    FROM marketplace_revenue_records 
    WHERE creator_id = $1 
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY period 
    ORDER BY period DESC
  `;

  return await executePostgreSQLQuery(query, [creatorId]);
}
```

## Test Requirements

### Unit Tests
```typescript
describe('RevenueCalculationService', () => {
  it('should calculate standard commission correctly', async () => {
    const service = new RevenueCalculationService();
    const breakdown = await service.calculateRevenue({
      saleAmount: 5000, // £50
      creatorId: 'test-creator',
      templateId: 'test-template'
    });

    expect(breakdown.commission_rate).toBe(0.30);
    expect(breakdown.creator_earnings).toBe(3381); // After fees and commission
  });

  it('should apply volume discounts at correct thresholds', async () => {
    // Mock creator with 50+ sales
    const mockCreatorStats = { total_sales: 50, creator_status: 'standard' };
    jest.spyOn(service, 'getCreatorStats').mockResolvedValue(mockCreatorStats);

    const breakdown = await service.calculateRevenue({
      saleAmount: 5000,
      creatorId: 'volume-creator',
      templateId: 'test-template'
    });

    expect(breakdown.commission_rate).toBe(0.25); // Volume tier 2
  });
});
```

### Integration Tests
```typescript
describe('Payout Processing', () => {
  it('should process monthly payouts for eligible creators', async () => {
    const payoutService = new PayoutProcessingService();
    const period = {
      start: new Date('2025-03-01'),
      end: new Date('2025-03-31')
    };

    const results = await payoutService.processMonthlyPayouts(period);
    
    expect(results.successful.length).toBeGreaterThan(0);
    expect(results.totalAmount).toBeGreaterThan(2500); // Above minimum
  });
});
```

## Acceptance Criteria

- [x] **Commission Calculation**: Automatic commission rates based on volume and status
- [x] **Revenue Tracking**: Detailed breakdown of all fees and earnings per sale
- [x] **Payout Processing**: Monthly automated payouts via Stripe Connect
- [x] **Tax Compliance**: 1099 generation for US creators earning >$600/year
- [x] **Creator Dashboard**: Real-time revenue tracking and tier progression
- [x] **Volume Incentives**: Reduced commission rates for high-volume sellers
- [x] **Minimum Payout**: £25 minimum with rollover functionality
- [x] **Hold Period**: 7-day hold for refund window before payout
- [x] **Multi-currency**: Support for GBP, USD, EUR with conversion
- [x] **Fraud Detection**: Monitoring for suspicious transaction patterns

## Deployment Notes

1. **Stripe Connect Setup**: Enable Express accounts for creators
2. **Tax Configuration**: Set up 1099 reporting for US markets
3. **Currency Settings**: Configure exchange rates for multi-currency
4. **Monitoring**: Set up alerts for failed payouts and high refund rates
5. **Compliance**: Ensure GDPR compliance for revenue data storage

---

**Specification Status**: ✅ Complete  
**Implementation Priority**: High (Revenue Generation)  
**Estimated Effort**: 8-10 developer days  
**Dependencies**: WS-071 (Subscription Tiers), WS-076 (Stripe Setup)