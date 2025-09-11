# 02-pwa-configuration.md

# WedSync/WedMe Progressive Web App Configuration

## Overview

This document details the Progressive Web App (PWA) configuration for WedSync and WedMe, enabling app-like experiences with offline functionality, push notifications, and home screen installation - critical for wedding day reliability.

## Core PWA Requirements

### Web App Manifest

### WedSync Manifest (wedsync.app)

```json
{
  "name": "WedSync - Wedding Business Platform",
  "short_name": "WedSync",
  "description": "Manage your wedding business, clients, and workflows",
  "start_url": "/dashboard?source=pwa",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Today's Weddings",
      "short_name": "Today",
      "description": "View today's wedding schedule",
      "url": "/dashboard/today?source=pwa",
      "icons": [{ "src": "/icons/today-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Add Client",
      "short_name": "New Client",
      "description": "Add a new client",
      "url": "/clients/new?source=pwa",
      "icons": [{ "src": "/icons/add-client-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Forms",
      "short_name": "Forms",
      "description": "Manage your forms",
      "url": "/forms?source=pwa",
      "icons": [{ "src": "/icons/forms-96x96.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "360x640",
      "type": "image/png",
      "platform": "mobile"
    },
    {
      "src": "/screenshots/wedding-day-mobile.png",
      "sizes": "360x640",
      "type": "image/png",
      "platform": "mobile"
    },
    {
      "src": "/screenshots/dashboard-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "platform": "desktop"
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}

```

### WedMe Manifest (wedme.app)

```json
{
  "name": "WedMe - Your Wedding Dashboard",
  "short_name": "WedMe",
  "description": "Coordinate with all your wedding suppliers in one place",
  "start_url": "/dashboard?source=pwa",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#ec4899",
  "background_color": "#ffffff",
  "categories": ["lifestyle", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Timeline",
      "short_name": "Timeline",
      "url": "/timeline?source=pwa",
      "icons": [{ "src": "/icons/timeline-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Suppliers",
      "short_name": "Suppliers",
      "url": "/suppliers?source=pwa",
      "icons": [{ "src": "/icons/suppliers-96x96.png", "sizes": "96x96" }]
    }
  ]
}

```

## Service Worker Configuration

### Next.js PWA Setup

```jsx
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: require('./cache.config.js'),
  buildExcludes: [/middleware-manifest.json$/],
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  fallbacks: {
    document: '/offline',
    image: '/static/images/fallback.png',
    font: '/static/fonts/fallback.woff2'
  }
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  // Other Next.js config
});

```

### Cache Configuration

```jsx
// cache.config.js
module.exports = [
  {
    // Cache wedding day critical data
    urlPattern: /^https:\/\/api\.supabase\.co\/rest\/v1\/weddings.*$/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'wedding-data-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 // 24 hours
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  },
  {
    // Cache form data for offline access
    urlPattern: /^https:\/\/api\.supabase\.co\/rest\/v1\/forms.*$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'forms-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
      }
    }
  },
  {
    // Cache client data
    urlPattern: /^https:\/\/api\.supabase\.co\/rest\/v1\/clients.*$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'clients-cache',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
      }
    }
  },
  {
    // Cache static assets
    urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images-cache',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      }
    }
  },
  {
    // Cache Google Fonts
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-cache',
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }
    }
  },
  {
    // Network-only for authentication
    urlPattern: /^https:\/\/.*\/auth\/.*/,
    handler: 'NetworkOnly'
  }
];

```

## Custom Service Worker

### Advanced Service Worker Features

```jsx
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Background sync for form submissions
const bgSyncPlugin = new BackgroundSyncPlugin('form-queue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

// Handle form submissions with background sync
registerRoute(
  /\/api\/forms\/submit/,
  new NetworkFirst({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// Push notification handling
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Periodic background sync for wedding day updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'wedding-day-sync') {
    event.waitUntil(syncWeddingDayData());
  }
});

async function syncWeddingDayData() {
  const cache = await caches.open('wedding-day-cache');
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch(`/api/weddings/today?date=${today}`);
    await cache.put(`/api/weddings/today`, response);
  } catch (error) {
    console.error('Failed to sync wedding day data:', error);
  }
}

```

## Installation Prompts

### Custom Install Banner

```tsx
// components/InstallPrompt.tsx
import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show custom prompt after user has engaged
      const hasInteracted = sessionStorage.getItem('user-interacted');
      if (hasInteracted) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS detection and prompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isInstalled) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS installation instructions
      return showIOSInstallInstructions();
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      trackEvent('PWA', 'install', 'accepted');
    } else {
      trackEvent('PWA', 'install', 'dismissed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const showIOSInstallInstructions = () => {
    // Show iOS-specific install modal
    return (
      <div className="ios-install-modal">
        <h3>Install WedSync</h3>
        <p>
          Tap the share button <span className="icon-share">⎘</span>
          and select "Add to Home Screen"
        </p>
      </div>
    );
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Install WedSync</h3>
          <p className="text-sm text-gray-600">
            Quick access to your wedding day schedule
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrompt(false)}
            className="btn-secondary"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="btn-primary"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

```

## App-Like Features

### Status Bar Customization

```html
<!-- index.html -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="WedSync">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

<!-- Android -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#6366f1">

<!-- Microsoft -->
<meta name="msapplication-TileColor" content="#6366f1">
<meta name="msapplication-TileImage" content="/icons/ms-tile-144x144.png">

```

### Splash Screens

```html
<!-- iOS Splash Screens -->
<link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone-12-Pro.png">
<link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone-X.png">
<link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad.png">

```

## Push Notifications

### Server Setup

```tsx
// api/notifications/subscribe.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@wedsync.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function subscribeToPush(req: Request) {
  const { subscription, userId } = await req.json();

  // Store subscription in database
  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      subscription: subscription,
      created_at: new Date().toISOString()
    });

  return Response.json({ success: true });
}

// Send notification
export async function sendNotification(userId: string, payload: any) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  const notifications = subscriptions.map(sub =>
    webpush.sendNotification(sub.subscription, JSON.stringify(payload))
  );

  await Promise.all(notifications);
}

```

### Client Setup

```tsx
// hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (permission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });
  };

  return { permission, subscribe };
}

```

## Performance Optimizations

### App Shell Architecture

```tsx
// pages/_app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    // Prefetch critical routes
    router.prefetch('/dashboard');
    router.prefetch('/clients');
    router.prefetch('/forms');
  }, []);

  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  );
}

// App Shell with persistent navigation
function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Navigation />
      <main className="app-content">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}

```

## Testing PWA Features

### Lighthouse PWA Audit

```bash
# Run Lighthouse PWA audit
npx lighthouse https://wedsync.app --view

# Specific PWA checks
npx lighthouse https://wedsync.app --only-categories=pwa

```

### Manual Testing Checklist

- [ ]  Manifest loads correctly
- [ ]  Service worker registers
- [ ]  App installs on Android
- [ ]  App installs on iOS
- [ ]  Offline page appears when offline
- [ ]  Forms queue when offline
- [ ]  Push notifications work
- [ ]  App opens from home screen
- [ ]  Status bar appears correctly
- [ ]  Splash screen shows
- [ ]  App shortcuts work
- [ ]  Background sync functions

## Monitoring & Analytics

### PWA Metrics Tracking

```tsx
// utils/pwa-analytics.ts
export function trackPWAMetrics() {
  // Track installation
  window.addEventListener('appinstalled', () => {
    analytics.track('PWA Installed');
  });

  // Track display mode
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : 'browser';
  analytics.track('PWA Display Mode', { mode: displayMode });

  // Track offline usage
  window.addEventListener('online', () => {
    analytics.track('PWA Online');
  });

  window.addEventListener('offline', () => {
    analytics.track('PWA Offline');
  });

  // Track update available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      analytics.track('PWA Updated');
    });
  }
}

```

## Implementation Timeline

### Phase 1: Basic PWA (Week 1)

- Web app manifest
- Basic service worker
- Offline page
- Install prompts

### Phase 2: Advanced Caching (Week 2)

- Strategic caching
- Background sync
- Update notifications
- App shell

### Phase 3: Enhanced Features (Week 3)

- Push notifications
- Periodic sync
- App shortcuts
- Share target

### Phase 4: Polish (Week 4)

- iOS optimizations
- Splash screens
- Status bar theming
- Analytics integration