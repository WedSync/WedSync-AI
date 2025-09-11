import { describe, it, expect, beforeEach } from 'vitest';
import {
  VerificationIntegrationFactory,
  VerificationType,
  WorkflowState,
  VerificationUtils
} from '@/lib/integrations/verification';

describe('WS-185 Verification Integration System', () => {
  beforeEach(() => {
    // Reset factory instances
    (VerificationIntegrationFactory as any).orchestrator = null;
    (VerificationIntegrationFactory as any).serviceConnector = null;
    (VerificationIntegrationFactory as any).workflowEngine = null;
    (VerificationIntegrationFactory as any).notifier = null;
  });

  describe('VerificationIntegrationFactory', () => {
    it('should create singleton instances', () => {
      const orchestrator1 = VerificationIntegrationFactory.getOrchestrator();
      const orchestrator2 = VerificationIntegrationFactory.getOrchestrator();
      expect(orchestrator1).toBe(orchestrator2);

      const serviceConnector1 = VerificationIntegrationFactory.getServiceConnector();
      const serviceConnector2 = VerificationIntegrationFactory.getServiceConnector();
      expect(serviceConnector1).toBe(serviceConnector2);

      const workflowEngine1 = VerificationIntegrationFactory.getWorkflowEngine();
      const workflowEngine2 = VerificationIntegrationFactory.getWorkflowEngine();
      expect(workflowEngine1).toBe(workflowEngine2);

      const notifier1 = VerificationIntegrationFactory.getNotifier();
      const notifier2 = VerificationIntegrationFactory.getNotifier();
      expect(notifier1).toBe(notifier2);
    });

    it('should initialize system without errors', async () => {
      expect(() => VerificationIntegrationFactory.initializeSystem()).not.toThrow();
    });
  });

  describe('VerificationUtils', () => {
    it('should map verification types correctly', () => {
      expect(VerificationUtils.mapVerificationType('business_registration')).toBe(VerificationType.BUSINESS_REGISTRATION);
      expect(VerificationUtils.mapVerificationType('insurance_policy')).toBe(VerificationType.INSURANCE_POLICY);
      expect(VerificationUtils.mapVerificationType('invalid_type')).toBeNull();
    });

    it('should format verification status correctly', () => {
      expect(VerificationUtils.formatVerificationStatus(WorkflowState.PENDING)).toBe('Pending Review');
      expect(VerificationUtils.formatVerificationStatus(WorkflowState.COMPLETED)).toBe('Verification Complete');
      expect(VerificationUtils.formatVerificationStatus(WorkflowState.FAILED)).toBe('Verification Failed');
    });

    it('should calculate verification score correctly', () => {
      const mockWorkflow = {
        id: 'test-workflow',
        supplierId: 'test-supplier',
        verificationType: VerificationType.BUSINESS_REGISTRATION,
        state: WorkflowState.IN_PROGRESS,
        steps: [
          { id: '1', name: 'Step 1', status: 'completed' as const },
          { id: '2', name: 'Step 2', status: 'completed' as const },
          { id: '3', name: 'Step 3', status: 'pending' as const }
        ],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const score = VerificationUtils.calculateVerificationScore(mockWorkflow);
      expect(score).toBe(67); // 2 out of 3 steps completed
    });

    it('should get verification requirements correctly', () => {
      const businessReqs = VerificationUtils.getVerificationRequirements(VerificationType.BUSINESS_REGISTRATION);
      expect(businessReqs).toContain('Certificate of Incorporation');
      expect(businessReqs).toContain('Business Registration Certificate');

      const insuranceReqs = VerificationUtils.getVerificationRequirements(VerificationType.INSURANCE_POLICY);
      expect(insuranceReqs).toContain('Insurance Certificate');
      expect(insuranceReqs).toContain('Policy Schedule');
    });
  });

  describe('Integration Components', () => {
    it('should create orchestrator instance', () => {
      const orchestrator = VerificationIntegrationFactory.getOrchestrator();
      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.orchestrateVerificationProcess).toBe('function');
      expect(typeof orchestrator.processExternalCallback).toBe('function');
    });

    it('should create service connector instance', () => {
      const serviceConnector = VerificationIntegrationFactory.getServiceConnector();
      expect(serviceConnector).toBeDefined();
      expect(typeof serviceConnector.verifyBusinessRegistration).toBe('function');
      expect(typeof serviceConnector.validateInsurancePolicy).toBe('function');
    });

    it('should create workflow engine instance', () => {
      const workflowEngine = VerificationIntegrationFactory.getWorkflowEngine();
      expect(workflowEngine).toBeDefined();
      expect(typeof workflowEngine.processWorkflow).toBe('function');
      expect(typeof workflowEngine.executeStep).toBe('function');
    });

    it('should create notifier instance', () => {
      const notifier = VerificationIntegrationFactory.getNotifier();
      expect(notifier).toBeDefined();
      expect(typeof notifier.sendVerificationUpdate).toBe('function');
      expect(typeof notifier.scheduleVerificationReminders).toBe('function');
    });
  });

  describe('Constants', () => {
    it('should define verification constants', () => {
      const { VERIFICATION_CONSTANTS } = require('@/lib/integrations/verification');
      
      expect(VERIFICATION_CONSTANTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(VERIFICATION_CONSTANTS.SUPPORTED_FILE_TYPES).toContain('.pdf');
      expect(VERIFICATION_CONSTANTS.SUPPORTED_FILE_TYPES).toContain('.jpg');
      expect(VERIFICATION_CONSTANTS.DEFAULT_TIMEOUT).toBe(30000);
    });
  });
});