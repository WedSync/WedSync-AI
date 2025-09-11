# TEAM A — BATCH 27 — ROUND 1 — WS-191 - Backup Procedures - Database Backup Infrastructure

**Date:** 2025-08-26  
**Feature ID:** WS-191 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build automated backup orchestrator and point-in-time recovery system for wedding data protection  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync database administrator responsible for protecting wedding vendor and couple data
**I want to:** Implement automated backup procedures with multiple recovery points and disaster recovery capabilities
**So that:** I can protect critical wedding data from loss, ensure business continuity during peak wedding seasons, and meet data recovery SLAs that prevent couples from losing their wedding planning progress or vendors from losing client information

**Real Wedding Problem This Solves:**
A database corruption occurs during peak wedding season (June) affecting 2,000+ active wedding timelines just weeks before ceremonies. With proper backup procedures, WedSync automatically maintained point-in-time backups every hour, full daily backups for 30 days, and weekly archives for 12 months. The system can restore to any point within the last 30 days, minimizing data loss to under 1 hour, ensuring couples don't lose their vendor communications, timeline updates, or payment records during this critical period.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Automated backup orchestration system
- Point-in-time recovery capabilities
- Multiple backup retention policies (hourly, daily, weekly)
- Disaster recovery procedures
- Backup monitoring and alerting
- Cross-region backup replication

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Backup: Supabase built-in backup + custom orchestration

**Integration Points:**
- Supabase automatic backups: Enhanced with custom point-in-time
- Monitoring system: Alert integration for backup failures
- Admin dashboard: Backup status and recovery tools
- Database: Backup metadata and recovery logs

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__Ref__ref_resolve_library_id("supabase");
await mcp__Ref__ref_get_library_docs("/supabase/supabase", "backup-restore disaster-recovery", 5000);
await mcp__Ref__ref_get_library_docs("/vercel/next.js", "api-routes cron-jobs", 3000);
await mcp__Ref__ref_get_library_docs("/node-cron/node-cron", "scheduling automation", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("monitoring", "", true);
await mcp__serena__get_symbols_overview("/src/lib/");
```

**WHY THIS ORDER MATTERS:**
- Ref MCP prevents using deprecated APIs
- Serena shows existing patterns to follow
- Agents work with current knowledge

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "coordinate backup system implementation"
2. **supabase-specialist** --think-hard --use-loaded-docs "backup orchestration and disaster recovery"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "backup APIs and monitoring" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing monitoring patterns and conventions
- Check Supabase backup capabilities
- Review similar system implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed backup orchestration plan
- Write test cases FIRST (TDD)
- Plan disaster recovery procedures
- Consider peak wedding season requirements
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Ref MCP examples as templates
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

### Round 1 (Core Implementation):
- [ ] Backup orchestration system (`/src/lib/backup/backup-orchestrator.ts`)
- [ ] Point-in-time recovery utilities (`/src/lib/backup/recovery-manager.ts`)
- [ ] Backup scheduling service (`/src/lib/services/backup-scheduler.ts`)
- [ ] Database migration for backup metadata tracking
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for backup monitoring

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Admin API endpoints for backup management
- FROM Team C: Monitoring integration for backup alerts

### What other teams NEED from you:
- TO Team B: Backup orchestrator interface and recovery methods
- TO Team D: Backup status data for admin dashboard
- TO Team E: Test coverage patterns for backup system validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY backup-related API route MUST use the security framework:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { backupSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  backupSchema,
  async (request: NextRequest, validatedData) => {
    // Backup operations with validated data
  }
);
```

### SECURITY CHECKLIST FOR BACKUP SYSTEM

- [ ] **Authentication Check**: Admin-only access to backup operations
- [ ] **Input Validation**: MANDATORY Zod schemas for all backup parameters
- [ ] **Audit Logging**: Log all backup/restore operations with user tracking
- [ ] **Encryption**: All backup data encrypted at rest and in transit
- [ ] **Access Control**: Role-based backup operation permissions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// REVOLUTIONARY BACKUP SYSTEM TESTING

// 1. BACKUP ORCHESTRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/backup"});
const backupStructure = await mcp__playwright__browser_snapshot();

// 2. DISASTER RECOVERY SIMULATION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate backup scheduling and monitoring
    return {
      scheduledBackups: window.backupOrchestrator?.getSchedule(),
      backupHistory: window.backupOrchestrator?.getHistory(),
      recoveryPoints: window.backupOrchestrator?.getRecoveryPoints()
    };
  }`
});

// 3. BACKUP MONITORING VALIDATION
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkRequests = await mcp__playwright__browser_network_requests();
```

**REQUIRED TEST COVERAGE:**
- [ ] Backup scheduling automation verification
- [ ] Recovery point creation testing
- [ ] Disaster recovery procedure validation
- [ ] Zero console errors in backup operations
- [ ] Network success for all backup APIs


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating backup flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration points working
- [ ] Backup performance targets met (<30s for routine backups)
- [ ] Recovery time objectives under 15 minutes
- [ ] Security requirements met
- [ ] Works on all admin interfaces

### Evidence Package Required:
- [ ] Screenshot proof of backup orchestration working
- [ ] Playwright test results
- [ ] Backup performance metrics
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/lib/backup/`
- Services: `/wedsync/src/lib/services/backup-scheduler.ts`
- Tests: `/wedsync/tests/backup/`
- Types: `/wedsync/src/types/backup.ts`
- Migrations: `/wedsync/supabase/migrations/`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-191.md`
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch27/WS-191-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-191) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-191 | ROUND_1_COMPLETE | team-a | batch27" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - coordinate dependencies
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY