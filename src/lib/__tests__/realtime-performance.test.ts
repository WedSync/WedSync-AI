/**
 * Comprehensive Tests for WS-202 Supabase Realtime Performance Integration
 * Team D - Performance Infrastructure Components
 * 
 * Test Coverage:
 * - RealtimeConnectionOptimizer (Connection pooling, health monitoring)
 * - RealtimeCacheManager (Multi-layer caching, LRU eviction)
 * - RealtimeScalingManager (Auto-scaling, wedding day protocols)
 * - RealtimePerformanceMonitor (Monitoring, alerts, dashboards)
 * - WeddingSeasonOptimizer (Seasonal patterns, venue optimizations)
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
// Import components under test
import { RealtimeConnectionOptimizer } from '../performance/realtime-connection-optimizer';
import { RealtimeCacheManager } from '../performance/realtime-cache-manager';
import { RealtimeScalingManager } from '../infrastructure/realtime-scaling-manager';
import { RealtimePerformanceMonitor } from '../monitoring/realtime-performance-monitor';
import { WeddingSeasonOptimizer } from '../optimization/wedding-season-optimizer';
// Import types
import {
  RealtimePerformanceConfig,
  SubscriptionConfig,
  OptimizedConnection,
  ScalingResult,
  PerformanceAlert,
  WeddingDayMode,
  WeddingOptimizationConfig,
  RealtimePerformanceMetrics
} from '@/types/realtime-performance';
// Mock external dependencies
vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    flushall: vi.fn().mockResolvedValue('OK')
  })
}));
vi.mock('@supabase/supabase-js', () => ({
    channel: vi.fn().mockReturnValue({
      subscribe: vi.fn().mockReturnValue(Promise.resolve('ok')),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    }),
    removeChannel: vi.fn()
  });

// Test Configuration
const mockConfig: RealtimePerformanceConfig = {
  connectionPool: {
    maxConnections: 100,
    maxConnectionsPerUser: 5,
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    cleanupInterval: 60000,
    healthCheckInterval: 10000
  },
  caching: {
    localCacheSize: 1000,
    localCacheTTL: 300000,
    redisCacheTTL: 3600000,
    compressionThreshold: 1024,
    preloadStrategies: ['wedding-data', 'vendor-profiles']
  scaling: {
    autoScalingEnabled: true,
    scaleUpThreshold: 80,
    scaleDownThreshold: 30,
    maxInstances: 10,
    minInstances: 2,
    weddingDayMultiplier: 3
  monitoring: {
    metricsInterval: 5000,
    alertThresholds: [
      {
        metric: 'latency',
        warning: 300,
        critical: 500,
        unit: 'ms',
        window: 60
      }
    ],
    weddingDayMonitoring: true,
    performanceLogging: true
  weddingOptimizations: {
    priorityChannels: ['wedding-coordination', 'emergency-alerts'],
    cacheWarmingTime: 24,
    emergencyModeThreshold: 1000,
    capacityBuffer: 20
  }
};
describe('WS-202 Realtime Performance Integration', () => {
  
  // ============= REALTIME CONNECTION OPTIMIZER TESTS =============
  describe('RealtimeConnectionOptimizer', () => {
    let optimizer: RealtimeConnectionOptimizer;
    beforeEach(() => {
      optimizer = new RealtimeConnectionOptimizer(mockConfig);
    });
    afterEach(async () => {
      await optimizer.shutdown();
    describe('Connection Pool Management', () => {
      it('should initialize with correct pool size', async () => {
        await optimizer.initialize();
        const poolStats = optimizer.getPoolStatistics();
        
        expect(poolStats.maxSize).toBe(mockConfig.connectionPool.maxConnections);
        expect(poolStats.availableConnections).toBe(mockConfig.connectionPool.maxConnections);
      });
      it('should create optimized connection with health monitoring', async () => {
        const subscriptionConfig: SubscriptionConfig = {
          channelName: 'test-channel',
          event: 'INSERT',
          callback: vi.fn(),
          priority: 'high'
        };
        const connection = await optimizer.optimizeConnectionCreation(
          'user-123',
          'wedding-updates',
          subscriptionConfig
        );
        expect(connection).toBeDefined();
        expect(connection.userId).toBe('user-123');
        expect(connection.channelType).toBe('wedding-updates');
        expect(connection.isHealthy).toBe(true);
        expect(connection.metrics.channelCount).toBe(1);
      it('should reuse existing healthy connections', async () => {
        const config1: SubscriptionConfig = {
          channelName: 'test-channel-1',
          callback: vi.fn()
        const config2: SubscriptionConfig = {
          channelName: 'test-channel-2',
        const connection1 = await optimizer.optimizeConnectionCreation('user-123', 'general', config1);
        const connection2 = await optimizer.optimizeConnectionCreation('user-123', 'general', config2);
        expect(connection1.id).toBe(connection2.id); // Should reuse same connection
        expect(connection2.metrics.channelCount).toBe(2);
      it('should handle connection health monitoring', async () => {
        const connection = await optimizer.optimizeConnectionCreation('user-123', 'test', subscriptionConfig);
        // Simulate health check
        const healthReport = optimizer.generateHealthReport();
        expect(healthReport.healthyConnections).toBe(1);
        expect(healthReport.totalConnections).toBe(1);
    describe('Batch Subscription Management', () => {
      it('should optimize batch subscription creation', async () => {
        const subscriptionConfigs: SubscriptionConfig[] = [
          { channelName: 'wedding-123', callback: vi.fn(), priority: 'critical' },
          { channelName: 'vendor-updates', callback: vi.fn(), priority: 'high' },
          { channelName: 'timeline-changes', callback: vi.fn(), priority: 'medium' }
        ];
        const result = await optimizer.batchSubscriptionUpdates('user-123', subscriptionConfigs);
        expect(result.successful.length).toBe(3);
        expect(result.failed.length).toBe(0);
      it('should prioritize critical subscriptions', async () => {
        const criticalConfig: SubscriptionConfig = {
          channelName: 'emergency-alert',
          priority: 'critical'
        const lowConfig: SubscriptionConfig = {
          channelName: 'general-update',
          priority: 'low'
        const criticalResult = await optimizer.batchSubscriptionUpdates('user-123', [criticalConfig]);
        const lowResult = await optimizer.batchSubscriptionUpdates('user-123', [lowConfig]);
        expect(criticalResult.successful[0].priority).toBe(5); // Critical priority
        expect(lowResult.successful[0].priority).toBe(1); // Low priority
    describe('Circuit Breaker Pattern', () => {
      it('should activate circuit breaker on repeated failures', async () => {
        // Simulate multiple connection failures
        for (let i = 0; i < 6; i++) { // Exceed failure threshold (5)
          try {
            await optimizer.optimizeConnectionCreation('user-fail', 'failing-channel', {
              channelName: 'fail-channel',
              callback: () => { throw new Error('Connection failed'); }
            });
          } catch (error) {
            // Expected failures
          }
        }
        const circuitState = optimizer.getCircuitBreakerState();
        expect(circuitState.state).toBe('OPEN');
        expect(circuitState.failureCount).toBeGreaterThan(5);
      it('should enter half-open state after timeout', (done) => {
        optimizer.initialize().then(() => {
          // Set short timeout for test
          const circuitBreaker = (optimizer as any).circuitBreaker;
          circuitBreaker.timeout = 100;
          circuitBreaker.state = 'OPEN';
          circuitBreaker.lastFailureTime = Date.now();
          setTimeout(() => {
            const state = optimizer.getCircuitBreakerState();
            expect(state.state).toBe('HALF_OPEN');
            done();
          }, 150);
        });
  });
  // ============= REALTIME CACHE MANAGER TESTS =============
  describe('RealtimeCacheManager', () => {
    let cacheManager: RealtimeCacheManager;
    beforeEach(async () => {
      cacheManager = new RealtimeCacheManager(mockConfig);
      await cacheManager.initialize();
      await cacheManager.shutdown();
    describe('Multi-layer Caching', () => {
      it('should store and retrieve from local cache', async () => {
        const testData = { id: '123', name: 'Test Wedding' };
        await cacheManager.set('wedding:123', testData, 300);
        const retrieved = await cacheManager.get('wedding:123');
        expect(retrieved).toEqual(testData);
      it('should fallback to Redis when local cache misses', async () => {
        const testData = { id: '456', name: 'Redis Wedding' };
        // Clear local cache but set in Redis (simulate scenario)
        await cacheManager.set('wedding:456', testData, 300);
        (cacheManager as any).localCache.clear(); // Clear local cache
        const retrieved = await cacheManager.get('wedding:456');
      it('should compress large entries', async () => {
        const largeData = {
          wedding: 'test',
          guests: new Array(1000).fill({ name: 'Guest', email: 'test@example.com' })
        await cacheManager.set('large-wedding:789', largeData, 300);
        const retrieved = await cacheManager.get('large-wedding:789');
        expect(retrieved).toEqual(largeData);
        // Check compression was applied
        const cacheEntry = (cacheManager as any).localCache.get('large-wedding:789');
        expect(cacheEntry.compressed).toBe(true);
    describe('LRU Eviction', () => {
      it('should evict least recently used items when cache is full', async () => {
        // Fill cache to capacity
        const cacheSize = mockConfig.caching.localCacheSize;
        for (let i = 0; i < cacheSize + 1; i++) {
          await cacheManager.set(`item:${i}`, { id: i }, 300);
        // First item should be evicted
        const firstItem = await cacheManager.get('item:0');
        expect(firstItem).toBeNull();
        // Last item should still exist
        const lastItem = await cacheManager.get(`item:${cacheSize}`);
        expect(lastItem).not.toBeNull();
      it('should update access time on cache hit', async () => {
        await cacheManager.set('test:access', { id: 'test' }, 300);
        // Access the item multiple times
        await cacheManager.get('test:access');
        const entry = (cacheManager as any).localCache.get('test:access');
        expect(entry.accessCount).toBe(3); // 1 initial + 2 gets
    describe('Cache Optimization', () => {
      it('should optimize cache based on access patterns', async () => {
        // Set up access patterns
        await cacheManager.set('frequent:1', { id: 1 }, 300);
        await cacheManager.set('rare:1', { id: 2 }, 300);
        // Access frequent item multiple times
        for (let i = 0; i < 10; i++) {
          await cacheManager.get('frequent:1');
        // Access rare item once
        await cacheManager.get('rare:1');
        const optimizationResult = await cacheManager.optimizeCache();
        expect(optimizationResult.actions.length).toBeGreaterThan(0);
        expect(optimizationResult.optimizationScore).toBeGreaterThan(0);
      it('should preload wedding data before wedding day', async () => {
        const weddingData = {
          weddingId: 'wedding-123',
          organizationId: 'org-456',
          weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        await cacheManager.preloadWeddingData(weddingData);
        const preloadedData = await cacheManager.get('wedding-data:wedding-123');
        expect(preloadedData).toEqual(weddingData);
    describe('Performance Metrics', () => {
      it('should track cache hit ratios', async () => {
        // Generate some hits and misses
        await cacheManager.set('hit:1', { id: 1 }, 300);
        await cacheManager.get('hit:1'); // Hit
        await cacheManager.get('miss:1'); // Miss
        await cacheManager.get('miss:2'); // Miss
        const metrics = cacheManager.getPerformanceMetrics();
        expect(metrics.hitRatio.overall).toBe(0.5); // 2 hits, 2 misses
      it('should measure operation latency', async () => {
        await cacheManager.set('latency:test', { id: 'test' }, 300);
        const start = Date.now();
        await cacheManager.get('latency:test');
        const end = Date.now();
        expect(metrics.performance.averageReadLatency).toBeLessThan(end - start + 10); // Allow some margin
  // ============= REALTIME SCALING MANAGER TESTS =============
  describe('RealtimeScalingManager', () => {
    let scalingManager: RealtimeScalingManager;
      scalingManager = new RealtimeScalingManager(mockConfig);
      await scalingManager.initialize();
      await scalingManager.shutdown();
    describe('Auto-scaling Logic', () => {
      it('should recommend scale up when threshold exceeded', async () => {
        // Simulate high load
        const highLoadMetrics: RealtimePerformanceMetrics = {
          connectionMetrics: {
            totalConnections: 90, // Above 80% threshold
            connectionsPerSecond: 10,
            averageConnectionLatency: 100,
            connectionReusageRate: 0.8
          },
          subscriptionMetrics: {
            totalSubscriptions: 180,
            subscriptionsPerConnection: 2,
            subscriptionUpdateRate: 50
          performanceMetrics: {
            averageMessageLatency: 200,
            messagesThroughput: 1000,
            errorRate: 0.01
          resourceMetrics: {
            memoryUsage: {
              used: 800 * 1024 * 1024,
              total: 1024 * 1024 * 1024,
              available: 224 * 1024 * 1024,
              rss: 800 * 1024 * 1024,
              heapUsed: 600 * 1024 * 1024,
              heapTotal: 800 * 1024 * 1024,
              external: 50 * 1024 * 1024,
              arrayBuffers: 10 * 1024 * 1024
            },
            cpuUsage: 85, // High CPU usage
            networkUtilization: 80
        const scalingResult = await scalingManager.evaluateAndScale(highLoadMetrics);
        expect(scalingResult.action).toBe('scaled_up');
        expect(scalingResult.scalingActions.length).toBeGreaterThan(0);
        expect(scalingResult.scalingActions[0].type).toBe('increase_pool_size');
      it('should recommend scale down when load is low', async () => {
        // Simulate low load
        const lowLoadMetrics: RealtimePerformanceMetrics = {
            totalConnections: 20, // Below 30% threshold
            connectionsPerSecond: 1,
            averageConnectionLatency: 50,
            connectionReusageRate: 0.9
            totalSubscriptions: 40,
            subscriptionUpdateRate: 10
            averageMessageLatency: 100,
            messagesThroughput: 200,
            errorRate: 0.001
              used: 200 * 1024 * 1024,
              available: 824 * 1024 * 1024,
              rss: 200 * 1024 * 1024,
              heapUsed: 150 * 1024 * 1024,
              heapTotal: 200 * 1024 * 1024,
              external: 20 * 1024 * 1024,
              arrayBuffers: 5 * 1024 * 1024
            cpuUsage: 15, // Low CPU usage
            networkUtilization: 20
        const scalingResult = await scalingManager.evaluateAndScale(lowLoadMetrics);
        expect(scalingResult.action).toBe('scaled_down');
    describe('Wedding Day Emergency Mode', () => {
      it('should activate emergency mode for wedding days', async () => {
        const weddingConfig: WeddingOptimizationConfig = {
          weddingDate: new Date().toISOString(),
          vendorCount: 15,
          guestCount: 200,
          priorityLevel: 5,
          specialRequirements: {
            livestream: true,
            photoSharing: true,
            realTimeCoordination: true,
            emergencyProtocols: true
        await scalingManager.activateWeddingDayMode([weddingConfig]);
        const isWeddingDay = (scalingManager as any).isWeddingDayActive();
        expect(isWeddingDay).toBe(true);
        // Should apply wedding day multiplier to capacity
        const capacity = (scalingManager as any).calculateRequiredCapacity({
          connectionMetrics: { totalConnections: 50 }
        expect(capacity).toBeGreaterThan(50 * mockConfig.scaling.weddingDayMultiplier);
      it('should handle emergency scaling for critical weddings', async () => {
        const emergencyMetrics: RealtimePerformanceMetrics = {
            totalConnections: 150, // Very high load
            connectionsPerSecond: 20,
            averageConnectionLatency: 300,
            connectionReusageRate: 0.6
            totalSubscriptions: 300,
            subscriptionUpdateRate: 100
            averageMessageLatency: 600, // High latency
            messagesThroughput: 2000,
            errorRate: 0.02 // 2% error rate
              used: 900 * 1024 * 1024,
              available: 124 * 1024 * 1024,
              rss: 900 * 1024 * 1024,
              heapUsed: 800 * 1024 * 1024,
              heapTotal: 900 * 1024 * 1024,
              external: 80 * 1024 * 1024,
              arrayBuffers: 20 * 1024 * 1024
            cpuUsage: 95, // Critical CPU usage
            networkUtilization: 90
        // Activate wedding day mode first
        await scalingManager.activateWeddingDayMode([{
          weddingId: 'emergency-wedding',
          organizationId: 'org-emergency',
          vendorCount: 20,
          guestCount: 300,
        }]);
        const scalingResult = await scalingManager.handleEmergencyScaling(emergencyMetrics);
        expect(scalingResult.scalingActions).toContainEqual(
          expect.objectContaining({
            type: 'enable_aggressive_cleanup'
          })
    describe('Predictive Scaling', () => {
      it('should predict weekend wedding traffic spikes', () => {
        // Mock Saturday (wedding day)
        const saturday = new Date();
        saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
        const prediction = (scalingManager as any).predictTrafficSpike(saturday);
        expect(prediction.multiplier).toBeGreaterThan(1);
        expect(prediction.confidence).toBeGreaterThan(0.7);
      it('should predict peak wedding season traffic', () => {
        // Mock June (peak wedding month)
        const june = new Date();
        june.setMonth(5); // June
        const prediction = (scalingManager as any).predictSeasonalTraffic(june);
        expect(prediction.seasonType).toBe('peak');
        expect(prediction.trafficMultiplier).toBeGreaterThan(2);
  // ============= REALTIME PERFORMANCE MONITOR TESTS =============
  describe('RealtimePerformanceMonitor', () => {
    let monitor: RealtimePerformanceMonitor;
      monitor = RealtimePerformanceMonitor.getInstance(mockConfig);
      await monitor.initialize();
      await monitor.shutdown();
    describe('Metrics Collection', () => {
      it('should record performance metrics', () => {
        const testMetrics: RealtimePerformanceMetrics = {
            totalConnections: 50,
            connectionsPerSecond: 5,
            averageConnectionLatency: 150,
            totalSubscriptions: 100,
            subscriptionUpdateRate: 30
            messagesThroughput: 500,
              used: 500 * 1024 * 1024,
              available: 524 * 1024 * 1024,
              rss: 500 * 1024 * 1024,
              heapUsed: 400 * 1024 * 1024,
              heapTotal: 500 * 1024 * 1024,
            cpuUsage: 45,
            networkUtilization: 60
        monitor.recordMetrics(testMetrics);
        // Verify metrics are stored
        const exportedData = monitor.exportPerformanceData();
        expect(exportedData.metrics.length).toBeGreaterThan(0);
        expect(exportedData.metrics[exportedData.metrics.length - 1]).toMatchObject(testMetrics);
      it('should trigger alerts based on thresholds', () => {
        const alertSpy = vi.spyOn(console, 'warn').mockImplementation();
        const highLatencyMetrics: RealtimePerformanceMetrics = {
            averageMessageLatency: 600, // Above threshold
        monitor.recordMetrics(highLatencyMetrics);
        expect(alertSpy).toHaveBeenCalled();
        expect(exportedData.alerts.length).toBeGreaterThan(0);
        alertSpy.mockRestore();
    describe('Dashboard System', () => {
      it('should create custom dashboard', () => {
        const dashboardId = monitor.createDashboard({
          name: 'Test Dashboard',
          refreshInterval: 5000,
          autoRefresh: true,
          widgets: [
            {
              id: 'test-widget',
              type: 'metric',
              title: 'Connection Count',
              dataSource: 'connections',
              config: { metric: 'totalConnections' },
              position: { x: 0, y: 0, width: 3, height: 2 }
            }
          ]
        expect(dashboardId).toBeDefined();
        expect(dashboardId).toMatch(/^dashboard-/);
      it('should generate dashboard data', () => {
              id: 'metric-widget',
        const dashboardData = monitor.getDashboardData(dashboardId);
        expect(dashboardData).toBeDefined();
        expect(dashboardData.dashboard).toBeDefined();
        expect(dashboardData.data).toBeDefined();
        expect(dashboardData.data['metric-widget']).toBeDefined();
    describe('Wedding Day Mode', () => {
      it('should activate wedding day mode with enhanced monitoring', async () => {
        await monitor.activateWeddingDayMode(
          ['wedding-123', 'wedding-456'],
          [
              name: 'Wedding Planner',
              phone: '+1-555-0123',
              role: 'planner',
              escalationLevel: 1
        expect(exportedData.summary.weddingDayMode).toBe(true);
      it('should trigger emergency alerts in wedding day mode', () => {
        const emergencySpy = vi.spyOn(console, 'error').mockImplementation();
        monitor.activateWeddingDayMode(['wedding-emergency'], []);
        // Record metrics with even small error rate (should be critical on wedding day)
        const weddingDayMetrics: RealtimePerformanceMetrics = {
            errorRate: 0.015 // 1.5% - would be critical on wedding day
        monitor.recordMetrics(weddingDayMetrics);
        expect(emergencySpy).toHaveBeenCalled();
        emergencySpy.mockRestore();
  // ============= WEDDING SEASON OPTIMIZER TESTS =============
  describe('WeddingSeasonOptimizer', () => {
    let optimizer: WeddingSeasonOptimizer;
      optimizer = WeddingSeasonOptimizer.getInstance(mockConfig);
      await optimizer.initialize();
    describe('Seasonal Pattern Detection', () => {
      it('should detect current wedding season correctly', () => {
        const metrics = optimizer.getWeddingSeasonMetrics();
        expect(metrics.seasonType).toBeOneOf(['peak', 'shoulder', 'off']);
        expect(metrics.expectedLoad).toBeGreaterThan(0);
        expect(metrics.scalingRecommendation).toBeOneOf(['scale_up', 'scale_down', 'maintain']);
      it('should adjust expected load for wedding days', () => {
        // Mock Saturday (primary wedding day)
        vi.spyOn(Date.prototype, 'getDay').mockReturnValue(6);
        expect(metrics.expectedLoad).toBeGreaterThan(100); // Base load * multipliers
        vi.restoreAllMocks();
    describe('Venue Optimization', () => {
      it('should optimize for outdoor venue with poor connectivity', async () => {
        const decisions = await optimizer.optimizeForVenue('outdoor', 'wedding-outdoor-123');
        expect(decisions.length).toBeGreaterThan(0);
        expect(decisions.some(d => d.type === 'bandwidth_optimization')).toBe(true);
        expect(decisions.some(d => d.type === 'cache_warmup')).toBe(true);
      it('should optimize for banquet hall with good connectivity', async () => {
        const decisions = await optimizer.optimizeForVenue('banquet_hall', 'wedding-hall-456');
        // Should not include bandwidth optimization for good connectivity venues
        expect(decisions.some(d => d.type === 'bandwidth_optimization')).toBe(false);
      it('should optimize for beach venue with livestreaming', async () => {
        const decisions = await optimizer.optimizeForVenue('beach', 'wedding-beach-789');
        expect(decisions.some(d => d.type === 'priority_routing')).toBe(true);
    describe('Wedding Day Registration', () => {
      it('should register wedding day for optimization', async () => {
        const weddingProtocol = {
          weddingId: 'wedding-registration-test',
          organizationId: 'org-123',
          weddingDate: new Date().toISOString(), // Today
          venue: {
            venueType: 'church' as const,
            expectedGuests: 200,
            networkQualityFactor: 0.7,
            peakUsageTimes: ['ceremony_start'],
            specialRequirements: {
              realTimePhotoSharing: false,
              livestreaming: true,
              coordinationIntensive: false,
              lowBandwidth: false
          emergencyContacts: [
              role: 'planner' as const,
          ],
          criticalTimeframes: [
              name: 'Ceremony',
              startTime: '14:00',
              endTime: '15:00',
              priority: 5 as const,
              description: 'Wedding ceremony - absolutely critical'
        await optimizer.registerWeddingDay(weddingProtocol);
        // Verify registration was successful (no errors thrown)
        expect(true).toBe(true); // If we get here, registration succeeded
    describe('Emergency Handling', () => {
      it('should handle network failure emergency', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
        const logSpy = vi.spyOn(console, 'log').mockImplementation();
        // Register a wedding first
          weddingId: 'emergency-test-wedding',
            venueType: 'outdoor' as const,
            expectedGuests: 150,
            networkQualityFactor: 0.3,
              realTimePhotoSharing: true,
              coordinationIntensive: true,
              lowBandwidth: true
              name: 'Emergency Contact',
              phone: '+1-555-HELP',
              role: 'emergency' as const,
          criticalTimeframes: []
        await optimizer.handleWeddingDayEmergency(
          'emergency-test-wedding',
          'network_failure',
          { severity: 'critical', affectedServices: ['realtime', 'photo-sharing'] }
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Wedding day emergency for emergency-test-wedding: network_failure')
        consoleSpy.mockRestore();
        logSpy.mockRestore();
    describe('Industry Insights', () => {
      it('should generate wedding industry insights', () => {
        const insights = optimizer.generateWeddingIndustryInsights();
        expect(insights.seasonalTrends).toBeDefined();
        expect(insights.venuePatterns).toBeDefined();
        expect(insights.regionalInsights).toBeDefined();
        expect(insights.recommendations).toBeInstanceOf(Array);
        expect(insights.recommendations.length).toBeGreaterThan(0);
  // ============= INTEGRATION TESTS =============
  describe('Component Integration', () => {
    let connectionOptimizer: RealtimeConnectionOptimizer;
    let weddingOptimizer: WeddingSeasonOptimizer;
    beforeAll(async () => {
      // Initialize all components
      connectionOptimizer = new RealtimeConnectionOptimizer(mockConfig);
      weddingOptimizer = WeddingSeasonOptimizer.getInstance(mockConfig);
      await Promise.all([
        connectionOptimizer.initialize(),
        cacheManager.initialize(),
        scalingManager.initialize(),
        monitor.initialize(),
        weddingOptimizer.initialize()
      ]);
    afterAll(async () => {
        connectionOptimizer.shutdown(),
        cacheManager.shutdown(),
        scalingManager.shutdown(),
        monitor.shutdown(),
        weddingOptimizer.shutdown()
    it('should coordinate wedding day optimization across all components', async () => {
      // Set up a complete wedding day scenario
      const weddingConfig: WeddingOptimizationConfig = {
        weddingId: 'integration-wedding-123',
        weddingDate: new Date().toISOString(),
        organizationId: 'org-integration',
        vendorCount: 15,
        guestCount: 250,
        priorityLevel: 5,
        specialRequirements: {
          livestream: true,
          photoSharing: true,
          realTimeCoordination: true,
          emergencyProtocols: true
      };
      // 1. Activate wedding day mode in scaling manager
      await scalingManager.activateWeddingDayMode([weddingConfig]);
      
      // 2. Register wedding in optimizer
      await weddingOptimizer.registerWeddingDay({
        weddingId: weddingConfig.weddingId,
        organizationId: weddingConfig.organizationId,
        weddingDate: weddingConfig.weddingDate,
        venue: {
          venueType: 'outdoor',
          expectedGuests: weddingConfig.guestCount,
          networkQualityFactor: 0.3,
          peakUsageTimes: ['ceremony_start', 'reception_start'],
            realTimePhotoSharing: weddingConfig.specialRequirements.photoSharing,
            livestreaming: weddingConfig.specialRequirements.livestream,
            coordinationIntensive: weddingConfig.specialRequirements.realTimeCoordination,
            lowBandwidth: true
        },
        emergencyContacts: [
          {
            name: 'Wedding Coordinator',
            phone: '+1-555-COORD',
            role: 'planner',
            escalationLevel: 1
        ],
        criticalTimeframes: [
            name: 'Ceremony',
            startTime: '15:00',
            endTime: '16:00',
            priority: 5,
            description: 'Wedding ceremony'
        ]
      // 3. Preload wedding data in cache
      await cacheManager.preloadWeddingData({
        weddingDate: weddingConfig.weddingDate
      // 4. Activate wedding day monitoring
      await monitor.activateWeddingDayMode([weddingConfig.weddingId], [
        {
          name: 'Emergency Contact',
          phone: '+1-555-HELP',
          role: 'emergency',
          escalationLevel: 1
      // 5. Simulate high load and verify coordination
      const highLoadMetrics: RealtimePerformanceMetrics = {
        connectionMetrics: {
          totalConnections: 200,
          connectionsPerSecond: 25,
          averageConnectionLatency: 150,
          connectionReusageRate: 0.85
        subscriptionMetrics: {
          totalSubscriptions: 400,
          subscriptionsPerConnection: 2,
          subscriptionUpdateRate: 80
        performanceMetrics: {
          averageMessageLatency: 250,
          messagesThroughput: 2000,
          errorRate: 0.005
        resourceMetrics: {
          memoryUsage: {
            used: 700 * 1024 * 1024,
            total: 1024 * 1024 * 1024,
            available: 324 * 1024 * 1024,
            rss: 700 * 1024 * 1024,
            heapUsed: 600 * 1024 * 1024,
            heapTotal: 700 * 1024 * 1024,
            external: 70 * 1024 * 1024,
            arrayBuffers: 20 * 1024 * 1024
          cpuUsage: 75,
          networkUtilization: 80
      // Record metrics and verify scaling response
      monitor.recordMetrics(highLoadMetrics);
      const scalingResult = await scalingManager.evaluateAndScale(highLoadMetrics);
      // Verify wedding day optimizations are active
      expect(scalingResult.requiredCapacity).toBeGreaterThan(
        scalingResult.currentCapacity * mockConfig.scaling.weddingDayMultiplier
      );
      // Verify cache optimization for wedding data
      const cachedWeddingData = await cacheManager.get(`wedding-data:${weddingConfig.weddingId}`);
      expect(cachedWeddingData).toBeDefined();
      // Verify monitoring is in wedding day mode
      const exportedData = monitor.exportPerformanceData();
      expect(exportedData.summary.weddingDayMode).toBe(true);
    it('should handle cascading failures gracefully', async () => {
      // Simulate a cascade of failures
      const criticalFailureMetrics: RealtimePerformanceMetrics = {
          totalConnections: 300, // Overload
          connectionsPerSecond: 50,
          averageConnectionLatency: 1000, // Very high latency
          connectionReusageRate: 0.3 // Poor reuse
          totalSubscriptions: 600,
          subscriptionUpdateRate: 150
          averageMessageLatency: 2000, // Critical latency
          messagesThroughput: 5000,
          errorRate: 0.1 // 10% error rate - critical
            used: 950 * 1024 * 1024, // Near memory limit
            available: 74 * 1024 * 1024,
            rss: 950 * 1024 * 1024,
            heapUsed: 900 * 1024 * 1024,
            heapTotal: 950 * 1024 * 1024,
            external: 100 * 1024 * 1024,
            arrayBuffers: 50 * 1024 * 1024
          cpuUsage: 98, // Critical CPU usage
          networkUtilization: 95 // Critical network usage
      // All components should handle this gracefully
      monitor.recordMetrics(criticalFailureMetrics);
      const scalingResult = await scalingManager.evaluateAndScale(criticalFailureMetrics);
      // Should trigger aggressive scaling and circuit breaker
      expect(scalingResult.action).toBe('scaled_up');
      const circuitState = connectionOptimizer.getCircuitBreakerState();
      // Circuit breaker should activate under extreme load
      // Cache should optimize aggressively
      const optimizationResult = await cacheManager.optimizeCache();
      expect(optimizationResult.actions.length).toBeGreaterThan(0);
  // ============= PERFORMANCE BENCHMARKS =============
  describe('Performance Benchmarks', () => {
    it('should handle 200+ concurrent connections efficiently', async () => {
      const optimizer = new RealtimeConnectionOptimizer(mockConfig);
      const start = Date.now();
      // Create 200 concurrent connections
      const connectionPromises = Array.from({ length: 200 }, (_, i) => 
        optimizer.optimizeConnectionCreation(`user-${i}`, 'benchmark', {
          channelName: `channel-${i}`,
        })
      const connections = await Promise.all(connectionPromises);
      const duration = Date.now() - start;
      expect(connections.length).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      const poolStats = optimizer.getPoolStatistics();
      expect(poolStats.totalConnections).toBe(200);
    it('should maintain >90% cache hit ratio under load', async () => {
      const cacheManager = new RealtimeCacheManager(mockConfig);
      // Pre-populate cache
      for (let i = 0; i < 100; i++) {
        await cacheManager.set(`item:${i}`, { id: i, data: `test-${i}` }, 300);
      // Perform 1000 operations with 90% read operations on existing data
      const operations = Array.from({ length: 1000 }, (_, i) => {
        if (i % 10 === 0) {
          // 10% write operations
          return cacheManager.set(`new-item:${i}`, { id: i }, 300);
        } else {
          // 90% read operations on existing data
          return cacheManager.get(`item:${i % 100}`);
      await Promise.all(operations);
      const metrics = cacheManager.getPerformanceMetrics();
      expect(metrics.hitRatio.overall).toBeGreaterThan(0.9); // >90% hit ratio
    it('should respond to scaling decisions within 500ms', async () => {
      const scalingManager = new RealtimeScalingManager(mockConfig);
      const testMetrics: RealtimePerformanceMetrics = {
          totalConnections: 90, // Above threshold
          connectionsPerSecond: 10,
          averageConnectionLatency: 100,
          connectionReusageRate: 0.8
          totalSubscriptions: 180,
          subscriptionUpdateRate: 50
          averageMessageLatency: 200,
          messagesThroughput: 1000,
          errorRate: 0.01
            used: 500 * 1024 * 1024,
            available: 524 * 1024 * 1024,
            rss: 500 * 1024 * 1024,
            heapUsed: 400 * 1024 * 1024,
            heapTotal: 500 * 1024 * 1024,
            external: 50 * 1024 * 1024,
            arrayBuffers: 10 * 1024 * 1024
          cpuUsage: 85,
      const scalingResult = await scalingManager.evaluateAndScale(testMetrics);
      expect(duration).toBeLessThan(500); // Should respond within 500ms
});
// Custom Jest matchers for better test assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
}
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true
    } else {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false
