import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataQualityService } from '@/lib/services/DataQualityService';
import { churnDataProcessor } from '@/lib/services/ChurnDataProcessor';
import { DATA_QUALITY_STANDARDS, QUALITY_GATES } from '@/lib/quality/churn-intelligence-standards';
import type { 
  DataQualityReport, 
  DataValidationResult, 
  SupplierRecord, 
  ChurnEvent,
  DataIntegrityCheck 
} from '@/types/churn-intelligence';

describe('Churn Data Quality Validation - WS-182', () => {
  let mockSupplierRecords: SupplierRecord[];
  let mockChurnEvents: ChurnEvent[];
  let mockTransactionData: any[];
  let mockEngagementData: any[];
  
  beforeEach(async () => {
    // Generate comprehensive test dataset with known quality issues for testing
    mockSupplierRecords = Array.from({ length: 1200 }, (_, i) => ({
      id: `supplier_${String(i).padStart(4, '0')}`,
      name: i % 50 === 0 ? null : `Test Supplier ${i}`, // Introduce 2% null names
      email: i % 75 === 0 ? 'invalid-email' : `supplier${i}@example.com`, // Invalid emails
      phone: i % 100 === 0 ? '123' : `+1-555-${String(i).padStart(4, '0')}`, // Invalid phones
      category: ['photographer', 'florist', 'caterer', 'venue', 'music', null][i % 6], // Some nulls
      registrationDate: i % 200 === 0 ? null : new Date(2023, (i % 12), (i % 28) + 1),
      monthlyRevenue: i % 150 === 0 ? -100 : Math.random() * 5000 + 500, // Negative values
      weddingCount: i % 125 === 0 ? null : Math.floor(Math.random() * 50) + 1,
      ratingAverage: i % 80 === 0 ? 6.5 : Math.random() * 2 + 3, // Out of range ratings
      lastActiveDate: i % 90 === 0 ? null : new Date(2024, (i % 12), (i % 28) + 1),
      location: {
        city: i % 60 === 0 ? '' : ['New York', 'Los Angeles', 'Chicago', 'Houston'][i % 4],
        state: i % 70 === 0 ? 'INVALID' : ['NY', 'CA', 'IL', 'TX'][i % 4],
        zipCode: i % 110 === 0 ? '123' : `${10000 + (i % 90000)}`
      },
      businessLicense: i % 300 === 0 ? null : `LIC-${i}`,
      taxId: i % 250 === 0 ? 'INVALID' : `${String(i).padStart(9, '0')}`,
      // Data consistency fields
      createdAt: new Date(2023, (i % 12), (i % 28) + 1),
      updatedAt: i % 40 === 0 ? 
        new Date(2023, (i % 12), (i % 28) - 1) : // Updated before created (inconsistent)
        new Date(2024, (i % 12), (i % 28) + 1)
    }));

    mockChurnEvents = mockSupplierRecords.slice(0, 180).map((supplier, i) => ({
      id: `churn_${i}`,
      churnDate: i % 30 === 0 ? null : new Date(2024, (i % 12), (i % 28) + 1),
      churnReason: i % 25 === 0 ? null : ['pricing', 'competition', 'service_issues', 'market_change', ''][i % 5],
      revenueImpact: i % 35 === 0 ? -500 : supplier.monthlyRevenue * (Math.random() * 6 + 6),
      customerCount: i % 45 === 0 ? null : supplier.weddingCount,
      warningSignsDetected: Math.random() > 0.3,
      preventable: Math.random() > 0.4,
      // Referential integrity test (some records will have invalid supplier IDs)
      supplierId: i % 20 === 0 ? 'non_existent_supplier' : supplier.id,
      createdAt: new Date(2024, (i % 12), (i % 28) + 1),
      // Data freshness test
      lastModified: i % 15 === 0 ? 
        new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) : // 30 days old
        new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)) // Within 7 days
    }));

    mockTransactionData = mockSupplierRecords.map((supplier, i) => ({
      supplierId: supplier.id,
      transactionDate: i % 50 === 0 ? null : new Date(2024, (i % 12), (i % 28) + 1),
      amount: i % 60 === 0 ? 0 : Math.random() * 1000 + 50,
      type: ['payment', 'refund', 'fee', '', null][i % 5],
      status: ['completed', 'pending', 'failed', 'INVALID'][i % 4],
      currency: i % 80 === 0 ? 'INVALID' : 'USD'
    }));

    mockEngagementData = mockSupplierRecords.map((supplier, i) => ({
      supplierId: supplier.id,
      loginCount: i % 70 === 0 ? null : Math.floor(Math.random() * 100),
      lastLogin: i % 85 === 0 ? null : new Date(2024, (i % 12), (i % 28) + 1),
      profileCompleteness: i % 95 === 0 ? 1.2 : Math.random(), // Out of range values
      messagesSent: Math.floor(Math.random() * 50),
      messagesReceived: Math.floor(Math.random() * 50),
      bookingResponseTime: i % 55 === 0 ? -60 : Math.random() * 1440 // Negative response time
    }));

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Completeness Validation', () => {
    it('should detect missing critical fields and enforce 95%+ completeness', async () => {
      const completenessReport = await dataQualityService.validateDataCompleteness({
        suppliers: mockSupplierRecords,
        churnEvents: mockChurnEvents,
        criticalFields: [
          'suppliers.id', 'suppliers.name', 'suppliers.email', 'suppliers.category',
          'churnEvents.supplierId', 'churnEvents.churnDate', 'churnEvents.churnReason'
        ]
      });

      expect(completenessReport).toBeDefined();
      expect(completenessReport.overallCompleteness).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DATA_COMPLETENESS);
      
      // Validate field-level completeness
      for (const fieldReport of completenessReport.fieldCompleteness) {
        expect(fieldReport.completeness).toBeGreaterThanOrEqual(0);
        expect(fieldReport.completeness).toBeLessThanOrEqual(1);
        expect(fieldReport.missingCount).toBeGreaterThanOrEqual(0);
        expect(fieldReport.totalCount).toBeGreaterThan(0);
        
        if (fieldReport.critical) {
          expect(fieldReport.completeness).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_CRITICAL_FIELD_COMPLETENESS);
        }
      }

      // Validate missing data patterns
      expect(completenessReport.missingDataPatterns).toBeDefined();
      expect(completenessReport.qualityScore).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_COMPLETENESS_SCORE);
    });

    it('should identify data gaps affecting model performance', async () => {
      const dataGapAnalysis = await dataQualityService.analyzeDataGaps({
        suppliers: mockSupplierRecords,
        churnEvents: mockChurnEvents,
        modelFeatures: [
          'monthlyRevenue', 'weddingCount', 'ratingAverage', 'lastActiveDate',
          'location.city', 'location.state', 'category'
        ]
      });

      expect(dataGapAnalysis).toBeDefined();
      expect(dataGapAnalysis.criticalGaps).toBeDefined();
      
      // Validate gap impact assessment
      for (const gap of dataGapAnalysis.criticalGaps) {
        expect(gap.feature).toBeDefined();
        expect(gap.missingPercentage).toBeGreaterThanOrEqual(0);
        expect(gap.missingPercentage).toBeLessThanOrEqual(1);
        expect(gap.modelImpact).toMatch(/low|medium|high|critical/);
        expect(gap.recommendedAction).toBeDefined();
      }

      // Validate overall data sufficiency for ML
      expect(dataGapAnalysis.modelReadinessScore).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_MODEL_READINESS);
    });
  });

  describe('Data Accuracy and Validity Validation', () => {
    it('should enforce data type constraints and format validation', async () => {
      const validationResult = await dataQualityService.validateDataTypes({
        suppliers: mockSupplierRecords,
        schemaDefinitions: {
          suppliers: {
            id: { type: 'string', required: true, pattern: /^supplier_\d{4}$/ },
            name: { type: 'string', required: true, minLength: 2 },
            email: { type: 'string', required: true, format: 'email' },
            monthlyRevenue: { type: 'number', required: true, min: 0 },
            ratingAverage: { type: 'number', required: false, min: 1, max: 5 },
            registrationDate: { type: 'date', required: true },
            location: {
              state: { type: 'string', required: true, pattern: /^[A-Z]{2}$/ },
              zipCode: { type: 'string', required: true, pattern: /^\d{5}$/ }
            }
          }
        }
      });

      expect(validationResult).toBeDefined();
      expect(validationResult.validRecords).toBeGreaterThan(0);
      expect(validationResult.totalRecords).toBe(mockSupplierRecords.length);
      
      // Validate accuracy rate
      const accuracyRate = validationResult.validRecords / validationResult.totalRecords;
      expect(accuracyRate).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DATA_ACCURACY);

      // Validate specific validation failures
      expect(validationResult.violations).toBeDefined();
      for (const violation of validationResult.violations) {
        expect(violation.field).toBeDefined();
        expect(violation.violationType).toMatch(/missing|invalid_format|out_of_range|type_mismatch/);
        expect(violation.count).toBeGreaterThan(0);
        expect(violation.severity).toMatch(/low|medium|high|critical/);
      }
    });

    it('should detect business rule violations and logical inconsistencies', async () => {
      const businessRuleValidation = await dataQualityService.validateBusinessRules({
        suppliers: mockSupplierRecords,
        churnEvents: mockChurnEvents,
        businessRules: [
          {
            name: 'supplier_registration_before_churn',
            description: 'Churn date must be after registration date',
            validation: (supplier: any, churnEvent: any) => 
              !churnEvent || new Date(churnEvent.churnDate) > new Date(supplier.registrationDate)
          },
          {
            name: 'positive_revenue_for_active_suppliers',
            description: 'Active suppliers must have positive monthly revenue',
            validation: (supplier: any) => 
              !supplier.lastActiveDate || supplier.monthlyRevenue > 0
          },
          {
            name: 'consistent_update_timestamps',
            description: 'Updated date must be after created date',
            validation: (record: any) => 
              new Date(record.updatedAt) >= new Date(record.createdAt)
          }
        ]
      });

      expect(businessRuleValidation).toBeDefined();
      expect(businessRuleValidation.overallCompliance).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_BUSINESS_RULE_COMPLIANCE);
      
      // Validate rule-specific results
      for (const ruleResult of businessRuleValidation.ruleResults) {
        expect(ruleResult.ruleName).toBeDefined();
        expect(ruleResult.passRate).toBeGreaterThanOrEqual(0);
        expect(ruleResult.passRate).toBeLessThanOrEqual(1);
        expect(ruleResult.violationCount).toBeGreaterThanOrEqual(0);
        expect(ruleResult.criticalViolations).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Data Consistency and Integrity Validation', () => {
    it('should validate referential integrity across related datasets', async () => {
      const integrityCheck = await dataQualityService.validateReferentialIntegrity({
        primaryDataset: mockSupplierRecords,
        foreignDatasets: {
          churnEvents: mockChurnEvents,
          transactions: mockTransactionData,
          engagement: mockEngagementData
        },
        relationships: [
          {
            primary: 'suppliers.id',
            foreign: 'churnEvents.supplierId',
            type: 'one_to_many'
          },
          {
            primary: 'suppliers.id',
            foreign: 'transactions.supplierId',
            type: 'one_to_many'
          },
          {
            primary: 'suppliers.id',
            foreign: 'engagement.supplierId',
            type: 'one_to_one'
          }
        ]
      });

      expect(integrityCheck).toBeDefined();
      expect(integrityCheck.overallIntegrity).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_REFERENTIAL_INTEGRITY);
      
      // Validate relationship-specific integrity
      for (const relationshipResult of integrityCheck.relationshipResults) {
        expect(relationshipResult.relationship).toBeDefined();
        expect(relationshipResult.integrityScore).toBeGreaterThanOrEqual(0);
        expect(relationshipResult.integrityScore).toBeLessThanOrEqual(1);
        expect(relationshipResult.orphanRecords).toBeGreaterThanOrEqual(0);
        expect(relationshipResult.missingReferences).toBeGreaterThanOrEqual(0);
      }

      // Validate orphaned records detection
      expect(integrityCheck.orphanedRecords).toBeDefined();
      const totalOrphans = Object.values(integrityCheck.orphanedRecords).reduce((sum: number, count) => sum + (count as number), 0);
      expect(totalOrphans).toBeLessThan(mockChurnEvents.length * 0.05); // Less than 5% orphans
    });

    it('should detect and report duplicate records', async () => {
      // Introduce known duplicates for testing
      const suppliersWithDuplicates = [...mockSupplierRecords, 
        { ...mockSupplierRecords[0], id: 'supplier_duplicate_1' },
        { ...mockSupplierRecords[1], id: 'supplier_duplicate_2' }
      ];

      const duplicateAnalysis = await dataQualityService.detectDuplicates({
        dataset: suppliersWithDuplicates,
        duplicateFields: [
          { fields: ['name', 'email'], fuzzyMatch: false },
          { fields: ['phone'], fuzzyMatch: false },
          { fields: ['name'], fuzzyMatch: true, threshold: 0.85 }
        ]
      });

      expect(duplicateAnalysis).toBeDefined();
      expect(duplicateAnalysis.duplicateGroups).toHaveLength(expect.any(Number));
      
      // Validate duplicate detection accuracy
      expect(duplicateAnalysis.duplicateGroups.length).toBeGreaterThan(0);
      expect(duplicateAnalysis.totalDuplicates).toBeGreaterThanOrEqual(2); // Our known duplicates
      
      for (const group of duplicateAnalysis.duplicateGroups) {
        expect(group.records.length).toBeGreaterThan(1);
        expect(group.confidence).toBeGreaterThan(0.7);
        expect(group.matchingFields).toHaveLength(expect.any(Number));
      }

      // Validate deduplication recommendations
      expect(duplicateAnalysis.deduplicationRecommendations).toBeDefined();
      expect(duplicateAnalysis.qualityImpact).toBeDefined();
    });
  });

  describe('Data Freshness and Timeliness Validation', () => {
    it('should validate data freshness requirements for real-time predictions', async () => {
      const freshnessReport = await dataQualityService.validateDataFreshness({
        datasets: {
          suppliers: mockSupplierRecords,
          churnEvents: mockChurnEvents,
          engagement: mockEngagementData
        },
        freshnessRequirements: {
          suppliers: { maxAge: 24, unit: 'hours' }, // 24 hours
          churnEvents: { maxAge: 12, unit: 'hours' }, // 12 hours
          engagement: { maxAge: 6, unit: 'hours' } // 6 hours
        }
      });

      expect(freshnessReport).toBeDefined();
      expect(freshnessReport.overallFreshness).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_TIMELINESS);
      
      // Validate dataset-specific freshness
      for (const [dataset, report] of Object.entries(freshnessReport.datasetFreshness)) {
        expect(report.freshRecords).toBeGreaterThanOrEqual(0);
        expect(report.staleRecords).toBeGreaterThanOrEqual(0);
        expect(report.freshnessRate).toBeGreaterThanOrEqual(0);
        expect(report.freshnessRate).toBeLessThanOrEqual(1);
        
        // Critical datasets should meet higher freshness standards
        if (['churnEvents', 'engagement'].includes(dataset)) {
          expect(report.freshnessRate).toBeGreaterThan(0.85);
        }
      }
    });

    it('should identify data staleness patterns affecting model accuracy', async () => {
      const stalenessAnalysis = await dataQualityService.analyzeStalenessPatterns({
        datasets: {
          suppliers: mockSupplierRecords,
          churnEvents: mockChurnEvents
        },
        analysisWindow: '30d',
        stalnessCriteria: {
          suppliers: 'updatedAt',
          churnEvents: 'lastModified'
        }
      });

      expect(stalenessAnalysis).toBeDefined();
      expect(stalenessAnalysis.stalenessPatterns).toBeDefined();
      
      // Validate staleness impact assessment
      for (const pattern of stalenessAnalysis.stalenessPatterns) {
        expect(pattern.dataset).toBeDefined();
        expect(pattern.averageAge).toBeGreaterThanOrEqual(0);
        expect(pattern.staleRecordCount).toBeGreaterThanOrEqual(0);
        expect(pattern.modelImpact).toMatch(/low|medium|high|critical/);
      }

      // Validate refresh recommendations
      expect(stalenessAnalysis.refreshRecommendations).toBeDefined();
      expect(stalenessAnalysis.priorityDatasets).toBeDefined();
    });
  });

  describe('Statistical Quality Validation', () => {
    it('should detect statistical anomalies and outliers affecting model training', async () => {
      const anomalyDetection = await dataQualityService.detectStatisticalAnomalies({
        dataset: mockSupplierRecords,
        numericalFields: ['monthlyRevenue', 'weddingCount', 'ratingAverage'],
        outlierDetectionMethods: ['iqr', 'zscore', 'isolation_forest'],
        confidenceThreshold: 0.95
      });

      expect(anomalyDetection).toBeDefined();
      expect(anomalyDetection.anomalies).toBeDefined();
      
      // Validate anomaly detection results
      for (const fieldAnalysis of anomalyDetection.fieldAnalyses) {
        expect(fieldAnalysis.field).toBeDefined();
        expect(fieldAnalysis.outlierCount).toBeGreaterThanOrEqual(0);
        expect(fieldAnalysis.outlierRate).toBeGreaterThanOrEqual(0);
        expect(fieldAnalysis.outlierRate).toBeLessThanOrEqual(1);
        
        // Statistical measures validation
        expect(fieldAnalysis.statistics.mean).toBeDefined();
        expect(fieldAnalysis.statistics.median).toBeDefined();
        expect(fieldAnalysis.statistics.std).toBeGreaterThanOrEqual(0);
        expect(fieldAnalysis.statistics.skewness).toBeDefined();
        expect(fieldAnalysis.statistics.kurtosis).toBeDefined();
      }

      // Validate overall data distribution health
      expect(anomalyDetection.distributionHealth).toBeDefined();
      expect(anomalyDetection.distributionHealth.normalityScore).toBeGreaterThanOrEqual(0);
      expect(anomalyDetection.distributionHealth.normalityScore).toBeLessThanOrEqual(1);
    });

    it('should validate data distributions for ML model assumptions', async () => {
      const distributionValidation = await dataQualityService.validateDistributions({
        dataset: mockSupplierRecords,
        distributionTests: [
          {
            field: 'monthlyRevenue',
            expectedDistribution: 'log-normal',
            significance: 0.05
          },
          {
            field: 'weddingCount',
            expectedDistribution: 'poisson',
            significance: 0.05
          },
          {
            field: 'ratingAverage',
            expectedDistribution: 'normal',
            significance: 0.05
          }
        ]
      });

      expect(distributionValidation).toBeDefined();
      expect(distributionValidation.overallDistributionHealth).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DISTRIBUTION_HEALTH);
      
      // Validate individual distribution tests
      for (const test of distributionValidation.distributionTests) {
        expect(test.field).toBeDefined();
        expect(test.testStatistic).toBeDefined();
        expect(test.pValue).toBeGreaterThanOrEqual(0);
        expect(test.pValue).toBeLessThanOrEqual(1);
        expect(test.passed).toBeDefined();
        expect(test.confidence).toBeGreaterThan(0.8);
      }
    });
  });

  describe('Quality Gate Enforcement', () => {
    it('should enforce comprehensive data quality gates before ML training', async () => {
      const qualityGateResult = await dataQualityService.enforceQualityGates({
        datasets: {
          suppliers: mockSupplierRecords,
          churnEvents: mockChurnEvents
        },
        qualityGates: QUALITY_GATES.ML_TRAINING,
        strictMode: true
      });

      expect(qualityGateResult).toBeDefined();
      expect(qualityGateResult.overallPassed).toBe(true);
      expect(qualityGateResult.gateResults).toHaveLength(expect.any(Number));
      
      // Validate individual gate results
      for (const gateResult of qualityGateResult.gateResults) {
        expect(gateResult.gateName).toBeDefined();
        expect(gateResult.passed).toBeDefined();
        expect(gateResult.score).toBeGreaterThanOrEqual(0);
        expect(gateResult.score).toBeLessThanOrEqual(1);
        expect(gateResult.threshold).toBeDefined();
        
        if (gateResult.critical) {
          expect(gateResult.passed).toBe(true);
        }
      }

      // Validate quality metrics meet ML requirements
      expect(qualityGateResult.qualityMetrics.completeness).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DATA_COMPLETENESS);
      expect(qualityGateResult.qualityMetrics.accuracy).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DATA_ACCURACY);
      expect(qualityGateResult.qualityMetrics.consistency).toBeGreaterThan(DATA_QUALITY_STANDARDS.MIN_DATA_CONSISTENCY);
    });

    it('should provide detailed remediation recommendations for quality failures', async () => {
      const remediationReport = await dataQualityService.generateRemediationPlan({
        qualityIssues: [
          { type: 'missing_values', severity: 'high', affectedRecords: 50 },
          { type: 'invalid_format', severity: 'medium', affectedRecords: 25 },
          { type: 'outliers', severity: 'low', affectedRecords: 10 },
          { type: 'referential_integrity', severity: 'critical', affectedRecords: 5 }
        ]
      });

      expect(remediationReport).toBeDefined();
      expect(remediationReport.recommendations).toHaveLength(expect.any(Number));
      
      // Validate remediation recommendations
      for (const recommendation of remediationReport.recommendations) {
        expect(recommendation.issueType).toBeDefined();
        expect(recommendation.priority).toMatch(/low|medium|high|critical/);
        expect(recommendation.effort).toMatch(/low|medium|high/);
        expect(recommendation.actions).toHaveLength(expect.any(Number));
        expect(recommendation.expectedImpact).toBeDefined();
        
        // Validate action items
        for (const action of recommendation.actions) {
          expect(action.type).toBeDefined();
          expect(action.description).toBeDefined();
          expect(action.automatable).toBeDefined();
          expect(action.estimatedTime).toBeDefined();
        }
      }

      // Validate prioritization and impact assessment
      const criticalRecommendations = remediationReport.recommendations.filter(r => r.priority === 'critical');
      expect(criticalRecommendations.length).toBeGreaterThan(0);
      
      expect(remediationReport.overallImpact).toBeDefined();
      expect(remediationReport.estimatedEffort).toBeDefined();
    });
  });

  describe('Continuous Quality Monitoring', () => {
    it('should establish baseline quality metrics for ongoing monitoring', async () => {
      const baselineReport = await dataQualityService.establishQualityBaseline({
        datasets: {
          suppliers: mockSupplierRecords,
          churnEvents: mockChurnEvents
        },
        monitoringFields: [
          'suppliers.monthlyRevenue', 'suppliers.weddingCount', 'suppliers.ratingAverage',
          'churnEvents.revenueImpact', 'churnEvents.churnReason'
        ]
      });

      expect(baselineReport).toBeDefined();
      expect(baselineReport.baselineMetrics).toBeDefined();
      
      // Validate baseline metric establishment
      for (const [field, metrics] of Object.entries(baselineReport.baselineMetrics)) {
        expect(metrics.completeness).toBeGreaterThanOrEqual(0);
        expect(metrics.completeness).toBeLessThanOrEqual(1);
        expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
        expect(metrics.accuracy).toBeLessThanOrEqual(1);
        expect(metrics.consistency).toBeGreaterThanOrEqual(0);
        expect(metrics.consistency).toBeLessThanOrEqual(1);
        expect(metrics.timestamp).toBeDefined();
      }

      // Validate monitoring thresholds
      expect(baselineReport.monitoringThresholds).toBeDefined();
      expect(baselineReport.alertConfiguration).toBeDefined();
    });

    it('should detect quality drift and trigger appropriate alerts', async () => {
      const driftDetection = await dataQualityService.detectQualityDrift({
        currentData: mockSupplierRecords.slice(0, 600), // First half
        historicalBaseline: mockSupplierRecords.slice(600), // Second half
        driftThresholds: {
          completeness: 0.05, // 5% drift threshold
          accuracy: 0.03, // 3% drift threshold
          distribution: 0.1 // 10% distribution shift
        }
      });

      expect(driftDetection).toBeDefined();
      expect(driftDetection.driftDetected).toBeDefined();
      expect(driftDetection.driftMetrics).toBeDefined();
      
      // Validate drift analysis
      for (const [metric, driftInfo] of Object.entries(driftDetection.driftMetrics)) {
        expect(driftInfo.currentValue).toBeDefined();
        expect(driftInfo.baselineValue).toBeDefined();
        expect(driftInfo.driftMagnitude).toBeGreaterThanOrEqual(0);
        expect(driftInfo.significance).toBeGreaterThanOrEqual(0);
        expect(driftInfo.significance).toBeLessThanOrEqual(1);
      }

      // Validate alerting and recommendations
      if (driftDetection.driftDetected) {
        expect(driftDetection.alerts).toHaveLength(expect.any(Number));
        expect(driftDetection.recommendedActions).toBeDefined();
      }
    });
  });
});