# TEAM C - ROUND 1: WS-193 - Performance Tests Suite
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive integration performance testing that validates end-to-end wedding workflows under load, third-party service performance impacts, and distributed system performance characteristics
**FEATURE ID:** WS-193 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-world wedding season performance scenarios, integration bottlenecks, and distributed system performance testing

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/performance/integration/
cat $WS_ROOT/wedsync/tests/performance/integration/workflow-load-tests.js | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm run test:performance:integration
# MUST show: "All performance tests passing with benchmarks met"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query performance-critical integration points
await mcp__serena__search_for_pattern("api fetch integration webhook");
await mcp__serena__find_symbol("performance bottleneck", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
```

### B. PERFORMANCE INTEGRATION PATTERNS (MANDATORY FOR INTEGRATION PERFORMANCE)
```typescript
// Load performance testing documentation
# Use Ref MCP to search for:
# - "Load testing distributed systems patterns"
# - "API performance testing with third-party services"
# - "Webhook performance and reliability testing"
# - "Database performance testing under load"
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration performance testing
# Use Ref MCP to search for relevant documentation
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION PERFORMANCE TESTING

### Use Sequential Thinking MCP for Performance Integration Strategy
```typescript
// Use for comprehensive integration performance analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Integration performance testing for wedding workflows requires: end-to-end workflow load testing (supplier form creation → couple connection → form submission → journey trigger), third-party service impact testing (calendar APIs, email services, webhooks), and distributed system bottleneck identification across multiple services.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Peak wedding season load characteristics: 10x traffic spikes during bridal shows, concurrent form submissions from multiple couples, supplier dashboard access during busy periods, real-time updates across connected devices. Need to test realistic concurrent user scenarios with wedding-specific usage patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Third-party integration performance impacts: Google Calendar API rate limits affecting meeting scheduling, email service throughput for journey automation, Supabase real-time subscription scaling, webhook delivery reliability under load. Must test fallback scenarios and retry mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "End-to-end workflow performance benchmarks: Complete supplier-couple workflow should complete in <5 seconds under normal load, <10 seconds under 10x peak load, form submissions must process within 2 seconds, journey automation triggers within 5 seconds, real-time updates propagate within 1 second.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration failure and degradation testing: Simulate third-party API failures, test graceful degradation when external services are slow, validate retry mechanisms don't compound performance problems, ensure user experience remains acceptable even when some integrations are degraded.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration performance testing requirements
2. **performance-optimization-expert** - Design load testing strategies for wedding workflows
3. **security-compliance-officer** - Ensure performance tests don't expose sensitive data
4. **code-quality-guardian** - Maintain performance testing code standards
5. **documentation-chronicler** - Document performance testing procedures and benchmarks

## 🔒 SECURITY REQUIREMENTS FOR PERFORMANCE TESTING (NON-NEGOTIABLE!)

### PERFORMANCE TEST SECURITY CHECKLIST:
- [ ] **Load test isolation** - Performance tests use dedicated test environments
- [ ] **Credential management** - Test API keys separate from production
- [ ] **Data protection** - No real wedding data in performance test scenarios
- [ ] **Rate limit testing** - Performance tests don't bypass security rate limits
- [ ] **Third-party API security** - Test API keys have appropriate limited scopes
- [ ] **Resource cleanup** - Performance test data cleaned up after runs
- [ ] **Monitoring alerts** - Performance test runs don't trigger production alerts

## 🎯 TEAM C SPECIALIZATION: INTEGRATION PERFORMANCE FOCUS

**INTEGRATION PERFORMANCE TESTING FOCUS:**
- End-to-end wedding workflow performance validation
- Third-party service integration performance impact analysis
- Distributed system bottleneck identification and resolution
- Webhook and real-time performance testing under load
- API gateway and service mesh performance validation
- Cross-service transaction performance testing
- Integration failure scenario performance testing

## 📋 TECHNICAL SPECIFICATION

**Integration Performance Test Requirements:**
- Test complete supplier-couple workflow under 1000+ concurrent users
- Validate API performance with realistic third-party service latencies
- Test webhook delivery performance and reliability under load
- Measure real-time update propagation times across clients
- Validate database query performance with complex wedding data
- Test integration failure graceful degradation performance
- Measure resource utilization during peak integration loads

**Performance Benchmarks:**
- Complete workflow completion: <5s normal, <10s under 10x load
- API response times: <200ms p95 for critical endpoints
- Webhook delivery: <1s delivery, 99.9% reliability
- Real-time updates: <1s propagation time
- Database queries: <200ms for complex supplier searches
- Third-party API fallback: <500ms timeout, proper retry handling

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] End-to-end workflow load testing framework
- [ ] Third-party integration performance test suite
- [ ] Webhook and real-time performance testing
- [ ] Integration failure scenario performance tests
- [ ] Performance monitoring and alerting for integrations
- [ ] Distributed system bottleneck analysis tools
- [ ] Integration performance benchmarking and reporting

## 💾 WHERE TO SAVE YOUR WORK
- Integration Performance Tests: $WS_ROOT/wedsync/tests/performance/integration/
- Load Testing Scripts: $WS_ROOT/wedsync/scripts/load-testing/
- Monitoring Config: $WS_ROOT/wedsync/monitoring/performance/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Integration performance test files created and verified to exist
- [ ] TypeScript compilation successful for all performance tests
- [ ] All integration performance tests passing benchmarks
- [ ] Load testing framework executing successfully
- [ ] Third-party integration performance validated
- [ ] Performance monitoring and alerting configured
- [ ] Integration performance documentation complete
- [ ] Senior dev review prompt created

## 🔄 INTEGRATION PERFORMANCE TESTING PATTERNS

### End-to-End Workflow Load Testing
```javascript
// tests/performance/integration/workflow-load-tests.js
const { check, group } = require('k6');
const http = require('k6/http');

export let options = {
  scenarios: {
    wedding_peak_season: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // Normal load
        { duration: '5m', target: 1000 }, // Peak wedding season
        { duration: '2m', target: 0 }, // Cool down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s
    'group_duration{group:::Wedding Workflow}': ['p(95)<10000'], // Complete workflow under 10s
    http_req_failed: ['rate<0.01'], // Less than 1% failures
  },
};

export default function() {
  group('Wedding Workflow Performance', function() {
    // 1. Supplier creates intake form
    const supplierAuth = authenticateSupplier();
    const formResponse = http.post('/api/forms/intake', {
      title: 'Wedding Photography Consultation',
      fields: generateWeddingFormFields(),
    }, { headers: { Authorization: supplierAuth }});
    
    check(formResponse, {
      'form creation under 2s': (r) => r.timings.duration < 2000,
      'form created successfully': (r) => r.status === 201,
    });

    // 2. Couple connects to supplier
    const coupleAuth = authenticateCouple();
    const connectionResponse = http.post(`/api/connections/${formResponse.json().id}`, {
      wedding_date: '2025-08-15',
      venue: 'Sunset Manor',
    }, { headers: { Authorization: coupleAuth }});
    
    check(connectionResponse, {
      'connection under 1s': (r) => r.timings.duration < 1000,
      'connection successful': (r) => r.status === 201,
    });

    // 3. Form submission with journey automation
    const submissionResponse = http.post(`/api/forms/${formResponse.json().id}/submit`, {
      responses: generateRealisticWeddingResponses(),
    }, { headers: { Authorization: coupleAuth }});
    
    check(submissionResponse, {
      'submission under 2s': (r) => r.timings.duration < 2000,
      'journey triggered': (r) => r.json().journey_triggered === true,
    });

    // 4. Real-time update propagation
    const updateStart = Date.now();
    const realtimeResponse = http.get(`/api/realtime/status/${submissionResponse.json().id}`, 
      { headers: { Authorization: supplierAuth }});
    
    check(realtimeResponse, {
      'realtime update under 1s': (r) => (Date.now() - updateStart) < 1000,
      'status synchronized': (r) => r.json().status === 'submitted',
    });
  });
}

function generateWeddingFormFields() {
  return [
    { type: 'text', label: 'Wedding Date', required: true },
    { type: 'text', label: 'Venue Name', required: true },
    { type: 'number', label: 'Guest Count', required: true },
    { type: 'select', label: 'Photography Style', options: ['Traditional', 'Photojournalistic', 'Fine Art'] },
    { type: 'textarea', label: 'Special Requests', required: false },
  ];
}
```

### Third-Party Integration Performance Testing
```javascript
// tests/performance/integration/third-party-performance.js
export default function() {
  group('Third-Party Integration Performance', function() {
    // Test calendar integration performance
    group('Calendar API Integration', function() {
      const calendarResponse = http.post('/api/calendar/schedule', {
        supplier_id: 'supplier_123',
        couple_id: 'couple_456',
        event_type: 'consultation',
        preferred_times: ['2025-08-20T14:00:00Z', '2025-08-20T16:00:00Z'],
      });
      
      check(calendarResponse, {
        'calendar scheduling under 3s': (r) => r.timings.duration < 3000,
        'calendar event created': (r) => r.status === 201,
        'has calendar link': (r) => r.json().calendar_link !== undefined,
      });
    });

    // Test email service performance
    group('Email Service Integration', function() {
      const emailResponse = http.post('/api/communications/send', {
        template: 'consultation_scheduled',
        recipients: ['supplier@example.com', 'couple@example.com'],
        data: {
          wedding_date: '2025-08-15',
          consultation_date: '2025-08-20T14:00:00Z',
        },
      });
      
      check(emailResponse, {
        'email sent under 2s': (r) => r.timings.duration < 2000,
        'email queued successfully': (r) => r.status === 202,
      });
    });

    // Test webhook delivery performance
    group('Webhook Performance', function() {
      const webhookStart = Date.now();
      const triggerResponse = http.post('/api/webhooks/trigger', {
        event: 'form.submitted',
        payload: {
          form_id: 'form_123',
          submission_id: 'sub_456',
        },
      });
      
      // Wait for webhook delivery confirmation
      sleep(0.5);
      const deliveryResponse = http.get('/api/webhooks/delivery-status');
      
      check(deliveryResponse, {
        'webhook delivered under 1s': (r) => (Date.now() - webhookStart) < 1000,
        'webhook delivery confirmed': (r) => r.json().delivered === true,
      });
    });
  });
}
```

### Integration Failure Performance Testing
```javascript
// tests/performance/integration/failure-scenarios.js
export default function() {
  group('Integration Failure Performance', function() {
    // Test performance when third-party services are slow
    group('Slow Third-Party Services', function() {
      // Simulate slow calendar API
      const slowCalendarResponse = http.post('/api/calendar/schedule-with-timeout', {
        timeout: 5000, // Force slow response
        fallback: 'manual_scheduling',
      });
      
      check(slowCalendarResponse, {
        'graceful degradation under 6s': (r) => r.timings.duration < 6000,
        'fallback activated': (r) => r.json().fallback_used === true,
      });
    });

    // Test performance with partial service failures
    group('Partial Service Failures', function() {
      const partialFailureResponse = http.post('/api/forms/submit-resilient', {
        responses: generateRealisticWeddingResponses(),
        services: {
          email: 'fail',      // Simulate email service failure
          calendar: 'success', // Calendar works
          database: 'success', // Database works
        },
      });
      
      check(partialFailureResponse, {
        'core functionality under 3s': (r) => r.timings.duration < 3000,
        'form saved despite failures': (r) => r.status === 201,
        'failure logged': (r) => r.json().warnings.length > 0,
      });
    });
  });
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive integration performance testing prompt with realistic wedding scenarios!**