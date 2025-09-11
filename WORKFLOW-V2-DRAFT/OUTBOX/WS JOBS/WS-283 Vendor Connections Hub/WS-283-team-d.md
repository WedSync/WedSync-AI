# TEAM D - ROUND 1: WS-283 - Vendor Connections Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive mobile-first WedMe platform integration for vendor connections with PWA capabilities and couple-centered vendor coordination
**FEATURE ID:** WS-283 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile vendor coordination workflows for couples and wedding day communication needs

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedme/vendor-connections/
cat $WS_ROOT/wedsync/src/components/wedme/vendor-connections/MobileVendorHub.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedme-vendor-connections
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

// Query WedMe platform and mobile vendor patterns
await mcp__serena__search_for_pattern("wedme mobile vendor communication");
await mcp__serena__find_symbol("mobile vendor interface pwa", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/wedme/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// CRITICAL UI TECHNOLOGY STACK:
// - Untitled UI: Primary component library (MANDATORY)
// - Magic UI: Animations and visual enhancements (MANDATORY)
// - Tailwind CSS 4.1.11: Utility-first CSS
// - Lucide React: Icons ONLY
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load mobile and couple-focused vendor coordination documentation
# Use Ref MCP to search for:
# - "Next.js PWA mobile-vendor-coordination"
# - "React mobile-messaging touch-interfaces"
# - "PWA offline-vendor-communication"
# - "Mobile push-notifications wedding-coordination"
# - "Couples vendor-management mobile-workflows"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Find existing WedMe and mobile vendor patterns
await mcp__serena__find_referencing_symbols("wedme mobile vendor");
await mcp__serena__search_for_pattern("pwa offline vendor mobile");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX MOBILE VENDOR PLANNING

### Platform-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile-First Vendor Coordination Strategy
```typescript
// Before building WedMe vendor coordination features
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe vendor coordination needs: couple-centered mobile interface for managing 15-30 wedding vendors, real-time messaging with vendors optimized for mobile touch, vendor contact directory with quick-dial and message options, wedding day vendor coordination with location sharing and status updates, offline capability for vendor contact info at venues with poor signal.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile platform considerations: Couples primarily use phones for vendor communication (85% mobile usage), touch-optimized interfaces for rapid vendor contact during stressful wedding planning, PWA installation for app-like vendor coordination experience, push notifications for urgent vendor updates, gesture-based navigation for quick vendor switching.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe-specific vendor features: Couple dashboard showing all vendor statuses at a glance, emergency vendor contact system for wedding day issues, vendor timeline integration showing coordination points, shared vendor notes between couple partners, vendor payment tracking and reminder system.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use PWA best practices for offline vendor contact access, implement touch-friendly vendor card interfaces with swipe gestures, create mobile-optimized messaging with vendor conversation threading, ensure fast loading on mobile networks for urgent vendor coordination, build device-specific vendor notification preferences.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down mobile vendor features, track PWA requirements, identify couple workflow needs
   
2. **mobile-pwa-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Design PWA vendor coordination, mobile-first UI patterns, offline vendor access
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Secure mobile vendor data, validate couple authentication, protect vendor communications
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure mobile patterns match existing WedMe components and couple workflows
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write mobile-specific vendor tests, PWA functionality tests, couple interaction tests
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document mobile vendor patterns, couple user journey flows, wedding day coordination

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all WedMe mobile and vendor patterns
await mcp__serena__find_symbol("wedme mobile vendor", "", true);
await mcp__serena__search_for_pattern("pwa service worker vendor offline");
await mcp__serena__find_referencing_symbols("couple vendor coordination");
```
- [ ] Identified existing WedMe mobile patterns to follow
- [ ] Found all vendor coordination components
- [ ] Understood PWA implementation for vendor access
- [ ] Located similar mobile vendor management implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Mobile vendor architecture decisions based on existing WedMe patterns
- [ ] Couple-specific test cases written FIRST (TDD)
- [ ] PWA security measures for offline vendor data
- [ ] Performance considerations for mobile vendor coordination

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use WedMe patterns discovered by Serena
- [ ] Maintain consistency with existing couple-focused components
- [ ] Include comprehensive offline functionality for vendor access
- [ ] Test on actual mobile devices continuously during development

## 🎯 TEAM D SPECIALIZATION: PLATFORM/WEDME FOCUS

**Core WedMe Vendor Platform Components to Build:**

1. **MobileVendorHub** - Couple-centered mobile vendor coordination interface
2. **CoupleVendorMessaging** - Touch-optimized messaging system for vendor communication
3. **VendorContactDirectory** - Mobile-first vendor contact management with quick actions
4. **WeddingDayVendorCoordination** - Emergency vendor communication for wedding day
5. **OfflineVendorAccess** - PWA offline capability for vendor contact information
6. **VendorNotificationCenter** - Mobile push notifications for vendor updates

### Key Features:
- Mobile-first responsive design optimized for couple workflows
- PWA capabilities with offline vendor contact access
- Touch-optimized vendor messaging with conversation threading
- Quick-action vendor contact (call, text, email) from single interface
- Wedding day emergency vendor coordination with location sharing
- Couple collaboration features for shared vendor management

### Mobile Platform Requirements:
- **Touch Optimization**: Large touch targets for vendor contact actions
- **Gesture Support**: Swipe gestures for vendor navigation and quick actions
- **Offline Mode**: Vendor contact info cached for venue visits with poor connectivity
- **PWA Features**: Installation prompts, push notifications for vendor updates
- **Performance**: <1.5s load time on mobile networks, instant vendor contact access

## 📋 TECHNICAL SPECIFICATION

### WedMe Vendor Platform Requirements:
- Couple-centered vendor management with both partners having access
- Mobile-first design with desktop graceful enhancement
- PWA installation with vendor-themed splash screen and icons
- Offline capability for essential vendor contact information
- Push notification integration for vendor communication alerts
- Cross-device synchronization when couples switch between phones/tablets

### Mobile Architecture:
```typescript
interface MobileWedMeVendorPlatform {
  // Mobile vendor interface
  initializeMobileVendorHub(coupleId: string): Promise<VendorHubSession>;
  handleVendorContactActions(action: VendorContactAction): Promise<ContactResult>;
  optimizeForMobileViewport(screenSize: ScreenDimensions): ResponsiveVendorLayout;
  
  // Couple collaboration
  enableCoupleVendorSharing(coupleUsers: CoupleUsers): Promise<SharingSession>;
  syncVendorNotesAcrossDevices(notes: VendorNotes): Promise<SyncResult>;
  handleCoupleVendorPermissions(permissions: CouplePermissions): Promise<void>;
  
  // PWA vendor capabilities
  enableOfflineVendorAccess(): Promise<ServiceWorkerRegistration>;
  cacheVendorContactInfo(vendors: VendorContact[]): Promise<CacheStorage>;
  handleVendorInstallationPrompt(): Promise<InstallationResult>;
  
  // Wedding day coordination
  activateWeddingDayMode(weddingDate: Date): Promise<EmergencyMode>;
  enableLocationSharingWithVendors(location: LocationData): Promise<LocationShare>;
  handleEmergencyVendorContact(emergency: EmergencyContact): Promise<EmergencyResponse>;
  
  // Mobile performance optimizations
  lazyLoadVendorProfiles(vendorId: string): Promise<VendorProfile>;
  optimizeVendorImagesForMobile(images: VendorImage[]): Promise<OptimizedImage[]>;
  handlePoorConnectivityVendorAccess(): Promise<OfflineVendorFallback>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Core Mobile Vendor Components:
- [ ] **MobileVendorHub.tsx** - Main couple-centered vendor coordination interface
- [ ] **CoupleVendorMessaging.tsx** - Mobile-optimized vendor messaging system
- [ ] **VendorContactDirectory.tsx** - Touch-friendly vendor contact management
- [ ] **WeddingDayVendorCoordination.tsx** - Emergency vendor coordination for wedding day
- [ ] **OfflineVendorAccess.ts** - PWA offline vendor contact capability
- [ ] **VendorNotificationCenter.tsx** - Mobile push notification management

### Couple Collaboration Features:
- [ ] **CoupleVendorSharing.tsx** - Shared vendor management between couple partners
- [ ] **VendorNotesSync.ts** - Cross-device vendor note synchronization
- [ ] **CoupleVendorPermissions.ts** - Permission management for vendor access
- [ ] **SharedVendorCalendar.tsx** - Couple's shared vendor scheduling interface

### PWA Infrastructure:
- [ ] **vendor-service-worker.js** - Vendor contact caching and offline functionality
- [ ] **vendor-manifest.json** - PWA configuration for vendor coordination app
- [ ] **vendor-install-prompt.ts** - Custom PWA installation for vendor hub
- [ ] **vendor-push-notifications.ts** - Vendor update push notifications

## 🔗 DEPENDENCIES

### What You Need from Other Teams:
- **Team A**: Vendor hub UI component specifications and responsive design patterns
- **Team B**: Vendor contact API endpoints and couple authentication system
- **Team C**: Real-time vendor notifications and mobile push integration
- **Team E**: Mobile device testing requirements and couple workflow validation

### What Others Need from You:
- Mobile vendor interface specifications for responsive integration
- PWA service worker patterns for offline functionality
- Touch gesture specifications for accessible mobile interactions
- Couple collaboration requirements for shared vendor management

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Mobile Vendor Security Checklist:
- [ ] **Couple authentication** - Secure authentication for both partners accessing vendors
- [ ] **Vendor contact protection** - Encrypt vendor contact information
- [ ] **PWA data security** - Secure offline vendor data caching
- [ ] **Mobile session management** - Secure couple sessions on mobile devices
- [ ] **Push notification security** - Validate vendor notification payloads
- [ ] **Location sharing security** - Secure vendor location sharing for wedding day
- [ ] **Cross-device sync security** - Encrypt vendor data synchronization
- [ ] **Emergency contact validation** - Validate emergency vendor contact attempts

### Required Mobile Security Files:
```typescript
// These MUST exist and be used:
import { coupleAuthValidator } from '$WS_ROOT/wedsync/src/lib/security/couple-auth';
import { vendorDataEncryption } from '$WS_ROOT/wedsync/src/lib/security/vendor-data-encryption';
import { pwaSecurityHeaders } from '$WS_ROOT/wedsync/src/lib/security/pwa-headers';
import { mobileSessionManager } from '$WS_ROOT/wedsync/src/lib/security/mobile-sessions';
import { locationSharingSecurity } from '$WS_ROOT/wedsync/src/lib/security/location-sharing';
```

### Mobile Vendor Security Pattern:
```typescript
const mobileVendorContactSchema = z.object({
  vendorId: z.string().uuid(),
  contactAction: z.enum(['call', 'text', 'email', 'message', 'emergency_contact']),
  coupleId: z.string().uuid(),
  deviceInfo: z.object({
    userAgent: secureStringSchema,
    screenWidth: z.number().min(200).max(4000),
    screenHeight: z.number().min(200).max(4000),
    isOffline: z.boolean().optional()
  }),
  locationData: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional()
  }).optional(),
  emergencyContext: z.object({
    urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
    weddingDayActive: z.boolean(),
    emergencyType: z.string().optional()
  }).optional()
});

export const handleMobileVendorContact = withSecureValidation(
  mobileVendorContactSchema,
  async (request, validatedData) => {
    // Verify couple authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user.coupleId) {
      return NextResponse.json({ error: 'Couple authentication required' }, { status: 401 });
    }
    
    // Validate couple access to vendor
    const hasVendorAccess = await coupleAuthValidator.verifyVendorAccess(
      session.user.coupleId,
      validatedData.vendorId
    );
    if (!hasVendorAccess) {
      return NextResponse.json({ error: 'Vendor access denied' }, { status: 403 });
    }
    
    // Handle emergency contact priority
    if (validatedData.emergencyContext?.urgencyLevel === 'critical') {
      await handleEmergencyVendorContact(validatedData);
    }
    
    // Process vendor contact action
    const contactResult = await processVendorContact(validatedData);
    
    return NextResponse.json(contactResult);
  }
);
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary mobile vendor coordination testing:

```javascript
// MOBILE VENDOR COORDINATION TESTING APPROACH

// 1. MOBILE VENDOR HUB TESTING (Multiple Device Sizes)
const mobileDevices = [
  {name: 'iPhone SE', width: 375, height: 667},
  {name: 'iPhone 14', width: 390, height: 844},
  {name: 'Samsung Galaxy S23', width: 384, height: 854},
  {name: 'Google Pixel 7', width: 393, height: 851}
];

for (const device of mobileDevices) {
  await mcp__playwright__browser_resize({width: device.width, height: device.height});
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/vendors"});
  
  // Test vendor contact quick actions
  const vendorCards = await mcp__playwright__browser_evaluate({
    function: `() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="vendor-card"]'));
      return cards.map(card => {
        const callBtn = card.querySelector('[data-testid="vendor-call"]');
        const textBtn = card.querySelector('[data-testid="vendor-text"]');
        const emailBtn = card.querySelector('[data-testid="vendor-email"]');
        
        return {
          vendorName: card.querySelector('.vendor-name')?.textContent,
          hasCallButton: callBtn !== null,
          hasTextButton: textBtn !== null,
          hasEmailButton: emailBtn !== null,
          buttonSizes: {
            call: callBtn ? callBtn.getBoundingClientRect() : null,
            text: textBtn ? textBtn.getBoundingClientRect() : null,
            email: emailBtn ? emailBtn.getBoundingClientRect() : null
          }
        };
      });
    }`
  });
  
  // Verify all touch targets are ≥44x44px
  const inadequateTouchTargets = vendorCards.filter(card => 
    Object.values(card.buttonSizes).some(size => 
      size && (size.width < 44 || size.height < 44)
    )
  );
  
  await mcp__playwright__browser_take_screenshot({filename: `${device.name}-vendor-hub.png`});
}

// 2. COUPLE VENDOR COLLABORATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/vendors?couple=partner1"});
await mcp__playwright__browser_tabs({action: "new", url: "/wedme/vendors?couple=partner2"});

// Add vendor note from partner 1
await mcp__playwright__browser_tabs({action: "select", index: 0});
await mcp__playwright__browser_click({selector: '[data-testid="vendor-photographer"]'});
await mcp__playwright__browser_click({selector: '[data-testid="add-vendor-note"]'});
await mcp__playwright__browser_type({
  selector: '[data-testid="vendor-note-input"]',
  text: 'Confirmed 3pm arrival, bringing backup equipment'
});
await mcp__playwright__browser_click({selector: '[data-testid="save-vendor-note"]'});

// Verify note sync to partner 2
await mcp__playwright__browser_tabs({action: "select", index: 1});
await mcp__playwright__browser_click({selector: '[data-testid="vendor-photographer"]'});
await mcp__playwright__browser_wait_for({text: 'Confirmed 3pm arrival, bringing backup equipment'});

// 3. PWA VENDOR FUNCTIONALITY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/vendors"});

// Test vendor service worker registration for offline access
const vendorServiceWorkerStatus = await mcp__playwright__browser_evaluate({
  function: `() => ({
    serviceWorkerSupported: 'serviceWorker' in navigator,
    serviceWorkerRegistered: navigator.serviceWorker.controller !== null,
    vendorCacheAvailable: 'caches' in window,
    offlineVendorContacts: localStorage.getItem('offlineVendorContacts') !== null
  })`
});

// Test offline vendor contact access
await mcp__playwright__browser_evaluate({function: `() => window.navigator.onLine = false`});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/vendors"});
const offlineVendorAccess = await mcp__playwright__browser_wait_for({
  text: "Vendor contacts available offline"
});

// Test vendor contact actions while offline
await mcp__playwright__browser_click({selector: '[data-testid="vendor-photographer-call"]'});
const offlineCallResult = await mcp__playwright__browser_evaluate({
  function: `() => ({
    callActionAvailable: document.querySelector('[data-testid="call-vendor-offline"]') !== null,
    contactCached: localStorage.getItem('photographer-contact') !== null
  })`
});

// 4. WEDDING DAY EMERGENCY VENDOR COORDINATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/vendors?wedding-day=true"});

// Test emergency vendor contact mode
await mcp__playwright__browser_click({selector: '[data-testid="emergency-vendor-contact"]'});
await mcp__playwright__browser_click({selector: '[data-testid="vendor-florist-emergency"]'});

const emergencyContactInterface = await mcp__playwright__browser_evaluate({
  function: `() => ({
    emergencyModeActive: document.querySelector('[data-testid="emergency-mode-banner"]') !== null,
    locationSharingEnabled: navigator.geolocation !== undefined,
    emergencyContactOptions: Array.from(document.querySelectorAll('.emergency-contact-option')).length,
    urgencyLevel: document.querySelector('[data-testid="urgency-selector"]')?.value
  })`
});

// Test location sharing with vendors
await mcp__playwright__browser_click({selector: '[data-testid="share-location-with-vendor"]'});
const locationSharingResult = await mcp__playwright__browser_evaluate({
  function: `() => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          locationAccess: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        (error) => resolve({
          locationAccess: false,
          error: error.message
        })
      );
    });
  }`
});

// 5. MOBILE VENDOR MESSAGING PERFORMANCE
const vendorMessagingPerformance = await mcp__playwright__browser_evaluate({
  function: `() => {
    const startTime = performance.now();
    
    // Simulate vendor message sending
    const messageInput = document.querySelector('[data-testid="vendor-message-input"]');
    const sendButton = document.querySelector('[data-testid="send-vendor-message"]');
    
    if (messageInput && sendButton) {
      messageInput.value = 'Test vendor message';
      const clickTime = performance.now();
      sendButton.click();
      
      return {
        messageInputResponse: clickTime - startTime,
        messageSendTime: performance.now() - clickTime,
        vendorMessageHistory: document.querySelectorAll('.vendor-message').length,
        mobileKeyboardHeight: window.visualViewport ? window.visualViewport.height : null
      };
    }
    
    return { error: 'Vendor messaging interface not found' };
  }`
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All mobile vendor deliverables complete WITH EVIDENCE
- [ ] Mobile-specific tests written FIRST and passing (show mobile test results)
- [ ] Serena PWA patterns followed (list mobile patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero PWA manifest errors (show Lighthouse PWA score)

### Mobile Vendor Evidence:
```typescript
// Include actual mobile vendor code showing:
// 1. Touch-optimized vendor interface implementation
// 2. PWA service worker with vendor contact caching
// 3. Couple collaboration synchronization system
// 4. Emergency vendor coordination features
export const MobileVendorHub: React.FC<MobileVendorHubProps> = ({ 
  vendors, 
  coupleId, 
  isWeddingDay 
}) => {
  // Following pattern from wedme/mobile/base-mobile.tsx:67-89
  // Serena confirmed this matches 8 other mobile WedMe components
  
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [offlineVendorData, setOfflineVendorData] = useState<VendorContact[]>([]);
  
  // PWA offline vendor access
  useEffect(() => {
    const cacheVendorContacts = async () => {
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cache = await caches.open('vendor-contacts-v1');
        const vendorContactsData = vendors.map(v => ({
          id: v.id,
          name: v.name,
          phone: v.phone,
          email: v.email,
          emergencyContact: v.emergencyContact
        }));
        await cache.put('/vendor-contacts', 
          new Response(JSON.stringify(vendorContactsData))
        );
      }
    };
    
    cacheVendorContacts();
  }, [vendors]);
  
  // Touch-optimized vendor contact
  const handleVendorContact = useCallback((action: VendorContactAction, vendor: Vendor) => {
    // Mobile-optimized contact handling
    switch (action) {
      case 'call':
        window.location.href = `tel:${vendor.phone}`;
        break;
      case 'text':
        window.location.href = `sms:${vendor.phone}`;
        break;
      case 'email':
        window.location.href = `mailto:${vendor.email}`;
        break;
    }
  }, []);
  
  return (
    <div className="mobile-vendor-hub touch-friendly">
      {isWeddingDay && <EmergencyVendorBanner />}
      <VendorContactDirectory 
        vendors={vendors}
        onVendorContact={handleVendorContact}
        offlineAccess={true}
      />
    </div>
  );
};
```

### Mobile Performance Evidence:
```javascript
// Required mobile vendor performance metrics
const mobileVendorMetrics = {
  vendorHubLoadTime: "1.1s", // Target: <1.5s on 3G
  vendorContactResponse: "85ms", // Target: <100ms
  pwaInstallPrompt: "2.3s", // Target: <3s after page load
  offlineVendorAccess: "320ms", // Target: <500ms from cache
  touchResponseTime: "14ms", // Target: <16ms for smooth interactions
  coupleDataSync: "165ms" // Target: <200ms cross-device sync
}
```

## 💾 WHERE TO SAVE

### Core Mobile Vendor Files:
- **Mobile Components**: `$WS_ROOT/wedsync/src/components/wedme/vendor-connections/mobile/`
- **PWA Configuration**: `$WS_ROOT/wedsync/public/vendor-manifest.json` & `$WS_ROOT/wedsync/public/vendor-sw.js`
- **Mobile Services**: `$WS_ROOT/wedsync/src/lib/mobile/vendor-connections/`
- **Couple Collaboration**: `$WS_ROOT/wedsync/src/lib/mobile/couple-vendor-sync/`

### Supporting Files:
- **Types**: `$WS_ROOT/wedsync/src/types/mobile-vendor-connections.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/mobile/vendor-connections/`
- **Mobile Styles**: `$WS_ROOT/wedsync/src/styles/mobile-vendor-hub.scss`
- **Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## ⚠️ CRITICAL WARNINGS

### Mobile Vendor-Specific Risks:
- **Touch Target Accessibility**: Vendor contact buttons <44x44px fail accessibility - verify all interactive elements
- **PWA Security**: Service worker vendor caching can expose sensitive contact data - encrypt offline storage
- **Emergency Contact Liability**: Wedding day emergency vendor coordination affects real weddings - comprehensive testing required
- **Battery Drain**: Location sharing and push notifications drain battery - implement efficient patterns
- **Offline Data Staleness**: Cached vendor contact info can become outdated - implement cache expiration

### Wedding Mobile Considerations:
- **Wedding Day Stress**: Couples are stressed on wedding day - interface must be extremely intuitive
- **Venue Connectivity**: 70% of wedding venues have poor cellular signal - robust offline functionality essential
- **Multiple Device Usage**: Couples coordinate across phones/tablets - seamless device synchronization required
- **Emergency Response Time**: Vendor issues on wedding day need immediate resolution - sub-second response times critical
- **Vendor Availability Hours**: Vendors work different hours - timezone-aware availability essential

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Mobile Vendor Security Verification:
```bash
# Verify PWA vendor manifest security
cat $WS_ROOT/wedsync/public/vendor-manifest.json | jq '.start_url, .scope'
# Should show secure HTTPS URLs only

# Check vendor service worker security headers
grep -r "Content-Security-Policy\|X-Frame-Options" $WS_ROOT/wedsync/public/vendor-sw.js
# Should show proper security headers implementation

# Verify offline vendor data encryption
grep -r "encrypt.*vendor.*offline\|vendorDataEncryption" $WS_ROOT/wedsync/src/lib/mobile/vendor-connections/
# Should show encrypted offline vendor storage

# Check couple authentication
grep -r "coupleAuthValidator\|coupleAuth" $WS_ROOT/wedsync/src/components/wedme/vendor-connections/
# Should show couple authentication on all vendor access
```

### Final Mobile Vendor Security Checklist:
- [ ] PWA manifest uses HTTPS URLs only for vendor access
- [ ] Service worker implements proper CSP headers for vendor data
- [ ] Offline vendor contact data encrypted before caching
- [ ] Couple authentication validates vendor access permissions
- [ ] Location sharing uses secure protocols for vendor coordination
- [ ] Push notifications validate payloads for vendor updates
- [ ] Emergency contact system logs all critical interactions
- [ ] TypeScript compiles with NO errors
- [ ] Mobile tests pass including security scenarios

### Mobile Vendor Performance Verification:
- [ ] Vendor hub loads in <1.5s on 3G networks
- [ ] Vendor contact actions respond in <100ms
- [ ] PWA installation prompt appears within 3s
- [ ] Offline vendor access loads in <500ms from cache
- [ ] Touch interactions respond in <16ms for smooth experience
- [ ] Couple data synchronization completes in <200ms

### Mobile Vendor Accessibility Verification:
- [ ] All vendor touch targets ≥44x44px (WCAG AA compliance)
- [ ] Color contrast ratio ≥4.5:1 on all vendor interface elements
- [ ] Vendor contact info readable at 200% zoom without horizontal scroll
- [ ] Screen reader compatibility tested on mobile devices
- [ ] Voice control support for emergency vendor contact
- [ ] High contrast mode support for stressed couple users

---

**EXECUTE IMMEDIATELY - Build the mobile WedMe vendor coordination that makes wedding planning feel effortless on any device!**