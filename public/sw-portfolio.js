const CACHE_NAME = 'wedsync-portfolio-cache-v1';
const PORTFOLIO_CACHE = 'wedsync-portfolio-images-v1';
const OFFLINE_CACHE = 'wedsync-offline-cache-v1';

const ESSENTIAL_ASSETS = [
  '/',
  '/portfolio',
  '/manifest.json',
  '/favicon.ico'
];

const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHED_IMAGES = 500;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

self.addEventListener('install', (event) => {
  console.log('Portfolio Service Worker: Installing...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ESSENTIAL_ASSETS);
      
      const offlineCache = await caches.open(OFFLINE_CACHE);
      await offlineCache.put('/offline', new Response('{"status":"offline","message":"Portfolio available offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }));
      
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('Portfolio Service Worker: Activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => !name.includes('wedsync-portfolio') || name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      
      await cleanupImageCache();
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') {
    return;
  }
  
  if (url.pathname.includes('/api/portfolio/upload')) {
    event.respondWith(handlePortfolioUpload(request));
    return;
  }
  
  if (url.pathname.includes('/api/portfolio/') && request.method === 'GET') {
    event.respondWith(handlePortfolioAPI(request));
    return;
  }
  
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  event.respondWith(handleStaticAssets(request));
});

async function handlePortfolioUpload(request) {
  try {
    if (!navigator.onLine) {
      const formData = await request.formData();
      const files = formData.getAll('files');
      const metadata = {
        timestamp: Date.now(),
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        })),
        supplierId: formData.get('supplierId'),
        category: formData.get('category')
      };
      
      await storeOfflineUpload(files, metadata);
      
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Upload queued for when online',
        uploadId: metadata.timestamp
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const response = await fetch(request.clone());
    
    if (response.ok) {
      const data = await response.json();
      await cacheUploadedImages(data.images);
    }
    
    return response;
  } catch (error) {
    console.error('Upload handling error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Upload failed',
      offline: !navigator.onLine
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handlePortfolioAPI(request) {
  try {
    const response = await fetch(request.clone());
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const offlineResponse = cachedResponse.clone();
      const data = await offlineResponse.json();
      data._offline = true;
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Portfolio data unavailable offline',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(PORTFOLIO_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && await isCacheValid(cachedResponse)) {
    await updateImageAccessTime(request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      const responseToCache = response.clone();
      await cache.put(request, responseToCache);
      await updateImageAccessTime(request.url);
      await enforceImageCacheLimit();
    }
    
    return response;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(null, { status: 404 });
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return await cache.match('/');
  }
}

async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    return new Response(null, { status: 404 });
  }
}

async function storeOfflineUpload(files, metadata) {
  const dbName = 'WedSyncOfflineUploads';
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('uploads')) {
        const store = db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('status', 'status');
      }
    };
  });
  
  const transaction = db.transaction(['uploads'], 'readwrite');
  const store = transaction.objectStore('uploads');
  
  const fileData = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      data: await file.arrayBuffer()
    }))
  );
  
  await store.add({
    ...metadata,
    files: fileData,
    status: 'pending',
    retryCount: 0,
    maxRetries: 3
  });
  
  scheduleOfflineSync();
}

async function cacheUploadedImages(images) {
  const cache = await caches.open(PORTFOLIO_CACHE);
  
  for (const image of images) {
    try {
      const response = await fetch(image.optimizedUrl || image.url);
      if (response.ok) {
        await cache.put(image.optimizedUrl || image.url, response);
        await updateImageAccessTime(image.optimizedUrl || image.url);
      }
    } catch (error) {
      console.warn('Failed to cache uploaded image:', error);
    }
  }
}

async function cleanupImageCache() {
  const cache = await caches.open(PORTFOLIO_CACHE);
  const keys = await cache.keys();
  const now = Date.now();
  
  const expiredKeys = [];
  
  for (const key of keys) {
    const response = await cache.match(key);
    const cachedAt = parseInt(response.headers.get('sw-cached-at') || '0');
    
    if (now - cachedAt > IMAGE_CACHE_MAX_AGE) {
      expiredKeys.push(key);
    }
  }
  
  await Promise.all(expiredKeys.map(key => cache.delete(key)));
}

async function enforceImageCacheLimit() {
  const cache = await caches.open(PORTFOLIO_CACHE);
  const keys = await cache.keys();
  
  if (keys.length <= MAX_CACHED_IMAGES) {
    return;
  }
  
  const accessTimes = await Promise.all(
    keys.map(async (key) => {
      const accessTime = await getImageAccessTime(key.url);
      return { key, accessTime };
    })
  );
  
  accessTimes.sort((a, b) => a.accessTime - b.accessTime);
  
  const keysToDelete = accessTimes
    .slice(0, keys.length - MAX_CACHED_IMAGES)
    .map(item => item.key);
  
  await Promise.all(keysToDelete.map(key => cache.delete(key)));
}

async function updateImageAccessTime(url) {
  const accessKey = `access-time:${url}`;
  localStorage.setItem(accessKey, Date.now().toString());
}

async function getImageAccessTime(url) {
  const accessKey = `access-time:${url}`;
  return parseInt(localStorage.getItem(accessKey) || '0');
}

async function isCacheValid(response) {
  const cachedAt = parseInt(response.headers.get('sw-cached-at') || '0');
  return Date.now() - cachedAt < IMAGE_CACHE_MAX_AGE;
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url.pathname) ||
         request.headers.get('accept')?.includes('image/') ||
         url.pathname.includes('/api/storage/') ||
         url.pathname.includes('/portfolio/images/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept')?.includes('text/html'));
}

function scheduleOfflineSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register('portfolio-upload-sync');
    });
  } else {
    setTimeout(processOfflineUploads, 30000);
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'portfolio-upload-sync') {
    event.waitUntil(processOfflineUploads());
  }
});

async function processOfflineUploads() {
  if (!navigator.onLine) {
    return;
  }
  
  const dbName = 'WedSyncOfflineUploads';
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  
  const transaction = db.transaction(['uploads'], 'readwrite');
  const store = transaction.objectStore('uploads');
  const index = store.index('status');
  
  const pendingUploads = await new Promise((resolve, reject) => {
    const request = index.getAll('pending');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  
  for (const upload of pendingUploads) {
    try {
      const formData = new FormData();
      formData.append('supplierId', upload.supplierId);
      formData.append('category', upload.category);
      
      for (const file of upload.files) {
        const blob = new Blob([file.data], { type: file.type });
        formData.append('files', blob, file.name);
      }
      
      const response = await fetch('/api/portfolio/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        upload.status = 'completed';
        const data = await response.json();
        await cacheUploadedImages(data.images);
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Offline upload processing failed:', error);
      upload.retryCount = (upload.retryCount || 0) + 1;
      
      if (upload.retryCount >= upload.maxRetries) {
        upload.status = 'failed';
      }
    }
    
    await store.put(upload);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PORTFOLIO_IMAGES') {
    event.waitUntil(cachePortfolioImages(event.data.images));
  }
  
  if (event.data && event.data.type === 'PRELOAD_PRESENTATION') {
    event.waitUntil(preloadPresentationAssets(event.data.images));
  }
  
  if (event.data && event.data.type === 'CLEAR_PORTFOLIO_CACHE') {
    event.waitUntil(clearPortfolioCache());
  }
});

async function cachePortfolioImages(imageUrls) {
  const cache = await caches.open(PORTFOLIO_CACHE);
  
  await Promise.all(
    imageUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          await updateImageAccessTime(url);
        }
      } catch (error) {
        console.warn('Failed to cache portfolio image:', url, error);
      }
    })
  );
}

async function preloadPresentationAssets(images) {
  const cache = await caches.open(PORTFOLIO_CACHE);
  const priorityImages = images.slice(0, 10);
  
  await Promise.all(
    priorityImages.map(async (image) => {
      const url = image.optimizedUrl || image.url;
      try {
        const response = await fetch(url, { priority: 'high' });
        if (response.ok) {
          await cache.put(url, response);
          await updateImageAccessTime(url);
        }
      } catch (error) {
        console.warn('Failed to preload presentation image:', url, error);
      }
    })
  );
}

async function clearPortfolioCache() {
  const cache = await caches.open(PORTFOLIO_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
}

console.log('Portfolio Service Worker: Loaded and ready for mobile portfolio management');