import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MobileAnalyticsExperience } from '../../../lib/wedme/analytics/mobile-analytics-experience';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        data: null,
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: jest.fn(() => ({
      data: null,
      error: null,
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  rpc: jest.fn(() => ({
    data: null,
    error: null,
  })),
};

// Mock device capabilities
const mockDeviceCapabilities = {
  touchSupport: true,
  screenSize: { width: 375, height: 812 },
  connectionType: '4g',
  devicePixelRatio: 3,
  platform: 'iOS',
  browserEngine: 'WebKit',
};

// Mock touch events
const mockTouchEvent = {
  touches: [{ clientX: 100, clientY: 100 }],
  changedTouches: [{ clientX: 100, clientY: 100 }],
  targetTouches: [{ clientX: 100, clientY: 100 }],
};

describe('MobileAnalyticsExperience', () => {
  let mobileAnalytics: MobileAnalyticsExperience;
  let mockCoupleId: string;
  let mockWeddingId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mobileAnalytics = new MobileAnalyticsExperience(mockSupabase as any);
    mockCoupleId = 'couple-123';
    mockWeddingId = 'wedding-456';
  });

  describe('Device Capability Detection', () => {
    it('should detect mobile device capabilities', async () => {
      const capabilities = await mobileAnalytics.detectDeviceCapabilities();

      expect(capabilities).toMatchObject({
        touchSupport: expect.any(Boolean),
        screenSize: expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
        connectionSpeed: expect.any(String),
        devicePixelRatio: expect.any(Number),
        platform: expect.any(String),
        batteryStatus: expect.any(String),
        memoryInfo: expect.objectContaining({
          available: expect.any(Number),
          used: expect.any(Number),
        }),
        storageInfo: expect.objectContaining({
          available: expect.any(Number),
          used: expect.any(Number),
        }),
      });
    });

    it('should adapt UI based on device capabilities', async () => {
      const lowEndDevice = {
        ...mockDeviceCapabilities,
        connectionType: '2g',
        devicePixelRatio: 1,
        platform: 'Android',
      };

      const adaptiveConfig = await mobileAnalytics.generateAdaptiveUIConfig(
        mockCoupleId,
        lowEndDevice,
      );

      expect(adaptiveConfig).toMatchObject({
        performanceMode: 'battery-saver',
        animationsEnabled: false,
        imageQuality: 'compressed',
        cacheStrategy: 'aggressive',
        updateFrequency: 'reduced',
        offlinePriority: 'high',
      });
    });

    it('should optimize for high-end devices', async () => {
      const highEndDevice = {
        ...mockDeviceCapabilities,
        connectionType: '5g',
        devicePixelRatio: 3,
        platform: 'iOS',
      };

      const adaptiveConfig = await mobileAnalytics.generateAdaptiveUIConfig(
        mockCoupleId,
        highEndDevice,
      );

      expect(adaptiveConfig).toMatchObject({
        performanceMode: 'high-performance',
        animationsEnabled: true,
        imageQuality: 'high',
        cacheStrategy: 'standard',
        updateFrequency: 'real-time',
        offlinePriority: 'standard',
      });
    });
  });

  describe('Touch Optimization', () => {
    it('should track touch interactions for analytics widgets', async () => {
      const touchMetrics = await mobileAnalytics.trackTouchInteractions(
        mockCoupleId,
        'budget-widget',
        {
          gestureType: 'swipe',
          duration: 250,
          distance: 120,
          direction: 'left',
          touchCount: 1,
        },
      );

      expect(touchMetrics).toMatchObject({
        widgetId: 'budget-widget',
        interactionType: 'swipe',
        efficiency: expect.any(Number),
        accuracy: expect.any(Number),
        satisfaction: expect.any(Number),
      });
    });

    it('should optimize touch targets for small screens', async () => {
      const smallScreen = { width: 320, height: 568 }; // iPhone 5s

      const optimization = await mobileAnalytics.optimizeTouchTargets(
        mockCoupleId,
        smallScreen,
      );

      expect(optimization).toMatchObject({
        minTouchTargetSize: 48, // Accessibility guidelines
        spacing: 8,
        buttonLayout: 'stacked',
        navigationStyle: 'bottom-tabs',
        gestureSupport: true,
      });
    });

    it('should handle complex gesture patterns', async () => {
      const complexGesture = {
        type: 'pinch-zoom',
        startDistance: 100,
        endDistance: 200,
        duration: 500,
        accuracy: 0.95,
      };

      const analysis = await mobileAnalytics.analyzeGesturePatterns(
        mockCoupleId,
        [complexGesture],
      );

      expect(analysis).toMatchObject({
        gestureEfficiency: expect.any(Number),
        userExpertise: expect.any(String),
        recommendedGestures: expect.any(Array),
        learningCurve: expect.any(Number),
      });
    });
  });

  describe('Offline Capabilities', () => {
    it('should queue analytics data when offline', async () => {
      const offlineData = {
        type: 'budget-view',
        timestamp: new Date().toISOString(),
        data: { categoryId: 'catering', amount: 5000 },
      };

      const result = await mobileAnalytics.queueOfflineData(
        mockCoupleId,
        offlineData,
      );

      expect(result).toMatchObject({
        queued: true,
        queueSize: expect.any(Number),
        syncPending: true,
        storageUsed: expect.any(Number),
      });
    });

    it('should sync queued data when connection restored', async () => {
      // Mock queued data
      const queuedItems = [
        { id: '1', type: 'vendor-interaction', data: {} },
        { id: '2', type: 'timeline-update', data: {} },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: queuedItems,
            error: null,
          })),
        })),
      });

      const syncResult = await mobileAnalytics.syncOfflineQueue(mockCoupleId);

      expect(syncResult).toMatchObject({
        synced: expect.any(Number),
        failed: expect.any(Number),
        errors: expect.any(Array),
        queueCleared: expect.any(Boolean),
      });
    });

    it('should provide offline analytics insights', async () => {
      const offlineInsights = await mobileAnalytics.generateOfflineInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(offlineInsights).toMatchObject({
        lastSync: expect.any(String),
        availableInsights: expect.any(Array),
        cachedData: expect.objectContaining({
          budget: expect.any(Object),
          vendors: expect.any(Array),
          timeline: expect.any(Object),
        }),
        syncRequired: expect.any(Boolean),
      });
    });

    it('should manage offline storage efficiently', async () => {
      const storageOptimization =
        await mobileAnalytics.optimizeOfflineStorage(mockCoupleId);

      expect(storageOptimization).toMatchObject({
        cleaned: expect.any(Number),
        compressed: expect.any(Number),
        prioritized: expect.any(Array),
        availableSpace: expect.any(Number),
      });
    });
  });

  describe('Quick Insights Generation', () => {
    it('should generate quick insights for mobile display', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [
              { category: 'venue', spent: 10000, budget: 12000 },
              { category: 'catering', spent: 8000, budget: 7000 },
            ],
            error: null,
          })),
        })),
      });

      const quickInsights = await mobileAnalytics.generateQuickInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(quickInsights).toHaveLength(expect.any(Number));
      expect(quickInsights[0]).toMatchObject({
        type: expect.any(String),
        title: expect.any(String),
        value: expect.any(String),
        trend: expect.any(String),
        priority: expect.any(String),
        actionable: expect.any(Boolean),
      });
    });

    it('should prioritize insights by mobile context', async () => {
      const mobileContext = {
        location: 'venue-visit',
        batteryLevel: 0.2,
        connectionQuality: 'poor',
        timeConstraint: 'high',
      };

      const prioritizedInsights =
        await mobileAnalytics.prioritizeInsightsForMobile(
          mockCoupleId,
          mobileContext,
        );

      expect(prioritizedInsights).toMatchObject({
        immediate: expect.any(Array),
        important: expect.any(Array),
        background: expect.any(Array),
        deferred: expect.any(Array),
      });
    });

    it('should adapt insights to screen size', async () => {
      const smallScreenInsights = await mobileAnalytics.adaptInsightsToScreen(
        mockCoupleId,
        { width: 320, height: 568 },
      );

      expect(smallScreenInsights).toMatchObject({
        layout: 'single-column',
        cardSize: 'compact',
        fontSize: 'small',
        chartType: 'simplified',
        maxItems: expect.any(Number),
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should measure mobile performance metrics', async () => {
      const performanceMetrics = await mobileAnalytics.measurePerformance(
        mockCoupleId,
        'analytics-dashboard',
      );

      expect(performanceMetrics).toMatchObject({
        loadTime: expect.any(Number),
        interactionDelay: expect.any(Number),
        memoryUsage: expect.any(Number),
        batteryImpact: expect.any(Number),
        networkUsage: expect.any(Number),
      });
    });

    it('should optimize for battery life', async () => {
      const batteryOptimization = await mobileAnalytics.optimizeForBattery(
        mockCoupleId,
        { level: 0.15, charging: false },
      );

      expect(batteryOptimization).toMatchObject({
        updateFrequency: 'reduced',
        animationsDisabled: true,
        backgroundSync: false,
        screenBrightness: 'dimmed',
        networkRequests: 'minimal',
      });
    });

    it('should adapt to network conditions', async () => {
      const networkOptimization = await mobileAnalytics.adaptToNetwork(
        mockCoupleId,
        { type: '2g', effectiveType: 'slow-2g' },
      );

      expect(networkOptimization).toMatchObject({
        dataCompression: true,
        imageQuality: 'low',
        cacheAggressive: true,
        preloadDisabled: true,
        realTimeUpdates: false,
      });
    });
  });

  describe('Wedding Context Integration', () => {
    it('should provide location-aware analytics', async () => {
      const venueLocation = { lat: 51.5074, lng: -0.1278 }; // London

      const locationInsights =
        await mobileAnalytics.generateLocationAwareInsights(
          mockCoupleId,
          mockWeddingId,
          venueLocation,
        );

      expect(locationInsights).toMatchObject({
        nearbyVendors: expect.any(Array),
        weatherConsiderations: expect.any(Object),
        transportationInsights: expect.any(Object),
        localRegulations: expect.any(Array),
      });
    });

    it('should adapt to wedding timeline phases', async () => {
      const timelinePhase = 'planning-peak'; // 6 months before wedding

      const phaseAdaptation = await mobileAnalytics.adaptToWeddingPhase(
        mockCoupleId,
        mockWeddingId,
        timelinePhase,
      );

      expect(phaseAdaptation).toMatchObject({
        prioritizedInsights: expect.any(Array),
        urgentTasks: expect.any(Array),
        seasonalConsiderations: expect.any(Object),
        stressIndicators: expect.any(Object),
      });
    });

    it('should handle wedding day specific requirements', async () => {
      const weddingDayConfig = await mobileAnalytics.configureForWeddingDay(
        mockCoupleId,
        mockWeddingId,
      );

      expect(weddingDayConfig).toMatchObject({
        emergencyMode: true,
        offlineFirst: true,
        minimalistUI: true,
        quickActions: expect.any(Array),
        criticalContacts: expect.any(Array),
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Network error' },
          })),
        })),
      });

      const result = await mobileAnalytics.generateQuickInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toEqual([]);
    });

    it('should handle low memory conditions', async () => {
      const lowMemoryHandling =
        await mobileAnalytics.handleLowMemory(mockCoupleId);

      expect(lowMemoryHandling).toMatchObject({
        cacheCleared: expect.any(Boolean),
        dataReduced: expect.any(Boolean),
        performanceMode: 'minimal',
        backgroundTasksPaused: true,
      });
    });

    it('should validate mobile-specific input', async () => {
      const invalidInput = {
        coupleId: '',
        touchData: null,
        deviceCapabilities: undefined,
      };

      await expect(
        mobileAnalytics.trackTouchInteractions(
          invalidInput.coupleId,
          'test-widget',
          invalidInput.touchData as any,
        ),
      ).rejects.toThrow();
    });

    it('should recover from corrupted offline data', async () => {
      const recovery =
        await mobileAnalytics.recoverCorruptedOfflineData(mockCoupleId);

      expect(recovery).toMatchObject({
        recovered: expect.any(Number),
        corrupted: expect.any(Number),
        backup: expect.any(Boolean),
        integrityRestored: expect.any(Boolean),
      });
    });
  });

  describe('Integration with Other Analytics Services', () => {
    it('should integrate with couple insights engine', async () => {
      const mobileIntegration =
        await mobileAnalytics.integrateWithCoupleInsights(
          mockCoupleId,
          mockWeddingId,
        );

      expect(mobileIntegration).toMatchObject({
        mobileOptimizedInsights: expect.any(Array),
        touchFriendlyActions: expect.any(Array),
        quickDecisionSupport: expect.any(Object),
        contextualRecommendations: expect.any(Array),
      });
    });

    it('should coordinate with budget optimization', async () => {
      const budgetMobileSync = await mobileAnalytics.syncWithBudgetOptimization(
        mockCoupleId,
        mockWeddingId,
      );

      expect(budgetMobileSync).toMatchObject({
        mobileBudgetInsights: expect.any(Array),
        spendingAlerts: expect.any(Array),
        quickBudgetActions: expect.any(Array),
        offlineBudgetCapability: expect.any(Boolean),
      });
    });

    it('should enhance vendor analytics for mobile', async () => {
      const vendorMobileEnhancement =
        await mobileAnalytics.enhanceVendorAnalyticsForMobile(
          mockCoupleId,
          mockWeddingId,
        );

      expect(vendorMobileEnhancement).toMatchObject({
        mobileFriendlyVendorCards: expect.any(Array),
        quickVendorComparisons: expect.any(Object),
        touchOptimizedFilters: expect.any(Array),
        locationBasedVendorInsights: expect.any(Array),
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent mobile users', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
        mobileAnalytics.generateQuickInsights(`couple-${i}`, `wedding-${i}`),
      );

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(50);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should perform efficiently on low-end devices', async () => {
      const startTime = Date.now();

      await mobileAnalytics.generateQuickInsights(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time for mobile devices
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should manage memory usage effectively', async () => {
      // Simulate memory-intensive operations
      const memoryTestPromises = Array.from({ length: 100 }, () =>
        mobileAnalytics.detectDeviceCapabilities(),
      );

      await Promise.all(memoryTestPromises);

      // Memory should be managed properly (no memory leaks)
      expect(process.memoryUsage().heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB
    });
  });
});
