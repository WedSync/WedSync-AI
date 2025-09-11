import { emailServiceConnector } from './email-connector';
import { smsServiceConnector } from './sms-connector';
import { deliveryTracker } from './delivery-tracker';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Journey Service Bridge
 * Connects Team C service connectors with Team B execution engine
 */

export interface JourneyServiceConfig {
  journey_id: string;
  instance_id: string;
  client_id: string;
  vendor_id: string;
  organization_id: string;
  node_id: string;
  action_type: 'send_email' | 'send_sms' | 'send_form' | 'webhook_call';
  action_config: any;
  variables: Record<string, any>;
}

export interface ServiceExecutionResult {
  success: boolean;
  message_id?: string;
  delivery_status: 'sent' | 'scheduled' | 'failed';
  execution_time_ms: number;
  cost?: number;
  segments_used?: number;
  error_message?: string;
  next_actions?: string[];
}

export class JourneyServiceBridge {
  private static instance: JourneyServiceBridge;

  static getInstance(): JourneyServiceBridge {
    if (!JourneyServiceBridge.instance) {
      JourneyServiceBridge.instance = new JourneyServiceBridge();
    }
    return JourneyServiceBridge.instance;
  }

  /**
   * Execute service action from journey execution engine
   */
  async executeServiceAction(
    config: JourneyServiceConfig,
  ): Promise<ServiceExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(
        `Executing ${config.action_type} for journey ${config.journey_id}, node ${config.node_id}`,
      );

      let result: ServiceExecutionResult;

      switch (config.action_type) {
        case 'send_email':
          result = await this.executeSendEmail(config);
          break;

        case 'send_sms':
          result = await this.executeSendSMS(config);
          break;

        case 'send_form':
          result = await this.executeSendForm(config);
          break;

        case 'webhook_call':
          result = await this.executeWebhookCall(config);
          break;

        default:
          throw new Error(`Unsupported action type: ${config.action_type}`);
      }

      result.execution_time_ms = Date.now() - startTime;

      // Log successful execution
      await this.logServiceExecution(config, result, null);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Service execution failed: ${config.action_type}`, error);

      const failedResult: ServiceExecutionResult = {
        success: false,
        delivery_status: 'failed',
        execution_time_ms: executionTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };

      // Log failed execution
      await this.logServiceExecution(config, failedResult, error);

      return failedResult;
    }
  }

  /**
   * Execute email sending action
   */
  private async executeSendEmail(
    config: JourneyServiceConfig,
  ): Promise<ServiceExecutionResult> {
    const { action_config, variables } = config;

    // Get client email
    const { data: client } = await supabase
      .from('clients')
      .select('email, first_name, last_name')
      .eq('id', config.client_id)
      .single();

    if (!client?.email) {
      throw new Error('Client email not found');
    }

    // Get vendor info for sender details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, email')
      .eq('id', config.vendor_id)
      .single();

    // Prepare email variables
    const emailVariables = {
      ...variables,
      client_first_name: client.first_name,
      client_last_name: client.last_name,
      client_email: client.email,
      vendor_name: vendor?.business_name || 'Your Vendor',
      vendor_email: vendor?.email,
      journey_id: config.journey_id,
      instance_id: config.instance_id,
    };

    // Send email via connector
    const emailResult = await emailServiceConnector.sendEmail({
      template_id: action_config.template_id,
      recipient: {
        email: client.email,
        name: `${client.first_name} ${client.last_name}`.trim(),
      },
      variables: emailVariables,
      sender: vendor?.email
        ? {
            email: vendor.email,
            name: vendor.business_name,
          }
        : undefined,
      priority: action_config.priority || 'normal',
      delivery_time: action_config.schedule_for,
      track_opens: action_config.track_opens || true,
      track_clicks: action_config.track_clicks || true,
    });

    // Track delivery event
    await deliveryTracker.trackEvent({
      journey_id: config.journey_id,
      instance_id: config.instance_id,
      client_id: config.client_id,
      message_type: 'email',
      message_id: emailResult.message_id,
      template_id: action_config.template_id,
      recipient: client.email,
      event_type: 'sent',
      timestamp: emailResult.delivery_timestamp,
      event_data: {
        template_id: action_config.template_id,
        variables: emailVariables,
        tracking_enabled: {
          opens: action_config.track_opens || true,
          clicks: action_config.track_clicks || true,
        },
      },
      provider: 'resend',
    });

    return {
      success: true,
      message_id: emailResult.message_id,
      delivery_status: emailResult.status,
      execution_time_ms: 0, // Will be set by caller
      next_actions: action_config.next_nodes,
    };
  }

  /**
   * Execute SMS sending action
   */
  private async executeSendSMS(
    config: JourneyServiceConfig,
  ): Promise<ServiceExecutionResult> {
    const { action_config, variables } = config;

    // Get client phone and consent
    const { data: client } = await supabase
      .from('clients')
      .select('phone, first_name, last_name, sms_consent, sms_opt_in_date')
      .eq('id', config.client_id)
      .single();

    if (!client?.phone) {
      throw new Error('Client phone number not found');
    }

    if (!client.sms_consent) {
      throw new Error('Client has not consented to SMS communications');
    }

    // Get vendor info
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, phone')
      .eq('id', config.vendor_id)
      .single();

    // Prepare SMS variables
    const smsVariables = {
      ...variables,
      client_first_name: client.first_name,
      client_last_name: client.last_name,
      client_phone: client.phone,
      vendor_name: vendor?.business_name || 'Your Vendor',
      vendor_phone: vendor?.phone,
      journey_id: config.journey_id,
      instance_id: config.instance_id,
    };

    // Send SMS via connector
    const smsResult = await smsServiceConnector.sendSMS({
      template_id: action_config.template_id,
      custom_message: action_config.custom_message,
      recipient: {
        phone: client.phone,
        name: `${client.first_name} ${client.last_name}`.trim(),
      },
      variables: smsVariables,
      priority: action_config.priority || 'normal',
      delivery_time: action_config.schedule_for,
      enable_delivery_tracking: action_config.track_delivery || true,
      shorten_urls: action_config.shorten_urls || true,
      compliance_data: {
        consent_given: client.sms_consent,
        consent_timestamp: client.sms_opt_in_date,
        opt_in_method: 'double_opt_in',
      },
    });

    // Track delivery event
    await deliveryTracker.trackEvent({
      journey_id: config.journey_id,
      instance_id: config.instance_id,
      client_id: config.client_id,
      message_type: 'sms',
      message_id: smsResult.message_id,
      template_id: action_config.template_id,
      recipient: client.phone,
      event_type: 'sent',
      timestamp: smsResult.delivery_timestamp,
      event_data: {
        template_id: action_config.template_id,
        custom_message: action_config.custom_message,
        variables: smsVariables,
        segments: smsResult.segments_used,
      },
      provider: 'twilio',
      cost: smsResult.cost_estimate,
      segments_used: smsResult.segments_used,
    });

    return {
      success: true,
      message_id: smsResult.message_id,
      delivery_status: smsResult.status,
      execution_time_ms: 0, // Will be set by caller
      cost: smsResult.cost_estimate,
      segments_used: smsResult.segments_used,
      next_actions: action_config.next_nodes,
    };
  }

  /**
   * Execute form sending action (combines email with form link)
   */
  private async executeSendForm(
    config: JourneyServiceConfig,
  ): Promise<ServiceExecutionResult> {
    const { action_config, variables } = config;

    // Get form details
    const { data: form } = await supabase
      .from('forms')
      .select('id, title, slug, description')
      .eq('id', action_config.form_id)
      .single();

    if (!form) {
      throw new Error(`Form not found: ${action_config.form_id}`);
    }

    // Generate form URL
    const formUrl = `${process.env.NEXT_PUBLIC_APP_URL}/forms/${form.slug}`;

    // Enhanced variables with form details
    const formVariables = {
      ...variables,
      form_id: form.id,
      form_title: form.title,
      form_url: formUrl,
      form_description: form.description,
      message: action_config.message || `Please complete your ${form.title}`,
    };

    // Use email service to send form invitation
    const emailConfig = {
      ...config,
      action_type: 'send_email' as const,
      action_config: {
        ...action_config,
        template_id: action_config.email_template_id || 'form_invitation',
        track_opens: true,
        track_clicks: true,
      },
      variables: formVariables,
    };

    const emailResult = await this.executeSendEmail(emailConfig);

    // Record form invitation event
    await supabase.from('journey_events').insert({
      journey_id: config.journey_id,
      instance_id: config.instance_id,
      client_id: config.client_id,
      event_type: 'form_invitation_sent',
      event_source: 'system',
      event_data: {
        form_id: form.id,
        form_title: form.title,
        form_url: formUrl,
        email_message_id: emailResult.message_id,
      },
    });

    return {
      ...emailResult,
      next_actions: action_config.next_nodes,
    };
  }

  /**
   * Execute webhook call action
   */
  private async executeWebhookCall(
    config: JourneyServiceConfig,
  ): Promise<ServiceExecutionResult> {
    const { action_config, variables } = config;

    const {
      url,
      method = 'POST',
      headers = {},
      timeout = 10000,
    } = action_config;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    // Prepare payload
    const payload = {
      journey_id: config.journey_id,
      instance_id: config.instance_id,
      client_id: config.client_id,
      vendor_id: config.vendor_id,
      node_id: config.node_id,
      variables,
      timestamp: new Date().toISOString(),
      ...action_config.payload,
    };

    // Make webhook call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync Journey Engine/1.0',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({}));

      // Record webhook event
      await supabase.from('journey_events').insert({
        journey_id: config.journey_id,
        instance_id: config.instance_id,
        client_id: config.client_id,
        event_type: 'webhook_called',
        event_source: 'system',
        event_data: {
          url,
          method,
          status: response.status,
          success: response.ok,
          response_data: responseData,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Webhook call failed: ${response.status} ${response.statusText}`,
        );
      }

      return {
        success: true,
        delivery_status: 'sent',
        execution_time_ms: 0, // Will be set by caller
        next_actions: action_config.next_nodes,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get service metrics for journey analytics
   */
  async getServiceMetrics(
    journeyId: string,
    timeRange?: {
      start_date: string;
      end_date: string;
    },
  ) {
    const params = {
      journey_id: journeyId,
      ...timeRange,
    };

    const [deliveryMetrics, serviceExecutions] = await Promise.all([
      deliveryTracker.getDeliveryMetrics(params),
      this.getServiceExecutionMetrics(journeyId, timeRange),
    ]);

    return {
      delivery_metrics: deliveryMetrics,
      service_executions: serviceExecutions,
      combined_metrics: {
        total_actions_executed: serviceExecutions.total_executions,
        successful_deliveries: deliveryMetrics.total_delivered,
        failed_deliveries: deliveryMetrics.total_failed,
        success_rate: serviceExecutions.success_rate,
        average_execution_time: serviceExecutions.average_execution_time_ms,
        total_cost: deliveryMetrics.total_cost,
      },
    };
  }

  /**
   * Handle service delivery webhooks from external providers
   */
  async handleServiceWebhook(
    provider: 'resend' | 'twilio' | 'sendgrid' | 'ses',
    webhookData: any,
  ): Promise<void> {
    try {
      // Process webhook based on provider
      switch (provider) {
        case 'resend':
          await this.handleResendWebhook(webhookData);
          break;
        case 'twilio':
          await this.handleTwilioWebhook(webhookData);
          break;
        case 'sendgrid':
          await this.handleSendgridWebhook(webhookData);
          break;
        case 'ses':
          await this.handleSESWebhook(webhookData);
          break;
        default:
          console.warn(`Unsupported webhook provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Webhook processing failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get journey service status for monitoring
   */
  async getJourneyServiceStatus(journeyIds: string[]): Promise<
    Record<
      string,
      {
        email_service_status: 'healthy' | 'degraded' | 'down';
        sms_service_status: 'healthy' | 'degraded' | 'down';
        recent_failures: number;
        delivery_rate_24h: number;
        average_response_time: number;
      }
    >
  > {
    const status: Record<string, any> = {};

    for (const journeyId of journeyIds) {
      const realtimeStatus = await deliveryTracker.getRealtimeDeliveryStatus([
        journeyId,
      ]);
      const metrics = await this.getServiceMetrics(journeyId, {
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
      });

      const journeyStatus = realtimeStatus[journeyId];

      status[journeyId] = {
        email_service_status: this.determineServiceHealth('email', metrics),
        sms_service_status: this.determineServiceHealth('sms', metrics),
        recent_failures: journeyStatus?.failed_today || 0,
        delivery_rate_24h: metrics.delivery_metrics.delivery_rate,
        average_response_time:
          metrics.service_executions.average_execution_time_ms,
      };
    }

    return status;
  }

  /**
   * Log service execution for monitoring and debugging
   */
  private async logServiceExecution(
    config: JourneyServiceConfig,
    result: ServiceExecutionResult,
    error: any,
  ): Promise<void> {
    try {
      await supabase.from('service_execution_logs').insert({
        journey_id: config.journey_id,
        instance_id: config.instance_id,
        client_id: config.client_id,
        vendor_id: config.vendor_id,
        node_id: config.node_id,
        action_type: config.action_type,
        success: result.success,
        execution_time_ms: result.execution_time_ms,
        message_id: result.message_id,
        delivery_status: result.delivery_status,
        cost: result.cost,
        error_message: result.error_message,
        config_snapshot: config.action_config,
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log service execution:', logError);
    }
  }

  /**
   * Get service execution metrics
   */
  private async getServiceExecutionMetrics(
    journeyId: string,
    timeRange?: { start_date: string; end_date: string },
  ): Promise<{
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    average_execution_time_ms: number;
    total_cost: number;
  }> {
    let query = supabase
      .from('service_execution_logs')
      .select('success, execution_time_ms, cost')
      .eq('journey_id', journeyId);

    if (timeRange) {
      query = query
        .gte('executed_at', timeRange.start_date)
        .lte('executed_at', timeRange.end_date);
    }

    const { data: logs } = await query;

    if (!logs || logs.length === 0) {
      return {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        success_rate: 0,
        average_execution_time_ms: 0,
        total_cost: 0,
      };
    }

    const successfulExecutions = logs.filter((log) => log.success).length;
    const totalExecutionTime = logs.reduce(
      (sum, log) => sum + (log.execution_time_ms || 0),
      0,
    );
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

    return {
      total_executions: logs.length,
      successful_executions: successfulExecutions,
      failed_executions: logs.length - successfulExecutions,
      success_rate: Math.round((successfulExecutions / logs.length) * 100),
      average_execution_time_ms: Math.round(totalExecutionTime / logs.length),
      total_cost: Math.round(totalCost * 10000) / 10000,
    };
  }

  /**
   * Handle webhook events from different providers
   */
  private async handleResendWebhook(webhookData: any): Promise<void> {
    // Process Resend webhook format
    await deliveryTracker.handleWebhookEvent({
      provider: 'resend',
      message_id: webhookData.data.message_id,
      event_type: webhookData.type,
      timestamp: webhookData.created_at,
      recipient: webhookData.data.to,
      event_data: webhookData.data,
    });
  }

  private async handleTwilioWebhook(webhookData: any): Promise<void> {
    // Process Twilio webhook format
    await smsServiceConnector.handleTwilioWebhook(webhookData);
  }

  private async handleSendgridWebhook(webhookData: any): Promise<void> {
    // Process SendGrid webhook format (if implemented)
    for (const event of webhookData) {
      await deliveryTracker.handleWebhookEvent({
        provider: 'sendgrid',
        message_id: event.sg_message_id,
        event_type: event.event,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        recipient: event.email,
        event_data: event,
      });
    }
  }

  private async handleSESWebhook(webhookData: any): Promise<void> {
    // Process AWS SES webhook format (if implemented)
    const message = JSON.parse(webhookData.Message);
    await deliveryTracker.handleWebhookEvent({
      provider: 'ses',
      message_id: message.mail.messageId,
      event_type: message.eventType,
      timestamp: message.mail.timestamp,
      recipient: message.mail.commonHeaders.to[0],
      event_data: message,
    });
  }

  /**
   * Determine service health based on metrics
   */
  private determineServiceHealth(
    serviceType: 'email' | 'sms',
    metrics: any,
  ): 'healthy' | 'degraded' | 'down' {
    const deliveryRate = metrics.delivery_metrics.delivery_rate;
    const failureRate =
      (metrics.delivery_metrics.total_failed /
        (metrics.delivery_metrics.total_sent || 1)) *
      100;

    if (deliveryRate >= 95 && failureRate <= 5) {
      return 'healthy';
    } else if (deliveryRate >= 85 && failureRate <= 15) {
      return 'degraded';
    } else {
      return 'down';
    }
  }
}

// Export singleton instance
export const journeyServiceBridge = JourneyServiceBridge.getInstance();
