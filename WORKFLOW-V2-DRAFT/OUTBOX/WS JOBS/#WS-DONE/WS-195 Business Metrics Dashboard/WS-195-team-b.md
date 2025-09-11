# TEAM B - ROUND 1: WS-195 - Business Metrics Dashboard
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create robust API infrastructure for business metrics calculation, secure data aggregation, and real-time business intelligence endpoints for executive reporting
**FEATURE ID:** WS-195 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about accurate MRR calculations, secure executive data access, and real-time business metrics that drive wedding platform investment decisions

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/metrics/
cat $WS_ROOT/wedsync/src/app/api/metrics/business/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test business-metrics
# MUST show: "All business metrics API tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("api route metrics analytics");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
```

## 🧠 STEP 2: SEQUENTIAL THINKING FOR BUSINESS METRICS API

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Business metrics API needs: MRR calculation from subscription data, churn rate analysis from supplier cancellations, viral coefficient tracking from referral chains, CAC calculations from marketing spend and acquisition data. All must be calculated accurately and securely for executive decision-making.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**API DEVELOPMENT FOR BUSINESS METRICS:**
- Secure API endpoints for executive business intelligence access
- Real-time MRR (Monthly Recurring Revenue) calculation APIs
- Churn rate analysis and trend reporting endpoints
- Viral coefficient tracking and referral chain analysis
- Customer acquisition cost calculation and optimization insights
- Business metrics data aggregation and caching strategies
- Executive dashboard authentication and authorization

## 📋 TECHNICAL DELIVERABLES

- [ ] Business metrics API endpoints with comprehensive validation
- [ ] MRR calculation engine with subscription lifecycle tracking
- [ ] Churn analysis system with predictive insights
- [ ] Viral coefficient tracking with referral attribution
- [ ] Secure executive dashboard API authentication
- [ ] Real-time business intelligence data aggregation
- [ ] Performance-optimized metrics caching and updates

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/metrics/business/
- Metrics Library: $WS_ROOT/wedsync/src/lib/metrics/
- Database Queries: $WS_ROOT/wedsync/src/lib/database/metrics/

## 💰 BUSINESS METRICS API PATTERNS

### MRR Calculation API Endpoint
```typescript
// src/app/api/metrics/business/mrr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/security/validation';
import { getServerSession } from 'next-auth';
import { MRRCalculator } from '@/lib/metrics/mrr-calculator';
import { z } from 'zod';

const mrrQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
});

export async function GET(request: NextRequest) {
  return withSecureValidation(request, mrrQuerySchema, async (validatedData) => {
    const session = await getServerSession();
    
    // Executive access only
    if (!session?.user?.role?.includes('executive')) {
      return NextResponse.json(
        { error: 'Unauthorized - Executive access required' },
        { status: 403 }
      );
    }

    const calculator = new MRRCalculator();
    
    // Calculate comprehensive MRR metrics
    const mrrMetrics = await calculator.calculateMRRMetrics({
      startDate: validatedData.startDate 
        ? new Date(validatedData.startDate)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: validatedData.endDate
        ? new Date(validatedData.endDate)
        : new Date(),
      granularity: validatedData.granularity,
    });

    // Add wedding season context
    const seasonalInsights = await calculator.analyzeSeasonalTrends(mrrMetrics);

    return NextResponse.json({
      success: true,
      data: {
        ...mrrMetrics,
        seasonalInsights,
        calculatedAt: new Date().toISOString(),
      },
    });
  });
}

// src/lib/metrics/mrr-calculator.ts
export class MRRCalculator {
  async calculateMRRMetrics(options: MRRCalculationOptions): Promise<MRRMetrics> {
    const { startDate, endDate, granularity } = options;

    // Get subscription data for date range
    const subscriptions = await this.getSubscriptionData(startDate, endDate);
    
    // Calculate MRR components
    const newMRR = await this.calculateNewMRR(subscriptions);
    const expansionMRR = await this.calculateExpansionMRR(subscriptions);
    const contractionMRR = await this.calculateContractionMRR(subscriptions);
    const churned MRR = await this.calculateChurnedMRR(subscriptions);

    // Net MRR calculation
    const netMRR = newMRR + expansionMRR - contractionMRR - churnedMRR;
    
    // Calculate growth rates
    const previousPeriodMRR = await this.getPreviousPeriodMRR(startDate);
    const mrrGrowthRate = ((netMRR - previousPeriodMRR) / previousPeriodMRR) * 100;

    // Wedding industry specific metrics
    const seasonalFactors = await this.calculateSeasonalFactors(subscriptions);
    
    return {
      currentMRR: netMRR,
      newMRR,
      expansionMRR,
      contractionMRR,
      churnedMRR,
      mrrGrowthRate,
      seasonalFactors,
      calculation: {
        totalActiveSubscriptions: subscriptions.active.length,
        averageRevenuePerUser: netMRR / subscriptions.active.length,
        weddingSeasonImpact: seasonalFactors.peakSeasonMultiplier,
      },
    };
  }

  private async calculateSeasonalFactors(subscriptions: SubscriptionData): Promise<SeasonalFactors> {
    // Wedding season analysis (May-September peak)
    const currentMonth = new Date().getMonth();
    const isPeakSeason = currentMonth >= 4 && currentMonth <= 8; // May-Sep (0-indexed)
    
    const peakMonthRevenue = subscriptions.active
      .filter(sub => {
        const subMonth = new Date(sub.created_at).getMonth();
        return subMonth >= 4 && subMonth <= 8;
      })
      .reduce((sum, sub) => sum + sub.monthly_value, 0);
    
    const offSeasonRevenue = subscriptions.active
      .filter(sub => {
        const subMonth = new Date(sub.created_at).getMonth();
        return subMonth < 4 || subMonth > 8;
      })
      .reduce((sum, sub) => sum + sub.monthly_value, 0);

    const seasonalMultiplier = peakMonthRevenue / (offSeasonRevenue || 1);

    return {
      isPeakSeason,
      peakSeasonMultiplier: seasonalMultiplier,
      predictedGrowth: isPeakSeason ? seasonalMultiplier * 1.2 : 1.0,
      seasonalAdjustment: isPeakSeason ? 'High growth expected' : 'Steady growth expected',
    };
  }
}
```

### Churn Analysis API Endpoint
```typescript
// src/app/api/metrics/business/churn/route.ts
export async function GET(request: NextRequest) {
  return withSecureValidation(request, churnQuerySchema, async (validatedData) => {
    const session = await getServerSession();
    
    if (!session?.user?.role?.includes('executive')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const analyzer = new ChurnAnalyzer();
    const churnMetrics = await analyzer.calculateChurnMetrics(validatedData);
    
    return NextResponse.json({
      success: true,
      data: churnMetrics,
    });
  });
}

// src/lib/metrics/churn-analyzer.ts
export class ChurnAnalyzer {
  async calculateChurnMetrics(options: ChurnAnalysisOptions): Promise<ChurnMetrics> {
    const { startDate, endDate, cohort } = options;
    
    // Get customer lifecycle data
    const customers = await this.getCustomerLifecycleData(startDate, endDate);
    
    // Calculate churn rates
    const monthlyChurnRate = this.calculateMonthlyChurn(customers);
    const annualChurnRate = this.calculateAnnualChurn(customers);
    
    // Identify churn reasons for wedding suppliers
    const churnReasons = await this.analyzeChurnReasons(customers.churned);
    
    // Predict at-risk customers
    const atRiskCustomers = await this.identifyAtRiskCustomers(customers.active);
    
    // Calculate customer lifetime value impact
    const clvImpact = await this.calculateCLVImpact(customers);

    // Wedding season churn patterns
    const seasonalChurnPatterns = this.analyzeSeasonalChurn(customers);

    return {
      churnRate: {
        monthly: monthlyChurnRate,
        annual: annualChurnRate,
        trend: this.calculateChurnTrend(customers),
      },
      churnReasons: churnReasons,
      atRiskCustomers: {
        count: atRiskCustomers.length,
        predictedChurnValue: atRiskCustomers.reduce((sum, c) => sum + c.monthlyValue, 0),
        interventionOpportunities: this.generateInterventions(atRiskCustomers),
      },
      clvImpact: clvImpact,
      seasonalPatterns: seasonalChurnPatterns,
      recommendations: this.generateChurnReductions(churnReasons, seasonalChurnPatterns),
    };
  }

  private analyzeChurnReasons(churnedCustomers: ChurnedCustomer[]): ChurnReasonAnalysis {
    const reasons = churnedCustomers.reduce((acc, customer) => {
      const reason = customer.cancellation_reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Wedding-specific churn reasons
    const weddingSpecificReasons = {
      'End of wedding season': reasons['End of wedding season'] || 0,
      'Business closure': reasons['Business closure'] || 0,
      'Too expensive': reasons['Too expensive'] || 0,
      'Missing features': reasons['Missing features'] || 0,
      'Poor ROI': reasons['Poor ROI'] || 0,
    };

    return {
      overall: reasons,
      weddingSpecific: weddingSpecificReasons,
      top3Reasons: Object.entries(reasons)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count })),
    };
  }
}
```

### Viral Coefficient Tracking API
```typescript
// src/app/api/metrics/business/viral-coefficient/route.ts
export async function GET(request: NextRequest) {
  return withSecureValidation(request, viralQuerySchema, async (validatedData) => {
    const tracker = new ViralCoefficientTracker();
    const viralMetrics = await tracker.calculateViralCoefficient(validatedData);
    
    return NextResponse.json({
      success: true,
      data: viralMetrics,
    });
  });
}

// src/lib/metrics/viral-coefficient-tracker.ts
export class ViralCoefficientTracker {
  async calculateViralCoefficient(options: ViralAnalysisOptions): Promise<ViralMetrics> {
    const { startDate, endDate } = options;
    
    // Track referral chains for wedding suppliers
    const referralData = await this.getReferralChains(startDate, endDate);
    
    // Calculate viral coefficient (average referrals per customer * conversion rate)
    const averageReferrals = this.calculateAverageReferrals(referralData);
    const referralConversionRate = this.calculateReferralConversion(referralData);
    const viralCoefficient = averageReferrals * referralConversionRate;
    
    // Wedding industry viral patterns
    const industryViralPatterns = await this.analyzeIndustryVirality(referralData);
    
    // ROI of viral growth
    const viralROI = await this.calculateViralROI(referralData);

    return {
      viralCoefficient,
      averageReferrals,
      referralConversionRate,
      industryPatterns: industryViralPatterns,
      viralROI,
      referralChains: this.mapReferralChains(referralData),
      predictions: {
        nextMonthReferrals: Math.round(viralCoefficient * referralData.activeReferrers.length),
        growthTrajectory: this.predictGrowthTrajectory(viralCoefficient),
      },
    };
  }

  private analyzeIndustryVirality(referralData: ReferralData): IndustryViralPatterns {
    // Wedding suppliers refer within their networks
    const photographerReferrals = this.analyzeSupplierTypeReferrals(referralData, 'photographer');
    const venueReferrals = this.analyzeSupplierTypeReferrals(referralData, 'venue');
    const plannerReferrals = this.analyzeSupplierTypeReferrals(referralData, 'planner');

    return {
      bySupplierType: {
        photographer: photographerReferrals,
        venue: venueReferrals,
        planner: plannerReferrals,
      },
      crossTypeReferrals: this.analyzeCrossTypeReferrals(referralData),
      geographicSpread: this.analyzeGeographicVirality(referralData),
      seasonalVirality: this.analyzeSeasonalReferrals(referralData),
    };
  }
}
```

---

**EXECUTE IMMEDIATELY - Comprehensive business metrics API with secure executive access and wedding industry insights!**