# TEAM E - ROUND 1: WS-175 - Advanced Data Encryption - API Middleware & Field Encryption

**Date:** 2025-01-26  
**Feature ID:** WS-175 (Track all work with this ID)
**Priority:** P0 - Critical Security Feature
**Mission:** Implement API encryption middleware with automatic field-level encryption for all sensitive data endpoints  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using the API for integrations
**I want to:** Automatic encryption of sensitive data in all API operations
**So that:** Third-party integrations remain secure without manual encryption handling

**Real Wedding Problem This Solves:**
Wedding suppliers integrate with dozens of services - email platforms, SMS gateways, calendar systems, payment processors. Each integration potentially exposes guest PII through API calls. This middleware ensures that every API request/response automatically encrypts sensitive fields, protecting data even when transmitted to external services or stored in logs.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API middleware for automatic encryption/decryption
- Field-level encryption for all PII in requests/responses
- Webhook payload encryption
- API key encryption for third-party services
- Rate limiting for encryption operations
- Encryption metrics and monitoring

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes with middleware
- Encryption: Node.js crypto with Team B's engine
- Validation: Zod schemas with encryption rules
- Monitoring: Performance metrics collection
- Testing: API security testing with Playwright

**Integration Points:**
- FieldEncryption from Team B
- Database middleware from Team C
- Security protocols from Team D
- UI indicators from Team A


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
// 1. Ref MCP - Load API security and middleware docs:
await mcp__Ref__ref_get_library_docs({ 
  library: "/vercel/next.js", 
  topic: "api middleware security headers", 
  maxTokens: 5000 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/zod/zod", 
  topic: "schema validation transform", 
  maxTokens: 3000 
});

// 2. Review existing API security:
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/validation/middleware.ts" 
});

await mcp__filesystem__search_files({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api",
  pattern: "route"
});

// 3. Check current middleware setup:
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/middleware.ts" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

**Launch API security agents:**

1. **task-tracker-coordinator** --api-security "Track WS-175 API encryption middleware"
2. **nextjs-fullstack-developer** --api-middleware "Implement encryption middleware"
3. **security-compliance-officer** --api-validation "Verify API security"
4. **performance-optimization-expert** --api-performance "Optimize middleware speed"
5. **test-automation-architect** --api-testing "Create API security tests"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Analyze all existing API routes for PII exposure
- Review current middleware architecture
- Identify webhook endpoints needing encryption
- Map third-party integration points

### **PLAN PHASE**
- Design middleware chain for encryption
- Plan field detection strategy
- Create encryption schema definitions
- Define performance budgets

### **CODE PHASE**

#### 1. Core API Encryption Middleware
**File:** `/wedsync/src/middleware/api-encryption.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { FieldEncryption } from '@/lib/encryption/field-encryption';

export class APIEncryptionMiddleware {
  private encryption = new FieldEncryption();
  
  // Fields to encrypt across all API routes
  private sensitiveFields = [
    'email', 'phone', 'address', 'ssn', 'creditCard',
    'emergencyContact', 'medicalInfo', 'dietaryRestrictions'
  ];
  
  async encryptRequest(req: NextRequest): Promise<NextRequest> {
    const body = await req.json();
    const encryptedBody = await this.encryptObject(body);
    
    // Create new request with encrypted body
    return new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(encryptedBody)
    });
  }
  
  async decryptResponse(res: NextResponse): Promise<NextResponse> {
    const body = await res.json();
    const decryptedBody = await this.decryptObject(body);
    
    return NextResponse.json(decryptedBody, {
      status: res.status,
      headers: res.headers
    });
  }
  
  private async encryptObject(
    obj: any, 
    path: string[] = []
  ): Promise<any> {
    if (!obj) return obj;
    
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.encryptObject(item, path)));
    }
    
    if (typeof obj === 'object') {
      const encrypted: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const fieldName = currentPath[currentPath.length - 1];
        
        if (this.sensitiveFields.includes(fieldName) && typeof value === 'string') {
          // Encrypt sensitive field
          const encryptedData = await this.encryption.encryptField(
            value,
            process.env.ENCRYPTION_MASTER_KEY!
          );
          encrypted[`${key}_encrypted`] = encryptedData;
        } else if (typeof value === 'object') {
          // Recursively encrypt nested objects
          encrypted[key] = await this.encryptObject(value, currentPath);
        } else {
          encrypted[key] = value;
        }
      }
      
      return encrypted;
    }
    
    return obj;
  }
}
```

#### 2. Secure API Route Wrapper
**File:** `/wedsync/src/lib/api/secure-route.ts`
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { APIEncryptionMiddleware } from '@/middleware/api-encryption';

export function withEncryption<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  const encryptionMiddleware = new APIEncryptionMiddleware();
  
  return withSecureValidation(schema, async (req, validatedData) => {
    // Decrypt incoming data if needed
    const decryptedData = await encryptionMiddleware.decryptData(validatedData);
    
    // Process with handler
    const response = await handler(req, decryptedData);
    
    // Encrypt response before sending
    return encryptionMiddleware.encryptResponse(response);
  });
}
```

#### 3. Webhook Encryption Handler
**File:** `/wedsync/src/lib/webhooks/encrypted-webhook.ts`
```typescript
export class EncryptedWebhookHandler {
  async sendEncryptedWebhook(
    url: string,
    payload: any,
    recipientPublicKey?: string
  ): Promise<void> {
    // Encrypt payload
    const encryptedPayload = await this.encryptPayload(payload);
    
    // Sign payload for integrity
    const signature = this.signPayload(encryptedPayload);
    
    // Send with encryption headers
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encryption-Algorithm': 'AES-256-GCM',
        'X-Signature': signature,
        'X-Timestamp': Date.now().toString()
      },
      body: JSON.stringify(encryptedPayload)
    });
  }
}
```

#### 4. API Key Encryption Service
**File:** `/wedsync/src/lib/api/key-encryption.ts`
```typescript
export class APIKeyEncryption {
  async storeAPIKey(
    service: string,
    apiKey: string,
    userId: string
  ): Promise<void> {
    const encrypted = await this.encryption.encryptField(
      apiKey,
      process.env.API_KEY_ENCRYPTION_KEY!
    );
    
    await supabase
      .from('api_keys')
      .upsert({
        user_id: userId,
        service,
        encrypted_key: encrypted.encrypted,
        key_salt: encrypted.salt,
        key_iv: encrypted.iv,
        key_tag: encrypted.tag
      });
  }
  
  async retrieveAPIKey(
    service: string,
    userId: string
  ): Promise<string> {
    // Decrypt and return API key
  }
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] API encryption middleware implementation
- [x] Secure route wrapper with encryption
- [x] Webhook encryption handler
- [x] API key encryption service
- [x] Field detection and encryption logic
- [x] Performance monitoring integration
- [x] Rate limiting for encryption ops
- [x] Comprehensive API tests

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
- FROM Team B: FieldEncryption class - Core encryption engine
- FROM Team C: Database encryption methods - For data consistency
- FROM Team D: Security requirements - For compliance

### What other teams NEED from you:
- TO Team A: API status endpoints - For UI indicators
- TO Team C: Middleware integration points - For database sync
- TO All Teams: Secure API wrapper - For endpoint protection

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### API Security Checklist:
- [x] All PII fields auto-encrypted
- [x] No plaintext in request/response logs
- [x] Webhook signatures validated
- [x] API keys never exposed
- [x] Rate limiting enforced
- [x] CORS properly configured
- [x] Security headers present
- [x] Input validation before encryption

### CRITICAL Security Pattern:
```typescript
// EVERY API route MUST use this pattern:
import { withEncryption } from '@/lib/api/secure-route';
import { guestSchema } from '@/lib/validation/schemas';

export const POST = withEncryption(
  guestSchema,
  async (request, decryptedData) => {
    // Your implementation with already-decrypted data
    // Response will be auto-encrypted
  }
);

// NEVER use direct request.json() without encryption middleware!
```

---

## 🎭 API TESTING REQUIREMENTS

```javascript
// Test API encryption
describe('API Encryption Middleware', () => {
  it('should encrypt sensitive fields in requests', async () => {
    const response = await fetch('/api/guests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com', // Should be encrypted
        phone: '+1234567890' // Should be encrypted
      })
    });
    
    // Intercept and check encrypted format
    const dbRecord = await getLastInserted('guest_lists');
    expect(dbRecord.email_encrypted).toBeDefined();
    expect(dbRecord.email).toBeUndefined();
  });
  
  it('should maintain < 20ms encryption overhead', async () => {
    const start = Date.now();
    await encryptionMiddleware.encryptObject(testPayload);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(20);
  });
});

// Playwright API security test
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api-test"});

// Make API call and verify encryption
await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/guests/123');
    const data = await response.json();
    // Verify sensitive fields are masked/encrypted
    return !data.email || data.email === '***ENCRYPTED***';
  }`
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] All API routes using encryption middleware
- [x] Zero PII leakage in logs
- [x] < 20ms encryption overhead
- [x] 100% webhook encryption
- [x] All API keys encrypted

### Evidence Package Required:
- [x] API encryption proof
- [x] Performance benchmark results
- [x] Security audit of all endpoints
- [x] Test coverage report
- [x] Middleware integration proof

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Middleware: `/wedsync/src/middleware/api-encryption.ts`
- API Utils: `/wedsync/src/lib/api/secure-route.ts`
- Webhooks: `/wedsync/src/lib/webhooks/encrypted-webhook.ts`
- Tests: `/wedsync/tests/api-encryption/`
- Types: `/wedsync/src/types/api-encryption.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch23/WS-175-team-e-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY