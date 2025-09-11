# TEAM D - ROUND 1: WS-305 - Client Management Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build mobile-first client management PWA with offline client access, mobile client profiles, and cross-platform client data synchronization
**FEATURE ID:** WS-305 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile client management workflows, offline wedding coordination, and touch-optimized client interfaces

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **PWA INSTALLATION VERIFICATION:**
```bash
# Test PWA installation and offline functionality
open -a "Google Chrome" --args --allow-running-insecure-content http://localhost:3000/clients
# MUST show: Install prompt appears, client management works offline
```

2. **MOBILE CLIENT INTERFACE TEST:**
```bash
# Test responsive client management on mobile viewport
npm run dev
# Navigate to /clients, resize to 375px width
# MUST show: Touch-optimized client cards, swipe gestures, mobile navigation
```

3. **OFFLINE CLIENT DATA VERIFICATION:**
```bash
# Test offline client data access
# Disable network, reload /clients page
# MUST show: Client profiles accessible without internet connection
```

## 🧠 SEQUENTIAL THINKING FOR MOBILE CLIENT MANAGEMENT

```typescript
// Mobile client management complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile client management for wedding vendors needs: Touch-optimized client profiles with easy scrolling, offline access to essential client data during venue visits, one-handed navigation for on-site coordination, quick client search during busy wedding days, and seamless sync when connectivity restored.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor mobile workflows: Photographers review client details before shoots while driving to venues, coordinators check wedding timelines on-site without WiFi, venues access guest counts and dietary restrictions during setup, florists verify delivery addresses and special instructions during transport.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile PWA architecture requirements: Service worker for offline caching of critical client data, IndexedDB for local client storage, background sync for updates when online, push notifications for client communications, installable PWA for native app experience without app store deployment.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Touch interface optimization: Larger touch targets for outdoor use with gloves, swipe gestures for quick client navigation, bottom navigation for thumb accessibility, voice search for hands-free operation, simplified forms for mobile input, and emergency contact quick-dial buttons.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA PWA PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing PWA and mobile patterns
await mcp__serena__search_for_pattern("pwa service-worker offline cache");
await mcp__serena__find_symbol("ServiceWorker PWA manifest", "$WS_ROOT/wedsync/public/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/pwa/");

// Study existing mobile-optimized components
await mcp__serena__find_referencing_symbols("mobile responsive touch");
```

### B. PWA DOCUMENTATION LOADING
```typescript
// Load PWA and mobile development documentation
// Use Ref MCP to search for:
# - "PWA service worker caching strategies"
# - "Next.js PWA implementation patterns"
# - "Mobile-first responsive design principles"

// Load offline-first architecture patterns
// Use Ref MCP to search for:
# - "IndexedDB client-side database patterns"
# - "Background sync API implementation"
# - "Mobile touch gesture handling"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Mobile Client Management PWA** (`$WS_ROOT/wedsync/src/lib/pwa/client-management-pwa.ts`)
  - Installable PWA with client management capabilities
  - Service worker for offline client data access
  - Background sync when connectivity restored
  - Evidence: PWA installs on mobile devices, client data accessible offline

- [ ] **Touch-Optimized Client Interface** (`$WS_ROOT/wedsync/src/components/mobile/clients/mobile-client-cards.tsx`)
  - Swipe gestures for client navigation
  - Touch-friendly client profile cards
  - Bottom navigation for mobile accessibility
  - Evidence: All touch targets ≥48px, smooth swipe interactions

- [ ] **Offline Client Storage System** (`$WS_ROOT/wedsync/src/lib/pwa/offline-client-storage.ts`)
  - IndexedDB for local client data caching
  - Intelligent client data pre-loading
  - Conflict resolution for offline edits
  - Evidence: Essential client data available without internet

- [ ] **Mobile Client Search & Filter** (`$WS_ROOT/wedsync/src/components/mobile/clients/mobile-client-search.tsx`)
  - Voice search integration for hands-free use
  - Quick filter buttons for mobile workflows
  - Predictive search with offline fallback
  - Evidence: Voice search works, filters respond instantly

- [ ] **Cross-Platform Client Sync** (`$WS_ROOT/wedsync/src/lib/pwa/client-sync-manager.ts`)
  - Bidirectional sync between mobile and desktop
  - Optimistic updates with rollback capability
  - Push notifications for client updates
  - Evidence: Client changes sync seamlessly between platforms

## 📱 PWA ARCHITECTURE IMPLEMENTATION

### Service Worker for Client Management
```typescript
// File: $WS_ROOT/wedsync/public/sw-client-management.js

const CACHE_NAME = 'wedsync-clients-v1';
const CLIENT_DATA_CACHE = 'client-data-v1';
const CRITICAL_ROUTES = [
  '/clients',
  '/clients/[id]',
  '/api/clients',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/clients',
        '/offline',
        '/manifest.json',
        '/_next/static/css',
        '/_next/static/js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Client data requests
  if (event.request.url.includes('/api/clients')) {
    event.respondWith(
      caches.open(CLIENT_DATA_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          console.log('Network failed, serving from cache');
        }
        
        // Fallback to cached data
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return offline indicator
        return new Response(JSON.stringify({
          offline: true,
          message: 'Client data unavailable offline'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }

  // Client pages
  if (CRITICAL_ROUTES.some(route => event.request.url.includes(route))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline');
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'client-data-sync') {
    event.waitUntil(syncOfflineClientChanges());
  }
});

async function syncOfflineClientChanges() {
  const offlineChanges = await getOfflineChanges();
  for (const change of offlineChanges) {
    try {
      await fetch('/api/clients/sync', {
        method: 'POST',
        body: JSON.stringify(change),
        headers: { 'Content-Type': 'application/json' }
      });
      await markChangeAsSynced(change.id);
    } catch (error) {
      console.error('Sync failed for change:', change.id);
    }
  }
}
```

### Mobile-Optimized Client Manager
```typescript
// File: $WS_ROOT/wedsync/src/lib/pwa/client-management-pwa.ts

export class MobileClientManager {
  private db: IDBDatabase | null = null;
  private syncQueue: ClientChange[] = [];

  async initialize() {
    // Initialize IndexedDB for offline storage
    this.db = await this.openClientDatabase();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw-client-management.js');
    }

    // Setup background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('client-data-sync');
    }

    // Load offline client data
    await this.preloadCriticalClients();
  }

  private async openClientDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncClients', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Client profiles store
        const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientStore.createIndex('supplier_id', 'supplier_id');
        clientStore.createIndex('wedding_date', 'wedding_date');
        clientStore.createIndex('status', 'status');

        // Offline changes queue
        const changesStore = db.createObjectStore('changes', { 
          keyPath: 'id',
          autoIncrement: true 
        });
        changesStore.createIndex('timestamp', 'timestamp');
        changesStore.createIndex('synced', 'synced');
      };
    });
  }

  async getOfflineClients(supplierId: string): Promise<Client[]> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clients'], 'readonly');
      const store = transaction.objectStore('clients');
      const index = store.index('supplier_id');
      const request = index.getAll(supplierId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateClientOffline(clientId: string, changes: Partial<Client>): Promise<void> {
    if (!this.db) await this.initialize();

    // Store change for sync
    const change: ClientChange = {
      client_id: clientId,
      changes,
      timestamp: Date.now(),
      synced: false
    };

    await this.storeOfflineChange(change);

    // Update local copy optimistically
    const transaction = this.db.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    
    const getRequest = store.get(clientId);
    getRequest.onsuccess = () => {
      const client = getRequest.result;
      if (client) {
        const updatedClient = { ...client, ...changes };
        store.put(updatedClient);
      }
    };
  }

  private async storeOfflineChange(change: ClientChange): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes'], 'readwrite');
      const store = transaction.objectStore('changes');
      const request = store.add(change);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return;

    const unsyncedChanges = await this.getUnsyncedChanges();
    
    for (const change of unsyncedChanges) {
      try {
        const response = await fetch('/api/clients/sync', {
          method: 'POST',
          body: JSON.stringify({
            client_id: change.client_id,
            changes: change.changes
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          await this.markChangeAsSynced(change.id!);
        }
      } catch (error) {
        console.error('Failed to sync change:', error);
      }
    }
  }

  private async getUnsyncedChanges(): Promise<ClientChange[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['changes'], 'readonly');
      const store = transaction.objectStore('changes');
      const index = store.index('synced');
      const request = index.getAll(false);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async preloadCriticalClients(): Promise<void> {
    try {
      // Load upcoming weddings and recent clients
      const response = await fetch('/api/clients?critical=true');
      const criticalClients = await response.json();
      
      const transaction = this.db!.transaction(['clients'], 'readwrite');
      const store = transaction.objectStore('clients');
      
      for (const client of criticalClients) {
        store.put(client);
      }
    } catch (error) {
      console.log('Failed to preload critical clients:', error);
    }
  }
}
```

### Touch-Optimized Client Cards
```typescript
// File: $WS_ROOT/wedsync/src/components/mobile/clients/mobile-client-cards.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Calendar, MapPin } from 'lucide-react';

interface MobileClientCardsProps {
  clients: Client[];
  onClientSelect: (client: Client) => void;
  onClientCall: (client: Client) => void;
  onClientEmail: (client: Client) => void;
}

export function MobileClientCards({ 
  clients, 
  onClientSelect, 
  onClientCall, 
  onClientEmail 
}: MobileClientCardsProps) {
  const [swipedCard, setSwipedCard] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent, clientId: string) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, clientId: string) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (client: Client) => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 100;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe left - show quick actions
        setSwipedCard(client.id);
      } else {
        // Swipe right - hide quick actions or call
        if (swipedCard === client.id) {
          setSwipedCard(null);
        } else {
          onClientCall(client);
        }
      }
    } else {
      // Tap - open client details
      onClientSelect(client);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div className="space-y-3 pb-20"> {/* Bottom padding for mobile nav */}
      {clients.map((client) => (
        <Card 
          key={client.id} 
          className={`relative overflow-hidden transition-all duration-200 ${
            swipedCard === client.id ? 'transform -translate-x-32' : ''
          }`}
          onTouchStart={(e) => handleTouchStart(e, client.id)}
          onTouchMove={(e) => handleTouchMove(e, client.id)}
          onTouchEnd={() => handleTouchEnd(client)}
        >
          {/* Quick Actions Panel (Hidden by default) */}
          {swipedCard === client.id && (
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-blue-500 to-blue-600 flex items-center justify-center">
              <div className="flex flex-col space-y-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClientCall(client);
                  }}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClientEmail(client);
                  }}
                >
                  <Mail className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Client Card Content */}
          <div className="p-4">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                <AvatarImage src={client.avatar_url} alt={client.name} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-600 text-white font-semibold">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {client.name}
                  </h3>
                  <Badge 
                    variant={getStatusVariant(client.status)}
                    className="ml-2 flex-shrink-0"
                  >
                    {client.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {client.wedding_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{formatDate(client.wedding_date)}</span>
                    </div>
                  )}
                  
                  {client.venue_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{client.venue_name}</span>
                    </div>
                  )}
                </div>

                {/* Progress indicator */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(client.completion_percentage || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${client.completion_percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Urgent indicators for wedding day */}
            {isUpcoming(client.wedding_date) && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center text-amber-800">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    Wedding in {getDaysUntil(client.wedding_date)} days
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No clients found</div>
          <div className="text-gray-500 text-sm">
            Start by adding your first client
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active': return 'default';
    case 'completed': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function isUpcoming(weddingDate: string) {
  const wedding = new Date(weddingDate);
  const today = new Date();
  const diffTime = wedding.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
}

function getDaysUntil(weddingDate: string) {
  const wedding = new Date(weddingDate);
  const today = new Date();
  const diffTime = wedding.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

## 📱 MOBILE PWA MANIFEST

### PWA Manifest Configuration
```json
// File: $WS_ROOT/wedsync/public/manifest.json

{
  "name": "WedSync Client Management",
  "short_name": "WedSync Clients",
  "description": "Manage your wedding clients on the go",
  "start_url": "/clients",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "scope": "/",
  "categories": ["business", "productivity", "lifestyle"],
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
  "shortcuts": [
    {
      "name": "Add New Client",
      "short_name": "Add Client",
      "description": "Quick add a new wedding client",
      "url": "/clients/new",
      "icons": [{ "src": "/icons/add-client.png", "sizes": "96x96" }]
    },
    {
      "name": "Upcoming Weddings", 
      "short_name": "Upcoming",
      "description": "View upcoming wedding dates",
      "url": "/clients?filter=upcoming",
      "icons": [{ "src": "/icons/calendar.png", "sizes": "96x96" }]
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
```

## 🧪 REQUIRED TESTING

### Mobile PWA Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/pwa/mobile-client-management.test.ts

describe('Mobile Client Management PWA', () => {
  let clientManager: MobileClientManager;
  
  beforeEach(async () => {
    clientManager = new MobileClientManager();
    await clientManager.initialize();
  });

  it('should work offline with cached client data', async () => {
    // Pre-load client data
    const testClients = [
      { id: '1', name: 'John & Jane Doe', wedding_date: '2025-06-15' }
    ];
    
    // Store offline
    for (const client of testClients) {
      await clientManager.updateClientOffline(client.id, client);
    }

    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const offlineClients = await clientManager.getOfflineClients('supplier-123');
    expect(offlineClients).toHaveLength(1);
    expect(offlineClients[0].name).toBe('John & Jane Doe');
  });

  it('should sync changes when back online', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    await clientManager.updateClientOffline('client-123', {
      notes: 'Updated offline'
    });

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    await clientManager.syncWhenOnline();

    expect(fetchSpy).toHaveBeenCalledWith('/api/clients/sync', 
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Updated offline')
      })
    );
  });
});
```

### Mobile Touch Interface Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/components/mobile-client-cards.test.tsx

describe('MobileClientCards', () => {
  it('should handle swipe gestures correctly', async () => {
    const mockClients = [
      { id: '1', name: 'Test Client', wedding_date: '2025-06-15' }
    ];

    const onClientCall = jest.fn();
    const { getByTestId } = render(
      <MobileClientCards 
        clients={mockClients}
        onClientSelect={jest.fn()}
        onClientCall={onClientCall}
        onClientEmail={jest.fn()}
      />
    );

    const clientCard = getByTestId('client-card-1');

    // Simulate swipe right (call action)
    fireEvent.touchStart(clientCard, {
      touches: [{ clientX: 100 }]
    });
    fireEvent.touchEnd(clientCard, {
      touches: [{ clientX: 250 }]
    });

    expect(onClientCall).toHaveBeenCalledWith(mockClients[0]);
  });

  it('should have touch targets at least 48px', () => {
    const { container } = render(
      <MobileClientCards 
        clients={[]}
        onClientSelect={jest.fn()}
        onClientCall={jest.fn()}
        onClientEmail={jest.fn()}
      />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minSize = 48;
      expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(minSize);
      expect(parseInt(styles.minWidth) || parseInt(styles.width)).toBeGreaterThanOrEqual(minSize);
    });
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-305-client-management-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team D",
  "notes": "Mobile client management PWA completed. Offline access, touch-optimized interface, service worker caching, cross-platform sync."
}
```

---

**WedSync Mobile Client Management - Wedding Coordination On-The-Go! 📱👰🤵**