# TEAM C - ROUND 2: WS-202 - Supabase Realtime Integration - Advanced Features & Performance

**Date:** 2025-08-26  
**Feature ID:** WS-202 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Enhance realtime system with presence tracking, broadcast events, performance optimization, and integration with Teams A & B  
**Context:** Building on Round 1 core implementation. Teams A and B implementing related systems in parallel.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Venue coordinator managing multiple weddings simultaneously during peak season weekend
**I want to:** See which other suppliers (photographer, florist, catering) are currently online and actively working on the same wedding, plus receive instant notifications when critical timeline changes occur
**So that:** I can coordinate in real-time with other vendors, know who's available for immediate questions, and ensure all suppliers are instantly aware when the couple changes ceremony timing or guest count during the final week before the wedding

**Real Wedding Problem This Solves:**
During peak wedding weekend, a venue coordinator is managing 3 weddings simultaneously. The enhanced realtime system shows presence indicators for all suppliers working on each wedding, broadcasts urgent timeline changes instantly to all relevant vendors, and provides priority notifications for time-sensitive updates. When the Saturday couple changes their cocktail hour location 2 days before the wedding, all 8 suppliers see the change instantly with priority highlighting.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Round 1 Foundation:**
- Core realtime subscription system implemented  
- Connection management and automatic reconnection working
- RLS policy enforcement on all subscriptions
- Basic wedding industry subscription patterns established

**Round 2 Enhancements:**
- Presence tracking showing which suppliers are online per wedding
- Broadcast events for urgent wedding coordination updates  
- Performance optimization for high-volume realtime events
- Integration with Teams A (versioning) and B (webhook status) systems
- Advanced subscription filtering and channel management

---

## 📚 STEP 1: BUILD ON ROUND 1 FOUNDATION

```typescript
// 1. REVIEW Round 1 implementation:
await mcp__serena__find_symbol("RealtimeSubscriptionManager", "", true);
await mcp__serena__get_symbols_overview("/lib/realtime/subscription-manager.ts");

// 2. LOAD additional Ref MCP docs for Round 2:
await mcp__Ref__ref_search_documentation({query: "supabase realtime-presence latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase realtime-broadcast latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react performance-optimization latest documentation"});

// 3. CHECK integration points with other teams:
await mcp__serena__find_symbol("apiVersionManager", "", true);
await mcp__serena__find_symbol("webhookManager", "", true);
```


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Polish):
- [ ] **Presence Tracking**: Real-time supplier presence indicators showing who's online per wedding
- [ ] **Broadcast Events**: Priority notification system for urgent wedding coordination updates
- [ ] **Performance Optimization**: Subscription batching, connection pooling, memory management
- [ ] **Advanced Filtering**: Smart subscription management with priority-based routing
- [ ] **Integration with Team A**: Version-aware realtime channels compatible with API versioning
- [ ] **Integration with Team B**: Real-time webhook delivery status updates and monitoring
- [ ] **Channel Management**: Hierarchical channel structure for complex wedding coordination scenarios

**Key Enhancements to Implement:**
- Supplier presence tracking with online/offline status and activity indicators
- Broadcast system for time-sensitive wedding coordination updates
- Performance optimizations for handling 100+ concurrent realtime connections
- Smart subscription filtering to reduce unnecessary network traffic
- Integration APIs for Teams A and B realtime requirements

**Files to Enhance:**
- `/wedsync/lib/realtime/subscription-manager.ts` - Add presence and broadcast features
- `/wedsync/lib/realtime/presence-tracker.ts` - Supplier online/offline tracking
- `/wedsync/lib/realtime/broadcast-manager.ts` - Priority notification system
- `/wedsync/lib/realtime/performance-optimizer.ts` - Connection and memory optimization

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES & INTEGRATION  

### Integration with Team A (API Versioning):
- **Required:** Version context for realtime subscription compatibility
- **Provide:** Version-aware channel subscriptions with backward compatibility
- **Test:** Realtime subscriptions work across different API versions

### Integration with Team B (Webhook Endpoints):
- **Required:** Webhook delivery status events for real-time monitoring
- **Provide:** Real-time webhook status updates in admin dashboards
- **Test:** Webhook delivery status appears instantly in realtime UI

### Enhanced Wedding Coordination Features:
- **Presence System:** Show which suppliers are currently working on each wedding
- **Priority Broadcasts:** Instant notifications for urgent wedding changes
- **Activity Tracking:** Real-time activity feeds for wedding coordination teams

---

## 🎯 ADVANCED REALTIME FEATURES

### Presence Tracking System:
```typescript
// Enhanced presence tracking for wedding supplier coordination
export class WeddingPresenceTracker {
  async trackSupplierPresence(supplierId: string, weddingId: string): Promise<PresenceChannel> {
    const presenceChannel = supabase.channel(`wedding_${weddingId}_presence`);
    
    return presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        this.updateSupplierPresenceUI(presenceState);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        this.showSupplierJoinedNotification(newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        this.showSupplierLeftNotification(leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            supplier_id: supplierId,
            supplier_name: await this.getSupplierName(supplierId),
            vendor_type: await this.getVendorType(supplierId),
            online_at: new Date().toISOString(),
            last_activity: new Date().toISOString()
          });
        }
      });
  }
}
```

### Broadcast Event System:
```typescript
// Priority broadcast system for urgent wedding updates
export class WeddingBroadcastManager {
  async broadcastUrgentUpdate(weddingId: string, updateType: string, payload: any): Promise<void> {
    const broadcastChannel = supabase.channel(`wedding_${weddingId}_broadcasts`);
    
    await broadcastChannel.send({
      type: 'broadcast',
      event: `urgent_${updateType}`,
      payload: {
        ...payload,
        priority: 'high',
        timestamp: new Date().toISOString(),
        requires_acknowledgment: true
      }
    });
  }
  
  async broadcastTimelineChange(weddingId: string, changes: TimelineChange[]): Promise<void> {
    await this.broadcastUrgentUpdate(weddingId, 'timeline_change', {
      changes,
      affected_suppliers: await this.getAffectedSuppliers(changes),
      action_required: true
    });
  }
}
```

### Performance Optimization:
```typescript
// Advanced performance optimization for high-volume realtime
export class RealtimePerformanceOptimizer {
  private subscriptionBatches = new Map<string, RealtimeChannel[]>();
  private connectionPool = new Map<string, RealtimeChannel>();
  
  async optimizeSubscriptions(subscriptions: SubscriptionRequest[]): Promise<OptimizedSubscriptions> {
    // Batch similar subscriptions into shared channels
    // Implement connection pooling for frequently used channels  
    // Add subscription deduplication and caching
    // Optimize memory usage with subscription cleanup
  }
  
  async implementConnectionPooling(): Promise<void> {
    // Reuse connections for similar subscription patterns
    // Implement connection lifecycle management
    // Add automatic cleanup for idle connections
  }
}
```

---

## 🔒 ENHANCED SECURITY & PERFORMANCE

### Advanced Security Features:
- [ ] **Presence Security**: Ensure presence tracking respects supplier authorization boundaries
- [ ] **Broadcast Authorization**: Verify only authorized suppliers can send priority broadcasts
- [ ] **Channel Access Control**: Implement fine-grained channel access permissions
- [ ] **Rate Limiting**: Prevent realtime subscription abuse and spam
- [ ] **Audit Logging**: Log all realtime events for security monitoring

```typescript
// Enhanced security for presence and broadcasts
export class RealtimeSecurityManager {
  async validatePresenceAccess(supplierId: string, weddingId: string): Promise<boolean> {
    // Verify supplier has access to wedding data
    // Check RLS policies for presence channel access
    // Validate supplier type and permissions
  }
  
  async validateBroadcastPermissions(supplierId: string, broadcastType: string): Promise<boolean> {
    // Check if supplier can send priority broadcasts
    // Validate broadcast type permissions
    // Prevent broadcast spam and abuse
  }
}
```

---

## 🎭 ADVANCED PLAYWRIGHT TESTING

```javascript
// ROUND 2: ADVANCED REALTIME TESTING

// 1. PRESENCE TRACKING TESTING
await page.goto('/dashboard/wedding/test-wedding-123');

// Verify presence indicator for current user
await expect(page.locator('[data-testid=supplier-presence-list]')).toContainText('You (Online)');

// Open second browser to simulate another supplier
const context2 = await browser.newContext();
const page2 = await context2.newPage();
await page2.goto('/dashboard/wedding/test-wedding-123');

// Login as different supplier
await page2.fill('[data-testid=login-email]', 'photographer@example.com');
await page2.fill('[data-testid=login-password]', 'password');
await page2.click('[data-testid=login-button]');

// Verify presence appears in first page
await expect(page.locator('[data-testid=supplier-presence-list]')).toContainText('Sarah Photography (Online)');

// 2. BROADCAST EVENT TESTING
await page.click('[data-testid=broadcast-urgent-update-button]');
await page.fill('[data-testid=update-message]', 'Ceremony moved to 4 PM due to weather');
await page.selectOption('[data-testid=affected-suppliers]', ['photographer', 'venue', 'catering']);
await page.click('[data-testid=send-broadcast-button]');

// Verify broadcast appears in second browser instantly
await expect(page2.locator('[data-testid=urgent-notification]')).toContainText('Ceremony moved to 4 PM');
await expect(page2.locator('[data-testid=notification-priority]')).toContainText('HIGH');

// 3. PERFORMANCE TESTING
const startTime = Date.now();
await page.evaluate(async () => {
  // Subscribe to 50 different channels simultaneously  
  const subscriptions = [];
  for (let i = 0; i < 50; i++) {
    subscriptions.push(window.realtimeManager.subscribe(`test_channel_${i}`));
  }
  await Promise.all(subscriptions);
});

const subscriptionTime = Date.now() - startTime;
expect(subscriptionTime).toBeLessThan(2000); // Should complete within 2 seconds

// 4. INTEGRATION TESTING (Teams A & B)
// Test API version context in realtime subscriptions
await page.request.post('/api/realtime/subscribe', {
  headers: { 'X-API-Version': 'v2' },
  data: {
    channels: ['form_responses_v2'],
    version_context: 'v2'
  }
});

// Test webhook status realtime updates  
await page.request.post('/api/webhooks/test-delivery');
await expect(page.locator('[data-testid=webhook-status-indicator]')).toContainText('Delivered');
```

---

## ✅ SUCCESS CRITERIA FOR ROUND 2

### Advanced Implementation:
- [ ] Presence tracking shows accurate online/offline status for all suppliers per wedding
- [ ] Broadcast system delivers priority notifications with <200ms latency
- [ ] Performance optimizations handle 100+ concurrent realtime connections efficiently
- [ ] Integration with Teams A and B provides version-aware and webhook-status realtime updates
- [ ] Advanced filtering reduces unnecessary realtime network traffic by 60%

### Integration & Performance:
- [ ] Enhanced features maintain sub-500ms update delivery times
- [ ] Integration tests pass with Teams A (versioning) and B (webhook status)
- [ ] Memory usage optimized for long-running realtime connections
- [ ] Security enhancements prevent realtime system abuse

### Evidence Package Required:
- [ ] Presence tracking demonstration with multiple suppliers online simultaneously
- [ ] Broadcast system performance metrics showing sub-200ms delivery times
- [ ] Performance benchmarks with 100+ concurrent connections
- [ ] Integration test results with Teams A and B implementations
- [ ] Security audit results showing enhanced protection against realtime abuse

---

## 💾 WHERE TO SAVE YOUR WORK

### Enhanced Code Files:
- Presence: `/wedsync/lib/realtime/presence-tracker.ts`
- Broadcasts: `/wedsync/lib/realtime/broadcast-manager.ts`
- Performance: `/wedsync/lib/realtime/performance-optimizer.ts`
- Security: `/wedsync/lib/realtime/security-manager.ts`
- Integration: `/wedsync/lib/realtime/team-integrations.ts`
- Tests: `/wedsync/tests/realtime/advanced-features.test.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch30/WS-202-team-c-round-2-complete.md`
- **Include:** Presence tracking demo, broadcast performance, integration results
- **Update status:**
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-202 | ROUND_2_COMPLETE | team-c | batch30" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY