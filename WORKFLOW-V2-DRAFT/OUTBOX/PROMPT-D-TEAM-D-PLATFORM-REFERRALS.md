# TEAM D - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Platform/Mobile Optimization Focus

**YOUR MISSION:** Optimize the referral system for mobile-first usage, implement PWA functionality, and ensure seamless operation across all devices and platforms
**FEATURE ID:** WS-344 (Track all work with this ID)  
**TIME LIMIT:** 12 hours for comprehensive mobile platform optimization
**THINK ULTRA HARD** about mobile wedding vendor scenarios - sharing referrals at venues, expos, and on-the-go between weddings

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **MOBILE PERFORMANCE PROOF:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run build
npm run start
# Test mobile performance at localhost:3000/dashboard/referrals
# Lighthouse mobile score must be >90
```

2. **PWA FUNCTIONALITY TEST:**
```bash
# Test PWA installation and offline functionality
curl -I http://localhost:3000/manifest.json
# MUST show: Content-Type: application/json
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/public/sw.js | head -10
# MUST show: Service worker with referral caching
```

3. **MOBILE RESPONSIVENESS VERIFICATION:**
```bash
# Using Browser MCP to test all mobile breakpoints
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/\(dashboard\)/referrals/
# All referral pages must exist and be responsive
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing PWA and mobile optimization patterns
await mcp__serena__search_for_pattern("manifest\.json|service.*worker|pwa");
await mcp__serena__find_symbol("Layout", "", true);
await mcp__serena__get_symbols_overview("src/app/layout.tsx");
await mcp__serena__get_symbols_overview("src/components/layout/");
```

### B. MOBILE ARCHITECTURE ANALYSIS (MINUTES 3-5)
```typescript
// Load existing mobile-first patterns for consistency
await mcp__serena__search_for_pattern("responsive|mobile|breakpoint|viewport");
await mcp__serena__find_symbol("useMediaQuery", "", true);
await mcp__serena__get_symbols_overview("src/hooks/");
```

### C. REF MCP CURRENT DOCS (MINUTES 5-7)
```typescript
// Load documentation SPECIFIC to PWA and mobile optimization
await mcp__Ref__ref_search_documentation("Next.js PWA implementation service worker offline functionality");
await mcp__Ref__ref_search_documentation("React mobile responsive design touch optimization");
await mcp__Ref__ref_search_documentation("Web Share API mobile sharing implementation");
await mcp__Ref__ref_search_documentation("Mobile performance optimization Lighthouse scoring");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE PLATFORM OPTIMIZATION

### Use Sequential Thinking MCP for Mobile UX Planning
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "For mobile referral system optimization, I need to solve wedding industry-specific challenges: 1) Wedding suppliers share referrals at venues with poor wifi, 2) QR code scanning in varying lighting conditions, 3) One-handed operation while at weddings, 4) Offline functionality during network outages, 5) Fast loading on 3G networks common at outdoor venues.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "PWA requirements for wedding vendors: 1) Install to home screen for quick access between clients, 2) Cache referral links for offline sharing, 3) Background sync for referral tracking when connection restored, 4) Push notifications for referral conversions, 5) Native-like sharing with Web Share API for WhatsApp/social platforms.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile-first UI considerations: 1) Touch targets minimum 48x48px for venue lighting, 2) QR codes large enough to scan easily, 3) Copy buttons with haptic feedback, 4) Bottom sheet navigation for thumb reach, 5) Swipe gestures for leaderboard filtering, 6) Pull-to-refresh for real-time stats.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance optimization critical for mobile: 1) Image lazy loading for leaderboard avatars, 2) QR code generation with Web Workers, 3) Virtualized lists for long leaderboards, 4) Prefetch referral data on app launch, 5) Service worker caching for instant load times, 6) Bundle size <500KB for 3G networks.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Cross-platform compatibility: 1) Safari iOS quirks with PWA installation, 2) Chrome Android Web Share API differences, 3) Samsung Internet browser support, 4) WebView compatibility for embedded sharing, 5) Responsive breakpoints for tablets used at wedding expos, 6) Accessibility for screen readers on mobile.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down mobile optimization and PWA implementation tasks
2. **ui-ux-designer** - Use Serena for mobile-first design patterns and touch optimization
3. **performance-optimization-expert** - Ensure <2s load times on 3G networks
4. **react-ui-specialist** - Optimize React components for mobile rendering
5. **test-automation-architect** - Comprehensive mobile testing across devices
6. **documentation-chronicler** - Evidence-based mobile optimization documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE PLATFORM SECURITY CHECKLIST:
- [ ] **HTTPS enforcement** - All PWA functionality requires secure origins
- [ ] **CSP headers** - Content Security Policy for service worker and manifest
- [ ] **Secure storage** - Use encrypted storage for cached referral data
- [ ] **Origin validation** - Verify referral links before caching/sharing
- [ ] **Biometric auth** - Touch/Face ID for sensitive referral operations
- [ ] **App transport security** - iOS requirements for network requests
- [ ] **Privacy manifest** - iOS privacy requirements for data collection
- [ ] **Permissions handling** - Graceful degradation when permissions denied
- [ ] **Data sanitization** - Clean all cached data to prevent XSS
- [ ] **Deep link validation** - Secure handling of referral URL schemes

## 📱 MOBILE-FIRST IMPLEMENTATION

### COMPONENT 1: Mobile-Optimized Referral Layout
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/MobileReferralLayout.tsx

'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, QrCode, Share, Trophy, TrendingUp } from 'lucide-react';

interface MobileReferralLayoutProps {
  children: React.ReactNode;
  currentSection: 'dashboard' | 'leaderboard' | 'stats' | 'share';
  onSectionChange: (section: string) => void;
}

export function MobileReferralLayout({ 
  children, 
  currentSection, 
  onSectionChange 
}: MobileReferralLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mobile navigation sections
  const mobileNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: TrendingUp,
      description: 'Overview & quick actions'
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share,
      description: 'Create & share referral links'
    },
    {
      id: 'leaderboard',
      label: 'Rankings',
      icon: Trophy,
      description: 'View leaderboards'
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: TrendingUp,
      description: 'Detailed analytics'
    }
  ];

  if (!isMobile) {
    // Desktop layout - return children as-is
    return <div className="referral-desktop-layout">{children}</div>;
  }

  return (
    <div className="referral-mobile-layout min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">Referral Center</h2>
                  <nav className="space-y-2">
                    {mobileNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentSection === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSectionChange(item.id);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                          <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-semibold">
              {mobileNavItems.find(item => item.id === currentSection)?.label || 'Referrals'}
            </h1>
          </div>

          {/* Quick Action Button */}
          {currentSection === 'dashboard' && (
            <Button 
              size="sm" 
              className="flex items-center space-x-2"
              onClick={() => onSectionChange('share')}
            >
              <Share className="h-4 w-4" />
              <span>Share</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Content */}
      <div className="px-4 py-4">
        {children}
      </div>

      {/* Bottom Navigation (Alternative to hamburger menu) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex items-center justify-around">
          {mobileNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
}
```

### COMPONENT 2: Mobile QR Code Display
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/MobileQRDisplay.tsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, Copy, Check, Maximize2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MobileQRDisplayProps {
  qrCodeUrl: string;
  referralLink: string;
  referralCode: string;
  onShare: (platform: string) => void;
}

export function MobileQRDisplay({ 
  qrCodeUrl, 
  referralLink, 
  referralCode,
  onShare 
}: MobileQRDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Copy to clipboard with mobile optimization
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      // Use modern clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older mobile browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
        duration: 2000
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Copy failed",
        description: "Please manually copy the link",
        variant: "destructive"
      });
    }
  }, []);

  // Native sharing with fallback
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WedSync - Wedding Coordination Platform',
          text: 'Check out WedSync for wedding coordination!',
          url: referralLink
        });
        onShare('native');
      } catch (error) {
        // User cancelled or sharing failed
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fall back to copy
          copyToClipboard(referralLink);
        }
      }
    } else {
      // Fallback to copy for unsupported browsers
      copyToClipboard(referralLink);
    }
  }, [referralLink, onShare, copyToClipboard]);

  // Download QR code for offline use
  const downloadQRCode = useCallback(async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `wedsync-referral-${referralCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "QR code saved to your device",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Unable to download QR code",
        variant: "destructive"
      });
    }
  }, [qrCodeUrl, referralCode]);

  return (
    <>
      {/* Mobile-Optimized QR Card */}
      <Card className="w-full">
        <CardContent className="p-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div 
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer"
                onClick={() => setFullScreenOpen(true)}
              >
                <img
                  src={qrCodeUrl}
                  alt={`QR Code for referral ${referralCode}`}
                  className="w-48 h-48 object-contain" // Large enough for venue scanning
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.error('QR code failed to load');
                    toast({
                      title: "QR Code Error",
                      description: "Failed to load QR code",
                      variant: "destructive"
                    });
                  }}
                />
                
                {/* Maximize indicator */}
                <div className="absolute top-2 right-2 bg-black/20 rounded-full p-1">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </div>
              
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="animate-pulse text-gray-500">Loading QR Code...</div>
                </div>
              )}
            </div>

            {/* Mobile Action Buttons */}
            <div className="w-full space-y-3">
              {/* Native Share Button (Primary) */}
              <Button 
                onClick={handleNativeShare}
                className="w-full h-12 text-base font-medium"
                size="lg"
              >
                <Share className="mr-2 h-5 w-5" />
                Share Referral
              </Button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(referralLink)}
                  className="h-12"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={downloadQRCode}
                  className="h-12"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Referral Code Display */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Referral Code</p>
              <p className="text-lg font-mono font-bold tracking-wider">{referralCode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Screen QR Code Dialog */}
      <Dialog open={fullScreenOpen} onOpenChange={setFullScreenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-6 rounded-lg">
              <img
                src={qrCodeUrl}
                alt={`QR Code for referral ${referralCode}`}
                className="w-64 h-64 object-contain" // Even larger for scanning
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Have someone scan this QR code to use your referral link
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Code: {referralCode}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### PWA CONFIGURATION

### PWA Manifest (Enhanced)
```json
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/public/manifest.json

{
  "name": "WedSync - Wedding Coordination Platform",
  "short_name": "WedSync",
  "description": "Professional wedding coordination for suppliers and couples",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en-GB",
  "dir": "ltr",
  
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  
  "categories": ["business", "productivity"],
  "iarc_rating_id": "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
  
  "screenshots": [
    {
      "src": "/screenshots/mobile-dashboard.png",
      "sizes": "390x844",
      "type": "image/png",
      "platform": "mobile",
      "label": "Mobile Dashboard"
    },
    {
      "src": "/screenshots/mobile-referrals.png", 
      "sizes": "390x844",
      "type": "image/png",
      "platform": "mobile",
      "label": "Referral Center"
    }
  ],
  
  "shortcuts": [
    {
      "name": "Create Referral",
      "short_name": "New Referral",
      "description": "Create a new referral link",
      "url": "/dashboard/referrals?action=create",
      "icons": [
        {
          "src": "/icons/shortcut-referral.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "View Leaderboard",
      "short_name": "Rankings",
      "description": "Check referral rankings",
      "url": "/dashboard/referrals/leaderboard",
      "icons": [
        {
          "src": "/icons/shortcut-leaderboard.png",
          "sizes": "96x96"
        }
      ]
    }
  ]
}
```

### Service Worker (Enhanced for Referrals)
```javascript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/public/sw.js

const CACHE_NAME = 'wedsync-referrals-v1';
const OFFLINE_URL = '/offline';

// Critical referral assets to cache
const REFERRAL_CACHE_URLS = [
  '/',
  '/dashboard',
  '/dashboard/referrals',
  '/dashboard/referrals/leaderboard',
  '/dashboard/referrals/stats',
  '/offline',
  '/manifest.json',
  // CSS and JS bundles will be added by Next.js
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching referral assets');
      return cache.addAll(REFERRAL_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy for referral system
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle referral API requests
  if (url.pathname.startsWith('/api/referrals/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful referral responses for offline access
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback for critical referral data
            return new Response(
              JSON.stringify({
                error: 'Offline - Please try again when connected',
                offline: true
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Handle referral page requests
  if (url.pathname.startsWith('/dashboard/referrals')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline');
          });
        })
    );
    return;
  }

  // Handle QR code image requests
  if (url.pathname.includes('/referral-qr-codes/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default cache-first strategy for other requests
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// Background sync for referral tracking
self.addEventListener('sync', (event) => {
  if (event.tag === 'referral-tracking') {
    event.waitUntil(doReferralSync());
  }
});

async function doReferralSync() {
  // Sync any pending referral events when connection is restored
  try {
    const db = await openDB();
    const pendingEvents = await getAllPendingEvents(db);
    
    for (const event of pendingEvents) {
      try {
        await fetch('/api/referrals/track-conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
        await removePendingEvent(db, event.id);
      } catch (error) {
        console.error('Failed to sync referral event:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications for referral updates
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'referral_conversion') {
      event.waitUntil(
        self.registration.showNotification('🎉 Referral Converted!', {
          body: `${data.supplierName} just became a paying customer! You've earned a free month.`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: 'referral-conversion',
          data: {
            url: '/dashboard/referrals'
          },
          actions: [
            {
              action: 'view',
              title: 'View Details'
            }
          ]
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard/referrals')
    );
  }
});
```

## 📱 MOBILE PERFORMANCE OPTIMIZATION

### Performance Monitoring Hook
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/hooks/usePerformanceMonitor.ts

'use client';

import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  ttfb: number; // Time to First Byte
}

export function usePerformanceMonitor(componentName: string) {
  const reportMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    // Only report in production and if analytics is available
    if (process.env.NODE_ENV === 'production' && typeof gtag !== 'undefined') {
      Object.entries(metrics).forEach(([metric, value]) => {
        gtag('event', 'web_vitals', {
          custom_parameter_1: componentName,
          custom_parameter_2: metric,
          value: Math.round(value)
        });
      });
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Performance:`, metrics);
    }
  }, [componentName]);

  useEffect(() => {
    // Measure component-specific performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const metrics: Partial<PerformanceMetrics> = {};

      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            metrics.lcp = entry.startTime;
            break;
          case 'layout-shift':
            if (!entry.hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + entry.value;
            }
            break;
          case 'first-input':
            metrics.fid = entry.processingStart - entry.startTime;
            break;
        }
      });

      if (Object.keys(metrics).length > 0) {
        reportMetrics(metrics);
      }
    });

    // Observe performance entries
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => {
      observer.disconnect();
    };
  }, [reportMetrics]);

  // Manual performance measurement function
  const measureAction = useCallback((actionName: string, fn: () => void) => {
    const startTime = performance.now();
    fn();
    const duration = performance.now() - startTime;
    
    reportMetrics({ [`${actionName}_duration`]: duration } as any);
  }, [reportMetrics]);

  return { measureAction };
}
```

## 🧪 MOBILE TESTING WITH BROWSER MCP

### Comprehensive Mobile Testing Suite
```typescript
// Mobile testing script for Browser MCP
async function testMobileReferralSystem() {
  // Test mobile viewport sizes
  const mobileViewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 390, height: 844, name: 'iPhone 12' },
    { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
    { width: 360, height: 640, name: 'Samsung Galaxy S8' },
    { width: 412, height: 915, name: 'Samsung Galaxy S20' }
  ];

  for (const viewport of mobileViewports) {
    console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    // Resize browser to mobile viewport
    await mcp__playwright__browser_resize(viewport.width, viewport.height);
    
    // Test referral dashboard
    await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals'});
    await mcp__playwright__browser_snapshot();
    await mcp__playwright__browser_take_screenshot({
      filename: `mobile-referrals-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`
    });

    // Test mobile navigation
    await mcp__playwright__browser_click({
      element: 'Mobile menu button',
      ref: '[data-testid="mobile-menu"]'
    });
    await mcp__playwright__browser_wait_for({text: 'Referral Center'});
    await mcp__playwright__browser_take_screenshot({
      filename: `mobile-nav-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`
    });

    // Test referral creation on mobile
    await mcp__playwright__browser_click({
      element: 'Share section',
      ref: '[data-testid="share-section"]'
    });
    await mcp__playwright__browser_click({
      element: 'Create Referral Link button',
      ref: '[data-testid="create-referral-link"]'
    });
    await mcp__playwright__browser_wait_for({text: 'wedsync.com/join/'});

    // Test QR code display on mobile
    await mcp__playwright__browser_click({
      element: 'Show QR Code button',
      ref: '[data-testid="show-qr-code"]'
    });
    await mcp__playwright__browser_take_screenshot({
      filename: `mobile-qr-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`
    });

    // Test mobile sharing functionality
    await mcp__playwright__browser_click({
      element: 'Share button',
      ref: '[data-testid="native-share"]'
    });

    // Test leaderboard on mobile
    await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals/leaderboard'});
    await mcp__playwright__browser_take_screenshot({
      filename: `mobile-leaderboard-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`
    });

    // Test touch interactions
    await mcp__playwright__browser_click({
      element: 'Category filter',
      ref: '[data-testid="category-filter"]'
    });
    
    // Test swipe/scroll performance
    await mcp__playwright__browser_evaluate({
      function: '() => window.scrollTo(0, 500)',
    });
    
    // Monitor performance during mobile usage
    const networkRequests = await mcp__playwright__browser_network_requests();
    const slowRequests = networkRequests.filter(req => req.responseTime > 2000);
    if (slowRequests.length > 0) {
      console.warn(`Slow requests on ${viewport.name}:`, slowRequests);
    }

    console.log(`✓ ${viewport.name} testing complete`);
  }

  // Test PWA functionality
  console.log('Testing PWA functionality...');
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/manifest.json'});
  const manifestContent = await mcp__playwright__browser_evaluate({
    function: '() => document.body.innerText'
  });
  
  if (manifestContent.includes('WedSync')) {
    console.log('✓ PWA manifest accessible');
  } else {
    console.error('❌ PWA manifest invalid');
  }

  // Test service worker
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/dashboard/referrals'});
  const swRegistered = await mcp__playwright__browser_evaluate({
    function: '() => navigator.serviceWorker.controller !== null'
  });
  
  if (swRegistered) {
    console.log('✓ Service worker active');
  } else {
    console.error('❌ Service worker not registered');
  }

  console.log('Mobile testing complete!');
}
```

## 🎯 REAL WEDDING SCENARIO (MANDATORY CONTEXT)

**Mobile Wedding Industry Scenario:**
"Sarah is at a wedding venue doing final setup when she meets the DJ who's struggling with timeline coordination. She pulls out her phone, opens WedSync (installed as PWA on home screen), taps 'Share' in the referral center, generates a QR code that the DJ scans with his camera app. Even though the venue has poor wifi, the QR code works offline and opens the referral link. Later, when the DJ signs up at home and converts to paid, Sarah gets a push notification celebration that she earned a free month. The entire interaction took 30 seconds and worked perfectly despite network issues."

## 💾 WHERE TO SAVE YOUR WORK

**Mobile Components:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/
├── MobileReferralLayout.tsx (Mobile-optimized layout)
├── MobileQRDisplay.tsx (Touch-optimized QR display)
├── MobileSharingWidget.tsx (Native sharing integration)
└── MobileLeaderboard.tsx (Touch-friendly leaderboard)
```

**PWA Configuration:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/public/
├── manifest.json (PWA manifest)
├── sw.js (Service worker with referral caching)
└── icons/ (PWA icons in all sizes)
```

**Performance Hooks:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/hooks/
├── usePerformanceMonitor.ts (Performance tracking)
├── useMediaQuery.ts (Responsive breakpoints)
└── useOfflineStatus.ts (Network connectivity)
```

**Mobile Styles:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/styles/
├── mobile-referrals.css (Mobile-specific referral styles)
└── touch-optimizations.css (Touch interaction styles)
```

**Test Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/__tests__/
├── mobile-responsiveness.test.ts
├── pwa-functionality.test.ts
└── touch-interactions.test.ts
```

## 🏁 COMPLETION CHECKLIST

**PWA IMPLEMENTATION:**
- [ ] **Manifest.json** - Complete PWA manifest with shortcuts and screenshots
- [ ] **Service Worker** - Offline caching for referral functionality
- [ ] **App Icons** - All required icon sizes for PWA installation
- [ ] **Offline Pages** - Graceful fallback when network unavailable

**MOBILE OPTIMIZATION:**
- [ ] **Responsive Layout** - Perfect function on 375px to 428px screens
- [ ] **Touch Interactions** - 48px minimum touch targets throughout
- [ ] **Native Sharing** - Web Share API with fallback to copy/paste
- [ ] **Mobile Navigation** - Thumb-reach optimized navigation patterns

**PERFORMANCE REQUIREMENTS:**
- [ ] **Lighthouse Mobile Score** - >90 performance score on 3G
- [ ] **Bundle Size** - <500KB initial load for referral section
- [ ] **Image Optimization** - WebP format with fallbacks for QR codes
- [ ] **Lazy Loading** - Progressive loading of leaderboard content

**CROSS-PLATFORM COMPATIBILITY:**
- [ ] **iOS Safari** - PWA installation and Web Share API support
- [ ] **Android Chrome** - Full PWA functionality with background sync
- [ ] **Samsung Internet** - Compatibility testing and optimization
- [ ] **WebView Support** - Embedded browser compatibility for sharing

**ACCESSIBILITY COMPLIANCE:**
- [ ] **Screen Reader Support** - ARIA labels for all interactive elements
- [ ] **Keyboard Navigation** - Tab order and focus management
- [ ] **High Contrast Mode** - Visibility in accessibility modes
- [ ] **Voice Control** - iOS/Android voice assistant compatibility

**TESTING COVERAGE:**
- [ ] **Mobile Browser Testing** - All major mobile browsers tested
- [ ] **Device Testing** - iPhone SE through iPhone 15 Pro Max
- [ ] **Android Testing** - Samsung, Google Pixel, OnePlus devices
- [ ] **PWA Installation Testing** - Home screen installation verified

**EVIDENCE PACKAGE:**
- [ ] **Lighthouse Reports** - >90 scores across all categories
- [ ] **Mobile Screenshots** - All breakpoints documented
- [ ] **PWA Installation Proof** - Home screen installation working
- [ ] **Performance Metrics** - Load times <2s on 3G networks

---

**EXECUTE IMMEDIATELY - Create a mobile-first referral experience that works perfectly for wedding suppliers sharing referrals at venues, expos, and between weddings. Focus on reliability, speed, and seamless operation in challenging mobile network conditions.**