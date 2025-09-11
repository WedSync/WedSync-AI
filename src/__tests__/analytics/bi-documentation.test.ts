/**
 * WS-332 Team E: Business Intelligence Documentation and Analysis Testing
 *
 * Comprehensive test suite for BI documentation framework functionality.
 * Validates automated report generation, stakeholder-specific documentation,
 * trend analysis, and business intelligence insights for WedSync analytics.
 *
 * @feature WS-332
 * @team Team-E-QA-Testing
 * @category BI Documentation Testing
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BIDocumentationFramework,
  DocumentationConfig,
  TestExecutionSummary,
  PerformanceMetrics,
  SecurityFindings,
  ComplianceStatus,
} from '../utils/bi-documentation-framework';

describe('WS-332: Business Intelligence Documentation Framework', () => {
  let biFramework: BIDocumentationFramework;
  let testOutputDirectory: string;
  let sampleTestResults: any[];
  let sampleExecutionSummary: TestExecutionSummary;

  beforeAll(async () => {
    console.log('[WS-332] Initializing BI Documentation Framework testing...');

    // Setup test output directory
    testOutputDirectory = path.join(
      process.cwd(),
      'test-reports',
      'bi-documentation',
    );
    await fs.mkdir(testOutputDirectory, { recursive: true });

    // Configure BI Documentation Framework
    const documentationConfig: DocumentationConfig = {
      outputDirectory: testOutputDirectory,
      templateDirectory: path.join(process.cwd(), 'templates'),
      reportFormats: [
        {
          type: 'html',
          template: 'executive-report.html',
          styling: 'modern-dashboard.css',
          includeInteractivity: true,
        },
        {
          type: 'markdown',
          template: 'technical-report.md',
          styling: '',
          includeInteractivity: false,
        },
        {
          type: 'json',
          template: '',
          styling: '',
          includeInteractivity: false,
        },
        {
          type: 'csv',
          template: '',
          styling: '',
          includeInteractivity: false,
        },
      ],
      includeTechnicalDetails: true,
      includeBusinessMetrics: true,
      includeComplianceSection: true,
      autoGenerateCharts: true,
      exportToBI: true,
      stakeholderReports: [
        {
          stakeholderType: 'executive',
          reportSections: [
            'executive_summary',
            'performance_metrics',
            'business_impact',
            'recommendations',
          ],
          detailLevel: 'summary',
          deliveryMethod: 'email',
        },
        {
          stakeholderType: 'technical',
          reportSections: [
            'technical_details',
            'performance_metrics',
            'security_assessment',
            'recommendations',
          ],
          detailLevel: 'detailed',
          deliveryMethod: 'dashboard',
        },
        {
          stakeholderType: 'compliance',
          reportSections: [
            'compliance_status',
            'security_assessment',
            'recommendations',
          ],
          detailLevel: 'comprehensive',
          deliveryMethod: 'file',
        },
        {
          stakeholderType: 'business',
          reportSections: [
            'business_impact',
            'performance_metrics',
            'executive_summary',
          ],
          detailLevel: 'summary',
          deliveryMethod: 'api',
        },
      ],
    };

    biFramework = new BIDocumentationFramework(documentationConfig);

    // Create sample test data
    sampleTestResults = await createSampleTestResults();
    sampleExecutionSummary = await createSampleExecutionSummary();

    console.log('[WS-332] BI Documentation Framework test environment ready');
  });

  afterAll(async () => {
    console.log('[WS-332] Cleaning up BI Documentation test environment...');
    // Cleanup test files would go here if needed in production
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Comprehensive Report Generation', () => {
    test('should generate comprehensive test reports for all stakeholder types', async () => {
      console.log('[WS-332] Testing comprehensive report generation...');

      const startTime = Date.now();
      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );
      const generationTime = Date.now() - startTime;

      // Validate report generation results
      expect(result.reportPaths).toHaveLength(16); // 4 stakeholders × 4 formats
      expect(result.analysisResults).toHaveLength(4); // performance, security, compliance, business
      expect(generationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all report files were created
      for (const reportPath of result.reportPaths) {
        const fileExists = await fs
          .access(reportPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Verify file has content
        const stats = await fs.stat(reportPath);
        expect(stats.size).toBeGreaterThan(0);
      }

      // Validate analysis results structure
      const analysisTypes = result.analysisResults.map((r) => r.analysisType);
      expect(analysisTypes).toEqual(
        expect.arrayContaining([
          'performance',
          'security',
          'compliance',
          'business',
        ]),
      );

      console.log(
        `[WS-332] Generated ${result.reportPaths.length} reports and ${result.analysisResults.length} analyses in ${generationTime}ms`,
      );
    });

    test('should generate executive dashboard with comprehensive KPIs', async () => {
      console.log('[WS-332] Testing executive dashboard generation...');

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );

      // Find dashboard file
      const dashboardPath = result.reportPaths.find((path) =>
        path.includes('executive-dashboard'),
      );
      expect(dashboardPath).toBeDefined();

      if (dashboardPath) {
        const dashboardContent = await fs.readFile(dashboardPath, 'utf-8');
        const dashboard = JSON.parse(dashboardContent);

        // Validate dashboard structure
        expect(dashboard.title).toContain(
          'WS-332 Analytics Testing Executive Dashboard',
        );
        expect(dashboard.kpis).toBeDefined();
        expect(dashboard.kpis.testSuccessRate).toMatch(/^\d+\.\d$/);
        expect(dashboard.kpis.performanceScore).toMatch(/^\d+\.\d$/);
        expect(dashboard.kpis.securityScore).toMatch(/^\d+\.\d$/);
        expect(dashboard.kpis.complianceScore).toMatch(/^\d+\.\d$/);

        expect(dashboard.trends).toBeInstanceOf(Array);
        expect(dashboard.recommendations).toBeInstanceOf(Array);
        expect(dashboard.recommendations.length).toBeGreaterThan(0);

        console.log(
          `[WS-332] Executive dashboard contains ${dashboard.recommendations.length} recommendations`,
        );
      }
    });

    test('should generate stakeholder-specific reports with appropriate detail levels', async () => {
      console.log('[WS-332] Testing stakeholder-specific report generation...');

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );

      const stakeholderTypes = [
        'executive',
        'technical',
        'compliance',
        'business',
      ];

      for (const stakeholderType of stakeholderTypes) {
        const stakeholderReports = result.reportPaths.filter((path) =>
          path.includes(`-${stakeholderType}-`),
        );

        expect(stakeholderReports.length).toBeGreaterThan(0);

        // Check markdown report for content validation
        const markdownReport = stakeholderReports.find((path) =>
          path.endsWith('.md'),
        );
        if (markdownReport) {
          const content = await fs.readFile(markdownReport, 'utf-8');

          expect(content).toContain(`**Stakeholder**: ${stakeholderType}`);
          expect(content).toContain('Test Execution Overview');
          expect(content).toContain('Total Tests');
          expect(content).toContain('Success Rate');

          // Stakeholder-specific content checks
          if (stakeholderType === 'executive') {
            expect(content).toContain('Executive Summary');
            expect(content).toContain('Business Impact');
          } else if (stakeholderType === 'technical') {
            expect(content).toContain('Performance Metrics');
            expect(content).toContain('Security Assessment');
          } else if (stakeholderType === 'compliance') {
            expect(content).toContain('Compliance Status');
            expect(content).toContain('GDPR Compliant');
          }
        }
      }

      console.log(
        `[WS-332] Generated stakeholder-specific reports for ${stakeholderTypes.length} stakeholder types`,
      );
    });
  });

  describe('Business Intelligence Analysis', () => {
    test('should perform comprehensive performance trend analysis', async () => {
      console.log('[WS-332] Testing performance trend analysis...');

      const performanceAnalysis = await biFramework.analyzePerformanceTrends(
        sampleExecutionSummary,
      );

      expect(performanceAnalysis.analysisId).toMatch(/^perf-\d+$/);
      expect(performanceAnalysis.analysisType).toBe('performance');
      expect(performanceAnalysis.dataPoints).toBeInstanceOf(Array);
      expect(performanceAnalysis.dataPoints.length).toBeGreaterThan(0);
      expect(performanceAnalysis.trends).toBeInstanceOf(Array);
      expect(performanceAnalysis.recommendations).toBeInstanceOf(Array);
      expect(performanceAnalysis.riskAssessment).toBeDefined();

      // Validate data points structure
      const dataPoint = performanceAnalysis.dataPoints[0];
      expect(dataPoint).toHaveProperty('metric');
      expect(dataPoint).toHaveProperty('value');
      expect(dataPoint).toHaveProperty('timestamp');
      expect(dataPoint).toHaveProperty('category');
      expect(dataPoint).toHaveProperty('source');

      // Validate performance-specific metrics
      const metrics = performanceAnalysis.dataPoints.map((dp) => dp.metric);
      expect(metrics).toEqual(
        expect.arrayContaining([
          'response_time_avg',
          'throughput_rps',
          'error_rate',
        ]),
      );

      console.log(
        `[WS-332] Performance analysis generated ${performanceAnalysis.dataPoints.length} data points and ${performanceAnalysis.recommendations.length} recommendations`,
      );
    });

    test('should perform comprehensive security trend analysis', async () => {
      console.log('[WS-332] Testing security trend analysis...');

      const securityAnalysis = await biFramework.analyzeSecurityTrends(
        sampleExecutionSummary,
      );

      expect(securityAnalysis.analysisId).toMatch(/^sec-\d+$/);
      expect(securityAnalysis.analysisType).toBe('security');
      expect(securityAnalysis.dataPoints).toBeInstanceOf(Array);
      expect(securityAnalysis.dataPoints.length).toBeGreaterThan(0);
      expect(securityAnalysis.riskAssessment).toBeDefined();
      expect(securityAnalysis.riskAssessment.overallRiskLevel).toMatch(
        /^(critical|high|medium|low)$/,
      );

      // Validate security-specific metrics
      const metrics = securityAnalysis.dataPoints.map((dp) => dp.metric);
      expect(metrics).toEqual(
        expect.arrayContaining([
          'total_vulnerabilities',
          'gdpr_compliance_score',
        ]),
      );

      // Validate risk assessment
      expect(securityAnalysis.riskAssessment.riskFactors).toBeInstanceOf(Array);
      expect(
        securityAnalysis.riskAssessment.mitigationStrategies,
      ).toBeInstanceOf(Array);
      expect(
        securityAnalysis.riskAssessment.monitoringRequirements,
      ).toBeInstanceOf(Array);

      console.log(
        `[WS-332] Security analysis identified ${securityAnalysis.riskAssessment.riskFactors.length} risk factors`,
      );
    });

    test('should perform comprehensive compliance trend analysis', async () => {
      console.log('[WS-332] Testing compliance trend analysis...');

      const complianceAnalysis = await biFramework.analyzeComplianceTrends(
        sampleExecutionSummary,
      );

      expect(complianceAnalysis.analysisId).toMatch(/^comp-\d+$/);
      expect(complianceAnalysis.analysisType).toBe('compliance');
      expect(complianceAnalysis.dataPoints).toBeInstanceOf(Array);
      expect(complianceAnalysis.recommendations).toBeInstanceOf(Array);

      // Validate compliance-specific metrics
      const complianceMetrics = complianceAnalysis.dataPoints.map(
        (dp) => dp.metric,
      );
      expect(complianceMetrics).toContain('compliance_score');

      // Check for compliance-specific recommendations
      const complianceRec = complianceAnalysis.recommendations.find(
        (rec) => rec.category === 'compliance',
      );
      expect(complianceRec).toBeDefined();
      expect(complianceRec?.description).toContain('GDPR');

      console.log(
        `[WS-332] Compliance analysis generated ${complianceAnalysis.recommendations.length} compliance recommendations`,
      );
    });

    test('should perform comprehensive business metrics analysis', async () => {
      console.log('[WS-332] Testing business metrics analysis...');

      const businessAnalysis = await biFramework.analyzeBusinessMetrics(
        sampleExecutionSummary,
      );

      expect(businessAnalysis.analysisId).toMatch(/^bus-\d+$/);
      expect(businessAnalysis.analysisType).toBe('business');
      expect(businessAnalysis.dataPoints).toBeInstanceOf(Array);

      // Validate business-specific metrics
      const businessMetrics = businessAnalysis.dataPoints.map(
        (dp) => dp.metric,
      );
      expect(businessMetrics).toEqual(
        expect.arrayContaining(['test_success_rate', 'code_coverage']),
      );

      // Validate business impact assessment
      expect(businessAnalysis.riskAssessment.overallRiskLevel).toMatch(
        /^(critical|high|medium|low)$/,
      );

      const businessRec = businessAnalysis.recommendations.find(
        (rec) => rec.category === 'business',
      );
      expect(businessRec).toBeDefined();

      console.log(
        `[WS-332] Business analysis assessed overall risk level as: ${businessAnalysis.riskAssessment.overallRiskLevel}`,
      );
    });
  });

  describe('Report Format Generation', () => {
    test('should generate valid HTML reports with proper structure', async () => {
      console.log('[WS-332] Testing HTML report generation...');

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );

      const htmlReports = result.reportPaths.filter((path) =>
        path.endsWith('.html'),
      );
      expect(htmlReports.length).toBeGreaterThan(0);

      for (const htmlReport of htmlReports) {
        const htmlContent = await fs.readFile(htmlReport, 'utf-8');

        // Basic HTML structure validation
        expect(htmlContent).toContain('<!DOCTYPE html>');
        expect(htmlContent).toContain('<html lang="en">');
        expect(htmlContent).toContain('<head>');
        expect(htmlContent).toContain('<body>');
        expect(htmlContent).toContain('WS-332');

        // Check for CSS styling
        expect(htmlContent).toContain('<style>');
        expect(htmlContent).toContain('font-family');

        // Check for content sections
        expect(htmlContent).toContain('Test Execution Overview');
        expect(htmlContent).toContain('Total Tests:');
      }

      console.log(
        `[WS-332] Generated ${htmlReports.length} HTML reports with valid structure`,
      );
    });

    test('should generate valid JSON reports with complete data structure', async () => {
      console.log('[WS-332] Testing JSON report generation...');

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );

      const jsonReports = result.reportPaths.filter(
        (path) => path.endsWith('.json') && !path.includes('dashboard'),
      );
      expect(jsonReports.length).toBeGreaterThan(0);

      for (const jsonReport of jsonReports) {
        const jsonContent = await fs.readFile(jsonReport, 'utf-8');

        // Validate JSON structure
        expect(() => JSON.parse(jsonContent)).not.toThrow();

        const reportData = JSON.parse(jsonContent);
        expect(reportData.title).toContain('WS-332');
        expect(reportData.timestamp).toBeDefined();
        expect(reportData.stakeholderType).toBeDefined();
        expect(reportData.executionSummary).toBeDefined();
      }

      console.log(
        `[WS-332] Generated ${jsonReports.length} JSON reports with valid structure`,
      );
    });

    test('should generate valid CSV reports with proper formatting', async () => {
      console.log('[WS-332] Testing CSV report generation...');

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        sampleExecutionSummary,
      );

      const csvReports = result.reportPaths.filter((path) =>
        path.endsWith('.csv'),
      );
      expect(csvReports.length).toBeGreaterThan(0);

      for (const csvReport of csvReports) {
        const csvContent = await fs.readFile(csvReport, 'utf-8');

        const lines = csvContent.trim().split('\n');
        expect(lines.length).toBeGreaterThan(1); // Header + data

        // Validate CSV header
        const header = lines[0];
        expect(header).toContain('Metric');
        expect(header).toContain('Value');
        expect(header).toContain('Category');
        expect(header).toContain('Timestamp');

        // Validate CSV data rows
        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',');
          expect(columns).toHaveLength(4); // Metric, Value, Category, Timestamp
        }
      }

      console.log(
        `[WS-332] Generated ${csvReports.length} CSV reports with valid formatting`,
      );
    });
  });

  describe('Wedding Industry Specific Analytics', () => {
    test('should generate wedding industry specific business intelligence insights', async () => {
      console.log('[WS-332] Testing wedding industry specific BI insights...');

      const weddingSpecificSummary: TestExecutionSummary = {
        ...sampleExecutionSummary,
        testSuiteId: 'wedding-analytics-suite',
        performanceMetrics: {
          ...sampleExecutionSummary.performanceMetrics,
          // Wedding season peak load metrics
          averageResponseTime: 150, // ms during peak wedding season
          throughputRPS: 2500, // requests during Saturday wedding rush
        },
      };

      const result = await biFramework.generateComprehensiveTestReport(
        sampleTestResults,
        weddingSpecificSummary,
      );

      // Validate wedding-specific content in reports
      const businessReport = result.reportPaths.find(
        (path) => path.includes('-business-') && path.endsWith('.md'),
      );

      if (businessReport) {
        const content = await fs.readFile(businessReport, 'utf-8');
        expect(content).toContain('wedding');
        expect(content).toContain('WS-332');
      }

      // Validate wedding-specific analysis
      const businessAnalysis = result.analysisResults.find(
        (a) => a.analysisType === 'business',
      );
      expect(businessAnalysis).toBeDefined();
      expect(businessAnalysis?.dataPoints.length).toBeGreaterThan(0);

      console.log(
        `[WS-332] Wedding industry specific analysis completed with ${result.analysisResults.length} analyses`,
      );
    });

    test('should provide wedding day performance recommendations', async () => {
      console.log(
        '[WS-332] Testing wedding day performance recommendations...',
      );

      const performanceAnalysis = await biFramework.analyzePerformanceTrends(
        sampleExecutionSummary,
      );

      expect(performanceAnalysis.recommendations).toBeInstanceOf(Array);
      expect(performanceAnalysis.recommendations.length).toBeGreaterThan(0);

      const performanceRec = performanceAnalysis.recommendations.find(
        (rec) => rec.category === 'performance',
      );

      expect(performanceRec).toBeDefined();
      expect(performanceRec?.priority).toMatch(/^(critical|high|medium|low)$/);
      expect(performanceRec?.timeframe).toBeDefined();
      expect(performanceRec?.expectedImpact).toBeDefined();

      console.log(
        `[WS-332] Generated ${performanceAnalysis.recommendations.length} performance recommendations`,
      );
    });
  });
});

// Helper functions for creating sample data
async function createSampleTestResults(): Promise<any[]> {
  return [
    {
      testId: 'analytics-001',
      testName: 'Revenue Analytics Accuracy',
      status: 'passed',
      duration: 1200,
      category: 'data-accuracy',
    },
    {
      testId: 'analytics-002',
      testName: 'Real-time Dashboard Performance',
      status: 'passed',
      duration: 800,
      category: 'performance',
    },
    {
      testId: 'analytics-003',
      testName: 'Cross-platform BI Integration',
      status: 'passed',
      duration: 2100,
      category: 'integration',
    },
    {
      testId: 'analytics-004',
      testName: 'GDPR Compliance Validation',
      status: 'passed',
      duration: 1800,
      category: 'security',
    },
    {
      testId: 'analytics-005',
      testName: 'Wedding Data Anonymization',
      status: 'failed',
      duration: 900,
      category: 'privacy',
      error: 'Anonymization threshold not met',
    },
  ];
}

async function createSampleExecutionSummary(): Promise<TestExecutionSummary> {
  const performanceMetrics: PerformanceMetrics = {
    averageResponseTime: 180,
    p95ResponseTime: 450,
    p99ResponseTime: 800,
    throughputRPS: 1200,
    errorRate: 0.5,
    resourceUtilization: {
      cpuUsagePercent: 65,
      memoryUsageMB: 2048,
      diskIOPS: 150,
      networkMbps: 100,
      databaseConnections: 25,
    },
  };

  const securityFindings: SecurityFindings = {
    totalVulnerabilities: 3,
    criticalVulnerabilities: 0,
    highVulnerabilities: 1,
    mediumVulnerabilities: 2,
    lowVulnerabilities: 0,
    gdprComplianceScore: 92,
    owaspComplianceScore: 88,
  };

  const complianceStatus: ComplianceStatus = {
    gdprCompliant: true,
    ccpaCompliant: true,
    owaspCompliant: true,
    iso27001Compliant: false,
    complianceScore: 85,
    nonCompliantItems: ['ISO27001 certification pending'],
  };

  return {
    testSuiteId: 'WS-332-analytics-qa-suite',
    executionTimestamp: new Date(),
    totalTests: 5,
    passedTests: 4,
    failedTests: 1,
    skippedTests: 0,
    executionTime: 6800,
    coveragePercentage: 87,
    performanceMetrics,
    securityFindings,
    complianceStatus,
  };
}
