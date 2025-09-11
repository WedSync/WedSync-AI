# WS-253 Florist Intelligence System - Team D Platform Prompt

## EVIDENCE OF REALITY REQUIREMENTS (CRITICAL)
**MANDATORY: This task is incomplete until ALL evidence below is provided:**

### Mobile Performance Testing (MANDATORY)
```bash
# MUST show mobile performance metrics:
cd wedsync
npm run build
npm run start

# Test on mobile viewport (375px width)
curl "http://localhost:3000/dashboard/florist/intelligence" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)" \
  -w "\nTime: %{time_total}s\nSize: %{size_download} bytes\n"
# Must complete in <2 seconds, <500KB total size
```

### PWA Functionality Testing (MANDATORY)
```bash
# MUST demonstrate PWA features working:
# Test service worker registration
curl http://localhost:3000/sw.js
# Should return valid service worker

# Test manifest.json
curl http://localhost:3000/manifest.json | jq
# Should show florist-specific app manifest

# Test offline functionality
# 1. Load florist intelligence page
# 2. Disconnect network
# 3. Reload page - should show cached version
# 4. Show offline flower recommendations
```

### Touch Interface Testing (MANDATORY)
```bash
# Using Playwright MCP to test touch interactions:
# MUST demonstrate:
# 1. Color picker works with touch events on mobile
# 2. Flower search filters usable with finger navigation
# 3. Drag-and-drop arrangement builder works on touchscreens
# 4. Swipe navigation between florist tool tabs
# 5. Pinch-to-zoom works on color palettes
```

### Database Performance Testing (MANDATORY)
```bash
# MUST show optimized query performance:
cd wedsync
psql $DATABASE_URL -c "
EXPLAIN ANALYZE 
SELECT f.*, fcm.*, fsd.* 
FROM flower_varieties f
LEFT JOIN flower_color_matches fcm ON f.id = fcm.flower_id
LEFT JOIN flower_sustainability_data fsd ON f.id = fsd.flower_id
WHERE fcm.color_hex SIMILAR TO '#[0-9A-F]{6}'
AND f.sustainability_score > 0.5
LIMIT 20;
"
# Query must complete in <50ms with proper index usage
```

### Caching Performance Testing (MANDATORY)
```bash
# MUST demonstrate Redis caching working:
# First request (cache miss)
time curl -X POST http://localhost:3000/api/florist/palette/generate \
  -H "Content-Type: application/json" \
  -d '{"baseColors":["#FF69B4"],"style":"romantic","season":"spring"}'

# Second request (cache hit)  
time curl -X POST http://localhost:3000/api/florist/palette/generate \
  -H "Content-Type: application/json" \
  -d '{"baseColors":["#FF69B4"],"style":"romantic","season":"spring"}'
# Second request must be >5x faster than first
```

## TEAM D SPECIALIZATION - PLATFORM/MOBILE FOCUS

### Primary Responsibilities
1. **Mobile-First Optimization**: Touch interfaces, responsive design, performance on mobile devices
2. **PWA Implementation**: Service worker, offline functionality, app-like experience for florists
3. **Database Performance**: Query optimization, indexing strategy, large dataset handling
4. **Image Processing**: Flower image handling, color extraction, thumbnail generation
5. **Caching Strategy**: Redis implementation, cache invalidation, performance optimization

### Core Platform Features to Build

#### 1. Mobile-Optimized Florist Interface
```typescript
// File: /src/components/mobile/MobileFloristIntelligence.tsx
import { useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useTouch } from '@/hooks/useTouch';
import { MobileColorPicker } from './MobileColorPicker';
import { TouchFlowerSearch } from './TouchFlowerSearch';

interface MobileFloristIntelligenceProps {
  weddingId?: string;
  onRecommendationSelect?: (recommendation: any) => void;
  className?: string;
}

export function MobileFloristIntelligence({ 
  weddingId, 
  onRecommendationSelect,
  className = ''
}: MobileFloristIntelligenceProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tabs = ['Search', 'Palette', 'Arrange', 'Sustain'];

  // Swipe navigation between tabs
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentTab(prev => Math.min(prev + 1, tabs.length - 1)),
    onSwipedRight: () => setCurrentTab(prev => Math.max(prev - 1, 0)),
    trackMouse: false,
    trackTouch: true,
    delta: 50, // Minimum distance for swipe
    preventScrollOnSwipe: true
  });

  // Touch optimization
  const { touchEvents, touchState } = useTouch({
    onTouchStart: (e) => {
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
    onLongPress: (e) => {
      // Handle long press for context menus
      e.preventDefault();
    }
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Preload critical resources for offline use
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Preload florist data for offline use
        registration.active?.postMessage({
          type: 'PRELOAD_FLORIST_DATA',
          data: { weddingId, currentTab }
        });
      });
    }
  }, [weddingId, currentTab]);

  return (
    <div 
      ref={containerRef}
      className={`mobile-florist-intelligence min-h-screen bg-gray-50 ${className}`}
      {...swipeHandlers}
      {...touchEvents}
    >
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm text-center">
          <span className="inline-flex items-center">
            <span className="mr-2">📱</span>
            Working offline - some features may be limited
          </span>
        </div>
      )}

      {/* Mobile Header with Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">AI Florist Tools</h1>
          <p className="text-xs text-gray-600">Swipe left/right to navigate</p>
        </div>
        
        {/* Tab Pills - Optimized for Touch */}
        <div className="px-4 pb-3">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(index)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px]
                  transition-all duration-200 touch-manipulation
                  ${currentTab === index 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }
                `}
                style={{ touchAction: 'manipulation' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Progress Indicator */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentTab + 1) / tabs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tab Content - Swipeable */}
      <div 
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentTab * 100}%)` }}
      >
        {/* Flower Search Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <TouchFlowerSearch 
            weddingId={weddingId}
            isOffline={isOffline}
            onFlowerSelect={onRecommendationSelect}
          />
        </div>

        {/* Color Palette Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileColorPalette 
            weddingId={weddingId}
            isOffline={isOffline}
            onPaletteGenerated={onRecommendationSelect}
          />
        </div>

        {/* Arrangement Planning Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileArrangementPlanner 
            weddingId={weddingId}
            isOffline={isOffline}
            onArrangementComplete={onRecommendationSelect}
          />
        </div>

        {/* Sustainability Tab */}
        <div className="w-full flex-shrink-0 px-4 py-6">
          <MobileSustainabilityAnalyzer 
            weddingId={weddingId}
            isOffline={isOffline}
            onAnalysisComplete={onRecommendationSelect}
          />
        </div>
      </div>

      {/* Touch-Optimized Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-pb">
        <div className="flex space-x-3">
          <button
            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-blue-600"
            onClick={() => {
              // Main action based on current tab
              const actions = ['Search', 'Generate', 'Plan', 'Analyze'];
              console.log(`${actions[currentTab]} action triggered`);
            }}
          >
            {['🔍 Search', '🎨 Generate', '💐 Plan', '🌱 Analyze'][currentTab]}
          </button>
          <button
            className="px-4 py-3 border border-gray-300 rounded-lg min-h-[48px] touch-manipulation active:bg-gray-50"
            onClick={() => {
              // Share or save functionality
              if (navigator.share) {
                navigator.share({
                  title: 'WedSync Florist AI',
                  text: 'Check out these AI-powered florist tools!',
                  url: window.location.href
                });
              }
            }}
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Mobile Color Picker with Touch Optimization
```typescript
// File: /src/components/mobile/MobileColorPicker.tsx
import { useState, useRef, useEffect } from 'react';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useTouch } from '@/hooks/useTouch';

interface MobileColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  showHistory?: boolean;
}

export function MobileColorPicker({ 
  value = '#FF69B4', 
  onChange, 
  disabled = false,
  showHistory = true 
}: MobileColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  
  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Pinch-to-zoom for precise color selection
  const { scale, centerX, centerY } = usePinchZoom({
    ref: pickerRef,
    minScale: 1,
    maxScale: 3,
    disabled
  });

  // Touch handling for color picker canvas
  const { touchEvents } = useTouch({
    onTouchMove: (e) => {
      if (isOpen && canvasRef.current) {
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Convert touch position to color values
        const newSaturation = Math.min(100, Math.max(0, (x / rect.width) * 100));
        const newLightness = Math.min(100, Math.max(0, 100 - (y / rect.height) * 100));
        
        setSaturation(newSaturation);
        setLightness(newLightness);
        
        const newColor = hslToHex(hue, newSaturation, newLightness);
        onChange(newColor);
        
        // Haptic feedback for color selection
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
      }
    },
    onTouchEnd: () => {
      // Add to history when selection is complete
      if (!colorHistory.includes(value)) {
        setColorHistory(prev => [value, ...prev.slice(0, 9)]); // Keep last 10 colors
      }
    }
  });

  // Update HSL values when value prop changes
  useEffect(() => {
    const hsl = hexToHsl(value);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  }, [value]);

  // Draw color picker canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width = 300;
      const height = canvas.height = 200;

      // Create saturation/lightness gradient
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const sat = (x / width) * 100;
          const light = 100 - (y / height) * 100;
          const color = `hsl(${hue}, ${sat}%, ${light}%)`;
          
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw current selection indicator
      const currentX = (saturation / 100) * width;
      const currentY = ((100 - lightness) / 100) * height;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }, [isOpen, hue, saturation, lightness]);

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r: h = ((g - b) / diff) + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  return (
    <div className="mobile-color-picker">
      {/* Color Preview Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-12 rounded-lg border-2 border-gray-300 touch-manipulation active:scale-95 transition-transform"
        style={{ backgroundColor: value }}
        aria-label={`Selected color: ${value}`}
      >
        <span className="sr-only">Color: {value}</span>
      </button>

      {/* Mobile Color Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose Color</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Hue Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => {
                  const newHue = parseInt(e.target.value);
                  setHue(newHue);
                  onChange(hslToHex(newHue, saturation, lightness));
                }}
                className="w-full h-8 rounded-lg appearance-none touch-manipulation"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                    hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                    hsl(360, 100%, 50%))`
                }}
              />
            </div>

            {/* Color Canvas */}
            <div 
              ref={pickerRef}
              className="mb-4 border rounded-lg overflow-hidden"
              style={{ 
                transform: `scale(${scale}) translate(${centerX}px, ${centerY}px)`,
                transformOrigin: 'center'
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-48 cursor-crosshair"
                {...touchEvents}
              />
            </div>

            {/* Current Color Display */}
            <div className="flex items-center mb-4">
              <div
                className="w-12 h-12 rounded-lg border mr-3"
                style={{ backgroundColor: value }}
              />
              <div>
                <div className="font-mono text-sm">{value}</div>
                <div className="text-xs text-gray-500">
                  HSL({hue}, {saturation}%, {lightness}%)
                </div>
              </div>
            </div>

            {/* Color History */}
            {showHistory && colorHistory.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Recent Colors</label>
                <div className="flex flex-wrap gap-2">
                  {colorHistory.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onChange(color);
                        setIsOpen(false);
                      }}
                      className="w-8 h-8 rounded border touch-manipulation active:scale-95 transition-transform"
                      style={{ backgroundColor: color }}
                      aria-label={`Recent color: ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium min-h-[48px] touch-manipulation active:bg-blue-600"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. PWA Service Worker for Offline Florist Tools
```typescript
// File: /public/sw.js
const CACHE_NAME = 'wedsync-florist-v1';
const FLORIST_CACHE = 'florist-data-v1';

// Critical florist resources to cache
const STATIC_RESOURCES = [
  '/dashboard/florist/intelligence',
  '/api/florist/offline-data',
  '/icons/florist-192.png',
  '/icons/florist-512.png'
];

// Flower data and color palettes for offline use
const FLORIST_DATA_URLS = [
  '/api/florist/flowers/common',
  '/api/florist/colors/basic-palettes',
  '/api/florist/templates/arrangements'
];

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Cache essential florist data
      caches.open(FLORIST_CACHE).then(cache => {
        return cache.addAll(FLORIST_DATA_URLS);
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== FLORIST_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle florist API requests
  if (url.pathname.startsWith('/api/florist/')) {
    event.respondWith(handleFloristAPI(request));
    return;
  }

  // Handle static resources
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(handleStaticResource(request));
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

async function handleFloristAPI(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for real-time data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(FLORIST_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fallback to cache for offline functionality
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Provide offline fallback data
    if (url.pathname.includes('/search')) {
      return new Response(JSON.stringify({
        flowers: await getOfflineFlowerData(),
        offline: true,
        message: 'Showing cached flower data - connect to internet for full results'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname.includes('/palette')) {
      return new Response(JSON.stringify({
        palette: await getOfflineColorPalette(),
        offline: true,
        message: 'Basic color palette generated offline'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generic offline response
    return new Response(JSON.stringify({
      error: 'Offline - feature not available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaticResource(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Return offline page for document requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

async function getOfflineFlowerData() {
  // Basic flower data for offline use
  return [
    {
      id: 'offline-1',
      common_name: 'Roses',
      scientific_name: 'Rosa spp.',
      colors: ['#FF69B4', '#FFFFFF', '#FF0000'],
      seasonal_score: 0.8,
      wedding_uses: ['bouquet', 'centerpiece', 'ceremony'],
      offline: true
    },
    {
      id: 'offline-2', 
      common_name: "Baby's Breath",
      scientific_name: 'Gypsophila paniculata',
      colors: ['#FFFFFF', '#F8F8FF'],
      seasonal_score: 0.9,
      wedding_uses: ['bouquet', 'centerpiece'],
      offline: true
    },
    {
      id: 'offline-3',
      common_name: 'Eucalyptus',
      scientific_name: 'Eucalyptus spp.',
      colors: ['#228B22', '#90EE90'],
      seasonal_score: 0.7,
      wedding_uses: ['bouquet', 'ceremony', 'centerpiece'],
      offline: true
    }
  ];
}

async function getOfflineColorPalette() {
  // Basic color theory palette
  return {
    primary_colors: [
      { hex: '#FF69B4', name: 'Hot Pink', description: 'Classic wedding pink' },
      { hex: '#FFFFFF', name: 'White', description: 'Pure wedding white' }
    ],
    accent_colors: [
      { hex: '#32CD32', name: 'Lime Green', description: 'Fresh accent color' }
    ],
    neutral_colors: [
      { hex: '#F5F5F5', name: 'White Smoke', description: 'Soft neutral' }
    ],
    palette_name: 'Classic Wedding (Offline)',
    offline: true
  };
}

// Handle background sync for when connection returns
self.addEventListener('sync', event => {
  if (event.tag === 'florist-data-sync') {
    event.waitUntil(syncFloristData());
  }
});

async function syncFloristData() {
  try {
    // Sync any queued florist data when back online
    const cache = await caches.open(FLORIST_CACHE);
    const keys = await cache.keys();
    
    for (const request of keys) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log('Sync failed for:', request.url);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data.type === 'PRELOAD_FLORIST_DATA') {
    preloadFloristData(event.data.data);
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function preloadFloristData(data) {
  const cache = await caches.open(FLORIST_CACHE);
  
  // Preload specific florist data based on user context
  const preloadUrls = [
    `/api/florist/flowers/season/${data.season}`,
    `/api/florist/wedding/${data.weddingId}/recommendations`
  ].filter(Boolean);
  
  for (const url of preloadUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.log('Preload failed for:', url);
    }
  }
}
```

#### 4. Database Optimization for Florist Queries
```sql
-- File: /supabase/migrations/YYYYMMDDHHMMSS_florist_performance_optimization.sql

-- =====================================================
-- FLORIST INTELLIGENCE PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Advanced indexing strategy for complex florist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_composite_search 
ON flower_varieties (sustainability_score DESC, seasonal_score DESC) 
WHERE sustainability_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_color_matches_advanced 
ON flower_color_matches (color_hex, match_accuracy DESC, flower_id) 
WHERE match_accuracy > 0.5;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_pricing_region_seasonal 
ON flower_pricing (region, month, availability_score DESC, base_price_per_stem ASC);

-- Partial indexes for wedding-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_bouquet 
ON flower_varieties (sustainability_score DESC) 
WHERE (wedding_uses->>'bouquet')::boolean = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_centerpiece 
ON flower_varieties (sustainability_score DESC) 
WHERE (wedding_uses->>'centerpiece')::boolean = true;

-- GIN indexes for JSONB columns with common search patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_seasonality_gin 
ON flower_varieties USING GIN ((seasonality->'peak'), (seasonality->'available'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flower_varieties_characteristics_gin 
ON flower_varieties USING GIN (characteristics);

-- Specialized index for color similarity searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_color_matches_similarity 
ON flower_color_matches (flower_id, match_accuracy) 
WHERE match_accuracy > 0.7;

-- Covering index for common florist search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_florist_search_covering 
ON flower_varieties (common_name, sustainability_score, seasonal_score) 
INCLUDE (scientific_name, wedding_uses, allergen_info);

-- Performance monitoring function
CREATE OR REPLACE FUNCTION analyze_florist_query_performance()
RETURNS TABLE (
  query_type TEXT,
  avg_execution_time NUMERIC,
  index_usage TEXT,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'flower_search'::TEXT as query_type,
    AVG(total_time)::NUMERIC as avg_execution_time,
    'Multiple indexes used'::TEXT as index_usage,
    'Consider partitioning by region for large datasets'::TEXT as recommendations
  FROM pg_stat_statements 
  WHERE query LIKE '%flower_varieties%' 
    AND query LIKE '%sustainability_score%';
END;
$$ LANGUAGE plpgsql;

-- Automated statistics update for florist tables
CREATE OR REPLACE FUNCTION update_florist_table_stats()
RETURNS VOID AS $$
BEGIN
  ANALYZE flower_varieties;
  ANALYZE flower_color_matches;
  ANALYZE flower_pricing;
  ANALYZE flower_sustainability_data;
  ANALYZE arrangement_templates;
  ANALYZE wedding_floral_plans;
END;
$$ LANGUAGE plpgsql;

-- Schedule statistics updates during low-traffic hours
SELECT cron.schedule('update-florist-stats', '0 2 * * *', 'SELECT update_florist_table_stats();');

-- Materialized view for common florist aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS florist_summary_stats AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_flowers,
  AVG(sustainability_score) as avg_sustainability,
  COUNT(*) FILTER (WHERE (wedding_uses->>'bouquet')::boolean = true) as bouquet_suitable,
  COUNT(*) FILTER (WHERE (wedding_uses->>'centerpiece')::boolean = true) as centerpiece_suitable,
  AVG(seasonal_score) as avg_seasonal_score
FROM flower_varieties 
WHERE created_at >= NOW() - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX ON florist_summary_stats (month);

-- Auto-refresh materialized view
CREATE OR REPLACE FUNCTION refresh_florist_summary_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY florist_summary_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily refresh of summary stats
SELECT cron.schedule('refresh-florist-summary', '0 3 * * *', 'SELECT refresh_florist_summary_stats();');

-- Query plan optimization hints for complex florist searches
CREATE OR REPLACE FUNCTION optimize_florist_search_query(
  p_colors TEXT[],
  p_sustainability_min NUMERIC,
  p_wedding_uses TEXT[],
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF flower_varieties AS $$
DECLARE
  query_sql TEXT;
BEGIN
  -- Build optimized query based on parameters
  query_sql := 'SELECT DISTINCT f.* FROM flower_varieties f ';
  
  -- Join color matches only if colors specified
  IF p_colors IS NOT NULL AND array_length(p_colors, 1) > 0 THEN
    query_sql := query_sql || '
      INNER JOIN flower_color_matches fcm ON f.id = fcm.flower_id 
      AND fcm.color_hex = ANY($1) 
      AND fcm.match_accuracy > 0.6 ';
  END IF;
  
  query_sql := query_sql || 'WHERE 1=1 ';
  
  -- Add sustainability filter if specified
  IF p_sustainability_min IS NOT NULL THEN
    query_sql := query_sql || 'AND f.sustainability_score >= $2 ';
  END IF;
  
  -- Add wedding uses filter if specified
  IF p_wedding_uses IS NOT NULL AND array_length(p_wedding_uses, 1) > 0 THEN
    query_sql := query_sql || 'AND f.wedding_uses ?| $3 ';
  END IF;
  
  -- Order by composite score and limit results
  query_sql := query_sql || '
    ORDER BY 
      COALESCE(f.sustainability_score, 0.5) * 0.4 + 
      COALESCE(f.seasonal_score, 0.5) * 0.6 DESC,
      f.common_name ASC
    LIMIT $4';
  
  -- Execute optimized query
  RETURN QUERY EXECUTE query_sql 
    USING p_colors, p_sustainability_min, p_wedding_uses, p_limit;
END;
$$ LANGUAGE plpgsql;

-- Connection pooling optimization for high-traffic florist queries
-- (This would be configured in the application, not SQL)
```

### DELIVERABLES CHECKLIST
- [ ] Mobile-optimized florist intelligence interface with touch navigation
- [ ] PWA service worker for offline florist functionality  
- [ ] Mobile color picker with pinch-to-zoom and touch optimization
- [ ] Touch-optimized flower search with swipe navigation
- [ ] Database performance optimizations with specialized indexes
- [ ] Redis caching implementation for AI responses and color data
- [ ] Offline flower data and basic color palette generation
- [ ] Mobile-responsive design working on 375px screens
- [ ] Touch interface with proper hit targets (48px minimum)
- [ ] Performance monitoring and query optimization functions

### URGENT COMPLETION CRITERIA
**This task is INCOMPLETE until:**
1. Mobile interface loads and functions properly on iPhone SE (375px width)
2. PWA service worker successfully caches florist data for offline use
3. Touch interactions work correctly (color picker, swipe navigation, pinch-zoom)
4. Database queries optimized with proper indexing (<50ms query times)
5. Redis caching operational (significant performance improvement on cached requests)
6. Offline functionality demonstrates graceful degradation
7. All mobile performance metrics met (<2s load time, <500KB initial payload)
8. Evidence of reality provided (mobile screenshots, performance metrics, cache tests)