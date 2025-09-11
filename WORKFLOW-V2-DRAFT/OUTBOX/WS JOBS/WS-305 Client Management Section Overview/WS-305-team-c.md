# TEAM C - ROUND 1: WS-305 - Client Management Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build real-time integration systems for client management with activity synchronization, communication history aggregation, and cross-platform client data consistency
**FEATURE ID:** WS-305 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time client updates, communication system integration, and wedding vendor workflow synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **REAL-TIME SUBSCRIPTION VERIFICATION:**
```bash
# Test WebSocket connection for client updates
wscat -c "ws://localhost:3000/api/realtime/clients" -H "Authorization: Bearer $TOKEN"
# MUST show: Real-time client activity updates
```

2. **COMMUNICATION INTEGRATION TEST:**
```bash
curl -X POST $WS_ROOT/api/integrations/communication/sync \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"client_id": "test-client"}' | jq .
# MUST show: Communication history aggregated from multiple sources
```

3. **CROSS-PLATFORM SYNC VERIFICATION:**
```bash
curl -X GET $WS_ROOT/api/clients/sync-status \
  -H "Authorization: Bearer $TOKEN" | jq .
# MUST show: Client data consistency across all platforms
```

## 🧠 SEQUENTIAL THINKING FOR CLIENT INTEGRATION SYSTEMS

```typescript
// Client integration complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Client management integration needs: Real-time activity feeds across mobile/web, communication history aggregation from email/SMS/calls, cross-platform data synchronization, webhook systems for external tool integration, and conflict resolution for concurrent updates.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor communication patterns: Photographers exchange hundreds of messages per couple, venues coordinate with multiple vendors simultaneously, florists handle last-minute changes. Integration must aggregate communications from email providers, SMS systems, CRM tools, and in-app messaging.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Real-time synchronization challenges: Multiple users accessing same client data, mobile/web platform consistency, offline-first mobile updates, conflict resolution for simultaneous edits, webhook reliability for external integrations, and event ordering for activity feeds.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Integration architecture: Supabase Realtime for instant updates, message queues for external webhooks, event sourcing for activity tracking, CQRS pattern for read/write optimization, idempotency keys for duplicate prevention, and circuit breakers for external service failures.",
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

// Find existing real-time integration patterns
await mcp__serena__search_for_pattern("supabase realtime websocket subscription");
await mcp__serena__find_symbol("createClient realtime channel", "$WS_ROOT/wedsync/src/lib/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");

// Study existing communication and integration systems
await mcp__serena__find_referencing_symbols("webhook integration external api");
```

### B. REAL-TIME DOCUMENTATION LOADING
```typescript
// Load Supabase Realtime documentation
// Use Ref MCP to search for:
# - "Supabase Realtime WebSocket subscriptions"
# - "PostgreSQL LISTEN NOTIFY triggers"
# - "Real-time conflict resolution patterns"

// Load integration architecture patterns
// Use Ref MCP to search for:
# - "Event sourcing microservices patterns"
# - "Webhook reliability retry strategies"
# - "WebSocket authentication security"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Real-time Client Activity System** (`$WS_ROOT/wedsync/src/lib/realtime/client-activity-stream.ts`)
  - WebSocket subscriptions for live client updates
  - Activity event broadcasting across all connected clients
  - Optimistic UI updates with conflict resolution
  - Evidence: Client activity appears instantly on all connected devices

- [ ] **Communication History Aggregator** (`$WS_ROOT/wedsync/src/lib/integrations/communication-aggregator.ts`)
  - Email provider integration (Gmail, Outlook) via APIs
  - SMS history aggregation from Twilio/external services
  - Call log integration with calendar systems
  - Evidence: Complete communication timeline from all sources unified

- [ ] **Cross-Platform Sync Engine** (`$WS_ROOT/wedsync/src/lib/sync/client-data-sync.ts`)
  - Bidirectional sync between web and mobile platforms
  - Conflict resolution for concurrent client data edits
  - Offline queue management with retry logic
  - Evidence: Client changes sync seamlessly across all devices

- [ ] **External Integration Webhooks** (`$WS_ROOT/wedsync/src/app/api/webhooks/client-integrations/`)
  - Webhook endpoints for CRM system integrations
  - Event processing pipeline for external client updates
  - Security validation and idempotency protection
  - Evidence: External client updates trigger proper internal synchronization

- [ ] **Activity Feed Real-time UI** (`$WS_ROOT/wedsync/src/components/clients/realtime-activity-feed.tsx`)
  - Live-updating activity stream component
  - Optimistic updates with rollback capability
  - Mobile-responsive real-time notifications
  - Evidence: Activity feed updates instantly without page refresh

## 🔄 REAL-TIME ARCHITECTURE IMPLEMENTATION

### Supabase Realtime Integration
```typescript
// File: $WS_ROOT/wedsync/src/lib/realtime/client-activity-stream.ts

import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/realtime-js';

export class ClientActivityStream {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  private channels: Map<string, RealtimeChannel> = new Map();

  async subscribeToClientActivities(
    supplierId: string,
    clientId: string,
    onActivityUpdate: (activity: any) => void,
    onError: (error: any) => void
  ) {
    const channelName = `client-activities-${supplierId}-${clientId}`;
    
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
          table: 'client_activities',
          filter: `client_id=eq.${clientId} AND supplier_id=eq.${supplierId}`
        },
        (payload) => {
          onActivityUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `id=eq.${clientId} AND supplier_id=eq.${supplierId}`
        },
        (payload) => {
          onActivityUpdate({
            type: 'client_update',
            client: payload.new,
            previous: payload.old
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to client activities for ${clientId}`);
        } else if (status === 'CLOSED') {
          console.log(`Connection closed for ${clientId}`);
        } else if (status === 'CHANNEL_ERROR') {
          onError(new Error('Realtime subscription error'));
        }
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  async broadcastClientActivity(
    supplierId: string,
    clientId: string,
    activity: {
      type: string;
      description: string;
      metadata?: Record<string, any>;
    }
  ) {
    const channelName = `client-activities-${supplierId}-${clientId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'activity_update',
        payload: {
          client_id: clientId,
          supplier_id: supplierId,
          ...activity,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  unsubscribeFromClient(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  cleanup() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }
}
```

### Communication History Aggregation
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/communication-aggregator.ts

export class CommunicationAggregator {
  async aggregateClientCommunications(clientId: string, supplierId: string) {
    const results = await Promise.allSettled([
      this.getEmailHistory(clientId),
      this.getSMSHistory(clientId),
      this.getCallHistory(clientId),
      this.getInAppMessages(clientId)
    ]);

    const communications = results
      .filter(result => result.status === 'fulfilled')
      .flatMap((result: any) => result.value)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Store aggregated communications
    await this.storeCommunicationHistory(clientId, supplierId, communications);

    return communications;
  }

  private async getEmailHistory(clientId: string) {
    // Gmail API integration
    const client = await this.getGmailClient();
    // Implementation for email retrieval
    return [];
  }

  private async getSMSHistory(clientId: string) {
    // Twilio integration for SMS history
    const twilioClient = await this.getTwilioClient();
    // Implementation for SMS retrieval
    return [];
  }

  private async getCallHistory(clientId: string) {
    // Calendar/CRM integration for call logs
    // Implementation for call log retrieval
    return [];
  }

  private async getInAppMessages(clientId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    return data?.map(msg => ({
      id: msg.id,
      type: 'in_app_message',
      content: msg.content,
      timestamp: msg.created_at,
      sender: msg.sender_name
    })) || [];
  }

  private async storeCommunicationHistory(
    clientId: string, 
    supplierId: string, 
    communications: any[]
  ) {
    // Store in client_communication_history table
    const { error } = await supabase
      .from('client_communication_history')
      .upsert({
        client_id: clientId,
        supplier_id: supplierId,
        communications: communications,
        last_updated: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store communication history:', error);
    }
  }
}
```

### Cross-Platform Sync Engine
```typescript
// File: $WS_ROOT/wedsync/src/lib/sync/client-data-sync.ts

export class ClientDataSyncEngine {
  private syncQueue: Map<string, SyncOperation[]> = new Map();
  private conflictResolver = new ConflictResolver();

  async syncClientData(
    clientId: string,
    supplierId: string,
    changes: ClientDataChange[],
    sourceDevice: 'web' | 'mobile'
  ) {
    // Add to sync queue
    const queueKey = `${supplierId}-${clientId}`;
    const existingQueue = this.syncQueue.get(queueKey) || [];
    
    const newOperations = changes.map(change => ({
      id: generateId(),
      clientId,
      supplierId,
      change,
      sourceDevice,
      timestamp: new Date(),
      status: 'pending' as const
    }));

    this.syncQueue.set(queueKey, [...existingQueue, ...newOperations]);

    // Process sync queue
    await this.processSyncQueue(queueKey);
  }

  private async processSyncQueue(queueKey: string) {
    const operations = this.syncQueue.get(queueKey) || [];
    const pendingOps = operations.filter(op => op.status === 'pending');

    for (const operation of pendingOps) {
      try {
        // Check for conflicts
        const conflicts = await this.detectConflicts(operation);
        
        if (conflicts.length > 0) {
          const resolution = await this.conflictResolver.resolve(operation, conflicts);
          operation.change = resolution.mergedChange;
        }

        // Apply changes to database
        await this.applyChanges(operation);
        
        // Broadcast to other devices
        await this.broadcastSync(operation);
        
        operation.status = 'completed';
        
      } catch (error) {
        operation.status = 'failed';
        console.error('Sync operation failed:', error);
      }
    }

    // Clean up completed operations
    const activeOps = operations.filter(op => op.status !== 'completed');
    this.syncQueue.set(queueKey, activeOps);
  }

  private async detectConflicts(operation: SyncOperation): Promise<Conflict[]> {
    // Check for concurrent modifications
    const { data: currentData } = await supabase
      .from('clients')
      .select('*, updated_at')
      .eq('id', operation.clientId)
      .single();

    const conflicts: Conflict[] = [];
    
    if (currentData && new Date(currentData.updated_at) > operation.timestamp) {
      conflicts.push({
        field: operation.change.field,
        currentValue: currentData[operation.change.field],
        incomingValue: operation.change.value,
        lastModified: currentData.updated_at
      });
    }

    return conflicts;
  }

  private async applyChanges(operation: SyncOperation) {
    const updateData = {
      [operation.change.field]: operation.change.value,
      updated_at: new Date().toISOString(),
      last_sync_device: operation.sourceDevice
    };

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', operation.clientId)
      .eq('supplier_id', operation.supplierId);

    if (error) {
      throw new Error(`Failed to apply changes: ${error.message}`);
    }
  }

  private async broadcastSync(operation: SyncOperation) {
    // Broadcast to all connected devices except source
    const channel = supabase.channel(`client-sync-${operation.supplierId}`);
    await channel.send({
      type: 'broadcast',
      event: 'data_sync',
      payload: {
        clientId: operation.clientId,
        change: operation.change,
        sourceDevice: operation.sourceDevice,
        timestamp: operation.timestamp
      }
    });
  }
}

class ConflictResolver {
  async resolve(operation: SyncOperation, conflicts: Conflict[]): Promise<{ mergedChange: ClientDataChange }> {
    // Implement Last-Write-Wins with user notification
    // For wedding-critical fields, prefer manual resolution
    
    const criticalFields = ['wedding_date', 'venue_name', 'budget'];
    const hasCriticalConflict = conflicts.some(c => criticalFields.includes(c.field));
    
    if (hasCriticalConflict) {
      // Queue for manual resolution
      await this.queueManualResolution(operation, conflicts);
      throw new Error('Critical conflict requires manual resolution');
    }
    
    // Auto-resolve non-critical conflicts with Last-Write-Wins
    return { mergedChange: operation.change };
  }

  private async queueManualResolution(operation: SyncOperation, conflicts: Conflict[]) {
    await supabase
      .from('sync_conflicts')
      .insert({
        client_id: operation.clientId,
        supplier_id: operation.supplierId,
        operation: operation,
        conflicts: conflicts,
        status: 'pending_resolution',
        created_at: new Date().toISOString()
      });
  }
}
```

## 🔗 WEBHOOK INTEGRATION SYSTEM

### External Integration Webhooks
```typescript
// File: $WS_ROOT/wedsync/src/app/api/webhooks/client-integrations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/webhook-security';
import { ClientDataSyncEngine } from '@/lib/sync/client-data-sync';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-webhook-signature');
    const payload = await request.text();
    
    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(payload);
    const { source, event_type, client_data } = webhookData;

    // Process based on source system
    switch (source) {
      case 'tave':
        await handleTaveWebhook(event_type, client_data);
        break;
      case 'honeybook':
        await handleHoneybookWebhook(event_type, client_data);
        break;
      case 'gmail':
        await handleGmailWebhook(event_type, client_data);
        break;
      default:
        console.warn(`Unknown webhook source: ${source}`);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

async function handleTaveWebhook(eventType: string, clientData: any) {
  if (eventType === 'client.updated') {
    const syncEngine = new ClientDataSyncEngine();
    await syncEngine.syncClientData(
      clientData.client_id,
      clientData.supplier_id,
      [{
        field: 'external_sync_data',
        value: clientData,
        source: 'tave_webhook'
      }],
      'web'
    );
  }
}
```

## 🧪 REQUIRED TESTING

### Real-time Integration Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/integration/client-realtime.test.ts

describe('Client Real-time Integration', () => {
  let activityStream: ClientActivityStream;
  
  beforeEach(() => {
    activityStream = new ClientActivityStream();
  });

  afterEach(() => {
    activityStream.cleanup();
  });

  it('should receive real-time activity updates', async () => {
    const updates: any[] = [];
    const supplierId = 'test-supplier';
    const clientId = 'test-client';

    await activityStream.subscribeToClientActivities(
      supplierId,
      clientId,
      (activity) => updates.push(activity),
      (error) => console.error(error)
    );

    // Trigger activity
    await activityStream.broadcastClientActivity(supplierId, clientId, {
      type: 'test_activity',
      description: 'Test real-time update'
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(updates).toHaveLength(1);
    expect(updates[0].type).toBe('test_activity');
  });
});
```

### Sync Engine Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/sync/client-data-sync.test.ts

describe('Client Data Sync Engine', () => {
  it('should handle concurrent updates without data loss', async () => {
    const syncEngine = new ClientDataSyncEngine();
    const clientId = 'test-client';
    const supplierId = 'test-supplier';

    // Simulate concurrent updates from different devices
    const webUpdate = syncEngine.syncClientData(clientId, supplierId, [{
      field: 'notes',
      value: 'Updated from web',
      source: 'web_edit'
    }], 'web');

    const mobileUpdate = syncEngine.syncClientData(clientId, supplierId, [{
      field: 'notes', 
      value: 'Updated from mobile',
      source: 'mobile_edit'
    }], 'mobile');

    await Promise.all([webUpdate, mobileUpdate]);

    // Verify final state is consistent
    const { data } = await supabase
      .from('clients')
      .select('notes, updated_at')
      .eq('id', clientId)
      .single();

    expect(data.notes).toBeDefined();
    expect(data.updated_at).toBeDefined();
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-305-client-management-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team C",
  "notes": "Client management real-time integration completed. WebSocket subscriptions, communication aggregation, cross-platform sync, webhook processing."
}
```

---

**WedSync Client Management Integration - Real-time, Synchronized, Connected! 🔄📡🔗**