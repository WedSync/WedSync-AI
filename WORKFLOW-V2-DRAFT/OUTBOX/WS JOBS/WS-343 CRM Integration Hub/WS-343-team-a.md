# TEAM A - ROUND 1: WS-343 - CRM Integration Hub Frontend
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the comprehensive CRM Integration Dashboard UI with provider setup wizards, field mapping interface, and real-time sync monitoring
**FEATURE ID:** WS-343 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about making CRM integration feel effortless and trustworthy for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/crm/
cat $WS_ROOT/wedsync/src/components/crm/CRMIntegrationDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test crm-integration
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

// Query existing dashboard patterns
await mcp__serena__search_for_pattern("Dashboard.*Component|IntegrationCard|ProviderCard");
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("src/components/dashboard/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/.claude/UNIFIED-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load CRM integration and dashboard documentation
mcp__Ref__ref_search_documentation("React dashboard components integration UI patterns drag drop field mapping");
mcp__Ref__ref_search_documentation("CRM integration user interface OAuth flows authentication");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This CRM Integration Hub needs to handle 9+ different CRM providers, each with different auth flows (OAuth2, API key, screen scraping). The UI must make complex field mapping feel simple and trustworthy for wedding suppliers who fear data loss.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down CRM UI components, track dependencies
2. **react-ui-specialist** - Use Serena for consistent React patterns  
3. **security-compliance-officer** - Ensure secure credential handling in UI
4. **code-quality-guardian** - Maintain Untitled UI standards
5. **test-automation-architect** - Comprehensive UI testing
6. **documentation-chronicler** - Document CRM integration workflows

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### UI SECURITY CHECKLIST:
- [ ] **Never display raw API keys or passwords** - Mask all sensitive fields
- [ ] **OAuth redirect validation** - Validate all OAuth callback URLs  
- [ ] **Secure form submission** - All forms use CSRF protection
- [ ] **Input sanitization** - All user input sanitized and validated
- [ ] **Error message safety** - Never expose backend errors to UI
- [ ] **Session validation** - Check authentication state on sensitive operations
- [ ] **Rate limiting feedback** - Show appropriate messages for rate limits
- [ ] **Audit trail UI** - Log all integration configuration changes

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone pages without navigation integration**
**✅ MANDATORY: All dashboards, pages, and components must connect to parent navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Main navigation link: "Integrations" under "Settings" section
- [ ] Mobile navigation hamburger support with collapsible menu  
- [ ] Active navigation state for /integrations/* routes
- [ ] Breadcrumbs: Home > Settings > Integrations > [Provider]
- [ ] Accessibility: aria-label="CRM Integrations" for nav items

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI REQUIREMENTS:**
- React components with TypeScript strict mode
- Responsive design (375px mobile, 768px tablet, 1920px desktop)
- Untitled UI + Magic UI components exclusively
- Form validation with real-time feedback
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms render time

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Context
**User:** Sarah, a photographer with 200+ clients in Tave spanning 3 years
**Pain:** Fears losing data, can't afford manual re-entry, needs to maintain existing workflows
**Solution:** One-click import with visual progress, field mapping that makes sense to photographers
**Success:** "I imported 3 years of client data in 15 minutes and didn't lose anything!"

### Core UI Components to Build

#### 1. CRM Integration Dashboard (Main Component)
```typescript
interface CRMIntegrationDashboardProps {
  supplierId: string;
  onIntegrationCreated?: (integration: CRMIntegration) => void;
}

// Features Required:
// - Overview stats cards (Active Integrations, Last Sync, Total Records)
// - List of connected integrations with status badges
// - Quick action buttons (Sync Now, Configure, View Logs)
// - Integration health monitoring
// - Empty state with call-to-action
```

#### 2. CRM Provider Selection Wizard
```typescript
interface CRMProviderWizardProps {
  onProviderSelected: (provider: CRMProvider) => void;
  availableProviders: CRMProvider[];
}

// Features Required:
// - Visual provider cards with logos and descriptions  
// - Provider feature comparison matrix
// - "Most Popular" badges for Tave, Light Blue, HoneyBook
// - Quick setup vs Advanced configuration options
// - Support links and documentation for each provider
```

#### 3. OAuth Flow Handler
```typescript
interface OAuthFlowHandlerProps {
  provider: CRMProvider;
  onAuthSuccess: (authConfig: Record<string, any>) => void;
  onAuthError: (error: string) => void;
}

// Features Required:
// - Secure popup window handling
// - Progress indicators during OAuth flow
// - Error handling with clear recovery steps
// - Mobile-friendly OAuth (fallback to redirect)
// - Connection test after successful auth
```

#### 4. Field Mapping Interface
```typescript
interface FieldMappingInterfaceProps {
  crmProvider: CRMProvider;
  wedsyncFields: FieldDefinition[];
  crmFields: FieldDefinition[];
  currentMappings: CRMFieldMapping[];
  onMappingsUpdated: (mappings: CRMFieldMapping[]) => void;
}

// Features Required:
// - Drag-and-drop field mapping
// - Visual connection lines between mapped fields
// - Field type validation with warnings
// - Required field highlighting
// - Sample data preview for transformations
// - Quick setup with intelligent defaults
```

#### 5. Sync Status Monitor
```typescript
interface SyncStatusMonitorProps {
  integration: CRMIntegration;
  currentSyncJob?: CRMSyncJob;
  syncLogs: CRMSyncLog[];
}

// Features Required:
// - Real-time progress bar with percentage
// - Records processed counter with estimates
// - Detailed log viewer with filtering
// - Error detection with actionable solutions
// - Sync history timeline
// - Manual sync trigger controls
```

### Wedding Industry UI Considerations

#### Trust & Safety Indicators
- Visual SSL/security badges during setup
- "Your data is encrypted" messaging
- Progress indicators that show what's happening
- Rollback options clearly visible
- "Test connection" buttons for reassurance

#### Wedding Supplier Language
- Use "clients" not "contacts" or "leads"
- "Wedding date" not "event date"
- "Venue information" not "location data"  
- "Guest list" not "attendees"
- Progress messages: "Importing Sarah & Mike's wedding details..."

#### Error Prevention
- Field validation with photography/wedding examples
- "Are you sure?" dialogs for destructive actions
- Auto-save form progress to prevent data loss
- Clear recovery instructions for common issues

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Components (PRIORITY 1)
- [ ] CRMIntegrationDashboard component with overview stats
- [ ] CRMProviderCard component with provider branding
- [ ] CRMIntegrationCard component with status monitoring
- [ ] Provider selection wizard with visual provider comparison

### Integration Setup Flow (PRIORITY 2) 
- [ ] OAuth popup handler with secure token exchange
- [ ] API key configuration form with validation
- [ ] Connection test interface with clear success/failure states
- [ ] Field mapping drag-and-drop interface

### Monitoring & Management (PRIORITY 3)
- [ ] Real-time sync progress component
- [ ] Sync history viewer with filtering
- [ ] Integration settings management
- [ ] Error display with recovery actions

## 💾 WHERE TO SAVE YOUR WORK

**Component Files:**
- `$WS_ROOT/wedsync/src/components/crm/CRMIntegrationDashboard.tsx`
- `$WS_ROOT/wedsync/src/components/crm/CRMProviderWizard.tsx` 
- `$WS_ROOT/wedsync/src/components/crm/CRMIntegrationCard.tsx`
- `$WS_ROOT/wedsync/src/components/crm/FieldMappingInterface.tsx`
- `$WS_ROOT/wedsync/src/components/crm/SyncStatusMonitor.tsx`

**Page Files:**
- `$WS_ROOT/wedsync/src/app/dashboard/integrations/page.tsx`
- `$WS_ROOT/wedsync/src/app/dashboard/integrations/[id]/page.tsx`

**Type Definitions:**
- `$WS_ROOT/wedsync/src/types/crm.ts`

**Styles:**
- Use Tailwind classes exclusively
- Follow Untitled UI spacing and color patterns

## 🧪 TESTING REQUIREMENTS

### Unit Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/src/components/crm/__tests__/CRMIntegrationDashboard.test.tsx
$WS_ROOT/wedsync/src/components/crm/__tests__/FieldMappingInterface.test.tsx
$WS_ROOT/wedsync/src/components/crm/__tests__/SyncStatusMonitor.test.tsx
```

### Testing Scenarios
- [ ] Render dashboard with no integrations (empty state)
- [ ] Display integration cards with different statuses
- [ ] Handle OAuth callback success and error states
- [ ] Validate field mapping drag-and-drop functionality
- [ ] Test real-time sync progress updates
- [ ] Mobile responsiveness on iPhone SE (375px)

## 🏁 COMPLETION CHECKLIST

### Technical Implementation
- [ ] All components created and compile without errors
- [ ] TypeScript strict mode compliance (no 'any' types)
- [ ] Untitled UI components used exclusively
- [ ] Responsive design tested on 3 breakpoints
- [ ] All forms have validation and error handling

### Security & Integration
- [ ] Navigation integration complete with breadcrumbs
- [ ] OAuth flow secure with proper popup handling
- [ ] Sensitive data masked in UI (API keys, tokens)
- [ ] CSRF protection on all forms
- [ ] Error messages don't expose backend details

### Wedding Context
- [ ] Language uses wedding industry terms
- [ ] Error messages reference real wedding scenarios
- [ ] UI builds trust through security indicators
- [ ] Field mapping uses photography examples
- [ ] Progress messages reference actual client data

### Testing & Evidence
- [ ] Unit tests passing with >90% coverage
- [ ] Responsive design tested on mobile
- [ ] OAuth flow tested with sample provider
- [ ] Field mapping interface user tested
- [ ] Integration dashboard performance optimized

---

**EXECUTE IMMEDIATELY - Build the CRM Integration Hub that makes data migration fears disappear for wedding suppliers!**