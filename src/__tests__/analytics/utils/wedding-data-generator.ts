/**
 * Wedding Data Generator - Test Data Creation Utility
 * WS-332 Team E - Generates realistic wedding data for analytics testing
 */

import {
  WeddingData,
  SeasonalWeddingData,
  WeddingStyleData,
  CrossPlatformData,
  HistoricalWeddingData,
} from '../../../types/analytics-testing';

export interface WeddingRevenueSample {
  vendorType: 'photographer' | 'venue' | 'florist' | 'caterer' | 'planner';
  weddingsCount: number;
  dateRange: { start: string; end: string };
  revenueRange: { min: number; max: number };
}

export interface SeasonalDataConfig {
  years: number;
  seasonalVariation: boolean;
  weddingCountRange: { min: number; max: number };
}

export interface WeddingStyleDataConfig {
  styles: string[];
  weddingsPerStyle: number;
  revenueVariation: boolean;
}

export interface CrossPlatformDataConfig {
  dataSources: Array<{ type: string; connection: string }>;
  dataConsistency: boolean;
  timeRange: { hours: number };
}

export interface HistoricalDataConfig {
  years: number;
  includeSeasonality: boolean;
  includeTrends: boolean;
  includeExternalFactors: boolean;
}

export class WeddingDataGenerator {
  private readonly weddingStyles = [
    'rustic',
    'modern',
    'traditional',
    'boho',
    'luxury',
    'vintage',
    'destination',
    'garden',
    'beach',
    'barn',
    'church',
    'courthouse',
  ];

  private readonly vendorTypes = [
    'photographer',
    'venue',
    'florist',
    'caterer',
    'planner',
    'musician',
    'videographer',
    'decorator',
    'baker',
    'transport',
  ];

  private readonly venues = [
    'The Grand Ballroom',
    'Rustic Barn Venue',
    'Garden Manor',
    'Beachside Resort',
    'Historic Chapel',
    'Modern Loft',
    'Castle Estate',
  ];

  /**
   * Generate wedding revenue sample data for testing
   */
  async generateWeddingRevenueSample(
    config: WeddingRevenueSample,
  ): Promise<any> {
    const vendorId = this.generateVendorId(config.vendorType);
    const weddings: any[] = [];
    const inquiries: any[] = [];

    // Generate weddings
    for (let i = 0; i < config.weddingsCount; i++) {
      const weddingDate = this.generateRandomDateInRange(
        config.dateRange.start,
        config.dateRange.end,
      );
      const revenue = this.generateRevenueInRange(
        config.revenueRange.min,
        config.revenueRange.max,
      );

      const wedding = {
        id: `wedding_${vendorId}_${i + 1}`,
        vendorId,
        date: weddingDate,
        totalValue: revenue,
        revenue,
        status: 'booked',
        style: this.getRandomWeddingStyle(),
        guestCount: Math.floor(Math.random() * 200) + 50,
        venue: this.getRandomVenue(),
        clientId: `client_${i + 1}`,
        bookingDate: this.generateBookingDate(weddingDate),
        paymentSchedule: this.generatePaymentSchedule(revenue),
        services: this.generateServicesForVendorType(config.vendorType),
      };

      weddings.push(wedding);
    }

    // Generate inquiries (more inquiries than bookings for realistic conversion rates)
    const inquiryCount = Math.floor(config.weddingsCount * 4); // 25% conversion rate
    for (let i = 0; i < inquiryCount; i++) {
      const inquiryDate = this.generateRandomDateInRange(
        new Date(config.dateRange.start).toISOString(),
        new Date().toISOString(),
      );

      const inquiry = {
        id: `inquiry_${vendorId}_${i + 1}`,
        vendorId,
        date: inquiryDate,
        status: i < config.weddingsCount ? 'converted' : 'declined',
        estimatedValue: this.generateRevenueInRange(
          config.revenueRange.min,
          config.revenueRange.max,
        ),
        source: this.getRandomInquirySource(),
        responseTime: Math.floor(Math.random() * 48) + 1, // hours
      };

      inquiries.push(inquiry);
    }

    return {
      vendorId,
      vendorType: config.vendorType,
      weddings,
      inquiries,
      generatedAt: new Date(),
      dataRange: config.dateRange,
      summary: {
        totalWeddings: weddings.length,
        totalInquiries: inquiries.length,
        totalRevenue: weddings.reduce((sum, w) => sum + w.totalValue, 0),
        averageWeddingValue:
          weddings.reduce((sum, w) => sum + w.totalValue, 0) / weddings.length,
        conversionRate: (weddings.length / inquiries.length) * 100,
      },
    };
  }

  /**
   * Generate seasonal wedding data with patterns
   */
  async generateSeasonalWeddingData(config: SeasonalDataConfig): Promise<any> {
    const vendorId = this.generateVendorId('photographer');
    const data: any[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - config.years);

    // Generate daily data for the specified years
    const totalDays = config.years * 365;

    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      const seasonalMultiplier = this.getSeasonalMultiplier(
        currentDate,
        config.seasonalVariation,
      );
      const baseWeddingCount =
        (config.weddingCountRange.min + config.weddingCountRange.max) / 2;
      const weddingCount = Math.floor(baseWeddingCount * seasonalMultiplier);

      // Generate weddings for this day
      const dayWeddings = [];
      for (let w = 0; w < weddingCount; w++) {
        dayWeddings.push({
          id: `wedding_${day}_${w}`,
          date: new Date(currentDate),
          revenue: this.generateRevenueInRange(1500, 8000),
          style: this.getRandomWeddingStyle(),
          guestCount: Math.floor(Math.random() * 200) + 50,
        });
      }

      data.push({
        date: new Date(currentDate),
        weddingCount,
        weddings: dayWeddings,
        seasonalFactor: seasonalMultiplier,
        season: this.getSeason(currentDate),
        inquiries: Math.floor(weddingCount * 4), // 4:1 inquiry to booking ratio
        totalRevenue: dayWeddings.reduce((sum, w) => sum + w.revenue, 0),
      });
    }

    return {
      vendorId,
      data,
      summary: {
        totalDays,
        totalWeddings: data.reduce((sum, d) => sum + d.weddingCount, 0),
        seasonalPatterns: this.analyzeSeasonalPatterns(data),
        peakSeasons: this.identifyPeakSeasons(data),
      },
    };
  }

  /**
   * Generate wedding style data for categorization testing
   */
  async generateWeddingStyleData(config: WeddingStyleDataConfig): Promise<any> {
    const vendorId = this.generateVendorId('photographer');
    const weddings: any[] = [];

    config.styles.forEach((style) => {
      for (let i = 0; i < config.weddingsPerStyle; i++) {
        const baseRevenue = this.getBaseRevenueForStyle(style);
        const revenue = config.revenueVariation
          ? baseRevenue + (Math.random() * 2000 - 1000) // +/- 1000 variation
          : baseRevenue;

        const wedding = {
          id: `wedding_${style}_${i + 1}`,
          vendorId,
          style,
          revenue: Math.max(500, revenue), // Minimum revenue
          date: this.generateRandomDateInRange('2024-01-01', '2024-12-31'),
          guestCount: this.getGuestCountForStyle(style),
          venue: this.getVenueForStyle(style),
          services: this.getServicesForStyle(style),
          location: this.getLocationTypeForStyle(style),
        };

        weddings.push(wedding);
      }
    });

    return {
      vendorId,
      weddings,
      styleDistribution: this.calculateStyleDistribution(weddings),
      revenueByStyle: this.calculateRevenueByStyle(weddings),
      summary: {
        totalWeddings: weddings.length,
        stylesIncluded: config.styles,
        averageRevenuePerStyle: config.styles.reduce(
          (acc, style) => {
            const styleWeddings = weddings.filter((w) => w.style === style);
            const avgRevenue =
              styleWeddings.reduce((sum, w) => sum + w.revenue, 0) /
              styleWeddings.length;
            acc[style] = avgRevenue;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }

  /**
   * Generate cross-platform data for synchronization testing
   */
  async generateCrossPlatformData(
    config: CrossPlatformDataConfig,
  ): Promise<any> {
    const baseData = {
      weddings: this.generateWeddingSet(100),
      vendors: this.generateVendorSet(20),
      metrics: this.generateMetricsSet(),
    };

    const platformData: Record<string, any> = {};

    // Generate data for each platform
    config.dataSources.forEach((source) => {
      let platformSpecificData = JSON.parse(JSON.stringify(baseData)); // Deep copy

      if (!config.dataConsistency) {
        // Introduce slight variations for testing sync accuracy
        platformSpecificData = this.introduceDataVariations(
          platformSpecificData,
          source.type,
        );
      }

      // Add platform-specific metadata
      platformSpecificData.metadata = {
        platform: source.type,
        connection: source.connection,
        lastUpdated: new Date(),
        recordCount: platformSpecificData.weddings.length,
        syncVersion: this.generateSyncVersion(),
      };

      platformData[source.type] = platformSpecificData;
    });

    return {
      platformData,
      baselineData: baseData,
      syncMetadata: {
        generateTime: new Date(),
        expectedConsistency: config.dataConsistency,
        timeRange: config.timeRange,
        platforms: config.dataSources.map((ds) => ds.type),
      },
    };
  }

  /**
   * Generate historical wedding data for forecasting
   */
  async generateHistoricalWeddingData(
    config: HistoricalDataConfig,
  ): Promise<any> {
    const vendorId = this.generateVendorId('photographer');
    const monthlyData: any[] = [];

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - config.years);

    for (let month = 0; month < config.years * 12; month++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + month);

      let baseWeddingCount = 8; // Base monthly weddings
      let baseRevenue = 20000; // Base monthly revenue

      // Apply seasonality
      if (config.includeSeasonality) {
        const seasonalFactor = this.getSeasonalMultiplier(currentDate, true);
        baseWeddingCount = Math.floor(baseWeddingCount * seasonalFactor);
        baseRevenue = Math.floor(baseRevenue * seasonalFactor);
      }

      // Apply trends
      if (config.includeTrends) {
        const trendFactor = 1 + month * 0.002; // 0.2% monthly growth
        baseWeddingCount = Math.floor(baseWeddingCount * trendFactor);
        baseRevenue = Math.floor(baseRevenue * trendFactor);
      }

      // Apply external factors
      let externalFactor = 1;
      if (config.includeExternalFactors) {
        // COVID impact simulation for 2020
        if (currentDate.getFullYear() === 2020) {
          externalFactor = 0.3; // 70% reduction
        }
        // Economic boom/bust cycles
        externalFactor *= 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier
      }

      const finalWeddingCount = Math.floor(baseWeddingCount * externalFactor);
      const finalRevenue = Math.floor(baseRevenue * externalFactor);

      monthlyData.push({
        month: new Date(currentDate),
        bookings: finalWeddingCount,
        revenue: finalRevenue,
        inquiries: finalWeddingCount * 4,
        averageWeddingValue: finalRevenue / Math.max(1, finalWeddingCount),
        seasonalFactor: config.includeSeasonality
          ? this.getSeasonalMultiplier(currentDate, true)
          : 1,
        trendFactor: config.includeTrends ? 1 + month * 0.002 : 1,
        externalFactor,
        marketConditions: this.getMarketConditions(currentDate),
      });
    }

    // Create test set (last 20% of data) for model validation
    const testSetSize = Math.floor(monthlyData.length * 0.2);
    const trainSet = monthlyData.slice(0, -testSetSize);
    const testSet = monthlyData.slice(-testSetSize);

    return {
      vendorId,
      trainSet,
      testSet,
      fullDataset: monthlyData,
      summary: {
        totalMonths: monthlyData.length,
        totalWeddings: monthlyData.reduce((sum, d) => sum + d.bookings, 0),
        totalRevenue: monthlyData.reduce((sum, d) => sum + d.revenue, 0),
        averageMonthlyWeddings:
          monthlyData.reduce((sum, d) => sum + d.bookings, 0) /
          monthlyData.length,
        growthRate: this.calculateGrowthRate(monthlyData),
      },
      patterns: {
        seasonalPatterns: config.includeSeasonality
          ? this.analyzeSeasonalPatterns(monthlyData)
          : null,
        trendAnalysis: config.includeTrends
          ? this.analyzeTrends(monthlyData)
          : null,
        externalFactorImpact: config.includeExternalFactors
          ? this.analyzeExternalFactors(monthlyData)
          : null,
      },
    };
  }

  // Helper methods
  private generateVendorId(type: string): string {
    return `${type}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRandomDateInRange(start: string, end: string): Date {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  private generateRevenueInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomWeddingStyle(): string {
    return this.weddingStyles[
      Math.floor(Math.random() * this.weddingStyles.length)
    ];
  }

  private getRandomVenue(): string {
    return this.venues[Math.floor(Math.random() * this.venues.length)];
  }

  private getRandomInquirySource(): string {
    const sources = [
      'website',
      'referral',
      'social_media',
      'google_ads',
      'wedding_show',
      'directory',
    ];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private generateBookingDate(weddingDate: Date): Date {
    // Most weddings are booked 6-18 months in advance
    const monthsInAdvance = Math.floor(Math.random() * 12) + 6;
    const bookingDate = new Date(weddingDate);
    bookingDate.setMonth(bookingDate.getMonth() - monthsInAdvance);
    return bookingDate;
  }

  private generatePaymentSchedule(totalRevenue: number): any[] {
    return [
      { amount: totalRevenue * 0.3, dueDate: 'booking', type: 'deposit' },
      {
        amount: totalRevenue * 0.4,
        dueDate: '30_days_before',
        type: 'interim',
      },
      { amount: totalRevenue * 0.3, dueDate: 'wedding_day', type: 'final' },
    ];
  }

  private generateServicesForVendorType(vendorType: string): string[] {
    const servicesByType = {
      photographer: [
        'engagement_shoot',
        'wedding_day',
        'album',
        'prints',
        'digital_gallery',
      ],
      venue: [
        'ceremony_space',
        'reception_hall',
        'catering',
        'bar_service',
        'coordination',
      ],
      florist: [
        'bridal_bouquet',
        'bridesmaids_bouquets',
        'ceremony_flowers',
        'reception_centerpieces',
      ],
      caterer: ['appetizers', 'dinner', 'dessert', 'bar_service', 'staff'],
      planner: [
        'full_planning',
        'coordination',
        'vendor_management',
        'timeline_creation',
      ],
    };

    return (
      servicesByType[vendorType as keyof typeof servicesByType] || [
        'general_services',
      ]
    );
  }

  private getSeasonalMultiplier(date: Date, includeVariation: boolean): number {
    const month = date.getMonth();
    let multiplier = 1;

    // Wedding season patterns
    if (month >= 2 && month <= 4) {
      // Mar-May (Spring)
      multiplier = 1.8;
    } else if (month >= 5 && month <= 7) {
      // Jun-Aug (Summer)
      multiplier = 2.2;
    } else if (month >= 8 && month <= 10) {
      // Sep-Nov (Fall)
      multiplier = 1.4;
    } else {
      // Dec-Feb (Winter)
      multiplier = 0.6;
    }

    // Add random variation if requested
    if (includeVariation) {
      multiplier *= 0.8 + Math.random() * 0.4; // +/- 20% variation
    }

    return multiplier;
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getBaseRevenueForStyle(style: string): number {
    const baseRevenues = {
      luxury: 8000,
      destination: 6000,
      modern: 3500,
      traditional: 3000,
      garden: 2800,
      rustic: 2500,
      boho: 2200,
      vintage: 2000,
      beach: 3200,
      barn: 2400,
      church: 2600,
      courthouse: 1500,
    };

    return baseRevenues[style as keyof typeof baseRevenues] || 2500;
  }

  private getGuestCountForStyle(style: string): number {
    const baseCounts = {
      luxury: 150,
      destination: 80,
      traditional: 180,
      modern: 120,
      courthouse: 20,
    };

    const base = baseCounts[style as keyof typeof baseCounts] || 100;
    return base + Math.floor(Math.random() * 50) - 25; // +/- 25 variation
  }

  private getVenueForStyle(style: string): string {
    const venuesByStyle = {
      luxury: 'Five-Star Hotel',
      rustic: 'Historic Barn',
      garden: 'Botanical Garden',
      beach: 'Oceanfront Resort',
      modern: 'Contemporary Loft',
      traditional: 'Historic Church',
      courthouse: 'City Hall',
    };

    return (
      venuesByStyle[style as keyof typeof venuesByStyle] || 'Private Estate'
    );
  }

  private getServicesForStyle(style: string): string[] {
    const servicesByStyle = {
      luxury: [
        'premium_photography',
        'videography',
        'full_coordination',
        'floral_design',
        'premium_catering',
      ],
      rustic: [
        'casual_photography',
        'diy_coordination',
        'local_catering',
        'simple_florals',
      ],
      destination: [
        'travel_photography',
        'local_planning',
        'cultural_elements',
      ],
    };

    return (
      servicesByStyle[style as keyof typeof servicesByStyle] || [
        'standard_services',
      ]
    );
  }

  private getLocationTypeForStyle(style: string): string {
    const locationsByStyle = {
      destination: 'international',
      beach: 'coastal',
      garden: 'outdoor',
      courthouse: 'urban',
      barn: 'rural',
    };

    return locationsByStyle[style as keyof typeof locationsByStyle] || 'local';
  }

  private generateWeddingSet(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `wedding_${i + 1}`,
      date: this.generateRandomDateInRange('2024-01-01', '2024-12-31'),
      revenue: this.generateRevenueInRange(1000, 8000),
      style: this.getRandomWeddingStyle(),
      status: 'booked',
    }));
  }

  private generateVendorSet(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `vendor_${i + 1}`,
      type: this.vendorTypes[
        Math.floor(Math.random() * this.vendorTypes.length)
      ],
      name: `Test Vendor ${i + 1}`,
      rating: Math.random() * 2 + 3, // 3-5 star rating
    }));
  }

  private generateMetricsSet(): any {
    return {
      totalRevenue: Math.floor(Math.random() * 100000) + 50000,
      averageWeddingValue: Math.floor(Math.random() * 3000) + 2000,
      conversionRate: Math.random() * 20 + 10, // 10-30%
      customerSatisfaction: Math.random() * 2 + 3, // 3-5 rating
    };
  }

  private introduceDataVariations(data: any, platformType: string): any {
    // Introduce slight variations based on platform type
    const variationFactor = platformType === 'redis' ? 0.01 : 0.005; // Redis more volatile

    data.weddings.forEach((wedding: any) => {
      if (Math.random() < variationFactor) {
        wedding.revenue += Math.floor(Math.random() * 200) - 100; // +/- 100 variation
      }
    });

    return data;
  }

  private generateSyncVersion(): string {
    return `v${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}`;
  }

  private calculateStyleDistribution(weddings: any[]): Record<string, number> {
    return weddings.reduce(
      (acc, wedding) => {
        acc[wedding.style] = (acc[wedding.style] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculateRevenueByStyle(weddings: any[]): Record<string, number> {
    const styleGroups = weddings.reduce(
      (acc, wedding) => {
        if (!acc[wedding.style]) acc[wedding.style] = [];
        acc[wedding.style].push(wedding.revenue);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.keys(styleGroups).reduce(
      (acc, style) => {
        const revenues = styleGroups[style];
        acc[style] = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private analyzeSeasonalPatterns(data: any[]): any {
    const seasonalData = data.reduce(
      (acc, item) => {
        const season = this.getSeason(new Date(item.date || item.month));
        if (!acc[season]) acc[season] = [];
        acc[season].push(item.weddingCount || item.bookings || 0);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.keys(seasonalData).reduce(
      (acc, season) => {
        const counts = seasonalData[season];
        acc[season] = {
          average: counts.reduce((sum, c) => sum + c, 0) / counts.length,
          total: counts.reduce((sum, c) => sum + c, 0),
          peak: Math.max(...counts),
        };
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private identifyPeakSeasons(data: any[]): string[] {
    const patterns = this.analyzeSeasonalPatterns(data);
    const averages = Object.keys(patterns).map((season) => ({
      season,
      average: patterns[season].average,
    }));

    const overallAverage =
      averages.reduce((sum, s) => sum + s.average, 0) / averages.length;

    return averages
      .filter((s) => s.average > overallAverage * 1.2) // 20% above average
      .map((s) => s.season);
  }

  private getMarketConditions(date: Date): string {
    const year = date.getFullYear();
    if (year === 2020) return 'recession';
    if (year >= 2021 && year <= 2022) return 'recovery';
    return 'stable';
  }

  private calculateGrowthRate(data: any[]): number {
    if (data.length < 2) return 0;

    const firstYear = data.slice(0, 12).reduce((sum, d) => sum + d.bookings, 0);
    const lastYear = data.slice(-12).reduce((sum, d) => sum + d.bookings, 0);

    return ((lastYear - firstYear) / firstYear) * 100;
  }

  private calculateLinearSlope(months: number[], bookings: number[]): number {
    const n = months.length;
    const sumX = months.reduce((sum, x) => sum + x, 0);
    const sumY = bookings.reduce((sum, y) => sum + y, 0);
    const sumXY = months.reduce((sum, x, i) => sum + x * bookings[i], 0);
    const sumX2 = months.reduce((sum, x) => sum + x * x, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private determineTrendDirection(slope: number): string {
    if (slope > 0) {
      return 'increasing';
    } else if (slope < 0) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private calculateTrendSignificance(slope: number): string {
    return Math.abs(slope) > 0.1 ? 'significant' : 'minimal';
  }

  private analyzeTrends(data: any[]): any {
    // Simple linear trend analysis
    const months = data.map((d, i) => i);
    const bookings = data.map((d) => d.bookings);

    // Calculate slope (trend)
    const slope = this.calculateLinearSlope(months, bookings);

    const trend = this.determineTrendDirection(slope);

    return {
      monthlyGrowthRate: slope,
      trend,
      significance: this.calculateTrendSignificance(slope),
    };
  }

  private analyzeExternalFactors(data: any[]): any {
    const factorImpacts = data.map((d) => ({
      date: d.month,
      impact: d.externalFactor,
      deviation: Math.abs(d.externalFactor - 1),
    }));

    const highImpactPeriods = factorImpacts.filter((f) => f.deviation > 0.2);
    const averageImpact =
      factorImpacts.reduce((sum, f) => sum + f.impact, 0) /
      factorImpacts.length;

    return {
      averageImpact,
      highImpactPeriods: highImpactPeriods.length,
      volatility:
        factorImpacts.reduce((sum, f) => sum + f.deviation, 0) /
        factorImpacts.length,
      majorDisruptions: factorImpacts.filter((f) => f.impact < 0.5).length,
    };
  }
}
