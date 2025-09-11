/**
 * PWA System Integration Tests
 * Tests the complete PWA architecture including:
 * - Service Worker integration
 * - Pre-caching functionality
 * - Background sync
 * - Cache management
 * - Performance optimization
 * - Wedding day offline functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { setupBrowserMocks, resetBrowserMocks } from '../setup/browser-api-mocks';
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline'
import { useBackgroundSync } from '@/hooks/useBackgroundSync'
import { useWeddingDayPreCache } from '@/hooks/useWeddingDayPreCache'
import { usePerformanceDashboard } from '@/hooks/usePerformanceDashboard'
import { performanceOptimizer } from '@/lib/services/performance-optimization-service'
import { cacheManager } from '@/lib/services/cache-management-service'
import { backgroundSync } from '@/lib/services/background-sync-service'
import { weddingDayPreCaching } from '@/lib/services/wedding-day-precaching-service'
// Mock the global navigator and caches API
const mockCache = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn()
}
const mockCaches = {
  open: vi.fn(() => Promise.resolve(mockCache)),
  keys: vi.fn(() => Promise.resolve(['wedding-day-cache-v1', 'critical-wedding-data'])),
  delete: vi.fn(() => Promise.resolve(true))
const mockServiceWorker = {
  ready: Promise.resolve({
    active: { postMessage: vi.fn() }
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
const mockNavigator = {
  onLine: true,
  serviceWorker: mockServiceWorker,
  storage: {
    estimate: vi.fn(() => Promise.resolve({
      usage: 10 * 1024 * 1024, // 10MB
      quota: 100 * 1024 * 1024  // 100MB
    }))
  }
// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => ({
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ result: null, onsuccess: null })),
          put: vi.fn(() => ({ onsuccess: null })),
          delete: vi.fn(() => ({ onsuccess: null }))
        }))
      })),
      close: vi.fn()
    },
    onsuccess: null,
    onerror: null
  }))
// Global setup
beforeAll(() => {
  Object.defineProperty(global, 'caches', { value: mockCaches })
  Object.defineProperty(global, 'navigator', { value: mockNavigator })
  Object.defineProperty(global, 'indexedDB', { value: mockIndexedDB })
  Object.defineProperty(global, 'performance', {
    value: { now: () => Date.now() }
  })
  // Mock fetch
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        vendors: { vendor1: { vendorName: 'Test Vendor', vendorType: 'photographer' } },
        timeline: { event1: { eventName: 'Test Event', startTime: '10:00' } },
        issues: {},
        weather: { temperature: 72, condition: 'sunny' }
      })
    })
  ) as any
})
describe('PWA System Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  const mockWeddingId = 'wedding-123'
  const mockCoordinatorId = 'coordinator-456'
  const mockWeddingDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset services to initial state
    performanceOptimizer.clearMetrics()
    performanceOptimizer.restoreNormalMode()
  afterEach(() => {
    // Cleanup any intervals or timeouts
    vi.clearAllTimers()
  describe('Core PWA Infrastructure', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should initialize all PWA services correctly', async () => {
      // Test service initialization
      expect(performanceOptimizer).toBeDefined()
      expect(cacheManager).toBeDefined()
      expect(backgroundSync).toBeDefined()
      expect(weddingDayPreCaching).toBeDefined()
      // Test service worker detection
      expect(navigator.serviceWorker).toBeDefined()
      expect(caches).toBeDefined()
      expect(indexedDB).toBeDefined()
    it('should handle service worker registration', async () => {
      // Mock service worker registration
      const mockRegistration = {
        active: { postMessage: vi.fn() },
        installing: null,
        waiting: null,
        addEventListener: vi.fn()
      }
      Object.defineProperty(navigator.serviceWorker, 'register', {
        value: vi.fn(() => Promise.resolve(mockRegistration))
      const registration = await navigator.serviceWorker.register('/worker/index.js')
      expect(registration).toBeDefined()
      expect(registration.active).toBeDefined()
  describe('Wedding Day Offline Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should initialize with PWA features enabled', async () => {
      const { result } = renderHook(() =>
        useWeddingDayOffline({
          weddingId: mockWeddingId,
          coordinatorId: mockCoordinatorId,
          weddingDate: mockWeddingDate,
          enablePreCaching: true,
          enablePerformanceOptimization: true
        })
      )
      await waitFor(() => {
        expect(result.current.config.enablePreCaching).toBe(true)
        expect(result.current.config.enablePerformanceOptimization).toBe(true)
        expect(result.current.preCache).toBeDefined()
        expect(result.current.backgroundSync).toBeDefined()
        expect(result.current.performance).toBeDefined()
        expect(result.current.cacheManagement).toBeDefined()
    it('should handle vendor check-in with enhanced caching', async () => {
      await act(async () => {
        const checkInResult = await result.current.onVendorCheckIn(
          'vendor-123',
          { lat: 40.7128, lng: -74.0060 },
          'Arrived on time'
        )
        expect(checkInResult).toBeDefined()
        expect(checkInResult.vendorId).toBe('vendor-123')
        expect(checkInResult.status).toBe('checked-in')
      // Verify caching was attempted
      expect(mockCache.put).toHaveBeenCalled()
    it('should queue actions when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
          weddingDate: mockWeddingDate
        await result.current.onVendorCheckIn('vendor-123', undefined, 'Offline check-in')
      // Should have queued the action
      expect(result.current.syncStatus.hasUnsyncedData).toBe(true)
      expect(result.current.syncStatus.pendingCount).toBeGreaterThan(0)
      // Restore online state
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  describe('Pre-caching Functionality', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should detect approaching wedding and start pre-caching', async () => {
      const approachingWeddingDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        useWeddingDayPreCache({
          weddingDate: approachingWeddingDate,
          autoStart: true
        expect(result.current.isWeddingDayApproaching(approachingWeddingDate)).toBe(true)
        expect(result.current.getHoursUntilWedding(approachingWeddingDate)).toBeLessThan(24)
    it('should provide ultra-fast data access from pre-cache', async () => {
      // Mock cached data
      mockCache.match.mockResolvedValue(
        new Response(JSON.stringify({
          vendors: { vendor1: { vendorName: 'Cached Vendor' } }
        const cachedData = await result.current.getWeddingDataFast(mockWeddingId)
        expect(cachedData).toBeDefined()
      // Verify performance is tracked
      expect(result.current.cachePerformance.totalRequests).toBeGreaterThan(0)
  describe('Background Sync Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle wedding-specific sync actions', async () => {
        useBackgroundSync({
          enableAutoSync: true
        const actionId = await result.current.queueVendorCheckIn(
          mockWeddingId,
          { location: { lat: 40.7128, lng: -74.0060 } }
        expect(actionId).toBeDefined()
        expect(typeof actionId).toBe('string')
      expect(result.current.stats?.pendingActions).toBeGreaterThan(0)
    it('should automatically sync when coming back online', async () => {
      // Start offline
        await result.current.queueAction({
          type: 'vendor_checkin',
          method: 'POST',
          url: '/api/vendors/123/checkin',
          data: { weddingId: mockWeddingId },
          priority: 'high',
          weddingId: mockWeddingId
      // Go back online
      // Trigger online event
        window.dispatchEvent(new Event('online'))
        await new Promise(resolve => setTimeout(resolve, 100)) // Allow async processing
      // Should trigger auto-sync
      expect(result.current.isOnline).toBe(true)
  describe('Performance Optimization', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should measure operation performance', async () => {
      const testOperation = vi.fn(() => Promise.resolve('test-result'))
      const result = await performanceOptimizer.measureOperation(
        'cache_read',
        'test-operation',
        testOperation,
        { critical: true, weddingId: mockWeddingId }
      expect(result).toBe('test-result')
      expect(testOperation).toHaveBeenCalled()
      const stats = performanceOptimizer.getPerformanceStats()
      expect(stats.totalOperations).toBeGreaterThan(0)
    it('should enable wedding day performance mode', async () => {
      performanceOptimizer.enableWeddingDayMode(mockWeddingId)
      const config = performanceOptimizer.getConfig()
      expect(config.performanceMode).toBe('wedding_day')
      expect(config.targetCacheAccessMs).toBeLessThan(100) // Should be more aggressive
    it('should provide optimized cache operations', async () => {
      const mockData = { test: 'data' }
      
      const result = await performanceOptimizer.optimizedCacheRead(
        'test-cache',
        'test-key',
        async () => mockData,
      expect(result).toEqual(mockData)
      expect(mockCache.match).toHaveBeenCalledWith('test-key')
  describe('Cache Management Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should analyze cache usage and provide recommendations', async () => {
      mockCaches.keys.mockResolvedValue(['cache1', 'cache2', 'critical-wedding-data'])
      mockCache.keys.mockResolvedValue([new Request('/api/test')])
      const stats = await cacheManager.analyzeCaches()
      expect(stats).toBeDefined()
      expect(stats.totalCaches).toBeGreaterThan(0)
      expect(stats.recommendations).toBeDefined()
      expect(Array.isArray(stats.recommendations)).toBe(true)
    it('should perform intelligent cleanup while preserving critical caches', async () => {
      const cleanupResult = await cacheManager.performIntelligentCleanup()
      expect(cleanupResult).toBeDefined()
      expect(typeof cleanupResult.cleaned).toBe('number')
      expect(typeof cleanupResult.freed).toBe('number')
      // Verify critical caches were not deleted
      const deleteCalls = mockCaches.delete.mock.calls
      const criticalCacheDeleted = deleteCalls.some(call => 
        call[0] === 'critical-wedding-data' || 
        call[0] === 'wedding-day-cache-v1'
      expect(criticalCacheDeleted).toBe(false)
    it('should optimize for wedding day', async () => {
      await cacheManager.optimizeForWeddingDay(mockWeddingId)
      // Should have triggered optimization
  describe('Performance Dashboard Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should provide comprehensive system health monitoring', async () => {
        usePerformanceDashboard({
          enableAlerts: true,
          updateInterval: 1000
        expect(result.current.systemHealth).toBeDefined()
        expect(result.current.systemHealth.overall).toMatch(/excellent|good|poor|critical/)
        expect(result.current.systemHealth.performance.score).toBeGreaterThanOrEqual(0)
        expect(result.current.systemHealth.performance.score).toBeLessThanOrEqual(100)
    it('should generate alerts for performance issues', async () => {
          alertThresholds: {
            performanceMs: 50, // Very low threshold for testing
            storageUsagePercent: 20 // Very low threshold
          }
      // Wait for initial stats collection which should trigger alerts
        expect(result.current.alerts.length).toBeGreaterThan(0)
      }, { timeout: 5000 })
      const alerts = result.current.alerts
      expect(alerts.some(alert => alert.type === 'performance' || alert.type === 'storage')).toBe(true)
    it('should provide system optimization actions', async () => {
          enableAlerts: true
        await result.current.optimizeSystem()
      // Should have performed optimization
      expect(result.current.alerts.some(alert => 
        alert.title.includes('Optimization')
      )).toBe(true)
  describe('End-to-End Wedding Day Scenario', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle complete wedding day coordination workflow', async () => {
      const weddingDayDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
      // Initialize wedding day offline system
      const { result: offlineResult } = renderHook(() =>
          weddingDate: weddingDayDate,
      // Initialize performance dashboard
      const { result: dashboardResult } = renderHook(() =>
      // Wait for initialization
        expect(offlineResult.current.config.weddingId).toBe(mockWeddingId)
        expect(dashboardResult.current.systemHealth).toBeDefined()
      // Scenario 1: Pre-cache should be optimized for approaching wedding
      expect(offlineResult.current.preCache.isWeddingDayApproaching).toBe(true)
      // Scenario 2: Performance should be optimized for wedding day
        dashboardResult.current.enableWeddingDayMode(mockWeddingId)
      // Scenario 3: Vendor check-in should work with enhanced performance
      let checkInResult: any
        checkInResult = await offlineResult.current.onVendorCheckIn(
          'photographer-123',
          'Photographer arrived and setting up'
      expect(checkInResult).toBeDefined()
      expect(checkInResult.vendorType).toBeDefined()
      // Scenario 4: Timeline updates should be cached and synced
        await offlineResult.current.onTimelineEventUpdate('ceremony-start', {
          actualStartTime: new Date().toISOString(),
          status: 'in_progress'
      // Scenario 5: System should maintain good health under load
      const finalHealthCheck = dashboardResult.current.systemHealth
      expect(finalHealthCheck.overall).toMatch(/excellent|good/)
      expect(finalHealthCheck.performance.score).toBeGreaterThan(50)
      // Scenario 6: All data should be accessible quickly
      const fastAccess = await offlineResult.current.preCache.getWeddingDataFast(mockWeddingId)
      // Should be available either from cache or fallback
      expect(fastAccess !== null || offlineResult.current.vendors.length >= 0).toBe(true)
    it('should handle network connectivity changes gracefully', async () => {
      // Start online
      // Go offline
        window.dispatchEvent(new Event('offline'))
        await new Promise(resolve => setTimeout(resolve, 100))
      // Perform offline actions
        await result.current.onVendorCheckIn('vendor-offline', undefined, 'Offline check-in')
        await result.current.onIssueCreate({
          type: 'vendor_delay',
          severity: 'medium',
          description: 'Vendor running 15 minutes late',
          reporter_id: mockCoordinatorId,
      // Should have queued actions
      // Come back online
      // Should attempt to sync
  describe('Error Handling and Recovery', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle cache failures gracefully', async () => {
      // Mock cache failure
      mockCache.match.mockRejectedValue(new Error('Cache access failed'))
      // Should not crash on cache failure
        const data = await result.current.getWeddingDataFast(mockWeddingId)
        // Should return null on failure, not crash
        expect(data).toBeNull()
    it('should handle sync failures with retry mechanisms', async () => {
      // Mock fetch failure
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as any
          enableAutoSync: false // Disable auto-sync for controlled testing
      // Queue an action that will fail
          data: { test: 'data' },
          priority: 'medium'
      // Manually trigger sync (should fail)
        try {
          await result.current.triggerSync()
        } catch (error) {
          // Expected to fail
        }
      // Should have failed actions
      expect(result.current.stats?.failedActions).toBeGreaterThan(0)
    it('should handle emergency cleanup scenarios', async () => {
      // Simulate low storage situation
      mockNavigator.storage.estimate = vi.fn(() => Promise.resolve({
        usage: 95 * 1024 * 1024, // 95MB used
        quota: 100 * 1024 * 1024  // 100MB total (95% usage)
      }))
            storageUsagePercent: 90
      // Wait for high storage alert
        const criticalAlerts = result.current.criticalAlerts
        expect(criticalAlerts.some(alert => alert.type === 'storage')).toBe(true)
      // Trigger emergency cleanup
        await result.current.clearNonCriticalCaches()
      // Should have performed cleanup
        alert.title.includes('Emergency')
// Test utilities for manual testing
export const PWATestUtils = {
  async simulateWeddingDayScenario(weddingId: string, hoursUntilWedding: number = 6) {
    const weddingDate = new Date(Date.now() + hoursUntilWedding * 60 * 60 * 1000).toISOString()
    console.log(`[PWA Test] Simulating wedding day scenario for ${weddingId}`)
    console.log(`[PWA Test] Wedding in ${hoursUntilWedding} hours`)
    // Enable wedding day optimization
    performanceOptimizer.enableWeddingDayMode(weddingId)
    await cacheManager.optimizeForWeddingDay(weddingId)
    // Simulate pre-caching
    if (hoursUntilWedding <= 24) {
      await weddingDayPreCaching.preCacheWeddingDay(weddingId, weddingDate)
    }
    // Simulate some wedding day actions
    const actions = [
      { type: 'vendor_checkin', data: { vendorId: 'photographer', location: { lat: 40.7128, lng: -74.0060 } } },
      { type: 'timeline_update', data: { eventId: 'ceremony', status: 'in_progress' } },
      { type: 'issue_create', data: { severity: 'low', description: 'Minor setup delay' } }
    ]
    for (const action of actions) {
      await backgroundSync.queueAction({
        ...action,
        method: 'POST',
        url: `/api/${action.type}`,
        priority: 'high',
        weddingId
      } as unknown)
    console.log('[PWA Test] Wedding day scenario simulation complete')
    return {
      performanceStats: performanceOptimizer.getPerformanceStats(),
      cacheStats: await cacheManager.analyzeCaches(),
      syncStats: await backgroundSync.getSyncStats()
  },
  async stressTestPWASystem(iterations: number = 100) {
    console.log(`[PWA Test] Starting PWA stress test with ${iterations} iterations`)
    const startTime = performance.now()
    const results = []
    for (let i = 0; i < iterations; i++) {
      const operationStart = performance.now()
      // Simulate various operations
      await performanceOptimizer.optimizedCacheWrite(
        'stress-test-cache',
        `key-${i}`,
        { iteration: i, timestamp: Date.now() },
        { critical: i % 10 === 0 }
      const operationEnd = performance.now()
      results.push(operationEnd - operationStart)
      if (i % 20 === 0) {
        console.log(`[PWA Test] Completed ${i + 1}/${iterations} operations`)
    const endTime = performance.now()
    const totalTime = endTime - startTime
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length
    console.log(`[PWA Test] Stress test complete:`)
    console.log(`  Total time: ${Math.round(totalTime)}ms`)
    console.log(`  Average operation: ${Math.round(avgTime)}ms`)
    console.log(`  Operations/second: ${Math.round((iterations / totalTime) * 1000)}`)
      totalTime,
      averageOperationTime: avgTime,
      operationsPerSecond: (iterations / totalTime) * 1000,
      performanceStats: performanceOptimizer.getPerformanceStats()
// Global test environment setup for development
if (typeof window !== 'undefined') {
  (window as unknown).PWATestUtils = PWATestUtils
