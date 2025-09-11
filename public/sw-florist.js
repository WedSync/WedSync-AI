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