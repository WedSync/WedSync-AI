# TEAM D - ROUND 1: WS-194 - Environment Management - Configuration UI Components

**Date:** 2025-01-20  
**Feature ID:** WS-194 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build admin configuration interfaces and environment switching UI components for DevOps teams managing environment validation, secret rotation, and feature flag controls  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync DevOps administrator managing environment configurations during deployment workflows
**I want to:** Intuitive configuration interfaces for environment switching, secret rotation management, and feature flag controls with validation feedback  
**So that:** I can safely manage environment configurations during peak wedding season deployments, quickly switch between development/staging/production environments, schedule secret rotations without service disruption, and control feature flag rollouts to ensure couples maintain access to vendor coordination during critical wedding planning phases

**Real Wedding Problem This Solves:**
During a critical deployment window in peak wedding season, DevOps needs to rotate API keys for payment processing while maintaining service for 200+ couples completing vendor payments. The configuration UI provides clear environment switching between staging validation and production deployment, visual confirmation of secret rotation schedules, and feature flag controls to gradually enable new payment features without disrupting active wedding coordination workflows, ensuring couples can continue making venue deposits and vendor payments without interruption.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Admin configuration interfaces with environment switching, validation status display, and deployment approval workflows
- Secret rotation management with scheduling interface, automated alerts, and rotation history visualization
- Feature flag control panel with environment-specific toggles, rollout percentage controls, and flag lifecycle management
- Environment validation UI with configuration status, validation results, and error resolution guidance
- Configuration management interface with environment comparison, diff viewing, and change approval workflows

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- UI Components: Admin interface patterns, configuration forms, validation feedback systems

**Integration Points:**
- Team A Dashboard: Environment dashboard status displays and validation result interfaces from frontend dashboard
- Team B Validation: Configuration validation results and environment health data from backend validation engine
- Team C Vercel: Deployment status integration and environment configuration from Vercel API integration
- Database: environment_configs, secret_rotation_log, feature_flags, environment_health tables

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
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing admin interface patterns and configuration components:
await mcp__serena__find_symbol("AdminConfig", "", true);
await mcp__serena__get_symbols_overview("src/components/admin");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Track configuration UI development with admin interface patterns and validation workflows"
2. **ui-ux-designer** --think-hard --use-loaded-docs "Design intuitive configuration interfaces with environment management and admin workflows" 
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Create configuration UI components with form validation and admin interface patterns"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Validate configuration UI security and admin access controls"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Design comprehensive testing for configuration interfaces and admin workflows"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab "Test configuration UI with admin workflows and validation scenarios" --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style "Ensure configuration components follow established admin UI patterns and form standards"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing admin interface components and configuration form patterns
- Understand environment management UI requirements and admin workflow patterns
- Check integration patterns with validation systems and environment switching functionality
- Review similar implementations in admin configuration interfaces and DevOps tools
- Continue until you FULLY understand the admin configuration architecture and environment management UI

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for configuration UI with environment switching and admin workflows
- Write test cases FIRST (TDD) for configuration components, form validation, and environment switching scenarios
- Plan error handling for configuration failures, validation errors, and environment connection issues
- Consider edge cases like invalid configurations, environment timeouts, and form validation failures
- Design admin-focused interface optimized for DevOps workflows and configuration management tasks

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation for configuration components and admin interface functionality
- Follow existing admin UI patterns and configuration form component library
- Use Ref MCP examples for admin interfaces, form validation, and configuration management
- Implement with parallel agents focusing on intuitive configuration workflows and admin usability
- Focus on configuration accuracy and admin workflow efficiency, not development speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including configuration UI tests and admin interface functionality
- Verify with Playwright for admin workflows, configuration scenarios, and responsive design
- Create evidence package showing configuration UI functionality, validation workflows, and admin interfaces
- Generate reports on configuration management usability, form validation accuracy, and admin workflow efficiency
- Only mark complete when configuration UI provides comprehensive admin environment management

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] **EnvironmentSwitcher component** with environment selection, status display, and deployment context switching for admin workflows
- [ ] **ConfigurationForm component** with environment variable management, validation feedback, and configuration editing interface
- [ ] **SecretRotationManager component** with rotation scheduling, status monitoring, and automated alert configuration
- [ ] **FeatureFlagControls component** with environment-specific toggles, rollout percentage controls, and flag lifecycle management
- [ ] **ValidationFeedback component** displaying configuration validation results with error messages and resolution guidance
- [ ] **EnvironmentComparison component** with side-by-side configuration viewing and diff highlighting for change management
- [ ] **DeploymentApproval component** with configuration review, validation status, and deployment authorization interface
- [ ] **Configuration history tracking** with change logging, rollback capabilities, and audit trail display
- [ ] **Unit tests >80% coverage** for all configuration components with form validation and admin workflow scenarios
- [ ] **Basic Playwright tests** for admin interface navigation, configuration workflows, and responsive design

### Admin Interface Features:
- [ ] **Environment switching interface** with clear status indicators and deployment context awareness
- [ ] **Configuration validation UI** with real-time feedback, error highlighting, and resolution suggestions
- [ ] **Secret management interface** with rotation scheduling, security controls, and audit logging
- [ ] **Feature flag management** with environment-specific controls and rollout monitoring

### Database Integration:
- [ ] **Supabase integration** for environment_configs, secret_rotation_log, feature_flags, environment_health tables
- [ ] **Configuration data management** with form validation, error handling, and loading states for admin interface
- [ ] **Real-time updates** for configuration changes and environment status updates in admin interface

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
- FROM Team A: Environment dashboard status interfaces and validation result display components - Required for admin UI integration
- FROM Team B: Configuration validation results and environment health data - Required for UI status displays  
- FROM Team C: Vercel deployment status and environment configuration data - Required for deployment management interface

### What other teams NEED from you:
- TO Team A: Configuration UI component contracts and admin interface patterns - They need this for dashboard integration
- TO Team B: Admin UI requirements and configuration management workflows - Required for their validation engine design
- TO Team E: Configuration UI test interfaces and admin workflow scenarios - Required for their comprehensive testing framework

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR CONFIGURATION UI

**EVERY configuration component MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN FOR CONFIGURATION UI):
import { withSecureAdminAccess } from '@/lib/validation/middleware';
import { environmentConfigSchema } from '@/lib/validation/schemas';

// Configuration UI with proper admin security validation
export const ConfigurationForm = withSecureAdminAccess(
  ['admin', 'devops'], // Required roles for configuration management
  async (user: AdminUser) => {
    // User is validated admin with configuration access
    // Configuration UI implementation here
  }
);
```

### SECURITY CHECKLIST FOR CONFIGURATION UI

Teams MUST implement ALL of these for EVERY configuration component:

- [ ] **Admin Authentication**: Use existing middleware with admin/DevOps role validation for configuration access
- [ ] **Configuration Access Control**: MANDATORY role-based access for environment configuration and secret management
- [ ] **Rate Limiting**: Configuration API calls must respect admin tier rate limits - DO NOT bypass
- [ ] **CSRF Protection**: All configuration forms use CSRF tokens - automatic via middleware
- [ ] **Input Sanitization**: All configuration data uses proper validation - see `/src/lib/security/input-validation.ts`
- [ ] **Secret Protection**: NEVER display actual secret values in UI - show masked/hashed versions only
- [ ] **Audit Logging**: All configuration changes logged with admin user identification - use existing audit framework
- [ ] **Session Security**: Admin configuration sessions have enhanced security and timeout validation
- [ ] **Error Handling**: NEVER expose internal configuration details or system architecture in error messages

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// Configuration UI testing with admin workflow validation
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/environment-config"});
const configurationStructure = await mcp__playwright__browser_snapshot();

// Test environment switching with status validation
await mcp__playwright__browser_click({
  element: "staging environment option",
  ref: "[data-testid='env-switch-staging']"
});

await mcp__playwright__browser_wait_for({text: "Environment: Staging"});

// Test configuration form with validation feedback
await mcp__playwright__browser_type({
  element: "database URL input", 
  ref: "[data-testid='config-database-url']",
  text: "postgresql://invalid-url"
});

await mcp__playwright__browser_click({
  element: "validate configuration button",
  ref: "[data-testid='validate-config-btn']"
});

await mcp__playwright__browser_wait_for({text: "Validation failed"});

// Test secret rotation scheduling interface
await mcp__playwright__browser_click({
  element: "secret rotation tab",
  ref: "[data-testid='rotation-tab']"
});

await mcp__playwright__browser_click({
  element: "schedule rotation button",
  ref: "[data-testid='schedule-rotation-btn']"
});

// Verify configuration UI functionality and admin workflows
const configurationData = await mcp__playwright__browser_evaluate({
  function: `() => ({
    currentEnvironment: document.querySelector('[data-testid="current-env"]')?.textContent,
    validationStatus: document.querySelector('[data-testid="validation-status"]')?.textContent,
    configurationCount: document.querySelectorAll('[data-testid="config-item"]').length,
    errorMessages: document.querySelectorAll('[data-testid="validation-error"]').length
  })`
});

// Test responsive design for admin workflows
for (const width of [1200, 1440, 1920]) {
  await mcp__playwright__browser_resize({width, height: 900});
  await mcp__playwright__browser_take_screenshot({filename: `config-ui-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Configuration UI navigation with environment switching and status validation (accessibility tree validation)
- [ ] Admin form validation with error handling and configuration feedback (complex form workflow)
- [ ] Secret rotation management with scheduling interface and security controls (time-based functionality)
- [ ] Feature flag controls with environment-specific management and rollout configuration (state management)
- [ ] Zero console errors during configuration UI interactions and admin workflows (error monitoring)
- [ ] Responsive design optimized for admin workflows and DevOps scenarios (1200px+)


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
- [ ] All Round 1 deliverables complete with configuration UI and admin interface functionality
- [ ] Tests written FIRST and passing (>80% coverage) for configuration components and admin workflows
- [ ] Playwright tests validating configuration management workflows and admin interface usability  
- [ ] Zero TypeScript errors in configuration components and admin interface systems
- [ ] Zero console errors during configuration UI interactions and environment management scenarios

### Integration & Performance:
- [ ] Real-time integration with configuration validation systems and environment status updates
- [ ] Performance targets met (<2s configuration UI load, <500ms form validation response)
- [ ] Accessibility validation passed for configuration interface and admin workflow components
- [ ] Security requirements met with admin access control and configuration change audit logging
- [ ] Responsive design works optimally for admin workflows and DevOps management scenarios (1200px+)

### Evidence Package Required:
- [ ] Screenshot proof of working configuration UI with environment switching and admin workflows
- [ ] Playwright test results showing configuration management workflows and validation scenarios
- [ ] Performance metrics for configuration UI load times and form validation response times
- [ ] Console error-free proof during configuration UI interactions and admin workflow scenarios  
- [ ] Test coverage report >80% for configuration components and admin interface functionality

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/admin/config/`
  - `EnvironmentSwitcher.tsx` - Environment selection and switching interface
  - `ConfigurationForm.tsx` - Environment configuration management form
  - `SecretRotationManager.tsx` - Secret rotation scheduling interface
  - `FeatureFlagControls.tsx` - Feature flag management controls
  - `ValidationFeedback.tsx` - Configuration validation results display
  - `EnvironmentComparison.tsx` - Configuration comparison interface
  - `DeploymentApproval.tsx` - Deployment authorization interface
- Configuration Logic: `/wedsync/src/lib/admin/`
  - `config-management.ts` - Configuration management utilities
  - `environment-switching.ts` - Environment switching functionality
  - `validation-ui.ts` - UI validation helper functions
- Tests: `/wedsync/tests/admin-config/`
  - `configuration-ui.test.tsx` - Configuration component tests
  - `admin-workflows.test.ts` - Admin interface workflow tests
- E2E Tests: `/wedsync/tests/e2e/`
  - `admin-configuration.spec.ts` - Admin configuration workflow tests

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch28/WS-194-team-d-round-1-complete.md`
- **Include:** Feature ID (WS-194) AND team identifier in all filenames  
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-194 | ROUND_1_COMPLETE | team-d | batch28" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (Team A dashboard, Team B validation, Team C Vercel)
- Do NOT skip tests - write them FIRST before configuration UI implementation
- Do NOT ignore admin security requirements - use existing security middleware for configuration access
- Do NOT claim completion without evidence of working configuration UI and admin workflows
- REMEMBER: All 5 teams work in PARALLEL on same features - complete Round 1 before others start Round 2
- CRITICAL: Configuration UI must handle sensitive environment data - implement proper security and masking

---

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Configuration UI components complete with environment switching and admin workflow functionality
- [ ] Secret rotation management, feature flag controls, and deployment approval interfaces working
- [ ] Configuration validation feedback with error handling and resolution guidance implemented
- [ ] Tests written FIRST and passing >80% coverage for configuration UI and admin interface functionality
- [ ] Security validation with admin access control and configuration change audit logging
- [ ] Integration contracts defined for Team A dashboard, Team B validation, and Team C deployment data
- [ ] Configuration UI code committed to correct paths with proper admin interface component organization
- [ ] Round 1 completion report created with evidence package and configuration UI functionality proof

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY