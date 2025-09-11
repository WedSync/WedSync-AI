# TEAM C - ROUND 1: WS-280 - Thank You Management System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build integration systems for thank you management with external services and real-time features
**FEATURE ID:** WS-280 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about email notifications, address verification, and reminder automations

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/thank-you/
cat $WS_ROOT/wedsync/src/lib/integrations/thank-you/notification-service.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations/thank-you
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

// Query integration patterns and notification systems
await mcp__serena__search_for_pattern("notification email integration webhook realtime");
await mcp__serena__find_symbol("NotificationService EmailService Integration", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### B. INTEGRATION PATTERNS (MANDATORY FOR ALL INTEGRATION WORK)
```typescript
// CRITICAL: Load existing integration patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/email-service.ts");
await mcp__serena__search_for_pattern("webhook subscription realtime supabase");
await mcp__serena__find_symbol("RealtimeProvider SupabaseClient", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integrations
# Use Ref MCP to search for:
# - "Supabase realtime subscriptions broadcast"
# - "Resend email templates transactional"
# - "Next.js webhook handling validation"
# - "Address validation APIs integration"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

### Use Sequential Thinking MCP for Integration Design
```typescript
// Use for complex integration planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Thank you system integrations needed: Email reminders for overdue thank yous, address validation service integration, real-time progress updates between couple members, calendar integration for thank you deadlines, photo storage integration, postal service tracking APIs.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Email reminders need personalization and scheduling, address validation prevents bounced mail, real-time updates require WebSocket connections, calendar integration helps with deadline management, photo uploads need secure processing pipeline.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Email service rate limits during batch sending, address validation API downtime, real-time connection drops during updates, calendar sync conflicts, photo upload failures. Need circuit breakers, retry mechanisms, and graceful fallbacks.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Event-driven architecture for thank you milestones, webhook handling for external service updates, real-time subscriptions for progress sync, background job processing for batch operations, integration health monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track integration dependencies and API connections
2. **integration-specialist** - Build service integrations and webhook handling  
3. **security-compliance-officer** - Secure API keys and webhook validation
4. **code-quality-guardian** - Integration patterns and error handling consistency
5. **test-automation-architect** - Integration testing with mock services
6. **documentation-chronicler** - Integration documentation with failure scenarios

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **API key management** - Secure storage and rotation of external API keys
- [ ] **Webhook validation** - Verify webhook signatures and sources
- [ ] **Rate limiting** - Prevent abuse of notification systems
- [ ] **Data privacy** - PII protection in external service calls
- [ ] **Error handling** - No sensitive data leaked in integration errors
- [ ] **Audit logging** - Log all external service interactions

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION FOCUS:**
- Third-party service integration
- Real-time data synchronization
- Webhook handling and processing
- Data flow between systems
- Integration health monitoring
- Failure handling and recovery

## 📋 CORE INTEGRATION SERVICES TO BUILD

### 1. Thank You Notification Service
```typescript
// Email reminder service for overdue thank yous
export class ThankYouNotificationService {
  async sendOverdueReminder(weddingId: string, overdueGuests: Guest[]) {
    // Batch email sending with rate limiting
    // Personalized content based on gift details
    // Integration with Resend email service
  }
  
  async scheduleReminders(weddingId: string, thankYouDeadlines: Date[]) {
    // Calendar integration for deadline tracking
    // Automated reminder scheduling
  }
}
```

### 2. Address Verification Integration
```typescript
// Integration with address validation service
export class AddressVerificationService {
  async validateGuestAddresses(guests: Guest[]) {
    // Batch address validation
    // USPS/international address verification
    // Return validated addresses with corrections
  }
  
  async updateGuestAddress(guestId: string, newAddress: Address) {
    // Real-time address validation
    // Update guest records with verified address
  }
}
```

### 3. Real-time Progress Sync
```typescript
// Real-time updates for thank you progress
export class ThankYouRealtimeService {
  async subscribeToProgress(weddingId: string, callback: (update: ProgressUpdate) => void) {
    // Supabase realtime subscription
    // Progress updates between couple members
    // Live status changes
  }
  
  async broadcastProgressUpdate(weddingId: string, update: ProgressUpdate) {
    // Broadcast progress changes
    // Update all connected clients
  }
}
```

### 4. Photo Processing Pipeline
```typescript
// Secure photo upload and processing for thank you cards
export class ThankYouPhotoService {
  async processCardPhoto(photoFile: File, cardId: string) {
    // Image validation and processing
    // Secure upload to Supabase storage
    // Thumbnail generation
    // OCR for handwritten thank you detection
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Email notification service with Resend integration
- [ ] Real-time progress sync with Supabase realtime
- [ ] Address verification integration (mock API for testing)
- [ ] Photo upload processing pipeline
- [ ] Webhook handlers for external service events
- [ ] Integration health monitoring
- [ ] Circuit breakers and retry mechanisms
- [ ] Integration tests with mock services

## 💾 WHERE TO SAVE YOUR WORK
- Integrations: $WS_ROOT/wedsync/src/lib/integrations/thank-you/
- Services: $WS_ROOT/wedsync/src/lib/services/thank-you/
- Webhooks: $WS_ROOT/wedsync/src/app/api/webhooks/thank-you/
- Tests: $WS_ROOT/wedsync/__tests__/integrations/thank-you/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All integration tests passing
- [ ] Security requirements implemented
- [ ] API key management configured
- [ ] Webhook validation implemented
- [ ] Error handling and retry logic complete
- [ ] Integration health monitoring active
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all integration requirements!**