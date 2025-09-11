/**
 * WS-177 Audit Logging System - Workflow Integration Hooks
 * Team C - Seamless integration into existing wedding workflows
 *
 * This module provides non-intrusive audit logging hooks that integrate
 * with existing wedding workflows without disrupting user experience.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WorkflowContext,
  WeddingRole,
  WorkflowHook,
  WorkflowHookConfig,
  ErrorHandlingStrategy,
  AuditEventMetadata,
  WeddingAuditContext,
} from '../../../types/security-integration';

// Workflow integration service
export class AuditWorkflowIntegrator {
  private hooks: Map<WorkflowContext, WorkflowHook[]> = new Map();
  private config: Map<WorkflowContext, WorkflowHookConfig> = new Map();
  private auditLogger?: any; // Will be injected from Team B's AuditLogger service

  constructor(auditLoggerService?: any) {
    this.auditLogger = auditLoggerService;
    this.initializeDefaultHooks();
  }

  /**
   * Initialize default audit hooks for wedding workflows
   */
  private initializeDefaultHooks(): void {
    // Guest management workflow hooks
    this.registerWorkflowHook(
      WorkflowContext.GUEST_MANAGEMENT,
      this.createGuestManagementHook(),
      {
        workflowContext: WorkflowContext.GUEST_MANAGEMENT,
        eventTypes: [
          AuditEventType.GUEST_LIST_ACCESS,
          AuditEventType.GUEST_LIST_MODIFIED,
          AuditEventType.BULK_OPERATION,
        ],
        async: true,
        errorHandling: ErrorHandlingStrategy.LOG_AND_CONTINUE,
      },
    );

    // Vendor coordination workflow hooks
    this.registerWorkflowHook(
      WorkflowContext.VENDOR_COORDINATION,
      this.createVendorCoordinationHook(),
      {
        workflowContext: WorkflowContext.VENDOR_COORDINATION,
        eventTypes: [
          AuditEventType.VENDOR_DATA_ACCESS,
          AuditEventType.VENDOR_CONTRACT_MODIFIED,
        ],
        async: true,
        errorHandling: ErrorHandlingStrategy.LOG_AND_CONTINUE,
      },
    );

    // Task assignment workflow hooks
    this.registerWorkflowHook(
      WorkflowContext.TASK_ASSIGNMENT,
      this.createTaskAssignmentHook(),
      {
        workflowContext: WorkflowContext.TASK_ASSIGNMENT,
        eventTypes: [
          AuditEventType.TASK_DATA_ACCESS,
          AuditEventType.TASK_STATUS_CHANGED,
          AuditEventType.PERMISSION_GRANTED,
          AuditEventType.PERMISSION_REVOKED,
        ],
        async: true,
        errorHandling: ErrorHandlingStrategy.LOG_AND_CONTINUE,
      },
    );

    // Budget tracking workflow hooks
    this.registerWorkflowHook(
      WorkflowContext.BUDGET_TRACKING,
      this.createBudgetTrackingHook(),
      {
        workflowContext: WorkflowContext.BUDGET_TRACKING,
        eventTypes: [
          AuditEventType.BUDGET_DATA_ACCESS,
          AuditEventType.BUDGET_UPDATED,
        ],
        async: true,
        errorHandling: ErrorHandlingStrategy.LOG_AND_CONTINUE,
      },
    );
  }

  /**
   * Register a workflow hook with configuration
   */
  public registerWorkflowHook(
    context: WorkflowContext,
    hook: WorkflowHook,
    config: WorkflowHookConfig,
  ): void {
    if (!this.hooks.has(context)) {
      this.hooks.set(context, []);
    }
    this.hooks.get(context)!.push(hook);
    this.config.set(context, config);
  }

  /**
   * Execute workflow hooks for a given context
   */
  public async executeWorkflowHooks(
    context: WorkflowContext,
    workflowData: any,
    eventType: AuditEventType,
    userInfo: {
      userId: string;
      userRole: WeddingRole;
      ipAddress: string;
      userAgent: string;
      sessionId: string;
    },
    weddingContext?: WeddingAuditContext,
  ): Promise<void> {
    const hooks = this.hooks.get(context);
    const config = this.config.get(context);

    if (!hooks || !config) {
      return;
    }

    // Filter hooks based on event type
    const relevantHooks = hooks.filter(() =>
      config.eventTypes.includes(eventType),
    );

    if (relevantHooks.length === 0) {
      return;
    }

    const startTime = Date.now();

    try {
      // Execute hooks based on async configuration
      if (config.async) {
        // Execute hooks asynchronously - don't block workflow
        this.executeHooksAsync(
          relevantHooks,
          workflowData,
          eventType,
          userInfo,
          weddingContext,
        );
      } else {
        // Execute hooks synchronously
        await this.executeHooksSync(
          relevantHooks,
          workflowData,
          eventType,
          userInfo,
          weddingContext,
        );
      }
    } catch (error) {
      await this.handleHookError(
        error,
        context,
        config.errorHandling,
        startTime,
      );
    }
  }

  /**
   * Execute hooks asynchronously (fire and forget)
   */
  private executeHooksAsync(
    hooks: WorkflowHook[],
    workflowData: any,
    eventType: AuditEventType,
    userInfo: any,
    weddingContext?: WeddingAuditContext,
  ): void {
    // Execute in background without blocking workflow
    Promise.all(
      hooks.map(async (hook) => {
        try {
          const auditEvent = await hook(workflowData, eventType);
          if (auditEvent && this.auditLogger) {
            await this.auditLogger.logEvent(auditEvent);
          }
        } catch (error) {
          console.error('Async audit hook failed:', error);
        }
      }),
    ).catch((error) => {
      console.error('Async audit hooks execution failed:', error);
    });
  }

  /**
   * Execute hooks synchronously
   */
  private async executeHooksSync(
    hooks: WorkflowHook[],
    workflowData: any,
    eventType: AuditEventType,
    userInfo: any,
    weddingContext?: WeddingAuditContext,
  ): Promise<void> {
    for (const hook of hooks) {
      const auditEvent = await hook(workflowData, eventType);
      if (auditEvent && this.auditLogger) {
        await this.auditLogger.logEvent(auditEvent);
      }
    }
  }

  /**
   * Handle hook execution errors based on strategy
   */
  private async handleHookError(
    error: any,
    context: WorkflowContext,
    strategy: ErrorHandlingStrategy,
    startTime: number,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    switch (strategy) {
      case ErrorHandlingStrategy.IGNORE:
        // Silently ignore the error, continue workflow
        break;

      case ErrorHandlingStrategy.LOG_AND_CONTINUE:
        console.error(`Audit hook error in ${context}:`, error);
        // Create audit event for the hook failure
        if (this.auditLogger) {
          const errorEvent = this.createErrorAuditEvent(
            context,
            error,
            duration,
          );
          await this.auditLogger.logEvent(errorEvent);
        }
        break;

      case ErrorHandlingStrategy.FAIL_WORKFLOW:
        throw error;
    }
  }

  /**
   * Create guest management workflow hook
   */
  private createGuestManagementHook(): WorkflowHook {
    return async (
      workflowData: any,
      eventType: AuditEventType,
    ): Promise<AuditEvent | null> => {
      const { action, guestData, userId, userRole, weddingId, metadata } =
        workflowData;

      return {
        id: uuidv4(),
        timestamp: new Date(),
        eventType,
        severity: this.determineSeverity(eventType, action),
        userId,
        userRole,
        weddingId,
        workflowContext: WorkflowContext.GUEST_MANAGEMENT,
        resourceId: guestData?.id,
        resourceType: 'guest',
        ipAddress: metadata?.ipAddress || '0.0.0.0',
        userAgent: metadata?.userAgent || 'unknown',
        sessionId: metadata?.sessionId || uuidv4(),
        details: {
          action,
          guestCount: Array.isArray(guestData) ? guestData.length : 1,
          guestIds: Array.isArray(guestData)
            ? guestData.map((g: any) => g.id)
            : [guestData?.id].filter(Boolean),
          bulkOperation: Array.isArray(guestData) && guestData.length > 10,
        },
        metadata: this.createAuditMetadata(
          metadata,
          eventType === AuditEventType.GUEST_LIST_MODIFIED,
        ),
      };
    };
  }

  /**
   * Create vendor coordination workflow hook
   */
  private createVendorCoordinationHook(): WorkflowHook {
    return async (
      workflowData: any,
      eventType: AuditEventType,
    ): Promise<AuditEvent | null> => {
      const {
        action,
        vendorData,
        contractData,
        userId,
        userRole,
        weddingId,
        metadata,
      } = workflowData;

      return {
        id: uuidv4(),
        timestamp: new Date(),
        eventType,
        severity: this.determineSeverity(eventType, action),
        userId,
        userRole,
        weddingId,
        workflowContext: WorkflowContext.VENDOR_COORDINATION,
        resourceId: vendorData?.id || contractData?.id,
        resourceType: contractData ? 'contract' : 'vendor',
        ipAddress: metadata?.ipAddress || '0.0.0.0',
        userAgent: metadata?.userAgent || 'unknown',
        sessionId: metadata?.sessionId || uuidv4(),
        details: {
          action,
          vendorType: vendorData?.type,
          contractValue: contractData?.value,
          contractStatus: contractData?.status,
          communicationType: metadata?.communicationType || 'direct',
        },
        metadata: this.createAuditMetadata(
          metadata,
          eventType === AuditEventType.VENDOR_CONTRACT_MODIFIED,
        ),
      };
    };
  }

  /**
   * Create task assignment workflow hook
   */
  private createTaskAssignmentHook(): WorkflowHook {
    return async (
      workflowData: any,
      eventType: AuditEventType,
    ): Promise<AuditEvent | null> => {
      const {
        action,
        taskData,
        assignmentData,
        userId,
        userRole,
        weddingId,
        metadata,
      } = workflowData;

      return {
        id: uuidv4(),
        timestamp: new Date(),
        eventType,
        severity: this.determineSeverity(eventType, action),
        userId,
        userRole,
        weddingId,
        workflowContext: WorkflowContext.TASK_ASSIGNMENT,
        resourceId: taskData?.id,
        resourceType: 'task',
        ipAddress: metadata?.ipAddress || '0.0.0.0',
        userAgent: metadata?.userAgent || 'unknown',
        sessionId: metadata?.sessionId || uuidv4(),
        details: {
          action,
          taskType: taskData?.type,
          taskPriority: taskData?.priority,
          assignedTo: assignmentData?.assignedTo,
          previousAssignee: assignmentData?.previousAssignee,
          statusChange: taskData?.statusChange,
          permissionLevel: assignmentData?.permissionLevel,
        },
        metadata: this.createAuditMetadata(
          metadata,
          [
            AuditEventType.TASK_STATUS_CHANGED,
            AuditEventType.PERMISSION_GRANTED,
            AuditEventType.PERMISSION_REVOKED,
          ].includes(eventType),
        ),
      };
    };
  }

  /**
   * Create budget tracking workflow hook
   */
  private createBudgetTrackingHook(): WorkflowHook {
    return async (
      workflowData: any,
      eventType: AuditEventType,
    ): Promise<AuditEvent | null> => {
      const { action, budgetData, userId, userRole, weddingId, metadata } =
        workflowData;

      return {
        id: uuidv4(),
        timestamp: new Date(),
        eventType,
        severity: this.determineSeverity(eventType, action),
        userId,
        userRole,
        weddingId,
        workflowContext: WorkflowContext.BUDGET_TRACKING,
        resourceId: budgetData?.id,
        resourceType: 'budget',
        ipAddress: metadata?.ipAddress || '0.0.0.0',
        userAgent: metadata?.userAgent || 'unknown',
        sessionId: metadata?.sessionId || uuidv4(),
        details: {
          action,
          budgetCategory: budgetData?.category,
          amount: budgetData?.amount,
          previousAmount: budgetData?.previousAmount,
          amountChange: budgetData?.amount - (budgetData?.previousAmount || 0),
          percentageChange: this.calculatePercentageChange(
            budgetData?.previousAmount,
            budgetData?.amount,
          ),
        },
        metadata: this.createAuditMetadata(
          metadata,
          eventType === AuditEventType.BUDGET_UPDATED,
        ),
      };
    };
  }

  /**
   * Determine audit event severity based on event type and action
   */
  private determineSeverity(
    eventType: AuditEventType,
    action?: string,
  ): AuditSeverity {
    // High severity events
    if (
      [
        AuditEventType.DATA_EXPORT,
        AuditEventType.PERMISSION_GRANTED,
        AuditEventType.PERMISSION_REVOKED,
        AuditEventType.BULK_OPERATION,
      ].includes(eventType)
    ) {
      return AuditSeverity.HIGH;
    }

    // Medium severity events
    if (
      [
        AuditEventType.GUEST_LIST_MODIFIED,
        AuditEventType.VENDOR_CONTRACT_MODIFIED,
        AuditEventType.BUDGET_UPDATED,
      ].includes(eventType)
    ) {
      return AuditSeverity.MEDIUM;
    }

    // Low severity events (access/view operations)
    return AuditSeverity.LOW;
  }

  /**
   * Create audit event metadata
   */
  private createAuditMetadata(
    metadata: any,
    isModification: boolean = false,
  ): AuditEventMetadata {
    return {
      requestId: metadata?.requestId || uuidv4(),
      source: metadata?.source || 'ui',
      duration: metadata?.duration,
      success: metadata?.success !== false,
      errorCode: metadata?.errorCode,
      errorMessage: metadata?.errorMessage,
      affectedRecords: metadata?.affectedRecords || 1,
      previousValues: isModification ? metadata?.previousValues : undefined,
      newValues: isModification ? metadata?.newValues : undefined,
    };
  }

  /**
   * Calculate percentage change for budget tracking
   */
  private calculatePercentageChange(
    oldValue?: number,
    newValue?: number,
  ): number {
    if (!oldValue || !newValue) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Create error audit event for hook failures
   */
  private createErrorAuditEvent(
    context: WorkflowContext,
    error: any,
    duration: number,
  ): AuditEvent {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      eventType: AuditEventType.UNUSUAL_ACCESS_PATTERN, // Use as generic error indicator
      severity: AuditSeverity.MEDIUM,
      userId: 'system',
      userRole: WeddingRole.ADMIN,
      workflowContext: context,
      resourceType: 'audit_hook',
      ipAddress: '127.0.0.1',
      userAgent: 'audit-system',
      sessionId: 'audit-hook-error',
      details: {
        errorType: 'hook_execution_error',
        errorMessage: error?.message || 'Unknown error',
        errorStack: error?.stack,
        context,
      },
      metadata: {
        requestId: uuidv4(),
        source: 'background',
        duration,
        success: false,
        errorCode: 'AUDIT_HOOK_ERROR',
        errorMessage: error?.message || 'Hook execution failed',
      },
    };
  }
}

// Factory function to create audit workflow integrator
export function createAuditWorkflowIntegrator(
  auditLoggerService?: any,
): AuditWorkflowIntegrator {
  return new AuditWorkflowIntegrator(auditLoggerService);
}

// Convenience functions for common workflow integrations
export const WorkflowAuditHooks = {
  /**
   * Hook for guest list operations
   */
  auditGuestOperation: async (
    action: string,
    guestData: any,
    userInfo: any,
    weddingId: string,
    metadata?: any,
  ): Promise<void> => {
    const integrator = new AuditWorkflowIntegrator();
    await integrator.executeWorkflowHooks(
      WorkflowContext.GUEST_MANAGEMENT,
      { action, guestData, ...userInfo, weddingId, metadata },
      AuditEventType.GUEST_LIST_MODIFIED,
      userInfo,
    );
  },

  /**
   * Hook for vendor operations
   */
  auditVendorOperation: async (
    action: string,
    vendorData: any,
    contractData: any,
    userInfo: any,
    weddingId: string,
    metadata?: any,
  ): Promise<void> => {
    const integrator = new AuditWorkflowIntegrator();
    await integrator.executeWorkflowHooks(
      WorkflowContext.VENDOR_COORDINATION,
      { action, vendorData, contractData, ...userInfo, weddingId, metadata },
      AuditEventType.VENDOR_CONTRACT_MODIFIED,
      userInfo,
    );
  },

  /**
   * Hook for task operations
   */
  auditTaskOperation: async (
    action: string,
    taskData: any,
    assignmentData: any,
    userInfo: any,
    weddingId: string,
    metadata?: any,
  ): Promise<void> => {
    const integrator = new AuditWorkflowIntegrator();
    await integrator.executeWorkflowHooks(
      WorkflowContext.TASK_ASSIGNMENT,
      { action, taskData, assignmentData, ...userInfo, weddingId, metadata },
      AuditEventType.TASK_STATUS_CHANGED,
      userInfo,
    );
  },

  /**
   * Hook for budget operations
   */
  auditBudgetOperation: async (
    action: string,
    budgetData: any,
    userInfo: any,
    weddingId: string,
    metadata?: any,
  ): Promise<void> => {
    const integrator = new AuditWorkflowIntegrator();
    await integrator.executeWorkflowHooks(
      WorkflowContext.BUDGET_TRACKING,
      { action, budgetData, ...userInfo, weddingId, metadata },
      AuditEventType.BUDGET_UPDATED,
      userInfo,
    );
  },
};

export default AuditWorkflowIntegrator;
