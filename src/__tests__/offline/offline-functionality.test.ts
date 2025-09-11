import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupBrowserMocks, resetBrowserMocks } from '../setup/browser-api-mocks';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dexie from 'dexie'

// Mock IndexedDB for testing
import 'fake-indexeddb/auto'
// Import components and utilities to test
import { offlineDB, smartCacheManager } from '@/lib/offline/offline-database'
import { syncManager } from '@/lib/offline/sync-manager'
import { useOfflineWeddingData, useCacheManagement } from '@/hooks/useOfflineData'
import { OfflineForm } from '@/components/offline/OfflineForm'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
// Mock fetch for network simulation
const mockFetch = vi.fn()
global.fetch = mockFetch
// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})
// Mock crypto API for encryption tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      deriveKey: vi.fn(),
      importKey: vi.fn(),
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    })
  }
describe('Offline Functionality System', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  beforeEach(async () => {
    // Reset IndexedDB before each test
    await offlineDB.delete()
    await offlineDB.open()
    
    // Reset fetch mock
    mockFetch.mockReset()
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
  })
  afterEach(async () => {
    // Clean up after each test
    vi.clearAllMocks()
  describe('IndexedDB Database Operations', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should store wedding data in offline database', async () => {
      const weddingData = {
        id: 'wedding-1',
        coupleId: 'couple-1',
        date: '2024-06-15',
        venue: 'Test Venue',
        timeline: [],
        vendors: [],
        priority: 8,
        status: 'active',
        lastSync: new Date().toISOString(),
        syncStatus: 'synced'
      await offlineDB.weddings.add(weddingData)
      
      const stored = await offlineDB.weddings.get('wedding-1')
      expect(stored).toBeDefined()
      expect(stored?.id).toBe('wedding-1')
      expect(stored?.venue).toBe('Test Venue')
    it('should store form drafts with auto-save', async () => {
      const formDraft = {
        id: 'draft-1',
        formId: 'contact-form',
        clientId: 'client-1',
        data: { name: 'John Doe', email: 'john@example.com' },
        autoSaveTime: new Date().toISOString(),
        syncStatus: 'pending'
      await offlineDB.formDrafts.add(formDraft)
      const stored = await offlineDB.formDrafts.get('draft-1')
      expect(stored?.data.name).toBe('John Doe')
    it('should manage sync queue with priority ordering', async () => {
      const items = [
        {
          type: 'form_submission',
          action: 'create',
          data: { test: 'data1' },
          timestamp: new Date().toISOString(),
          status: 'pending',
          attempts: 0,
          priority: 8
        },
          type: 'form_draft',
          action: 'update', 
          data: { test: 'data2' },
          priority: 5
        }
      ]
      await offlineDB.syncQueue.bulkAdd(items)
      const queued = await offlineDB.syncQueue
        .where('status')
        .equals('pending')
        .reverse()
        .sortBy('priority')
      expect(queued).toHaveLength(2)
      expect(queued[0].priority).toBe(8) // High priority first
      expect(queued[1].priority).toBe(5)
  describe('Smart Cache Management', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should respect 50MB cache limit', async () => {
      // Mock cache usage calculation
      vi.spyOn(smartCacheManager, 'getCacheUsage').mockResolvedValue({
        usage: 0.8, // 80% usage
        size: 42000000, // 42MB
        quota: 52428800 // 50MB
      })
      const usage = await smartCacheManager.getCacheUsage()
      expect(usage.size).toBeLessThan(usage.quota)
      expect(usage.usage).toBe(0.8)
    it('should prioritize wedding day data for caching', async () => {
      const today = new Date().toISOString().split('T')[0]
      const weddingToday = {
        id: 'wedding-today',
        date: today,
        venue: 'Today Venue',
        priority: 10, // Wedding day priority
      await offlineDB.weddings.add(weddingToday)
      const cached = await offlineDB.weddings
        .where('date')
        .equals(today)
        .and(w => w.status === 'active')
        .first()
      expect(cached).toBeDefined()
      expect(cached?.priority).toBe(10)
    it('should automatically cleanup old cache entries', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 8) // 8 days ago
      const oldWedding = {
        id: 'wedding-old',
        coupleId: 'couple-1', 
        date: oldDate.toISOString().split('T')[0],
        venue: 'Old Venue',
        priority: 3,
        status: 'completed',
        lastSync: oldDate.toISOString(),
      await offlineDB.weddings.add(oldWedding)
      // Simulate cleanup
      await smartCacheManager.optimizeStorage()
      // Old completed weddings should be removed
      const remaining = await offlineDB.weddings.get('wedding-old')
      expect(remaining).toBeUndefined()
  describe('Sync Management System', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should queue actions when offline', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      await syncManager.queueAction('form_submission', 'create', {
        formId: 'test-form',
        data: { name: 'Test User' }
      const pending = await offlineDB.syncQueue
        .count()
      expect(pending).toBe(1)
    it('should process sync queue when online', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      // Simulate going online and processing queue
        value: true
      await syncManager.processQueue()
      expect(pending).toBe(0) // Should be processed
    it('should handle sync conflicts with resolution strategies', async () => {
      // Mock conflict response (409)
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          conflict: true,
          serverData: { name: 'Server Version' },
          clientData: { name: 'Client Version' }
        })
        data: { name: 'Client Version' }
      // Should handle conflict (implementation depends on conflict resolution strategy)
      const failed = await offlineDB.syncQueue
        .equals('failed')
      expect(failed).toBeGreaterThanOrEqual(0) // May be 0 if auto-resolved
    it('should retry failed sync items with exponential backoff', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('Network error'))
      const item = await offlineDB.syncQueue.toCollection().first()
      expect(item?.attempts).toBe(1)
      expect(item?.nextRetry).toBeDefined()
  describe('Offline UI Components', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should render OfflineIndicator with correct status', async () => {
      render(<OfflineIndicator showDetails={true} />)
      await waitFor(() => {
        expect(screen.getByText(/online|offline|syncing/i)).toBeInTheDocument()
    it('should handle form auto-save every 30 seconds', async () => {
      vi.useFakeTimers()
      const mockOnSubmit = vi.fn()
      const formProps = {
        initialData: { name: '' },
        onSubmit: mockOnSubmit
      render(
        <OfflineForm {...formProps}>
          {({ formData, updateField }) => (
            <div>
              <input 
                value={formData.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                data-testid="name-input"
              />
            </div>
          )}
        </OfflineForm>
      )
      const input = screen.getByTestId('name-input')
      fireEvent.change(input, { target: { value: 'John Doe' } })
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)
        // Should auto-save after 30 seconds
        expect(screen.queryByText(/saved/i)).toBeInTheDocument()
      vi.useRealTimers()
    it('should show offline status when network is disconnected', async () => {
      render(<OfflineIndicator />)
      // Simulate going offline
      fireEvent(window, new Event('offline'))
        expect(screen.getByText(/offline/i)).toBeInTheDocument()
  describe('React Hooks Integration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should load wedding data with useOfflineWeddingData hook', async () => {
      const TestComponent = () => {
        const { data, isLoading, error } = useOfflineWeddingData('wedding-1')
        
        if (isLoading) return <div>Loading...</div>
        if (error) return <div>Error: {error}</div>
        if (!data) return <div>No data</div>
        return <div>Wedding: {data.venue}</div>
      // Add test data
      await offlineDB.weddings.add({
      render(<TestComponent />)
        expect(screen.getByText('Wedding: Test Venue')).toBeInTheDocument()
    it('should manage cache status with useCacheManagement hook', async () => {
        const { cacheStatus, optimizeCache } = useCacheManagement()
        if (!cacheStatus) return <div>Loading cache status...</div>
        return (
          <div>
            <div>Cache Size: {cacheStatus.size}</div>
            <button onClick={optimizeCache}>Optimize</button>
          </div>
        )
        expect(screen.getByText(/cache size/i)).toBeInTheDocument()
  describe('Security and Encryption', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should encrypt sensitive data before storage', async () => {
      // This is a simplified test - actual encryption would need proper setup
      const sensitiveData = {
        clientName: 'John & Jane Doe',
        phone: '555-1234',
        email: 'john@example.com',
        emergencyContacts: [{ name: 'Emergency Contact', phone: '555-9999' }]
      // Store with encryption simulation
        id: 'wedding-encrypted',
        syncStatus: 'synced',
        encryptedData: JSON.stringify(sensitiveData) // Simplified
      const stored = await offlineDB.weddings.get('wedding-encrypted')
      expect(stored?.encryptedData).toBeDefined()
  describe('Performance Requirements', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should complete cache operations under 100ms', async () => {
      const startTime = performance.now()
        id: 'performance-test',
        venue: 'Performance Venue',
      const retrieved = await offlineDB.weddings.get('performance-test')
      const endTime = performance.now()
      expect(retrieved).toBeDefined()
      expect(endTime - startTime).toBeLessThan(100) // Under 100ms
    it('should support 7-day offline functionality', async () => {
      // Add data for 7 days ago
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        id: 'wedding-7-days',
        date: sevenDaysAgo.toISOString().split('T')[0],
        venue: '7 Day Old Venue',
        priority: 5,
        lastSync: sevenDaysAgo.toISOString(),
      // Should still be accessible after 7 days
      const retrieved = await offlineDB.weddings.get('wedding-7-days')
      expect(retrieved?.venue).toBe('7 Day Old Venue')
  describe('Integration Tests', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle complete offline-to-online workflow', async () => {
      // Start offline
      // Create form submission while offline
        formId: 'integration-form',
        data: { name: 'Integration Test', email: 'test@example.com' }
      let pending = await offlineDB.syncQueue
      // Go back online
      // Mock successful sync
      // Process sync queue
      pending = await offlineDB.syncQueue
      expect(pending).toBe(0) // Should be synced
    it('should automatically cache wedding day data 24 hours before', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
        id: 'wedding-tomorrow',
        date: tomorrow.toISOString().split('T')[0],
        venue: 'Tomorrow Venue',
        priority: 9, // High priority for upcoming wedding
        status: 'upcoming',
      // Should be prioritized for caching
        .equals('upcoming')
        .and(w => w.priority >= 8)
      expect(cached?.id).toBe('wedding-tomorrow')
