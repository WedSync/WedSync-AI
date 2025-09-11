# TEAM A - ROUND 1: WS-311 - Communications Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive React UI components for unified communications hub with TypeScript
**FEATURE ID:** WS-311 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding vendor communication workflows and multi-channel messaging UX

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/communications/
cat $WS_ROOT/wedsync/src/components/communications/CommunicationsHub.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test communications
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

// Query existing communication patterns
await mcp__serena__search_for_pattern("email|message|communication|template");
await mcp__serena__find_symbol("EmailTemplate", "", true);
await mcp__serena__get_symbols_overview("src/components/email");
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

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load communication system documentation
ref_search_documentation("React email components templates messaging multi-channel communication");
ref_search_documentation("SMS WhatsApp integration UI patterns message history");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex communication workflow analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "This communications hub needs to handle email templates, SMS, WhatsApp, calendar scheduling, and message history. Need to analyze: UI layout for multi-channel switching, message composition workflow, template management interface, contact selection patterns...",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down communication UI components and dependencies
2. **react-ui-specialist** - Build accessible, performant communication components  
3. **security-compliance-officer** - Ensure message security and privacy requirements
4. **code-quality-guardian** - Maintain code standards for communication features
5. **test-automation-architect** - Comprehensive testing for message flows
6. **documentation-chronicler** - Evidence-based documentation for communication features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COMMUNICATIONS SECURITY CHECKLIST:
- [ ] **Message encryption** - All communications encrypted in transit and at rest
- [ ] **Contact validation** - Validate all phone numbers and email addresses
- [ ] **Rate limiting applied** - Prevent spam and abuse of communication channels
- [ ] **Template sanitization** - HTML encode all template content and user inputs
- [ ] **Audit logging** - Log all message sending with user context and timestamps
- [ ] **Permission validation** - Verify user has permission to contact specific clients
- [ ] **Data retention policies** - Implement message retention and deletion rules
- [ ] **GDPR compliance** - Message consent tracking and data export capabilities

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All communication components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link added to communications section
- [ ] Mobile navigation support verified with bottom navigation
- [ ] Navigation states (active/current) implemented for communication hub
- [ ] Breadcrumbs updated for communication sub-sections
- [ ] Accessibility labels for navigation items and communication channels

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript (strict mode)
- Responsive UI (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components only
- Form validation and error handling for message composition
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms rendering time
- Real-time message status updates
- Multi-channel switching interface (email/SMS/WhatsApp)

## 📋 TECHNICAL SPECIFICATION

**Based on:** WS-311-communications-section-overview-technical.md

**Core Requirements:**
- Unified communications hub interface
- Email template management with WYSIWYG editor
- SMS and WhatsApp integration panels
- Calendar scheduling interface for meetings
- Complete message history with search and filtering
- Multi-channel message composition workflow
- Contact management and group messaging
- Template library with wedding-specific templates

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY COMPONENTS TO BUILD:
- [ ] **CommunicationsHub.tsx** - Main dashboard component
- [ ] **MessageComposer.tsx** - Universal message composition interface
- [ ] **ChannelSwitcher.tsx** - Email/SMS/WhatsApp channel selection
- [ ] **TemplateManager.tsx** - Email template management interface
- [ ] **MessageHistory.tsx** - Conversation history with search
- [ ] **ContactSelector.tsx** - Client/group contact selection
- [ ] **SchedulingPanel.tsx** - Calendar integration for appointments

### ADVANCED FEATURES:
- [ ] Real-time message status indicators
- [ ] Drag-and-drop template builder interface
- [ ] Bulk message sending with progress tracking
- [ ] Message analytics and engagement tracking
- [ ] Automated message scheduling interface

### WEDDING-SPECIFIC FEATURES:
- [ ] Wedding milestone-based template suggestions
- [ ] Vendor-to-vendor communication workflows
- [ ] Guest list integration for group messaging
- [ ] Wedding day emergency communication panel

## 💾 WHERE TO SAVE YOUR WORK
- **Components:** $WS_ROOT/wedsync/src/components/communications/
- **Hooks:** $WS_ROOT/wedsync/src/hooks/communications/
- **Types:** $WS_ROOT/wedsync/src/types/communications.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/components/communications/
- **Styles:** Integrated with Tailwind classes (no separate CSS files)

## 🏁 COMPLETION CHECKLIST
- [ ] All 7 primary components created and functional
- [ ] TypeScript compilation successful with no errors
- [ ] All component tests passing (>90% coverage)
- [ ] Security requirements implemented (message encryption, validation)
- [ ] Navigation integration complete with breadcrumbs
- [ ] Responsive design tested on all breakpoints
- [ ] Accessibility compliance verified (screen readers, keyboard navigation)
- [ ] Real-time features functional with WebSocket connections
- [ ] Evidence package prepared with screenshots and demos
- [ ] Senior dev review prompt created with implementation summary

## 🎨 UI/UX REQUIREMENTS

**Communication Hub Layout:**
- Left sidebar: Channel selection (Email, SMS, WhatsApp, Calendar)
- Center panel: Message composition with template selection
- Right sidebar: Contact list with wedding details and communication history
- Bottom panel: Message queue and sending status

**Responsive Behavior:**
- Mobile: Stack channels vertically with swipe navigation
- Tablet: Collapse contact sidebar into modal
- Desktop: Full three-panel layout with optimal spacing

**Wedding Context Integration:**
- Display wedding dates and venue information in contact cards
- Show communication timeline relative to wedding milestones
- Highlight urgent communications within 30 days of wedding
- Provide quick access to wedding day emergency contacts

---

**EXECUTE IMMEDIATELY - Build the unified communications hub that revolutionizes wedding vendor communication!**