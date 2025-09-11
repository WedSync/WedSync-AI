# 03-revenue-model.md

## What to Build

Revenue sharing system with automatic commission calculation, payment processing, and creator payouts.

## Key Technical Requirements

### Commission Structure

```
interface RevenueModel {
  commissionRates: {
    standard: 0.30, // Platform takes 30%
    verified: 0.25, // Platform takes 25% for verified creators
    featured: 0.20, // Platform takes 20% for featured creators
    volume: { // Volume-based discounts
      tier1: { sales: 10, rate: 0.28 },
      tier2: { sales: 50, rate: 0.25 },
      tier3: { sales: 100, rate: 0.20 }
    }
  },
  paymentProcessing: 0.029 + 30, // Stripe fees (2.9% + 30¢)
  payoutSchedule: 'monthly',
  minimumPayout: 2500 // $25 minimum
}
```

### Revenue Calculation Engine

```
class RevenueCalculator {
  calculate(sale: Sale): RevenueBreakdown {
    const gross = sale.amount
    const stripeFee = Math.round(gross * 0.029 + 30)
    const netAfterStripe = gross - stripeFee
    
    const commissionRate = this.getCommissionRate(sale.creatorId)
    const platformCommission = Math.round(netAfterStripe * commissionRate)
    const creatorEarnings = netAfterStripe - platformCommission
    
    return {
      gross,
      stripeFee,
      platformCommission,
      creatorEarnings,
      breakdown: {
        percentToCreator: ((creatorEarnings / gross) * 100).toFixed(2),
        percentToPlatform: ((platformCommission / gross) * 100).toFixed(2)
      }
    }
  }
  
  getCommissionRate(creatorId: string): number {
    const creator = this.getCreator(creatorId)
    const salesCount = creator.totalSales
    
    // Check volume tiers
    if (salesCount >= 100) return 0.20
    if (salesCount >= 50) return 0.25
    if (salesCount >= 10) return 0.28
    
    // Check creator status
    if (creator.featured) return 0.20
    if (creator.verified) return 0.25
    
    return 0.30 // Standard rate
  }
}
```

### Payout System

```
class PayoutManager {
  async processMonthlyPayouts() {
    const creators = await this.getEligibleCreators()
    
    for (const creator of creators) {
      const earnings = await this.calculateEarnings([creator.id](http://creator.id))
      
      if (earnings < MINIMUM_PAYOUT) {
        await this.rollOverToNextMonth([creator.id](http://creator.id), earnings)
        continue
      }
      
      const transfer = await stripe.transfers.create({
        amount: earnings,
        currency: 'usd',
        destination: creator.stripeAccountId,
        metadata: {
          creatorId: [creator.id](http://creator.id),
          period: getCurrentMonth()
        }
      })
      
      await this.recordPayout([creator.id](http://creator.id), transfer)
    }
  }
}
```

## Critical Implementation Notes

- Hold funds for 7 days for refund window
- Automatic tax form generation (1099 for US)
- Multi-currency support with conversion
- Detailed earning dashboards for creators
- Fraud detection for suspicious patterns

## Database Structure

```
CREATE TABLE revenue_records (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES template_purchases(id),
  gross_amount INTEGER,
  stripe_fee INTEGER,
  platform_commission INTEGER,
  creator_earnings INTEGER,
  commission_rate DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES suppliers(id),
  amount INTEGER,
  period TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);

CREATE TABLE earnings_rollover (
  creator_id UUID PRIMARY KEY,
  amount INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```