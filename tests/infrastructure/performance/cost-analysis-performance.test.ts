import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { CostAnalysisPerformanceManager } from '../../../src/lib/services/infrastructure/cost-analysis-performance';
import { CostDataGenerator } from '../utils/cost-data-generator';
import { PerformanceProfiler } from '../../../src/lib/services/infrastructure/performance-profiler';

describe('Cost Analysis Performance Testing', () => {
  let costAnalysisManager: CostAnalysisPerformanceManager;
  let costDataGenerator: CostDataGenerator;
  let performanceProfiler: PerformanceProfiler;

  beforeEach(async () => {
    costAnalysisManager = new CostAnalysisPerformanceManager();
    costDataGenerator = new CostDataGenerator();
    performanceProfiler = new PerformanceProfiler();

    await costAnalysisManager.initialize({
      enableCaching: true,
      parallelProcessing: true,
      batchSize: 1000,
      optimizations: ['indexing', 'aggregation', 'compression']
    });
  });

  describe('Large Scale Cost Analysis', () => {
    test('should complete cost analysis for 50,000+ entries in under 30 seconds', async () => {
      const costEntries = await costDataGenerator.generateCostData({
        entries: 55000,
        providers: ['aws', 'azure', 'gcp', 'digitalocean'],
        timeRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-12-31')
        },
        currencies: ['USD', 'EUR', 'GBP'],
        services: [
          'compute', 'storage', 'networking', 'database', 
          'analytics', 'cdn', 'monitoring', 'security'
        ]
      });

      expect(costEntries.length).toBe(55000);

      const analysisStart = performance.now();
      const costAnalysis = await costAnalysisManager.performComprehensiveCostAnalysis({
        data: costEntries,
        analysisTypes: [
          'total_spend',
          'provider_breakdown', 
          'service_breakdown',
          'trend_analysis',
          'optimization_opportunities',
          'budget_variance',
          'cost_forecasting'
        ],
        enableOptimizations: true
      });
      const analysisTime = (performance.now() - analysisStart) / 1000; // seconds

      expect(analysisTime).toBeLessThan(30); // <30s requirement
      expect(costAnalysis.success).toBe(true);
      expect(costAnalysis.entriesProcessed).toBe(55000);
      expect(costAnalysis.totalSpend).toBeGreaterThan(0);
      expect(costAnalysis.optimizationOpportunities.length).toBeGreaterThan(0);
    });

    test('should handle multi-currency cost aggregation efficiently', async () => {
      const multiCurrencyCosts = await costDataGenerator.generateMultiCurrencyCostData({
        baseEntries: 25000,
        currencies: {
          'USD': 0.4, // 40% of entries
          'EUR': 0.25, // 25% of entries
          'GBP': 0.2,  // 20% of entries
          'CAD': 0.1,  // 10% of entries
          'AUD': 0.05  // 5% of entries
        },
        exchangeRateVariability: true
      });

      const currencyAnalysisStart = performance.now();
      const currencyAnalysis = await costAnalysisManager.performMultiCurrencyAnalysis({
        data: multiCurrencyCosts,
        baseCurrency: 'USD',
        includeExchangeRateImpact: true,
        historicalRates: true
      });
      const currencyAnalysisTime = performance.now() - currencyAnalysisStart;

      expect(currencyAnalysisTime).toBeLessThan(5000); // <5s for currency processing
      expect(currencyAnalysis.normalizedCosts.length).toBe(25000);
      expect(currencyAnalysis.exchangeRateImpact).toBeDefined();
      expect(currencyAnalysis.totalUSDEquivalent).toBeGreaterThan(0);
    });

    test('should optimize cost trend analysis for time-series data', async () => {
      const timeSeriesCosts = await costDataGenerator.generateTimeSeriesCostData({
        dailyEntries: 500,
        duration: 365, // 1 year of data
        seasonality: true,
        growthTrend: 0.15, // 15% annual growth
        volatility: 0.1 // 10% random variation
      });

      const totalEntries = 500 * 365; // 182,500 entries
      expect(timeSeriesCosts.length).toBe(totalEntries);

      const trendAnalysisStart = performance.now();
      const trendAnalysis = await costAnalysisManager.performTrendAnalysis({
        data: timeSeriesCosts,
        analysisTypes: [
          'daily_trends',
          'weekly_patterns', 
          'monthly_aggregates',
          'seasonal_analysis',
          'growth_rate_calculation',
          'anomaly_detection',
          'forecasting_3_months'
        ],
        optimizeForSpeed: true
      });
      const trendAnalysisTime = performance.now() - trendAnalysisStart;

      expect(trendAnalysisTime).toBeLessThan(15000); // <15s for trend analysis
      expect(trendAnalysis.dailyTrends.length).toBe(365);
      expect(trendAnalysis.monthlyAggregates.length).toBe(12);
      expect(trendAnalysis.seasonalPatterns).toBeDefined();
      expect(trendAnalysis.forecast.length).toBeGreaterThan(0);
    });
  });

  describe('Cost Optimization Performance', () => {
    test('should identify optimization opportunities within performance budget', async () => {
      const optimizationData = await costDataGenerator.generateOptimizationCandidates({
        resources: 15000,
        utilizationVariation: true,
        oversizedResources: 0.25, // 25% oversized
        underutilizedResources: 0.35, // 35% underutilized
        zombieResources: 0.05 // 5% zombie resources
      });

      const optimizationStart = performance.now();
      const optimizations = await costAnalysisManager.identifyOptimizationOpportunities({
        resources: optimizationData,
        optimizationTypes: [
          'right_sizing',
          'reserved_instances',
          'spot_instances',
          'zombie_cleanup',
          'storage_optimization',
          'network_optimization'
        ],
        savingsThreshold: 100, // Minimum $100/month savings
        performanceImpactAnalysis: true
      });
      const optimizationTime = performance.now() - optimizationStart;

      expect(optimizationTime).toBeLessThan(10000); // <10s for optimization analysis
      expect(optimizations.opportunities.length).toBeGreaterThan(100);
      expect(optimizations.totalPotentialSavings.monthly).toBeGreaterThan(5000);
      expect(optimizations.highImpactOpportunities).toBeGreaterThan(50);
      expect(optimizations.processingTime).toBeLessThan(10);
    });

    test('should calculate ROI for optimization recommendations efficiently', async () => {
      const roiCalculationData = await costDataGenerator.generateROICalculationData({
        optimizationScenarios: 1000,
        complexityLevels: ['simple', 'moderate', 'complex'],
        riskLevels: ['low', 'medium', 'high'],
        implementationCosts: true,
        timeToValue: true
      });

      const roiStart = performance.now();
      const roiAnalysis = await costAnalysisManager.calculateOptimizationROI({
        scenarios: roiCalculationData,
        timeHorizon: 24, // 24 months
        discountRate: 0.08, // 8% discount rate
        riskAdjustment: true,
        sensitivityAnalysis: true
      });
      const roiTime = performance.now() - roiStart;

      expect(roiTime).toBeLessThan(5000); // <5s for ROI calculations
      expect(roiAnalysis.scenarios.length).toBe(1000);
      expect(roiAnalysis.averageROI).toBeGreaterThan(0);
      expect(roiAnalysis.highROIOpportunities).toBeGreaterThan(200);
      expect(roiAnalysis.paybackPeriods).toBeDefined();
    });
  });

  describe('Real-Time Cost Monitoring Performance', () => {
    test('should process real-time cost updates with minimal latency', async () => {
      const baselineCosts = await costDataGenerator.generateCostData({ entries: 10000 });
      await costAnalysisManager.initializeCostMonitoring(baselineCosts);

      const updateLatencies: number[] = [];
      const costUpdates = Array.from({ length: 500 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000),
        resourceId: `resource-${Math.floor(Math.random() * 1000)}`,
        costDelta: (Math.random() - 0.5) * 100, // -50 to +50
        currency: 'USD',
        provider: ['aws', 'azure', 'gcp'][Math.floor(Math.random() * 3)]
      }));

      // Process cost updates and measure latency
      for (const update of costUpdates) {
        const updateStart = performance.now();
        await costAnalysisManager.processCostUpdate(update);
        const latency = performance.now() - updateStart;
        updateLatencies.push(latency);
      }

      const avgLatency = updateLatencies.reduce((a, b) => a + b) / updateLatencies.length;
      const maxLatency = Math.max(...updateLatencies);
      const p95Latency = updateLatencies.sort((a, b) => a - b)[Math.floor(updateLatencies.length * 0.95)];

      expect(avgLatency).toBeLessThan(50); // <50ms average
      expect(maxLatency).toBeLessThan(200); // <200ms max
      expect(p95Latency).toBeLessThan(100); // <100ms p95
    });

    test('should handle cost alert processing efficiently', async () => {
      const budgetRules = await costDataGenerator.generateBudgetRules({
        budgets: 200,
        alertThresholds: [50, 80, 95, 100], // Percentage thresholds
        categories: ['compute', 'storage', 'networking', 'other'],
        timeWindows: ['daily', 'weekly', 'monthly']
      });

      const costAlerts = await costDataGenerator.generateCostAlertScenarios({
        scenarios: 1000,
        severityLevels: ['info', 'warning', 'critical'],
        budgetViolations: true
      });

      const alertProcessingStart = performance.now();
      const alertResults = await costAnalysisManager.processCostAlerts({
        rules: budgetRules,
        alerts: costAlerts,
        enableNotifications: false, // Skip actual notifications for testing
        batchProcessing: true
      });
      const alertProcessingTime = performance.now() - alertProcessingStart;

      expect(alertProcessingTime).toBeLessThan(3000); // <3s for alert processing
      expect(alertResults.processedAlerts).toBe(1000);
      expect(alertResults.criticalAlerts).toBeGreaterThan(0);
      expect(alertResults.notificationsSuppressed).toBe(0); // No duplicates
    });
  });

  describe('Cost Forecasting Performance', () => {
    test('should generate accurate forecasts within time constraints', async () => {
      const historicalData = await costDataGenerator.generateHistoricalCostData({
        months: 24, // 2 years of history
        entriesPerMonth: 2000,
        seasonalPatterns: true,
        growthTrends: true,
        economicFactors: true
      });

      const forecastingStart = performance.now();
      const forecast = await costAnalysisManager.generateCostForecast({
        historicalData,
        forecastHorizon: 12, // 12 months ahead
        modelTypes: [
          'linear_regression',
          'seasonal_decomposition',
          'arima',
          'exponential_smoothing'
        ],
        confidenceIntervals: [80, 95],
        scenarioAnalysis: {
          optimistic: 0.85,
          baseline: 1.0,
          pessimistic: 1.15
        }
      });
      const forecastingTime = performance.now() - forecastingStart;

      expect(forecastingTime).toBeLessThan(20000); // <20s for forecasting
      expect(forecast.predictions.length).toBe(12);
      expect(forecast.accuracy.mape).toBeLessThan(0.15); // <15% MAPE
      expect(forecast.confidenceIntervals['95'].length).toBe(12);
      expect(forecast.scenarios.optimistic.length).toBe(12);
    });
  });

  describe('Wedding Season Cost Scaling Performance', () => {
    test('should calculate wedding season cost scaling efficiently', async () => {
      const baselineData = await costDataGenerator.generateWeddingSeasonBaseline({
        nonWeddingMonths: 8,
        weddingSeasonMonths: 4,
        baseInfrastructureCost: 50000, // $50k/month baseline
        scalingFactors: {
          compute: 3.0,
          storage: 4.0,
          cdn: 5.0,
          database: 2.0
        }
      });

      const seasonalScalingStart = performance.now();
      const seasonalAnalysis = await costAnalysisManager.analyzeWeddingSeasonCosts({
        baseline: baselineData,
        weddingSeasonMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
        peakWeddingDays: ['Saturday'],
        scalingStrategies: [
          'auto_scaling',
          'scheduled_scaling',
          'predictive_scaling',
          'manual_scaling'
        ],
        costOptimization: true
      });
      const seasonalAnalysisTime = performance.now() - seasonalScalingStart;

      expect(seasonalAnalysisTime).toBeLessThan(8000); // <8s for seasonal analysis
      expect(seasonalAnalysis.seasonalIncrease.percentage).toBeGreaterThan(200); // >200% increase
      expect(seasonalAnalysis.peakDayCosts.Saturday).toBeGreaterThan(baselineData.dailyBaseline);
      expect(seasonalAnalysis.optimizedStrategy).toBeDefined();
      expect(seasonalAnalysis.potentialSavings).toBeGreaterThan(0);
    });
  });

  afterEach(async () => {
    await costAnalysisManager.cleanup();
    await performanceProfiler.generateReport();
  });
});
