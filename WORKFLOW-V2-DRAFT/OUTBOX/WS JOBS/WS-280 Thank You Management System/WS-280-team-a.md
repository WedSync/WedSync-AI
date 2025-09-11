# TEAM A - ROUND 1: WS-280 - Thank You Management System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI for wedding thank you card management system
**FEATURE ID:** WS-280 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding thank you workflows and couple's post-wedding tasks

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/thank-you/
cat $WS_ROOT/wedsync/src/components/thank-you/ThankYouManager.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test thank-you
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

// Query specific areas relevant to thank you management
await mcp__serena__search_for_pattern("card template management gift tracking");
await mcp__serena__find_symbol("GiftList GuestCard Template", "", true);
await mcp__serena__get_symbols_overview("src/components/gifts/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide based on feature type
// General SaaS UI (Most features):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Journey Builder UI (ONLY for Journey/Workflow features):
// await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/JOURNEY-BUILDER-UI-STYLE-GUIDE.md");
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
// Load documentation SPECIFIC to thank you management
# Use Ref MCP to search for:
# - "React Hook Form validation patterns"
# - "Next.js file upload handling"
# - "Tailwind responsive card layouts"
# - "React drag-drop lists"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "Thank you management requires: guest gift tracking, thank you card template selection, progress tracking by couple, photo attachment for cards, address management from guest list, mailing tracking, and reminder system for overdue thank yous.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI components needed: GiftTracker (guest list + gift received), ThankYouCardDesigner (template selection + customization), ProgressDashboard (sent/pending status), PhotoUploader (card photos), AddressManager (mailing addresses), ReminderSystem (overdue notifications).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding context considerations: Couples are exhausted post-wedding but need to send thank yous within 3 months, gifts come from various events (engagement, shower, wedding), some gifts are duplicates requiring tracking, addresses may have changed since invitation sending.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Drag-drop interface for gift-to-guest matching, bulk actions for template selection, photo proof of sent cards, integration with guest list data, mobile-friendly for on-the-go updates, progress visualization to motivate completion.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down UI workflow, track component dependencies
2. **react-ui-specialist** - Build components with Untitled UI patterns  
3. **security-compliance-officer** - Ensure secure file uploads and data handling
4. **code-quality-guardian** - Maintain consistency with existing UI patterns
5. **test-automation-architect** - Comprehensive UI testing with Playwright
6. **documentation-chronicler** - Evidence-based UI documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **File upload validation** - Images only, size limits, virus scanning
- [ ] **Input sanitization** - All form inputs validated with Zod
- [ ] **XSS prevention** - No dangerouslySetInnerHTML, sanitize user content
- [ ] **Image processing security** - Validate image files, prevent malicious uploads
- [ ] **Guest data privacy** - Secure handling of addresses and gift information

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboards, pages, and components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to main dashboard
- [ ] Mobile navigation support verified  
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated for thank you management section
- [ ] Accessibility labels for navigation items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance
- Component performance <200ms

## 📋 TECHNICAL SPECIFICATION

### Core UI Components to Build:

1. **ThankYouDashboard** - Main overview with progress tracking
2. **GiftTracker** - List of guests with gift received status
3. **ThankYouCardCreator** - Template selection and customization
4. **ProgressVisualization** - Charts showing completion status
5. **AddressManager** - Guest address verification and updates
6. **ReminderCenter** - Overdue thank you notifications

### Key Features:
- Drag-drop gift-to-guest matching
- Bulk selection for batch operations
- Photo upload for card proof
- Progress tracking with gamification elements
- Mobile-responsive design for bride/groom coordination
- Integration with existing guest list data

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Core thank you management UI components built with Untitled UI
- [ ] Responsive design tested at all breakpoints
- [ ] Navigation integration complete in dashboard
- [ ] Form validation implemented with proper error handling
- [ ] Image upload component with security validation
- [ ] Progress tracking visualization components
- [ ] Unit tests for all UI components
- [ ] Evidence package with screenshots

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/thank-you/
- Types: $WS_ROOT/wedsync/src/types/thank-you.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/thank-you/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All UI tests passing with Playwright
- [ ] Security requirements implemented
- [ ] Navigation integration complete
- [ ] Responsive design validated
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**