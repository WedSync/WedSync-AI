# TEAM B - ROUND 3: WS-204 - Presence Tracking System - Final Backend Integration & Production Optimization

**Date:** 2025-08-28  
**Feature ID:** WS-204 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Complete backend integration with all team systems and production-grade optimization  
**Context:** You are Team B working in parallel with 4 other teams. Final integration round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using the complete integrated system
**I want to:** Seamless presence tracking that works perfectly with channels, broadcasts, and AI features
**So that:** The entire real-time experience feels cohesive, reliable, and professional for managing multiple weddings

**Real Wedding Problem This Solves:**
The photographer's presence status updates automatically when switching between wedding channels, custom status appears in broadcast notifications, AI suggests optimal meeting times based on team presence patterns, and FAQ responses include team availability context. The venue coordinator sees a unified view where presence data enhances every real-time feature, making coordination effortless across multiple concurrent weddings.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Final backend integration requiring:
- Complete integration with WebSocket channels (Team A)
- Broadcast event system presence integration (Team C)
- AI-driven presence insights (Team D)
- FAQ system presence context (Team E)
- Production-grade performance and monitoring
- Comprehensive backend testing and validation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Realtime Presence
- Real-time: Supabase Presence API
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team A: Presence data in channel context
- Team C: Presence info in broadcast events
- Team D: Presence analytics for AI insights
- Team E: Team availability in FAQ context

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Supabase production optimization"
// - "Backend integration testing patterns"
// - "Real-time system monitoring"

// For this specific feature, also search:
// - "Production backend architecture"
// - "System integration testing"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW all rounds and integration points:
await mcp__serena__find_symbol("PresenceManager", "", true);
await mcp__serena__find_symbol("ChannelManager", "", true);
await mcp__serena__get_symbols_overview("/src/lib/presence");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Final backend integration coordination"
2. **database-mcp-specialist** --think-hard --production-optimization "Presence system scaling"
3. **performance-optimization-expert** --think-ultra-hard --production-ready "Backend performance tuning" 
4. **security-compliance-officer** --think-ultra-hard --production-security-audit
5. **test-automation-architect** --full-system-testing --integration-scenarios
6. **postgresql-database-expert** --production-optimization --monitoring-setup
7. **code-quality-guardian** --production-standards --comprehensive-review

**AGENT INSTRUCTIONS:** "Focus on seamless backend integration and production readiness."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Final Integration & Production):
- [ ] Complete integration with all team backend systems
- [ ] PresenceOrchestrator for coordinating all presence features
- [ ] Production monitoring and alerting system
- [ ] Backend performance optimization for production load
- [ ] Comprehensive integration testing suite
- [ ] Production deployment documentation
- [ ] System health monitoring and diagnostics

### Integration Requirements:
- [ ] Presence data seamlessly flows to channel system
- [ ] Broadcast events include relevant presence context
- [ ] AI system receives rich presence analytics
- [ ] FAQ system has access to team availability
- [ ] All integrations perform under production load

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ PRODUCTION SECURITY VALIDATION
const productionSecurityAudit = {
  presenceDataEncryption: 'All presence data encrypted in transit',
  analyticsPrivacy: 'Analytics respect all privacy settings',
  rateLimiting: 'Production rate limits prevent abuse',
  accessControl: 'Proper authorization for all endpoints',
  dataRetention: 'Presence history follows retention policies'
};

// ✅ PRODUCTION MONITORING
const productionMonitoring = {
  presenceUpdateLatency: 'Track presence update performance',
  analyticsQueryPerformance: 'Monitor analytics query times',
  integrationHealth: 'Monitor all system integrations',
  errorTracking: 'Comprehensive error logging and alerting'
};

// ✅ SYSTEM INTEGRATION VALIDATION
const validateSystemIntegration = async () => {
  const channelIntegration = await testChannelPresenceSync();
  const broadcastIntegration = await testBroadcastPresenceData();
  const aiIntegration = await testAIPresenceInsights();
  const faqIntegration = await testFAQTeamAvailability();
  
  return {
    allSystemsHealthy: channelIntegration && broadcastIntegration && aiIntegration && faqIntegration,
    integrationStatus: { channelIntegration, broadcastIntegration, aiIntegration, faqIntegration }
  };
};
```

**PRODUCTION SECURITY CHECKLIST:**
- [ ] **Complete Security Audit**: All presence endpoints security reviewed
- [ ] **Integration Security**: Secure data flow between all systems
- [ ] **Performance Monitoring**: Production monitoring configured
- [ ] **Error Handling**: Comprehensive error tracking and recovery
- [ ] **Data Protection**: All user data properly secured

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Complete system integration test
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api-integration-test"});

// Test end-to-end presence integration across all systems
const integrationTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test 1: Presence updates when switching channels
    const channelSwitch = await fetch('/api/test/channel-presence-sync', {
      method: 'POST',
      body: JSON.stringify({ action: 'switch_channel', channel: 'wedding-123' })
    });
    
    // Test 2: Broadcast includes presence data
    const broadcastTest = await fetch('/api/test/broadcast-presence-integration', {
      method: 'GET'
    });
    
    // Test 3: AI gets presence analytics
    const aiAnalytics = await fetch('/api/test/ai-presence-insights', {
      method: 'GET'
    });
    
    // Test 4: FAQ includes team availability
    const faqAvailability = await fetch('/api/test/faq-team-context', {
      method: 'GET'
    });
    
    return {
      channelIntegration: channelSwitch.ok,
      broadcastIntegration: broadcastTest.ok,
      aiIntegration: aiAnalytics.ok,
      faqIntegration: faqAvailability.ok
    };
  }`
});

// All integrations must be working
expect(integrationTest.channelIntegration).toBe(true);
expect(integrationTest.broadcastIntegration).toBe(true);
expect(integrationTest.aiIntegration).toBe(true);
expect(integrationTest.faqIntegration).toBe(true);

// 2. Production load testing
const loadTestResults = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const startTime = Date.now();
    
    // Simulate production load: 1000 concurrent presence updates
    const promises = Array.from({length: 1000}, (_, i) => 
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: 'user-' + i,
          timestamp: Date.now() 
        })
      })
    );
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    return {
      totalTime: endTime - startTime,
      averageResponseTime: (endTime - startTime) / 1000
    };
  }`
});

// Should handle production load efficiently
expect(loadTestResults.totalTime).toBeLessThan(10000); // 10 seconds for 1000 updates
expect(loadTestResults.averageResponseTime).toBeLessThan(10); // <10ms average

// 3. System health monitoring test
const healthCheck = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/health/presence-system', {
      method: 'GET'
    }).then(r => r.json());
  }`
});

expect(healthCheck.status).toBe('healthy');
expect(healthCheck.metrics.presenceUpdateLatency).toBeLessThan(100);
expect(healthCheck.integrations.all).toBe('operational');

// 4. Error handling and recovery test
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate various error conditions
    await fetch('/api/test/simulate-errors', {
      method: 'POST',
      body: JSON.stringify({ 
        errors: ['database_timeout', 'rate_limit_exceeded', 'invalid_presence_data']
      })
    });
  }`
});

// Verify system recovers gracefully
const recoveryStatus = await mcp__playwright__browser_evaluate({
  function: `async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for recovery
    return await fetch('/api/health/presence-system').then(r => r.json());
  }`
});

expect(recoveryStatus.status).toBe('healthy');
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Complete integration with all 4 other team systems working flawlessly
- [ ] Production performance benchmarks met (1000+ concurrent users)
- [ ] System monitoring and alerting configured and tested
- [ ] Comprehensive error handling and recovery mechanisms
- [ ] Backend optimization handles production traffic patterns

### Integration & Performance:
- [ ] Presence data flows seamlessly to channel system
- [ ] Broadcast events properly enhanced with presence information
- [ ] AI system receives and processes presence analytics correctly
- [ ] FAQ system contextually displays team availability
- [ ] All integrations maintain <100ms response time under load

### Production Readiness:
- [ ] Security audit completed with all issues resolved
- [ ] Performance monitoring configured with proper alerting
- [ ] Error tracking and recovery systems operational
- [ ] Load testing validates production capacity
- [ ] Documentation complete for operations team

### Evidence Package Required:
- [ ] Complete integration test results video
- [ ] Production load testing benchmark report
- [ ] System monitoring dashboard screenshots
- [ ] Security audit completion certificate
- [ ] Operations runbook for production deployment

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `/wedsync/src/lib/presence/presence-orchestrator.ts`
- Monitoring: `/wedsync/src/lib/presence/production-monitor.ts`
- Health Checks: `/wedsync/src/app/api/health/presence-system/`
- Documentation: `/wedsync/docs/presence-system-production.md`
- Tests: `/wedsync/tests/presence/production-integration.spec.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch31/WS-204-team-b-round-3-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-204 | ROUND_3_COMPLETE | team-b | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- This is the FINAL round - backend must be production ready
- ALL team integrations must be tested and validated
- Performance must handle production load patterns
- Security audit is mandatory before completion

## 🏁 ROUND 3 COMPLETION CHECKLIST
- [ ] Complete backend integration with all teams
- [ ] Production performance achieved and validated
- [ ] Security audit passed with all requirements met
- [ ] System monitoring operational with alerting
- [ ] Comprehensive testing suite complete
- [ ] Production deployment ready with documentation

---

END OF ROUND 3 PROMPT - EXECUTE IMMEDIATELY