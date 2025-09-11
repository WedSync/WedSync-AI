# TEAM A - ROUND 1: WS-200 - API Versioning Strategy - Backend Implementation

**Date:** 2025-08-26  
**Feature ID:** WS-200 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Implement comprehensive API versioning with backward compatibility, migration support, and deprecation policies for wedding industry integrations  
**Context:** You are Team A working in parallel with Teams B-E. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform architect ensuring long-term API stability for third-party integrations
**I want to:** Implement comprehensive API versioning with backward compatibility, migration support, and clear deprecation policies
**So that:** When we enhance the supplier client management API with new wedding timeline features, existing photography studio CRMs continue working without disruption; venue booking systems can migrate to new API versions at their own pace with clear migration paths; and custom integrations built by wedding planners remain functional while they gradually adopt new API capabilities over 12-month deprecation cycles

**Real Wedding Problem This Solves:**
A successful photography supplier has integrated their custom CRM with WedSync's v1 API to manage 200+ weddings annually. When WedSync releases v2 with enhanced guest management features, the API versioning strategy ensures their existing integration continues working unchanged. They receive 6 months advance notice of v1 deprecation via API headers and dashboard notifications, along with detailed migration guides showing exact code changes needed.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API version detection via URL path, headers, and client signatures  
- Compatibility checking and migration plan generation
- Deprecation process with 6-month notice periods
- Version tracking and usage analytics
- HMAC signature verification for webhook integration

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions  
- API: Next.js API routes with version middleware
- Security: HMAC signing, timestamp validation

**Integration Points:**
- API Routes Structure: Version detection middleware integration
- Webhook System: Version-aware webhook payload compatibility
- Database: API version tracking tables and migration analytics

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
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next api-versioning middleware latest documentation"});
await mcp__Ref__ref_search_documentation({query: "semantic release version-management latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database-analytics latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("middleware", "", true);
await mcp__serena__get_symbols_overview("src/middleware");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "API versioning backend implementation"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "API version tracking schema"  
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "API versioning middleware"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing middleware patterns in `/src/middleware/`
- Understand current API route structure
- Check integration points with webhook system
- Review similar version detection implementations

### **PLAN PHASE (THINK HARD!)**
- Design version detection algorithm (URL, headers, client signatures)
- Plan compatibility matrix generation
- Write test cases FIRST (TDD approach)
- Plan migration tools architecture

### **CODE PHASE (PARALLEL AGENTS!)**
- Create database schema for version tracking
- Implement version detection middleware  
- Build compatibility checking system
- Add migration plan generation logic

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests and ensure >80% coverage
- Verify API versioning with integration tests
- Test version detection accuracy across methods
- Generate evidence package

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] **Database Schema**: API version tracking tables with analytics capabilities
- [ ] **Version Detection**: Middleware for URL path, header, and signature-based detection  
- [ ] **Core Manager**: WedSyncAPIVersionManager with version configuration
- [ ] **Compatibility System**: Compatibility matrix generation and checking
- [ ] **Unit Tests**: >80% coverage for version detection and compatibility logic
- [ ] **Migration Tools**: Basic migration plan generation with wedding industry context

**Key Files to Create:**
- `/wedsync/lib/api/versioning.ts` - Core version management system
- `/wedsync/lib/api/version-compatibility.ts` - Compatibility checking logic
- `/wedsync/middleware/api-version.ts` - Version detection middleware
- `/wedsync/lib/migration/api-migration-tools.ts` - Migration assistance tools
- Database migration: Version tracking schema

**Affected Paths:**
- `/wedsync/src/middleware.ts` - Add version detection
- `/wedsync/src/app/api/` - Version-aware route handling

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
- FROM Team D: UI requirements for version dashboard - Required for admin interface planning
- FROM Team B: Webhook endpoint schema - Required for version-aware webhook compatibility

### What other teams NEED from you:  
- TO Team D: Version detection API and data structures - They need this for dashboard implementation
- TO Team B: Version compatibility checking functions - Blocking their webhook version support
- TO Team C: Version context headers - Required for realtime system version awareness

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ DATABASE MIGRATIONS:**
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-200.md`
- SQL Expert will handle application and conflict resolution

### MANDATORY SECURITY IMPLEMENTATION FOR API VERSIONING

**EVERY version detection endpoint MUST use validation:**
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { versionDetectionSchema } from '@/lib/validation/schemas';

export const GET = withSecureValidation(
  versionDetectionSchema,
  async (request: NextRequest, validatedData) => {
    // Version detection implementation with validated input
  }
);
```

### SECURITY CHECKLIST FOR API VERSIONING
- [ ] **Version Detection Security**: Prevent version spoofing through header manipulation
- [ ] **Client Signature Validation**: Cryptographically secure client identification  
- [ ] **Rate Limiting**: Apply to version detection endpoints to prevent abuse
- [ ] **Migration Security**: Secure transmission of migration guidance and code examples
- [ ] **Deprecation Notices**: Secure delivery without exposing sensitive system information
- [ ] **Analytics Privacy**: Version usage analytics respect client privacy boundaries

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// ACCESSIBILITY-FIRST API VERSION TESTING

// 1. VERSION DETECTION VALIDATION  
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/v1/suppliers"});
const apiResponse = await page.request.get('/api/v1/suppliers', {
  headers: { 
    'Accept': 'application/vnd.wedsync.v1+json',
    'API-Version': 'v1'
  }
});
expect(apiResponse.headers()['x-api-version']).toBe('v1');

// 2. COMPATIBILITY MATRIX TESTING
const compatibilityTest = await page.request.get('/api/admin/versions/compatibility', {
  headers: { 'Authorization': 'Bearer admin-token' }
});
expect(await compatibilityTest.json()).toHaveProperty('compatibilityMatrix');

// 3. DEPRECATION NOTICE TESTING  
const deprecatedResponse = await page.request.get('/api/v1/deprecated-endpoint');
expect(deprecatedResponse.headers()['deprecation']).toBe('true');
expect(deprecatedResponse.headers()['sunset']).toBeDefined();
```

**REQUIRED TEST COVERAGE:**
- [ ] Version detection accuracy across all supported methods
- [ ] Compatibility checking with various version combinations  
- [ ] Migration plan generation with wedding industry context
- [ ] Deprecation process workflow validation
- [ ] Performance under high-volume version detection requests


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

### Technical Implementation:
- [ ] API version detection supports URL path, headers, and client signature methods
- [ ] Compatibility matrix generation works for all supported version pairs
- [ ] Migration tools provide wedding industry specific guidance and code examples  
- [ ] Deprecation workflow includes 6-month notice with automated notifications
- [ ] Performance: Version detection adds <5ms overhead to API requests

### Integration & Performance:
- [ ] Integration with existing API middleware stack
- [ ] Database schema optimized for high-volume version analytics
- [ ] Security validation prevents version spoofing attacks
- [ ] Works across all API endpoints consistently

### Evidence Package Required:
- [ ] Proof of version detection accuracy (100% success rate in tests)
- [ ] Performance metrics showing <5ms overhead
- [ ] Security validation test results
- [ ] Database migration verification
- [ ] Unit test coverage report (>80%)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/lib/api/versioning.ts`
- Middleware: `/wedsync/middleware/api-version.ts`  
- Database: `/wedsync/supabase/migrations/[timestamp]_api_versioning_system.sql`
- Tests: `/wedsync/tests/api-versioning/`
- Types: `/wedsync/src/types/api-versioning.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch30/WS-200-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-200) AND team identifier in all filenames  
- **Save in:** Correct batch folder (batch30)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-200 | ROUND_1_COMPLETE | team-a | batch30" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify webhook endpoints assigned to Team B (causes conflicts)
- Do NOT skip database migration handoff to SQL Expert  
- Do NOT ignore version compatibility edge cases
- REMEMBER: Team D needs your API structures for dashboard implementation
- WAIT: Do not start Round 2 until ALL teams complete Round 1

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY