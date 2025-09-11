# TEAM C - ROUND 1: WS-329 - Mobile App Integration
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build seamless integration systems for WedSync Mobile App connecting third-party services, push notifications, and cross-platform data synchronization
**FEATURE ID:** WS-329 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about integration reliability during wedding events when external services may fail

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/mobile/
cat $WS_ROOT/wedsync/src/lib/integrations/mobile/push-notifications.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test mobile-integrations
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

// Query integration-specific patterns
await mcp__serena__search_for_pattern("integration.*service.*webhook");
await mcp__serena__find_symbol("IntegrationService", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
```

### B. INTEGRATION ARCHITECTURE & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("$WS_ROOT/wedsync/docs/latest-tech-docs/supabase-nextjs-guide.md");
await mcp__serena__read_file("$WS_ROOT/.claude/UNIFIED-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile integrations
mcp__Ref__ref_search_documentation("PWA push notifications service worker integration patterns");
mcp__Ref__ref_search_documentation("Firebase Cloud Messaging FCM Next.js integration");
mcp__Ref__ref_search_documentation("mobile device calendar integration native APIs");
mcp__Ref__ref_search_documentation("webhook processing mobile app background sync");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile Integration for WedSync requires: 1) Push notification system for iOS/Android/Web with wedding event priority routing, 2) Calendar integration for vendor schedules and couple events, 3) Photo service integration for instant wedding day sharing, 4) SMS fallback integration when push fails during poor connectivity at venues, 5) Background sync integration with service workers for offline-first mobile experience",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Break down integration services, track external dependencies
2. **integration-specialist** - Focus on third-party service reliability patterns
3. **security-compliance-officer** - Ensure secure API integrations with token management
4. **code-quality-guardian** - Maintain integration error handling and resilience
5. **test-automation-architect** - Integration testing with external service mocking
6. **documentation-chronicler** - Document integration patterns and failure recovery

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE INTEGRATION SECURITY CHECKLIST:
- [ ] **API Key Security** - Secure storage of third-party API keys
- [ ] **OAuth Token Management** - Refresh tokens for long-term mobile sessions
- [ ] **Webhook Validation** - Verify webhook authenticity from external services
- [ ] **Push Token Security** - Encrypted storage of device push tokens
- [ ] **Cross-Origin Security** - CORS configuration for mobile web apps
- [ ] **Rate Limit Handling** - Graceful degradation when hitting API limits
- [ ] **Data Encryption** - End-to-end encryption for sensitive wedding data in transit
- [ ] **Integration Audit** - Log all external service interactions

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**MOBILE INTEGRATION ARCHITECTURE:**
- **Push Notification System**: Multi-platform push delivery with wedding priority
- **Calendar Integration**: Sync with Apple Calendar, Google Calendar, Outlook
- **Photo Service Integration**: Real-time photo sharing during weddings
- **SMS Gateway Integration**: Fallback communication when push fails
- **Background Sync**: Service worker integration for offline-capable mobile apps
- **External API Management**: Rate limiting, caching, and failure handling

## 📱 MOBILE INTEGRATION SPECIFICATIONS

### CORE INTEGRATION SERVICES TO BUILD:

**1. Multi-Platform Push Notification Service**
```typescript
// Create: src/lib/integrations/mobile/push-notifications.ts
interface PushNotificationService {
  sendToDevice(deviceToken: string, notification: WeddingNotification): Promise<boolean>;
  sendToUser(userId: string, notification: WeddingNotification): Promise<boolean>;
  sendToWeddingParty(weddingId: string, notification: WeddingNotification): Promise<boolean>;
  scheduleNotification(notification: WeddingNotification, sendAt: Date): Promise<string>;
  cancelNotification(notificationId: string): Promise<boolean>;
}

interface WeddingNotification {
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'critical'; // critical = wedding day emergencies
  weddingId: string;
  type: 'timeline_update' | 'vendor_message' | 'photo_share' | 'emergency' | 'reminder';
  data?: {
    deepLink?: string; // Open specific screen in mobile app
    actionButtons?: NotificationAction[];
  };
  badge?: number; // iOS badge count
}

// Support for:
// - Firebase Cloud Messaging (FCM) for Android/Web
// - Apple Push Notification Service (APNS) for iOS
// - Web Push for PWA
// - Priority routing for wedding day events
// - Delivery tracking and retry logic
```

**2. Device Calendar Integration**
```typescript
// Create: src/lib/integrations/mobile/calendar-integration.ts
interface CalendarIntegrationService {
  exportWeddingToCalendar(wedding: Wedding, format: 'ics' | 'google' | 'outlook'): Promise<string>;
  syncVendorSchedule(vendorId: string, weddingEvents: TimelineEvent[]): Promise<boolean>;
  createWeddingDayCalendar(weddingId: string): Promise<CalendarExport>;
  subscribeToWeddingUpdates(weddingId: string, calendarUrl: string): Promise<boolean>;
}

interface CalendarExport {
  icsData: string; // Standard calendar format
  googleCalendarUrl: string; // Direct Google Calendar import
  outlookUrl: string; // Outlook import link
  appleCalendarUrl: string; // Apple Calendar import
  subscriptionUrl: string; // Live sync URL for updates
}

// Features:
// - Export wedding timeline to device calendars
// - Live sync for schedule changes
// - Vendor-specific calendar exports
// - Reminder notifications integration
// - Timezone handling for destination weddings
```

**3. Real-Time Photo Sharing Integration**
```typescript
// Create: src/lib/integrations/mobile/photo-sharing.ts
interface PhotoSharingService {
  uploadPhoto(photo: WeddingPhoto): Promise<PhotoUploadResult>;
  shareWithCouple(weddingId: string, photoIds: string[]): Promise<boolean>;
  createPhotoAlbum(weddingId: string, albumName: string): Promise<PhotoAlbum>;
  generateShareLink(albumId: string, expiresIn?: number): Promise<string>;
  processPhotoMetadata(photo: File): Promise<PhotoMetadata>;
}

interface WeddingPhoto {
  file: File | Buffer;
  weddingId: string;
  vendorId: string;
  timestamp: Date;
  location?: GeoLocation;
  category: 'preparation' | 'ceremony' | 'reception' | 'details' | 'vendor_work';
  tags?: string[];
  isPublic: boolean; // Can couples share with guests?
}

// Integration with:
// - Supabase Storage for primary hosting
// - CloudFlare Images for optimization
// - Real-time sharing with couples during events
// - Automatic photo organization by wedding phase
// - Vendor watermarking for professional photos
```

**4. SMS Fallback Communication**
```typescript
// Create: src/lib/integrations/mobile/sms-integration.ts
interface SMSIntegrationService {
  sendWeddingAlert(phoneNumber: string, message: WeddingAlert): Promise<boolean>;
  sendVendorNotification(vendorId: string, notification: VendorNotification): Promise<boolean>;
  sendEmergencyBroadcast(weddingId: string, alert: EmergencyAlert): Promise<SMSBroadcastResult>;
  verifyPhoneNumber(phoneNumber: string): Promise<VerificationResult>;
}

interface WeddingAlert {
  type: 'timeline_change' | 'vendor_update' | 'weather_warning' | 'emergency';
  message: string;
  weddingId: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  includeOptOutLink: boolean;
}

// Integration with Twilio for:
// - Emergency notifications when push fails
// - Vendor arrival confirmations
// - Timeline change alerts
// - Weather warnings for outdoor weddings
// - Two-way SMS for vendor communication
```

**5. Service Worker Background Sync**
```typescript
// Create: src/lib/integrations/mobile/background-sync.ts
interface BackgroundSyncService {
  registerSyncTask(task: SyncTask): Promise<void>;
  processPendingSync(): Promise<SyncResult[]>;
  handleConnectivityChange(isOnline: boolean): void;
  syncCriticalWeddingData(weddingId: string): Promise<boolean>;
}

interface SyncTask {
  id: string;
  type: 'photo_upload' | 'data_update' | 'message_send' | 'location_share';
  data: any;
  priority: number; // Higher number = higher priority
  maxRetries: number;
  createdAt: Date;
  weddingId?: string; // For wedding-specific prioritization
}

// Service worker integration for:
// - Background photo uploads when connectivity returns
// - Offline message queuing and delivery
// - Critical wedding data synchronization
// - Automatic retry with exponential backoff
// - Wedding day priority processing
```

**6. External API Management & Rate Limiting**
```typescript
// Create: src/lib/integrations/mobile/api-manager.ts
interface ExternalAPIManager {
  makeRequest<T>(service: string, endpoint: string, options: RequestOptions): Promise<T>;
  handleRateLimit(service: string, retryAfter: number): void;
  cacheResponse(key: string, data: any, ttl: number): void;
  getCachedResponse<T>(key: string): T | null;
  getServiceHealth(service: string): ServiceHealthStatus;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

// Manages external services:
// - Weather API for outdoor wedding alerts
// - Google Maps for venue directions
// - Email services for notifications
// - Calendar services for sync
// - Photo processing services
// - Payment gateway for mobile transactions
```

**7. Mobile App Deep Linking**
```typescript
// Create: src/lib/integrations/mobile/deep-linking.ts
interface DeepLinkingService {
  generateDeepLink(screen: string, params: Record<string, any>): string;
  handleIncomingDeepLink(url: string): DeepLinkAction;
  registerDeepLinkHandler(pattern: string, handler: DeepLinkHandler): void;
  shareWeddingContent(content: ShareableContent): Promise<boolean>;
}

interface DeepLinkAction {
  screen: string;
  params: Record<string, any>;
  shouldAuthenticate: boolean;
  fallbackUrl?: string; // If app not installed
}

// Deep link patterns:
// wedsync://wedding/123/timeline - Open wedding timeline
// wedsync://photo/456 - View specific photo
// wedsync://vendor/789/chat - Open vendor chat
// wedsync://emergency/123 - Handle emergency alert
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE (File existence will be verified):
- [ ] `src/lib/integrations/mobile/push-notifications.ts` - Multi-platform push system
- [ ] `src/lib/integrations/mobile/calendar-integration.ts` - Device calendar sync
- [ ] `src/lib/integrations/mobile/photo-sharing.ts` - Real-time photo sharing
- [ ] `src/lib/integrations/mobile/sms-integration.ts` - SMS fallback communication
- [ ] `src/lib/integrations/mobile/background-sync.ts` - Service worker sync
- [ ] `src/lib/integrations/mobile/api-manager.ts` - External API management
- [ ] `src/lib/integrations/mobile/deep-linking.ts` - Mobile app deep linking
- [ ] `public/sw-mobile.js` - Service worker for mobile PWA
- [ ] `src/lib/integrations/mobile/config.ts` - Integration configuration
- [ ] Tests for all integration services

### WEDDING CONTEXT USER STORIES:
1. **"As a bride getting ready"** - I receive instant photo notifications from my photographer's mobile app
2. **"As a wedding planner"** - I send emergency SMS alerts when the venue WiFi fails
3. **"As a vendor coordinator"** - My schedule changes sync automatically to all stakeholders' calendars
4. **"As a wedding photographer"** - My photos upload in the background as I shoot, even with poor venue WiFi

## 💾 WHERE TO SAVE YOUR WORK
- Integration Services: `$WS_ROOT/wedsync/src/lib/integrations/mobile/`
- Service Worker: `$WS_ROOT/wedsync/public/sw-mobile.js`
- Configuration: `$WS_ROOT/wedsync/src/lib/integrations/mobile/config.ts`
- Tests: `$WS_ROOT/wedsync/src/__tests__/integrations/mobile/`

## 🏁 COMPLETION CHECKLIST
- [ ] All integration services created and functional
- [ ] TypeScript compilation successful
- [ ] Push notification system tested across platforms (iOS/Android/Web)
- [ ] Calendar integration working with major providers
- [ ] Photo sharing system processing uploads <10 seconds
- [ ] SMS fallback system functional with Twilio
- [ ] Background sync working with service workers
- [ ] External API rate limiting and caching implemented
- [ ] Deep linking system tested with mobile apps
- [ ] All integration tests passing (>90% coverage)

## 🎯 SUCCESS METRICS
- Push notification delivery rate >98% for wedding day alerts
- Calendar sync completion <5 seconds for timeline updates  
- Photo sharing latency <30 seconds at wedding venues
- SMS fallback delivery <15 seconds when push fails
- Background sync processing >95% success rate
- External API uptime >99.5% through redundancy
- Deep link resolution <2 seconds on mobile devices

---

**EXECUTE IMMEDIATELY - This is comprehensive mobile integration infrastructure for enterprise wedding coordination!**