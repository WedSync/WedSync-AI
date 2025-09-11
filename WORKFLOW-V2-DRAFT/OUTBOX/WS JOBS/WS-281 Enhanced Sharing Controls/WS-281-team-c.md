# TEAM C - ROUND 1: WS-281 - Enhanced Sharing Controls
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build real-time sharing integrations and notification systems for privacy-aware wedding data sharing
**FEATURE ID:** WS-281 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about secure real-time sharing and privacy-compliant notifications

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/sharing/
cat $WS_ROOT/wedsync/src/lib/integrations/sharing/real-time-sharing.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test sharing-integration
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

// Query sharing integration and notification patterns
await mcp__serena__search_for_pattern("sharing integration realtime notification privacy");
await mcp__serena__find_symbol("SharingIntegration NotificationService RealtimeUpdates", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### B. INTEGRATION & REALTIME PATTERNS (MANDATORY FOR ALL INTEGRATION WORK)
```typescript
// CRITICAL: Load integration and realtime patterns
await mcp__serena__search_for_pattern("realtime websocket subscription notification");
await mcp__serena__find_referencing_symbols("webhook supabase-realtime notification-service");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/realtime/realtime-manager.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to sharing integrations
# Use Ref MCP to search for:
# - "Real-time sharing notifications WebSocket"
# - "Supabase realtime permission updates"
# - "Privacy-compliant notification systems"
# - "Secure sharing link integrations"
# - "Real-time permission synchronization"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR SHARING INTEGRATION ARCHITECTURE

### Use Sequential Thinking MCP for Integration Strategy
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Sharing integration system needs: Real-time permission updates across all connected users, secure notification dispatch for sharing activities, integration with external sharing platforms (email, messaging), webhook systems for sharing events, privacy-compliant notification preferences, cross-device sharing synchronization.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity: Multiple notification channels with different privacy requirements, real-time permission sync across devices, secure sharing link generation and validation, external platform integration (email providers, messaging apps), notification preference management, GDPR compliance for sharing notifications.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Privacy and security considerations: Encrypted sharing notifications, secure webhook validation, permission-based notification filtering, audit trails for all sharing communications, consent management for external sharing, rate limiting to prevent notification spam, secure token handling in notifications.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build real-time sharing synchronization with WebSockets, create secure notification orchestration system, implement privacy-compliant external integrations, establish webhook systems for sharing events, add comprehensive audit logging, create cross-platform sharing coordination.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track sharing integration development and notification workflows
2. **realtime-integration-specialist** - Build WebSocket and Supabase realtime sharing updates
3. **notification-privacy-specialist** - Create privacy-compliant notification systems
4. **webhook-security-architect** - Implement secure sharing webhook systems
5. **test-automation-architect** - Integration testing and privacy compliance validation
6. **documentation-chronicler** - Sharing integration documentation and privacy guides

## 🎯 TEAM C SPECIALIZATION: INTEGRATION & REAL-TIME FOCUS

**Core Integration Components to Build:**

1. **RealtimeSharingSync** - Real-time permission updates across devices
2. **SharingNotificationOrchestrator** - Multi-channel sharing notifications
3. **PrivacyCompliantNotifications** - GDPR-compliant notification system
4. **SecureSharingWebhooks** - Webhook system for sharing events
5. **CrossPlatformSharingIntegration** - External platform sharing coordination
6. **SharingAuditStreamer** - Real-time audit log streaming

### Key Integration Features:
- Real-time sharing permission synchronization via WebSocket
- Privacy-aware multi-channel notification dispatch
- Secure external platform integrations (email, messaging)
- Webhook system for sharing activity monitoring
- Cross-device sharing state synchronization
- Comprehensive audit streaming for compliance

## 🔗 REAL-TIME SHARING ARCHITECTURE

### WebSocket Permission Synchronization:
```typescript
interface SharingWebSocketManager {
  // Subscribe to sharing permission changes
  subscribeToSharingUpdates(userId: string, resourceId: string): void;
  
  // Broadcast permission changes to all connected clients
  broadcastPermissionUpdate(update: PermissionUpdate): Promise<void>;
  
  // Handle secure sharing link access
  handleSecureLinkAccess(token: string, clientId: string): Promise<void>;
}

class RealtimeSharingSync {
  private connections: Map<string, WebSocket> = new Map();
  private supabaseClient: SupabaseClient;
  
  async initializeSharingSync(): Promise<void> {
    // Set up Supabase realtime subscription for sharing changes
    this.supabaseClient
      .channel('sharing-permissions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sharing_permissions'
      }, (payload) => {
        this.handlePermissionChange(payload);
      })
      .subscribe();
  }
  
  private async handlePermissionChange(payload: any): Promise<void> {
    const update: PermissionUpdate = {
      type: payload.eventType,
      resourceId: payload.new?.resource_id || payload.old?.resource_id,
      permissions: payload.new?.permissions,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all relevant connected clients
    await this.broadcastToAuthorizedClients(update);
    
    // Log the real-time update
    await AuditLogger.logRealtimeUpdate(update);
  }
  
  private async broadcastToAuthorizedClients(update: PermissionUpdate): Promise<void> {
    // Get all users with access to this resource
    const authorizedUsers = await SharingService.getAuthorizedUsers(update.resourceId);
    
    // Send update to each authorized user's connections
    for (const userId of authorizedUsers) {
      const connections = this.getUserConnections(userId);
      for (const connection of connections) {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'PERMISSION_UPDATE',
            data: update
          }));
        }
      }
    }
  }
}
```

### Privacy-Compliant Notification System:
```typescript
interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in-app';
  isPrivacyCompliant: boolean;
  requiresConsent: boolean;
  send(message: SharingNotification, recipient: NotificationRecipient): Promise<void>;
}

class SharingNotificationOrchestrator {
  private channels: Map<string, NotificationChannel> = new Map();
  
  async sendSharingNotification(
    sharingActivity: SharingActivity,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const recipient of recipients) {
      // Check privacy preferences and consent
      const preferences = await this.getPrivacyPreferences(recipient.userId);
      
      if (!preferences.allowsSharingNotifications) {
        continue; // Respect privacy preferences
      }
      
      // Determine appropriate notification channels
      const channels = this.selectChannels(preferences, sharingActivity.urgency);
      
      for (const channelType of channels) {
        try {
          const channel = this.channels.get(channelType);
          if (channel && (!channel.requiresConsent || preferences.hasConsent(channelType))) {
            await channel.send(
              this.createNotificationMessage(sharingActivity, channelType),
              recipient
            );
            
            results.push({
              recipient: recipient.userId,
              channel: channelType,
              status: 'sent',
              timestamp: new Date()
            });
            
            // Log notification for audit compliance
            await this.logNotificationActivity(recipient, channelType, sharingActivity);
          }
        } catch (error) {
          results.push({
            recipient: recipient.userId,
            channel: channelType,
            status: 'failed',
            error: error.message,
            timestamp: new Date()
          });
        }
      }
    }
    
    return results;
  }
  
  private async logNotificationActivity(
    recipient: NotificationRecipient,
    channel: string,
    activity: SharingActivity
  ): Promise<void> {
    await AuditLogger.log({
      action: 'SHARING_NOTIFICATION_SENT',
      userId: activity.initiatedBy,
      targetUserId: recipient.userId,
      details: {
        channel,
        activityType: activity.type,
        resourceId: activity.resourceId
      }
    });
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Real-time sharing permission synchronization via WebSocket
- [ ] Privacy-compliant multi-channel notification system
- [ ] Secure webhook handlers for sharing activity monitoring
- [ ] Cross-device sharing state synchronization
- [ ] External platform integration for secure sharing
- [ ] Comprehensive sharing audit streaming
- [ ] GDPR-compliant notification preferences management
- [ ] Integration health monitoring and circuit breakers
- [ ] Real-time sharing analytics and insights
- [ ] Secure sharing token validation system

## 🔔 NOTIFICATION INTEGRATION ARCHITECTURE

### Multi-Channel Notification System:
```typescript
class EmailSharingNotificationChannel implements NotificationChannel {
  type = 'email' as const;
  isPrivacyCompliant = true;
  requiresConsent = true;
  
  async send(message: SharingNotification, recipient: NotificationRecipient): Promise<void> {
    const emailTemplate = await this.getSharingTemplate(message.type);
    
    await EmailService.send({
      to: recipient.email,
      subject: message.subject,
      template: emailTemplate,
      data: {
        recipientName: recipient.name,
        sharerName: message.sharerName,
        resourceType: message.resourceType,
        sharingUrl: message.secureUrl,
        expiresAt: message.expiresAt
      }
    });
  }
}

class InAppSharingNotificationChannel implements NotificationChannel {
  type = 'in-app' as const;
  isPrivacyCompliant = true;
  requiresConsent = false;
  
  async send(message: SharingNotification, recipient: NotificationRecipient): Promise<void> {
    await InAppNotificationService.create({
      userId: recipient.userId,
      type: 'sharing',
      title: message.subject,
      content: message.body,
      data: {
        resourceId: message.resourceId,
        sharingId: message.sharingId,
        actionUrl: message.secureUrl
      },
      expiresAt: message.expiresAt
    });
  }
}
```

### Secure Webhook System:
```typescript
class SharingSharingWebhookManager {
  async registerWebhook(
    weddingId: string, 
    callbackUrl: string, 
    events: SharingWebhookEvent[]
  ): Promise<WebhookRegistration> {
    // Validate webhook URL and security
    await this.validateWebhookSecurity(callbackUrl);
    
    const webhook = await db.insert(sharingWebhooks).values({
      weddingId,
      callbackUrl,
      events,
      secretKey: this.generateWebhookSecret(),
      isActive: true
    }).returning();
    
    return webhook[0];
  }
  
  async deliverWebhook(event: SharingWebhookEvent, data: any): Promise<void> {
    const webhooks = await this.getActiveWebhooks(data.weddingId, event);
    
    for (const webhook of webhooks) {
      try {
        const payload = this.createWebhookPayload(event, data, webhook.secretKey);
        
        await fetch(webhook.callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WedSync-Signature': this.generateSignature(payload, webhook.secretKey),
            'X-WedSync-Event': event
          },
          body: JSON.stringify(payload)
        });
        
        // Log successful delivery
        await this.logWebhookDelivery(webhook.id, event, 'success');
        
      } catch (error) {
        // Log failed delivery and implement retry logic
        await this.logWebhookDelivery(webhook.id, event, 'failed', error.message);
        await this.scheduleWebhookRetry(webhook, event, data);
      }
    }
  }
}
```

## 💾 WHERE TO SAVE YOUR WORK
- Integrations: $WS_ROOT/wedsync/src/lib/integrations/sharing/
- Realtime: $WS_ROOT/wedsync/src/lib/realtime/sharing/
- Notifications: $WS_ROOT/wedsync/src/lib/notifications/sharing/
- Webhooks: $WS_ROOT/wedsync/src/app/api/webhooks/sharing/
- Types: $WS_ROOT/wedsync/src/types/sharing-integration.ts
- Tests: $WS_ROOT/wedsync/__tests__/integrations/sharing/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## ⚠️ CRITICAL WARNINGS
- Validate ALL webhook signatures to prevent malicious payloads
- Respect user privacy preferences for all notifications
- Implement circuit breakers for external integrations
- Never log sensitive sharing data in plain text
- Ensure GDPR compliance for all notification channels
- Rate limit webhook deliveries to prevent spam
- Validate sharing token expiration before notifications

## 🏁 COMPLETION CHECKLIST
- [ ] Real-time sharing synchronization via WebSocket working
- [ ] Privacy-compliant notification system operational
- [ ] Secure webhook delivery system functional
- [ ] Cross-device sharing state sync implemented
- [ ] External platform integrations secured
- [ ] Sharing audit streaming active
- [ ] GDPR compliance features verified
- [ ] Integration health monitoring implemented
- [ ] Circuit breakers and retry logic added
- [ ] Comprehensive integration tests passing

---

**EXECUTE IMMEDIATELY - Build the sharing integration system that respects privacy while enabling collaboration!**