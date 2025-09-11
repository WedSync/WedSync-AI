/**
 * GDPR Intelligence Engine Integration Tests
 * WS-149 Round 2: Comprehensive testing for AI-powered GDPR compliance features
 * Team E - Batch 12 - Round 2 Testing Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GDPRIntelligenceEngine } from '@/lib/services/gdpr-intelligence-engine';
import { MultiLanguagePrivacyManager } from '@/lib/services/multi-language-privacy-manager';
// Mock OpenAI
vi.mock('openai', () => ({
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));
// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: vi.fn() })) })),
      select: jest.fn(() => ({ 
        eq: jest.fn(() => ({ 
          single: vi.fn(),
          eq: jest.fn(() => ({ single: vi.fn() }))
        })) 
      })),
      upsert: vi.fn(),
      rpc: vi.fn()
    }))
describe('GDPR Intelligence Engine', () => {
  let engine: GDPRIntelligenceEngine;
  
  beforeEach(() => {
    // Create fresh instance for each test
    engine = new (GDPRIntelligenceEngine as unknown)();
    
    // Mock OpenAI responses
    (engine as unknown).openai = {
      chat: {
        completions: {
          create: vi.fn()
        }
    };
    // Mock Supabase client
    (engine as unknown).supabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: { id: 'test-id' } })) })) })),
        select: jest.fn(() => ({ 
          eq: jest.fn(() => ({ single: jest.fn(() => ({ data: [] })) })),
          gte: jest.fn(() => ({ data: [] }))
        }))
      }))
  });
  afterEach(() => {
    vi.clearAllMocks();
  describe('Document Analysis for Personal Data Discovery', () => {
    const sampleDocument = `
      Wedding Contract
      
      Bride: Jane Smith
      Email: jane.smith@email.com
      Phone: +1-555-0123
      Groom: John Doe  
      Email: john.doe@email.com
      Phone: +1-555-0456
      Wedding Date: June 15, 2024
      Venue: Grand Hotel Ballroom
      Payment Details:
      Credit Card: **** **** **** 1234
      Amount: $15,000
    `;
    const processingContext = {
      document_id: 'doc-123',
      processing_purpose: 'contract_fulfillment',
      international_processing: false
    it('should detect personal data in wedding contract', async () => {
      // Mock language detection
      (engine as unknown).openai.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'en' } }]
        });
      // Mock classification results
      (engine as unknown).mlClassifier = {
        classify: vi.fn().mockResolvedValue({
          items: [
            { type: 'email', value: 'jane.smith@email.com', confidence: 0.95 },
            { type: 'email', value: 'john.doe@email.com', confidence: 0.95 },
            { type: 'name', value: 'Jane Smith', confidence: 0.92 },
            { type: 'name', value: 'John Doe', confidence: 0.92 },
            { type: 'phone', value: '+1-555-0123', confidence: 0.89 },
            { type: 'phone', value: '+1-555-0456', confidence: 0.89 },
            { type: 'financial', value: '**** **** **** 1234', confidence: 0.87 }
          ]
        })
      };
      // Mock risk analyzer
      (engine as unknown).riskAnalyzer = {
        assessDocument: vi.fn().mockResolvedValue({
          overallRisk: 6,
          requiredActions: ['implement_data_minimization', 'review_retention_policies']
      const result = await engine.analyzeDocumentForPersonalData(
        sampleDocument,
        'wedding_contract',
        processingContext
      );
      expect(result.personal_data_found).toBe(true);
      expect(result.language_detected).toBe('en');
      expect(result.data_categories).toContain('contact_data');
      expect(result.data_categories).toContain('identity_data');
      expect(result.data_categories).toContain('financial_data');
      expect(result.privacy_risk_score).toBe(6);
      expect(result.estimated_data_subjects).toBe(2);
      expect(result.compliance_actions_required).toContain('implement_data_minimization');
    });
    it('should handle documents without personal data', async () => {
      const publicDocument = "Wedding Planning Checklist: 1. Choose venue 2. Select flowers 3. Book catering";
        classify: vi.fn().mockResolvedValue({ items: [] })
          overallRisk: 1,
          requiredActions: []
        publicDocument,
        'checklist',
      expect(result.personal_data_found).toBe(false);
      expect(result.privacy_risk_score).toBe(1);
      expect(result.estimated_data_subjects).toBe(1);
      expect(result.compliance_actions_required).toEqual([]);
    it('should detect multiple languages correctly', async () => {
      const multilingualDoc = "Contrato de Boda - Wedding Contract\nNombre: María García\nName: John Smith";
          choices: [{ message: { content: 'es' } }]
            { type: 'name', value: 'María García', confidence: 0.94 },
            { type: 'name', value: 'John Smith', confidence: 0.94 }
          overallRisk: 4,
          requiredActions: ['multilingual_consent_required']
        multilingualDoc,
        'contract',
      expect(result.language_detected).toBe('es');
      expect(result.compliance_actions_required).toContain('multilingual_consent_required');
  describe('Compliance Risk Predictions', () => {
    it('should generate accurate 90-day risk predictions', async () => {
      const organizationId = 'org-123';
      // Mock historical data
      (engine as unknown).supabase.from().select().eq().gte.mockReturnValue({
        data: [
          { event_type: 'consent_expired', created_at: '2024-01-15' },
          { event_type: 'data_breach_risk', created_at: '2024-02-10' },
          { event_type: 'retention_violation', created_at: '2024-02-20' }
        ]
      });
      // Mock current processing activities
      (engine as unknown).supabase.from().select().eq().eq.mockReturnValue({
          { activity_name: 'Marketing Automation', data_categories: ['contact_data', 'behavioral_data'] },
          { activity_name: 'Photo Storage', data_categories: ['image_data', 'identity_data'] }
      // Mock compliance predictor
      (engine as unknown).compliancePredictor = {
        predict: vi.fn().mockResolvedValue({
          overallRisk: 7,
          consentRisk: 6,
          breachRisk: 4,
          transferRisk: 3,
          retentionRisk: 8,
          rightsRisk: 5,
          specificIssues: [
            {
              type: 'consent_renewal_required',
              probability: 0.85,
              impact: 'high',
              estimatedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              preventionOptions: ['automated_consent_renewal', 'proactive_communication']
            },
              type: 'retention_policy_violation',
              probability: 0.72,
              impact: 'medium',
              estimatedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              preventionOptions: ['automated_deletion', 'retention_review']
            }
      const result = await engine.analyzeComplianceRisks(organizationId, '90_days');
      expect(result.organization_id).toBe(organizationId);
      expect(result.time_horizon).toBe('90_days');
      expect(result.overall_risk_score).toBe(7);
      expect(result.risk_categories.consent_management).toBe(6);
      expect(result.risk_categories.retention_compliance).toBe(8);
      expect(result.predicted_issues).toHaveLength(2);
      expect(result.predicted_issues[0].issue_type).toBe('consent_renewal_required');
      expect(result.predicted_issues[0].probability).toBe(0.85);
      expect(result.monitoring_rules_created).toBeGreaterThan(0);
    it('should handle organizations with low compliance history', async () => {
      const organizationId = 'org-new';
        data: []
          overallRisk: 3,
          consentRisk: 2,
          breachRisk: 2,
          transferRisk: 1,
          retentionRisk: 4,
          rightsRisk: 3,
          specificIssues: []
      const result = await engine.analyzeComplianceRisks(organizationId, '30_days');
      expect(result.overall_risk_score).toBe(3);
      expect(result.predicted_issues).toHaveLength(0);
      expect(result.next_review_recommended).toBeInstanceOf(Date);
  describe('Intelligent Consent Optimization', () => {
    const userId = 'user-123';
    const consentContext = {
      purpose: 'marketing',
      method: 'banner',
      language: 'en'
    it('should optimize consent for user preferences', async () => {
      // Mock user consent history
      (engine as unknown).supabase.from().select().eq.mockReturnValue({
          { purpose: 'essential', consent_given: true, consent_given_at: '2024-01-01' },
          { purpose: 'analytics', consent_given: false, consent_given_at: '2024-01-15' }
      // Mock user profile
      (engine as unknown).supabase.from().select().eq().single.mockReturnValue({
        data: { id: userId, preferences: { privacy_level: 'medium' }, country: 'US' }
      const result = await engine.optimizeConsentExperience(userId, consentContext);
      expect(result.user_id).toBe(userId);
      expect(result.optimized_timing).toHaveProperty('optimalTiming');
      expect(result.personalized_content).toHaveProperty('title');
      expect(result.expected_consent_rate).toBeGreaterThan(0);
      expect(result.expected_consent_rate).toBeLessThanOrEqual(1);
      expect(result.consent_fatigue_risk).toBeGreaterThanOrEqual(0);
      expect(result.recommended_approach).toBeDefined();
      expect(result.compliance_notes).toContain('user profile');
    it('should create A/B test variant for low consent probability', async () => {
      (engine as unknown).supabase.from().select().eq.mockReturnValue({ data: [] });
        data: { id: userId, preferences: { privacy_level: 'high' } }
      // Mock low consent probability
      const mockOptimization = engine.optimizeConsentExperience(userId, consentContext);
      // Override the predictConsentLikelihood method to return low probability
      (engine as unknown).predictConsentLikelihood = vi.fn().mockResolvedValue({
        likelihood: 0.45,
        fatigueRisk: 0.6,
        recommendedApproach: 'progressive_disclosure'
      const result = await mockOptimization;
      expect(result.expected_consent_rate).toBeLessThan(0.6);
      expect(result.ab_test_variant).toBeTruthy();
      expect(result.ab_test_variant?.variantId).toContain('simplified');
      expect(result.consent_fatigue_risk).toBeGreaterThan(0.5);
  describe('Automated Privacy Impact Assessment', () => {
    const processingActivity = {
      id: 'activity-123',
      name: 'Wedding Photo AI Analysis',
      purpose: 'automated photo tagging and recommendations',
      dataCategories: ['image_data', 'facial_recognition', 'location_data'],
      dataSubjects: ['wedding_couples', 'wedding_guests'],
      legalBasis: 'consent',
      internationalTransfers: true,
      automatedDecisionMaking: true,
      highRiskProcessing: true
    it('should conduct comprehensive automated PIA for high-risk processing', async () => {
      const result = await engine.conductAutomaticPIA(processingActivity);
      expect(result.pia_id).toMatch(/^PIA-\d+$/);
      expect(result.processing_activity_id).toBe(processingActivity.id);
      expect(result.pia_triggered_reason).toContain('high_risk_processing');
      expect(result.pia_triggered_reason).toContain('automated_decision_making');
      expect(result.automated_risk_assessment).toBeDefined();
      expect(result.automated_risk_assessment.identified_risks).toBeInstanceOf(Array);
      expect(result.automated_risk_assessment.identified_risks.length).toBeGreaterThan(0);
      expect(result.automated_risk_assessment.overall_risk_level).toBeGreaterThanOrEqual(6);
      expect(result.mitigation_plan).toBeDefined();
      expect(result.mitigation_plan.technical_measures).toContain('encryption_at_rest');
      expect(result.mitigation_plan.organizational_measures).toContain('staff_training');
      expect(result.dpo_review_required).toBe(true);
      expect(result.supervisory_authority_consultation).toBe(true);
      expect(result.next_review_due).toBeInstanceOf(Date);
    it('should handle low-risk processing activities', async () => {
      const lowRiskActivity = {
        ...processingActivity,
        name: 'Basic Contact Form',
        dataCategories: ['contact_data'],
        internationalTransfers: false,
        automatedDecisionMaking: false,
        highRiskProcessing: false
      const result = await engine.conductAutomaticPIA(lowRiskActivity);
      expect(result.automated_risk_assessment.overall_risk_level).toBeLessThan(5);
      expect(result.dpo_review_required).toBe(false);
      expect(result.supervisory_authority_consultation).toBe(false);
      expect(result.residual_risk_assessment.acceptability).toBe('acceptable');
  describe('Cross-Border Compliance Management', () => {
    const dataTransfer = {
      id: 'transfer-123',
      sourceCountry: 'DE',
      destinationCountry: 'US',
      dataCategories: ['contact_data', 'preference_data'],
      purpose: 'customer_support',
      estimatedVolume: 5000,
      transferType: 'regular_bulk_transfer'
    it('should manage transfer to adequate country', async () => {
      const result = await engine.manageCrossBorderCompliance(dataTransfer);
      expect(result.transfer_id).toBe(dataTransfer.id);
      expect(result.adequacy_decision_status.status).toBe('adequate');
      expect(result.transfer_mechanism).toBe('adequacy_decision');
      expect(result.safeguards_implemented).toContain('standard_data_protection_measures');
      expect(result.approval_required).toBe(false);
      expect(result.estimated_compliance_cost).toBeGreaterThan(0);
      expect(result.risk_assessment.overallRisk).toBeLessThan(6);
      expect(result.next_review_date).toBeInstanceOf(Date);
    it('should handle transfer to non-adequate country', async () => {
      const nonAdequateTransfer = {
        ...dataTransfer,
        destinationCountry: 'CN',
        dataCategories: ['contact_data', 'financial_data'],
        estimatedVolume: 15000
      const result = await engine.manageCrossBorderCompliance(nonAdequateTransfer);
      expect(result.adequacy_decision_status.status).toBe('not_adequate');
      expect(result.transfer_mechanism).toBe('standard_contractual_clauses');
      expect(result.safeguards_implemented).toContain('scc_implementation');
      expect(result.safeguards_implemented).toContain('transfer_impact_assessment');
      expect(result.approval_required).toBe(true);
      expect(result.estimated_compliance_cost).toBeGreaterThan(3000);
      expect(result.risk_assessment.overallRisk).toBeGreaterThan(5);
    it('should set up automated monitoring for transfers', async () => {
      expect(result.compliance_monitoring.rules).toBeInstanceOf(Array);
      expect(result.compliance_monitoring.rules.length).toBeGreaterThan(0);
      expect(result.compliance_monitoring.frequency).toBe('monthly');
      const volumeRule = result.compliance_monitoring.rules.find(rule => 
        rule.type === 'volume_monitoring'
      expect(volumeRule).toBeDefined();
      expect(volumeRule?.action).toBe('alert_dpo');
  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed document input gracefully', async () => {
      const malformedDoc = null as any;
      const context = {
        document_id: 'doc-invalid',
        processing_purpose: 'test',
        international_processing: false
      await expect(engine.analyzeDocumentForPersonalData(malformedDoc, 'test', context))
        .rejects.toThrow('Document analysis failed');
    it('should handle API failures gracefully', async () => {
      // Mock OpenAI failure
        .mockRejectedValue(new Error('API Rate Limit'));
      const document = "Test document";
        document_id: 'doc-test',
      await expect(engine.analyzeDocumentForPersonalData(document, 'test', context))
    it('should handle invalid organization IDs', async () => {
      const invalidOrgId = 'invalid-org';
      // Mock empty data response
        data: null
      await expect(engine.analyzeComplianceRisks(invalidOrgId))
        .rejects.toThrow('Compliance risk analysis failed');
  describe('Performance and Scalability', () => {
    it('should process large documents efficiently', async () => {
      // Generate large document (10KB)
      const largeDocument = "Wedding Contract Details\n".repeat(500) +
        "Bride: Jane Smith\nEmail: jane@example.com\n".repeat(100);
        .mockResolvedValue({ choices: [{ message: { content: 'en' } }] });
          overallRisk: 2,
      const startTime = Date.now();
        largeDocument,
        {
          document_id: 'large-doc',
          processing_purpose: 'contract_fulfillment',
          international_processing: false
      const processingTime = Date.now() - startTime;
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    it('should handle concurrent predictions efficiently', async () => {
      const orgIds = ['org-1', 'org-2', 'org-3', 'org-4', 'org-5'];
      // Mock fast responses
      (engine as unknown).supabase.from().select().eq().gte.mockReturnValue({ data: [] });
          consentRisk: 3,
          breachRisk: 3,
          retentionRisk: 3,
      const predictions = await Promise.all(
        orgIds.map(orgId => engine.analyzeComplianceRisks(orgId))
      const totalTime = Date.now() - startTime;
      expect(predictions).toHaveLength(5);
      expect(predictions.every(p => p.organization_id)).toBe(true);
      expect(totalTime).toBeLessThan(3000); // Concurrent execution should be fast
});
