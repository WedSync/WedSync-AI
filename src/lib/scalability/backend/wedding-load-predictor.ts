/**
 * WS-340: Wedding Load Predictor
 * Team B - Backend/API Development
 *
 * ML-powered wedding load prediction with seasonal intelligence
 * Predicts capacity needs for wedding season and individual wedding days
 */

import {
  WeddingEvent,
  WeddingSeason,
  WeddingSeasonPrediction,
  WeddingDayPrediction,
  WeeklyLoadPrediction,
  HourlyLoadPrediction,
  CapacityRecommendation,
  LoadPrediction,
} from '../types/core';

export interface HistoricalDataService {
  getHistoricalWeddingSeasons(
    startYear: number,
    endYear: number,
  ): Promise<any[]>;
  getWeddingsByDateRange(start: Date, end: Date): Promise<WeddingEvent[]>;
  getLoadDataForPeriod(start: Date, end: Date): Promise<any[]>;
}

export interface WeddingScheduleService {
  getWeddingsInSeason(season: WeddingSeason): Promise<WeddingEvent[]>;
  getWeddingsInDateRange(start: Date, end: Date): Promise<WeddingEvent[]>;
  getUpcomingWeddings(hours: number): Promise<WeddingEvent[]>;
}

export interface MLPredictionService {
  predictLoad(features: any[]): Promise<LoadPrediction>;
  trainModel(historicalData: any[]): Promise<void>;
  getModelAccuracy(): Promise<number>;
}

export class WeddingLoadPredictor {
  private readonly historicalDataService: HistoricalDataService;
  private readonly weddingScheduleService: WeddingScheduleService;
  private readonly mlPredictionService: MLPredictionService;
  private predictionCache: Map<string, any> = new Map();
  private lastCacheClean: Date = new Date();

  constructor() {
    // Initialize services (in production these would be injected)
    this.historicalDataService = new MockHistoricalDataService();
    this.weddingScheduleService = new MockWeddingScheduleService();
    this.mlPredictionService = new MockMLPredictionService();
  }

  async predictWeddingSeasonLoad(
    season: WeddingSeason,
  ): Promise<WeddingSeasonPrediction> {
    const seasonId = this.generateSeasonId(season);
    const cacheKey = `season_${seasonId}`;

    // Check cache first
    if (this.predictionCache.has(cacheKey)) {
      const cached = this.predictionCache.get(cacheKey);
      if (cached.validUntil > new Date()) {
        console.log(
          `[WeddingLoadPredictor] Returning cached season prediction: ${seasonId}`,
        );
        return cached;
      }
    }

    const startTime = Date.now();

    try {
      console.log(
        `[WeddingLoadPredictor] Generating season prediction: ${seasonId}`,
      );

      // Gather historical wedding season data
      const historicalSeasons =
        await this.historicalDataService.getHistoricalWeddingSeasons(
          season.year - 3,
          season.year - 1,
        );

      // Get upcoming wedding schedule
      const upcomingWeddings =
        await this.weddingScheduleService.getWeddingsInSeason(season);
      console.log(
        `[WeddingLoadPredictor] Found ${upcomingWeddings.length} weddings in season`,
      );

      // Analyze wedding patterns
      const weddingPatterns = await this.analyzeWeddingPatterns({
        historicalSeasons,
        upcomingWeddings,
        seasonCharacteristics: season,
      });

      // Generate load predictions for each week of the season
      const weeklyPredictions: WeeklyLoadPrediction[] = [];

      for (const week of season.weeks) {
        const weeklyWeddings = upcomingWeddings.filter((w) =>
          this.isInWeek(w.date, week),
        );

        const prediction = await this.predictWeeklyLoad({
          week,
          weddings: weeklyWeddings,
          historicalPattern: weddingPatterns.weeklyPatterns.find(
            (p) => p.week === week.weekNumber,
          ),
          seasonalFactors: weddingPatterns.seasonalFactors,
        });

        weeklyPredictions.push(prediction);
      }

      // Generate peak day predictions
      const peakDayPredictions = await this.predictPeakDays(
        upcomingWeddings,
        historicalSeasons,
        weddingPatterns,
      );

      // Calculate required capacity recommendations
      const capacityRecommendations =
        await this.generateCapacityRecommendations({
          weeklyPredictions,
          peakDayPredictions,
          currentCapacity: await this.getCurrentCapacity(),
          bufferRequirements: season.bufferRequirements,
        });

      const prediction: WeddingSeasonPrediction = {
        seasonId,
        season,
        weeklyPredictions,
        peakDayPredictions,
        capacityRecommendations,
        confidence: this.calculatePredictionConfidence(weddingPatterns),
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week validity
      };

      // Cache the prediction
      this.predictionCache.set(cacheKey, prediction);

      console.log(
        `[WeddingLoadPredictor] Season prediction generated in ${Date.now() - startTime}ms`,
      );
      return prediction;
    } catch (error) {
      console.error(
        `[WeddingLoadPredictor] Season prediction failed for ${seasonId}:`,
        error,
      );
      throw new Error(
        `Wedding season prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async predictWeddingDayLoad(
    wedding: WeddingEvent,
  ): Promise<WeddingDayPrediction> {
    const cacheKey = `wedding_${wedding.id}`;

    // Check cache first
    if (this.predictionCache.has(cacheKey)) {
      const cached = this.predictionCache.get(cacheKey);
      if (cached.confidence > 0.8) {
        console.log(
          `[WeddingLoadPredictor] Returning cached wedding prediction: ${wedding.id}`,
        );
        return cached;
      }
    }

    const startTime = Date.now();

    try {
      console.log(
        `[WeddingLoadPredictor] Generating wedding day prediction: ${wedding.id}`,
      );

      const weddingSize = this.categorizeWeddingSize(wedding);
      const weddingType = this.determineWeddingType(wedding);

      // Find similar historical weddings
      const similarWeddings = await this.findSimilarWeddings({
        size: weddingSize,
        type: weddingType,
        dayOfWeek: wedding.date.getDay(),
        month: wedding.date.getMonth(),
        vendorCount: wedding.vendors.length,
      });

      console.log(
        `[WeddingLoadPredictor] Found ${similarWeddings.length} similar weddings for analysis`,
      );

      // Analyze historical load patterns
      const loadPatterns =
        await this.analyzeHistoricalLoadPatterns(similarWeddings);

      // Generate hourly load predictions
      const hourlyPredictions: HourlyLoadPrediction[] = [];

      for (let hour = 0; hour < 24; hour++) {
        const hourPrediction = await this.predictHourlyLoad({
          wedding,
          hour,
          loadPatterns,
          weddingPhase: this.determineWeddingPhase(hour, wedding.schedule),
        });

        hourlyPredictions.push(hourPrediction);
      }

      // Identify peak load periods
      const peakPeriods = this.identifyPeakPeriods(hourlyPredictions);
      console.log(
        `[WeddingLoadPredictor] Identified ${peakPeriods.length} peak periods`,
      );

      // Generate scaling timeline
      const scalingTimeline = await this.generateWeddingScalingTimeline({
        wedding,
        hourlyPredictions,
        peakPeriods,
        currentCapacity: await this.getCurrentCapacity(),
      });

      const prediction: WeddingDayPrediction = {
        weddingId: wedding.id,
        weddingDate: wedding.date,
        weddingSize,
        weddingType,
        hourlyPredictions,
        peakPeriods,
        scalingTimeline,
        expectedPeakLoad: Math.max(
          ...hourlyPredictions.map((p) => p.predictedLoad),
        ),
        recommendedPreScaling: scalingTimeline.preScalingActions,
        confidence: this.calculateWeddingPredictionConfidence(
          similarWeddings.length,
        ),
      };

      // Cache the prediction
      this.predictionCache.set(cacheKey, prediction);

      console.log(
        `[WeddingLoadPredictor] Wedding prediction generated in ${Date.now() - startTime}ms`,
      );
      return prediction;
    } catch (error) {
      console.error(
        `[WeddingLoadPredictor] Wedding prediction failed for ${wedding.id}:`,
        error,
      );
      throw new Error(
        `Wedding day prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getUpcomingWeddings(hours: number): Promise<WeddingEvent[]> {
    const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    return await this.weddingScheduleService.getUpcomingWeddings(hours);
  }

  async getCurrentSeasonInfo(): Promise<{
    isPeak: boolean;
    demandMultiplier: number;
    seasonName: string;
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Wedding season is typically May through October
    const isPeak = currentMonth >= 4 && currentMonth <= 9;

    let demandMultiplier = 1.0;
    let seasonName = 'off-season';

    if (isPeak) {
      seasonName = 'wedding-season';
      // Peak months (June, July, August, September) have higher multipliers
      if (currentMonth >= 5 && currentMonth <= 8) {
        demandMultiplier = 2.0; // June-September
        if (currentMonth === 5 || currentMonth === 8) {
          // June & September
          demandMultiplier = 2.5;
        }
      } else {
        demandMultiplier = 1.5; // May & October
      }
    }

    return {
      isPeak,
      demandMultiplier,
      seasonName,
    };
  }

  private generateSeasonId(season: WeddingSeason): string {
    return `${season.year}_${season.season}`;
  }

  private isInWeek(date: Date, week: any): boolean {
    return date >= week.startDate && date <= week.endDate;
  }

  private async analyzeWeddingPatterns(context: {
    historicalSeasons: any[];
    upcomingWeddings: WeddingEvent[];
    seasonCharacteristics: WeddingSeason;
  }): Promise<any> {
    // Analyze patterns from historical data
    const weeklyPatterns = this.extractWeeklyPatterns(
      context.historicalSeasons,
    );
    const seasonalFactors = this.calculateSeasonalFactors(
      context.seasonCharacteristics,
    );
    const weddingTypeDistribution = this.analyzeWeddingTypes(
      context.upcomingWeddings,
    );

    return {
      weeklyPatterns,
      seasonalFactors,
      weddingTypeDistribution,
      totalExpectedWeddings: context.upcomingWeddings.length,
      averageWeddingSize:
        context.upcomingWeddings.reduce((sum, w) => sum + w.expectedGuests, 0) /
        context.upcomingWeddings.length,
    };
  }

  private extractWeeklyPatterns(historicalSeasons: any[]): any[] {
    // Mock implementation - in production would analyze real historical data
    const patterns = [];

    for (let week = 1; week <= 52; week++) {
      patterns.push({
        week,
        averageLoad: 100 + Math.sin((week / 52) * 2 * Math.PI) * 50, // Seasonal sine wave
        peakLoad: 150 + Math.sin((week / 52) * 2 * Math.PI) * 75,
        confidence: 0.8,
      });
    }

    return patterns;
  }

  private calculateSeasonalFactors(season: WeddingSeason): any[] {
    const factors = [];

    // Base seasonal multipliers
    switch (season.season) {
      case 'spring':
        factors.push({
          name: 'spring_buildup',
          multiplier: 1.3,
          confidence: 0.9,
        });
        break;
      case 'summer':
        factors.push({
          name: 'peak_season',
          multiplier: 2.0,
          confidence: 0.95,
        });
        break;
      case 'fall':
        factors.push({ name: 'fall_rush', multiplier: 1.8, confidence: 0.9 });
        break;
      case 'winter':
        factors.push({
          name: 'holiday_season',
          multiplier: 0.8,
          confidence: 0.85,
        });
        break;
    }

    // Add day-of-week factors
    factors.push(
      { name: 'saturday_premium', multiplier: 3.0, confidence: 0.98 },
      { name: 'sunday_moderate', multiplier: 1.5, confidence: 0.95 },
      { name: 'friday_growing', multiplier: 1.2, confidence: 0.85 },
    );

    return factors;
  }

  private analyzeWeddingTypes(weddings: WeddingEvent[]): any {
    const distribution = {
      intimate: weddings.filter((w) => w.type === 'intimate').length,
      medium: weddings.filter((w) => w.type === 'medium').length,
      large: weddings.filter((w) => w.type === 'large').length,
      luxury: weddings.filter((w) => w.type === 'luxury').length,
    };

    return {
      distribution,
      percentages: {
        intimate: (distribution.intimate / weddings.length) * 100,
        medium: (distribution.medium / weddings.length) * 100,
        large: (distribution.large / weddings.length) * 100,
        luxury: (distribution.luxury / weddings.length) * 100,
      },
    };
  }

  private async predictWeeklyLoad(context: any): Promise<WeeklyLoadPrediction> {
    const baseLoad = context.historicalPattern?.averageLoad || 100;
    const weddingMultiplier = this.calculateWeddingLoadMultiplier(
      context.weddings,
    );
    const seasonalMultiplier =
      context.seasonalFactors.reduce(
        (sum: number, f: any) => sum + f.multiplier,
        0,
      ) / context.seasonalFactors.length;

    const predictedLoad = baseLoad * weddingMultiplier * seasonalMultiplier;

    return {
      weekNumber: context.week.weekNumber,
      weekStart: context.week.startDate,
      weekEnd: context.week.endDate,
      weddingCount: context.weddings.length,
      predictedLoad: Math.round(predictedLoad),
      confidence: this.calculateWeeklyConfidence(context),
      peakDays: context.weddings.map((w: WeddingEvent) => ({
        date: w.date,
        expectedLoad: predictedLoad * 1.5,
      })),
    };
  }

  private calculateWeddingLoadMultiplier(weddings: WeddingEvent[]): number {
    if (weddings.length === 0) return 0.5; // Low load week

    let multiplier = 0.8; // Base multiplier

    for (const wedding of weddings) {
      switch (wedding.type) {
        case 'intimate':
          multiplier += 0.1;
          break;
        case 'medium':
          multiplier += 0.3;
          break;
        case 'large':
          multiplier += 0.6;
          break;
        case 'luxury':
          multiplier += 1.0;
          break;
      }
    }

    return Math.min(multiplier, 3.0); // Cap at 3x
  }

  private calculateWeeklyConfidence(context: any): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence with more weddings (more predictable)
    if (context.weddings.length > 0) {
      confidence += Math.min(context.weddings.length * 0.1, 0.2);
    }

    // Historical data availability affects confidence
    if (context.historicalPattern) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private async predictPeakDays(
    upcomingWeddings: WeddingEvent[],
    historicalSeasons: any[],
    weddingPatterns: any,
  ): Promise<any[]> {
    const peakDays = [];

    // Group weddings by date
    const weddingsByDate = new Map<string, WeddingEvent[]>();

    for (const wedding of upcomingWeddings) {
      const dateKey = wedding.date.toISOString().split('T')[0];
      if (!weddingsByDate.has(dateKey)) {
        weddingsByDate.set(dateKey, []);
      }
      weddingsByDate.get(dateKey)!.push(wedding);
    }

    // Identify peak days (days with multiple weddings or luxury weddings)
    for (const [dateKey, weddings] of weddingsByDate.entries()) {
      const isPeakDay =
        weddings.length > 1 || weddings.some((w) => w.type === 'luxury');

      if (isPeakDay) {
        const totalLoad = weddings.reduce(
          (sum, w) => sum + this.getWeddingLoadFactor(w),
          0,
        );

        peakDays.push({
          date: new Date(dateKey),
          weddingCount: weddings.length,
          weddings: weddings.map((w) => ({
            id: w.id,
            type: w.type,
            guests: w.expectedGuests,
          })),
          predictedLoad: totalLoad * 150, // Base load * multiplier
          confidence: 0.9,
          recommendations: this.generatePeakDayRecommendations(
            weddings,
            totalLoad,
          ),
        });
      }
    }

    return peakDays.sort((a, b) => b.predictedLoad - a.predictedLoad);
  }

  private getWeddingLoadFactor(wedding: WeddingEvent): number {
    const typeFactors = {
      intimate: 0.5,
      medium: 1.0,
      large: 2.0,
      luxury: 3.0,
    };

    const baseFactor = typeFactors[wedding.type] || 1.0;
    const guestFactor = Math.min(wedding.expectedGuests / 100, 2.0); // Cap at 2x for guests
    const vendorFactor = Math.min(wedding.vendors.length / 10, 1.5); // Cap at 1.5x for vendors

    return baseFactor * guestFactor * vendorFactor;
  }

  private generatePeakDayRecommendations(
    weddings: WeddingEvent[],
    totalLoad: number,
  ): string[] {
    const recommendations = [];

    if (totalLoad > 3.0) {
      recommendations.push(
        'Pre-scale all critical services 2 hours before first wedding',
      );
      recommendations.push('Enable emergency scaling protocols');
      recommendations.push(
        'Increase monitoring frequency to 30-second intervals',
      );
    }

    if (weddings.length > 2) {
      recommendations.push(
        'Stagger pre-scaling actions to avoid resource conflicts',
      );
      recommendations.push('Prepare additional database read replicas');
    }

    if (weddings.some((w) => w.type === 'luxury')) {
      recommendations.push(
        'Allocate premium infrastructure for luxury weddings',
      );
      recommendations.push('Enable white-glove monitoring for VIP events');
    }

    return recommendations;
  }

  private categorizeWeddingSize(wedding: WeddingEvent): string {
    if (wedding.expectedGuests <= 50) return 'intimate';
    if (wedding.expectedGuests <= 100) return 'small';
    if (wedding.expectedGuests <= 200) return 'medium';
    if (wedding.expectedGuests <= 300) return 'large';
    return 'luxury';
  }

  private determineWeddingType(wedding: WeddingEvent): string {
    // In production, this would analyze multiple factors
    return wedding.type;
  }

  private async findSimilarWeddings(criteria: {
    size: string;
    type: string;
    dayOfWeek: number;
    month: number;
    vendorCount: number;
  }): Promise<WeddingEvent[]> {
    // Mock implementation - in production would query historical database
    const similarWeddings: WeddingEvent[] = [];

    // Generate some mock similar weddings for testing
    for (let i = 0; i < Math.min(5 + Math.floor(Math.random() * 10), 20); i++) {
      similarWeddings.push({
        id: `historical_wedding_${i}`,
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random past date
        type: criteria.type as any,
        expectedGuests: 50 + Math.floor(Math.random() * 200),
        vendors: Array(criteria.vendorCount + Math.floor(Math.random() * 3))
          .fill(null)
          .map((_, j) => ({
            id: `vendor_${j}`,
            type: 'photographer',
            expectedActivity: 'moderate' as any,
          })),
        venue: {
          id: 'venue_1',
          type: 'outdoor',
          capacity: 200,
          techRequirements: [],
        },
        schedule: {
          events: [],
          duration: 8,
          timeZone: 'America/New_York',
        },
        predictedLoad: {
          predictedLoad: 100,
          confidence: 0.8,
          timeframe: '1day',
          factors: [],
        },
      });
    }

    return similarWeddings;
  }

  private async analyzeHistoricalLoadPatterns(
    similarWeddings: WeddingEvent[],
  ): Promise<any> {
    // Mock implementation - would analyze real historical load data
    const patterns = {
      hourlyPatterns: Array(24)
        .fill(0)
        .map((_, hour) => ({
          hour,
          averageLoad: this.getHourlyBaseLoad(hour),
          peakLoad: this.getHourlyBaseLoad(hour) * 1.5,
          confidence: 0.8,
        })),
      dayOfWeekPattern: this.getDayOfWeekPattern(),
      seasonalPattern: this.getSeasonalPattern(),
    };

    return patterns;
  }

  private getHourlyBaseLoad(hour: number): number {
    // Wedding day load pattern - low at night, peak during day
    if (hour < 6 || hour > 22) return 10; // Night time - very low
    if (hour < 9) return 30; // Early morning - prep time
    if (hour < 12) return 80; // Morning - setup and preparation
    if (hour < 15) return 150; // Afternoon - ceremony time (peak)
    if (hour < 18) return 120; // Late afternoon - photos and cocktails
    if (hour < 21) return 180; // Evening - reception (peak)
    return 60; // Late evening - wind down
  }

  private getDayOfWeekPattern(): any {
    return {
      0: { multiplier: 1.2, confidence: 0.9 }, // Sunday
      1: { multiplier: 0.3, confidence: 0.8 }, // Monday
      2: { multiplier: 0.2, confidence: 0.8 }, // Tuesday
      3: { multiplier: 0.2, confidence: 0.8 }, // Wednesday
      4: { multiplier: 0.4, confidence: 0.8 }, // Thursday
      5: { multiplier: 0.8, confidence: 0.85 }, // Friday
      6: { multiplier: 2.0, confidence: 0.95 }, // Saturday (peak)
    };
  }

  private getSeasonalPattern(): any {
    return Array(12)
      .fill(0)
      .map((_, month) => ({
        month,
        multiplier: this.getSeasonalMultiplier(month),
        confidence: 0.9,
      }));
  }

  private getSeasonalMultiplier(month: number): number {
    // 0=Jan, 11=Dec
    const seasonalMultipliers = [
      0.4,
      0.3,
      0.5,
      0.8,
      1.2,
      2.0, // Jan-Jun
      2.2,
      2.0,
      2.5,
      1.8,
      0.7,
      0.5, // Jul-Dec
    ];

    return seasonalMultipliers[month] || 1.0;
  }

  private async predictHourlyLoad(context: {
    wedding: WeddingEvent;
    hour: number;
    loadPatterns: any;
    weddingPhase: string;
  }): Promise<HourlyLoadPrediction> {
    const baseLoad =
      context.loadPatterns.hourlyPatterns[context.hour]?.averageLoad || 50;
    const weddingMultiplier = this.getWeddingLoadFactor(context.wedding);
    const phaseMultiplier = this.getPhaseMultiplier(context.weddingPhase);

    const predictedLoad = Math.round(
      baseLoad * weddingMultiplier * phaseMultiplier,
    );

    return {
      hour: context.hour,
      predictedLoad,
      confidence: 0.85,
      weddingPhase: context.weddingPhase,
      factors: [
        { name: 'base_hourly_load', value: baseLoad },
        { name: 'wedding_size_multiplier', value: weddingMultiplier },
        { name: 'wedding_phase_multiplier', value: phaseMultiplier },
      ],
    };
  }

  private determineWeddingPhase(hour: number, schedule: any): string {
    // Simplified phase determination based on hour
    if (hour < 8) return 'planning';
    if (hour < 12) return 'preparation';
    if (hour < 14) return 'ceremony_prep';
    if (hour < 16) return 'ceremony';
    if (hour < 22) return 'reception';
    return 'cleanup';
  }

  private getPhaseMultiplier(phase: string): number {
    const multipliers: Record<string, number> = {
      planning: 0.3,
      preparation: 0.8,
      ceremony_prep: 1.2,
      ceremony: 1.8,
      reception: 2.0,
      cleanup: 0.5,
    };

    return multipliers[phase] || 1.0;
  }

  private identifyPeakPeriods(
    hourlyPredictions: HourlyLoadPrediction[],
  ): any[] {
    const peakThreshold =
      Math.max(...hourlyPredictions.map((p) => p.predictedLoad)) * 0.7;
    const peakPeriods = [];

    let currentPeriod: any = null;

    for (const prediction of hourlyPredictions) {
      if (prediction.predictedLoad >= peakThreshold) {
        if (!currentPeriod) {
          currentPeriod = {
            startHour: prediction.hour,
            endHour: prediction.hour,
            peakLoad: prediction.predictedLoad,
            averageLoad: prediction.predictedLoad,
            phase: prediction.weddingPhase,
            hours: 1,
          };
        } else {
          currentPeriod.endHour = prediction.hour;
          currentPeriod.peakLoad = Math.max(
            currentPeriod.peakLoad,
            prediction.predictedLoad,
          );
          currentPeriod.averageLoad =
            (currentPeriod.averageLoad * currentPeriod.hours +
              prediction.predictedLoad) /
            (currentPeriod.hours + 1);
          currentPeriod.hours++;
        }
      } else {
        if (currentPeriod && currentPeriod.hours >= 1) {
          peakPeriods.push(currentPeriod);
        }
        currentPeriod = null;
      }
    }

    // Add the last period if it exists
    if (currentPeriod && currentPeriod.hours >= 1) {
      peakPeriods.push(currentPeriod);
    }

    return peakPeriods;
  }

  private async generateWeddingScalingTimeline(context: {
    wedding: WeddingEvent;
    hourlyPredictions: HourlyLoadPrediction[];
    peakPeriods: any[];
    currentCapacity: any;
  }): Promise<any> {
    const preScalingActions = [];
    const duringWeddingActions = [];
    const postWeddingActions = [];

    // Pre-wedding scaling (2 hours before peak)
    const firstPeak = context.peakPeriods[0];
    if (firstPeak) {
      const preScaleTime = new Date(context.wedding.date);
      preScaleTime.setHours(firstPeak.startHour - 2);

      preScalingActions.push({
        action: 'scale_up',
        service: 'api',
        targetInstances: Math.ceil(context.currentCapacity.api * 1.5),
        scheduledTime: preScaleTime,
        reason: 'wedding_day_preparation',
      });

      preScalingActions.push({
        action: 'scale_up',
        service: 'real-time',
        targetInstances: Math.ceil(context.currentCapacity.realTime * 2.0),
        scheduledTime: preScaleTime,
        reason: 'wedding_day_preparation',
      });
    }

    // Post-wedding scaling (2 hours after last peak)
    const lastPeak = context.peakPeriods[context.peakPeriods.length - 1];
    if (lastPeak) {
      const postScaleTime = new Date(context.wedding.date);
      postScaleTime.setHours(lastPeak.endHour + 2);

      postWeddingActions.push({
        action: 'scale_down',
        service: 'api',
        targetInstances: context.currentCapacity.api,
        scheduledTime: postScaleTime,
        reason: 'wedding_day_cleanup',
      });
    }

    return {
      weddingId: context.wedding.id,
      preScalingActions,
      duringWeddingActions,
      postWeddingActions,
      estimatedDuration: 12, // hours
      totalActions:
        preScalingActions.length +
        duringWeddingActions.length +
        postWeddingActions.length,
    };
  }

  private async getCurrentCapacity(): Promise<any> {
    // Mock current capacity - in production would get from monitoring system
    return {
      api: 3,
      database: 2,
      realTime: 2,
      fileStorage: 1,
      aiServices: 1,
    };
  }

  private async generateCapacityRecommendations(
    context: any,
  ): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = [];

    // Analyze peak loads across all weeks
    const maxWeeklyLoad = Math.max(
      ...context.weeklyPredictions.map((w: any) => w.predictedLoad),
    );
    const maxPeakDayLoad = Math.max(
      ...context.peakDayPredictions.map((p: any) => p.predictedLoad),
    );
    const overallPeakLoad = Math.max(maxWeeklyLoad, maxPeakDayLoad);

    // Generate service-specific recommendations
    const services = ['api', 'database', 'real-time', 'file-storage'];

    for (const service of services) {
      const currentCapacity = context.currentCapacity[service] || 1;
      const requiredCapacity = this.calculateRequiredCapacity(
        service,
        overallPeakLoad,
        context.bufferRequirements,
      );

      if (requiredCapacity > currentCapacity) {
        recommendations.push({
          type: 'scale_up',
          service,
          recommendedInstances: requiredCapacity,
          timing: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week ahead
          reasoning: `Peak load prediction of ${overallPeakLoad} requires ${requiredCapacity} instances for ${service}`,
          estimatedCost: await this.estimateCapacityCost(
            service,
            requiredCapacity - currentCapacity,
          ),
        });
      }
    }

    return recommendations;
  }

  private calculateRequiredCapacity(
    service: string,
    peakLoad: number,
    bufferRequirements: any,
  ): number {
    const serviceLoadFactors: Record<string, number> = {
      api: 0.4, // API handles 40% of total load
      database: 0.3, // Database handles 30% of total load
      'real-time': 0.2, // Real-time handles 20% of total load
      'file-storage': 0.1, // File storage handles 10% of total load
    };

    const serviceFactor = serviceLoadFactors[service] || 0.25;
    const serviceLoad = peakLoad * serviceFactor;
    const instanceCapacity = 100; // Each instance can handle 100 units of load

    const baseInstances = Math.ceil(serviceLoad / instanceCapacity);
    const bufferMultiplier = 1 + (bufferRequirements?.recommendedBuffer || 0.2);

    return Math.ceil(baseInstances * bufferMultiplier);
  }

  private async estimateCapacityCost(
    service: string,
    additionalInstances: number,
  ): Promise<number> {
    const hourlyRates: Record<string, number> = {
      api: 0.2, // $0.20/hour per instance
      database: 0.5, // $0.50/hour per instance
      'real-time': 0.3, // $0.30/hour per instance
      'file-storage': 0.15, // $0.15/hour per instance
    };

    const hourlyRate = hourlyRates[service] || 0.25;
    return additionalInstances * hourlyRate * 24 * 30; // Monthly cost
  }

  private calculatePredictionConfidence(weddingPatterns: any): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence based on data quality
    if (weddingPatterns.totalExpectedWeddings > 10) {
      confidence += 0.1;
    }

    if (weddingPatterns.weeklyPatterns.length > 40) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private calculateWeddingPredictionConfidence(
    similarWeddingsCount: number,
  ): number {
    let confidence = 0.6; // Base confidence

    // More similar weddings = higher confidence
    if (similarWeddingsCount > 5) confidence += 0.1;
    if (similarWeddingsCount > 10) confidence += 0.1;
    if (similarWeddingsCount > 15) confidence += 0.05;

    return Math.min(confidence, 0.9);
  }

  async clearPredictionCache(): Promise<void> {
    console.log('[WeddingLoadPredictor] Clearing prediction cache');
    this.predictionCache.clear();
    this.lastCacheClean = new Date();
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details = {
      cacheSize: this.predictionCache.size,
      lastCacheClean: this.lastCacheClean,
      servicesConnected: {
        historicalData: !!this.historicalDataService,
        weddingSchedule: !!this.weddingScheduleService,
        mlPrediction: !!this.mlPredictionService,
      },
    };

    try {
      // Test prediction capability
      const testStart = Date.now();
      await this.getCurrentSeasonInfo();
      const testDuration = Date.now() - testStart;

      details.lastHealthCheck = {
        success: true,
        duration: testDuration,
        timestamp: new Date().toISOString(),
      };

      if (testDuration < 1000) {
        return { status: 'healthy', details };
      } else {
        return { status: 'degraded', details };
      }
    } catch (error) {
      details.lastHealthCheck = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      return { status: 'unhealthy', details };
    }
  }
}

// Mock service implementations for MVP
class MockHistoricalDataService implements HistoricalDataService {
  async getHistoricalWeddingSeasons(
    startYear: number,
    endYear: number,
  ): Promise<any[]> {
    const seasons = [];
    for (let year = startYear; year <= endYear; year++) {
      seasons.push({
        year,
        totalWeddings: 1000 + Math.floor(Math.random() * 500),
        averageLoad: 150 + Math.floor(Math.random() * 100),
        peakLoad: 300 + Math.floor(Math.random() * 200),
      });
    }
    return seasons;
  }

  async getWeddingsByDateRange(
    start: Date,
    end: Date,
  ): Promise<WeddingEvent[]> {
    // Mock implementation
    return [];
  }

  async getLoadDataForPeriod(start: Date, end: Date): Promise<any[]> {
    // Mock implementation
    return [];
  }
}

class MockWeddingScheduleService implements WeddingScheduleService {
  async getWeddingsInSeason(season: WeddingSeason): Promise<WeddingEvent[]> {
    const weddings: WeddingEvent[] = [];
    const weddingCount = 20 + Math.floor(Math.random() * 30);

    for (let i = 0; i < weddingCount; i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() + Math.floor(Math.random() * 90)); // Next 90 days

      weddings.push({
        id: `wedding_${i}`,
        date: randomDate,
        type: this.getRandomWeddingType(),
        expectedGuests: 50 + Math.floor(Math.random() * 200),
        vendors: [],
        venue: {
          id: `venue_${i}`,
          type: 'outdoor',
          capacity: 200,
          techRequirements: [],
        },
        schedule: {
          events: [],
          duration: 8,
          timeZone: 'America/New_York',
        },
        predictedLoad: {
          predictedLoad: 100,
          confidence: 0.8,
          timeframe: '1day',
          factors: [],
        },
      });
    }

    return weddings;
  }

  async getWeddingsInDateRange(
    start: Date,
    end: Date,
  ): Promise<WeddingEvent[]> {
    // Mock implementation
    return [];
  }

  async getUpcomingWeddings(hours: number): Promise<WeddingEvent[]> {
    const weddings: WeddingEvent[] = [];
    const weddingCount = Math.floor(hours / 12); // Roughly 1 wedding per 12 hours

    for (let i = 0; i < weddingCount; i++) {
      const weddingTime = new Date(
        Date.now() + Math.random() * hours * 60 * 60 * 1000,
      );

      weddings.push({
        id: `upcoming_wedding_${i}`,
        date: weddingTime,
        type: this.getRandomWeddingType(),
        expectedGuests: 50 + Math.floor(Math.random() * 200),
        vendors: [],
        venue: {
          id: `venue_${i}`,
          type: 'outdoor',
          capacity: 200,
          techRequirements: [],
        },
        schedule: {
          events: [],
          duration: 8,
          timeZone: 'America/New_York',
        },
        predictedLoad: {
          predictedLoad: 100,
          confidence: 0.8,
          timeframe: '1day',
          factors: [],
        },
      });
    }

    return weddings;
  }

  private getRandomWeddingType(): 'intimate' | 'medium' | 'large' | 'luxury' {
    const types: ('intimate' | 'medium' | 'large' | 'luxury')[] = [
      'intimate',
      'medium',
      'large',
      'luxury',
    ];
    const weights = [0.3, 0.4, 0.25, 0.05]; // Distribution of wedding types

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }

    return 'medium';
  }
}

class MockMLPredictionService implements MLPredictionService {
  async predictLoad(features: any[]): Promise<LoadPrediction> {
    // Mock ML prediction
    return {
      predictedLoad: 100 + Math.floor(Math.random() * 200),
      confidence: 0.8 + Math.random() * 0.15,
      timeframe: '1hour',
      factors: features.map((f) => ({
        factor: f.name,
        impact: Math.random() * 0.3,
        confidence: 0.8 + Math.random() * 0.15,
      })),
    };
  }

  async trainModel(historicalData: any[]): Promise<void> {
    console.log(
      `[MLPredictionService] Training model with ${historicalData.length} data points`,
    );
    // Mock training - would implement actual ML training
  }

  async getModelAccuracy(): Promise<number> {
    return 0.85 + Math.random() * 0.1; // 85-95% accuracy
  }
}

// Export types for external use
export interface WeeklyLoadPrediction {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  weddingCount: number;
  predictedLoad: number;
  confidence: number;
  peakDays: Array<{
    date: Date;
    expectedLoad: number;
  }>;
}

export interface HourlyLoadPrediction {
  hour: number;
  predictedLoad: number;
  confidence: number;
  weddingPhase: string;
  factors: Array<{
    name: string;
    value: number;
  }>;
}

export interface WeddingSeasonPrediction {
  seasonId: string;
  season: WeddingSeason;
  weeklyPredictions: WeeklyLoadPrediction[];
  peakDayPredictions: any[];
  capacityRecommendations: CapacityRecommendation[];
  confidence: number;
  generatedAt: Date;
  validUntil: Date;
}

export interface WeddingDayPrediction {
  weddingId: string;
  weddingDate: Date;
  weddingSize: string;
  weddingType: string;
  hourlyPredictions: HourlyLoadPrediction[];
  peakPeriods: any[];
  scalingTimeline: any;
  expectedPeakLoad: number;
  recommendedPreScaling: any[];
  confidence: number;
}
