/**
 * Vendor Performance Analyzer
 * AI-powered vendor assessment and recommendation engine
 */

import {
  VendorReport,
  VendorPerformanceMetric,
  CommunicationScore,
  VendorTimelineScore,
  SatisfactionScore,
  RecommendationScore,
  VendorComparison,
  SelectedVendor,
} from '@/types/couple-reporting';

export class VendorPerformanceAnalyzer {
  private static instance: VendorPerformanceAnalyzer;

  private constructor() {}

  public static getInstance(): VendorPerformanceAnalyzer {
    if (!VendorPerformanceAnalyzer.instance) {
      VendorPerformanceAnalyzer.instance = new VendorPerformanceAnalyzer();
    }
    return VendorPerformanceAnalyzer.instance;
  }

  /**
   * Comprehensive vendor performance analysis
   */
  async analyzeVendorPerformance(
    vendors: SelectedVendor[],
  ): Promise<VendorReport> {
    try {
      // Parallel analysis of all vendor aspects
      const [
        vendorPerformance,
        communicationQuality,
        timelineAdherence,
        clientSatisfaction,
        comparativeAnalysis,
      ] = await Promise.all([
        this.analyzeIndividualPerformance(vendors),
        this.analyzeCommunicationMetrics(vendors),
        this.analyzeTimelinePerformance(vendors),
        this.analyzeClientSatisfaction(vendors),
        this.performComparativeAnalysis(vendors),
      ]);

      const recommendationStrength =
        await this.calculateRecommendationStrength(vendorPerformance);
      const overallScore = this.calculateOverallScore(vendorPerformance);

      return {
        vendorPerformance,
        communicationQuality,
        timelineAdherence,
        clientSatisfaction,
        recommendationStrength,
        comparativeAnalysis,
        overallScore,
      };
    } catch (error) {
      console.error('Vendor performance analysis failed:', error);
      throw new Error('Failed to analyze vendor performance');
    }
  }

  /**
   * Analyze individual vendor performance metrics
   */
  private async analyzeIndividualPerformance(
    vendors: SelectedVendor[],
  ): Promise<VendorPerformanceMetric[]> {
    const performancePromises = vendors.map((vendor) =>
      this.analyzeVendor(vendor),
    );
    return Promise.all(performancePromises);
  }

  private async analyzeVendor(
    vendor: SelectedVendor,
  ): Promise<VendorPerformanceMetric> {
    // Gather performance data
    const communicationData = await this.getVendorCommunicationData(vendor.id);
    const timelineData = await this.getVendorTimelineData(vendor.id);
    const qualityData = await this.getVendorQualityData(vendor.id);
    const valueData = await this.getVendorValueData(vendor);

    // AI-powered scoring
    const responsiveness = this.calculateResponsivenessScore(communicationData);
    const quality = this.calculateQualityScore(qualityData);
    const timeliness = this.calculateTimelinessScore(timelineData);
    const professionalism = this.calculateProfessionalismScore(
      communicationData,
      timelineData,
    );
    const valueForMoney = this.calculateValueScore(
      valueData,
      vendor.contract.value,
    );

    const overallScore = this.calculateVendorOverallScore({
      responsiveness,
      quality,
      timeliness,
      professionalism,
      valueForMoney,
    });

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      overallScore,
      responsiveness,
      quality,
      timeliness,
      professionalism,
      valueForMoney,
      lastInteraction: vendor.communication.lastContact,
      totalInteractions: communicationData.totalInteractions,
    };
  }

  /**
   * Analyze communication quality metrics
   */
  private async analyzeCommunicationMetrics(
    vendors: SelectedVendor[],
  ): Promise<CommunicationScore[]> {
    const communicationPromises = vendors.map((vendor) =>
      this.analyzeCommunication(vendor),
    );
    return Promise.all(communicationPromises);
  }

  private async analyzeCommunication(
    vendor: SelectedVendor,
  ): Promise<CommunicationScore> {
    const communicationData = await this.getVendorCommunicationData(vendor.id);

    return {
      vendorId: vendor.id,
      averageResponseTime: vendor.communication.responseTime,
      responseRate: communicationData.responseRate,
      communicationQuality: communicationData.qualityRating,
      preferredChannels: [vendor.communication.preferredChannel],
      proactiveUpdates: communicationData.proactiveUpdates,
    };
  }

  /**
   * Analyze timeline adherence
   */
  private async analyzeTimelinePerformance(
    vendors: SelectedVendor[],
  ): Promise<VendorTimelineScore[]> {
    const timelinePromises = vendors.map((vendor) =>
      this.analyzeTimeline(vendor),
    );
    return Promise.all(timelinePromises);
  }

  private async analyzeTimeline(
    vendor: SelectedVendor,
  ): Promise<VendorTimelineScore> {
    const timelineData = await this.getVendorTimelineData(vendor.id);

    return {
      vendorId: vendor.id,
      onTimeDelivery: timelineData.onTimePercentage,
      averageDelay: timelineData.averageDelay,
      milestoneAdherence: timelineData.milestoneAdherence,
      earlyWarnings: timelineData.earlyWarnings,
    };
  }

  /**
   * Analyze client satisfaction
   */
  private async analyzeClientSatisfaction(
    vendors: SelectedVendor[],
  ): Promise<SatisfactionScore[]> {
    const satisfactionPromises = vendors.map((vendor) =>
      this.analyzeSatisfaction(vendor),
    );
    return Promise.all(satisfactionPromises);
  }

  private async analyzeSatisfaction(
    vendor: SelectedVendor,
  ): Promise<SatisfactionScore> {
    const satisfactionData = await this.getVendorSatisfactionData(vendor.id);

    return {
      vendorId: vendor.id,
      overallSatisfaction: vendor.rating,
      likelyToRecommend: satisfactionData.recommendationScore,
      meetExpectations: satisfactionData.expectationsMet,
      strongPoints: satisfactionData.strengths,
      improvementAreas: satisfactionData.improvements,
      testimonial: satisfactionData.testimonial,
    };
  }

  /**
   * Perform comparative analysis between vendors
   */
  private async performComparativeAnalysis(
    vendors: SelectedVendor[],
  ): Promise<VendorComparison[]> {
    const comparisons: VendorComparison[] = [];

    // Group vendors by category for fair comparison
    const vendorsByCategory = this.groupVendorsByCategory(vendors);

    for (const [category, categoryVendors] of Object.entries(
      vendorsByCategory,
    )) {
      const categoryComparisons =
        await this.compareVendorsInCategory(categoryVendors);
      comparisons.push(...categoryComparisons);
    }

    return comparisons;
  }

  private async compareVendorsInCategory(
    vendors: SelectedVendor[],
  ): Promise<VendorComparison[]> {
    if (vendors.length < 2) return [];

    const performanceMetrics = await this.analyzeIndividualPerformance(vendors);

    return performanceMetrics.map((vendor, index) => ({
      vendorId: vendor.vendorId,
      comparisonCategory: vendor.category,
      rank: this.calculateRank(vendor, performanceMetrics),
      percentile: this.calculatePercentile(vendor, performanceMetrics),
      strengthAreas: this.identifyStrengths(vendor),
      weaknessAreas: this.identifyWeaknesses(vendor),
    }));
  }

  /**
   * Calculate recommendation strength
   */
  private async calculateRecommendationStrength(
    vendorPerformance: VendorPerformanceMetric[],
  ): Promise<RecommendationScore> {
    const topPerformers = vendorPerformance
      .filter((v) => v.overallScore >= 85)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3)
      .map((v) => v.vendorId);

    const concerningVendors = vendorPerformance
      .filter((v) => v.overallScore < 70)
      .sort((a, b) => a.overallScore - b.overallScore)
      .map((v) => v.vendorId);

    const replacementSuggestions =
      await this.generateReplacementSuggestions(concerningVendors);

    const overallScore =
      vendorPerformance.reduce((sum, v) => sum + v.overallScore, 0) /
      vendorPerformance.length;

    return {
      overallScore,
      topPerformers,
      concerningVendors,
      replacementSuggestions,
    };
  }

  // AI-powered scoring algorithms
  private calculateResponsivenessScore(communicationData: any): number {
    const responseTime = communicationData.averageResponseTime || 24; // hours
    const responseRate = communicationData.responseRate || 0.9;

    // Score based on response time (24h = 100%, decreasing)
    const timeScore = Math.max(0, 100 - (responseTime - 2) * 5);

    // Score based on response rate
    const rateScore = responseRate * 100;

    // Weighted combination
    return Math.round(timeScore * 0.4 + rateScore * 0.6);
  }

  private calculateQualityScore(qualityData: any): number {
    // Mock quality scoring based on various factors
    const workQuality = qualityData.workQuality || 4.5;
    const attention = qualityData.attentionToDetail || 4.2;
    const creativity = qualityData.creativity || 4.0;

    return Math.round(((workQuality + attention + creativity) / 3) * 20);
  }

  private calculateTimelinessScore(timelineData: any): number {
    const onTimeRate = timelineData.onTimePercentage || 0.85;
    const avgDelay = timelineData.averageDelay || 2; // days

    // Score based on on-time delivery rate
    const onTimeScore = onTimeRate * 100;

    // Penalty for delays
    const delayPenalty = Math.min(avgDelay * 5, 30);

    return Math.max(0, Math.round(onTimeScore - delayPenalty));
  }

  private calculateProfessionalismScore(
    communicationData: any,
    timelineData: any,
  ): number {
    // Composite score based on communication and timeline factors
    const communicationScore =
      this.calculateResponsivenessScore(communicationData);
    const timelineScore = this.calculateTimelinessScore(timelineData);
    const courtesyScore = communicationData.courtesyRating || 4.5;

    return Math.round(
      communicationScore * 0.4 + timelineScore * 0.3 + courtesyScore * 20 * 0.3,
    );
  }

  private calculateValueScore(valueData: any, contractValue: number): number {
    const marketPrice = valueData.marketAverage || contractValue;
    const qualityDelivered = valueData.qualityScore || 4.0;
    const addedValue = valueData.addedValue || 3.5;

    // Value ratio (lower price = better value, but quality matters)
    const priceRatio = Math.min(1.2, marketPrice / contractValue);
    const qualityFactor = qualityDelivered / 5;
    const addedValueFactor = addedValue / 5;

    return Math.round(priceRatio * qualityFactor * addedValueFactor * 100);
  }

  private calculateVendorOverallScore(scores: {
    responsiveness: number;
    quality: number;
    timeliness: number;
    professionalism: number;
    valueForMoney: number;
  }): number {
    // Weighted average of all factors
    const weights = {
      responsiveness: 0.2,
      quality: 0.3,
      timeliness: 0.2,
      professionalism: 0.15,
      valueForMoney: 0.15,
    };

    return Math.round(
      scores.responsiveness * weights.responsiveness +
        scores.quality * weights.quality +
        scores.timeliness * weights.timeliness +
        scores.professionalism * weights.professionalism +
        scores.valueForMoney * weights.valueForMoney,
    );
  }

  private calculateOverallScore(
    vendorPerformance: VendorPerformanceMetric[],
  ): number {
    if (vendorPerformance.length === 0) return 0;

    const totalScore = vendorPerformance.reduce(
      (sum, vendor) => sum + vendor.overallScore,
      0,
    );
    return Math.round(totalScore / vendorPerformance.length);
  }

  // Data fetching methods (would integrate with actual data sources)
  private async getVendorCommunicationData(vendorId: string): Promise<any> {
    // Mock communication data
    return {
      averageResponseTime: 2 + Math.random() * 24,
      responseRate: 0.8 + Math.random() * 0.2,
      qualityRating: 3.5 + Math.random() * 1.5,
      totalInteractions: Math.floor(Math.random() * 50) + 10,
      proactiveUpdates: Math.floor(Math.random() * 10),
      courtesyRating: 3.8 + Math.random() * 1.2,
    };
  }

  private async getVendorTimelineData(vendorId: string): Promise<any> {
    return {
      onTimePercentage: 0.7 + Math.random() * 0.3,
      averageDelay: Math.random() * 5,
      milestoneAdherence: 0.8 + Math.random() * 0.2,
      earlyWarnings: Math.floor(Math.random() * 5),
    };
  }

  private async getVendorQualityData(vendorId: string): Promise<any> {
    return {
      workQuality: 3.5 + Math.random() * 1.5,
      attentionToDetail: 3.0 + Math.random() * 2.0,
      creativity: 3.5 + Math.random() * 1.5,
    };
  }

  private async getVendorValueData(vendor: SelectedVendor): Promise<any> {
    return {
      marketAverage: vendor.contract.value * (0.8 + Math.random() * 0.4),
      qualityScore: 3.5 + Math.random() * 1.5,
      addedValue: 3.0 + Math.random() * 2.0,
    };
  }

  private async getVendorSatisfactionData(vendorId: string): Promise<any> {
    return {
      recommendationScore: 3.5 + Math.random() * 1.5,
      expectationsMet: Math.random() > 0.3,
      strengths: ['Professional', 'Creative', 'Reliable'],
      improvements: ['Communication', 'Timeliness'],
      testimonial: 'Great vendor to work with!',
    };
  }

  // Utility methods
  private groupVendorsByCategory(vendors: SelectedVendor[]): {
    [category: string]: SelectedVendor[];
  } {
    return vendors.reduce(
      (groups, vendor) => {
        const category = vendor.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(vendor);
        return groups;
      },
      {} as { [category: string]: SelectedVendor[] },
    );
  }

  private calculateRank(
    vendor: VendorPerformanceMetric,
    allVendors: VendorPerformanceMetric[],
  ): number {
    const sorted = allVendors.sort((a, b) => b.overallScore - a.overallScore);
    return sorted.findIndex((v) => v.vendorId === vendor.vendorId) + 1;
  }

  private calculatePercentile(
    vendor: VendorPerformanceMetric,
    allVendors: VendorPerformanceMetric[],
  ): number {
    const worseCount = allVendors.filter(
      (v) => v.overallScore < vendor.overallScore,
    ).length;
    return Math.round((worseCount / allVendors.length) * 100);
  }

  private identifyStrengths(vendor: VendorPerformanceMetric): string[] {
    const strengths: string[] = [];

    if (vendor.responsiveness >= 90) strengths.push('Excellent Communication');
    if (vendor.quality >= 90) strengths.push('High Quality Work');
    if (vendor.timeliness >= 90) strengths.push('Always On Time');
    if (vendor.professionalism >= 90) strengths.push('Very Professional');
    if (vendor.valueForMoney >= 90) strengths.push('Great Value');

    return strengths;
  }

  private identifyWeaknesses(vendor: VendorPerformanceMetric): string[] {
    const weaknesses: string[] = [];

    if (vendor.responsiveness < 70) weaknesses.push('Slow Response Times');
    if (vendor.quality < 70) weaknesses.push('Quality Concerns');
    if (vendor.timeliness < 70) weaknesses.push('Timeline Issues');
    if (vendor.professionalism < 70) weaknesses.push('Professionalism Issues');
    if (vendor.valueForMoney < 70) weaknesses.push('Value Concerns');

    return weaknesses;
  }

  private async generateReplacementSuggestions(
    concerningVendorIds: string[],
  ): Promise<any[]> {
    // AI-powered replacement vendor suggestions
    return concerningVendorIds.map((vendorId) => ({
      currentVendorId: vendorId,
      suggestedVendorId: `replacement_${vendorId}`,
      improvementAreas: ['Better Communication', 'Improved Timeliness'],
      switchingCost: 500,
      timeline: '2-3 weeks',
      riskLevel: 'medium',
    }));
  }
}
