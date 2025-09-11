# WedSync Offline Database Architecture - Implementation Guide

## Overview

This comprehensive IndexedDB architecture provides blazing-fast offline functionality for WedSync's wedding coordination platform. It features multi-tier caching, advanced conflict resolution, client-side encryption, and seamless integration with existing Zustand patterns.

## Architecture Components

### 1. Core Database (`offline-database.ts`)
- **Dexie.js-powered IndexedDB** with optimized schema design
- **Multi-table normalization** for weddings, vendors, timeline, issues
- **Advanced indexing** for sub-100ms query performance
- **Automatic cache size management** (50MB limit)

### 2. Security Layer (`offline-encryption.ts`)
- **AES-GCM client-side encryption** for sensitive data
- **Key rotation and management** system
- **Memory-safe operations** with automatic cleanup
- **Secure field-level encryption** for contacts and personal notes

### 3. Conflict Resolution (`conflict-resolution.ts`)
- **Three-way merge algorithms** with operational transformation
- **Priority-based resolution strategies** for wedding day scenarios
- **Automatic conflict detection** and resolution
- **User-guided conflict resolution** for complex scenarios

### 4. Performance Optimizer (`performance-optimizer.ts`)
- **Query optimization and caching** with intelligent indexing
- **Batch operations** for efficient bulk updates
- **Performance monitoring** with sub-100ms targets
- **Mobile browser optimization** for memory constraints

### 5. Advanced Cache Manager (`advanced-cache-manager.ts`)
- **3-tier caching** (Memory, IndexedDB, Service Worker)
- **Wedding day pre-caching** (24h before events)
- **Intelligent eviction policies** based on wedding proximity
- **Cache size monitoring** and automatic cleanup

### 6. Migration System (`migration-system.ts`)
- **Schema versioning** with automatic upgrades
- **Backup and restore** functionality
- **Rollback capabilities** for failed migrations
- **Data preservation** during schema changes

### 7. Integration Layer (`integrated-offline-system.ts`)
- **Seamless Zustand integration** with bidirectional sync
- **Real-time conflict resolution** during operations
- **Performance-optimized data access** patterns
- **React hooks** for easy component integration

## Quick Start Guide

### 1. Installation

The system is already configured with Dexie.js dependency. Simply install packages:

```bash
npm install
```

### 2. Basic Usage in Components

```typescript
import { useIntegratedOfflineSystem } from '@/lib/offline/integrated-offline-system'

function WeddingDayComponent() {
  const {
    systemState,
    getWeddingData,
    updateWeddingData
  } = useIntegratedOfflineSystem()

  const handleVendorCheckIn = async (weddingId: string, vendorId: string) => {
    await updateWeddingData(weddingId, {
      vendors: [{ ...vendor, status: 'checked-in', checkInTime: new Date().toISOString() }]
    }, { immediate: true, priority: 'high' })
  }

  return (
    <div>
      <div>Cache Hit Rate: {systemState.cacheStats.hitRate}%</div>
      <div>Pending Conflicts: {systemState.pendingConflicts}</div>
      {/* Your wedding day UI */}
    </div>
  )
}
```

### 3. Advanced Usage with Direct Database Access

```typescript
import { offlineDB } from '@/lib/database/offline-database'
import { dbOptimizer } from '@/lib/database/performance-optimizer'
import { cacheManager } from '@/lib/cache/advanced-cache-manager'

// High-performance wedding data retrieval
const wedding = await dbOptimizer.getActiveWeddingsOptimized()

// Batch vendor status updates
await dbOptimizer.batchUpdateVendorStatus([
  { weddingId: 'w1', vendorId: 'v1', status: 'checked-in' },
  { weddingId: 'w1', vendorId: 'v2', status: 'on-site' }
])

// Pre-cache critical wedding data
await cacheManager.preloadWeddingData(weddingId)
```

## Key Features Implementation

### Wedding Day Pre-Caching

The system automatically detects weddings within 24 hours and pre-caches all critical data:

```typescript
// Automatic pre-caching runs every 4 hours
// High-priority weddings (today) get memory cache
// Important weddings (next 7 days) get IndexedDB cache
// Normal weddings get service worker cache
```

### Conflict Resolution

When offline changes conflict with server updates:

```typescript
import { conflictResolver } from '@/lib/sync/conflict-resolution'

// Auto-resolve simple conflicts
await conflictResolver.resolveAllAutoResolvable()

// Handle complex conflicts with user choice
const conflicts = conflictResolver.getPendingConflictsByPriority('critical')
for (const conflict of conflicts) {
  const resolution = await getUserChoice(conflict) // Your UI logic
  await conflictResolver.resolveConflict(conflict.id, resolution)
}
```

### Secure Data Storage

Sensitive data is automatically encrypted:

```typescript
import { SecureOfflineStorage } from '@/lib/security/offline-encryption'

// Store wedding data with automatic encryption of sensitive fields
await SecureOfflineStorage.storeWeddingData({
  id: 'wedding-123',
  clientContacts: [...], // Automatically encrypted
  vendorContacts: [...], // Automatically encrypted  
  personalNotes: '...',  // Automatically encrypted
  // Non-sensitive data remains unencrypted for queries
  weddingDate: '2024-06-15',
  venue: { name: 'Grand Hotel' }
})
```

## Performance Optimization

### Query Optimization

The system uses compound indices for optimal query performance:

```typescript
// Optimized queries use compound indices
const events = await dbOptimizer.getTimelineEventsOptimized(
  weddingId,
  { start: '09:00', end: '17:00' } // Time range filter
)

// All operations target <100ms performance
// Cache hit rates >80% for frequently accessed data
```

### Memory Management

Smart cache management keeps memory usage optimal:

```typescript
// 10MB memory cache for active data
// 40MB IndexedDB for recent data  
// 50MB total with service worker fallback
// Automatic eviction based on wedding proximity
```

## Wedding Day Scenarios

### Scenario 1: Vendor Arrives Early

```typescript
// Wedding coordinator updates vendor status
await updateWeddingData(weddingId, {
  vendors: [{
    ...vendor,
    status: 'checked-in',
    checkInTime: new Date().toISOString(),
    location: { lat: venue.lat, lng: venue.lng, address: venue.address }
  }]
}, { priority: 'high', immediate: true })

// Data is immediately cached and queued for server sync
// If offline, change is stored in encrypted action queue
// When online, conflicts are auto-resolved (local coordinator wins)
```

### Scenario 2: Timeline Adjustment

```typescript
// Multiple coordinators update timeline simultaneously
// System detects conflicts and uses operational transformation
const timelineUpdates = [
  { eventId: 'ceremony', updates: { startTime: '14:30' } },
  { eventId: 'cocktails', updates: { startTime: '15:30' } }
]

await dbOptimizer.batchUpdateTimelineEvents(timelineUpdates)

// Automatic buffer time calculation
// Weather-dependent events flagged for monitoring
// Critical events get priority conflict resolution
```

### Scenario 3: Emergency Issue Creation

```typescript
// Critical issue created during wedding
const issueId = await offlineDB.createIssue(weddingId, {
  title: 'Catering Delay',
  description: 'Main course delayed by 30 minutes',
  severity: 'critical',
  category: 'vendor',
  status: 'open',
  reportedBy: coordinatorId,
  affectedEvents: ['dinner', 'speeches']
})

// Issue immediately surfaces in all coordinators' interfaces
// Auto-escalation based on severity and time
// Conflict resolution prioritizes latest status updates
```

## Monitoring and Debugging

### System Health Monitoring

```typescript
const { systemState } = useIntegratedOfflineSystem()

console.log('System Status:', {
  initialized: systemState.isInitialized,
  online: systemState.isOnline,
  syncing: systemState.syncInProgress,
  conflicts: systemState.pendingConflicts,
  cacheHitRate: systemState.cacheStats.hitRate,
  dbVersion: systemState.migrationState.currentVersion
})
```

### Performance Analytics

```typescript
import { dbOptimizer } from '@/lib/database/performance-optimizer'

const report = dbOptimizer.getPerformanceReport()
console.log('Performance Report:', {
  avgQueryTime: report.avgQueryTime,
  cacheHitRate: report.cacheHitRate,
  slowQueries: report.slowQueries,
  topOperations: report.topOperations
})
```

### Debug Tools

All managers are available on the window object for debugging:

```javascript
// Browser DevTools Console
window.offlineDB         // Direct database access
window.cacheManager      // Cache inspection
window.conflictResolver  // Conflict status
window.dbOptimizer       // Performance metrics
window.migrationManager  // Migration status
```

## Migration and Upgrades

### Automatic Migrations

The system handles schema upgrades automatically:

```typescript
// Database versions are managed automatically
// Backups created before major migrations
// Rollback available if migrations fail
// Data transformations preserve existing information
```

### Manual Migration Control

```typescript
import { migrationManager } from '@/lib/database/migration-system'

// Force migration to specific version
await migrationManager.forceMigrationToVersion(6)

// Restore from backup if needed
const backups = migrationManager.getAvailableBackups()
await migrationManager.rollbackToVersion(5)

// Repair database integrity
await migrationManager.repairDatabase()
```

## Best Practices

### 1. Wedding Day Preparation

- **Pre-cache critical data** 24 hours before events
- **Test offline functionality** during rehearsal
- **Verify conflict resolution** works for your team
- **Monitor cache size** and performance

### 2. Data Access Patterns

- **Use optimized queries** from dbOptimizer
- **Leverage caching** for frequently accessed data
- **Batch updates** for better performance
- **Handle conflicts gracefully** in UI

### 3. Error Handling

- **Always handle offline scenarios** in components
- **Provide feedback** for sync status
- **Show conflict resolution** UI when needed
- **Monitor system health** proactively

### 4. Security Considerations

- **Sensitive data** is automatically encrypted
- **Key rotation** happens automatically
- **Memory cleanup** prevents data leaks
- **Audit logs** track all operations

## Troubleshooting

### Common Issues

1. **Slow query performance**: Check if proper indices are used
2. **Cache misses**: Verify pre-caching for critical data
3. **Sync conflicts**: Review conflict resolution strategies
4. **Memory issues**: Monitor cache size and eviction

### Performance Optimization

1. **Use compound indices** for complex queries
2. **Batch operations** for bulk updates
3. **Pre-load critical data** for active weddings
4. **Monitor cache hit rates** and optimize accordingly

### Debug Commands

```typescript
// Clear all offline data
await integratedOfflineSystem.clearAllOfflineData()

// Force full sync
await integratedOfflineSystem.performIncrementalSync()

// Check system status
console.log(integratedOfflineSystem.getSystemState())
```

## System Requirements

### Browser Support
- **Chrome 90+** (recommended)
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

### Performance Targets
- **<100ms** cache operations
- **<50MB** total cache size
- **>80%** cache hit rate
- **7-day** offline support
- **99.9%** data integrity

### Security Features
- **AES-GCM** encryption
- **Key rotation** (annual)
- **Memory safety** (automatic cleanup)
- **Audit logging** (all operations)

## Integration with Existing Code

The system seamlessly integrates with your existing:
- **Zustand stores** - bidirectional sync maintained
- **API endpoints** - same patterns, enhanced with offline
- **React components** - minimal changes required
- **Service workers** - enhanced caching strategies

This architecture provides enterprise-grade offline functionality while maintaining the simplicity and performance your wedding coordination platform requires.