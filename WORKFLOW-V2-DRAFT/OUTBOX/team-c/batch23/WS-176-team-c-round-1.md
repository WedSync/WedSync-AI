# TEAM C - ROUND 1: WS-176 - GDPR Compliance System - Request Processing System

**Date:** 2025-01-26  
**Feature ID:** WS-176 (Track all work with this ID)
**Priority:** P0 - Legal Compliance Requirement
**Mission:** Build automated GDPR data request processing system with verification and fulfillment workflows  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding guest from the EU
**I want to:** Easy access to request my personal data or have it deleted
**So that:** I can exercise my GDPR rights without contacting multiple vendors

**Real Wedding Problem This Solves:**
A guest attends a destination wedding in France but lives in Germany. Six months later, they want to see what data the photographer, caterer, and venue have about them. Under GDPR, they have the right to request all their data within 30 days. This system automates the complex process of verifying identity, finding all data, and delivering it securely.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Data subject access request (DSAR) automation
- Identity verification system
- Data discovery across all tables
- Secure export generation
- Request status tracking
- 30-day compliance deadline management

**Technology Stack (VERIFIED):**
- Backend: Supabase Edge Functions
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Queue: Background job processing
- Export: PDF/JSON generation
- Security: End-to-end encryption for exports
- Testing: Integration tests for full workflow

**Integration Points:**
- Consent tracking from Team B
- UI portal from Team A  
- Compliance validation from Team D
- API endpoints from Team E


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
// Load GDPR processing requirements
await mcp__Ref__ref_get_library_docs({ 
  library: "/gdpr/compliance", 
  topic: "data subject requests processing", 
  maxTokens: 5000 
});

// Check existing data structures
await mcp__postgres__query({
  sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --gdpr-processing "Track WS-176 request system"
2. **postgresql-database-expert** --data-discovery "Build data finder system"
3. **supabase-specialist** --edge-functions "Create processing functions"
4. **security-compliance-officer** --verification "Build identity verification"
5. **test-automation-architect** --workflow-testing "Create end-to-end tests"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. GDPR Request Processor
**File:** `/wedsync/src/lib/gdpr/request-processor.ts`
```typescript
export class GDPRRequestProcessor {
  private readonly REQUEST_TYPES = [
    'access',        // Right to access (Article 15)
    'rectification', // Right to rectification (Article 16)
    'erasure',       // Right to erasure (Article 17)
    'restrict',      // Right to restrict processing (Article 18)
    'portability',   // Right to data portability (Article 20)
    'object'         // Right to object (Article 21)
  ];

  async processRequest(params: {
    email: string;
    requestType: string;
    details?: string;
    verificationToken?: string;
  }): Promise<GDPRRequestResult> {
    
    // 1. Create request record
    const request = await this.createRequestRecord(params);
    
    // 2. Send verification email if needed
    if (!params.verificationToken) {
      await this.sendVerificationEmail(params.email, request.id);
      return { 
        requestId: request.id, 
        status: 'verification_pending',
        estimatedCompletion: this.calculateDeadline()
      };
    }
    
    // 3. Verify identity
    const isVerified = await this.verifyIdentity(
      params.email, 
      params.verificationToken
    );
    
    if (!isVerified) {
      throw new Error('Verification failed');
    }
    
    // 4. Process based on request type
    switch (params.requestType) {
      case 'access':
        return await this.processAccessRequest(request);
      case 'erasure':
        return await this.processErasureRequest(request);
      case 'portability':
        return await this.processPortabilityRequest(request);
      // ... other types
    }
  }

  private async processAccessRequest(
    request: GDPRRequest
  ): Promise<GDPRRequestResult> {
    // Find all data for this email across all tables
    const personalData = await this.discoverPersonalData(request.email);
    
    // Generate secure export
    const exportFile = await this.generateDataExport(personalData);
    
    // Store securely and send download link
    const downloadUrl = await this.createSecureDownload(exportFile);
    
    await this.updateRequestStatus(request.id, 'completed');
    
    return {
      requestId: request.id,
      status: 'completed',
      downloadUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }
}
```

#### 2. Data Discovery Engine
**File:** `/wedsync/src/lib/gdpr/data-discovery.ts`
```typescript
export class DataDiscovery {
  private readonly PII_TABLES = {
    'user_profiles': ['email', 'phone', 'address'],
    'guest_lists': ['email', 'phone', 'dietary_restrictions'],
    'form_responses': ['response_data'],
    'communications': ['content', 'metadata'],
    'photos': ['metadata', 'tags']
  };

  async discoverPersonalData(email: string): Promise<PersonalDataMap> {
    const discoveredData: PersonalDataMap = {};
    
    for (const [table, fields] of Object.entries(this.PII_TABLES)) {
      const data = await this.searchTable(table, email, fields);
      if (data.length > 0) {
        discoveredData[table] = data;
      }
    }
    
    return discoveredData;
  }
  
  private async searchTable(
    tableName: string, 
    email: string, 
    fields: string[]
  ): Promise<any[]> {
    // Search for email in all fields
    // Handle both plaintext and encrypted fields
    // Return matching records
  }
}
```

#### 3. Secure Export Generator
**File:** `/wedsync/src/lib/gdpr/export-generator.ts`
```typescript
export class ExportGenerator {
  async generateDataExport(
    personalData: PersonalDataMap,
    format: 'json' | 'pdf' = 'json'
  ): Promise<Buffer> {
    const exportData = {
      generated_at: new Date().toISOString(),
      data_subject: 'Personal data for GDPR request',
      tables: personalData,
      metadata: {
        total_records: this.countRecords(personalData),
        export_format: format,
        legal_basis: 'GDPR Article 15 - Right of access'
      }
    };
    
    if (format === 'pdf') {
      return await this.generatePDFExport(exportData);
    }
    
    return Buffer.from(JSON.stringify(exportData, null, 2));
  }
  
  private async generatePDFExport(data: any): Promise<Buffer> {
    // Generate human-readable PDF export
    // Include data in tables
    // Add explanatory text
  }
}
```

#### 4. Database Migration
**File:** `/wedsync/supabase/migrations/[timestamp]_gdpr_requests.sql`
```sql
-- GDPR request tracking
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  request_type TEXT CHECK (
    request_type IN ('access', 'rectification', 'erasure', 'restrict', 'portability', 'object')
  ),
  status TEXT CHECK (
    status IN ('pending', 'verification_pending', 'processing', 'completed', 'rejected', 'expired')
  ),
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  details TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_gdpr_requests_email (email),
  INDEX idx_gdpr_requests_status (status),
  INDEX idx_gdpr_requests_created (created_at DESC)
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] GDPR request processor implementation
- [x] Data discovery engine across all tables
- [x] Identity verification system
- [x] Secure export generation (JSON/PDF)
- [x] Request status tracking
- [x] Database schema and migrations
- [x] 30-day deadline management
- [x] Integration test suite

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
- FROM Team B: Consent status lookup - Required for processing validation
- FROM Team D: Legal requirements - Required for compliance

### What other teams NEED from you:
- TO Team A: Request status API - They need for UI portal
- TO Team E: Processing endpoints - Required for API integration
- TO Team B: Data discovery results - Needed for consent correlation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### GDPR Processing Security:
- [x] Strong identity verification required
- [x] Secure data export encryption
- [x] Audit all request processing steps
- [x] Time-limited download links
- [x] No data retention beyond legal requirement
- [x] Secure token generation
- [x] IP and timestamp logging
- [x] Automated cleanup of expired requests

---

## ✅ SUCCESS CRITERIA

- [x] 30-day deadline never missed
- [x] 100% data discovery accuracy
- [x] Secure exports generated
- [x] Identity verification robust
- [x] Full audit trail maintained

**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch23/WS-176-team-c-round-1-complete.md`

END OF ROUND PROMPT