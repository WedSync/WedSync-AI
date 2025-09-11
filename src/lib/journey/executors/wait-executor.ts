import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { createClient } from '@/lib/supabase/server';

interface WaitNodeConfig {
  duration?: number; // Duration in minutes
  unit?: 'minutes' | 'hours' | 'days' | 'weeks';
  waitUntil?: string; // ISO date string for absolute wait
  waitForEvent?: string; // Event name to wait for
  businessHoursOnly?: boolean;
  skipWeekends?: boolean;
  timezone?: string;
}

export class WaitNodeExecutor extends BaseNodeExecutor {
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: WaitNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Calculate wait until time
      const waitUntil = this.calculateWaitTime(context, config);

      // If waiting for an event instead of time
      if (config.waitForEvent) {
        await this.registerEventWait(context, config.waitForEvent);
        return {
          success: true,
          output: {
            waitingForEvent: config.waitForEvent,
            registeredAt: new Date().toISOString(),
          },
          pauseExecution: true,
        };
      }

      // If the wait time has already passed, continue immediately
      if (waitUntil <= new Date()) {
        this.logger.info('Wait time already passed, continuing', {
          executionId: context.executionId,
          stepId: context.stepId,
          waitUntil: waitUntil.toISOString(),
        });

        return {
          success: true,
          output: {
            waitCompleted: true,
            completedAt: new Date().toISOString(),
          },
        };
      }

      // Schedule the next execution
      await this.scheduleNextExecution(context, waitUntil);

      this.logger.info('Journey execution scheduled', {
        executionId: context.executionId,
        stepId: context.stepId,
        waitUntil: waitUntil.toISOString(),
        duration: this.formatDuration(waitUntil.getTime() - Date.now()),
      });

      return {
        success: true,
        output: {
          scheduledFor: waitUntil.toISOString(),
          duration: config.duration,
          unit: config.unit,
          businessHoursOnly: config.businessHoursOnly,
        },
        pauseExecution: true,
        scheduleNextAt: waitUntil,
      };
    } catch (error) {
      this.logger.error('Wait node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        error,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Wait scheduling failed',
      };
    }
  }

  private calculateWaitTime(
    context: NodeExecutorContext,
    config: WaitNodeConfig,
  ): Date {
    // If absolute wait time is specified
    if (config.waitUntil) {
      const waitUntil = new Date(config.waitUntil);
      if (isNaN(waitUntil.getTime())) {
        throw new Error('Invalid waitUntil date format');
      }
      return waitUntil;
    }

    // Calculate relative wait time
    const duration = config.duration || 0;
    const unit = config.unit || 'minutes';

    let milliseconds = 0;
    switch (unit) {
      case 'minutes':
        milliseconds = duration * 60 * 1000;
        break;
      case 'hours':
        milliseconds = duration * 60 * 60 * 1000;
        break;
      case 'days':
        milliseconds = duration * 24 * 60 * 60 * 1000;
        break;
      case 'weeks':
        milliseconds = duration * 7 * 24 * 60 * 60 * 1000;
        break;
    }

    let targetDate = new Date(Date.now() + milliseconds);

    // Apply business hours constraints
    if (config.businessHoursOnly) {
      targetDate = this.adjustForBusinessHours(targetDate, config.timezone);
    }

    // Skip weekends if requested
    if (config.skipWeekends) {
      targetDate = this.skipWeekends(targetDate);
    }

    return targetDate;
  }

  private adjustForBusinessHours(date: Date, timezone?: string): Date {
    const hours = date.getHours();

    // If outside business hours (before 9 AM or after 5 PM)
    if (hours < 9) {
      date.setHours(9, 0, 0, 0);
    } else if (hours >= 17) {
      // Move to next day at 9 AM
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    }

    // Skip weekends while adjusting for business hours
    return this.skipWeekends(date);
  }

  private skipWeekends(date: Date): Date {
    const day = date.getDay();

    // If Saturday (6), move to Monday
    if (day === 6) {
      date.setDate(date.getDate() + 2);
    }
    // If Sunday (0), move to Monday
    else if (day === 0) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  }

  private async scheduleNextExecution(
    context: NodeExecutorContext,
    executeAt: Date,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_execution_schedule')
      .insert({
        execution_id: context.executionId,
        step_id: context.stepId,
        scheduled_for: executeAt.toISOString(),
        status: 'scheduled',
      });

    if (error) {
      throw new Error(`Failed to schedule next execution: ${error.message}`);
    }

    // Update the journey execution to paused state
    await this.supabase
      .from('journey_executions')
      .update({
        status: 'paused',
        scheduled_at: executeAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.executionId);
  }

  private async registerEventWait(
    context: NodeExecutorContext,
    eventName: string,
  ): Promise<void> {
    const { error } = await this.supabase.from('journey_event_waits').insert({
      execution_id: context.executionId,
      step_id: context.stepId,
      event_name: eventName,
      status: 'waiting',
      registered_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to register event wait: ${error.message}`);
    }

    // Update the journey execution to paused state
    await this.supabase
      .from('journey_executions')
      .update({
        status: 'paused',
        waiting_for_event: eventName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.executionId);
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }
}
