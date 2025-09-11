# TEAM D - ROUND 1: WS-153 - Photo Groups Management - WedMe Platform Integration

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Integrate photo group management into WedMe couple platform with mobile optimization  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple using the WedMe mobile platform
**I want to:** Create and manage photo groups on my phone while planning my wedding
**So that:** I can organize photo sessions anywhere and share group details with my photographer instantly

**Real Wedding Problem This Solves:**
Couples currently juggle multiple apps and paper lists to organize wedding photos. With WedMe integration, they can create "Bridal Party (6 people)" group while at the venue, add uncle Tom who just confirmed attendance, and instantly share updated photo list with photographer via the WedMe platform.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- WedMe platform integration for photo group management
- Mobile-first responsive design optimization
- Touch-friendly drag-and-drop interactions
- Integration with existing WedMe navigation and layout
- Real-time sync between WedMe and supplier dashboard
- Offline capability for photo group editing

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Mobile: Touch-optimized interactions, PWA features

**Integration Points:**
- **WedMe Platform**: Existing couple portal navigation and layout
- **Photo Components**: UI components from Team A
- **API Endpoints**: Backend services from Team B
- **Database**: Schema from Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "app-router mobile-optimization pwa", 5000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "responsive-design mobile-first touch", 3000);
await mcp__context7__get-library-docs("/react/react", "touch-events mobile-interactions", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing WedMe patterns:
await mcp__serena__find_symbol("WedMe", "src/app", true);
await mcp__serena__get_symbols_overview("src/app/(wedme)");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated mobile APIs (React changes frequently!)
- Serena shows existing WedMe patterns to follow
- Agents work with current knowledge (no outdated mobile approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "WedMe photo group integration"
2. **react-ui-specialist** --think-hard --mobile-first --touch-optimized "Mobile photo management" 
3. **wedding-domain-expert** --think-ultra-hard --wedme-platform "Couple experience optimization" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --mobile-testing --touch-interactions
6. **playwright-visual-testing-specialist** --mobile-viewports --touch-testing
7. **code-quality-guardian** --mobile-patterns --wedme-consistency

**AGENT INSTRUCTIONS:** "Use Context7 mobile docs. Follow WedMe platform patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL WedMe platform files in `/src/app/(wedme)/` first
- Understand existing WedMe layout and navigation patterns
- Check mobile interaction patterns and touch optimizations
- Review existing guest management integration
- Continue until you FULLY understand WedMe architecture

### **PLAN PHASE (THINK HARD!)**
- Plan mobile-first photo group interface
- Design touch-friendly interactions
- Plan integration with WedMe navigation
- Consider offline scenarios and sync
- Don't rush - mobile UX is critical

### **CODE PHASE (PARALLEL AGENTS!)**
- Follow WedMe design system
- Implement touch-optimized interactions
- Use existing WedMe components where possible
- Test on multiple mobile viewports
- Focus on smooth mobile experience

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Test on mobile devices/emulators
- Verify touch interactions work
- Create evidence package
- Generate mobile screenshots
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (WedMe Platform Integration):
- [ ] **WedMe Photo Groups Page**: `/src/app/(wedme)/photo-groups/page.tsx`
- [ ] **Mobile Photo Group Builder**: Mobile-optimized version of Team A components
- [ ] **Touch Drag-Drop**: Touch-friendly guest assignment interface
- [ ] **WedMe Navigation Integration**: Add photo groups to WedMe menu
- [ ] **Mobile Responsive Layout**: Optimized for 375px+ screens
- [ ] **Touch Gesture Support**: Swipe, tap, long-press interactions
- [ ] **Offline Mode Preparation**: Local storage for draft changes

### Mobile Optimization Features:
- [ ] Touch-optimized drag-and-drop (no hover states)
- [ ] Large touch targets (44px minimum)
- [ ] Swipe gestures for navigation
- [ ] Pull-to-refresh functionality
- [ ] Loading states optimized for slow connections
- [ ] Keyboard avoiders for form inputs

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Photo group UI components (adapt for mobile)
- FROM Team B: API endpoints for photo group operations
- FROM Team C: Database integration patterns

### What other teams NEED from you:
- TO Team A: Mobile interaction requirements and patterns
- TO Team B: WedMe-specific API requirements
- TO Team E: WedMe integration test scenarios

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 MOBILE-SPECIFIC SECURITY CONCERNS

**MANDATORY MOBILE SECURITY:**
- [ ] **Touch Authentication**: Secure touch interactions
- [ ] **Local Storage Security**: Encrypted offline data
- [ ] **Session Management**: Mobile session handling
- [ ] **Biometric Integration**: If supported, secure photo access
- [ ] **Network Security**: Handle offline/online transitions safely

```typescript
// ✅ MOBILE SECURITY PATTERN:
import { useSecureStorage } from '@/hooks/useSecureStorage';
import { useMobileAuth } from '@/hooks/useMobileAuth';

export function MobilePhotoGroups() {
  const { isAuthenticated, refreshAuth } = useMobileAuth();
  const { secureStore, secureRetrieve } = useSecureStorage();
  
  // Secure offline storage
  const saveDraftSecurely = (draft) => {
    secureStore('photo_groups_draft', draft, {
      encrypt: true,
      expiry: Date.now() + (24 * 60 * 60 * 1000) // 24h
    });
  };
  
  return (
    <MobileLayout>
      {isAuthenticated ? (
        <PhotoGroupInterface />
      ) : (
        <MobileAuthPrompt />
      )}
    </MobileLayout>
  );
}
```

**MOBILE SECURITY CHECKLIST:**
- [ ] **Touch Security**: Prevent accidental data exposure
- [ ] **Offline Data**: Encrypt local storage
- [ ] **Session Timeout**: Mobile-appropriate timeouts
- [ ] **Secure Sync**: Safe online/offline transitions
- [ ] **Input Validation**: Touch input sanitization

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 MOBILE-FIRST TESTING WITH TOUCH INTERACTIONS:**

```javascript
// REVOLUTIONARY MOBILE TESTING APPROACH!

// 1. MOBILE VIEWPORT TESTING (GAME CHANGER!)
for (const device of [{width: 375, height: 667}, {width: 414, height: 896}, {width: 390, height: 844}]) {
  await mcp__playwright__browser_resize({width: device.width, height: device.height});
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
  
  // Test accessibility tree on mobile
  const mobileSnapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({
    filename: `mobile-${device.width}x${device.height}-photo-groups.png`
  });
}

// 2. TOUCH GESTURE SIMULATION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate touch drag (mobile drag-drop)
    const startElement = document.querySelector('[data-guest-id="guest1"]');
    const endElement = document.querySelector('[data-group-id="group1"]');
    
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: startElement.offsetLeft, clientY: startElement.offsetTop }]
    });
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientX: endElement.offsetLeft, clientY: endElement.offsetTop }]
    });
    const touchEnd = new TouchEvent('touchend', { touches: [] });
    
    startElement.dispatchEvent(touchStart);
    document.dispatchEvent(touchMove);
    endElement.dispatchEvent(touchEnd);
    
    return 'touch-simulation-complete';
  }`
});

// 3. MOBILE PERFORMANCE TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test mobile-specific performance metrics
    return {
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      touchLatency: performance.now(), // Measure touch response time
      memoryUsage: navigator.deviceMemory || 'unknown',
      connectionType: navigator.connection?.effectiveType || 'unknown'
    };
  }`
});
```

**REQUIRED MOBILE TEST COVERAGE:**
- [ ] Touch interactions work on all common mobile sizes
- [ ] Drag-drop functions with touch gestures
- [ ] WedMe navigation works on mobile
- [ ] Performance acceptable on slower connections
- [ ] Offline mode gracefully handles disconnection

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] WedMe photo groups page fully functional
- [ ] Mobile-optimized UI components working
- [ ] Touch interactions smooth and responsive
- [ ] WedMe navigation integration complete
- [ ] Offline preparation implemented

### Mobile & Performance:
- [ ] Works perfectly on 375px+ screen sizes
- [ ] Touch targets meet 44px minimum size
- [ ] Smooth 60fps interactions on mobile
- [ ] Fast loading on slow connections (<3s on 3G)
- [ ] No horizontal scrolling on mobile
- [ ] All touch gestures work intuitively

### Evidence Package Required:
- [ ] Screenshots on iPhone/Android sizes (375px, 390px, 414px)
- [ ] Touch interaction demo videos
- [ ] Mobile performance metrics
- [ ] WedMe integration proof
- [ ] Offline mode demonstration

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- WedMe Page: `/wedsync/src/app/(wedme)/photo-groups/page.tsx`
- Mobile Components: `/wedsync/src/components/wedme/MobilePhotoGroups.tsx`
- Touch Utils: `/wedsync/src/lib/utils/touch-interactions.ts`
- Mobile Hooks: `/wedsync/src/hooks/useMobilePhotoGroups.ts`
- Tests: `/wedsync/src/__tests__/mobile/wedme-photo-groups.test.tsx`
- E2E Tests: `/wedsync/src/__tests__/playwright/mobile-photo-groups.spec.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch14/WS-153-team-d-round-1-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_1_COMPLETE | team-d | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify core photo group components from Team A
- Do NOT skip mobile testing - UX is critical
- Do NOT ignore touch accessibility
- Do NOT claim completion without mobile evidence
- REMEMBER: All 5 teams work in PARALLEL - coordinate with Team A
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] WedMe integration complete
- [ ] Mobile optimizations implemented
- [ ] Touch interactions tested
- [ ] Performance validated
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY