import { SupabaseClient } from '@supabase/supabase-js';

export interface MRRCalculationOptions {
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export interface MRRMetrics {
  currentMRR: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  mrrGrowthRate: number;
  seasonalFactors: SeasonalFactors;
  calculation: {
    totalActiveSubscriptions: number;
    averageRevenuePerUser: number;
    weddingSeasonImpact: number;
  };
}

export interface SeasonalFactors {
  isPeakSeason: boolean;
  peakSeasonMultiplier: number;
  predictedGrowth: number;
  seasonalAdjustment: string;
}

export interface SubscriptionData {
  active: Array<{
    id: string;
    organization_id: string;
    created_at: string;
    monthly_value: number;
    plan_type: string;
    status: string;
  }>;
  new: Array<{
    id: string;
    organization_id: string;
    created_at: string;
    monthly_value: number;
    plan_type: string;
  }>;
  churned: Array<{
    id: string;
    organization_id: string;
    cancelled_at: string;
    monthly_value: number;
    plan_type: string;
  }>;
  upgraded: Array<{
    id: string;
    organization_id: string;
    previous_value: number;
    current_value: number;
    upgraded_at: string;
  }>;
  downgraded: Array<{
    id: string;
    organization_id: string;
    previous_value: number;
    current_value: number;
    downgraded_at: string;
  }>;
}

export class MRRCalculator {
  constructor(private supabase: SupabaseClient) {}

  async calculateMRRMetrics(
    options: MRRCalculationOptions,
  ): Promise<MRRMetrics> {
    const { startDate, endDate, granularity } = options;

    // Get subscription data for date range
    const subscriptions = await this.getSubscriptionData(startDate, endDate);

    // Calculate MRR components
    const newMRR = await this.calculateNewMRR(subscriptions.new);
    const expansionMRR = await this.calculateExpansionMRR(
      subscriptions.upgraded,
    );
    const contractionMRR = await this.calculateContractionMRR(
      subscriptions.downgraded,
    );
    const churnedMRR = await this.calculateChurnedMRR(subscriptions.churned);

    // Net MRR calculation
    const netMRR = newMRR + expansionMRR - contractionMRR - churnedMRR;

    // Calculate growth rates
    const previousPeriodMRR = await this.getPreviousPeriodMRR(startDate);
    const mrrGrowthRate =
      previousPeriodMRR > 0
        ? ((netMRR - previousPeriodMRR) / previousPeriodMRR) * 100
        : 0;

    // Wedding industry specific metrics
    const seasonalFactors = await this.calculateSeasonalFactors(
      subscriptions.active,
    );

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
        averageRevenuePerUser:
          subscriptions.active.length > 0
            ? netMRR / subscriptions.active.length
            : 0,
        weddingSeasonImpact: seasonalFactors.peakSeasonMultiplier,
      },
    };
  }

  private async getSubscriptionData(
    startDate: Date,
    endDate: Date,
  ): Promise<SubscriptionData> {
    // Query active subscriptions from organizations table
    const { data: activeSubscriptions } = await this.supabase
      .from('organizations')
      .select(
        `
        id,
        created_at,
        subscription_plan,
        subscription_status,
        subscription_monthly_price
      `,
      )
      .eq('subscription_status', 'active')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Query payment history for detailed subscription changes
    const { data: paymentHistory } = await this.supabase
      .from('payment_history')
      .select(
        `
        id,
        organization_id,
        amount,
        created_at,
        payment_type,
        status,
        metadata
      `,
      )
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'completed');

    // Transform data into subscription metrics format
    const active = (activeSubscriptions || []).map((sub) => ({
      id: sub.id,
      organization_id: sub.id,
      created_at: sub.created_at,
      monthly_value: sub.subscription_monthly_price || 0,
      plan_type: sub.subscription_plan || 'unknown',
      status: sub.subscription_status || 'active',
    }));

    // Get new subscriptions in period
    const newSubs = active.filter((sub) => {
      const createdDate = new Date(sub.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    });

    // Get churned subscriptions
    const { data: churnedOrgs } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('subscription_status', 'cancelled')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());

    const churned = (churnedOrgs || []).map((org) => ({
      id: org.id,
      organization_id: org.id,
      cancelled_at: org.updated_at,
      monthly_value: org.subscription_monthly_price || 0,
      plan_type: org.subscription_plan || 'unknown',
    }));

    return {
      active,
      new: newSubs,
      churned,
      upgraded: [], // TODO: Track plan upgrades
      downgraded: [], // TODO: Track plan downgrades
    };
  }

  private async calculateNewMRR(
    newSubscriptions: SubscriptionData['new'],
  ): Promise<number> {
    return newSubscriptions.reduce((sum, sub) => sum + sub.monthly_value, 0);
  }

  private async calculateExpansionMRR(
    upgrades: SubscriptionData['upgraded'],
  ): Promise<number> {
    return upgrades.reduce(
      (sum, upgrade) => sum + (upgrade.current_value - upgrade.previous_value),
      0,
    );
  }

  private async calculateContractionMRR(
    downgrades: SubscriptionData['downgraded'],
  ): Promise<number> {
    return downgrades.reduce(
      (sum, downgrade) =>
        sum + (downgrade.previous_value - downgrade.current_value),
      0,
    );
  }

  private async calculateChurnedMRR(
    churnedSubscriptions: SubscriptionData['churned'],
  ): Promise<number> {
    return churnedSubscriptions.reduce(
      (sum, sub) => sum + sub.monthly_value,
      0,
    );
  }

  private async getPreviousPeriodMRR(
    currentPeriodStart: Date,
  ): Promise<number> {
    // Calculate MRR for previous period (30 days before)
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000,
    );

    const { data: previousSubs } = await this.supabase
      .from('organizations')
      .select('subscription_monthly_price')
      .eq('subscription_status', 'active')
      .gte('created_at', previousPeriodStart.toISOString())
      .lte('created_at', previousPeriodEnd.toISOString());

    return (previousSubs || []).reduce(
      (sum, sub) => sum + (sub.subscription_monthly_price || 0),
      0,
    );
  }

  private async calculateSeasonalFactors(
    subscriptions: SubscriptionData['active'],
  ): Promise<SeasonalFactors> {
    // Wedding season analysis (May-September peak)
    const currentMonth = new Date().getMonth();
    const isPeakSeason = currentMonth >= 4 && currentMonth <= 8; // May-Sep (0-indexed)

    const peakMonthRevenue = subscriptions
      .filter((sub) => {
        const subMonth = new Date(sub.created_at).getMonth();
        return subMonth >= 4 && subMonth <= 8;
      })
      .reduce((sum, sub) => sum + sub.monthly_value, 0);

    const offSeasonRevenue = subscriptions
      .filter((sub) => {
        const subMonth = new Date(sub.created_at).getMonth();
        return subMonth < 4 || subMonth > 8;
      })
      .reduce((sum, sub) => sum + sub.monthly_value, 0);

    const seasonalMultiplier =
      offSeasonRevenue > 0 ? peakMonthRevenue / offSeasonRevenue : 1.0;

    return {
      isPeakSeason,
      peakSeasonMultiplier: seasonalMultiplier,
      predictedGrowth: isPeakSeason ? seasonalMultiplier * 1.2 : 1.0,
      seasonalAdjustment: isPeakSeason
        ? 'High growth expected during wedding season'
        : 'Steady growth expected in off-season',
    };
  }

  async analyzeSeasonalTrends(metrics: MRRMetrics): Promise<{
    seasonalGrowthForecast: number;
    peakSeasonRevenue: number;
    offSeasonRevenue: number;
    yearOverYearGrowth: number;
  }> {
    const currentMonth = new Date().getMonth();
    const isPeakSeason = currentMonth >= 4 && currentMonth <= 8;

    const seasonalGrowthForecast = isPeakSeason
      ? metrics.currentMRR * 1.35 // 35% boost during peak season
      : metrics.currentMRR * 0.78; // 22% decline in off-season

    // Calculate year-over-year growth
    const lastYearStart = new Date();
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearMRR = await this.getPreviousPeriodMRR(lastYearStart);
    const yearOverYearGrowth =
      lastYearMRR > 0
        ? ((metrics.currentMRR - lastYearMRR) / lastYearMRR) * 100
        : 0;

    return {
      seasonalGrowthForecast,
      peakSeasonRevenue: metrics.currentMRR * 1.35,
      offSeasonRevenue: metrics.currentMRR * 0.78,
      yearOverYearGrowth,
    };
  }
}
