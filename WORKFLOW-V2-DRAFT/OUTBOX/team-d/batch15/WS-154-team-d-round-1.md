# TEAM D - ROUND 1: WS-154 - Seating Arrangements - WedMe Mobile Platform Integration

**Date:** 2025-08-25  
**Feature ID:** WS-154 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build mobile-optimized seating interface for WedMe couple platform with touch interactions  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple using WedMe mobile app while planning on-the-go
**I want to:** Review and adjust seating arrangements on my phone with intuitive touch controls
**So that:** I can make quick seating decisions during venue visits or family discussions

**Real Wedding Problem This Solves:**
Couples often need to adjust seating plans while away from their desktop - during venue tours, family meetings, or when discussing arrangements with their partner. Mobile seating management lets them make real-time adjustments anywhere.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Touch-optimized seating interface for mobile devices
- Simplified conflict detection for mobile viewing
- Offline capability for seating review and basic edits
- Integration with WedMe couple portal authentication

**Technology Stack (VERIFIED):**
- Mobile: Next.js 15 PWA, React 19 with touch optimization
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Offline: Service Worker with IndexedDB sync
- Testing: Playwright mobile device testing
- Touch: React Native gesture handling patterns

**Integration Points:**
- WedMe Portal: Seamless navigation from couple dashboard
- Desktop Seating: Sync changes with Team A's full interface
- Conflict Detection: Mobile-optimized warnings from Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load mobile optimization docs:
await mcp__context7__resolve_library_id("next.js");
await mcp__context7__get_library_docs("/vercel/next.js", "pwa mobile-optimization", 5000);
await mcp__context7__get_library_docs("/react/react", "touch-events mobile-patterns", 4000);
await mcp__context7__get_library_docs("/tailwindlabs/tailwindcss", "mobile-responsive touch-targets", 3000);
await mcp__context7__get_library_docs("/pwa/service-worker", "offline-sync background-sync", 3000);

// 2. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing WedMe patterns:
await mcp__serena__find_symbol("WedMeLayout", "", true);
await mcp__serena__get_symbols_overview("src/app/(wedme)");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --mobile-focus --touch-optimization
2. **react-ui-specialist** --mobile-components --touch-interactions
3. **performance-optimization-expert** --mobile-performance --offline-sync
4. **accessibility-expert** --mobile-accessibility --screen-reader-support
5. **test-automation-architect** --mobile-testing --device-compatibility
6. **playwright-visual-testing-specialist** --mobile-devices --touch-testing

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **MOBILE SEATING INTERFACE:**
- [ ] **MobileSeatingViewer** - Touch-optimized table layout display
- [ ] **TouchTableCard** - Mobile table component with swipe gestures
- [ ] **GuestAssignmentModal** - Full-screen guest selection interface
- [ ] **ConflictMobileBanner** - Simplified conflict warnings for mobile
- [ ] **SeatingNavigationControls** - Mobile-friendly zoom and pan controls

### **WEDME INTEGRATION:**
- [ ] **WedMeSeatingLayout** - Integrated with WedMe portal design system
- [ ] **CoupleAuthGuard** - Secure authentication for seating access
- [ ] **MobileSeatingDashboard** - Overview page with quick stats
- [ ] **DeepLinkHandler** - Direct links to specific seating arrangements
- [ ] **ProgressSync** - Sync seating progress with main WedMe dashboard

### **MOBILE OPTIMIZATION:**
- [ ] **TouchGestureHandler** - Tap, long-press, swipe interactions
- [ ] **MobilePerformanceOptimizer** - Lazy loading, image optimization
- [ ] **OfflineSeatingCache** - Cache seating data for offline viewing
- [ ] **MobileConflictDetector** - Lightweight conflict checking
- [ ] **ResponsiveSeatingGrid** - Adaptive layout for all mobile screen sizes

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Component interfaces and shared seating logic
- FROM Team B: Mobile-optimized API endpoints with reduced payload
- FROM Team C: Simplified conflict detection API for mobile
- FROM Team E: Database query optimization for mobile performance

### What other teams NEED from you:
- TO Team A: Mobile breakpoint specifications and touch interaction patterns
- TO Team C: Mobile conflict notification preferences and display requirements

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```typescript
// REQUIRED: WedMe authentication integration
import { withWedMeAuth } from '@/lib/auth/wedme-middleware';
import { coupleSeatingSchema } from '@/lib/validation/schemas';

export const WedMeSeatingPage = withWedMeAuth(async (request, coupleData) => {
  // Verify couple access to seating data
  const { coupleId } = coupleData;
  
  // Mobile-specific rate limiting (more restrictive due to touch inputs)
  await rateLimitMobileSeating(request.ip, coupleId);
  
  // Load seating data with mobile optimization
  const seatingData = await getMobileOptimizedSeatingData(coupleId);
  
  return <MobileSeatingInterface data={seatingData} />;
});
```

**Security Checklist:**
- [ ] Integrate with existing WedMe authentication system
- [ ] Implement mobile-specific rate limiting (touch spam prevention)
- [ ] Secure offline data storage with encryption
- [ ] Validate all touch-based interactions server-side
- [ ] Implement session timeout appropriate for mobile usage

---

## 📱 MOBILE PWA REQUIREMENTS

```typescript
// REQUIRED: PWA Service Worker for offline seating
// File: /wedsync/public/sw.js
self.addEventListener('sync', event => {
  if (event.tag === 'seating-sync') {
    event.waitUntil(syncSeatingChanges());
  }
});

async function syncSeatingChanges() {
  const pendingChanges = await getOfflineSeatingChanges();
  
  for (const change of pendingChanges) {
    try {
      await fetch('/api/seating/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      });
      
      await markChangeAsSynced(change.id);
    } catch (error) {
      console.log('Sync failed, will retry:', error);
    }
  }
}
```

**PWA Checklist:**
- [ ] Service Worker for offline seating data
- [ ] Background sync for seating changes
- [ ] App manifest with seating-specific icons
- [ ] IndexedDB storage for offline arrangements
- [ ] Network-first strategy with offline fallback

---

## 🧪 MOBILE TESTING REQUIREMENTS

```typescript
// PLAYWRIGHT MOBILE TESTING - Test real devices
describe('Mobile Seating Interface', () => {
  test('touch interactions work on various devices', async () => {
    const devices = ['iPhone SE', 'iPhone 12', 'Pixel 5', 'iPad'];
    
    for (const deviceName of devices) {
      await mcp__playwright__browser_resize({
        width: devices[deviceName].viewport.width,
        height: devices[deviceName].viewport.height
      });
      
      // Test touch interactions
      await mcp__playwright__browser_click({
        element: "table-card",
        ref: "table-1"
      });
      
      // Verify mobile-specific UI elements
      const snapshot = await mcp__playwright__browser_snapshot();
      expect(snapshot.elements).toContainMobileOptimizations();
    }
  });

  test('offline functionality maintains seating data', async () => {
    // Simulate offline mode
    await mcp__playwright__browser_evaluate({
      function: "() => { navigator.onLine = false; }"
    });
    
    // Test offline seating viewing
    await mcp__playwright__browser_navigate({url: "/wedme/seating"});
    await mcp__playwright__browser_wait_for({text: "Viewing offline data"});
    
    // Verify seating data still accessible
    const tableCount = await mcp__playwright__browser_evaluate({
      function: "() => document.querySelectorAll('.table-card').length"
    });
    expect(tableCount).toBeGreaterThan(0);
  });
});
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] Mobile seating interface working on iOS and Android
- [ ] Touch interactions (tap, swipe, long-press) fully functional
- [ ] PWA offline capability for seating viewing
- [ ] Integration with WedMe portal authentication
- [ ] Responsive design working on all mobile screen sizes (320px-768px)
- [ ] Unit tests written FIRST and passing (>80% coverage)
- [ ] Playwright mobile device tests passing
- [ ] Performance: Mobile seating loads in <2 seconds on 3G
- [ ] Accessibility: Touch targets meet 44px minimum requirement
- [ ] Zero TypeScript errors in mobile components

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile UI: `/wedsync/src/app/(wedme)/seating/`
- Components: `/wedsync/src/components/mobile/seating/`
- PWA: `/wedsync/public/sw.js` and `/wedsync/public/manifest.json`
- Types: `/wedsync/src/types/mobile-seating.ts`
- Tests: `/wedsync/tests/mobile/seating/`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch15/WS-154-team-d-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT implement desktop seating interface (Team A's responsibility)
- Do NOT create backend APIs (Team B's responsibility)
- Do NOT modify WedMe core authentication (use existing system)
- REMEMBER: Mobile users need simplified, touch-friendly interfaces
- PERFORMANCE: Mobile users often have slower connections - optimize aggressively

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY