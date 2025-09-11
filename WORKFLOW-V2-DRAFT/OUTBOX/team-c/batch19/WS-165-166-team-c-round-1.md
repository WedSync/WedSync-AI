# TEAM C - ROUND 1: WS-165/166 - Payment Calendar & Pricing Strategy System - Real-time Communications & Notifications

**Date:** 2025-08-25  
**Feature IDs:** WS-165, WS-166 (Combined batch development)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive real-time communication systems for payment calendar and pricing strategy features
**Context:** You are Team C working in parallel with 4 other teams. Focus on real-time updates, notifications, and communication systems.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**WS-165 - Payment Calendar Real-time Communications:**
**As a:** Wedding couple managing payment deadlines
**I want to:** Real-time notifications about payment due dates, automatic reminders, and instant updates when payments are marked as paid
**So that:** I never miss payment deadlines and all family members helping with wedding planning stay informed

**WS-166 - Pricing Strategy System Communications:**
**As a:** Wedding supplier managing subscriptions
**I want to:** Real-time notifications about subscription changes, usage alerts, and feature access updates
**So that:** I'm immediately informed about billing changes and can manage my subscription proactively

**Real Wedding Problems Communications Solve:**
1. **Payment Calendar Notifications**: Wedding couple has 23 payments across 8 vendors. When venue payment is marked complete by mother-in-law, couple and wedding planner get instant notification. 72 hours before due dates, smart reminders consider bank holidays and weekend processing delays.
2. **Subscription Communications**: Wedding photographer approaching 80% of Professional tier usage gets proactive notification: "You're using 32 of 40 monthly wedding uploads. Upgrade to Enterprise for unlimited?" with 1-click upgrade flow.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specifications:**

**WS-165 Real-time Requirements:**
- Supabase Realtime subscriptions for payment status changes
- Intelligent notification system with preference management
- Multi-channel communication (email, SMS, in-app, push notifications)
- Real-time payment calendar updates across all connected devices
- Smart reminder scheduling with business logic (weekends, holidays)
- WebSocket connections for instant payment status synchronization

**WS-166 Real-time Requirements:**
- Real-time subscription status updates and feature access changes
- Usage threshold notifications with proactive upgrade suggestions
- Multi-tenant notification system for suppliers with multiple users
- Real-time pricing updates and promotional notification system
- WebSocket connections for instant subscription changes
- Integration with billing system for payment failure notifications

**Technology Stack (VERIFIED):**
- Real-time: Supabase Realtime with WebSocket connections
- Notifications: Multi-channel system (email, SMS, push, in-app)
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Communication APIs: SendGrid, Twilio, Firebase Cloud Messaging
- WebSocket Management: Socket.io for complex real-time interactions

**Integration Points:**
- Real-time Synchronization: Connects to Team B's payment and subscription APIs
- UI Updates: Provides real-time data to Team A's frontend components
- Mobile Sync: Ensures Team D's mobile app receives instant updates

---

## 🧠 SEQUENTIAL THINKING MCP FOR REAL-TIME ARCHITECTURE

### Real-time System Design Analysis
```typescript
// Complex real-time architecture planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time communications for payment calendar and subscription systems require multi-layered approach: 1) Supabase Realtime for database changes, 2) WebSocket connections for instant UI updates, 3) Notification service for external communications, 4) Preference management for user control. Payment system needs immediate updates when status changes, subscription system needs usage alerts and billing notifications.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Notification channels to implement: In-app notifications (highest priority, instant), Push notifications (mobile devices), Email (detailed information), SMS (urgent only). Smart scheduling logic: Payment reminders 7 days, 3 days, 1 day before due date, but skip weekends for business payments. Usage alerts at 80%, 90%, 100% of limits.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "supabase realtime subscriptions websocket latest documentation"});
await mcp__Ref__ref_search_documentation({query: "nextjs websocket implementation ssr latest documentation"});
await mcp__Ref__ref_search_documentation({query: "sendgrid email templates nodejs integration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "twilio sms nodejs integration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "firebase cloud messaging push notifications latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("useRealtimeSubscription", "src", true);
await mcp__serena__get_symbols_overview("src/lib/realtime");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Real-time communication architecture for payment and subscription systems"
2. **supabase-specialist** --think-ultra-hard --use-loaded-docs "Realtime subscriptions and WebSocket management"
3. **nextjs-fullstack-developer** --think-hard --realtime-focus "WebSocket integration with SSR and React components"
4. **security-compliance-officer** --think-ultra-hard --notification-security "Secure notification delivery and data protection"
5. **test-automation-architect** --realtime-testing --use-testing-patterns-from-docs "Real-time system testing and monitoring"
6. **integration-specialist** --think-hard --multi-channel-communication "Email, SMS, push notification integration"
7. **code-quality-guardian** --check-patterns --realtime-consistency "Real-time code patterns and error handling"

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Focus on reliable, scalable real-time communications."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Payment Calendar Real-time System (WS-165):
- [ ] Supabase Realtime subscription configuration for payment_schedule table
- [ ] WebSocket connection management for payment status updates
- [ ] Real-time payment calendar component with live updates
- [ ] Intelligent notification service for payment reminders
- [ ] Multi-channel notification system (email, SMS, in-app, push)
- [ ] Notification preference management system
- [ ] Smart reminder scheduling with business logic
- [ ] Real-time payment status synchronization across devices
- [ ] Integration with Team B's payment APIs for trigger events
- [ ] Comprehensive error handling for connection failures

### Pricing Strategy Real-time System (WS-166):
- [ ] Supabase Realtime subscription configuration for subscription tables
- [ ] WebSocket connection management for subscription status changes
- [ ] Real-time subscription usage tracking and alerts
- [ ] Proactive upgrade notification system based on usage patterns
- [ ] Multi-tenant notification system for supplier teams
- [ ] Real-time feature access updates and restrictions
- [ ] Subscription billing failure notification system
- [ ] Real-time pricing updates and promotional notifications
- [ ] Integration with Team B's subscription APIs for trigger events
- [ ] Advanced notification analytics and delivery tracking

### Core Real-time Infrastructure:
- [ ] WebSocket connection pool management with auto-reconnection
- [ ] Notification queue system with retry logic and dead letter handling
- [ ] Real-time connection authentication and authorization
- [ ] Notification template system with dynamic content
- [ ] Multi-channel delivery confirmation and tracking
- [ ] Real-time system health monitoring and alerting
- [ ] Notification preference UI components for user control
- [ ] Integration testing for all real-time communication channels

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
Real-time communications must enhance navigation experience with contextual notifications and seamless updates.

### Real-time Navigation Enhancement Requirements

**1. Contextual Navigation Notifications**
```tsx
// Real-time navigation updates based on user context
interface NavigationNotification {
  type: 'payment_due' | 'subscription_limit' | 'feature_unlocked';
  title: string;
  message: string;
  action_url?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context: {
    current_page: string;
    user_workflow: string;
    wedding_context?: string;
  };
}

// Smart notification display based on navigation context
const displayNotification = (notification: NavigationNotification) => {
  // Show payment notifications more prominently on budget pages
  // Show subscription notifications on settings/billing pages
  // Provide contextual action buttons based on current page
};
```

**2. Real-time Navigation State Updates**
```tsx
// Update navigation badges and indicators in real-time
const useNavigationRealtime = () => {
  const [overduePayments, setOverduePayments] = useState(0);
  const [usageWarnings, setUsageWarnings] = useState(0);
  
  useEffect(() => {
    // Subscribe to payment status changes
    const paymentSubscription = supabase
      .channel('navigation-payments')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'payment_schedule' },
        (payload) => updateNavigationBadges(payload)
      )
      .subscribe();
    
    return () => paymentSubscription.unsubscribe();
  }, []);
};
```

**3. Smart Navigation Prompts**
```tsx
// Proactive navigation suggestions based on real-time events
const NavigationPrompts = {
  payment_due_soon: {
    message: "You have 3 payments due this week",
    action: "View Payment Calendar",
    navigation: "/payments/calendar"
  },
  subscription_upgrade_suggested: {
    message: "You're using 85% of your plan features",
    action: "View Upgrade Options", 
    navigation: "/billing/upgrade"
  }
};
```

**4. Mobile Navigation Synchronization**
```tsx
// Ensure mobile and desktop navigation stay synchronized
const syncNavigationState = (updates: NavigationUpdate[]) => {
  // Update both web and mobile navigation states
  // Ensure consistent badge counts and notification states
  // Handle offline scenarios with local state management
};
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Frontend component structure for real-time updates integration
- FROM Team B: Payment and subscription API webhook events for notification triggers
- FROM Team D: Mobile push notification requirements and token management

### What other teams NEED from you:
- TO Team A: Real-time data streams and WebSocket connection utilities - Blocking their live UI updates
- TO Team B: Notification delivery confirmation APIs - Needed for their audit logging
- TO Team D: Push notification service integration - Blocking their mobile notification features
- TO Team E: Real-time testing utilities and monitoring endpoints - Needed for their testing automation

---

## 🔒 SECURITY REQUIREMENTS FOR REAL-TIME SYSTEMS

### MANDATORY SECURITY IMPLEMENTATION

```typescript
// ✅ SECURE REAL-TIME CONNECTION PATTERN:
import { validateRealtimeAuth } from '@/lib/auth/realtime';
import { encryptNotificationData } from '@/lib/security/notifications';

// Secure Supabase Realtime subscription
const createSecureSubscription = async (userId: string, channel: string) => {
  // Validate user has permission for this data stream
  const hasAccess = await validateRealtimeAuth(userId, channel);
  if (!hasAccess) {
    throw new Error('Unauthorized realtime access');
  }
  
  // Create subscription with RLS enforcement
  const subscription = supabase
    .channel(`${channel}_${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public', 
      table: 'payment_schedule',
      filter: `couple_id=eq.${userCoupleId}` // Enforce data isolation
    }, (payload) => {
      // Validate payload before processing
      const validatedPayload = validatePayload(payload);
      handleRealtimeUpdate(validatedPayload);
    })
    .subscribe();
  
  return subscription;
};

// Secure notification delivery
export const sendSecureNotification = async (
  userId: string,
  notification: NotificationData
) => {
  // Validate user preferences and permissions
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.allows(notification.type)) {
    return { status: 'blocked', reason: 'user_preference' };
  }
  
  // Encrypt sensitive data in notification
  const encryptedData = await encryptNotificationData(notification.data);
  
  // Send through appropriate channels with audit logging
  const results = await Promise.allSettled([
    sendInAppNotification(userId, { ...notification, data: encryptedData }),
    preferences.email && sendEmailNotification(userId, notification),
    preferences.sms && sendSMSNotification(userId, notification),
    preferences.push && sendPushNotification(userId, notification)
  ]);
  
  // Log delivery results for compliance
  await auditLog.notificationDelivery(userId, notification, results);
  
  return { status: 'sent', channels: results.length, delivered: results.filter(r => r.status === 'fulfilled').length };
};
```

### SECURITY CHECKLIST FOR REAL-TIME SYSTEMS:
- [ ] **Authentication**: All WebSocket connections must validate JWT tokens
- [ ] **Authorization**: RLS policies enforce data isolation for real-time subscriptions  
- [ ] **Data Encryption**: All notification data encrypted in transit and at rest
- [ ] **Rate Limiting**: Prevent notification spam and WebSocket connection abuse
- [ ] **Input Validation**: All real-time data validated before processing
- [ ] **Audit Logging**: All notification deliveries logged for compliance
- [ ] **Permission Verification**: Users can only subscribe to their own data streams
- [ ] **Connection Security**: WebSocket connections use secure protocols (WSS)
- [ ] **Data Sanitization**: All notification content sanitized against XSS
- [ ] **Preference Enforcement**: Respect user notification preferences and opt-outs

---

## 🎭 COMPREHENSIVE REAL-TIME TESTING

### Real-time System Testing with Playwright MCP
```javascript
// 1. WEBSOCKET CONNECTION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments"});

// Test WebSocket connection establishment
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Establish WebSocket connection
    const ws = new WebSocket('ws://localhost:3001/realtime');
    
    return new Promise((resolve) => {
      ws.onopen = () => {
        resolve({ connected: true, readyState: ws.readyState });
      };
      ws.onerror = (error) => {
        resolve({ connected: false, error: error.message });
      };
      
      // Test connection timeout
      setTimeout(() => {
        resolve({ connected: false, error: 'timeout' });
      }, 5000);
    });
  }`
});

// 2. REAL-TIME PAYMENT UPDATE TESTING
const paymentUpdateTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Subscribe to payment updates
    const subscription = window.supabase
      .channel('test-payments')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'payment_schedule' },
        (payload) => window.testResults = payload
      )
      .subscribe();
    
    // Trigger payment update via API
    const updateResponse = await fetch('/api/payments/test-payment-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' })
    });
    
    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      apiUpdate: updateResponse.ok,
      realtimeReceived: !!window.testResults,
      payloadValid: window.testResults?.new?.status === 'paid'
    };
  }`
});

// 3. NOTIFICATION DELIVERY TESTING
const notificationTests = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const testResults = {};
    
    // Test in-app notification
    const inAppResponse = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_reminder',
        channel: 'in-app',
        data: { payment_id: 'test-payment', due_date: '2025-12-01' }
      })
    });
    testResults.inApp = inAppResponse.ok;
    
    // Test email notification
    const emailResponse = await fetch('/api/notifications/send', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_reminder',
        channel: 'email',
        data: { payment_id: 'test-payment', due_date: '2025-12-01' }
      })
    });
    testResults.email = emailResponse.ok;
    
    // Test notification preferences
    const prefsResponse = await fetch('/api/users/notification-preferences');
    const prefs = await prefsResponse.json();
    testResults.preferences = prefs.payment_reminders === true;
    
    return testResults;
  }`
});

console.log('Real-time System Test Results:', {
  paymentUpdates: paymentUpdateTest,
  notifications: notificationTests
});
```

### Performance Testing for Real-time Systems
```javascript
// 4. WEBSOCKET PERFORMANCE TESTING
const performanceTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const connections = [];
    const messageCount = 100;
    let receivedMessages = 0;
    
    // Create multiple WebSocket connections to test scalability
    for (let i = 0; i < 10; i++) {
      const ws = new WebSocket('ws://localhost:3001/realtime');
      ws.onmessage = () => receivedMessages++;
      connections.push(ws);
    }
    
    // Wait for connections to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send burst of messages
    const startTime = Date.now();
    for (let i = 0; i < messageCount; i++) {
      connections[0].send(JSON.stringify({ type: 'test', id: i }));
    }
    
    // Wait for all messages to be processed
    await new Promise(resolve => {
      const checkComplete = () => {
        if (receivedMessages >= messageCount * connections.length) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
    
    const endTime = Date.now();
    
    // Cleanup connections
    connections.forEach(ws => ws.close());
    
    return {
      totalConnections: connections.length,
      messagesSent: messageCount,
      messagesReceived: receivedMessages,
      processingTime: endTime - startTime,
      messagesPerSecond: (receivedMessages / ((endTime - startTime) / 1000)).toFixed(2)
    };
  }`
});

console.log('Real-time Performance Results:', performanceTest);
```

## 🌐 BROWSER MCP REAL-TIME TESTING

```javascript
// BROWSER MCP - Real-time Feature Testing
// Use for visual validation of real-time updates

// 1. NAVIGATE TO PAYMENT DASHBOARD
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/payments/dashboard"});
const initialSnapshot = await mcp__browsermcp__browser_snapshot();

// 2. TEST REAL-TIME PAYMENT UPDATES
// Open second tab to simulate another user
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/payments/manage"});

// Mark payment as paid in second tab
await mcp__browsermcp__browser_click({
  element: "Mark as Paid button",
  ref: "payment-123-mark-paid-btn"
});

// Switch back to dashboard tab
await mcp__browsermcp__browser_tabs({action: "select", index: 0});

// Wait for real-time update and verify
await mcp__browsermcp__browser_wait_for({text: "Payment completed", time: 3});
const updatedSnapshot = await mcp__browsermcp__browser_snapshot();

// 3. TEST NOTIFICATION DISPLAY
// Trigger notification and verify display
const notificationVisible = updatedSnapshot.textContent.includes("Payment marked as paid");

// 4. TEST MOBILE RESPONSIVENESS OF REAL-TIME FEATURES
await mcp__browsermcp__browser_resize({width: 375, height: 667});
await mcp__browsermcp__browser_wait_for({time: 1});

// Verify real-time updates work on mobile
const mobileSnapshot = await mcp__browsermcp__browser_take_screenshot();

console.log('Visual Real-time Test Results:', {
  paymentUpdateVisible: notificationVisible,
  mobileResponsive: true // Based on screenshot analysis
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Real-time System Performance:
- [ ] WebSocket connections establish within 500ms
- [ ] Real-time updates delivered within 1 second of database changes
- [ ] System supports 1000+ concurrent WebSocket connections
- [ ] Connection auto-reconnection working with exponential backoff
- [ ] Zero message loss during connection failures
- [ ] Real-time system uptime > 99.9%

### Notification System Reliability:
- [ ] Multi-channel notification delivery (in-app, email, SMS, push) working
- [ ] Notification preferences respected for all channels
- [ ] Smart scheduling logic working (business days, time zones, holidays)
- [ ] Delivery confirmation tracking for all notification channels
- [ ] Failed notification retry logic with exponential backoff
- [ ] Notification analytics dashboard showing delivery rates

### Integration & Security:
- [ ] Real-time data synchronized across all team systems
- [ ] RLS policies enforced for all real-time subscriptions
- [ ] All notification data encrypted in transit and at rest
- [ ] Rate limiting preventing abuse of notification system
- [ ] Audit logging for all notification deliveries
- [ ] User privacy preferences fully enforced

### Testing & Monitoring:
- [ ] Real-time system testing with >95% coverage
- [ ] Performance testing under high load (1000+ connections)
- [ ] Integration testing with all team APIs
- [ ] Real-time monitoring dashboard with alerting
- [ ] Automated health checks for notification channels
- [ ] Zero TypeScript errors in real-time code

---

## 💾 WHERE TO SAVE YOUR WORK

### Real-time Infrastructure:
- WebSocket Server: `/wedsync/src/lib/realtime/websocket-server.ts`
- Supabase Realtime: `/wedsync/src/lib/realtime/supabase-subscriptions.ts`
- Connection Management: `/wedsync/src/lib/realtime/connection-manager.ts`
- Real-time Hooks: `/wedsync/src/hooks/useRealtimeSubscription.ts`

### Notification System:
- Notification Service: `/wedsync/src/lib/notifications/notification-service.ts`
- Email Templates: `/wedsync/src/lib/notifications/email-templates/`
- SMS Service: `/wedsync/src/lib/notifications/sms-service.ts`
- Push Notifications: `/wedsync/src/lib/notifications/push-service.ts`
- Notification Preferences: `/wedsync/src/lib/notifications/preferences.ts`

### API Routes:
- Notifications API: `/wedsync/src/app/api/notifications/send/route.ts`
- Preferences API: `/wedsync/src/app/api/users/notification-preferences/route.ts`
- WebSocket API: `/wedsync/src/app/api/realtime/websocket/route.ts`

### Testing:
- Real-time Tests: `/wedsync/tests/realtime/websocket.test.ts`
- Notification Tests: `/wedsync/tests/notifications/delivery.test.ts`
- Integration Tests: `/wedsync/tests/integration/realtime-notifications.test.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch19/WS-165-166-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Real-time connections MUST be secure - no data leaks between couples
- Notification system MUST respect user preferences - compliance requirement
- WebSocket connections MUST handle failures gracefully - no user experience disruption
- Do NOT spam users with notifications - implement smart rate limiting
- REMEMBER: Your real-time system is critical for other teams' UI updates
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY