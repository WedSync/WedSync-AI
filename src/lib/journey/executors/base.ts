// Base executor class - no imports from other executor files
import { structuredLogger } from '@/lib/monitoring/structured-logger';
import { NodeExecutorContext, NodeExecutorResult } from './types';

export abstract class BaseNodeExecutor {
  protected logger = structuredLogger;

  abstract execute(
    context: NodeExecutorContext,
    config: Record<string, any>,
  ): Promise<NodeExecutorResult>;

  protected interpolateTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value != null ? String(value) : match;
    });
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  protected validateConfig(
    config: Record<string, any>,
    required: string[],
  ): void {
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }
}
