const CACHE_NAME = 'wedsync-timeline-v1'
const TIMELINE_CACHE = 'wedsync-timeline-data-v1'

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/timeline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/timeline\/nodes/,
  /^\/api\/clients/,
  /^\/api\/auth\/user/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📋 Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('✅ Service Worker installed')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== TIMELINE_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image') {
    event.respondWith(handleStaticRequest(request))
    return
  }
})

// Handle API requests - network first, cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (!shouldCache) {
    return fetch(request)
  }

  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful GET requests
      if (request.method === 'GET') {
        const cache = await caches.open(TIMELINE_CACHE)
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('📱 Network failed, trying cache for:', request.url)
    
    // Fall back to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Add offline indicator header
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'X-Served-From': 'cache',
          'X-Offline-Mode': 'true'
        }
      })
      return response
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature is not available offline' 
      }),
      {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline-Mode': 'true'
        }
      }
    )
  }
}

// Handle static requests - cache first, network fallback
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // Return offline fallback page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html') || 
             new Response('Offline', { status: 503 })
    }
    
    throw error
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received')
  
  let notificationData = {
    title: 'WedSync',
    body: 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {}
  }

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() }
    } catch (error) {
      console.error('Failed to parse push data:', error)
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    requireInteraction: notificationData.requiresAction || false,
    actions: getNotificationActions(notificationData.data.type),
    tag: `timeline-${notificationData.data.nodeId || 'general'}`,
    renotify: true,
    vibrate: [200, 100, 200]
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  )
})

// Get notification actions based on type
function getNotificationActions(type) {
  const actions = {
    'trigger': [
      { action: 'view', title: '👀 View' },
      { action: 'snooze', title: '⏰ Snooze' }
    ],
    'reminder': [
      { action: 'view', title: '👀 View' },
      { action: 'complete', title: '✅ Complete' },
      { action: 'snooze', title: '⏰ Snooze' }
    ],
    'completion': [
      { action: 'view', title: '👀 View Details' }
    ]
  }
  
  return actions[type] || [{ action: 'view', title: '👀 View' }]
}

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification.tag)
  
  event.notification.close()
  
  const notificationData = event.notification.data
  const action = event.action
  
  // Send message to client
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If app is already open, focus it and send message
      if (clients.length > 0) {
        clients[0].focus()
        clients[0].postMessage({
          type: action ? 'notification-action' : 'notification-click',
          data: { action, notification: event.notification }
        })
        return
      }
      
      // Otherwise, open the app
      const url = notificationData.url || '/dashboard/timeline'
      return self.clients.openWindow(url)
    })
  )
})

// Background sync for timeline updates
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'timeline-sync') {
    event.waitUntil(syncTimelineData())
  }
})

// Sync timeline data in background
async function syncTimelineData() {
  try {
    console.log('🔄 Syncing timeline data in background...')
    
    // This would integrate with the timeline sync system
    const response = await fetch('/api/timeline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ background: true })
    })
    
    if (response.ok) {
      console.log('✅ Background timeline sync completed')
      
      // Notify clients of successful sync
      const clients = await self.clients.matchAll()
      clients.forEach(client => {
        client.postMessage({
          type: 'sync-complete',
          data: { success: true }
        })
      })
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error)
  }
}

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'skip-waiting':
      self.skipWaiting()
      break
      
    case 'claim-clients':
      self.clients.claim()
      break
      
    case 'sync-timeline':
      event.waitUntil(syncTimelineData())
      break
      
    case 'cache-timeline-data':
      event.waitUntil(cacheTimelineData(data))
      break
  }
})

// Cache timeline data for offline use
async function cacheTimelineData(data) {
  try {
    const cache = await caches.open(TIMELINE_CACHE)
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put('/api/timeline/nodes', response)
    console.log('📋 Timeline data cached for offline use')
  } catch (error) {
    console.error('Failed to cache timeline data:', error)
  }
}

// Log service worker lifecycle
console.log('🚀 WedSync Timeline Service Worker loaded')