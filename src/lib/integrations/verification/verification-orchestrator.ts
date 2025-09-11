import { Logger } from '@/lib/logging/Logger';
import { createClient } from '@/lib/supabase/server';
import { EventEmitter } from 'events';

export enum VerificationType {
  BUSINESS_REGISTRATION = 'business_registration',
  INSURANCE_POLICY = 'insurance_policy',
  PROFESSIONAL_LICENSE = 'professional_license',
  BACKGROUND_CHECK = 'background_check',
  DOCUMENT_AUTHENTICATION = 'document_authentication',
}

export enum WorkflowState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  AWAITING_EXTERNAL = 'awaiting_external',
  MANUAL_REVIEW = 'manual_review',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface VerificationWorkflow {
  id: string;
  supplierId: string;
  verificationType: VerificationType;
  state: WorkflowState;
  steps: WorkflowStep[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  externalServiceId?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExternalCallbackData {
  serviceId: string;
  verificationId: string;
  workflowId: string;
  status: 'success' | 'failure' | 'requires_action';
  data: Record<string, any>;
  signature: string;
  timestamp: string;
}

export interface CallbackResult {
  acknowledged: boolean;
  nextSteps: string[];
  workflowStatus: WorkflowState;
  requiresNotification: boolean;
}

export interface StateTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  triggeredBy: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export class VerificationOrchestrator extends EventEmitter {
  private logger: Logger;
  private supabase;

  constructor() {
    super();
    this.logger = new Logger('VerificationOrchestrator');
    this.supabase = createClient();
  }

  async orchestrateVerificationProcess(
    supplierId: string,
    verificationType: VerificationType,
  ): Promise<VerificationWorkflow> {
    try {
      this.logger.info('Starting verification process', {
        supplierId,
        verificationType,
      });

      // Create workflow record
      const workflow = await this.createWorkflow(supplierId, verificationType);

      // Define workflow steps based on verification type
      const steps = this.defineWorkflowSteps(verificationType);
      workflow.steps = steps;

      // Update workflow with steps
      await this.updateWorkflow(workflow);

      // Begin executing workflow
      await this.executeWorkflowSteps(workflow);

      this.emit('workflow_started', { workflow });
      return workflow;
    } catch (error) {
      this.logger.error('Failed to orchestrate verification process', error);
      throw error;
    }
  }

  async processExternalCallback(
    serviceId: string,
    callbackData: ExternalCallbackData,
  ): Promise<CallbackResult> {
    try {
      this.logger.info('Processing external callback', {
        serviceId,
        callbackData,
      });

      // Validate callback signature
      if (!(await this.validateCallbackSignature(callbackData))) {
        throw new Error('Invalid callback signature');
      }

      // Find associated workflow
      const workflow = await this.getWorkflowById(callbackData.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Update workflow step with callback data
      const updatedWorkflow = await this.updateWorkflowStep(
        workflow,
        callbackData.serviceId,
        callbackData.status,
        callbackData.data,
      );

      // Determine next steps
      const nextSteps = await this.determineNextSteps(updatedWorkflow);

      // Update workflow state if necessary
      const newState = await this.calculateWorkflowState(updatedWorkflow);
      if (newState !== workflow.state) {
        await this.manageWorkflowState(workflow.id, newState);
      }

      const result: CallbackResult = {
        acknowledged: true,
        nextSteps,
        workflowStatus: newState,
        requiresNotification: this.shouldNotify(callbackData.status, newState),
      };

      this.emit('callback_processed', { workflow: updatedWorkflow, result });
      return result;
    } catch (error) {
      this.logger.error('Failed to process external callback', error);
      return {
        acknowledged: false,
        nextSteps: [],
        workflowStatus: WorkflowState.FAILED,
        requiresNotification: true,
      };
    }
  }

  private async manageWorkflowState(
    workflowId: string,
    newState: WorkflowState,
  ): Promise<StateTransition> {
    try {
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const transition: StateTransition = {
        fromState: workflow.state,
        toState: newState,
        triggeredBy: 'system',
        metadata: { timestamp: new Date() },
        timestamp: new Date(),
      };

      // Validate state transition
      if (
        !this.isValidStateTransition(transition.fromState, transition.toState)
      ) {
        throw new Error(
          `Invalid state transition from ${transition.fromState} to ${transition.toState}`,
        );
      }

      // Update workflow state in database
      await this.supabase
        .from('verification_workflows')
        .update({
          state: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      // Log state transition
      await this.supabase.from('verification_state_transitions').insert({
        workflow_id: workflowId,
        from_state: transition.fromState,
        to_state: transition.toState,
        triggered_by: transition.triggeredBy,
        metadata: transition.metadata,
        created_at: transition.timestamp.toISOString(),
      });

      this.emit('state_transition', transition);
      return transition;
    } catch (error) {
      this.logger.error('Failed to manage workflow state', error);
      throw error;
    }
  }

  private async createWorkflow(
    supplierId: string,
    verificationType: VerificationType,
  ): Promise<VerificationWorkflow> {
    const workflow: VerificationWorkflow = {
      id: crypto.randomUUID(),
      supplierId,
      verificationType,
      state: WorkflowState.PENDING,
      steps: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    await this.supabase.from('verification_workflows').insert({
      id: workflow.id,
      supplier_id: workflow.supplierId,
      verification_type: workflow.verificationType,
      state: workflow.state,
      metadata: workflow.metadata,
      created_at: workflow.createdAt.toISOString(),
      updated_at: workflow.updatedAt.toISOString(),
      expires_at: workflow.expiresAt?.toISOString(),
    });

    return workflow;
  }

  private defineWorkflowSteps(
    verificationType: VerificationType,
  ): WorkflowStep[] {
    const stepDefinitions: Record<VerificationType, WorkflowStep[]> = {
      [VerificationType.BUSINESS_REGISTRATION]: [
        {
          id: crypto.randomUUID(),
          name: 'Companies House Lookup',
          status: 'pending',
          externalServiceId: 'companies_house',
        },
        {
          id: crypto.randomUUID(),
          name: 'Tax Authority Validation',
          status: 'pending',
          externalServiceId: 'hmrc_api',
        },
      ],
      [VerificationType.INSURANCE_POLICY]: [
        {
          id: crypto.randomUUID(),
          name: 'Insurance Provider Validation',
          status: 'pending',
          externalServiceId: 'insurance_api',
        },
        {
          id: crypto.randomUUID(),
          name: 'Policy Coverage Verification',
          status: 'pending',
          externalServiceId: 'coverage_validator',
        },
      ],
      [VerificationType.PROFESSIONAL_LICENSE]: [
        {
          id: crypto.randomUUID(),
          name: 'Professional Board Lookup',
          status: 'pending',
          externalServiceId: 'professional_board',
        },
      ],
      [VerificationType.BACKGROUND_CHECK]: [
        {
          id: crypto.randomUUID(),
          name: 'Criminal Background Check',
          status: 'pending',
          externalServiceId: 'background_service',
        },
      ],
      [VerificationType.DOCUMENT_AUTHENTICATION]: [
        {
          id: crypto.randomUUID(),
          name: 'Document Fraud Detection',
          status: 'pending',
          externalServiceId: 'document_auth',
        },
      ],
    };

    return stepDefinitions[verificationType] || [];
  }

  private async executeWorkflowSteps(
    workflow: VerificationWorkflow,
  ): Promise<void> {
    // This would trigger the external service connectors
    // Implementation would involve calling ExternalServiceConnector
    this.logger.info('Executing workflow steps', { workflowId: workflow.id });

    // Emit event for external service processor to pick up
    this.emit('execute_steps', { workflow });
  }

  private async updateWorkflow(workflow: VerificationWorkflow): Promise<void> {
    await this.supabase
      .from('verification_workflows')
      .update({
        steps: workflow.steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow.id);
  }

  private async getWorkflowById(
    workflowId: string,
  ): Promise<VerificationWorkflow | null> {
    const { data, error } = await this.supabase
      .from('verification_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      supplierId: data.supplier_id,
      verificationType: data.verification_type,
      state: data.state,
      steps: data.steps || [],
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }

  private async updateWorkflowStep(
    workflow: VerificationWorkflow,
    serviceId: string,
    status: string,
    responseData: Record<string, any>,
  ): Promise<VerificationWorkflow> {
    const stepIndex = workflow.steps.findIndex(
      (step) => step.externalServiceId === serviceId,
    );
    if (stepIndex === -1) {
      throw new Error('Workflow step not found');
    }

    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      status: status === 'success' ? 'completed' : 'failed',
      responseData,
      completedAt: new Date(),
    };

    await this.updateWorkflow(workflow);
    return workflow;
  }

  private async determineNextSteps(
    workflow: VerificationWorkflow,
  ): Promise<string[]> {
    const nextSteps: string[] = [];

    // Find next pending steps
    const pendingSteps = workflow.steps.filter(
      (step) => step.status === 'pending',
    );
    if (pendingSteps.length > 0) {
      nextSteps.push('continue_workflow');
    }

    // Check if all steps completed
    const allCompleted = workflow.steps.every(
      (step) => step.status === 'completed',
    );
    if (allCompleted) {
      nextSteps.push('complete_verification');
    }

    // Check if any steps failed
    const anyFailed = workflow.steps.some((step) => step.status === 'failed');
    if (anyFailed) {
      nextSteps.push('handle_failure');
    }

    return nextSteps;
  }

  private async calculateWorkflowState(
    workflow: VerificationWorkflow,
  ): Promise<WorkflowState> {
    const completedSteps = workflow.steps.filter(
      (step) => step.status === 'completed',
    );
    const failedSteps = workflow.steps.filter(
      (step) => step.status === 'failed',
    );
    const pendingSteps = workflow.steps.filter(
      (step) => step.status === 'pending',
    );

    if (failedSteps.length > 0) {
      return WorkflowState.FAILED;
    }

    if (completedSteps.length === workflow.steps.length) {
      return WorkflowState.COMPLETED;
    }

    if (pendingSteps.length > 0) {
      return WorkflowState.IN_PROGRESS;
    }

    return WorkflowState.PENDING;
  }

  private async validateCallbackSignature(
    callbackData: ExternalCallbackData,
  ): Promise<boolean> {
    // Implementation would validate HMAC signature
    // For now, return true for basic implementation
    return true;
  }

  private isValidStateTransition(
    fromState: WorkflowState,
    toState: WorkflowState,
  ): boolean {
    const validTransitions: Record<WorkflowState, WorkflowState[]> = {
      [WorkflowState.PENDING]: [
        WorkflowState.IN_PROGRESS,
        WorkflowState.FAILED,
      ],
      [WorkflowState.IN_PROGRESS]: [
        WorkflowState.AWAITING_EXTERNAL,
        WorkflowState.COMPLETED,
        WorkflowState.FAILED,
        WorkflowState.MANUAL_REVIEW,
      ],
      [WorkflowState.AWAITING_EXTERNAL]: [
        WorkflowState.IN_PROGRESS,
        WorkflowState.COMPLETED,
        WorkflowState.FAILED,
      ],
      [WorkflowState.MANUAL_REVIEW]: [
        WorkflowState.IN_PROGRESS,
        WorkflowState.COMPLETED,
        WorkflowState.FAILED,
      ],
      [WorkflowState.COMPLETED]: [WorkflowState.EXPIRED],
      [WorkflowState.FAILED]: [WorkflowState.IN_PROGRESS],
      [WorkflowState.EXPIRED]: [],
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  private shouldNotify(
    callbackStatus: string,
    workflowState: WorkflowState,
  ): boolean {
    return [
      WorkflowState.COMPLETED,
      WorkflowState.FAILED,
      WorkflowState.MANUAL_REVIEW,
    ].includes(workflowState);
  }
}
