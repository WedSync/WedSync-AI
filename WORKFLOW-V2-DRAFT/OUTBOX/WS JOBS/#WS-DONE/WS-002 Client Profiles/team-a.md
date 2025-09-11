# TEAM A - ROUND 1: WS-002 - Client Profiles - Frontend/UI Components

**Date:** 2025-08-29  
**Feature ID:** WS-002 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Create comprehensive client profile interface with tabbed sections, activity feed, and document management  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/clients/profile/
ls -la $WS_ROOT/wedsync/src/app/\(dashboard\)/clients/[id]/page.tsx
cat $WS_ROOT/wedsync/src/components/clients/profile/ClientProfileHeader.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/clients/profile
# MUST show: "All tests passing"
```

---

## <¯ USER STORY & WEDDING CONTEXT

**As a:** Wedding venue coordinator managing 200+ weddings per year
**I want to:** Access complete client information with all details, history, and documents in one place
**So that:** I can answer any question about a couple's wedding in 30 seconds instead of searching through 5 systems for 15 minutes

**Real Wedding Problem This Solves:**
Venue coordinators get calls from couples, suppliers, and staff needing information. Currently they search through email, spreadsheets, calendar, file folders, and notes apps. With this unified profile, they see everything instantly: contact info, preferences, timeline, documents, notes, and communication history.

---

## =Ú STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");
```

## <¯ SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] ClientProfileHeader component with couple information and quick actions
- [ ] ClientInfoTabs component with tabbed interface (Details, Timeline, Documents, Notes, Activity)
- [ ] ClientActivityFeed component with chronological activity display
- [ ] ClientDocuments component with file upload and management
- [ ] ClientNotes component with rich text editing
- [ ] Main client profile page with navigation integration
- [ ] Zustand store for profile state management
- [ ] Unit tests with >80% coverage

## >í CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

**Client Profile Navigation:**
```typescript
// MUST integrate into client detail navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/clients/[id]/layout.tsx
// Add breadcrumbs and tabs:
{
  label: "Profile",
  href: `/clients/${id}/profile`,
  current: pathname.includes('/profile')
}
```

## =¾ WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `$WS_ROOT/wedsync/src/components/clients/profile/`
- Main page: `$WS_ROOT/wedsync/src/app/(dashboard)/clients/[id]/page.tsx`
- Store: `$WS_ROOT/wedsync/src/lib/stores/clientProfileStore.ts`
- Types: `$WS_ROOT/wedsync/src/types/client-profile.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/components/clients/profile/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-002-client-profiles-team-a-round-1-complete.md`

## =Ê MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-002 and update:
```json
{
  "id": "WS-002-client-profiles",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-08-29",
  "testing_status": "needs-testing",
  "team": "Team A",
  "notes": "Client profile frontend completed in Round 1. All components with navigation integration."
}
```

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY