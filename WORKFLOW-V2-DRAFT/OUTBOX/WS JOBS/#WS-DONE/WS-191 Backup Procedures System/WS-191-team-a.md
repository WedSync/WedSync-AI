# TEAM A - ROUND 1: WS-191 - Backup Procedures System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create comprehensive backup dashboard UI with real-time monitoring, manual backup controls, and recovery point visualization
**FEATURE ID:** WS-191 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding data protection UX and real-time status visualization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/admin/BackupDashboard.tsx
ls -la $WS_ROOT/wedsync/src/components/admin/backup/
cat $WS_ROOT/wedsync/src/components/admin/BackupDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test backup-dashboard
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

// Query existing admin dashboard patterns
await mcp__serena__search_for_pattern("admin dashboard monitoring status");
await mcp__serena__find_symbol("AdminDashboard Dashboard Status", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/admin/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for admin features
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
# Use Ref MCP to search for:
# - "Untitled UI dashboard components charts"
# - "Magic UI progress indicators status"
# - "React real-time-updates status-monitoring"
# - "Tailwind CSS admin-dashboard layouts"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Dashboard Architecture
```typescript
// Complex dashboard planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Backup dashboard needs: real-time backup status monitoring, manual backup trigger controls, recovery point timeline visualization, storage usage charts, backup health indicators, and integration with admin navigation. Wedding data protection is critical - couples lose years of planning if backups fail.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI complexity analysis: Dashboard shows multiple data streams simultaneously (backup progress, storage metrics, recovery points), needs real-time updates without overwhelming admin users, must handle both scheduled and manual backup flows, requires clear visual hierarchy for critical vs informational data.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding context considerations: Backup failures during peak wedding season (May-October) could affect thousands of couples. Admin needs quick access to backup status, ability to trigger emergency backups before system maintenance, and clear visualization of data protection status. Mobile access needed for emergency response.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use existing admin layout patterns from Serena analysis, implement WebSocket connections for real-time updates, create modular components (StatusCard, ProgressBar, TimelineViz), ensure accessibility for 24/7 monitoring, add error boundaries for graceful failure handling.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down dashboard components, track UI dependencies
2. **react-ui-specialist** - Build Untitled UI components with real-time updates  
3. **security-compliance-officer** - Ensure admin access controls and data protection
4. **code-quality-guardian** - Maintain component consistency and performance
5. **test-automation-architect** - Comprehensive UI testing with Playwright
6. **documentation-chronicler** - Admin user guides and component documentation

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone backup dashboard without navigation integration**
**✅ MANDATORY: Dashboard must connect to admin navigation system**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] **Admin Dashboard Navigation**: Update `$WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx`
```typescript
{
  title: "System Backups",
  href: "/admin/backups", 
  icon: HardDriveIcon
}
```
- [ ] **Mobile Admin Navigation**: Ensure dashboard works in mobile admin interface
- [ ] **Navigation States**: Implement active/current state for backup section
- [ ] **Breadcrumbs**: Update admin breadcrumbs to include "System > Backups"
- [ ] **Accessibility**: ARIA labels for backup dashboard navigation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ADMIN ACCESS CONTROL CHECKLIST:
- [ ] **Role-based access** - Only super admin and system admin roles can access backup dashboard
- [ ] **Session validation** - Verify admin session on every dashboard load
- [ ] **Audit logging** - Log all backup dashboard access and manual backup triggers
- [ ] **Data protection** - Never display sensitive backup credentials or internal paths
- [ ] **Input validation** - Validate all backup trigger parameters with Zod

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript interfaces
- Responsive design (375px mobile, 768px tablet, 1920px desktop)
- Real-time status updates via WebSocket or polling
- Untitled UI + Magic UI components exclusively
- Form validation and comprehensive error handling
- WCAG 2.1 AA accessibility compliance
- Component performance optimization (<200ms render time)

## 📋 TECHNICAL SPECIFICATION ANALYSIS

Based on WS-191 specification:

### Required Dashboard Components:
1. **BackupDashboard** (Main container)
   - Real-time backup status monitoring
   - Manual backup trigger interface
   - Storage usage visualization

2. **BackupStatusCard** 
   - Current backup operation progress
   - Last backup completion status
   - Next scheduled backup timing

3. **RecoveryPointTimeline**
   - Visual timeline of available recovery points
   - Point-in-time recovery selection interface
   - Recovery point health indicators

4. **BackupHistoryTable**
   - Recent backup operations log
   - Backup success/failure details
   - Storage location verification status

5. **ManualBackupForm**
   - Component selection (database, files, configs)
   - Priority level selection
   - Backup reason input and validation

### Real-time Data Integration:
```typescript
interface BackupDashboardProps {
  recentBackups: BackupOperation[];
  nextScheduledBackup: Date;
  recoveryObjectives: RecoveryObjectives;
  currentBackupStatus?: BackupProgress;
}

interface BackupOperation {
  id: string;
  backup_id: string;
  backup_type: 'full' | 'incremental' | 'archive' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  size_bytes?: number;
  components_backed_up: string[];
  integrity_verified: boolean;
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Components (MUST CREATE):
- [ ] `BackupDashboard.tsx` - Main dashboard container with navigation integration
- [ ] `BackupStatusCard.tsx` - Real-time status monitoring component
- [ ] `RecoveryPointTimeline.tsx` - Interactive recovery point visualization
- [ ] `ManualBackupForm.tsx` - Manual backup trigger with validation
- [ ] `BackupHistoryTable.tsx` - Recent operations display with filtering

### UI Features (MUST IMPLEMENT):
- [ ] Real-time status updates without page refresh
- [ ] Progress indicators for ongoing backup operations
- [ ] Error state handling with user-friendly messages
- [ ] Loading states for all asynchronous operations
- [ ] Mobile-responsive layout for emergency access
- [ ] Dark mode compatibility for 24/7 monitoring

### Integration Requirements:
- [ ] Connect to backup API endpoints (Team B will provide)
- [ ] Integrate with admin role verification
- [ ] Add to admin dashboard navigation structure
- [ ] Implement WebSocket/polling for real-time updates

## 💾 WHERE TO SAVE YOUR WORK
- **Components**: `$WS_ROOT/wedsync/src/components/admin/backup/`
- **Main Dashboard**: `$WS_ROOT/wedsync/src/components/admin/BackupDashboard.tsx`
- **Page Route**: `$WS_ROOT/wedsync/src/app/admin/backups/page.tsx`
- **Types**: `$WS_ROOT/wedsync/src/types/backup.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/components/admin/backup/`

## 🏁 COMPLETION CHECKLIST

### Technical Implementation:
- [ ] All backup dashboard components created and functional
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All component tests passing with >80% coverage
- [ ] Real-time updates working via polling or WebSocket
- [ ] Mobile responsiveness verified at all breakpoints
- [ ] Admin navigation integration complete

### Security & Access Control:
- [ ] Admin role verification implemented
- [ ] Session validation on dashboard access
- [ ] No sensitive data exposed in UI
- [ ] Audit logging for manual backup triggers

### UI/UX Requirements:
- [ ] Untitled UI components used exclusively
- [ ] Magic UI animations for status transitions
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Error boundaries and graceful failure handling
- [ ] Performance optimization (<200ms component render)

### Evidence Package:
- [ ] Screenshots of dashboard at all breakpoints
- [ ] Test coverage report showing >80% coverage
- [ ] Performance metrics for component rendering
- [ ] Navigation integration demonstration
- [ ] Real-time update functionality proof

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt targeting wedding data protection with enterprise-grade backup monitoring interface!**