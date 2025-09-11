# TEAM B - ROUND 1: WS-175 - Advanced Data Encryption - Core Encryption Engine

**Date:** 2025-01-26  
**Feature ID:** WS-175 (Track all work with this ID)
**Priority:** P0 - Critical Security Feature
**Mission:** Implement the core field-level encryption engine with AES-256-GCM for all PII data  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier storing guest personal information
**I want to:** All sensitive data encrypted both in transit and at rest
**So that:** Client privacy is protected and GDPR compliance is maintained

**Real Wedding Problem This Solves:**
Wedding suppliers handle thousands of guest records with highly sensitive information - dietary allergies, medical conditions, contact details, plus-one arrangements. A single data breach could expose intimate details of hundreds of wedding guests. This encryption engine ensures that even if data is compromised, it remains unreadable without proper keys.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- AES-256-GCM encryption algorithm implementation
- Field-level encryption for PII (emails, phones, addresses)
- Key derivation using PBKDF2
- Initialization vector (IV) generation
- Authentication tag validation
- Secure key storage mechanism

**Technology Stack (VERIFIED):**
- Backend: Node.js crypto module
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Key Storage: Environment variables + database
- Testing: Vitest for crypto operations
- Performance: Target < 10ms per field

**Integration Points:**
- Database: encryption_keys table
- Environment: ENCRYPTION_MASTER_KEY
- API Routes: All routes handling PII
- Storage: Encrypted fields in guest_lists


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
// 1. Ref MCP - Load crypto and security docs:
await mcp__Ref__ref_get_library_docs({ 
  library: "/nodejs/node", 
  topic: "crypto aes-gcm pbkdf2", 
  maxTokens: 5000 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/supabase/supabase", 
  topic: "security encryption vault", 
  maxTokens: 3000 
});

// 2. Check existing security implementations:
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/config/environment.ts" 
});

await mcp__filesystem__search_files({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib",
  pattern: "crypto"
});

// 3. Review database schema:
await mcp__postgres__query({
  sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'guest_lists';"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

**Launch security-focused backend agents:**

1. **task-tracker-coordinator** --security-critical "Track WS-175 encryption engine implementation"
2. **nextjs-fullstack-developer** --backend-focus "Implement AES-256-GCM encryption"
3. **security-compliance-officer** --crypto-validation "Verify encryption strength"
4. **test-automation-architect** --crypto-testing "Create encryption tests"
5. **performance-optimization-expert** --benchmark "Ensure < 10ms encryption"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Review Node.js crypto module capabilities
- Understand existing environment configuration
- Check database column types for encrypted storage
- Identify all PII fields across the system

### **PLAN PHASE**
- Design key derivation strategy
- Plan IV and salt generation
- Create encryption/decryption flow
- Define error handling for crypto operations

### **CODE PHASE**

#### 1. Core Encryption Engine
**File:** `/wedsync/src/lib/encryption/field-encryption.ts`
```typescript
import crypto from 'crypto';

export class FieldEncryption {
  private algorithm = 'aes-256-gcm';
  private saltLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private iterations = 100000;
  
  async encryptField(
    plaintext: string, 
    masterKey: string
  ): Promise<{
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  }> {
    // Generate random salt and IV
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Derive key from master key and salt
    const key = await this.deriveKey(masterKey, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  async decryptField(
    encryptedData: {
      encrypted: string;
      salt: string;
      iv: string;
      tag: string;
    },
    masterKey: string
  ): Promise<string> {
    // Implementation here
  }
  
  private async deriveKey(
    masterKey: string, 
    salt: Buffer
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(masterKey, salt, this.iterations, 32, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }
}
```

#### 2. Key Management Service
**File:** `/wedsync/src/lib/encryption/key-management.ts`
```typescript
export class KeyManagement {
  // Key rotation logic
  // Key versioning
  // Emergency key recovery
}
```

#### 3. Database Migration for Encryption
**File:** `/wedsync/supabase/migrations/[timestamp]_add_encryption_fields.sql`
```sql
-- Add encryption fields to sensitive tables
ALTER TABLE guest_lists ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE guest_lists ADD COLUMN IF NOT EXISTS email_salt TEXT;
ALTER TABLE guest_lists ADD COLUMN IF NOT EXISTS email_iv TEXT;
ALTER TABLE guest_lists ADD COLUMN IF NOT EXISTS email_tag TEXT;

-- Create encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  key_version INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- Create secure view for decrypted data (RLS protected)
CREATE OR REPLACE VIEW guest_lists_decrypted AS
SELECT id, name, 
  -- Only show decrypted email if user has permission
  CASE WHEN current_user_has_decrypt_permission() 
    THEN decrypt_field(email_encrypted, email_salt, email_iv, email_tag)
    ELSE '***ENCRYPTED***'
  END as email
FROM guest_lists;
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Complete FieldEncryption class implementation
- [x] Key derivation with PBKDF2
- [x] Secure random IV and salt generation
- [x] Authentication tag validation
- [x] Database migration for encrypted fields
- [x] Environment variable configuration
- [x] Unit tests with 95% coverage
- [x] Performance benchmarks < 10ms

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
- FROM Team C: Storage layer interface - Required for encrypted field persistence
- FROM Team D: Security validation requirements - Required for compliance

### What other teams NEED from you:
- TO Team A: Encryption API contract - They need for UI indicators
- TO Team C: Encryption/decryption methods - Required for storage layer
- TO Team E: Encryption service exports - Needed for API middleware

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Cryptographic Security Checklist:
- [x] Use crypto.randomBytes() for all random generation
- [x] Never log encryption keys or plaintext
- [x] Validate all inputs before encryption
- [x] Use constant-time comparison for tags
- [x] Implement key rotation mechanism
- [x] Secure key storage in environment
- [x] Audit log all encryption operations
- [x] Zero out key buffers after use

### Critical Security Implementation:
```typescript
// MANDATORY: Database migration request for SQL Expert
// Create file: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-175.md
// Include: migration file path, dependencies, testing status
// SQL Expert will validate and apply safely
```

---

## 🎭 TESTING REQUIREMENTS

```typescript
// Unit test example
describe('FieldEncryption', () => {
  it('should encrypt and decrypt field correctly', async () => {
    const encryption = new FieldEncryption();
    const plaintext = 'sensitive@email.com';
    const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
    
    const encrypted = await encryption.encryptField(plaintext, masterKey);
    expect(encrypted.encrypted).not.toBe(plaintext);
    expect(encrypted.salt).toHaveLength(64); // 32 bytes hex
    expect(encrypted.iv).toHaveLength(32); // 16 bytes hex
    expect(encrypted.tag).toHaveLength(32); // 16 bytes hex
    
    const decrypted = await encryption.decryptField(encrypted, masterKey);
    expect(decrypted).toBe(plaintext);
  });
  
  it('should fail with wrong key', async () => {
    // Test authentication tag validation
  });
  
  it('should complete encryption in < 10ms', async () => {
    // Performance benchmark
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] AES-256-GCM fully implemented
- [x] All crypto operations secure
- [x] Performance < 10ms per field
- [x] Zero memory leaks
- [x] 95% test coverage

### Evidence Package Required:
- [x] Encryption benchmark results
- [x] Security audit report
- [x] Test coverage report
- [x] Migration success confirmation
- [x] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Encryption: `/wedsync/src/lib/encryption/`
- Tests: `/wedsync/tests/encryption/`
- Migration: `/wedsync/supabase/migrations/`
- Types: `/wedsync/src/types/encryption.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch23/WS-175-team-b-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY