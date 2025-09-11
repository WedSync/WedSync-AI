/**
 * Journey Recovery Manager for Wedding Platform
 * Handles failures and compensation in wedding automation workflows
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

interface JourneyStep {
  id: string;
  type:
    | 'email'
    | 'sms'
    | 'webhook'
    | 'payment'
    | 'vendor_booking'
    | 'reminder'
    | 'custom';
  name: string;
  config: Record<string, any>;
  timeout?: number;
  retries?: number;
  critical?: boolean;
  compensationStep?: CompensationStep;
}

interface CompensationStep {
  type:
    | 'notification'
    | 'rollback'
    | 'manual_intervention'
    | 'alternative_action';
  config: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ExecutionContext {
  journeyId: string;
  instanceId: string;
  clientId: string;
  weddingDate: string;
  data: Record<string, any>;
  metadata: {
    startTime: number;
    executedSteps: string[];
    failedSteps: string[];
    compensationExecuted: string[];
  };
}

interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  retryCount: number;
}

interface RecoveryStrategy {
  maxRetries: number;
  retryDelay: number; // Base delay in milliseconds
  backoffMultiplier: number;
  compensationDelay: number;
  escalationThreshold: number; // Number of failures before escalation
}

export class JourneyRecoveryManager {
  private supabase: SupabaseClient;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.initializeRecoveryStrategies();
  }

  private initializeRecoveryStrategies() {
    // Email/SMS communication steps
    this.recoveryStrategies.set('email', {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      backoffMultiplier: 2,
      compensationDelay: 300000, // 5 minutes
      escalationThreshold: 2,
    });

    this.recoveryStrategies.set('sms', {
      maxRetries: 3,
      retryDelay: 10000, // 10 seconds
      backoffMultiplier: 1.5,
      compensationDelay: 300000,
      escalationThreshold: 2,
    });

    // Payment processing (critical for wedding bookings)
    this.recoveryStrategies.set('payment', {
      maxRetries: 2,
      retryDelay: 30000, // 30 seconds
      backoffMultiplier: 1,
      compensationDelay: 0, // Immediate compensation
      escalationThreshold: 1,
    });

    // Vendor booking confirmations
    this.recoveryStrategies.set('vendor_booking', {
      maxRetries: 5,
      retryDelay: 60000, // 1 minute
      backoffMultiplier: 1.2,
      compensationDelay: 600000, // 10 minutes
      escalationThreshold: 3,
    });

    // Webhook integrations
    this.recoveryStrategies.set('webhook', {
      maxRetries: 4,
      retryDelay: 15000, // 15 seconds
      backoffMultiplier: 2,
      compensationDelay: 180000, // 3 minutes
      escalationThreshold: 2,
    });

    // Default strategy
    this.recoveryStrategies.set('default', {
      maxRetries: 3,
      retryDelay: 10000,
      backoffMultiplier: 1.5,
      compensationDelay: 300000,
      escalationThreshold: 2,
    });
  }

  async executeStepWithRecovery(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<StepResult> {
    const strategy =
      this.recoveryStrategies.get(step.type) ||
      this.recoveryStrategies.get('default')!;

    const startTime = Date.now();
    let lastError: string = '';
    let retryCount = 0;

    // Log step execution start
    await this.logStepExecution(step, context, 'started', { retryCount: 0 });

    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      try {
        const result = await this.executeStepWithTimeout(
          step,
          context,
          step.timeout || 30000,
        );

        if (result.success) {
          const executionTime = Date.now() - startTime;

          // Log successful execution
          await this.logStepExecution(step, context, 'completed', {
            retryCount: attempt - 1,
            executionTime,
            result: result.data,
          });

          return {
            success: true,
            data: result.data,
            executionTime,
            retryCount: attempt - 1,
          };
        }

        lastError = result.error || 'Unknown error';
        retryCount = attempt - 1;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Execution failed';
        retryCount = attempt - 1;

        // Log retry attempt
        await this.logStepExecution(step, context, 'retry', {
          attempt,
          error: lastError,
          nextRetryIn: this.calculateRetryDelay(strategy, attempt),
        });
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < strategy.maxRetries) {
        const delay = this.calculateRetryDelay(strategy, attempt);
        await this.delay(delay);
      }
    }

    // All retries failed - execute compensation
    const executionTime = Date.now() - startTime;

    await this.logStepExecution(step, context, 'failed', {
      retryCount,
      executionTime,
      finalError: lastError,
    });

    // Execute compensation if step is critical or has compensation configured
    if (step.critical || step.compensationStep) {
      await this.executeCompensation(step, context, lastError);
    }

    // Check if we need to escalate
    if (retryCount >= strategy.escalationThreshold) {
      await this.escalateFailure(step, context, lastError);
    }

    return {
      success: false,
      error: lastError,
      executionTime,
      retryCount,
    };
  }

  private async executeStepWithTimeout(
    step: JourneyStep,
    context: ExecutionContext,
    timeoutMs: number,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await this.executeStep(step, context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async executeStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    switch (step.type) {
      case 'email':
        return await this.executeEmailStep(step, context);

      case 'sms':
        return await this.executeSmsStep(step, context);

      case 'webhook':
        return await this.executeWebhookStep(step, context);

      case 'payment':
        return await this.executePaymentStep(step, context);

      case 'vendor_booking':
        return await this.executeVendorBookingStep(step, context);

      case 'reminder':
        return await this.executeReminderStep(step, context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeEmailStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Mock email sending - replace with actual email service
      const emailConfig = step.config;

      // Simulate potential failures in wedding season
      if (Math.random() < 0.1) {
        // 10% failure rate
        throw new Error('Email service temporarily unavailable');
      }

      const result = {
        messageId: `email_${Date.now()}`,
        recipient: emailConfig.to,
        subject: emailConfig.subject,
        sentAt: new Date().toISOString(),
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed',
      };
    }
  }

  private async executeSmsStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Mock SMS sending - replace with actual SMS service (Twilio, etc.)
      const smsConfig = step.config;

      // Simulate potential failures
      if (Math.random() < 0.05) {
        // 5% failure rate
        throw new Error('SMS service rate limited');
      }

      const result = {
        messageId: `sms_${Date.now()}`,
        recipient: smsConfig.to,
        message: smsConfig.message,
        sentAt: new Date().toISOString(),
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed',
      };
    }
  }

  private async executeWebhookStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const webhookConfig = step.config;

      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers,
        },
        body: JSON.stringify({
          ...webhookConfig.payload,
          context: {
            journeyId: context.journeyId,
            clientId: context.clientId,
            weddingDate: context.weddingDate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Webhook execution failed',
      };
    }
  }

  private async executePaymentStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Mock payment processing - replace with actual payment service
      const paymentConfig = step.config;

      // Simulate payment failures (critical to handle properly)
      if (Math.random() < 0.02) {
        // 2% failure rate
        throw new Error('Payment gateway timeout');
      }

      const result = {
        transactionId: `txn_${Date.now()}`,
        amount: paymentConfig.amount,
        status: 'completed',
        processedAt: new Date().toISOString(),
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  private async executeVendorBookingStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Mock vendor booking confirmation
      const bookingConfig = step.config;

      // Check vendor availability
      const { data: vendor, error } = await this.supabase
        .from('vendors')
        .select('availability, booking_status')
        .eq('id', bookingConfig.vendorId)
        .single();

      if (error) {
        throw new Error(`Vendor lookup failed: ${error.message}`);
      }

      if (vendor.booking_status === 'fully_booked') {
        throw new Error('Vendor is fully booked for the requested date');
      }

      const result = {
        bookingId: `booking_${Date.now()}`,
        vendorId: bookingConfig.vendorId,
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vendor booking failed',
      };
    }
  }

  private async executeReminderStep(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Schedule reminder in database
      const reminderConfig = step.config;

      const { data, error } = await this.supabase
        .from('reminders')
        .insert({
          client_id: context.clientId,
          journey_id: context.journeyId,
          reminder_type: reminderConfig.type,
          reminder_date: reminderConfig.scheduledFor,
          message: reminderConfig.message,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to schedule reminder: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Reminder scheduling failed',
      };
    }
  }

  private async executeCompensation(
    step: JourneyStep,
    context: ExecutionContext,
    originalError: string,
  ): Promise<void> {
    if (!step.compensationStep) return;

    const compensation = step.compensationStep;

    try {
      switch (compensation.type) {
        case 'notification':
          await this.sendCompensationNotification(
            step,
            context,
            originalError,
            compensation,
          );
          break;

        case 'rollback':
          await this.executeRollback(step, context, compensation);
          break;

        case 'manual_intervention':
          await this.requestManualIntervention(
            step,
            context,
            originalError,
            compensation,
          );
          break;

        case 'alternative_action':
          await this.executeAlternativeAction(step, context, compensation);
          break;
      }

      // Log compensation execution
      await this.logStepExecution(step, context, 'compensation_executed', {
        compensationType: compensation.type,
        originalError,
      });
    } catch (compensationError) {
      // Log compensation failure but don't throw - we don't want to cascade failures
      await this.logStepExecution(step, context, 'compensation_failed', {
        compensationType: compensation.type,
        compensationError:
          compensationError instanceof Error
            ? compensationError.message
            : 'Unknown compensation error',
        originalError,
      });
    }
  }

  private async sendCompensationNotification(
    step: JourneyStep,
    context: ExecutionContext,
    error: string,
    compensation: CompensationStep,
  ): Promise<void> {
    // Send notification to wedding planner about the failure
    const notification = {
      type: 'journey_step_failed',
      priority: compensation.priority,
      title: `Journey Step Failed: ${step.name}`,
      message: `Step "${step.name}" in journey ${context.journeyId} failed: ${error}`,
      clientId: context.clientId,
      weddingDate: context.weddingDate,
      actionRequired: compensation.priority === 'critical',
      createdAt: new Date().toISOString(),
    };

    // Store notification in database
    await this.supabase.from('notifications').insert(notification);

    // If critical, send immediate email/SMS to wedding planner
    if (compensation.priority === 'critical') {
      // Send urgent notification via email/SMS
      // Implementation depends on your notification service
    }
  }

  private async executeRollback(
    step: JourneyStep,
    context: ExecutionContext,
    compensation: CompensationStep,
  ): Promise<void> {
    // Implement rollback logic based on step type
    switch (step.type) {
      case 'payment':
        // Initiate payment refund/cancellation
        await this.rollbackPayment(step, context);
        break;

      case 'vendor_booking':
        // Cancel vendor booking
        await this.rollbackVendorBooking(step, context);
        break;

      case 'email':
      case 'sms':
        // Send cancellation/correction message
        await this.sendCorrectionMessage(step, context);
        break;
    }
  }

  private async requestManualIntervention(
    step: JourneyStep,
    context: ExecutionContext,
    error: string,
    compensation: CompensationStep,
  ): Promise<void> {
    // Create manual intervention task
    const task = {
      type: 'manual_intervention_required',
      priority: compensation.priority,
      title: `Manual Action Required: ${step.name}`,
      description: `Journey step "${step.name}" failed and requires manual intervention. Error: ${error}`,
      journeyId: context.journeyId,
      stepId: step.id,
      clientId: context.clientId,
      weddingDate: context.weddingDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    await this.supabase.from('manual_tasks').insert(task);
  }

  private async executeAlternativeAction(
    step: JourneyStep,
    context: ExecutionContext,
    compensation: CompensationStep,
  ): Promise<void> {
    // Execute alternative step configuration
    const alternativeStep: JourneyStep = {
      id: `${step.id}_alternative`,
      type: compensation.config.alternativeType,
      name: `${step.name} (Alternative)`,
      config: compensation.config.alternativeConfig,
    };

    // Execute alternative with reduced retry attempts
    const result = await this.executeStepWithRecovery(alternativeStep, context);

    if (!result.success) {
      // If alternative also fails, escalate
      await this.escalateFailure(
        step,
        context,
        `Primary and alternative actions failed: ${result.error}`,
      );
    }
  }

  private async escalateFailure(
    step: JourneyStep,
    context: ExecutionContext,
    error: string,
  ): Promise<void> {
    // Create escalation record
    const escalation = {
      journeyId: context.journeyId,
      stepId: step.id,
      clientId: context.clientId,
      weddingDate: context.weddingDate,
      failureReason: error,
      escalatedAt: new Date().toISOString(),
      status: 'pending_review',
      priority: step.critical ? 'critical' : 'high',
    };

    await this.supabase.from('escalations').insert(escalation);

    // Send immediate notification to management
    // Implementation depends on your escalation process
  }

  private calculateRetryDelay(
    strategy: RecoveryStrategy,
    attempt: number,
  ): number {
    return (
      strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attempt - 1)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logStepExecution(
    step: JourneyStep,
    context: ExecutionContext,
    status: string,
    details: Record<string, any>,
  ): Promise<void> {
    const log = {
      journey_id: context.journeyId,
      instance_id: context.instanceId,
      step_id: step.id,
      step_name: step.name,
      step_type: step.type,
      status,
      details,
      timestamp: new Date().toISOString(),
    };

    await this.supabase.from('journey_execution_logs').insert(log);
  }

  // Rollback implementations
  private async rollbackPayment(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<void> {
    // Implementation depends on payment provider
    console.log(`Rolling back payment for step ${step.id}`);
  }

  private async rollbackVendorBooking(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<void> {
    // Cancel vendor booking
    const bookingConfig = step.config;

    await this.supabase
      .from('vendor_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('vendor_id', bookingConfig.vendorId)
      .eq('client_id', context.clientId);
  }

  private async sendCorrectionMessage(
    step: JourneyStep,
    context: ExecutionContext,
  ): Promise<void> {
    // Send correction/apology message
    console.log(`Sending correction message for step ${step.id}`);
  }
}
