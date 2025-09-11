# TEAM D - ROUND 1: WS-217 - Outlook Calendar Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create mobile-optimized Outlook calendar sync interface with PWA capabilities and cross-device synchronization
**FEATURE ID:** WS-217 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile calendar management UX, touch-optimized OAuth flows, and wedding professional mobile workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/mobile/OutlookCalendarMobile.tsx
ls -la $WS_ROOT/wedsync/src/hooks/useOutlookMobileSync.ts
cat $WS_ROOT/wedsync/src/components/mobile/OutlookCalendarMobile.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **MOBILE TEST RESULTS:**
```bash
npm test outlook-mobile
# MUST show: "All mobile tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing mobile components and PWA patterns
await mcp__serena__search_for_pattern("mobile calendar oauth pwa service worker");
await mcp__serena__find_symbol("mobile calendar sync", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/mobile/");
```

### B. UI STYLE GUIDES & MOBILE TECHNOLOGY STACK (MANDATORY FOR ALL MOBILE UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for mobile calendar features
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL MOBILE UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library with mobile-first responsive design
- **Magic UI**: Touch-optimized animations and mobile transitions
- **Tailwind CSS 4.1.11**: Mobile-first utility classes and responsive breakpoints
- **PWA Service Workers**: Offline calendar sync and background updates
- **Touch Events**: Native touch gesture support for calendar interactions

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any desktop-first component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Untitled UI mobile-components touch-interfaces"
# - "Magic UI mobile-animations touch-gestures"
# - "React PWA service-workers mobile-calendar"
# - "Tailwind CSS mobile-first responsive-touch"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE CALENDAR INTEGRATION

### Use Sequential Thinking MCP for Mobile-First Architecture
```typescript
// Mobile calendar integration UX analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile Outlook calendar integration needs: Touch-optimized OAuth flow (no popup blockers), finger-friendly calendar interface, pull-to-refresh sync, offline calendar viewing, emergency sync for last-minute changes, and PWA installation for quick access. Wedding professionals work on-site and need reliable mobile access.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile UX complexity: OAuth must work on mobile Safari (no popup blocking), calendar events need touch-friendly hit targets (minimum 44px), sync status should use pull-down gesture, conflict resolution needs simplified mobile UI, and background sync via service workers for real-time updates without drain.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding professional mobile workflow: They're at venue inspections, client meetings, vendor visits - need quick calendar access without laptop. Emergency schedule changes happen on wedding day, require instant sync. Battery efficiency critical during 12-hour wedding days. Touch interactions must work with dress gloves.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile implementation strategy: PWA with home screen installation, service worker for offline calendar cache, touch-optimized components from Teams A design, mobile-first responsive breakpoints, battery-efficient background sync, and emergency mode for critical wedding day updates.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with mobile-specific requirements:

1. **task-tracker-coordinator** - Break down mobile calendar components and PWA requirements
2. **react-ui-specialist** - Build touch-optimized calendar interface with responsive design  
3. **performance-optimization-expert** - Mobile performance and battery efficiency optimization
4. **test-automation-architect** - Cross-device mobile testing with touch simulation
5. **ui-ux-designer** - Mobile-first calendar UX with accessibility compliance
6. **documentation-chronicler** - Mobile setup guides and PWA installation instructions

## 📱 MOBILE NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR MOBILE FEATURES)

**❌ FORBIDDEN: Creating mobile calendar interface without mobile navigation integration**
**✅ MANDATORY: Calendar sync must integrate with mobile navigation drawer and bottom tabs**

### MOBILE NAVIGATION INTEGRATION CHECKLIST
- [ ] **Bottom Navigation**: Add calendar integration to mobile bottom nav
```typescript
// Add to mobile bottom navigation
{
  title: "Calendar",
  href: "/mobile/calendar-sync",
  icon: CalendarIcon,
  badge: syncStatus?.hasConflicts ? "!" : undefined
}
```
- [ ] **Navigation Drawer**: Include calendar sync in hamburger menu
- [ ] **Swipe Gestures**: Support swipe navigation between calendar views
- [ ] **Bottom Sheet Navigation**: Calendar settings in mobile bottom sheet
- [ ] **Tab States**: Active calendar sync state in mobile tab indicators

## 🔒 MOBILE SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE OAUTH & SECURITY CHECKLIST:
- [ ] **Mobile OAuth2 flow** - Safari-compatible authentication without popup blocking
- [ ] **Secure credential storage** - iOS Keychain and Android Keystore integration
- [ ] **App backgrounding security** - Clear sensitive data when app goes background
- [ ] **Biometric authentication** - Face ID/Touch ID for calendar access
- [ ] **Session timeout** - Automatic logout after mobile inactivity
- [ ] **Certificate pinning** - Prevent MITM attacks on mobile networks
- [ ] **Screen recording protection** - Protect calendar data from screen capture
- [ ] **Mobile audit logging** - Log calendar actions with device context

## 🎯 TEAM D SPECIALIZATION: PLATFORM/MOBILE FOCUS

**MOBILE/PWA REQUIREMENTS:**
- Touch-optimized OAuth2 authentication flow with mobile Safari compatibility
- Responsive calendar interface (320px to 768px breakpoints)
- PWA service worker for offline calendar synchronization
- Mobile-first navigation integration with swipe gestures
- Battery-efficient background sync with intelligent scheduling
- Cross-device calendar state synchronization
- Touch accessibility compliance (WCAG 2.1 AA mobile)
- Performance optimization for 3G networks and older devices

## 📋 TECHNICAL SPECIFICATION IMPLEMENTATION

### Required Mobile Components to Create:

1. **OutlookCalendarMobile.tsx** (Mobile-optimized main container)
   - Touch-friendly calendar interface with swipe navigation
   - Mobile OAuth flow without popup dependencies
   - Pull-to-refresh sync with haptic feedback
   - Bottom sheet for calendar settings and conflict resolution

2. **OutlookOAuthMobile.tsx**
   - Mobile Safari-compatible OAuth2 authentication
   - Touch-optimized authorization flow
   - Biometric authentication integration
   - Mobile loading states with skeleton screens

3. **OutlookSyncMobile.tsx**
   - Pull-down refresh gesture for manual sync
   - Mobile sync status with progress indicators
   - Touch-friendly sync controls and settings
   - Offline sync queue management

4. **OutlookConflictMobile.tsx**
   - Mobile-optimized conflict resolution interface
   - Swipe-to-resolve gestures for quick decisions
   - Bottom sheet modal for conflict details
   - Touch-friendly comparison views

5. **OutlookPWASync.tsx**
   - PWA service worker registration and management
   - Background sync scheduling and execution
   - Offline calendar data caching
   - Push notification setup for sync alerts

### Mobile Hook Implementation:

6. **useOutlookMobileSync.ts**
   - Mobile-specific calendar state management
   - Touch gesture handling for calendar interactions
   - PWA background sync coordination
   - Mobile network status monitoring

### Mobile-Specific Features:
```typescript
interface MobileCalendarConfig {
  touchTargetSize: number; // Minimum 44px for accessibility
  swipeThreshold: number; // Pixels for swipe gesture recognition
  pullToRefreshDistance: number; // Pull distance to trigger refresh
  backgroundSyncInterval: number; // Minutes between background syncs
  batteryOptimization: {
    lowBatteryMode: boolean;
    reducedSyncFrequency: boolean;
    disableAnimations: boolean;
  };
  accessibility: {
    hapticFeedback: boolean;
    voiceOverSupport: boolean;
    highContrastMode: boolean;
  };
}

// Mobile viewport breakpoints
const MOBILE_BREAKPOINTS = {
  xs: '320px',  // Small phones
  sm: '375px',  // Standard phones
  md: '414px',  // Large phones
  lg: '768px',  // Tablets
} as const;

// Touch gesture support
interface TouchCalendarGestures {
  swipeLeft: () => void;  // Previous month/week
  swipeRight: () => void; // Next month/week
  pullDown: () => void;   // Refresh sync
  longPress: () => void;  // Event context menu
  pinchZoom: (scale: number) => void; // Calendar zoom
}
```

### PWA Service Worker Integration:
```typescript
// PWA calendar sync service worker
export class OutlookSyncWorker {
  // Background sync registration
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('outlook-calendar-sync');
    }
  }

  // Offline calendar caching
  async cacheCalendarData(events: CalendarEvent[]): Promise<void> {
    const cache = await caches.open('outlook-calendar-v1');
    await cache.put('/api/calendar/cached', new Response(JSON.stringify(events)));
  }

  // Battery-efficient sync scheduling
  scheduleBatteryEfficientSync(): void {
    // Reduce sync frequency on low battery
    // Use device idle time for background sync
    // Prioritize critical wedding events
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Mobile Components (MUST CREATE):
- [ ] `OutlookCalendarMobile.tsx` - Touch-optimized calendar interface with mobile navigation
- [ ] `OutlookOAuthMobile.tsx` - Mobile Safari-compatible OAuth2 authentication flow
- [ ] `OutlookSyncMobile.tsx` - Pull-to-refresh sync with mobile-friendly progress indicators
- [ ] `OutlookConflictMobile.tsx` - Touch-optimized conflict resolution with swipe gestures
- [ ] `OutlookPWASync.tsx` - PWA service worker integration for offline sync
- [ ] `useOutlookMobileSync.ts` - Mobile-specific calendar state and gesture management

### Mobile Features (MUST IMPLEMENT):
- [ ] Touch-optimized OAuth2 flow without popup dependencies
- [ ] Pull-to-refresh calendar synchronization with haptic feedback
- [ ] Swipe gestures for calendar navigation (month/week switching)
- [ ] Bottom sheet modal for calendar settings and conflict resolution
- [ ] PWA installation prompts and home screen integration
- [ ] Background sync via service worker for real-time updates
- [ ] Battery-efficient sync scheduling with device state awareness
- [ ] Cross-device calendar state synchronization

### Mobile Integration Requirements:
- [ ] Integrate with mobile navigation drawer and bottom tabs
- [ ] Support mobile breakpoints (320px to 768px responsive design)
- [ ] Implement touch accessibility with minimum 44px hit targets
- [ ] Add offline calendar viewing with cached data
- [ ] Include mobile-specific error handling and retry logic

## 💾 WHERE TO SAVE YOUR WORK
- **Mobile Components**: `$WS_ROOT/wedsync/src/components/mobile/`
- **PWA Components**: `$WS_ROOT/wedsync/src/components/pwa/`
- **Mobile Hooks**: `$WS_ROOT/wedsync/src/hooks/mobile/`
- **Service Workers**: `$WS_ROOT/wedsync/public/sw/`
- **Mobile Types**: `$WS_ROOT/wedsync/src/types/mobile.ts`
- **Mobile Tests**: `$WS_ROOT/wedsync/tests/mobile/calendar/`

## 🏁 COMPLETION CHECKLIST

### Technical Implementation:
- [ ] All mobile calendar components created and touch-responsive
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All mobile component tests passing with >80% coverage
- [ ] OAuth flow working on mobile Safari and Chrome mobile
- [ ] PWA service worker functional with offline sync capability
- [ ] Cross-device testing verified (phones, tablets, different orientations)

### Mobile Security & Authentication:
- [ ] Mobile OAuth2 flow works without popup blocking issues
- [ ] Biometric authentication integrated (Face ID/Touch ID support)
- [ ] Secure credential storage using device keychain/keystore
- [ ] Screen recording protection active for sensitive calendar data
- [ ] Mobile session timeout and background security implemented

### Mobile UX/Performance:
- [ ] Touch targets minimum 44px for accessibility compliance
- [ ] Swipe gestures functional for calendar navigation
- [ ] Pull-to-refresh working with haptic feedback
- [ ] Loading performance optimized for 3G networks
- [ ] Battery usage optimized with intelligent background sync
- [ ] PWA installation prompts and home screen functionality

### Wedding Professional Mobile Workflow:
- [ ] Quick calendar access for on-site venue inspections
- [ ] Emergency sync capabilities for wedding day schedule changes
- [ ] Offline calendar viewing for areas with poor network coverage
- [ ] Touch interface works with wedding gloves and accessories
- [ ] Cross-device synchronization for team coordination

### Evidence Package:
- [ ] Screenshots of mobile calendar interface on various devices
- [ ] PWA installation and home screen demonstration
- [ ] Touch gesture functionality recordings
- [ ] Mobile performance metrics and battery usage data
- [ ] Cross-device synchronization test results
- [ ] Accessibility audit results for mobile touch targets

---

**EXECUTE IMMEDIATELY - This is a comprehensive mobile-first implementation enabling wedding professionals to manage Outlook calendar integration seamlessly on mobile devices with PWA capabilities and offline functionality!**