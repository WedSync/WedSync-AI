// WedSync Backup Monitor Service Worker
// Specialized service worker for backup status caching and offline functionality

const CACHE_NAME = 'wedsync-backup-status-v1'
const BACKUP_API_CACHE = 'wedsync-backup-api-v1'
const OFFLINE_CACHE = 'wedsync-offline-v1'

// Critical backup endpoints to cache
const BACKUP_ENDPOINTS = [
  '/api/backups/status',
  '/api/backups/health',
  '/api/backups/current',
  '/api/backups/history',
  '/api/backups/metrics'
]

// Static assets for offline backup monitoring
const STATIC_ASSETS = [
  '/admin/backup',
  '/admin/backup/mobile',
  '/components/admin/backup/mobile/BackupStatusWidget.tsx',
  '/components/admin/backup/ResponsiveBackupDashboard.tsx'
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[Backup SW] Installing backup monitor service worker')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[Backup SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS.filter(asset => asset.startsWith('/')))
      }),
      
      // Initialize backup API cache
      caches.open(BACKUP_API_CACHE).then((cache) => {
        console.log('[Backup SW] Initialized backup API cache')
        return cache
      }),
      
      // Initialize offline cache
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log('[Backup SW] Initialized offline cache')
        return cache
      })
    ]).then(() => {
      console.log('[Backup SW] Installation complete - skipping waiting')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Backup SW] Activating backup monitor service worker')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old backup monitor caches
          if (cacheName.startsWith('wedsync-backup-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== BACKUP_API_CACHE &&
              cacheName !== OFFLINE_CACHE) {
            console.log('[Backup SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('[Backup SW] Activation complete - claiming clients')
      return self.clients.claim()
    })
  )
})

// Fetch event - handle backup API requests with intelligent caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Handle backup API requests
  if (BACKUP_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(handleBackupApiRequest(event.request))
    return
  }
  
  // Handle static asset requests
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(handleStaticAssetRequest(event.request))
    return
  }
  
  // Handle admin backup page requests
  if (url.pathname.startsWith('/admin/backup')) {
    event.respondWith(handleBackupPageRequest(event.request))
    return
  }
})

// Handle backup API requests with cache-first strategy and intelligent updates
async function handleBackupApiRequest(request) {
  const url = new URL(request.url)
  const cache = await caches.open(BACKUP_API_CACHE)
  const cachedResponse = await cache.match(request)
  
  try {
    // Always try network first for fresh data
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Clone response for caching
      const responseClone = networkResponse.clone()
      
      // Add cache timestamp to response headers
      const enhancedResponse = new Response(await responseClone.arrayBuffer(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'cache-timestamp': new Date().toISOString(),
          'cached-by': 'backup-monitor-sw'
        }
      })
      
      // Cache the enhanced response
      await cache.put(request, enhancedResponse.clone())
      
      console.log('[Backup SW] Cached fresh backup data:', url.pathname)
      
      // Notify clients of data update
      notifyClientsOfUpdate('backup-data-updated', {
        endpoint: url.pathname,
        timestamp: new Date().toISOString()
      })
      
      return enhancedResponse
    } else {
      throw new Error(`Network response not ok: ${networkResponse.status}`)
    }
  } catch (networkError) {
    console.log('[Backup SW] Network failed, serving cached backup data:', networkError.message)
    
    if (cachedResponse) {
      // Add offline indicator to cached response
      const cachedData = await cachedResponse.json()
      const offlineResponse = new Response(JSON.stringify({
        ...cachedData,
        isOfflineData: true,
        cacheTimestamp: cachedResponse.headers.get('cache-timestamp') || new Date().toISOString(),
        offlineNotice: 'This data was cached and may be outdated'
      }), {
        status: 200,
        statusText: 'OK (Cached)',
        headers: {
          'Content-Type': 'application/json',
          'cache-timestamp': cachedResponse.headers.get('cache-timestamp'),
          'offline-data': 'true'
        }
      })
      
      // Notify clients that offline data is being served
      notifyClientsOfUpdate('serving-offline-data', {
        endpoint: url.pathname,
        cacheTimestamp: cachedResponse.headers.get('cache-timestamp')
      })
      
      return offlineResponse
    } else {
      // No cached data available
      return new Response(JSON.stringify({
        error: 'No backup data available offline',
        message: 'Unable to retrieve backup status. Please check your connection.',
        isOfflineError: true
      }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  }
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[Backup SW] Failed to fetch static asset:', error.message)
    return new Response('Asset not available offline', { status: 404 })
  }
}

// Handle backup page requests
async function handleBackupPageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      return networkResponse
    }
    throw new Error('Network response not ok')
  } catch (error) {
    // Serve offline backup page
    const cache = await caches.open(OFFLINE_CACHE)
    const offlinePage = await cache.match('/admin/backup')
    
    if (offlinePage) {
      return offlinePage
    }
    
    // Generate minimal offline backup interface
    const offlineHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>WedSync Backup - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .offline-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 4px; text-align: center; margin-bottom: 20px; }
            .status-card { border: 1px solid #e5e5e5; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
            .button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="offline-badge">OFFLINE MODE</div>
            <h1>Backup System Status</h1>
            <div class="status-card">
              <h3>Connection Required</h3>
              <p>Unable to load current backup status while offline. Cached data may be available in the browser.</p>
            </div>
            <div class="status-card">
              <h3>What you can do:</h3>
              <ul>
                <li>Check your internet connection</li>
                <li>Wait for automatic reconnection</li>
                <li>Refresh this page when back online</li>
                <li>View any cached backup status data</li>
              </ul>
            </div>
            <button class="button" onclick="location.reload()">Retry Connection</button>
          </div>
          <script>
            // Auto-reload when back online
            window.addEventListener('online', () => {
              console.log('Connection restored, reloading...')
              setTimeout(() => location.reload(), 1000)
            })
          </script>
        </body>
      </html>
    `
    
    return new Response(offlineHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  }
}

// Notify clients of updates
function notifyClientsOfUpdate(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'backup-sw-message',
        subType: type,
        data: data,
        timestamp: new Date().toISOString()
      })
    })
  })
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'force-cache-update':
      handleForceCacheUpdate(data.endpoint)
      break
      
    case 'clear-backup-cache':
      handleClearBackupCache()
      break
      
    case 'get-cache-status':
      handleGetCacheStatus(event.ports[0])
      break
      
    default:
      console.log('[Backup SW] Unknown message type:', type)
  }
})

// Force cache update for specific endpoint
async function handleForceCacheUpdate(endpoint) {
  try {
    const cache = await caches.open(BACKUP_API_CACHE)
    await cache.delete(endpoint)
    
    // Fetch fresh data
    const response = await fetch(endpoint)
    if (response.ok) {
      await cache.put(endpoint, response)
      console.log('[Backup SW] Force updated cache for:', endpoint)
      
      notifyClientsOfUpdate('cache-force-updated', { endpoint })
    }
  } catch (error) {
    console.error('[Backup SW] Failed to force update cache:', error)
  }
}

// Clear all backup caches
async function handleClearBackupCache() {
  try {
    await Promise.all([
      caches.delete(BACKUP_API_CACHE),
      caches.delete(OFFLINE_CACHE)
    ])
    
    // Recreate caches
    await Promise.all([
      caches.open(BACKUP_API_CACHE),
      caches.open(OFFLINE_CACHE)
    ])
    
    console.log('[Backup SW] Backup caches cleared and recreated')
    notifyClientsOfUpdate('cache-cleared')
  } catch (error) {
    console.error('[Backup SW] Failed to clear backup cache:', error)
  }
}

// Get cache status information
async function handleGetCacheStatus(port) {
  try {
    const apiCache = await caches.open(BACKUP_API_CACHE)
    const staticCache = await caches.open(CACHE_NAME)
    const offlineCache = await caches.open(OFFLINE_CACHE)
    
    const apiKeys = await apiCache.keys()
    const staticKeys = await staticCache.keys()
    const offlineKeys = await offlineCache.keys()
    
    const status = {
      apiCacheSize: apiKeys.length,
      staticCacheSize: staticKeys.length,
      offlineCacheSize: offlineKeys.length,
      cachedEndpoints: apiKeys.map(req => req.url),
      lastUpdate: new Date().toISOString()
    }
    
    port.postMessage(status)
  } catch (error) {
    console.error('[Backup SW] Failed to get cache status:', error)
    port.postMessage({ error: 'Failed to get cache status' })
  }
}

// Background sync for queued backup operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'backup-status-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

// Handle background sync
async function handleBackgroundSync() {
  console.log('[Backup SW] Performing background sync for backup status')
  
  try {
    // Sync all backup endpoints
    const cache = await caches.open(BACKUP_API_CACHE)
    
    for (const endpoint of BACKUP_ENDPOINTS) {
      try {
        const response = await fetch(endpoint)
        if (response.ok) {
          await cache.put(endpoint, response.clone())
          console.log('[Backup SW] Background synced:', endpoint)
        }
      } catch (error) {
        console.log('[Backup SW] Failed to background sync:', endpoint, error.message)
      }
    }
    
    notifyClientsOfUpdate('background-sync-complete')
  } catch (error) {
    console.error('[Backup SW] Background sync failed:', error)
  }
}

// Push event for backup notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    if (data.type === 'backup-alert') {
      event.waitUntil(handleBackupNotification(data))
    }
  }
})

// Handle backup-related push notifications
async function handleBackupNotification(data) {
  const { title, message, priority, backupId } = data
  
  const notificationOptions = {
    body: message,
    icon: '/icons/backup-notification-192x192.png',
    badge: '/icons/backup-badge-72x72.png',
    tag: `backup-${backupId || 'general'}`,
    renotify: true,
    requireInteraction: priority === 'high' || priority === 'emergency',
    actions: [
      {
        action: 'view-backup',
        title: 'View Backup Status'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      type: 'backup-notification',
      backupId: backupId,
      priority: priority,
      timestamp: new Date().toISOString()
    }
  }
  
  // Add urgency for critical notifications
  if (priority === 'emergency') {
    notificationOptions.vibrate = [200, 100, 200, 100, 200]
    notificationOptions.silent = false
  } else if (priority === 'high') {
    notificationOptions.vibrate = [100, 50, 100]
  }
  
  await self.registration.showNotification(title, notificationOptions)
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const { action } = event
  const { type, backupId } = event.notification.data || {}
  
  if (type === 'backup-notification') {
    if (action === 'view-backup') {
      event.waitUntil(
        self.clients.openWindow(`/admin/backup${backupId ? `?backup=${backupId}` : ''}`)
      )
    }
  }
})

console.log('[Backup SW] Backup Monitor Service Worker loaded successfully')