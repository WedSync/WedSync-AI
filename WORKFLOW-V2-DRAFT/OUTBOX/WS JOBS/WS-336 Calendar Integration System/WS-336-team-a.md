# TEAM A - ROUND 1: WS-336 - Calendar Integration System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI components for calendar integration across Google Calendar, Outlook, and Apple Calendar for wedding timeline synchronization
**FEATURE ID:** WS-336 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding timeline synchronization and vendor coordination

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/calendar-integration/
cat $WS_ROOT/wedsync/src/components/calendar-integration/CalendarSyncDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test calendar-integration
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

// Query existing calendar/integration patterns
await mcp__serena__search_for_pattern("calendar.*integration|timeline.*sync");
await mcp__serena__find_symbol("Timeline", "", true);
await mcp__serena__get_symbols_overview("src/components/timeline");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/.claude/UNIFIED-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load calendar integration documentation
mcp__Ref__ref_search_documentation("calendar API integration Google Outlook Apple wedding timeline sync");
mcp__Ref__ref_search_documentation("Next.js calendar widget components responsive design");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Calendar Integration Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Calendar integration for weddings requires: 1) Multiple provider support (Google/Outlook/Apple), 2) Wedding timeline sync with vendors, 3) Real-time availability sharing, 4) Permission management for couple/suppliers, 5) Conflict detection for wedding day schedules. Key challenge: Each calendar provider has different OAuth flows and API limitations.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down calendar integration work, track dependencies
2. **react-ui-specialist** - Use Serena for consistent component patterns  
3. **security-compliance-officer** - Ensure OAuth security requirements
4. **code-quality-guardian** - Maintain code standards
5. **test-automation-architect** - Calendar sync testing
6. **documentation-chronicler** - Evidence-based documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### CALENDAR INTEGRATION SECURITY CHECKLIST:
- [ ] **OAuth 2.0 implementation** - Secure token management for all providers
- [ ] **Token refresh handling** - Automatic renewal without user intervention
- [ ] **Scope limitation** - Request minimal calendar permissions required
- [ ] **Data encryption** - Encrypt calendar tokens in database
- [ ] **GDPR compliance** - Clear consent for calendar access
- [ ] **Token revocation** - Allow users to disconnect calendars
- [ ] **Audit logging** - Log all calendar sync operations
- [ ] **Rate limiting** - Respect provider API limits

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone calendar pages without navigation integration**
**✅ MANDATORY: All calendar components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add "Calendar Sync" section to supplier dashboard navigation
- [ ] Mobile navigation support for calendar management  
- [ ] Navigation states (active/current) for calendar sections
- [ ] Breadcrumbs: Dashboard > Integrations > Calendar Sync
- [ ] Accessibility labels for calendar navigation items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance
- Component performance <200ms

## 📋 TECHNICAL SPECIFICATION - CALENDAR INTEGRATION SYSTEM

### WEDDING CONTEXT USER STORIES

**Primary User:** Sarah (Wedding Photographer)
- "I need my Google Calendar to sync with couple's wedding timeline so I know exactly when to arrive for getting ready shots"
- "When the couple updates ceremony time, I want it to automatically update in my calendar"

**Primary User:** Emma (Bride)
- "I want to share our wedding timeline with all vendors so everyone knows the schedule"
- "I need to see which vendors have confirmed their availability for specific timeline slots"

### CORE FEATURES TO IMPLEMENT

#### 1. Calendar Provider Integration Dashboard
```typescript
// Component: CalendarSyncDashboard.tsx
interface CalendarProvider {
  id: 'google' | 'outlook' | 'apple';
  name: string;
  isConnected: boolean;
  lastSync: Date;
  syncStatus: 'active' | 'error' | 'pending';
  permissions: string[];
}
```

#### 2. Wedding Timeline Sync Interface
```typescript
// Component: TimelineSyncManager.tsx
interface WeddingTimelineSync {
  weddingId: string;
  timelineEvents: TimelineEvent[];
  syncedProviders: CalendarProvider[];
  syncSettings: {
    autoSync: boolean;
    syncDirection: 'bidirectional' | 'push-only' | 'pull-only';
    notifications: boolean;
  };
}
```

#### 3. Calendar Authorization Flow
```typescript
// Component: CalendarAuthFlow.tsx
// Handle OAuth flows for Google, Outlook, Apple Calendar
// Secure token storage and refresh management
```

#### 4. Availability Sharing Widget
```typescript
// Component: AvailabilitySharing.tsx
// Allow couples to share availability with vendors
// Vendors can see couple's free/busy times
```

### DATABASE INTEGRATION REQUIRED

```sql
-- Calendar integration tables
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  provider_type TEXT NOT NULL, -- 'google', 'outlook', 'apple'
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT[],
  calendar_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ
);

CREATE TABLE timeline_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  timeline_event_id UUID NOT NULL REFERENCES timeline_events(id),
  calendar_connection_id UUID NOT NULL REFERENCES calendar_connections(id),
  external_event_id TEXT, -- Provider's event ID
  sync_status TEXT DEFAULT 'pending',
  last_synced TIMESTAMPTZ,
  sync_errors JSONB
);
```

### RESPONSIVE DESIGN REQUIREMENTS

**Mobile First (375px):**
- Stack calendar providers vertically
- Touch-friendly sync buttons (48x48px minimum)
- Simplified timeline view with swipe navigation

**Tablet (768px):**
- Two-column layout: providers + timeline
- Modal dialogs for calendar authorization

**Desktop (1920px):**
- Full dashboard layout with sidebar
- Inline calendar preview
- Batch operations interface

### ACCESSIBILITY REQUIREMENTS

- Screen reader support for calendar connection status
- Keyboard navigation for all calendar operations
- High contrast mode for timeline events
- ARIA labels for sync status indicators
- Focus management during OAuth flows

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] CalendarSyncDashboard component with provider list
- [ ] CalendarAuthFlow component for OAuth integration
- [ ] TimelineSyncManager for wedding timeline sync
- [ ] AvailabilitySharing widget for couples
- [ ] Responsive design across all breakpoints
- [ ] Unit tests for all components (>90% coverage)
- [ ] Integration with existing navigation system
- [ ] Security validation implemented
- [ ] Evidence package created

## 💾 WHERE TO SAVE YOUR WORK

- Code: `$WS_ROOT/wedsync/src/components/calendar-integration/`
- Tests: `$WS_ROOT/wedsync/tests/calendar-integration/`
- Reports: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST

- [ ] All files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All tests passing
- [ ] Security requirements implemented
- [ ] Navigation integration complete
- [ ] Responsive design validated
- [ ] Accessibility compliance verified
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for wedding calendar integration!**