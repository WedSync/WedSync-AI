# TEAM D - ROUND 1: WS-326 - Wedding Website Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build mobile-first responsive design system and PWA functionality for wedding websites with offline capability and WedMe platform integration
**FEATURE ID:** WS-326 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating wedding websites that work perfectly on mobile devices where 70% of guests will view them

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedding-website/mobile/
ls -la $WS_ROOT/wedsync/src/lib/pwa/wedding-website/
cat $WS_ROOT/wedsync/src/components/wedding-website/mobile/MobileWebsiteRenderer.tsx | head -20
cat $WS_ROOT/wedsync/public/wedding-website-sw.js | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **MOBILE RESPONSIVE TEST:**
```bash
cd $WS_ROOT/wedsync && npm run test:mobile -- --testPathPattern="wedding-website"
# MUST show: "Mobile responsive tests passing"
```

4. **PWA FUNCTIONALITY TEST:**
```bash
cd $WS_ROOT/wedsync && npm run test:pwa -- --testPathPattern="wedding-website"
# MUST show: "PWA functionality tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query mobile and PWA patterns
await mcp__serena__search_for_pattern("mobile.*responsive|pwa.*config|service.*worker");
await mcp__serena__find_symbol("MobileOptimizer", "", true);
await mcp__serena__get_symbols_overview("src/lib/pwa");
await mcp__serena__find_symbol("ResponsiveDesign", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR MOBILE WORK)
```typescript
// Load the SAAS UI Style Guide for mobile patterns
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to mobile optimization and PWA development
await mcp__Ref__ref_search_documentation("React 19 mobile responsive design PWA service workers");
await mcp__Ref__ref_search_documentation("Next.js 15 mobile optimization touch interactions");
await mcp__Ref__ref_search_documentation("Tailwind CSS mobile-first responsive breakpoints");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE-FIRST DESIGN

### Use Sequential Thinking MCP for Mobile Architecture
```typescript
// Plan the mobile-optimized wedding website system
mcp__sequential-thinking__sequential_thinking({
  thought: "For mobile wedding websites, I need: 1) Mobile-first responsive design with touch-optimized interactions, 2) PWA functionality for offline RSVP capability, 3) Optimized image loading for poor venue Wi-Fi, 4) Touch-friendly RSVP forms, 5) Fast loading on 3G networks, 6) Cross-platform compatibility (iOS/Android).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile performance considerations: Image optimization and lazy loading, Service worker for offline functionality, Touch gesture support for photo galleries, Viewport meta tag optimization, Font loading optimization, Minimal JavaScript for fast initial load.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down mobile components, track performance dependencies
2. **react-ui-specialist** - Focus on mobile-optimized React components
3. **performance-optimization-expert** - Ensure fast mobile loading and smooth interactions
4. **code-quality-guardian** - Maintain mobile performance standards
5. **test-automation-architect** - Mobile testing with device simulation
6. **documentation-chronicler** - Evidence-based mobile optimization documentation

## 🔒 MOBILE SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MOBILE SECURITY CHECKLIST:
- [ ] **Touch hijacking prevention** - Secure touch event handling
- [ ] **Service worker security** - Secure offline data storage
- [ ] **Cross-origin isolation** - Secure PWA functionality
- [ ] **Content Security Policy** - Mobile-specific CSP headers
- [ ] **Secure storage** - Encrypted offline data storage
- [ ] **Certificate pinning** - HTTPS enforcement on mobile
- [ ] **Input validation** - Touch input and gesture validation
- [ ] **Screen recording protection** - Prevent sensitive data capture

## 🎯 TEAM D SPECIALIZATION: PLATFORM/WEDME FOCUS

**PRIMARY RESPONSIBILITIES:**
- Mobile-first design principles and implementation
- PWA functionality and service worker management
- WedMe platform integration and cross-platform features
- Offline capability and data synchronization
- Cross-platform compatibility (iOS/Android/Web)
- Mobile performance optimization and monitoring

### MOBILE WEDDING WEBSITE REQUIREMENTS

#### 1. MOBILE-RESPONSIVE WEBSITE RENDERER
```typescript
// File: $WS_ROOT/wedsync/src/components/wedding-website/mobile/MobileWebsiteRenderer.tsx

interface MobileWebsiteProps {
  website: WeddingWebsite;
  theme: WeddingWebsiteTheme;
  preview?: boolean;
}

export function MobileWebsiteRenderer({ website, theme, preview = false }: MobileWebsiteProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [rsvpData, setRsvpData] = useState<RSVPFormData | null>(null);

  useEffect(() => {
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator && !preview) {
      registerWeddingWebsiteServiceWorker(website.id);
    }

    // Monitor offline status
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [website.id, preview]);

  return (
    <div className="mobile-wedding-website" data-theme={theme.id}>
      {/* Mobile-optimized viewport configuration */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={theme.colors.primary} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href={`/api/wedding-websites/${website.id}/manifest.json`} />
      </Head>

      {/* Offline indicator */}
      {isOffline && (
        <div className="offline-banner bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
          <div className="flex items-center">
            <WifiOff className="h-4 w-4 text-yellow-700 mr-2" />
            <p className="text-sm text-yellow-700">
              You're offline. RSVP responses will be saved and sent when connection returns.
            </p>
          </div>
        </div>
      )}

      {/* Mobile-optimized content sections */}
      <MobileHeroSection website={website} theme={theme} />
      <MobileStorySection content={website.content.ourStory} theme={theme} />
      <MobileWeddingDetailsSection content={website.content.weddingDetails} theme={theme} />
      <MobileRSVPSection 
        website={website} 
        theme={theme} 
        offline={isOffline}
        onRSVPSubmit={handleOfflineRSVP}
      />
      <MobilePhotoGallerySection website={website} theme={theme} />
      <MobileRegistrySection links={website.content.registryLinks} theme={theme} />
    </div>
  );
}
```

#### 2. MOBILE-OPTIMIZED RSVP FORM
```typescript
// File: $WS_ROOT/wedsync/src/components/wedding-website/mobile/MobileRSVPForm.tsx

export function MobileRSVPForm({ website, offline, onOfflineSubmit }: MobileRSVPFormProps) {
  const [formData, setFormData] = useState<RSVPFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (offline) {
        // Store RSVP offline for later sync
        await storeRSVPOffline(website.id, formData);
        onOfflineSubmit(formData);
        setSubmitStatus('success');
      } else {
        // Submit RSVP online
        await submitRSVP(website.id, formData);
        setSubmitStatus('success');
      }
    } catch (error) {
      console.error('RSVP submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mobile-rsvp-form space-y-6 p-4">
      {/* Large, touch-friendly form fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            required
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none touch-manipulation"
            placeholder="Enter your full name"
            value={formData.guestName || ''}
            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Will you be attending? *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['Yes', 'No'].map((option) => (
              <label
                key={option}
                className={`
                  flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer
                  touch-manipulation transition-all duration-200
                  ${formData.attending === (option === 'Yes') 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="radio"
                  name="attending"
                  value={option}
                  className="sr-only"
                  checked={formData.attending === (option === 'Yes')}
                  onChange={(e) => setFormData({ ...formData, attending: option === 'Yes' })}
                />
                <span className="text-lg font-medium">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {formData.attending && (
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Number of Guests
            </label>
            <select
              className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none touch-manipulation"
              value={formData.guestCount || 1}
              onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        )}

        {/* Meal choices if enabled */}
        {website.content.rsvpSettings?.mealChoices && formData.attending && (
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Meal Choice
            </label>
            <div className="space-y-2">
              {website.content.rsvpSettings.mealChoices.map((meal) => (
                <label
                  key={meal}
                  className={`
                    flex items-center p-3 border-2 rounded-lg cursor-pointer
                    touch-manipulation transition-all duration-200
                    ${formData.mealChoice === meal 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="mealChoice"
                    value={meal}
                    className="sr-only"
                    checked={formData.mealChoice === meal}
                    onChange={(e) => setFormData({ ...formData, mealChoice: e.target.value })}
                  />
                  <span className="ml-3 text-base">{meal}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Special Requests or Dietary Restrictions
          </label>
          <textarea
            rows={4}
            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none touch-manipulation resize-none"
            placeholder="Any special requests, dietary restrictions, or notes..."
            value={formData.specialRequests || ''}
            onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`
          w-full p-4 text-lg font-semibold rounded-lg transition-all duration-200
          touch-manipulation min-h-[60px]
          ${isSubmitting 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
            : 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker'
          }
        `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
            {offline ? 'Saving Offline...' : 'Submitting RSVP...'}
          </span>
        ) : (
          offline ? 'Save RSVP (Will Send When Online)' : 'Submit RSVP'
        )}
      </button>

      {/* Status messages */}
      {submitStatus === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          {offline 
            ? 'RSVP saved offline! It will be submitted automatically when you\'re back online.' 
            : 'Thank you! Your RSVP has been submitted successfully.'
          }
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          Something went wrong. Please try again or contact the couple directly.
        </div>
      )}
    </form>
  );
}
```

#### 3. PWA SERVICE WORKER
```javascript
// File: $WS_ROOT/wedsync/public/wedding-website-sw.js

const CACHE_NAME = 'wedding-website-v1';
const OFFLINE_PAGE = '/offline';

// Essential files to cache for offline functionality
const ESSENTIAL_FILES = [
  '/',
  '/offline',
  '/assets/wedding-logo.png',
  '/assets/wedding-bg.jpg'
];

// Install service worker and cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ESSENTIAL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Handle RSVP submissions specially
  if (event.request.url.includes('/api/rsvp') && event.request.method === 'POST') {
    event.respondWith(handleRSVPSubmission(event.request));
    return;
  }

  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache or offline page
        return caches.match(event.request)
          .then((response) => response || caches.match(OFFLINE_PAGE));
      })
  );
});

// Handle offline RSVP submissions
async function handleRSVPSubmission(request) {
  try {
    // Try to submit online first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Store RSVP data for later submission
    const rsvpData = await request.json();
    await storeOfflineRSVP(rsvpData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        offline: true, 
        message: 'RSVP stored offline. Will be submitted when connection returns.' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Store RSVP data in IndexedDB for offline submission
async function storeOfflineRSVP(rsvpData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WeddingWebsiteOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['rsvps'], 'readwrite');
      const store = transaction.objectStore('rsvps');
      
      store.add({
        ...rsvpData,
        timestamp: Date.now(),
        submitted: false
      });
      
      transaction.oncomplete = () => resolve();
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore('rsvps', { keyPath: 'id', autoIncrement: true });
      store.createIndex('submitted', 'submitted', { unique: false });
    };
  });
}

// Sync offline RSVPs when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'rsvp-sync') {
    event.waitUntil(syncOfflineRSVPs());
  }
});

async function syncOfflineRSVPs() {
  const db = await openOfflineDB();
  const transaction = db.transaction(['rsvps'], 'readonly');
  const store = transaction.objectStore('rsvps');
  const index = store.index('submitted');
  
  const unsubmittedRSVPs = await new Promise((resolve) => {
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result);
  });

  for (const rsvp of unsubmittedRSVPs) {
    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvp)
      });
      
      // Mark as submitted
      await markRSVPAsSubmitted(rsvp.id);
    } catch (error) {
      console.error('Failed to sync RSVP:', error);
    }
  }
}
```

#### 4. MOBILE PERFORMANCE OPTIMIZER
```typescript
// File: $WS_ROOT/wedsync/src/lib/mobile/wedding-website-optimizer.ts

export class MobileWeddingWebsiteOptimizer {
  private static instance: MobileWeddingWebsiteOptimizer;

  static getInstance(): MobileWeddingWebsiteOptimizer {
    if (!MobileWeddingWebsiteOptimizer.instance) {
      MobileWeddingWebsiteOptimizer.instance = new MobileWeddingWebsiteOptimizer();
    }
    return MobileWeddingWebsiteOptimizer.instance;
  }

  // Optimize images for mobile viewing
  optimizeImagesForMobile(images: WeddingImage[]): OptimizedImage[] {
    return images.map(image => ({
      ...image,
      srcSet: this.generateResponsiveSrcSet(image),
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      loading: 'lazy',
      decoding: 'async'
    }));
  }

  private generateResponsiveSrcSet(image: WeddingImage): string {
    const breakpoints = [375, 768, 1024, 1200];
    return breakpoints
      .map(width => `${this.resizeImageUrl(image.url, width)} ${width}w`)
      .join(', ');
  }

  private resizeImageUrl(url: string, width: number): string {
    // Use Cloudflare Image Resizing or similar service
    return `${url}?w=${width}&f=webp&q=80`;
  }

  // Preload critical resources for mobile
  preloadCriticalResources(website: WeddingWebsite): void {
    const criticalImages = [
      website.heroImage,
      website.couplePhoto
    ].filter(Boolean);

    criticalImages.forEach(imageUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = this.resizeImageUrl(imageUrl, 375); // Mobile size
      document.head.appendChild(link);
    });
  }

  // Monitor mobile performance metrics
  trackMobilePerformance(): void {
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        // Report LCP to analytics
        this.reportMetric('mobile-lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Track First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.reportMetric('mobile-fid', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }
  }

  private reportMetric(name: string, value: number): void {
    // Report to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'wedding_website_performance', {
        metric_name: name,
        value: Math.round(value),
        device_type: this.getDeviceType()
      });
    }
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'desktop';
  }
}
```

## 📋 REAL WEDDING USER STORIES FOR MOBILE

**Emma & James (Photography Couple):**
*Mobile needs: Fast photo gallery loading on venue Wi-Fi, touch-friendly RSVP for 150 guests, offline capability for remote venue, iOS/Android compatibility*

**Sarah & Mike (Destination Wedding):**
*Mobile needs: International roaming optimization, multilingual mobile interface, offline map integration, cross-timezone RSVP handling*

**Lisa & David (Garden Party Wedding):**
*Mobile needs: Simple touch interface for older relatives, large text and buttons, fast loading on slow connections, basic offline functionality*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Mobile-responsive website renderer with touch optimization
- [ ] Mobile-optimized RSVP form with offline capability
- [ ] PWA service worker for offline functionality
- [ ] Mobile performance optimization system
- [ ] Cross-platform compatibility testing (iOS/Android)
- [ ] Touch gesture support for photo galleries
- [ ] Mobile viewport configuration and meta tags
- [ ] Image optimization for mobile networks
- [ ] Performance monitoring and analytics
- [ ] Evidence package with mobile testing results

## 💾 WHERE TO SAVE YOUR WORK
- Mobile Components: `$WS_ROOT/wedsync/src/components/wedding-website/mobile/`
- PWA Service Worker: `$WS_ROOT/wedsync/public/wedding-website-sw.js`
- Mobile Optimizer: `$WS_ROOT/wedsync/src/lib/mobile/wedding-website-optimizer.ts`
- PWA Manifest: `$WS_ROOT/wedsync/src/app/api/wedding-websites/[id]/manifest.json/route.ts`
- Mobile Styles: `$WS_ROOT/wedsync/src/styles/mobile/wedding-website.css`
- Tests: `$WS_ROOT/wedsync/src/__tests__/mobile/wedding-website/`

## 🏁 COMPLETION CHECKLIST
- [ ] Mobile-responsive website renderer implemented
- [ ] Touch-optimized RSVP form with offline capability
- [ ] PWA service worker with offline sync functionality
- [ ] Mobile performance optimization implemented
- [ ] Cross-platform compatibility verified (iOS/Android)
- [ ] Touch gestures and mobile interactions working
- [ ] Image optimization for mobile networks
- [ ] TypeScript compilation successful with no errors
- [ ] All mobile tests passing (>90% coverage)
- [ ] Performance metrics meeting targets (<3s loading on 3G)
- [ ] PWA functionality tested and working
- [ ] Evidence package with mobile device testing results

---

**EXECUTE IMMEDIATELY - Build the mobile experience that makes wedding websites perfect for guests on their phones!**