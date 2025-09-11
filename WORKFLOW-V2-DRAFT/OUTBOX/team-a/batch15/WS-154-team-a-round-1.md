# TEAM A - ROUND 1: WS-154 - Seating Arrangements - Frontend UI Implementation

**Date:** 2025-08-25  
**Feature ID:** WS-154 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build responsive seating arrangement interface with drag-and-drop table management  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple planning reception seating
**I want to:** Visually arrange guests at tables with drag-and-drop and see conflict warnings
**So that:** I can create harmonious table arrangements without relationship conflicts

**Real Wedding Problem This Solves:**
Couples currently draw table assignments on paper, forgetting that "Uncle Bob doesn't get along with Cousin Jim." This feature provides visual table management with conflict detection before finalizing arrangements.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Visual table layout with drag-and-drop guest assignment
- Real-time conflict detection and warnings
- Table capacity management and validation
- Responsive design for desktop and tablet planning

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Drag-and-Drop: React DnD or native HTML5

**Integration Points:**
- Guest Management System: Pull guest lists and relationships
- Table Management: Team B's optimization APIs
- Conflict Detection: Team C's relationship validation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for seating interface:
await mcp__context7__resolve_library_id("next.js");
await mcp__context7__get_library_docs("/vercel/next.js", "drag-drop interaction", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "realtime-updates", 3000);
await mcp__context7__get_library_docs("/tailwindlabs/tailwindcss", "responsive-grid-layouts", 2000);
await mcp__context7__get_library_docs("/react-dnd/react-dnd", "drag-drop-components", 3000);

// 3. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing guest management patterns:
await mcp__serena__find_symbol("GuestList", "", true);
await mcp__serena__get_symbols_overview("src/components/guests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --seating-ui-focus --with-dnd-patterns
2. **react-ui-specialist** --drag-drop-expertise --table-layouts
3. **nextjs-fullstack-developer** --component-architecture --guest-integration  
4. **security-compliance-officer** --data-validation --guest-privacy
5. **test-automation-architect** --ui-testing --accessibility-validation
6. **playwright-visual-testing-specialist** --drag-drop-testing --responsive-validation
7. **code-quality-guardian** --component-patterns --performance-optimization

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **MAIN COMPONENT: SeatingArrangementManager**
- [ ] **Visual Table Layout** - Grid-based table positioning with capacity indicators
- [ ] **Guest Assignment Interface** - Drag-and-drop from guest list to tables
- [ ] **Conflict Detection UI** - Real-time warnings for relationship conflicts
- [ ] **Table Configuration Panel** - Edit table capacity, shape, and special notes
- [ ] **Save/Load Arrangements** - Persist seating arrangements with version history

### **SUPPORTING COMPONENTS:**
- [ ] **TableCard** - Individual table component with guest slots
- [ ] **GuestChip** - Draggable guest representation with dietary indicators
- [ ] **ConflictAlert** - Warning component for relationship conflicts
- [ ] **TableToolbar** - Add/remove/configure tables

### **RESPONSIVE DESIGN:**
- [ ] **Desktop Layout** (1920px+) - Full drag-drop with sidebar
- [ ] **Tablet Layout** (768px-1919px) - Optimized for touch interaction
- [ ] **Mobile Fallback** (375px-767px) - List-based assignment interface

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Seating optimization algorithm API - Required for conflict detection
- FROM Team C: Relationship validation service - Dependency for warning system  
- FROM Team E: Database schema and guest data structure - Required for guest loading

### What other teams NEED from you:
- TO Team C: Component props interface for integration testing
- TO Team D: Responsive breakpoints for WedMe mobile optimization

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```typescript
// REQUIRED: Input validation for all seating operations
import { withSecureValidation } from '@/lib/validation/middleware';
import { seatingArrangementSchema } from '@/lib/validation/schemas';

// All seating updates must validate:
- Guest assignment permissions (couple owns guest data)
- Table capacity limits (prevent overbooking)
- Relationship data access (authorized guest relationships only)
- UI state sanitization (prevent XSS in guest names/notes)
```

**Security Checklist:**
- [ ] Validate all guest assignments against couple ownership
- [ ] Sanitize guest names and table notes for XSS prevention
- [ ] Implement CSRF protection for seating save operations
- [ ] Rate limit drag-and-drop operations to prevent abuse

---

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```javascript
// MANDATORY: Accessibility-first seating interface testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/seating"});

// 1. DRAG-DROP FUNCTIONALITY TESTING
await mcp__playwright__browser_drag({
  startElement: "guest-chip-123", startRef: "guest-list",
  endElement: "table-slot-1", endRef: "table-5"
});
await mcp__playwright__browser_wait_for({text: "Guest assigned to Table 5"});

// 2. CONFLICT DETECTION VALIDATION
await mcp__playwright__browser_drag({
  startElement: "uncle-bob-chip", startRef: "guest-list", 
  endElement: "table-slot-2", endRef: "table-5"
});
await mcp__playwright__browser_wait_for({text: "Conflict detected"});

// 3. RESPONSIVE TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  // Verify seating interface adapts properly
}
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] SeatingArrangementManager component fully functional
- [ ] Drag-and-drop working across all supported browsers
- [ ] Conflict detection displaying warnings correctly
- [ ] Responsive design working at all breakpoints
- [ ] Unit tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating drag-drop user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] Security validation implemented

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/seating/`
- Types: `/wedsync/src/types/seating.ts`
- Styles: `/wedsync/src/styles/seating.css`
- Tests: `/wedsync/tests/seating/ui/`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch15/WS-154-team-a-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify backend APIs (Team B's responsibility)
- Do NOT implement database schemas (Team E's responsibility) 
- Do NOT skip accessibility testing
- REMEMBER: Teams B, C, D, E work in parallel - coordinate interfaces

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY