import { Logger } from '@/lib/logging/Logger';
import { createClient } from '@/lib/supabase/server';
import { EventEmitter } from 'events';
import {
  VerificationWorkflow,
  WorkflowState,
  WorkflowStep,
  VerificationType,
} from './verification-orchestrator';

export interface WorkflowRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

export interface WorkflowTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  trigger: string;
  conditions: string[];
  actions: string[];
}

export interface ProcessingContext {
  workflow: VerificationWorkflow;
  currentStep?: WorkflowStep;
  externalData?: Record<string, any>;
  userInput?: Record<string, any>;
  systemState: Record<string, any>;
}

export interface WorkflowEngineConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutDuration: number;
  parallelProcessingLimit: number;
  auditEnabled: boolean;
}

export class WorkflowEngine extends EventEmitter {
  private logger: Logger;
  private supabase;
  private config: WorkflowEngineConfig;
  private rules: Map<string, WorkflowRule>;
  private transitions: Map<WorkflowState, WorkflowTransition[]>;
  private processingQueue: Map<string, ProcessingContext>;

  constructor(config?: Partial<WorkflowEngineConfig>) {
    super();
    this.logger = new Logger('WorkflowEngine');
    this.supabase = createClient();
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      timeoutDuration: 300000, // 5 minutes
      parallelProcessingLimit: 10,
      auditEnabled: true,
      ...config,
    };
    this.rules = new Map();
    this.transitions = new Map();
    this.processingQueue = new Map();
    this.initializeStateMachine();
    this.initializeRules();
  }

  async processWorkflow(
    workflow: VerificationWorkflow,
  ): Promise<VerificationWorkflow> {
    try {
      this.logger.info('Processing workflow', {
        workflowId: workflow.id,
        state: workflow.state,
      });

      // Create processing context
      const context: ProcessingContext = {
        workflow,
        systemState: {
          startTime: new Date(),
          retryCount: 0,
          processedSteps: [],
        },
      };

      // Add to processing queue
      this.processingQueue.set(workflow.id, context);

      // Process workflow steps
      const updatedWorkflow = await this.executeWorkflowSteps(context);

      // Apply business rules
      await this.applyBusinessRules(context);

      // Update workflow state if needed
      const newState = await this.evaluateWorkflowState(updatedWorkflow);
      if (newState !== updatedWorkflow.state) {
        await this.transitionWorkflowState(
          updatedWorkflow,
          newState,
          'system_evaluation',
        );
      }

      // Remove from processing queue
      this.processingQueue.delete(workflow.id);

      this.emit('workflow_processed', { workflow: updatedWorkflow });
      return updatedWorkflow;
    } catch (error) {
      this.logger.error('Failed to process workflow', error);
      this.processingQueue.delete(workflow.id);
      throw error;
    }
  }

  async executeStep(
    workflow: VerificationWorkflow,
    stepId: string,
    externalData?: Record<string, any>,
  ): Promise<WorkflowStep> {
    try {
      const step = workflow.steps.find((s) => s.id === stepId);
      if (!step) {
        throw new Error('Step not found');
      }

      this.logger.info('Executing workflow step', {
        workflowId: workflow.id,
        stepId,
        stepName: step.name,
      });

      // Update step status
      step.status = 'in_progress';
      step.startedAt = new Date();

      // Execute step logic based on type
      const result = await this.executeStepLogic(step, workflow, externalData);

      // Update step with results
      step.status = result.success ? 'completed' : 'failed';
      step.completedAt = new Date();
      step.responseData = result.data;

      if (!result.success) {
        step.error = result.error;
      }

      // Update workflow with step changes
      await this.updateWorkflowSteps(workflow);

      // Trigger next steps if needed
      if (result.success) {
        await this.triggerNextSteps(workflow, step);
      }

      this.emit('step_executed', { workflow, step, result });
      return step;
    } catch (error) {
      this.logger.error('Failed to execute workflow step', error);
      throw error;
    }
  }

  async retryFailedStep(
    workflow: VerificationWorkflow,
    stepId: string,
  ): Promise<WorkflowStep> {
    try {
      const step = workflow.steps.find((s) => s.id === stepId);
      if (!step || step.status !== 'failed') {
        throw new Error('Step not found or not in failed state');
      }

      const retryCount = (step.responseData?.retryCount || 0) + 1;
      if (retryCount > this.config.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      this.logger.info('Retrying failed step', {
        workflowId: workflow.id,
        stepId,
        retryCount,
      });

      // Reset step status for retry
      step.status = 'pending';
      step.error = undefined;
      step.responseData = { ...step.responseData, retryCount };

      // Wait for retry delay
      if (retryCount > 1) {
        await this.delay(this.config.retryDelay * retryCount);
      }

      // Execute step again
      return await this.executeStep(workflow, stepId);
    } catch (error) {
      this.logger.error('Failed to retry workflow step', error);
      throw error;
    }
  }

  async transitionWorkflowState(
    workflow: VerificationWorkflow,
    newState: WorkflowState,
    trigger: string,
  ): Promise<VerificationWorkflow> {
    try {
      this.logger.info('Transitioning workflow state', {
        workflowId: workflow.id,
        fromState: workflow.state,
        toState: newState,
        trigger,
      });

      // Validate transition
      const isValidTransition = await this.validateStateTransition(
        workflow.state,
        newState,
        trigger,
      );
      if (!isValidTransition) {
        throw new Error(
          `Invalid state transition from ${workflow.state} to ${newState}`,
        );
      }

      const oldState = workflow.state;
      workflow.state = newState;
      workflow.updatedAt = new Date();

      // Update database
      await this.supabase
        .from('verification_workflows')
        .update({
          state: newState,
          updated_at: workflow.updatedAt.toISOString(),
        })
        .eq('id', workflow.id);

      // Log transition
      if (this.config.auditEnabled) {
        await this.auditStateTransition(workflow, oldState, newState, trigger);
      }

      // Execute transition actions
      await this.executeTransitionActions(workflow, oldState, newState);

      this.emit('state_transition', { workflow, oldState, newState, trigger });
      return workflow;
    } catch (error) {
      this.logger.error('Failed to transition workflow state', error);
      throw error;
    }
  }

  private async executeWorkflowSteps(
    context: ProcessingContext,
  ): Promise<VerificationWorkflow> {
    const { workflow } = context;

    // Find pending steps that can be executed
    const executableSteps = this.findExecutableSteps(workflow);

    // Execute steps in parallel (respecting dependency order)
    const parallelGroups = this.groupStepsByDependencies(executableSteps);

    for (const group of parallelGroups) {
      const promises = group.map((step) => this.executeStep(workflow, step.id));
      await Promise.allSettled(promises);
    }

    return workflow;
  }

  private async executeStepLogic(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      switch (step.externalServiceId) {
        case 'companies_house':
          return await this.executeCompaniesHouseStep(
            step,
            workflow,
            externalData,
          );
        case 'insurance_api':
          return await this.executeInsuranceStep(step, workflow, externalData);
        case 'professional_board':
          return await this.executeProfessionalBoardStep(
            step,
            workflow,
            externalData,
          );
        case 'background_service':
          return await this.executeBackgroundCheckStep(
            step,
            workflow,
            externalData,
          );
        default:
          return await this.executeGenericStep(step, workflow, externalData);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeCompaniesHouseStep(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // This would integrate with the ExternalServiceConnector
    // For now, return mock success
    return {
      success: true,
      data: {
        companyName: 'Mock Company Ltd',
        registrationNumber: '12345678',
        status: 'active',
        verificationDate: new Date().toISOString(),
      },
    };
  }

  private async executeInsuranceStep(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // This would integrate with insurance APIs
    return {
      success: true,
      data: {
        policyNumber: externalData?.policyNumber || 'POL123456',
        isValid: true,
        coverageAmount: 1000000,
        verificationDate: new Date().toISOString(),
      },
    };
  }

  private async executeProfessionalBoardStep(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // This would integrate with professional licensing boards
    return {
      success: true,
      data: {
        licenseNumber: externalData?.licenseNumber || 'LIC789012',
        isValid: true,
        expiryDate: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        verificationDate: new Date().toISOString(),
      },
    };
  }

  private async executeBackgroundCheckStep(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // This would integrate with background check services
    return {
      success: true,
      data: {
        checkType: 'enhanced_dbs',
        result: 'clear',
        certificateNumber: 'DBS345678',
        verificationDate: new Date().toISOString(),
      },
    };
  }

  private async executeGenericStep(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
    externalData?: Record<string, any>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Generic step execution for custom verification types
    return {
      success: true,
      data: externalData || { message: 'Step completed successfully' },
    };
  }

  private findExecutableSteps(workflow: VerificationWorkflow): WorkflowStep[] {
    return workflow.steps.filter(
      (step) =>
        step.status === 'pending' && this.areDependenciesMet(step, workflow),
    );
  }

  private areDependenciesMet(
    step: WorkflowStep,
    workflow: VerificationWorkflow,
  ): boolean {
    // Check if step dependencies are completed
    // For now, assume all steps can run in parallel
    return true;
  }

  private groupStepsByDependencies(steps: WorkflowStep[]): WorkflowStep[][] {
    // Group steps that can run in parallel
    // For now, return single group
    return [steps];
  }

  private async triggerNextSteps(
    workflow: VerificationWorkflow,
    completedStep: WorkflowStep,
  ): Promise<void> {
    // Logic to determine and trigger next steps based on completed step
    this.logger.info('Step completed, checking for next steps', {
      workflowId: workflow.id,
      completedStepId: completedStep.id,
    });
  }

  private async applyBusinessRules(context: ProcessingContext): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.isActive) continue;

      if (await this.evaluateRuleCondition(rule, context)) {
        await this.executeRuleAction(rule, context);
      }
    }
  }

  private async evaluateRuleCondition(
    rule: WorkflowRule,
    context: ProcessingContext,
  ): Promise<boolean> {
    // Evaluate rule conditions against context
    // This would use a rule engine or simple condition evaluation
    return true; // Mock implementation
  }

  private async executeRuleAction(
    rule: WorkflowRule,
    context: ProcessingContext,
  ): Promise<void> {
    this.logger.info('Executing rule action', {
      ruleId: rule.id,
      action: rule.action,
    });
    // Execute rule actions (notifications, state changes, etc.)
  }

  private async evaluateWorkflowState(
    workflow: VerificationWorkflow,
  ): Promise<WorkflowState> {
    const completedSteps = workflow.steps.filter(
      (s) => s.status === 'completed',
    );
    const failedSteps = workflow.steps.filter((s) => s.status === 'failed');
    const inProgressSteps = workflow.steps.filter(
      (s) => s.status === 'in_progress',
    );

    if (failedSteps.length > 0) {
      return WorkflowState.FAILED;
    }

    if (completedSteps.length === workflow.steps.length) {
      return WorkflowState.COMPLETED;
    }

    if (inProgressSteps.length > 0) {
      return WorkflowState.IN_PROGRESS;
    }

    return WorkflowState.PENDING;
  }

  private async validateStateTransition(
    fromState: WorkflowState,
    toState: WorkflowState,
    trigger: string,
  ): Promise<boolean> {
    const validTransitions = this.transitions.get(fromState) || [];
    return validTransitions.some(
      (t) =>
        t.toState === toState && (t.trigger === trigger || t.trigger === '*'),
    );
  }

  private async executeTransitionActions(
    workflow: VerificationWorkflow,
    oldState: WorkflowState,
    newState: WorkflowState,
  ): Promise<void> {
    // Execute actions based on state transition
    this.logger.info('Executing transition actions', {
      workflowId: workflow.id,
      oldState,
      newState,
    });
  }

  private async updateWorkflowSteps(
    workflow: VerificationWorkflow,
  ): Promise<void> {
    await this.supabase
      .from('verification_workflows')
      .update({
        steps: workflow.steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow.id);
  }

  private async auditStateTransition(
    workflow: VerificationWorkflow,
    fromState: WorkflowState,
    toState: WorkflowState,
    trigger: string,
  ): Promise<void> {
    await this.supabase.from('workflow_audit_log').insert({
      id: crypto.randomUUID(),
      workflow_id: workflow.id,
      event_type: 'state_transition',
      from_state: fromState,
      to_state: toState,
      trigger,
      timestamp: new Date().toISOString(),
      metadata: {
        supplier_id: workflow.supplierId,
        verification_type: workflow.verificationType,
      },
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private initializeStateMachine(): void {
    // Define valid state transitions
    this.transitions.set(WorkflowState.PENDING, [
      {
        fromState: WorkflowState.PENDING,
        toState: WorkflowState.IN_PROGRESS,
        trigger: 'start',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.PENDING,
        toState: WorkflowState.FAILED,
        trigger: 'error',
        conditions: [],
        actions: [],
      },
    ]);

    this.transitions.set(WorkflowState.IN_PROGRESS, [
      {
        fromState: WorkflowState.IN_PROGRESS,
        toState: WorkflowState.AWAITING_EXTERNAL,
        trigger: 'external_call',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.IN_PROGRESS,
        toState: WorkflowState.MANUAL_REVIEW,
        trigger: 'requires_review',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.IN_PROGRESS,
        toState: WorkflowState.COMPLETED,
        trigger: 'complete',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.IN_PROGRESS,
        toState: WorkflowState.FAILED,
        trigger: 'error',
        conditions: [],
        actions: [],
      },
    ]);

    this.transitions.set(WorkflowState.AWAITING_EXTERNAL, [
      {
        fromState: WorkflowState.AWAITING_EXTERNAL,
        toState: WorkflowState.IN_PROGRESS,
        trigger: 'external_response',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.AWAITING_EXTERNAL,
        toState: WorkflowState.FAILED,
        trigger: 'timeout',
        conditions: [],
        actions: [],
      },
    ]);

    this.transitions.set(WorkflowState.MANUAL_REVIEW, [
      {
        fromState: WorkflowState.MANUAL_REVIEW,
        toState: WorkflowState.IN_PROGRESS,
        trigger: 'review_complete',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.MANUAL_REVIEW,
        toState: WorkflowState.COMPLETED,
        trigger: 'approve',
        conditions: [],
        actions: [],
      },
      {
        fromState: WorkflowState.MANUAL_REVIEW,
        toState: WorkflowState.FAILED,
        trigger: 'reject',
        conditions: [],
        actions: [],
      },
    ]);

    this.transitions.set(WorkflowState.COMPLETED, [
      {
        fromState: WorkflowState.COMPLETED,
        toState: WorkflowState.EXPIRED,
        trigger: 'expire',
        conditions: [],
        actions: [],
      },
    ]);

    this.transitions.set(WorkflowState.FAILED, [
      {
        fromState: WorkflowState.FAILED,
        toState: WorkflowState.IN_PROGRESS,
        trigger: 'retry',
        conditions: [],
        actions: [],
      },
    ]);
  }

  private initializeRules(): void {
    // Initialize business rules
    this.rules.set('auto_approve_low_risk', {
      id: 'auto_approve_low_risk',
      name: 'Auto-approve low risk verifications',
      condition: 'risk_score < 0.3 AND all_checks_passed = true',
      action: 'auto_approve',
      priority: 1,
      isActive: true,
    });

    this.rules.set('escalate_high_risk', {
      id: 'escalate_high_risk',
      name: 'Escalate high risk verifications',
      condition: 'risk_score > 0.8 OR suspicious_activity = true',
      action: 'manual_review',
      priority: 2,
      isActive: true,
    });
  }
}
