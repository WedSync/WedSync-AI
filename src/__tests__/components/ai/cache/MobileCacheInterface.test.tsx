/**
 * WS-241 Mobile Cache Interface Tests
 * Testing mobile-optimized cache management interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import MobileCacheInterface from '@/components/ai/cache/MobileCacheInterface';
import type { CacheStats, CachePerformance } from '@/types/ai-cache';

// Mock fetch
global.fetch = jest.fn();

// Mock touch events
Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class MockTouchEvent extends Event {
    constructor(type: string, eventInitDict?: TouchEventInit) {
      super(type, eventInitDict);
    }
  },
});

const mockCacheStats: CacheStats = {
  overall: {
    hitRate: 85.3,
    monthlySavings: 78.5,
    totalQueries: 1245,
    storageUsed: '245MB',
    cacheEntries: 8932,
    averageResponseTime: 94,
    lastUpdated: new Date().toISOString(),
  },
  byType: [],
  trends: {
    hitRateChange: 2.1,
    savingsChange: 12.3,
    queryVolumeChange: 15.7,
  },
};

const mockPerformance: CachePerformance = {
  averageResponseTime: 94,
  peakResponseTime: 156,
  qualityScore: 4.3,
  metrics: [
    {
      timestamp: new Date().toISOString(),
      hitRate: 85.3,
      responseTime: 94,
      savings: 0.45,
      qualityScore: 4.3,
      queryVolume: 120,
    },
  ],
  topQueries: [],
};

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
function createSuccessResponse(data: any) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function createErrorResponse(data: any = {}) {
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve(data),
  });
}

function createFetchMock(urlMap: Record<string, any>) {
  return (url: string) => {
    const matchedKey = Object.keys(urlMap).find(key => url.includes(key));
    if (matchedKey) {
      return createSuccessResponse(urlMap[matchedKey]);
    }
    return createErrorResponse();
  };
}

function createDefaultFetchMock() {
  return createFetchMock({
    '/stats': mockCacheStats,
    '/performance': mockPerformance,
  });
}

// Assertion helpers to reduce nesting
function expectElementsVisible(...texts: string[]) {
  texts.forEach(text => {
    expect(screen.getByText(text)).toBeInTheDocument();
  });
}

function expectElementsNotVisible(...texts: string[]) {
  texts.forEach(text => {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  });
}

function expectButtonTouchTarget(buttonText: string, minHeight = '80px') {
  const button = screen.getByText(buttonText);
  const buttonElement = button.closest('button');
  const styles = window.getComputedStyle(buttonElement!);
  expect(styles.minHeight).toBe(minHeight);
}

function expectButtonStateAndClick(buttonText: string) {
  const button = screen.getByText(buttonText);
  expect(button).toBeInTheDocument();
  fireEvent.click(button);
}

function expectRoleBasedButtons(warmName: string | RegExp, clearName: string | RegExp) {
  const warmButton = screen.getByRole('button', { name: warmName });
  const clearButton = screen.getByRole('button', { name: clearName });
  expect(warmButton).toBeInTheDocument();
  expect(clearButton).toBeInTheDocument();
}

function expectCompactModeHides(text: string) {
  expect(screen.queryByText(text)).not.toBeInTheDocument();
}

function expectActivityItemsLimit(maxItems: number) {
  const activityItems = document.querySelectorAll('.space-y-2 > div');
  expect(activityItems.length).toBeLessThanOrEqual(maxItems);
}

function expectButtonFocus(buttonText: string) {
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  button.focus();
  expect(document.activeElement).toBe(button);
}

function renderMobileCacheInterface(props: Partial<{ supplierId: string; supplierType: string; compactMode: boolean }> = {}) {
  const defaultProps = {
    supplierId: "test-supplier-123",
    supplierType: "photographer" as const,
    ...props,
  };
  
  return render(<MobileCacheInterface {...defaultProps} />);
}

function createNeverResolvingFetchMock(urlPattern: string) {
  return (url: string) => {
    if (url.includes(urlPattern)) {
      return new Promise(() => {}); // Never resolves to test loading state
    }
    return createErrorResponse();
  };
}

function createFailureFetchMock(urlPattern: string, errorData: any = {}) {
  return (url: string) => {
    if (url.includes(urlPattern)) {
      return createErrorResponse(errorData);
    }
    return createSuccessResponse({});
  };
}

describe('MobileCacheInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation(createDefaultFetchMock());
  });

  describe('Mobile Layout', () => {
    test('renders swipeable stats cards horizontally', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        const swipeContainer = document.querySelector('.overflow-x-auto');
        expect(swipeContainer).toBeInTheDocument();
      });
    });

    test('displays key metrics in compact format', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('85.3%', '£78/mo', '94ms', '245MB');
      });
    });

    test('shows trend indicators for each metric', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('+2.1%', '+£12', '-15ms');
      });
    });
  });

  describe('Touch Interactions', () => {
    test('renders touch-optimized action buttons', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Warm Cache', 'Clear Old');
        expectButtonTouchTarget('Warm Cache');
      });
    });

    test('handles warm cache button tap', async () => {
      const warmCacheResponse = { success: true, data: { queriesQueued: 25 } };
      const warmCacheFetchMock = createFetchMock({
        '/warm': warmCacheResponse,
      });
      (global.fetch as jest.Mock).mockImplementation(warmCacheFetchMock);

      renderMobileCacheInterface();

      await waitFor(() => expectButtonStateAndClick('Warm Cache'));
      await waitFor(() => expect(screen.getByText('Warming...')).toBeInTheDocument());
    });

    test('handles clear cache button tap', async () => {
      const clearCacheResponse = { success: true, data: { clearedEntries: 150 } };
      const clearCacheFetchMock = createFetchMock({
        '/clear': clearCacheResponse,
      });
      (global.fetch as jest.Mock).mockImplementation(clearCacheFetchMock);

      renderMobileCacheInterface();

      await waitFor(() => expectButtonStateAndClick('Clear Old'));
      await waitFor(() => expect(screen.getByText('Clearing...')).toBeInTheDocument());
    });

    test('applies active scale animation on touch', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        const warmButton = screen.getByText('Warm Cache').closest('button');
        expect(warmButton).toHaveClass('active:scale-95');
      });
    });
  });

  describe('Performance Chart', () => {
    test('renders simplified mobile performance chart', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Performance Trend', 'Last 24h');
      });
    });

    test('shows no data message when metrics empty', async () => {
      const emptyPerformance = { ...mockPerformance, metrics: [] };
      const emptyPerformanceFetchMock = createFetchMock({
        '/performance': emptyPerformance,
      });
      (global.fetch as jest.Mock).mockImplementation(emptyPerformanceFetchMock);

      renderMobileCacheInterface();

      await waitFor(() => {
        expect(
          screen.getByText('No performance data available'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity', () => {
    test('displays recent cache activity list', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Recent Activity', 'Cache Hit', '£0.45 saved');
      });
    });

    test('shows different activity types with correct indicators', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Cache Hit', 'Warmed');
      });
    });

    test('truncates long query text appropriately', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        // Should truncate query text and add ellipsis
        expect(
          screen.getByText(/What are your wedding photography packages.../),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Season Alert', () => {
    test('shows seasonal optimization alert', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expect(screen.getByText('Peak Wedding Season')).toBeInTheDocument();
        expect(screen.getByText(/60% more queries expected/)).toBeInTheDocument();
      });
    });

    test('hides seasonal alert in compact mode', async () => {
      renderMobileCacheInterface({ compactMode: true });

      await waitFor(() => {
        expectElementsNotVisible('Peak Wedding Season');
      });
    });

    test('provides link to seasonal optimization', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('View seasonal optimization →');
      });
    });
  });

  describe('Compact Mode', () => {
    test('limits activity items in compact mode', async () => {
      renderMobileCacheInterface({ compactMode: true });

      await waitFor(() => {
        expectActivityItemsLimit(2);
      });
    });

    test('hides view all activity button in compact mode', async () => {
      renderMobileCacheInterface({ compactMode: true });

      await waitFor(() => {
        expectCompactModeHides('View All Activity');
      });
    });
  });

  describe('Settings Navigation', () => {
    test('provides settings button in header', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Settings');
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading spinner initially', () => {
      renderMobileCacheInterface();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('shows loading states for individual actions', async () => {
      const neverResolvingFetchMock = createNeverResolvingFetchMock('/warm');
      (global.fetch as jest.Mock).mockImplementation(neverResolvingFetchMock);

      renderMobileCacheInterface();

      await waitFor(() => expectButtonStateAndClick('Warm Cache'));
      expect(screen.getByText('Warming...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderMobileCacheInterface();

      await waitFor(() => {
        expectElementsVisible('Quick Actions');
      });
    });

    test('handles failed cache operations', async () => {
      const failedWarmCacheMock = createFailureFetchMock('/warm', { error: 'Failed to warm cache' });
      (global.fetch as jest.Mock).mockImplementation(failedWarmCacheMock);

      renderMobileCacheInterface();

      await waitFor(() => expectButtonStateAndClick('Warm Cache'));
      await waitFor(() => expectElementsVisible('Warm Cache'));
    });
  });

  describe('Accessibility', () => {
    test('provides proper button roles and labels', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectRoleBasedButtons(/warm cache/i, /clear old/i);
      });
    });

    test('supports keyboard navigation', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        expectButtonFocus('warm cache');
      });
    });

    test('provides appropriate ARIA labels for dynamic content', async () => {
      renderMobileCacheInterface();

      await waitFor(() => {
        const hitRateElement = screen.getByText('85.3%');
        const hitRateCard = hitRateElement.closest('[role="status"]');
        expect(hitRateCard).toBeTruthy();
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('adapts to different mobile screen sizes', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderMobileCacheInterface();

      await waitFor(() => {
        const actionGrid = document.querySelector('.grid-cols-2');
        expect(actionGrid).toBeInTheDocument();
      });
    });
  });
});
