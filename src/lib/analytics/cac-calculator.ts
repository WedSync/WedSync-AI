import { createClient } from '@supabase/supabase-js';

export interface AcquisitionChannel {
  name: string;
  type:
    | 'organic'
    | 'paid_search'
    | 'social'
    | 'email'
    | 'referral'
    | 'display'
    | 'partnership';
  campaigns: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CustomerTouchpoint {
  touchpointId: string;
  customerId: string;
  channel: string;
  campaignId?: string;
  timestamp: Date;
  cost: number;
  conversionValue: number;
  position: number;
  totalJourneyLength: number;
}

export interface ChannelCACResult {
  channel: string;
  period: DateRange;
  totalSpend: number;
  newCustomers: number;
  cac: number;
  cacByModel: {
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
    positionBased: number;
  };
  conversionRate: number;
  averageJourneyLength: number;
  averageTimeToPurchase: number;
  qualityScore: number;
  trends: {
    monthOverMonth: number;
    quarterOverQuarter: number;
  };
}

export interface AttributionResult {
  customerId: string;
  attributionWeights: Map<string, number>;
  totalAttributedCost: number;
  conversionPath: CustomerTouchpoint[];
  attributionModel: 'linear' | 'time_decay' | 'position_based';
  qualityIndicators: {
    pathCompleteness: number;
    touchpointReliability: number;
    timelineConsistency: number;
  };
}

export interface LTVCACAnalysis {
  segment: SupplierSegment;
  sampleSize: number;
  averageLTV: number;
  averageCAC: number;
  ltvCacRatio: number;
  paybackPeriod: number;
  marginOfError: number;
  confidenceLevel: number;
  recommendations: string[];
  riskFactors: string[];
}

export interface SupplierSegment {
  name: string;
  criteria: {
    businessType?: string[];
    subscriptionTier?: string[];
    acquisitionChannel?: string[];
    revenueRange?: [number, number];
    locationMarket?: string[];
  };
  size: number;
}

export interface MarketingSpendAllocation {
  channel: string;
  campaign: string;
  totalBudget: number;
  actualSpend: number;
  allocatedToAcquisition: number;
  allocatedToRetention: number;
  allocatedToBrandAwareness: number;
  period: DateRange;
}

export class CACCalculator {
  private supabase: any;
  private attributionModels: Map<
    string,
    (touchpoints: CustomerTouchpoint[]) => Promise<AttributionResult>
  >;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.initializeAttributionModels();
  }

  async calculateChannelCAC(
    channel: AcquisitionChannel,
    timeRange: DateRange,
  ): Promise<ChannelCACResult> {
    try {
      // Get marketing spend data
      const totalSpend = await this.getChannelSpend(channel.name, timeRange);

      // Get new customers from this channel
      const newCustomers = await this.getNewCustomers(channel.name, timeRange);

      // Calculate CAC using different attribution models
      const cacByModel = await this.calculateCACByAttributionModels(
        channel.name,
        timeRange,
      );

      // Calculate additional metrics
      const conversionMetrics = await this.getConversionMetrics(
        channel.name,
        timeRange,
      );
      const qualityScore = await this.calculateChannelQualityScore(
        channel.name,
        timeRange,
      );
      const trends = await this.calculateCACTrends(channel.name, timeRange);

      return {
        channel: channel.name,
        period: timeRange,
        totalSpend,
        newCustomers: newCustomers.length,
        cac: newCustomers.length > 0 ? totalSpend / newCustomers.length : 0,
        cacByModel,
        conversionRate: conversionMetrics.conversionRate,
        averageJourneyLength: conversionMetrics.averageJourneyLength,
        averageTimeToPurchase: conversionMetrics.averageTimeToPurchase,
        qualityScore,
        trends,
      };
    } catch (error) {
      throw new Error(
        `Failed to calculate CAC for channel ${channel.name}: ${error.message}`,
      );
    }
  }

  async calculateLTVCACRatios(
    segments: SupplierSegment[],
  ): Promise<LTVCACAnalysis[]> {
    const analyses: LTVCACAnalysis[] = [];

    for (const segment of segments) {
      try {
        // Get suppliers matching segment criteria
        const suppliers = await this.getSuppliersInSegment(segment);

        if (suppliers.length < 10) {
          console.warn(
            `Segment ${segment.name} has insufficient data (${suppliers.length} suppliers)`,
          );
          continue;
        }

        // Calculate average LTV for segment
        const ltvData = await this.getSegmentLTVData(suppliers);
        const averageLTV =
          ltvData.reduce((sum, ltv) => sum + ltv, 0) / ltvData.length;

        // Calculate average CAC for segment
        const cacData = await this.getSegmentCACData(suppliers);
        const averageCAC =
          cacData.reduce((sum, cac) => sum + cac, 0) / cacData.length;

        // Calculate metrics
        const ltvCacRatio = averageCAC > 0 ? averageLTV / averageCAC : 0;
        const paybackPeriod = await this.calculatePaybackPeriod(
          segment,
          suppliers,
        );

        // Statistical confidence calculations
        const marginOfError = this.calculateMarginOfError(ltvData, cacData);
        const confidenceLevel = this.calculateConfidenceLevel(suppliers.length);

        // Generate insights
        const recommendations = this.generateRecommendations(
          ltvCacRatio,
          paybackPeriod,
          segment,
        );
        const riskFactors = this.assessSegmentRisks(
          segment,
          ltvCacRatio,
          suppliers,
        );

        analyses.push({
          segment,
          sampleSize: suppliers.length,
          averageLTV,
          averageCAC,
          ltvCacRatio,
          paybackPeriod,
          marginOfError,
          confidenceLevel,
          recommendations,
          riskFactors,
        });
      } catch (error) {
        console.error(`Failed to analyze segment ${segment.name}:`, error);
      }
    }

    return analyses.sort((a, b) => b.ltvCacRatio - a.ltvCacRatio);
  }

  private async multiTouchAttribution(
    customerJourney: CustomerTouchpoint[],
    attributionModel: 'linear' | 'time_decay' | 'position_based',
  ): Promise<AttributionResult> {
    if (!customerJourney.length) {
      throw new Error('Empty customer journey provided');
    }

    // Sort touchpoints by timestamp
    const sortedTouchpoints = [...customerJourney].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const attributionWeights = new Map<string, number>();
    const totalCost = sortedTouchpoints.reduce((sum, tp) => sum + tp.cost, 0);

    let totalAttributedCost = 0;

    switch (attributionModel) {
      case 'linear':
        const linearWeight = 1 / sortedTouchpoints.length;
        sortedTouchpoints.forEach((tp) => {
          attributionWeights.set(tp.touchpointId, linearWeight);
          totalAttributedCost += tp.cost * linearWeight;
        });
        break;

      case 'time_decay':
        const decayRate = 0.7; // 30% decay per step back
        let totalDecayWeight = 0;

        // Calculate decay weights (more recent touchpoints get higher weight)
        const decayWeights = sortedTouchpoints.map((tp, index) => {
          const stepsFromEnd = sortedTouchpoints.length - 1 - index;
          return Math.pow(decayRate, stepsFromEnd);
        });

        totalDecayWeight = decayWeights.reduce(
          (sum, weight) => sum + weight,
          0,
        );

        sortedTouchpoints.forEach((tp, index) => {
          const normalizedWeight = decayWeights[index] / totalDecayWeight;
          attributionWeights.set(tp.touchpointId, normalizedWeight);
          totalAttributedCost += tp.cost * normalizedWeight;
        });
        break;

      case 'position_based':
        if (sortedTouchpoints.length === 1) {
          attributionWeights.set(sortedTouchpoints[0].touchpointId, 1);
          totalAttributedCost = sortedTouchpoints[0].cost;
        } else if (sortedTouchpoints.length === 2) {
          attributionWeights.set(sortedTouchpoints[0].touchpointId, 0.5);
          attributionWeights.set(sortedTouchpoints[1].touchpointId, 0.5);
          totalAttributedCost = totalCost * 0.5;
        } else {
          // U-shaped: 40% first, 40% last, 20% distributed among middle
          const middleWeight =
            sortedTouchpoints.length > 2
              ? 0.2 / (sortedTouchpoints.length - 2)
              : 0;

          sortedTouchpoints.forEach((tp, index) => {
            let weight: number;
            if (index === 0)
              weight = 0.4; // First touch
            else if (index === sortedTouchpoints.length - 1)
              weight = 0.4; // Last touch
            else weight = middleWeight; // Middle touches

            attributionWeights.set(tp.touchpointId, weight);
            totalAttributedCost += tp.cost * weight;
          });
        }
        break;
    }

    // Calculate quality indicators
    const qualityIndicators = {
      pathCompleteness: this.calculatePathCompleteness(sortedTouchpoints),
      touchpointReliability:
        this.calculateTouchpointReliability(sortedTouchpoints),
      timelineConsistency: this.calculateTimelineConsistency(sortedTouchpoints),
    };

    return {
      customerId: customerJourney[0].customerId,
      attributionWeights,
      totalAttributedCost,
      conversionPath: sortedTouchpoints,
      attributionModel,
      qualityIndicators,
    };
  }

  private async getChannelSpend(
    channel: string,
    timeRange: DateRange,
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('customer_acquisition_costs')
      .select('marketing_spend, operational_spend')
      .eq('channel', channel)
      .gte('period_start', timeRange.start.toISOString().split('T')[0])
      .lte('period_end', timeRange.end.toISOString().split('T')[0]);

    if (error) throw error;

    return (
      data?.reduce(
        (sum, spend) =>
          sum + (spend.marketing_spend || 0) + (spend.operational_spend || 0),
        0,
      ) || 0
    );
  }

  private async getNewCustomers(
    channel: string,
    timeRange: DateRange,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('customer_lifecycle_events')
      .select('customer_id')
      .eq('event_type', 'acquisition')
      .eq('channel', channel)
      .gte('event_timestamp', timeRange.start.toISOString())
      .lte('event_timestamp', timeRange.end.toISOString());

    if (error) throw error;

    return data?.map((record) => record.customer_id) || [];
  }

  private async calculateCACByAttributionModels(
    channel: string,
    timeRange: DateRange,
  ): Promise<{
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
    positionBased: number;
  }> {
    // Get customer journeys for this channel and time period
    const { data: journeyData, error } = await this.supabase
      .from('marketing_attribution')
      .select(
        `
        customer_id,
        touchpoint_id,
        channel,
        touchpoint_timestamp,
        cost_per_touchpoint,
        conversion_timestamp,
        position_in_journey,
        total_journey_length
      `,
      )
      .eq('channel', channel)
      .gte('conversion_timestamp', timeRange.start.toISOString())
      .lte('conversion_timestamp', timeRange.end.toISOString())
      .not('conversion_timestamp', 'is', null)
      .order('customer_id')
      .order('touchpoint_timestamp');

    if (error) throw error;
    if (!journeyData?.length)
      return {
        firstTouch: 0,
        lastTouch: 0,
        linear: 0,
        timeDecay: 0,
        positionBased: 0,
      };

    // Group by customer and calculate attribution
    const customerJourneys = this.groupTouchpointsByCustomer(journeyData);
    const attributionResults = {
      firstTouch: 0,
      lastTouch: 0,
      linear: 0,
      timeDecay: 0,
      positionBased: 0,
    };

    const customerCount = Object.keys(customerJourneys).length;

    for (const [customerId, touchpoints] of Object.entries(customerJourneys)) {
      // First-touch attribution
      attributionResults.firstTouch += touchpoints[0].cost;

      // Last-touch attribution
      attributionResults.lastTouch += touchpoints[touchpoints.length - 1].cost;

      // Multi-touch attribution models
      try {
        const linearResult = await this.multiTouchAttribution(
          touchpoints,
          'linear',
        );
        const timeDecayResult = await this.multiTouchAttribution(
          touchpoints,
          'time_decay',
        );
        const positionBasedResult = await this.multiTouchAttribution(
          touchpoints,
          'position_based',
        );

        attributionResults.linear += linearResult.totalAttributedCost;
        attributionResults.timeDecay += timeDecayResult.totalAttributedCost;
        attributionResults.positionBased +=
          positionBasedResult.totalAttributedCost;
      } catch (error) {
        console.warn(
          `Attribution calculation failed for customer ${customerId}:`,
          error,
        );
      }
    }

    // Calculate average CAC per customer
    return {
      firstTouch:
        customerCount > 0 ? attributionResults.firstTouch / customerCount : 0,
      lastTouch:
        customerCount > 0 ? attributionResults.lastTouch / customerCount : 0,
      linear: customerCount > 0 ? attributionResults.linear / customerCount : 0,
      timeDecay:
        customerCount > 0 ? attributionResults.timeDecay / customerCount : 0,
      positionBased:
        customerCount > 0
          ? attributionResults.positionBased / customerCount
          : 0,
    };
  }

  private async getConversionMetrics(
    channel: string,
    timeRange: DateRange,
  ): Promise<{
    conversionRate: number;
    averageJourneyLength: number;
    averageTimeToPurchase: number;
  }> {
    const { data, error } = await this.supabase
      .from('marketing_attribution')
      .select(
        'customer_id, total_journey_length, touchpoint_timestamp, conversion_timestamp',
      )
      .eq('channel', channel)
      .gte('touchpoint_timestamp', timeRange.start.toISOString())
      .lte('touchpoint_timestamp', timeRange.end.toISOString());

    if (error) throw error;
    if (!data?.length)
      return {
        conversionRate: 0,
        averageJourneyLength: 0,
        averageTimeToPurchase: 0,
      };

    const uniqueCustomers = new Set(data.map((d) => d.customer_id));
    const conversions = data.filter((d) => d.conversion_timestamp !== null);
    const uniqueConversions = new Set(conversions.map((d) => d.customer_id));

    const conversionRate =
      uniqueCustomers.size > 0
        ? uniqueConversions.size / uniqueCustomers.size
        : 0;

    const averageJourneyLength =
      conversions.length > 0
        ? conversions.reduce(
            (sum, c) => sum + (c.total_journey_length || 0),
            0,
          ) / conversions.length
        : 0;

    // Calculate average time to purchase
    let totalTimeToPurchase = 0;
    let validConversions = 0;

    for (const conversion of conversions) {
      if (conversion.conversion_timestamp && conversion.touchpoint_timestamp) {
        const timeDiff =
          new Date(conversion.conversion_timestamp).getTime() -
          new Date(conversion.touchpoint_timestamp).getTime();
        totalTimeToPurchase += timeDiff / (1000 * 60 * 60 * 24); // Convert to days
        validConversions++;
      }
    }

    const averageTimeToPurchase =
      validConversions > 0 ? totalTimeToPurchase / validConversions : 0;

    return {
      conversionRate,
      averageJourneyLength,
      averageTimeToPurchase,
    };
  }

  private async calculateChannelQualityScore(
    channel: string,
    timeRange: DateRange,
  ): Promise<number> {
    // Get LTV data for customers acquired through this channel
    const { data: ltvData, error } = await this.supabase
      .from('customer_ltv_calculations')
      .select('predicted_ltv_24m, confidence_score')
      .eq('acquisition_channel', channel)
      .gte('calculation_date', timeRange.start.toISOString().split('T')[0])
      .lte('calculation_date', timeRange.end.toISOString().split('T')[0]);

    if (error || !ltvData?.length) return 0.5; // Neutral score

    const averageLTV =
      ltvData.reduce((sum, d) => sum + (d.predicted_ltv_24m || 0), 0) /
      ltvData.length;
    const averageConfidence =
      ltvData.reduce((sum, d) => sum + (d.confidence_score || 0), 0) /
      ltvData.length;

    // Normalize quality score (0-1 scale)
    const ltvScore = Math.min(1, averageLTV / 3000); // $3000 as benchmark
    const confidenceScore = averageConfidence;

    return ltvScore * 0.7 + confidenceScore * 0.3;
  }

  private async calculateCACTrends(
    channel: string,
    timeRange: DateRange,
  ): Promise<{
    monthOverMonth: number;
    quarterOverQuarter: number;
  }> {
    // Calculate previous period CACs for comparison
    const periodLength = timeRange.end.getTime() - timeRange.start.getTime();
    const previousMonth = {
      start: new Date(timeRange.start.getTime() - periodLength),
      end: timeRange.start,
    };

    const currentCAC = await this.getSimpleChannelCAC(channel, timeRange);
    const previousCAC = await this.getSimpleChannelCAC(channel, previousMonth);

    const monthOverMonth =
      previousCAC > 0 ? (currentCAC - previousCAC) / previousCAC : 0;

    // For quarter over quarter, use 3x the period
    const previousQuarter = {
      start: new Date(timeRange.start.getTime() - periodLength * 3),
      end: new Date(timeRange.start.getTime()),
    };
    const quarterCAC = await this.getSimpleChannelCAC(channel, previousQuarter);
    const quarterOverQuarter =
      quarterCAC > 0 ? (currentCAC - quarterCAC) / quarterCAC : 0;

    return {
      monthOverMonth,
      quarterOverQuarter,
    };
  }

  private async getSimpleChannelCAC(
    channel: string,
    timeRange: DateRange,
  ): Promise<number> {
    const spend = await this.getChannelSpend(channel, timeRange);
    const customers = await this.getNewCustomers(channel, timeRange);

    return customers.length > 0 ? spend / customers.length : 0;
  }

  private groupTouchpointsByCustomer(
    data: any[],
  ): Record<string, CustomerTouchpoint[]> {
    const grouped: Record<string, CustomerTouchpoint[]> = {};

    for (const record of data) {
      if (!grouped[record.customer_id]) {
        grouped[record.customer_id] = [];
      }

      grouped[record.customer_id].push({
        touchpointId: record.touchpoint_id,
        customerId: record.customer_id,
        channel: record.channel,
        timestamp: new Date(record.touchpoint_timestamp),
        cost: record.cost_per_touchpoint || 0,
        conversionValue: 0, // Would be calculated from revenue data
        position: record.position_in_journey || 1,
        totalJourneyLength: record.total_journey_length || 1,
      });
    }

    return grouped;
  }

  // Quality indicator calculations
  private calculatePathCompleteness(touchpoints: CustomerTouchpoint[]): number {
    // Measure how complete the customer journey data is
    const expectedTouchpoints =
      touchpoints[0]?.totalJourneyLength || touchpoints.length;
    return Math.min(1, touchpoints.length / expectedTouchpoints);
  }

  private calculateTouchpointReliability(
    touchpoints: CustomerTouchpoint[],
  ): number {
    // Measure data quality of individual touchpoints
    let reliabilitySum = 0;

    for (const tp of touchpoints) {
      let score = 1;
      if (!tp.cost || tp.cost <= 0) score -= 0.3;
      if (!tp.timestamp) score -= 0.4;
      if (!tp.channel) score -= 0.3;

      reliabilitySum += Math.max(0, score);
    }

    return touchpoints.length > 0 ? reliabilitySum / touchpoints.length : 0;
  }

  private calculateTimelineConsistency(
    touchpoints: CustomerTouchpoint[],
  ): number {
    if (touchpoints.length < 2) return 1;

    // Check for timeline gaps or inconsistencies
    let consistencyScore = 1;

    for (let i = 1; i < touchpoints.length; i++) {
      const timeDiff =
        touchpoints[i].timestamp.getTime() -
        touchpoints[i - 1].timestamp.getTime();

      // Penalize very large gaps (>30 days) or negative time differences
      if (timeDiff < 0) consistencyScore -= 0.5;
      else if (timeDiff > 30 * 24 * 60 * 60 * 1000) consistencyScore -= 0.2;
    }

    return Math.max(0, consistencyScore);
  }

  // LTV:CAC Analysis helper methods
  private async getSuppliersInSegment(
    segment: SupplierSegment,
  ): Promise<string[]> {
    let query = this.supabase.from('suppliers').select('id');

    if (segment.criteria.businessType?.length) {
      query = query.in('business_type', segment.criteria.businessType);
    }
    if (segment.criteria.subscriptionTier?.length) {
      query = query.in('subscription_tier', segment.criteria.subscriptionTier);
    }
    if (segment.criteria.acquisitionChannel?.length) {
      query = query.in(
        'acquisition_channel',
        segment.criteria.acquisitionChannel,
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.map((s) => s.id) || [];
  }

  private async getSegmentLTVData(supplierIds: string[]): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('customer_ltv_calculations')
      .select('predicted_ltv_24m')
      .in('customer_id', supplierIds)
      .not('predicted_ltv_24m', 'is', null);

    if (error) throw error;

    return data?.map((d) => d.predicted_ltv_24m) || [];
  }

  private async getSegmentCACData(supplierIds: string[]): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('marketing_attribution')
      .select('customer_id, cost_per_touchpoint')
      .in('customer_id', supplierIds)
      .not('conversion_timestamp', 'is', null);

    if (error) throw error;

    // Group by customer and sum costs
    const customerCACs = new Map<string, number>();

    data?.forEach((record) => {
      const current = customerCACs.get(record.customer_id) || 0;
      customerCACs.set(
        record.customer_id,
        current + (record.cost_per_touchpoint || 0),
      );
    });

    return Array.from(customerCACs.values());
  }

  private async calculatePaybackPeriod(
    segment: SupplierSegment,
    suppliers: string[],
  ): Promise<number> {
    // Get monthly revenue data for suppliers in this segment
    const { data, error } = await this.supabase
      .from('subscription_revenue')
      .select('customer_id, mrr_amount')
      .in('customer_id', suppliers);

    if (error) return 0;

    const averageMRR = data?.length
      ? data.reduce((sum, r) => sum + (r.mrr_amount || 0), 0) / data.length
      : 0;

    // Get average CAC for segment
    const cacData = await this.getSegmentCACData(suppliers);
    const averageCAC = cacData.length
      ? cacData.reduce((sum, cac) => sum + cac, 0) / cacData.length
      : 0;

    return averageMRR > 0 ? Math.ceil(averageCAC / averageMRR) : 0;
  }

  private calculateMarginOfError(ltvData: number[], cacData: number[]): number {
    if (ltvData.length < 2 || cacData.length < 2) return 0.5;

    // Simple margin of error calculation based on standard error
    const ltvStdError = this.calculateStandardError(ltvData);
    const cacStdError = this.calculateStandardError(cacData);

    // Combined margin of error (simplified)
    return Math.sqrt(ltvStdError ** 2 + cacStdError ** 2) * 1.96; // 95% confidence
  }

  private calculateStandardError(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (data.length - 1);
    const stdDev = Math.sqrt(variance);

    return stdDev / Math.sqrt(data.length);
  }

  private calculateConfidenceLevel(sampleSize: number): number {
    // Return confidence level based on sample size
    if (sampleSize >= 1000) return 0.99;
    if (sampleSize >= 400) return 0.95;
    if (sampleSize >= 100) return 0.9;
    if (sampleSize >= 30) return 0.8;
    return 0.7;
  }

  private generateRecommendations(
    ltvCacRatio: number,
    paybackPeriod: number,
    segment: SupplierSegment,
  ): string[] {
    const recommendations: string[] = [];

    if (ltvCacRatio < 3) {
      recommendations.push(
        'LTV:CAC ratio below healthy threshold (3:1) - consider reducing acquisition costs or improving customer value',
      );
    }

    if (paybackPeriod > 12) {
      recommendations.push(
        'Payback period exceeds 12 months - focus on increasing early revenue or reducing CAC',
      );
    }

    if (ltvCacRatio > 10) {
      recommendations.push(
        'Excellent LTV:CAC ratio suggests opportunity to invest more aggressively in this channel',
      );
    }

    if (
      segment.criteria.businessType?.includes('photographer') &&
      ltvCacRatio > 5
    ) {
      recommendations.push(
        'Photography segment showing strong performance - consider increasing budget allocation',
      );
    }

    return recommendations;
  }

  private assessSegmentRisks(
    segment: SupplierSegment,
    ltvCacRatio: number,
    suppliers: string[],
  ): string[] {
    const risks: string[] = [];

    if (suppliers.length < 50) {
      risks.push(
        'Small sample size - results may not be statistically significant',
      );
    }

    if (ltvCacRatio < 1.5) {
      risks.push('Unprofitable segment - immediate action required');
    }

    if (
      segment.criteria.acquisitionChannel?.includes('paid_search') &&
      ltvCacRatio < 3
    ) {
      risks.push(
        'Paid search typically has higher CAC - monitor for efficiency decline',
      );
    }

    return risks;
  }

  private initializeAttributionModels(): void {
    this.attributionModels = new Map([
      [
        'linear',
        (touchpoints: CustomerTouchpoint[]) =>
          this.multiTouchAttribution(touchpoints, 'linear'),
      ],
      [
        'time_decay',
        (touchpoints: CustomerTouchpoint[]) =>
          this.multiTouchAttribution(touchpoints, 'time_decay'),
      ],
      [
        'position_based',
        (touchpoints: CustomerTouchpoint[]) =>
          this.multiTouchAttribution(touchpoints, 'position_based'),
      ],
    ]);
  }
}

export default CACCalculator;
