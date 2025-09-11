import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PrivacyImpactTracker,
  privacyImpactTracker,
  withPrivacyImpactTracking,
  type PrivacyOperation,
  type PrivacyImpactLevel
} from '../../../src/lib/integrations/gdpr/privacy-impact-tracker';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] })
          }))
        })),
        gte: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [] })
        })),
        order: vi.fn().mockResolvedValue({ data: [] })
      }))
    }))
  }))
}));

describe('PrivacyImpactTracker', () => {
  let tracker: PrivacyImpactTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new PrivacyImpactTracker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackOperation', () => {
    it('should track low-impact operation correctly', async () => {
      const operation: PrivacyOperation = {
        id: 'test-op-1',
        operation: 'guest_list_view',
        dataTypes: ['personal_identifiers'],
        sensitivityLevel: 'personal',
        processingPurpose: 'wedding_planning',
        dataSubjects: 50,
        thirdPartySharing: false,
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      };

      const impactLevel = await tracker.trackOperation(operation);

      expect(impactLevel.level).toBe('low');
      expect(impactLevel.score).toBeLessThan(4);
      expect(impactLevel.requiresAssessment).toBe(false);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('privacy_operations_tracking');
    });

    it('should track high-impact operation and initiate assessment', async () => {
      const operation: PrivacyOperation = {
        id: 'test-op-2',
        operation: 'automated_guest_matching',
        dataTypes: ['special_category', 'biometric'],
        sensitivityLevel: 'special_category',
        processingPurpose: 'automated_processing',
        dataSubjects: 15000,
        retentionPeriod: 2555, // > 7 years
        thirdPartySharing: true,
        crossBorderTransfer: true,
        automatedDecisionMaking: true
      };

      const impactLevel = await tracker.trackOperation(operation);

      expect(impactLevel.level).toBe('critical');
      expect(impactLevel.score).toBeGreaterThanOrEqual(10);
      expect(impactLevel.requiresAssessment).toBe(true);
      
      // Should initiate privacy impact assessment
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('privacy_impact_assessments');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_id: 'test-op-2',
          status: 'pending'
        })
      );
    });

    it('should validate operation schema', async () => {
      const invalidOperation = {
        id: 'test-op-3',
        operation: 'test',
        dataTypes: ['personal'],
        sensitivityLevel: 'invalid_level', // Invalid
        processingPurpose: 'test',
        dataSubjects: 'not_a_number', // Invalid
        thirdPartySharing: false,
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      };

      await expect(tracker.trackOperation(invalidOperation as any))
        .rejects.toThrow();
    });

    it('should calculate impact scores correctly for medium-risk operations', async () => {
      const operation: PrivacyOperation = {
        id: 'test-op-4',
        operation: 'vendor_data_sharing',
        dataTypes: ['contact_information', 'financial_data'],
        sensitivityLevel: 'sensitive',
        processingPurpose: 'vendor_coordination',
        dataSubjects: 5000,
        retentionPeriod: 730, // 2 years
        thirdPartySharing: true,
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      };

      const impactLevel = await tracker.trackOperation(operation);

      expect(impactLevel.level).toBe('high');
      expect(impactLevel.score).toBeGreaterThanOrEqual(7);
      expect(impactLevel.score).toBeLessThan(10);
      expect(impactLevel.requiresAssessment).toBe(true);
    });
  });

  describe('identifyHighRiskOperations', () => {
    it('should return high-risk operations with correct metrics', async () => {
      const mockOperations = [
        {
          id: 'high-risk-1',
          operation: 'biometric_processing',
          impact_level: 'critical',
          impact_score: 12,
          impact_description: 'Critical privacy impact',
          requires_assessment: true,
          data_types: ['biometric_data'],
          sensitivity_level: 'special_category'
        },
        {
          id: 'high-risk-2',
          operation: 'cross_border_sharing',
          impact_level: 'high',
          impact_score: 8,
          impact_description: 'High privacy impact',
          requires_assessment: true,
          data_types: ['personal_identifiers'],
          sensitivity_level: 'sensitive'
        }
      ];

      const mockAssessments = [{ id: 'assessment-1' }, { id: 'assessment-2' }];

      mockSupabaseClient.from().select().gte().order.mockResolvedValue({ data: mockOperations });
      mockSupabaseClient.from().select().eq.mockResolvedValue({ data: mockAssessments });

      const result = await tracker.identifyHighRiskOperations();

      expect(result.operations).toHaveLength(2);
      expect(result.totalRiskScore).toBe(20);
      expect(result.criticalCount).toBe(1);
      expect(result.assessmentsPending).toBe(2);
      expect(result.operations[0].impactLevel.level).toBe('critical');
    });

    it('should handle empty high-risk operations list', async () => {
      mockSupabaseClient.from().select().gte().order.mockResolvedValue({ data: [] });
      mockSupabaseClient.from().select().eq.mockResolvedValue({ data: [] });

      const result = await tracker.identifyHighRiskOperations();

      expect(result.operations).toHaveLength(0);
      expect(result.totalRiskScore).toBe(0);
      expect(result.criticalCount).toBe(0);
      expect(result.assessmentsPending).toBe(0);
    });
  });

  describe('generateRiskIndicators', () => {
    beforeEach(() => {
      const mockOperation = {
        id: 'test-op-indicators',
        operation: 'guest_photo_processing',
        data_subjects: 5000,
        sensitivity_level: 'sensitive',
        third_party_sharing: true,
        cross_border_transfer: true,
        automated_decision_making: false
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ data: mockOperation });
    });

    it('should generate comprehensive risk indicators', async () => {
      const indicators = await tracker.generateRiskIndicators('test-op-indicators');

      expect(indicators).toHaveLength(4); // volume, sensitivity, third-party, cross-border
      
      const volumeIndicator = indicators.find(i => i.type === 'data_volume');
      expect(volumeIndicator).toBeDefined();
      expect(volumeIndicator?.currentValue).toBe(5000);

      const sensitivityIndicator = indicators.find(i => i.type === 'sensitivity');
      expect(sensitivityIndicator).toBeDefined();
      expect(sensitivityIndicator?.severity).toBe('medium');

      const thirdPartyIndicator = indicators.find(i => i.type === 'third_party');
      expect(thirdPartyIndicator).toBeDefined();
      expect(thirdPartyIndicator?.severity).toBe('medium');

      const crossBorderIndicator = indicators.find(i => i.type === 'cross_border');
      expect(crossBorderIndicator).toBeDefined();
      expect(crossBorderIndicator?.severity).toBe('high');
    });

    it('should handle operation not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ data: null });

      await expect(tracker.generateRiskIndicators('non-existent'))
        .rejects.toThrow('Operation non-existent not found');
    });

    it('should include automation indicator when applicable', async () => {
      const mockOperationWithAutomation = {
        id: 'automated-op',
        operation: 'automated_guest_scoring',
        data_subjects: 1000,
        sensitivity_level: 'personal',
        third_party_sharing: false,
        cross_border_transfer: false,
        automated_decision_making: true
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ data: mockOperationWithAutomation });

      const indicators = await tracker.generateRiskIndicators('automated-op');

      const automationIndicator = indicators.find(i => i.type === 'automation');
      expect(automationIndicator).toBeDefined();
      expect(automationIndicator?.severity).toBe('high');
      expect(automationIndicator?.description).toContain('Automated decision-making');
    });
  });

  describe('monitorPrivacyCompliance', () => {
    it('should calculate compliance score correctly', async () => {
      const mockOperations = [
        {
          id: 'compliant-op-1',
          impact_level: 'low',
          retention_period: 365,
          sensitivity_level: 'personal',
          explicit_consent: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'non-compliant-op-1',
          impact_level: 'high',
          retention_period: 3000, // > 7 years - violation
          sensitivity_level: 'special_category',
          explicit_consent: false, // violation
          created_at: new Date().toISOString()
        }
      ];

      mockSupabaseClient.from().select().order.mockResolvedValue({ data: mockOperations });

      const compliance = await tracker.monitorPrivacyCompliance();

      expect(compliance.complianceScore).toBeLessThan(100);
      expect(compliance.violations.length).toBeGreaterThan(0);
      expect(compliance.recommendations.length).toBeGreaterThan(0);

      const retentionViolation = compliance.violations.find(v => 
        v.violation.includes('Retention period')
      );
      expect(retentionViolation).toBeDefined();
      expect(retentionViolation?.severity).toBe('medium');

      const consentViolation = compliance.violations.find(v => 
        v.violation.includes('explicit consent')
      );
      expect(consentViolation).toBeDefined();
      expect(consentViolation?.severity).toBe('high');
    });

    it('should identify assessments due for review', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const mockOperations = [
        {
          id: 'due-assessment-op',
          impact_level: 'critical',
          requires_assessment: true,
          last_reviewed: oldDate.toISOString(),
          created_at: oldDate.toISOString()
        }
      ];

      mockSupabaseClient.from().select().order.mockResolvedValue({ data: mockOperations });

      const compliance = await tracker.monitorPrivacyCompliance();

      expect(compliance.assessmentsDue.length).toBeGreaterThan(0);
      expect(compliance.assessmentsDue[0].operationId).toBe('due-assessment-op');
      expect(compliance.assessmentsDue[0].riskLevel).toBe('critical');
    });

    it('should return 100% compliance for no violations', async () => {
      const mockOperations = [
        {
          id: 'compliant-op',
          impact_level: 'low',
          retention_period: 90,
          sensitivity_level: 'personal',
          explicit_consent: true,
          created_at: new Date().toISOString()
        }
      ];

      mockSupabaseClient.from().select().order.mockResolvedValue({ data: mockOperations });

      const compliance = await tracker.monitorPrivacyCompliance();

      expect(compliance.complianceScore).toBe(100);
      expect(compliance.violations).toHaveLength(0);
    });
  });

  describe('generatePrivacyImpactReport', () => {
    beforeEach(() => {
      const mockOperation = {
        id: 'report-op-1',
        operation: 'wedding_photo_analysis',
        data_types: ['biometric_data', 'location_data'],
        sensitivity_level: 'special_category',
        processing_purpose: 'photo_categorization',
        data_subjects: 2000,
        retention_period: 1095,
        third_party_sharing: true,
        cross_border_transfer: false,
        automated_decision_making: true
      };

      const mockAssessment = {
        operation_id: 'report-op-1',
        impact_level: 'high',
        impact_score: 9,
        impact_description: 'High privacy impact due to biometric processing',
        requires_assessment: true,
        risk_factors: ['biometric_data', 'automated_processing'],
        mitigation_measures: ['explicit_consent', 'data_minimization'],
        compliance_requirements: ['GDPR_Article_9', 'GDPR_Article_22'],
        last_reviewed: new Date().toISOString(),
        reviewed_by: 'Privacy Officer',
        status: 'approved'
      };

      mockSupabaseClient.from().select().eq().single
        .mockResolvedValueOnce({ data: mockOperation })
        .mockResolvedValueOnce({ data: mockAssessment });
    });

    it('should generate comprehensive privacy impact report', async () => {
      const report = await tracker.generatePrivacyImpactReport('report-op-1');

      expect(report).toHaveProperty('operation');
      expect(report).toHaveProperty('impactAssessment');
      expect(report).toHaveProperty('riskIndicators');
      expect(report).toHaveProperty('complianceStatus');
      expect(report).toHaveProperty('recommendedActions');

      expect(report.operation.id).toBe('report-op-1');
      expect(report.impactAssessment.impactLevel.level).toBe('high');
      expect(report.riskIndicators.length).toBeGreaterThan(0);
      expect(report.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should create default assessment when none exists', async () => {
      const mockOperation = {
        id: 'no-assessment-op',
        operation: 'simple_data_view',
        data_types: ['personal_identifiers'],
        sensitivity_level: 'personal',
        processing_purpose: 'display',
        data_subjects: 100,
        third_party_sharing: false,
        cross_border_transfer: false,
        automated_decision_making: false
      };

      mockSupabaseClient.from().select().eq().single
        .mockResolvedValueOnce({ data: mockOperation })
        .mockResolvedValueOnce({ data: null }); // No assessment

      const report = await tracker.generatePrivacyImpactReport('no-assessment-op');

      expect(report.impactAssessment.status).toBe('pending');
      expect(report.impactAssessment.reviewedBy).toBe('System');
      expect(report.impactAssessment.riskFactors).toContain('Pending assessment');
    });

    it('should handle operation not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ data: null });

      await expect(tracker.generatePrivacyImpactReport('non-existent'))
        .rejects.toThrow('Operation non-existent not found');
    });

    it('should provide relevant recommendations based on risk profile', async () => {
      const report = await tracker.generatePrivacyImpactReport('report-op-1');

      expect(report.recommendedActions.length).toBeGreaterThan(0);
      
      // Should recommend data minimization for high data volume
      const hasDataMinimizationRec = report.recommendedActions.some(action =>
        action.includes('data minimization')
      );
      expect(hasDataMinimizationRec).toBe(true);

      // Should recommend safeguards for cross-border transfers if applicable
      const hasCrossBorderRec = report.recommendedActions.some(action =>
        action.includes('cross-border')
      );
      // Based on mock data, cross-border is false, so no recommendation expected

      // Should recommend human review for automated decisions
      const hasHumanReviewRec = report.recommendedActions.some(action =>
        action.includes('human review')
      );
      expect(hasHumanReviewRec).toBe(true);
    });
  });

  describe('Private helper methods', () => {
    describe('calculateImpactLevel', () => {
      it('should calculate low impact for basic operations', () => {
        const operation: PrivacyOperation = {
          id: 'low-impact',
          operation: 'view_guest_list',
          dataTypes: ['name'],
          sensitivityLevel: 'personal',
          processingPurpose: 'display',
          dataSubjects: 50,
          thirdPartySharing: false,
          crossBorderTransfer: false,
          automatedDecisionMaking: false
        };

        const impact = tracker['calculateImpactLevel'](operation);
        expect(impact.level).toBe('low');
        expect(impact.score).toBeLessThan(4);
      });

      it('should calculate critical impact for high-risk operations', () => {
        const operation: PrivacyOperation = {
          id: 'critical-impact',
          operation: 'biometric_analysis',
          dataTypes: ['biometric', 'health'],
          sensitivityLevel: 'special_category',
          processingPurpose: 'automated_matching',
          dataSubjects: 20000,
          retentionPeriod: 2555,
          thirdPartySharing: true,
          crossBorderTransfer: true,
          automatedDecisionMaking: true
        };

        const impact = tracker['calculateImpactLevel'](operation);
        expect(impact.level).toBe('critical');
        expect(impact.score).toBeGreaterThanOrEqual(10);
        expect(impact.requiresAssessment).toBe(true);
      });

      it('should handle edge cases in scoring', () => {
        const operation: PrivacyOperation = {
          id: 'edge-case',
          operation: 'borderline_operation',
          dataTypes: ['sensitive'],
          sensitivityLevel: 'sensitive',
          processingPurpose: 'processing',
          dataSubjects: 1000, // exactly at medium threshold
          retentionPeriod: 365, // exactly at threshold
          thirdPartySharing: false,
          crossBorderTransfer: false,
          automatedDecisionMaking: false
        };

        const impact = tracker['calculateImpactLevel'](operation);
        expect(impact.level).toBe('high');
        expect(impact.score).toBeGreaterThanOrEqual(4);
      });
    });

    describe('assessDataVolumeRisk', () => {
      it('should assess low risk for small data volumes', () => {
        const risk = tracker['assessDataVolumeRisk'](50);
        expect(risk.severity).toBe('low');
      });

      it('should assess medium risk for moderate data volumes', () => {
        const risk = tracker['assessDataVolumeRisk'](5000);
        expect(risk.severity).toBe('medium');
      });

      it('should assess high risk for large data volumes', () => {
        const risk = tracker['assessDataVolumeRisk'](15000);
        expect(risk.severity).toBe('high');
      });
    });

    describe('assessSensitivityRisk', () => {
      it('should correctly assess personal data sensitivity', () => {
        const risk = tracker['assessSensitivityRisk']('personal');
        expect(risk.severity).toBe('low');
        expect(risk.score).toBe(1);
      });

      it('should correctly assess sensitive data sensitivity', () => {
        const risk = tracker['assessSensitivityRisk']('sensitive');
        expect(risk.severity).toBe('medium');
        expect(risk.score).toBe(2);
      });

      it('should correctly assess special category data sensitivity', () => {
        const risk = tracker['assessSensitivityRisk']('special_category');
        expect(risk.severity).toBe('high');
        expect(risk.score).toBe(3);
      });
    });
  });
});

describe('withPrivacyImpactTracking Higher-Order Function', () => {
  const mockOperation: PrivacyOperation = {
    id: 'test-tracking-op',
    operation: 'test_operation',
    dataTypes: ['personal_identifiers'],
    sensitivityLevel: 'personal',
    processingPurpose: 'testing',
    dataSubjects: 100,
    thirdPartySharing: false,
    crossBorderTransfer: false,
    automatedDecisionMaking: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track operation and execute callback', async () => {
    const mockCallback = vi.fn().mockResolvedValue('callback result');
    const mockImpactLevel: PrivacyImpactLevel = {
      level: 'low',
      score: 2,
      description: 'Low impact operation',
      requiresAssessment: false
    };

    vi.spyOn(privacyImpactTracker, 'trackOperation').mockResolvedValue(mockImpactLevel);

    const result = await withPrivacyImpactTracking(mockOperation, mockCallback);

    expect(result.result).toBe('callback result');
    expect(result.impactLevel).toEqual(mockImpactLevel);
    expect(mockCallback).toHaveBeenCalled();
    expect(privacyImpactTracker.trackOperation).toHaveBeenCalledWith(mockOperation);
  });

  it('should handle tracking errors gracefully', async () => {
    const mockCallback = vi.fn().mockResolvedValue('success');
    vi.spyOn(privacyImpactTracker, 'trackOperation').mockRejectedValue(new Error('Tracking failed'));

    await expect(withPrivacyImpactTracking(mockOperation, mockCallback))
      .rejects.toThrow('Tracking failed');
    
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle callback errors after successful tracking', async () => {
    const mockCallback = vi.fn().mockRejectedValue(new Error('Callback failed'));
    const mockImpactLevel: PrivacyImpactLevel = {
      level: 'low',
      score: 2,
      description: 'Low impact operation',
      requiresAssessment: false
    };

    vi.spyOn(privacyImpactTracker, 'trackOperation').mockResolvedValue(mockImpactLevel);

    await expect(withPrivacyImpactTracking(mockOperation, mockCallback))
      .rejects.toThrow('Callback failed');
    
    expect(privacyImpactTracker.trackOperation).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should work with async callbacks', async () => {
    const mockCallback = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async result';
    });

    const mockImpactLevel: PrivacyImpactLevel = {
      level: 'medium',
      score: 5,
      description: 'Medium impact operation',
      requiresAssessment: false
    };

    vi.spyOn(privacyImpactTracker, 'trackOperation').mockResolvedValue(mockImpactLevel);

    const result = await withPrivacyImpactTracking(mockOperation, mockCallback);

    expect(result.result).toBe('async result');
    expect(result.impactLevel.level).toBe('medium');
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete privacy impact lifecycle', async () => {
    const tracker = new PrivacyImpactTracker();

    // Step 1: Track a high-impact operation
    const highImpactOperation: PrivacyOperation = {
      id: 'lifecycle-test-op',
      operation: 'comprehensive_guest_analysis',
      dataTypes: ['personal_identifiers', 'behavioral_data', 'location_data'],
      sensitivityLevel: 'sensitive',
      processingPurpose: 'wedding_optimization',
      dataSubjects: 8000,
      retentionPeriod: 1095,
      thirdPartySharing: true,
      crossBorderTransfer: true,
      automatedDecisionMaking: true
    };

    const impactLevel = await tracker.trackOperation(highImpactOperation);
    expect(impactLevel.requiresAssessment).toBe(true);

    // Step 2: Generate risk indicators
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({ 
      data: {
        id: 'lifecycle-test-op',
        operation: 'comprehensive_guest_analysis',
        data_subjects: 8000,
        sensitivity_level: 'sensitive',
        third_party_sharing: true,
        cross_border_transfer: true,
        automated_decision_making: true
      }
    });

    const riskIndicators = await tracker.generateRiskIndicators('lifecycle-test-op');
    expect(riskIndicators.length).toBeGreaterThan(3);

    // Step 3: Monitor compliance
    mockSupabaseClient.from().select().order.mockResolvedValue({ 
      data: [{
        id: 'lifecycle-test-op',
        impact_level: 'high',
        retention_period: 1095,
        sensitivity_level: 'sensitive',
        explicit_consent: true,
        created_at: new Date().toISOString()
      }]
    });

    const compliance = await tracker.monitorPrivacyCompliance();
    expect(compliance.complianceScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple concurrent tracking operations', async () => {
    const tracker = new PrivacyImpactTracker();
    
    const operations = Array.from({ length: 5 }, (_, i) => ({
      id: `concurrent-op-${i}`,
      operation: `operation_${i}`,
      dataTypes: ['personal_identifiers'],
      sensitivityLevel: 'personal' as const,
      processingPurpose: 'testing',
      dataSubjects: 100 + i * 100,
      thirdPartySharing: i % 2 === 0,
      crossBorderTransfer: false,
      automatedDecisionMaking: false
    }));

    const trackingPromises = operations.map(op => tracker.trackOperation(op));
    const results = await Promise.all(trackingPromises);

    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('description');
    });

    // Verify all operations were stored
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(5);
  });

  it('should maintain consistency across related operations', async () => {
    const tracker = new PrivacyImpactTracker();
    
    // Related operations in a wedding planning workflow
    const relatedOperations = [
      {
        id: 'guest-collection',
        operation: 'guest_data_collection',
        dataTypes: ['personal_identifiers', 'contact_information'],
        sensitivityLevel: 'personal' as const,
        processingPurpose: 'wedding_planning',
        dataSubjects: 200,
        thirdPartySharing: false,
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      },
      {
        id: 'vendor-sharing',
        operation: 'vendor_data_sharing',
        dataTypes: ['contact_information'],
        sensitivityLevel: 'personal' as const,
        processingPurpose: 'vendor_coordination',
        dataSubjects: 200,
        thirdPartySharing: true,
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      },
      {
        id: 'photo-processing',
        operation: 'photo_analysis',
        dataTypes: ['biometric_data'],
        sensitivityLevel: 'special_category' as const,
        processingPurpose: 'photo_tagging',
        dataSubjects: 200,
        thirdPartySharing: false,
        crossBorderTransfer: false,
        automatedDecisionMaking: true
      }
    ];

    const results = await Promise.all(
      relatedOperations.map(op => tracker.trackOperation(op))
    );

    // Verify escalating impact levels
    expect(results[0].level).toBe('low'); // basic guest collection
    expect(results[1].level).toBe('medium'); // third-party sharing
    expect(results[2].level).toBe('high'); // special category + automation
  });
});