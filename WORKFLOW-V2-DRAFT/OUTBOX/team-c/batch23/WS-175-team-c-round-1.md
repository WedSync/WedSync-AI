# TEAM C - ROUND 1: WS-175 - Advanced Data Encryption - Storage Integration & Database Layer

**Date:** 2025-01-26  
**Feature ID:** WS-175 (Track all work with this ID)
**Priority:** P0 - Critical Security Feature
**Mission:** Implement encrypted storage layer integration with automatic encryption/decryption for database operations  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier storing guest personal information
**I want to:** Seamless database encryption without impacting application performance
**So that:** Data is protected at rest while maintaining fast query speeds

**Real Wedding Problem This Solves:**
Wedding events involve storing data for 100-500 guests per event, with suppliers managing multiple weddings simultaneously. This means thousands of PII records that must be encrypted in the database. The storage layer must handle transparent encryption/decryption while maintaining the sub-second query performance needed for real-time wedding coordination.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Transparent encryption/decryption layer
- Encrypted field indexing strategy
- Backup data encryption
- Query performance optimization
- Batch encryption for imports
- Migration of existing unencrypted data

**Technology Stack (VERIFIED):**
- Database: PostgreSQL 15 via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions
- Storage: Supabase Storage for files
- ORM: Prisma with encryption middleware
- Testing: Database performance benchmarks

**Integration Points:**
- FieldEncryption service from Team B
- Database tables: guest_lists, user_profiles, form_responses
- Supabase RLS policies
- Backup systems


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

**⚠️ CRITICAL: Complete this BEFORE any coding begins!**

```typescript
// 1. Ref MCP - Load database and ORM docs:
await mcp__Ref__ref_get_library_docs({ 
  library: "/supabase/supabase", 
  topic: "database functions triggers rls", 
  maxTokens: 5000 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/prisma/prisma", 
  topic: "middleware encryption interceptors", 
  maxTokens: 3000 
});

// 2. Check current database schema:
await mcp__postgres__query({
  sql: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND column_name LIKE '%email%' OR column_name LIKE '%phone%';"
});

// 3. Review existing database patterns:
await mcp__filesystem__search_files({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations",
  pattern: "guest"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

**Launch database-focused agents:**

1. **task-tracker-coordinator** --database-focus "Track WS-175 storage encryption layer"
2. **postgresql-database-expert** --encryption-optimization "Implement encrypted storage"
3. **supabase-specialist** --rls-encryption "Configure encrypted RLS policies"
4. **performance-optimization-expert** --database-tuning "Optimize encrypted queries"
5. **test-automation-architect** --database-testing "Create storage tests"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Analyze current database schema for PII fields
- Review existing RLS policies
- Check backup procedures
- Identify query patterns needing optimization

### **PLAN PHASE**
- Design encrypted column strategy
- Plan indexing for encrypted fields
- Create migration strategy for existing data
- Define backup encryption approach

### **CODE PHASE**

#### 1. Database Encryption Middleware
**File:** `/wedsync/src/lib/encryption/database-middleware.ts`
```typescript
import { FieldEncryption } from './field-encryption';

export class DatabaseEncryptionMiddleware {
  private encryption: FieldEncryption;
  private encryptedFields = {
    guest_lists: ['email', 'phone', 'address'],
    user_profiles: ['phone', 'emergency_contact'],
    form_responses: ['response_data']
  };
  
  async encryptBeforeInsert(
    table: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    const fieldsToEncrypt = this.encryptedFields[table] || [];
    const encryptedData = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (data[field]) {
        const encrypted = await this.encryption.encryptField(
          data[field],
          process.env.ENCRYPTION_MASTER_KEY!
        );
        
        // Store encrypted components
        encryptedData[`${field}_encrypted`] = encrypted.encrypted;
        encryptedData[`${field}_salt`] = encrypted.salt;
        encryptedData[`${field}_iv`] = encrypted.iv;
        encryptedData[`${field}_tag`] = encrypted.tag;
        
        // Remove plaintext
        delete encryptedData[field];
      }
    }
    
    return encryptedData;
  }
  
  async decryptAfterSelect(
    table: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    // Transparent decryption logic
  }
}
```

#### 2. Supabase RLS with Encryption
**File:** `/wedsync/supabase/migrations/[timestamp]_encrypted_rls_policies.sql`
```sql
-- Function to check decryption permission
CREATE OR REPLACE FUNCTION has_decrypt_permission(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has valid session and permissions
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'supplier')
    AND subscription_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy for encrypted data access
CREATE POLICY encrypted_data_access ON guest_lists
  FOR SELECT
  USING (
    -- Only allow access if user can decrypt
    has_decrypt_permission(auth.uid())
  );

-- Create secure view with automatic decryption
CREATE OR REPLACE VIEW guest_lists_secure AS
SELECT 
  id, 
  wedding_id,
  name,
  CASE 
    WHEN has_decrypt_permission(auth.uid()) THEN
      decrypt_field(email_encrypted, email_salt, email_iv, email_tag)
    ELSE 
      '***ENCRYPTED***'
  END as email,
  created_at
FROM guest_lists;
```

#### 3. Batch Encryption for Existing Data
**File:** `/wedsync/src/lib/encryption/migration-encryptor.ts`
```typescript
export class MigrationEncryptor {
  async encryptExistingData() {
    // Batch process existing records
    // Progress tracking
    // Rollback capability
  }
}
```

#### 4. Encrypted Backup System
**File:** `/wedsync/src/lib/encryption/backup-encryption.ts`
```typescript
export class BackupEncryption {
  async encryptBackup(data: any): Promise<Buffer> {
    // Encrypt entire backup file
    // Compress after encryption
    // Add integrity checks
  }
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Database encryption middleware implementation
- [x] Supabase RLS policies for encrypted data
- [x] Migration script for existing data
- [x] Encrypted backup system
- [x] Query optimization for encrypted fields
- [x] Batch encryption for imports
- [x] Performance benchmarks
- [x] Integration tests

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
- FROM Team B: FieldEncryption class - Required for storage operations
- FROM Team D: Security requirements - Required for compliance validation

### What other teams NEED from you:
- TO Team A: Storage status API - They need for UI indicators
- TO Team E: Database middleware - Required for API operations
- TO All Teams: Encrypted query methods - Needed for data access

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Storage Security Checklist:
- [x] Encrypt before any database write
- [x] Decrypt only with proper permissions
- [x] No plaintext in logs or backups
- [x] Secure key references only
- [x] Audit all encryption operations
- [x] Implement data retention policies
- [x] Test rollback procedures
- [x] Validate migration integrity

### Critical Database Operations:
```typescript
// MANDATORY: Create migration request for SQL Expert
// File: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-175-storage.md
// Include: RLS policies, encryption functions, performance impact
```

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Performance test for encrypted queries
describe('Encrypted Storage Performance', () => {
  it('should maintain < 50ms query time with encryption', async () => {
    const start = Date.now();
    const results = await supabase
      .from('guest_lists_secure')
      .select('*')
      .eq('wedding_id', testWeddingId)
      .limit(100);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
  
  it('should handle batch encryption efficiently', async () => {
    const records = generateTestRecords(1000);
    const encrypted = await batchEncrypt(records);
    expect(encrypted).toHaveLength(1000);
  });
});

// Playwright integration test
await mcp__playwright__browser_navigate({url: "http://localhost:3000/guests"});
const snapshot = await mcp__playwright__browser_snapshot();
// Verify encrypted data displays correctly
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] All PII fields encrypted in database
- [x] Query performance < 50ms
- [x] Batch operations < 5s for 1000 records
- [x] Zero data leaks in logs
- [x] 100% RLS policy coverage

### Evidence Package Required:
- [x] Database encryption proof
- [x] Performance benchmark results
- [x] Migration success report
- [x] Security audit confirmation
- [x] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Middleware: `/wedsync/src/lib/encryption/database-middleware.ts`
- Migrations: `/wedsync/supabase/migrations/`
- Backup: `/wedsync/src/lib/encryption/backup-encryption.ts`
- Tests: `/wedsync/tests/encryption-storage/`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch23/WS-175-team-c-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY