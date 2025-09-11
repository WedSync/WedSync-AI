/**
 * WS-165: Payment Calendar Orchestrator Service
 * Coordinates all payment calendar integration services for unified functionality
 * Team C Integration Implementation
 */

import { BaseIntegrationService } from './BaseIntegrationService';
import { NotificationService } from './NotificationService';
import { BudgetCategoryIntegration } from './budget-integration';
import { CashFlowCalculatorService } from './cash-flow-calculator';
import { VendorPaymentSyncService } from './vendor-payment-sync';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
  ErrorSeverity,
} from '@/types/integrations';
import { createClient } from '@supabase/supabase-js';

export interface PaymentCalendarEvent {
  id: string;
  weddingId: string;
  vendorId?: string;
  type:
    | 'payment_due'
    | 'budget_deadline'
    | 'vendor_confirmation'
    | 'cash_flow_alert';
  title: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: Date;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'upcoming' | 'overdue' | 'completed' | 'cancelled';
  reminderSchedule: ReminderSchedule[];
  metadata: Record<string, any>;
}

export interface ReminderSchedule {
  days: number;
  sent: boolean;
  scheduledAt: Date;
  sentAt?: Date;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
}

export interface PaymentCalendarSyncResult {
  success: boolean;
  totalEvents: number;
  newEvents: number;
  updatedEvents: number;
  errors: Array<{
    service: string;
    error: string;
    severity: ErrorSeverity;
  }>;
  cashFlowImpact: {
    projectedBalance: number;
    riskLevel: string;
    recommendations: string[];
  };
  nextSyncAt: Date;
}

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastError?: string;
}

export interface IntegrationHealthDashboard {
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealthStatus[];
  recentSyncResults: PaymentCalendarSyncResult[];
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    notificationDeliveryRate: number;
    cashFlowAccuracy: number;
  };
  lastUpdated: Date;
}

export class PaymentCalendarOrchestratorService extends BaseIntegrationService {
  protected serviceName = 'PaymentCalendarOrchestrator';
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Service instances
  private notificationService: NotificationService;
  private budgetIntegration: BudgetCategoryIntegration;
  private cashFlowCalculator: CashFlowCalculatorService;
  private vendorPaymentSync: VendorPaymentSyncService;

  // Performance tracking
  private healthMetrics = new Map<string, ServiceHealthStatus>();
  private syncHistory: PaymentCalendarSyncResult[] = [];

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);

    // Initialize service instances
    this.notificationService = new NotificationService(
      credentials.userId,
      credentials.organizationId,
    );
    this.budgetIntegration = new BudgetCategoryIntegration();
    this.cashFlowCalculator = new CashFlowCalculatorService();
    this.vendorPaymentSync = new VendorPaymentSyncService(config, credentials);

    this.initializeHealthTracking();
  }

  // Base Integration Service Implementation
  async validateConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('payment_calendar_events')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    return this.credentials.accessToken || this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    // Implementation for orchestrator-specific requests
    return { success: true, data: null };
  }

  /**
   * Main orchestration method - syncs all payment calendar data
   */
  async syncPaymentCalendar(
    weddingId: string,
  ): Promise<PaymentCalendarSyncResult> {
    const startTime = Date.now();
    let totalEvents = 0;
    let newEvents = 0;
    let updatedEvents = 0;
    const errors: Array<{
      service: string;
      error: string;
      severity: ErrorSeverity;
    }> = [];

    try {
      this.logRequest('POST', `/sync-payment-calendar/${weddingId}`);

      // 1. Sync vendor payment schedules
      try {
        const vendorSync =
          await this.vendorPaymentSync.syncVendorPayments(weddingId);
        if (!vendorSync.success) {
          vendorSync.errors.forEach((error) => {
            errors.push({
              service: 'VendorPaymentSync',
              error: error.error,
              severity: ErrorSeverity.MEDIUM,
            });
          });
        }
        totalEvents += vendorSync.syncedVendors;
      } catch (error) {
        errors.push({
          service: 'VendorPaymentSync',
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: ErrorSeverity.HIGH,
        });
      }

      // 2. Update budget calculations
      try {
        const budgetEvents = await this.syncBudgetPayments(weddingId);
        totalEvents += budgetEvents.length;
        newEvents += budgetEvents.filter((e) => e.isNew).length;
      } catch (error) {
        errors.push({
          service: 'BudgetIntegration',
          error: error instanceof Error ? error.message : 'Budget sync failed',
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // 3. Generate cash flow projections
      let cashFlowImpact;
      try {
        const analysis =
          await this.cashFlowCalculator.generateCashFlowAnalysis(weddingId);
        cashFlowImpact = {
          projectedBalance: analysis.projectedBalance,
          riskLevel: analysis.riskLevel,
          recommendations: analysis.recommendations.map((r) => r.title),
        };
      } catch (error) {
        errors.push({
          service: 'CashFlowCalculator',
          error:
            error instanceof Error
              ? error.message
              : 'Cash flow analysis failed',
          severity: ErrorSeverity.MEDIUM,
        });

        // Fallback cash flow impact
        cashFlowImpact = {
          projectedBalance: 0,
          riskLevel: 'unknown',
          recommendations: [
            'Unable to generate recommendations due to analysis error',
          ],
        };
      }

      // 4. Schedule payment reminders
      try {
        await this.schedulePaymentReminders(weddingId);
      } catch (error) {
        errors.push({
          service: 'NotificationService',
          error:
            error instanceof Error
              ? error.message
              : 'Reminder scheduling failed',
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // 5. Update calendar events in database
      try {
        const calendarEvents = await this.generateCalendarEvents(weddingId);
        await this.saveCalendarEvents(calendarEvents);
        updatedEvents = calendarEvents.length;
      } catch (error) {
        errors.push({
          service: 'CalendarEvents',
          error:
            error instanceof Error ? error.message : 'Calendar update failed',
          severity: ErrorSeverity.HIGH,
        });
      }

      const syncResult: PaymentCalendarSyncResult = {
        success:
          errors.filter((e) => e.severity === ErrorSeverity.HIGH).length === 0,
        totalEvents,
        newEvents,
        updatedEvents,
        errors,
        cashFlowImpact,
        nextSyncAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Next sync in 12 hours
      };

      // Update health metrics
      this.updateHealthMetrics(Date.now() - startTime, syncResult.success);

      // Store sync history
      this.syncHistory.unshift(syncResult);
      if (this.syncHistory.length > 50) {
        this.syncHistory.pop();
      }

      this.logResponse(
        'POST',
        `/sync-payment-calendar/${weddingId}`,
        syncResult,
      );
      return syncResult;
    } catch (error) {
      const failedResult: PaymentCalendarSyncResult = {
        success: false,
        totalEvents: 0,
        newEvents: 0,
        updatedEvents: 0,
        errors: [
          {
            service: 'PaymentCalendarOrchestrator',
            error:
              error instanceof Error
                ? error.message
                : 'Unknown orchestration error',
            severity: ErrorSeverity.HIGH,
          },
        ],
        cashFlowImpact: {
          projectedBalance: 0,
          riskLevel: 'critical',
          recommendations: ['Sync failed - manual review required'],
        },
        nextSyncAt: new Date(Date.now() + 30 * 60 * 1000), // Retry in 30 minutes
      };

      this.updateHealthMetrics(Date.now() - startTime, false);
      return failedResult;
    }
  }

  /**
   * Sync budget-related payment events
   */
  private async syncBudgetPayments(
    weddingId: string,
  ): Promise<Array<{ isNew: boolean }>> {
    const { data: budgetCategories, error } = await this.supabase
      .from('budget_calculations')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error || !budgetCategories) {
      throw new Error(`Failed to fetch budget categories: ${error?.message}`);
    }

    const events: Array<{ isNew: boolean }> = [];

    // Generate budget deadline events
    for (const category of budgetCategories) {
      const remainingAmount =
        category.total_budget - category.spent_amount - category.pending_amount;

      if (remainingAmount < category.total_budget * 0.1) {
        // Budget running low - create alert event
        events.push({ isNew: true });
      }
    }

    return events;
  }

  /**
   * Schedule payment reminders based on payment schedules
   */
  private async schedulePaymentReminders(weddingId: string): Promise<void> {
    const { data: vendorPayments, error } = await this.supabase
      .from('vendor_payment_sync')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error || !vendorPayments) {
      throw new Error(`Failed to fetch vendor payments: ${error?.message}`);
    }

    await this.notificationService.initialize();

    for (const vendor of vendorPayments) {
      for (const payment of vendor.payment_schedule || []) {
        if (payment.status === 'pending') {
          const dueDate = new Date(payment.dueDate);
          const now = new Date();
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Schedule reminders at 30, 14, 7, 3, and 1 days before due date
          const reminderDays = [30, 14, 7, 3, 1];

          for (const reminderDay of reminderDays) {
            if (daysUntilDue === reminderDay) {
              await this.notificationService.sendNotification({
                templateId: 'payment_due_soon',
                recipients: [
                  {
                    id: vendor.wedding_id,
                    type: 'user',
                    value: vendor.wedding_id,
                  },
                ],
                variables: {
                  vendorName: vendor.name || 'Vendor',
                  paymentAmount: payment.amount,
                  currency: vendor.currency || 'USD',
                  dueDate: dueDate.toLocaleDateString(),
                  daysUntilDue: daysUntilDue.toString(),
                },
                priority: daysUntilDue <= 3 ? 'high' : 'normal',
              });
            }
          }
        }
      }
    }
  }

  /**
   * Generate calendar events from all payment sources
   */
  private async generateCalendarEvents(
    weddingId: string,
  ): Promise<PaymentCalendarEvent[]> {
    const events: PaymentCalendarEvent[] = [];

    // Get vendor payments
    const { data: vendorPayments } = await this.supabase
      .from('vendor_payment_sync')
      .select('*')
      .eq('wedding_id', weddingId);

    // Generate events from vendor payments
    for (const vendor of vendorPayments || []) {
      for (const payment of vendor.payment_schedule || []) {
        const event: PaymentCalendarEvent = {
          id: `vendor-${vendor.vendor_id}-${payment.id}`,
          weddingId,
          vendorId: vendor.vendor_id,
          type: 'payment_due',
          title: `${vendor.name || 'Vendor'} Payment`,
          description: payment.description || 'Vendor payment due',
          amount: payment.amount,
          currency: vendor.currency || 'USD',
          dueDate: new Date(payment.dueDate),
          category: vendor.category || 'miscellaneous',
          priority: payment.amount > 1000 ? 'high' : 'medium',
          status:
            payment.status === 'paid'
              ? 'completed'
              : new Date(payment.dueDate) < new Date()
                ? 'overdue'
                : 'upcoming',
          reminderSchedule: this.generateReminderSchedule(
            new Date(payment.dueDate),
          ),
          metadata: {
            vendorId: vendor.vendor_id,
            paymentId: payment.id,
            contractReference: vendor.contract_reference,
          },
        };
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Generate reminder schedule for a payment
   */
  private generateReminderSchedule(dueDate: Date): ReminderSchedule[] {
    const now = new Date();
    const reminderDays = [30, 14, 7, 3, 1];

    return reminderDays
      .map((days) => ({
        days,
        sent: false,
        scheduledAt: new Date(dueDate.getTime() - days * 24 * 60 * 60 * 1000),
        channels:
          days <= 3
            ? (['email', 'sms', 'push'] as Array<
                'email' | 'sms' | 'push' | 'in_app'
              >)
            : (['email'] as Array<'email' | 'sms' | 'push' | 'in_app'>),
      }))
      .filter((reminder) => reminder.scheduledAt > now);
  }

  /**
   * Save calendar events to database
   */
  private async saveCalendarEvents(
    events: PaymentCalendarEvent[],
  ): Promise<void> {
    if (events.length === 0) return;

    const { error } = await this.supabase
      .from('payment_calendar_events')
      .upsert(
        events.map((event) => ({
          id: event.id,
          wedding_id: event.weddingId,
          vendor_id: event.vendorId,
          type: event.type,
          title: event.title,
          description: event.description,
          amount: event.amount,
          currency: event.currency,
          due_date: event.dueDate.toISOString(),
          category: event.category,
          priority: event.priority,
          status: event.status,
          reminder_schedule: event.reminderSchedule,
          metadata: event.metadata,
          updated_at: new Date().toISOString(),
        })),
      )
      .select();

    if (error) {
      throw new Error(`Failed to save calendar events: ${error.message}`);
    }
  }

  /**
   * Get integration health dashboard data
   */
  async getIntegrationHealthDashboard(): Promise<IntegrationHealthDashboard> {
    try {
      // Update health status for all services
      await this.updateAllServiceHealth();

      const services = Array.from(this.healthMetrics.values());
      const overallHealth = this.calculateOverallHealth(services);

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics();

      return {
        overallHealth,
        services,
        recentSyncResults: this.syncHistory.slice(0, 10),
        performanceMetrics,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to get health dashboard:', error);
      throw new IntegrationError(
        'Health dashboard generation failed',
        'HEALTH_DASHBOARD_FAILED',
        ErrorCategory.SYSTEM,
        error as Error,
      );
    }
  }

  /**
   * Initialize health tracking for all services
   */
  private initializeHealthTracking(): void {
    const services = [
      'PaymentCalendarOrchestrator',
      'NotificationService',
      'BudgetIntegration',
      'CashFlowCalculator',
      'VendorPaymentSync',
    ];

    services.forEach((serviceName) => {
      this.healthMetrics.set(serviceName, {
        serviceName,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        uptime: 100,
        lastError: undefined,
      });
    });
  }

  /**
   * Update health metrics for all services
   */
  private async updateAllServiceHealth(): Promise<void> {
    const healthChecks = [
      { name: 'PaymentCalendarOrchestrator', check: () => this.healthCheck() },
      {
        name: 'NotificationService',
        check: () => this.checkNotificationServiceHealth(),
      },
      {
        name: 'BudgetIntegration',
        check: () => this.checkBudgetIntegrationHealth(),
      },
      {
        name: 'CashFlowCalculator',
        check: () => this.checkCashFlowCalculatorHealth(),
      },
      {
        name: 'VendorPaymentSync',
        check: () => this.vendorPaymentSync.healthCheck(),
      },
    ];

    for (const { name, check } of healthChecks) {
      try {
        const startTime = Date.now();
        const healthCheck = await check();
        const responseTime = Date.now() - startTime;

        this.healthMetrics.set(name, {
          serviceName: name,
          status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          responseTime,
          errorRate: healthCheck.status === 'healthy' ? 0 : 100,
          uptime: healthCheck.status === 'healthy' ? 100 : 0,
          lastError: healthCheck.error,
        });
      } catch (error) {
        this.healthMetrics.set(name, {
          serviceName: name,
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: 5000, // Timeout
          errorRate: 100,
          uptime: 0,
          lastError:
            error instanceof Error ? error.message : 'Health check failed',
        });
      }
    }
  }

  private async checkNotificationServiceHealth(): Promise<{
    status: string;
    error?: string;
  }> {
    try {
      // Simple health check - verify service can be initialized
      await this.notificationService.initialize();
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Notification service unavailable',
      };
    }
  }

  private async checkBudgetIntegrationHealth(): Promise<{
    status: string;
    error?: string;
  }> {
    try {
      // Check database connectivity
      const { error } = await this.supabase
        .from('budget_calculations')
        .select('id')
        .limit(1);

      return error
        ? { status: 'unhealthy', error: error.message }
        : { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Budget integration unavailable',
      };
    }
  }

  private async checkCashFlowCalculatorHealth(): Promise<{
    status: string;
    error?: string;
  }> {
    try {
      // Check if cash flow calculator can access database
      const { error } = await this.supabase
        .from('weddings')
        .select('id')
        .limit(1);

      return error
        ? { status: 'unhealthy', error: error.message }
        : { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Cash flow calculator unavailable',
      };
    }
  }

  private calculateOverallHealth(
    services: ServiceHealthStatus[],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = services.filter(
      (s) => s.status === 'unhealthy',
    ).length;
    const degradedCount = services.filter(
      (s) => s.status === 'degraded',
    ).length;

    if (unhealthyCount > 0) {
      return unhealthyCount >= services.length / 2 ? 'unhealthy' : 'degraded';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private calculatePerformanceMetrics() {
    const recentSyncs = this.syncHistory.slice(0, 10);
    const successRate =
      recentSyncs.length > 0
        ? (recentSyncs.filter((s) => s.success).length / recentSyncs.length) *
          100
        : 100;

    const services = Array.from(this.healthMetrics.values());
    const averageResponseTime =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.responseTime, 0) / services.length
        : 0;

    return {
      averageResponseTime,
      successRate,
      notificationDeliveryRate: 95, // Placeholder - would come from notification service
      cashFlowAccuracy: 90, // Placeholder - would come from cash flow analysis
    };
  }

  private updateHealthMetrics(responseTime: number, success: boolean): void {
    const orchestratorHealth = this.healthMetrics.get(
      'PaymentCalendarOrchestrator',
    );
    if (orchestratorHealth) {
      orchestratorHealth.responseTime = responseTime;
      orchestratorHealth.lastCheck = new Date();
      orchestratorHealth.status = success ? 'healthy' : 'degraded';
      orchestratorHealth.errorRate = success ? 0 : 50;
      orchestratorHealth.uptime = success ? 100 : 75;
    }
  }

  /**
   * Get upcoming payment events
   */
  async getUpcomingPayments(
    weddingId: string,
    days: number = 30,
  ): Promise<PaymentCalendarEvent[]> {
    try {
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const { data: events, error } = await this.supabase
        .from('payment_calendar_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', endDate.toISOString())
        .in('status', ['upcoming', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch upcoming payments: ${error.message}`);
      }

      return (events || []).map((event) => ({
        id: event.id,
        weddingId: event.wedding_id,
        vendorId: event.vendor_id,
        type: event.type,
        title: event.title,
        description: event.description,
        amount: event.amount,
        currency: event.currency,
        dueDate: new Date(event.due_date),
        category: event.category,
        priority: event.priority,
        status: event.status,
        reminderSchedule: event.reminder_schedule || [],
        metadata: event.metadata || {},
      }));
    } catch (error) {
      console.error('Failed to get upcoming payments:', error);
      throw error;
    }
  }
}

export const createPaymentCalendarOrchestrator = (
  config: IntegrationConfig,
  credentials: IntegrationCredentials,
) => new PaymentCalendarOrchestratorService(config, credentials);
