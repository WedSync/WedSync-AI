# TEAM C - ROUND 1: WS-306 - Forms System Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build forms integration system with real-time form analytics, webhook notifications, and cross-platform form synchronization
**FEATURE ID:** WS-306 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time form tracking, webhook systems, and seamless integration across all wedding coordination platforms

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **REAL-TIME FORM ANALYTICS VERIFICATION:**
```bash
# Test WebSocket connection for form analytics
wscat -c "ws://localhost:3000/api/realtime/forms" -H "Authorization: Bearer $TOKEN"
# MUST show: Real-time form submission and completion rate updates
```

2. **WEBHOOK INTEGRATION TEST:**
```bash
curl -X POST $WS_ROOT/api/webhooks/form-submission \
  -H "Content-Type: application/json" \
  -d '{"form_id":"test","responses":{}}' | jq .
# MUST show: Webhook processed and external integrations notified
```

3. **CROSS-PLATFORM SYNC VERIFICATION:**
```bash
curl -X GET $WS_ROOT/api/forms/sync-status \
  -H "Authorization: Bearer $TOKEN" | jq .
# MUST show: Form data consistency across mobile and web platforms
```

## 🧠 SEQUENTIAL THINKING FOR FORMS INTEGRATION SYSTEMS

```typescript
// Forms integration complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Forms integration system needs: Real-time analytics tracking form submissions, completion rates, and field abandonment, webhook systems for external CRM integration (Tave, HoneyBook), cross-platform synchronization ensuring mobile and web forms stay consistent, and notification systems alerting vendors to new submissions.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor integration patterns: Photographers need form submissions integrated with client management systems, venues require capacity tracking from guest count forms, coordinators need timeline forms synchronized across all vendors, florists track seasonal form submissions for planning, and all vendors need immediate notification of new inquiries.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Real-time analytics requirements: Track form views, field completion rates, submission success rates, abandonment points, average completion time, mobile vs desktop usage patterns, seasonal submission trends, and vendor-specific form performance metrics for optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Integration architecture: Supabase Realtime for live form analytics, webhook queue system for reliable external notifications, event sourcing for form interaction tracking, CQRS pattern for analytics read/write optimization, background sync for offline form submissions, and conflict resolution for concurrent form edits.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA INTEGRATION PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing integration and webhook patterns
await mcp__serena__search_for_pattern("webhook integration realtime analytics");
await mcp__serena__find_symbol("webhook supabase realtime", "$WS_ROOT/wedsync/src/lib/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");

// Study existing analytics and tracking systems
await mcp__serena__find_referencing_symbols("analytics tracking metrics");
```

### B. INTEGRATION DOCUMENTATION LOADING
```typescript
// Load webhook and real-time integration documentation
// Use Ref MCP to search for:
# - "Supabase Realtime analytics tracking"
# - "Webhook reliability patterns Node.js"
# - "Form analytics implementation strategies"

// Load cross-platform synchronization patterns
// Use Ref MCP to search for:
# - "Cross-platform data synchronization"
# - "Event-driven architecture webhooks"
# - "Real-time dashboard analytics patterns"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Real-time Form Analytics System** (`$WS_ROOT/wedsync/src/lib/integrations/form-analytics-stream.ts`)
  - WebSocket subscriptions for live form submission tracking
  - Real-time completion rate calculations and updates
  - Live dashboard analytics for vendor insights
  - Evidence: Form analytics update instantly as submissions occur

- [ ] **Webhook Integration Manager** (`$WS_ROOT/wedsync/src/lib/integrations/form-webhook-manager.ts`)
  - Reliable webhook delivery system with retry logic
  - External CRM integration (Tave, HoneyBook, etc.)
  - Custom webhook endpoints for third-party systems
  - Evidence: External systems receive form notifications reliably

- [ ] **Cross-Platform Form Sync** (`$WS_ROOT/wedsync/src/lib/integrations/form-sync-engine.ts`)
  - Bidirectional sync between web and mobile platforms
  - Conflict resolution for simultaneous form edits
  - Offline form creation and sync capability
  - Evidence: Form changes sync seamlessly across all devices

- [ ] **Form Notification System** (`$WS_ROOT/wedsync/src/lib/integrations/form-notification-service.ts`)
  - Instant email/SMS alerts for new submissions
  - Smart notification filtering based on form priority
  - Multi-channel notification delivery (email, SMS, push, Slack)
  - Evidence: Vendors receive immediate notifications for critical forms

- [ ] **Integration Analytics Dashboard** (`$WS_ROOT/wedsync/src/components/forms/integration-analytics.tsx`)
  - Real-time integration health monitoring
  - Webhook delivery success rates and error tracking
  - External system synchronization status
  - Evidence: Dashboard shows accurate integration metrics in real-time

## 🔄 REAL-TIME FORM ANALYTICS IMPLEMENTATION

### Form Analytics Stream Manager
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/form-analytics-stream.ts

import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/realtime-js';

export interface FormAnalyticsEvent {
  event_type: 'form_viewed' | 'field_focused' | 'field_completed' | 'form_submitted' | 'form_abandoned';
  form_id: string;
  field_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FormAnalyticsMetrics {
  total_views: number;
  total_submissions: number;
  completion_rate: number;
  average_completion_time: number;
  abandonment_points: Record<string, number>;
  field_completion_rates: Record<string, number>;
}

export class FormAnalyticsStream {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  private channels: Map<string, RealtimeChannel> = new Map();
  private analyticsCache: Map<string, FormAnalyticsMetrics> = new Map();

  async subscribeToFormAnalytics(
    supplierId: string,
    onAnalyticsUpdate: (analytics: FormAnalyticsMetrics) => void,
    onError: (error: any) => void
  ) {
    const channelName = `form-analytics-${supplierId}`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_analytics',
          filter: `form_id=in.(${await this.getSupplierFormIds(supplierId)})`
        },
        async (payload) => {
          await this.processAnalyticsEvent(payload.new, onAnalyticsUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_responses',
          filter: `form_id=in.(${await this.getSupplierFormIds(supplierId)})`
        },
        async (payload) => {
          await this.processSubmissionEvent(payload.new, onAnalyticsUpdate);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to form analytics for supplier ${supplierId}`);
        } else if (status === 'CHANNEL_ERROR') {
          onError(new Error('Form analytics subscription error'));
        }
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  async trackFormEvent(
    supplierId: string,
    formId: string,
    event: FormAnalyticsEvent
  ) {
    try {
      // Store event in database
      await this.supabase.from('form_analytics').insert({
        form_id: formId,
        metric_type: event.event_type,
        metric_value: 1,
        date_recorded: new Date().toISOString().split('T')[0],
        metadata: {
          timestamp: event.timestamp,
          field_id: event.field_id,
          ...event.metadata
        }
      });

      // Update real-time metrics
      await this.updateRealtimeMetrics(formId, event);

      // Broadcast to connected clients
      const channel = this.channels.get(`form-analytics-${supplierId}`);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'analytics_update',
          payload: {
            form_id: formId,
            event_type: event.event_type,
            timestamp: event.timestamp
          }
        });
      }

    } catch (error) {
      console.error('Form analytics tracking error:', error);
    }
  }

  private async processAnalyticsEvent(
    analyticsData: any,
    onAnalyticsUpdate: (analytics: FormAnalyticsMetrics) => void
  ) {
    const formId = analyticsData.form_id;
    const currentMetrics = await this.calculateFormMetrics(formId);
    
    this.analyticsCache.set(formId, currentMetrics);
    onAnalyticsUpdate(currentMetrics);
  }

  private async processSubmissionEvent(
    submissionData: any,
    onAnalyticsUpdate: (analytics: FormAnalyticsMetrics) => void
  ) {
    const formId = submissionData.form_id;
    
    // Calculate completion time
    const startTime = await this.getFormStartTime(submissionData.id);
    const completionTime = startTime 
      ? new Date(submissionData.submitted_at).getTime() - startTime.getTime()
      : null;

    // Update metrics
    const currentMetrics = await this.calculateFormMetrics(formId);
    this.analyticsCache.set(formId, currentMetrics);
    onAnalyticsUpdate(currentMetrics);

    // Track completion time separately
    if (completionTime) {
      await this.supabase.from('form_analytics').insert({
        form_id: formId,
        metric_type: 'completion_time',
        metric_value: completionTime / 1000, // Convert to seconds
        date_recorded: new Date().toISOString().split('T')[0],
        metadata: { response_id: submissionData.id }
      });
    }
  }

  private async calculateFormMetrics(formId: string): Promise<FormAnalyticsMetrics> {
    try {
      // Get all analytics data for the form
      const { data: analyticsData } = await this.supabase
        .from('form_analytics')
        .select('*')
        .eq('form_id', formId)
        .gte('date_recorded', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 30 days

      const views = analyticsData?.filter(d => d.metric_type === 'form_viewed').length || 0;
      const submissions = analyticsData?.filter(d => d.metric_type === 'submission_completed').length || 0;
      const completionTimes = analyticsData
        ?.filter(d => d.metric_type === 'completion_time')
        .map(d => d.metric_value) || [];

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      // Calculate field-specific metrics
      const fieldMetrics = await this.calculateFieldMetrics(formId);

      return {
        total_views: views,
        total_submissions: submissions,
        completion_rate: views > 0 ? (submissions / views) * 100 : 0,
        average_completion_time: avgCompletionTime,
        abandonment_points: fieldMetrics.abandonment_points,
        field_completion_rates: fieldMetrics.completion_rates
      };

    } catch (error) {
      console.error('Metrics calculation error:', error);
      return {
        total_views: 0,
        total_submissions: 0,
        completion_rate: 0,
        average_completion_time: 0,
        abandonment_points: {},
        field_completion_rates: {}
      };
    }
  }

  private async calculateFieldMetrics(formId: string): Promise<{
    abandonment_points: Record<string, number>;
    completion_rates: Record<string, number>;
  }> {
    // Get form structure to understand fields
    const { data: formData } = await this.supabase
      .from('forms')
      .select('fields')
      .eq('id', formId)
      .single();

    if (!formData?.fields) {
      return { abandonment_points: {}, completion_rates: {} };
    }

    const fields = formData.fields as Array<{ id: string; label: string }>;
    const abandonment_points: Record<string, number> = {};
    const completion_rates: Record<string, number> = {};

    // Analyze field interactions from analytics
    const { data: fieldAnalytics } = await this.supabase
      .from('form_analytics')
      .select('metadata')
      .eq('form_id', formId)
      .eq('metric_type', 'field_focused')
      .gte('date_recorded', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Calculate field-specific metrics
    for (const field of fields) {
      const fieldInteractions = fieldAnalytics?.filter(fa => 
        fa.metadata?.field_id === field.id
      ).length || 0;

      const fieldCompletions = fieldAnalytics?.filter(fa => 
        fa.metadata?.field_id === field.id && fa.metadata?.completed === true
      ).length || 0;

      completion_rates[field.id] = fieldInteractions > 0 
        ? (fieldCompletions / fieldInteractions) * 100 
        : 0;

      abandonment_points[field.id] = fieldInteractions - fieldCompletions;
    }

    return { abandonment_points, completion_rates };
  }

  private async getSupplierFormIds(supplierId: string): Promise<string> {
    const { data: forms } = await this.supabase
      .from('forms')
      .select('id')
      .eq('supplier_id', supplierId);

    return forms?.map(f => f.id).join(',') || '';
  }

  private async getFormStartTime(responseId: string): Promise<Date | null> {
    // Try to find when the form was first viewed for this session
    // This is a simplified version - in production, you'd track session IDs
    const { data: firstView } = await this.supabase
      .from('form_analytics')
      .select('created_at')
      .eq('metric_type', 'form_viewed')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return firstView ? new Date(firstView.created_at) : null;
  }

  private async updateRealtimeMetrics(formId: string, event: FormAnalyticsEvent) {
    // Update form-level metrics in real-time
    const currentMetrics = await this.calculateFormMetrics(formId);
    this.analyticsCache.set(formId, currentMetrics);
  }

  unsubscribeFromForm(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  cleanup() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.analyticsCache.clear();
  }
}
```

### Webhook Integration Manager
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/form-webhook-manager.ts

import { Queue } from 'bull';
import { createClient } from '@supabase/supabase-js';

export interface WebhookConfig {
  id: string;
  supplier_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  retry_attempts: number;
  timeout_seconds: number;
}

export interface WebhookPayload {
  event: string;
  form_id: string;
  supplier_id: string;
  timestamp: string;
  data: Record<string, any>;
}

export class FormWebhookManager {
  private webhookQueue: Queue;
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  constructor() {
    this.webhookQueue = new Queue('webhook delivery', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.setupQueueProcessing();
  }

  async processFormSubmission(
    formId: string,
    supplierId: string,
    submissionData: Record<string, any>
  ) {
    try {
      // Get webhook configurations for this supplier
      const webhooks = await this.getActiveWebhooks(supplierId, 'form.submitted');

      const payload: WebhookPayload = {
        event: 'form.submitted',
        form_id: formId,
        supplier_id: supplierId,
        timestamp: new Date().toISOString(),
        data: submissionData
      };

      // Queue webhook deliveries
      for (const webhook of webhooks) {
        await this.queueWebhookDelivery(webhook, payload);
      }

      // Process external CRM integrations
      await this.processCRMIntegrations(supplierId, formId, submissionData);

    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }

  async processFormCreated(
    formId: string,
    supplierId: string,
    formData: Record<string, any>
  ) {
    const webhooks = await this.getActiveWebhooks(supplierId, 'form.created');

    const payload: WebhookPayload = {
      event: 'form.created',
      form_id: formId,
      supplier_id: supplierId,
      timestamp: new Date().toISOString(),
      data: formData
    };

    for (const webhook of webhooks) {
      await this.queueWebhookDelivery(webhook, payload);
    }
  }

  private async getActiveWebhooks(supplierId: string, eventType: string): Promise<WebhookConfig[]> {
    const { data: webhooks } = await this.supabase
      .from('webhook_configs')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('active', true)
      .contains('events', [eventType]);

    return webhooks || [];
  }

  private async queueWebhookDelivery(webhook: WebhookConfig, payload: WebhookPayload) {
    await this.webhookQueue.add(
      'deliver-webhook',
      {
        webhook_config: webhook,
        payload: payload
      },
      {
        attempts: webhook.retry_attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  private setupQueueProcessing() {
    this.webhookQueue.process('deliver-webhook', async (job) => {
      const { webhook_config, payload } = job.data;
      
      try {
        const response = await fetch(webhook_config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WedSync-Signature': this.generateSignature(payload, webhook_config.secret),
            'X-WedSync-Event': payload.event,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout((webhook_config.timeout_seconds || 30) * 1000)
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
        }

        // Log successful delivery
        await this.logWebhookDelivery(webhook_config.id, payload, true, null);

        return { success: true, status: response.status };

      } catch (error) {
        // Log failed delivery
        await this.logWebhookDelivery(webhook_config.id, payload, false, error.message);
        throw error;
      }
    });
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');
  }

  private async logWebhookDelivery(
    webhookConfigId: string,
    payload: WebhookPayload,
    success: boolean,
    error: string | null
  ) {
    await this.supabase.from('webhook_delivery_logs').insert({
      webhook_config_id: webhookConfigId,
      event_type: payload.event,
      payload: payload,
      success: success,
      error_message: error,
      delivered_at: new Date().toISOString()
    });
  }

  private async processCRMIntegrations(
    supplierId: string,
    formId: string,
    submissionData: Record<string, any>
  ) {
    // Get CRM integration settings
    const { data: integrations } = await this.supabase
      .from('crm_integrations')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('active', true);

    if (!integrations?.length) return;

    for (const integration of integrations) {
      try {
        switch (integration.crm_type) {
          case 'tave':
            await this.sendToTave(integration, submissionData);
            break;
          case 'honeybook':
            await this.sendToHoneybook(integration, submissionData);
            break;
          case 'dubsado':
            await this.sendToDubsado(integration, submissionData);
            break;
        }
      } catch (error) {
        console.error(`${integration.crm_type} integration error:`, error);
      }
    }
  }

  private async sendToTave(integration: any, submissionData: Record<string, any>) {
    const taveClient = {
      apiKey: integration.api_key,
      baseUrl: 'https://tave.com/api/v1'
    };

    // Map WedSync form data to Tave format
    const taveContact = {
      first_name: submissionData.bride_name || submissionData.partner_1_name,
      last_name: submissionData.groom_name || submissionData.partner_2_name,
      email: submissionData.client_email,
      phone: submissionData.client_phone,
      wedding_date: submissionData.wedding_date,
      venue: submissionData.venue_name,
      guest_count: submissionData.guest_count,
      custom_fields: {
        wedsync_form_id: submissionData.form_id,
        submission_date: new Date().toISOString()
      }
    };

    const response = await fetch(`${taveClient.baseUrl}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${taveClient.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taveContact)
    });

    if (!response.ok) {
      throw new Error(`Tave API error: ${response.status}`);
    }
  }

  private async sendToHoneybook(integration: any, submissionData: Record<string, any>) {
    // HoneyBook API integration
    const honeybookClient = {
      apiKey: integration.api_key,
      baseUrl: 'https://api.honeybook.com/v1'
    };

    const honeybookLead = {
      contact: {
        firstName: submissionData.bride_name || submissionData.partner_1_name,
        lastName: submissionData.groom_name || submissionData.partner_2_name,
        email: submissionData.client_email,
        phone: submissionData.client_phone
      },
      project: {
        name: `${submissionData.bride_name || 'New'} Wedding`,
        eventDate: submissionData.wedding_date,
        venue: submissionData.venue_name,
        guestCount: submissionData.guest_count
      },
      source: 'WedSync Form'
    };

    const response = await fetch(`${honeybookClient.baseUrl}/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${honeybookClient.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(honeybookLead)
    });

    if (!response.ok) {
      throw new Error(`HoneyBook API error: ${response.status}`);
    }
  }

  private async sendToDubsado(integration: any, submissionData: Record<string, any>) {
    // Dubsado API integration
    const dubsadoClient = {
      apiKey: integration.api_key,
      baseUrl: 'https://api.dubsado.com/v1'
    };

    const dubsadoLead = {
      firstName: submissionData.bride_name || submissionData.partner_1_name,
      lastName: submissionData.groom_name || submissionData.partner_2_name,
      email: submissionData.client_email,
      phone: submissionData.client_phone,
      projectName: `${submissionData.bride_name || 'New'} Wedding`,
      eventDate: submissionData.wedding_date,
      customFields: {
        venue: submissionData.venue_name,
        guestCount: submissionData.guest_count,
        source: 'WedSync Form'
      }
    };

    const response = await fetch(`${dubsadoClient.baseUrl}/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dubsadoClient.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dubsadoLead)
    });

    if (!response.ok) {
      throw new Error(`Dubsado API error: ${response.status}`);
    }
  }

  async getWebhookDeliveryStats(supplierId: string): Promise<{
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
  }> {
    const { data: stats } = await this.supabase
      .rpc('get_webhook_delivery_stats', { supplier_id: supplierId });

    return stats || {
      total_deliveries: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
      success_rate: 0
    };
  }
}
```

### Cross-Platform Form Synchronization
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/form-sync-engine.ts

export interface FormSyncOperation {
  id: string;
  form_id: string;
  operation_type: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  source_platform: 'web' | 'mobile';
  timestamp: Date;
  status: 'pending' | 'synced' | 'failed';
}

export class FormSyncEngine {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  private syncQueue: Map<string, FormSyncOperation[]> = new Map();

  async syncFormChanges(
    supplierId: string,
    changes: FormSyncOperation[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const change of changes) {
      try {
        switch (change.operation_type) {
          case 'create':
            await this.syncFormCreation(change, supplierId);
            break;
          case 'update':
            await this.syncFormUpdate(change, supplierId);
            break;
          case 'delete':
            await this.syncFormDeletion(change, supplierId);
            break;
        }

        // Mark as synced
        await this.updateSyncStatus(change.id, 'synced');

      } catch (error) {
        errors.push(`Failed to sync ${change.operation_type} for form ${change.form_id}: ${error.message}`);
        await this.updateSyncStatus(change.id, 'failed');
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  private async syncFormCreation(change: FormSyncOperation, supplierId: string) {
    const { error } = await this.supabase
      .from('forms')
      .insert({
        id: change.form_id,
        supplier_id: supplierId,
        ...change.data,
        created_at: change.timestamp.toISOString(),
        updated_at: change.timestamp.toISOString()
      });

    if (error) throw error;

    // Broadcast sync event
    await this.broadcastSyncEvent(supplierId, 'form_created', {
      form_id: change.form_id,
      source: change.source_platform
    });
  }

  private async syncFormUpdate(change: FormSyncOperation, supplierId: string) {
    const { error } = await this.supabase
      .from('forms')
      .update({
        ...change.data,
        updated_at: change.timestamp.toISOString()
      })
      .eq('id', change.form_id)
      .eq('supplier_id', supplierId);

    if (error) throw error;

    // Broadcast sync event
    await this.broadcastSyncEvent(supplierId, 'form_updated', {
      form_id: change.form_id,
      source: change.source_platform
    });
  }

  private async syncFormDeletion(change: FormSyncOperation, supplierId: string) {
    const { error } = await this.supabase
      .from('forms')
      .delete()
      .eq('id', change.form_id)
      .eq('supplier_id', supplierId);

    if (error) throw error;

    // Broadcast sync event
    await this.broadcastSyncEvent(supplierId, 'form_deleted', {
      form_id: change.form_id,
      source: change.source_platform
    });
  }

  private async broadcastSyncEvent(
    supplierId: string,
    eventType: string,
    data: Record<string, any>
  ) {
    const channel = this.supabase.channel(`form-sync-${supplierId}`);
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async updateSyncStatus(syncId: string, status: FormSyncOperation['status']) {
    await this.supabase
      .from('form_sync_operations')
      .update({ status })
      .eq('id', syncId);
  }

  async getSyncStatus(supplierId: string): Promise<{
    pending_operations: number;
    last_sync: string | null;
    sync_health: 'healthy' | 'warning' | 'error';
  }> {
    const { data: pending } = await this.supabase
      .from('form_sync_operations')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'pending');

    const { data: lastSync } = await this.supabase
      .from('form_sync_operations')
      .select('timestamp')
      .eq('supplier_id', supplierId)
      .eq('status', 'synced')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const { data: failedOps } = await this.supabase
      .from('form_sync_operations')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'failed')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const pendingCount = pending?.length || 0;
    const failedCount = failedOps?.length || 0;

    let syncHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    if (failedCount > 5) {
      syncHealth = 'error';
    } else if (pendingCount > 10 || failedCount > 0) {
      syncHealth = 'warning';
    }

    return {
      pending_operations: pendingCount,
      last_sync: lastSync?.timestamp || null,
      sync_health: syncHealth
    };
  }
}
```

## 🧪 REQUIRED TESTING

### Real-time Integration Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/integration/form-analytics-realtime.test.ts

describe('Form Analytics Real-time Integration', () => {
  let analyticsStream: FormAnalyticsStream;
  
  beforeEach(() => {
    analyticsStream = new FormAnalyticsStream();
  });

  afterEach(() => {
    analyticsStream.cleanup();
  });

  it('should receive real-time form analytics updates', async () => {
    const updates: FormAnalyticsMetrics[] = [];
    const supplierId = 'test-supplier';

    await analyticsStream.subscribeToFormAnalytics(
      supplierId,
      (metrics) => updates.push(metrics),
      (error) => console.error(error)
    );

    // Simulate form submission
    await analyticsStream.trackFormEvent(supplierId, 'test-form', {
      event_type: 'form_submitted',
      form_id: 'test-form',
      timestamp: new Date().toISOString()
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0].total_submissions).toBeGreaterThan(0);
  });
});
```

### Webhook Integration Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/integration/form-webhooks.test.ts

describe('Form Webhook Integration', () => {
  it('should deliver webhooks to external systems', async () => {
    const webhookManager = new FormWebhookManager();
    const mockWebhookServer = setupMockWebhookServer();

    await webhookManager.processFormSubmission(
      'test-form',
      'test-supplier',
      {
        client_email: 'test@example.com',
        wedding_date: '2025-06-15'
      }
    );

    // Verify webhook was delivered
    expect(mockWebhookServer.getReceivedWebhooks()).toHaveLength(1);
    expect(mockWebhookServer.getReceivedWebhooks()[0].event).toBe('form.submitted');
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-306-forms-system-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team C",
  "notes": "Forms integration system completed. Real-time analytics, webhook delivery, CRM integration, cross-platform synchronization."
}
```

---

**WedSync Forms Integration - Connected, Synchronized, Wedding-Smart! 🔄📊🔗**