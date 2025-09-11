/**
 * WS-243 Enhanced Chat Service Worker
 * Team D - PWA Optimization for Mobile Chat
 * Enhanced from WS-078 Vendor Chat System
 * 
 * CORE FEATURES:
 * - Cache chat interface assets for offline access
 * - Handle offline message queuing with background sync
 * - Push notifications for chat responses
 * - Background message synchronization
 * - Wedding venue friendly (poor internet support)
 * - Mobile-optimized caching strategies
 * 
 * @version 2.0.0 (Enhanced from v1.0.0)
 * @author WedSync Team D - Mobile Chat Integration
 */

const CACHE_NAME = 'wedsync-chat-v2.0.0';
const OFFLINE_CACHE_NAME = 'wedsync-chat-offline-v2.0.0';
const CHAT_API_CACHE = 'wedsync-chat-api-v2.0.0';
const NOTIFICATION_TAG_PREFIX = 'wedsync-chat-'

// Enhanced chat resources for mobile interface
const CHAT_CACHE_RESOURCES = [
  '/chat',
  '/icons/chat-notification.png',
  '/icons/badge.png',
  '/icons/reply.png',
  '/icons/view.png',
  '/icons/chat-bubble.svg',
  '/icons/microphone.svg',
  '/icons/attachment.svg',
  '/images/chat-avatar.png',
  '/offline-chat.html'
]

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  '/api/chat/mobile',
  '/api/chat/wedding',
  '/api/chat/sync',
  '/api/weddings/',
  '/api/photos/wedding'
]

// Wedding day critical resources (always cache)
const WEDDING_DAY_ASSETS = [
  '/api/weddings/timeline/',
  '/api/weddings/vendors/',
  '/api/weddings/budget/',
  '/offline-wedding-info.html'
]

// Install event - Enhanced for mobile chat
self.addEventListener('install', (event) => {
  console.log('[Chat SW] Installing enhanced mobile chat service worker v2.0.0')
  
  event.waitUntil(
    Promise.all([
      // Cache main chat interface assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('[Chat SW] Caching enhanced chat resources')
        return cache.addAll(CHAT_CACHE_RESOURCES.filter(url => url.startsWith('/')));
      }),
      
      // Cache offline fallbacks for mobile
      caches.open(OFFLINE_CACHE_NAME).then(cache => {
        console.log('[Chat SW] Caching offline fallbacks')
        return cache.addAll([
          '/offline-chat.html',
          '/offline-wedding-info.html'
        ].filter(url => url.startsWith('/')));
      })
    ]).then(() => {
      console.log('[Chat SW] Installation complete - mobile optimizations active')
      // Skip waiting to activate immediately
      return self.skipWaiting();
    }).catch(error => {
      console.error('[Chat SW] Installation failed:', error);
    })
  )
})

// Activate event - Enhanced cleanup for mobile caches
self.addEventListener('activate', (event) => {
  console.log('[Chat SW] Activating enhanced mobile chat service worker v2.0.0')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE_NAME && 
                cacheName !== CHAT_API_CACHE &&
                cacheName.startsWith('wedsync-chat-')) {
              console.log('[Chat SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[Chat SW] Activation complete - mobile optimizations ready')
    })
  )
})

// Enhanced Fetch Event Handler - Mobile-Optimized with Fallbacks
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for most caching strategies
  if (request.method !== 'GET' && !isApiRequest(url.pathname)) {
    return handleApiRequest(event);
  }
  
  // Handle different types of requests with mobile optimization
  if (url.pathname.includes('/api/chat/') || url.pathname.includes('/api/weddings/')) {
    event.respondWith(handleApiRequest(event));
  } else if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(event));
  } else if (isChatAsset(url.pathname)) {
    event.respondWith(handleChatAsset(event));
  } else if (event.request.url.includes('/chat')) {
    event.respondWith(handleChatPage(event));
  } else {
    event.respondWith(handleGeneralRequest(event));
  }
})

// Handle Chat Asset Requests (Cache First for Performance)
async function handleChatAsset(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
      // Return cached version immediately, update in background
      fetchAndUpdateCache(event.request, cache);
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const response = await fetch(event.request);
    
    if (response.ok) {
      cache.put(event.request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[Chat SW] Failed to handle chat asset:', error);
    return await handleOfflineFallback(event.request);
  }
}

// Handle API Requests (Network First with Offline Queue)
async function handleApiRequest(event) {
  const { request } = event;
  
  // For POST requests (sending messages), handle offline queueing
  if (request.method === 'POST') {
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        // Clear any queued version of this request
        await clearQueuedRequest(request);
        return response;
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.log('[Chat SW] Queueing failed API request for background sync');
      await queueApiRequest(request);
      
      // Return a response indicating the message was queued
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: 'Message queued for sending when online'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // For GET requests, try network first, then cache
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(CHAT_API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to serve from cache
    const cache = await caches.open(CHAT_API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return await handleOfflineFallback(request);
  }
}

// Handle Chat Page Requests
async function handleChatPage(event) {
  try {
    const response = await fetch(event.request);
    return response;
  } catch (error) {
    // Serve offline chat page
    const offlineCache = await caches.open(OFFLINE_CACHE_NAME);
    const offlinePage = await offlineCache.match('/offline-chat.html');
    
    return offlinePage || new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chat Offline - WedSync</title>
          <style>
              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 400px; margin: 0 auto; text-align: center; padding: 40px 20px; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin-bottom: 30px; }
              .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 8px; }
              .status { padding: 10px; background: #ffeaa7; border-radius: 8px; margin: 20px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">💬</div>
              <h1>Chat Offline</h1>
              <p>You're currently offline, but don't worry - your messages will be sent when you reconnect.</p>
              <div class="status">
                  <p><strong>Offline Mode Active</strong><br>
                  Messages are being queued and will sync automatically when online.</p>
              </div>
              <a href="/chat" class="btn" onclick="location.reload()">Try Again</a>
          </div>
          <script>
              // Auto-refresh when online
              window.addEventListener('online', () => {
                  location.reload();
              });
          </script>
      </body>
      </html>`,
      { 
        status: 503,
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  }
}

// Handle General Requests (Stale While Revalidate)
async function handleGeneralRequest(event) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    const fetchPromise = fetch(event.request).then(response => {
      if (response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    });
    
    // Return cached response immediately if available
    if (cachedResponse) {
      event.waitUntil(fetchPromise);
      return cachedResponse;
    }
    
    // Otherwise wait for network
    return await fetchPromise;
  } catch (error) {
    console.error('[Chat SW] Failed to handle general request:', error);
    return await handleOfflineFallback(event.request);
  }
}

// Handle Offline Fallbacks
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/api/chat/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Chat is not available offline',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (url.pathname.includes('/api/weddings/')) {
    // Try to serve cached wedding data
    const cache = await caches.open(CHAT_API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Wedding data not available offline',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Default offline response
  return new Response(
    'Offline - Please check your internet connection',
    { status: 503, headers: { 'Content-Type': 'text/plain' } }
  );
}

// Utility Functions
function isChatAsset(pathname) {
  return pathname.includes('/components/mobile/chatbot/') ||
         pathname.includes('/components/wedme/') ||
         CHAT_CACHE_RESOURCES.some(asset => pathname.includes(asset));
}

function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

// Fetch and Update Cache (for stale-while-revalidate)
async function fetchAndUpdateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Silently fail - we already have cached version
    console.log('[Chat SW] Failed to update cache for:', request.url);
  }
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  let notificationData = {}
  
  if (event.data) {
    try {
      notificationData = event.data.json()
    } catch (error) {
      console.error('[SW] Error parsing push data:', error)
      notificationData = {
        title: 'New Message',
        body: 'You have a new message in WedSync Chat'
      }
    }
  }
  
  const {
    title = 'WedSync Chat',
    body = 'You have a new message',
    icon = '/icons/chat-notification.png',
    badge = '/icons/badge.png',
    tag = 'wedsync-chat-default',
    data = {},
    actions = [],
    requireInteraction = false,
    silent = false
  } = notificationData
  
  const notificationOptions = {
    body,
    icon,
    badge,
    tag: `${NOTIFICATION_TAG_PREFIX}${tag}`,
    data: {
      ...data,
      timestamp: Date.now(),
      url: data.url || '/chat'
    },
    actions: actions.map(action => ({
      action: action.action,
      title: action.title,
      icon: action.icon || '/icons/default-action.png'
    })),
    requireInteraction,
    silent,
    vibrate: silent ? [] : [200, 100, 200],
    renotify: true,
    timestamp: Date.now()
  }
  
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  const notification = event.notification
  const action = event.action
  const data = notification.data || {}
  
  notification.close()
  
  if (action) {
    // Handle action buttons
    event.waitUntil(
      handleNotificationAction(action, data)
    )
  } else {
    // Handle notification click (no action button)
    event.waitUntil(
      openChatWindow(data.url || '/chat', data)
    )
  }
})

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event)
  
  const data = event.notification.data || {}
  
  // Send message to client about dismissal
  event.waitUntil(
    sendMessageToClients({
      type: 'NOTIFICATION_CLOSED',
      data
    })
  )
})

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  const { type, payload } = event.data
  
  switch (type) {
    case 'SHOW_NOTIFICATION':
      event.waitUntil(showLocalNotification(payload))
      break
    case 'CLEAR_NOTIFICATIONS':
      event.waitUntil(clearNotifications(payload.tag))
      break
    case 'UPDATE_BADGE':
      event.waitUntil(updateBadge(payload.count))
      break
    default:
      console.log('[SW] Unknown message type:', type)
  }
})

// Enhanced Background Sync for Mobile Chat
self.addEventListener('sync', (event) => {
  console.log('[Chat SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'chat-sync' || event.tag === 'chat-message-sync') {
    console.log('[Chat SW] Background sync: chat-sync')
    event.waitUntil(syncPendingMessages());
  } else if (event.tag === 'wedding-data-sync') {
    console.log('[Chat SW] Background sync: wedding-data-sync')
    event.waitUntil(syncWeddingData());
  }
})

// Helper functions

async function handleNotificationAction(action, data) {
  console.log('[SW] Handling notification action:', action, data)
  
  switch (action) {
    case 'reply':
      await openChatWindow(`/chat?room=${data.roomId}&reply=true`, data)
      break
    case 'view':
      await openChatWindow(`/chat?room=${data.roomId}`, data)
      break
    case 'dismiss':
      // Just close notification (already closed above)
      break
    default:
      await openChatWindow(data.url || '/chat', data)
  }
  
  // Send action to clients
  await sendMessageToClients({
    type: 'NOTIFICATION_ACTION',
    data: { action, notificationData: data }
  })
}

async function openChatWindow(url, data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  
  // Check if chat window is already open
  for (const client of clients) {
    if (client.url.includes('/chat')) {
      // Focus existing window and navigate if needed
      await client.focus()
      
      if (client.url !== url) {
        await client.postMessage({
          type: 'NAVIGATE_TO',
          url
        })
      }
      
      await sendMessageToClients({
        type: 'NOTIFICATION_CLICKED',
        data
      })
      
      return
    }
  }
  
  // Open new window
  await self.clients.openWindow(url)
  
  await sendMessageToClients({
    type: 'NOTIFICATION_CLICKED',
    data
  })
}

async function showLocalNotification(payload) {
  const {
    title,
    body,
    icon = '/icons/chat-notification.png',
    badge = '/icons/badge.png',
    tag = 'local-notification',
    data = {},
    actions = []
  } = payload
  
  const options = {
    body,
    icon,
    badge,
    tag: `${NOTIFICATION_TAG_PREFIX}${tag}`,
    data: {
      ...data,
      timestamp: Date.now()
    },
    actions: actions.map(action => ({
      action: action.action,
      title: action.title,
      icon: action.icon
    })),
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  }
  
  await self.registration.showNotification(title, options)
}

async function clearNotifications(tag) {
  const notifications = await self.registration.getNotifications({
    tag: tag ? `${NOTIFICATION_TAG_PREFIX}${tag}` : undefined
  })
  
  notifications.forEach(notification => {
    notification.close()
  })
  
  console.log(`[SW] Cleared ${notifications.length} notifications`)
}

async function updateBadge(count) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
      }
    } catch (error) {
      console.error('[SW] Error updating badge:', error)
    }
  }
}

async function sendMessageToClients(message) {
  const clients = await self.clients.matchAll()
  
  clients.forEach(client => {
    client.postMessage(message)
  })
}

// Enhanced Sync Functions for Mobile Chat

async function syncPendingMessages() {
  try {
    console.log('[Chat SW] Syncing pending messages...');
    
    const db = await openDB();
    const transaction = db.transaction(['queuedRequests'], 'readwrite');
    const store = transaction.objectStore('queuedRequests');
    const queuedRequests = await store.getAll();
    
    if (queuedRequests.length === 0) {
      console.log('[Chat SW] No pending messages to sync');
      return;
    }
    
    const syncPromises = queuedRequests.map(async (queuedRequest) => {
      try {
        const response = await fetch(queuedRequest.url, {
          method: queuedRequest.method,
          headers: queuedRequest.headers,
          body: queuedRequest.body
        });
        
        if (response.ok) {
          // Remove successfully synced request
          await store.delete(queuedRequest.id);
          console.log('[Chat SW] Successfully synced message:', queuedRequest.id);
          
          // Notify clients of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'MESSAGE_SYNCED',
              requestId: queuedRequest.id,
              success: true
            });
          });
        } else {
          console.error('[Chat SW] Failed to sync message:', queuedRequest.id, response.status);
        }
        
        return { success: response.ok, id: queuedRequest.id };
      } catch (error) {
        console.error('[Chat SW] Error syncing message:', queuedRequest.id, error);
        return { success: false, id: queuedRequest.id, error };
      }
    });
    
    const results = await Promise.all(syncPromises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Chat SW] Background sync completed: ${successCount}/${results.length} messages synced`);
    
    // Notify clients of sync completion
    await sendMessageToClients({
      type: 'OFFLINE_SYNC_COMPLETE',
      data: { synced: successCount, total: results.length }
    });
    
  } catch (error) {
    console.error('[Chat SW] Background sync failed:', error);
  }
}

async function syncWeddingData() {
  try {
    console.log('[Chat SW] Syncing wedding data...');
    
    // Get list of weddings that need syncing
    const clients = await self.clients.matchAll();
    const weddingIds = new Set();
    
    // Ask clients for wedding IDs that need syncing
    clients.forEach(client => {
      client.postMessage({ type: 'REQUEST_WEDDING_IDS' });
    });
    
    // Note: In a real implementation, you'd have a better way to track
    // which weddings need syncing, possibly through IndexedDB storage
    console.log('[Chat SW] Wedding data sync request sent to clients');
    
  } catch (error) {
    console.error('[Chat SW] Wedding data sync failed:', error);
  }
}

async function syncOfflineMessages() {
  // Legacy function - redirect to new enhanced sync
  return await syncPendingMessages();
}

// Enhanced Queue Management Functions

async function queueApiRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    const db = await openDB();
    const transaction = db.transaction(['queuedRequests'], 'readwrite');
    const store = transaction.objectStore('queuedRequests');
    
    await store.add({
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...requestData
    });
    
    console.log('[Chat SW] Queued API request:', requestData.url);
    
    // Register background sync
    if (self.registration.sync) {
      await self.registration.sync.register('chat-sync');
    }
    
  } catch (error) {
    console.error('[Chat SW] Failed to queue API request:', error);
  }
}

async function clearQueuedRequest(request) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['queuedRequests'], 'readwrite');
    const store = transaction.objectStore('queuedRequests');
    const requests = await store.getAll();
    
    for (const queuedRequest of requests) {
      if (queuedRequest.url === request.url) {
        await store.delete(queuedRequest.id);
        console.log('[Chat SW] Cleared queued request:', queuedRequest.id);
      }
    }
  } catch (error) {
    console.error('[Chat SW] Failed to clear queued request:', error);
  }
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wedsync_chat_sw', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('queuedRequests')) {
        const store = db.createObjectStore('queuedRequests', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

// Legacy compatibility functions
async function getOfflineMessages() {
  // Redirect to new queue system
  try {
    const db = await openDB();
    const transaction = db.transaction(['queuedRequests'], 'readonly');
    const store = transaction.objectStore('queuedRequests');
    return await store.getAll();
  } catch (error) {
    console.error('[Chat SW] Failed to get offline messages:', error);
    return [];
  }
}

async function removeOfflineMessage(messageId) {
  // Redirect to new queue system
  try {
    const db = await openDB();
    const transaction = db.transaction(['queuedRequests'], 'readwrite');
    const store = transaction.objectStore('queuedRequests');
    await store.delete(messageId);
    console.log('[Chat SW] Removed offline message:', messageId);
  } catch (error) {
    console.error('[Chat SW] Failed to remove offline message:', error);
  }
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

// Log service worker errors
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error)
})

console.log('[Chat SW] Enhanced mobile chat service worker v2.0.0 loaded - PWA optimizations active')

// Periodic Cache Cleanup (run every 24 hours)
setInterval(async () => {
  try {
    console.log('[Chat SW] Running periodic cache cleanup...');
    
    const cache = await caches.open(CHAT_API_CACHE);
    const requests = await cache.keys();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleanedCount = 0;
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        
        if (dateHeader) {
          const responseTime = new Date(dateHeader).getTime();
          if (now - responseTime > maxAge) {
            await cache.delete(request);
            cleanedCount++;
          }
        }
      }
    }
    
    console.log(`[Chat SW] Cache cleanup completed: ${cleanedCount} expired entries removed`);
  } catch (error) {
    console.error('[Chat SW] Cache cleanup failed:', error);
  }
}, 24 * 60 * 60 * 1000);