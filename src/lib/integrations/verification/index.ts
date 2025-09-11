// Verification Integration System - WS-185
// Central exports for verification workflow orchestration, external service integration,
// real-time notifications, and comprehensive verification management

// Core Orchestration
export {
  VerificationOrchestrator,
  VerificationType,
  WorkflowState,
  type VerificationWorkflow,
  type WorkflowStep,
  type ExternalCallbackData,
  type CallbackResult,
  type StateTransition,
} from './verification-orchestrator';

// External Service Integration
export {
  ExternalServiceConnector,
  CircuitBreaker,
  type BusinessVerificationRequest,
  type BusinessVerificationResult,
  type InsurancePolicyRequest,
  type InsuranceValidationResult,
  type ExternalService,
  type ServiceError,
  type FailureHandling,
} from './external-service-connector';

// Workflow Engine
export {
  WorkflowEngine,
  type WorkflowRule,
  type WorkflowTransition,
  type ProcessingContext,
  type WorkflowEngineConfig,
} from './workflow-engine';

// Notification System
export {
  VerificationNotifier,
  type VerificationUpdate,
  type NotificationResult,
  type ReminderSchedule,
  type ScheduleResult,
  type NotificationTemplate,
  type VerificationContext,
  type CustomizedNotification,
} from './verification-notifier';

// Verification Integration Factory
export class VerificationIntegrationFactory {
  private static orchestrator: VerificationOrchestrator | null = null;
  private static serviceConnector: ExternalServiceConnector | null = null;
  private static workflowEngine: WorkflowEngine | null = null;
  private static notifier: VerificationNotifier | null = null;

  static getOrchestrator(): VerificationOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = new VerificationOrchestrator();
    }
    return this.orchestrator;
  }

  static getServiceConnector(): ExternalServiceConnector {
    if (!this.serviceConnector) {
      this.serviceConnector = new ExternalServiceConnector();
    }
    return this.serviceConnector;
  }

  static getWorkflowEngine(): WorkflowEngine {
    if (!this.workflowEngine) {
      this.workflowEngine = new WorkflowEngine({
        maxRetries: 3,
        retryDelay: 5000,
        timeoutDuration: 300000,
        parallelProcessingLimit: 10,
        auditEnabled: true,
      });
    }
    return this.workflowEngine;
  }

  static getNotifier(): VerificationNotifier {
    if (!this.notifier) {
      this.notifier = new VerificationNotifier();
    }
    return this.notifier;
  }

  static async initializeSystem(): Promise<void> {
    // Initialize all components
    const orchestrator = this.getOrchestrator();
    const serviceConnector = this.getServiceConnector();
    const workflowEngine = this.getWorkflowEngine();
    const notifier = this.getNotifier();

    // Set up event listeners for inter-component communication
    orchestrator.on('workflow_started', async (data) => {
      await workflowEngine.processWorkflow(data.workflow);
    });

    orchestrator.on('callback_processed', async (data) => {
      if (data.result.requiresNotification) {
        await notifier.sendVerificationUpdate(data.workflow.supplierId, {
          workflowId: data.workflow.id,
          verificationType: data.workflow.verificationType,
          status: data.workflow.state as any,
          message: `Verification ${data.workflow.state}`,
        });
      }
    });

    workflowEngine.on('workflow_processed', async (data) => {
      await notifier.sendVerificationUpdate(data.workflow.supplierId, {
        workflowId: data.workflow.id,
        verificationType: data.workflow.verificationType,
        status: data.workflow.state as any,
        message: `Workflow processed: ${data.workflow.state}`,
      });
    });

    serviceConnector.on('service_failure', async (data) => {
      console.warn('External service failure detected:', data);
      // Could trigger notifications or fallback procedures
    });
  }
}

// Utility functions
export const VerificationUtils = {
  mapVerificationType: (type: string): VerificationType | null => {
    const typeMap: Record<string, VerificationType> = {
      business_registration: VerificationType.BUSINESS_REGISTRATION,
      insurance_policy: VerificationType.INSURANCE_POLICY,
      professional_license: VerificationType.PROFESSIONAL_LICENSE,
      background_check: VerificationType.BACKGROUND_CHECK,
      document_authentication: VerificationType.DOCUMENT_AUTHENTICATION,
    };
    return typeMap[type] || null;
  },

  formatVerificationStatus: (status: WorkflowState): string => {
    const statusMap: Record<WorkflowState, string> = {
      [WorkflowState.PENDING]: 'Pending Review',
      [WorkflowState.IN_PROGRESS]: 'In Progress',
      [WorkflowState.AWAITING_EXTERNAL]: 'Awaiting External Verification',
      [WorkflowState.MANUAL_REVIEW]: 'Manual Review Required',
      [WorkflowState.COMPLETED]: 'Verification Complete',
      [WorkflowState.FAILED]: 'Verification Failed',
      [WorkflowState.EXPIRED]: 'Verification Expired',
    };
    return statusMap[status] || status;
  },

  calculateVerificationScore: (workflow: VerificationWorkflow): number => {
    if (workflow.state === WorkflowState.COMPLETED) return 100;
    if (workflow.state === WorkflowState.FAILED) return 0;

    const totalSteps = workflow.steps.length;
    const completedSteps = workflow.steps.filter(
      (s) => s.status === 'completed',
    ).length;

    return Math.round((completedSteps / totalSteps) * 100);
  },

  estimateCompletionTime: (workflow: VerificationWorkflow): Date | null => {
    if (workflow.state === WorkflowState.COMPLETED) return null;

    const averageStepTime = 24 * 60 * 60 * 1000; // 24 hours per step
    const remainingSteps = workflow.steps.filter(
      (s) => s.status === 'pending',
    ).length;

    return new Date(Date.now() + remainingSteps * averageStepTime);
  },

  isVerificationExpired: (workflow: VerificationWorkflow): boolean => {
    if (!workflow.expiresAt) return false;
    return new Date() > workflow.expiresAt;
  },

  getVerificationRequirements: (
    verificationType: VerificationType,
  ): string[] => {
    const requirements: Record<VerificationType, string[]> = {
      [VerificationType.BUSINESS_REGISTRATION]: [
        'Certificate of Incorporation',
        'Business Registration Certificate',
        'Tax Registration Documents',
      ],
      [VerificationType.INSURANCE_POLICY]: [
        'Insurance Certificate',
        'Policy Schedule',
        'Coverage Declaration',
      ],
      [VerificationType.PROFESSIONAL_LICENSE]: [
        'Professional License Certificate',
        'Qualification Certificates',
        'CPD Records',
      ],
      [VerificationType.BACKGROUND_CHECK]: [
        'DBS Certificate (within 2 years)',
        'Identity Documents',
        'Address Verification',
      ],
      [VerificationType.DOCUMENT_AUTHENTICATION]: [
        'Original Documents',
        'Certified Copies',
        'Authentication Certificates',
      ],
    };
    return requirements[verificationType] || [];
  },
};

// Constants
export const VERIFICATION_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  NOTIFICATION_RETRY_ATTEMPTS: 2,
  WEBHOOK_SIGNATURE_TOLERANCE: 300000, // 5 minutes
};

// Event types for the verification system
export enum VerificationEvents {
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  STEP_COMPLETED = 'step_completed',
  STEP_FAILED = 'step_failed',
  EXTERNAL_CALLBACK_RECEIVED = 'external_callback_received',
  NOTIFICATION_SENT = 'notification_sent',
  SERVICE_FAILURE = 'service_failure',
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  MANUAL_REVIEW_REQUIRED = 'manual_review_required',
}

// Default export for convenient usage
export default VerificationIntegrationFactory;
