# WedSync Broadcast Events System - Integration Guide

## Overview
Comprehensive integration guide for WedSync's Broadcast Events System, covering all external service integrations essential for wedding industry communication workflows.

## Integration Architecture

### Communication Flow
```
WedSync Platform
    ↓
Broadcast Events System
    ├── Email Service (Resend)
    ├── SMS Service (Twilio)  
    ├── Calendar Integration (Google)
    └── Workspace Integration (Slack)
```

### Integration Principles
- **Wedding Industry First**: All integrations optimized for wedding workflows
- **Fault Tolerance**: Graceful degradation when external services fail
- **Rate Limit Compliance**: Respectful API usage patterns
- **Data Privacy**: Wedding information protected across all integrations
- **Real-time Sync**: Immediate updates across all connected platforms

## Email Integration (Resend)

### Service Configuration
```typescript
// Resend Client Setup
const resend = new Resend({
  apiKey: process.env.RESEND_API_KEY,
  baseURL: 'https://api.resend.com'
});
```

### Wedding Email Templates

#### Venue Emergency Alert
```typescript
const venueEmergencyTemplate = {
  templateId: 'venue_emergency_alert',
  subject: 'URGENT: {{venue_name}} - Emergency Update for {{wedding_date}}',
  variables: {
    couple_names: string,
    venue_name: string,
    emergency_type: 'power_outage' | 'weather' | 'access_issue',
    coordinator_contact: string,
    backup_plan: string,
    next_update_time: string
  }
};
```

#### Coordinator Handoff Notification
```typescript
const coordinatorHandoffTemplate = {
  templateId: 'coordinator_handoff',
  subject: 'Wedding Coordination Transfer - {{couple_names}}',
  variables: {
    outgoing_coordinator: string,
    incoming_coordinator: string,
    handoff_reason: string,
    wedding_details: WeddingInfo,
    contact_update_deadline: string
  }
};
```

### Email Delivery Tracking
```typescript
interface EmailDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'bounced' | 'complained';
  timestamp: Date;
  recipient: string;
  errorReason?: string;
}

// Webhook handler for delivery status
export async function handleResendWebhook(data: ResendWebhookEvent) {
  await updateMessageStatus(data.messageId, data.status);
  
  if (data.status === 'bounced' || data.status === 'complained') {
    await triggerFallbackCommunication(data.messageId);
  }
}
```

### Integration Testing Patterns
```typescript
// Mock Resend service for testing
class MockResendService {
  private shouldSimulateFailure = false;
  private bounceRate = 0.02; // 2% realistic bounce rate

  async sendEmail(params: EmailParams): Promise<EmailResponse> {
    // Simulate realistic delays
    await this.simulateNetworkDelay(100, 300);
    
    if (this.shouldSimulateFailure) {
      throw new Error('SMTP timeout - please retry');
    }
    
    // Simulate bounces for testing
    if (Math.random() < this.bounceRate) {
      return { status: 'bounced', messageId: uuid() };
    }
    
    return { status: 'sent', messageId: uuid() };
  }
}
```

## SMS Integration (Twilio)

### Service Configuration
```typescript
const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

### Wedding SMS Templates

#### Emergency Venue Alert
```typescript
const emergencySMSTemplate = {
  template: `URGENT: {{venue_name}} alert for {{couple_names}} wedding {{date}}. 
  {{emergency_details}}. 
  Contact coordinator: {{coordinator_phone}}. 
  Updates: {{status_url}}`,
  maxLength: 160 // SMS character limit
};
```

#### Timeline Update
```typescript
const timelineUpdateTemplate = {
  template: `Wedding update for {{couple_names}} ({{date}}): 
  {{timeline_change}}. 
  New time: {{updated_time}}. 
  Questions? {{coordinator_contact}}`,
  urgency: 'standard'
};
```

### International SMS Handling
```typescript
interface SMSConfig {
  defaultCountryCode: '+1';
  supportedRegions: string[];
  internationalRateLimit: number;
  emergencyBypass: boolean;
}

async function sendInternationalSMS(
  phoneNumber: string, 
  message: string,
  urgency: 'emergency' | 'standard'
) {
  const countryCode = extractCountryCode(phoneNumber);
  const pricing = await getTwilioPricing(countryCode);
  
  if (urgency === 'emergency' || pricing.costPerMessage < 0.10) {
    return await twilio.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  }
  
  // Fallback to email for high-cost regions
  return await sendFallbackEmail(phoneNumber, message);
}
```

### SMS Delivery Monitoring
```typescript
// Webhook handler for SMS status updates
export async function handleTwilioWebhook(data: TwilioStatusCallback) {
  const status = data.MessageStatus;
  
  if (status === 'failed' || status === 'undelivered') {
    // Trigger email fallback for critical messages
    await triggerEmailFallback(data.MessageSid);
  }
  
  await updateSMSDeliveryStatus(data.MessageSid, status);
}
```

## Calendar Integration (Google Calendar)

### Authentication Setup
```typescript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set up service account for wedding venue calendars
const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client
});
```

### Wedding Event Synchronization
```typescript
interface WeddingCalendarEvent {
  weddingId: string;
  eventType: 'ceremony' | 'reception' | 'rehearsal' | 'vendor_arrival';
  startTime: Date;
  endTime: Date;
  location: VenueInfo;
  attendees: CalendarAttendee[];
  coordinatorNote: string;
}

async function syncWeddingToCalendars(wedding: WeddingCalendarEvent) {
  const calendars = await getStakeholderCalendars(wedding.weddingId);
  
  for (const calendarId of calendars) {
    const event = {
      summary: `${wedding.eventType} - ${wedding.coupleNames}`,
      start: { dateTime: wedding.startTime.toISOString() },
      end: { dateTime: wedding.endTime.toISOString() },
      location: wedding.location.address,
      attendees: wedding.attendees,
      description: wedding.coordinatorNote,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }       // 30 minutes before
        ]
      }
    };
    
    await calendar.events.insert({
      calendarId,
      resource: event
    });
  }
}
```

### Timeline Conflict Detection
```typescript
async function detectWeddingConflicts(
  venueId: string, 
  proposedDateTime: Date,
  duration: number
): Promise<ConflictInfo[]> {
  
  const timeMin = new Date(proposedDateTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours buffer
  const timeMax = new Date(proposedDateTime.getTime() + duration + (2 * 60 * 60 * 1000));
  
  const response = await calendar.events.list({
    calendarId: venueId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  const conflicts = response.data.items?.filter(event => {
    return event.status !== 'cancelled' && 
           isOverlapping(event, proposedDateTime, duration);
  });
  
  return conflicts?.map(conflict => ({
    conflictType: 'venue_booking',
    existingEvent: conflict,
    suggestedResolution: 'adjust_timing',
    bufferViolation: calculateBufferViolation(conflict, proposedDateTime)
  })) || [];
}
```

## Workspace Integration (Slack)

### Slack Bot Configuration
```typescript
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
```

### Wedding Team Channels
```typescript
interface WeddingSlackWorkspace {
  weddingId: string;
  workspaceId: string;
  channels: {
    general: string;      // #wedding-smithjohnson-2024
    vendors: string;      // #vendors-smithjohnson
    emergency: string;    // #emergency-alerts
    timeline: string;     // #timeline-updates
  };
  teamMembers: SlackMember[];
}

async function createWeddingWorkspace(wedding: WeddingInfo): Promise<WeddingSlackWorkspace> {
  const workspaceName = `${wedding.coupleNames.replace(' ', '').toLowerCase()}-${wedding.year}`;
  
  // Create dedicated channels for wedding coordination
  const channels = await Promise.all([
    slackClient.conversations.create({
      name: `wedding-${workspaceName}`,
      is_private: false
    }),
    slackClient.conversations.create({
      name: `vendors-${workspaceName}`,
      is_private: true
    }),
    slackClient.conversations.create({
      name: `emergency-${workspaceName}`,
      is_private: false
    })
  ]);
  
  return {
    weddingId: wedding.id,
    workspaceId: workspaceName,
    channels: {
      general: channels[0].channel.id,
      vendors: channels[1].channel.id,
      emergency: channels[2].channel.id,
      timeline: channels[0].channel.id // Reuse general for timeline
    },
    teamMembers: []
  };
}
```

### Emergency Alert Broadcasting
```typescript
async function broadcastEmergencyToSlack(
  emergency: EmergencyAlert,
  workspaceConfig: WeddingSlackWorkspace
) {
  const emergencyMessage = {
    channel: workspaceConfig.channels.emergency,
    text: `🚨 WEDDING EMERGENCY ALERT 🚨`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Emergency: ${emergency.title}`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Wedding:* ${emergency.coupleNames}` },
          { type: 'mrkdwn', text: `*Date:* ${emergency.weddingDate}` },
          { type: 'mrkdwn', text: `*Venue:* ${emergency.venueName}` },
          { type: 'mrkdwn', text: `*Coordinator:* ${emergency.coordinatorContact}` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:* ${emergency.description}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            style: 'primary',
            action_id: 'emergency_acknowledge'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Full Details' },
            url: emergency.detailsUrl
          }
        ]
      }
    ]
  };
  
  return await slackClient.chat.postMessage(emergencyMessage);
}
```

## Integration Resilience Patterns

### Circuit Breaker Implementation
```typescript
class IntegrationCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.isTimeoutExpired()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

### Fallback Communication Strategy
```typescript
interface FallbackConfig {
  primary: 'email' | 'sms' | 'slack';
  secondary: 'email' | 'sms' | 'slack';
  emergency: 'email' | 'sms' | 'slack';
  wedding_day: 'sms'; // Always SMS for wedding day emergencies
}

async function sendWithFallback(
  message: BroadcastMessage,
  recipient: Recipient,
  config: FallbackConfig
): Promise<DeliveryResult> {
  
  try {
    // Attempt primary communication method
    return await sendViaPrimary(message, recipient, config.primary);
  } catch (primaryError) {
    
    try {
      // Fallback to secondary method
      return await sendViaSecondary(message, recipient, config.secondary);
    } catch (secondaryError) {
      
      // Final fallback for critical messages
      if (message.priority === 'emergency') {
        return await sendViaEmergency(message, recipient, config.emergency);
      }
      
      // Log failure and queue for retry
      await logCommunicationFailure({
        messageId: message.id,
        recipientId: recipient.id,
        primaryError,
        secondaryError,
        retryScheduled: true
      });
      
      throw new CommunicationFailureError('All communication methods failed');
    }
  }
}
```

## Testing Integration Services

### Mock Service Framework
```typescript
// Centralized mock service manager
class IntegrationMockManager {
  private mockServices = new Map();
  
  setupMocks() {
    this.mockServices.set('resend', new MockResendService());
    this.mockServices.set('twilio', new MockTwilioService());
    this.mockServices.set('google', new MockGoogleCalendarService());
    this.mockServices.set('slack', new MockSlackService());
  }
  
  enableRealisticFailures() {
    this.mockServices.get('resend').setBounceRate(0.02);
    this.mockServices.get('twilio').setFailureRate(0.01);
    this.mockServices.get('google').setRateLimitingEnabled(true);
    this.mockServices.get('slack').setNetworkDelayRange(50, 200);
  }
  
  simulateWeddingDayLoad() {
    // Increase concurrent usage to simulate Saturday wedding load
    this.mockServices.forEach(service => {
      service.setConcurrentRequestLimit(1000);
      service.setResponseTimeRange(100, 500);
    });
  }
}
```

## Integration Monitoring

### Health Checks
```typescript
interface IntegrationHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  responseTime: number;
  errorRate: number;
  lastSuccessful: Date;
  nextCheck: Date;
}

async function checkIntegrationHealth(): Promise<IntegrationHealthStatus[]> {
  const services = ['resend', 'twilio', 'google', 'slack'];
  
  return await Promise.all(
    services.map(async service => {
      const startTime = Date.now();
      
      try {
        await performHealthCheck(service);
        const responseTime = Date.now() - startTime;
        
        return {
          service,
          status: responseTime < 1000 ? 'healthy' : 'degraded',
          responseTime,
          errorRate: await getRecentErrorRate(service),
          lastSuccessful: new Date(),
          nextCheck: new Date(Date.now() + 60000) // Check again in 1 minute
        };
      } catch (error) {
        return {
          service,
          status: 'unavailable',
          responseTime: Date.now() - startTime,
          errorRate: 1.0,
          lastSuccessful: await getLastSuccessfulCheck(service),
          nextCheck: new Date(Date.now() + 30000) // Check sooner if failing
        };
      }
    })
  );
}
```

## Emergency Integration Protocols

### Wedding Day Communication Priorities
1. **SMS First**: Immediate delivery for time-sensitive updates
2. **Email Backup**: Comprehensive details and documentation
3. **Slack Coordination**: Team coordination and problem-solving
4. **Calendar Updates**: Automatic timeline adjustments

### Crisis Communication Escalation
```typescript
interface CrisisProtocol {
  triggerConditions: string[];
  escalationLevels: EscalationLevel[];
  communicationChannels: Channel[];
  responseTeam: ResponderInfo[];
}

const weddingDayCrisisProtocol: CrisisProtocol = {
  triggerConditions: [
    'venue_unavailable',
    'weather_emergency', 
    'vendor_no_show',
    'coordinator_emergency'
  ],
  escalationLevels: [
    {
      level: 1,
      timeframe: '0-5 minutes',
      actions: ['immediate_sms_all_stakeholders', 'slack_emergency_channel'],
      decisionMakers: ['lead_coordinator', 'venue_manager']
    },
    {
      level: 2, 
      timeframe: '5-15 minutes',
      actions: ['backup_venue_activation', 'vendor_replacement_protocol'],
      decisionMakers: ['wedding_planner', 'couple']
    }
  ]
};
```

---

**Last Updated**: January 2025  
**Integration Testing**: All services verified  
**Documentation Owner**: Team E - Integration Specialists  
**Emergency Contacts**: Available 24/7 during wedding season