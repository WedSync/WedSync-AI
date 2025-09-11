import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { WeddingLoadPredictor } from '@/lib/scalability/backend/wedding-load-predictor';
import type {
  WeddingSeason,
  WeddingSeasonPrediction,
  WeddingEvent,
  WeddingDayPrediction,
  CapacityForecast,
  PredictionAccuracyMetrics,
} from '@/lib/scalability/types/core';

// Helper functions to reduce nesting depth
const expectWeddingTimeRange = (weddings: WeddingEvent[], maxHours: number) => {
  weddings.forEach((wedding) => {
    const timeDiff = wedding.date.getTime() - Date.now();
    expect(timeDiff).toBeGreaterThan(0); // Future date
    expect(timeDiff).toBeLessThanOrEqual(maxHours * 60 * 60 * 1000);
  });
};

const expectWeddingsSortedByDate = (weddings: WeddingEvent[]) => {
  for (let i = 1; i < weddings.length; i++) {
    expect(weddings[i].date.getTime()).toBeGreaterThanOrEqual(
      weddings[i - 1].date.getTime(),
    );
  }
};

const expectPredictionQuality = (predictions: WeddingDayPrediction[], minConfidence = 0.5) => {
  predictions.forEach((prediction) => {
    expect(prediction.confidenceLevel).toBeGreaterThan(minConfidence);
    expect(prediction.trafficMultiplier).toBeGreaterThan(0);
  });
};

const createOutdoorWeddingMetrics = (isOutdoor = true, weatherDep = 'high', hasBackup = true) => ({
  isOutdoor,
  weatherDependency: weatherDep,
  hasBackupVenue: hasBackup,
});

describe('WeddingLoadPredictor', () => {
  let predictor: WeddingLoadPredictor;

  beforeEach(() => {
    jest.clearAllMocks();
    predictor = new WeddingLoadPredictor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('predictWeddingSeasonLoad', () => {
    it('should predict peak summer season load correctly', async () => {
      // Arrange
      const summerSeason: WeddingSeason = {
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        seasonType: 'peak',
        historicalWeddingCount: 2500,
        averageGuestCount: 150,
        regionCode: 'UK-LON',
      };

      // Act
      const prediction: WeddingSeasonPrediction =
        await predictor.predictWeddingSeasonLoad(summerSeason);

      // Assert
      expect(prediction.seasonType).toBe('peak');
      expect(prediction.predictedWeddingCount).toBeGreaterThan(2000);
      expect(prediction.peakLoadMultiplier).toBeGreaterThan(3.0);
      expect(prediction.confidenceScore).toBeGreaterThan(0.8);
      expect(prediction.peakDays).toContain('saturday');
      expect(prediction.resourceRecommendations.cpuCores).toBeGreaterThan(32);
      expect(prediction.resourceRecommendations.memoryGB).toBeGreaterThan(128);
    });

    it('should predict off-season load with lower requirements', async () => {
      // Arrange
      const winterSeason: WeddingSeason = {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-02-28'),
        seasonType: 'off_peak',
        historicalWeddingCount: 800,
        averageGuestCount: 120,
        regionCode: 'UK-LON',
      };

      // Act
      const prediction: WeddingSeasonPrediction =
        await predictor.predictWeddingSeasonLoad(winterSeason);

      // Assert
      expect(prediction.seasonType).toBe('off_peak');
      expect(prediction.predictedWeddingCount).toBeLessThan(1200);
      expect(prediction.peakLoadMultiplier).toBeLessThan(2.5);
      expect(prediction.resourceRecommendations.cpuCores).toBeLessThan(32);
      expect(prediction.costOptimizationOpportunities).toContain(
        'downscale_off_peak',
      );
    });

    it('should handle regional variations correctly', async () => {
      // Arrange
      const londonSeason: WeddingSeason = {
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31'),
        seasonType: 'peak',
        historicalWeddingCount: 500,
        averageGuestCount: 180, // Higher guest count in London
        regionCode: 'UK-LON',
      };

      const ruralSeason: WeddingSeason = {
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31'),
        seasonType: 'peak',
        historicalWeddingCount: 200,
        averageGuestCount: 100, // Lower guest count in rural areas
        regionCode: 'UK-RUR',
      };

      // Act
      const londonPrediction =
        await predictor.predictWeddingSeasonLoad(londonSeason);
      const ruralPrediction =
        await predictor.predictWeddingSeasonLoad(ruralSeason);

      // Assert
      expect(londonPrediction.peakLoadMultiplier).toBeGreaterThan(
        ruralPrediction.peakLoadMultiplier,
      );
      expect(londonPrediction.resourceRecommendations.cpuCores).toBeGreaterThan(
        ruralPrediction.resourceRecommendations.cpuCores,
      );
      expect(londonPrediction.predictedWeddingCount).toBeGreaterThan(
        ruralPrediction.predictedWeddingCount,
      );
    });
  });

  describe('predictIndividualWeddingLoad', () => {
    it('should predict high-profile wedding load accurately', async () => {
      // Arrange
      const highProfileWedding: WeddingEvent = {
        id: 'celebrity-wedding-123',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        estimatedGuests: 500,
        vendorCount: 25,
        isHighProfile: true,
        services: [
          'photography',
          'catering',
          'venue',
          'flowers',
          'music',
          'transport',
          'security',
        ],
        expectedTrafficMultiplier: 6.0,
      };

      // Act
      const prediction: WeddingDayPrediction =
        await predictor.predictIndividualWeddingLoad(highProfileWedding);

      // Assert
      expect(prediction.trafficMultiplier).toBeGreaterThan(5.0);
      expect(prediction.peakRequestsPerSecond).toBeGreaterThan(8000);
      expect(prediction.concurrentUsersPeak).toBeGreaterThan(2000);
      expect(prediction.databaseLoadPeak).toBeGreaterThan(80);
      expect(prediction.confidenceLevel).toBeGreaterThan(0.85);
      expect(prediction.specialConsiderations).toContain('high_profile_event');
      expect(prediction.preScalingRecommended).toBe(true);
    });

    it('should predict intimate wedding load correctly', async () => {
      // Arrange
      const intimateWedding: WeddingEvent = {
        id: 'small-wedding-456',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        estimatedGuests: 50,
        vendorCount: 5,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue'],
        expectedTrafficMultiplier: 1.2,
      };

      // Act
      const prediction: WeddingDayPrediction =
        await predictor.predictIndividualWeddingLoad(intimateWedding);

      // Assert
      expect(prediction.trafficMultiplier).toBeLessThan(2.0);
      expect(prediction.peakRequestsPerSecond).toBeLessThan(3000);
      expect(prediction.concurrentUsersPeak).toBeLessThan(500);
      expect(prediction.resourceOptimizationOpportunity).toBe(true);
      expect(prediction.preScalingRecommended).toBe(false);
    });

    it('should account for vendor count in load predictions', async () => {
      // Arrange
      const manyVendorsWedding: WeddingEvent = {
        id: 'complex-wedding-789',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedGuests: 200,
        vendorCount: 18, // High vendor count
        isHighProfile: false,
        services: [
          'photography',
          'catering',
          'venue',
          'flowers',
          'music',
          'transport',
          'makeup',
          'hair',
          'decor',
          'lighting',
        ],
        expectedTrafficMultiplier: 3.2,
      };

      // Act
      const prediction: WeddingDayPrediction =
        await predictor.predictIndividualWeddingLoad(manyVendorsWedding);

      // Assert
      expect(prediction.vendorLoadContribution).toBeGreaterThan(0.5);
      expect(prediction.coordinationComplexity).toBe('high');
      expect(prediction.peakRequestsPerSecond).toBeGreaterThan(4000);
      expect(prediction.specialConsiderations).toContain(
        'high_vendor_coordination',
      );
    });
  });

  describe('generateCapacityForecast', () => {
    it('should generate comprehensive 24-hour forecast', async () => {
      // Arrange
      const upcomingWeddings: WeddingEvent[] = [
        {
          id: 'wedding-1',
          date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          estimatedGuests: 150,
          vendorCount: 8,
          isHighProfile: false,
          services: ['photography', 'catering', 'venue'],
          expectedTrafficMultiplier: 2.0,
        },
        {
          id: 'wedding-2',
          date: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
          estimatedGuests: 300,
          vendorCount: 15,
          isHighProfile: true,
          services: ['photography', 'catering', 'venue', 'flowers', 'music'],
          expectedTrafficMultiplier: 4.0,
        },
      ];

      // Act
      const forecast: CapacityForecast =
        await predictor.generateCapacityForecast(upcomingWeddings, 24);

      // Assert
      expect(
        forecast.timeRange.endTime.getTime() -
          forecast.timeRange.startTime.getTime(),
      ).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
      expect(forecast.predictedLoad.requestsPerSecond).toBeGreaterThan(3000);
      expect(forecast.confidence).toBeGreaterThan(0.7);
      expect(forecast.scenarios.length).toBeGreaterThan(0);
      expect(forecast.scenarios[0].resourceRequirements).toBeDefined();
    });

    it('should identify peak load scenarios', async () => {
      // Arrange
      const peakDayWeddings: WeddingEvent[] = Array(8)
        .fill(null)
        .map((_, index) => ({
          id: `saturday-wedding-${index}`,
          date: new Date(Date.now() + index * 2 * 60 * 60 * 1000), // Every 2 hours
          estimatedGuests: 200 + index * 50,
          vendorCount: 10 + index,
          isHighProfile: index % 3 === 0, // Every third wedding is high profile
          services: ['photography', 'catering', 'venue', 'flowers'],
          expectedTrafficMultiplier: 2.5 + index * 0.3,
        }));

      // Act
      const forecast: CapacityForecast =
        await predictor.generateCapacityForecast(peakDayWeddings, 16);

      // Assert
      expect(forecast.predictedLoad.requestsPerSecond).toBeGreaterThan(10000);
      expect(forecast.scenarios.some((s) => s.name.includes('peak'))).toBe(
        true,
      );
      expect(forecast.confidence).toBeGreaterThan(0.8);

      const peakScenario = forecast.scenarios.find(
        (s) =>
          s.probability ===
          Math.max(...forecast.scenarios.map((sc) => sc.probability)),
      );
      expect(peakScenario).toBeDefined();
      expect(peakScenario!.resourceRequirements.cpuCores).toBeGreaterThan(40);
    });

    it('should handle empty wedding schedule', async () => {
      // Arrange
      const noWeddings: WeddingEvent[] = [];

      // Act
      const forecast: CapacityForecast =
        await predictor.generateCapacityForecast(noWeddings, 12);

      // Assert
      expect(forecast.predictedLoad.requestsPerSecond).toBeLessThan(1000);
      expect(forecast.scenarios.some((s) => s.name === 'baseline_load')).toBe(
        true,
      );
      expect(forecast.confidence).toBeGreaterThan(0.9);

      const baselineScenario = forecast.scenarios.find(
        (s) => s.name === 'baseline_load',
      );
      expect(baselineScenario!.resourceRequirements.cpuCores).toBeLessThan(8);
    });
  });

  describe('getUpcomingWeddings', () => {
    it('should retrieve weddings within specified time window', async () => {
      // Act
      const upcomingWeddings = await predictor.getUpcomingWeddings(24); // Next 24 hours

      // Assert
      expect(Array.isArray(upcomingWeddings)).toBe(true);

      if (upcomingWeddings.length > 0) {
        expectWeddingTimeRange(upcomingWeddings, 24);
      }
    });

    it('should sort weddings by date ascending', async () => {
      // Act
      const upcomingWeddings = await predictor.getUpcomingWeddings(72); // Next 72 hours

      // Assert
      if (upcomingWeddings.length > 1) {
        expectWeddingsSortedByDate(upcomingWeddings);
      }
    });
  });

  describe('validatePredictionAccuracy', () => {
    it('should track prediction accuracy over time', async () => {
      // Arrange
      const weddingEvent: WeddingEvent = {
        id: 'accuracy-test-wedding',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        estimatedGuests: 200,
        vendorCount: 10,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue'],
        expectedTrafficMultiplier: 2.5,
      };

      const actualMetrics = {
        peakRequestsPerSecond: 4200,
        averageResponseTime: 180,
        maxConcurrentUsers: 850,
        totalRequests: 156000,
        errorCount: 45,
      };

      // Act
      const accuracyMetrics: PredictionAccuracyMetrics =
        await predictor.validatePredictionAccuracy(weddingEvent, actualMetrics);

      // Assert
      expect(accuracyMetrics.overallAccuracy).toBeGreaterThan(0.0);
      expect(accuracyMetrics.overallAccuracy).toBeLessThanOrEqual(1.0);
      expect(accuracyMetrics.trafficPredictionAccuracy).toBeDefined();
      expect(accuracyMetrics.loadPredictionAccuracy).toBeDefined();
      expect(accuracyMetrics.recommendationsEffectiveness).toBeDefined();
      expect(accuracyMetrics.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it('should identify areas for prediction improvement', async () => {
      // Arrange
      const weddingEvent: WeddingEvent = {
        id: 'improvement-test-wedding',
        date: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        estimatedGuests: 100,
        vendorCount: 5,
        isHighProfile: false,
        services: ['photography', 'catering'],
        expectedTrafficMultiplier: 1.5,
      };

      // Simulate significantly higher actual load than predicted
      const unexpectedHighLoad = {
        peakRequestsPerSecond: 8500, // Much higher than expected for small wedding
        averageResponseTime: 450,
        maxConcurrentUsers: 2100,
        totalRequests: 280000,
        errorCount: 120,
      };

      // Act
      const accuracyMetrics: PredictionAccuracyMetrics =
        await predictor.validatePredictionAccuracy(
          weddingEvent,
          unexpectedHighLoad,
        );

      // Assert
      expect(accuracyMetrics.overallAccuracy).toBeLessThan(0.7); // Poor accuracy due to underestimation
      expect(accuracyMetrics.improvementSuggestions).toContain(
        'adjust_guest_multiplier',
      );
      expect(accuracyMetrics.improvementSuggestions).toContain(
        'enhance_vendor_impact_modeling',
      );
      expect(accuracyMetrics.predictionBias).toBe('underestimated');
    });
  });

  describe('Wedding Intelligence Features', () => {
    it('should apply seasonal intelligence correctly', async () => {
      // Arrange - Peak wedding season (summer)
      const peakSeasonDate = new Date('2024-07-15'); // Mid-July
      const wedding: WeddingEvent = {
        id: 'peak-season-wedding',
        date: peakSeasonDate,
        estimatedGuests: 200,
        vendorCount: 12,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue', 'flowers'],
        expectedTrafficMultiplier: 2.5,
      };

      // Act
      const prediction = await predictor.predictIndividualWeddingLoad(wedding);

      // Assert
      expect(prediction.seasonalMultiplier).toBeGreaterThan(1.3); // Summer season boost
      expect(prediction.adjustedTrafficMultiplier).toBeGreaterThan(
        wedding.expectedTrafficMultiplier,
      );
      expect(prediction.specialConsiderations).toContain('peak_wedding_season');
    });

    it('should detect wedding day clustering effects', async () => {
      // Arrange - Multiple weddings on same Saturday
      const saturdayDate = new Date();
      saturdayDate.setDate(
        saturdayDate.getDate() + (6 - saturdayDate.getDay()),
      ); // Next Saturday

      const clusteredWeddings: WeddingEvent[] = Array(5)
        .fill(null)
        .map((_, index) => ({
          id: `saturday-cluster-${index}`,
          date: new Date(saturdayDate.getTime() + index * 60 * 60 * 1000), // Spread across the day
          estimatedGuests: 150 + index * 25,
          vendorCount: 8 + index,
          isHighProfile: false,
          services: ['photography', 'catering', 'venue'],
          expectedTrafficMultiplier: 2.0,
        }));

      // Act
      const forecast = await predictor.generateCapacityForecast(
        clusteredWeddings,
        12,
      );

      // Assert
      expect(
        forecast.scenarios.some((s) => s.name.includes('clustering')),
      ).toBe(true);
      expect(forecast.predictedLoad.requestsPerSecond).toBeGreaterThan(6000);
      expect(forecast.confidence).toBeGreaterThan(0.8);

      const clusteringScenario = forecast.scenarios.find((s) =>
        s.name.includes('clustering'),
      );
      expect(clusteringScenario).toBeDefined();
      expect(clusteringScenario!.probability).toBeGreaterThan(0.7);
    });

    it('should handle weather impact on outdoor weddings', async () => {
      // Arrange - Outdoor wedding with weather concerns
      const outdoorWedding: WeddingEvent = {
        id: 'outdoor-wedding-weather',
        date: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
        estimatedGuests: 180,
        vendorCount: 10,
        isHighProfile: false,
        services: ['photography', 'catering', 'venue', 'flowers'],
        expectedTrafficMultiplier: 2.2,
        customMetrics: createOutdoorWeddingMetrics(),
      };

      // Act
      const prediction =
        await predictor.predictIndividualWeddingLoad(outdoorWedding);

      // Assert
      expect(prediction.uncertaintyFactors).toContain('weather_dependency');
      expect(prediction.confidenceLevel).toBeLessThan(0.9); // Lower confidence due to weather
      expect(prediction.contingencyPlanning).toBe(true);
      expect(prediction.specialConsiderations).toContain(
        'outdoor_weather_risk',
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete predictions within acceptable time limits', async () => {
      // Arrange
      const startTime = Date.now();
      const largeForecast = Array(20)
        .fill(null)
        .map((_, index) => ({
          id: `performance-test-${index}`,
          date: new Date(Date.now() + index * 3 * 60 * 60 * 1000),
          estimatedGuests: 150 + index * 10,
          vendorCount: 8 + (index % 5),
          isHighProfile: index % 5 === 0,
          services: ['photography', 'catering', 'venue'],
          expectedTrafficMultiplier: 2.0 + index * 0.1,
        }));

      // Act
      const forecast = await predictor.generateCapacityForecast(
        largeForecast,
        72,
      );

      // Assert
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(forecast.confidence).toBeGreaterThan(0.6);
      expect(forecast.scenarios.length).toBeGreaterThan(0);
    });

    it('should handle concurrent prediction requests', async () => {
      // Arrange
      const concurrentRequests = Array(5)
        .fill(null)
        .map((_, index) => ({
          id: `concurrent-test-${index}`,
          date: new Date(Date.now() + (index + 1) * 60 * 60 * 1000),
          estimatedGuests: 100 + index * 50,
          vendorCount: 5 + index,
          isHighProfile: false,
          services: ['photography', 'catering'],
          expectedTrafficMultiplier: 1.5 + index * 0.2,
        }));

      // Act
      const predictions = await Promise.all(
        concurrentRequests.map((wedding) =>
          predictor.predictIndividualWeddingLoad(wedding),
        ),
      );

      // Assert
      expect(predictions).toHaveLength(5);
      expectPredictionQuality(predictions);
    });
  });
});
