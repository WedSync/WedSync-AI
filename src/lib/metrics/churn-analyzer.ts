import { SupabaseClient } from '@supabase/supabase-js';

export interface ChurnAnalysisOptions {
  startDate: Date;
  endDate: Date;
  cohort?: string;
  supplierType?: string;
}

export interface ChurnMetrics {
  churnRate: {
    monthly: number;
    annual: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  churnReasons: ChurnReasonAnalysis;
  atRiskCustomers: {
    count: number;
    predictedChurnValue: number;
    interventionOpportunities: string[];
  };
  clvImpact: CLVImpact;
  seasonalPatterns: SeasonalChurnPatterns;
  recommendations: string[];
}

export interface ChurnReasonAnalysis {
  overall: Record<string, number>;
  weddingSpecific: Record<string, number>;
  top3Reasons: Array<{ reason: string; count: number; percentage: number }>;
  bySupplierType: Record<string, Record<string, number>>;
}

export interface CLVImpact {
  averageLostValue: number;
  totalChurnImpact: number;
  recoveryOpportunity: number;
  preventionROI: number;
}

export interface SeasonalChurnPatterns {
  peakChurnMonths: string[];
  offSeasonChurnRate: number;
  peakSeasonChurnRate: number;
  predictiveFactors: string[];
}

export interface CustomerLifecycleData {
  active: Array<{
    id: string;
    organization_id: string;
    created_at: string;
    monthlyValue: number;
    supplierType: string;
    riskScore: number;
  }>;
  churned: Array<{
    id: string;
    organization_id: string;
    churned_at: string;
    monthlyValue: number;
    supplierType: string;
    cancellation_reason?: string;
    tenure_months: number;
  }>;
}

export class ChurnAnalyzer {
  constructor(private supabase: SupabaseClient) {}

  async calculateChurnMetrics(
    options: ChurnAnalysisOptions,
  ): Promise<ChurnMetrics> {
    const { startDate, endDate, cohort, supplierType } = options;

    // Get customer lifecycle data
    const customers = await this.getCustomerLifecycleData(
      startDate,
      endDate,
      supplierType,
    );

    // Calculate churn rates
    const monthlyChurnRate = this.calculateMonthlyChurn(customers);
    const annualChurnRate = this.calculateAnnualChurn(customers);

    // Identify churn reasons for wedding suppliers
    const churnReasons = await this.analyzeChurnReasons(customers.churned);

    // Predict at-risk customers
    const atRiskCustomers = await this.identifyAtRiskCustomers(
      customers.active,
    );

    // Calculate customer lifetime value impact
    const clvImpact = await this.calculateCLVImpact(customers);

    // Wedding season churn patterns
    const seasonalChurnPatterns = this.analyzeSeasonalChurn(customers);

    // Generate trend analysis
    const trend = await this.calculateChurnTrend(customers);

    return {
      churnRate: {
        monthly: monthlyChurnRate,
        annual: annualChurnRate,
        trend,
      },
      churnReasons: churnReasons,
      atRiskCustomers: {
        count: atRiskCustomers.length,
        predictedChurnValue: atRiskCustomers.reduce(
          (sum, c) => sum + c.monthlyValue,
          0,
        ),
        interventionOpportunities: this.generateInterventions(atRiskCustomers),
      },
      clvImpact: clvImpact,
      seasonalPatterns: seasonalChurnPatterns,
      recommendations: this.generateChurnReductions(
        churnReasons,
        seasonalChurnPatterns,
      ),
    };
  }

  private async getCustomerLifecycleData(
    startDate: Date,
    endDate: Date,
    supplierType?: string,
  ): Promise<CustomerLifecycleData> {
    // Get active organizations with user profiles for supplier type
    const { data: activeOrgs } = await this.supabase
      .from('organizations')
      .select(
        `
        id,
        created_at,
        subscription_plan,
        subscription_status,
        subscription_monthly_price,
        user_profiles!inner(
          business_type,
          user_id
        )
      `,
      )
      .eq('subscription_status', 'active')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get churned organizations
    const { data: churnedOrgs } = await this.supabase
      .from('organizations')
      .select(
        `
        id,
        created_at,
        updated_at,
        subscription_plan,
        subscription_status,
        subscription_monthly_price,
        cancellation_reason,
        user_profiles!inner(
          business_type,
          user_id
        )
      `,
      )
      .eq('subscription_status', 'cancelled')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());

    const active = (activeOrgs || []).map((org) => ({
      id: org.id,
      organization_id: org.id,
      created_at: org.created_at,
      monthlyValue: org.subscription_monthly_price || 0,
      supplierType: org.user_profiles?.business_type || 'unknown',
      riskScore: this.calculateRiskScore(org),
    }));

    const churned = (churnedOrgs || []).map((org) => ({
      id: org.id,
      organization_id: org.id,
      churned_at: org.updated_at,
      monthlyValue: org.subscription_monthly_price || 0,
      supplierType: org.user_profiles?.business_type || 'unknown',
      cancellation_reason: org.cancellation_reason,
      tenure_months: this.calculateTenureMonths(org.created_at, org.updated_at),
    }));

    return { active, churned };
  }

  private calculateRiskScore(org: any): number {
    // Wedding industry-specific risk factors
    let riskScore = 0;

    // Account age (newer accounts higher risk)
    const accountAgeMonths = this.calculateTenureMonths(
      org.created_at,
      new Date().toISOString(),
    );
    if (accountAgeMonths < 3)
      riskScore += 30; // New accounts
    else if (accountAgeMonths < 6) riskScore += 20;
    else if (accountAgeMonths < 12) riskScore += 10;

    // Plan type risk
    if (org.subscription_plan === 'free') riskScore += 25;
    else if (org.subscription_plan === 'starter') riskScore += 15;

    // Seasonal risk (off-season higher churn)
    const currentMonth = new Date().getMonth();
    const isOffSeason = currentMonth < 3 || currentMonth > 9; // Oct-Feb
    if (isOffSeason) riskScore += 20;

    return Math.min(riskScore, 100); // Cap at 100
  }

  private calculateTenureMonths(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30)); // Approximate months
  }

  private calculateMonthlyChurn(customers: CustomerLifecycleData): number {
    const totalCustomersAtStart =
      customers.active.length + customers.churned.length;
    const churnedThisMonth = customers.churned.length;

    return totalCustomersAtStart > 0
      ? (churnedThisMonth / totalCustomersAtStart) * 100
      : 0;
  }

  private calculateAnnualChurn(customers: CustomerLifecycleData): number {
    const monthlyRate = this.calculateMonthlyChurn(customers);
    // Convert monthly to annual churn rate
    return (1 - Math.pow(1 - monthlyRate / 100, 12)) * 100;
  }

  private async calculateChurnTrend(
    customers: CustomerLifecycleData,
  ): Promise<'increasing' | 'decreasing' | 'stable'> {
    // Compare current churn to previous period
    const currentChurn = this.calculateMonthlyChurn(customers);

    // Get previous period data (simplified for demo)
    const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const previousPeriodEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const previousCustomers = await this.getCustomerLifecycleData(
      previousPeriodStart,
      previousPeriodEnd,
    );
    const previousChurn = this.calculateMonthlyChurn(previousCustomers);

    if (currentChurn > previousChurn * 1.1) return 'increasing';
    if (currentChurn < previousChurn * 0.9) return 'decreasing';
    return 'stable';
  }

  private async analyzeChurnReasons(
    churnedCustomers: CustomerLifecycleData['churned'],
  ): Promise<ChurnReasonAnalysis> {
    const reasons = churnedCustomers.reduce(
      (acc, customer) => {
        const reason = customer.cancellation_reason || 'No reason provided';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Wedding-specific churn reasons
    const weddingSpecificReasons = {
      'End of wedding season': reasons['End of wedding season'] || 0,
      'Business closure': reasons['Business closure'] || 0,
      'Too expensive': reasons['Too expensive'] || 0,
      'Missing features': reasons['Missing features'] || 0,
      'Poor ROI': reasons['Poor ROI'] || 0,
      'Lack of bookings': reasons['Lack of bookings'] || 0,
      Competition: reasons['Competition'] || 0,
    };

    // Group by supplier type
    const bySupplierType = churnedCustomers.reduce(
      (acc, customer) => {
        if (!acc[customer.supplierType]) {
          acc[customer.supplierType] = {};
        }
        const reason = customer.cancellation_reason || 'No reason provided';
        acc[customer.supplierType][reason] =
          (acc[customer.supplierType][reason] || 0) + 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Calculate top 3 reasons with percentages
    const totalChurned = churnedCustomers.length;
    const top3Reasons = Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalChurned > 0 ? (count / totalChurned) * 100 : 0,
      }));

    return {
      overall: reasons,
      weddingSpecific: weddingSpecificReasons,
      top3Reasons,
      bySupplierType,
    };
  }

  private async identifyAtRiskCustomers(
    activeCustomers: CustomerLifecycleData['active'],
  ): Promise<CustomerLifecycleData['active']> {
    // Return customers with high risk scores
    return activeCustomers
      .filter((customer) => customer.riskScore >= 60)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  private generateInterventions(
    atRiskCustomers: CustomerLifecycleData['active'],
  ): string[] {
    const interventions: string[] = [];

    if (atRiskCustomers.length > 0) {
      interventions.push('Proactive outreach to high-risk customers');
      interventions.push('Seasonal retention campaign for off-season months');
      interventions.push('Feature adoption training for new customers');
      interventions.push('Pricing optimization for starter plan customers');
      interventions.push('Success manager assignment for high-value accounts');
    }

    // Wedding industry specific interventions
    const offSeasonCustomers = atRiskCustomers.filter((c) => {
      const month = new Date().getMonth();
      return month < 3 || month > 9; // Off-season
    });

    if (offSeasonCustomers.length > 0) {
      interventions.push('Off-season business development resources');
      interventions.push('Expanded marketing tools for slow periods');
    }

    return interventions;
  }

  private async calculateCLVImpact(
    customers: CustomerLifecycleData,
  ): Promise<CLVImpact> {
    const averageMonthlyValue =
      customers.churned.length > 0
        ? customers.churned.reduce((sum, c) => sum + c.monthlyValue, 0) /
          customers.churned.length
        : 0;

    const averageTenure =
      customers.churned.length > 0
        ? customers.churned.reduce((sum, c) => sum + c.tenure_months, 0) /
          customers.churned.length
        : 0;

    const averageLostValue = averageMonthlyValue * averageTenure;
    const totalChurnImpact = customers.churned.reduce(
      (sum, c) => sum + c.monthlyValue * c.tenure_months,
      0,
    );

    // Estimate recovery opportunity (assume 30% of churned could be recovered)
    const recoveryOpportunity = totalChurnImpact * 0.3;

    // Prevention ROI (cost of retention vs lost value)
    const preventionROI =
      (recoveryOpportunity - averageLostValue * 0.1) / (averageLostValue * 0.1);

    return {
      averageLostValue,
      totalChurnImpact,
      recoveryOpportunity,
      preventionROI,
    };
  }

  private analyzeSeasonalChurn(
    customers: CustomerLifecycleData,
  ): SeasonalChurnPatterns {
    // Analyze churn by month for wedding seasonality
    const churnByMonth = customers.churned.reduce(
      (acc, customer) => {
        const month = new Date(customer.churned_at).getMonth();
        const monthName = new Date(2023, month).toLocaleString('default', {
          month: 'long',
        });
        acc[monthName] = (acc[monthName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const peakChurnMonths = Object.entries(churnByMonth)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([month]) => month);

    // Calculate seasonal churn rates
    const offSeasonChurned = customers.churned.filter((c) => {
      const month = new Date(c.churned_at).getMonth();
      return month < 3 || month > 9; // Oct-Feb
    });

    const peakSeasonChurned = customers.churned.filter((c) => {
      const month = new Date(c.churned_at).getMonth();
      return month >= 4 && month <= 8; // May-Sep
    });

    const totalCustomers = customers.active.length + customers.churned.length;
    const offSeasonChurnRate =
      totalCustomers > 0 ? (offSeasonChurned.length / totalCustomers) * 100 : 0;
    const peakSeasonChurnRate =
      totalCustomers > 0
        ? (peakSeasonChurned.length / totalCustomers) * 100
        : 0;

    return {
      peakChurnMonths,
      offSeasonChurnRate,
      peakSeasonChurnRate,
      predictiveFactors: [
        'Wedding season timing',
        'Business type seasonality',
        'Account age and tenure',
        'Plan type and pricing sensitivity',
      ],
    };
  }

  private generateChurnReductions(
    reasons: ChurnReasonAnalysis,
    patterns: SeasonalChurnPatterns,
  ): string[] {
    const recommendations: string[] = [];

    // Address top churn reasons
    if (reasons.top3Reasons.length > 0) {
      const topReason = reasons.top3Reasons[0];
      switch (topReason.reason.toLowerCase()) {
        case 'too expensive':
          recommendations.push('Introduce more flexible pricing tiers');
          recommendations.push('Implement seasonal discounts for off-season');
          break;
        case 'missing features':
          recommendations.push('Accelerate feature development roadmap');
          recommendations.push(
            'Improve onboarding to showcase existing features',
          );
          break;
        case 'poor roi':
          recommendations.push('Develop ROI tracking dashboard for customers');
          recommendations.push('Create customer success programs');
          break;
        case 'lack of bookings':
          recommendations.push(
            'Enhance marketing tools and lead generation features',
          );
          recommendations.push(
            'Partner with wedding directories for lead sharing',
          );
          break;
      }
    }

    // Seasonal recommendations
    if (patterns.offSeasonChurnRate > patterns.peakSeasonChurnRate) {
      recommendations.push('Launch off-season retention campaigns');
      recommendations.push(
        'Provide additional marketing support during slow periods',
      );
      recommendations.push(
        'Offer seasonal pause options instead of cancellation',
      );
    }

    // Wedding industry specific
    recommendations.push(
      'Create supplier networking events to increase platform stickiness',
    );
    recommendations.push(
      'Develop referral programs between complementary vendors',
    );
    recommendations.push('Implement graduated pricing for seasonal businesses');

    return recommendations;
  }
}
