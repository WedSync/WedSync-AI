# 03-offline-functionality.md

# WedSync/WedMe Offline Functionality Documentation

## Overview

This document outlines the comprehensive offline functionality strategy for WedSync and WedMe, ensuring wedding suppliers and couples can access critical information even with poor or no connectivity - a common scenario at wedding venues.

## Offline Strategy Philosophy

### Critical vs. Nice-to-Have

As a wedding photographer, you know that certain information is absolutely critical on a wedding day:

- **Critical**: Timeline, contacts, venue details, shot lists
- **Nice-to-Have**: Analytics, marketplace browsing, historical data
- **Not Needed Offline**: Payment processing, account settings

## Offline Architecture

### Data Synchronization Strategy

```tsx
interface OfflineStrategy {
  critical: {
    sync: 'aggressive',  // Sync immediately when online
    cache: 'permanent',  // Never auto-expire
    storage: 'indexedDB' // Large capacity
  },
  important: {
    sync: 'periodic',    // Sync every 5 minutes when online
    cache: '7days',      // Expire after a week
    storage: 'indexedDB'
  },
  standard: {
    sync: 'lazy',        // Sync on demand
    cache: '24hours',    // Expire daily
    storage: 'cache'     // Service worker cache
  }
}

```

## IndexedDB Schema

### Database Structure

```jsx
// db/offline-database.js
import Dexie from 'dexie';

class WedSyncOfflineDB extends Dexie {
  constructor() {
    super('WedSyncOffline');

    this.version(1).stores({
      // Critical wedding day data
      weddings: 'id, date, coupleId, status, [date+status]',
      clients: 'id, weddingDate, status, lastSync',
      venues: 'id, name, address, coordinates',
      timelines: 'id, weddingId, date, version',
      contacts: 'id, clientId, type, primary',

      // Forms and responses
      forms: 'id, name, type, lastModified',
      formResponses: 'id, formId, clientId, status, syncStatus',
      formDrafts: 'id, formId, clientId, autoSaveTime',

      // Communication
      emailTemplates: 'id, type, category',
      messages: 'id, clientId, timestamp, syncStatus',

      // Journey data
      journeys: 'id, clientId, status, currentNode',
      journeyNodes: 'id, journeyId, type, scheduled',

      // Sync metadata
      syncQueue: '++id, type, action, data, attempts, timestamp',
      syncLog: '++id, timestamp, status, details'
    });

    // Add hooks for sync tracking
    this.weddings.hook('creating', function(primKey, obj) {
      obj.lastSync = new Date().toISOString();
      obj.syncStatus = 'pending';
    });

    this.weddings.hook('updating', function(modifications, primKey, obj) {
      modifications.lastSync = new Date().toISOString();
      if (!modifications.syncStatus) {
        modifications.syncStatus = 'pending';
      }
    });
  }
}

export const db = new WedSyncOfflineDB();

```

## Offline Data Management

### Critical Data Caching

```tsx
// services/offline-service.ts
class OfflineService {
  private db: WedSyncOfflineDB;
  private syncInProgress = false;

  async cacheWeddingDayData(date: Date) {
    const weddings = await this.fetchWeddingsForDate(date);

    for (const wedding of weddings) {
      // Cache all critical data for each wedding
      await Promise.all([
        this.cacheWedding(wedding),
        this.cacheTimeline(wedding.id),
        this.cacheContacts(wedding.clientId),
        this.cacheVenue(wedding.venueId),
        this.cacheForms(wedding.clientId),
        this.cacheDocuments(wedding.id)
      ]);
    }

    // Mark as cached
    await this.updateCacheStatus(date, 'complete');
  }

  async cacheWedding(wedding: Wedding) {
    await db.weddings.put({
      ...wedding,
      syncStatus: 'synced',
      lastSync: new Date().toISOString()
    });
  }

  async cacheTimeline(weddingId: string) {
    const timeline = await api.getTimeline(weddingId);
    await db.timelines.put({
      ...timeline,
      version: timeline.version,
      cachedAt: new Date().toISOString()
    });
  }

  // Intelligent prefetching
  async prefetchUpcomingWeddings() {
    const upcoming = await this.getUpcomingWeddings(7); // Next 7 days

    for (const wedding of upcoming) {
      const cacheStatus = await this.getCacheStatus(wedding.id);

      if (!cacheStatus || this.isStale(cacheStatus)) {
        await this.cacheWeddingDayData(wedding.date);
      }
    }
  }

  isStale(cacheStatus: CacheStatus): boolean {
    const hoursSinceCache =
      (Date.now() - new Date(cacheStatus.lastSync).getTime()) / 3600000;

    // Different staleness for different data
    if (cacheStatus.type === 'timeline') return hoursSinceCache > 1;
    if (cacheStatus.type === 'contacts') return hoursSinceCache > 24;
    return hoursSinceCache > 6; // Default
  }
}

```

### Offline Form Handling

```tsx
// components/OfflineForm.tsx
export function OfflineForm({ formId, clientId }) {
  const [draft, setDraft] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    // Load any existing draft
    loadDraft();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      syncDrafts();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDraft = async () => {
    const saved = await db.formDrafts
      .where(['formId', 'clientId'])
      .equals([formId, clientId])
      .first();

    if (saved) {
      setDraft(saved.data);
    }
  };

  const saveDraft = useDebounce(async (data) => {
    await db.formDrafts.put({
      id: `${formId}-${clientId}`,
      formId,
      clientId,
      data,
      autoSaveTime: new Date().toISOString(),
      syncStatus: 'pending'
    });

    if (!isOffline) {
      await syncDraft(data);
    }
  }, 1000);

  const syncDraft = async (data) => {
    setSyncStatus('syncing');

    try {
      await api.saveFormDraft(formId, clientId, data);

      await db.formDrafts
        .where('id')
        .equals(`${formId}-${clientId}`)
        .modify({ syncStatus: 'synced' });

      setSyncStatus('synced');
    } catch (error) {
      // Queue for later sync
      await queueForSync('formDraft', { formId, clientId, data });
      setSyncStatus('queued');
    }
  };

  const handleSubmit = async (data) => {
    if (isOffline) {
      // Queue submission for when online
      await db.syncQueue.add({
        type: 'formSubmission',
        action: 'submit',
        data: { formId, clientId, formData: data },
        attempts: 0,
        timestamp: new Date().toISOString()
      });

      // Show offline confirmation
      showToast('Form saved! Will submit when connection restored.', 'info');

      // Clear draft
      await db.formDrafts.delete(`${formId}-${clientId}`);
    } else {
      // Normal online submission
      await submitForm(data);
    }
  };

  return (
    <div className="offline-form">
      {isOffline && (
        <div className="offline-banner">
          <Icon name="wifi-off" />
          <span>Offline Mode - Changes will sync when connected</span>
        </div>
      )}

      {syncStatus === 'syncing' && (
        <div className="sync-indicator">
          <Spinner size="sm" />
          <span>Saving...</span>
        </div>
      )}

      <Form
        initialData={draft}
        onChange={saveDraft}
        onSubmit={handleSubmit}
      >
        {/* Form fields */}
      </Form>
    </div>
  );
}

```

## Background Sync Implementation

### Sync Queue Manager

```tsx
// services/sync-queue.ts
class SyncQueueManager {
  private isOnline = navigator.onLine;
  private syncInterval: NodeJS.Timeout;
  private retryDelays = [1000, 5000, 15000, 60000]; // Exponential backoff

  constructor() {
    this.initializeEventListeners();
    this.startPeriodicSync();
  }

  private initializeEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Visibility change - sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  private startPeriodicSync() {
    // Try to sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !document.hidden) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  async addToQueue(type: string, action: string, data: any) {
    const queueItem = {
      type,
      action,
      data,
      attempts: 0,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    const id = await db.syncQueue.add(queueItem);

    // Try immediate sync if online
    if (this.isOnline) {
      this.processSingleItem(id);
    }

    return id;
  }

  async processSyncQueue() {
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    console.log(`Processing ${pending.length} queued items`);

    for (const item of pending) {
      await this.processSingleItem(item.id);
    }
  }

  async processSingleItem(itemId: number) {
    const item = await db.syncQueue.get(itemId);
    if (!item || item.status !== 'pending') return;

    try {
      // Update status to processing
      await db.syncQueue.update(itemId, { status: 'processing' });

      // Process based on type
      let result;
      switch (item.type) {
        case 'formSubmission':
          result = await this.syncFormSubmission(item.data);
          break;
        case 'formDraft':
          result = await this.syncFormDraft(item.data);
          break;
        case 'message':
          result = await this.syncMessage(item.data);
          break;
        case 'clientUpdate':
          result = await this.syncClientUpdate(item.data);
          break;
        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }

      // Success - remove from queue
      await db.syncQueue.delete(itemId);

      // Log success
      await db.syncLog.add({
        timestamp: new Date().toISOString(),
        status: 'success',
        details: { type: item.type, id: itemId }
      });

    } catch (error) {
      // Handle failure
      const attempts = item.attempts + 1;
      const maxAttempts = 5;

      if (attempts >= maxAttempts) {
        // Max attempts reached - mark as failed
        await db.syncQueue.update(itemId, {
          status: 'failed',
          error: error.message,
          attempts
        });

        // Notify user
        this.notifyUserOfFailure(item);
      } else {
        // Schedule retry with backoff
        const delay = this.retryDelays[Math.min(attempts - 1, this.retryDelays.length - 1)];

        await db.syncQueue.update(itemId, {
          status: 'pending',
          attempts,
          nextRetry: new Date(Date.now() + delay).toISOString()
        });

        setTimeout(() => this.processSingleItem(itemId), delay);
      }
    }
  }

  private async syncFormSubmission(data: any) {
    const response = await api.submitForm(
      data.formId,
      data.clientId,
      data.formData
    );

    // Update local database with server response
    await db.formResponses.put({
      id: response.id,
      formId: data.formId,
      clientId: data.clientId,
      status: 'submitted',
      syncStatus: 'synced',
      submittedAt: response.submittedAt
    });

    return response;
  }

  private notifyUserOfFailure(item: any) {
    showNotification({
      title: 'Sync Failed',
      body: `Failed to sync ${item.type}. Please check your connection.`,
      icon: '/icons/error.png',
      actions: [
        { action: 'retry', title: 'Retry' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
}

export const syncQueue = new SyncQueueManager();

```

## Offline UI Components

### Offline Indicator

```tsx
// components/OfflineIndicator.tsx
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);

      if (!offline) {
        checkSyncStatus();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check sync status periodically
    const interval = setInterval(checkSyncStatus, 10000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const checkSyncStatus = async () => {
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .count();

    const failed = await db.syncQueue
      .where('status')
      .equals('failed')
      .count();

    setSyncStatus({ pending, failed });
  };

  if (!isOffline && (!syncStatus || syncStatus.pending === 0)) {
    return null; // Don't show when everything is synced
  }

  return (
    <div className={`offline-indicator ${isOffline ? 'offline' : 'syncing'}`}>
      <div className="indicator-content">
        {isOffline ? (
          <>
            <Icon name="wifi-off" className="animate-pulse" />
            <span>Offline Mode</span>
            <span className="text-xs">Changes saved locally</span>
          </>
        ) : (
          <>
            <Spinner size="sm" />
            <span>Syncing...</span>
            {syncStatus && (
              <span className="text-xs">
                {syncStatus.pending} items pending
                {syncStatus.failed > 0 && `, ${syncStatus.failed} failed`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

```

### Offline-First Data Hook

```tsx
// hooks/useOfflineData.ts
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    critical?: boolean;
    cacheTime?: number;
    fallback?: T;
  }
) {
  const [data, setData] = useState<T>(options?.fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    loadData();
  }, [key]);

  const loadData = async () => {
    try {
      // Try to load from IndexedDB first
      const cached = await getCachedData(key);

      if (cached) {
        setData(cached.data);
        setIsStale(isDataStale(cached, options?.cacheTime));
        setLoading(false);

        // If stale and online, refresh in background
        if (isDataStale(cached, options?.cacheTime) && navigator.onLine) {
          refreshData();
        }
      } else if (navigator.onLine) {
        // No cache, fetch if online
        await refreshData();
      } else {
        // Offline with no cache
        setError(new Error('No cached data available offline'));
        setLoading(false);
      }
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsStale(false);

      // Cache the fresh data
      await cacheData(key, fresh, options?.critical);

      setLoading(false);
    } catch (err) {
      if (!data) {
        // Only set error if we have no data to show
        setError(err);
      }
      setLoading(false);
    }
  };

  const invalidate = () => {
    setIsStale(true);
    if (navigator.onLine) {
      refreshData();
    }
  };

  return {
    data,
    loading,
    error,
    isStale,
    invalidate,
    isOffline: !navigator.onLine
  };
}

```

## Offline Pages

### Static Offline Fallback

```tsx
// pages/offline.tsx
export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState([]);

  useEffect(() => {
    loadCachedContent();
  }, []);

  const loadCachedContent = async () => {
    // Get list of cached pages/data
    const weddings = await db.weddings.toArray();
    const forms = await db.forms.toArray();
    const clients = await db.clients.toArray();

    setCachedPages({
      weddings: weddings.length,
      forms: forms.length,
      clients: clients.length
    });
  };

  return (
    <div className="offline-page">
      <div className="offline-hero">
        <Icon name="wifi-off" size="xl" />
        <h1>You're Offline</h1>
        <p>But don't worry, you can still access your cached data</p>
      </div>

      <div className="cached-content">
        <h2>Available Offline:</h2>

        <div className="offline-cards">
          <Card
            icon="calendar"
            title="Today's Weddings"
            count={cachedPages.weddings}
            href="/weddings/today"
          />

          <Card
            icon="users"
            title="Clients"
            count={cachedPages.clients}
            href="/clients"
          />

          <Card
            icon="forms"
            title="Forms"
            count={cachedPages.forms}
            href="/forms"
          />
        </div>

        <div className="offline-features">
          <h3>What you can do offline:</h3>
          <ul>
            <li>✓ View cached wedding details</li>
            <li>✓ Access client information</li>
            <li>✓ Fill out forms (will sync later)</li>
            <li>✓ View timelines and schedules</li>
            <li>✓ Read documents and guides</li>
          </ul>

          <h3>What requires connection:</h3>
          <ul>
            <li>✗ Sending messages</li>
            <li>✗ Updating journey status</li>
            <li>✗ Accessing new content</li>
            <li>✗ Payment processing</li>
          </ul>
        </div>
      </div>

      <div className="connection-status">
        <p>We'll keep trying to reconnect...</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
}

```

## Conflict Resolution

### Data Conflict Handler

```tsx
// services/conflict-resolver.ts
class ConflictResolver {
  async resolveConflicts(local: any, remote: any, type: string) {
    const strategy = this.getStrategy(type);

    switch (strategy) {
      case 'client-wins':
        return local;

      case 'server-wins':
        return remote;

      case 'merge':
        return this.mergeData(local, remote, type);

      case 'manual':
        return this.promptUserResolution(local, remote);

      default:
        // Last write wins (compare timestamps)
        return local.updatedAt > remote.updatedAt ? local : remote;
    }
  }

  private getStrategy(type: string): ConflictStrategy {
    const strategies = {
      'formDraft': 'client-wins',     // User's work is precious
      'timeline': 'server-wins',      // Server has authority
      'clientNotes': 'merge',          // Combine both
      'settings': 'manual'             // Ask user
    };

    return strategies[type] || 'last-write-wins';
  }

  private mergeData(local: any, remote: any, type: string) {
    if (type === 'clientNotes') {
      // Merge notes arrays
      const merged = [...local.notes, ...remote.notes];
      const unique = Array.from(new Set(merged.map(n => n.id)))
        .map(id => merged.find(n => n.id === id));

      return { ...remote, notes: unique };
    }

    // Default merge - combine non-conflicting fields
    const merged = { ...remote };

    for (const key in local) {
      if (local[key] !== remote[key]) {
        // Use local if it's newer
        if (local[`${key}UpdatedAt`] > remote[`${key}UpdatedAt`]) {
          merged[key] = local[key];
        }
      }
    }

    return merged;
  }

  private async promptUserResolution(local: any, remote: any) {
    return new Promise((resolve) => {
      showConflictModal({
        local,
        remote,
        onResolve: (chosen) => resolve(chosen)
      });
    });
  }
}

```

## Testing Offline Functionality

### Offline Testing Suite

```tsx
// tests/offline.test.ts
describe('Offline Functionality', () => {
  beforeEach(() => {
    // Clear IndexedDB
    indexedDB.deleteDatabase('WedSyncOffline');
  });

  test('Forms save to IndexedDB when offline', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const form = render(<OfflineForm formId="123" clientId="456" />);

    // Fill form
    fireEvent.change(form.getByLabelText('Name'), {
      target: { value: 'Test User' }
    });

    // Wait for auto-save
    await waitFor(() => {
      const draft = db.formDrafts.get('123-456');
      expect(draft).toBeDefined();
      expect(draft.data.name).toBe('Test User');
    });
  });

  test('Sync queue processes when coming online', async () => {
    // Add items to queue while offline
    await syncQueue.addToQueue('formSubmission', 'submit', {
      formId: '123',
      data: { test: true }
    });

    // Simulate coming online
    Object.defineProperty(navigator, 'onLine', {
      value: true
    });

    window.dispatchEvent(new Event('online'));

    // Wait for sync
    await waitFor(() => {
      const pending = db.syncQueue.where('status').equals('pending').count();
      expect(pending).toBe(0);
    });
  });
});

```

## Performance Optimization

### Selective Offline Caching

```tsx
// Only cache what's needed based on user behavior
class SmartCache {
  async analyzeUsagePatterns() {
    const usage = await db.syncLog
      .where('timestamp')
      .above(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .toArray();

    // Identify frequently accessed data
    const patterns = this.extractPatterns(usage);

    // Adjust caching strategy
    return {
      priorityCache: patterns.frequent,
      lazyCache: patterns.occasional,
      skipCache: patterns.never
    };
  }

  async optimizeStorage() {
    const quota = await navigator.storage.estimate();
    const usage = quota.usage / quota.quota;

    if (usage > 0.8) {
      // Clean up old data
      await this.pruneOldCache();
    }

    return {
      used: this.formatBytes(quota.usage),
      available: this.formatBytes(quota.quota - quota.usage),
      percentage: Math.round(usage * 100)
    };
  }

  async pruneOldCache() {
    // Remove data older than 30 days that hasn't been accessed
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await db.weddings
      .where('lastAccessed')
      .below(cutoff.toISOString())
      .delete();

    // Clear old sync logs
    await db.syncLog
      .where('timestamp')
      .below(cutoff.toISOString())
      .delete();
  }
}

```

### Lazy Loading Offline Data

```tsx
// Load data progressively based on user navigation
class LazyOfflineLoader {
  private loadQueue: Set<string> = new Set();
  private loading = false;

  async loadOnDemand(section: string) {
    if (!navigator.onLine) {
      // Already offline, load from cache
      return this.loadFromCache(section);
    }

    // Queue for background loading
    this.loadQueue.add(section);
    this.processQueue();
  }

  private async processQueue() {
    if (this.loading || this.loadQueue.size === 0) return;

    this.loading = true;

    for (const section of this.loadQueue) {
      await this.cacheSection(section);
      this.loadQueue.delete(section);
    }

    this.loading = false;
  }

  private async cacheSection(section: string) {
    switch (section) {
      case 'todayWeddings':
        await this.cacheTodayWeddings();
        break;
      case 'weekSchedule':
        await this.cacheWeekSchedule();
        break;
      case 'clientForms':
        await this.cacheClientForms();
        break;
    }
  }
}

```

## Monitoring & Analytics

### Offline Usage Tracking

```tsx
// Track offline usage patterns for optimization
class OfflineAnalytics {
  private metrics: OfflineMetrics = {
    offlineSessions: [],
    dataAccessPatterns: new Map(),
    syncFailures: [],
    conflictResolutions: []
  };

  trackOfflineSession() {
    const session = {
      startTime: new Date(),
      endTime: null,
      actionsPerformed: [],
      dataAccessed: []
    };

    // Track all offline actions
    this.metrics.offlineSessions.push(session);

    // Send to analytics when back online
    window.addEventListener('online', () => {
      session.endTime = new Date();
      this.sendAnalytics(session);
    });
  }

  trackDataAccess(dataType: string, id: string) {
    const key = `${dataType}:${id}`;
    const current = this.metrics.dataAccessPatterns.get(key) || 0;
    this.metrics.dataAccessPatterns.set(key, current + 1);
  }

  async generateReport() {
    return {
      totalOfflineTime: this.calculateOfflineTime(),
      mostAccessedOffline: this.getMostAccessed(),
      syncSuccessRate: this.calculateSyncSuccess(),
      averageConflicts: this.getAverageConflicts(),
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations() {
    const patterns = Array.from(this.metrics.dataAccessPatterns.entries());
    const frequent = patterns.filter(([_, count]) => count > 10);

    return {
      priorityCache: frequent.map(([key]) => key.split(':')[0]),
      offlineFeatures: this.identifyOfflineFeatureNeeds(),
      syncOptimizations: this.suggestSyncImprovements()
    };
  }
}

```

## User Education

### Offline Mode Tutorial

```tsx
// components/OfflineTutorial.tsx
export function OfflineTutorial() {
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('offline-tutorial-seen');
    if (!seen && !navigator.onLine) {
      setHasSeenTutorial(false);
    }
  }, []);

  if (hasSeenTutorial) return null;

  return (
    <Modal isOpen={true} onClose={() => setHasSeenTutorial(true)}>
      <div className="offline-tutorial">
        <h2>Working Offline with WedSync</h2>

        <div className="tutorial-sections">
          <Section
            icon="save"
            title="Automatic Saving"
            description="All your work is saved locally and will sync when you're back online"
          />

          <Section
            icon="sync"
            title="Smart Sync"
            description="We'll automatically sync your changes in the background"
          />

          <Section
            icon="check"
            title="What Works Offline"
            items={[
              'Viewing cached wedding details',
              'Filling out forms',
              'Adding notes',
              'Viewing timelines'
            ]}
          />

          <Section
            icon="x"
            title="Needs Connection"
            items={[
              'Sending messages',
              'Processing payments',
              'Downloading new content',
              'Real-time collaboration'
            ]}
          />
        </div>

        <div className="tutorial-footer">
          <button onClick={() => {
            localStorage.setItem('offline-tutorial-seen', 'true');
            setHasSeenTutorial(true);
          }}>
            Got it!
          </button>
        </div>
      </div>
    </Modal>
  );
}

```

## Implementation Checklist

### Phase 1: Basic Offline (Week 1)

- [ ]  Set up IndexedDB schema
- [ ]  Implement basic service worker caching
- [ ]  Create offline detection system
- [ ]  Build offline indicator component
- [ ]  Add form draft auto-saving

### Phase 2: Sync System (Week 2)

- [ ]  Build sync queue manager
- [ ]  Implement background sync
- [ ]  Add conflict resolution
- [ ]  Create sync status UI
- [ ]  Handle failed sync retries

### Phase 3: Smart Caching (Week 3)

- [ ]  Implement predictive caching
- [ ]  Add usage analytics
- [ ]  Build cache management UI
- [ ]  Optimize storage usage
- [ ]  Add data pruning

### Phase 4: Polish (Week 4)

- [ ]  Create offline tutorial
- [ ]  Add comprehensive error handling
- [ ]  Implement offline testing suite
- [ ]  Optimize performance
- [ ]  Add monitoring and analytics

## Best Practices

### Do's

1. **Cache aggressively** for wedding day data
2. **Provide clear feedback** about offline status
3. **Save user work** automatically and frequently
4. **Test on real devices** with poor connectivity
5. **Handle conflicts** gracefully with user control
6. **Optimize storage** to prevent quota issues
7. **Educate users** about offline capabilities

### Don'ts

1. **Don't cache sensitive data** without encryption
2. **Don't assume connectivity** - always check
3. **Don't block UI** during sync operations
4. **Don't lose user data** - always save locally first
5. **Don't ignore sync failures** - notify and retry
6. **Don't cache everything** - be selective
7. **Don't forget cleanup** - prune old data

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: IndexedDB quota exceeded**

```tsx
// Solution: Implement storage management
async function handleQuotaExceeded() {
  // Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    const persistent = await navigator.storage.persist();
    if (!persistent) {
      // Clean up old data
      await pruneOldCache();
    }
  }
}

```

**Issue: Sync conflicts after extended offline period**

```tsx
// Solution: Implement smart conflict resolution
async function resolveExtendedOfflineConflicts() {
  // Get all local changes
  const localChanges = await db.syncQueue
    .where('status')
    .equals('pending')
    .toArray();

  // Batch process with server
  const conflicts = await api.batchResolveConflicts(localChanges);

  // Let user review conflicts
  if (conflicts.length > 0) {
    showConflictReviewModal(conflicts);
  }
}

```

**Issue: Service worker not updating**

```tsx
// Solution: Implement update flow
navigator.serviceWorker.addEventListener('controllerchange', () => {
  // New service worker activated
  showToast('App updated! Refresh for new features.', {
    action: {
      label: 'Refresh',
      onClick: () => window.location.reload()
    }
  });
});

```

## Success Metrics

### Key Performance Indicators

- **Offline usage rate**: % of users who work offline
- **Sync success rate**: % of successful syncs vs failures
- **Data freshness**: Average age of cached data
- **Conflict rate**: Conflicts per 100 sync operations
- **Storage efficiency**: Average storage used per user
- **Recovery time**: Time to sync after coming online
- **User satisfaction**: Offline experience rating

### Monitoring Dashboard

```tsx
// Real-time offline metrics
interface OfflineMetricsDashboard {
  current: {
    offlineUsers: number;
    pendingSyncs: number;
    activeConflicts: number;
    storageUsage: number;
  };

  trends: {
    offlineSessionDuration: number[];
    syncFailureRate: number[];
    conflictResolutionTime: number[];
  };

  alerts: {
    highSyncFailures: boolean;
    storageNearLimit: boolean;
    extendedOfflineUsers: User[];
  };
}

```

## Conclusion

This offline functionality ensures that WedSync and WedMe remain reliable tools even in challenging connectivity situations common at wedding venues. By implementing intelligent caching, robust sync mechanisms, and clear user feedback, the platform provides a seamless experience whether online or offline. The focus on wedding-day critical data ensures that suppliers always have access to the information they need most, when they need it most.