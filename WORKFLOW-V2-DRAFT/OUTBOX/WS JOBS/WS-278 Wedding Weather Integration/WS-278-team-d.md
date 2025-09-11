# TEAM D - ROUND 1: WS-278 - Wedding Weather Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build mobile-optimized weather features for WedMe platform and PWA functionality
**FEATURE ID:** WS-278 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile weather monitoring for couples and real-time weather alerts

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedme/weather/
cat $WS_ROOT/wedsync/src/components/wedme/weather/MobileWeatherWidget.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedme-weather
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

// Query mobile and WedMe platform patterns
await mcp__serena__search_for_pattern("wedme mobile pwa offline weather widget");
await mcp__serena__find_symbol("MobileWidget PWAManager OfflineSync", "", true);
await mcp__serena__get_symbols_overview("src/components/wedme/");
```

### B. MOBILE & PWA PATTERNS (MANDATORY FOR ALL MOBILE WORK)
```typescript
// CRITICAL: Load mobile and PWA patterns
await mcp__serena__search_for_pattern("responsive mobile touch pwa service-worker");
await mcp__serena__find_referencing_symbols("useMediaQuery usePWA useOffline");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/pwa/pwa-manager.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile weather features
# Use Ref MCP to search for:
# - "React Native weather components mobile"
# - "PWA weather widget offline functionality"
# - "Mobile weather notifications push alerts"
# - "Touch-friendly weather interface design"
# - "Service worker weather data caching"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE WEATHER PLATFORM

### Use Sequential Thinking MCP for Mobile Weather Strategy
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe weather platform needs: Mobile-first weather dashboard for couples, touch-optimized weather widgets, offline weather data access, push notifications for weather alerts, location-based weather for wedding venues, integration with main WedSync supplier platform.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile UX considerations: Couples primarily use phones for wedding planning, weather info needs quick access during vendor meetings, outdoor ceremony planning requires real-time updates, touch interactions for weather settings, thumb-friendly navigation, clear visual weather indicators.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "PWA requirements: Offline weather data for venues with poor connectivity, service worker caching of recent forecasts, push notification support for weather alerts, app-like weather experience, home screen installation with weather quick access, background sync for weather updates.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation approach: Create mobile weather components with touch optimization, implement PWA weather caching, build push notification system, design responsive weather layouts, integrate with supplier weather data, add offline weather functionality.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track mobile weather development and PWA features
2. **mobile-pwa-specialist** - Build responsive weather components and PWA functionality
3. **ui-ux-optimizer** - Design touch-friendly weather interfaces and interactions
4. **offline-sync-architect** - Implement offline weather data and service worker caching
5. **test-automation-architect** - Mobile weather testing and PWA validation
6. **documentation-chronicler** - Mobile weather documentation and user guides

## 🎯 TEAM D SPECIALIZATION: MOBILE/WEDME PLATFORM FOCUS

**Core Mobile Components to Build:**

1. **MobileWeatherWidget** - Quick weather overview for couples
2. **WeatherDashboardMobile** - Full mobile weather interface
3. **TouchWeatherControls** - Touch-optimized weather settings
4. **OfflineWeatherManager** - Offline weather data management
5. **WeatherPushNotifications** - Mobile push notification system
6. **WedMeWeatherIntegration** - Integration with main supplier platform

### Key Mobile Features:
- Touch-optimized weather interface with large tap targets
- Swipe gestures for weather forecast navigation
- Offline weather data caching for poor connectivity areas
- Push notifications for critical weather alerts
- Location-based weather for wedding venues
- Quick weather access from home screen (PWA)

## 📱 MOBILE-FIRST DESIGN REQUIREMENTS

### Responsive Weather Components:
```typescript
// Mobile-first weather widget with touch optimization
const MobileWeatherWidget = () => {
  const { weatherData, isLoading } = useWeatherData();
  const { isOnline } = useNetworkStatus();
  
  return (
    <div className="w-full min-h-[120px] touch-manipulation">
      {/* Weather display optimized for mobile viewing */}
      <TouchableWeatherCard 
        data={weatherData}
        offline={!isOnline}
        onTap={handleWeatherTap}
        minTouchTarget="44px"
      />
    </div>
  );
};
```

### PWA Weather Functionality:
```typescript
// Service worker for weather data caching
class WeatherServiceWorker {
  static async cacheWeatherData(weatherData: WeatherData): Promise<void> {
    // Cache weather data for offline access
    await caches.open('weather-cache-v1')
      .then(cache => cache.put('/api/weather/current', 
        new Response(JSON.stringify(weatherData))
      ));
  }
  
  static async getOfflineWeatherData(): Promise<WeatherData | null> {
    // Retrieve cached weather data when offline
    return caches.open('weather-cache-v1')
      .then(cache => cache.match('/api/weather/current'))
      .then(response => response?.json());
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Mobile weather widget with touch optimization
- [ ] Responsive weather dashboard for WedMe platform
- [ ] Offline weather data caching with service worker
- [ ] Push notification system for weather alerts
- [ ] Touch-friendly weather settings and controls
- [ ] PWA weather functionality with home screen access
- [ ] Integration with supplier weather system
- [ ] Mobile weather testing on multiple devices
- [ ] Accessibility compliance for mobile weather interface
- [ ] Performance optimization for mobile networks

## 🔄 PWA INTEGRATION REQUIREMENTS

### Service Worker Weather Caching:
```typescript
// Weather data caching strategy
const WEATHER_CACHE_NAME = 'wedding-weather-v1';
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/weather/')) {
    event.respondWith(
      caches.open(WEATHER_CACHE_NAME)
        .then(cache => {
          return fetch(event.request)
            .then(response => {
              // Cache fresh weather data
              cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => {
              // Return cached data if network fails
              return cache.match(event.request);
            });
        })
    );
  }
});
```

### Push Notification Integration:
```typescript
// Weather alert push notifications
class WeatherPushNotificationService {
  static async requestPermission(): Promise<boolean> {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  static async sendWeatherAlert(alert: WeatherAlert): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(alert.title, {
        body: alert.message,
        icon: '/icons/weather-alert.png',
        badge: '/icons/badge.png',
        data: { weddingId: alert.weddingId, type: 'weather' }
      });
    }
  }
}
```

## 📱 MOBILE TESTING REQUIREMENTS

### Device Testing Matrix:
- iPhone SE (375px) - Minimum width support
- iPhone 12/13/14 (390px) - Standard mobile
- Samsung Galaxy (360px) - Android standard
- iPad Mini (768px) - Tablet breakpoint
- Large tablets (1024px+) - Desktop-like experience

### Touch Interaction Testing:
```typescript
// Touch target validation
const validateTouchTargets = () => {
  const touchElements = document.querySelectorAll('[data-touch-target]');
  
  touchElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // Minimum 44px touch target
    
    if (rect.width < minSize || rect.height < minSize) {
      console.warn(`Touch target too small: ${rect.width}x${rect.height}`);
    }
  });
};
```

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/wedme/weather/
- PWA: $WS_ROOT/wedsync/src/lib/pwa/weather/
- Service Worker: $WS_ROOT/wedsync/public/sw-weather.js
- Types: $WS_ROOT/wedsync/src/types/wedme-weather.ts
- Tests: $WS_ROOT/wedsync/__tests__/mobile/weather/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## ⚠️ CRITICAL WARNINGS
- Test on actual mobile devices, not just browser dev tools
- Ensure minimum 44px touch targets for all interactive elements
- Validate offline functionality works without network
- Test push notifications on both iOS and Android
- Optimize for slow mobile networks (3G scenarios)
- Validate weather data caching doesn't exceed storage limits

## 🏁 COMPLETION CHECKLIST
- [ ] Mobile weather components built and responsive
- [ ] Touch optimization implemented and tested
- [ ] Offline weather functionality working
- [ ] Push notifications for weather alerts operational
- [ ] PWA weather features functional
- [ ] Mobile device testing completed
- [ ] Performance optimized for mobile networks
- [ ] Accessibility compliance verified
- [ ] Integration with supplier weather system complete
- [ ] Evidence package with mobile screenshots

---

**EXECUTE IMMEDIATELY - Build the mobile weather experience that couples will love!**