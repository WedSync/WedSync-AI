# TEAM D - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Optimize referral system for mobile-first sharing, implement PWA features, and ensure cross-platform compatibility for viral referral spread
**FEATURE ID:** WS-344 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating the most shareable, mobile-optimized referral experience that drives viral growth through wedding supplier networks

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/mobile/referrals/
cat $WS_ROOT/wedsync/public/manifest.json | head -20
cat $WS_ROOT/wedsync/src/app/(dashboard)/referrals/mobile/page.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test mobile/referrals
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

// Query specific areas relevant to mobile platform
await mcp__serena__search_for_pattern("mobile.*responsive");
await mcp__serena__find_symbol("PWA", "", true);
await mcp__serena__get_symbols_overview("public");
```

### B. MOBILE PLATFORM PATTERNS (MANDATORY)
```typescript
// CRITICAL: Load current mobile/PWA patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/public/manifest.json");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/app/layout.tsx");
await mcp__serena__search_for_pattern("viewport.*mobile");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile platform development
ref_search_documentation("Next.js 15 PWA implementation mobile-first design");
ref_search_documentation("viral sharing mobile optimization patterns");
ref_search_documentation("cross-platform referral link handling");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile-first referral sharing is critical for viral growth. Wedding suppliers are constantly on mobile - at venues, meetings, events. Key considerations: 1) Native share APIs for iOS/Android, 2) WhatsApp/SMS optimization (primary wedding communication), 3) Offline QR code access, 4) Touch-friendly interfaces, 5) Fast loading on poor venue WiFi.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down mobile features, track responsive requirements
2. **ui-ux-designer** - Mobile-first design patterns for viral sharing  
3. **security-compliance-officer** - Secure mobile sharing and PWA features
4. **code-quality-guardian** - Maintain mobile performance standards
5. **test-automation-architect** - Cross-platform mobile testing
6. **documentation-chronicler** - Evidence-based mobile documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE SECURITY CHECKLIST:
- [ ] **Deep link validation** - Secure handling of referral deep links
- [ ] **Share API security** - Validate shared content before transmission
- [ ] **PWA security headers** - Implement proper CSP for PWA functionality
- [ ] **Offline data security** - Encrypt cached referral data
- [ ] **Touch security** - Prevent accidental sharing/actions
- [ ] **Device permissions** - Minimal permissions for sharing features
- [ ] **URL scheme protection** - Validate custom URL schemes

## 🎯 TEAM D SPECIALIZATION: PLATFORM/MOBILE FOCUS

**YOUR SPECIFIC DELIVERABLES:**

### 1. Mobile-First Referral Sharing
```typescript
// Location: /src/components/mobile/referrals/MobileReferralShare.tsx
export const MobileReferralShare: React.FC<MobileReferralShareProps> = ({
  referralLink,
  qrCodeUrl,
  supplierName,
  customMessage
}) => {
  const { shareSupported, shareData } = useNativeShare();
  const { isOffline } = useNetworkStatus();
  
  const handleNativeShare = async () => {
    if (shareSupported) {
      await navigator.share({
        title: `Join ${supplierName} on WedSync`,
        text: customMessage || `Join me on WedSync - we both get a free month when you subscribe! ${referralLink}`,
        url: referralLink
      });
    } else {
      // Fallback to copy + notification
      await copyToClipboard(referralLink);
      showToast('Referral link copied!');
    }
  };
  
  return (
    <div className="mobile-share-container">
      {/* Native Share Button */}
      <TouchFriendlyButton 
        onClick={handleNativeShare}
        className="primary-share-btn"
        minTouchTarget="48px"
      >
        <Share className="w-5 h-5" />
        Share Referral Link
      </TouchFriendlyButton>
      
      {/* Direct App Shares */}
      <div className="app-share-grid">
        <WhatsAppShare link={referralLink} message={customMessage} />
        <SMSShare link={referralLink} message={customMessage} />
        <EmailShare link={referralLink} message={customMessage} />
      </div>
      
      {/* Offline QR Code */}
      {isOffline && qrCodeUrl && (
        <OfflineQRDisplay 
          qrCodeUrl={qrCodeUrl} 
          downloadEnabled={true}
        />
      )}
    </div>
  );
};
```

### 2. PWA Optimization for Referrals
```json
// Location: /public/manifest.json (Enhanced)
{
  "name": "WedSync - Wedding Supplier Platform",
  "short_name": "WedSync",
  "description": "Professional wedding coordination platform with viral referral system",
  "start_url": "/dashboard/referrals",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10B981",
  "categories": ["business", "productivity", "social"],
  "screenshots": [
    {
      "src": "/pwa/screenshot-mobile-referrals.png",
      "sizes": "375x812",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile Referral Dashboard"
    },
    {
      "src": "/pwa/screenshot-desktop-leaderboard.png", 
      "sizes": "1280x800",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Desktop Leaderboard View"
    }
  ],
  "shortcuts": [
    {
      "name": "Share Referral",
      "short_name": "Refer",
      "description": "Quickly share your referral link",
      "url": "/dashboard/referrals/share",
      "icons": [
        {
          "src": "/icons/share-shortcut-96.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "View Leaderboard",
      "short_name": "Rankings",
      "description": "Check your leaderboard position",
      "url": "/dashboard/referrals/leaderboard",
      "icons": [
        {
          "src": "/icons/leaderboard-shortcut-96.png",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "share_target": {
    "action": "/api/referrals/share-handler",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### 3. Native App Integration Handlers
```typescript
// Location: /src/services/mobile/native-integration.ts
export class NativeIntegrationService {
  // WhatsApp Business API Integration
  async shareViaWhatsApp(
    phoneNumber: string,
    message: string,
    referralLink: string
  ): Promise<ShareResult> {
    const whatsappText = encodeURIComponent(
      `${message}\n\n${referralLink}\n\n*Powered by WedSync*`
    );
    
    // Try WhatsApp Business first, then regular WhatsApp
    const whatsappUrls = [
      `https://wa.me/${phoneNumber}?text=${whatsappText}`,
      `whatsapp://send?phone=${phoneNumber}&text=${whatsappText}`
    ];
    
    for (const url of whatsappUrls) {
      try {
        window.open(url, '_blank');
        return { success: true, platform: 'whatsapp' };
      } catch (error) {
        continue;
      }
    }
    
    return { success: false, error: 'WhatsApp not available' };
  }
  
  // SMS Integration with Wedding Context
  async shareViaSMS(
    phoneNumber: string,
    message: string,
    referralLink: string
  ): Promise<ShareResult> {
    const smsText = encodeURIComponent(
      `${message} ${referralLink}`
    );
    
    const smsUrl = `sms:${phoneNumber}?body=${smsText}`;
    
    try {
      window.open(smsUrl, '_blank');
      return { success: true, platform: 'sms' };
    } catch (error) {
      return { success: false, error: 'SMS not available' };
    }
  }
  
  // iOS/Android Deep Link Handling
  async handleDeepLink(url: string): Promise<DeepLinkResult> {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const referralCode = urlParams.get('ref') || 
                        url.match(/\/join\/([A-Z0-9]{8})/)?.[1];
    
    if (referralCode) {
      // Track referral click
      await fetch('/api/referrals/track-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode,
          stage: 'link_clicked',
          sourceDetails: 'mobile_deep_link'
        })
      });
      
      // Redirect to signup with referral context
      return {
        success: true,
        action: 'redirect',
        url: `/signup?ref=${referralCode}`
      };
    }
    
    return { success: false, error: 'Invalid referral link' };
  }
}
```

### 4. Mobile Performance Optimization
```typescript
// Location: /src/components/mobile/referrals/MobileOptimizations.tsx
export const useMobileOptimizations = () => {
  // Lazy loading for mobile
  const LazyLeaderboard = lazy(() => 
    import('./MobileLeaderboard').then(module => ({
      default: module.MobileLeaderboard
    }))
  );
  
  // Image optimization for QR codes
  const optimizeQRCode = useCallback(async (qrCodeUrl: string) => {
    if ('serviceWorker' in navigator) {
      // Cache QR code for offline access
      const cache = await caches.open('referral-qr-codes');
      await cache.add(qrCodeUrl);
    }
  }, []);
  
  // Touch gesture optimization
  const touchOptimizations = useMemo(() => ({
    // Minimum 48px touch targets
    touchTarget: 'min-h-[48px] min-w-[48px]',
    // Prevent accidental touches
    touchAction: 'touch-action-manipulation',
    // Fast tap response
    tapHighlight: 'tap-highlight-color: transparent'
  }), []);
  
  // Network-aware loading
  const { effectiveType } = useNetworkInfo();
  const shouldLoadImages = effectiveType !== 'slow-2g';
  
  return {
    LazyLeaderboard,
    optimizeQRCode,
    touchOptimizations,
    shouldLoadImages
  };
};
```

### 5. Cross-Platform Sharing Components
```typescript
// Location: /src/components/mobile/referrals/CrossPlatformShare.tsx
export const CrossPlatformShare: React.FC<CrossPlatformShareProps> = ({
  referralData,
  onShareComplete
}) => {
  const { platform, canShare } = usePlatformDetection();
  const [shareMethod, setShareMethod] = useState<ShareMethod>('native');
  
  const shareOptions = useMemo(() => {
    const base = [
      {
        id: 'native',
        label: 'Share',
        icon: Share,
        available: canShare,
        primary: true
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: MessageCircle,
        available: true,
        color: '#25D366'
      },
      {
        id: 'sms',
        label: 'SMS',
        icon: MessageSquare,
        available: platform !== 'desktop',
        color: '#007AFF'
      },
      {
        id: 'email',
        label: 'Email', 
        icon: Mail,
        available: true,
        color: '#EA4335'
      }
    ];
    
    // Add platform-specific options
    if (platform === 'ios') {
      base.push({
        id: 'imessage',
        label: 'iMessage',
        icon: MessageCircle,
        available: true,
        color: '#007AFF'
      });
    }
    
    return base.filter(option => option.available);
  }, [platform, canShare]);
  
  return (
    <div className="cross-platform-share">
      <div className="share-options-grid">
        {shareOptions.map((option) => (
          <TouchOptimizedButton
            key={option.id}
            onClick={() => handleShare(option.id)}
            className={cn(
              'share-option-btn',
              option.primary && 'primary-share'
            )}
            style={{ '--accent-color': option.color }}
          >
            <option.icon className="w-6 h-6" />
            <span>{option.label}</span>
          </TouchOptimizedButton>
        ))}
      </div>
      
      {/* Fallback Copy Link */}
      <CopyToClipboard 
        text={referralData.link}
        onCopy={() => showMobileToast('Link copied!')}
      >
        <button className="fallback-copy-btn">
          Copy Link
        </button>
      </CopyToClipboard>
    </div>
  );
};
```

### 6. Offline PWA Support
```typescript
// Location: /src/lib/pwa/offline-referrals.ts
export class OfflineReferralSupport {
  private cache: Cache | null = null;
  
  async initialize() {
    if ('caches' in window) {
      this.cache = await caches.open('referral-offline-v1');
    }
  }
  
  async cacheReferralData(supplierId: string, data: ReferralData) {
    if (!this.cache) return;
    
    // Cache essential referral data
    const cacheData = {
      referralLink: data.referralLink,
      qrCodeUrl: data.qrCodeUrl,
      stats: data.stats,
      timestamp: Date.now()
    };
    
    const response = new Response(JSON.stringify(cacheData));
    await this.cache.put(`referral-data-${supplierId}`, response);
    
    // Cache QR code image
    if (data.qrCodeUrl) {
      await this.cache.add(data.qrCodeUrl);
    }
  }
  
  async getReferralDataOffline(supplierId: string): Promise<ReferralData | null> {
    if (!this.cache) return null;
    
    const cachedResponse = await this.cache.match(`referral-data-${supplierId}`);
    if (!cachedResponse) return null;
    
    const data = await cachedResponse.json();
    
    // Check if cache is still valid (24 hours)
    const cacheAge = Date.now() - data.timestamp;
    if (cacheAge > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return data;
  }
  
  async syncWhenOnline() {
    // Sync offline actions when connection restored
    if (navigator.onLine) {
      const pendingActions = await this.getPendingActions();
      for (const action of pendingActions) {
        try {
          await this.executePendingAction(action);
          await this.removePendingAction(action.id);
        } catch (error) {
          console.error('Failed to sync action:', action, error);
        }
      }
    }
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] **Mobile-first referral sharing** - Native share APIs with fallbacks
- [ ] **PWA manifest enhancement** - Referral shortcuts and share targets
- [ ] **Cross-platform components** - iOS/Android/Desktop optimized sharing
- [ ] **Offline PWA support** - Cache referral data and QR codes
- [ ] **Native app integration** - WhatsApp, SMS, email deep linking
- [ ] **Touch optimization** - 48px+ touch targets, gesture handling
- [ ] **Performance optimization** - Lazy loading, image optimization
- [ ] **Platform-specific features** - iOS shortcuts, Android intents

## 💾 WHERE TO SAVE YOUR WORK
- Mobile Components: $WS_ROOT/wedsync/src/components/mobile/referrals/
- PWA Config: $WS_ROOT/wedsync/public/manifest.json
- Native Services: $WS_ROOT/wedsync/src/services/mobile/
- Offline Support: $WS_ROOT/wedsync/src/lib/pwa/
- Tests: $WS_ROOT/wedsync/__tests__/mobile/referrals/

## 🏁 COMPLETION CHECKLIST
- [ ] **Mobile components created** - All mobile-specific referral components
- [ ] **PWA manifest updated** - Referral shortcuts and share targets
- [ ] **Native sharing working** - iOS/Android share APIs functional
- [ ] **Cross-platform tested** - Verified on multiple devices/browsers
- [ ] **Offline support active** - QR codes and data cached offline
- [ ] **Performance optimized** - Fast loading on slow connections
- [ ] **Touch targets validated** - All interactive elements 48px+
- [ ] **Deep links functional** - Referral links work across platforms

## 📱 MOBILE-SPECIFIC REQUIREMENTS

### Viewport Optimization
```html
<!-- Enhanced mobile viewport -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

### iOS Safari Optimization
```css
/* iOS Safari specific optimizations */
.referral-mobile-container {
  /* Safe area support */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  
  /* Prevent zoom on input focus */
  font-size: 16px;
  
  /* Smooth scrolling */
  -webkit-overflow-scrolling: touch;
}
```

### Android Chrome Optimization
```typescript
// Android-specific features
const useAndroidOptimizations = () => {
  useEffect(() => {
    // Android intent handling
    if (navigator.userAgent.includes('Android')) {
      // Enable Android app intents for sharing
      document.addEventListener('android-intent', handleAndroidIntent);
    }
  }, []);
};
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for Team D Platform work on the WS-344 Supplier Referral & Gamification System!**