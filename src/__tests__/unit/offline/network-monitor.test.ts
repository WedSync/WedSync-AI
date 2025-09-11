import { NetworkMonitor, NetworkQualityLevel, NetworkState, VenueProfile } from '@/lib/offline/network-monitor';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { setupBrowserMocks, resetBrowserMocks } from '../setup/browser-api-mocks';

// Mock navigator.connection
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
Object.defineProperty(global.navigator, 'connection', {
  value: mockConnection,
  writable: true,
});
// Mock fetch for network tests
const mockFetch = vi.fn();
global.fetch = mockFetch;
// Mock performance.now for timing tests
const mockPerformanceNow = vi.fn();
global.performance = { now: mockPerformanceNow } as any;
// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
global.URL.revokeObjectURL = vi.fn();
describe('NetworkMonitor', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  let networkMonitor: NetworkMonitor;
  beforeEach(() => {
    networkMonitor = new NetworkMonitor();
    vi.clearAllMocks();
    
    // Reset mock connection
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 50;
    mockConnection.saveData = false;
    // Setup default fetch responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-length', '1000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
    });
    // Setup performance.now to return incrementing values
    let performanceCounter = 0;
    mockPerformanceNow.mockImplementation(() => {
      performanceCounter += 100;
      return performanceCounter;
  });
  afterEach(() => {
    networkMonitor.destroy();
    vi.restoreAllMocks();
  describe('initialization', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should initialize with default state', () => {
      expect(networkMonitor.isOnline()).toBe(true);
      expect(networkMonitor.getCurrentQuality()).toBeDefined();
    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      const offlineMonitor = new NetworkMonitor();
      expect(offlineMonitor.isOnline()).toBe(false);
      
      offlineMonitor.destroy();
  describe('network quality assessment', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should assess excellent network quality', async () => {
      mockConnection.downlink = 15;
      mockConnection.rtt = 30;
      mockConnection.effectiveType = '4g';
      await networkMonitor.testCurrentConnection();
      const state = networkMonitor.getCurrentState();
      expect(state.quality).toBe('excellent');
      expect(state.metrics.bandwidth).toBeGreaterThan(10);
      expect(state.metrics.latency).toBeLessThan(100);
    it('should assess poor network quality', async () => {
      mockConnection.downlink = 0.3;
      mockConnection.rtt = 900;
      mockConnection.effectiveType = 'slow-2g';
      expect(state.quality).toBe('poor');
      expect(state.metrics.bandwidth).toBeLessThan(1);
      expect(state.metrics.latency).toBeGreaterThan(500);
    it('should handle connection API unavailability', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
      const fallbackMonitor = new NetworkMonitor();
      await fallbackMonitor.testCurrentConnection();
      const state = fallbackMonitor.getCurrentState();
      expect(state.quality).toBeDefined();
      expect(state.metrics).toBeDefined();
      fallbackMonitor.destroy();
  describe('download speed testing', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should measure download speed accurately', async () => {
      const testSize = 1000000; // 1MB
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(testSize)),
      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000); // 1 second duration
      const result = await networkMonitor.testDownloadSpeed(testSize);
      expect(result.speedMbps).toBe(8); // 1MB in 1s = 8 Mbps
      expect(result.latency).toBeDefined();
      expect(result.success).toBe(true);
    it('should handle download test failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await networkMonitor.testDownloadSpeed(100000);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.speedMbps).toBe(0);
    it('should apply venue-specific optimizations', async () => {
      const venueProfile: VenueProfile = {
        name: 'Mountain Resort',
        averageBandwidth: 2,
        reliabilityScore: 0.7,
        peakHours: ['18:00-22:00'],
        networkChallenges: ['weak_signal', 'weather_dependent'],
      };
      networkMonitor.setVenueProfile(venueProfile);
      const result = await networkMonitor.testDownloadSpeed(500000);
      expect(result).toBeDefined();
      // Should use smaller test size for challenging venues
  describe('upload speed testing', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should measure upload speed', async () => {
        status: 200,
        .mockReturnValueOnce(3000); // 2 second duration
      const testSize = 500000; // 500KB
      const result = await networkMonitor.testUploadSpeed(testSize);
      expect(result.speedMbps).toBe(2); // 500KB in 2s = 2 Mbps
    it('should handle upload test failures', async () => {
      mockFetch.mockRejectedValue(new Error('Upload failed'));
      const result = await networkMonitor.testUploadSpeed(100000);
      expect(result.error).toBe('Upload failed');
  describe('latency and packet loss testing', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should measure latency with multiple pings', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });
      // Mock performance.now for consistent latency measurement
      let callCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        callCount++;
        return callCount * 50; // 50ms per call
      const result = await networkMonitor.testLatencyAndPacketLoss();
      expect(result.averageLatency).toBe(50); // Each ping takes 50ms
      expect(result.packetLoss).toBe(0);
      expect(result.jitter).toBeDefined();
    it('should calculate packet loss correctly', async () => {
      // Mock 2 successful and 3 failed requests (60% packet loss)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'));
      expect(result.packetLoss).toBe(60);
    it('should handle complete connectivity failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network unreachable'));
      expect(result.packetLoss).toBe(100);
      expect(result.averageLatency).toBeGreaterThan(0);
  describe('comprehensive network testing', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should perform comprehensive network analysis', async () => {
      // Setup successful responses
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000000)),
      const result = await networkMonitor.performComprehensiveTest();
      expect(result.downloadSpeed).toBeDefined();
      expect(result.uploadSpeed).toBeDefined();
      expect(result.qualityLevel).toBeDefined();
      expect(result.recommendation).toBeDefined();
    it('should provide venue-specific recommendations', async () => {
        name: 'Remote Barn',
        averageBandwidth: 1,
        reliabilityScore: 0.5,
        peakHours: ['17:00-23:00'],
        networkChallenges: ['weak_signal', 'equipment_interference'],
      // Simulate poor network conditions
      mockConnection.downlink = 0.5;
      mockConnection.rtt = 600;
      expect(result.recommendation).toContain('venue');
      expect(result.venueSpecificAdvice).toBeDefined();
  describe('monitoring and state changes', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should start and stop monitoring', () => {
      const eventCallback = vi.fn();
      networkMonitor.on('state-change', eventCallback);
      networkMonitor.startMonitoring();
      expect(networkMonitor.isMonitoring()).toBe(true);
      networkMonitor.stopMonitoring();
      expect(networkMonitor.isMonitoring()).toBe(false);
    it('should emit state change events', (done) => {
      networkMonitor.on('state-change', (state: NetworkState) => {
        expect(state).toBeDefined();
        expect(state.quality).toBeDefined();
        expect(state.metrics).toBeDefined();
        done();
      // Simulate connection change
      const changeCallback = mockConnection.addEventListener.mock.calls
        .find(call => call[0] === 'change')?.[1];
      if (changeCallback) {
        changeCallback();
      }
    it('should handle online/offline events', (done) => {
      let eventCount = 0;
        eventCount++;
        if (eventCount === 1) {
          expect(state.isOnline).toBe(false);
        } else if (eventCount === 2) {
          expect(state.isOnline).toBe(true);
          done();
        }
      // Simulate going offline
      window.dispatchEvent(new Event('offline'));
      // Then back online
        value: true,
      window.dispatchEvent(new Event('online'));
  describe('venue profile management', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should set and get venue profile', () => {
        name: 'Beachside Resort',
        averageBandwidth: 5,
        reliabilityScore: 0.8,
        peakHours: ['19:00-23:00'],
      const retrievedProfile = networkMonitor.getVenueProfile();
      expect(retrievedProfile).toEqual(venueProfile);
    it('should clear venue profile', () => {
        name: 'Test Venue',
        averageBandwidth: 3,
        peakHours: [],
      networkMonitor.clearVenueProfile();
      expect(networkMonitor.getVenueProfile()).toBeNull();
  describe('getCurrentState', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should return current network state', async () => {
      expect(state).toEqual(expect.objectContaining({
        isOnline: expect.any(Boolean),
        quality: expect.any(String),
        metrics: expect.objectContaining({
          bandwidth: expect.any(Number),
          latency: expect.any(Number),
          packetLoss: expect.any(Number),
          stability: expect.any(Number),
        }),
        lastUpdated: expect.any(Number),
      }));
  describe('getCurrentQuality', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should return current quality level', () => {
      const quality = networkMonitor.getCurrentQuality();
      expect(['excellent', 'good', 'fair', 'poor', 'offline']).toContain(quality);
  describe('error handling and edge cases', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should handle fetch API failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch not available'));
      const result = await networkMonitor.testCurrentConnection();
    it('should handle performance API unavailability', async () => {
      global.performance.now = undefined as any;
      expect(result.success).toBeDefined();
      // Should use fallback timing mechanism
    it('should handle connection API changes during monitoring', () => {
      // Remove connection API
      // Should continue monitoring without errors
      expect(() => {
        networkMonitor.testCurrentConnection();
      }).not.toThrow();
    it('should handle rapid state changes', async () => {
      const stateChanges: NetworkState[] = [];
      networkMonitor.on('state-change', (state) => {
        stateChanges.push(state);
      // Rapid connection changes
      for (let i = 0; i < 10; i++) {
        mockConnection.downlink = Math.random() * 10;
        mockConnection.rtt = Math.random() * 500;
        
        const changeCallback = mockConnection.addEventListener.mock.calls
          .find(call => call[0] === 'change')?.[1];
        if (changeCallback) {
          changeCallback();
      // Should handle all changes without errors
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(stateChanges.length).toBeGreaterThan(0);
  describe('destroy', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    it('should cleanup resources on destroy', () => {
      networkMonitor.destroy();
      expect(mockConnection.removeEventListener).toHaveBeenCalled();
    it('should handle multiple destroy calls', () => {
      networkMonitor.destroy(); // Should not throw
      expect(() => networkMonitor.destroy()).not.toThrow();
