import { SyncEventManager, SyncEventType, SyncPriority } from '@/lib/offline/background-sync';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SyncCoordinator } from '@/lib/offline/sync-coordinator';
import { SyncProgressTracker, ExtendedSyncOperation, WeddingProgressContext } from '@/lib/offline/progress-tracker';
import { FailureRecoveryManager } from '@/lib/offline/failure-recovery';
import { NetworkMonitor } from '@/lib/offline/network-monitor';
import { StorageOptimizer } from '@/lib/pwa/storage-optimizer';

// Mock external dependencies
vi.mock('@/lib/pwa/storage-optimizer');
// Mock Service Worker
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: vi.fn().mockResolvedValue(undefined),
    },
  }),
};
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
  },
  writable: true,
});
// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request = new EventTarget();
    setTimeout(() => {
      const event = new Event('success');
      Object.defineProperty(event, 'target', {
        value: {
          result: {
            transaction: vi.fn().mockReturnValue({
              objectStore: vi.fn().mockReturnValue({
                add: vi.fn(),
                get: vi.fn(),
                delete: vi.fn(),
                put: vi.fn(),
              }),
            }),
          },
        },
      });
      request.dispatchEvent(event);
    }, 0);
    return request;
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
// Mock fetch for network tests
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;
// Mock StorageOptimizer
const mockStorageOptimizer = {
  analyzeStorage: vi.fn().mockResolvedValue({
    totalSize: 1000000,
    usedSize: 500000,
    availableSize: 500000,
    categories: {
      images: 200000,
      documents: 150000,
      cache: 100000,
      userData: 50000,
    recommendations: [],
  optimizeStorage: vi.fn().mockResolvedValue(undefined),
(StorageOptimizer as ReturnType<typeof vi.fn>).mockImplementation(() => mockStorageOptimizer);
describe('Background Sync Integration Tests', () => {
  let syncEventManager: SyncEventManager;
  let syncCoordinator: SyncCoordinator;
  let progressTracker: SyncProgressTracker;
  let failureRecoveryManager: FailureRecoveryManager;
  let networkMonitor: NetworkMonitor;
  beforeEach(() => {
    // Initialize all components
    syncEventManager = new SyncEventManager();
    syncCoordinator = new SyncCoordinator();
    progressTracker = new SyncProgressTracker();
    failureRecoveryManager = new FailureRecoveryManager();
    networkMonitor = new NetworkMonitor();
    vi.clearAllMocks();
  });
  afterEach(() => {
    // Cleanup all components
    syncEventManager.destroy();
    syncCoordinator.destroy();
    progressTracker.destroy();
    failureRecoveryManager.destroy();
    networkMonitor.destroy();
  describe('End-to-End Sync Flow', () => {
    it('should complete a full sync operation successfully', async () => {
      const mockRetryOperation = vi.fn().mockResolvedValue({ 
        success: true, 
        data: 'synced successfully' 
      // 1. Start progress tracking
      const operation: ExtendedSyncOperation = {
        id: 'integration-test-1',
        type: SyncEventType.CLIENT_DATA_SYNC,
        data: { clientId: 'client-1', updates: ['timeline', 'vendors'] },
        priority: SyncPriority.MEDIUM,
        estimatedSize: 500000,
        estimatedDuration: 30000,
      };
      const progress = progressTracker.startTracking(operation);
      expect(progress.operationId).toBe('integration-test-1');
      // 2. Coordinate sync through coordinator
      const coordinationResult = await syncCoordinator.coordinateSync(operation);
      expect(coordinationResult.success).toBe(true);
      expect(coordinationResult.syncEventId).toBeDefined();
      // 3. Update progress
      progressTracker.updateProgress('integration-test-1', {
        percentage: 50,
        status: 'uploading',
      const updatedProgress = progressTracker.getProgress('integration-test-1');
      expect(updatedProgress?.percentage).toBe(50);
      // 4. Complete the operation
      progressTracker.completeOperation('integration-test-1', {
        success: true,
        message: 'Client data synced successfully',
        syncedItems: 10,
      const completedProgress = progressTracker.getProgress('integration-test-1');
      expect(completedProgress?.status).toBe('completed');
      expect(completedProgress?.completionResult?.syncedItems).toBe(10);
    });
    it('should handle sync failure and recovery flow', async () => {
      let attemptCount = 0;
      const mockRetryOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ success: true, data: 'recovered' });
        id: 'failure-recovery-test',
        type: SyncEventType.VENDOR_COMMUNICATION,
        data: { vendorId: 'vendor-1', message: 'urgent update' },
        priority: SyncPriority.HIGH,
      // 1. Start tracking
      // 2. Simulate initial failure
      const error = new Error('Network timeout');
      const context = {
        operationId: 'failure-recovery-test',
        operationType: SyncEventType.VENDOR_COMMUNICATION,
        attemptCount: 1,
        retryOperation: mockRetryOperation,
      // 3. Handle failure with recovery manager
      const recoveryResult = await failureRecoveryManager.handleFailure(error, context);
      // Should eventually recover after retries
      expect(recoveryResult.recovered).toBe(true);
      expect(mockRetryOperation).toHaveBeenCalledTimes(3); // 2 failures + 1 success
      // 4. Update progress to reflect recovery
      progressTracker.updateProgress('failure-recovery-test', {
        status: 'completed',
        percentage: 100,
        userMessage: 'Successfully recovered after network issues',
      const finalProgress = progressTracker.getProgress('failure-recovery-test');
      expect(finalProgress?.status).toBe('completed');
    it('should handle wedding event day priority escalation', async () => {
      const eventDayOperation: ExtendedSyncOperation = {
        id: 'event-day-critical',
        type: SyncEventType.GUEST_LIST_UPDATE,
        data: { guestId: 'guest-1', status: 'arrived' },
        priority: SyncPriority.CRITICAL,
        estimatedDuration: 10000,
      const eventDayContext: WeddingProgressContext = {
        weddingId: 'wedding-123',
        eventDate: Date.now(), // Today is the wedding day
        isEventDay: true,
        coordinatorName: 'Sarah Johnson',
        guestImpact: true,
        vendorCritical: false,
      // 1. Start tracking with event day context
      const progress = progressTracker.startTracking(eventDayOperation, eventDayContext);
      expect(progress.contextIndicators).toContain('Event Day');
      expect(progress.weddingContext?.isEventDay).toBe(true);
      // 2. Coordinate sync with event day optimizations
      const coordinationResult = await syncCoordinator.coordinateSync({
        ...eventDayOperation,
      expect(coordinationResult.weddingOptimizations?.isEventDay).toBe(true);
      expect(coordinationResult.weddingOptimizations?.optimizations).toContain('priority_boost');
      // 3. If failure occurs, should escalate quickly
      const error = new Error('Critical failure on event day');
      const failureContext = {
        operationId: 'event-day-critical',
        operationType: SyncEventType.GUEST_LIST_UPDATE,
        eventTime: Date.now() + 3600000, // Ceremony in 1 hour
      const recoveryResult = await failureRecoveryManager.handleFailure(error, failureContext);
      expect(recoveryResult.escalated).toBe(true);
      expect(recoveryResult.weddingSpecificActions).toContain('coordinator_notification');
  describe('Network Quality Adaptation', () => {
    it('should adapt sync strategy based on network conditions', async () => {
      // 1. Test with excellent network quality
      const excellentNetworkState = {
        isOnline: true,
        quality: 'excellent' as any,
        metrics: {
          bandwidth: 15,
          latency: 30,
          packetLoss: 0,
          stability: 0.98,
        venueProfile: null,
        lastUpdated: Date.now(),
      // Simulate network monitor updating state
      networkMonitor['currentState'] = excellentNetworkState;
      const highQualityOperation = {
        id: 'high-quality-sync',
        type: SyncEventType.MEDIA_UPLOAD,
        data: { files: [{ size: 10000000 }] }, // 10MB file
      const excellentResult = await syncCoordinator.coordinateSync(highQualityOperation);
      expect(excellentResult.strategy.maxConcurrentSyncs).toBe(5);
      expect(excellentResult.strategy.batchSize).toBe(50);
      // 2. Test with poor network quality
      const poorNetworkState = {
        quality: 'poor' as any,
          bandwidth: 0.5,
          latency: 800,
          packetLoss: 8,
          stability: 0.4,
        venueProfile: {
          name: 'Remote Mountain Venue',
          averageBandwidth: 0.3,
          reliabilityScore: 0.4,
          peakHours: ['18:00-22:00'],
      networkMonitor['currentState'] = poorNetworkState;
      const poorNetworkResult = await syncCoordinator.coordinateSync(highQualityOperation);
      expect(poorNetworkResult.strategy.maxConcurrentSyncs).toBe(1);
      expect(poorNetworkResult.strategy.batchSize).toBe(5);
      expect(poorNetworkResult.strategy.compressionLevel).toBe(9);
    it('should handle network state transitions during sync', async () => {
        id: 'network-transition-test',
        data: { updates: ['large-dataset'] },
        estimatedDuration: 60000, // Long operation
      // 1. Start with good network
      progressTracker.startTracking(operation);
      // 2. Simulate network degradation mid-sync
      const degradedNetworkState = {
        quality: 'fair' as any,
          bandwidth: 2,
          latency: 300,
          packetLoss: 4,
          stability: 0.6,
      // Simulate network state change
      networkMonitor.emit('state-change', degradedNetworkState);
      // 3. Update progress tracking to reflect network impact
      progressTracker.updateProgress('network-transition-test', {
        percentage: 40,
        networkImpact: {
          currentSpeed: 2,
          estimatedTimeRemaining: 90000, // Increased due to poor network
          retryCount: 1,
          qualityLevel: 'fair',
      const progressWithNetworkImpact = progressTracker.getProgress('network-transition-test');
      expect(progressWithNetworkImpact?.networkImpact?.qualityLevel).toBe('fair');
      expect(progressWithNetworkImpact?.estimatedTimeRemaining).toBeGreaterThan(60000);
  describe('Concurrent Operations Management', () => {
    it('should handle multiple simultaneous sync operations', async () => {
      const operations = [
        {
          id: 'concurrent-op-1',
          type: SyncEventType.CLIENT_DATA_SYNC,
          data: { clientId: 'client-1' },
          priority: SyncPriority.HIGH,
          id: 'concurrent-op-2',
          type: SyncEventType.VENDOR_COMMUNICATION,
          data: { vendorId: 'vendor-1' },
          priority: SyncPriority.MEDIUM,
          id: 'concurrent-op-3',
          type: SyncEventType.GUEST_LIST_UPDATE,
          data: { guestId: 'guest-1' },
          priority: SyncPriority.LOW,
      ];
      // 1. Start tracking all operations
      const progressResults = operations.map(op =>
        progressTracker.startTracking(op as ExtendedSyncOperation)
      );
      expect(progressResults).toHaveLength(3);
      expect(progressTracker.getAllProgress()).toHaveLength(3);
      // 2. Coordinate all syncs
      const coordinationPromises = operations.map(op =>
        syncCoordinator.coordinateSync(op)
      const coordinationResults = await Promise.all(coordinationPromises);
      // All should succeed
      expect(coordinationResults.every(result => result.success)).toBe(true);
      // 3. Update progress for all operations concurrently
      const updatePromises = operations.map((op, index) =>
        progressTracker.updateProgress(op.id, {
          percentage: 50 + (index * 10),
          status: 'uploading',
        })
      await Promise.all(updatePromises);
      // Verify all updates
      const allProgress = progressTracker.getAllProgress();
      expect(allProgress.every(progress => progress.percentage >= 50)).toBe(true);
      // 4. Complete operations with different outcomes
      progressTracker.completeOperation('concurrent-op-1', { success: true });
      progressTracker.completeOperation('concurrent-op-2', { success: true });
      progressTracker.completeOperation('concurrent-op-3', { success: false, error: 'Test failure' });
      const finalProgress = progressTracker.getAllProgress();
      const completedCount = finalProgress.filter(p => p.status === 'completed').length;
      const failedCount = finalProgress.filter(p => p.status === 'failed').length;
      expect(completedCount).toBe(2);
      expect(failedCount).toBe(1);
    it('should prioritize operations correctly under resource constraints', async () => {
      // Simulate constrained network environment
      const constrainedNetworkState = {
          bandwidth: 1,
          latency: 600,
          packetLoss: 6,
          stability: 0.5,
      networkMonitor['currentState'] = constrainedNetworkState;
      const prioritizedOperations = [
          id: 'critical-op',
          data: { emergency: true },
          priority: SyncPriority.CRITICAL,
          weddingId: 'wedding-123',
          isEventDay: true,
          id: 'high-op',
          data: { urgent: true },
          id: 'medium-op',
          data: { routine: true },
          id: 'low-op',
          type: SyncEventType.TIMELINE_CHANGES,
          data: { minor: true },
      // Start all operations
      prioritizedOperations.forEach(op => {
        progressTracker.startTracking(op as ExtendedSyncOperation);
      // Coordinate with resource constraints
      const coordinationResults = await Promise.all(
        prioritizedOperations.map(op => syncCoordinator.coordinateSync(op))
      // Critical and high priority should get better resource allocation
      const criticalResult = coordinationResults[0];
      const lowResult = coordinationResults[3];
      expect(criticalResult.strategy.maxConcurrentSyncs).toBeGreaterThanOrEqual(
        lowResult.strategy.maxConcurrentSyncs
      // Event day critical operation should have immediate priority boost
      expect(criticalResult.weddingOptimizations?.isEventDay).toBe(true);
      expect(criticalResult.weddingOptimizations?.optimizations).toContain('priority_boost');
  describe('Storage Management Integration', () => {
    it('should trigger storage optimization for large operations', async () => {
      // Mock storage constraint scenario
      mockStorageOptimizer.analyzeStorage.mockResolvedValue({
        totalSize: 1000000,
        usedSize: 950000, // 95% full
        availableSize: 50000,
        categories: {
          images: 600000,
          documents: 200000,
          cache: 100000,
          userData: 50000,
        recommendations: ['clear_old_cache', 'compress_images'],
      const largeMediaOperation = {
        id: 'large-media-sync',
        data: { 
          files: Array(20).fill(null).map((_, i) => ({ 
            id: `file-${i}`, 
            size: 5000000 // 5MB each = 100MB total
          }))
        estimatedSize: 100000000, // 100MB
      // Start tracking
      progressTracker.startTracking(largeMediaOperation as ExtendedSyncOperation);
      // Coordinate sync - should trigger storage optimization
      const result = await syncCoordinator.coordinateSync(largeMediaOperation);
      expect(result.success).toBe(true);
      expect(mockStorageOptimizer.analyzeStorage).toHaveBeenCalled();
      expect(mockStorageOptimizer.optimizeStorage).toHaveBeenCalled();
      expect(result.storageOptimizations).toBeDefined();
      expect(result.storageOptimizations?.optimizationPerformed).toBe(true);
    it('should handle storage quota exceeded scenarios', async () => {
      const storageQuotaError = new Error('QuotaExceededError: Storage limit reached');
      
      const operation = {
        id: 'quota-exceeded-test',
        data: { files: [{ size: 50000000 }] }, // 50MB
        operationId: 'quota-exceeded-test',
        operationType: SyncEventType.MEDIA_UPLOAD,
        clearCache: vi.fn().mockResolvedValue(undefined),
        retryOperation: vi.fn().mockResolvedValue({ success: true }),
      // Handle storage quota failure
      const recoveryResult = await failureRecoveryManager.handleFailure(storageQuotaError, context);
      expect(recoveryResult.cleanupPerformed).toBe(true);
      expect(context.clearCache).toHaveBeenCalled();
      // Update progress to reflect storage cleanup
      progressTracker.updateProgress('quota-exceeded-test', {
        userMessage: 'Upload completed after storage cleanup',
      const finalProgress = progressTracker.getProgress('quota-exceeded-test');
  describe('Event Emission and Cross-Component Communication', () => {
    it('should properly emit and handle events across components', (done) => {
      let eventCount = 0;
      const expectedEvents = 3;
      const checkCompletion = () => {
        eventCount++;
        if (eventCount === expectedEvents) {
          done();
      // Set up event listeners
      progressTracker.on('operation-started', (progress) => {
        expect(progress.operationId).toBe('event-communication-test');
        checkCompletion();
      progressTracker.on('progress-updated', (progress) => {
        expect(progress.percentage).toBe(75);
      progressTracker.on('operation-completed', (result) => {
        expect(result.success).toBe(true);
      // Execute operations that should trigger events
        id: 'event-communication-test',
        data: { clientId: 'client-1' },
      // Start tracking (should emit operation-started)
      // Update progress (should emit progress-updated)
      setTimeout(() => {
        progressTracker.updateProgress('event-communication-test', { percentage: 75 });
      }, 10);
      // Complete operation (should emit operation-completed)
        progressTracker.completeOperation('event-communication-test', { success: true });
      }, 20);
    it('should handle component lifecycle and cleanup properly', async () => {
        id: 'cleanup-test',
        data: {},
      // Start operation
      expect(progressTracker.getAllProgress()).toHaveLength(1);
      // Test cleanup
      progressTracker.destroy();
      syncCoordinator.destroy();
      failureRecoveryManager.destroy();
      // After cleanup, operations should be cleared
      expect(progressTracker.getAllProgress()).toHaveLength(0);
  describe('Real-World Wedding Scenarios', () => {
    it('should handle a complete wedding day sync scenario', async () => {
      const weddingDayContext: WeddingProgressContext = {
        weddingId: 'wedding-2024-06-15',
        eventDate: Date.now(),
        coordinatorName: 'Emily Rodriguez',
        vendorCritical: true,
      const weddingDayOperations: ExtendedSyncOperation[] = [
          id: 'final-guest-count',
          data: { finalCount: 148, lastMinuteChanges: 3 },
          estimatedDuration: 5000,
          id: 'vendor-coordination',
          data: { catererUpdate: 'setup complete', photographerETA: '30min' },
          estimatedDuration: 10000,
          id: 'timeline-final-updates',
          data: { ceremonyDelay: '15min', cocktailHourExtension: true },
          estimatedDuration: 8000,
          id: 'emergency-contact-sync',
          data: { emergencyContacts: ['bride-mother', 'venue-manager'] },
          estimatedDuration: 3000,
      // Start tracking all wedding day operations
      const progressResults = weddingDayOperations.map(op =>
        progressTracker.startTracking(op, weddingDayContext)
      // Verify all operations have event day context
      progressResults.forEach(progress => {
        expect(progress.contextIndicators).toContain('Event Day');
        expect(progress.weddingContext?.isEventDay).toBe(true);
      // Coordinate all operations with event day priorities
        weddingDayOperations.map(op =>
          syncCoordinator.coordinateSync({ ...op, isEventDay: true })
        )
      // All should succeed with priority boosts
      coordinationResults.forEach(result => {
        expect(result.weddingOptimizations?.isEventDay).toBe(true);
      // Simulate some operations completing quickly, others having minor issues
      await new Promise(resolve => setTimeout(resolve, 100));
      // Complete critical operations successfully
      progressTracker.completeOperation('final-guest-count', {
        message: 'Guest list finalized: 148 confirmed',
        syncedItems: 148,
      progressTracker.completeOperation('emergency-contact-sync', {
        message: 'Emergency contacts updated',
        syncedItems: 2,
      // Handle a minor network hiccup for vendor coordination
      const networkError = new Error('Temporary network timeout');
      const vendorContext = {
        operationId: 'vendor-coordination',
        retryOperation: vi.fn().mockResolvedValue({ 
          success: true, 
          data: 'recovered successfully' 
        }),
      const recoveryResult = await failureRecoveryManager.handleFailure(networkError, vendorContext);
      expect(recoveryResult.weddingSpecificActions).toContain('fallback_communication');
      // Complete remaining operations
      progressTracker.completeOperation('vendor-coordination', {
        message: 'Vendor coordination restored',
      progressTracker.completeOperation('timeline-final-updates', {
        message: 'Timeline updates distributed',
      // Verify final state
      const completedOperations = finalProgress.filter(p => p.status === 'completed');
      expect(completedOperations).toHaveLength(4);
      expect(completedOperations.every(op => 
        op.weddingContext?.isEventDay === true
      )).toBe(true);
