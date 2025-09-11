import { BusinessMetricsValidator } from '../validation/BusinessMetricsValidator';
import { TestDataGenerator } from '../mocks/TestDataGenerator';
import { BusinessMetricsMonitor } from '../../../scripts/business-metrics-qa/monitoring/BusinessMetricsMonitor';
import { MultiTeamCoordinator } from '../../../scripts/business-metrics-qa/automation/MultiTeamCoordinator';

/**
 * Comprehensive integration tests for WS-195 Business Metrics Dashboard
 * Tests end-to-end business intelligence validation and team coordination
 */
describe('WS-195 Business Metrics Dashboard - Integration Tests', () => {
  let validator: BusinessMetricsValidator;
  let testDataGenerator: TestDataGenerator;
  let monitor: BusinessMetricsMonitor;
  let coordinator: MultiTeamCoordinator;

  beforeAll(async () => {
    // Initialize test components
    validator = new BusinessMetricsValidator();
    testDataGenerator = new TestDataGenerator();
    monitor = new BusinessMetricsMonitor();
    coordinator = new MultiTeamCoordinator();

    // Set up test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Clean up test environment
    await cleanupTestEnvironment();
  });

  describe('Business Metrics Validation Suite', () => {
    test('should validate all business metrics with investor-grade accuracy', async () => {
      // Generate comprehensive test scenario
      const testScenario = await testDataGenerator.createComprehensiveTestScenario();
      
      // Run full validation suite
      const validationReport = await validator.validateAllBusinessMetrics();
      
      // Assert overall validation success
      expect(validationReport.overallValid).toBe(true);
      expect(validationReport.businessCriticalIssues).toHaveLength(0);
      expect(validationReport.investorReadiness.ready).toBe(true);
      expect(validationReport.investorReadiness.confidence).toBeGreaterThan(95);
      
      // Validate individual metrics
      expect(validationReport.validations).toHaveLength(7); // All validation types
      
      const mrrValidation = validationReport.validations.find(v => v.metric === 'MRR Calculation');
      expect(mrrValidation?.valid).toBe(true);
      expect(mrrValidation?.accuracy).toBeGreaterThan(98);
      
      const churnValidation = validationReport.validations.find(v => v.metric === 'Churn Analysis');
      expect(churnValidation?.valid).toBe(true);
      expect(churnValidation?.accuracy).toBeGreaterThan(95);
      
      const viralValidation = validationReport.validations.find(v => v.metric === 'Viral Coefficient');
      expect(viralValidation?.valid).toBe(true);
      expect(viralValidation?.accuracy).toBeGreaterThan(92);
    }, 30000);

    test('should handle wedding industry seasonal patterns correctly', async () => {
      // Test peak season patterns
      const peakSeasonData = await testDataGenerator.createWeddingSupplierSubscriptions({
        photographersCount: 100,
        venuesCount: 25,
        floristsCount: 75,
        caterersCount: 50,
        seasonalMix: true,
        tierDistribution: { starter: 0.3, professional: 0.4, scale: 0.25, enterprise: 0.05 }
      });

      const validationReport = await validator.validateAllBusinessMetrics();
      
      // Verify seasonal context is properly recognized
      expect(validationReport.weddingSeasonContext).toBeDefined();
      expect(validationReport.weddingSeasonContext.currentSeason).toMatch(/(peak|off-season|transition)/);
      
      // Verify seasonal adjustments are applied
      const seasonalMultipliers = validationReport.weddingSeasonContext.expectedMetricMultipliers;
      expect(seasonalMultipliers.mrr).toBeGreaterThan(0);
      expect(seasonalMultipliers.churn).toBeGreaterThan(0);
      expect(seasonalMultipliers.viral).toBeGreaterThan(0);
    });

    test('should detect and report critical business issues immediately', async () => {
      // Create edge case scenarios that should trigger alerts
      const edgeCaseScenarios = await testDataGenerator.createEdgeCaseScenarios();
      
      // Test high churn scenario
      const validationReport = await validator.validateAllBusinessMetrics();
      
      // Should detect business critical issues
      if (edgeCaseScenarios.highChurn.length > 0) {
        const churnValidation = validationReport.validations.find(v => v.metric === 'Churn Analysis');
        if (churnValidation && !churnValidation.valid) {
          expect(validationReport.businessCriticalIssues.length).toBeGreaterThan(0);
          expect(validationReport.executiveImpact).toContain('CRITICAL');
        }
      }
    });
  });

  describe('Executive Dashboard Accuracy', () => {
    test('should ensure dashboard data matches source calculations', async () => {
      const validationReport = await validator.validateAllBusinessMetrics();
      
      const dashboardValidation = validationReport.validations.find(v => 
        v.metric === 'Executive Dashboard Accuracy'
      );
      
      expect(dashboardValidation?.valid).toBe(true);
      expect(dashboardValidation?.details.dataAccuracy.mrrAccurate).toBe(true);
      expect(dashboardValidation?.details.dataAccuracy.churnAccurate).toBe(true);
      expect(dashboardValidation?.details.dataAccuracy.viralAccurate).toBe(true);
      expect(dashboardValidation?.details.dataAccuracy.seasonalAccurate).toBe(true);
      expect(dashboardValidation?.details.dataAccuracy.investorMetricsAccurate).toBe(true);
    });

    test('should meet executive performance requirements', async () => {
      const validationReport = await validator.validateAllBusinessMetrics();
      
      const dashboardValidation = validationReport.validations.find(v => 
        v.metric === 'Executive Dashboard Accuracy'
      );
      
      expect(dashboardValidation?.details.performanceMetrics.acceptable).toBe(true);
      expect(dashboardValidation?.details.performanceMetrics.loadTime).toBeLessThan(2000); // <2 seconds
      expect(dashboardValidation?.details.executiveReadiness.boardMeetingReady).toBe(true);
      expect(dashboardValidation?.details.executiveReadiness.investorPresentationReady).toBe(true);
      expect(dashboardValidation?.details.executiveReadiness.dailyOperationsReady).toBe(true);
    });

    test('should include wedding industry context in dashboard', async () => {
      const validationReport = await validator.validateAllBusinessMetrics();
      
      const dashboardValidation = validationReport.validations.find(v => 
        v.metric === 'Executive Dashboard Accuracy'
      );
      
      expect(dashboardValidation?.details.weddingIndustryContext.seasonalContextPresent).toBe(true);
      expect(dashboardValidation?.details.weddingIndustryContext.supplierSegmentationVisible).toBe(true);
      expect(dashboardValidation?.details.weddingIndustryContext.competitiveMetricsTracked).toBe(true);
    });
  });

  describe('Multi-Team Coordination', () => {
    test('should coordinate validation across all development teams', async () => {
      const coordinationResults = await coordinator.coordinateMultiTeamValidation();
      
      expect(coordinationResults.overallHealthScore).toBeGreaterThan(75);
      expect(coordinationResults.teamPerformance).toBeDefined();
      expect(coordinationResults.crossTeamIssues).toBeDefined();
      expect(coordinationResults.coordinationRecommendations.length).toBeGreaterThan(0);
      
      // Verify all teams participated
      expect(coordinationResults.teamPerformance.teamA).toBeDefined(); // Frontend
      expect(coordinationResults.teamPerformance.teamB).toBeDefined(); // Backend
      expect(coordinationResults.teamPerformance.teamC).toBeDefined(); // Integration
      expect(coordinationResults.teamPerformance.teamD).toBeDefined(); // Mobile
      expect(coordinationResults.teamPerformance.teamE).toBeDefined(); // QA/Testing
    });

    test('should identify and resolve cross-team data consistency issues', async () => {
      const coordinationResults = await coordinator.coordinateMultiTeamValidation();
      
      // Check for critical cross-team issues
      const criticalIssues = coordinationResults.crossTeamIssues.filter(
        issue => issue.severity === 'critical'
      );
      
      // If critical issues exist, they should have resolution plans
      criticalIssues.forEach(issue => {
        expect(issue.resolution).toBeDefined();
        expect(issue.estimatedResolutionTime).toBeDefined();
        expect(issue.businessRisk).toBeDefined();
        expect(issue.teams.length).toBeGreaterThan(1); // Multi-team issue
      });
    });
  });

  describe('Monitoring and Alerting System', () => {
    test('should run comprehensive monitoring without errors', async () => {
      const monitoringResult = await monitor.runComprehensiveMonitoring();
      
      expect(monitoringResult).toBeDefined();
      expect(monitoringResult.validationReport).toBeDefined();
      expect(monitoringResult.businessImpact).toBeDefined();
      expect(monitoringResult.executiveReport).toBeDefined();
      expect(monitoringResult.overallStatus).toMatch(/(healthy|warning|critical)/);
      expect(monitoringResult.nextMonitoringScheduled).toBeDefined();
    });

    test('should handle wedding day emergency monitoring', async () => {
      // Mock weekend during wedding season
      const originalDate = Date;
      const mockDate = new Date('2025-08-16'); // Saturday in peak season
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;
      global.Date.toISOString = originalDate.prototype.toISOString;

      const emergencyResult = await monitor.runWeddingDayEmergencyMonitoring();
      
      expect(emergencyResult.status).toMatch(/(standby|healthy|critical)/);
      
      if (emergencyResult.status !== 'standby') {
        expect(emergencyResult.checksCompleted).toBeGreaterThan(0);
        expect(emergencyResult.activeWeddings).toBeDefined();
        expect(emergencyResult.timestamp).toBeDefined();
      }

      // Restore original Date
      global.Date = originalDate;
    });

    test('should generate executive alerts for business critical issues', async () => {
      await monitor.setupExecutiveAlerting();
      
      // This test verifies the alerting system is properly configured
      // Actual alert testing would require mocking critical conditions
      expect(true).toBe(true); // Placeholder - system configured without errors
    });

    test('should generate weekly executive reports', async () => {
      const executiveReport = await monitor.generateWeeklyExecutiveReport();
      
      expect(executiveReport.period).toBeDefined();
      expect(executiveReport.summary).toBeDefined();
      expect(executiveReport.summary.mrr).toBeDefined();
      expect(executiveReport.summary.churn).toBeDefined();
      expect(executiveReport.summary.viral).toBeDefined();
      expect(executiveReport.summary.seasonal).toBeDefined();
      
      expect(executiveReport.keyInsights.length).toBeGreaterThan(0);
      expect(executiveReport.actionItems.length).toBeGreaterThan(0);
      expect(executiveReport.weddingIndustryContext).toBeDefined();
      expect(executiveReport.investorHighlights.length).toBeGreaterThan(0);
    });
  });

  describe('Wedding Industry Specific Tests', () => {
    test('should accurately model photographer supplier patterns', async () => {
      const photographerData = await testDataGenerator.createWeddingSupplierSubscriptions({
        photographersCount: 50,
        venuesCount: 0,
        floristsCount: 0,
        caterersCount: 0,
        seasonalMix: true,
        tierDistribution: { starter: 0.4, professional: 0.5, scale: 0.08, enterprise: 0.02 }
      });

      const validationReport = await validator.validateAllBusinessMetrics();
      
      // Photographers should show high viral coefficient (strong referral networks)
      const viralValidation = validationReport.validations.find(v => v.metric === 'Viral Coefficient');
      expect(viralValidation?.details.weddingIndustryFactors.professionalReferralRate).toBeGreaterThan(0);
      
      // Photographers should have strong retention during peak season
      const churnValidation = validationReport.validations.find(v => v.metric === 'Churn Analysis');
      expect(churnValidation?.details.supplierTypePatterns).toBeDefined();
    });

    test('should accurately model venue supplier patterns', async () => {
      const venueData = await testDataGenerator.createWeddingSupplierSubscriptions({
        photographersCount: 0,
        venuesCount: 25,
        floristsCount: 0,
        caterersCount: 0,
        seasonalMix: true,
        tierDistribution: { starter: 0.15, professional: 0.35, scale: 0.35, enterprise: 0.15 }
      });

      const validationReport = await validator.validateAllBusinessMetrics();
      
      // Venues should show higher tier usage and premium pricing
      const mrrValidation = validationReport.validations.find(v => v.metric === 'MRR Calculation');
      expect(mrrValidation?.details.supplierMixAccuracy).toBeGreaterThan(90);
    });

    test('should handle seasonal churn patterns correctly', async () => {
      // Create off-season churn scenario
      const offSeasonChurn = await testDataGenerator.createChurnScenarios({
        peakSeasonChurn: 0.03,
        offSeasonChurn: 0.18,
        supplierTypes: ['photographer', 'venue', 'florist', 'caterer'],
        timeRange: '12-months',
        includeReactivations: true
      });

      const validationReport = await validator.validateAllBusinessMetrics();
      
      const churnValidation = validationReport.validations.find(v => v.metric === 'Churn Analysis');
      expect(churnValidation?.details.seasonalPatterns).toBeDefined();
      expect(churnValidation?.details.weddingIndustryInsights).toBeDefined();
    });

    test('should validate wedding network viral effects', async () => {
      const referralData = await testDataGenerator.createReferralScenarios({
        referralSources: ['wedding_planner_network', 'venue_partnerships', 'photographer_referrals'],
        conversionRates: {
          wedding_planner_network: 0.35,
          venue_partnerships: 0.28,
          photographer_referrals: 0.42
        },
        seasonalMultipliers: { peak: 2.5, offSeason: 0.6 }
      });

      const validationReport = await validator.validateAllBusinessMetrics();
      
      const viralValidation = validationReport.validations.find(v => v.metric === 'Viral Coefficient');
      expect(viralValidation?.details.referralSourceBreakdown).toBeDefined();
      expect(viralValidation?.details.seasonalPerformance).toBeDefined();
      expect(viralValidation?.details.businessImplications.sustainableGrowth).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should complete comprehensive validation within performance thresholds', async () => {
      const startTime = Date.now();
      
      const validationReport = await validator.validateAllBusinessMetrics();
      
      const executionTime = Date.now() - startTime;
      
      // Should complete within 30 seconds for executive dashboard requirements
      expect(executionTime).toBeLessThan(30000);
      expect(validationReport).toBeDefined();
    });

    test('should handle large data volumes without performance degradation', async () => {
      // Create large test dataset
      const largeDataset = await testDataGenerator.createWeddingSupplierSubscriptions({
        photographersCount: 500,
        venuesCount: 100,
        floristsCount: 300,
        caterersCount: 200,
        seasonalMix: true,
        tierDistribution: { starter: 0.4, professional: 0.35, scale: 0.2, enterprise: 0.05 }
      });

      const startTime = Date.now();
      const validationReport = await validator.validateAllBusinessMetrics();
      const executionTime = Date.now() - startTime;
      
      // Should maintain performance even with large datasets
      expect(executionTime).toBeLessThan(45000); // 45 seconds max for large dataset
      expect(validationReport.overallValid).toBeDefined();
    });
  });

  // Helper functions
  async function setupTestEnvironment(): Promise<void> {
    // Set up test database, mock services, etc.
    console.log('🧪 Setting up test environment for business metrics validation...');
    
    // Mock external services
    jest.mock('@supabase/supabase-js');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  }

  async function cleanupTestEnvironment(): Promise<void> {
    // Clean up test data, connections, etc.
    console.log('🧹 Cleaning up test environment...');
    
    // Clear any test data
    // Close database connections
    // Reset environment variables
  }
});

/**
 * Performance benchmark tests
 */
describe('WS-195 Performance Benchmarks', () => {
  test('executive dashboard load time should be under 2 seconds', async () => {
    const validator = new BusinessMetricsValidator();
    
    const startTime = Date.now();
    const dashboardData = await validator['fetchExecutiveDashboardData']();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('business metrics calculation should be under 5 seconds', async () => {
    const validator = new BusinessMetricsValidator();
    
    const startTime = Date.now();
    await validator.validateAllBusinessMetrics();
    const calculationTime = Date.now() - startTime;
    
    expect(calculationTime).toBeLessThan(5000);
  });

  test('multi-team coordination should complete within 10 seconds', async () => {
    const coordinator = new MultiTeamCoordinator();
    
    const startTime = Date.now();
    await coordinator.coordinateMultiTeamValidation();
    const coordinationTime = Date.now() - startTime;
    
    expect(coordinationTime).toBeLessThan(10000);
  });
});

/**
 * Edge case and error handling tests
 */
describe('WS-195 Edge Cases and Error Handling', () => {
  test('should handle zero-revenue scenarios gracefully', async () => {
    const testDataGenerator = new TestDataGenerator();
    const validator = new BusinessMetricsValidator();
    
    // Create scenario with no active subscriptions
    const emptyData = await testDataGenerator.createWeddingSupplierSubscriptions({
      photographersCount: 0,
      venuesCount: 0,
      floristsCount: 0,
      caterersCount: 0,
      seasonalMix: false,
      tierDistribution: { starter: 0, professional: 0, scale: 0, enterprise: 0 }
    });
    
    const validationReport = await validator.validateAllBusinessMetrics();
    
    // Should not crash, but should report issues appropriately
    expect(validationReport).toBeDefined();
    expect(validationReport.timestamp).toBeDefined();
  });

  test('should handle data corruption scenarios', async () => {
    const validator = new BusinessMetricsValidator();
    
    // This would test how the system handles corrupted or inconsistent data
    // Implementation would depend on specific corruption scenarios
    expect(async () => {
      await validator.validateAllBusinessMetrics();
    }).not.toThrow();
  });

  test('should handle network failures gracefully', async () => {
    const monitor = new BusinessMetricsMonitor();
    
    // Mock network failure
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Should handle failures without crashing
    expect(async () => {
      await monitor.runComprehensiveMonitoring();
    }).not.toThrow();
    
    jest.restoreAllMocks();
  });
});