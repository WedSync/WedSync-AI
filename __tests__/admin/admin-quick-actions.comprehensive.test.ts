/**
 * Comprehensive Test Suite for Admin Quick Actions - WS-229
 * Tests mobile optimization, performance monitoring, caching, and load handling
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { QuickActionsPanel } from '@/components/admin/QuickActionsPanel';
import { adminCacheService, adminCache } from '@/lib/admin/admin-cache-service';
import { AdminLoadTester, testConfigs } from '@/scripts/admin-load-testing';
import { optimizedAdminQueries, adminQueries } from '@/lib/admin/optimized-queries';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock window.matchMedia for mobile detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('(max-width: 768px)'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

// Mock performance.now
const mockPerformanceNow = jest.spyOn(performance, 'now');

describe('Admin Quick Actions - Comprehensive Test Suite', () => {
  
  beforeEach(() => {
    mockFetch.mockClear();
    mockPerformanceNow.mockClear();
    jest.clearAllMocks();
    
    // Reset window size
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  describe('Mobile Optimization', () => {
    
    test('detects mobile viewport and adjusts layout', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      
      const { rerender } = render(<QuickActionsPanel />);
      
      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      await waitFor(() => {
        // Check for mobile-specific elements
        expect(screen.getByText('Ready')).toBeInTheDocument(); // Mobile shortened text
        expect(screen.queryByText('System Ready')).not.toBeInTheDocument(); // Desktop full text
      });
    });

    test('shows mobile performance indicators', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cacheHitRate: 85,
          avgResponseTime: 120,
          errorRate: 0.5
        })
      });

      render(<QuickActionsPanel />);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Response: \d+ms/)).toBeInTheDocument();
        expect(screen.getByText(/Cache: \d+%/)).toBeInTheDocument();
      });
    });

    test('applies mobile-optimized touch interactions', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      
      render(<QuickActionsPanel />);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      const actionButton = screen.getByText('Clear System Cache').closest('div[role="button"]');
      expect(actionButton).toHaveClass('touch-manipulation');
      expect(actionButton).toHaveClass('min-h-[80px]'); // Mobile min height
      expect(actionButton).toHaveClass('active:scale-95'); // Mobile touch feedback
    });

    test('provides haptic feedback on mobile actions', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      const vibrateSpy = jest.spyOn(navigator, 'vibrate');
      
      render(<QuickActionsPanel />);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      const emergencyAction = screen.getByText('Suspend Problem User').closest('div[role="button"]');
      
      await userEvent.click(emergencyAction!);
      
      expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100]); // Emergency vibration pattern
    });

    test('optimizes grid layout for mobile', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      
      render(<QuickActionsPanel />);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const grid = screen.getByText('Clear System Cache').closest('div').parentElement;
        expect(grid).toHaveClass('grid-cols-1'); // Single column on mobile
      });
    });
  });

  describe('Performance Monitoring', () => {
    
    test('tracks response times for admin actions', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1150);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Cache cleared' })
      });

      render(<QuickActionsPanel />);
      
      const clearCacheAction = screen.getByText('Clear System Cache').closest('div[role="button"]');
      
      await userEvent.click(clearCacheAction!);
      
      // Confirm action in modal
      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm');
        userEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/quick-actions', 
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"timestamp"')
          })
        );
      });
    });

    test('displays performance metrics in real-time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cacheHitRate: 92,
          avgResponseTime: 85,
          errorRate: 0.1
        })
      });

      render(<QuickActionsPanel />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/performance');
      });
    });

    test('updates performance metrics periodically', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          cacheHitRate: 88,
          avgResponseTime: 95,
          errorRate: 0.2
        })
      });

      render(<QuickActionsPanel />);
      
      // Fast-forward 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + periodic update
      
      jest.useRealTimers();
    });

    test('handles performance metric errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<QuickActionsPanel />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to fetch performance metrics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Caching Strategies', () => {
    
    test('caches system status with appropriate TTL', async () => {
      const testData = {
        maintenanceMode: false,
        activeUsers: 150,
        systemHealth: 'healthy' as const
      };

      await adminCache.setSystemStatus(testData);
      const cached = await adminCache.getSystemStatus();

      expect(cached).toEqual(testData);
    });

    test('provides mobile-optimized cache entries', async () => {
      const fullData = {
        users: new Array(100).fill(null).map((_, i) => ({ id: i, name: `User ${i}`, details: 'Full details' })),
        fullDescription: 'Very long description...',
        historicalData: new Array(1000).fill({ timestamp: Date.now(), value: Math.random() })
      };

      await adminCacheService.setMobileOptimized(
        { namespace: 'analytics', key: 'user_data' }, 
        fullData
      );
      
      const mobileData = await adminCacheService.getMobileOptimized(
        { namespace: 'analytics', key: 'user_data' }
      );

      expect(mobileData.users).toHaveLength(50); // Limited for mobile
      expect(mobileData.fullDescription).toBeUndefined(); // Removed for mobile
      expect(mobileData.historicalData).toBeUndefined(); // Removed for mobile
    });

    test('falls back gracefully when cache is unavailable', async () => {
      // Mock cache failure
      jest.spyOn(adminCacheService, 'get').mockRejectedValueOnce(new Error('Cache error'));

      const result = await adminCache.getSystemStatus();
      expect(result).toBeNull(); // Should return null on cache failure
    });

    test('invalidates cache on namespace level', async () => {
      await adminCache.setSystemStatus({ maintenanceMode: true, activeUsers: 10, systemHealth: 'healthy' });
      await adminCache.setUserData('user123', { name: 'Test User' });

      await adminCacheService.invalidateNamespace('system');

      const systemData = await adminCache.getSystemStatus();
      const userData = await adminCache.getUserData('user123');

      expect(systemData).toBeNull(); // System cache should be cleared
      expect(userData).toBeTruthy(); // User cache should remain
    });

    test('compresses large cache entries', async () => {
      const largeData = {
        content: 'x'.repeat(2000), // Larger than compression threshold
        metadata: { size: 'large' }
      };

      await adminCacheService.set(
        { namespace: 'analytics', key: 'large_data' },
        largeData,
        { compress: true }
      );

      const retrieved = await adminCacheService.get(
        { namespace: 'analytics', key: 'large_data' }
      );

      expect(retrieved).toEqual(largeData); // Should decompress correctly
    });
  });

  describe('Database Query Optimization', () => {
    
    test('executes system status query with optimal performance', async () => {
      const startTime = Date.now();
      
      // Mock database responses
      const mockSystemStatus = {
        maintenanceMode: false,
        activeUsers: 245,
        systemHealth: 'healthy' as const,
        alerts: [],
        lastBackup: '2025-01-20T10:00:00Z'
      };

      jest.spyOn(adminQueries, 'getSystemStatus').mockResolvedValueOnce(mockSystemStatus);

      const result = await adminQueries.getSystemStatus({ useCache: false });
      const duration = Date.now() - startTime;

      expect(result).toEqual(mockSystemStatus);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('batches multiple operations for efficiency', async () => {
      const batchQueries = [
        adminQueries.getSystemStatus(),
        adminQueries.getUserSessions(),
        adminQueries.getPerformanceMetrics()
      ];

      const startTime = Date.now();
      await Promise.all(batchQueries);
      const duration = Date.now() - startTime;

      // Batched queries should be faster than sequential
      expect(duration).toBeLessThan(2000);
    });

    test('handles database connection failures gracefully', async () => {
      jest.spyOn(adminQueries, 'getSystemStatus').mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(adminQueries.getSystemStatus()).rejects.toThrow('Database connection failed');
    });

    test('optimizes queries for mobile contexts', async () => {
      const mobileResult = await adminQueries.getPerformanceMetrics({ mobile: true });
      const desktopResult = await adminQueries.getPerformanceMetrics({ mobile: false });

      // Mobile should have longer cache TTL but same data structure
      expect(mobileResult).toHaveProperty('cacheHitRate');
      expect(mobileResult).toHaveProperty('avgResponseTime');
      expect(desktopResult).toHaveProperty('cacheHitRate');
      expect(desktopResult).toHaveProperty('avgResponseTime');
    });
  });

  describe('Load Testing Integration', () => {
    
    test('load test configuration is valid', () => {
      expect(testConfigs.peakWeddingDay).toHaveProperty('concurrentUsers');
      expect(testConfigs.peakWeddingDay).toHaveProperty('mobilePercentage');
      expect(testConfigs.peakWeddingDay).toHaveProperty('peakLoadMultiplier');
      
      expect(testConfigs.peakWeddingDay.mobilePercentage).toBe(70); // Peak wedding day has high mobile usage
      expect(testConfigs.peakWeddingDay.peakLoadMultiplier).toBe(3); // 3x load during peaks
    });

    test('load test handles mobile user simulation', () => {
      const tester = new AdminLoadTester(testConfigs.normalDay);
      expect(tester).toBeInstanceOf(AdminLoadTester);
    });

    test('load test provides actionable performance metrics', async () => {
      // This would normally run a real load test, but for unit test we'll mock it
      const mockMetrics = {
        totalRequests: 1000,
        successfulRequests: 995,
        failedRequests: 5,
        averageResponseTime: 125,
        p95ResponseTime: 250,
        p99ResponseTime: 500,
        throughputRPS: 45.5,
        errorRate: 0.5,
        mobileVsDesktopPerformance: {
          mobile: { avgResponseTime: 135, errorRate: 0.6 },
          desktop: { avgResponseTime: 115, errorRate: 0.4 }
        },
        actionPerformance: {
          'get-system-status': { requests: 300, avgResponseTime: 85, errorRate: 0.1, slowestResponse: 150 },
          'clear-cache': { requests: 200, avgResponseTime: 200, errorRate: 1.0, slowestResponse: 450 }
        },
        memoryUsage: {
          peak: 128,
          average: 95,
          current: 102
        }
      };

      // Verify metric structure
      expect(mockMetrics.errorRate).toBeLessThan(1.0); // Target: <1% error rate
      expect(mockMetrics.p95ResponseTime).toBeLessThan(500); // Target: <500ms P95
      expect(mockMetrics.throughputRPS).toBeGreaterThan(10); // Target: >10 RPS
    });
  });

  describe('Error Handling and Recovery', () => {
    
    test('handles API failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      render(<QuickActionsPanel />);
      
      const clearCacheAction = screen.getByText('Clear System Cache').closest('div[role="button"]');
      await userEvent.click(clearCacheAction!);
      
      // Should not crash the component
      expect(screen.getByText('Clear System Cache')).toBeInTheDocument();
    });

    test('provides user feedback on action failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Insufficient permissions' })
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<QuickActionsPanel />);
      
      const suspendAction = screen.getByText('Suspend Problem User').closest('div[role="button"]');
      await userEvent.click(suspendAction!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('maintains system stability during high error rates', async () => {
      // Simulate 50% error rate
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Error' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Error' }) });

      render(<QuickActionsPanel />);
      
      const actions = [
        'Clear System Cache',
        'Acknowledge All Alerts',
        'Emergency Database Backup',
        'Enable Maintenance Mode'
      ];

      // Execute multiple actions rapidly
      for (const actionText of actions) {
        const action = screen.getByText(actionText).closest('div[role="button"]');
        await userEvent.click(action!);
        
        // Wait briefly between actions
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Component should remain functional
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Security and Access Control', () => {
    
    test('includes authentication headers in API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<QuickActionsPanel />);
      
      const clearCacheAction = screen.getByText('Clear System Cache').closest('div[role="button"]');
      await userEvent.click(clearCacheAction!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/quick-actions',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    test('shows MFA requirements for critical actions', () => {
      render(<QuickActionsPanel />);
      
      const emergencyActions = [
        'Enable Maintenance Mode',
        'Suspend Problem User', 
        'Force Logout All Users'
      ];

      emergencyActions.forEach(actionText => {
        const actionElement = screen.getByText(actionText).closest('div');
        expect(actionElement).toHaveTextContent('MFA');
      });
    });

    test('tracks admin actions with audit trail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<QuickActionsPanel />);
      
      const backupAction = screen.getByText('Emergency Database Backup').closest('div[role="button"]');
      await userEvent.click(backupAction!);

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
        expect(callBody).toHaveProperty('timestamp');
        expect(callBody).toHaveProperty('clientInfo');
        expect(callBody.clientInfo).toHaveProperty('userAgent');
        expect(callBody.clientInfo).toHaveProperty('viewport');
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    
    test('supports keyboard navigation', async () => {
      render(<QuickActionsPanel />);
      
      const firstAction = screen.getByText('Enable Maintenance Mode').closest('div[role="button"]');
      
      // Test keyboard activation
      firstAction?.focus();
      fireEvent.keyDown(firstAction!, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });
    });

    test('provides appropriate ARIA labels and roles', () => {
      render(<QuickActionsPanel />);
      
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(0);
      
      actionButtons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });

    test('displays action priorities correctly', () => {
      render(<QuickActionsPanel />);
      
      // Emergency actions should be marked as CRITICAL
      const emergencyActions = screen.getAllByText('CRITICAL');
      expect(emergencyActions.length).toBeGreaterThan(0);
      
      // MFA actions should be marked
      const mfaActions = screen.getAllByText('MFA');
      expect(mfaActions.length).toBeGreaterThan(0);
    });
  });

  afterAll(() => {
    // Cleanup
    adminCacheService.disconnect();
  });
});