# 📝 TEAM PROMPT TEMPLATES - 5 TEAMS
## Reusable Templates for Daily Development with Serena-Enhanced Depth

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: 80% of Round 1 implementations were hallucinated or broken!**

### BEFORE CLAIMING ANY COMPLETION:

1. **VERIFY FILES EXIST:**
```bash
# List your created files to prove they exist
ls -la $WS_ROOT/wedsync/src/components/your-feature
# Show file contents
cat $WS_ROOT/wedsync/src/components/main-file.tsx | head -20
```

2. **RUN TYPECHECK:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **RUN TESTS:**
```bash
npm test your-feature
# MUST show: "All tests passing"
```

4. **NO HALLUCINATED PATHS:**
- ❌ DO NOT claim files exist without creating them
- ❌ DO NOT write reports about non-existent code
- ❌ DO NOT confuse planning with implementation

5. **EVIDENCE IN COMPLETION REPORT:**
- Include `ls` output showing files exist
- Include typecheck results
- Include test run output
- Include actual code snippets from real files

**Teams that submit hallucinated work will be rejected immediately!**

---

## 🧭 CRITICAL: NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR ALL UI FEATURES)

**🚨 PROJECT ORCHESTRATOR DIRECTIVE: Prevent Orphaned Features!**

### EVERY UI FEATURE MUST INTEGRATE INTO PARENT NAVIGATION

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboards, pages, and components must connect to parent navigation**

#### NAVIGATION INTEGRATION CHECKLIST

1. **Dashboard Features (Admin/Analytics):**
```typescript
// MUST update main dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
// Add navigation item following existing pattern:
{
  title: "Your Feature Name",
  href: "/dashboard/your-feature",
  icon: LucideIconName
}
```

2. **Client-Specific Features:**
```typescript
// MUST integrate into client detail navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/clients/[id]/layout.tsx
// Add tab or section following pattern:
{
  label: "Your Feature",
  href: `/clients/${id}/your-feature`,
  current: pathname.includes('/your-feature')
}
```

3. **Settings/Management Features:**
```typescript
// MUST integrate into settings navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/team/page.tsx or similar
// Add settings section following existing pattern
```

4. **Mobile Navigation:**
```typescript
// MUST add mobile navigation support
// Ensure feature works in mobile drawer navigation
// Test on mobile viewports (375px width minimum)
```

#### COMPLETION CRITERIA: NAVIGATION INTEGRATION

**⚠️ FEATURE IS NOT COMPLETE UNTIL NAVIGATION IS INTEGRATED**

- [ ] Desktop navigation link added
- [ ] Mobile navigation support verified
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated if applicable
- [ ] Accessibility labels for navigation items
- [ ] Navigation integration tested with Browser MCP

**EVIDENCE REQUIRED:**
```typescript
// Show navigation integration code:
// 1. Navigation component updates
// 2. Route definitions
// 3. Screenshots showing navigation in context
// 4. Mobile navigation testing results
```

**CONSEQUENCES OF VIOLATION:**
- Feature will be marked as INCOMPLETE
- Code review will be REJECTED
- No deployment until navigation integration complete

---

## 🔒 CRITICAL: SECURITY REQUIREMENTS (MANDATORY FOR ALL API ROUTES)

**⚠️ SECURITY AUDIT REVEALED: 305+ API routes with ZERO validation! This stops NOW!**

### EVERY API ROUTE MUST HAVE:

1. **INPUT VALIDATION WITH ZOD:**
```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('table').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { yourSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

export const POST = withSecureValidation(
  yourSchema,
  async (request, validatedData) => {
    // validatedData is now type-safe and validated
    const { data } = await supabase.from('table').insert(validatedData);
    return NextResponse.json(data);
  }
);
```

2. **AUTHENTICATION ON PROTECTED ROUTES:**
```typescript
// MANDATORY for all protected routes:
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

3. **RATE LIMITING:**
```typescript
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';

const result = await rateLimitService.checkRateLimit(request);
if (!result.allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

4. **SQL INJECTION PREVENTION:**
- NEVER concatenate SQL strings
- ALWAYS use parameterized queries
- ALWAYS validate with Zod first

5. **XSS PREVENTION:**
- NEVER render user input without sanitization
- Use secureStringSchema from validation/schemas
- HTML encode all output

### REQUIRED IMPORTS FOR EVERY API ROUTE:
```typescript
import { withSecureValidation, withValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
```

### SECURITY CHECKLIST FOR EVERY ROUTE:
- [ ] Input validation with Zod schema
- [ ] Authentication check if protected
- [ ] Rate limiting applied
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection (automatic with Next.js)
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging for critical operations

**CONSEQUENCES OF VIOLATION:**
- Code will be REJECTED immediately
- Security audit will flag your feature
- Production deployment will be BLOCKED
- You will rewrite everything with proper security

---

## 🚨 CRITICAL: UI TECHNOLOGY STACK (MANDATORY FOR ALL TEAMS)

**ALL UI MUST USE:**
- **Untitled UI**: Primary component library for ALL components
- **Magic UI**: For ALL animations and visual effects
- **Tailwind CSS 4.1.11**: Utility classes only
- **Lucide React**: Icons ONLY (no other icon libraries)

**UI STYLE GUIDES:**
- **General SaaS Features**: Use `$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md`
- **Journey Builder ONLY**: Use `$WS_ROOT/WORKFLOW-V2-DRAFT/JOURNEY-BUILDER-UI-STYLE-GUIDE.md`
- **Form Builder**: Uses general SaaS guide with slight modifications

**ABSOLUTELY FORBIDDEN:**
- ❌ **Radix UI** - DO NOT USE
- ❌ **shadcn/ui** - DO NOT USE
- ❌ **Catalyst UI** - DO NOT USE
- ❌ **Headless UI** - DO NOT USE
- ❌ **Material UI** - DO NOT USE
- ❌ **Ant Design** - DO NOT USE
- ❌ **Any other component library** - ONLY Untitled UI + Magic UI

**CONSEQUENCES OF VIOLATION:**
Using forbidden libraries will result in immediate code rejection and require complete rewrite.

---

## 🚫 PAYMENTS SCOPE - SUPPLIER SUBSCRIPTION BILLING CARVE-OUT

**✅ ALLOWED SAAS FEATURES - SUPPLIER SUBSCRIPTION BILLING ONLY:**
```markdown
✅ Supplier Billing/Subscription - Stripe integration for SaaS subscriptions
✅ Supplier Account Management - Upgrade/downgrade plans, payment methods
✅ Usage Tracking - Monitor supplier's usage for billing tiers
✅ Invoice Management - SaaS subscription invoices for suppliers
✅ Payment Settings - Supplier's payment methods for their subscription
✅ Billing Portal - Supplier's subscription management dashboard
```

**❌ FORBIDDEN PAYMENT FEATURES:**
- Client payment processing (couples paying suppliers)
- Wedding service invoicing
- Guest payment collection
- Deposit handling for wedding services
- Payment gateways for client transactions

**CRITICAL:** Only build payment features for suppliers paying for SaaS subscriptions, NEVER for clients paying for wedding services.

---

## 🎯 UNIVERSAL PROMPT STRUCTURE

Every prompt follows this exact enhanced structure:

```markdown
# TEAM [A-E] - ROUND [1-3]: WS-XXX - [Feature Name]
## [DATE] - [Round Time]

**YOUR MISSION:** [Specific deliverable]
**FEATURE ID:** WS-XXX (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about [specific challenge]

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/your-created-files
cat $WS_ROOT/wedsync/src/main-component.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test your-feature
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

// Query specific areas relevant to THIS feature
await mcp__serena__search_for_pattern("[feature-related-pattern]");
await mcp__serena__find_symbol("[related-component-name]", "", true);
await mcp__serena__get_symbols_overview("[relevant-file-path]");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide based on feature type
// General SaaS UI (Most features):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Journey Builder UI (ONLY for Journey/Workflow features):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/JOURNEY-BUILDER-UI-STYLE-GUIDE.md");

// Form Builder has slightly different UI but uses same base components
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries
- These are explicitly forbidden - use ONLY Untitled UI + Magic UI

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
# Use Ref MCP to search for:
# - "Next.js [specific-topic-from-spec]"
# - "Supabase [specific-topic-from-spec]"
# - "Tailwind CSS [specific-topic]"
# Add 2-3 more based on feature needs
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand how similar features are built
// Find patterns to follow, avoid reinventing the wheel
await mcp__serena__find_referencing_symbols("[pattern-to-follow]");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### When Sub-Agents Should Use Sequential Thinking

Before launching parallel agents, use **Sequential Thinking MCP** when facing:

- **Multi-System Features**: Components that span frontend, backend, database, and third-party integrations
- **Wedding Business Logic**: Complex rules around task delegation, guest management, or vendor coordination
- **Team Dependencies**: Features requiring coordination between multiple teams with shared APIs
- **Architecture Decisions**: Choosing between implementation approaches with long-term implications
- **Performance Constraints**: Features that could impact system performance or user experience

### Sequential Thinking Patterns for Sub-Agents

#### Pattern 1: Feature Complexity Analysis (Use BEFORE agent launch)
```typescript
// Complex feature assessment
mcp__sequential-thinking__sequential_thinking({
  thought: "This feature requires: UI components (Team A), API endpoints (Team B), real-time updates (Team C), database changes (Team B→SQL Expert), and integration with existing systems (Team C). Need to analyze dependencies and potential conflicts before teams start parallel work.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Dependency analysis: UI components need API contracts before development, real-time updates require backend event system, database schema changes affect all teams. Critical path: API design must complete before frontend development can begin.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding context considerations: Task tracking involves helpers (bridesmaids, family, vendors) with different permission levels. Critical tasks (venue confirmation) need photo evidence, non-critical tasks don't. Helper availability changes require task reassignment workflows.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: 1) Design shared TypeScript interfaces first for team alignment, 2) Create API mocks for parallel frontend development, 3) Implement backend with comprehensive validation, 4) Add real-time layer, 5) Integration testing across teams.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down work, track progress, identify blockers
   - **Sequential Thinking Usage**: Complex task breakdown, dependency analysis, risk assessment
   
2. **[technical-specialist]** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Use Serena to find existing patterns, ensure consistency
   - **Sequential Thinking Usage**: Architecture decisions, integration approaches, pattern selection
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Trace data flow, identify vulnerabilities using Serena
   - **Sequential Thinking Usage**: Security threat modeling, vulnerability analysis, compliance requirements
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure code matches existing patterns found by Serena
   - **Sequential Thinking Usage**: Code review decisions, refactoring strategies, technical debt analysis
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write tests BEFORE code, verify with Serena
   - **Sequential Thinking Usage**: Test strategy planning, edge case identification, coverage analysis
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document with actual code snippets and line numbers
   - **Sequential Thinking Usage**: Information architecture, documentation strategy, user journey mapping

**AGENT COORDINATION:** Agents work in parallel but share Serena insights AND Sequential Thinking analysis results

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
Use Serena to understand the codebase BEFORE writing any code:
```typescript
// Find all related components and their relationships
await mcp__serena__find_symbol("[component-name]", "", true);
// Understand existing patterns
await mcp__serena__search_for_pattern("[pattern-type]");
// Analyze integration points
await mcp__serena__find_referencing_symbols("[integration-point]");
```
- [ ] Identified existing patterns to follow
- [ ] Found all integration points
- [ ] Understood security requirements
- [ ] Located similar implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed plan:
- [ ] Architecture decisions based on existing patterns
- [ ] Test cases written FIRST (TDD)
- [ ] Security measures identified from code analysis
- [ ] Performance considerations from similar features

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use patterns discovered by Serena
- [ ] Maintain consistency with existing code
- [ ] Include code examples in comments
- [ ] Test continuously during development

## 📋 TECHNICAL SPECIFICATION
[Path to tech spec from Feature Development with WS-XXX ID]

## 🎯 SPECIFIC DELIVERABLES
[Checklist of deliverables for this round with evidence requirements]

## 🔗 DEPENDENCIES
[What you need from other teams / What others need from you]

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

### REQUIRED SECURITY FILES:
```typescript
// These MUST exist and be used:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { secureStringSchema, emailSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { getServerSession } from 'next-auth';
```

### VALIDATION PATTERN (COPY THIS!):
```typescript
const schema = z.object({
  // Use secure schemas for strings
  name: secureStringSchema.max(100),
  email: emailSchema,
  // Strict enums
  status: z.enum(['active', 'inactive']),
  // Validated numbers
  amount: z.number().min(0).max(1000000),
  // Optional with defaults
  metadata: z.object({}).optional().default({})
});

export const POST = withSecureValidation(schema, handler);
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary accessibility-first testing requirements:

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/[feature]"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB COMPLEX USER FLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tabs({action: "new", url: "/[feature-page-1]"});     // Tab 1
await mcp__playwright__browser_tabs({action: "new", url: "/[feature-page-2]"});     // Tab 2
await mcp__playwright__browser_tabs({action: "select", index: 0});                  // Switch tabs
await mcp__playwright__browser_drag({                                   // Test drag-drop
  startElement: "[source]", startRef: "[ref]",
  endElement: "[target]", endRef: "[ref]"
});
await mcp__playwright__browser_tabs({action: "select", index: 1});                  // Verify sync
await mcp__playwright__browser_wait_for({text: "Updated"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory?.usedJSHeapSize || 0
  })`
});

// 4. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 5. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-[feature].png`});
}
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All deliverables complete WITH EVIDENCE
- [ ] Tests written FIRST and passing (show test-first commits)
- [ ] Serena patterns followed (list patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero console errors (show console screenshot)

### Code Quality Evidence:
```typescript
// Include actual code showing pattern compliance
// Example from your implementation:
export const [functionName] = async () => {
  // Following pattern from existing-file.ts:45-67
  // Serena confirmed this matches 12 other implementations
  [your code here]
}
```

### Integration Evidence:
- [ ] Show how your code connects to existing systems
- [ ] Include Serena analysis of integration points
- [ ] Demonstrate no breaking changes to other components

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const metrics = {
  pageLoad: "0.8s",  // Target: <1s
  apiResponse: "145ms", // Target: <200ms
  bundleIncrease: "12kb", // Acceptable: <50kb
}
```

## 💾 WHERE TO SAVE
[Exact file paths within $WS_ROOT/wedsync/src/]

## ⚠️ CRITICAL WARNINGS
[Things that will break the workflow]

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Code Security Verification:
```bash
# Verify ALL API routes have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/
# Should show validation on EVERY route.ts file

# Check for direct request.json() usage (FORBIDDEN!)
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/ | grep -v "// NO VALIDATION"
# Should return NOTHING (all should be validated)

# Verify authentication checks
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/
# Should be present in ALL protected routes

# Check rate limiting
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/
# Should be applied to public-facing endpoints
```

### Final Security Checklist:
- [ ] NO direct `request.json()` without validation
- [ ] ALL strings use secureStringSchema
- [ ] ALL routes have proper error handling
- [ ] NO sensitive data in error messages
- [ ] Authentication verified on protected routes
- [ ] Rate limiting applied where needed
- [ ] TypeScript compiles with NO errors
- [ ] Tests pass including security tests

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**🚨 CRITICAL: Teams A-E - You MUST update the project dashboard immediately after completing ANY feature!**

### STEP 1: Update Feature Status JSON
**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find your feature (WS-XXX) in the JSON file and update:
```json
{
  "id": "WS-XXX-your-feature-name",
  "status": "completed", // Change from "in-progress" to "completed"
  "completion": "100%", // Update percentage
  "completed_date": "2025-01-25", // Add completion date
  "testing_status": "needs-testing", // Options: "needs-testing", "testing", "passed", "failed"
  "team": "Team A", // Your team: Team A, Team B, Team C, Team D, Team E
  "notes": "Feature completed in Round 1. All tests passing." // Brief update
}
```

### STEP 2: Create Completion Report for Dashboard
**Location**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`
**Filename**: `WS-XXX-[feature-name]-team-[A-E]-round[N]-complete.md`

**Use this template**:
```markdown
# WS-XXX [Feature Name] - Team [A-E] Completion Report

## Summary
- **Feature ID**: WS-XXX  
- **Feature Name**: [Feature Name]
- **Team**: Team [A-E]
- **Round**: Round[N]
- **Completion Date**: 2025-01-25
- **Status**: ✅ Completed
- **Testing Status**: [needs-testing|testing|passed|failed]

## What Was Delivered
- [x] Core functionality implemented
- [x] UI components completed with navigation integration
- [x] API endpoints created with security validation
- [x] Database migrations created (sent to SQL Expert)
- [x] Unit tests written (>80% coverage)
- [x] Integration tests added
- [x] Security requirements implemented

## Files Created/Modified
- **Components**: `$WS_ROOT/wedsync/src/components/[feature]/`
- **API Routes**: `$WS_ROOT/wedsync/src/app/api/[feature]/`
- **Types**: `$WS_ROOT/wedsync/src/types/[feature].ts`
- **Tests**: `$WS_ROOT/wedsync/tests/[feature]/`
- **Migrations**: `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_[feature].sql`

## Evidence Package
- **Screenshots**: [Include UI screenshots]
- **Test Results**: [Include test coverage report]
- **Performance**: [Include load times, API response times]
- **Security Validation**: [Show validation middleware usage]

## Production Readiness
- [ ] Code review needed: [Yes/No]
- [ ] Security audit needed: [Yes/No]
- [ ] Performance optimized: [Yes/No]
- [ ] Ready for production: [Yes/No]

---
**Dashboard Updated**: ✅ All JSON files updated
**Next Phase**: Ready for [testing/review/production]
```

## 📝 CRITICAL: SENIOR DEV REVIEW PROMPT (THIS IS THEIR ACTUAL PROMPT!)

**File:** `$WS_ROOT/WORKFLOW-V2-DRAFT/SESSION-LOGS/[DATE]/team-[X]-round-[N]-senior-dev-prompt.md`

### MANDATORY TEMPLATE:

```markdown
# SENIOR DEV: REVIEW TEAM [X] ROUND [N] - WS-XXX - [Feature Name]

**PRIORITY:** [🔴 CRITICAL | 🟡 STANDARD | 🟢 ROUTINE]
**Feature ID:** WS-XXX (Track with this ID)

## 🎯 FILES TO REVIEW (SERENA-PRIORITIZED)

### Critical Review (Security/Data):
1. `$WS_ROOT/wedsync/src/path/to/[critical-file].ts` - Lines [X-Y] - Check [specific concern]
   - **Serena Found:** [Pattern or issue discovered]
2. `$WS_ROOT/wedsync/src/path/to/[api-file].ts` - Lines [X-Y] - Verify [security measure]
   - **Integration Risk:** [What Serena revealed about dependencies]

### Standard Review:
3. `$WS_ROOT/wedsync/src/path/to/[component].tsx` - [What to check]
4. `$WS_ROOT/wedsync/tests/[feature].test.ts` - Coverage: [X]%

## 🔍 SERENA ANALYSIS RESULTS
```bash
# Code patterns followed:
- Authentication: Matches pattern in auth/middleware.ts:45-67
- Error handling: Consistent with api/handlers/base.ts:23-34
- State management: Follows pattern from components/forms/:89-102

# Potential issues found:
- [ ] Performance concern at line X (similar issue in [file]:Y)
- [ ] Security pattern deviation at line Z (standard is [pattern])
```

## ⚠️ SPECIFIC TECHNICAL DECISIONS NEEDING VALIDATION

1. **[Technical Decision]**
   - Our approach: [What we did]
   - Serena found: [Similar patterns in codebase]
   - Alternative considered: [What we didn't do and why]
   - **Need confirmation:** Is this the right pattern?

## 🗄️ DATABASE MIGRATION HANDOVER (IF APPLICABLE)

**⚠️ CRITICAL: If your feature includes database migrations:**
1. DO NOT apply migrations directly
2. Create migration files in `$WS_ROOT/wedsync/supabase/migrations/`
3. Send to SQL Expert for review and application

**Migration Handover Format:**
```markdown
File: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-XXX.md

# MIGRATION REQUEST - WS-XXX - [Feature Name]
## Team: [Your Team Letter]
## Round: [1/2/3]

### Migration Files Created:
- `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_[description].sql`

### Purpose:
[What this migration does]

### Dependencies:
- Requires tables: [list existing tables needed]
- Creates tables: [list new tables]
- Modifies tables: [list changes]

### Testing Done:
- [ ] Syntax validated
- [ ] Applied locally
- [ ] Rollback tested

### Special Notes:
[Any RLS policies, indexes, or complex constraints]
```

## ✅ EVIDENCE OF COMPLETION

**Test Results:**
```bash
npm run test -- $WS_ROOT/wedsync/tests/[feature].test.ts
✅ Unit tests: 24/24 passing
✅ Integration: 8/8 passing
✅ Coverage: 87%
```

**Playwright Validation:**
```javascript
// Accessibility tree validated
// Multi-tab flow tested
// Performance: LCP=1.2s, FCP=0.8s
```

**Serena Code Quality Metrics:**
- Complexity: Low (Cyclomatic: 4)
- Duplication: None found
- Pattern compliance: 100%

## 🔍 COMMANDS FOR SENIOR DEV TO RUN
```bash
# CRITICAL: Verify files exist (80% of Round 1 didn't!)
ls -la $WS_ROOT/wedsync/src/path/to/claimed/files
# If missing: REJECT immediately as "HALLUCINATED IMPLEMENTATION"

# SECURITY: Verify API routes have validation (MANDATORY!)
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/[feature]/
# If missing: REJECT as "SECURITY VIOLATION - No input validation"

# SECURITY: Check for unvalidated request.json() 
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/[feature]/ | grep -v "validatedData"
# If found: REJECT as "SECURITY VIOLATION - Direct JSON parsing without validation"

# SECURITY: Verify authentication on protected routes
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/[feature]/
# If missing on protected routes: REJECT as "SECURITY VIOLATION - No authentication"

# MANDATORY: TypeScript must compile
npm run typecheck
# If errors: Mark as "NEEDS FIXES - TypeScript errors"

# REQUIRED: Tests must pass
npm test [feature]
# If failing: Mark as "NEEDS FIXES - Tests failing"

# Serena verification of actual implementation
await mcp__serena__find_symbol("ComponentName", "$WS_ROOT/wedsync/src/path/to/file");
# If not found: Team hallucinated the implementation

# Security pattern compliance check
await mcp__serena__search_for_pattern("withSecureValidation");
await mcp__serena__find_symbol("secureStringSchema", "$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
# Verify team used security patterns
```

## 📊 METRICS & IMPACT
- Files modified: [X] 
- New files: [Y]
- Bundle size impact: +[Z]kb
- Performance impact: [Measured values]
- Test coverage change: +[N]%

**Review Focus:** [Specific area needing most attention]
**Time estimate:** [X] minutes for thorough review
```

## 📊 REPORT QUALITY REQUIREMENTS

### MINIMUM REPORT STANDARDS:
- [ ] **Technical depth:** 6-8 paragraphs (substantial, not brief)
- [ ] **Code examples:** At least 3 with file:line references
- [ ] **Serena insights:** Pattern analysis in each major section
- [ ] **Evidence:** Screenshots, test results, metrics
- [ ] **Integration analysis:** How changes affect other components
- [ ] **Senior Dev prompt:** MUST be comprehensive and actionable

### WHAT MAKES A GOOD REPORT:
✅ Shows actual code changes with before/after
✅ Includes Serena-discovered patterns followed
✅ Provides metrics and measurements
✅ Identifies specific risks and concerns
✅ Makes Senior Dev's review efficient and focused
❌ Avoids vague statements like "implemented feature"
❌ Never claims completion without evidence

---

## 📂 TEMPLATE VARIATIONS BY ROUND

### ROUND 1 TEMPLATE: Core Implementation
- Focus: Core feature implementation
- Deliverables: Basic functionality, database schema, tests
- Dependencies: Minimal (mostly independent work)

### ROUND 2 TEMPLATE: Enhancement & Integration  
- Focus: Polish, error handling, team integration
- Deliverables: Enhanced features, integration points, advanced tests
- Dependencies: Higher (requires Round 1 outputs from other teams)

### ROUND 3 TEMPLATE: Finalization & E2E
- Focus: Final integration, E2E testing, production readiness
- Deliverables: Complete feature, full test coverage, documentation
- Dependencies: Maximum (requires all team outputs)

---

## 🎯 TEAM SPECIALIZATION TEMPLATES

### TEAM A TEMPLATE: Frontend/UI Focus
```markdown
## 🧠 SEQUENTIAL THINKING FOR UI DEVELOPMENT

### Frontend-Specific Sequential Thinking Patterns

#### Pattern 1: Complex UI Architecture Analysis
```typescript
// Before building complex UI components
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking UI needs: drag-drop task reordering, real-time status updates, photo evidence modals, helper permission-based editing, and mobile touch optimization. Each component has different interaction patterns and state management needs.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "State management analysis: Task list needs global state for reordering, status updates require optimistic UI with rollback, photo uploads need progress tracking, permission checks affect which actions are available. Consider using Zustand for complex state, React Query for server state.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Component architecture: TaskCard (reusable across views), TaskModal (CRUD operations), PhotoUploader (evidence handling), PermissionGate (conditional rendering). Each needs proper TypeScript interfaces and error boundaries.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding UX considerations: Brides will use this on mobile while coordinating vendors, helpers might access during busy schedules. Need offline capability, touch-friendly interactions, clear visual hierarchy, and graceful loading states.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Frontend Focus)

### A. SERENA UI PATTERN DISCOVERY
```typescript
// Find existing UI patterns to follow
await mcp__serena__search_for_pattern("component button form input");
await mcp__serena__find_symbol("Button Card Form", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/ui/");

// Analyze similar features for consistency
await mcp__serena__find_referencing_symbols("useForm useState useEffect");
```

### B. UI STYLE GUIDES & UNTITLED UI/MAGIC UI SETUP
```typescript
// MANDATORY FIRST - Load correct UI Style Guide
// For general SaaS features:
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
// For Journey Builder features ONLY:
// await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/JOURNEY-BUILDER-UI-STYLE-GUIDE.md");

// Load Untitled UI and Magic UI documentation
# Use Ref MCP to search for:
# - "Untitled UI components patterns"
# - "Magic UI animations effects transitions"

// Then load supporting documentation
# Use Ref MCP to search for:
# - "Next.js app-router components"
# - "Tailwind CSS responsive-design utilities"
# - "React Hook Form validation"
```

**🎨 UI IMPLEMENTATION REQUIREMENTS:**
- **MUST use Untitled UI components** - No custom components unless extending Untitled UI
- **MUST use Magic UI for animations** - No custom animations
- **Form Builder UI**: Slightly different but uses same Untitled UI base
- **Journey Builder UI**: Special color palette and node-based interface

## 🎨 UI IMPLEMENTATION RULES (WITH SERENA VALIDATION)
- [ ] MUST use existing components from $WS_ROOT/wedsync/src/components/ui/ (Serena: find_symbol)
- [ ] MUST follow color system - NO hardcoded hex colors (Serena: verify patterns)
- [ ] MUST test at 375px, 768px, 1920px breakpoints (Playwright: resize & snapshot)
- [ ] MUST maintain 4.5:1 contrast ratios (Playwright: accessibility check)
- [ ] MUST support dark mode (Serena: find existing dark mode patterns)

## 🎯 TYPICAL DELIVERABLES WITH EVIDENCE
- [ ] React components with TypeScript (Show: actual component code)
- [ ] Responsive UI (Evidence: screenshots at each breakpoint)
- [ ] Form validation and error handling (Code: validation schemas)
- [ ] Accessibility compliance (Playwright: accessibility tree)
- [ ] Component loads in <200ms (Metrics: actual load time)
- [ ] Touch targets ≥44x44px on mobile (Playwright: element measurements)
```

### TEAM B TEMPLATE: Backend/API Focus  
```markdown
## 🧠 SEQUENTIAL THINKING FOR API DEVELOPMENT

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: API Security & Validation Strategy
```typescript
// Before implementing API endpoints
mcp__sequential-thinking__sequential_thinking({
  thought: "Task status API endpoints need: POST /api/tasks/[id]/status (update), GET /api/tasks/[id]/history (view changes), POST /api/tasks/[id]/evidence (upload photos). Each handles different data types, permissions, and security requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security analysis: Status updates modify critical wedding data, photo uploads handle user files (security risk), history access reveals sensitive task details. Need authentication on all endpoints, input validation with Zod, file type validation, permission checks based on helper roles.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Validation requirements: Task status must be valid enum, user must own or be assigned to task, photos must be validated file types (<5MB, JPEG/PNG only), rate limiting for photo uploads to prevent abuse. Use secureStringSchema for all text inputs.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation pattern: Use withSecureValidation middleware for all routes, implement helper permission verification, create reusable validation schemas for task data, add comprehensive error handling that doesn't leak sensitive information, include audit logging for critical operations.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA API PATTERN DISCOVERY
```typescript
// Find existing API patterns
await mcp__serena__search_for_pattern("route.ts POST GET handler");
await mcp__serena__find_symbol("route handler middleware", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");

// CRITICAL: Analyze security patterns (MANDATORY!)
await mcp__serena__search_for_pattern("withSecureValidation withValidation");
await mcp__serena__find_symbol("secureStringSchema emailSchema", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
```

### B. BACKEND DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Supabase database-functions rls"
# - "Next.js route-handlers streaming"
# - "Supabase auth-jwt edge-functions"
# - "Zod schema-validation refinements"
```

## 🔒 MANDATORY SECURITY IMPLEMENTATION
```typescript
// EVERY API ROUTE MUST USE THIS PATTERN:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const requestSchema = z.object({
  // Use secure schemas for all string inputs
  name: secureStringSchema.max(100),
  email: z.string().email(),
  // Validate enums strictly
  role: z.enum(['admin', 'user', 'guest']),
  // Validate nested objects
  metadata: z.object({
    tags: z.array(secureStringSchema).max(10)
  }).optional()
});

export const POST = withSecureValidation(
  requestSchema,
  async (request, validatedData) => {
    // Check authentication FIRST
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Apply rate limiting
    const rateLimitResult = await rateLimitService.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    // Now use validated, type-safe data
    const { data, error } = await supabase
      .from('table')
      .insert(validatedData)
      .select();
      
    if (error) {
      // Don't leak database errors to client
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  }
);
```
```

### TEAM C TEMPLATE: Integration Focus
```markdown
## 🧠 SEQUENTIAL THINKING FOR INTEGRATION DEVELOPMENT

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Integration Analysis
```typescript
// Before building system integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time task updates integration requires: Supabase realtime subscriptions for status changes, webhook notifications to external systems, email notifications to helpers, push notifications to mobile apps, and integration with calendar systems for deadline reminders.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Each status update triggers multiple downstream actions, notification preferences vary by user type (couple vs helper vs vendor), external systems have different API formats and rate limits, failure handling must prevent data loss.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Supabase realtime connection drops during critical updates, email service rate limits during high-volume periods, webhook endpoints become unavailable, user notification preferences change mid-process. Need circuit breakers, retry logic, and graceful degradation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Use event-driven pattern with message queues, implement idempotent operations for retry safety, create integration health monitoring, build fallback mechanisms for each external service, maintain integration audit logs for troubleshooting.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Integration Focus)

### A. SERENA INTEGRATION ANALYSIS
```typescript
// Find integration points and patterns
await mcp__serena__find_referencing_symbols("webhook subscription realtime");
await mcp__serena__search_for_pattern("external service third-party API");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");

// Analyze data flow between systems
await mcp__serena__find_symbol("sync transform migrate", "", true);
```

### B. INTEGRATION DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Supabase realtime-subscriptions broadcast"
# - "Stripe webhooks events"
# - "Next.js server-sent-events websocket"
```
```

### TEAM D TEMPLATE: Platform/WedMe Focus
```markdown
## 🧠 SEQUENTIAL THINKING FOR PLATFORM DEVELOPMENT

### Platform-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile-First Platform Strategy
```typescript
// Before building WedMe features
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe platform needs: couples access their wedding info on mobile, supplier coordination through platform, guest management tools, photo sharing capabilities, and offline functionality for areas with poor connectivity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Platform considerations: Mobile-first design essential (couples use phones primarily), PWA capabilities for app-like experience, offline data sync for critical info, responsive design for all device sizes, touch-optimized interactions.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe-specific features: Couple dashboard with wedding timeline, vendor contact directory, guest list management, photo gallery, task tracking, budget overview. Each needs mobile optimization and offline capability.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use PWA best practices, implement service worker for offline, design mobile-first layouts, create touch-friendly interfaces, ensure fast loading on mobile networks, integrate with main platform APIs.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🎯 TYPICAL DELIVERABLES WITH EVIDENCE
- [ ] Mobile-optimized components (Evidence: screenshots on mobile devices)
- [ ] PWA functionality (Show: service worker implementation)
- [ ] Offline capabilities (Test: airplane mode functionality)
- [ ] Platform integrations (Code: API connections to main system)
```

### TEAM E TEMPLATE: QA/Testing & Documentation Focus
```markdown
## 🧠 SEQUENTIAL THINKING FOR QA & DOCUMENTATION

### QA-Specific Sequential Thinking Patterns

#### Pattern 1: Comprehensive Testing Strategy
```typescript
// Before creating test plans
mcp__sequential-thinking__sequential_thinking({
  thought: "Testing requirements: Unit tests for each component/function, integration tests for team interactions, E2E tests for complete user flows, accessibility testing, performance testing, cross-browser compatibility, mobile device testing.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific test scenarios: Task assignment flows, photo upload workflows, permission-based access, real-time updates across multiple users, mobile wedding coordination scenarios, supplier-couple communication paths.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation needs: User guides for couples and suppliers, technical documentation for developers, API documentation, troubleshooting guides, feature change logs, accessibility documentation, mobile app installation guides.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Quality assurance process: Test all team implementations, verify integration points, validate user experience, check accessibility compliance, test performance benchmarks, document bugs and resolutions, create user acceptance criteria.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🧪 COMPREHENSIVE TESTING REQUIREMENTS

### 1. UNIT TESTING
- [ ] Test all functions with >80% coverage
- [ ] Mock external dependencies
- [ ] Test error conditions
- [ ] Validate input/output contracts

### 2. INTEGRATION TESTING
- [ ] Test team A + team B integration points
- [ ] Verify API contracts between systems
- [ ] Test database interactions
- [ ] Validate real-time updates

### 3. E2E TESTING WITH PLAYWRIGHT
- [ ] Complete user workflows
- [ ] Multi-browser compatibility
- [ ] Mobile device testing
- [ ] Accessibility validation
- [ ] Performance benchmarks

### 4. DOCUMENTATION DELIVERABLES
- [ ] User guides with screenshots
- [ ] Technical implementation docs
- [ ] API documentation
- [ ] Troubleshooting guides
- [ ] Change logs and migration notes

## 🎯 TYPICAL DELIVERABLES WITH EVIDENCE
- [ ] Comprehensive test suite (Show: coverage reports >90%)
- [ ] User documentation (Evidence: clear guides with screenshots)
- [ ] Bug reports and resolution tracking (Show: issue tracking system)
- [ ] Accessibility compliance reports (Playwright: accessibility tree validation)
- [ ] Performance benchmarks (Metrics: actual measurements)
- [ ] Cross-browser compatibility matrix (Evidence: testing results)
```

---

## ⚠️ CRITICAL PATH REQUIREMENTS

Every prompt MUST include:
1. **Evidence of Reality** - Non-negotiable file existence and testing proof
2. **UI Style Guide Loading** - SAAS-UI-STYLE-GUIDE.md or JOURNEY-BUILDER-UI-STYLE-GUIDE.md
3. **Untitled UI/Magic UI enforcement** - NO other component libraries
4. **Ref MCP calls** - Current documentation loading including Untitled UI docs
5. **Serena MCP setup** - Codebase intelligence and pattern checking
6. **6+ parallel agents** - Concurrent execution target >75%
7. **Playwright MCP testing** - Accessibility-first validation
8. **Security requirements** - Non-negotiable checklist from centralized templates
9. **Navigation integration** - Mandatory for all UI features
10. **3 required reports** - Overview, feedback, senior dev prompt

---

**Use these templates to ensure consistency across all 5 team prompts (5 teams working through rounds sequentially)**