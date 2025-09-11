# TEAM A - ROUND 1: WS-153 - Photo Groups Management - UI Components & User Interface

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build interactive photo group management UI components for couples to organize wedding photography  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Create photo groups from my guest list for efficient photography organization
**So that:** My photographer can efficiently capture all desired group combinations without confusion

**Real Wedding Problem This Solves:**
A couple currently creates handwritten lists like "Family photos: Mom's side, Dad's side, siblings only" leading to missed shots. With this feature, they create groups like "Smith Family (8 people): John Sr., Mary, John Jr., Sarah..." with automatic conflict detection if someone is in overlapping photos scheduled simultaneously.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Interactive photo group builder with drag-and-drop functionality
- Guest selection from existing guest list (WS-151 integration)
- Visual group organization with conflict detection
- Photo session timing and duration management
- Priority-based group organization
- Photographer notes and location preferences

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Drag-and-Drop: @dnd-kit/core (if not already in project)

**Integration Points:**
- **Existing Guest Management**: Extends WS-151 guest list system
- **Database**: New photo_groups and photo_group_members tables
- **Team Dependencies**: Backend APIs from Team B, Database schema from Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "app-router components server-actions", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database realtime subscriptions", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "drag-drop ui-components", 2000);
await mcp__context7__get-library-docs("/atlassian/react-beautiful-dnd", "drag-drop-lists", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("GuestListBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/guests");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photo group UI component development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Drag-drop photo group management" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Photo organization workflows" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files in `/src/components/guests/` first
- Understand existing guest management patterns and conventions
- Check WS-151 integration points
- Review similar drag-drop implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for photo group components
- Write test cases FIRST (TDD)
- Plan drag-drop interaction patterns
- Consider edge cases (duplicate groups, empty groups, conflicts)
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing guest management patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core UI Implementation):
- [ ] **PhotoGroupManager.tsx** - Main container component with group list view
- [ ] **PhotoGroupBuilder.tsx** - Interactive group creation interface
- [ ] **PhotoGroupCard.tsx** - Individual photo group display component
- [ ] **GuestSelector.tsx** - Guest selection from existing WS-151 guest list
- [ ] **Unit tests with >80% coverage** for all components
- [ ] **Basic Playwright tests** for drag-drop functionality

### Core Features to Implement:
- [ ] Create new photo groups with name, description, shot type
- [ ] Drag-and-drop guest assignment to groups
- [ ] Visual group member display with avatars/names
- [ ] Basic conflict detection UI (overlapping time slots)
- [ ] Integration with existing guest list from WS-151
- [ ] Responsive design for mobile and desktop

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Photo group API endpoints (GET, POST, PUT, DELETE)
- FROM Team C: Database schema creation and migration files

### What other teams NEED from you:
- TO Team B: Component interface contracts for API integration
- TO Team D: Photo group component exports for WedMe platform
- TO Team E: UI components for testing and validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MANDATORY SECURITY IMPLEMENTATION FOR ALL COMPONENTS:**

- [ ] **Input Validation**: Validate all form inputs with Zod schemas
- [ ] **XSS Prevention**: Sanitize ALL user input for group names and descriptions
- [ ] **Authentication Check**: Verify user owns the guest list before group creation
- [ ] **CSRF Protection**: Use server actions with CSRF tokens
- [ ] **Data Sanitization**: Clean guest data before display
- [ ] **Error Handling**: NEVER expose sensitive errors to users

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { photoGroupSchema } from '@/lib/validation/schemas';

// Validate all form submissions
const validatedData = photoGroupSchema.parse(formData);

// Sanitize display data
import { sanitizeHTML } from '@/lib/security/input-validation';
const safeDescription = sanitizeHTML(group.description);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/guests/photo-groups"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. DRAG-DROP INTERACTION TESTING (REVOLUTIONARY!)
await mcp__playwright__browser_drag({
  startElement: "Guest: John Smith", startRef: "[data-guest-id='guest1']",
  endElement: "Photo Group: Family", endRef: "[data-group-id='group1']"
});
await mcp__playwright__browser_wait_for({text: "John Smith added to Family group"});

// 3. MULTI-TAB WORKFLOW VALIDATION
await mcp__playwright__browser_tab_new({url: "/guests/list"});     // Guest list tab
await mcp__playwright__browser_tab_new({url: "/guests/photo-groups"}); // Photo groups tab
await mcp__playwright__browser_tab_select({index: 0});            // Switch to guest list
// Add new guest, then verify it appears in photo groups tab
await mcp__playwright__browser_tab_select({index: 1});
await mcp__playwright__browser_wait_for({text: "New guest available"});

// 4. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-photo-groups.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Drag-drop workflows (guest assignment, group reordering)
- [ ] Conflict detection UI (overlapping time warnings)
- [ ] Zero console errors (verified)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating drag-drop flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] Components integrate with existing WS-151 guest system

### Integration & Performance:
- [ ] Integration with existing guest management working
- [ ] Performance targets met (<1s component load, smooth drag-drop)
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working photo group interface
- [ ] Playwright test results showing drag-drop functionality
- [ ] Performance metrics for component loading
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/guests/PhotoGroupManager.tsx`
- Frontend: `/wedsync/src/components/guests/PhotoGroupBuilder.tsx`
- Frontend: `/wedsync/src/components/guests/PhotoGroupCard.tsx`
- Frontend: `/wedsync/src/components/guests/GuestSelector.tsx`
- Tests: `/wedsync/src/__tests__/unit/guests/photo-groups.test.tsx`
- E2E Tests: `/wedsync/src/__tests__/playwright/photo-groups.spec.ts`
- Types: `/wedsync/src/types/photo-groups.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch14/WS-153-team-a-round-1-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_1_COMPLETE | team-a | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping files
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY