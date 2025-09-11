import { PredictiveAnalytics } from '../../lib/analytics/predictive-analytics';
import { jest } from '@jest/globals';

// Mock machine learning dependencies
jest.mock('../../lib/ml/regression-models', () => ({
  LinearRegression: jest.fn(() => ({
    train: jest.fn(),
    predict: jest.fn(),
    evaluate: jest.fn(),
  })),
  TimeSeriesModel: jest.fn(() => ({
    fit: jest.fn(),
    forecast: jest.fn(),
    validateAccuracy: jest.fn(),
  })),
}));

jest.mock('../../lib/ml/classification-models', () => ({
  RandomForestClassifier: jest.fn(() => ({
    train: jest.fn(),
    predict: jest.fn(),
    getFeatureImportance: jest.fn(),
  })),
}));

describe('PredictiveAnalytics', () => {
  let predictiveAnalytics: PredictiveAnalytics;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    predictiveAnalytics = new PredictiveAnalytics();
  });

  afterEach(async () => {
    await predictiveAnalytics.cleanup();
  });

  describe('Model Training', () => {
    test('should train booking prediction model with >85% accuracy', async () => {
      const trainingData = Array.from({ length: 1000 }, (_, i) => ({
        features: {
          inquiry_response_time: 120 + Math.random() * 480, // 2-10 hours
          price_range: 1000 + Math.random() * 4000, // £1000-£5000
          wedding_season: Math.random() > 0.5 ? 'peak' : 'off_peak',
          vendor_rating: 3.5 + Math.random() * 1.5, // 3.5-5.0
          client_budget: 5000 + Math.random() * 15000, // £5000-£20000
          days_until_wedding: 30 + Math.random() * 335, // 1 month to 1 year
          referral_source: Math.random() > 0.3 ? 'existing_client' : 'new_lead',
        },
        target: Math.random() > 0.3 ? 1 : 0, // 70% booking rate
      }));

      const model = await predictiveAnalytics.trainBookingPredictionModel(
        mockOrganizationId,
        trainingData,
        {
          algorithm: 'random_forest',
          validationSplit: 0.2,
          hyperparameters: {
            n_estimators: 100,
            max_depth: 10,
            min_samples_split: 5,
          },
        },
      );

      expect(model.success).toBe(true);
      expect(model.modelId).toBeDefined();
      expect(model.accuracy).toBeGreaterThan(0.85); // >85% accuracy requirement
      expect(model.precision).toBeGreaterThan(0.8);
      expect(model.recall).toBeGreaterThan(0.8);
      expect(model.f1Score).toBeGreaterThan(0.8);
      expect(model.featureImportance).toBeDefined();
    });

    test('should train seasonal demand forecasting model', async () => {
      const seasonalData = Array.from({ length: 365 * 3 }, (_, i) => {
        const date = new Date('2022-01-01');
        date.setDate(date.getDate() + i);
        const month = date.getMonth() + 1;

        // Peak season (April-September) has higher demand
        const isPeakSeason = month >= 4 && month <= 9;
        const baseBookings = isPeakSeason ? 20 : 8;
        const bookings = baseBookings + Math.random() * 10;

        return {
          date: date.toISOString().split('T')[0],
          bookings,
          month,
          season: isPeakSeason ? 'peak' : 'off_peak',
          vendor_type: 'photographer',
        };
      });

      const model = await predictiveAnalytics.trainSeasonalForecastModel(
        mockOrganizationId,
        seasonalData,
        {
          forecastHorizon: 365, // 1 year forecast
          seasonalPeriods: [12, 52], // Monthly and weekly seasonality
          trendComponent: true,
          confidenceInterval: 0.95,
        },
      );

      expect(model.success).toBe(true);
      expect(model.modelId).toBeDefined();
      expect(model.mapeScore).toBeLessThan(0.15); // <15% Mean Absolute Percentage Error
      expect(model.seasonalityDetected).toBe(true);
      expect(model.trendStrength).toBeBetween(0, 1);
      expect(model.forecastAccuracy).toBeGreaterThan(0.85);
    });

    test('should train customer lifetime value prediction model', async () => {
      const clvData = Array.from({ length: 500 }, (_, i) => ({
        customer_id: `customer_${i}`,
        features: {
          first_booking_value: 1500 + Math.random() * 3000,
          referral_count: Math.floor(Math.random() * 10),
          service_satisfaction: 3.5 + Math.random() * 1.5,
          communication_frequency: Math.random() * 50,
          social_media_engagement: Math.random() * 100,
          booking_lead_time: 30 + Math.random() * 300,
          vendor_type_preference:
            Math.random() > 0.5 ? 'photographer' : 'videographer',
        },
        clv: 2000 + Math.random() * 8000, // £2000-£10000 CLV
      }));

      const model = await predictiveAnalytics.trainCLVModel(
        mockOrganizationId,
        clvData,
        {
          algorithm: 'gradient_boosting',
          timeHorizon: '36months',
          includeReferralValue: true,
          validationMethod: 'time_series_split',
        },
      );

      expect(model.success).toBe(true);
      expect(model.modelId).toBeDefined();
      expect(model.r2Score).toBeGreaterThan(0.8); // >80% variance explained
      expect(model.maeScore).toBeLessThan(500); // <£500 Mean Absolute Error
      expect(model.clvSegments).toHaveLength(5); // Low, Below Average, Average, Above Average, High
      expect(model.topFeatures).toBeInstanceOf(Array);
    });

    test('should validate wedding industry-specific constraints', async () => {
      const invalidTrainingData = [
        {
          features: {
            wedding_date: '2024-02-30', // Invalid date
            guest_count: -50, // Negative guests
            budget: -1000, // Negative budget
            venue_capacity: 'unlimited', // Invalid type
          },
          target: 1,
        },
      ];

      const result = await predictiveAnalytics.trainBookingPredictionModel(
        mockOrganizationId,
        invalidTrainingData,
        { validateWeddingConstraints: true },
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('invalid_wedding_date');
      expect(result.validationErrors).toContain('invalid_guest_count');
      expect(result.validationErrors).toContain('invalid_budget');
      expect(result.validationErrors).toContain('invalid_venue_capacity_type');
    });
  });

  describe('Prediction Generation', () => {
    test('should generate booking probability predictions with confidence scores', async () => {
      // Mock trained model
      await predictiveAnalytics.loadModel(
        mockOrganizationId,
        'booking_prediction_v1',
      );

      const inquiryData = {
        inquiry_response_time: 180, // 3 hours
        price_range: 2500,
        wedding_season: 'peak',
        vendor_rating: 4.5,
        client_budget: 8000,
        days_until_wedding: 180,
        referral_source: 'existing_client',
        communication_tone: 'enthusiastic',
        specific_requirements: ['outdoor_ceremony', 'drone_photography'],
      };

      const prediction = await predictiveAnalytics.predictBookingProbability(
        mockOrganizationId,
        inquiryData,
        { includeRecommendations: true },
      );

      expect(prediction.success).toBe(true);
      expect(prediction.bookingProbability).toBeBetween(0, 1);
      expect(prediction.confidenceScore).toBeBetween(0.7, 1.0); // High confidence required
      expect(prediction.riskFactors).toBeInstanceOf(Array);
      expect(prediction.successFactors).toBeInstanceOf(Array);
      expect(prediction.recommendations).toBeInstanceOf(Array);
      expect(prediction.priceOptimization).toBeDefined();
    });

    test('should forecast seasonal demand with wedding industry context', async () => {
      await predictiveAnalytics.loadModel(
        mockOrganizationId,
        'seasonal_forecast_v1',
      );

      const forecast = await predictiveAnalytics.forecastSeasonalDemand(
        mockOrganizationId,
        {
          vendorType: 'photographer',
          forecastMonths: 12,
          region: 'UK',
          includeWeatherImpact: true,
          includeEconomicFactors: true,
        },
      );

      expect(forecast.success).toBe(true);
      expect(forecast.monthlyForecasts).toHaveLength(12);
      expect(forecast.peakMonths).toBeInstanceOf(Array);
      expect(forecast.demandTrends.overall).toMatch(
        /^(increasing|stable|decreasing)$/,
      );
      expect(forecast.seasonalityStrength).toBeBetween(0, 1);
      expect(forecast.weatherImpact).toBeDefined();
      expect(forecast.economicImpact).toBeDefined();

      // Validate monthly forecasts
      forecast.monthlyForecasts.forEach((month, index) => {
        expect(month.month).toBe(index + 1);
        expect(month.predictedBookings).toBeGreaterThanOrEqual(0);
        expect(month.confidenceInterval.lower).toBeLessThanOrEqual(
          month.predictedBookings,
        );
        expect(month.confidenceInterval.upper).toBeGreaterThanOrEqual(
          month.predictedBookings,
        );
        expect(month.seasonFactor).toBeGreaterThan(0);
      });
    });

    test('should predict customer lifetime value with segmentation', async () => {
      await predictiveAnalytics.loadModel(mockOrganizationId, 'clv_model_v1');

      const customerData = {
        first_booking_value: 2500,
        referral_count: 3,
        service_satisfaction: 4.8,
        communication_frequency: 15,
        social_media_engagement: 75,
        booking_lead_time: 180,
        vendor_type_preference: 'photographer',
        geographic_location: 'London',
        wedding_style: 'modern',
      };

      const clvPrediction =
        await predictiveAnalytics.predictCustomerLifetimeValue(
          mockOrganizationId,
          customerData,
          {
            timeHorizon: '36months',
            includeReferralValue: true,
            segmentCustomer: true,
          },
        );

      expect(clvPrediction.success).toBe(true);
      expect(clvPrediction.predictedCLV).toBeGreaterThan(0);
      expect(clvPrediction.confidenceScore).toBeBetween(0.7, 1.0);
      expect(clvPrediction.clvSegment).toMatch(
        /^(high_value|medium_value|low_value|champion|at_risk)$/,
      );
      expect(clvPrediction.contributingFactors).toBeInstanceOf(Array);
      expect(clvPrediction.upsellingOpportunities).toBeInstanceOf(Array);
      expect(clvPrediction.retentionStrategies).toBeInstanceOf(Array);
    });

    test('should provide price optimization recommendations', async () => {
      const marketData = {
        currentPrice: 2500,
        competitorPrices: [2200, 2800, 3000, 2600, 2400],
        servicePackage: 'premium',
        vendorType: 'photographer',
        region: 'London',
        experienceYears: 8,
        portfolioScore: 4.6,
        clientReviews: 4.8,
        bookingRate: 0.65,
        seasonalDemand: 'high',
      };

      const optimization = await predictiveAnalytics.optimizePricing(
        mockOrganizationId,
        marketData,
        {
          optimizationGoal: 'revenue_maximization',
          constraintType: 'competitive_positioning',
          seasonalAdjustment: true,
        },
      );

      expect(optimization.success).toBe(true);
      expect(optimization.recommendedPrice).toBeGreaterThan(0);
      expect(optimization.priceChange).toBeDefined();
      expect(optimization.expectedBookingRateChange).toBeBetween(-1, 1);
      expect(optimization.expectedRevenueImpact).toBeDefined();
      expect(optimization.competitivePosition).toMatch(
        /^(premium|competitive|budget)$/,
      );
      expect(optimization.seasonalAdjustments).toBeDefined();
    });
  });

  describe('Model Performance and Validation', () => {
    test('should evaluate model performance against benchmarks', async () => {
      await predictiveAnalytics.loadModel(
        mockOrganizationId,
        'booking_prediction_v1',
      );

      const testData = Array.from({ length: 200 }, (_, i) => ({
        features: {
          inquiry_response_time: 60 + Math.random() * 480,
          price_range: 1000 + Math.random() * 4000,
          wedding_season: Math.random() > 0.5 ? 'peak' : 'off_peak',
        },
        actualOutcome: Math.random() > 0.4 ? 1 : 0,
      }));

      const evaluation = await predictiveAnalytics.evaluateModel(
        mockOrganizationId,
        'booking_prediction_v1',
        testData,
        {
          metrics: ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc'],
          benchmarkThresholds: {
            accuracy: 0.85,
            precision: 0.8,
            recall: 0.8,
            f1_score: 0.8,
            auc_roc: 0.85,
          },
        },
      );

      expect(evaluation.success).toBe(true);
      expect(evaluation.meetsAllBenchmarks).toBe(true);
      expect(evaluation.metrics.accuracy).toBeGreaterThan(0.85);
      expect(evaluation.metrics.precision).toBeGreaterThan(0.8);
      expect(evaluation.metrics.recall).toBeGreaterThan(0.8);
      expect(evaluation.metrics.f1_score).toBeGreaterThan(0.8);
      expect(evaluation.metrics.auc_roc).toBeGreaterThan(0.85);
    });

    test('should detect model drift and trigger retraining', async () => {
      await predictiveAnalytics.loadModel(
        mockOrganizationId,
        'booking_prediction_v1',
      );

      // Simulate data drift by providing data with different distribution
      const driftedData = Array.from({ length: 100 }, (_, i) => ({
        features: {
          inquiry_response_time: 1000 + Math.random() * 2000, // Much longer response times
          price_range: 8000 + Math.random() * 4000, // Much higher prices
          wedding_season: 'peak', // Only peak season
        },
        prediction: Math.random() > 0.8 ? 1 : 0, // Much lower booking rate
        actualOutcome: Math.random() > 0.8 ? 1 : 0,
      }));

      const driftAnalysis = await predictiveAnalytics.detectModelDrift(
        mockOrganizationId,
        'booking_prediction_v1',
        driftedData,
        {
          driftThreshold: 0.1, // 10% drift threshold
          statisticalTests: ['kolmogorov_smirnov', 'chi_square'],
          performanceThreshold: 0.05, // 5% performance degradation
        },
      );

      expect(driftAnalysis.driftDetected).toBe(true);
      expect(driftAnalysis.driftScore).toBeGreaterThan(0.1);
      expect(driftAnalysis.affectedFeatures).toContain('inquiry_response_time');
      expect(driftAnalysis.affectedFeatures).toContain('price_range');
      expect(driftAnalysis.recommendRetraining).toBe(true);
      expect(driftAnalysis.retrainingUrgency).toMatch(
        /^(low|medium|high|critical)$/,
      );
    });

    test('should perform cross-validation with wedding seasonality awareness', async () => {
      const timeSeriesData = Array.from({ length: 1095 }, (_, i) => {
        // 3 years of daily data
        const date = new Date('2022-01-01');
        date.setDate(date.getDate() + i);
        const month = date.getMonth() + 1;
        const isPeakSeason = month >= 4 && month <= 9;

        return {
          date: date.toISOString().split('T')[0],
          features: {
            month,
            is_peak_season: isPeakSeason,
            day_of_week: date.getDay(),
            bookings_last_week: 5 + Math.random() * 15,
          },
          target: isPeakSeason
            ? 15 + Math.random() * 10
            : 5 + Math.random() * 8,
        };
      });

      const crossValidation = await predictiveAnalytics.performCrossValidation(
        mockOrganizationId,
        timeSeriesData,
        {
          validationType: 'time_series_split',
          numberOfFolds: 5,
          preserveSeasonality: true,
          gapSize: 30, // 30-day gap between train and test
        },
      );

      expect(crossValidation.success).toBe(true);
      expect(crossValidation.averageAccuracy).toBeGreaterThan(0.8);
      expect(crossValidation.standardDeviation).toBeLessThan(0.1); // Consistent performance
      expect(crossValidation.foldResults).toHaveLength(5);
      expect(crossValidation.seasonalityPreserved).toBe(true);

      // Each fold should maintain seasonal distribution
      crossValidation.foldResults.forEach((fold) => {
        expect(fold.trainSeasonalBalance).toBeBetween(0.4, 0.6); // Balanced seasons
        expect(fold.testSeasonalBalance).toBeBetween(0.4, 0.6);
        expect(fold.gapPreserved).toBe(true);
      });
    });
  });

  describe('Feature Engineering and Selection', () => {
    test('should perform automated feature engineering for wedding data', async () => {
      const rawData = [
        {
          inquiry_date: '2024-01-15',
          wedding_date: '2024-07-20',
          budget: 5000,
          guest_count: 120,
          venue_type: 'outdoor',
          vendor_type: 'photographer',
          client_age: 28,
          communication_response_time: 4.5, // hours
        },
      ];

      const engineeredFeatures = await predictiveAnalytics.engineerFeatures(
        rawData,
        {
          includeTimeFeatures: true,
          includeWeddingContext: true,
          includeDerivedMetrics: true,
          includeInteractionTerms: true,
        },
      );

      expect(engineeredFeatures).toBeDefined();
      expect(engineeredFeatures[0].days_until_wedding).toBe(186); // Calculated from dates
      expect(engineeredFeatures[0].wedding_season).toBe('summer');
      expect(engineeredFeatures[0].is_peak_season).toBe(true);
      expect(engineeredFeatures[0].budget_per_guest).toBeCloseTo(41.67, 2); // 5000 / 120
      expect(engineeredFeatures[0].venue_weather_risk).toBeDefined(); // Outdoor venue risk
      expect(engineeredFeatures[0].inquiry_urgency).toMatch(
        /^(low|medium|high)$/,
      );
      expect(engineeredFeatures[0].communication_efficiency).toBeDefined();
    });

    test('should select optimal features using wedding domain knowledge', async () => {
      const candidateFeatures = [
        'inquiry_response_time',
        'budget',
        'guest_count',
        'days_until_wedding',
        'vendor_rating',
        'previous_client_referral',
        'wedding_season',
        'venue_type',
        'communication_frequency',
        'social_media_engagement',
        'competitor_comparison',
        'price_sensitivity',
      ];

      // Helper function to generate training sample - EXTRACTED TO REDUCE NESTING
      const generateTrainingSample = (candidateFeatures: string[]) => {
        const features: any = {};
        candidateFeatures.forEach((feature) => {
          features[feature] = Math.random();
        });
        return {
          features,
          target: Math.random() > 0.5 ? 1 : 0,
        };
      };

      const trainingData = Array.from({ length: 1000 }, () => 
        generateTrainingSample(candidateFeatures)
      );

      const featureSelection = await predictiveAnalytics.selectFeatures(
        trainingData,
        candidateFeatures,
        {
          selectionMethod: 'wedding_domain_aware',
          maxFeatures: 8,
          weddingCriticalFeatures: [
            'days_until_wedding',
            'wedding_season',
            'budget',
          ],
          correlationThreshold: 0.8,
          importanceThreshold: 0.05,
        },
      );

      expect(featureSelection.selectedFeatures).toHaveLength(8);
      expect(featureSelection.selectedFeatures).toContain('days_until_wedding');
      expect(featureSelection.selectedFeatures).toContain('wedding_season');
      expect(featureSelection.selectedFeatures).toContain('budget');
      expect(featureSelection.featureImportanceScores).toBeDefined();
      expect(featureSelection.weddingRelevanceScores).toBeDefined();
      expect(featureSelection.correlationMatrix).toBeDefined();
    });

    test('should handle missing values with wedding context', async () => {
      const dataWithMissing = [
        {
          inquiry_response_time: 2,
          budget: null, // Missing budget
          guest_count: 120,
          wedding_date: '2024-07-15',
          venue_type: 'outdoor',
          vendor_type: 'photographer',
        },
        {
          inquiry_response_time: null, // Missing response time
          budget: 8000,
          guest_count: null, // Missing guest count
          wedding_date: '2024-08-20',
          venue_type: 'indoor',
          vendor_type: 'photographer',
        },
      ];

      const imputedData = await predictiveAnalytics.handleMissingValues(
        dataWithMissing,
        {
          method: 'wedding_context_aware',
          budgetImputationStrategy: 'venue_type_median',
          guestCountStrategy: 'budget_correlation',
          responseTimeStrategy: 'vendor_type_mean',
          preserveRelationships: true,
        },
      );

      expect(imputedData).toHaveLength(2);
      expect(imputedData[0].budget).toBeGreaterThan(0); // Should be imputed
      expect(imputedData[1].inquiry_response_time).toBeGreaterThan(0); // Should be imputed
      expect(imputedData[1].guest_count).toBeGreaterThan(0); // Should be imputed

      // Imputed values should be realistic for wedding context
      expect(imputedData[0].budget).toBeBetween(2000, 20000); // Realistic budget range
      expect(imputedData[1].guest_count).toBeBetween(20, 300); // Realistic guest count
    });
  });

  describe('Business Intelligence Integration', () => {
    test('should provide actionable business recommendations', async () => {
      const predictionResults = {
        bookingProbability: 0.25, // Low booking probability
        confidenceScore: 0.9,
        riskFactors: ['high_price_sensitivity', 'competitor_comparison'],
        currentPrice: 3000,
        marketAverage: 2500,
      };

      const recommendations =
        await predictiveAnalytics.generateBusinessRecommendations(
          mockOrganizationId,
          predictionResults,
          {
            includeActionItems: true,
            prioritizeByImpact: true,
            includeROIEstimates: true,
          },
        );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].category).toMatch(
        /^(pricing|communication|service|marketing)$/,
      );
      expect(recommendations[0].impact).toMatch(/^(high|medium|low)$/);
      expect(recommendations[0].effort).toMatch(/^(high|medium|low)$/);
      expect(recommendations[0].expectedROI).toBeDefined();
      expect(recommendations[0].actionItems).toBeInstanceOf(Array);
      expect(recommendations[0].timeline).toMatch(
        /^(immediate|short_term|long_term)$/,
      );
    });

    test('should calculate potential revenue impact', async () => {
      const scenario = {
        currentBookingRate: 0.4,
        averageBookingValue: 2500,
        monthlyInquiries: 50,
        proposedChanges: {
          priceAdjustment: -10, // 10% price reduction
          responseTimeImprovement: 50, // 50% faster responses
          serviceEnhancements: ['drone_photography', 'same_day_editing'],
        },
      };

      const revenueImpact = await predictiveAnalytics.calculateRevenueImpact(
        mockOrganizationId,
        scenario,
        {
          timeHorizon: 12, // months
          includeSeasonalVariations: true,
          includeCompetitorResponse: true,
        },
      );

      expect(revenueImpact.success).toBe(true);
      expect(revenueImpact.currentAnnualRevenue).toBe(600000); // 0.4 * 2500 * 50 * 12
      expect(revenueImpact.projectedAnnualRevenue).toBeGreaterThan(0);
      expect(revenueImpact.netImpact).toBeDefined();
      expect(revenueImpact.monthlyBreakdown).toHaveLength(12);
      expect(revenueImpact.breakEvenPoint).toBeDefined();
      expect(revenueImpact.riskAdjustedROI).toBeBetween(-1, 5); // -100% to 500% ROI range
    });

    test('should provide competitive positioning analysis', async () => {
      const competitiveData = {
        myPrice: 2800,
        myRating: 4.7,
        myBookingRate: 0.65,
        competitors: [
          { price: 2500, rating: 4.5, bookingRate: 0.7, marketShare: 0.15 },
          { price: 3200, rating: 4.8, bookingRate: 0.6, marketShare: 0.12 },
          { price: 2200, rating: 4.2, bookingRate: 0.75, marketShare: 0.18 },
          { price: 3500, rating: 4.9, bookingRate: 0.55, marketShare: 0.1 },
        ],
      };

      const positioning =
        await predictiveAnalytics.analyzeCompetitivePositioning(
          mockOrganizationId,
          competitiveData,
          {
            includeMarketGaps: true,
            includeStrategicRecommendations: true,
            analyzeValueProposition: true,
          },
        );

      expect(positioning.success).toBe(true);
      expect(positioning.marketPosition).toMatch(
        /^(leader|challenger|follower|niche)$/,
      );
      expect(positioning.pricePercentile).toBeBetween(0, 100);
      expect(positioning.ratingPercentile).toBeBetween(0, 100);
      expect(positioning.competitiveAdvantages).toBeInstanceOf(Array);
      expect(positioning.vulnerabilities).toBeInstanceOf(Array);
      expect(positioning.marketGaps).toBeInstanceOf(Array);
      expect(positioning.strategicRecommendations).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle insufficient training data gracefully', async () => {
      const insufficientData = Array.from({ length: 10 }, (_, i) => ({
        // Too few samples
        features: { price: 1000 + i * 100 },
        target: i % 2,
      }));

      const result = await predictiveAnalytics.trainBookingPredictionModel(
        mockOrganizationId,
        insufficientData,
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INSUFFICIENT_TRAINING_DATA');
      expect(result.error.minimumSamples).toBeGreaterThan(10);
      expect(result.recommendations).toContain('collect_more_data');
    });

    test('should validate prediction inputs for wedding constraints', async () => {
      const invalidInputs = {
        wedding_date: '2024-02-30', // Invalid date
        guest_count: -50, // Negative guests
        budget: 'unlimited', // Invalid type
        inquiry_response_time: -10, // Negative time
      };

      const prediction = await predictiveAnalytics.predictBookingProbability(
        mockOrganizationId,
        invalidInputs,
        { validateInputs: true },
      );

      expect(prediction.success).toBe(false);
      expect(prediction.validationErrors).toContain('invalid_wedding_date');
      expect(prediction.validationErrors).toContain('invalid_guest_count');
      expect(prediction.validationErrors).toContain('invalid_budget_type');
      expect(prediction.validationErrors).toContain('invalid_response_time');
    });

    test('should handle model prediction failures with fallback', async () => {
      // Mock model prediction failure
      const mockModel = {
        predict: jest
          .fn()
          .mockRejectedValue(new Error('Model prediction failed')),
      };

      predictiveAnalytics['models'].set(
        `${mockOrganizationId}:booking_prediction`,
        mockModel,
      );

      const prediction = await predictiveAnalytics.predictBookingProbability(
        mockOrganizationId,
        { price: 2500, budget: 5000 },
        { useFallbackModel: true },
      );

      expect(prediction.success).toBe(true);
      expect(prediction.fallbackUsed).toBe(true);
      expect(prediction.fallbackMethod).toBe('rule_based');
      expect(prediction.bookingProbability).toBeBetween(0, 1);
      expect(prediction.confidenceScore).toBeLessThan(0.7); // Lower confidence for fallback
    });

    test('should handle extreme seasonal variations', async () => {
      // Test with unusual seasonal pattern (e.g., destination wedding location)
      const extremeSeasonalData = [
        { month: 1, bookings: 0, temperature: -10, rainfall: 200 }, // Harsh winter
        { month: 7, bookings: 200, temperature: 35, rainfall: 0 }, // Perfect summer
        { month: 12, bookings: 150, temperature: 25, rainfall: 50 }, // Tropical location
      ];

      const forecast = await predictiveAnalytics.forecastSeasonalDemand(
        mockOrganizationId,
        {
          historicalData: extremeSeasonalData,
          handleExtremeVariations: true,
          outlierTreatment: 'robust_scaling',
        },
      );

      expect(forecast.success).toBe(true);
      expect(forecast.extremeVariationDetected).toBe(true);
      expect(forecast.robustForecast).toBe(true);
      expect(
        forecast.monthlyForecasts.every((m) => m.predictedBookings >= 0),
      ).toBe(true);
      expect(forecast.seasonalityStrength).toBeBetween(0.8, 1.0); // High seasonality
    });
  });
});
