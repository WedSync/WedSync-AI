# TEAM A - ROUND 1: WS-174 - Authentication Security - MFA Setup UI

**Date:** 2025-01-26  
**Feature ID:** WS-174 (Track all work with this ID)  
**Priority:** P0 (Security critical)  
**Mission:** Build user-friendly MFA setup interface with QR code generation and backup codes display  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier storing sensitive client data  
**I want to:** Strong authentication with multi-factor security  
**So that:** Client personal information and wedding details remain protected from unauthorized access

**Real Wedding Problem This Solves:**  
Wedding suppliers handle sensitive data: guest addresses, dietary requirements, personal photos, vendor contracts. A breach could expose hundreds of guests' personal information, damage supplier reputation, and create legal liability. MFA prevents unauthorized access even if passwords are compromised.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- TOTP app integration (Google Authenticator, Authy)
- QR code display for easy setup
- Backup codes generation and display
- SMS/Email fallback options
- Recovery flow for lost devices

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- MFA: QR Code generation with qrcode.js
- UI: Step-by-step setup wizard
- Security: Secure display of backup codes

**Integration Points:**
- Team B's API: MFA setup and verification endpoints
- Authentication: Supabase Auth integration
- Security: CSRF protection on all forms

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
// 1. LOAD UI STYLE GUIDE:
await mcp__filesystem__read_file({
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"
});

// 2. Load authentication docs:
await Task({
  description: "Load MFA UI documentation",
  prompt: "Use Ref MCP to get docs for: React QR code libraries, form validation with react-hook-form, multi-step forms, secure UI patterns for displaying secrets",
  subagent_type: "Ref MCP-documentation-specialist"
});

// 3. Check existing auth UI:
await Grep({
  pattern: "auth|login|signup|password",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/auth",
  output_mode: "files_with_matches"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Create MFA setup wizard UI"
2. **react-ui-specialist** --think-hard "Build secure forms with validation"
3. **ui-ux-designer** --think-ultra-hard "Design intuitive MFA onboarding flow"
4. **security-compliance-officer** --ui-security "Ensure secure display of secrets"
5. **test-automation-architect** --ui-testing "Test MFA setup flow"
6. **accessibility** --wcag-compliance "Ensure MFA accessible to all users"


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

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Review existing auth components
- Study MFA setup patterns from major apps
- Check accessibility requirements
- Plan user flow from start to completion

### **PLAN PHASE**
- Design step-by-step wizard
- Plan QR code display layout
- Design backup codes presentation
- Create error handling flows

### **CODE PHASE**
- Build MFA setup wizard component
- Implement QR code display
- Create backup codes viewer
- Add verification step

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] MFASetupWizard component with steps
- [ ] QRCodeDisplay component
- [ ] BackupCodesDisplay with download option
- [ ] MFAVerification component
- [ ] Recovery options selector
- [ ] Success/error states

### Code Files to Create:
```typescript
// /wedsync/src/components/auth/MFASetupWizard.tsx
export function MFASetupWizard() {
  const [step, setStep] = useState(1);
  const steps = [
    'Choose Method',
    'Scan QR Code',
    'Enter Verification',
    'Save Backup Codes',
    'Complete'
  ];
  
  // Step-by-step MFA setup flow
}

// /wedsync/src/components/auth/QRCodeDisplay.tsx
import QRCode from 'qrcode.react';

export function QRCodeDisplay({ secret, account }: {
  secret: string;
  account: string;
}) {
  const otpauth = `otpauth://totp/WedSync:${account}?secret=${secret}&issuer=WedSync`;
  
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        Scan with your authenticator app
      </h3>
      <QRCode value={otpauth} size={256} level="H" />
      <p className="mt-4 text-sm text-gray-600">
        Can't scan? Enter manually: 
        <code className="block mt-2 p-2 bg-gray-100 rounded font-mono">
          {secret}
        </code>
      </p>
    </div>
  );
}

// /wedsync/src/components/auth/BackupCodesDisplay.tsx
export function BackupCodesDisplay({ codes }: { codes: string[] }) {
  const downloadCodes = () => {
    const content = codes.join('\\n');
    const blob = new Blob([content], { type: 'text/plain' });
    // Trigger download
  };
  
  return (
    <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">
        ⚠️ Save Your Backup Codes
      </h3>
      <p className="text-sm text-yellow-800 mb-4">
        Store these codes safely. Each can be used once if you lose access.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {codes.map((code, i) => (
          <code key={i} className="p-2 bg-white rounded font-mono text-sm">
            {code}
          </code>
        ))}
      </div>
      <button onClick={downloadCodes} className="btn-primary">
        Download Codes
      </button>
    </div>
  );
}
```

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
- FROM Team B: MFA setup API endpoints (/api/auth/mfa/setup)
- FROM Team B: QR code generation data format

### What other teams NEED from you:
- TO Team B: UI requirements for API responses
- TO Team D: Mobile-friendly MFA components
- TO Team E: Test IDs for MFA flow testing

---

## 🔒 SECURITY REQUIREMENTS

### UI Security Critical:
- [ ] Never log or store backup codes in browser storage
- [ ] Clear sensitive data from memory after display
- [ ] Prevent screenshot on mobile (where possible)
- [ ] Warn users about secure storage
- [ ] No autocomplete on verification codes
- [ ] Session timeout during setup

### Required Security Headers:
```typescript
// All MFA pages must include:
<meta name="robots" content="noindex, nofollow" />
<Helmet>
  <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
</Helmet>
```

---

## 🎭 PLAYWRIGHT MCP TESTING

```javascript
// Test MFA setup flow
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/security"});

// Click setup MFA
await mcp__playwright__browser_click({
  element: "Setup MFA button",
  ref: "button[data-testid='setup-mfa']"
});

// Verify QR code appears
const qrVisible = await mcp__playwright__browser_snapshot();
// Check for QR code element

// Test backup codes display
await mcp__playwright__browser_click({
  element: "Show backup codes",
  ref: "button[data-testid='show-backup-codes']"
});

// Verify download works
await mcp__playwright__browser_click({
  element: "Download codes",
  ref: "button[data-testid='download-codes']"
});

// Test verification input
await mcp__playwright__browser_type({
  element: "Verification code input",
  ref: "input[data-testid='mfa-code']",
  text: "123456"
});
```

---

## ✅ SUCCESS CRITERIA

- [ ] MFA setup completes in <5 clicks
- [ ] QR code displays correctly
- [ ] Backup codes downloadable
- [ ] Verification step works
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Clear error messages
- [ ] Success confirmation shown

---

## 💾 WHERE TO SAVE YOUR WORK

- Components: `/wedsync/src/components/auth/`
- Styles: `/wedsync/src/styles/auth.css`
- Tests: `/wedsync/tests/auth/mfa-setup.test.ts`
- Types: `/wedsync/src/types/auth.ts`

### Team Report Output:
- `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch22/WS-174-team-a-round-1-complete.md`

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] MFA wizard component complete
- [ ] QR code generation working
- [ ] Backup codes display secure
- [ ] Verification flow tested
- [ ] Mobile responsive verified
- [ ] Accessibility validated
- [ ] Documentation updated

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY