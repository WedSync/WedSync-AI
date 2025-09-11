# WedSync Comprehensive Data Synchronization System

A bulletproof, offline-first synchronization system designed specifically for WedSync wedding planning platform, with intelligent conflict resolution and wedding day priority management.

## Overview

The WedSync sync system provides:

- **Offline-First Architecture**: Works seamlessly offline with automatic sync when connectivity returns
- **Intelligent Conflict Resolution**: Field-level conflict detection with three-way merge algorithms
- **Wedding Day Priority Management**: Enhanced priority for coordinators and time-sensitive operations
- **Real-time Status Monitoring**: Comprehensive progress tracking and error handling
- **Role-Based Synchronization**: Optimized sync behavior for different user roles

## Core Components

### 1. Core Sync Engine (`core-sync-engine.ts`)
The foundation of the sync system, handling queue processing and network synchronization.

```typescript
import { coreSyncEngine } from '@/lib/sync/core-sync-engine'

// Add item to sync queue
const itemId = await coreSyncEngine.addToQueue({
  type: 'timeline_update',
  action: 'update',
  data: { eventId: '123', startTime: '2024-06-15T14:00:00Z' },
  weddingId: 'wedding-456',
  userRole: 'coordinator',
  isWeddingDay: true
})

// Process sync queue
const result = await coreSyncEngine.processSyncQueue()
```

### 2. Conflict Resolver (`conflict-resolver.ts`)
Advanced conflict resolution with wedding day priority logic.

```typescript
import { conflictResolver } from '@/lib/sync/conflict-resolver'

const conflict = {
  entityType: 'timeline',
  entityId: 'ceremony-start',
  conflictFields: [
    {
      field: 'startTime',
      localValue: '14:00:00Z',
      serverValue: '14:15:00Z',
      conflictType: 'content',
      priority: 'critical'
    }
  ],
  isWeddingDay: true,
  currentUserRole: 'coordinator'
}

const resolution = await conflictResolver.resolveConflict(conflict)
```

### 3. Priority Manager (`sync-priority-manager.ts`)
Intelligent priority calculation based on user role, wedding day status, and content type.

```typescript
import { syncPriorityManager } from '@/lib/sync/sync-priority-manager'

const context = {
  weddingDate: '2024-06-15T16:00:00Z',
  userRole: 'coordinator',
  isActiveCoordinator: true,
  locationContext: 'venue'
}

const analysis = syncPriorityManager.calculatePriority(syncItem, context)
// Returns: { finalPriority: 10, explanation: "Wedding Day Coordinator Priority" }
```

### 4. Status Monitor (`sync-status-monitor.ts`)
Real-time monitoring and progress tracking.

```typescript
import { syncStatusMonitor } from '@/lib/sync/sync-status-monitor'

// Listen for status changes
syncStatusMonitor.on('statusChange', (status) => {
  console.log('Sync status updated:', status)
})

// Add conflict alert
syncStatusMonitor.addConflictAlert({
  entityType: 'vendor',
  entityId: 'florist-123',
  severity: 'high',
  message: 'Vendor check-in time conflict detected',
  requiresImmediateAttention: true
})
```

### 5. Comprehensive Sync Manager (`comprehensive-sync-manager.ts`)
Main orchestrator integrating all components.

```typescript
import { comprehensiveSyncManager } from '@/lib/sync/comprehensive-sync-manager'

// Initialize with wedding context
await comprehensiveSyncManager.initialize()
comprehensiveSyncManager.updateConfig({
  weddingId: 'wedding-456',
  weddingDate: '2024-06-15T16:00:00Z',
  userRole: 'coordinator',
  weddingDayMode: true,
  isActiveCoordinator: true
})

// Queue sync item
const itemId = await comprehensiveSyncManager.queueSyncItem({
  type: 'issue_create',
  action: 'create',
  data: { 
    title: 'Venue access blocked',
    severity: 'critical'
  }
})

// Perform manual sync
const result = await comprehensiveSyncManager.performSync()
```

## React Integration

### Using the Hook
The `useComprehensiveSync` hook provides easy integration with React components:

```tsx
import { useComprehensiveSync } from '@/hooks/useComprehensiveSync'

function WeddingDayDashboard() {
  const sync = useComprehensiveSync({
    weddingId: 'wedding-456',
    weddingDate: '2024-06-15T16:00:00Z',
    userRole: 'coordinator',
    weddingDayMode: true,
    conflictNotifications: true
  })

  const handleTimelineUpdate = async (eventId: string, updates: any) => {
    // Queue the update for sync
    await sync.queueItem({
      type: 'timeline_update',
      action: 'update',
      data: { eventId, ...updates }
    })
  }

  return (
    <div>
      <SyncStatus 
        status={sync.status}
        conflicts={sync.conflicts}
        onManualSync={sync.sync}
      />
      
      {/* Your wedding day UI */}
    </div>
  )
}
```

### Role-Specific Hooks

```tsx
// Wedding day coordinator
const sync = useWeddingDaySync(weddingId, weddingDate)

// Vendor at venue
const sync = useVendorSync(weddingId, 'photographer')

// Wedding planner
const sync = usePlannerSync({ 
  enableRealTimeUpdates: true,
  conflictNotifications: true 
})
```

### Enhanced Sync Status Component

```tsx
import { EnhancedSyncStatus } from '@/components/sync/EnhancedSyncStatus'

<EnhancedSyncStatus
  weddingId="wedding-456"
  weddingDate="2024-06-15T16:00:00Z"
  userRole="coordinator"
  isWeddingDay={true}
  variant="full" // 'compact' | 'full' | 'dashboard'
  showMetrics={true}
/>
```

## Priority System

The sync system uses intelligent priority calculation based on multiple factors:

### Priority Levels (1-10)
- **10**: Wedding day coordinator changes (absolute highest)
- **9**: Critical issues, wedding day timeline updates
- **8**: Wedding day vendor check-ins, critical timeline events
- **7**: High-priority issues, coordinator changes (non-wedding day)
- **5-6**: Normal priority updates (vendor, photographer, planner)
- **3-4**: Regular updates, form submissions
- **1-2**: Draft saves, social actions

### Wedding Day Priority Rules
1. **Active coordinator decisions take precedence** (Priority 10)
2. **Wedding day vendor and photographer updates** (Priority 9)
3. **Planning phase updates from primary planner** (Priority 7)
4. **Guest responses and general updates** (Priority 5)

### Example Priority Calculations

```typescript
// Wedding day coordinator updating ceremony time
const item = {
  type: 'timeline_update',
  data: { eventId: 'ceremony', startTime: '15:00:00Z' },
  userRole: 'coordinator',
  isWeddingDay: true
}
// Priority: 10 - Immediate processing

// Vendor checking in on wedding day
const item = {
  type: 'vendor_checkin',
  data: { vendorId: 'florist-123', status: 'arrived' },
  userRole: 'vendor',
  isWeddingDay: true
}
// Priority: 8 - High priority batch

// Planner updating guest list (pre-wedding)
const item = {
  type: 'client_update',
  data: { guestCount: 150 },
  userRole: 'planner',
  isWeddingDay: false
}
// Priority: 5 - Normal processing
```

## Conflict Resolution

The system handles conflicts using multiple strategies:

### 1. Last Writer Wins (Simple Cases)
For non-critical fields where the most recent change should take precedence.

### 2. Three-Way Merge (Complex Cases)
Uses base, local, and server versions to intelligently merge changes.

### 3. Wedding Day Coordinator Priority
Active wedding day coordinator decisions always win.

### 4. Field-Level Resolution
Different strategies for different field types:

```typescript
// Timeline conflicts
if (field === 'startTime' && isWeddingDay && userRole === 'coordinator') {
  return localValue // Coordinator wins
}

// Issue severity escalation
if (field === 'severity') {
  return highestSeverity(localValue, serverValue) // Always escalate
}

// Vendor status progression
if (field === 'status') {
  return mostAdvancedStatus(localValue, serverValue) // Progress forward
}
```

### Conflict Resolution Example

```typescript
// Resolve conflict manually
const success = await sync.resolveConflict({
  conflictId: 'conflict-123',
  entityType: 'timeline',
  entityId: 'ceremony-start',
  userResolution: 'local', // 'local' | 'server' | 'custom'
  skipSimilar: true // Learn from this resolution
})

// Automatic resolution based on rules
const resolution = await conflictResolver.resolveConflict({
  entityType: 'timeline',
  entityId: 'ceremony-start',
  isWeddingDay: true,
  currentUserRole: 'coordinator',
  conflictFields: [/* ... */]
})
```

## Network Handling & Retry Logic

### Exponential Backoff
Failed sync items are retried with exponential backoff:

```typescript
// Retry schedule
attempt 1: 1 second delay
attempt 2: 2 second delay  
attempt 3: 4 second delay
attempt 4: 8 second delay
attempt 5: 16 second delay
max delay: 30 seconds
```

### Connection Monitoring
The system automatically detects network changes and triggers sync when connectivity is restored.

```typescript
// Automatic sync on reconnection
window.addEventListener('online', () => {
  coreSyncEngine.processSyncQueue()
})

// Smart retry based on network quality
const retryDelay = networkQuality === 'poor' ? 
  baseDelay * 3 : baseDelay
```

## Performance Optimizations

### Batching
Items are processed in intelligent batches:
- **Critical items**: Batch size 5, immediate processing
- **High priority**: Batch size 8, fast processing  
- **Normal priority**: Batch size 10, regular processing

### Caching
- **50MB cache limit** with intelligent cleanup
- **7-day offline support** for cached wedding data
- **<100ms cache operations** using IndexedDB with Dexie
- **Wedding day automatic caching** (24h before events)

### Queue Management
- **Priority-based queue** sorting
- **Duplicate prevention** using checksums
- **Memory management** with configurable limits

## Error Handling

The system provides comprehensive error handling:

### Error Types
1. **Network errors**: Connectivity issues, timeouts
2. **Conflict errors**: Data conflicts requiring resolution
3. **Validation errors**: Invalid data format or content
4. **System errors**: Database access, memory issues

### Error Recovery
```typescript
try {
  await sync.performSync()
} catch (error) {
  if (error.type === 'network') {
    // Will automatically retry with backoff
  } else if (error.type === 'conflict') {
    // User intervention required
    showConflictResolutionUI(error.conflicts)
  } else {
    // Log error and notify user
    console.error('Sync failed:', error)
  }
}
```

## Wedding Day Mode

Special enhanced mode for wedding day operations:

### Features
- **15-second auto-sync interval** (vs 30-second normal)
- **Manual conflict resolution** for safety
- **Enhanced monitoring** and logging
- **Notification support** for critical conflicts
- **Priority coordinator access** override

### Activation
```typescript
comprehensiveSyncManager.updateConfig({
  weddingDayMode: true,
  isActiveCoordinator: true,
  autoSyncInterval: 15,
  conflictResolutionMode: 'manual'
})
```

## Monitoring and Analytics

### Real-time Metrics
- **Success rate** tracking
- **Average processing time** monitoring
- **Network quality** assessment
- **Queue health** indicators

### Event Logging
```typescript
// Access sync log
const log = sync.exportSyncLog()
// Returns detailed event history with timestamps

// Monitor sync events
syncStatusMonitor.on('progress', (event) => {
  console.log(`Sync progress: ${event.type}`, event.data)
})
```

## Security Considerations

### Data Encryption
Sensitive data is encrypted in the offline cache:

```typescript
// Automatic encryption for sensitive fields
const sensitiveFields = ['phone', 'email', 'personalNotes', 'emergencyContacts']
const encryptedData = await encryptSensitiveData(syncItem.data)
```

### Conflict Safety
- **Wedding day conflicts** require manual resolution
- **Critical field changes** are flagged for review
- **User permission checks** before applying remote changes

## Testing

### Unit Tests
```bash
npm test sync/
```

### Integration Tests  
```bash
npm test integration/sync
```

### E2E Wedding Day Scenarios
```bash
npm test e2e/wedding-day-sync
```

## Troubleshooting

### Common Issues

**Sync stuck in processing**
```typescript
// Check sync status
const status = sync.getSyncStatus()
if (status.isProcessing && !status.estimatedSyncTime) {
  // Reset sync state
  comprehensiveSyncManager.destroy()
  await comprehensiveSyncManager.initialize()
}
```

**Conflicts not resolving**
```typescript
// Check pending conflicts
const conflicts = sync.getPendingConflicts()
conflicts.forEach(conflict => {
  if (conflict.requiresImmediateAttention) {
    // Manual resolution required
    sync.resolveConflict({...})
  }
})
```

**High memory usage**
```typescript
// Clear sync history
sync.clearSyncHistory()

// Check cache size
const db = await offlineDB.getCacheMetrics()
if (db.totalSize > 45 * 1024 * 1024) { // > 45MB
  // Cleanup will trigger automatically
}
```

### Debug Mode
```typescript
const sync = useComprehensiveSync({
  debugMode: true, // Enables detailed console logging
  conflictNotifications: true
})
```

## Best Practices

### 1. Queue Management
```typescript
// Queue related changes together
await Promise.all([
  sync.queueItem({ type: 'timeline_update', ... }),
  sync.queueItem({ type: 'vendor_checkin', ... }),
  sync.queueItem({ type: 'issue_update', ... })
])

// Then sync once
await sync.sync()
```

### 2. Conflict Prevention
```typescript
// Include user metadata to prevent conflicts
await sync.queueItem({
  type: 'timeline_update',
  data: { 
    eventId: 'ceremony',
    startTime: newTime,
    lastModifiedBy: userId,
    lastModifiedAt: new Date().toISOString()
  }
})
```

### 3. Wedding Day Preparation
```typescript
// Enable wedding day mode 24 hours before
if (isWithin24Hours(weddingDate)) {
  sync.updateConfig({ weddingDayMode: true })
}

// Pre-cache wedding data
await offlineDB.cacheWeddingData(weddingData, 1) // Priority 1
```

### 4. Error Handling
```typescript
// Always handle sync errors gracefully
try {
  await sync.sync()
} catch (error) {
  // Don't block UI - sync will retry automatically
  showToast('Changes queued for sync', 'info')
}
```

## API Reference

See individual component files for complete API documentation:
- [Core Sync Engine API](./core-sync-engine.ts)
- [Conflict Resolver API](./conflict-resolver.ts)
- [Priority Manager API](./sync-priority-manager.ts)
- [Status Monitor API](./sync-status-monitor.ts)
- [Comprehensive Manager API](./comprehensive-sync-manager.ts)

## Contributing

When contributing to the sync system:

1. **Write tests** for all new functionality
2. **Update documentation** for API changes  
3. **Consider wedding day impact** for any changes
4. **Test offline scenarios** thoroughly
5. **Validate conflict resolution** logic

## License

This sync system is part of the WedSync platform and follows the same licensing terms.