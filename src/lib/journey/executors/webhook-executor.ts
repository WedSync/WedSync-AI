import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { createClient } from '@/lib/supabase/server';

interface WebhookNodeConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  bodyTemplate?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number; // in milliseconds
  retryOnFailure?: boolean;
  maxRetries?: number;
  successCodes?: number[]; // HTTP status codes considered successful
}

export class WebhookNodeExecutor extends BaseNodeExecutor {
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: WebhookNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Validate configuration
      this.validateConfig(config, ['url']);

      // Prepare webhook request
      const requestConfig = this.prepareRequest(context, config);

      // Execute webhook with retry logic
      const response = await this.executeWithRetry(requestConfig, config);

      // Process response
      const responseData = await this.processResponse(response);

      // Track webhook execution
      await this.trackWebhookExecution(
        context,
        config,
        response.status,
        responseData,
      );

      this.logger.info('Webhook executed successfully', {
        executionId: context.executionId,
        stepId: context.stepId,
        url: config.url,
        status: response.status,
      });

      return {
        success: true,
        output: {
          statusCode: response.status,
          responseData,
          executedAt: new Date().toISOString(),
          url: config.url,
          method: config.method || 'POST',
        },
      };
    } catch (error) {
      this.logger.error('Webhook node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        url: config.url,
        error,
      });

      // Track failed webhook
      await this.trackWebhookExecution(
        context,
        config,
        0,
        null,
        error instanceof Error ? error.message : 'Unknown error',
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Webhook execution failed',
      };
    }
  }

  private prepareRequest(
    context: NodeExecutorContext,
    config: WebhookNodeConfig,
  ): RequestInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Journey-Engine/1.0',
      ...config.headers,
    };

    // Add authentication headers
    this.addAuthenticationHeaders(headers, config.authentication);

    // Prepare body
    let body: string | undefined;
    if (config.method !== 'GET' && config.method !== 'DELETE') {
      if (config.bodyTemplate) {
        body = this.interpolateTemplate(config.bodyTemplate, context.variables);
      } else if (config.body) {
        const interpolatedBody = this.interpolateObjectValues(
          config.body,
          context.variables,
        );
        body = JSON.stringify({
          ...interpolatedBody,
          _metadata: {
            executionId: context.executionId,
            stepId: context.stepId,
            templateId: context.templateId,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Default body with context data
        body = JSON.stringify({
          executionId: context.executionId,
          variables: context.variables,
          clientData: context.clientData,
          vendorData: context.vendorData,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      method: config.method || 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(config.timeout || 30000), // 30 second default timeout
    };
  }

  private addAuthenticationHeaders(
    headers: HeadersInit,
    auth?: WebhookNodeConfig['authentication'],
  ): void {
    if (!auth || auth.type === 'none') {
      return;
    }

    const headersObj = headers as Record<string, string>;

    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headersObj['Authorization'] = `Bearer ${auth.token}`;
        }
        break;

      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`,
          ).toString('base64');
          headersObj['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api_key':
        if (auth.apiKey) {
          const headerName = auth.apiKeyHeader || 'X-API-Key';
          headersObj[headerName] = auth.apiKey;
        }
        break;
    }
  }

  private async executeWithRetry(
    requestConfig: RequestInit,
    config: WebhookNodeConfig,
    attempt: number = 1,
  ): Promise<Response> {
    try {
      const response = await fetch(config.url, requestConfig);

      // Check if response is successful
      const successCodes = config.successCodes || [200, 201, 202, 204];
      if (!successCodes.includes(response.status)) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      return response;
    } catch (error) {
      const maxRetries = config.maxRetries || 3;

      if (config.retryOnFailure && attempt < maxRetries) {
        this.logger.warn('Webhook failed, retrying', {
          url: config.url,
          attempt,
          maxRetries,
          error,
        });

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.executeWithRetry(requestConfig, config, attempt + 1);
      }

      throw error;
    }
  }

  private async processResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    if (contentType?.includes('text/')) {
      return await response.text();
    }

    return null;
  }

  private interpolateObjectValues(
    obj: any,
    variables: Record<string, any>,
  ): any {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, variables);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObjectValues(item, variables));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObjectValues(value, variables);
      }
      return result;
    }

    return obj;
  }

  private async trackWebhookExecution(
    context: NodeExecutorContext,
    config: WebhookNodeConfig,
    statusCode: number,
    responseData: any,
    error?: string,
  ): Promise<void> {
    const { error: dbError } = await this.supabase
      .from('journey_webhook_executions')
      .insert({
        execution_id: context.executionId,
        step_id: context.stepId,
        url: config.url,
        method: config.method || 'POST',
        status_code: statusCode,
        response_data: responseData,
        error_message: error,
        executed_at: new Date().toISOString(),
      });

    if (dbError) {
      this.logger.warn('Failed to track webhook execution', {
        executionId: context.executionId,
        error: dbError,
      });
    }
  }
}
