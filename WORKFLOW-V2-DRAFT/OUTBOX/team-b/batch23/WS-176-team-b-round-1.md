# TEAM B - ROUND 1: WS-176 - GDPR Compliance System - Consent Tracking Backend

**Date:** 2025-01-26  
**Feature ID:** WS-176 (Track all work with this ID)
**Priority:** P0 - Legal Compliance Requirement
**Mission:** Build robust consent tracking backend with legal basis recording and consent history management  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier processing EU guest data
**I want to:** Automated consent tracking with full audit trail
**So that:** I can prove consent for any data processing during compliance audits

**Real Wedding Problem This Solves:**
A single wedding can have 200+ EU guests, each requiring individual consent tracking for photos, dietary data, contact sharing, and marketing. Manual tracking is impossible and legally risky. This backend automatically records every consent interaction with timestamps, IP addresses, and version tracking to satisfy GDPR auditors.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Consent state management for multiple categories
- Legal basis tracking (consent, legitimate interest, contract)
- Consent version history with timestamps
- IP and user agent recording
- Withdrawal processing with cascade effects
- Integration with all data processing operations

**Technology Stack (VERIFIED):**
- Backend: Node.js with Supabase Edge Functions
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Validation: Zod schemas for consent data
- Queue: Background jobs for consent updates
- Testing: Vitest for consent logic

**Integration Points:**
- UI Components from Team A
- Database tables: gdpr_consent, gdpr_requests
- Processing engine from Team C
- Compliance validation from Team D


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

```typescript
// Load GDPR backend requirements
await mcp__Ref__ref_get_library_docs({ 
  library: "/gdpr/compliance", 
  topic: "consent management backend", 
  maxTokens: 5000 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/supabase/supabase", 
  topic: "edge functions triggers", 
  maxTokens: 3000 
});

// Review existing implementations
await mcp__filesystem__search_files({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib",
  pattern: "consent"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --gdpr-critical "Track WS-176 consent backend"
2. **nextjs-fullstack-developer** --backend-focus "Build consent tracking system"
3. **postgresql-database-expert** --gdpr-tables "Design consent schema"
4. **security-compliance-officer** --legal-validation "Verify GDPR compliance"
5. **test-automation-architect** --consent-testing "Create consent tests"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Consent Manager Core
**File:** `/wedsync/src/lib/gdpr/consent-manager.ts`
```typescript
export class ConsentManager {
  private readonly CONSENT_CATEGORIES = [
    'essential',     // Always true, required for service
    'analytics',     // Performance cookies
    'marketing',     // Email campaigns, remarketing
    'functional',    // Preferences, language
    'third_party'    // External service integrations
  ];

  async recordConsent(params: {
    userId?: string;
    email: string;
    categories: ConsentCategory[];
    ipAddress: string;
    userAgent: string;
    source: 'banner' | 'settings' | 'signup' | 'api';
  }): Promise<ConsentRecord> {
    // Record consent with full audit trail
    const consentRecord = await supabase
      .from('gdpr_consent')
      .insert({
        user_id: params.userId,
        email: params.email,
        consent_data: params.categories,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        source: params.source,
        version: this.getCurrentConsentVersion(),
        created_at: new Date()
      })
      .select()
      .single();

    // Trigger cascade updates
    await this.updateDataProcessingPermissions(consentRecord);
    
    return consentRecord;
  }

  async withdrawConsent(
    email: string,
    categories: string[]
  ): Promise<WithdrawalResult> {
    // Process withdrawal with immediate effect
    // Cascade to all systems
    // Create audit record
  }

  async getConsentHistory(email: string): Promise<ConsentHistory[]> {
    // Full consent history for audit
  }
}
```

#### 2. Legal Basis Tracker
**File:** `/wedsync/src/lib/gdpr/legal-basis-tracker.ts`
```typescript
export class LegalBasisTracker {
  async recordLegalBasis(params: {
    dataSubject: string;
    processingActivity: string;
    legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 
                'vital_interest' | 'legal_obligation' | 'public_task';
    details: string;
    retentionPeriod: number; // days
  }): Promise<void> {
    // Track legal basis for each processing activity
  }
}
```

#### 3. Database Migration
**File:** `/wedsync/supabase/migrations/[timestamp]_gdpr_consent_tracking.sql`
```sql
-- GDPR consent tracking with full audit
CREATE TABLE IF NOT EXISTS gdpr_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  email TEXT NOT NULL,
  consent_data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  source TEXT CHECK (source IN ('banner', 'settings', 'signup', 'api')),
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for quick lookups
  INDEX idx_gdpr_consent_email (email),
  INDEX idx_gdpr_consent_user (user_id),
  INDEX idx_gdpr_consent_created (created_at DESC)
);

-- Consent withdrawal records
CREATE TABLE IF NOT EXISTS gdpr_consent_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID REFERENCES gdpr_consent(id),
  categories TEXT[],
  reason TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal basis records
CREATE TABLE IF NOT EXISTS gdpr_legal_basis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject TEXT NOT NULL,
  processing_activity TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  details TEXT,
  retention_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Complete ConsentManager implementation
- [x] Legal basis tracking system
- [x] Consent withdrawal mechanism
- [x] Database schema and migrations
- [x] Consent version management
- [x] Cascade update system
- [x] API for consent operations
- [x] Comprehensive test suite

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
- FROM Team A: Consent UI events - Required for tracking
- FROM Team D: Compliance requirements - Required for legal basis

### What other teams NEED from you:
- TO Team A: Consent API endpoints - They need for UI integration
- TO Team C: Consent status methods - Required for processing
- TO Team E: Consent middleware - Needed for API protection

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### GDPR Compliance Checklist:
- [x] Explicit consent recorded
- [x] Granular consent categories
- [x] Easy withdrawal mechanism
- [x] Full audit trail maintained
- [x] No pre-checked boxes
- [x] Clear purpose for each category
- [x] Consent version tracking
- [x] Timestamp all operations

### Database Security:
```typescript
// MANDATORY: Create migration request
// File: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-176.md
// Include: GDPR tables, RLS policies, audit triggers
```

---

## ✅ SUCCESS CRITERIA

- [x] All consent operations < 100ms
- [x] 100% audit trail coverage
- [x] Withdrawal processes immediately
- [x] Zero consent data loss
- [x] Full GDPR compliance

**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch23/WS-176-team-b-round-1-complete.md`

END OF ROUND PROMPT