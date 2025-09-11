# TEAM C - ROUND 1: WS-217 - Outlook Calendar Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Implement Microsoft Graph webhook handling, real-time sync orchestration, and cross-system event synchronization for seamless calendar integration
**FEATURE ID:** WS-217 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about webhook reliability, sync conflict prevention, and real-time data flow between WedSync and Microsoft systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/webhooks/outlook-webhook-handler.ts
ls -la $WS_ROOT/wedsync/src/lib/sync/outlook-sync-orchestrator.ts
cat $WS_ROOT/wedsync/src/lib/webhooks/outlook-webhook-handler.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test outlook-webhook-sync
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing webhook and sync patterns
await mcp__serena__search_for_pattern("webhook sync integration real-time");
await mcp__serena__find_symbol("webhook sync orchestrator", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/webhooks/");
```

### B. INTEGRATION PATTERNS ANALYSIS
```typescript
// CRITICAL: Understand existing webhook and integration patterns
await mcp__serena__search_for_pattern("webhook handler validation sync");
await mcp__serena__find_referencing_symbols("webhook subscription real-time");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Microsoft Graph webhooks subscriptions real-time"
# - "Node.js webhook-validation signature-verification"
# - "Next.js api-routes webhook-handling streaming"
# - "Real-time synchronization conflict-resolution"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Integration Architecture
```typescript
// Complex webhook and sync integration analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Outlook webhook integration requires: Microsoft Graph webhook subscription management, secure webhook validation with signature verification, real-time sync orchestration for calendar changes, conflict detection between simultaneous changes, queue-based processing for reliability, and comprehensive error recovery mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time sync complexity: Webhooks notify of Outlook changes immediately, sync orchestrator must determine change scope, conflict detection needed when both systems modified same event simultaneously, batch processing for multiple rapid changes, retry logic for failed sync operations, and sync state management.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration reliability challenges: Microsoft webhook subscriptions expire and need renewal, network failures can cause webhook delivery failures, duplicate webhook notifications must be deduplicated, sync operations must be idempotent, webhook endpoint must handle high traffic during busy periods.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding workflow considerations: Client meeting changes in Outlook must immediately reflect in WedSync, venue visit rescheduling needs instant supplier notification, wedding day timeline changes require immediate coordinator updates, conflict resolution must preserve wedding-critical events, emergency changes need priority processing.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration strategy: Use webhook queue system for reliable processing, implement sync orchestrator with conflict detection, create webhook subscription renewal automation, build cross-system event mapping with change tracking, establish comprehensive monitoring and alerting for integration health.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track webhook handling, sync operations, and system dependencies
2. **integration-specialist** - Build webhook handlers and sync orchestration systems
3. **security-compliance-officer** - Implement secure webhook validation and sync authorization
4. **code-quality-guardian** - Ensure reliable webhook processing and error recovery
5. **test-automation-architect** - Comprehensive integration testing with webhook simulation
6. **documentation-chronicler** - Technical documentation for webhook setup and sync troubleshooting

## 🔗 INTEGRATION FOCUS: REAL-TIME SYNCHRONIZATION

### Integration Architecture Requirements:
- **Microsoft Graph Webhook Management**: Subscription creation, validation, and renewal
- **Real-time Sync Orchestration**: Immediate processing of calendar changes
- **Cross-system Event Synchronization**: Bidirectional data flow coordination
- **Conflict Detection & Prevention**: Simultaneous change handling
- **Queue-based Processing**: Reliable webhook and sync operation handling
- **Integration Health Monitoring**: System status and performance tracking

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION REQUIREMENTS:**
- Microsoft Graph webhook subscription and lifecycle management
- Real-time event synchronization between systems
- Conflict detection and automated resolution
- Queue-based processing for webhook events
- Cross-system data consistency enforcement
- Integration failure handling and recovery

## 📋 TECHNICAL SPECIFICATION IMPLEMENTATION

### Core Integration Components to Create:

1. **Outlook Webhook Handler** (`$WS_ROOT/wedsync/src/lib/webhooks/outlook-webhook-handler.ts`)
```typescript
export class OutlookWebhookHandler {
  private syncOrchestrator: OutlookSyncOrchestrator;
  private webhookQueue: WebhookQueue;
  private subscriptionManager: WebhookSubscriptionManager;
  
  constructor() {
    this.syncOrchestrator = new OutlookSyncOrchestrator();
    this.webhookQueue = new WebhookQueue();
    this.subscriptionManager = new WebhookSubscriptionManager();
  }

  async handleWebhookNotification(notification: OutlookWebhookNotification): Promise<WebhookResponse> {
    try {
      // Validate webhook authenticity
      await this.validateWebhookRequest(notification);
      
      // Process each change in the notification
      for (const change of notification.value) {
        await this.processWebhookChange(change);
      }

      return { status: 'success', processed: notification.value.length };
      
    } catch (error) {
      console.error('Webhook processing failed:', error);
      
      // Queue for retry if it's a transient error
      if (this.isTransientError(error)) {
        await this.webhookQueue.queueForRetry(notification);
      }
      
      throw error;
    }
  }

  private async processWebhookChange(change: OutlookWebhookChange): Promise<void> {
    const integration = await this.getIntegrationBySubscriptionId(change.subscriptionId);
    
    if (!integration || !integration.sync_enabled) {
      return;
    }

    // Extract event ID from resource URL
    const eventId = this.extractEventIdFromResource(change.resource);
    
    // Queue sync operation for this specific event
    const syncJob = {
      integrationId: integration.id,
      changeType: change.changeType,
      outlookEventId: eventId,
      priority: this.determineChangePriority(change),
      triggeredAt: new Date(),
      retryAttempts: 0
    };

    await this.webhookQueue.queueSyncOperation(syncJob);
    
    // Trigger immediate processing for high priority changes
    if (syncJob.priority === 'high') {
      await this.syncOrchestrator.processSyncJob(syncJob);
    }
  }

  async validateWebhookRequest(notification: OutlookWebhookNotification): Promise<void> {
    for (const change of notification.value) {
      // Validate client state matches our stored value
      const integration = await this.getIntegrationBySubscriptionId(change.subscriptionId);
      if (!integration) {
        throw new Error(`No integration found for subscription: ${change.subscriptionId}`);
      }

      const storedClientState = await this.getStoredClientState(integration.id);
      if (change.clientState !== storedClientState) {
        throw new Error('Invalid webhook client state');
      }

      // Check if subscription is still active
      if (new Date(change.subscriptionExpirationDateTime) < new Date()) {
        // Subscription expired, renew it
        await this.subscriptionManager.renewSubscription(integration.id);
      }
    }
  }

  private determineChangePriority(change: OutlookWebhookChange): 'high' | 'medium' | 'low' {
    // Wedding ceremony and reception changes are high priority
    if (this.isWeddingCriticalEvent(change.resource)) {
      return 'high';
    }
    
    // Client meetings and vendor meetings are medium priority
    if (this.isBusinessCriticalEvent(change.resource)) {
      return 'medium';
    }
    
    // Other events are low priority
    return 'low';
  }
}
```

2. **Sync Orchestrator** (`$WS_ROOT/wedsync/src/lib/sync/outlook-sync-orchestrator.ts`)
```typescript
export class OutlookSyncOrchestrator {
  private graphClient: MicrosoftGraphClient;
  private conflictResolver: SyncConflictResolver;
  private eventMapper: EventMappingService;
  
  constructor() {
    this.graphClient = new MicrosoftGraphClient();
    this.conflictResolver = new SyncConflictResolver();
    this.eventMapper = new EventMappingService();
  }

  async processSyncJob(job: SyncJob): Promise<SyncJobResult> {
    try {
      const integration = await this.getIntegration(job.integrationId);
      const accessToken = await this.getValidAccessToken(integration);
      
      switch (job.changeType) {
        case 'created':
          return await this.handleEventCreated(integration, accessToken, job);
        case 'updated':
          return await this.handleEventUpdated(integration, accessToken, job);
        case 'deleted':
          return await this.handleEventDeleted(integration, accessToken, job);
        default:
          throw new Error(`Unknown change type: ${job.changeType}`);
      }
      
    } catch (error) {
      return await this.handleSyncJobError(job, error);
    }
  }

  private async handleEventUpdated(integration: OutlookIntegration, accessToken: string, job: SyncJob): Promise<SyncJobResult> {
    // Get the current state of the event in Outlook
    const outlookEvent = await this.graphClient.getCalendarEvent(
      accessToken, 
      integration.calendar_id, 
      job.outlookEventId
    );

    // Find the corresponding WedSync event
    const mapping = await this.eventMapper.findMappingByOutlookEvent(
      integration.id, 
      job.outlookEventId
    );

    if (!mapping) {
      // Event not mapped, might be a new event created in Outlook
      return await this.handleUnmappedOutlookEvent(integration, outlookEvent);
    }

    // Get the current WedSync event
    const wedSyncEvent = await this.getWedSyncEvent(mapping.wedsync_event_id);
    
    // Check for conflicts (both systems modified since last sync)
    const conflict = await this.conflictResolver.detectConflict(
      mapping, 
      outlookEvent, 
      wedSyncEvent
    );

    if (conflict) {
      return await this.handleSyncConflict(integration, mapping, conflict);
    }

    // No conflict, apply Outlook changes to WedSync
    const updatedWedSyncEvent = await this.transformOutlookEventToWedSync(outlookEvent);
    await this.updateWedSyncEvent(mapping.wedsync_event_id, updatedWedSyncEvent);
    
    // Update mapping with new sync state
    await this.eventMapper.updateMappingSyncState(mapping.id, {
      last_synced_at: new Date(),
      sync_hash: this.calculateEventHash(outlookEvent),
      sync_conflicts: []
    });

    return {
      success: true,
      action: 'updated_wedsync_from_outlook',
      eventId: mapping.wedsync_event_id,
      conflictsDetected: 0
    };
  }

  private async handleSyncConflict(integration: OutlookIntegration, mapping: EventMapping, conflict: SyncConflict): Promise<SyncJobResult> {
    // Record the conflict for manual resolution
    await this.eventMapper.recordSyncConflict(mapping.id, conflict);
    
    // Apply automatic resolution rules if configured
    const autoResolution = await this.conflictResolver.getAutoResolutionRule(
      integration.id, 
      conflict.conflictType
    );

    if (autoResolution) {
      return await this.applyAutoResolution(integration, mapping, conflict, autoResolution);
    }

    // No auto-resolution, flag for manual review
    await this.flagForManualResolution(mapping.id, conflict);
    
    return {
      success: false,
      action: 'conflict_detected',
      eventId: mapping.wedsync_event_id,
      conflictsDetected: 1,
      requiresManualResolution: true
    };
  }

  async performFullSync(integrationId: string): Promise<FullSyncResult> {
    const integration = await this.getIntegration(integrationId);
    const accessToken = await this.getValidAccessToken(integration);
    
    // Get all events from both systems
    const outlookEvents = await this.getAllOutlookEvents(accessToken, integration);
    const wedSyncEvents = await this.getAllWedSyncEvents(integration.user_id);
    
    // Find orphaned events (exist in one system but not mapped)
    const orphanedOutlookEvents = await this.findOrphanedOutlookEvents(integration.id, outlookEvents);
    const orphanedWedSyncEvents = await this.findOrphanedWedSyncEvents(integration.id, wedSyncEvents);
    
    // Create mappings for orphaned events based on matching criteria
    const newMappings = await this.createEventMappings(
      integration, 
      orphanedOutlookEvents, 
      orphanedWedSyncEvents
    );
    
    // Sync all mapped events
    const syncResults = await Promise.all(
      newMappings.map(mapping => this.syncMappedEvent(integration, accessToken, mapping))
    );
    
    return {
      eventsProcessed: syncResults.length,
      eventsCreated: syncResults.filter(r => r.action === 'created').length,
      eventsUpdated: syncResults.filter(r => r.action === 'updated').length,
      conflictsDetected: syncResults.filter(r => r.conflictsDetected > 0).length,
      orphanedEvents: orphanedOutlookEvents.length + orphanedWedSyncEvents.length
    };
  }
}
```

3. **Webhook Subscription Manager** (`$WS_ROOT/wedsync/src/lib/webhooks/webhook-subscription-manager.ts`)
```typescript
export class WebhookSubscriptionManager {
  private graphClient: MicrosoftGraphClient;
  private renewalQueue: SubscriptionRenewalQueue;
  
  constructor() {
    this.graphClient = new MicrosoftGraphClient();
    this.renewalQueue = new SubscriptionRenewalQueue();
  }

  async createWebhookSubscription(integrationId: string): Promise<WebhookSubscription> {
    const integration = await this.getIntegration(integrationId);
    const accessToken = await this.getValidAccessToken(integration);
    
    const webhookUrl = `${process.env.APP_URL}/api/calendar/outlook/webhook`;
    const clientState = await this.generateSecureClientState(integrationId);
    
    const subscription = await this.graphClient.subscribeToWebhooks(
      accessToken,
      integration.calendar_id,
      webhookUrl
    );
    
    // Store subscription details
    await this.updateIntegrationWebhookInfo(integrationId, {
      webhook_subscription_id: subscription.id,
      webhook_expires_at: subscription.expirationDateTime,
      webhook_client_state: clientState
    });
    
    // Schedule renewal
    await this.scheduleSubscriptionRenewal(integrationId, subscription.expirationDateTime);
    
    return subscription;
  }

  async renewSubscription(integrationId: string): Promise<WebhookSubscription> {
    const integration = await this.getIntegration(integrationId);
    const accessToken = await this.getValidAccessToken(integration);
    
    // Renew existing subscription
    const renewedSubscription = await this.graphClient.renewWebhookSubscription(
      accessToken,
      integration.webhook_subscription_id
    );
    
    // Update database
    await this.updateIntegrationWebhookInfo(integrationId, {
      webhook_expires_at: renewedSubscription.expirationDateTime
    });
    
    // Schedule next renewal
    await this.scheduleSubscriptionRenewal(integrationId, renewedSubscription.expirationDateTime);
    
    return renewedSubscription;
  }

  async scheduleSubscriptionRenewal(integrationId: string, expirationDate: Date): Promise<void> {
    // Schedule renewal 2 hours before expiration
    const renewalTime = new Date(expirationDate.getTime() - (2 * 60 * 60 * 1000));
    
    await this.renewalQueue.scheduleRenewal({
      integrationId,
      renewalTime,
      expirationTime: expirationDate,
      retryAttempts: 0
    });
  }

  async validateSubscriptionHealth(): Promise<SubscriptionHealthReport[]> {
    const integrations = await this.getAllActiveIntegrations();
    const healthReports: SubscriptionHealthReport[] = [];
    
    for (const integration of integrations) {
      const health = await this.checkSubscriptionHealth(integration);
      healthReports.push(health);
      
      if (health.status === 'expired' || health.status === 'expiring_soon') {
        await this.renewalQueue.scheduleImmediateRenewal(integration.id);
      }
    }
    
    return healthReports;
  }
}
```

## 🔄 REAL-TIME INTEGRATION PATTERNS

### Webhook Queue System:
```typescript
export class WebhookQueue {
  private queue: Queue<SyncJob>;
  private deadLetterQueue: Queue<FailedSyncJob>;
  
  constructor() {
    this.queue = new Queue('outlook-webhook-sync', {
      connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });
    
    this.setupQueueProcessing();
  }

  async queueSyncOperation(job: SyncJob): Promise<void> {
    const priority = this.calculateJobPriority(job);
    
    await this.queue.add('sync-outlook-event', job, {
      priority,
      delay: job.priority === 'high' ? 0 : 5000, // High priority immediate, others delayed
      jobId: `${job.integrationId}-${job.outlookEventId}-${Date.now()}`
    });
  }

  private setupQueueProcessing(): void {
    this.queue.process('sync-outlook-event', 5, async (job) => {
      const syncOrchestrator = new OutlookSyncOrchestrator();
      return await syncOrchestrator.processSyncJob(job.data);
    });

    this.queue.on('failed', async (job, error) => {
      console.error(`Sync job failed: ${job.id}`, error);
      
      if (job.attemptsMade >= 3) {
        await this.deadLetterQueue.add('failed-sync', {
          originalJob: job.data,
          error: error.message,
          failedAt: new Date()
        });
      }
    });
  }
}
```

### Conflict Detection System:
```typescript
export class SyncConflictResolver {
  async detectConflict(mapping: EventMapping, outlookEvent: OutlookEvent, wedSyncEvent: WedSyncEvent): Promise<SyncConflict | null> {
    const lastSyncHash = mapping.sync_hash;
    const currentOutlookHash = this.calculateEventHash(outlookEvent);
    const currentWedSyncHash = this.calculateEventHash(wedSyncEvent);
    
    // No conflict if Outlook hasn't changed since last sync
    if (currentOutlookHash === lastSyncHash) {
      return null;
    }
    
    // No conflict if WedSync hasn't changed since last sync  
    if (currentWedSyncHash === mapping.wedsync_event_hash) {
      return null;
    }
    
    // Both systems changed since last sync - conflict detected
    return {
      mappingId: mapping.id,
      conflictType: this.determineConflictType(outlookEvent, wedSyncEvent),
      outlookVersion: outlookEvent,
      wedSyncVersion: wedSyncEvent,
      lastSyncedAt: mapping.last_synced_at,
      detectedAt: new Date(),
      conflictFields: this.identifyConflictFields(outlookEvent, wedSyncEvent)
    };
  }

  async applyAutoResolution(conflict: SyncConflict, resolution: AutoResolutionRule): Promise<ResolutionResult> {
    switch (resolution.strategy) {
      case 'outlook_wins':
        return await this.applyOutlookChanges(conflict);
      case 'wedsync_wins':
        return await this.applyWedSyncChanges(conflict);
      case 'merge_changes':
        return await this.mergeConflictingChanges(conflict);
      case 'newest_wins':
        return await this.applyNewestChanges(conflict);
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Integration (MUST CREATE):
- [ ] `OutlookWebhookHandler.ts` - Microsoft Graph webhook processing
- [ ] `OutlookSyncOrchestrator.ts` - Real-time sync operation coordination
- [ ] `WebhookSubscriptionManager.ts` - Subscription lifecycle management
- [ ] `SyncConflictResolver.ts` - Automated and manual conflict resolution
- [ ] `WebhookQueue.ts` - Queue-based processing for reliability
- [ ] `EventMappingService.ts` - Cross-system event relationship tracking

### Real-time Features (MUST IMPLEMENT):
- [ ] Webhook notification validation and processing
- [ ] Priority-based sync operation queuing
- [ ] Automatic webhook subscription renewal
- [ ] Conflict detection with automated resolution rules
- [ ] Cross-system event synchronization
- [ ] Integration health monitoring and alerting

### Integration Reliability (MUST IMPLEMENT):
- [ ] Webhook delivery failure handling with retry logic
- [ ] Duplicate notification deduplication
- [ ] Idempotent sync operations to prevent data corruption
- [ ] Dead letter queue for permanently failed operations
- [ ] Comprehensive integration logging for debugging
- [ ] Performance monitoring for sync operation timing

## 💾 WHERE TO SAVE YOUR WORK
- **Webhook Handling**: `$WS_ROOT/wedsync/src/lib/webhooks/`
- **Sync Orchestration**: `$WS_ROOT/wedsync/src/lib/sync/`
- **Queue Management**: `$WS_ROOT/wedsync/src/lib/queues/`
- **Conflict Resolution**: `$WS_ROOT/wedsync/src/lib/conflicts/`
- **Types**: `$WS_ROOT/wedsync/src/types/integration.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/integration/outlook/`

## 🏁 COMPLETION CHECKLIST

### Integration Implementation:
- [ ] Microsoft Graph webhook handling implemented and tested
- [ ] Real-time sync orchestration functional
- [ ] Webhook subscription management with automatic renewal
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] Integration test suite with >85% coverage
- [ ] Queue-based processing for webhook events

### Reliability & Performance:
- [ ] Webhook validation and security implemented
- [ ] Conflict detection and resolution system functional
- [ ] Dead letter queue for failed operations
- [ ] Integration performance monitoring and logging
- [ ] Idempotent sync operations preventing data corruption
- [ ] Comprehensive error handling and recovery

### Wedding Workflow Integration:
- [ ] Priority processing for wedding-critical events
- [ ] Client meeting and venue visit change handling
- [ ] Wedding day timeline synchronization
- [ ] Supplier notification for schedule changes
- [ ] Emergency change processing capabilities
- [ ] Cross-system consistency enforcement

### Evidence Package:
- [ ] Webhook processing test results with Microsoft Graph simulation
- [ ] Sync orchestration performance benchmarks
- [ ] Conflict resolution demonstration with test scenarios
- [ ] Integration health monitoring dashboard functionality
- [ ] Security validation of webhook authentication
- [ ] Queue processing reliability metrics

---

**EXECUTE IMMEDIATELY - This is a comprehensive integration implementation for real-time Microsoft Outlook calendar synchronization with advanced conflict resolution and reliable webhook processing!**