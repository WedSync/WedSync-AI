# TEAM D - ROUND 1: WS-282 - Interactive Dashboard Tour
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive mobile-first WedMe platform integration for interactive tour with PWA capabilities and offline functionality
**FEATURE ID:** WS-282 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile wedding coordination workflows and couple onboarding experience

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedme/tour/
cat $WS_ROOT/wedsync/src/components/wedme/tour/MobileTourInterface.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedme-tour
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧠 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query WedMe mobile patterns and PWA implementations
await mcp__serena__search_for_pattern("wedme mobile pwa offline");
await mcp__serena__find_symbol("mobile tour interface", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/wedme/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load mobile and PWA-specific documentation
# Use Ref MCP to search for:
# - "Next.js PWA service-worker offline"
# - "React mobile-first responsive-design"
# - "PWA installation prompts mobile-safari"
# - "Service worker caching strategies"
# - "Mobile touch interactions wedding-apps"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Find existing mobile and PWA patterns
await mcp__serena__find_referencing_symbols("mobile responsive pwa");
await mcp__serena__search_for_pattern("touch interaction gesture");
await mcp__serena__find_symbol("service worker cache", "", true);
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX PLATFORM PLANNING

### Platform-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile-First Platform Strategy
```typescript
// Before building WedMe platform features
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe interactive tour needs: mobile-first interface optimized for touch, PWA installation prompts for app-like experience, offline capability for tour content in areas with poor connectivity, gesture-based navigation for intuitive mobile use, and cross-device tour sync when couples switch between phone and desktop.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Platform considerations: Couples primarily use phones for wedding planning (80% mobile traffic), tour must work offline at venues with poor signal, touch targets need 44x44px minimum for accessibility, loading states critical for mobile networks, tour progress must sync across devices seamlessly.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe-specific tour features: Couple-focused onboarding highlighting vendor coordination, guest management tour with mobile-specific workflows, budget overview with touch-optimized interactions, photo sharing education for wedding coordination, real-time collaboration tour for couples planning together.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use PWA best practices with service worker for offline tour content, implement touch-friendly swipe gestures for tour navigation, create mobile-specific UI components with larger touch targets, ensure fast loading on 3G networks, build device-specific tour customization based on mobile capabilities.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down mobile tour features, track PWA requirements, identify touch interaction needs
   
2. **mobile-pwa-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture  
   - Mission: Design PWA architecture, offline tour strategy, mobile-first UI patterns
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Secure offline tour data, validate mobile authentication, protect couple data on devices
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure mobile patterns match existing WedMe components and responsive design
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write mobile-specific tests, PWA functionality tests, touch interaction tests
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document mobile patterns, PWA setup guides, couple user journey flows

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all mobile and PWA patterns
await mcp__serena__find_symbol("mobile responsive touch", "", true);
await mcp__serena__search_for_pattern("pwa service worker offline");
await mcp__serena__find_referencing_symbols("wedme mobile component");
```
- [ ] Identified existing mobile UI patterns to follow
- [ ] Found all PWA implementation points  
- [ ] Understood WedMe platform architecture
- [ ] Located similar mobile tour implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Mobile architecture decisions based on existing WedMe patterns
- [ ] Mobile-specific test cases written FIRST (TDD)
- [ ] PWA security measures for offline tour data
- [ ] Performance considerations for mobile networks and devices

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use mobile patterns discovered by Serena
- [ ] Maintain consistency with existing WedMe platform components
- [ ] Include comprehensive offline functionality with graceful degradation
- [ ] Test on actual mobile devices continuously during development

## 🎯 TEAM D SPECIALIZATION: PLATFORM/WEDME FOCUS

**Core WedMe Platform Components to Build:**

1. **MobileTourInterface** - Touch-optimized tour interface for couples
2. **PWATourManager** - Service worker and offline tour capability  
3. **CoupleOnboardingFlow** - Wedding-specific onboarding for couples
4. **MobileGestureHandler** - Swipe, pinch, and touch gesture navigation
5. **OfflineTourContent** - Cached tour content for poor connectivity areas
6. **DeviceSyncManager** - Cross-device tour progress synchronization

### Key Features:
- Mobile-first responsive design with touch-optimized interactions
- PWA capabilities with offline tour functionality
- Couple-specific onboarding highlighting vendor coordination
- Gesture-based navigation (swipe, tap, pinch)
- Cross-device tour progress synchronization
- Installation prompts for app-like experience

### Mobile Platform Requirements:
- **Touch Targets**: Minimum 44x44px for accessibility compliance
- **Gesture Support**: Swipe left/right for tour navigation, pinch for content zoom
- **Offline Mode**: Tour content cached for venue visits with poor connectivity
- **PWA Features**: Installation prompts, push notifications for tour reminders
- **Performance**: <2s load time on 3G networks, <500ms interaction responses

## 📋 TECHNICAL SPECIFICATION

### WedMe Platform Tour Requirements:
- Mobile-first design with desktop graceful enhancement
- PWA installation with custom splash screen and icons
- Offline capability for core tour content (educational materials, step instructions)
- Push notification integration for tour completion reminders
- Cross-device synchronization when couples switch between phone/tablet/desktop

### Mobile Architecture:
```typescript
interface MobileWedMeTourPlatform {
  // Mobile-specific tour interface
  initializeMobileTour(coupleData: CoupleData): Promise<MobileTourSession>;
  handleTouchGestures(gesture: TouchGesture): TourNavigation;
  optimizeForMobileViewport(screenSize: ScreenDimensions): ResponsiveLayout;
  
  // PWA capabilities
  enableOfflineMode(): Promise<ServiceWorkerRegistration>;
  cacheTourContent(tourSteps: TourStep[]): Promise<CacheStorage>;
  handleInstallationPrompt(): Promise<InstallationResult>;
  
  // Couple-specific features
  setupCoupleCollaboration(couple: CoupleUsers): Promise<CollaborationSession>;
  syncTourProgressAcrossDevices(progress: TourProgress): Promise<SyncResult>;
  customizeTourForWeddingType(weddingDetails: WeddingInfo): Promise<CustomTourFlow>;
  
  // Mobile performance optimizations
  lazyLoadTourContent(step: number): Promise<TourStepContent>;
  optimizeImagesForMobile(images: TourImage[]): Promise<OptimizedImage[]>;
  handlePoorConnectivity(): Promise<OfflineFallback>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Core Mobile Components:
- [ ] **MobileTourInterface.tsx** - Touch-optimized tour UI for WedMe couples  
- [ ] **PWATourManager.ts** - Service worker and offline functionality
- [ ] **CoupleOnboardingFlow.tsx** - Wedding-specific couple onboarding experience
- [ ] **MobileGestureHandler.ts** - Touch gesture recognition and navigation
- [ ] **OfflineTourCache.ts** - Tour content caching for offline access

### PWA Infrastructure:
- [ ] **service-worker.js** - Tour content caching and offline functionality
- [ ] **manifest.json** - PWA configuration with wedding-themed branding
- [ ] **install-prompt.ts** - Custom PWA installation experience
- [ ] **push-notifications.ts** - Tour reminder notifications

### Mobile-Specific Features:
- [ ] **touch-gesture-navigation.ts** - Swipe and gesture-based tour controls
- [ ] **mobile-responsive-layout.scss** - Mobile-first responsive CSS
- [ ] **device-sync-manager.ts** - Cross-device tour progress synchronization
- [ ] **mobile-performance-optimizer.ts** - Image and content optimization

## 🔗 DEPENDENCIES

### What You Need from Other Teams:
- **Team A**: Tour UI component specifications and interaction hooks
- **Team B**: Tour progress API endpoints and couple session management  
- **Team C**: Tour analytics integration for mobile usage tracking
- **Team E**: Mobile device testing requirements and performance benchmarks

### What Others Need from You:
- Mobile UI component interfaces for responsive integration
- PWA service worker patterns for offline functionality
- Touch gesture specifications for accessible mobile interactions
- Device capability detection for adaptive tour experiences

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Mobile Security Checklist:
- [ ] **Secure PWA manifest** - Validate manifest.json for security headers
- [ ] **Service worker security** - Implement proper cache validation and CSP
- [ ] **Touch input validation** - Validate all gesture and touch inputs
- [ ] **Offline data encryption** - Encrypt cached tour content and user data
- [ ] **Device authentication** - Secure cross-device synchronization
- [ ] **Push notification security** - Validate notification payloads
- [ ] **Mobile session management** - Secure couple authentication on mobile
- [ ] **Biometric integration** - Support Touch ID/Face ID where available

### Required Mobile Security Files:
```typescript
// These MUST exist and be used:
import { mobileSecurityValidator } from '$WS_ROOT/wedsync/src/lib/security/mobile-validation';
import { pwaSecurityHeaders } from '$WS_ROOT/wedsync/src/lib/security/pwa-headers';
import { offlineDataEncryption } from '$WS_ROOT/wedsync/src/lib/security/offline-encryption';
import { touchInputValidator } from '$WS_ROOT/wedsync/src/lib/validation/touch-inputs';
```

### Mobile Validation Pattern:
```typescript
const mobileGestureSchema = z.object({
  gestureType: z.enum(['swipe', 'tap', 'pinch', 'rotate']),
  coordinates: z.object({
    startX: z.number().min(0),
    startY: z.number().min(0),
    endX: z.number().min(0),
    endY: z.number().min(0)
  }),
  timestamp: z.number().min(0),
  deviceInfo: z.object({
    userAgent: secureStringSchema,
    screenWidth: z.number().min(200).max(4000),
    screenHeight: z.number().min(200).max(4000)
  })
});

export const handleMobileGesture = async (request: Request) => {
  const validatedGesture = mobileGestureSchema.parse(await request.json());
  // Process validated touch input
};
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary mobile-first accessibility testing:

```javascript
// MOBILE-SPECIFIC TESTING APPROACH

// 1. MOBILE VIEWPORT TESTING (All Common Devices)
const mobileDevices = [
  {name: 'iPhone SE', width: 375, height: 667},
  {name: 'iPhone 12', width: 390, height: 844},
  {name: 'Samsung Galaxy S21', width: 384, height: 854},
  {name: 'iPad Mini', width: 768, height: 1024}
];

for (const device of mobileDevices) {
  await mcp__playwright__browser_resize({width: device.width, height: device.height});
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tour"});
  
  // Verify touch targets are ≥44x44px
  const touchTargets = await mcp__playwright__browser_evaluate({
    function: `() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      return buttons.map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          id: btn.id || btn.textContent?.slice(0, 20),
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height
        };
      }).filter(btn => btn.width < 44 || btn.height < 44);
    }`
  });
  
  await mcp__playwright__browser_take_screenshot({filename: `${device.name}-tour.png`});
}

// 2. GESTURE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tour"});

// Test swipe gestures for tour navigation
await mcp__playwright__browser_drag({
  startElement: '[data-testid="tour-content"]', startRef: 'right',
  endElement: '[data-testid="tour-content"]', endRef: 'left'
});
await mcp__playwright__browser_wait_for({text: "Next Step"});

// Test pinch zoom on educational content
await mcp__playwright__browser_evaluate({
  function: `() => {
    const content = document.querySelector('[data-testid="educational-content"]');
    const touchStart = new TouchEvent('touchstart', {
      touches: [
        {clientX: 100, clientY: 100},
        {clientX: 200, clientY: 200}
      ]
    });
    const touchMove = new TouchEvent('touchmove', {
      touches: [
        {clientX: 50, clientY: 50},
        {clientX: 250, clientY: 250}
      ]
    });
    content.dispatchEvent(touchStart);
    content.dispatchEvent(touchMove);
  }`
});

// 3. PWA FUNCTIONALITY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tour"});

// Test service worker registration
const serviceWorkerStatus = await mcp__playwright__browser_evaluate({
  function: `() => ({
    serviceWorkerSupported: 'serviceWorker' in navigator,
    serviceWorkerRegistered: navigator.serviceWorker.controller !== null,
    cacheAPISupported: 'caches' in window
  })`
});

// Test offline functionality
await mcp__playwright__browser_evaluate({function: `() => window.navigator.onLine = false`});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tour"});
const offlineContent = await mcp__playwright__browser_wait_for({text: "Tour available offline"});

// 4. MOBILE PERFORMANCE TESTING
const mobilePerformance = await mcp__playwright__browser_evaluate({
  function: `() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstContentfulPaint: paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime,
      largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      touchResponseTime: performance.now() // Measure touch to visual feedback
    };
  }`
});

// 5. CROSS-DEVICE SYNC TESTING
await mcp__playwright__browser_tabs({action: "new", url: "/wedme/tour?device=mobile"});
await mcp__playwright__browser_tabs({action: "new", url: "/wedme/tour?device=desktop"});
await mcp__playwright__browser_tabs({action: "select", index: 0}); // Mobile tab
await mcp__playwright__browser_click({selector: '[data-testid="tour-step-complete"]'});
await mcp__playwright__browser_tabs({action: "select", index: 1}); // Desktop tab  
await mcp__playwright__browser_wait_for({text: "Step 2"}); // Verify sync
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All mobile deliverables complete WITH EVIDENCE
- [ ] Mobile-specific tests written FIRST and passing (show mobile test results)
- [ ] Serena PWA patterns followed (list mobile patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero PWA manifest errors (show Lighthouse PWA score)

### Mobile Evidence:
```typescript
// Include actual mobile code showing:
// 1. Touch-optimized component implementation
// 2. PWA service worker with tour content caching
// 3. Cross-device synchronization system
// 4. Mobile gesture handling
export const MobileTourInterface = React.forwardRef<HTMLDivElement, MobileTourProps>(
  ({ tourData, onGesture }, ref) => {
    // Following pattern from wedme/mobile/base-mobile.tsx:45-67
    // Serena confirmed this matches 6 other mobile WedMe components
    const handleTouchGesture = useCallback((gesture: TouchGesture) => {
      // Mobile gesture implementation here
    }, []);
    
    return (
      <div ref={ref} className="mobile-tour-interface touch-friendly">
        {/* Touch-optimized tour content */}
      </div>
    );
  }
);
```

### Mobile Performance Evidence:
```javascript
// Required mobile performance metrics
const mobileMetrics = {
  firstContentfulPaint: "1.2s", // Target: <1.5s on 3G
  touchResponseTime: "16ms", // Target: <16ms (60fps)
  pwaInstallPrompt: "2.1s", // Target: <3s after page load
  offlineLoadTime: "450ms", // Target: <500ms from cache
  gestureLag: "8ms", // Target: <16ms for smooth gestures
  deviceSyncTime: "180ms" // Target: <200ms cross-device sync
}
```

## 💾 WHERE TO SAVE

### Core Mobile Files:
- **Mobile Components**: `$WS_ROOT/wedsync/src/components/wedme/tour/mobile/`
- **PWA Configuration**: `$WS_ROOT/wedsync/public/manifest.json` & `$WS_ROOT/wedsync/public/sw.js`
- **Mobile Services**: `$WS_ROOT/wedsync/src/lib/mobile/tour/`
- **Gesture Handlers**: `$WS_ROOT/wedsync/src/lib/mobile/gestures/`

### Supporting Files:
- **Types**: `$WS_ROOT/wedsync/src/types/mobile-tour.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/mobile/tour/`
- **Mobile Styles**: `$WS_ROOT/wedsync/src/styles/mobile-tour.scss`
- **Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## ⚠️ CRITICAL WARNINGS

### Mobile-Specific Risks:
- **Touch Accessibility**: Buttons <44x44px fail accessibility - verify all interactive elements
- **PWA Security**: Service workers can introduce XSS risks - validate all cached content
- **Offline Data**: Cached tour content contains sensitive couple data - encrypt offline storage
- **Performance**: Mobile CPU constraints - optimize image processing and animations
- **Battery Usage**: Location services and push notifications drain battery - implement efficient patterns

### Wedding Mobile Considerations:
- **Venue Connectivity**: 60% of venues have poor cellular signal - comprehensive offline mode essential
- **Multiple Devices**: Couples switch between phone/tablet/laptop - seamless device synchronization required
- **Stress Context**: Wedding planning is stressful - UI must be extremely intuitive and forgiving
- **Photo Heavy**: Wedding content is image-intensive - implement progressive loading and compression
- **Real-time Coordination**: Couples coordinate in real-time - optimize for low-latency updates

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Mobile Security Verification:
```bash
# Verify PWA manifest security
cat $WS_ROOT/wedsync/public/manifest.json | jq '.start_url, .scope'
# Should show secure HTTPS URLs only

# Check service worker security headers
grep -r "Content-Security-Policy\|X-Frame-Options" $WS_ROOT/wedsync/public/sw.js
# Should show proper security headers implementation

# Verify offline data encryption
grep -r "encrypt.*offline\|cache.*encrypt" $WS_ROOT/wedsync/src/lib/mobile/
# Should show encrypted offline storage

# Check touch input validation
grep -r "touchInputValidator\|gestureValidation" $WS_ROOT/wedsync/src/lib/mobile/gestures/
# Should show validation on all touch inputs
```

### Final Mobile Security Checklist:
- [ ] PWA manifest uses HTTPS URLs only
- [ ] Service worker implements proper CSP headers
- [ ] Offline tour data is encrypted before caching
- [ ] Touch and gesture inputs are validated
- [ ] Cross-device sync uses authenticated channels
- [ ] Push notifications validate payloads
- [ ] Mobile session management is secure
- [ ] TypeScript compiles with NO errors
- [ ] Mobile tests pass including security tests

### Mobile Performance Verification:
- [ ] First Contentful Paint <1.5s on 3G networks
- [ ] Touch response time <16ms for smooth interactions
- [ ] PWA installation prompt appears within 3s
- [ ] Offline content loads in <500ms from cache
- [ ] Gesture lag <16ms for 60fps smoothness
- [ ] Cross-device sync completes in <200ms

### Mobile Accessibility Verification:
- [ ] All touch targets ≥44x44px (WCAG AA compliance)
- [ ] Color contrast ratio ≥4.5:1 on all mobile screens
- [ ] Tour content readable at 200% zoom without horizontal scroll
- [ ] Screen reader compatibility tested on mobile devices
- [ ] Voice control support for tour navigation
- [ ] High contrast mode support for visually impaired users

---

**EXECUTE IMMEDIATELY - Build the mobile WedMe tour experience that makes wedding planning feel effortless on any device!**