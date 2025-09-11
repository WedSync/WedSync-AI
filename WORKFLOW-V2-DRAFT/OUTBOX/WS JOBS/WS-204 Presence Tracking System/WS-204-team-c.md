# WS-204-TEAM-C: Presence Tracking Integration Services
## Generated: 2025-01-20 | Development Manager Session | Feature: WS-204 Presence Tracking System

---

## 🎯 MISSION: SEAMLESS PRESENCE INTEGRATION ECOSYSTEM

**Your mission as Team C (Integration Specialists):** Create intelligent integration layer that connects presence data with external calendar systems, video conferencing platforms, and communication tools while providing presence-aware notifications and automated status updates that enhance wedding coordination workflows.

**Impact:** Enables automatic status updates when photographers are in Google Calendar meetings marked "ceremony prep," integrates Slack status with wedding platform presence, and triggers presence-aware WhatsApp notifications only when suppliers are online, eliminating interruptions during focus work while ensuring urgent coordination reaches active team members.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

Before you can claim completion, you MUST provide concrete evidence:

### 🔍 MANDATORY FILE PROOF
```bash
# Run these exact commands and include output in your completion report:
ls -la $WS_ROOT/wedsync/src/lib/integrations/presence/
ls -la $WS_ROOT/wedsync/src/app/api/webhooks/calendar-presence/
ls -la $WS_ROOT/wedsync/src/lib/notifications/presence-aware/
cat $WS_ROOT/wedsync/src/lib/integrations/presence/calendar-sync.ts | head -20
```

### 🧪 MANDATORY TEST VALIDATION
```bash
# All these commands MUST pass:
cd $WS_ROOT/wedsync && npm run typecheck
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=integration
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=presence-aware
```

### 🎭 MANDATORY E2E PROOF
Your delivery MUST include Playwright test evidence showing:
- Calendar event triggering automatic status updates
- Slack status synchronization with platform presence
- Presence-aware notification filtering working correctly
- Video conference integration updating presence to "busy"
- Google Calendar blocking automatic "away" status during meetings

**NO EXCEPTIONS:** Without this evidence, your work is incomplete regardless of integration quality.

---

## 🧠 ENHANCED SERENA MCP ACTIVATION

### 🤖 SERENA INTELLIGENCE SETUP
```bash
# MANDATORY: Activate Serena's integration pattern analysis
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/lib/integrations")
mcp__serena__find_symbol("IntegrationOrchestrator")
mcp__serena__write_memory("presence-integrations", "Presence-aware integrations with calendar systems and communication platforms")
```

**Serena-Enhanced Integration Development:**
1. **Integration Pattern Recognition**: Analyze existing webhook and API integration patterns
2. **Presence Flow Mapping**: Map presence data flow through external system integrations
3. **Error Handling**: Leverage existing integration error handling and retry mechanisms
4. **Type Safety**: Ensure TypeScript compatibility across presence integration boundaries

---

## 🧩 SEQUENTIAL THINKING ACTIVATION - PRESENCE INTEGRATION ARCHITECTURE

```typescript
mcp__sequential_thinking__sequentialthinking({
  thought: "I need to design comprehensive presence integration system connecting wedding coordination presence with external business tools. Key integration points: 1) Google Calendar sync for automatic status updates during meetings/events 2) Slack status synchronization for unified presence across platforms 3) Presence-aware notification system filtering messages based on recipient availability 4) Video conference integration (Zoom, Teams) updating status to 'busy' during calls 5) Mobile calendar app integration for on-site presence updates. The wedding context requires intelligent presence interpretation - 'ceremony prep' meetings should update status differently than regular business meetings.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For the integration architecture, I need: 1) Calendar Integration Service monitoring Google Calendar events and updating presence based on event types 2) Communication Platform Bridge synchronizing presence with Slack, Microsoft Teams 3) Presence-Aware Notification Router filtering messages based on recipient status and availability 4) Webhook Handler processing presence updates from external systems 5) Integration Health Monitor ensuring all presence connections remain active. The system must be bidirectional - both receiving presence updates from external tools and pushing WedSync presence to connected platforms.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 7
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For wedding-specific integration intelligence: Calendar events with keywords like 'ceremony', 'venue visit', 'client meeting' should trigger different presence statuses and custom messages. Integration should respect wedding business hours vs. personal time boundaries. During wedding day execution, presence should integrate with location services showing 'At [Venue Name]' automatically. The system needs conflict resolution when multiple integrations suggest different statuses - priority hierarchy: manual override > calendar busy > platform sync > automatic detection.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 7
})

// Continue structured analysis through notification intelligence, error handling, monitoring...
```

---

## 🔐 SECURITY REQUIREMENTS (TEAM C SPECIALIZATION)

### 🚨 MANDATORY SECURITY IMPLEMENTATION

**ALL presence integrations must implement secure OAuth flows:**
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { validateOAuthToken } from '$WS_ROOT/wedsync/src/lib/auth/oauth-validator';
import { encryptIntegrationData } from '$WS_ROOT/wedsync/src/lib/security/encryption';

const calendarPresenceWebhookSchema = z.object({
  eventType: z.enum(['meeting_started', 'meeting_ended', 'event_updated']),
  eventId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  summary: z.string().max(200),
  attendees: z.array(z.string().email()),
  signature: z.string()
});

export const POST = withSecureValidation(
  calendarPresenceWebhookSchema,
  async (request, validatedData) => {
    // OAuth token validation for calendar integration
    const token = await validateOAuthToken(request.headers.authorization);
    if (!token) throw new Error('Invalid calendar integration token');
    
    // Webhook signature verification
    const isValidSignature = verifyCalendarWebhookSignature(validatedData, process.env.CALENDAR_WEBHOOK_SECRET!);
    if (!isValidSignature) throw new Error('Invalid webhook signature');
    
    // Encrypt sensitive calendar data before presence processing
    const encryptedData = encryptIntegrationData(validatedData);
    
    // Rate limiting: 100 calendar events/hour per user
    // Audit logging: Calendar presence updates
    // Data minimization: Only store presence-relevant event data
  }
);
```

### 🔒 TEAM C SECURITY CHECKLIST
- [ ] OAuth 2.0 secure flows for all calendar and communication integrations
- [ ] Webhook signature verification for all external presence updates
- [ ] Data encryption for sensitive calendar and communication data
- [ ] Rate limiting: 100 integration events/hour per user
- [ ] Audit logging for all external presence data processing
- [ ] Token refresh handling with secure storage
- [ ] Integration permission validation (read-only vs. read-write access)
- [ ] Personal data minimization in presence integration logs

---

## 💡 UI TECHNOLOGY REQUIREMENTS

### 🎨 DESIGN SYSTEM INTEGRATION
Use our premium component libraries for integration management interfaces:

**Untitled UI Components (License: $247 - Premium):**
```typescript
// For integration setup and management dashboards
import { Card, Badge, Button, Switch } from '@/components/untitled-ui';
import { IntegrationCard, ConnectionStatus } from '@/components/untitled-ui/integrations';
```

**Magic UI Components (Free Tier):**
```typescript
// For presence integration status indicators
import { SyncIndicator, IntegrationHealth } from '@/components/magic-ui';
import { ConnectedBadge } from '@/components/magic-ui/status';
```

**Mandatory Navigation Integration:**
Every integration feature MUST integrate with navigation:
```typescript
// Add to: src/components/navigation/NavigationItems.tsx
{
  label: 'Integrations',
  href: '/settings/integrations',
  icon: 'plug',
  badge: connectedIntegrations > 0 ? connectedIntegrations : undefined
}
```

---

## 🔧 TEAM C INTEGRATION SPECIALIZATION

### 🎯 YOUR CORE DELIVERABLES

**1. Calendar Integration Service**
```typescript
// Required: /src/lib/integrations/presence/calendar-sync.ts
interface CalendarPresenceSync {
  // Google Calendar integration
  setupGoogleCalendarSync(userId: string, credentials: OAuth2Credentials): Promise<void>;
  processCalendarEvent(event: CalendarEvent, userId: string): Promise<void>;
  getUpcomingEventsForPresence(userId: string): Promise<PresenceRelevantEvent[]>;
  
  // Outlook/Exchange integration
  setupOutlookSync(userId: string, credentials: OAuth2Credentials): Promise<void>;
  handleOutlookWebhook(webhook: OutlookWebhook): Promise<void>;
  
  // Wedding-specific calendar intelligence
  classifyWeddingEvent(event: CalendarEvent): WeddingEventType;
  generatePresenceFromEvent(event: CalendarEvent): PresenceStatus;
}

interface CalendarEvent {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  eventType: 'meeting' | 'appointment' | 'wedding_related' | 'personal';
  isAllDay: boolean;
}

interface WeddingEventType {
  category: 'ceremony_prep' | 'venue_visit' | 'client_meeting' | 'vendor_coordination' | 'other';
  suggestedStatus: PresenceStatus;
  suggestedMessage: string;
  duration: number;
}

// Wedding event classification logic
function classifyWeddingEvent(event: CalendarEvent): WeddingEventType {
  const summary = event.summary.toLowerCase();
  const weddingKeywords = {
    ceremony: ['ceremony', 'rehearsal', 'wedding day', 'shoot'],
    venue: ['venue', 'site visit', 'walkthrough', 'setup'],
    client: ['client', 'couple', 'consultation', 'planning'],
    vendor: ['vendor', 'caterer', 'florist', 'coordinator']
  };
  
  if (weddingKeywords.ceremony.some(keyword => summary.includes(keyword))) {
    return {
      category: 'ceremony_prep',
      suggestedStatus: 'busy',
      suggestedMessage: `📸 Ceremony prep - ${event.location || 'at venue'}`,
      duration: Math.ceil((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60))
    };
  }
  
  // Additional classification logic...
}
```

**2. Communication Platform Integration**
```typescript
// Required: /src/lib/integrations/presence/communication-bridge.ts
interface CommunicationPresenceBridge {
  // Slack integration
  syncSlackStatus(userId: string, presence: PresenceState): Promise<void>;
  handleSlackStatusChange(webhook: SlackStatusWebhook): Promise<void>;
  setupSlackIntegration(userId: string, credentials: SlackOAuth): Promise<void>;
  
  // Microsoft Teams integration
  syncTeamsPresence(userId: string, presence: PresenceState): Promise<void>;
  handleTeamsPresenceWebhook(webhook: TeamsWebhook): Promise<void>;
  
  // WhatsApp Business integration
  updateWhatsAppBusinessStatus(userId: string, presence: PresenceState): Promise<void>;
  
  // Integration health monitoring
  checkIntegrationHealth(userId: string): Promise<IntegrationHealthStatus>;
}

// Slack status synchronization
async function syncSlackStatus(userId: string, presence: PresenceState): Promise<void> {
  const slackCredentials = await getSlackCredentials(userId);
  if (!slackCredentials) return;
  
  const slackStatus = mapPresenceToSlackStatus(presence);
  
  try {
    await slackClient.users.profile.set({
      token: slackCredentials.accessToken,
      profile: {
        status_text: slackStatus.text,
        status_emoji: slackStatus.emoji,
        status_expiration: slackStatus.expiration
      }
    });
    
    await logIntegrationActivity(userId, 'slack_status_update', { 
      status: slackStatus.text,
      success: true 
    });
  } catch (error) {
    await logIntegrationError(userId, 'slack_sync_failed', error);
  }
}

function mapPresenceToSlackStatus(presence: PresenceState): SlackStatus {
  const statusMapping = {
    online: { emoji: ':green_heart:', text: 'Available for wedding coordination' },
    busy: { emoji: ':wedding_planning:', text: presence.customStatus || 'In wedding meeting' },
    idle: { emoji: ':coffee:', text: 'Away from desk' },
    away: { emoji: ':calendar:', text: 'Not available' }
  };
  
  return {
    ...statusMapping[presence.status],
    expiration: presence.status === 'busy' ? Date.now() + (2 * 60 * 60 * 1000) : undefined // 2 hours
  };
}
```

**3. Presence-Aware Notification Service**
```typescript
// Required: /src/lib/notifications/presence-aware/notification-router.ts
interface PresenceAwareNotificationRouter {
  sendPresenceAwareNotification(notification: Notification, recipientIds: string[]): Promise<void>;
  filterRecipientsByPresence(recipientIds: string[], urgency: NotificationUrgency): Promise<string[]>;
  scheduleNotificationForLater(notification: Notification, recipientId: string, when: Date): Promise<void>;
  getOptimalNotificationTiming(recipientId: string): Promise<Date>;
}

interface NotificationUrgency {
  level: 'low' | 'medium' | 'high' | 'urgent';
  respectDoNotDisturb: boolean;
  deferIfBusy: boolean;
  maxDelay: number; // minutes
}

// Presence-aware notification filtering
async function filterRecipientsByPresence(
  recipientIds: string[], 
  urgency: NotificationUrgency
): Promise<string[]> {
  const presenceData = await getBulkPresence(recipientIds);
  const filteredRecipients: string[] = [];
  
  for (const [userId, presence] of Object.entries(presenceData)) {
    const shouldSendNow = await shouldSendNotificationNow(presence, urgency);
    
    if (shouldSendNow) {
      filteredRecipients.push(userId);
    } else {
      // Schedule for later based on presence patterns
      const optimalTime = await getOptimalNotificationTiming(userId);
      await scheduleNotificationForLater(
        notification,
        userId,
        optimalTime
      );
    }
  }
  
  return filteredRecipients;
}

async function shouldSendNotificationNow(
  presence: PresenceState, 
  urgency: NotificationUrgency
): Promise<boolean> {
  // Always send urgent notifications
  if (urgency.level === 'urgent') return true;
  
  // Don't disturb if busy and should defer
  if (presence.status === 'busy' && urgency.deferIfBusy) return false;
  
  // Don't send if away/offline unless high urgency
  if ((presence.status === 'away' || presence.status === 'offline') && urgency.level !== 'high') {
    return false;
  }
  
  // Check custom "do not disturb" status
  if (presence.customStatus?.includes('do not disturb') && urgency.respectDoNotDisturb) {
    return false;
  }
  
  return true;
}
```

**4. Video Conference Integration**
```typescript
// Required: /src/lib/integrations/presence/video-conference-sync.ts
interface VideoConferencePresenceSync {
  // Zoom integration
  handleZoomMeetingStarted(webhook: ZoomMeetingWebhook): Promise<void>;
  handleZoomMeetingEnded(webhook: ZoomMeetingWebhook): Promise<void>;
  
  // Microsoft Teams integration
  handleTeamsMeetingStatusChange(webhook: TeamsMeetingWebhook): Promise<void>;
  
  // Google Meet integration
  handleGoogleMeetStatusChange(webhook: GoogleMeetWebhook): Promise<void>;
  
  // Generic meeting status handler
  updatePresenceForMeeting(userId: string, meetingStatus: MeetingStatus): Promise<void>;
}

interface MeetingStatus {
  platform: 'zoom' | 'teams' | 'google_meet' | 'other';
  status: 'starting' | 'in_progress' | 'ended';
  meetingId: string;
  startTime: Date;
  endTime?: Date;
  participants: string[];
  isWeddingRelated: boolean;
}

// Automatic presence updates for video conferences
async function updatePresenceForMeeting(
  userId: string, 
  meetingStatus: MeetingStatus
): Promise<void> {
  const customStatus = generateMeetingPresenceMessage(meetingStatus);
  
  switch (meetingStatus.status) {
    case 'starting':
    case 'in_progress':
      await updateUserPresence(userId, {
        status: 'busy',
        customStatus: customStatus,
        customEmoji: '📹',
        currentPage: `/meeting/${meetingStatus.meetingId}`
      });
      break;
      
    case 'ended':
      // Revert to automatic presence detection
      await updateUserPresence(userId, {
        status: 'online',
        customStatus: null,
        customEmoji: null
      });
      break;
  }
  
  // Log for wedding business analytics
  await logIntegrationActivity(userId, 'video_conference_presence', {
    platform: meetingStatus.platform,
    status: meetingStatus.status,
    isWeddingRelated: meetingStatus.isWeddingRelated
  });
}

function generateMeetingPresenceMessage(meeting: MeetingStatus): string {
  if (meeting.isWeddingRelated) {
    return `In wedding planning call - ${meeting.platform}`;
  }
  return `In meeting - back soon`;
}
```

**5. Integration Health Monitoring**
```typescript
// Required: /src/lib/integrations/presence/health-monitor.ts
interface IntegrationHealthMonitor {
  checkAllIntegrations(userId: string): Promise<IntegrationHealthReport>;
  monitorIntegrationUptime(): Promise<void>;
  detectIntegrationFailures(): Promise<IntegrationFailure[]>;
  attemptIntegrationRecovery(integration: IntegrationType, userId: string): Promise<boolean>;
  generateHealthDashboard(): Promise<HealthDashboardData>;
}

interface IntegrationHealthReport {
  userId: string;
  timestamp: Date;
  integrations: {
    calendar: { status: 'healthy' | 'degraded' | 'failed', lastSync: Date, error?: string };
    slack: { status: 'healthy' | 'degraded' | 'failed', lastSync: Date, error?: string };
    videoConference: { status: 'healthy' | 'degraded' | 'failed', lastSync: Date, error?: string };
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

// Integration health monitoring with automatic recovery
async function monitorIntegrationHealth(): Promise<void> {
  const activeIntegrations = await getAllActiveIntegrations();
  
  for (const integration of activeIntegrations) {
    try {
      const healthCheck = await performHealthCheck(integration);
      
      if (healthCheck.status === 'failed') {
        // Attempt automatic recovery
        const recoverySuccess = await attemptIntegrationRecovery(
          integration.type, 
          integration.userId
        );
        
        if (!recoverySuccess) {
          // Alert user and admin
          await sendIntegrationFailureNotification(integration);
          await alertAdminOfIntegrationFailure(integration);
        }
      }
      
      // Update health metrics
      await updateIntegrationHealthMetrics(integration.id, healthCheck);
      
    } catch (error) {
      console.error(`Health check failed for integration ${integration.id}:`, error);
      await logIntegrationError(integration.userId, 'health_check_failed', error);
    }
  }
}
```

---

## 💒 WEDDING INDUSTRY CONTEXT

### 🤝 REAL WEDDING SCENARIOS FOR TEAM C

**Scenario 1: Photographer Calendar Integration**
- Google Calendar shows "Sarah & Mike - Engagement Shoot" from 2-5pm
- Integration automatically updates presence to "busy" with custom status "📸 Engagement shoot - back at 5pm"
- Venue coordinator sees photographer is unavailable and schedules timeline discussion for 5:30pm
- Post-shoot integration reverts status to "online" enabling immediate coordination

**Scenario 2: Venue Coordinator Multi-Platform Presence**
- Coordinator is in Zoom call labeled "Weekend Wedding Prep"
- Integration updates both WedSync and Slack status to "🏰 Wedding planning call"
- WhatsApp Business status shows "In meeting - urgent only"
- Presence-aware notifications defer non-urgent supplier messages until call ends

**Scenario 3: Wedding Day On-Site Coordination**
- Multiple suppliers have mobile calendar entries "@ Sunrise Manor - Sarah's Wedding"
- Integration automatically updates presence location and status for entire team
- Presence shows "📍 At venue - ceremony setup" enabling on-site coordination
- Real-time presence updates as team moves between ceremony and reception locations

### 🔗 WEDDING WORKFLOW INTEGRATION PATTERNS

**Calendar Event Classification for Wedding Context:**
```typescript
const weddingCalendarPatterns = {
  ceremonyPrep: {
    keywords: ['ceremony', 'rehearsal', 'setup', 'soundcheck'],
    status: 'busy',
    emoji: '💒',
    message: 'Ceremony preparation'
  },
  
  clientMeetings: {
    keywords: ['consultation', 'planning', 'couple meeting', 'client'],
    status: 'busy', 
    emoji: '💑',
    message: 'Client consultation'
  },
  
  venueWork: {
    keywords: ['venue', 'site visit', 'walkthrough', 'setup'],
    status: 'busy',
    emoji: '🏰', 
    message: 'At venue'
  },
  
  vendorCoordination: {
    keywords: ['vendor', 'supplier', 'coordination', 'team meeting'],
    status: 'busy',
    emoji: '🤝',
    message: 'Vendor coordination'
  }
};
```

**Presence-Aware Notification Intelligence:**
```typescript
const weddingNotificationRules = {
  // Timeline changes - high urgency, send to online/idle only
  timelineUpdate: {
    urgency: 'high',
    deferIfBusy: false,
    respectDoNotDisturb: true,
    maxDelay: 30 // minutes
  },
  
  // General updates - medium urgency, defer if busy
  generalUpdate: {
    urgency: 'medium', 
    deferIfBusy: true,
    respectDoNotDisturb: true,
    maxDelay: 120 // 2 hours
  },
  
  // Emergency coordination - urgent, always send
  emergencyCoordination: {
    urgency: 'urgent',
    deferIfBusy: false,
    respectDoNotDisturb: false,
    maxDelay: 0
  }
};
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### ⚡ TEAM C PERFORMANCE STANDARDS

**Integration Response Times:**
- Calendar webhook processing: < 3 seconds
- Slack status synchronization: < 2 seconds  
- Presence-aware notification filtering: < 1 second
- Integration health checks: < 5 seconds per integration

**Reliability Targets:**
- 99.5% integration uptime
- Automatic recovery within 60 seconds of failure
- OAuth token refresh handling with zero user interruption
- Integration data consistency across all platforms

**Scalability Standards:**
```typescript
const integrationPerformanceTargets = {
  concurrent: {
    maxCalendarWebhooks: 100, // per minute
    maxPresenceUpdates: 500,  // per minute
    maxNotificationFiltering: 1000 // recipients per batch
  },
  
  responseTime: {
    calendarSync: '< 3 seconds',
    slackSync: '< 2 seconds',
    notificationFiltering: '< 1 second',
    healthChecks: '< 5 seconds'
  },
  
  reliability: {
    uptime: '99.5%',
    autoRecovery: '< 60 seconds',
    tokenRefresh: 'seamless',
    dataConsistency: '99.9%'
  },
  
  monitoring: {
    healthCheckInterval: '5 minutes',
    failureAlertDelay: '< 30 seconds',
    recoveryValidation: '< 2 minutes'
  }
};
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ MANDATORY TEST COVERAGE (>90%)

**Integration Unit Tests:**
```typescript
describe('CalendarPresenceSync', () => {
  it('classifies wedding events correctly', () => {
    const ceremonyEvent = {
      summary: 'Sarah & Mike Wedding Ceremony',
      startTime: new Date('2024-06-15T15:00:00Z'),
      endTime: new Date('2024-06-15T16:00:00Z'),
      location: 'Sunrise Manor'
    };
    
    const classification = classifyWeddingEvent(ceremonyEvent);
    expect(classification.category).toBe('ceremony_prep');
    expect(classification.suggestedStatus).toBe('busy');
    expect(classification.suggestedMessage).toContain('📸 Ceremony prep');
  });

  it('handles calendar webhook signature validation', async () => {
    const validWebhook = createMockCalendarWebhook();
    const invalidWebhook = { ...validWebhook, signature: 'invalid' };
    
    await expect(processCalendarWebhook(validWebhook)).resolves.toBeTruthy();
    await expect(processCalendarWebhook(invalidWebhook)).rejects.toThrow('Invalid signature');
  });

  it('synchronizes Slack status correctly', async () => {
    const presence = { status: 'busy', customStatus: 'Wedding planning call', customEmoji: '📹' };
    
    mockSlackClient.users.profile.set.mockResolvedValue({ ok: true });
    
    await syncSlackStatus('user-123', presence);
    
    expect(mockSlackClient.users.profile.set).toHaveBeenCalledWith({
      token: expect.any(String),
      profile: {
        status_text: 'Wedding planning call',
        status_emoji: '📹',
        status_expiration: expect.any(Number)
      }
    });
  });
});
```

**Presence-Aware Notification Tests:**
```typescript
describe('PresenceAwareNotificationRouter', () => {
  it('filters recipients based on presence and urgency', async () => {
    const recipients = ['online-user', 'busy-user', 'away-user'];
    const mediumUrgency = { level: 'medium', deferIfBusy: true, maxDelay: 60 };
    
    mockPresenceData({
      'online-user': { status: 'online' },
      'busy-user': { status: 'busy' },
      'away-user': { status: 'away' }
    });
    
    const filteredRecipients = await filterRecipientsByPresence(recipients, mediumUrgency);
    
    // Only online user should receive immediate notification
    expect(filteredRecipients).toEqual(['online-user']);
    
    // Others should be scheduled for later
    expect(mockScheduleNotification).toHaveBeenCalledWith(
      expect.any(Object),
      'busy-user',
      expect.any(Date)
    );
  });

  it('respects do not disturb custom status', async () => {
    const recipients = ['dnd-user'];
    const mediumUrgency = { level: 'medium', respectDoNotDisturb: true };
    
    mockPresenceData({
      'dnd-user': { status: 'online', customStatus: 'do not disturb - client meeting' }
    });
    
    const filtered = await filterRecipientsByPresence(recipients, mediumUrgency);
    expect(filtered).toEqual([]); // Should be deferred
  });

  it('always sends urgent notifications regardless of presence', async () => {
    const recipients = ['busy-user', 'away-user'];
    const urgentLevel = { level: 'urgent', deferIfBusy: false };
    
    const filtered = await filterRecipientsByPresence(recipients, urgentLevel);
    expect(filtered).toEqual(['busy-user', 'away-user']);
  });
});
```

**Integration E2E Tests:**
```typescript
describe('Integration E2E Workflows', () => {
  test('calendar event triggers presence update flow', async ({ page }) => {
    // Setup: Login as user with calendar integration
    await page.goto('/settings/integrations');
    await setupCalendarIntegration(page);

    // Simulate calendar webhook for wedding meeting
    await sendCalendarWebhook({
      eventType: 'meeting_started',
      summary: 'Sarah & Mike - Final Timeline Review',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString()
    });

    // Verify presence updated automatically
    await page.goto('/dashboard');
    const presenceStatus = page.locator('[data-testid="my-presence-status"]');
    await expect(presenceStatus).toContainText('busy');
    await expect(presenceStatus).toContainText('Final Timeline Review');
  });

  test('Slack status synchronization workflow', async ({ page }) => {
    await page.goto('/settings/integrations');
    await setupSlackIntegration(page);

    // Update presence in WedSync
    await page.click('[data-testid="set-custom-status"]');
    await page.fill('[data-testid="status-message"]', 'At venue - ceremony setup');
    await page.click('[data-testid="update-status"]');

    // Verify Slack status updated (mock verification)
    await expect(mockSlackStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status_text: 'At venue - ceremony setup',
        status_emoji: expect.any(String)
      })
    );
  });
});
```

---

## 📚 MCP INTEGRATION WORKFLOWS

### 🔧 REQUIRED MCP OPERATIONS

**Ref MCP - Integration Documentation Research:**
```typescript
await mcp__Ref__ref_search_documentation("Google Calendar API webhook setup");
await mcp__Ref__ref_search_documentation("Slack API user status update");  
await mcp__Ref__ref_search_documentation("OAuth 2.0 token refresh patterns");
await mcp__Ref__ref_search_documentation("Zoom webhook signature verification");
```

**Supabase MCP - Integration Data Management:**
```typescript
await mcp__supabase__execute_sql("SELECT * FROM integration_credentials WHERE active = true");
await mcp__supabase__apply_migration("integration_health_tracking", healthTrackingSchema);
await mcp__supabase__get_logs("api"); // Monitor integration webhook processing
```

### 🎯 AGENT COORDINATION REQUIRED

Launch specialized agents for comprehensive integration development:

```typescript
// 1. Integration task coordination
await Task({
  description: "Coordinate presence integration tasks",
  prompt: `You are the task-tracker-coordinator for WS-204 Team C presence integration development.
  Break down the integration implementation into calendar sync, communication platform bridges, presence-aware notifications, and health monitoring tasks.
  Track dependencies between OAuth flows, webhook processing, and notification filtering systems.`,
  subagent_type: "task-tracker-coordinator"
});

// 2. Integration architecture specialist
await Task({
  description: "Presence integration architecture",
  prompt: `You are the integration-specialist for WS-204 presence tracking integrations.
  Design comprehensive integration architecture connecting presence data with Google Calendar, Slack, Microsoft Teams, and video conferencing platforms.
  Implement presence-aware notification routing that respects user availability and wedding coordination urgency levels.
  Create wedding-specific calendar intelligence that automatically generates appropriate presence status from event context.
  Focus on bidirectional synchronization maintaining presence consistency across all connected platforms.`,
  subagent_type: "integration-specialist"
});

// 3. OAuth and security specialist
await Task({
  description: "Integration security implementation",
  prompt: `You are the security-compliance-officer for WS-204 presence integration security.
  Implement secure OAuth 2.0 flows for all calendar and communication platform integrations.
  Design webhook signature verification and rate limiting for all external presence data.
  Validate token refresh mechanisms ensuring seamless user experience with secure credential management.
  Audit integration data handling ensuring personal calendar and communication data privacy.`,
  subagent_type: "security-compliance-officer"
});

// 4. Integration monitoring specialist
await Task({
  description: "Integration health monitoring",
  prompt: `You are the devops-sre-engineer for WS-204 presence integration monitoring.
  Create comprehensive health monitoring for all presence integrations with automatic failure detection.
  Implement integration recovery mechanisms with exponential backoff and user notification.
  Design integration performance monitoring tracking sync latency and success rates.
  Create alerting system for integration failures requiring immediate attention.`,
  subagent_type: "devops-sre-engineer"
});

// 5. Integration testing specialist
await Task({
  description: "Integration testing implementation",
  prompt: `You are the test-automation-architect for WS-204 presence integration testing.
  Create comprehensive test suite covering OAuth flows, webhook processing, and notification filtering.
  Design E2E tests validating calendar event presence updates and platform synchronization.
  Implement integration reliability tests simulating external service failures and recovery.
  Create performance tests ensuring integration responsiveness under wedding season load.`,
  subagent_type: "test-automation-architect"
});
```

---

## 🎖️ COMPLETION CRITERIA

### ✅ DEFINITION OF DONE

**Code Implementation (All MUST exist):**
- [ ] `/src/lib/integrations/presence/calendar-sync.ts` - Calendar integration service
- [ ] `/src/lib/integrations/presence/communication-bridge.ts` - Platform synchronization
- [ ] `/src/lib/notifications/presence-aware/notification-router.ts` - Smart notification filtering
- [ ] `/src/lib/integrations/presence/video-conference-sync.ts` - Video platform integration
- [ ] `/src/lib/integrations/presence/health-monitor.ts` - Integration monitoring
- [ ] `/src/app/api/webhooks/calendar-presence/route.ts` - Calendar webhook endpoint
- [ ] `/src/app/api/webhooks/slack-presence/route.ts` - Slack synchronization endpoint

**Integration Validation:**
- [ ] Google Calendar events automatically update presence status
- [ ] Slack status synchronization bidirectional and real-time
- [ ] Video conference presence updates (Zoom, Teams, Google Meet)
- [ ] Presence-aware notification filtering respecting availability
- [ ] OAuth token refresh handling without user interruption

**Performance Validation:**
- [ ] Calendar webhook processing < 3 seconds
- [ ] Slack synchronization < 2 seconds
- [ ] Notification filtering < 1 second for 100+ recipients
- [ ] Integration health checks < 5 seconds per platform

**Security Validation:**
- [ ] OAuth 2.0 flows secure with proper token management
- [ ] Webhook signature verification for all external data
- [ ] Rate limiting preventing integration abuse
- [ ] Personal data encryption and minimization compliance

**Wedding Context Integration:**
- [ ] Wedding event classification generating appropriate presence status
- [ ] Custom status templates for wedding industry activities
- [ ] Location-aware presence updates for venue coordination
- [ ] Urgency-based notification routing for wedding coordination

---

## 📖 DOCUMENTATION REQUIREMENTS

### 📝 MANDATORY DOCUMENTATION

Create comprehensive integration setup and usage documentation:

**Integration Setup Guide:**
```markdown
# Presence Tracking Integrations

## Google Calendar Integration
Automatically update your presence based on calendar events.

### Setup Process
1. Navigate to Settings > Integrations
2. Click "Connect Google Calendar"
3. Authorize WedSync to read your calendar
4. Configure event classification rules

### Wedding Event Recognition
The system automatically recognizes wedding-related events:
- **Ceremony/Rehearsal**: Status becomes "busy" with ceremony prep message
- **Client Meetings**: Shows "busy" with client consultation status
- **Venue Visits**: Updates location and "at venue" status
- **Vendor Coordination**: Indicates collaboration meeting status

## Slack Integration  
Keep your Slack status synchronized with wedding platform presence.

### Features
- Automatic status updates when presence changes
- Wedding-specific status emojis and messages
- Bidirectional synchronization (Slack changes update WedSync)
- Custom status templates for wedding professionals

## Presence-Aware Notifications
Smart notification delivery based on recipient availability.

### Notification Filtering
- **Urgent**: Always delivered regardless of presence
- **High**: Sent to online/idle users, deferred for busy/away
- **Medium**: Respects all presence states and "do not disturb"
- **Low**: Queued for optimal delivery timing
```

**Wedding Professional Integration Guide:**
```markdown
# Integration Best Practices for Wedding Professionals

## Photographers
- Connect calendar for automatic "ceremony prep" status during shoots
- Use location sharing for venue coordination
- Set "do not disturb" during critical ceremony moments

## Venue Coordinators
- Enable Slack integration for team coordination
- Use presence-aware notifications to avoid interrupting busy suppliers
- Connect calendar for automatic setup/breakdown status updates

## Wedding Planners  
- Integrate all platforms for comprehensive presence awareness
- Use custom status for client availability windows
- Enable urgent notifications for day-of coordination

## Privacy and Boundaries
- "Appear offline" option for focused work time
- Custom status messages for professional availability
- Integration permissions respect business vs. personal time
```

---

## 💼 WEDDING BUSINESS IMPACT

### 📊 SUCCESS METRICS

**Communication Efficiency Gains:**
- 60% reduction in interruptions during focus work (busy status)
- Automatic presence updates eliminate manual status management
- Context-aware notifications improve coordination timing
- Cross-platform consistency reduces communication confusion

**Wedding Coordination Improvements:**
- Real-time availability visibility enables immediate vs. deferred communication decisions
- Calendar integration provides advance notice of supplier availability
- Location-aware presence supports on-site wedding day coordination
- Emergency coordination bypasses presence rules for critical updates

**Professional Productivity Enhancement:**
- Integrated presence management across all business tools
- Automated status updates reduce manual presence maintenance
- Wedding-specific presence intelligence improves client communication
- Professional boundary management through presence privacy controls

---

**🎯 TEAM C SUCCESS DEFINITION:**
You've succeeded when wedding professionals have seamless presence synchronization across Google Calendar, Slack, and video platforms, with intelligent notification filtering that respects availability while ensuring urgent wedding coordination always reaches the right people at the right time.

---

**🚨 FINAL REMINDER - EVIDENCE REQUIRED:**
Your completion report MUST include:
1. File existence proof (`ls -la` output)
2. TypeScript compilation success (`npm run typecheck`)
3. All tests passing (`npm test`)
4. Integration webhook processing validation
5. OAuth flow security verification
6. Presence synchronization accuracy testing

**No exceptions. Evidence-based delivery only.**

---

*Generated by WedSync Development Manager*  
*Feature: WS-204 Presence Tracking System*  
*Team: C (Integration Specialists)*  
*Scope: Presence-aware integrations with external platforms*  
*Standards: Evidence-based completion with OAuth security and wedding context intelligence*