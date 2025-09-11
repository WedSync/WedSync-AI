# TEAM C - ROUND 1: WS-216 - Auto-Population System
## 2025-01-29 - Development Round 1

**YOUR MISSION:** Build the integration infrastructure for the auto-population system that connects with external vendor forms, manages real-time data synchronization, and handles form field mapping intelligence across different supplier platforms
**FEATURE ID:** WS-216 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about cross-platform form integration, intelligent field detection, and reliable data flow between vendor systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/
ls -la $WS_ROOT/wedsync/src/lib/webhooks/
cat $WS_ROOT/wedsync/src/lib/integrations/form-detection-service.ts | head -20
cat $WS_ROOT/wedsync/src/lib/webhooks/vendor-form-webhook.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **INTEGRATION TESTS:**
```bash
npm test integration/auto-population
# MUST show: "All tests passing"
```

4. **WEBHOOK ENDPOINTS:**
```bash
curl -X POST http://localhost:3000/api/webhooks/vendor-forms/detect -H "Content-Type: application/json" -d '{"test": true}'
# MUST respond with proper webhook validation
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing integration and webhook patterns
await mcp__serena__search_for_pattern("webhook|integration|external.*api");
await mcp__serena__find_symbol("webhook", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__get_symbols_overview("src/lib/webhooks");
```

### B. INTEGRATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understanding existing integration architecture
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/app/api/webhooks");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to webhook handling, form parsing, and third-party integrations
# Use Ref MCP to search for webhook security, form processing, and data synchronization
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions around integration systems
mcp__sequential-thinking__sequential_thinking({
  thought: "The auto-population integration system is complex. Key challenges: 1) Form Detection - how to automatically detect when suppliers create new forms? Need webhooks or polling. 2) Field Analysis - parse HTML/PDF forms to extract field names, types, labels. 3) Cross-platform compatibility - different form builders (Google Forms, Typeform, custom HTML). 4) Real-time sync - update mappings when forms change. 5) Vendor Authentication - secure access to form data. The hardest part is form detection across different platforms - I need a unified interface.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration system development
2. **integration-specialist** - Focus on third-party service connections  
3. **security-compliance-officer** - Ensure webhook security and data protection
4. **api-architect** - Design webhook endpoints and integration APIs
5. **test-automation-architect** - Comprehensive integration testing
6. **documentation-chronicler** - Document integration patterns and vendor setup

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **Webhook Signature Validation** - Cryptographic verification of all incoming webhooks
- [ ] **API Key Management** - Secure storage and rotation of vendor API keys
- [ ] **Data Encryption** - All vendor data encrypted in transit and at rest
- [ ] **Access Control** - Vendor-specific permissions and data isolation
- [ ] **Rate Limiting** - Prevent webhook flooding and API abuse
- [ ] **Input Sanitization** - All external form data sanitized and validated
- [ ] **Audit Logging** - Complete trail of all integration activities
- [ ] **Error Handling** - No sensitive data in error responses
- [ ] **Timeout Protection** - Prevent hanging integrations from affecting system

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION FOCUS:**
- Third-party service integration
- Real-time data synchronization
- Webhook handling and processing
- Data flow between systems
- Integration health monitoring
- Failure handling and recovery
- Cross-platform form parsing
- Vendor API management
- Field mapping intelligence
- Data transformation pipelines

## 📋 WS-216 TECHNICAL SPECIFICATION - INTEGRATION SYSTEMS

### REAL WEDDING SCENARIO
**Context:** Photography by Sarah creates a new "Wedding Day Timeline Form" using Typeform. Your integration system must detect this new form, parse its fields ('ceremony_start', 'prep_time', 'first_look_time'), intelligently map them to core wedding fields, and enable auto-population for future couples. When florist Emily uses Google Forms for "Flower Preference Survey", the system needs to handle a completely different platform with the same intelligence.

### YOUR DELIVERABLES - ROUND 1

#### 1. Form Detection Service
```typescript
// src/lib/integrations/form-detection-service.ts
// Multi-platform form detection and monitoring
// Must handle:
// - Webhook-based form creation notifications
// - Polling-based form discovery for platforms without webhooks
// - Form change detection (fields added/removed/modified)
// - Platform-specific parsers (Typeform, Google Forms, custom HTML)
```

#### 2. Vendor Form Webhook System
```typescript
// src/lib/webhooks/vendor-form-webhook.ts
// Secure webhook processing for form notifications
// Must include:
// - Signature verification for multiple webhook providers
// - Form payload parsing and validation
// - Async processing queue for high-volume webhooks
// - Error handling and retry logic
```

#### 3. Cross-Platform Form Parser
```typescript
// src/lib/integrations/form-parser.ts
// Universal form parsing for different platforms
// Must support:
// - HTML form parsing (DOM traversal)
// - JSON schema parsing (Typeform, JotForm API)
// - PDF form field extraction
// - Dynamic field detection (JavaScript-generated forms)
```

#### 4. Field Mapping Intelligence
```typescript
// src/lib/integrations/field-mapping-intelligence.ts
// AI-powered field mapping suggestions
// Must provide:
// - Intelligent field name analysis
// - Context-aware mapping suggestions
// - Confidence scoring for automated mappings
// - Learning from user feedback
```

## 🔗 INTEGRATION ARCHITECTURE

### Supported Form Platforms
```typescript
// Platform-specific integrations
interface FormPlatformIntegration {
  typeform: TypeformIntegration;      // Webhook + API integration
  googleForms: GoogleFormsIntegration; // Apps Script + Sheets API
  jotform: JotformIntegration;        // Webhook + REST API
  customHTML: HTMLFormParser;         // DOM parsing + webhook
  gravityForms: WordPressIntegration; // WordPress webhook
  mailchimp: MailchimpIntegration;    // Form webhook integration
}

// Universal form interface
interface DetectedForm {
  platform: FormPlatform;
  formId: string;
  formTitle: string;
  formUrl: string;
  fields: DetectedFormField[];
  lastModified: Date;
  supplierId: string;
}
```

### Form Field Detection
```typescript
// Intelligent field analysis
interface DetectedFormField {
  fieldName: string;          // Internal field identifier
  fieldLabel: string;         // Human-readable label
  fieldType: FormFieldType;   // text, email, date, number, etc.
  isRequired: boolean;        // Field requirement status
  placeholder?: string;       // Placeholder text
  helpText?: string;          // Help/description text
  options?: string[];         // For select/radio fields
  validation?: FieldValidation; // Validation rules
  suggestedMapping?: {        // AI suggestions
    coreField: string;
    confidence: number;
    reasoning: string;
  };
}
```

### Data Flow Architecture
```typescript
// Integration data flow
/*
1. Vendor creates/modifies form → Webhook notification
2. Form Detection Service → Parse form structure
3. Field Mapping Intelligence → Analyze and suggest mappings  
4. Store mapping suggestions → Database update
5. Auto-Population Service → Use mappings for population
6. User feedback → Improve mapping accuracy
*/

interface IntegrationDataFlow {
  trigger: WebhookEvent | PollingEvent;
  detection: FormDetectionResult;
  parsing: FormParsingResult;
  mapping: FieldMappingSuggestions;
  storage: DatabaseUpdateResult;
  notification: UserNotificationResult;
}
```

## 🔧 WEBHOOK PROCESSING SYSTEM

### Multi-Platform Webhook Handler
```typescript
// src/app/api/webhooks/vendor-forms/route.ts
// Universal webhook endpoint for all form platforms
// Security: Signature validation per platform
// Performance: Async processing with queue system

export async function POST(request: Request) {
  // 1. Extract platform from headers/payload
  // 2. Validate webhook signature
  // 3. Parse platform-specific payload
  // 4. Queue for async processing
  // 5. Return immediate ACK response
}

// Platform-specific signature validation
interface WebhookValidation {
  typeform: (payload: string, signature: string) => boolean;
  googleForms: (payload: string, token: string) => boolean;
  jotform: (payload: string, signature: string) => boolean;
  custom: (payload: string, secret: string) => boolean;
}
```

### Async Processing Queue
```typescript
// Background job processing for webhook events
interface WebhookProcessingJob {
  jobId: string;
  platform: FormPlatform;
  eventType: 'form_created' | 'form_updated' | 'form_deleted';
  payload: any;
  supplierId: string;
  retryCount: number;
  maxRetries: number;
  processedAt?: Date;
  error?: string;
}

// Queue management with Redis/Database
class WebhookProcessingQueue {
  async enqueue(job: WebhookProcessingJob): Promise<void>;
  async process(): Promise<WebhookProcessingJob[]>;
  async retry(jobId: string): Promise<void>;
  async markComplete(jobId: string): Promise<void>;
  async markFailed(jobId: string, error: string): Promise<void>;
}
```

## 🤖 INTELLIGENT FIELD MAPPING

### AI-Powered Mapping Engine
```typescript
// Machine learning approach to field mapping
interface FieldMappingEngine {
  analyzeField: (field: DetectedFormField) => MappingSuggestion[];
  learnFromFeedback: (feedback: MappingFeedback) => void;
  calculateConfidence: (suggestion: MappingSuggestion) => number;
  improveMappings: () => void;
}

// Multi-factor analysis for mapping suggestions
interface MappingAnalysis {
  textSimilarity: number;      // String similarity to core fields
  semanticSimilarity: number;  // Meaning-based similarity
  contextMatch: number;        // Supplier type/form context
  patternMatch: number;        // Regex pattern matching
  historicalAccuracy: number;  // Past mapping success rate
}
```

### Pattern Recognition System
```typescript
// Common field patterns across platforms
const FIELD_PATTERNS = {
  weddingDate: [
    /^(wedding|event|ceremony)[-_\s]?date$/i,
    /^date[-_\s]?(of[-_\s]?)?(wedding|event|ceremony)$/i,
    /^(ceremony|reception)[-_\s]?date$/i
  ],
  guestCount: [
    /^(guest|attendee)[-_\s]?(count|number|total)$/i,
    /^(number|total)[-_\s]?(of[-_\s]?)?(guests|attendees)$/i,
    /^head[-_\s]?count$/i
  ],
  partnerNames: [
    /^(bride|partner1|primary)[-_\s]?name$/i,
    /^(groom|partner2|secondary)[-_\s]?name$/i,
    /^(client|contact)[-_\s]?name$/i
  ]
};
```

## 📊 INTEGRATION MONITORING

### Health Check System
```typescript
// Monitor integration health across all platforms
interface IntegrationHealthCheck {
  platform: FormPlatform;
  supplierId: string;
  lastSuccessfulSync: Date;
  webhookStatus: 'active' | 'failed' | 'disabled';
  apiConnectionStatus: 'connected' | 'disconnected' | 'error';
  recentErrorCount: number;
  averageProcessingTime: number;
  formSyncAccuracy: number;
}

// Automated monitoring and alerting
class IntegrationMonitor {
  async checkAllIntegrations(): Promise<IntegrationHealthCheck[]>;
  async alertOnFailures(checks: IntegrationHealthCheck[]): Promise<void>;
  async generateHealthReport(): Promise<IntegrationHealthReport>;
}
```

### Sync Status Dashboard
```typescript
// Real-time integration status for suppliers
interface SyncStatusDashboard {
  totalForms: number;
  syncedForms: number;
  pendingForms: number;
  failedForms: number;
  lastSyncTime: Date;
  syncAccuracy: number;
  platformBreakdown: {
    [platform: string]: {
      formCount: number;
      syncStatus: string;
      lastSync: Date;
    };
  };
}
```

## 💾 WHERE TO SAVE YOUR WORK
- Integration Services: `$WS_ROOT/wedsync/src/lib/integrations/`
- Webhook Handlers: `$WS_ROOT/wedsync/src/lib/webhooks/`
- API Endpoints: `$WS_ROOT/wedsync/src/app/api/webhooks/vendor-forms/`
- Form Parsers: `$WS_ROOT/wedsync/src/lib/parsers/`
- Types: `$WS_ROOT/wedsync/src/types/integration.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/integration/auto-population/`

## 🧪 TESTING REQUIREMENTS

### Integration Tests Required
- Webhook signature validation for all platforms
- Form parsing accuracy across different form types
- Field mapping suggestion accuracy
- Async processing queue reliability
- Error handling and retry logic

### Mock Integration Tests
- Simulate webhooks from major platforms
- Test form parsing with sample forms
- Validate mapping intelligence accuracy
- Performance testing with high webhook volume
- Failure recovery scenarios

### End-to-End Tests
- Complete form detection to population workflow
- Multi-platform form synchronization
- Real-time mapping updates
- Integration health monitoring
- User feedback integration

## 🏁 COMPLETION CHECKLIST

### Core Integration Services
- [ ] Form Detection Service with multi-platform support
- [ ] Webhook processing system with signature validation
- [ ] Cross-platform form parser (HTML, JSON, PDF)
- [ ] Field mapping intelligence with AI suggestions
- [ ] Integration health monitoring system

### Platform Integrations
- [ ] Typeform webhook and API integration
- [ ] Google Forms integration (Apps Script + Sheets API)
- [ ] Custom HTML form parser with DOM traversal
- [ ] JotForm webhook integration
- [ ] Generic webhook handler for custom platforms

### Security & Reliability
- [ ] Webhook signature validation for all platforms
- [ ] Secure API key management and rotation
- [ ] Input sanitization for all external data
- [ ] Comprehensive error handling and retry logic
- [ ] Rate limiting and abuse prevention

### Monitoring & Analytics
- [ ] Integration health check system
- [ ] Real-time sync status dashboard
- [ ] Performance monitoring and alerting
- [ ] Mapping accuracy tracking
- [ ] User feedback collection system

### Testing & Documentation
- [ ] Integration tests written and passing (>90% coverage)
- [ ] Mock webhook tests for all platforms
- [ ] TypeScript compilation successful
- [ ] Integration setup documentation
- [ ] Troubleshooting guide for failed integrations

## 🎯 SUCCESS CRITERIA

1. **Platform Coverage**: Support for 5+ major form platforms with webhook integration
2. **Detection Accuracy**: 95%+ accuracy in detecting new forms and changes
3. **Processing Speed**: Webhook processing completes in <10 seconds
4. **Mapping Intelligence**: 80%+ accuracy in automated field mapping suggestions
5. **Reliability**: 99.5% uptime for webhook processing with automatic retry
6. **Security**: All integrations pass security audit for data handling
7. **Monitoring**: Complete visibility into integration health and performance

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all integration requirements for the WS-216 Auto-Population System!**

**Remember: This integration layer is the bridge between vendor forms and couple data. It must be intelligent, reliable, and secure to enable the magic of auto-population across different platforms.**