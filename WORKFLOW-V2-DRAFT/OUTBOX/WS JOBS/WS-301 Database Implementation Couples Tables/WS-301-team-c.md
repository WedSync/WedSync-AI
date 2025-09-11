# TEAM C - ROUND 1: WS-301 - Database Implementation - Couples Tables
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build real-time integrations and data synchronization systems for couples database
**FEATURE ID:** WS-301 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time wedding coordination across multiple systems and users

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/couples/
cat $WS_ROOT/wedsync/src/lib/realtime/couples-sync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations/couples
# MUST show: "All tests passing"
```

4. **INTEGRATION TESTING PROOF:**
```bash
# Show real-time subscription tests working
npm test realtime/couples
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query integration patterns and real-time systems
await mcp__serena__search_for_pattern("realtime subscription webhook integration");
await mcp__serena__find_symbol("supabase realtime broadcast", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. REAL-TIME PATTERNS ANALYSIS
```typescript
// Load existing real-time and integration patterns
await mcp__serena__search_for_pattern("supabase realtime channels subscription");
await mcp__serena__find_symbol("createClient subscription", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/supabase/client.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Use Ref MCP to search for:
ref_search_documentation("Supabase realtime subscriptions broadcast presence")
ref_search_documentation("Next.js server-sent-events websockets")
ref_search_documentation("PostgreSQL triggers functions notifications")
ref_search_documentation("Webhook integration patterns error handling")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION ARCHITECTURE

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Wedding Data Integration Analysis
```typescript
// Before building couples database integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Couples database integration needs: real-time updates to connected suppliers when core fields change, email notifications for RSVP updates, task assignment notifications to helpers, photo upload sync to galleries, wedding website auto-updates, and external calendar integrations for timeline events.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Core field updates trigger notifications to multiple suppliers simultaneously, guest RSVP changes affect catering numbers and seating charts, task assignments need multi-channel delivery (email, SMS, in-app), budget updates must remain private while other data syncs openly.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time requirements: Couples and partners need synchronized views when both editing simultaneously, suppliers need immediate core field updates during planning calls, wedding party needs real-time task status updates on wedding day, mobile apps need offline-capable sync for poor venue connectivity.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Supplier systems become unavailable during critical updates, email services hit rate limits during bulk RSVP periods, mobile networks fail at venue locations, third-party calendar APIs return errors during timeline sync. Need circuit breakers, retry queues, and graceful degradation.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific integration challenges: Timeline conflicts when multiple suppliers edit simultaneously, guest data privacy during multi-vendor access, RSVP deadlines triggering automated reminders, dietary restrictions flowing to caterers in real-time, photo sharing between couples and vendors with permission controls.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use Supabase realtime for live updates, implement event-driven architecture with message queues, create integration health monitoring with fallback mechanisms, build idempotent operations for retry safety, maintain comprehensive audit logs for wedding data changes.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track integration dependencies across Teams A, B, D
2. **integration-specialist** - Use Serena for existing integration pattern analysis
3. **security-compliance-officer** - Ensure secure data flow and webhook validation
4. **code-quality-guardian** - Maintain consistent integration patterns and error handling
5. **test-automation-architect** - Integration testing with mock services and real-time validation
6. **documentation-chronicler** - Integration flow documentation and troubleshooting guides

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **Webhook authentication** - All webhook endpoints verify signatures
- [ ] **Data encryption in transit** - All external communications use HTTPS/WSS
- [ ] **API key management** - Secure storage and rotation of integration credentials
- [ ] **Rate limiting protection** - Prevent abuse of integration endpoints
- [ ] **Input validation** - All external data validated before processing
- [ ] **Permission boundary enforcement** - Suppliers only receive permitted data
- [ ] **Audit logging** - All integration events logged with user context
- [ ] **Failure isolation** - Integration failures don't break core functionality

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION REQUIREMENTS:**
- Real-time data synchronization using Supabase realtime
- Webhook endpoints for external service integration
- Event-driven architecture with proper error handling
- Multi-channel notification system (email, SMS, push)
- Integration health monitoring and alerting
- Graceful degradation when external services fail
- Circuit breaker pattern for external API calls

## 📋 TECHNICAL SPECIFICATION

**Core Integration Systems to Build:**

### 1. Real-Time Core Fields Synchronization
```typescript
// Real-time subscription for core field updates
export class CouplesRealTimeSync {
  private supabase = createClientComponent();
  
  async subscribeToCore FieldsUpdates(coupleId: string): Promise<RealtimeChannel> {
    const channel = this.supabase.channel(`couple_${coupleId}_core_fields`);
    
    return channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'couple_core_fields', filter: `couple_id=eq.${coupleId}` },
        async (payload) => {
          // Notify connected suppliers of core field changes
          await this.notifyConnectedSuppliers(coupleId, payload.new);
          
          // Update wedding website if auto-sync enabled
          await this.updateWeddingWebsite(coupleId, payload.new);
          
          // Trigger calendar integration updates
          await this.updateExternalCalendars(coupleId, payload.new);
        })
      .subscribe();
  }
  
  private async notifyConnectedSuppliers(coupleId: string, coreFields: CoreWeddingFields): Promise<void> {
    // Get connected suppliers with proper permissions
    const { data: connections } = await this.supabase
      .from('couple_suppliers')
      .select('supplier_id, can_view_guests, can_view_budget')
      .eq('couple_id', coupleId)
      .eq('connection_status', 'connected');
    
    if (!connections?.length) return;
    
    // Send filtered data to each supplier based on permissions
    for (const connection of connections) {
      const filteredData = this.filterDataByPermissions(coreFields, connection);
      
      // Broadcast to supplier's channel
      await this.supabase
        .channel(`supplier_${connection.supplier_id}`)
        .send({
          type: 'core_fields_updated',
          payload: { 
            couple_id: coupleId, 
            data: filteredData 
          }
        });
    }
  }
}
```

### 2. Guest RSVP Integration System
```typescript
// Guest RSVP updates with multi-channel notifications
export class GuestRSVPIntegration {
  async handleRSVPUpdate(guestId: string, rsvpData: RSVPUpdateData): Promise<void> {
    // Update database
    const { data: guest } = await supabase
      .from('couple_guests')
      .update({
        rsvp_status: rsvpData.status,
        rsvp_date: new Date().toISOString(),
        dietary_requirements: rsvpData.dietary_requirements
      })
      .eq('id', guestId)
      .select('*, couples(*)')
      .single();
    
    if (!guest) throw new Error('Guest not found');
    
    // Notify couple of RSVP update
    await this.sendRSVPNotificationToCouples(guest);
    
    // Update catering supplier with dietary requirements
    await this.notifyCateringSupplier(guest);
    
    // Update seating chart if auto-enabled
    await this.updateSeatingChart(guest);
    
    // Trigger real-time update for couples' dashboard
    await this.broadcastRSVPUpdate(guest);
  }
  
  private async sendRSVPNotificationToCouples(guest: GuestWithCouple): Promise<void> {
    const notification = {
      type: 'rsvp_update',
      title: `${guest.first_name} ${guest.last_name} ${guest.rsvp_status === 'yes' ? 'is attending' : 'cannot attend'}`,
      message: guest.rsvp_status === 'yes' 
        ? `Great news! ${guest.first_name} just confirmed they'll be at your wedding.`
        : `${guest.first_name} won't be able to attend, but they're thinking of you!`,
      guest_id: guest.id,
      couple_id: guest.couple_id
    };
    
    // Multi-channel delivery based on couple preferences
    await Promise.allSettled([
      this.sendEmailNotification(guest.couples.partner1_email, notification),
      guest.couples.partner2_email ? this.sendEmailNotification(guest.couples.partner2_email, notification) : null,
      this.sendInAppNotification(guest.couple_id, notification),
      guest.couples.preferred_contact_method === 'sms' ? this.sendSMSNotification(guest.couples.partner1_phone, notification) : null
    ].filter(Boolean));
  }
}
```

### 3. Task Assignment Integration
```typescript
// Task delegation with helper notifications
export class TaskDelegationIntegration {
  async assignTaskToHelper(taskId: string, assignmentData: TaskAssignmentData): Promise<void> {
    // Update task assignment
    const { data: task } = await supabase
      .from('couple_tasks')
      .update({
        assigned_to_guest_id: assignmentData.guest_id,
        assigned_to_name: assignmentData.helper_name,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select('*, couple_guests(*), couples(*)')
      .single();
    
    if (!task) throw new Error('Task not found');
    
    // Send task assignment notification
    await this.notifyHelperOfAssignment(task);
    
    // Add to helper's personal calendar if integrated
    await this.addToHelperCalendar(task);
    
    // Create reminder notifications for task deadline
    await this.scheduleTaskReminders(task);
    
    // Broadcast real-time update
    await this.broadcastTaskUpdate(task);
  }
  
  private async notifyHelperOfAssignment(task: TaskWithGuest): Promise<void> {
    const helper = task.couple_guests;
    const couple = task.couples;
    
    const notification = {
      subject: `Wedding Task Assigned: ${task.task_title}`,
      message: `Hi ${helper.first_name}! ${couple.partner1_first_name} has asked for your help with "${task.task_title}" for their wedding. This task is scheduled for ${task.task_timing} and should take about ${task.duration_minutes} minutes.`,
      task_details: {
        title: task.task_title,
        description: task.task_description,
        timing: task.task_timing,
        specific_time: task.specific_time,
        location: task.task_location,
        priority: task.priority
      }
    };
    
    // Multi-channel delivery based on helper preferences
    const deliveryPromises = [];
    
    if (helper.email) {
      deliveryPromises.push(this.sendTaskAssignmentEmail(helper.email, notification));
    }
    
    if (helper.phone && task.delivery_method === 'sms') {
      deliveryPromises.push(this.sendTaskAssignmentSMS(helper.phone, notification));
    }
    
    // Always send in-app notification if helper has account
    deliveryPromises.push(this.sendInAppTaskNotification(helper.id, notification));
    
    await Promise.allSettled(deliveryPromises);
    
    // Log delivery for audit trail
    await this.logTaskNotificationDelivery(task.id, helper.id, deliveryPromises.length);
  }
}
```

### 4. Supplier Data Sync Integration
```typescript
// Supplier permission-based data synchronization
export class SupplierDataSyncIntegration {
  async syncCoupleDataToSupplier(coupleId: string, supplierId: string): Promise<void> {
    // Get supplier permissions
    const { data: connection } = await supabase
      .from('couple_suppliers')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('supplier_id', supplierId)
      .eq('connection_status', 'connected')
      .single();
    
    if (!connection) throw new Error('Supplier not connected');
    
    // Get couple data based on permissions
    const coupleData = await this.getCoupleDataByPermissions(coupleId, connection);
    
    // Send filtered data to supplier's webhook endpoint
    await this.sendDataToSupplierWebhook(supplierId, coupleData);
    
    // Update supplier's real-time channel
    await this.broadcastToSupplierChannel(supplierId, coupleData);
    
    // Log data sync for audit
    await this.logSupplierDataSync(coupleId, supplierId, Object.keys(coupleData));
  }
  
  private async getCoupleDataByPermissions(coupleId: string, connection: SupplierConnection): Promise<FilteredCoupleData> {
    const baseData = await this.getBaseCoupleData(coupleId);
    
    const filteredData: FilteredCoupleData = {
      core_fields: baseData.core_fields,
      basic_info: {
        couple_display_name: baseData.couple_display_name,
        wedding_date: baseData.core_fields.wedding_date,
        ceremony_venue: baseData.core_fields.ceremony_venue_name,
        reception_venue: baseData.core_fields.reception_venue_name
      }
    };
    
    // Add guest data if permitted
    if (connection.can_view_guests) {
      filteredData.guests = await this.getGuestData(coupleId);
      filteredData.guest_count = await this.getGuestCounts(coupleId);
    }
    
    // Add timeline data if permitted
    if (connection.can_edit_timeline) {
      filteredData.timeline = await this.getTimelineData(coupleId);
    }
    
    // Budget data is never included for suppliers
    // Only couple themselves can see budget information
    
    return filteredData;
  }
}
```

### 5. Wedding Website Integration
```typescript
// Auto-sync couples data to wedding website
export class WeddingWebsiteIntegration {
  async syncCoupleDataToWebsite(coupleId: string): Promise<void> {
    // Get website settings and permissions
    const { data: settings } = await supabase
      .from('couple_website_settings')
      .select('*')
      .eq('couple_id', coupleId)
      .single();
    
    if (!settings?.auto_sync_enabled) return;
    
    // Get public data only
    const publicData = await this.getPublicCoupleData(coupleId);
    
    // Update website content
    await this.updateWebsiteContent(coupleId, publicData);
    
    // Trigger website rebuild if static
    await this.triggerWebsiteRebuild(coupleId);
    
    // Notify couple of successful sync
    await this.notifyWebsiteSync(coupleId);
  }
  
  private async getPublicCoupleData(coupleId: string): Promise<PublicCoupleData> {
    // Only include data marked as public
    const { data: couple } = await supabase
      .from('couples')
      .select(`
        couple_display_name,
        wedding_hashtag,
        couple_core_fields(
          wedding_date,
          ceremony_venue_name,
          ceremony_time,
          reception_venue_name,
          reception_time
        )
      `)
      .eq('id', coupleId)
      .single();
    
    return {
      couple_name: couple.couple_display_name,
      hashtag: couple.wedding_hashtag,
      wedding_date: couple.couple_core_fields.wedding_date,
      ceremony: {
        venue: couple.couple_core_fields.ceremony_venue_name,
        time: couple.couple_core_fields.ceremony_time
      },
      reception: {
        venue: couple.couple_core_fields.reception_venue_name,
        time: couple.couple_core_fields.reception_time
      }
    };
  }
}
```

## 🔄 INTEGRATION HEALTH MONITORING

### Circuit Breaker Implementation
```typescript
export class IntegrationHealthMonitor {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  async executeWithCircuitBreaker<T>(
    integrationName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const breaker = this.getCircuitBreaker(integrationName);
    
    try {
      return await breaker.execute(operation);
    } catch (error) {
      console.error(`Integration ${integrationName} failed:`, error);
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }
  
  private getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const breaker = new CircuitBreaker({
        errorThreshold: 5,
        timeout: 10000,
        resetTimeout: 60000
      });
      
      this.circuitBreakers.set(name, breaker);
    }
    
    return this.circuitBreakers.get(name)!;
  }
}
```

## 💾 WHERE TO SAVE YOUR WORK
- Real-time Systems: $WS_ROOT/wedsync/src/lib/realtime/couples-sync.ts
- Integration Services: $WS_ROOT/wedsync/src/lib/integrations/couples/
- Webhook Handlers: $WS_ROOT/wedsync/src/app/api/webhooks/couples/
- Event Handlers: $WS_ROOT/wedsync/src/lib/events/couples/
- Types: $WS_ROOT/wedsync/src/types/integrations.ts
- Tests: $WS_ROOT/wedsync/tests/integrations/couples/

## 🧪 TESTING REQUIREMENTS

### 1. Real-Time Integration Testing
```typescript
describe('Couples Real-Time Integration', () => {
  it('should sync core field updates to connected suppliers', async () => {
    const mockSupplier = await createMockSupplier();
    await connectSupplierToCouple(mockCouple.id, mockSupplier.id);
    
    // Update core fields
    await updateCoupleCore Fields(mockCouple.id, { guest_count_estimated: 150 });
    
    // Verify supplier received update
    await expect(mockSupplier.receivedUpdates).toContain({
      type: 'core_fields_updated',
      payload: expect.objectContaining({ guest_count_estimated: 150 })
    });
  });

  it('should handle integration failures gracefully', async () => {
    const mockFailingService = jest.fn().mockRejectedValue(new Error('Service unavailable'));
    
    await expect(executeIntegrationWithFallback(mockFailingService, fallbackService))
      .resolves.toBe('fallback_result');
  });
});
```

### 2. Webhook Integration Testing
```typescript
describe('Couples Webhook Integration', () => {
  it('should validate webhook signatures', async () => {
    const invalidRequest = createMockWebhookRequest({ signature: 'invalid' });
    
    const response = await handleCouplesWebhook(invalidRequest);
    
    expect(response.status).toBe(401);
  });

  it('should process RSVP updates correctly', async () => {
    const rsvpUpdate = {
      guest_id: 'test-guest-id',
      rsvp_status: 'yes',
      dietary_requirements: ['vegetarian']
    };
    
    await handleRSVPWebhook(rsvpUpdate);
    
    // Verify database was updated
    // Verify notifications were sent
    // Verify suppliers were notified
  });
});
```

## ✅ COMPLETION CHECKLIST

### Real-Time Integration:
- [ ] Core field updates sync to connected suppliers in real-time
- [ ] Guest RSVP changes trigger multi-channel notifications
- [ ] Task assignments send notifications to helpers immediately
- [ ] Wedding website auto-updates when couple data changes
- [ ] Mobile app sync works offline and reconnects gracefully

### Integration Security:
- [ ] All webhook endpoints validate signatures
- [ ] Data filtering based on supplier permissions
- [ ] Circuit breakers prevent cascading failures
- [ ] Audit logging for all integration events
- [ ] Rate limiting on external API calls

### Error Handling:
- [ ] Graceful degradation when services fail
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queues for failed events
- [ ] Health monitoring and alerting
- [ ] Integration status dashboard

### Performance:
- [ ] Real-time updates delivered in <1 second
- [ ] Batch notifications to prevent spam
- [ ] Database queries optimized for integration load
- [ ] Caching layer for frequently accessed data

## 🔄 INTEGRATION FLOW DOCUMENTATION

Create comprehensive documentation at:
`$WS_ROOT/wedsync/docs/integrations/couples-integration-flows.md`

Include:
- Real-time synchronization patterns
- Webhook integration specifications
- Error handling and retry strategies
- Security and permission boundaries
- Testing procedures and mock services
- Troubleshooting guides for common issues

---

**EXECUTE IMMEDIATELY - This is the comprehensive integration architecture for wedding couples data across all systems!**