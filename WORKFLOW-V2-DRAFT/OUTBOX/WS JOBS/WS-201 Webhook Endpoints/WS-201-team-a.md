# TEAM A - ROUND 1: WS-201 - Webhook Endpoints
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Design and implement comprehensive frontend dashboard for webhook management with real-time monitoring, endpoint configuration, and delivery analytics
**FEATURE ID:** WS-201 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating intuitive webhook management interface for wedding suppliers managing external integrations

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/webhooks/WebhookDashboard.tsx
ls -la $WS_ROOT/wedsync/src/components/webhooks/EndpointConfiguration.tsx
ls -la $WS_ROOT/wedsync/src/components/webhooks/DeliveryMonitor.tsx
cat $WS_ROOT/wedsync/src/components/webhooks/WebhookDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test webhook
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

// Query webhook and integration components
await mcp__serena__search_for_pattern("webhook.*component");
await mcp__serena__find_symbol("DashboardLayout", "", true);
await mcp__serena__get_symbols_overview("src/components/integrations");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide based on feature type
// General SaaS UI (Most features):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("React webhook dashboard components");
await mcp__Ref__ref_search_documentation("real-time monitoring React components");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Webhook dashboard needs to handle complex workflow: endpoint registration, event subscription management, real-time delivery monitoring, retry handling, and dead letter queue management. Wedding suppliers need to see: 1) Webhook endpoint status and health, 2) Real-time delivery success/failure rates, 3) Event subscription configuration for client events, 4) Troubleshooting tools for failed deliveries, 5) Integration with photography CRMs and booking systems.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down webhook dashboard components
2. **react-ui-specialist** - Use Serena for React webhook patterns  
3. **security-compliance-officer** - Ensure webhook security display
4. **code-quality-guardian** - Maintain component standards
5. **test-automation-architect** - Comprehensive UI testing
6. **documentation-chronicler** - Evidence-based documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### WEBHOOK UI SECURITY CHECKLIST:
- [ ] **Secret key masking** - Never display webhook secrets in full
- [ ] **URL validation** - Validate webhook URLs are HTTPS
- [ ] **Input sanitization** - Sanitize all form inputs
- [ ] **Error message sanitization** - Don't expose sensitive error details
- [ ] **Rate limiting display** - Show rate limiting status safely
- [ ] **Access control** - Only show webhooks owned by current supplier

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone webhook pages without navigation integration**
**✅ MANDATORY: Webhook Dashboard must connect to supplier navigation**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Supplier dashboard navigation link added
- [ ] Mobile navigation support verified  
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs updated: Dashboard > Integrations > Webhooks
- [ ] Accessibility labels for navigation items

```typescript
// MUST update supplier dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/integrations/layout.tsx
// Add navigation item following existing pattern:
{
  title: "Webhooks",
  href: "/integrations/webhooks",
  icon: Webhook
}
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI RESPONSIBILITIES:**
- React components for webhook management dashboard
- Real-time monitoring with responsive design (375px, 768px, 1920px)
- Untitled UI + Magic UI components for consistent styling
- Form validation for webhook configuration
- Accessibility compliance for supplier users
- Component performance <200ms for dashboard updates

### SPECIFIC DELIVERABLES FOR WS-201:

1. **WebhookDashboard Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/webhooks/WebhookDashboard.tsx
interface WebhookDashboardProps {
  webhookEndpoints: WebhookEndpoint[];
  deliveryMetrics: DeliveryMetrics[];
  eventTypes: WebhookEventType[];
}

// Key features to implement:
// - Overview of all webhook endpoints with status indicators
// - Real-time delivery metrics with success/failure charts
// - Quick actions for endpoint management
// - Recent delivery log with filtering capabilities
```

2. **EndpointConfiguration Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/webhooks/EndpointConfiguration.tsx
interface EndpointConfigurationProps {
  endpoint?: WebhookEndpoint;
  availableEvents: WebhookEventType[];
  onSave: (config: WebhookConfig) => Promise<void>;
  onTest: (url: string) => Promise<TestResult>;
}

// Key features to implement:
// - URL validation and HTTPS enforcement
// - Event subscription management with wedding-specific events
// - Test endpoint functionality with real payload
// - Security settings (IP whitelist, retry configuration)
```

3. **DeliveryMonitor Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/webhooks/DeliveryMonitor.tsx
interface DeliveryMonitorProps {
  endpointId: string;
  deliveries: WebhookDelivery[];
  deadLetterQueue: FailedDelivery[];
  onRetry: (deliveryId: string) => Promise<void>;
}

// Key features to implement:
// - Real-time delivery status updates
// - Failed delivery troubleshooting tools
// - Manual retry functionality
// - Dead letter queue management
```

4. **EventSubscriptionManager Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/webhooks/EventSubscriptionManager.tsx
interface EventSubscriptionManagerProps {
  currentSubscriptions: string[];
  availableEvents: WebhookEventType[];
  vendorType: string;
  onUpdateSubscriptions: (events: string[]) => Promise<void>;
}

// Key features to implement:
// - Wedding industry event categorization
// - Vendor-specific event filtering
// - Event preview with sample payloads
// - Subscription impact analysis
```

## 📋 TECHNICAL SPECIFICATION FROM WS-201

**User Story Context:** Wedding photography suppliers with custom CRMs need instant notifications when couples submit forms, update wedding details, or complete journeys for seamless integration.

**Key Business Requirements:**
- Real-time webhook delivery for critical wedding events
- HMAC-SHA256 signature validation for security
- Exponential backoff retry logic with dead letter queue
- Integration monitoring for photography/venue booking systems
- Wedding season scalability (200+ notifications daily)

**Wedding Industry Context:**
- Client creation, form submission, journey completion events
- Photography studio CRM integrations
- Venue booking system notifications
- Email marketing platform triggers
- Custom wedding planner application integrations

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Component Implementation:
- [ ] WebhookDashboard main container with real-time updates
- [ ] EndpointConfiguration with URL validation and testing
- [ ] DeliveryMonitor with retry and troubleshooting tools
- [ ] EventSubscriptionManager with wedding-specific events
- [ ] Integration with supplier dashboard navigation
- [ ] Responsive design for mobile supplier access

### Component Features:
- [ ] Real-time webhook delivery status monitoring
- [ ] HTTPS URL validation and security indicators
- [ ] Wedding event categorization and filtering
- [ ] Failed delivery troubleshooting interface
- [ ] Manual retry functionality for failed webhooks
- [ ] Dead letter queue management interface
- [ ] Test endpoint functionality with sample payloads

### UI/UX Requirements:
- [ ] Loading states for all async operations
- [ ] Error boundaries for component isolation
- [ ] Accessibility compliance (ARIA labels, keyboard navigation)
- [ ] Mobile-responsive design (375px minimum width)
- [ ] Real-time updates without page refresh
- [ ] Intuitive error messaging for suppliers

## 💾 WHERE TO SAVE YOUR WORK
- Code: $WS_ROOT/wedsync/src/components/webhooks/
- Tests: $WS_ROOT/wedsync/src/components/webhooks/__tests__/
- Types: $WS_ROOT/wedsync/src/types/webhooks.ts
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-201-team-a-round-1-complete.md

## 🏁 COMPLETION CHECKLIST
- [ ] WebhookDashboard component created and functional
- [ ] EndpointConfiguration with validation and testing
- [ ] DeliveryMonitor with real-time updates
- [ ] EventSubscriptionManager for wedding events
- [ ] Supplier navigation integration complete
- [ ] Responsive design tested (375px, 768px, 1920px)
- [ ] TypeScript compilation successful
- [ ] All component tests passing
- [ ] Accessibility requirements implemented
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for webhook dashboard implementation!**