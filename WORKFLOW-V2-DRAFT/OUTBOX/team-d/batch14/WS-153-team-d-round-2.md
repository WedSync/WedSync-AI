# TEAM D - ROUND 2: WS-153 - Photo Groups Management - WedMe Platform Integration

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Integrate photo group management into WedMe platform with mobile-optimized features  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple using the WedMe mobile app
**I want to:** Full photo group management capabilities on my mobile device
**So that:** I can manage photo groups on-the-go, during venue visits, and share with my photographer instantly

**Real Wedding Problem This Solves:**
Building on Round 1's basic WedMe integration, couples need mobile-optimized photo group management during venue tours, engagement shoots, and planning sessions. They need to quickly add guests to photo groups, share lists with photographers via mobile, and coordinate in real-time.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Round 1 Foundation:**
- Mobile-optimized photo group interfaces for WedMe platform
- Touch-friendly drag-and-drop for guest assignment
- Mobile photo group sharing capabilities
- Offline support for photo group editing
- Integration with WedMe's existing guest management
- Mobile photographer collaboration features

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Mobile: PWA features, touch optimization
- WedMe Platform: Existing WedMe components and patterns

**Integration Points:**
- **WedMe Platform**: Deep integration with existing WedMe mobile interface
- **Team A Components**: Adapt desktop components for mobile use
- **Team B APIs**: Mobile-optimized API calls with offline caching
- **Team C Database**: Efficient mobile queries and sync

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  
await mcp__context7__get-library-docs("/vercel/next.js", "pwa mobile-optimization touch", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "offline-support mobile-sync", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "mobile-responsive touch-ui", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW Round 1 WedMe implementation:
await mcp__serena__find_symbol("WedMe", "", true);
await mcp__serena__get_symbols_overview("src/components/wedme");
await mcp__serena__search_for_pattern("mobile.*photo", "", false, true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "WedMe photo group integration"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Mobile-optimized photo group UI" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Mobile wedding planning workflows" 
4. **security-compliance-officer** --think-ultra-hard --mobile-security-requirements
5. **test-automation-architect** --mobile-testing --touch-testing-approach
6. **playwright-visual-testing-specialist** --mobile-responsive --touch-testing
7. **performance-optimization-expert** --mobile-performance --touch-optimization

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (WedMe Mobile Integration):
- [ ] **WedMe Photo Group Dashboard** - Mobile-optimized photo group overview
- [ ] **Mobile Group Builder** - Touch-friendly group creation interface
- [ ] **Mobile Guest Assignment** - Drag-drop optimized for touch screens
- [ ] **Quick Share Feature** - One-tap sharing with photographers
- [ ] **Offline Photo Group Editor** - Work without internet connection
- [ ] **Mobile Conflict Detection** - Visual conflict warnings on mobile
- [ ] **WedMe Navigation Integration** - Seamless integration with WedMe menu
- [ ] **Mobile Performance Optimization** - Fast loading on mobile networks

### Mobile-Specific Features:
- [ ] Swipe gestures for guest assignment
- [ ] Pull-to-refresh for photo group updates
- [ ] Mobile-optimized conflict resolution interface
- [ ] Quick-add guest to multiple groups
- [ ] Mobile photographer sharing (QR codes, deep links)
- [ ] Touch-friendly priority reordering
- [ ] Mobile timeline view for photo schedules
- [ ] Haptic feedback for interactions (where supported)

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Round 1 Complete):
- FROM Team A: Desktop components for mobile adaptation - **READY**
- FROM Team B: Mobile-optimized API endpoints - **READY FOR REQUESTS**
- FROM Team C: Efficient mobile queries - **READY FOR REQUESTS**

### What other teams NEED from you:
- TO Team A: Mobile UI patterns for responsive design
- TO Team E: Mobile components for comprehensive testing
- TO All Teams: WedMe integration patterns

---

## 🔒 SECURITY REQUIREMENTS (MOBILE SECURITY)

### Mobile-Specific Security:
- [ ] **Touch Security**: Prevent accidental sensitive actions
- [ ] **Offline Security**: Secure offline data storage
- [ ] **Mobile Auth**: Enhanced authentication for mobile devices
- [ ] **Deep Link Security**: Secure photo group sharing links
- [ ] **Mobile Session Management**: Proper session handling on mobile

```typescript
// Mobile-secure photo group sharing
export async function generateSecureShareLink(groupId: string) {
  const token = await generateSecureToken({
    groupId,
    expiresIn: '24h',
    permissions: ['read'],
    deviceType: 'mobile'
  });
  
  return `wedme://photo-groups/${groupId}?token=${token}`;
}
```

---

## 🎭 MOBILE-FOCUSED TESTING (ROUND 2)

```javascript
// MOBILE TOUCH TESTING
describe('WedMe Photo Groups Mobile', () => {
  test('Touch drag-and-drop works on mobile viewports', async () => {
    // Set mobile viewport
    await mcp__playwright__browser_resize({width: 375, height: 667});
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
    
    // Verify mobile layout
    const mobileSnapshot = await mcp__playwright__browser_snapshot();
    expect(mobileSnapshot).toContain('Mobile Photo Groups');
    
    // Test touch drag-and-drop
    await mcp__playwright__browser_drag({
      startElement: "Guest: John Smith",
      startRef: "[data-mobile-guest='john-smith']",
      endElement: "Photo Group: Family",
      endRef: "[data-mobile-group='family']"
    });
    
    await mcp__playwright__browser_wait_for({text: "John added to Family"});
  });
  
  test('Swipe gestures work for guest assignment', async () => {
    await mcp__playwright__browser_resize({width: 375, height: 667});
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
    
    // Simulate swipe gesture (swipe guest card right to add to group)
    await mcp__playwright__browser_evaluate({
      function: `() => {
        const guestCard = document.querySelector('[data-guest-id="guest-1"]');
        const touchStart = new TouchEvent('touchstart', {
          touches: [new Touch({identifier: 1, target: guestCard, clientX: 100, clientY: 200})]
        });
        const touchMove = new TouchEvent('touchmove', {
          touches: [new Touch({identifier: 1, target: guestCard, clientX: 200, clientY: 200})]
        });
        const touchEnd = new TouchEvent('touchend', {});
        
        guestCard.dispatchEvent(touchStart);
        guestCard.dispatchEvent(touchMove);
        guestCard.dispatchEvent(touchEnd);
      }`
    });
    
    await mcp__playwright__browser_wait_for({text: "Swipe to assign completed"});
  });
  
  test('Offline functionality works correctly', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
    
    // Go offline
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Simulate offline
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      }`
    });
    
    // Try to create photo group offline
    await mcp__playwright__browser_click({
      element: "Add Group",
      ref: "[data-testid='add-group-offline']"
    });
    
    await mcp__playwright__browser_type({
      element: "Group Name",
      ref: "[data-testid='group-name']",
      text: "Offline Test Group"
    });
    
    await mcp__playwright__browser_click({
      element: "Save Offline",
      ref: "[data-testid='save-offline']"
    });
    
    await mcp__playwright__browser_wait_for({text: "Saved offline - will sync when online"});
    
    // Go back online
    await mcp__playwright__browser_evaluate({
      function: `() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      }`
    });
    
    await mcp__playwright__browser_wait_for({text: "Synced successfully"});
  });
});

// MOBILE PERFORMANCE TESTING
describe('WedMe Mobile Performance', () => {
  test('Photo groups load quickly on mobile networks', async () => {
    // Simulate 3G network
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Throttle network to simulate 3G
        if ('connection' in navigator) {
          Object.defineProperty(navigator.connection, 'effectiveType', {
            value: '3g'
          });
        }
      }`
    });
    
    const startTime = Date.now();
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
    
    // Wait for photo groups to load
    await mcp__playwright__browser_wait_for({text: "Photo Groups"});
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds on 3G
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('Mobile UI is responsive and touch-friendly', async () => {
    const viewports = [
      {width: 320, height: 568}, // iPhone 5
      {width: 375, height: 667}, // iPhone 6/7/8
      {width: 414, height: 896}, // iPhone XR
      {width: 360, height: 640}  // Android
    ];
    
    for (const viewport of viewports) {
      await mcp__playwright__browser_resize(viewport);
      await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
      
      const snapshot = await mcp__playwright__browser_snapshot();
      
      // Verify mobile-friendly elements
      expect(snapshot).toContain('touch-friendly');
      expect(snapshot).toContain('mobile-optimized');
      
      // Take screenshot for visual verification
      await mcp__playwright__browser_take_screenshot({
        filename: `wedme-photo-groups-${viewport.width}x${viewport.height}.png`
      });
    }
  });
});
```

---

## ✅ SUCCESS CRITERIA (WEDME MOBILE INTEGRATION)

### Technical Implementation:
- [ ] All mobile photo group features complete
- [ ] Touch interactions work smoothly on all devices
- [ ] Offline functionality preserves data correctly
- [ ] WedMe integration seamless and intuitive
- [ ] Mobile performance meets targets (<3s load on 3G)
- [ ] Responsive design works on all mobile viewports

### Mobile User Experience:
- [ ] Drag-and-drop optimized for touch screens
- [ ] Swipe gestures intuitive and reliable
- [ ] Mobile sharing features work correctly
- [ ] Offline editing syncs properly when online
- [ ] Visual feedback appropriate for mobile interactions
- [ ] Performance smooth on older devices

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- WedMe Components: `/wedsync/src/components/wedme/PhotoGroupsMobile.tsx`
- WedMe Components: `/wedsync/src/components/wedme/MobileGroupBuilder.tsx`
- WedMe Components: `/wedsync/src/components/wedme/MobileGuestAssignment.tsx`
- Mobile Services: `/wedsync/src/lib/services/mobilePhotoGroupService.ts`
- Offline Support: `/wedsync/src/lib/offline/photoGroupOfflineService.ts`
- Tests: `/wedsync/src/__tests__/mobile/wedme-photo-groups.test.tsx`
- E2E Tests: `/wedsync/src/__tests__/playwright/wedme-photo-groups-mobile.spec.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch14/WS-153-team-d-round-2-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_2_COMPLETE | team-d | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All WedMe mobile integration features complete
- [ ] Touch interactions tested and working
- [ ] Offline functionality implemented and tested
- [ ] Mobile performance optimized
- [ ] Integration with other team outputs verified
- [ ] Mobile security requirements met

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY