# TEAM C PROMPT: Integration/CRM Development for WS-307 Field Types Overview

## 🎯 YOUR MISSION: Build Wedding CRM Integration & Field Data Sync

You are **Team C** - the **Integration/CRM Development team**. Your mission is to build seamless integration between wedding-specific form fields and external CRM systems, ensuring field data flows perfectly across all wedding coordination platforms.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready integration code
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy integration endpoints

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **CRM Sync Speed**: Field data sync completes in <2 seconds across all integrations
- [ ] **Data Accuracy**: 100% field mapping accuracy between WedSync and external CRMs
- [ ] **Real-time Updates**: Field changes propagate to CRMs within 5 seconds
- [ ] **Sync Reliability**: 99.9% success rate for field data synchronization
- [ ] **Wedding Context**: All field data maintains wedding-specific context in CRMs
- [ ] **Conflict Resolution**: Smart handling of data conflicts across systems
- [ ] **Offline Support**: Field data queued and synced when connectivity restored

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-307-field-types-overview-technical.md`

2. **Read UI Components** (for integration context):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-307 Field Types Overview/WS-307-team-a.md`

3. **Read Backend APIs** (for data flow understanding):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-307 Field Types Overview/WS-307-team-b.md`

4. **Check Existing Integrations**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: CRM Integration Strategy Analysis
```typescript
// Before building CRM field integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding field CRM integration requirements: Tave photography CRM needs client data with guest count and timeline, HoneyBook needs project details with venue and budget info, Light Blue requires comprehensive wedding data, Google Calendar integration for timeline events, Stripe for payment field data.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Field mapping complexity: Guest count matrix → CRM client records, wedding date → project timelines, venue selector → project locations, dietary matrix → catering notes, timeline builder → calendar events, budget categories → project financials. Each CRM has different field structures.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time sync challenges: Field changes in form builder must update across multiple CRMs, user editing guest count should sync to Tave client record, timeline changes need Google Calendar updates, venue changes require location updates in all systems, conflict resolution when data differs.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding context preservation: Field data must maintain wedding-specific meaning in CRMs, guest count stays as adults/children/infants breakdown, timeline events preserve wedding day structure, vendor relationships maintained across systems, client communication history linked to specific fields.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Error handling strategies: CRM API failures during field sync, network connectivity issues during real-time updates, data format mismatches between systems, authentication token expiration, rate limiting from external APIs, partial sync recovery mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Event-driven field sync using webhooks, queue-based processing for reliability, transformation layer for field mapping, conflict resolution algorithms, audit logging for sync operations, fallback mechanisms for each CRM, monitoring and alerting for integration health.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

#### Pattern 2: Wedding Data Flow Analysis
```typescript
// Analyzing wedding-specific data synchronization
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding data flow complexity: Form field data → WedSync database → transformation layer → multiple CRM endpoints. Each field type has different sync requirements: guest count needs immediate sync for catering, timeline changes affect multiple vendor schedules, venue changes impact all location-dependent services.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Sync priority levels: Critical fields (wedding date, venue, guest count) need immediate sync, important fields (timeline, budget) sync within minutes, optional fields (preferences, notes) can batch sync hourly. Wedding day approach increases sync frequency for critical fields.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding timeline sensitivity: Changes to wedding timeline must propagate to all vendor calendars immediately, guest count changes affect catering orders and seating arrangements, venue changes require notification to all vendors, budget updates need accounting system sync.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data consistency requirements: All systems must show same guest count for catering accuracy, timeline conflicts prevented across vendor schedules, venue capacity validated against guest count in all CRMs, payment status consistent between Stripe and accounting systems.",
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
await mcp__serena__find_symbol("webhook subscription realtime", "", true);
await mcp__serena__search_for_pattern("external service third-party API");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");

// Analyze data flow between systems
await mcp__serena__find_symbol("sync transform migrate", "", true);
await mcp__serena__find_referencing_symbols("crm integration mapping");
```

### B. INTEGRATION DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "Supabase realtime-subscriptions broadcast"
# - "Stripe webhooks events"
# - "Next.js server-sent-events websocket"
# - "Tave API integration photography CRM"
# - "HoneyBook API webhook integration"
# - "Google Calendar API sync events"
```

## 🎯 CORE INTEGRATION DELIVERABLES

### 1. CRM INTEGRATION FRAMEWORK

#### A. Integration Service Architecture
```typescript
// File: /wedsync/src/lib/integrations/crm-field-sync/integration-manager.ts
import { EventEmitter } from 'events';
import { createClient } from '@/lib/supabase/server';

export interface FieldSyncEvent {
  field_id: string;
  field_type: string;
  old_value: any;
  new_value: any;
  organization_id: string;
  wedding_id: string;
  user_id: string;
  timestamp: Date;
}

export interface CRMIntegration {
  name: string;
  id: string;
  syncFieldValue(event: FieldSyncEvent): Promise<SyncResult>;
  mapFieldToExternalFormat(fieldType: string, value: any): any;
  validateConnection(): Promise<boolean>;
  getFieldMappings(): FieldMappingConfig[];
}

export interface SyncResult {
  success: boolean;
  external_id?: string;
  error?: string;
  retry_after?: number;
}

export interface FieldMappingConfig {
  wedsync_field_type: string;
  external_field_name: string;
  transformation_function?: string;
  is_bidirectional: boolean;
  sync_priority: 'critical' | 'important' | 'optional';
}

export class CRMFieldSyncManager extends EventEmitter {
  private integrations: Map<string, CRMIntegration> = new Map();
  private syncQueue: FieldSyncEvent[] = [];
  private processing: boolean = false;

  constructor() {
    super();
    this.initializeIntegrations();
  }

  /**
   * Register CRM integrations
   */
  private async initializeIntegrations() {
    // Register available integrations
    const { TaveIntegration } = await import('./tave-integration');
    const { HoneyBookIntegration } = await import('./honeybook-integration');
    const { GoogleCalendarIntegration } = await import('./google-calendar-integration');
    
    this.integrations.set('tave', new TaveIntegration());
    this.integrations.set('honeybook', new HoneyBookIntegration());
    this.integrations.set('google_calendar', new GoogleCalendarIntegration());
  }

  /**
   * Handle field value changes
   */
  async onFieldChange(event: FieldSyncEvent): Promise<void> {
    // Add to sync queue
    this.syncQueue.push(event);
    
    // Emit event for real-time subscribers
    this.emit('field_changed', event);
    
    // Process queue if not already processing
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Process sync queue with priority handling
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.syncQueue.length === 0) return;
    
    this.processing = true;
    
    try {
      // Sort by priority
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, important: 1, optional: 2 };
        const aPriority = this.getFieldPriority(a.field_type);
        const bPriority = this.getFieldPriority(b.field_type);
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });

      // Process events
      while (this.syncQueue.length > 0) {
        const event = this.syncQueue.shift()!;
        await this.syncFieldToIntegrations(event);
      }
      
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Sync field to all configured integrations
   */
  private async syncFieldToIntegrations(event: FieldSyncEvent): Promise<void> {
    const supabase = createClient();
    
    // Get organization's active integrations
    const { data: orgIntegrations } = await supabase
      .from('organization_integrations')
      .select('integration_type, config, is_active')
      .eq('organization_id', event.organization_id)
      .eq('is_active', true);

    if (!orgIntegrations) return;

    // Sync to each integration
    for (const orgIntegration of orgIntegrations) {
      const integration = this.integrations.get(orgIntegration.integration_type);
      if (!integration) continue;

      try {
        const result = await integration.syncFieldValue(event);
        
        // Log sync result
        await this.logSyncResult(event, orgIntegration.integration_type, result);
        
        if (!result.success && result.retry_after) {
          // Schedule retry
          setTimeout(() => {
            this.syncQueue.unshift(event);
          }, result.retry_after * 1000);
        }
        
      } catch (error) {
        console.error(`Integration sync error (${orgIntegration.integration_type}):`, error);
        await this.logSyncResult(event, orgIntegration.integration_type, {
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Get field sync priority
   */
  private getFieldPriority(fieldType: string): 'critical' | 'important' | 'optional' {
    const criticalFields = ['wedding_date', 'venue_selector', 'guest_count_matrix'];
    const importantFields = ['timeline_builder', 'budget_category', 'dietary_matrix'];
    
    if (criticalFields.includes(fieldType)) return 'critical';
    if (importantFields.includes(fieldType)) return 'important';
    return 'optional';
  }

  /**
   * Log sync operation result
   */
  private async logSyncResult(
    event: FieldSyncEvent,
    integrationType: string,
    result: SyncResult
  ): Promise<void> {
    const supabase = createClient();
    
    await supabase
      .from('integration_sync_logs')
      .insert({
        organization_id: event.organization_id,
        wedding_id: event.wedding_id,
        field_type: event.field_type,
        integration_type: integrationType,
        sync_status: result.success ? 'success' : 'failed',
        error_message: result.error,
        external_id: result.external_id,
        synced_at: new Date().toISOString(),
      });
  }
}

// Global instance
export const crmFieldSyncManager = new CRMFieldSyncManager();
```

#### B. Tave Photography CRM Integration
```typescript
// File: /wedsync/src/lib/integrations/crm-field-sync/tave-integration.ts
import { CRMIntegration, FieldSyncEvent, SyncResult, FieldMappingConfig } from './integration-manager';
import { TaveAPIClient } from '../tave';

export class TaveIntegration implements CRMIntegration {
  name = 'Tave Photography CRM';
  id = 'tave';
  private apiClient: TaveAPIClient;

  constructor() {
    this.apiClient = new TaveAPIClient();
  }

  /**
   * Sync field value to Tave CRM
   */
  async syncFieldValue(event: FieldSyncEvent): Promise<SyncResult> {
    try {
      const mapping = this.getFieldMapping(event.field_type);
      if (!mapping) {
        return { success: true }; // Skip unmapped fields
      }

      const transformedValue = this.transformValue(event.field_type, event.new_value);
      
      switch (event.field_type) {
        case 'guest_count_matrix':
          return await this.syncGuestCount(event, transformedValue);
        
        case 'wedding_date':
          return await this.syncWeddingDate(event, transformedValue);
        
        case 'venue_selector':
          return await this.syncVenue(event, transformedValue);
        
        case 'timeline_builder':
          return await this.syncTimeline(event, transformedValue);
        
        case 'budget_category':
          return await this.syncBudget(event, transformedValue);
        
        default:
          return await this.syncGenericField(event, transformedValue, mapping);
      }
      
    } catch (error) {
      console.error('Tave sync error:', error);
      return {
        success: false,
        error: error.message,
        retry_after: 30, // Retry after 30 seconds
      };
    }
  }

  /**
   * Sync guest count matrix to Tave client record
   */
  private async syncGuestCount(event: FieldSyncEvent, value: any): Promise<SyncResult> {
    const { adults, children, infants } = value;
    const totalGuests = adults + children + infants;

    // Find or create client record
    const clientId = await this.findOrCreateClient(event.wedding_id, event.organization_id);
    
    // Update client record with guest count
    const updateResult = await this.apiClient.updateClient(clientId, {
      guest_count_adults: adults,
      guest_count_children: children,
      guest_count_infants: infants,
      guest_count_total: totalGuests,
      // Custom fields for wedding context
      custom_fields: {
        wedding_guest_breakdown: `Adults: ${adults}, Children: ${children}, Infants: ${infants}`,
        last_updated_from: 'WedSync Form Builder',
      },
    });

    return {
      success: updateResult.success,
      external_id: clientId,
      error: updateResult.error,
    };
  }

  /**
   * Sync wedding date to Tave project
   */
  private async syncWeddingDate(event: FieldSyncEvent, weddingDate: string): Promise<SyncResult> {
    const projectId = await this.findOrCreateProject(event.wedding_id, event.organization_id);
    
    const updateResult = await this.apiClient.updateProject(projectId, {
      event_date: weddingDate,
      // Set project timeline based on wedding date
      project_start_date: new Date(weddingDate),
      delivery_date: new Date(new Date(weddingDate).getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after
      custom_fields: {
        wedding_date_source: 'WedSync Form Field',
        auto_timeline_generated: true,
      },
    });

    return {
      success: updateResult.success,
      external_id: projectId,
      error: updateResult.error,
    };
  }

  /**
   * Sync venue information to Tave
   */
  private async syncVenue(event: FieldSyncEvent, venue: any): Promise<SyncResult> {
    const projectId = await this.findOrCreateProject(event.wedding_id, event.organization_id);
    
    const updateResult = await this.apiClient.updateProject(projectId, {
      venue_name: venue.name,
      venue_address: venue.formatted_address,
      venue_coordinates: venue.geometry ? `${venue.geometry.location.lat},${venue.geometry.location.lng}` : null,
      custom_fields: {
        venue_google_place_id: venue.place_id,
        venue_capacity: venue.estimated_capacity,
        venue_rating: venue.rating,
        venue_price_level: venue.price_level,
        venue_source: 'WedSync Venue Selector',
      },
    });

    return {
      success: updateResult.success,
      external_id: projectId,
      error: updateResult.error,
    };
  }

  /**
   * Map WedSync field types to Tave external format
   */
  mapFieldToExternalFormat(fieldType: string, value: any): any {
    const mappings: Record<string, (value: any) => any> = {
      guest_count_matrix: (val) => ({
        guest_count_adults: val.adults || 0,
        guest_count_children: val.children || 0,
        guest_count_infants: val.infants || 0,
        guest_count_total: (val.adults || 0) + (val.children || 0) + (val.infants || 0),
      }),
      wedding_date: (val) => new Date(val).toISOString().split('T')[0],
      venue_selector: (val) => ({
        venue_name: val.name,
        venue_address: val.formatted_address,
        venue_phone: val.phone,
        venue_website: val.website,
      }),
      timeline_builder: (val) => ({
        events: val.events.map((event: any) => ({
          time: event.time,
          title: event.title,
          description: event.description,
          duration_minutes: event.duration,
        })),
      }),
      budget_category: (val) => ({
        category: val.category,
        budgeted_amount: val.budgeted_amount,
        actual_amount: val.actual_amount,
        currency: val.currency || 'GBP',
      }),
    };

    const mapper = mappings[fieldType];
    return mapper ? mapper(value) : value;
  }

  /**
   * Validate Tave API connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const result = await this.apiClient.validateCredentials();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get field mapping configuration
   */
  getFieldMappings(): FieldMappingConfig[] {
    return [
      {
        wedsync_field_type: 'guest_count_matrix',
        external_field_name: 'client.guest_count',
        is_bidirectional: true,
        sync_priority: 'critical',
      },
      {
        wedsync_field_type: 'wedding_date',
        external_field_name: 'project.event_date',
        is_bidirectional: true,
        sync_priority: 'critical',
      },
      {
        wedsync_field_type: 'venue_selector',
        external_field_name: 'project.venue',
        is_bidirectional: false,
        sync_priority: 'critical',
      },
      {
        wedsync_field_type: 'timeline_builder',
        external_field_name: 'project.timeline',
        is_bidirectional: false,
        sync_priority: 'important',
      },
      {
        wedsync_field_type: 'budget_category',
        external_field_name: 'project.budget',
        is_bidirectional: true,
        sync_priority: 'important',
      },
    ];
  }

  // Private helper methods
  private transformValue(fieldType: string, value: any): any {
    return this.mapFieldToExternalFormat(fieldType, value);
  }

  private getFieldMapping(fieldType: string): FieldMappingConfig | undefined {
    return this.getFieldMappings().find(m => m.wedsync_field_type === fieldType);
  }

  private async findOrCreateClient(weddingId: string, orgId: string): Promise<string> {
    // Implementation for finding/creating Tave client
    // Returns client ID
    return 'client_id_placeholder';
  }

  private async findOrCreateProject(weddingId: string, orgId: string): Promise<string> {
    // Implementation for finding/creating Tave project
    // Returns project ID
    return 'project_id_placeholder';
  }

  private async syncGenericField(
    event: FieldSyncEvent,
    value: any,
    mapping: FieldMappingConfig
  ): Promise<SyncResult> {
    // Generic field sync implementation
    return { success: true };
  }
}
```

### 2. REAL-TIME FIELD SYNC SYSTEM

#### A. Webhook Handler for Field Changes
```typescript
// File: /wedsync/src/app/api/webhooks/field-sync/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { crmFieldSyncManager } from '@/lib/integrations/crm-field-sync/integration-manager';
import { z } from 'zod';

const FieldChangeSchema = z.object({
  field_id: z.string(),
  field_type: z.string(),
  old_value: z.any(),
  new_value: z.any(),
  organization_id: z.string(),
  wedding_id: z.string(),
  user_id: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fieldChange = FieldChangeSchema.parse(body);

    // Create sync event
    const syncEvent = {
      ...fieldChange,
      timestamp: new Date(),
    };

    // Trigger CRM sync
    await crmFieldSyncManager.onFieldChange(syncEvent);

    // Also trigger real-time updates to connected clients
    await broadcastFieldChange(syncEvent);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Field sync webhook error:', error);
    return NextResponse.json(
      { error: 'Field sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Broadcast field changes to real-time subscribers
 */
async function broadcastFieldChange(event: any) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Broadcast to organization channel
  const channel = supabase.channel(`org-${event.organization_id}`);
  
  await channel.send({
    type: 'broadcast',
    event: 'field_changed',
    payload: {
      field_id: event.field_id,
      field_type: event.field_type,
      new_value: event.new_value,
      wedding_id: event.wedding_id,
      timestamp: event.timestamp,
    },
  });
}
```

#### B. Real-time Field Sync Client
```typescript
// File: /wedsync/src/lib/integrations/real-time-field-sync.ts
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/realtime-js';

export interface FieldChangeCallback {
  (event: {
    field_id: string;
    field_type: string;
    new_value: any;
    wedding_id: string;
    timestamp: Date;
  }): void;
}

export class RealTimeFieldSync {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, FieldChangeCallback[]> = new Map();

  /**
   * Subscribe to field changes for an organization
   */
  subscribeToOrganization(organizationId: string, callback: FieldChangeCallback): () => void {
    const channelName = `org-${organizationId}`;
    
    // Add callback to list
    if (!this.callbacks.has(channelName)) {
      this.callbacks.set(channelName, []);
    }
    this.callbacks.get(channelName)!.push(callback);

    // Create channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName);
      
      channel.on('broadcast', { event: 'field_changed' }, (payload) => {
        const callbacks = this.callbacks.get(channelName) || [];
        callbacks.forEach(cb => cb(payload.payload));
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to field sync for org: ${organizationId}`);
        }
      });

      this.channels.set(channelName, channel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(channelName) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Remove channel if no more callbacks
      if (callbacks.length === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.unsubscribe();
          this.channels.delete(channelName);
          this.callbacks.delete(channelName);
        }
      }
    };
  }

  /**
   * Subscribe to changes for a specific wedding
   */
  subscribeToWedding(weddingId: string, callback: FieldChangeCallback): () => void {
    // Implementation similar to organization subscription
    // but filtered by wedding_id
    return () => {}; // Placeholder
  }

  /**
   * Manually trigger field sync
   */
  async triggerFieldSync(fieldId: string, fieldType: string, value: any): Promise<void> {
    try {
      await fetch('/api/webhooks/field-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_id: fieldId,
          field_type: fieldType,
          new_value: value,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Manual field sync trigger failed:', error);
    }
  }

  /**
   * Get sync status for a field
   */
  async getFieldSyncStatus(fieldId: string): Promise<{
    last_sync: Date | null;
    sync_status: 'pending' | 'synced' | 'failed';
    integrations: Array<{
      type: string;
      status: 'success' | 'failed';
      last_sync: Date;
      error?: string;
    }>;
  }> {
    try {
      const response = await fetch(`/api/integrations/field-sync-status?field_id=${fieldId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get field sync status:', error);
      return {
        last_sync: null,
        sync_status: 'failed',
        integrations: [],
      };
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.callbacks.clear();
  }
}

// Singleton instance
export const realTimeFieldSync = new RealTimeFieldSync();
```

### 3. FIELD MAPPING & TRANSFORMATION ENGINE

#### A. Universal Field Transformer
```typescript
// File: /wedsync/src/lib/integrations/field-transformation/transformer.ts
export interface FieldTransformation {
  source_field: string;
  target_field: string;
  transformation_function: string | Function;
  validation_rules?: ValidationRule[];
  bidirectional?: boolean;
}

export interface ValidationRule {
  rule: string;
  error_message: string;
  severity: 'error' | 'warning';
}

export class FieldTransformer {
  private transformations: Map<string, FieldTransformation[]> = new Map();

  /**
   * Register field transformations for an integration
   */
  registerTransformations(integrationType: string, transformations: FieldTransformation[]): void {
    this.transformations.set(integrationType, transformations);
  }

  /**
   * Transform field value for external system
   */
  async transformValue(
    integrationType: string,
    fieldType: string,
    value: any,
    context?: Record<string, any>
  ): Promise<{
    transformed_value: any;
    validation_errors: string[];
    validation_warnings: string[];
  }> {
    
    const integrationTransforms = this.transformations.get(integrationType) || [];
    const fieldTransform = integrationTransforms.find(t => t.source_field === fieldType);
    
    if (!fieldTransform) {
      return {
        transformed_value: value,
        validation_errors: [],
        validation_warnings: [],
      };
    }

    let transformedValue = value;
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Apply transformation
    if (typeof fieldTransform.transformation_function === 'function') {
      try {
        transformedValue = await fieldTransform.transformation_function(value, context);
      } catch (error) {
        validationErrors.push(`Transformation failed: ${error.message}`);
        return { transformed_value: value, validation_errors: validationErrors, validation_warnings: [] };
      }
    } else if (typeof fieldTransform.transformation_function === 'string') {
      transformedValue = await this.executeTransformationScript(
        fieldTransform.transformation_function,
        value,
        context
      );
    }

    // Apply validation rules
    if (fieldTransform.validation_rules) {
      for (const rule of fieldTransform.validation_rules) {
        const isValid = await this.validateRule(rule, transformedValue, context);
        
        if (!isValid) {
          if (rule.severity === 'error') {
            validationErrors.push(rule.error_message);
          } else {
            validationWarnings.push(rule.error_message);
          }
        }
      }
    }

    return {
      transformed_value: transformedValue,
      validation_errors: validationErrors,
      validation_warnings: validationWarnings,
    };
  }

  /**
   * Wedding-specific field transformations
   */
  getWeddingFieldTransformations(): Record<string, FieldTransformation[]> {
    return {
      tave: [
        {
          source_field: 'guest_count_matrix',
          target_field: 'client_guest_details',
          transformation_function: (value: any) => ({
            adult_guests: value.adults || 0,
            child_guests: value.children || 0,
            infant_guests: value.infants || 0,
            total_guests: (value.adults || 0) + (value.children || 0) + (value.infants || 0),
            guest_breakdown: `${value.adults || 0} adults, ${value.children || 0} children, ${value.infants || 0} infants`,
          }),
          validation_rules: [
            {
              rule: 'total_guests > 0',
              error_message: 'At least one guest is required',
              severity: 'error',
            },
            {
              rule: 'total_guests <= 500',
              error_message: 'Guest count exceeds typical venue capacity',
              severity: 'warning',
            },
          ],
          bidirectional: true,
        },
        {
          source_field: 'wedding_date',
          target_field: 'project_event_date',
          transformation_function: (value: string) => {
            const date = new Date(value);
            return {
              event_date: date.toISOString().split('T')[0],
              event_year: date.getFullYear(),
              event_month: date.getMonth() + 1,
              season: this.getWeddingSeason(date),
              day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
            };
          },
          validation_rules: [
            {
              rule: 'date >= today',
              error_message: 'Wedding date must be in the future',
              severity: 'error',
            },
          ],
          bidirectional: true,
        },
        {
          source_field: 'venue_selector',
          target_field: 'project_venue',
          transformation_function: (value: any) => ({
            venue_name: value.name,
            venue_address: value.formatted_address,
            venue_phone: value.phone_number || '',
            venue_website: value.website || '',
            venue_coordinates: value.geometry ? 
              `${value.geometry.location.lat},${value.geometry.location.lng}` : '',
            venue_capacity: value.estimated_capacity || 100,
            venue_type: this.determineVenueType(value.types || []),
            google_place_id: value.place_id,
          }),
        },
      ],
      honeybook: [
        {
          source_field: 'timeline_builder',
          target_field: 'project_timeline',
          transformation_function: (value: any) => ({
            events: value.events.map((event: any) => ({
              start_time: event.time,
              end_time: this.calculateEndTime(event.time, event.duration || 60),
              title: event.title,
              description: event.description || '',
              category: event.category || 'general',
              vendor_required: event.vendor_assignments || [],
            })),
            total_duration: this.calculateTotalDuration(value.events),
            ceremony_time: this.findCeremonyTime(value.events),
            reception_time: this.findReceptionTime(value.events),
          }),
        },
        {
          source_field: 'budget_category',
          target_field: 'project_budget_line',
          transformation_function: (value: any) => ({
            category: value.category,
            budgeted_amount: value.budgeted_amount || 0,
            actual_amount: value.actual_amount || 0,
            variance: (value.actual_amount || 0) - (value.budgeted_amount || 0),
            currency: value.currency || 'GBP',
            percentage_of_total: value.percentage_of_total || 0,
            vendor_assigned: value.vendor_id || null,
            payment_status: value.payment_status || 'pending',
          }),
        },
      ],
      google_calendar: [
        {
          source_field: 'timeline_builder',
          target_field: 'calendar_events',
          transformation_function: (value: any, context: any) => {
            const weddingDate = context?.wedding_date;
            if (!weddingDate) return [];

            return value.events.map((event: any) => ({
              summary: `${event.title} - ${context.couple_names || 'Wedding'}`,
              description: `${event.description}\n\nGenerated from WedSync Timeline Builder`,
              start: {
                dateTime: this.combineDateTime(weddingDate, event.time),
                timeZone: context.timezone || 'Europe/London',
              },
              end: {
                dateTime: this.combineDateTime(
                  weddingDate, 
                  this.calculateEndTime(event.time, event.duration || 60)
                ),
                timeZone: context.timezone || 'Europe/London',
              },
              location: context.venue_address || '',
              attendees: this.getEventAttendees(event, context),
            }));
          },
        },
      ],
    };
  }

  // Helper methods
  private getWeddingSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  private determineVenueType(types: string[]): string {
    if (types.includes('church')) return 'Religious';
    if (types.includes('hotel')) return 'Hotel';
    if (types.includes('restaurant')) return 'Restaurant';
    if (types.includes('park')) return 'Outdoor';
    if (types.includes('banquet_hall')) return 'Banquet Hall';
    return 'Other';
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + durationMinutes);
    return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
  }

  private combineDateTime(date: string, time: string): string {
    return `${date}T${time}:00`;
  }

  private calculateTotalDuration(events: any[]): number {
    return events.reduce((total, event) => total + (event.duration || 60), 0);
  }

  private findCeremonyTime(events: any[]): string | null {
    const ceremony = events.find(e => 
      e.title.toLowerCase().includes('ceremony') || 
      e.category === 'ceremony'
    );
    return ceremony?.time || null;
  }

  private findReceptionTime(events: any[]): string | null {
    const reception = events.find(e => 
      e.title.toLowerCase().includes('reception') || 
      e.category === 'reception'
    );
    return reception?.time || null;
  }

  private getEventAttendees(event: any, context: any): any[] {
    // Logic to determine event attendees based on event type
    return [];
  }

  private async executeTransformationScript(
    script: string,
    value: any,
    context?: Record<string, any>
  ): Promise<any> {
    // Safe execution of transformation scripts
    // Implementation would use a sandboxed environment
    return value;
  }

  private async validateRule(
    rule: ValidationRule,
    value: any,
    context?: Record<string, any>
  ): Promise<boolean> {
    // Rule validation logic
    return true;
  }
}

export const fieldTransformer = new FieldTransformer();
```

## 🔒 SECURITY & RELIABILITY REQUIREMENTS

### 1. Integration Security Checklist
- [ ] **OAuth2 Token Management**: Secure storage and refresh of CRM tokens
- [ ] **API Key Protection**: Environment variable security for all integrations
- [ ] **Data Encryption**: All field data encrypted in transit and at rest
- [ ] **Access Control**: RBAC for integration management
- [ ] **Rate Limiting**: Proper throttling of external API calls
- [ ] **Webhook Validation**: Signature verification for incoming webhooks
- [ ] **Audit Logging**: All integration operations logged
- [ ] **Error Handling**: No sensitive data in error responses
- [ ] **Connection Validation**: Regular health checks for all integrations
- [ ] **Data Sanitization**: Clean all field data before external sync

### 2. Reliability & Performance
- [ ] **Sync Speed**: Field changes propagate within 5 seconds
- [ ] **Error Recovery**: Automatic retry with exponential backoff
- [ ] **Queue Management**: Reliable processing of sync operations
- [ ] **Conflict Resolution**: Smart handling of data conflicts
- [ ] **Offline Support**: Queue and sync when connectivity restored
- [ ] **Monitoring**: Real-time sync status and health metrics
- [ ] **Fallback Strategies**: Graceful degradation when CRMs unavailable
- [ ] **Data Consistency**: Eventual consistency across all systems
- [ ] **Performance Metrics**: <2s sync time for all field types
- [ ] **Scalability**: Support 1000+ concurrent field syncs

## 🎯 TYPICAL INTEGRATION DELIVERABLES WITH EVIDENCE

### Core Integration Infrastructure
- [ ] **CRM Sync Manager** (Evidence: Processes 100+ field syncs/minute)
- [ ] **Real-time Updates** (Show: Field changes appear in CRMs within 5s)
- [ ] **Webhook Handlers** (Test: All field change events processed)
- [ ] **Field Transformations** (Verify: Correct data mapping across CRMs)
- [ ] **Error Recovery** (Show: Failed syncs automatically retry)
- [ ] **Integration Health Monitoring** (Metrics: 99.9% sync success rate)

### Wedding-Specific Integration Logic
- [ ] **Tave CRM Integration** (Evidence: Guest counts sync to client records)
- [ ] **HoneyBook Integration** (Show: Timeline events create project milestones)
- [ ] **Google Calendar Sync** (Test: Wedding timeline becomes calendar events)
- [ ] **Venue Data Mapping** (Verify: Google Places venue info syncs across CRMs)
- [ ] **Budget Synchronization** (Show: Budget categories update project financials)
- [ ] **Guest Count Propagation** (Test: Matrix data updates catering systems)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### Integration Functionality
1. **Field Sync Speed**: All field changes propagate to CRMs within 5 seconds
2. **Data Accuracy**: 100% correct field mapping across all integrations
3. **Real-time Updates**: Live field changes appear immediately in connected systems
4. **Wedding Context**: All field data maintains wedding-specific meaning in CRMs
5. **Conflict Resolution**: Smart handling when data conflicts occur

### System Reliability  
6. **Sync Success Rate**: 99.9% successful field synchronization
7. **Error Recovery**: Failed syncs automatically retry with exponential backoff
8. **Offline Support**: Field changes queued and synced when connectivity restored
9. **Health Monitoring**: Real-time status of all CRM integrations
10. **Performance Metrics**: <2 seconds average sync time for all field types

### Integration Coverage
11. **Tave Integration**: Photography CRM field sync fully functional
12. **HoneyBook Integration**: Project management field sync working
13. **Google Calendar**: Timeline events create calendar entries
14. **Webhook Processing**: All field change events handled correctly
15. **Security Compliance**: All integrations pass security audit

**🎯 REMEMBER**: You're building the integration layer that keeps wedding data synchronized across multiple systems. Every field change must propagate reliably - a missed guest count update could affect catering orders, and a timeline change must reach all vendor calendars immediately.

**Wedding Context**: Wedding vendors use multiple software systems simultaneously. Your integrations ensure they never have to manually update the same information twice, saving them hours per wedding and preventing costly data inconsistencies.