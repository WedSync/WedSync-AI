# TEAM C - ROUND 1: WS-192 - Integration Tests Suite
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive integration testing infrastructure for testing complex wedding coordination workflows, data flow validation, and third-party service connections
**FEATURE ID:** WS-192 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about comprehensive integration test patterns that validate end-to-end wedding workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/integration/
cat $WS_ROOT/wedsync/tests/integration/setup.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integration
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

// Query existing testing infrastructure
await mcp__serena__search_for_pattern("test integration e2e");
await mcp__serena__find_symbol("jest vitest cypress", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/tests/");
```

### B. INTEGRATION TESTING PATTERNS (MANDATORY FOR INTEGRATION WORK)
```typescript
// Load integration testing documentation
# Use Ref MCP to search for:
# - "Next.js integration testing patterns"
# - "Supabase testing database setup"
# - "Jest integration test configuration"
# - "API route testing best practices"
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration testing
# Use Ref MCP to search for relevant documentation
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION TESTING ARCHITECTURE

### Use Sequential Thinking MCP for Complex Testing Strategy
```typescript
// Use for comprehensive integration testing analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Integration tests need to verify complete wedding workflows: supplier-couple connection flow, form submission workflows, journey automation triggers, core field synchronization, and real-time updates. Each workflow has multiple components that must work together.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Test database setup considerations: Need isolated test database, proper seeding with wedding data, cleanup between tests, transaction rollbacks for consistency. Must handle Supabase RLS policies and authentication contexts in tests.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Workflow testing strategy: Supplier creates intake form → Couple receives connection → Couple fills form → Journey triggers → Meeting scheduled. Need to test each step and failure scenarios like network issues, validation errors, permission problems.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Third-party integration testing: Calendar APIs (Google/Outlook), webhook endpoints, real-time subscriptions. Need mocking strategy for external services, webhook simulation, and connection failure handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Test data factory patterns: Need realistic wedding data generators, supplier profiles, couple information, form configurations. Data must be consistent across tests and properly cleaned up to prevent test interference.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration testing requirements, track test coverage
2. **test-automation-architect** - Design comprehensive testing framework architecture
3. **security-compliance-officer** - Ensure test security doesn't expose sensitive data
4. **code-quality-guardian** - Maintain testing code standards and patterns
5. **documentation-chronicler** - Document testing procedures and failure scenarios

## 🔒 SECURITY REQUIREMENTS FOR INTEGRATION TESTS (NON-NEGOTIABLE!)

### INTEGRATION TEST SECURITY CHECKLIST:
- [ ] **Test isolation** - No cross-test data contamination
- [ ] **Credential management** - Test credentials separate from production
- [ ] **Data cleanup** - Automated cleanup of test data after runs
- [ ] **Permission testing** - Verify RLS policies work correctly
- [ ] **Webhook security** - Secure webhook endpoint testing
- [ ] **Rate limiting tests** - Integration tests don't bypass rate limits
- [ ] **Authentication contexts** - Test with proper user contexts
- [ ] **Sensitive data masking** - No real wedding data in test logs

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION TESTING FOCUS:**
- End-to-end workflow validation across multiple services
- Third-party integration testing and mocking strategies
- Data flow verification between components
- Real-time subscription and webhook testing
- Cross-platform integration validation
- Service health monitoring and failure recovery
- Integration performance and reliability testing

## 📋 TECHNICAL SPECIFICATION

**Integration Test Requirements:**
- Test complete supplier-couple connection workflow
- Validate form submission and journey automation
- Verify core field synchronization across platforms
- Test real-time updates and subscription handling
- Validate third-party calendar integration
- Test webhook endpoint processing
- Ensure proper error handling and retry logic

**Key Integration Points to Test:**
- Supabase database operations with RLS
- Authentication flow across platform boundaries
- Real-time subscriptions and updates
- Calendar API integration (Google/Outlook)
- Webhook processing and validation
- Email service integration
- File upload and storage workflows

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Integration test framework setup with proper database isolation
- [ ] Test data factories for realistic wedding scenarios
- [ ] Complete supplier-couple workflow integration tests
- [ ] Journey automation integration test suite
- [ ] Third-party service integration tests with mocking
- [ ] Comprehensive test utilities and helpers
- [ ] Integration test documentation and run procedures

## 💾 WHERE TO SAVE YOUR WORK
- Integration Tests: $WS_ROOT/wedsync/tests/integration/
- Test Utilities: $WS_ROOT/wedsync/tests/utils/
- Test Factories: $WS_ROOT/wedsync/tests/factories/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Integration test files created and verified to exist
- [ ] TypeScript compilation successful for all test files
- [ ] All integration tests passing with proper isolation
- [ ] Test database setup and cleanup working
- [ ] Test factories producing realistic wedding data
- [ ] Third-party service mocking implemented
- [ ] Integration test documentation complete
- [ ] Senior dev review prompt created

## 🔍 INTEGRATION TESTING PATTERNS

### Test Database Management
```typescript
// Setup isolated test database
beforeAll(async () => {
  await setupTestDatabase();
  await seedWeddingData();
});

afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

### Workflow Integration Testing
```typescript
// Test complete supplier-couple flow
describe('Supplier-Couple Integration Flow', () => {
  it('should handle complete connection workflow', async () => {
    // 1. Supplier creates intake form
    const supplier = await createTestSupplier();
    const form = await supplier.createIntakeForm();
    
    // 2. Couple receives connection
    const couple = await createTestCouple();
    const connection = await connectCoupleToSupplier(couple, supplier);
    
    // 3. Couple fills form
    const submission = await couple.fillForm(form.id, testFormData);
    
    // 4. Journey automation triggers
    const journey = await verifyJourneyTriggered(connection.id);
    
    // 5. Meeting scheduled
    const meeting = await verifyMeetingScheduled(journey.id);
    
    expect(submission.status).toBe('completed');
    expect(journey.status).toBe('active');
    expect(meeting.scheduled_at).toBeDefined();
  });
});
```

### Real-time Integration Testing
```typescript
// Test real-time updates
describe('Real-time Updates Integration', () => {
  it('should sync updates across connected clients', async () => {
    const connection = await setupRealtimeConnection();
    const updatePromise = waitForRealtimeUpdate(connection);
    
    // Trigger update from another client
    await updateTaskStatus(taskId, 'completed');
    
    const receivedUpdate = await updatePromise;
    expect(receivedUpdate.status).toBe('completed');
  });
});
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all integration testing requirements!**