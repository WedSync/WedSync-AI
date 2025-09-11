/**
 * Review Scheduler - Automation Engine
 * WS-047: Review Collection System
 *
 * Cron job management for review requests, sentiment-based timing optimization,
 * retry logic for failed sends, and performance monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from '@/middleware/encryption';
import ReviewEmailService from './email-service';
import PlatformManager from './platform-manager';

export interface ScheduleRule {
  id: string;
  supplier_id: string;
  name: string;
  trigger_event:
    | 'wedding_completed'
    | 'photos_delivered'
    | 'manual'
    | 'follow_up';
  delay_days: number;
  conditions: {
    min_rating_threshold?: number;
    exclude_if_complained?: boolean;
    exclude_if_refunded?: boolean;
    only_if_photos_delivered?: boolean;
    only_if_payment_complete?: boolean;
  };
  template_type: 'review_request' | 'follow_up' | 'reminder';
  max_attempts: number;
  retry_delay_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTask {
  id: string;
  supplier_id: string;
  couple_id: string;
  wedding_id: string;
  schedule_rule_id: string;
  trigger_event: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempt_count: number;
  last_attempt_at?: string;
  completed_at?: string;
  error_message?: string;
  context_data: {
    wedding_date: string;
    couple_names: string;
    supplier_name: string;
    trigger_data: any;
  };
  created_at: string;
  updated_at: string;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1, where 1 is very positive
  magnitude: number; // 0 to 1, intensity of sentiment
  confidence: number; // 0 to 1, confidence in analysis
  keywords: string[];
  recommendation: 'send' | 'delay' | 'skip';
  reason: string;
}

export interface SchedulerMetrics {
  total_scheduled: number;
  pending: number;
  completed: number;
  failed: number;
  success_rate: number;
  average_response_time_hours: number;
  optimal_send_times: {
    hour: number;
    day_of_week: number;
    success_rate: number;
    response_rate: number;
  }[];
}

export class ReviewScheduler {
  private encryption: EncryptionService;
  private supabase;
  private emailService: ReviewEmailService;
  private platformManager: PlatformManager;
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.encryption = new EncryptionService();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.emailService = new ReviewEmailService();
    // Platform manager would be initialized with actual config
    this.platformManager = new PlatformManager({});
  }

  /**
   * Start the scheduler process
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Review scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting review scheduler...');

    // Process tasks every minute
    this.processingInterval = setInterval(() => {
      this.processScheduledTasks();
    }, 60000);

    // Initial processing
    this.processScheduledTasks();
  }

  /**
   * Stop the scheduler process
   */
  stop(): void {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('Review scheduler stopped');
  }

  /**
   * Create a new schedule rule
   */
  async createScheduleRule(
    rule: Omit<ScheduleRule, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('review_schedule_rules')
      .insert({
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create schedule rule: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Schedule review request based on wedding completion
   */
  async scheduleForWedding(
    supplierId: string,
    coupleId: string,
    weddingId: string,
    weddingDate: Date,
    triggerEvent: 'wedding_completed' = 'wedding_completed',
  ): Promise<string[]> {
    // Get active schedule rules for supplier
    const { data: rules } = await this.supabase
      .from('review_schedule_rules')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true)
      .order('delay_days', { ascending: true });

    if (!rules || rules.length === 0) {
      console.log(`No active schedule rules found for supplier ${supplierId}`);
      return [];
    }

    const scheduledTaskIds: string[] = [];
    const contextData = await this.buildContextData(
      coupleId,
      weddingId,
      supplierId,
    );

    for (const rule of rules) {
      // Check if conditions are met
      const conditionsMet = await this.checkScheduleConditions(
        rule.conditions,
        coupleId,
        weddingId,
        supplierId,
      );

      if (!conditionsMet) {
        console.log(`Schedule conditions not met for rule ${rule.id}`);
        continue;
      }

      // Calculate schedule time
      const scheduledFor = new Date(weddingDate);
      scheduledFor.setDate(scheduledFor.getDate() + rule.delay_days);

      // Optimize timing based on historical data
      const optimizedTime = await this.optimizeScheduleTime(
        supplierId,
        scheduledFor,
        contextData,
      );

      const task: Omit<ScheduledTask, 'id' | 'created_at' | 'updated_at'> = {
        supplier_id: supplierId,
        couple_id: coupleId,
        wedding_id: weddingId,
        schedule_rule_id: rule.id,
        trigger_event: triggerEvent,
        scheduled_for: optimizedTime.toISOString(),
        status: 'pending',
        attempt_count: 0,
        context_data: contextData,
      };

      const { data, error } = await this.supabase
        .from('review_scheduled_tasks')
        .insert({
          ...task,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Failed to schedule task for rule ${rule.id}:`, error);
        continue;
      }

      scheduledTaskIds.push(data.id);
      console.log(
        `Scheduled review request task ${data.id} for ${optimizedTime.toISOString()}`,
      );
    }

    return scheduledTaskIds;
  }

  /**
   * Process all pending scheduled tasks
   */
  async processScheduledTasks(): Promise<number> {
    if (!this.isRunning) return 0;

    try {
      // Get pending tasks that are due
      const { data: tasks } = await this.supabase
        .from('review_scheduled_tasks')
        .select(
          `
          *,
          review_schedule_rules (*)
        `,
        )
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50); // Process in batches

      if (!tasks || tasks.length === 0) {
        return 0;
      }

      console.log(`Processing ${tasks.length} scheduled review tasks`);

      let processedCount = 0;
      for (const task of tasks) {
        try {
          await this.processScheduledTask(task);
          processedCount++;
        } catch (error) {
          console.error(`Failed to process task ${task.id}:`, error);

          // Update task with error
          await this.updateTaskStatus(
            task.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
      return 0;
    }
  }

  /**
   * Process individual scheduled task
   */
  private async processScheduledTask(
    task: ScheduledTask & { review_schedule_rules: ScheduleRule },
  ): Promise<void> {
    console.log(
      `Processing scheduled task ${task.id} for supplier ${task.supplier_id}`,
    );

    // Update task status to processing
    await this.updateTaskStatus(task.id, 'processing');

    try {
      // Perform sentiment analysis to optimize timing
      const sentiment = await this.analyzeCoupleContext(
        task.couple_id,
        task.wedding_id,
        task.supplier_id,
      );

      if (sentiment.recommendation === 'skip') {
        console.log(`Skipping task ${task.id}: ${sentiment.reason}`);
        await this.updateTaskStatus(task.id, 'cancelled', sentiment.reason);
        return;
      }

      if (sentiment.recommendation === 'delay') {
        // Reschedule for later
        const delayedDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Delay 1 day
        await this.rescheduleTask(task.id, delayedDate, sentiment.reason);
        return;
      }

      // Send review request email
      const emailRequestId = await this.emailService.scheduleReviewRequest(
        task.supplier_id,
        task.couple_id,
        task.wedding_id,
        new Date(),
        task.review_schedule_rules.template_type,
      );

      // Update task as completed
      await this.updateTaskStatus(
        task.id,
        'completed',
        undefined,
        emailRequestId,
      );

      console.log(
        `Successfully processed task ${task.id}, email request ${emailRequestId}`,
      );
    } catch (error) {
      console.error(`Task ${task.id} processing failed:`, error);

      // Check if we should retry
      const rule = task.review_schedule_rules;
      if (task.attempt_count < rule.max_attempts) {
        // Schedule retry
        const retryDate = new Date(
          Date.now() + rule.retry_delay_days * 24 * 60 * 60 * 1000,
        );
        await this.rescheduleTask(
          task.id,
          retryDate,
          `Retry after error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } else {
        // Max attempts reached, mark as failed
        await this.updateTaskStatus(
          task.id,
          'failed',
          `Max attempts reached: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Analyze couple context for sentiment-based timing optimization
   */
  private async analyzeCoupleContext(
    coupleId: string,
    weddingId: string,
    supplierId: string,
  ): Promise<SentimentAnalysis> {
    try {
      // Get couple communication history, recent interactions, etc.
      const [communicationData, feedbackData, paymentData] = await Promise.all([
        this.getCommunicationSentiment(coupleId, supplierId),
        this.getRecentFeedback(coupleId, supplierId),
        this.getPaymentStatus(weddingId),
      ]);

      let score = 0.5; // Neutral baseline
      let confidence = 0.5;
      const keywords: string[] = [];
      let reason = 'Standard timing';

      // Analyze communication sentiment
      if (communicationData) {
        score = (score + communicationData.sentiment) / 2;
        keywords.push(...communicationData.keywords);
        confidence = Math.max(confidence, communicationData.confidence);
      }

      // Check for negative indicators
      if (feedbackData?.hasComplaints) {
        score -= 0.3;
        reason = 'Recent complaints detected - may delay request';
      }

      if (paymentData?.hasDisputes) {
        score -= 0.4;
        reason = 'Payment disputes detected - skip request';
      }

      // Determine recommendation
      let recommendation: 'send' | 'delay' | 'skip' = 'send';

      if (score < -0.3) {
        recommendation = 'skip';
        reason = 'Negative sentiment detected - skipping review request';
      } else if (score < 0.2) {
        recommendation = 'delay';
        reason = 'Neutral/slightly negative sentiment - delaying request';
      }

      return {
        score,
        magnitude: Math.abs(score),
        confidence,
        keywords,
        recommendation,
        reason,
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      // Return neutral recommendation on error
      return {
        score: 0.5,
        magnitude: 0.5,
        confidence: 0.3,
        keywords: [],
        recommendation: 'send',
        reason: 'Default - sentiment analysis unavailable',
      };
    }
  }

  /**
   * Optimize schedule time based on historical success data
   */
  private async optimizeScheduleTime(
    supplierId: string,
    baseTime: Date,
    contextData: any,
  ): Promise<Date> {
    try {
      // Get historical success rates by time of day and day of week
      const { data: metrics } = await this.supabase.rpc(
        'get_optimal_send_times',
        {
          supplier_id_param: supplierId,
          lookback_days: 90,
        },
      );

      if (!metrics || metrics.length === 0) {
        // No historical data, use default optimal time (Tuesday 10 AM)
        const optimizedTime = new Date(baseTime);
        optimizedTime.setHours(10, 0, 0, 0);

        // If it's weekend, move to Tuesday
        const dayOfWeek = optimizedTime.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Sunday or Saturday
          const daysToAdd = dayOfWeek === 0 ? 2 : 3; // Sunday -> Tuesday, Saturday -> Tuesday
          optimizedTime.setDate(optimizedTime.getDate() + daysToAdd);
        }

        return optimizedTime;
      }

      // Find best time based on success rates
      const bestTime = metrics.reduce((best: any, current: any) =>
        current.success_rate > best.success_rate ? current : best,
      );

      const optimizedTime = new Date(baseTime);
      optimizedTime.setHours(bestTime.hour, 0, 0, 0);

      // Adjust day of week if needed
      const currentDayOfWeek = optimizedTime.getDay();
      const targetDayOfWeek = bestTime.day_of_week;

      if (currentDayOfWeek !== targetDayOfWeek) {
        let daysToAdd = targetDayOfWeek - currentDayOfWeek;
        if (daysToAdd < 0) daysToAdd += 7; // Next week
        optimizedTime.setDate(optimizedTime.getDate() + daysToAdd);
      }

      return optimizedTime;
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      return baseTime; // Return original time on error
    }
  }

  /**
   * Helper methods for data retrieval and analysis
   */
  private async buildContextData(
    coupleId: string,
    weddingId: string,
    supplierId: string,
  ): Promise<any> {
    const [coupleData, weddingData, supplierData] = await Promise.all([
      this.supabase
        .from('couples')
        .select('partner1_name, partner2_name, email')
        .eq('id', coupleId)
        .single(),
      this.supabase
        .from('weddings')
        .select('wedding_date, status')
        .eq('id', weddingId)
        .single(),
      this.supabase
        .from('suppliers')
        .select('business_name')
        .eq('id', supplierId)
        .single(),
    ]);

    return {
      wedding_date: weddingData.data?.wedding_date,
      couple_names: `${coupleData.data?.partner1_name} & ${coupleData.data?.partner2_name}`,
      supplier_name: supplierData.data?.business_name,
      trigger_data: {
        wedding_status: weddingData.data?.status,
      },
    };
  }

  private async checkScheduleConditions(
    conditions: ScheduleRule['conditions'],
    coupleId: string,
    weddingId: string,
    supplierId: string,
  ): Promise<boolean> {
    // Implementation for checking various conditions
    // This would check things like payment status, photo delivery, etc.
    return true; // Simplified for now
  }

  private async getCommunicationSentiment(
    coupleId: string,
    supplierId: string,
  ): Promise<any> {
    // Implementation for analyzing communication sentiment
    return null; // Simplified for now
  }

  private async getRecentFeedback(
    coupleId: string,
    supplierId: string,
  ): Promise<any> {
    // Implementation for checking recent feedback/complaints
    return null; // Simplified for now
  }

  private async getPaymentStatus(weddingId: string): Promise<any> {
    // Implementation for checking payment status and disputes
    return null; // Simplified for now
  }

  private async updateTaskStatus(
    taskId: string,
    status: ScheduledTask['status'],
    errorMessage?: string,
    emailRequestId?: string,
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processing') {
      updates.last_attempt_at = new Date().toISOString();
      updates.attempt_count = this.supabase.rpc('increment', { x: 1 });
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      if (emailRequestId) {
        updates.email_request_id = emailRequestId;
      }
    }

    if (status === 'failed' && errorMessage) {
      updates.error_message = errorMessage;
    }

    await this.supabase
      .from('review_scheduled_tasks')
      .update(updates)
      .eq('id', taskId);
  }

  private async rescheduleTask(
    taskId: string,
    newDate: Date,
    reason: string,
  ): Promise<void> {
    await this.supabase
      .from('review_scheduled_tasks')
      .update({
        scheduled_for: newDate.toISOString(),
        status: 'pending',
        error_message: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    console.log(
      `Rescheduled task ${taskId} for ${newDate.toISOString()}: ${reason}`,
    );
  }

  /**
   * Get scheduler metrics and performance data
   */
  async getMetrics(
    supplierId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<SchedulerMetrics> {
    let query = this.supabase
      .from('review_scheduled_tasks')
      .select('status, created_at, completed_at');

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString());
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString());
    }

    const { data: tasks } = await query;

    if (!tasks || tasks.length === 0) {
      return {
        total_scheduled: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        success_rate: 0,
        average_response_time_hours: 0,
        optimal_send_times: [],
      };
    }

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;

    // Calculate average response time for completed tasks
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' && t.completed_at,
    );
    const averageResponseTime =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, task) => {
            const created = new Date(task.created_at).getTime();
            const completed = new Date(task.completed_at!).getTime();
            return sum + (completed - created);
          }, 0) /
          completedTasks.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    return {
      total_scheduled: tasks.length,
      pending,
      completed,
      failed,
      success_rate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
      average_response_time_hours: averageResponseTime,
      optimal_send_times: [], // Would be populated from separate analysis
    };
  }
}

export default ReviewScheduler;
