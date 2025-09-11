# TEAM C PROMPT: Integration/CRM Development for WS-308 Customer Journey Section Overview

## 🎯 YOUR MISSION: Build Journey Integration Hub & External System Sync

You are **Team C** - the **Integration/CRM Development team**. Your mission is to create seamless integration between customer journeys and external systems including CRM platforms, email services, payment processors, and wedding vendor tools, ensuring journey actions trigger appropriate updates across all connected systems.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready integration code
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy integration endpoints

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **CRM Sync**: Bi-directional sync between journey progress and CRM client records
- [ ] **Email Integration**: Reliable delivery of 10,000+ journey emails per day
- [ ] **Webhook System**: Handle 500+ external webhooks per minute with 99.9% reliability
- [ ] **Payment Integration**: Real-time journey triggers based on payment events
- [ ] **Wedding Vendor Tools**: Connect with Tave, HoneyBook, and 5+ other platforms
- [ ] **Error Recovery**: Automatic retry and fallback for failed integrations
- [ ] **Real-time Sync**: Journey updates propagate to external systems within 30 seconds

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-308-customer-journey-section-overview-technical.md`

2. **Read Backend Implementation** (for integration points):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-308 Customer Journey Section Overview/WS-308-team-b.md`

3. **Check Existing Integrations**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/`

4. **Verify CRM Integration Code**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/tave/`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Journey-CRM Integration Strategy
```typescript
// Before building journey-CRM sync system
mcp__sequential-thinking__sequential_thinking({
  thought: "Journey-CRM integration requirements: Journey step completions update CRM client status, CRM contact changes trigger journey modifications, wedding date changes in CRM reschedule journey triggers, payment updates from Stripe sync to journey conditions, form submissions from journeys create CRM activities.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding vendor CRM systems: Tave (photography focus) needs shoot scheduling and gallery delivery tracking, HoneyBook (multi-vendor) requires project milestone updates, Light Blue (screen scraping) needs careful data extraction, 17hats needs task and invoice sync, Studio Ninja requires timeline coordination.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Bi-directional sync complexity: Journey progress updates CRM project status, CRM client changes trigger journey re-evaluation, conflicting data resolution when both systems update simultaneously, maintaining data consistency across systems, handling CRM API rate limits and downtime.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration reliability challenges: CRM APIs have different authentication methods, rate limits vary by platform, webhook delivery not guaranteed, network failures during sync operations, partial data updates causing inconsistencies, API version changes breaking integrations.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding context preservation: CRM systems must understand wedding dates and vendor relationships, journey milestone data mapped to appropriate CRM fields, client communication history synchronized bidirectionally, vendor-specific workflow stages translated between systems.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration monitoring and analytics: Track sync success rates for each CRM platform, monitor API response times and error rates, alert on failed integrations affecting active journeys, measure impact of integrations on journey completion rates, provide troubleshooting insights for vendor support.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

#### Pattern 2: Email Service Integration Analysis
```typescript
// Analyzing email integration for journey automation
mcp__sequential-thinking__sequential_thinking({
  thought: "Journey email requirements: Personalized email templates with wedding context, scheduled delivery based on wedding dates and timelines, email open/click tracking to trigger next journey steps, deliverability optimization for wedding industry domains, unsubscribe handling maintaining journey integrity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Email service integration complexity: Resend API for transactional emails with template management, webhook handling for delivery status and engagement events, bounce and complaint processing, sender reputation management for wedding vendor domains, bulk email processing during peak wedding seasons.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific email challenges: Peak season volume during May-October, couples often change email addresses during engagement, vendor branding requirements in email templates, multi-language support for destination weddings, legal compliance for wedding communication.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Email tracking and journey progression: Open rates trigger timeline progression, click events advance journey stages, unsubscribe events pause journeys, bounce handling updates client contact information, engagement scoring influences journey branch decisions.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Integration Focus)

### A. SERENA INTEGRATION ANALYSIS
```typescript
// Activate WedSync project context
await mcp__serena__activate_project("WedSync2");

// Find existing integration patterns and APIs
await mcp__serena__find_symbol("integration webhook sync", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
await mcp__serena__search_for_pattern("CRM API client authentication");

// Analyze journey integration points
await mcp__serena__find_referencing_symbols("journey external system");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/tave/", 1, -1);
```

### B. INTEGRATION DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "Tave API integration photography CRM"
# - "HoneyBook API project management webhook"
# - "Resend email API transactional templates"
# - "Stripe webhook integration payment events"
# - "Wedding vendor CRM integration patterns"
# - "API rate limiting best practices"
```

## 🎯 CORE INTEGRATION DELIVERABLES

### 1. JOURNEY INTEGRATION ORCHESTRATOR

#### A. Integration Management System
```typescript
// File: /wedsync/src/lib/integrations/journey-integration-orchestrator.ts
import { EventEmitter } from 'events';
import { createClient } from '@/lib/supabase/server';
import { Redis } from 'ioredis';

export interface IntegrationConfig {
  id: string;
  type: 'crm' | 'email' | 'payment' | 'calendar' | 'webhook';
  name: string;
  credentials: Record<string, any>;
  settings: {
    enabled: boolean;
    sync_direction: 'inbound' | 'outbound' | 'bidirectional';
    rate_limit: number;
    retry_attempts: number;
    timeout_ms: number;
  };
  field_mappings: FieldMapping[];
}

export interface FieldMapping {
  source_field: string;
  target_field: string;
  transformation?: string;
  sync_condition?: string;
}

export interface JourneyIntegrationEvent {
  event_type: 'step_completed' | 'journey_started' | 'journey_completed' | 'client_updated';
  journey_instance_id: string;
  client_id: string;
  step_data: any;
  context: {
    wedding_date?: string;
    vendor_type?: string;
    journey_name: string;
    client_email: string;
    client_name: string;
  };
  timestamp: Date;
}

export class JourneyIntegrationOrchestrator extends EventEmitter {
  private supabase = createClient();
  private redis: Redis;
  private integrations = new Map<string, IntegrationConfig>();
  private integrationClients = new Map<string, any>();

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeIntegrations();
  }

  /**
   * Initialize and load all active integrations
   */
  private async initializeIntegrations(): Promise<void> {
    try {
      const { data: configs } = await this.supabase
        .from('integration_configurations')
        .select('*')
        .eq('enabled', true);

      if (configs) {
        for (const config of configs) {
          await this.loadIntegration(config);
        }
      }

      console.log(`Loaded ${this.integrations.size} active integrations`);
    } catch (error) {
      console.error('Failed to initialize integrations:', error);
    }
  }

  /**
   * Load a specific integration
   */
  private async loadIntegration(config: any): Promise<void> {
    try {
      const integrationConfig: IntegrationConfig = {
        id: config.id,
        type: config.integration_type,
        name: config.name,
        credentials: config.credentials,
        settings: config.settings,
        field_mappings: config.field_mappings || [],
      };

      this.integrations.set(config.id, integrationConfig);

      // Initialize integration client
      const client = await this.createIntegrationClient(integrationConfig);
      if (client) {
        this.integrationClients.set(config.id, client);
        console.log(`Loaded integration: ${config.name} (${config.integration_type})`);
      }
    } catch (error) {
      console.error(`Failed to load integration ${config.name}:`, error);
    }
  }

  /**
   * Create integration client based on type
   */
  private async createIntegrationClient(config: IntegrationConfig): Promise<any> {
    switch (config.type) {
      case 'crm':
        return this.createCRMClient(config);
      case 'email':
        return this.createEmailClient(config);
      case 'payment':
        return this.createPaymentClient(config);
      case 'calendar':
        return this.createCalendarClient(config);
      case 'webhook':
        return this.createWebhookClient(config);
      default:
        throw new Error(`Unknown integration type: ${config.type}`);
    }
  }

  /**
   * Handle journey integration events
   */
  async handleJourneyEvent(event: JourneyIntegrationEvent): Promise<void> {
    console.log(`Processing journey integration event: ${event.event_type}`);

    // Get applicable integrations for this event
    const applicableIntegrations = Array.from(this.integrations.values())
      .filter(integration => this.shouldProcessEvent(integration, event));

    // Process each integration
    const processPromises = applicableIntegrations.map(async (integration) => {
      try {
        await this.processIntegrationEvent(integration, event);
      } catch (error) {
        console.error(`Integration ${integration.name} failed:`, error);
        await this.handleIntegrationError(integration, event, error);
      }
    });

    await Promise.allSettled(processPromises);
  }

  /**
   * Process event for a specific integration
   */
  private async processIntegrationEvent(
    integration: IntegrationConfig,
    event: JourneyIntegrationEvent
  ): Promise<void> {
    const client = this.integrationClients.get(integration.id);
    if (!client) {
      throw new Error(`No client available for integration: ${integration.name}`);
    }

    // Transform data based on field mappings
    const transformedData = await this.transformEventData(integration, event);

    // Execute integration-specific logic
    switch (integration.type) {
      case 'crm':
        await this.processCRMEvent(client, integration, transformedData);
        break;
      case 'email':
        await this.processEmailEvent(client, integration, transformedData);
        break;
      case 'payment':
        await this.processPaymentEvent(client, integration, transformedData);
        break;
      case 'calendar':
        await this.processCalendarEvent(client, integration, transformedData);
        break;
      case 'webhook':
        await this.processWebhookEvent(client, integration, transformedData);
        break;
    }

    // Log successful integration
    await this.logIntegrationEvent(integration.id, event, 'success');
  }

  /**
   * Process CRM integration events
   */
  private async processCRMEvent(
    client: any,
    integration: IntegrationConfig,
    data: any
  ): Promise<void> {
    const { event_type, client_id, context } = data;

    switch (event_type) {
      case 'journey_started':
        await client.createOrUpdateContact({
          external_id: client_id,
          name: context.client_name,
          email: context.client_email,
          status: 'journey_started',
          wedding_date: context.wedding_date,
          project_type: 'wedding',
        });
        break;

      case 'step_completed':
        await client.addActivity({
          contact_id: client_id,
          activity_type: 'journey_step',
          subject: `Journey Step Completed: ${data.step_data.step_name}`,
          description: `Client completed "${data.step_data.step_name}" in journey "${context.journey_name}"`,
          completed_at: new Date(),
        });
        break;

      case 'journey_completed':
        await client.updateContactStatus({
          external_id: client_id,
          status: 'journey_completed',
          completion_date: new Date(),
        });
        break;

      case 'client_updated':
        await client.syncClientData({
          external_id: client_id,
          updates: data.client_changes,
        });
        break;
    }
  }

  /**
   * Process email integration events
   */
  private async processEmailEvent(
    client: any,
    integration: IntegrationConfig,
    data: any
  ): Promise<void> {
    const { event_type, context, step_data } = data;

    if (event_type === 'step_completed' && step_data.step_type === 'email') {
      // Track email delivery status
      await client.trackEmailDelivery({
        message_id: step_data.email_id,
        recipient: context.client_email,
        journey_context: {
          journey_name: context.journey_name,
          client_name: context.client_name,
          wedding_date: context.wedding_date,
        },
      });
    }
  }

  /**
   * Process webhook integration events
   */
  private async processWebhookEvent(
    client: any,
    integration: IntegrationConfig,
    data: any
  ): Promise<void> {
    // Send webhook payload to configured endpoint
    await client.sendWebhook({
      url: integration.settings.webhook_url,
      payload: {
        event_type: data.event_type,
        journey_data: data,
        timestamp: new Date().toISOString(),
        signature: await this.generateWebhookSignature(data),
      },
    });
  }

  /**
   * Create CRM client based on CRM type
   */
  private async createCRMClient(config: IntegrationConfig): Promise<any> {
    const crmType = config.name.toLowerCase();

    switch (crmType) {
      case 'tave':
        const { TaveClient } = await import('@/lib/integrations/tave');
        return new TaveClient(config.credentials);

      case 'honeybook':
        const { HoneyBookClient } = await import('@/lib/integrations/honeybook');
        return new HoneyBookClient(config.credentials);

      case 'light-blue':
        const { LightBlueClient } = await import('@/lib/integrations/light-blue');
        return new LightBlueClient(config.credentials);

      case '17hats':
        const { SeventeenHatsClient } = await import('@/lib/integrations/17hats');
        return new SeventeenHatsClient(config.credentials);

      default:
        throw new Error(`Unsupported CRM type: ${crmType}`);
    }
  }

  /**
   * Create email client
   */
  private async createEmailClient(config: IntegrationConfig): Promise<any> {
    const { ResendClient } = await import('@/lib/integrations/resend');
    return new ResendClient(config.credentials);
  }

  /**
   * Create payment client
   */
  private async createPaymentClient(config: IntegrationConfig): Promise<any> {
    const { StripeClient } = await import('@/lib/integrations/stripe');
    return new StripeClient(config.credentials);
  }

  /**
   * Create calendar client
   */
  private async createCalendarClient(config: IntegrationConfig): Promise<any> {
    const { GoogleCalendarClient } = await import('@/lib/integrations/google-calendar');
    return new GoogleCalendarClient(config.credentials);
  }

  /**
   * Create webhook client
   */
  private async createWebhookClient(config: IntegrationConfig): Promise<any> {
    const { WebhookClient } = await import('@/lib/integrations/webhook');
    return new WebhookClient(config.credentials);
  }

  /**
   * Transform event data based on field mappings
   */
  private async transformEventData(
    integration: IntegrationConfig,
    event: JourneyIntegrationEvent
  ): Promise<any> {
    const transformedData = { ...event };

    // Apply field mappings
    for (const mapping of integration.field_mappings) {
      const sourceValue = this.getNestedValue(event, mapping.source_field);
      if (sourceValue !== undefined) {
        if (mapping.transformation) {
          transformedData[mapping.target_field] = await this.applyTransformation(
            sourceValue,
            mapping.transformation
          );
        } else {
          transformedData[mapping.target_field] = sourceValue;
        }
      }
    }

    return transformedData;
  }

  /**
   * Check if integration should process this event
   */
  private shouldProcessEvent(
    integration: IntegrationConfig,
    event: JourneyIntegrationEvent
  ): boolean {
    // Check if integration is enabled
    if (!integration.settings.enabled) return false;

    // Check sync direction
    if (integration.settings.sync_direction === 'inbound') return false;

    // Additional filtering logic can be added here
    return true;
  }

  /**
   * Handle integration errors
   */
  private async handleIntegrationError(
    integration: IntegrationConfig,
    event: JourneyIntegrationEvent,
    error: any
  ): Promise<void> {
    console.error(`Integration error for ${integration.name}:`, error);

    // Log error
    await this.logIntegrationEvent(integration.id, event, 'failed', error.message);

    // Implement retry logic
    const retryAttempts = integration.settings.retry_attempts || 3;
    await this.scheduleRetry(integration, event, retryAttempts);

    // Emit error event
    this.emit('integration_error', {
      integration: integration.name,
      event_type: event.event_type,
      error: error.message,
    });
  }

  /**
   * Log integration events
   */
  private async logIntegrationEvent(
    integrationId: string,
    event: JourneyIntegrationEvent,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    await this.supabase
      .from('journey_integration_logs')
      .insert({
        integration_id: integrationId,
        journey_instance_id: event.journey_instance_id,
        event_type: event.event_type,
        status,
        error_message: errorMessage,
        processed_at: new Date(),
      });
  }

  /**
   * Schedule retry for failed integration
   */
  private async scheduleRetry(
    integration: IntegrationConfig,
    event: JourneyIntegrationEvent,
    attemptsLeft: number
  ): Promise<void> {
    if (attemptsLeft <= 0) return;

    const delay = Math.pow(2, 3 - attemptsLeft) * 1000; // Exponential backoff
    
    setTimeout(async () => {
      try {
        await this.processIntegrationEvent(integration, event);
      } catch (error) {
        await this.scheduleRetry(integration, event, attemptsLeft - 1);
      }
    }, delay);
  }

  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private async applyTransformation(value: any, transformation: string): Promise<any> {
    // Implementation for data transformations
    switch (transformation) {
      case 'date_format':
        return new Date(value).toISOString().split('T')[0];
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      default:
        return value;
    }
  }

  private async generateWebhookSignature(data: any): Promise<string> {
    // Generate HMAC signature for webhook security
    const crypto = await import('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Add new integration configuration
   */
  async addIntegration(config: Omit<IntegrationConfig, 'id'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('integration_configurations')
      .insert(config)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add integration: ${error.message}`);
    }

    await this.loadIntegration(data);
    return data.id;
  }

  /**
   * Update existing integration configuration
   */
  async updateIntegration(id: string, updates: Partial<IntegrationConfig>): Promise<void> {
    const { error } = await this.supabase
      .from('integration_configurations')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    // Reload integration
    const { data } = await this.supabase
      .from('integration_configurations')
      .select()
      .eq('id', id)
      .single();

    if (data) {
      await this.loadIntegration(data);
    }
  }

  /**
   * Remove integration
   */
  async removeIntegration(id: string): Promise<void> {
    await this.supabase
      .from('integration_configurations')
      .delete()
      .eq('id', id);

    this.integrations.delete(id);
    this.integrationClients.delete(id);
  }

  /**
   * Test integration connection
   */
  async testIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return { success: false, message: 'Integration not found' };
    }

    const client = this.integrationClients.get(id);
    if (!client) {
      return { success: false, message: 'Integration client not initialized' };
    }

    try {
      // Attempt to test the connection based on integration type
      if (typeof client.testConnection === 'function') {
        await client.testConnection();
        return { success: true, message: 'Connection successful' };
      } else {
        return { success: true, message: 'Integration loaded successfully' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
export const journeyIntegrationOrchestrator = new JourneyIntegrationOrchestrator();
```

#### B. Tave CRM Integration Client
```typescript
// File: /wedsync/src/lib/integrations/tave/tave-journey-client.ts
import { AxiosInstance } from 'axios';
import { BaseTaveClient } from './base-client';

export interface TaveContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  wedding_date?: string;
  project_type: string;
  custom_fields: Record<string, any>;
}

export interface TaveActivity {
  id: string;
  contact_id: string;
  activity_type: string;
  subject: string;
  description: string;
  completed_at: Date;
  created_by: string;
}

export interface TaveProject {
  id: string;
  contact_id: string;
  name: string;
  status: string;
  event_date?: string;
  project_type: string;
  custom_fields: Record<string, any>;
}

export class TaveJourneyClient extends BaseTaveClient {
  /**
   * Create or update a contact based on journey data
   */
  async createOrUpdateContact(contactData: {
    external_id: string;
    name: string;
    email: string;
    status: string;
    wedding_date?: string;
    project_type: string;
  }): Promise<TaveContact> {
    
    // First, try to find existing contact
    const existingContact = await this.findContactByExternalId(contactData.external_id);
    
    if (existingContact) {
      return this.updateContact(existingContact.id, contactData);
    } else {
      return this.createContact(contactData);
    }
  }

  /**
   * Find contact by external ID (WedSync client ID)
   */
  private async findContactByExternalId(externalId: string): Promise<TaveContact | null> {
    try {
      const response = await this.client.get('/contacts', {
        params: {
          custom_field_wedsync_id: externalId,
          limit: 1,
        },
      });

      return response.data.contacts[0] || null;
    } catch (error) {
      console.error('Error finding Tave contact:', error);
      return null;
    }
  }

  /**
   * Create new contact in Tave
   */
  private async createContact(contactData: any): Promise<TaveContact> {
    const taveContact = {
      name: contactData.name,
      email: contactData.email,
      status: this.mapJourneyStatusToTave(contactData.status),
      custom_fields: {
        wedsync_id: contactData.external_id,
        wedding_date: contactData.wedding_date,
        project_type: contactData.project_type,
        journey_status: contactData.status,
      },
    };

    const response = await this.client.post('/contacts', taveContact);
    
    // Also create associated project
    if (contactData.project_type === 'wedding') {
      await this.createWeddingProject(response.data.id, contactData);
    }

    return response.data;
  }

  /**
   * Update existing contact in Tave
   */
  private async updateContact(contactId: string, contactData: any): Promise<TaveContact> {
    const updateData = {
      name: contactData.name,
      email: contactData.email,
      status: this.mapJourneyStatusToTave(contactData.status),
      custom_fields: {
        wedding_date: contactData.wedding_date,
        journey_status: contactData.status,
        last_journey_update: new Date().toISOString(),
      },
    };

    const response = await this.client.put(`/contacts/${contactId}`, updateData);
    return response.data;
  }

  /**
   * Add activity record for journey step completion
   */
  async addActivity(activityData: {
    contact_id: string;
    activity_type: string;
    subject: string;
    description: string;
    completed_at: Date;
  }): Promise<TaveActivity> {
    
    // Find Tave contact by WedSync client ID
    const taveContact = await this.findContactByExternalId(activityData.contact_id);
    if (!taveContact) {
      throw new Error(`Tave contact not found for client ID: ${activityData.contact_id}`);
    }

    const taveActivity = {
      contact_id: taveContact.id,
      activity_type: this.mapActivityType(activityData.activity_type),
      subject: activityData.subject,
      description: activityData.description,
      completed_at: activityData.completed_at.toISOString(),
      category: 'journey_automation',
    };

    const response = await this.client.post('/activities', taveActivity);
    return response.data;
  }

  /**
   * Update contact status based on journey completion
   */
  async updateContactStatus(statusData: {
    external_id: string;
    status: string;
    completion_date?: Date;
  }): Promise<void> {
    
    const taveContact = await this.findContactByExternalId(statusData.external_id);
    if (!taveContact) {
      throw new Error(`Tave contact not found for client ID: ${statusData.external_id}`);
    }

    const updateData = {
      status: this.mapJourneyStatusToTave(statusData.status),
      custom_fields: {
        journey_completed_at: statusData.completion_date?.toISOString(),
        journey_status: statusData.status,
      },
    };

    await this.client.put(`/contacts/${taveContact.id}`, updateData);

    // Also update associated project
    await this.updateProjectStatus(taveContact.id, statusData.status);
  }

  /**
   * Sync client data changes from WedSync to Tave
   */
  async syncClientData(syncData: {
    external_id: string;
    updates: Record<string, any>;
  }): Promise<void> {
    
    const taveContact = await this.findContactByExternalId(syncData.external_id);
    if (!taveContact) {
      throw new Error(`Tave contact not found for client ID: ${syncData.external_id}`);
    }

    // Map WedSync fields to Tave fields
    const taveUpdates = this.mapClientDataToTave(syncData.updates);
    
    await this.client.put(`/contacts/${taveContact.id}`, taveUpdates);
  }

  /**
   * Create wedding project in Tave
   */
  private async createWeddingProject(contactId: string, projectData: any): Promise<TaveProject> {
    const taveProject = {
      contact_id: contactId,
      name: `${projectData.name} Wedding`,
      project_type: 'wedding',
      event_date: projectData.wedding_date,
      status: 'in_progress',
      custom_fields: {
        wedsync_journey_id: projectData.journey_id,
        automated_workflow: true,
      },
    };

    const response = await this.client.post('/projects', taveProject);
    return response.data;
  }

  /**
   * Update project status based on journey progress
   */
  private async updateProjectStatus(contactId: string, journeyStatus: string): Promise<void> {
    try {
      // Find project for this contact
      const projectsResponse = await this.client.get('/projects', {
        params: { contact_id: contactId, limit: 1 },
      });

      const project = projectsResponse.data.projects[0];
      if (project) {
        const projectStatus = this.mapJourneyStatusToProjectStatus(journeyStatus);
        await this.client.put(`/projects/${project.id}`, {
          status: projectStatus,
          custom_fields: {
            journey_status: journeyStatus,
            last_journey_update: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error updating Tave project status:', error);
    }
  }

  /**
   * Map journey status to Tave contact status
   */
  private mapJourneyStatusToTave(journeyStatus: string): string {
    const statusMapping = {
      journey_started: 'lead',
      in_progress: 'client',
      journey_completed: 'completed',
      journey_paused: 'on_hold',
      journey_failed: 'lost',
    };

    return statusMapping[journeyStatus] || 'lead';
  }

  /**
   * Map journey activity type to Tave activity type
   */
  private mapActivityType(activityType: string): string {
    const typeMapping = {
      journey_step: 'note',
      email_sent: 'email',
      form_completed: 'form_submission',
      payment_received: 'payment',
    };

    return typeMapping[activityType] || 'note';
  }

  /**
   * Map journey status to Tave project status
   */
  private mapJourneyStatusToProjectStatus(journeyStatus: string): string {
    const statusMapping = {
      journey_started: 'in_progress',
      in_progress: 'in_progress',
      journey_completed: 'completed',
      journey_paused: 'on_hold',
      journey_failed: 'cancelled',
    };

    return statusMapping[journeyStatus] || 'in_progress';
  }

  /**
   * Map WedSync client data to Tave format
   */
  private mapClientDataToTave(updates: Record<string, any>): Record<string, any> {
    const taveUpdates: Record<string, any> = {};

    // Map common fields
    if (updates.name) taveUpdates.name = updates.name;
    if (updates.email) taveUpdates.email = updates.email;
    if (updates.phone) taveUpdates.phone = updates.phone;
    
    // Map custom fields
    taveUpdates.custom_fields = {
      ...updates.custom_fields,
      last_sync_from_wedsync: new Date().toISOString(),
    };

    // Map wedding-specific data
    if (updates.wedding_date) {
      taveUpdates.custom_fields.wedding_date = updates.wedding_date;
    }

    if (updates.guest_count) {
      taveUpdates.custom_fields.guest_count = updates.guest_count;
    }

    if (updates.venue) {
      taveUpdates.custom_fields.venue_name = updates.venue.name;
      taveUpdates.custom_fields.venue_address = updates.venue.address;
    }

    return taveUpdates;
  }

  /**
   * Test Tave connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/user/profile');
      return response.status === 200;
    } catch (error) {
      console.error('Tave connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Tave integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    api_response_time: number;
    last_sync: Date | null;
    error_count: number;
  }> {
    const startTime = Date.now();
    
    try {
      await this.testConnection();
      const responseTime = Date.now() - startTime;
      
      // Get last sync time from logs
      const { data: lastSync } = await this.supabase
        .from('journey_integration_logs')
        .select('processed_at')
        .eq('integration_type', 'tave')
        .eq('status', 'success')
        .order('processed_at', { ascending: false })
        .limit(1)
        .single();

      // Get error count from last 24 hours
      const { count: errorCount } = await this.supabase
        .from('journey_integration_logs')
        .select('id', { count: 'exact' })
        .eq('integration_type', 'tave')
        .eq('status', 'failed')
        .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      return {
        connected: true,
        api_response_time: responseTime,
        last_sync: lastSync?.processed_at ? new Date(lastSync.processed_at) : null,
        error_count: errorCount || 0,
      };
    } catch (error) {
      return {
        connected: false,
        api_response_time: -1,
        last_sync: null,
        error_count: -1,
      };
    }
  }
}
```

### 2. WEBHOOK SYSTEM FOR EXTERNAL INTEGRATIONS

#### A. Incoming Webhook Handler
```typescript
// File: /wedsync/src/app/api/webhooks/integrations/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { journeyIntegrationOrchestrator } from '@/lib/integrations/journey-integration-orchestrator';
import { verifyWebhookSignature } from '@/lib/utils/webhook-security';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const source = request.headers.get('x-webhook-source');
    
    if (!source) {
      return NextResponse.json(
        { error: 'Missing webhook source header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, source)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    
    // Route to appropriate webhook handler
    switch (source) {
      case 'stripe':
        await handleStripeWebhook(payload);
        break;
      case 'resend':
        await handleResendWebhook(payload);
        break;
      case 'tave':
        await handleTaveWebhook(payload);
        break;
      case 'honeybook':
        await handleHoneyBookWebhook(payload);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported webhook source: ${source}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle Stripe payment webhooks
 */
async function handleStripeWebhook(payload: any): Promise<void> {
  const { type, data } = payload;

  switch (type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePayment(data.object);
      break;
  }
}

/**
 * Handle Resend email webhooks
 */
async function handleResendWebhook(payload: any): Promise<void> {
  const { type, data } = payload;

  switch (type) {
    case 'email.delivered':
      await handleEmailDelivered(data);
      break;
    case 'email.opened':
      await handleEmailOpened(data);
      break;
    case 'email.clicked':
      await handleEmailClicked(data);
      break;
    case 'email.bounced':
      await handleEmailBounced(data);
      break;
  }
}

/**
 * Handle Tave CRM webhooks
 */
async function handleTaveWebhook(payload: any): Promise<void> {
  const { event_type, data } = payload;

  switch (event_type) {
    case 'contact.updated':
      await handleTaveContactUpdate(data);
      break;
    case 'project.status_changed':
      await handleTaveProjectUpdate(data);
      break;
  }
}

/**
 * Handle payment success - trigger journey progression
 */
async function handlePaymentSuccess(paymentIntent: any): Promise<void> {
  const clientId = paymentIntent.metadata?.client_id;
  if (!clientId) return;

  await journeyIntegrationOrchestrator.handleJourneyEvent({
    event_type: 'payment_received',
    journey_instance_id: '', // Will be resolved by orchestrator
    client_id: clientId,
    step_data: {
      payment_amount: paymentIntent.amount,
      payment_currency: paymentIntent.currency,
      payment_method: paymentIntent.payment_method,
    },
    context: {
      journey_name: 'Payment Triggered Journey',
      client_email: paymentIntent.receipt_email,
      client_name: paymentIntent.metadata?.client_name || 'Unknown',
    },
    timestamp: new Date(),
  });
}

/**
 * Handle email delivered event
 */
async function handleEmailDelivered(emailData: any): Promise<void> {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Update email delivery status in database
  await supabase
    .from('journey_email_logs')
    .update({
      status: 'delivered',
      delivered_at: new Date(),
    })
    .eq('message_id', emailData.id);
}

/**
 * Handle email opened event - can trigger next journey step
 */
async function handleEmailOpened(emailData: any): Promise<void> {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Update email status
  await supabase
    .from('journey_email_logs')
    .update({
      status: 'opened',
      opened_at: new Date(),
    })
    .eq('message_id', emailData.id);

  // Check if this email open should trigger journey progression
  const { data: emailLog } = await supabase
    .from('journey_email_logs')
    .select('*')
    .eq('message_id', emailData.id)
    .single();

  if (emailLog?.trigger_on_open) {
    await journeyIntegrationOrchestrator.handleJourneyEvent({
      event_type: 'email_opened',
      journey_instance_id: emailLog.journey_instance_id,
      client_id: emailLog.client_id,
      step_data: {
        email_id: emailData.id,
        opened_at: new Date(),
      },
      context: {
        journey_name: emailLog.journey_name,
        client_email: emailLog.client_email,
        client_name: emailLog.client_name,
      },
      timestamp: new Date(),
    });
  }
}
```

## 🔒 SECURITY & RELIABILITY REQUIREMENTS

### 1. Integration Security Checklist
- [ ] **API Authentication**: Secure credential management for all external services
- [ ] **Webhook Verification**: HMAC signature validation for all incoming webhooks
- [ ] **Rate Limiting**: Protection against API abuse and excessive requests
- [ ] **Data Encryption**: Sensitive integration data encrypted at rest and in transit
- [ ] **Access Control**: RBAC for integration configuration and management
- [ ] **Audit Logging**: Complete logging of all integration operations
- [ ] **Error Handling**: No sensitive data exposed in error messages
- [ ] **Token Refresh**: Automatic OAuth token refresh for supported platforms
- [ ] **Circuit Breakers**: Protection against external service failures
- [ ] **Input Validation**: All webhook and API data properly validated

### 2. Reliability & Performance Standards
- [ ] **High Availability**: 99.9% uptime for integration processing
- [ ] **Error Recovery**: Automatic retry with exponential backoff
- [ ] **Dead Letter Queues**: Handling of permanently failed integration events
- [ ] **Real-time Processing**: Integration events processed within 30 seconds
- [ ] **Batch Processing**: Efficient handling of bulk integration operations
- [ ] **Health Monitoring**: Continuous monitoring of external service health
- [ ] **Failover Mechanisms**: Graceful degradation when services are unavailable
- [ ] **Data Consistency**: Eventual consistency across all integrated systems
- [ ] **Performance Metrics**: Monitoring of API response times and success rates
- [ ] **Scalability**: Handle peak wedding season integration volumes

## 🎯 TYPICAL INTEGRATION DELIVERABLES WITH EVIDENCE

### Core Integration Infrastructure
- [ ] **Journey Integration Orchestrator** (Evidence: Handles 500+ webhooks/minute)
- [ ] **CRM Client Libraries** (Show: Tave, HoneyBook, 17hats integration working)
- [ ] **Webhook Processing System** (Test: Reliable handling of external webhooks)
- [ ] **Error Recovery System** (Verify: Failed integrations automatically retry)
- [ ] **Integration Health Monitoring** (Metrics: Real-time status of all integrations)
- [ ] **Field Mapping Engine** (Demo: Flexible data transformation between systems)

### Wedding-Specific Integrations
- [ ] **Wedding CRM Sync** (Evidence: Bi-directional data sync with wedding context)
- [ ] **Email Service Integration** (Show: 10,000+ wedding emails delivered daily)
- [ ] **Payment Event Processing** (Test: Stripe webhooks trigger journey progression)
- [ ] **Calendar Integration** (Demo: Wedding timeline sync with Google Calendar)
- [ ] **Vendor Tool Connections** (Verify: Multi-platform wedding vendor integration)
- [ ] **Wedding Data Preservation** (Show: Wedding context maintained across all systems)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### Integration Functionality
1. **CRM Bi-directional Sync**: Journey progress updates CRM records and vice versa
2. **Real-time Processing**: Integration events processed within 30 seconds
3. **Webhook Reliability**: 99.9% successful handling of incoming webhooks
4. **Error Recovery**: Failed integrations automatically retry with exponential backoff
5. **Wedding Context**: Wedding-specific data preserved across all integrations

### System Performance
6. **High Volume Handling**: Process 500+ webhooks per minute during peak times
7. **API Rate Limiting**: Respect external service rate limits without data loss
8. **Health Monitoring**: Real-time monitoring of all integration endpoints
9. **Data Consistency**: Eventual consistency maintained across all systems
10. **Circuit Breakers**: Graceful handling of external service outages

### Wedding Industry Requirements
11. **Vendor Platform Support**: Integration with 5+ major wedding vendor platforms
12. **Email Deliverability**: 95%+ delivery rate for wedding communication emails
13. **Payment Processing**: Real-time journey triggers from payment events
14. **Wedding Timeline Sync**: Calendar integrations maintain wedding schedule accuracy
15. **Data Security**: All wedding data encrypted and securely transmitted

**🎯 REMEMBER**: You're building the integration bridge that connects automated journey workflows with the wedding vendor's existing tools. Every integration must be rock-solid because a failed sync could mean a missed payment reminder, lost client communication, or incomplete wedding planning coordination.

**Wedding Context**: Wedding vendors rely on multiple software platforms simultaneously - their CRM for client management, email service for communication, calendar for scheduling, and payment system for transactions. Your integration system ensures all these platforms stay synchronized with automated journey progress, eliminating manual data entry and preventing critical information gaps.