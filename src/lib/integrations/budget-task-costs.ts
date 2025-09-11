// Team C Integration: Task Cost Tracking and Allocation
// WS-059 Budget Tracker - Round 3 Final Integration

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type { Database } from '@/types/database';

interface TaskCostUpdate {
  weddingId: string;
  taskId: string;
  taskName: string;
  category: string;
  vendorId?: string;
  vendorName?: string;
  costDetails: {
    estimatedCost: number;
    actualCost?: number;
    depositAmount?: number;
    finalPayment?: number;
    paymentSchedule?: PaymentMilestone[];
  };
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate: Date;
  completionDate?: Date;
  dependencies?: string[];
  timestamp: Date;
}

interface PaymentMilestone {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Date;
}

interface TaskBudgetImpact {
  category: string;
  subcategory: string;
  taskId: string;
  vendorId?: string;
  previousAmount: number;
  newAmount: number;
  variance: number;
  variancePercentage: number;
  paymentStatus: 'pending' | 'partial' | 'complete';
  impactType: 'estimated' | 'confirmed' | 'final';
  breakdown: {
    deposits: number;
    payments: number;
    remaining: number;
  };
}

interface VendorPaymentSummary {
  vendorId: string;
  vendorName: string;
  totalTaskCosts: number;
  paidToDate: number;
  remainingBalance: number;
  upcomingPayments: PaymentMilestone[];
  taskCount: number;
}

export class BudgetTaskCostIntegration extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>;
  private websocketConnections: Map<string, WebSocket> = new Map();

  private readonly TASK_CATEGORIES = {
    venue: { budgetCategory: 'venue', defaultDeposit: 0.25 },
    catering: { budgetCategory: 'catering', defaultDeposit: 0.3 },
    photography: { budgetCategory: 'photography', defaultDeposit: 0.25 },
    videography: { budgetCategory: 'videography', defaultDeposit: 0.25 },
    florals: { budgetCategory: 'florals', defaultDeposit: 0.2 },
    music: { budgetCategory: 'entertainment', defaultDeposit: 0.25 },
    decor: { budgetCategory: 'decor', defaultDeposit: 0.3 },
    transportation: { budgetCategory: 'transportation', defaultDeposit: 0.2 },
    attire: { budgetCategory: 'attire', defaultDeposit: 0.5 },
    beauty: { budgetCategory: 'beauty', defaultDeposit: 0.2 },
    favors: { budgetCategory: 'favors', defaultDeposit: 0.0 },
    stationery: { budgetCategory: 'stationery', defaultDeposit: 0.5 },
    other: { budgetCategory: 'miscellaneous', defaultDeposit: 0.25 },
  };

  private readonly PAYMENT_SCHEDULE_TEMPLATES = {
    standard: [
      {
        percentage: 0.25,
        description: 'Initial deposit',
        daysBeforeEvent: 180,
      },
      { percentage: 0.5, description: 'Second payment', daysBeforeEvent: 60 },
      { percentage: 0.25, description: 'Final payment', daysBeforeEvent: 14 },
    ],
    photography: [
      {
        percentage: 0.25,
        description: 'Booking deposit',
        daysBeforeEvent: 180,
      },
      {
        percentage: 0.25,
        description: 'Engagement session',
        daysBeforeEvent: 90,
      },
      {
        percentage: 0.25,
        description: 'Pre-wedding payment',
        daysBeforeEvent: 30,
      },
      { percentage: 0.25, description: 'Final payment', daysBeforeEvent: 7 },
    ],
    venue: [
      {
        percentage: 0.2,
        description: 'Reservation deposit',
        daysBeforeEvent: 365,
      },
      {
        percentage: 0.3,
        description: 'First installment',
        daysBeforeEvent: 180,
      },
      {
        percentage: 0.3,
        description: 'Second installment',
        daysBeforeEvent: 90,
      },
      { percentage: 0.2, description: 'Final payment', daysBeforeEvent: 30 },
    ],
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.initializeRealtimeSubscription();
  }

  private initializeRealtimeSubscription() {
    // Subscribe to task updates from Team C
    const taskChannel = this.supabase
      .channel('task-cost-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        async (payload) => {
          await this.handleTaskChange(payload);
        },
      )
      .subscribe();

    // Subscribe to vendor payment updates
    const paymentChannel = this.supabase
      .channel('vendor-payment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_payments',
        },
        async (payload) => {
          await this.handlePaymentChange(payload);
        },
      )
      .subscribe();
  }

  async processTaskCostUpdate(
    update: TaskCostUpdate,
  ): Promise<TaskBudgetImpact[]> {
    const impacts: TaskBudgetImpact[] = [];

    try {
      // Get wedding budget details
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('id, wedding_date, budget_total')
        .eq('id', update.weddingId)
        .single();

      if (weddingError) throw weddingError;

      // Calculate task cost impact
      const taskImpact = await this.calculateTaskCostImpact(update, wedding);
      impacts.push(taskImpact);

      // If vendor is assigned, calculate vendor payment impact
      if (update.vendorId) {
        const vendorImpact = await this.calculateVendorPaymentImpact(
          update,
          wedding,
        );
        impacts.push(...vendorImpact);
      }

      // Check for dependent task cost impacts
      if (update.dependencies && update.dependencies.length > 0) {
        const dependencyImpacts = await this.calculateDependencyImpacts(update);
        impacts.push(...dependencyImpacts);
      }

      // Update payment schedules if task is confirmed
      if (update.status === 'completed' && update.costDetails.actualCost) {
        await this.updatePaymentSchedules(update, wedding.wedding_date);
      }

      // Persist all impacts
      await this.persistTaskCostImpacts(update.weddingId, impacts);

      // Update vendor payment summaries
      if (update.vendorId) {
        await this.updateVendorPaymentSummary(
          update.weddingId,
          update.vendorId,
        );
      }

      // Broadcast updates
      await this.broadcastTaskCostUpdate(update.weddingId, impacts);

      // Emit event for other systems
      this.emit('taskCostUpdated', {
        weddingId: update.weddingId,
        source: 'task-cost-integration',
        impacts,
        taskId: update.taskId,
        vendorId: update.vendorId,
        timestamp: new Date(),
      });

      return impacts;
    } catch (error) {
      console.error('Error processing task cost update:', error);
      throw error;
    }
  }

  private async calculateTaskCostImpact(
    update: TaskCostUpdate,
    wedding: any,
  ): Promise<TaskBudgetImpact> {
    // Get previous task cost data
    const { data: previousTask } = await this.supabase
      .from('budget_items')
      .select('amount, metadata')
      .eq('wedding_id', update.weddingId)
      .eq('source_task_id', update.taskId)
      .single();

    const categoryConfig =
      this.TASK_CATEGORIES[
        update.category as keyof typeof this.TASK_CATEGORIES
      ] || this.TASK_CATEGORIES.other;

    // Determine which cost to use
    const currentCost =
      update.costDetails.actualCost || update.costDetails.estimatedCost;
    const previousCost = previousTask?.amount || 0;
    const variance = currentCost - previousCost;
    const variancePercentage =
      previousCost > 0 ? (variance / previousCost) * 100 : 0;

    // Calculate payment breakdown
    const depositPaid = update.costDetails.depositAmount || 0;
    const paymentsMade =
      update.costDetails.paymentSchedule
        ?.filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0) || 0;
    const remaining = currentCost - depositPaid - paymentsMade;

    return {
      category: categoryConfig.budgetCategory,
      subcategory: update.taskName.toLowerCase().replace(/\s+/g, '_'),
      taskId: update.taskId,
      vendorId: update.vendorId,
      previousAmount: previousCost,
      newAmount: currentCost,
      variance,
      variancePercentage,
      paymentStatus:
        remaining === 0 ? 'complete' : depositPaid > 0 ? 'partial' : 'pending',
      impactType: update.costDetails.actualCost
        ? 'final'
        : update.status === 'completed'
          ? 'confirmed'
          : 'estimated',
      breakdown: {
        deposits: depositPaid,
        payments: paymentsMade,
        remaining,
      },
    };
  }

  private async calculateVendorPaymentImpact(
    update: TaskCostUpdate,
    wedding: any,
  ): Promise<TaskBudgetImpact[]> {
    const impacts: TaskBudgetImpact[] = [];

    if (!update.costDetails.paymentSchedule) {
      // Generate default payment schedule if not provided
      const template = this.getPaymentScheduleTemplate(update.category);
      update.costDetails.paymentSchedule = this.generatePaymentSchedule(
        update.costDetails.estimatedCost,
        wedding.wedding_date,
        template,
      );
    }

    // Create budget impact for each payment milestone
    for (const milestone of update.costDetails.paymentSchedule) {
      const { data: previousMilestone } = await this.supabase
        .from('budget_items')
        .select('amount')
        .eq('wedding_id', update.weddingId)
        .eq('payment_milestone_id', milestone.id)
        .single();

      impacts.push({
        category: 'vendor_payments',
        subcategory: `${update.vendorName || 'vendor'}_${milestone.id}`,
        taskId: update.taskId,
        vendorId: update.vendorId,
        previousAmount: previousMilestone?.amount || 0,
        newAmount: milestone.amount,
        variance: milestone.amount - (previousMilestone?.amount || 0),
        variancePercentage: 0,
        paymentStatus:
          milestone.status === 'paid'
            ? 'complete'
            : milestone.dueDate < new Date()
              ? 'pending'
              : 'pending',
        impactType: milestone.status === 'paid' ? 'final' : 'estimated',
        breakdown: {
          deposits: milestone.description.includes('deposit')
            ? milestone.amount
            : 0,
          payments: milestone.status === 'paid' ? milestone.amount : 0,
          remaining: milestone.status !== 'paid' ? milestone.amount : 0,
        },
      });
    }

    return impacts;
  }

  private async calculateDependencyImpacts(
    update: TaskCostUpdate,
  ): Promise<TaskBudgetImpact[]> {
    const impacts: TaskBudgetImpact[] = [];

    for (const dependencyId of update.dependencies || []) {
      const { data: dependentTask } = await this.supabase
        .from('tasks')
        .select('id, name, estimated_cost, actual_cost, category')
        .eq('id', dependencyId)
        .single();

      if (dependentTask) {
        // Check if dependent task costs need adjustment
        const adjustmentFactor = update.status === 'overdue' ? 1.1 : 1.0; // 10% increase for overdue tasks
        const adjustedCost =
          (dependentTask.actual_cost || dependentTask.estimated_cost) *
          adjustmentFactor;

        if (adjustmentFactor > 1) {
          impacts.push({
            category:
              this.TASK_CATEGORIES[
                dependentTask.category as keyof typeof this.TASK_CATEGORIES
              ]?.budgetCategory || 'miscellaneous',
            subcategory: `${dependentTask.name}_adjustment`,
            taskId: dependentTask.id,
            vendorId: undefined,
            previousAmount:
              dependentTask.actual_cost || dependentTask.estimated_cost,
            newAmount: adjustedCost,
            variance:
              adjustedCost -
              (dependentTask.actual_cost || dependentTask.estimated_cost),
            variancePercentage: (adjustmentFactor - 1) * 100,
            paymentStatus: 'pending',
            impactType: 'estimated',
            breakdown: {
              deposits: 0,
              payments: 0,
              remaining: adjustedCost,
            },
          });
        }
      }
    }

    return impacts;
  }

  private getPaymentScheduleTemplate(category: string) {
    if (category === 'photography' || category === 'videography') {
      return this.PAYMENT_SCHEDULE_TEMPLATES.photography;
    } else if (category === 'venue') {
      return this.PAYMENT_SCHEDULE_TEMPLATES.venue;
    }
    return this.PAYMENT_SCHEDULE_TEMPLATES.standard;
  }

  private generatePaymentSchedule(
    totalAmount: number,
    weddingDate: Date,
    template: typeof this.PAYMENT_SCHEDULE_TEMPLATES.standard,
  ): PaymentMilestone[] {
    return template.map((milestone, index) => {
      const dueDate = new Date(weddingDate);
      dueDate.setDate(dueDate.getDate() - milestone.daysBeforeEvent);

      return {
        id: `milestone_${index + 1}`,
        description: milestone.description,
        amount: Math.round(totalAmount * milestone.percentage),
        dueDate,
        status: dueDate < new Date() ? 'overdue' : 'pending',
      };
    });
  }

  private async updatePaymentSchedules(
    update: TaskCostUpdate,
    weddingDate: Date,
  ) {
    if (!update.costDetails.paymentSchedule) return;

    for (const milestone of update.costDetails.paymentSchedule) {
      await this.supabase.from('vendor_payment_schedules').upsert(
        {
          wedding_id: update.weddingId,
          vendor_id: update.vendorId,
          task_id: update.taskId,
          milestone_id: milestone.id,
          description: milestone.description,
          amount: milestone.amount,
          due_date: milestone.dueDate,
          status: milestone.status,
          paid_date: milestone.paidDate,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'wedding_id,vendor_id,milestone_id',
        },
      );
    }
  }

  private async updateVendorPaymentSummary(
    weddingId: string,
    vendorId: string,
  ) {
    // Get all tasks for this vendor
    const { data: vendorTasks } = await this.supabase
      .from('tasks')
      .select('id, estimated_cost, actual_cost')
      .eq('wedding_id', weddingId)
      .eq('vendor_id', vendorId);

    // Get all payments made to this vendor
    const { data: payments } = await this.supabase
      .from('vendor_payments')
      .select('amount, payment_date')
      .eq('wedding_id', weddingId)
      .eq('vendor_id', vendorId)
      .eq('status', 'paid');

    // Get upcoming payment milestones
    const { data: upcomingPayments } = await this.supabase
      .from('vendor_payment_schedules')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('vendor_id', vendorId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    const totalTaskCosts =
      vendorTasks?.reduce(
        (sum, task) => sum + (task.actual_cost || task.estimated_cost || 0),
        0,
      ) || 0;
    const paidToDate =
      payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remainingBalance = totalTaskCosts - paidToDate;

    // Update vendor payment summary
    await this.supabase.from('vendor_payment_summaries').upsert(
      {
        wedding_id: weddingId,
        vendor_id: vendorId,
        total_task_costs: totalTaskCosts,
        paid_to_date: paidToDate,
        remaining_balance: remainingBalance,
        task_count: vendorTasks?.length || 0,
        upcoming_payment_count: upcomingPayments?.length || 0,
        next_payment_due: upcomingPayments?.[0]?.due_date || null,
        next_payment_amount: upcomingPayments?.[0]?.amount || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'wedding_id,vendor_id',
      },
    );
  }

  private async persistTaskCostImpacts(
    weddingId: string,
    impacts: TaskBudgetImpact[],
  ) {
    const timestamp = new Date().toISOString();

    for (const impact of impacts) {
      // Upsert budget items
      const { error } = await this.supabase.from('budget_items').upsert(
        {
          wedding_id: weddingId,
          category: impact.category,
          subcategory: impact.subcategory,
          amount: impact.newAmount,
          source_task_id: impact.taskId,
          vendor_id: impact.vendorId,
          payment_status: impact.paymentStatus,
          impact_type: impact.impactType,
          variance: impact.variance,
          variance_percentage: impact.variancePercentage,
          payment_breakdown: impact.breakdown,
          last_updated: timestamp,
          update_source: 'task_cost_integration',
        },
        {
          onConflict: 'wedding_id,category,subcategory',
        },
      );

      if (error) {
        console.error('Error persisting task cost impact:', error);
        throw error;
      }

      // Log in audit trail
      await this.supabase.from('budget_audit_log').insert({
        wedding_id: weddingId,
        category: impact.category,
        subcategory: impact.subcategory,
        previous_amount: impact.previousAmount,
        new_amount: impact.newAmount,
        change_reason: `Task ${impact.taskId} cost update`,
        source_system: 'team_c_task_management',
        metadata: {
          taskId: impact.taskId,
          vendorId: impact.vendorId,
          variance: impact.variance,
          paymentStatus: impact.paymentStatus,
        },
        timestamp,
      });
    }

    // Recalculate category totals
    await this.recalculateCategoryTotals(weddingId);
  }

  private async recalculateCategoryTotals(weddingId: string) {
    // Get all unique categories
    const { data: categories } = await this.supabase
      .from('budget_items')
      .select('category')
      .eq('wedding_id', weddingId)
      .distinct();

    if (categories) {
      for (const { category } of categories) {
        const { data: categoryItems } = await this.supabase
          .from('budget_items')
          .select('amount')
          .eq('wedding_id', weddingId)
          .eq('category', category);

        const categoryTotal =
          categoryItems?.reduce((sum, item) => sum + item.amount, 0) || 0;

        await this.supabase.from('wedding_budget_summary').upsert(
          {
            wedding_id: weddingId,
            category,
            total_amount: categoryTotal,
            last_updated: new Date().toISOString(),
          },
          {
            onConflict: 'wedding_id,category',
          },
        );
      }
    }
  }

  private async broadcastTaskCostUpdate(
    weddingId: string,
    impacts: TaskBudgetImpact[],
  ) {
    const totalImpact = impacts.reduce((sum, i) => sum + i.variance, 0);
    const vendorSummaries = new Map<string, VendorPaymentSummary>();

    // Group impacts by vendor
    for (const impact of impacts) {
      if (impact.vendorId) {
        if (!vendorSummaries.has(impact.vendorId)) {
          const { data: vendor } = await this.supabase
            .from('vendors')
            .select('name')
            .eq('id', impact.vendorId)
            .single();

          vendorSummaries.set(impact.vendorId, {
            vendorId: impact.vendorId,
            vendorName: vendor?.name || 'Unknown Vendor',
            totalTaskCosts: 0,
            paidToDate: 0,
            remainingBalance: 0,
            upcomingPayments: [],
            taskCount: 0,
          });
        }

        const summary = vendorSummaries.get(impact.vendorId)!;
        summary.totalTaskCosts += impact.newAmount;
        summary.paidToDate +=
          impact.breakdown.deposits + impact.breakdown.payments;
        summary.remainingBalance += impact.breakdown.remaining;
        summary.taskCount++;
      }
    }

    const message = {
      type: 'TASK_COST_UPDATE',
      source: 'TASK_COST_INTEGRATION',
      weddingId,
      impacts,
      summary: {
        totalImpact,
        impactedTasks: impacts.length,
        vendorSummaries: Array.from(vendorSummaries.values()),
        paymentStatus: {
          pending: impacts.filter((i) => i.paymentStatus === 'pending').length,
          partial: impacts.filter((i) => i.paymentStatus === 'partial').length,
          complete: impacts.filter((i) => i.paymentStatus === 'complete')
            .length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected clients
    const connections = Array.from(this.websocketConnections.entries())
      .filter(([clientId]) => clientId.includes(weddingId))
      .map(([, ws]) => ws);

    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  private async handleTaskChange(payload: any) {
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      const task = payload.new;

      if (task && (task.estimated_cost || task.actual_cost)) {
        const update: TaskCostUpdate = {
          weddingId: task.wedding_id,
          taskId: task.id,
          taskName: task.name,
          category: task.category || 'other',
          vendorId: task.vendor_id,
          vendorName: task.vendor_name,
          costDetails: {
            estimatedCost: task.estimated_cost || 0,
            actualCost: task.actual_cost,
            depositAmount: task.deposit_amount,
            finalPayment: task.final_payment,
          },
          status: task.status,
          dueDate: new Date(task.due_date),
          completionDate: task.completion_date
            ? new Date(task.completion_date)
            : undefined,
          dependencies: task.dependencies,
          timestamp: new Date(),
        };

        await this.processTaskCostUpdate(update);
      }
    }
  }

  private async handlePaymentChange(payload: any) {
    const payment = payload.new;

    if (payment) {
      // Find associated task
      const { data: task } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', payment.task_id)
        .single();

      if (task) {
        // Trigger task cost recalculation
        await this.handleTaskChange({
          eventType: 'UPDATE',
          new: task,
        });
      }
    }
  }

  // Public API methods
  async getVendorPaymentSummary(
    weddingId: string,
    vendorId: string,
  ): Promise<VendorPaymentSummary | null> {
    const { data } = await this.supabase
      .from('vendor_payment_summaries')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('vendor_id', vendorId)
      .single();

    return data;
  }

  async getUpcomingPayments(
    weddingId: string,
    days: number = 30,
  ): Promise<PaymentMilestone[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data } = await this.supabase
      .from('vendor_payment_schedules')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('status', 'pending')
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true });

    return data || [];
  }

  registerWebSocketConnection(clientId: string, ws: WebSocket) {
    this.websocketConnections.set(clientId, ws);
  }

  unregisterWebSocketConnection(clientId: string) {
    this.websocketConnections.delete(clientId);
  }
}

// Export singleton instance
let instance: BudgetTaskCostIntegration | null = null;

export function getBudgetTaskCostIntegration() {
  if (!instance) {
    instance = new BudgetTaskCostIntegration(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return instance;
}
