# TEAM A - ROUND 1: WS-175 - Advanced Data Encryption - Frontend Encryption UI Components

**Date:** 2025-01-26  
**Feature ID:** WS-175 (Track all work with this ID)
**Priority:** P0 - Critical Security Feature
**Mission:** Build comprehensive frontend encryption status indicators and management interfaces for field-level encryption visibility  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier storing guest personal information
**I want to:** Visual confirmation that sensitive data is encrypted
**So that:** I have confidence that guest privacy is protected and can demonstrate compliance

**Real Wedding Problem This Solves:**
Wedding suppliers handle extremely sensitive guest data including dietary restrictions, health information, contact details, and personal preferences. Without clear encryption indicators, suppliers can't verify data protection status, leading to compliance anxiety and potential GDPR violations. This feature provides visual confirmation and management tools for encryption.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Field-level encryption for PII (email, phone, address)
- AES-256-GCM encryption algorithm
- Visual indicators for encrypted fields
- Key rotation management interface
- Encryption status dashboard
- Performance impact < 10ms

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Encryption: Node.js crypto module, Web Crypto API
- Icons: Lucide React for encryption indicators
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Field Encryption Service: /src/lib/encryption/field-encryption.ts
- Key Management: /src/lib/encryption/key-management.ts
- Secure Storage: /src/lib/encryption/secure-storage.ts
- Database: encryption_keys table


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
// 1. LOAD UI STYLE GUIDE FOR SECURITY COMPONENTS:
await mcp__filesystem__read_file({ path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md" });

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
  library: "/vercel/next.js", 
  topic: "security headers middleware", 
  maxTokens: 3000 
});

await mcp__Ref__ref_get_library_docs({ 
  library: "/tailwindlabs/tailwindcss", 
  topic: "form security styling", 
  maxTokens: 2000 
});

// 3. Review existing security patterns:
await mcp__filesystem__search_files({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src",
  pattern: "encryption"
});

await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/security/input-validation.ts" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

**NOW launch agents with security focus:**

1. **task-tracker-coordinator** --security-critical "Track WS-175 encryption UI components"
2. **react-ui-specialist** --accessibility-first "Build encryption status indicators"
3. **security-compliance-officer** --gdpr-focus "Validate encryption UI compliance"
4. **test-automation-architect** --security-testing "Create encryption UI tests"
5. **code-quality-guardian** --security-patterns "Ensure secure coding standards"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Review existing form components for encryption integration points
- Understand current security UI patterns
- Check accessibility requirements for security indicators
- Identify all PII fields needing encryption status

### **PLAN PHASE**
- Design encryption status indicator component
- Plan key management interface layout
- Create encryption dashboard mockup
- Define accessibility patterns for security UI

### **CODE PHASE**
Create these components:

#### 1. Encryption Status Indicator Component
**File:** `/wedsync/src/components/encryption/EncryptionIndicator.tsx`
```typescript
'use client';

import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EncryptionIndicatorProps {
  isEncrypted: boolean;
  fieldName: string;
  encryptionType?: 'field' | 'file' | 'database';
  showDetails?: boolean;
}

export function EncryptionIndicator({
  isEncrypted,
  fieldName,
  encryptionType = 'field',
  showDetails = false
}: EncryptionIndicatorProps) {
  // Implementation with proper accessibility
}
```

#### 2. Encryption Status Dashboard
**File:** `/wedsync/src/components/encryption/EncryptionDashboard.tsx`
```typescript
'use client';

export function EncryptionDashboard() {
  // Show encryption status for all data types
  // Key rotation status
  // Compliance indicators
}
```

#### 3. Key Management Interface
**File:** `/wedsync/src/components/encryption/KeyManagement.tsx`
```typescript
'use client';

export function KeyManagement() {
  // Key rotation controls
  // Key health status
  // Emergency key recovery
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] EncryptionIndicator component with accessibility
- [x] EncryptionDashboard with real-time status
- [x] KeyManagement interface skeleton
- [x] Integration with existing form fields
- [x] Visual feedback for encryption operations
- [x] Loading states for encryption processes
- [x] Error handling UI for encryption failures
- [x] Playwright tests for all components

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
- FROM Team B: Encryption engine API contract - Required for status checks
- FROM Team E: Encryption middleware endpoints - Required for field indicators

### What other teams NEED from you:
- TO Team C: Encryption UI components - They need for storage interface
- TO Team D: Status indicator patterns - Required for security validation
- TO Team E: Component exports - Needed for API integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Encryption UI Security Checklist:
- [x] No encryption keys displayed in UI
- [x] Secure WebSocket for status updates
- [x] CSP headers for crypto operations
- [x] Sanitize all status messages
- [x] Rate limit status checks
- [x] Audit log all key operations
- [x] Session validation for management UI
- [x] ARIA security announcements

---

## 🎭 PLAYWRIGHT MCP TESTING

```javascript
// Test encryption indicators
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/security"});

// Verify encryption status display
const snapshot = await mcp__playwright__browser_snapshot();

// Test key rotation UI
await mcp__playwright__browser_click({
  element: "Rotate encryption keys button",
  ref: "rotate-keys-btn"
});

// Verify secure WebSocket connection
const requests = await mcp__playwright__browser_network_requests();
const wsConnections = requests.filter(r => r.url.includes('wss://'));

// Test accessibility
await mcp__playwright__browser_evaluate({
  function: `() => {
    const indicators = document.querySelectorAll('[role="status"][aria-label*="encryption"]');
    return indicators.length > 0 && Array.from(indicators).every(i => i.getAttribute('aria-live') === 'polite');
  }`
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] All encryption indicators functional
- [x] Real-time status updates working
- [x] Accessibility standards met (WCAG 2.1 AA)
- [x] Performance < 10ms render time
- [x] Zero console errors

### Evidence Package Required:
- [x] Screenshot of encryption dashboard
- [x] Video of key rotation UI
- [x] Playwright test results
- [x] Accessibility audit report
- [x] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/encryption/`
- Hooks: `/wedsync/src/hooks/useEncryption.ts`
- Styles: `/wedsync/src/styles/encryption.css`
- Tests: `/wedsync/tests/encryption/`
- Types: `/wedsync/src/types/encryption.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch23/WS-175-team-a-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY