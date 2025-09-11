# TEAM A - ROUND 1: WS-178 - Backup Procedures Automation
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create automated backup dashboard and monitoring interfaces for WedSync platform administrators
**FEATURE ID:** WS-178 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about backup system user experience and critical failure scenarios

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/backup/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/backup/BackupDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/admin/backup/
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query backup and admin-related patterns
await mcp__serena__search_for_pattern("admin.*dashboard");
await mcp__serena__find_symbol("AdminDashboard", "", true);
await mcp__serena__get_symbols_overview("src/components/admin/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
// General SaaS UI (This feature):
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
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
// Load documentation SPECIFIC to this feature
# Use Ref MCP to search for relevant documentation
await mcp__Ref__ref_search_documentation("React admin dashboard components backup monitoring");
await mcp__Ref__ref_search_documentation("Next.js admin interfaces with real-time status");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This backup dashboard needs to handle critical infrastructure monitoring. I need to analyze: 1) Real-time backup status display 2) Historical backup success/failure trends 3) Storage usage monitoring 4) Alert management for failed backups 5) Admin action triggers for manual backups. The UI must be instantly readable during crisis situations.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down UI components, track dependencies
2. **react-ui-specialist** - Use Serena for React component consistency  
3. **security-compliance-officer** - Ensure admin access security
4. **code-quality-guardian** - Maintain React/TypeScript standards
5. **test-automation-architect** - Comprehensive component testing
6. **documentation-chronicler** - Evidence-based UI documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ADMIN INTERFACE SECURITY CHECKLIST:
- [ ] **Admin authentication required** - Verify admin role before rendering
- [ ] **Audit logging for all actions** - Log backup dashboard views and actions
- [ ] **Sensitive data masking** - Hide internal paths and credentials in UI
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Rate limiting on actions** - Prevent backup spam through UI
- [ ] **Error messages sanitized** - Never leak system errors to UI
- [ ] **Component input validation** - Validate all admin form inputs
- [ ] **Session timeout handling** - Redirect on expired admin sessions

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone dashboard without navigation integration**
**✅ MANDATORY: Backup dashboard must connect to admin navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Admin navigation link added for "System Backups"
- [ ] Mobile admin navigation support verified  
- [ ] Navigation active state for backup section
- [ ] Breadcrumbs: Admin → System → Backups
- [ ] Accessibility labels for backup navigation

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**YOUR CORE RESPONSIBILITIES:**
- React components with TypeScript interfaces
- Responsive admin UI (1920px desktop, 768px tablet)
- Untitled UI + Magic UI components exclusively
- Form validation and error state handling
- Accessibility compliance (WCAG 2.1 AA)
- Component performance optimization <200ms

### SPECIFIC DELIVERABLES FOR WS-178:

#### 1. BackupDashboard.tsx - Main admin interface
- Real-time backup status cards with color coding
- Backup history timeline with success/failure indicators
- Storage usage charts and trend analysis
- Quick action buttons for manual backup triggers

#### 2. BackupStatusCard.tsx - Individual backup monitoring
- Last backup timestamp with relative time display
- Success/failure status with appropriate icons
- Progress indicators for running backups
- Storage size and compression ratio display

#### 3. BackupHistoryTable.tsx - Detailed backup log display
- Sortable table with pagination for backup history
- Filterable by date range and backup type
- Expandable rows for detailed backup information
- Export functionality for backup reports

#### 4. BackupConfigPanel.tsx - Admin configuration interface
- Schedule configuration with cron expression builder
- Retention policy settings with storage estimates
- Notification preferences for backup events
- Test backup functionality with progress feedback

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-178 technical specification:
- **Database Schema**: backup_jobs table for real-time status display
- **Backup Types**: Full, incremental, differential with appropriate UI indicators
- **Status Tracking**: Running, completed, failed states with visual feedback
- **Storage Monitoring**: File size display with human-readable formatting

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/components/admin/backup/BackupDashboard.tsx` - Main dashboard
- [ ] `/src/components/admin/backup/BackupStatusCard.tsx` - Status display
- [ ] `/src/components/admin/backup/BackupHistoryTable.tsx` - History view
- [ ] `/src/components/admin/backup/BackupConfigPanel.tsx` - Configuration
- [ ] `/src/components/admin/backup/index.ts` - Component exports
- [ ] `/__tests__/components/admin/backup/` - Test files for all components

### MUST IMPLEMENT:
- [ ] Real-time status updates using Supabase subscriptions
- [ ] Responsive design working on desktop and tablet
- [ ] Error boundaries for backup dashboard failures
- [ ] Loading states for all async operations
- [ ] Accessibility support with proper ARIA labels

## 💾 WHERE TO SAVE YOUR WORK

- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/backup/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/components/admin/backup/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/backup.ts`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST

- [ ] Files created and verified to exist (run ls commands above)
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All tests passing (npm test backup/)
- [ ] Security requirements implemented (admin auth, audit logging)
- [ ] Navigation integration complete (admin nav links)
- [ ] Untitled UI + Magic UI components used exclusively
- [ ] Real-time updates working via Supabase subscriptions
- [ ] Responsive design tested on multiple screen sizes
- [ ] Error boundaries and loading states implemented
- [ ] Evidence package prepared for senior dev review

### INTEGRATION WITH OTHER TEAMS:
- **Team B**: Will provide backup status API endpoints you'll consume
- **Team C**: Will handle external storage integrations you'll display
- **Team D**: Will ensure mobile performance optimization
- **Team E**: Will test your components and provide QA feedback

**WEDDING CONTEXT REMINDER:** This backup system protects precious wedding data - photos, guest lists, vendor information. Design the UI with the urgency and clarity needed during critical backup failures that could impact couples' special day coordination.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**