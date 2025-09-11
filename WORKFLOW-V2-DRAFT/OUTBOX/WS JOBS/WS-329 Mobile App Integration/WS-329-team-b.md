# TEAM B - ROUND 1: WS-329 - Mobile App Integration
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build robust backend API infrastructure for WedSync Mobile App with offline sync, real-time capabilities, and wedding day reliability
**FEATURE ID:** WS-329 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about API reliability during wedding events when network conditions are poor

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/mobile/
cat $WS_ROOT/wedsync/src/app/api/mobile/sync/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test mobile-api
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

// Query API-specific patterns
await mcp__serena__search_for_pattern("api.*route.*mobile");
await mcp__serena__find_symbol("ApiRoute", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. API ARCHITECTURE & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("$WS_ROOT/wedsync/docs/latest-tech-docs/nextjs-15-guide.md");
await mcp__serena__read_file("$WS_ROOT/wedsync/docs/latest-tech-docs/supabase-nextjs-guide.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile API development
mcp__Ref__ref_search_documentation("Next.js 15 API routes mobile sync patterns offline first");
mcp__Ref__ref_search_documentation("Supabase realtime mobile sync conflict resolution patterns");
mcp__Ref__ref_search_documentation("PWA background sync service worker API patterns");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile API for WedSync needs: 1) Offline-first sync for wedding venues with poor connectivity, 2) Conflict resolution for multiple vendors updating same wedding, 3) Real-time push for critical wedding day updates, 4) Optimized payloads for mobile bandwidth, 5) Wedding day priority routing for time-sensitive operations",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Break down API endpoints, track sync dependencies
2. **supabase-specialist** - Focus on mobile-optimized database queries and realtime
3. **security-compliance-officer** - Ensure mobile API security with token management
4. **code-quality-guardian** - Maintain API performance and error handling standards
5. **test-automation-architect** - API testing including offline scenarios
6. **documentation-chronicler** - Document API patterns and mobile sync behavior

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE API SECURITY CHECKLIST:
- [ ] **JWT Token Refresh** - Seamless token refresh for long wedding events
- [ ] **Offline Token Validation** - Validate cached tokens when offline
- [ ] **Wedding Data Encryption** - End-to-end encryption for sensitive wedding info
- [ ] **API Rate Limiting** - Prevent abuse while allowing wedding day traffic spikes
- [ ] **Device Fingerprinting** - Secure device identification for trusted wedding devices
- [ ] **Emergency Override** - Special authentication for wedding day emergencies
- [ ] **Vendor Isolation** - Ensure vendors only access their assigned weddings
- [ ] **Audit Logging** - Complete logging of wedding data access for security

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**MOBILE API ARCHITECTURE:**
- **Offline-First Design**: APIs that work with cached data when venues have poor connectivity
- **Conflict Resolution**: Handle simultaneous updates from multiple wedding vendors
- **Real-Time Sync**: Supabase realtime for critical wedding updates
- **Optimized Payloads**: Minimize data transfer for mobile bandwidth conservation
- **Wedding Day Priority**: Express lanes for time-sensitive wedding operations
- **Background Sync**: Queue operations for execution when connectivity returns

## 📱 MOBILE API INTEGRATION SPECIFICATIONS

### CORE API ENDPOINTS TO BUILD:

**1. Mobile Sync API**
```typescript
// Create: src/app/api/mobile/sync/route.ts
interface SyncRequest {
  lastSyncTimestamp: string;
  deviceId: string;
  weddingIds: string[];
  pendingOperations: OfflineOperation[];
}

interface SyncResponse {
  updates: {
    weddings: Wedding[];
    vendors: Vendor[];
    timeline: TimelineEvent[];
    deletions: string[];
  };
  conflicts: ConflictResolution[];
  nextSyncToken: string;
}

// POST /api/mobile/sync
// - Delta sync based on timestamp
// - Conflict resolution for concurrent edits
// - Priority sync for wedding day events
// - Batch operations for efficiency
```

**2. Offline Queue Management**
```typescript
// Create: src/app/api/mobile/queue/route.ts
interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'wedding' | 'vendor' | 'timeline' | 'guest';
  data: any;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent'; // urgent = wedding day
}

// POST /api/mobile/queue/process
// - Process queued operations from offline mobile apps
// - Maintain operation order for consistency
// - Handle conflicts with server state
// - Return success/failure status for each operation
```

**3. Real-Time Mobile Subscriptions**
```typescript
// Create: src/app/api/mobile/realtime/route.ts
interface MobileSubscription {
  deviceId: string;
  weddingIds: string[];
  eventTypes: ('timeline_update' | 'vendor_message' | 'emergency_alert' | 'photo_share')[];
  pushToken?: string; // For push notifications when app is closed
}

// POST /api/mobile/realtime/subscribe
// - Subscribe to real-time events for specific weddings
// - Handle push notification registration
// - Manage subscription lifecycle
// - Priority delivery for wedding day events
```

**4. Mobile-Optimized Wedding Data API**
```typescript
// Create: src/app/api/mobile/wedding/[id]/route.ts
interface MobileWeddingData {
  wedding: Wedding;
  essentialVendors: Vendor[]; // Only vendors needed for current user's role
  todaySchedule: TimelineEvent[]; // Only today's events for performance
  emergencyContacts: Contact[];
  weatherAlert?: WeatherAlert;
  criticalUpdates: Update[];
}

// GET /api/mobile/wedding/[id]
// - Optimized payload for mobile consumption
// - Role-based data filtering (photographer gets different data than planner)
// - Include only essential data for mobile screens
// - Cache-friendly with ETags for bandwidth conservation
```

**5. Background Sync Service**
```typescript
// Create: src/app/api/mobile/background-sync/route.ts
interface BackgroundSyncRequest {
  operations: OfflineOperation[];
  deviceId: string;
  networkQuality: 'poor' | 'good' | 'excellent';
}

// POST /api/mobile/background-sync
// - Handle background sync from PWA service workers
// - Prioritize operations based on wedding proximity
// - Batch operations for efficiency
// - Return minimal response for bandwidth conservation
```

**6. Mobile Photo Upload API**
```typescript
// Create: src/app/api/mobile/photos/upload/route.ts
interface MobilePhotoUpload {
  weddingId: string;
  photos: {
    file: File;
    timestamp: string;
    location?: GeoLocation;
    category: 'preparation' | 'ceremony' | 'reception' | 'vendor_work';
    vendorId: string;
  }[];
  uploadPriority: 'background' | 'immediate';
}

// POST /api/mobile/photos/upload
// - Handle multiple photo uploads from mobile devices
// - Progressive upload with resumable capabilities
// - Automatic thumbnail generation
// - Share with couples in real-time during wedding
```

**7. Wedding Day Emergency API**
```typescript
// Create: src/app/api/mobile/emergency/route.ts
interface EmergencyAlert {
  weddingId: string;
  alertType: 'weather' | 'vendor_delay' | 'venue_issue' | 'medical' | 'custom';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  affectedParties: ('couple' | 'vendors' | 'guests' | 'venue')[];
}

// POST /api/mobile/emergency/alert
// - Instant notifications to all wedding stakeholders
// - Override normal notification preferences for emergencies
// - SMS fallback when push notifications fail
// - Track acknowledgment from key stakeholders
```

## 🎯 DATABASE INTEGRATION REQUIREMENTS

### Mobile-Optimized Database Operations:
```sql
-- Create mobile sync tracking table
CREATE TABLE mobile_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    device_id VARCHAR(255) NOT NULL,
    last_sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
    sync_token VARCHAR(255),
    wedding_subscriptions UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create offline operations queue
CREATE TABLE offline_operations_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_data JSONB NOT NULL,
    operation_timestamp TIMESTAMPTZ NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mobile push tokens table
CREATE TABLE mobile_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    device_id VARCHAR(255) NOT NULL,
    push_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE (File existence will be verified):
- [ ] `src/app/api/mobile/sync/route.ts` - Delta sync API for offline-first mobile
- [ ] `src/app/api/mobile/queue/route.ts` - Offline operations queue processing
- [ ] `src/app/api/mobile/realtime/route.ts` - Mobile real-time subscriptions
- [ ] `src/app/api/mobile/wedding/[id]/route.ts` - Mobile-optimized wedding data
- [ ] `src/app/api/mobile/background-sync/route.ts` - Background sync service
- [ ] `src/app/api/mobile/photos/upload/route.ts` - Mobile photo upload handling
- [ ] `src/app/api/mobile/emergency/route.ts` - Wedding day emergency alerts
- [ ] `src/lib/mobile/sync-manager.ts` - Sync logic and conflict resolution
- [ ] `src/lib/mobile/offline-queue.ts` - Offline operation management
- [ ] Tests for all mobile API endpoints

### WEDDING CONTEXT USER STORIES:
1. **"As a wedding photographer at a remote venue"** - My app syncs photos and updates when I get connectivity
2. **"As a wedding planner during setup"** - I need real-time vendor updates even with spotty WiFi
3. **"As a caterer running late"** - I can update my arrival time offline and it syncs automatically
4. **"As a couple on wedding morning"** - I receive instant notifications about vendor arrivals and setup progress

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: `$WS_ROOT/wedsync/src/app/api/mobile/`
- Sync Logic: `$WS_ROOT/wedsync/src/lib/mobile/`
- Tests: `$WS_ROOT/wedsync/src/__tests__/api/mobile/`
- Database Migrations: `$WS_ROOT/wedsync/supabase/migrations/`

## 🏁 COMPLETION CHECKLIST
- [ ] All API endpoints created and functional
- [ ] TypeScript compilation successful
- [ ] Offline sync logic implemented with conflict resolution
- [ ] Real-time subscriptions working with Supabase
- [ ] Mobile-optimized data payloads (< 50KB per request)
- [ ] Wedding day priority routing implemented
- [ ] Background sync service functional
- [ ] Emergency alert system tested
- [ ] All API tests passing (>90% coverage)
- [ ] Database migrations applied successfully

## 🎯 SUCCESS METRICS
- API response time <200ms for sync operations
- Offline queue processing >95% success rate
- Real-time message delivery <1 second during wedding events
- Mobile data usage reduced by 60% vs desktop equivalent
- Wedding day emergency alerts delivered <5 seconds
- Conflict resolution accuracy >99% for simultaneous edits

---

**EXECUTE IMMEDIATELY - This is comprehensive backend infrastructure for enterprise wedding mobile coordination!**