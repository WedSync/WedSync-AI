// Factory for creating node executors - lazy loading to avoid circular dependencies
import { BaseNodeExecutor } from './base';

export class NodeExecutorFactory {
  private static executors = new Map<string, () => BaseNodeExecutor>();
  private static instances = new Map<string, BaseNodeExecutor>();

  static {
    // Register executor factories (lazy loading)
    this.executors.set('email', () => {
      const { EmailNodeExecutor } = require('./email-executor');
      return new EmailNodeExecutor();
    });

    this.executors.set('sms', () => {
      const { SMSNodeExecutor } = require('./sms-executor');
      return new SMSNodeExecutor();
    });

    this.executors.set('wait', () => {
      const { WaitNodeExecutor } = require('./wait-executor');
      return new WaitNodeExecutor();
    });

    this.executors.set('condition', () => {
      const { ConditionNodeExecutor } = require('./condition-executor');
      return new ConditionNodeExecutor();
    });

    this.executors.set('webhook', () => {
      const { WebhookNodeExecutor } = require('./webhook-executor');
      return new WebhookNodeExecutor();
    });

    this.executors.set('form', () => {
      const { FormNodeExecutor } = require('./form-executor');
      return new FormNodeExecutor();
    });

    this.executors.set('review', () => {
      const { ReviewNodeExecutor } = require('./review-executor');
      return new ReviewNodeExecutor();
    });

    this.executors.set('task', () => {
      const { TaskNodeExecutor } = require('./task-executor');
      return new TaskNodeExecutor();
    });
  }

  static getExecutor(nodeType: string): BaseNodeExecutor {
    // Return cached instance if available
    if (this.instances.has(nodeType)) {
      return this.instances.get(nodeType)!;
    }

    // Create new instance using factory
    const factory = this.executors.get(nodeType);
    if (!factory) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }

    const instance = factory();
    this.instances.set(nodeType, instance);
    return instance;
  }

  static registerExecutor(
    nodeType: string,
    factory: () => BaseNodeExecutor,
  ): void {
    this.executors.set(nodeType, factory);
    // Clear cached instance if exists
    this.instances.delete(nodeType);
  }

  // For testing - clear all cached instances
  static clearCache(): void {
    this.instances.clear();
  }
}
