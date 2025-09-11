# TEAM A - ROUND 1: WS-281 - Enhanced Sharing Controls
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI for advanced wedding data sharing and privacy controls
**FEATURE ID:** WS-281 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding privacy concerns and granular permission management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/sharing/
cat $WS_ROOT/wedsync/src/components/sharing/SharingControls.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test sharing
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

// Query sharing and permission patterns
await mcp__serena__search_for_pattern("sharing permissions privacy controls access");
await mcp__serena__find_symbol("PermissionModel SharingSettings Privacy", "", true);
await mcp__serena__get_symbols_overview("src/components/permissions/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to sharing controls
# Use Ref MCP to search for:
# - "React permission management UI patterns"
# - "Privacy controls interface design"
# - "Toggle switches accessibility patterns"
# - "Form validation for permission settings"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR SHARING SYSTEM DESIGN

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Enhanced sharing controls need: Granular permission settings for different data types (guest lists, vendor info, photos, budget), role-based access for different user types (bride, groom, parents, wedding party), time-based sharing (pre-wedding vs post-wedding), public link sharing with expiration, vendor-specific data sharing permissions.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI complexity considerations: Permission matrix for multiple data types and user roles, visual hierarchy for different sharing levels, intuitive toggle controls for quick changes, bulk permission management, sharing link generation interface, preview of what others can see.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding privacy scenarios: Surprise elements hidden from groom/bride, vendor access limited to their specific information, family members with read-only access, wedding party with specific permissions, public website sharing vs private coordination data.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Permission matrix component with drag-drop functionality, smart defaults based on user roles, sharing preview modal, bulk action controls, animated feedback for permission changes, mobile-responsive permission management.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track UI component development and permission workflows
2. **react-ui-specialist** - Build complex permission interfaces with Untitled UI
3. **security-compliance-officer** - Ensure privacy controls meet GDPR requirements
4. **code-quality-guardian** - Maintain consistent permission UI patterns
5. **test-automation-architect** - Comprehensive permission testing scenarios
6. **documentation-chronicler** - Privacy control documentation with examples

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link in settings section
- [ ] Mobile navigation support for sharing controls
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs for sharing management section
- [ ] Accessibility labels for all navigation items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**Core UI Components to Build:**

1. **SharingControlsDashboard** - Main privacy management interface
2. **PermissionMatrix** - Grid showing data types vs user roles
3. **ShareableLinksManager** - Generate and manage public links
4. **PrivacyPreview** - Show what others can see based on permissions
5. **BulkPermissionEditor** - Batch permission changes
6. **SharingAuditLog** - History of permission changes

### Key Features:
- Drag-drop permission assignment
- Smart permission suggestions
- Real-time permission preview
- Bulk permission operations
- Visual permission hierarchy
- Mobile-responsive design

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Core sharing control components built with Untitled UI
- [ ] Permission matrix interface with intuitive controls
- [ ] Shareable link generation and management UI
- [ ] Privacy preview functionality
- [ ] Responsive design tested at all breakpoints
- [ ] Navigation integration complete
- [ ] Form validation for all permission settings
- [ ] Unit tests for all UI components
- [ ] Evidence package with permission workflow screenshots

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/sharing/
- Types: $WS_ROOT/wedsync/src/types/sharing.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/sharing/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All UI tests passing with Playwright
- [ ] Security requirements for privacy controls implemented
- [ ] Navigation integration complete
- [ ] Responsive design validated
- [ ] Permission workflows intuitive and accessible
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all privacy UI requirements!**