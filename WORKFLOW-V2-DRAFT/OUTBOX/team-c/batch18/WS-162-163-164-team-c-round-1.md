# TEAM C - ROUND 1: WS-162/163/164 - Helper Schedules, Budget Categories & Manual Tracking - Integration & Notifications

**Date:** 2025-08-25  
**Feature IDs:** WS-162, WS-163, WS-164 (Combined batch development)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive integration layer and notification systems for helper scheduling, budget management, and expense tracking
**Context:** You are Team C working in parallel with 4 other teams. Combined integration systems for efficient development.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**WS-162 - Helper Schedules Integration:**
**As a:** Wedding helper receiving task assignments
**I want to:** Receive timely notifications about my schedule changes and upcoming tasks
**So that:** I never miss important wedding responsibilities or last-minute updates

**WS-163 - Budget Categories Integration:**
**As a:** Wedding couple managing budget categories
**I want to:** Receive alerts when budgets are approaching limits and automatic updates when expenses are added
**So that:** I can make informed financial decisions and avoid budget overruns

**WS-164 - Manual Tracking Integration:**
**As a:** Wedding couple adding expenses manually
**I want to:** See automatic updates to my budget categories and receive confirmations of successful expense logging
**So that:** I have real-time visibility into my wedding spending across all categories

**Real Wedding Integration Problems Solved:**
1. **Helper Schedule Notifications**: Helpers receive instant SMS/email alerts about schedule changes, preventing confusion and missed tasks.
2. **Budget Alert System**: Couples get proactive warnings like "Flowers budget 90% used - $200 remaining" before overspending.
3. **Expense Confirmation Flow**: When couples add expenses, they see immediate budget category updates and receipt storage confirmations.

---

## 🎯 TECHNICAL REQUIREMENTS - INTEGRATION FOCUS

**Integration Architecture Requirements:**

**WS-162 - Helper Schedule Integration:**
- Real-time notifications via WebSocket connections
- SMS/email notification system for schedule updates
- Calendar integration (Google Calendar, Apple Calendar, Outlook)
- Push notification system for mobile devices
- Integration with Team A's schedule UI components
- Connection to Team B's schedule API endpoints

**WS-163 - Budget Category Integration:**
- Real-time budget calculation updates via WebSockets
- Alert system for budget threshold notifications
- Integration with financial planning tools and banks
- Automated categorization using machine learning
- Connection to Team A's budget visualization components
- Integration with Team B's budget management APIs

**WS-164 - Manual Tracking Integration:**
- Receipt processing pipeline with OCR integration
- File storage and management system
- Automated expense categorization workflows
- Payment reconciliation with bank feeds
- Integration with accounting software (QuickBooks, Xero)
- Connection between Team A's expense UI and Team B's APIs

**Technology Stack (Integration Focus):**
- Messaging: Supabase Realtime, WebSocket connections
- Notifications: SendGrid (email), Twilio (SMS), Firebase (push)
- File Processing: Sharp, Tesseract OCR, AWS Lambda
- Webhooks: Stripe webhooks, bank API integrations
- Queue System: Redis Queue, background job processing
- External APIs: Calendar APIs, banking APIs, accounting APIs

---

## 🧠 SEQUENTIAL THINKING MCP FOR INTEGRATION ARCHITECTURE

### Integration-Focused Sequential Thinking

#### Pattern 1: Multi-System Integration Analysis
```typescript
// Complex integration system planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Integration layer must connect Team A's frontend components with Team B's APIs while adding notification, calendar, and external service layers. Need to analyze data flow: UI actions -> integration middleware -> API calls -> external services -> notifications.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: WebSocket connections for real-time updates, webhook handlers for external services, notification routing based on user preferences, error handling with retry logic, and fallback mechanisms for service failures.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Notification System Design
```typescript
// Notification system architecture planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Notification system needs multiple channels: real-time WebSocket for immediate UI updates, email for detailed information, SMS for urgent alerts, push notifications for mobile. Each channel needs different message formats and delivery guarantees.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Notification delivery strategy: Priority-based routing (urgent: SMS + push, normal: email + WebSocket), user preference management, delivery tracking and retries, template system for consistent messaging across channels.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

---

## 📚 STEP 1: LOAD INTEGRATION DOCUMENTATION (MANDATORY!)

```typescript
// 1. Load integration-specific documentation:
await mcp__Ref__ref_search_documentation({query: "WebSocket connections real-time messaging latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase Realtime subscriptions channels latest documentation"});
await mcp__Ref__ref_search_documentation({query: "SendGrid email API templates latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Twilio SMS API notifications latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Firebase push notifications web mobile latest"});
await mcp__Ref__ref_search_documentation({query: "Google Calendar API integration OAuth latest"});
await mcp__Ref__ref_search_documentation({query: "Stripe webhooks event handling latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Redis Queue background jobs processing latest"});

// 2. SERENA MCP - Review integration patterns:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("webhook", "", true);
await mcp__serena__find_symbol("notification", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
```

---

## 🚀 STEP 2: LAUNCH INTEGRATION SPECIALISTS

1. **integration-specialist** --multi-platform --webhooks --external-apis --real-time-systems
2. **supabase-specialist** --realtime-channels --websocket-management --subscription-handling
3. **api-architect** --webhook-design --notification-routing --external-service-integration
4. **security-compliance-officer** --third-party-integrations --webhook-security --data-privacy
5. **performance-optimization-expert** --real-time-performance --notification-delivery --queue-optimization
6. **test-automation-architect** --integration-testing --webhook-testing --notification-testing

**AGENT INSTRUCTIONS:** "Focus on seamless integrations. Connect all systems efficiently with robust error handling and monitoring."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Integration Systems (Combined Features):

**WS-162 - Helper Schedule Integration:**
- [ ] WebSocket channels for real-time schedule updates
- [ ] SMS notification system for schedule changes
- [ ] Email notification templates for schedule summaries
- [ ] Google Calendar integration for helper calendar sync
- [ ] Push notification system for mobile schedule alerts
- [ ] Integration middleware connecting Team A UI to Team B APIs
- [ ] Helper preference management system

**WS-163 - Budget Category Integration:**
- [ ] Real-time budget calculation WebSocket channels
- [ ] Budget alert notification system (email, SMS, push)
- [ ] Integration with banking APIs for account balance checking
- [ ] ML-powered expense categorization service
- [ ] Budget threshold monitoring and alert triggers
- [ ] Integration layer for Team A budget components
- [ ] Financial planning tool connections (Mint, YNAB)

**WS-164 - Manual Tracking Integration:**
- [ ] OCR receipt processing pipeline
- [ ] File upload integration with storage management
- [ ] Automated expense categorization workflows  
- [ ] Receipt confirmation notification system
- [ ] Integration with accounting software APIs
- [ ] Payment reconciliation webhook handlers
- [ ] Expense approval workflow notifications

**Cross-Feature Integration Infrastructure:**
- [ ] Unified notification routing system
- [ ] WebSocket connection management and scaling
- [ ] Webhook security and validation framework
- [ ] External API rate limiting and retry logic
- [ ] Integration monitoring and health checks
- [ ] Unified error handling across all integrations

---

## 🔄 REAL-TIME INTEGRATION ARCHITECTURE

### WebSocket and Notification Systems:

```typescript
// ✅ REAL-TIME WEBSOCKET MANAGEMENT
import { createRealtimeClient } from '@/lib/supabase/realtime';

export class WeddingRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  async subscribeToHelperSchedules(weddingId: string, helperId: string) {
    const channelName = `helper-schedule:${weddingId}:${helperId}`;
    
    const channel = this.supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'helper_assignments',
        filter: `wedding_id=eq.${weddingId} AND helper_id=eq.${helperId}`
      }, (payload) => {
        this.handleScheduleUpdate(payload);
      })
      .subscribe();
      
    this.channels.set(channelName, channel);
    return channel;
  }
  
  async subscribeToBudgetUpdates(weddingId: string) {
    const channelName = `budget-updates:${weddingId}`;
    
    const channel = this.supabase.channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'budget_categories',
        filter: `wedding_id=eq.${weddingId}`
      }, (payload) => {
        this.handleBudgetUpdate(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses', 
        filter: `wedding_id=eq.${weddingId}`
      }, (payload) => {
        this.handleExpenseUpdate(payload);
      })
      .subscribe();
      
    this.channels.set(channelName, channel);
    return channel;
  }
  
  private async handleScheduleUpdate(payload: any) {
    // Send notifications based on change type
    if (payload.eventType === 'INSERT') {
      await this.sendScheduleNotification('new_assignment', payload.new);
    } else if (payload.eventType === 'UPDATE') {
      await this.sendScheduleNotification('schedule_changed', payload.new);
    }
  }
  
  private async handleBudgetUpdate(payload: any) {
    // Check for budget threshold alerts
    const category = payload.new;
    const usagePercentage = (category.spent_amount / category.allocated_amount) * 100;
    
    if (usagePercentage >= 90) {
      await this.sendBudgetAlert('budget_warning', category);
    } else if (usagePercentage >= 100) {
      await this.sendBudgetAlert('budget_exceeded', category);
    }
  }
}

// ✅ MULTI-CHANNEL NOTIFICATION SYSTEM
import { NotificationRouter } from '@/lib/notifications/router';

export class WeddingNotificationSystem {
  private router = new NotificationRouter();
  
  async sendScheduleNotification(type: string, data: any) {
    const notification = {
      userId: data.helper_id,
      type: 'helper_schedule',
      priority: type === 'urgent_change' ? 'high' : 'normal',
      channels: this.getChannelsForPriority(type),
      data: {
        taskTitle: data.task_title,
        scheduledTime: data.scheduled_time,
        location: data.location
      }
    };
    
    await this.router.send(notification);
  }
  
  async sendBudgetAlert(type: string, category: any) {
    const notification = {
      userId: category.couple_id,
      type: 'budget_alert',
      priority: 'high',
      channels: ['email', 'sms', 'push', 'websocket'],
      template: type === 'budget_exceeded' ? 'budget_over_limit' : 'budget_warning',
      data: {
        categoryName: category.category_name,
        allocated: category.allocated_amount,
        spent: category.spent_amount,
        percentage: (category.spent_amount / category.allocated_amount) * 100
      }
    };
    
    await this.router.send(notification);
  }
  
  private getChannelsForPriority(type: string): string[] {
    switch (type) {
      case 'urgent_change':
        return ['sms', 'push', 'websocket'];
      case 'schedule_changed':
        return ['email', 'push', 'websocket'];
      case 'new_assignment':
        return ['email', 'websocket'];
      default:
        return ['websocket'];
    }
  }
}
```

---

## 🔗 EXTERNAL API INTEGRATIONS

### Calendar and Payment System Integrations:

```typescript
// ✅ GOOGLE CALENDAR INTEGRATION
import { google } from 'googleapis';

export class CalendarIntegrationService {
  private calendar = google.calendar('v3');
  
  async syncHelperScheduleToCalendar(helperId: string, assignment: any) {
    const oauth2Client = await this.getOAuthClient(helperId);
    
    const event = {
      summary: `Wedding Task: ${assignment.task_title}`,
      description: assignment.task_description,
      start: {
        dateTime: assignment.scheduled_time,
        timeZone: assignment.timezone || 'UTC'
      },
      end: {
        dateTime: this.calculateEndTime(assignment.scheduled_time, assignment.duration_minutes),
        timeZone: assignment.timezone || 'UTC'
      },
      location: assignment.location,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }       // 30 minutes before
        ]
      }
    };
    
    try {
      const result = await this.calendar.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        requestBody: event
      });
      
      // Store calendar event ID for future updates
      await this.storeCalendarEventMapping(assignment.id, result.data.id);
      
      return result.data;
    } catch (error) {
      console.error('Failed to sync to calendar:', error);
      // Send fallback notification
      await this.sendCalendarSyncFailureNotification(helperId, assignment);
    }
  }
  
  async updateCalendarEvent(assignmentId: string, updates: any) {
    const eventMapping = await this.getCalendarEventMapping(assignmentId);
    if (!eventMapping) return;
    
    const oauth2Client = await this.getOAuthClient(eventMapping.helper_id);
    
    await this.calendar.events.patch({
      auth: oauth2Client,
      calendarId: 'primary',
      eventId: eventMapping.calendar_event_id,
      requestBody: updates
    });
  }
}

// ✅ STRIPE WEBHOOK INTEGRATION
export class PaymentWebhookHandler {
  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handleSuccessfulPayment(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleFailedPayment(event.data.object);
        break;
      case 'subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
  
  private async handleSuccessfulPayment(invoice: Stripe.Invoice) {
    // Update expense payment status
    await this.updateExpensePaymentStatus(invoice.metadata.expense_id, 'paid');
    
    // Send payment confirmation notification
    await this.sendPaymentConfirmation(invoice.customer, invoice.amount_paid);
    
    // Update budget category spent amount
    await this.updateBudgetAfterPayment(invoice);
  }
  
  private async handleFailedPayment(invoice: Stripe.Invoice) {
    // Send payment failure notification
    await this.sendPaymentFailureAlert(invoice.customer, invoice.amount_due);
    
    // Update expense payment status
    await this.updateExpensePaymentStatus(invoice.metadata.expense_id, 'failed');
  }
}
```

---

## ✅ SUCCESS CRITERIA FOR ROUND 1

### Integration Implementation Requirements:
- [ ] Real-time WebSocket connections established for all three features
- [ ] Multi-channel notification system (email, SMS, push) operational
- [ ] Calendar integration working for helper schedule sync
- [ ] OCR receipt processing pipeline functional
- [ ] Webhook handlers implemented for payment status updates
- [ ] Integration middleware connecting Team A UI to Team B APIs
- [ ] Error handling and retry logic implemented for all integrations
- [ ] Performance benchmarks: <100ms for real-time updates

### Cross-Team Integration Requirements:
- [ ] WebSocket channels ready for Team A's real-time UI components
- [ ] Notification APIs available for Team B's backend triggers
- [ ] Integration endpoints documented for Team D mobile integration
- [ ] Testing hooks provided for Team E's integration test suite
- [ ] Monitoring endpoints configured for system health checks

---

## 💾 WHERE TO SAVE INTEGRATION WORK

### Integration Code Files:

**Real-time & WebSocket:**
- WebSocket Manager: `/wedsync/src/lib/realtime/websocket-manager.ts`
- Channel Subscriptions: `/wedsync/src/lib/realtime/channel-subscriptions.ts`
- Real-time Handlers: `/wedsync/src/lib/realtime/event-handlers.ts`

**Notification System:**
- Notification Router: `/wedsync/src/lib/notifications/router.ts`
- Email Templates: `/wedsync/src/lib/notifications/templates/`
- SMS Integration: `/wedsync/src/lib/notifications/sms-service.ts`
- Push Notifications: `/wedsync/src/lib/notifications/push-service.ts`

**External Integrations:**
- Calendar Integration: `/wedsync/src/lib/integrations/calendar-service.ts`
- Payment Webhooks: `/wedsync/src/lib/integrations/payment-webhooks.ts`
- OCR Processing: `/wedsync/src/lib/integrations/ocr-service.ts`

**Middleware & Routing:**
- Integration Middleware: `/wedsync/src/middleware/integration-layer.ts`
- API Route Handlers: `/wedsync/src/app/api/integrations/`
- Webhook Handlers: `/wedsync/src/app/api/webhooks/`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch18/WS-162-163-164-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL INTEGRATION WARNINGS
- Do NOT expose webhook endpoints without proper security validation
- Do NOT skip error handling for external API calls - they WILL fail
- Do NOT implement real-time features without proper connection management
- Do NOT send notifications without user preference validation
- ENSURE: All external API calls have timeout and retry logic
- VERIFY: WebSocket connections are properly cleaned up on disconnect
- VALIDATE: All notification templates are tested across all channels

---

END OF ROUND 1 PROMPT - BUILD SOLID INTEGRATION FOUNDATION