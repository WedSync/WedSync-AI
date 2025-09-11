# TEAM E - ROUND 1: WS-144 - Offline Functionality System - Core Implementation

**Date:** 2025-08-24  
**Feature ID:** WS-144 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Implement core offline functionality with IndexedDB caching and sync management  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer working at remote venues
**I want to:** Access all my wedding day information even with poor or no internet connection
**So that:** I can check timelines, contact details, and shot lists without worrying about venue WiFi issues

**Real Wedding Problem This Solves:**
Mark, a wedding photographer, arrives at a countryside venue with terrible cell coverage. His WedSync app automatically downloaded all today's wedding data overnight. He can access the timeline, shot list, vendor contacts, and even fill out post-wedding forms. When he gets back to his car with signal, everything syncs seamlessly to the cloud. The bride never knows there were connectivity issues.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-144:**
- Wedding day data caches automatically 24 hours before event
- All forms work offline with auto-save every 30 seconds
- Sync queue processes automatically when connection restored
- Offline indicator shows connection status and sync progress
- Conflict resolution handles concurrent edits gracefully
- Cache size stays under 50MB with automatic cleanup

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Storage: IndexedDB via Dexie, Service Worker caching
- Sync: Background sync, conflict resolution
- Testing: Playwright MCP with offline simulation
- Performance: <100ms cache operations, 7-day offline support

**Integration Points:**
- Service Worker: Background data sync and caching
- IndexedDB: Local data storage and querying
- Sync Manager: Conflict resolution and data synchronization
- Cache Management: Storage optimization and cleanup

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 2. PWA AND OFFLINE PATTERN ANALYSIS:
await mcp__serena__search_for_pattern("service.*worker.*cache");
await mcp__serena__find_symbol("PWA offline IndexedDB", "", true);
await mcp__serena__get_symbols_overview("/public");

// 3. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("dexie");
await mcp__context7__get-library-docs("/dexie/dexie", "indexeddb patterns", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "pwa configuration", 2000);
await mcp__context7__get-library-docs("/workbox/workbox", "service worker", 2500);

// 4. EXISTING OFFLINE PATTERNS:
await mcp__serena__search_for_pattern("cache.*storage.*sync");
await mcp__serena__find_symbol("offline.*database", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Track offline functionality development"
2. **pwa-specialist** --think-ultra-hard "Service worker and PWA implementation"
3. **offline-database-architect** --think-ultra-hard "IndexedDB design and caching strategy"
4. **sync-manager-engineer** --think-hard "Data synchronization and conflict resolution"
5. **test-automation-architect** --tdd-approach "Offline functionality testing"
6. **performance-optimizer** --cache-optimization "Offline performance and storage management"

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Offline Infrastructure:

#### 1. IndexedDB Database System
- [ ] **WedSyncOfflineDB**: Dexie-based database with schema versioning
- [ ] **CachedWedding**: Wedding data structure for offline access
- [ ] **CachedClient**: Client information with offline capabilities
- [ ] **CachedForm**: Form definitions and responses for offline editing
- [ ] **SyncQueue**: Offline action queue for later synchronization

#### 2. Smart Caching System
- [ ] **SmartCacheManager**: Intelligent data caching with priority
- [ ] **WeddingDataPrefetch**: Automatic wedding day data prefetching
- [ ] **StorageOptimization**: Cache size management and cleanup
- [ ] **CachePrioritization**: Critical vs non-critical data prioritization

#### 3. Sync Management System
- [ ] **SyncManager**: Queue-based synchronization with retry logic
- [ ] **ConflictResolver**: Handle data conflicts from offline editing
- [ ] **BackgroundSync**: Service worker background sync
- [ ] **RetryMechanism**: Exponential backoff for failed syncs

#### 4. Offline UI Components
- [ ] **OfflineIndicator**: Connection status and sync progress display
- [ ] **OfflineForm**: Form components with offline auto-save
- [ ] **SyncStatus**: Visual sync queue and conflict display
- [ ] **CacheManager**: User-facing cache management interface

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Offline Data Security Checklist:
- [ ] **Data encryption** - Sensitive data encrypted in IndexedDB
- [ ] **Sync authentication** - All sync operations authenticated
- [ ] **Cache security** - No sensitive data in service worker cache
- [ ] **Conflict resolution security** - User authorization for conflict choices
- [ ] **Storage limits** - Prevent cache overflow attacks
- [ ] **Data expiry** - Automatic cleanup of old offline data

### Required Security Pattern:
```typescript
import { encrypt, decrypt } from '@/lib/security/encryption';
import { getServerSession } from 'next-auth';

// Secure offline data storage
export class SecureOfflineStorage {
  static async storeWeddingData(weddingData: WeddingData): Promise<void> {
    // Encrypt sensitive data before storing in IndexedDB
    const encryptedData = {
      ...weddingData,
      clientContacts: await encrypt(JSON.stringify(weddingData.clientContacts)),
      vendorContacts: await encrypt(JSON.stringify(weddingData.vendorContacts)),
      personalNotes: await encrypt(weddingData.personalNotes || '')
    };
    
    await offlineDB.weddings.put(encryptedData);
  }
  
  static async retrieveWeddingData(weddingId: string): Promise<WeddingData> {
    const encryptedData = await offlineDB.weddings.get(weddingId);
    if (!encryptedData) return null;
    
    // Decrypt sensitive data when retrieving
    return {
      ...encryptedData,
      clientContacts: JSON.parse(await decrypt(encryptedData.clientContacts)),
      vendorContacts: JSON.parse(await decrypt(encryptedData.vendorContacts)), 
      personalNotes: await decrypt(encryptedData.personalNotes)
    };
  }
}
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI components for offline indicators and sync status
- FROM Team B: Viral action data for offline tracking

### What other teams NEED from you:
- TO Team A: Offline data access hooks and sync status
- TO Team C: Offline customer success milestone tracking
- TO Team D: Offline marketing campaign engagement tracking
- TO All Teams: Offline functionality for their features

---

## 🎭 MCP SERVER USAGE

### Required MCP Servers:
- [ ] **Context7 MCP**: Load current Dexie, PWA, and Service Worker documentation
- [ ] **Playwright MCP**: Test offline functionality with network simulation
- [ ] **PostgreSQL MCP**: Validate sync operations against server database

### IndexedDB Schema Implementation:
```typescript
// src/lib/offline/offline-database.ts
import Dexie, { Table } from 'dexie';

export interface CachedWedding {
  id: string;
  date: string;
  coupleId: string;
  coupleName: string;
  venue: string;
  status: 'upcoming' | 'active' | 'completed';
  timeline: TimelineEvent[];
  vendors: VendorContact[];
  lastSync: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  priority: number; // 1=critical (today), 2=important (next 7 days), 3=normal
}

export interface CachedFormDraft {
  id: string;
  formId: string;
  clientId: string;
  data: Record<string, any>;
  autoSaveTime: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  conflictVersion?: number;
}

export interface SyncQueueItem {
  id?: number;
  type: 'form_submission' | 'form_draft' | 'client_update' | 'note_create' | 'viral_action';
  action: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nextRetry?: string;
  priority: number; // Higher numbers = higher priority
}

export class WedSyncOfflineDB extends Dexie {
  weddings!: Table<CachedWedding>;
  clients!: Table<CachedClient>;
  forms!: Table<CachedForm>;
  formDrafts!: Table<CachedFormDraft>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('WedSyncOffline');

    this.version(1).stores({
      weddings: 'id, date, coupleId, status, priority, [date+status]',
      clients: 'id, weddingDate, status, lastSync, supplierId',
      forms: 'id, clientId, type, lastModified',
      formDrafts: 'id, formId, clientId, autoSaveTime, syncStatus',
      syncQueue: '++id, type, status, timestamp, nextRetry, priority'
    });

    // Add automatic sync metadata
    this.weddings.hook('creating', this.addSyncMetadata);
    this.weddings.hook('updating', this.updateSyncMetadata);
  }

  private addSyncMetadata = (primKey: any, obj: any) => {
    obj.lastSync = new Date().toISOString();
    obj.syncStatus = 'pending';
  };

  private updateSyncMetadata = (modifications: any) => {
    modifications.lastSync = new Date().toISOString();
    if (!modifications.syncStatus) {
      modifications.syncStatus = 'pending';
    }
  };
}

export const offlineDB = new WedSyncOfflineDB();
```

---

## 🎭 SMART CACHING IMPLEMENTATION

### Intelligent Cache Management:
```typescript
// src/lib/offline/smart-cache-manager.ts
export class SmartCacheManager {
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CACHE_PRIORITIES = {
    critical: 1,    // Today's weddings
    important: 2,   // Next 7 days
    normal: 3,      // Historical data
    low: 4          // Analytics, preferences
  };

  async preloadCriticalData(): Promise<void> {
    console.log('Preloading critical wedding data...');
    
    // Get today's and tomorrow's weddings
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [todayWeddings, tomorrowWeddings] = await Promise.all([
      this.fetchWeddingsForDate(today),
      this.fetchWeddingsForDate(tomorrow)
    ]);
    
    // Cache today's weddings with highest priority
    for (const wedding of todayWeddings) {
      await this.cacheWeddingWithPriority(wedding, 'critical');
      
      // Also cache related data
      await Promise.all([
        this.cacheClientData(wedding.clientId, 'critical'),
        this.cacheWeddingForms(wedding.id, 'critical'),
        this.cacheVenueInfo(wedding.venueId, 'important')
      ]);
    }
    
    // Cache tomorrow's weddings with high priority
    for (const wedding of tomorrowWeddings) {
      await this.cacheWeddingWithPriority(wedding, 'important');
    }
    
    // Optimize storage after caching
    await this.optimizeStorage();
  }

  async cacheWeddingWithPriority(
    wedding: WeddingData, 
    priority: keyof typeof this.CACHE_PRIORITIES
  ): Promise<void> {
    const cachedWedding: CachedWedding = {
      ...wedding,
      priority: this.CACHE_PRIORITIES[priority],
      lastSync: new Date().toISOString(),
      syncStatus: 'synced'
    };
    
    await offlineDB.weddings.put(cachedWedding);
  }

  async optimizeStorage(): Promise<void> {
    const usage = await this.getCacheUsage();
    
    if (usage.size > this.MAX_CACHE_SIZE * 0.8) {
      console.log('Cache approaching limit, optimizing...');
      
      // Remove low priority old data first
      await this.pruneOldData();
      
      // If still over limit, remove normal priority data
      const newUsage = await this.getCacheUsage();
      if (newUsage.size > this.MAX_CACHE_SIZE * 0.8) {
        await this.pruneNormalPriorityData();
      }
    }
  }

  async getCacheUsage(): Promise<{ size: number; quota: number; usage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        size: estimate.usage || 0,
        quota: estimate.quota || 0,
        usage: (estimate.usage || 0) / (estimate.quota || 1)
      };
    }

    // Fallback: estimate based on record counts
    const [weddingCount, clientCount, formCount] = await Promise.all([
      offlineDB.weddings.count(),
      offlineDB.clients.count(),
      offlineDB.formDrafts.count()
    ]);

    const estimatedSize = (weddingCount * 2048) + (clientCount * 1024) + (formCount * 512);
    return {
      size: estimatedSize,
      quota: this.MAX_CACHE_SIZE,
      usage: estimatedSize / this.MAX_CACHE_SIZE
    };
  }
}
```

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Database: `/wedsync/src/lib/offline/offline-database.ts`
- Cache Manager: `/wedsync/src/lib/offline/smart-cache-manager.ts`
- Sync Manager: `/wedsync/src/lib/offline/sync-manager.ts`
- Components: `/wedsync/src/components/offline/`
- Hooks: `/wedsync/src/hooks/useOfflineData.ts`
- Service Worker: `/wedsync/public/sw.js`
- PWA Config: `/wedsync/next.config.js` (PWA configuration)
- Tests: `/wedsync/src/__tests__/offline/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch11/WS-144-round-1-complete.md`

---

## 🏁 ACCEPTANCE CRITERIA & EVIDENCE

### Technical Implementation Evidence:
- [ ] **IndexedDB database** - Show offline database schema and operations working
- [ ] **Smart caching** - Demonstrate priority-based caching with storage optimization
- [ ] **Sync queue** - Show offline actions queued and processed on reconnection
- [ ] **Conflict resolution** - Handle concurrent edits with user choice UI
- [ ] **Performance** - Cache operations under 100ms, 7-day offline support

### Offline Functionality Requirements:
- [ ] **Wedding data prefetch** - Critical weddings cached 24 hours before event
- [ ] **Form auto-save** - Forms save automatically every 30 seconds offline
- [ ] **Storage management** - Cache stays under 50MB with automatic cleanup
- [ ] **Sync indicators** - Clear visual feedback for connection and sync status

### Code Quality Evidence:
```typescript
// Show offline database pattern compliance:
// File: src/lib/offline/offline-database.ts:45-67
export class WedSyncOfflineDB extends Dexie {
  // Serena confirmed: Follows database pattern from existing services
  constructor() {
    super('WedSyncOffline');
    
    // Version 1 schema with proper indexes
    this.version(1).stores({
      weddings: 'id, date, priority, [date+status]', // Compound index for queries
      syncQueue: '++id, priority, status, timestamp'  // Auto-increment with indexes
    });
  }
}
```

### Offline Testing Evidence:
```typescript
// Playwright offline testing pattern:
test('Wedding data accessible offline', async ({ page, context }) => {
  // Start online and cache data
  await page.goto('/dashboard/weddings');
  await page.waitForLoadState('networkidle');
  
  // Go offline
  await context.setOffline(true);
  
  // Should still show cached wedding data
  await expect(page.getByText('Today\'s Wedding: Smith & Jones')).toBeVisible();
  
  // Form should work offline
  await page.fill('[data-testid="wedding-notes"]', 'Added offline note');
  await expect(page.getByText('Saved offline')).toBeVisible();
});
```

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY