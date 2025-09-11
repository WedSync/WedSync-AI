/**
 * Cross-Feature Integration Infrastructure and Monitoring
 * Orchestrates WS-162, WS-163, WS-164 integrations with comprehensive monitoring
 * Team C Integration Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { getWeddingRealtimeManager } from '@/lib/supabase/realtime/WeddingRealtimeManager';
import { budgetIntegration } from './budget-integration';
import { manualTrackingIntegration } from './manual-tracking-integration';
import { webhookSecurity } from '@/lib/security/webhook-security';
import { financialApiSecurity } from '@/lib/security/financial-api-security';

export interface IntegrationHealth {
  feature: 'WS-162' | 'WS-163' | 'WS-164';
  component: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface WeddingIntegrationSummary {
  weddingId: string;
  activeIntegrations: string[];
  realtimeConnections: number;
  budgetSyncStatus: 'current' | 'delayed' | 'error';
  receiptProcessingQueue: number;
  approvalsPending: number;
  lastActivity: Date;
  performanceMetrics: IntegrationPerformanceMetrics;
}

export interface IntegrationPerformanceMetrics {
  realtimeLatency: number; // ms
  budgetCalculationTime: number; // ms
  ocrProcessingTime: number; // ms
  webhookResponseTime: number; // ms
  throughputPerMinute: number;
  errorRate: number; // percentage
}

export interface IntegrationEvent {
  id: string;
  weddingId: string;
  feature: 'WS-162' | 'WS-163' | 'WS-164';
  eventType: string;
  timestamp: Date;
  userId?: string;
  data: any;
  success: boolean;
  duration: number;
  errorMessage?: string;
}

export interface CrossFeatureWorkflow {
  id: string;
  weddingId: string;
  workflowType:
    | 'expense_to_budget'
    | 'schedule_to_calendar'
    | 'receipt_to_accounting';
  stages: WorkflowStage[];
  currentStage: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export interface WorkflowStage {
  name: string;
  feature: 'WS-162' | 'WS-163' | 'WS-164';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  output?: any;
  error?: string;
}

export class IntegrationOrchestrator {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  private realtimeManager = getWeddingRealtimeManager();
  private healthChecks: Map<string, IntegrationHealth> = new Map();
  private performanceMetrics: Map<string, IntegrationPerformanceMetrics> =
    new Map();
  private activeWorkflows: Map<string, CrossFeatureWorkflow> = new Map();

  /**
   * Initialize comprehensive monitoring for all wedding integrations
   */
  async initializeWeddingIntegrations(
    weddingId: string,
    enabledFeatures: Array<'WS-162' | 'WS-163' | 'WS-164'> = [
      'WS-162',
      'WS-163',
      'WS-164',
    ],
  ): Promise<{ success: boolean; summary: WeddingIntegrationSummary }> {
    try {
      const initStart = Date.now();

      // Initialize real-time subscriptions for enabled features
      const subscriptions: any = {};

      if (enabledFeatures.includes('WS-162')) {
        subscriptions.helperSchedules =
          await this.realtimeManager.subscribeToHelperScheduleUpdates(
            weddingId,
            (payload) => this.handleHelperScheduleEvent(weddingId, payload),
          );
      }

      if (enabledFeatures.includes('WS-163')) {
        subscriptions.budgetCalculations =
          await this.realtimeManager.subscribeToBudgetCalculationUpdates(
            weddingId,
            (payload) => this.handleBudgetCalculationEvent(weddingId, payload),
          );
      }

      if (enabledFeatures.includes('WS-164')) {
        subscriptions.expenseTracking =
          await this.realtimeManager.subscribeToExpenseTrackingUpdates(
            weddingId,
            (payload) => this.handleExpenseTrackingEvent(weddingId, payload),
          );
      }

      // Initialize health monitoring
      await this.startHealthMonitoring(weddingId, enabledFeatures);

      // Create integration summary
      const summary = await this.generateIntegrationSummary(weddingId);

      // Log initialization
      await this.logIntegrationEvent({
        weddingId,
        feature: 'WS-162', // Primary feature for initialization
        eventType: 'integration_initialization',
        data: {
          enabledFeatures,
          subscriptions: Object.keys(subscriptions),
          initializationTime: Date.now() - initStart,
        },
        success: true,
        duration: Date.now() - initStart,
      });

      return { success: true, summary };
    } catch (error) {
      console.error('Integration initialization error:', error);
      return {
        success: false,
        summary: await this.generateIntegrationSummary(weddingId),
      };
    }
  }

  /**
   * Cross-feature workflow orchestration
   */
  async executeWorkflow(
    weddingId: string,
    workflowType:
      | 'expense_to_budget'
      | 'schedule_to_calendar'
      | 'receipt_to_accounting',
    inputData: any,
    options?: { priority?: 'low' | 'normal' | 'high'; timeout?: number },
  ): Promise<{ success: boolean; workflowId: string; result?: any }> {
    const workflowId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Create workflow definition based on type
      const workflow = await this.createWorkflowDefinition(
        workflowId,
        weddingId,
        workflowType,
        inputData,
        options,
      );

      this.activeWorkflows.set(workflowId, workflow);

      // Execute workflow stages
      const result = await this.executeWorkflowStages(workflow);

      // Mark workflow as completed
      workflow.status = result.success ? 'completed' : 'failed';
      workflow.completedAt = new Date();

      // Log workflow completion
      await this.logIntegrationEvent({
        weddingId,
        feature: this.getWorkflowPrimaryFeature(workflowType),
        eventType: 'cross_feature_workflow',
        data: {
          workflowType,
          workflowId,
          stages: workflow.stages.length,
          completedStages: workflow.stages.filter(
            (s) => s.status === 'completed',
          ).length,
          totalDuration: Date.now() - startTime,
        },
        success: result.success,
        duration: Date.now() - startTime,
      });

      return {
        success: result.success,
        workflowId,
        result: result.data,
      };
    } catch (error) {
      console.error('Workflow execution error:', error);

      // Mark workflow as failed
      const workflow = this.activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = 'failed';
        workflow.completedAt = new Date();
      }

      return { success: false, workflowId };
    }
  }

  /**
   * Real-time event handlers for cross-feature integration
   */
  private async handleHelperScheduleEvent(
    weddingId: string,
    payload: any,
  ): Promise<void> {
    try {
      const event = payload.new;

      // Cross-feature integration: Update calendar when schedule changes
      if (event.status === 'confirmed') {
        await this.executeWorkflow(
          weddingId,
          'schedule_to_calendar',
          {
            scheduleId: event.id,
            taskName: event.task_name,
            scheduledTime: event.scheduled_at,
            helperId: event.helper_id,
          },
          { priority: 'normal' },
        );
      }

      // Log event for monitoring
      await this.logIntegrationEvent({
        weddingId,
        feature: 'WS-162',
        eventType: 'helper_schedule_update',
        data: { scheduleId: event.id, status: event.status },
        success: true,
        duration: 0,
      });
    } catch (error) {
      console.error('Helper schedule event handling error:', error);
    }
  }

  private async handleBudgetCalculationEvent(
    weddingId: string,
    payload: any,
  ): Promise<void> {
    try {
      const event = payload.new;

      // Cross-feature integration: Trigger accounting sync if over budget
      if (event.is_over_budget && event.is_over_total_budget) {
        await this.executeWorkflow(
          weddingId,
          'receipt_to_accounting',
          {
            budgetCategoryId: event.id,
            category: event.category,
            overspentAmount: event.spent_amount - event.total_budget,
          },
          { priority: 'high' },
        );
      }

      // Update performance metrics
      this.updatePerformanceMetrics(weddingId, 'budget_calculation', 0);

      await this.logIntegrationEvent({
        weddingId,
        feature: 'WS-163',
        eventType: 'budget_calculation_update',
        data: {
          categoryId: event.id,
          isOverBudget: event.is_over_budget,
          spentAmount: event.spent_amount,
          budgetAmount: event.total_budget,
        },
        success: true,
        duration: 0,
      });
    } catch (error) {
      console.error('Budget calculation event handling error:', error);
    }
  }

  private async handleExpenseTrackingEvent(
    weddingId: string,
    payload: any,
  ): Promise<void> {
    try {
      const event = payload.new;

      // Cross-feature integration: Update budget when expense confirmed
      if (event.status === 'confirmed' && event.budget_category_id) {
        await budgetIntegration.updateBudgetCalculations(weddingId, {
          categoryId: event.budget_category_id,
          amount: event.amount,
          status: 'confirmed',
        });
      }

      await this.logIntegrationEvent({
        weddingId,
        feature: 'WS-164',
        eventType: 'expense_tracking_update',
        data: {
          expenseId: event.id,
          status: event.status,
          amount: event.amount,
        },
        success: true,
        duration: 0,
      });
    } catch (error) {
      console.error('Expense tracking event handling error:', error);
    }
  }

  /**
   * Health monitoring system
   */
  private async startHealthMonitoring(
    weddingId: string,
    features: Array<'WS-162' | 'WS-163' | 'WS-164'>,
  ): Promise<void> {
    // Check health every 30 seconds
    setInterval(async () => {
      await this.performHealthChecks(weddingId, features);
    }, 30000);

    // Initial health check
    await this.performHealthChecks(weddingId, features);
  }

  private async performHealthChecks(
    weddingId: string,
    features: Array<'WS-162' | 'WS-163' | 'WS-164'>,
  ): Promise<void> {
    const checks: IntegrationHealth[] = [];

    for (const feature of features) {
      switch (feature) {
        case 'WS-162':
          checks.push(await this.checkHelperScheduleHealth(weddingId));
          checks.push(await this.checkCalendarIntegrationHealth());
          break;
        case 'WS-163':
          checks.push(await this.checkBudgetCalculationHealth(weddingId));
          checks.push(await this.checkBankingIntegrationHealth());
          break;
        case 'WS-164':
          checks.push(await this.checkReceiptProcessingHealth());
          checks.push(await this.checkAccountingIntegrationHealth());
          break;
      }
    }

    // Store health check results
    for (const check of checks) {
      this.healthChecks.set(`${check.feature}-${check.component}`, check);
    }

    // Alert on critical issues
    const criticalIssues = checks.filter((c) => c.status === 'error');
    if (criticalIssues.length > 0) {
      await this.sendHealthAlert(weddingId, criticalIssues);
    }
  }

  private async checkHelperScheduleHealth(
    weddingId: string,
  ): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Check real-time subscription status
      const status = this.realtimeManager.getSubscriptionStatus();
      const helperChannels = Object.keys(status).filter((c) =>
        c.includes('helper-schedule'),
      );

      const isHealthy = helperChannels.some((c) => status[c] === 'SUBSCRIBED');

      return {
        feature: 'WS-162',
        component: 'helper_schedules',
        status: isHealthy ? 'healthy' : 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        metadata: { activeChannels: helperChannels.length },
      };
    } catch (error) {
      return {
        feature: 'WS-162',
        component: 'helper_schedules',
        status: 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkBudgetCalculationHealth(
    weddingId: string,
  ): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Test budget calculation query
      const { data, error } = await this.supabase
        .from('budget_calculations')
        .select('count')
        .eq('wedding_id', weddingId)
        .limit(1);

      return {
        feature: 'WS-163',
        component: 'budget_calculations',
        status: error ? 'error' : 'healthy',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        errorMessage: error?.message,
      };
    } catch (error) {
      return {
        feature: 'WS-163',
        component: 'budget_calculations',
        status: 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkReceiptProcessingHealth(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Check OCR processing queue
      const { data, error } = await this.supabase
        .from('receipts')
        .select('count')
        .eq('ocr_status', 'processing')
        .limit(1);

      const processingCount = data?.[0]?.count || 0;
      const status = error
        ? 'error'
        : processingCount > 10
          ? 'degraded'
          : 'healthy';

      return {
        feature: 'WS-164',
        component: 'receipt_processing',
        status,
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        metadata: { processingQueue: processingCount },
        errorMessage: error?.message,
      };
    } catch (error) {
      return {
        feature: 'WS-164',
        component: 'receipt_processing',
        status: 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkCalendarIntegrationHealth(): Promise<IntegrationHealth> {
    // Mock health check for calendar integration
    return {
      feature: 'WS-162',
      component: 'calendar_integration',
      status: 'healthy',
      lastChecked: new Date(),
      responseTime: 150,
      metadata: { provider: 'google' },
    };
  }

  private async checkBankingIntegrationHealth(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Test PCI compliance check
      const complianceResult =
        await financialApiSecurity.performPciComplianceCheck();

      return {
        feature: 'WS-163',
        component: 'banking_integration',
        status: complianceResult.compliant ? 'healthy' : 'degraded',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        metadata: {
          complianceIssues: complianceResult.issues.length,
          recommendations: complianceResult.recommendations.length,
        },
      };
    } catch (error) {
      return {
        feature: 'WS-163',
        component: 'banking_integration',
        status: 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkAccountingIntegrationHealth(): Promise<IntegrationHealth> {
    // Mock health check for accounting integration
    return {
      feature: 'WS-164',
      component: 'accounting_integration',
      status: 'healthy',
      lastChecked: new Date(),
      responseTime: 200,
      metadata: { provider: 'quickbooks' },
    };
  }

  /**
   * Generate comprehensive integration summary
   */
  private async generateIntegrationSummary(
    weddingId: string,
  ): Promise<WeddingIntegrationSummary> {
    try {
      // Get active real-time connections
      const subscriptionStatus = this.realtimeManager.getSubscriptionStatus();
      const realtimeConnections = Object.values(subscriptionStatus).filter(
        (status) => status === 'SUBSCRIBED',
      ).length;

      // Get pending receipts
      const { data: receipts } = await this.supabase
        .from('receipts')
        .select('count')
        .eq('ocr_status', 'processing');

      // Get pending approvals
      const { data: approvals } = await this.supabase
        .from('expense_approval_workflows')
        .select('count')
        .eq('wedding_id', weddingId)
        .in('current_step', ['pending', 'couple_review']);

      // Get performance metrics
      const metrics = this.performanceMetrics.get(weddingId) || {
        realtimeLatency: 0,
        budgetCalculationTime: 0,
        ocrProcessingTime: 0,
        webhookResponseTime: 0,
        throughputPerMinute: 0,
        errorRate: 0,
      };

      return {
        weddingId,
        activeIntegrations: Object.keys(subscriptionStatus),
        realtimeConnections,
        budgetSyncStatus: 'current', // Simplified for now
        receiptProcessingQueue: receipts?.[0]?.count || 0,
        approvalsPending: approvals?.[0]?.count || 0,
        lastActivity: new Date(),
        performanceMetrics: metrics,
      };
    } catch (error) {
      console.error('Integration summary error:', error);
      throw error;
    }
  }

  /**
   * Workflow creation and execution
   */
  private async createWorkflowDefinition(
    workflowId: string,
    weddingId: string,
    workflowType: string,
    inputData: any,
    options?: any,
  ): Promise<CrossFeatureWorkflow> {
    const stages: WorkflowStage[] = [];

    switch (workflowType) {
      case 'expense_to_budget':
        stages.push(
          { name: 'validate_expense', feature: 'WS-164', status: 'pending' },
          { name: 'update_budget', feature: 'WS-163', status: 'pending' },
          { name: 'send_notification', feature: 'WS-162', status: 'pending' },
        );
        break;
      case 'schedule_to_calendar':
        stages.push(
          { name: 'validate_schedule', feature: 'WS-162', status: 'pending' },
          {
            name: 'create_calendar_event',
            feature: 'WS-162',
            status: 'pending',
          },
          { name: 'send_invites', feature: 'WS-162', status: 'pending' },
        );
        break;
      case 'receipt_to_accounting':
        stages.push(
          { name: 'process_receipt', feature: 'WS-164', status: 'pending' },
          { name: 'update_budget', feature: 'WS-163', status: 'pending' },
          { name: 'sync_accounting', feature: 'WS-164', status: 'pending' },
        );
        break;
    }

    return {
      id: workflowId,
      weddingId,
      workflowType: workflowType as any,
      stages,
      currentStage: 0,
      status: 'running',
      startedAt: new Date(),
      metadata: { inputData, options },
    };
  }

  private async executeWorkflowStages(
    workflow: CrossFeatureWorkflow,
  ): Promise<{ success: boolean; data?: any }> {
    let stageResults: any[] = [];

    for (let i = 0; i < workflow.stages.length; i++) {
      const stage = workflow.stages[i];
      stage.status = 'running';
      stage.startedAt = new Date();
      workflow.currentStage = i;

      try {
        const result = await this.executeWorkflowStage(
          workflow,
          stage,
          stageResults,
        );

        stage.status = result.success ? 'completed' : 'failed';
        stage.completedAt = new Date();
        stage.duration =
          stage.completedAt.getTime() - (stage.startedAt?.getTime() || 0);
        stage.output = result.data;
        stage.error = result.error;

        if (!result.success) {
          return { success: false, data: stageResults };
        }

        stageResults.push(result.data);
      } catch (error) {
        stage.status = 'failed';
        stage.completedAt = new Date();
        stage.duration =
          stage.completedAt.getTime() - (stage.startedAt?.getTime() || 0);
        stage.error = error instanceof Error ? error.message : 'Unknown error';

        return { success: false, data: stageResults };
      }
    }

    return { success: true, data: stageResults };
  }

  private async executeWorkflowStage(
    workflow: CrossFeatureWorkflow,
    stage: WorkflowStage,
    previousResults: any[],
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const { inputData } = workflow.metadata;

    try {
      switch (`${workflow.workflowType}:${stage.name}`) {
        case 'expense_to_budget:validate_expense':
          return {
            success: true,
            data: { validated: true, expenseId: inputData.expenseId },
          };

        case 'expense_to_budget:update_budget':
          const budgetResult = await budgetIntegration.updateBudgetCalculations(
            workflow.weddingId,
            inputData,
          );
          return { success: budgetResult.success, data: budgetResult };

        case 'schedule_to_calendar:create_calendar_event':
          // Mock calendar event creation
          return {
            success: true,
            data: {
              calendarEventId: 'cal_' + crypto.randomUUID(),
              scheduledTime: inputData.scheduledTime,
            },
          };

        case 'receipt_to_accounting:sync_accounting':
          const syncResult = await manualTrackingIntegration.syncWithAccounting(
            workflow.weddingId,
            'quickbooks',
            [inputData.expenseId],
          );
          return {
            success: syncResult.success,
            data: {
              syncedCount: syncResult.syncedCount,
              errors: syncResult.errors,
            },
          };

        default:
          return { success: true, data: { skipped: true, stage: stage.name } };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Utility methods
   */
  private getWorkflowPrimaryFeature(
    workflowType: string,
  ): 'WS-162' | 'WS-163' | 'WS-164' {
    switch (workflowType) {
      case 'schedule_to_calendar':
        return 'WS-162';
      case 'expense_to_budget':
        return 'WS-163';
      case 'receipt_to_accounting':
        return 'WS-164';
      default:
        return 'WS-162';
    }
  }

  private updatePerformanceMetrics(
    weddingId: string,
    operation: string,
    duration: number,
  ): void {
    const current = this.performanceMetrics.get(weddingId) || {
      realtimeLatency: 0,
      budgetCalculationTime: 0,
      ocrProcessingTime: 0,
      webhookResponseTime: 0,
      throughputPerMinute: 0,
      errorRate: 0,
    };

    switch (operation) {
      case 'budget_calculation':
        current.budgetCalculationTime = duration;
        break;
      case 'ocr_processing':
        current.ocrProcessingTime = duration;
        break;
      case 'webhook_response':
        current.webhookResponseTime = duration;
        break;
    }

    this.performanceMetrics.set(weddingId, current);
  }

  private async logIntegrationEvent(
    event: Omit<IntegrationEvent, 'id' | 'timestamp'>,
  ): Promise<void> {
    const fullEvent: IntegrationEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    // In production, this would store to database
    console.log('[INTEGRATION_EVENT]', JSON.stringify(fullEvent));
  }

  private async sendHealthAlert(
    weddingId: string,
    issues: IntegrationHealth[],
  ): Promise<void> {
    // In production, this would send alerts via email/SMS/Slack
    console.error(
      '[HEALTH_ALERT]',
      JSON.stringify({
        weddingId,
        timestamp: new Date(),
        criticalIssues: issues.length,
        issues: issues.map((i) => ({
          feature: i.feature,
          component: i.component,
          status: i.status,
          error: i.errorMessage,
        })),
      }),
    );
  }

  /**
   * Public monitoring interfaces
   */
  getHealthStatus(weddingId?: string): Map<string, IntegrationHealth> {
    return new Map(this.healthChecks);
  }

  getPerformanceMetrics(
    weddingId: string,
  ): IntegrationPerformanceMetrics | undefined {
    return this.performanceMetrics.get(weddingId);
  }

  getActiveWorkflows(): Map<string, CrossFeatureWorkflow> {
    return new Map(this.activeWorkflows);
  }

  async getIntegrationSummary(
    weddingId: string,
  ): Promise<WeddingIntegrationSummary> {
    return await this.generateIntegrationSummary(weddingId);
  }
}

export const integrationOrchestrator = new IntegrationOrchestrator();
