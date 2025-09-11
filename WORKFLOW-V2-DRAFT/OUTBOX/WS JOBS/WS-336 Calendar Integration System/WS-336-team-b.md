# TEAM B - ROUND 1: WS-336 - Calendar Integration System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build robust backend API and database infrastructure for calendar integration with Google, Outlook, and Apple Calendar providers
**FEATURE ID:** WS-336 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about OAuth security, token management, and wedding timeline data synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/calendar/
cat $WS_ROOT/wedsync/src/app/api/calendar/sync/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/calendar
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

// Query existing API patterns and database schemas
await mcp__serena__search_for_pattern("api.*route.*auth|database.*schema");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. DATABASE SCHEMA REFERENCE
```typescript
// Load existing database patterns
await mcp__serena__read_file("$WS_ROOT/.claude/database-schema.sql");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load OAuth and calendar API documentation
mcp__Ref__ref_search_documentation("OAuth 2.0 Google Calendar API Outlook Graph API Apple CalDAV");
mcp__Ref__ref_search_documentation("Next.js 15 API routes security middleware token encryption");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX BACKEND PLANNING

### Use Sequential Thinking MCP for Calendar API Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Calendar integration backend requires: 1) OAuth 2.0 flows for 3 providers with different auth patterns, 2) Secure token storage with encryption, 3) Webhook endpoints for calendar change notifications, 4) Rate limiting to respect API quotas, 5) Timeline sync engine with conflict resolution. Critical: Google uses OAuth 2.0, Outlook uses Microsoft Graph, Apple uses CalDAV with app-specific passwords.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API development, track OAuth flows
2. **security-compliance-officer** - Ensure token encryption and secure storage  
3. **nextjs-fullstack-developer** - API routes with proper validation
4. **supabase-specialist** - Database schema and RLS policies
5. **test-automation-architect** - API testing and OAuth mocking
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for all endpoints
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Token encryption** - Encrypt all OAuth tokens before database storage
- [ ] **Scope validation** - Verify calendar permissions match requested scopes
- [ ] **Audit logging** - Log critical calendar operations with user context

### OAUTH SPECIFIC SECURITY:
- [ ] **State parameter validation** - CSRF protection in OAuth flows
- [ ] **PKCE implementation** - For public clients (mobile/SPA)
- [ ] **Token refresh handling** - Secure automatic token renewal
- [ ] **Permission verification** - Validate user owns calendar before sync
- [ ] **Webhook signature validation** - Verify provider webhook signatures

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION - CALENDAR INTEGRATION BACKEND

### WEDDING CONTEXT API REQUIREMENTS

**Wedding Scenario:** Emma & James's wedding timeline needs to sync with:
- Photographer Sarah's Google Calendar
- Venue coordinator's Outlook calendar
- Florist's Apple Calendar
- All vendors get automatic updates when timeline changes

### CORE API ENDPOINTS TO IMPLEMENT

#### 1. Calendar Provider Authentication
```typescript
// POST /api/calendar/auth/initiate
interface CalendarAuthInitiate {
  provider: 'google' | 'outlook' | 'apple';
  scopes: string[];
  redirectUri: string;
}

// POST /api/calendar/auth/callback
interface CalendarAuthCallback {
  provider: string;
  code: string;
  state: string;
}

// DELETE /api/calendar/auth/disconnect
interface CalendarDisconnect {
  provider: string;
}
```

#### 2. Timeline Synchronization Endpoints
```typescript
// POST /api/calendar/sync/timeline
interface TimelineSync {
  weddingId: string;
  timelineEventIds: string[];
  syncSettings: {
    autoSync: boolean;
    syncDirection: 'bidirectional' | 'push-only';
    notifications: boolean;
  };
}

// GET /api/calendar/sync/status
interface SyncStatus {
  weddingId: string;
  lastSync: Date;
  syncErrors: SyncError[];
  pendingEvents: number;
}
```

#### 3. Webhook Endpoints for Calendar Changes
```typescript
// POST /api/calendar/webhooks/google
// POST /api/calendar/webhooks/outlook
// POST /api/calendar/webhooks/apple
interface CalendarWebhook {
  eventId: string;
  calendarId: string;
  changeType: 'created' | 'updated' | 'deleted';
  eventData: any;
}
```

### DATABASE SCHEMA IMPLEMENTATION

```sql
-- Migration: 20250122_calendar_integration_system.sql

-- Calendar provider connections with encrypted tokens
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('google', 'outlook', 'apple')),
  provider_account_id TEXT NOT NULL, -- External account ID
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT[] NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  webhook_id TEXT, -- Provider webhook subscription ID
  webhook_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'expired', 'revoked')),
  sync_error_count INTEGER DEFAULT 0,
  UNIQUE(user_id, provider_type, provider_account_id)
);

-- Wedding timeline to calendar synchronization tracking
CREATE TABLE timeline_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id),
  calendar_connection_id UUID NOT NULL REFERENCES calendar_connections(id),
  external_event_id TEXT NOT NULL, -- Provider's calendar event ID
  external_calendar_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'push' CHECK (sync_direction IN ('push', 'pull', 'bidirectional')),
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict')),
  last_synced TIMESTAMPTZ,
  sync_attempts INTEGER DEFAULT 0,
  sync_errors JSONB DEFAULT '[]',
  conflict_resolution TEXT, -- How conflicts were resolved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(timeline_event_id, calendar_connection_id)
);

-- Calendar sync settings per wedding
CREATE TABLE wedding_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'push' CHECK (sync_direction IN ('push', 'pull', 'bidirectional')),
  notification_preferences JSONB DEFAULT '{"sync_success": true, "sync_errors": true, "conflicts": true}',
  sync_frequency_minutes INTEGER DEFAULT 60 CHECK (sync_frequency_minutes >= 15),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id)
);

-- Calendar sync operation logs for audit trail
CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id UUID NOT NULL REFERENCES calendar_connections(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('auth', 'sync', 'webhook', 'disconnect')),
  timeline_event_id UUID REFERENCES timeline_events(id),
  external_event_id TEXT,
  operation_status TEXT NOT NULL CHECK (operation_status IN ('success', 'error', 'warning')),
  operation_details JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES user_profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_calendar_connections_user_provider ON calendar_connections(user_id, provider_type);
CREATE INDEX idx_calendar_connections_sync_status ON calendar_connections(sync_status, last_sync);
CREATE INDEX idx_timeline_sync_wedding ON timeline_calendar_sync(wedding_id, sync_status);
CREATE INDEX idx_timeline_sync_timeline_event ON timeline_calendar_sync(timeline_event_id);
CREATE INDEX idx_sync_logs_connection_created ON calendar_sync_logs(calendar_connection_id, created_at);
```

### RLS SECURITY POLICIES

```sql
-- Row Level Security for calendar_connections
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_connections_user_access ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Row Level Security for timeline_calendar_sync
ALTER TABLE timeline_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_sync_wedding_access ON timeline_calendar_sync
  FOR ALL USING (
    wedding_id IN (
      SELECT w.id FROM weddings w 
      WHERE w.couple_id = auth.uid() 
      OR w.id IN (
        SELECT ws.wedding_id FROM wedding_suppliers ws 
        WHERE ws.supplier_id = auth.uid()
      )
    )
  );
```

### API IMPLEMENTATION REQUIREMENTS

#### OAuth Flow Implementation
```typescript
// src/app/api/calendar/auth/initiate/route.ts
export async function POST(request: Request) {
  return withSecureValidation(
    z.object({
      provider: z.enum(['google', 'outlook', 'apple']),
      scopes: z.array(z.string()),
      redirectUri: z.string().url()
    }),
    async (validatedData) => {
      // Generate OAuth authorization URL
      // Store state parameter for CSRF protection
      // Return authorization URL to frontend
    }
  )(request);
}
```

#### Token Encryption Service
```typescript
// src/lib/calendar/token-encryption.ts
export class TokenEncryptionService {
  static async encryptToken(token: string): Promise<string> {
    // Use AES-256-GCM encryption with random IV
    // Store encryption key in environment variables
  }
  
  static async decryptToken(encryptedToken: string): Promise<string> {
    // Decrypt token for API calls
    // Handle decryption errors gracefully
  }
}
```

#### Webhook Processing
```typescript
// src/app/api/calendar/webhooks/[provider]/route.ts
export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  // Verify webhook signature
  // Parse webhook payload
  // Update timeline_calendar_sync table
  // Trigger re-sync if needed
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Complete OAuth 2.0 flows for Google, Outlook, Apple
- [ ] Secure token encryption and storage system
- [ ] Timeline synchronization API endpoints
- [ ] Webhook endpoints for calendar change notifications
- [ ] Database migration with comprehensive schema
- [ ] RLS policies for multi-tenant security
- [ ] Rate limiting and error handling
- [ ] Comprehensive API testing suite
- [ ] Security validation middleware integration
- [ ] Evidence package created

## 💾 WHERE TO SAVE YOUR WORK

- API Routes: `$WS_ROOT/wedsync/src/app/api/calendar/`
- Services: `$WS_ROOT/wedsync/src/lib/calendar/`
- Database: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/tests/api/calendar/`
- Reports: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST

- [ ] All API files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All tests passing (OAuth flows, sync operations)
- [ ] Database migration applied successfully
- [ ] Security requirements implemented and tested
- [ ] Rate limiting configured for all endpoints
- [ ] Token encryption working correctly
- [ ] Webhook signature validation implemented
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive backend implementation for wedding calendar integration!**