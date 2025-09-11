# TEAM E - ROUND 2: WS-153 - Photo Groups Management - Advanced Testing & Performance Validation

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Advanced testing, performance optimization, and integration validation for photo groups  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Advanced photo group management that performs flawlessly under real-world conditions
**So that:** Complex wedding scenarios with large guest lists, scheduling conflicts, and real-time collaboration work smoothly

**Real Wedding Problem This Solves:**
Building on Round 1's basic testing, weddings with 200+ guests, multiple photographers, real-time collaboration, and complex scheduling need advanced testing to ensure performance doesn't degrade and all edge cases are handled properly.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Round 1 Foundation:**
- Load testing for large guest lists and complex scenarios
- Real-time collaboration testing with multiple users
- Advanced performance testing and optimization
- Integration testing with all team advanced features
- Security testing for real-time and advanced features
- Mobile performance testing across devices

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest, Jest, Load testing tools
- Performance: Lighthouse, Web Vitals, Custom metrics

**Integration Points:**
- **Team A**: Advanced UI components and real-time features
- **Team B**: Advanced APIs and real-time collaboration
- **Team C**: Advanced database functions and optimization
- **Team D**: WedMe mobile integration and offline features

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any testing begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("playwright");  
await mcp__context7__get-library-docs("/microsoft/playwright", "load-testing performance-testing", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "testing real-time performance", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "performance-testing optimization", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW Round 1 testing implementation:
await mcp__serena__find_symbol("photo-groups", "src/__tests__", true);
await mcp__serena__get_symbols_overview("src/__tests__/integration");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Advanced testing and validation"
2. **test-automation-architect** --think-hard --use-loaded-docs "Load testing and performance validation" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Complex wedding testing scenarios" 
4. **security-compliance-officer** --think-ultra-hard --advanced-security-testing
5. **playwright-visual-testing-specialist** --advanced-testing --real-time-collaboration-testing
6. **performance-optimization-expert** --comprehensive-performance-testing --optimization-validation
7. **code-quality-guardian** --advanced-code-quality --integration-testing

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Testing & Performance):
- [ ] **Load Testing Suite** - Test with 100+ concurrent users and large datasets
- [ ] **Real-time Collaboration Testing** - Multi-user scenarios with conflict resolution
- [ ] **Performance Optimization Validation** - Verify all team performance improvements
- [ ] **Advanced Security Testing** - Test real-time security and advanced features
- [ ] **Cross-Device Integration Testing** - Desktop + mobile + tablet scenarios
- [ ] **Stress Testing** - Test system limits and graceful degradation
- [ ] **API Performance Testing** - Advanced API endpoints under load
- [ ] **Database Performance Validation** - Test advanced database functions

### Advanced Testing Scenarios:
- [ ] 200+ guest wedding with complex photo group assignments
- [ ] 5 simultaneous users collaborating on photo groups
- [ ] Real-time conflict detection and resolution testing
- [ ] Mobile + desktop concurrent editing scenarios
- [ ] Network interruption and recovery testing
- [ ] Photographer app integration testing
- [ ] Offline-to-online sync testing with conflicts
- [ ] Memory and performance profiling

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Round 1 Complete):
- FROM Team A: Advanced UI components for integration testing - **READY**
- FROM Team B: Advanced API endpoints for load testing - **READY**
- FROM Team C: Advanced database functions for performance testing - **READY**
- FROM Team D: WedMe mobile features for mobile testing - **READY**

### What other teams NEED from you:
- TO Team A: Performance feedback and optimization recommendations
- TO Team B: API performance results and bottleneck identification
- TO Team C: Database performance analysis and optimization suggestions
- TO Team D: Mobile performance validation and improvement recommendations

---

## 🔒 SECURITY REQUIREMENTS (ADVANCED SECURITY TESTING)

### Advanced Security Testing:
- [ ] **Real-time Security**: Test WebSocket security and authentication
- [ ] **Collaboration Security**: Multi-user access control testing
- [ ] **Mobile Security**: Test mobile-specific security features
- [ ] **API Security**: Advanced API security testing under load
- [ ] **Data Validation**: Test all input validation under stress

---

## 🎭 ADVANCED TESTING IMPLEMENTATION (ROUND 2)

```javascript
// LOAD TESTING WITH MULTIPLE CONCURRENT USERS
describe('Photo Groups Load Testing', () => {
  test('System handles 100 concurrent users creating photo groups', async () => {
    const concurrentUsers = 100;
    const testResults = [];
    
    // Create test contexts for concurrent users
    const contexts = await Promise.all(
      Array.from({length: concurrentUsers}, async (_, i) => {
        const context = await mcp__playwright__browser.newContext({
          userAgent: `LoadTest-User-${i}`,
          viewport: {width: 1920, height: 1080}
        });
        const page = await context.newPage();
        return {context, page, userId: i};
      })
    );
    
    const startTime = Date.now();
    
    // All users simultaneously create photo groups
    const promises = contexts.map(async ({page, userId}) => {
      try {
        await page.goto('http://localhost:3000/guests/photo-groups');
        
        // Create photo group
        await page.click('[data-testid="create-group"]');
        await page.fill('[data-testid="group-name"]', `Load Test Group ${userId}`);
        await page.fill('[data-testid="group-description"]', `Group created by user ${userId}`);
        
        // Add guests to group
        const guests = [`guest-${userId}-1`, `guest-${userId}-2`, `guest-${userId}-3`];
        for (const guest of guests) {
          await page.drag(`[data-guest-id="${guest}"]`, '[data-group="new-group"]');
        }
        
        await page.click('[data-testid="save-group"]');
        await page.waitForSelector('[data-testid="group-saved"]');
        
        const endTime = Date.now();
        return {
          success: true,
          duration: endTime - startTime,
          userId
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          userId
        };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
    
    console.log(`Load Test Results: ${successful.length}/${concurrentUsers} successful in ${totalTime}ms`);
    
    // Expect at least 95% success rate
    expect(successful.length / concurrentUsers).toBeGreaterThan(0.95);
    expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds
    
    // Cleanup
    await Promise.all(contexts.map(({context}) => context.close()));
  });
  
  test('Real-time collaboration works with multiple users', async () => {
    // Create 5 concurrent user sessions
    const userCount = 5;
    const contexts = await Promise.all(
      Array.from({length: userCount}, async (_, i) => {
        const context = await mcp__playwright__browser.newContext();
        const page = await context.newPage();
        await page.goto('http://localhost:3000/guests/photo-groups');
        return {context, page, userId: i};
      })
    );
    
    // User 1 creates a photo group
    const user1 = contexts[0].page;
    await user1.click('[data-testid="create-group"]');
    await user1.fill('[data-testid="group-name"]', 'Collaboration Test Group');
    await user1.click('[data-testid="save-group"]');
    
    // All users should see the new group appear in real-time
    const groupVisibilityPromises = contexts.map(async ({page}) => {
      await page.waitForSelector('[data-group-name="Collaboration Test Group"]', {timeout: 5000});
    });
    
    await Promise.all(groupVisibilityPromises);
    
    // User 2 adds a guest to the group
    const user2 = contexts[1].page;
    await user2.drag('[data-guest-id="test-guest-1"]', '[data-group="collaboration-test-group"]');
    
    // All other users should see the guest addition in real-time
    const guestAdditionPromises = contexts.map(async ({page}, index) => {
      if (index !== 1) { // Skip user 2 who made the change
        await page.waitForSelector('[data-group-member="test-guest-1"]', {timeout: 5000});
      }
    });
    
    await Promise.all(guestAdditionPromises);
    
    // Test conflict detection with simultaneous scheduling
    const user3 = contexts[2].page;
    const user4 = contexts[3].page;
    
    // Both users try to schedule overlapping times
    await Promise.all([
      user3.click('[data-testid="schedule-group"]').then(() => 
        user3.fill('[data-testid="time-input"]', '2:00 PM')
      ),
      user4.click('[data-testid="schedule-group"]').then(() => 
        user4.fill('[data-testid="time-input"]', '2:15 PM')
      )
    ]);
    
    // Conflict should be detected and shown to all users
    const conflictDetectionPromises = contexts.map(async ({page}) => {
      await page.waitForSelector('[data-testid="conflict-warning"]', {timeout: 5000});
    });
    
    await Promise.all(conflictDetectionPromises);
    
    // Cleanup
    await Promise.all(contexts.map(({context}) => context.close()));
  });
});

// PERFORMANCE TESTING AND OPTIMIZATION
describe('Photo Groups Performance Testing', () => {
  test('Large guest list performance optimization', async () => {
    // Create test data: 500 guests, 50 photo groups
    const testData = await createLargeTestDataset({
      guests: 500,
      photoGroups: 50,
      assignmentsPerGroup: 10
    });
    
    await mcp__playwright__browser_navigate({
      url: "http://localhost:3000/guests/photo-groups"
    });
    
    // Measure initial load time
    const startTime = Date.now();
    await mcp__playwright__browser_wait_for({text: "Photo Groups"});
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    
    // Test drag-and-drop performance with large dataset
    const dragStartTime = Date.now();
    await mcp__playwright__browser_drag({
      startElement: "Guest 450",
      startRef: "[data-guest-id='guest-450']",
      endElement: "Photo Group 25",
      endRef: "[data-group-id='group-25']"
    });
    const dragTime = Date.now() - dragStartTime;
    
    expect(dragTime).toBeLessThan(500); // Drag operation under 500ms
    
    // Test conflict detection performance
    const conflictStartTime = Date.now();
    await mcp__playwright__browser_click({
      element: "Check Conflicts",
      ref: "[data-testid='check-conflicts']"
    });
    await mcp__playwright__browser_wait_for({text: "Conflicts checked"});
    const conflictTime = Date.now() - conflictStartTime;
    
    expect(conflictTime).toBeLessThan(1000); // Conflict detection under 1 second
    
    // Measure memory usage
    const memoryUsage = await mcp__playwright__browser_evaluate({
      function: `() => ({
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0
      })`
    });
    
    // Memory usage should be reasonable (under 100MB for this feature)
    expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    
    console.log(`Performance Results:
      Load Time: ${loadTime}ms
      Drag Time: ${dragTime}ms
      Conflict Detection: ${conflictTime}ms
      Memory Usage: ${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`);
  });
  
  test('Mobile performance across different devices', async () => {
    const mobileDevices = [
      {name: 'iPhone 8', width: 375, height: 667},
      {name: 'Samsung Galaxy', width: 360, height: 640},
      {name: 'iPad', width: 768, height: 1024},
      {name: 'iPhone 14 Pro Max', width: 428, height: 926}
    ];
    
    const performanceResults = [];
    
    for (const device of mobileDevices) {
      await mcp__playwright__browser_resize({
        width: device.width,
        height: device.height
      });
      
      const startTime = Date.now();
      await mcp__playwright__browser_navigate({
        url: "http://localhost:3000/wedme/photo-groups"
      });
      
      await mcp__playwright__browser_wait_for({text: "Photo Groups"});
      const loadTime = Date.now() - startTime;
      
      // Test touch interactions
      const touchStartTime = Date.now();
      await mcp__playwright__browser_drag({
        startElement: "Test Guest",
        startRef: "[data-guest-id='test-guest']",
        endElement: "Test Group",
        endRef: "[data-group-id='test-group']"
      });
      const touchTime = Date.now() - touchStartTime;
      
      performanceResults.push({
        device: device.name,
        loadTime,
        touchTime,
        viewport: `${device.width}x${device.height}`
      });
      
      // Mobile should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      // Touch interactions should be under 300ms
      expect(touchTime).toBeLessThan(300);
    }
    
    console.log('Mobile Performance Results:', performanceResults);
  });
});

// STRESS TESTING AND EDGE CASES
describe('Photo Groups Stress Testing', () => {
  test('System gracefully handles extreme edge cases', async () => {
    await mcp__playwright__browser_navigate({
      url: "http://localhost:3000/guests/photo-groups"
    });
    
    // Test creating 100 photo groups rapidly
    const groupCreationPromises = [];
    for (let i = 0; i < 100; i++) {
      groupCreationPromises.push(
        (async () => {
          await mcp__playwright__browser_click({
            element: "Create Group",
            ref: "[data-testid='create-group']"
          });
          await mcp__playwright__browser_type({
            element: "Group Name",
            ref: "[data-testid='group-name']",
            text: `Stress Test Group ${i}`
          });
          await mcp__playwright__browser_click({
            element: "Save",
            ref: "[data-testid='save-group']"
          });
        })()
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(groupCreationPromises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    console.log(`Stress Test: ${successful.length}/100 groups created in ${endTime - startTime}ms`);
    
    // Should handle at least 80% successfully
    expect(successful.length / 100).toBeGreaterThan(0.8);
    
    // Test memory cleanup after stress
    await mcp__playwright__browser_evaluate({
      function: `() => {
        if (window.gc) window.gc(); // Force garbage collection if available
      }`
    });
    
    const finalMemory = await mcp__playwright__browser_evaluate({
      function: `() => performance.memory?.usedJSHeapSize || 0`
    });
    
    // Memory should not grow excessively (under 200MB after stress test)
    expect(finalMemory).toBeLessThan(200 * 1024 * 1024);
  });
});
```

---

## ✅ SUCCESS CRITERIA (ADVANCED TESTING)

### Technical Implementation:
- [ ] Load testing passes with 95%+ success rate for 100 concurrent users
- [ ] Real-time collaboration works flawlessly with 5+ simultaneous users
- [ ] Performance testing validates all optimization targets
- [ ] Advanced security testing passes all scenarios
- [ ] Cross-device testing validates mobile and desktop integration
- [ ] Stress testing confirms graceful degradation

### Performance Validation:
- [ ] Large guest lists (500+) load within 2 seconds
- [ ] Drag-drop operations complete within 500ms
- [ ] Conflict detection completes within 1 second
- [ ] Mobile performance meets targets (<3s load on 3G)
- [ ] Memory usage stays under 100MB for normal operation
- [ ] Real-time updates delivered within 100ms

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Load Testing: `/wedsync/src/__tests__/load/photo-groups-load.test.ts`
- Performance Tests: `/wedsync/src/__tests__/performance/photo-groups-performance.test.ts`
- Integration Tests: `/wedsync/src/__tests__/integration/photo-groups-advanced.test.ts`
- Mobile Tests: `/wedsync/src/__tests__/mobile/photo-groups-mobile-advanced.test.ts`
- Stress Tests: `/wedsync/src/__tests__/stress/photo-groups-stress.test.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch14/WS-153-team-e-round-2-complete.md`
- **Performance Report:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch14/WS-153-performance-analysis.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_2_COMPLETE | team-e | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All advanced testing scenarios implemented
- [ ] Load testing validates system performance under stress
- [ ] Real-time collaboration testing confirms multi-user functionality
- [ ] Performance optimization validated across all components
- [ ] Security testing confirms advanced feature security
- [ ] Cross-device testing validates integration
- [ ] Recommendations provided to all teams

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY