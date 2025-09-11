/**
 * WS-196 Team D: Offline Data Synchronization Tests
 * 
 * Comprehensive test suite for offline sync manager functionality
 * Testing conflict resolution, wedding-specific business logic, and sync strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineDataSyncManager, SyncableData, ConflictResolutionStrategy } from '../sync-manager';
// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn().mockResolvedValue({
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([])
      })
    })
  })
};
// Mock fetch
const mockFetch = vi.fn();
// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: vi.fn(),
  close: vi.fn()
global.indexedDB = mockIndexedDB as any;
global.fetch = mockFetch;
global.BroadcastChannel = vi.fn().mockImplementation(() => mockBroadcastChannel);
describe('OfflineDataSyncManager', () => {
  let syncManager: OfflineDataSyncManager;
  beforeEach(() => {
    syncManager = new OfflineDataSyncManager({
      appName: 'WedSync',
      version: 1,
      stores: ['pendingSync', 'conflictLog', 'syncMetadata']
    });
    // Clear all mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
  });
  afterEach(async () => {
    await syncManager.clearAll();
  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(syncManager).toBeDefined();
      expect(BroadcastChannel).toHaveBeenCalledWith('wedsync-sync-channel');
  describe('Data Storage', () => {
    it('should save data for offline sync', async () => {
      const testData: SyncableData = {
        id: 'booking-123',
        type: 'booking',
        operation: 'update',
        data: {
          id: 'booking-123',
          client_name: 'Sarah & John',
          wedding_date: '2024-06-15',
          status: 'confirmed'
        },
        endpoint: '/api/bookings/123',
        timestamp: Date.now(),
        priority: 'high',
        retries: 0
      };
      await syncManager.saveForOfflineSync(testData);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('WedSync-OfflineSync', 1);
    it('should handle different data types', async () => {
      const formData: SyncableData = {
        id: 'form-456',
        type: 'form',
        operation: 'create',
          title: 'Wedding Questionnaire',
          fields: [
            { name: 'venue_preference', type: 'text' }
          ]
        endpoint: '/api/forms',
        priority: 'medium',
      await syncManager.saveForOfflineSync(formData);
      expect(mockIndexedDB.open).toHaveBeenCalled();
  describe('Sync Operations', () => {
    beforeEach(() => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      });
    it('should trigger sync for pending items', async () => {
      // Mock pending sync items
      const mockStore = {
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'booking-123',
            type: 'booking',
            operation: 'update',
            data: { client_name: 'Updated Name' },
            endpoint: '/api/bookings/123',
            timestamp: Date.now() - 60000, // 1 minute ago
            priority: 'high',
            retries: 0
          }
        ]),
        delete: vi.fn().mockResolvedValue(undefined)
      mockIndexedDB.open.mockResolvedValue({
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue(mockStore)
        })
      const result = await syncManager.triggerSync();
      expect(mockFetch).toHaveBeenCalledWith('/api/bookings/123', expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ client_name: 'Updated Name' })
      }));
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    it('should handle sync failures with retry logic', async () => {
      // Mock failed API response
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal Server Error' })
            id: 'form-456',
            type: 'form',
            operation: 'create',
            data: { title: 'New Form' },
            endpoint: '/api/forms',
            timestamp: Date.now(),
            priority: 'medium',
        put: vi.fn().mockResolvedValue(undefined)
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        retries: 1
    it('should respect priority ordering in sync queue', async () => {
            id: 'low-priority',
            priority: 'low',
            timestamp: Date.now() - 120000,
            endpoint: '/api/test/1'
          },
            id: 'high-priority',
            timestamp: Date.now() - 60000,
            endpoint: '/api/test/2'
            id: 'critical-priority',
            priority: 'critical',
            timestamp: Date.now() - 30000,
            endpoint: '/api/test/3'
      await syncManager.triggerSync();
      // Verify critical priority was synced first
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/test/3', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/test/2', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/test/1', expect.any(Object));
  describe('Conflict Resolution', () => {
    describe('Booking conflicts', () => {
      it('should favor server for payment status conflicts', async () => {
        const localData = {
          payment_status: 'pending',
          last_modified: Date.now() - 60000
        };
        const serverData = {
          payment_status: 'paid',
          last_modified: Date.now() - 30000
        const resolved = await syncManager.handleSyncConflict('booking', localData, serverData);
        expect(resolved.payment_status).toBe('paid'); // Server wins
        expect(resolved.conflict_resolved).toBe(true);
      it('should favor client for recent non-payment updates', async () => {
          client_name: 'Updated Client Name',
          notes: 'Updated notes',
          client_name: 'Old Client Name',
          notes: 'Old notes',
        expect(resolved.client_name).toBe('Updated Client Name'); // Client wins (more recent)
        expect(resolved.notes).toBe('Updated notes');
    describe('Form submission conflicts', () => {
      it('should favor client for form submissions within 5 minutes', async () => {
          id: 'form-456',
          responses: { venue_preference: 'Garden' },
          submitted_at: Date.now() - 120000 // 2 minutes ago
          responses: { venue_preference: 'Church' },
          submitted_at: Date.now() - 300000 // 5 minutes ago
        const resolved = await syncManager.handleSyncConflict('form_submission', localData, serverData);
        expect(resolved.responses.venue_preference).toBe('Garden'); // Client wins (recent submission)
      it('should favor server for old form submissions', async () => {
          submitted_at: Date.now() - 600000 // 10 minutes ago
        expect(resolved.responses.venue_preference).toBe('Church'); // Server wins (more recent)
    describe('Communication conflicts', () => {
      it('should preserve all messages and merge communications', async () => {
          id: 'comm-789',
          messages: [
            { id: 'msg-1', content: 'Hello', timestamp: Date.now() - 60000 },
            { id: 'msg-3', content: 'New message', timestamp: Date.now() - 30000 }
            { id: 'msg-2', content: 'Response', timestamp: Date.now() - 45000 }
        const resolved = await syncManager.handleSyncConflict('communication', localData, serverData);
        expect(resolved.messages).toHaveLength(3);
        expect(resolved.messages.map((m: any) => m.id)).toContain('msg-1');
        expect(resolved.messages.map((m: any) => m.id)).toContain('msg-2');
        expect(resolved.messages.map((m: any) => m.id)).toContain('msg-3');
    describe('Default conflict resolution', () => {
      it('should use timestamp-based resolution for unknown types', async () => {
          id: 'unknown-123',
          data: 'local',
          data: 'server',
        const resolved = await syncManager.handleSyncConflict('unknown_type', localData, serverData);
        expect(resolved.data).toBe('local'); // Local wins (more recent)
  describe('Background Sync', () => {
    it('should register background sync if available', () => {
      // Mock ServiceWorkerRegistration
      const mockRegistration = {
        sync: {
          register: vi.fn().mockResolvedValue(undefined)
        }
      global.navigator = {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration)
      } as any;
      syncManager.scheduleBackgroundSync('high');
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync-high');
  describe('Cross-device Sync', () => {
    it('should broadcast sync completion to other tabs', async () => {
        json: vi.fn().mockResolvedValue({ success: true })
            id: 'test-sync',
            endpoint: '/api/test',
            data: { test: true }
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'sync-completed',
        syncId: expect.any(String),
        successful: 1,
        failed: 0,
        timestamp: expect.any(Number)
  describe('Data Cleanup', () => {
    it('should clear all offline data', async () => {
        clear: vi.fn().mockResolvedValue(undefined)
      await syncManager.clearAll();
      expect(mockStore.clear).toHaveBeenCalledTimes(3); // For all stores
    it('should get sync statistics', async () => {
          { priority: 'high' },
          { priority: 'medium' },
          { priority: 'high' }
        ])
      const stats = await syncManager.getSyncStats();
      expect(stats.totalPending).toBe(3);
      expect(stats.highPriority).toBe(2);
      expect(stats.mediumPriority).toBe(1);
      expect(stats.lowPriority).toBe(0);
  describe('Error Handling', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      mockIndexedDB.open.mockRejectedValue(new Error('IndexedDB not available'));
        id: 'test-123',
        data: { test: true },
        endpoint: '/api/test',
      // Should not throw
      await expect(syncManager.saveForOfflineSync(testData)).resolves.not.toThrow();
    it('should handle network errors during sync', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
  describe('Wedding-specific Business Logic', () => {
    it('should handle timeline updates with proper conflict resolution', async () => {
      const localTimeline = [
        { id: '1', time: '14:00', event: 'Ceremony', vendor: 'Garden Venue' },
        { id: '2', time: '15:30', event: 'Photos', vendor: 'Pro Photography', updated_locally: true }
      ];
      const serverTimeline = [
        { id: '2', time: '15:30', event: 'Photos', vendor: 'Different Photography' },
        { id: '3', time: '17:00', event: 'Reception', vendor: 'Catering Co' }
      const localData = { id: 'wedding-123', timeline: localTimeline };
      const serverData = { id: 'wedding-123', timeline: serverTimeline };
      const resolved = await syncManager.handleSyncConflict('timeline', localData, serverData);
      // Should preserve local changes and merge new server items
      expect(resolved.timeline).toHaveLength(3);
      expect(resolved.timeline.find((item: any) => item.id === '2').vendor).toBe('Pro Photography');
      expect(resolved.timeline.find((item: any) => item.id === '3')).toBeDefined();
    it('should prioritize payment-related booking updates', async () => {
      const paymentData: SyncableData = {
        id: 'payment-update',
        data: { payment_status: 'paid', amount_paid: 5000 },
        endpoint: '/api/bookings/payment',
        priority: 'critical', // Should be automatically set for payment updates
      await syncManager.saveForOfflineSync(paymentData);
      expect(paymentData.priority).toBe('critical');
});
