# TEAM A - ROUND 2: WS-153 - Photo Groups Management - Advanced UI & Integration

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Enhance photo group UI with advanced features and integrate with Team B's APIs  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Advanced photo group management with scheduling and conflict resolution
**So that:** My photographer can efficiently manage complex photo session logistics without timing conflicts

**Real Wedding Problem This Solves:**
Building on Round 1's basic grouping, couples now need to schedule photo sessions with time slots, detect conflicts when the same person is in multiple overlapping groups, and provide photographer-specific notes for optimal session planning.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Round 1 Foundation:**
- Integration with Team B's API endpoints for photo groups
- Advanced conflict detection UI with visual warnings
- Photo session scheduling with time slot management
- Priority-based group organization and reordering
- Photographer notes interface and location preferences
- Real-time updates when groups are modified

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: Supabase Realtime subscriptions

**Integration Points:**
- **Team B APIs**: Integrate with completed photo group CRUD endpoints
- **Team C Database**: Use established schema and migrations
- **Real-time Updates**: Supabase subscriptions for live group changes
- **WS-151 Integration**: Enhanced guest list connectivity

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-actions api-integration", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions broadcasting", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "advanced-ui scheduling-components", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW Round 1 implementation:
await mcp__serena__find_symbol("PhotoGroupManager", "", true);
await mcp__serena__find_symbol("PhotoGroupBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/guests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Advanced photo group UI features"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Real-time UI updates and scheduling" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Complex photo session workflows" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Features & API Integration):
- [ ] **PhotoGroupScheduler.tsx** - Time slot management and scheduling interface
- [ ] **ConflictDetectionPanel.tsx** - Visual conflict warnings and resolution suggestions
- [ ] **PhotographerNotesEditor.tsx** - Rich text editor for photographer instructions
- [ ] **GroupPriorityManager.tsx** - Drag-drop priority reordering interface
- [ ] **Real-time Integration** - Supabase subscriptions for live updates
- [ ] **API Integration Layer** - Connect to Team B's endpoints
- [ ] **Enhanced Unit Tests** - Cover all new components (>85% coverage)
- [ ] **Advanced Playwright Tests** - Complex scheduling and conflict scenarios

### Core Advanced Features:
- [ ] Time slot scheduling with conflict detection
- [ ] Visual timeline view for photo session planning  
- [ ] Priority-based group ordering with drag-drop
- [ ] Rich text photographer notes with photo/location preferences
- [ ] Real-time updates when other users modify groups
- [ ] Advanced conflict resolution UI with suggestions
- [ ] Mobile-optimized scheduling interface

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Round 1 Complete):
- FROM Team B: Photo group API endpoints (CRUD operations) - **READY**
- FROM Team C: Database schema and migration completion - **READY**
- FROM Team B: Real-time API integration endpoints - **NEW DEPENDENCY**

### What other teams NEED from you:
- TO Team D: Advanced photo group components for WedMe integration
- TO Team E: Complex UI components for comprehensive testing
- TO Team B: Enhanced API requirements for scheduling features

---

## 🔒 SECURITY REQUIREMENTS (ENHANCED FOR ROUND 2)

### Advanced Security for Real-time Features:
- [ ] **Real-time Authentication**: Validate user permissions for live updates
- [ ] **Rate Limiting**: Prevent abuse of real-time subscriptions
- [ ] **Input Sanitization**: Clean all scheduler and notes data
- [ ] **Conflict Resolution Security**: Validate user can modify conflicting groups

```typescript
// Real-time subscription security
const subscription = supabase
  .channel('photo-groups')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'photo_groups',
    filter: `couple_id=eq.${userId}` // User can only see their groups
  }, (payload) => {
    // Validate and sanitize payload before UI update
  })
  .subscribe();
```

---

## 🎭 ADVANCED PLAYWRIGHT TESTING (ROUND 2)

```javascript
// COMPLEX SCHEDULING WORKFLOW TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/guests/photo-groups"});

// 1. TEST CONFLICT DETECTION
await mcp__playwright__browser_click({
  element: "Schedule Group: Family",
  ref: "[data-group-id='family-group']"
});
await mcp__playwright__browser_type({
  element: "Time Input",
  ref: "[data-testid='time-input']",
  text: "2:00 PM"
});

// Create conflicting schedule
await mcp__playwright__browser_click({
  element: "Schedule Group: Friends", 
  ref: "[data-group-id='friends-group']"
});
await mcp__playwright__browser_type({
  element: "Time Input",
  ref: "[data-testid='time-input']", 
  text: "2:15 PM"
});

// Verify conflict warning appears
await mcp__playwright__browser_wait_for({
  text: "Scheduling conflict detected"
});

// 2. TEST REAL-TIME UPDATES
await mcp__playwright__browser_tab_new({url: "/guests/photo-groups"});
// Simulate another user making changes
await mcp__playwright__browser_tab_select({index: 0});
await mcp__playwright__browser_wait_for({
  text: "Group updated by another user"
});
```

---

## ✅ SUCCESS CRITERIA (ENHANCED FOR ROUND 2)

### Technical Implementation:
- [ ] All Round 2 advanced features complete
- [ ] API integration working with Team B endpoints
- [ ] Real-time updates functioning correctly
- [ ] Conflict detection accurate and user-friendly
- [ ] Tests written FIRST and passing (>85% coverage)
- [ ] Advanced Playwright tests for complex scenarios

### Integration & Performance:
- [ ] Real-time performance optimized (no lag on updates)
- [ ] Complex scheduling workflows work smoothly
- [ ] Mobile interface handles advanced features properly
- [ ] All security requirements for real-time features met

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/guests/PhotoGroupScheduler.tsx`
- Frontend: `/wedsync/src/components/guests/ConflictDetectionPanel.tsx`
- Frontend: `/wedsync/src/components/guests/PhotographerNotesEditor.tsx`
- Frontend: `/wedsync/src/components/guests/GroupPriorityManager.tsx`
- Services: `/wedsync/src/lib/services/photoGroupRealtimeService.ts`
- Tests: `/wedsync/src/__tests__/unit/guests/photo-groups-advanced.test.tsx`
- E2E Tests: `/wedsync/src/__tests__/playwright/photo-groups-scheduling.spec.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch14/WS-153-team-a-round-2-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_2_COMPLETE | team-a | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All advanced UI features complete
- [ ] API integration tested and working
- [ ] Real-time updates implemented
- [ ] Conflict detection accurate
- [ ] Security validated for new features
- [ ] Tests written and passing
- [ ] Evidence package created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY