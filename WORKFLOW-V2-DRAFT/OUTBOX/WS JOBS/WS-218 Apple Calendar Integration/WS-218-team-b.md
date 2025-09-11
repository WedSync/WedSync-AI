# TEAM B - ROUND 1: WS-218 - Apple Calendar Integration
## 2025-01-29 - Development Round 1

**YOUR MISSION:** Implement CalDAV protocol client and secure Apple Calendar backend services with iCloud integration
**FEATURE ID:** WS-218 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about CalDAV RFC compliance, iCalendar format handling, and wedding data bidirectional synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/caldav-client.ts
ls -la $WS_ROOT/wedsync/src/app/api/calendar/apple/auth/route.ts
cat $WS_ROOT/wedsync/src/lib/integrations/caldav-client.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **API TEST RESULTS:**
```bash
npm test apple-calendar-api
# MUST show: "All API tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and CalDAV implementations
await mcp__serena__search_for_pattern("api routes calendar integration caldav icalendar");
await mcp__serena__find_symbol("calendar api caldav", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/calendar/");
```

### B. BACKEND ARCHITECTURE & TECHNOLOGY STACK (MANDATORY FOR ALL API WORK)
```typescript
// CRITICAL: Load backend development guidelines
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15**: App Router API routes with RSC
- **Supabase**: PostgreSQL database with Row Level Security
- **CalDAV Protocol**: RFC 4791 compliance for Apple Calendar integration
- **iCalendar**: RFC 5545 support for event formatting
- **AES-256-GCM**: Encryption for app-specific passwords

**❌ DO NOT USE:**
- Outdated CalDAV libraries or non-compliant implementations

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "CalDAV protocol RFC-4791 implementation"
# - "iCalendar RFC-5545 javascript-parsing"
# - "Next.js api-routes supabase-integration"
# - "Node.js caldav-client apple-icloud"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR CALDAV BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for Apple Calendar Backend Design
```typescript
// Complex CalDAV backend architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "CalDAV backend integration needs: RFC 4791 compliant CalDAV client for iCloud communication, iCalendar (RFC 5545) parsing/generation for event format conversion, secure app-specific password storage with AES-256-GCM encryption, bidirectional sync engine with conflict detection, and real-time event mapping between WedSync and Apple Calendar formats.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "CalDAV protocol complexity: PROPFIND requests for calendar discovery, REPORT requests for event querying, PUT requests for event creation/updates, DELETE for event removal, ETag handling for change detection, and CTag monitoring for collection changes. Apple's iCloud CalDAV has specific implementation quirks requiring careful handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding data synchronization challenges: Converting WedSync event structure to iCalendar VEVENT components, handling wedding-specific metadata (client info, vendor details, ceremony vs reception), preserving timezone information for multi-location weddings, managing recurring events for ongoing vendor relationships, and conflict resolution when same event modified in both systems.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "iCloud authentication security: App-specific passwords must be encrypted with AES-256-GCM before database storage, CalDAV credentials require secure transport over HTTPS only, principal discovery URLs need validation, calendar access permissions verification, and audit logging for all CalDAV operations with user context.",
  nextThoughtNeeded: true,
  threadNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation architecture: CalDAVClient class with retry logic and rate limiting, iCalendarProcessor for RFC 5545 compliance, AppleCalendarSyncService orchestrating bidirectional sync, database schema for encrypted credentials and event mapping, API routes with withSecureValidation middleware, and real-time sync status updates via WebSocket.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with backend-specific requirements:

1. **task-tracker-coordinator** - Break down CalDAV implementation and database requirements
2. **api-architect** - Design CalDAV API endpoints and iCalendar processing architecture
3. **security-compliance-officer** - Secure app-specific password storage and CalDAV protocol security
4. **database-mcp-specialist** - Database schema and migration creation for Apple Calendar integration
5. **performance-optimization-expert** - CalDAV request optimization and caching strategies
6. **documentation-chronicler** - Technical API documentation and CalDAV implementation guides

## 🔒 MANDATORY SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API SECURITY CHECKLIST:
- [ ] **withSecureValidation middleware** - ALL Apple Calendar API routes MUST use this middleware
- [ ] **Super admin authentication** - Apple Calendar integration requires elevated permissions
- [ ] **AES-256-GCM encryption** - App-specific passwords encrypted before database storage
- [ ] **CalDAV over HTTPS** - All CalDAV communications over secure connections only
- [ ] **Input validation** - All iCalendar data validated before processing
- [ ] **Rate limiting** - CalDAV requests throttled to prevent Apple server overload
- [ ] **Error sanitization** - CalDAV protocol errors never exposed to frontend
- [ ] **Audit logging** - All CalDAV operations logged with user and event context

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- CalDAV protocol client implementation with RFC 4791 compliance
- iCalendar (RFC 5545) parsing and generation for event conversion
- Secure API routes for Apple Calendar authentication and management
- Database schema and migrations for encrypted credential storage
- Bidirectional sync engine with conflict detection and resolution
- Real-time sync status broadcasting via WebSocket integration
- Wedding event mapping between WedSync and Apple Calendar formats
- Comprehensive error handling and retry logic for CalDAV operations

## 📋 TECHNICAL SPECIFICATION IMPLEMENTATION

### Required Backend Components to Create:

1. **caldav-client.ts** (Core CalDAV protocol implementation)
   - RFC 4791 compliant CalDAV client with PROPFIND, REPORT, PUT, DELETE support
   - iCloud server discovery and principal URL resolution
   - ETag and CTag handling for efficient change detection
   - Retry logic and rate limiting for Apple's CalDAV servers

2. **apple-calendar-client.ts** (Apple-specific CalDAV wrapper)
   - iCloud CalDAV server integration with Apple-specific quirks
   - Calendar discovery and management via CalDAV PROPFIND
   - Event synchronization with iCalendar format conversion
   - Error handling for Apple's CalDAV implementation differences

3. **icalendar-processor.ts** (RFC 5545 iCalendar handling)
   - iCalendar VEVENT parsing and generation
   - Wedding event metadata embedding in iCalendar properties
   - Timezone handling and recurring event support
   - Conflict detection between iCalendar and WedSync event data

4. **apple-calendar-sync-service.ts** (Sync orchestration)
   - Bidirectional synchronization logic
   - Conflict resolution algorithms
   - Real-time sync status updates
   - Event mapping and transformation coordination

### API Routes to Create:

5. **route.ts files for Apple Calendar API endpoints**
   - `/api/calendar/apple/auth/route.ts` - CalDAV authentication
   - `/api/calendar/apple/calendars/route.ts` - Calendar discovery and management
   - `/api/calendar/apple/events/route.ts` - Event synchronization
   - `/api/calendar/apple/sync/route.ts` - Manual sync operations

### Database Migration Implementation:

6. **Database schema migration** (Submit to SQL Expert for review)
   - Apple calendar integration configuration tables
   - CalDAV calendar mapping and metadata storage
   - Event synchronization history and conflict tracking
   - Encrypted app-specific password storage schema

### CalDAV Protocol Implementation:
```typescript
// RFC 4791 compliant CalDAV client
export class CalDAVClient {
  private baseUrl: string;
  private credentials: {
    username: string;
    password: string; // App-specific password
  };

  // Principal discovery (iCloud specific)
  async discoverPrincipal(): Promise<string> {
    const propfindXML = `<?xml version="1.0" encoding="utf-8" ?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:current-user-principal />
        </d:prop>
      </d:propfind>`;
    
    const response = await this.propfindRequest(this.baseUrl, propfindXML, 0);
    return this.extractPrincipalUrl(response);
  }

  // Calendar home discovery
  async discoverCalendarHome(principalUrl: string): Promise<string> {
    const propfindXML = `<?xml version="1.0" encoding="utf-8" ?>
      <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <c:calendar-home-set />
        </d:prop>
      </d:propfind>`;
    
    const response = await this.propfindRequest(principalUrl, propfindXML, 0);
    return this.extractCalendarHomeUrl(response);
  }

  // Calendar discovery
  async discoverCalendars(calendarHomeUrl: string): Promise<CalDAVCalendar[]> {
    const propfindXML = `<?xml version="1.0" encoding="utf-8" ?>
      <d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:displayname />
          <cs:getctag />
          <c:calendar-description />
          <c:supported-calendar-component-set />
          <d:resourcetype />
        </d:prop>
      </d:propfind>`;
    
    const response = await this.propfindRequest(calendarHomeUrl, propfindXML, 1);
    return this.parseCalendarList(response);
  }

  // Event querying with time-range filter
  async queryEvents(calendarUrl: string, startDate: Date, endDate: Date): Promise<CalDAVEvent[]> {
    const reportXML = `<?xml version="1.0" encoding="utf-8" ?>
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:getetag />
          <c:calendar-data />
        </d:prop>
        <c:filter>
          <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT">
              <c:time-range start="${this.formatCalDAVDate(startDate)}" 
                           end="${this.formatCalDAVDate(endDate)}"/>
            </c:comp-filter>
          </c:comp-filter>
        </c:filter>
      </c:calendar-query>`;
    
    const response = await this.reportRequest(calendarUrl, reportXML);
    return this.parseEventList(response);
  }

  // Event creation/update
  async putEvent(eventUrl: string, iCalendarData: string, etag?: string): Promise<string> {
    const headers: HeadersInit = {
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': etag ? undefined : '*',
      'If-Match': etag || undefined,
    };

    const response = await fetch(eventUrl, {
      method: 'PUT',
      headers,
      body: iCalendarData,
      // Add authentication headers
    });

    if (!response.ok) {
      throw new CalDAVError(`Failed to PUT event: ${response.status} ${response.statusText}`);
    }

    return response.headers.get('ETag') || '';
  }

  // Event deletion
  async deleteEvent(eventUrl: string, etag?: string): Promise<void> {
    const headers: HeadersInit = {
      'If-Match': etag || '*',
    };

    const response = await fetch(eventUrl, {
      method: 'DELETE',
      headers,
      // Add authentication headers
    });

    if (!response.ok && response.status !== 404) {
      throw new CalDAVError(`Failed to DELETE event: ${response.status} ${response.statusText}`);
    }
  }

  private async propfindRequest(url: string, xml: string, depth: number): Promise<string> {
    // Implementation with proper authentication and headers
  }

  private async reportRequest(url: string, xml: string): Promise<string> {
    // Implementation with proper authentication and headers
  }
}
```

### iCalendar Processing Implementation:
```typescript
// RFC 5545 compliant iCalendar processing
export class iCalendarProcessor {
  // Convert WedSync event to iCalendar VEVENT
  static convertToiCalendar(wedSyncEvent: WeddingEvent): string {
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//WedSync Calendar Integration//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${wedSyncEvent.id}@wedsync.com`,
      `DTSTART:${this.formatDateTime(wedSyncEvent.startTime)}`,
      `DTEND:${this.formatDateTime(wedSyncEvent.endTime)}`,
      `SUMMARY:${this.escapeText(wedSyncEvent.title)}`,
      `DESCRIPTION:${this.escapeText(wedSyncEvent.description || '')}`,
      `LOCATION:${this.escapeText(wedSyncEvent.location || '')}`,
      `CATEGORIES:WEDDING,${wedSyncEvent.type.toUpperCase()}`,
      `X-WEDSYNC-EVENT-ID:${wedSyncEvent.id}`,
      `X-WEDSYNC-WEDDING-DATE:${this.formatDate(wedSyncEvent.weddingDate)}`,
      `X-WEDSYNC-CLIENT-ID:${wedSyncEvent.clientId || ''}`,
      `X-WEDSYNC-VENDOR-ID:${wedSyncEvent.vendorId || ''}`,
      `DTSTAMP:${this.formatDateTime(new Date())}`,
      `CREATED:${this.formatDateTime(wedSyncEvent.createdAt)}`,
      `LAST-MODIFIED:${this.formatDateTime(wedSyncEvent.updatedAt)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return ical.join('\r\n');
  }

  // Parse iCalendar VEVENT to WedSync event format
  static parseFromiCalendar(iCalendarData: string): Partial<WeddingEvent> {
    const lines = iCalendarData.split(/\r?\n/);
    const event: Partial<WeddingEvent> = {};

    for (const line of lines) {
      const [property, value] = line.split(':');
      
      switch (property) {
        case 'SUMMARY':
          event.title = this.unescapeText(value);
          break;
        case 'DESCRIPTION':
          event.description = this.unescapeText(value);
          break;
        case 'LOCATION':
          event.location = this.unescapeText(value);
          break;
        case 'DTSTART':
          event.startTime = this.parseDateTime(value);
          break;
        case 'DTEND':
          event.endTime = this.parseDateTime(value);
          break;
        case 'X-WEDSYNC-EVENT-ID':
          event.id = value;
          break;
        case 'X-WEDSYNC-WEDDING-DATE':
          event.weddingDate = this.parseDate(value);
          break;
        case 'X-WEDSYNC-CLIENT-ID':
          event.clientId = value || undefined;
          break;
      }
    }

    return event;
  }

  private static formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private static parseDateTime(dateString: string): Date {
    // Handle both local and UTC datetime formats
    if (dateString.endsWith('Z')) {
      return new Date(dateString.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
    } else {
      return new Date(dateString.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
    }
  }

  private static escapeText(text: string): string {
    return text.replace(/([\\;,\n])/g, '\\$1');
  }

  private static unescapeText(text: string): string {
    return text.replace(/\\([\\;,\n])/g, '$1');
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Backend Components (MUST CREATE):
- [ ] `caldav-client.ts` - RFC 4791 compliant CalDAV protocol implementation
- [ ] `apple-calendar-client.ts` - Apple/iCloud specific CalDAV integration wrapper
- [ ] `icalendar-processor.ts` - RFC 5545 iCalendar parsing and generation
- [ ] `apple-calendar-sync-service.ts` - Bidirectional sync orchestration engine
- [ ] Database migration for Apple Calendar integration schema

### API Routes (MUST CREATE):
- [ ] `/api/calendar/apple/auth/route.ts` - CalDAV authentication with app-specific passwords
- [ ] `/api/calendar/apple/calendars/route.ts` - Calendar discovery and management
- [ ] `/api/calendar/apple/events/route.ts` - Event synchronization and CRUD operations
- [ ] `/api/calendar/apple/sync/route.ts` - Manual sync triggers and status monitoring

### Backend Features (MUST IMPLEMENT):
- [ ] CalDAV principal and calendar home discovery for iCloud
- [ ] iCalendar event conversion preserving wedding-specific metadata
- [ ] Bidirectional conflict detection and resolution algorithms
- [ ] Real-time sync status updates via WebSocket broadcasting
- [ ] Encrypted app-specific password storage with AES-256-GCM
- [ ] Comprehensive CalDAV error handling and retry logic
- [ ] Wedding event type mapping to iCalendar categories
- [ ] Audit logging for all CalDAV operations

### Integration Requirements:
- [ ] Team A frontend component integration via API contracts
- [ ] Team C webhook coordination for real-time sync triggers
- [ ] SQL Expert database migration review and approval
- [ ] withSecureValidation middleware on all API routes
- [ ] WebSocket integration for real-time sync status broadcasting

## 💾 WHERE TO SAVE YOUR WORK
- **CalDAV Client**: `$WS_ROOT/wedsync/src/lib/integrations/`
- **API Routes**: `$WS_ROOT/wedsync/src/app/api/calendar/apple/`
- **Services**: `$WS_ROOT/wedsync/src/lib/services/`
- **Types**: `$WS_ROOT/wedsync/src/types/apple-calendar.ts`
- **Migrations**: `$WS_ROOT/wedsync/supabase/migrations/`
- **Tests**: `$WS_ROOT/wedsync/tests/api/apple-calendar/`

## 🏁 COMPLETION CHECKLIST

### Technical Implementation:
- [ ] All CalDAV backend components created and RFC compliant
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All API route tests passing with >90% coverage
- [ ] CalDAV authentication working with iCloud and custom servers
- [ ] iCalendar format compliance verified with validation tools
- [ ] Database migrations created and submitted to SQL Expert

### Security & Protocol Compliance:
- [ ] withSecureValidation middleware applied to all API routes
- [ ] App-specific passwords encrypted with AES-256-GCM before storage
- [ ] CalDAV communications over HTTPS only
- [ ] CalDAV protocol errors sanitized before frontend exposure
- [ ] Rate limiting implemented for Apple's CalDAV server protection
- [ ] Comprehensive audit logging for all CalDAV operations

### CalDAV Integration:
- [ ] RFC 4791 CalDAV protocol compliance validated
- [ ] iCloud server discovery and authentication functional
- [ ] Calendar discovery via PROPFIND working correctly
- [ ] Event querying with time-range filters operational
- [ ] Event creation, update, and deletion via CalDAV working
- [ ] ETag and CTag change detection implemented

### Wedding Data Synchronization:
- [ ] WedSync event to iCalendar conversion preserves all wedding metadata
- [ ] Bidirectional sync maintains data integrity
- [ ] Conflict resolution algorithms handle simultaneous changes
- [ ] Wedding event types properly categorized in iCalendar format
- [ ] Client and vendor information embedded in custom iCalendar properties

### Evidence Package:
- [ ] CalDAV authentication flow working with test credentials
- [ ] iCalendar format validation results for generated events
- [ ] Bidirectional sync demonstration with conflict resolution
- [ ] Database schema documentation and migration files
- [ ] API endpoint testing results with >90% coverage
- [ ] Performance metrics for CalDAV operations

---

**EXECUTE IMMEDIATELY - This is a comprehensive backend implementation for Apple Calendar integration using CalDAV protocol compliance, enabling wedding professionals to seamlessly synchronize business events with their iPhone, iPad, Mac, and Apple Watch calendars!**