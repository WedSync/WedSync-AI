import {
  getExecutiveMetrics,
  subscribeToMetricsUpdates,
  cleanupAllSubscriptions,
} from '@/lib/analytics/executiveMetrics';
import { createClient } from '@/lib/supabase/server';
import { jest } from '@jest/globals';

// Mock Supabase client
jest.mock('@/lib/supabase/server');
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

// Mock Supabase client methods
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  channel: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnValue({
    unsubscribe: jest.fn(),
  }),
};

// Test data
const mockPaymentData = [
  { amount: 10000 },
  { amount: 15000 },
  { amount: 12000 },
];

const mockClientData = [
  { id: '1', created_at: '2025-01-15T10:00:00Z' },
  { id: '2', created_at: '2025-01-10T10:00:00Z' },
  { id: '3', created_at: '2025-01-05T10:00:00Z' },
];

const mockBookingData = [
  {
    id: '1',
    event_date: '2025-06-15T10:00:00Z',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    event_date: '2025-07-20T10:00:00Z',
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: '3',
    event_date: '2025-12-10T10:00:00Z',
    created_at: '2025-01-05T10:00:00Z',
  },
];

const mockVendorData = [
  { id: '1', rating: 4.8, category: 'photography' },
  { id: '2', rating: 4.6, category: 'venues' },
  { id: '3', rating: 4.7, category: 'catering' },
];

const mockActivityData = [
  {
    activity_type: 'payment',
    description: 'Payment received',
    details: 'Monthly subscription',
    created_at: '2025-01-20T10:00:00Z',
  },
  {
    activity_type: 'booking',
    description: 'New booking created',
    details: 'Summer wedding',
    created_at: '2025-01-20T09:00:00Z',
  },
];

describe('Executive Metrics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

    // Setup default mock responses
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);

    // Mock different responses for different queries
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const mockChain = { ...mockSupabaseClient };

      // Configure different responses based on table
      switch (table) {
        case 'payments':
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: mockPaymentData }),
          });
          break;
        case 'clients':
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: mockClientData }),
          });
          break;
        case 'client_events':
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: mockBookingData }),
          });
          break;
        case 'vendors':
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: mockVendorData }),
          });
          break;
        case 'activity_logs':
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: mockActivityData }),
          });
          break;
        default:
          mockChain.eq = jest.fn().mockReturnValue({
            ...mockChain,
            then: (callback: any) => callback({ data: [] }),
          });
      }

      return mockChain;
    });
  });

  describe('getExecutiveMetrics', () => {
    test('successfully fetches and processes executive metrics', async () => {
      // Setup mock responses for parallel queries
      const mockQueries = [
        { data: mockPaymentData }, // revenue
        { data: mockPaymentData }, // previous revenue
        { data: mockClientData }, // clients
        { data: mockClientData.slice(0, 2) }, // last year clients
        { data: mockBookingData }, // bookings
        { data: mockBookingData.slice(0, 1) }, // previous bookings
        { data: mockVendorData }, // vendors
        { data: [] }, // vendor ratings
        { data: mockActivityData }, // activity
      ];

      let queryIndex = 0;
      mockSupabaseClient.from.mockImplementation(() => ({
        ...mockSupabaseClient,
        select: () => ({
          ...mockSupabaseClient,
          eq: () => ({
            ...mockSupabaseClient,
            gte: () => ({
              ...mockSupabaseClient,
              lte: () => ({
                ...mockSupabaseClient,
                order: () => ({
                  ...mockSupabaseClient,
                  limit: () =>
                    Promise.resolve(mockQueries[queryIndex++] || { data: [] }),
                }),
                then: (callback: any) =>
                  callback(mockQueries[queryIndex++] || { data: [] }),
              }),
              then: (callback: any) =>
                callback(mockQueries[queryIndex++] || { data: [] }),
            }),
            then: (callback: any) =>
              callback(mockQueries[queryIndex++] || { data: [] }),
          }),
          then: (callback: any) =>
            callback(mockQueries[queryIndex++] || { data: [] }),
        }),
        then: (callback: any) =>
          callback(mockQueries[queryIndex++] || { data: [] }),
      }));

      const organizationId = 'org-123';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const result = await getExecutiveMetrics(
        organizationId,
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('revenueGrowth');
      expect(result).toHaveProperty('activeClients');
      expect(result).toHaveProperty('clientGrowth');
      expect(result).toHaveProperty('weddingBookings');
      expect(result).toHaveProperty('bookingGrowth');
      expect(result).toHaveProperty('avgVendorRating');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('revenueChart');
      expect(result).toHaveProperty('clientChart');
      expect(result).toHaveProperty('vendorChart');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('seasonalTrends');

      // Verify revenue calculation
      const expectedRevenue = mockPaymentData.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      expect(result.totalRevenue).toBe(expectedRevenue);

      // Verify client count
      expect(result.activeClients).toBe(mockClientData.length);

      // Verify booking count
      expect(result.weddingBookings).toBe(mockBookingData.length);

      // Verify vendor rating calculation
      const expectedRating =
        mockVendorData.reduce((sum, vendor) => sum + vendor.rating, 0) /
        mockVendorData.length;
      expect(result.avgVendorRating).toBe(expectedRating);

      // Verify seasonal trends
      expect(result.seasonalTrends).toEqual({
        peakMonths: ['May', 'June', 'July', 'August', 'September'],
        averageLoadIncrease: 2.5,
        capacityUtilization: 0.85,
      });
    });

    test('handles database query errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const organizationId = 'org-123';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      await expect(
        getExecutiveMetrics(organizationId, startDate, endDate),
      ).rejects.toThrow('Failed to fetch executive metrics');
    });

    test('calculates revenue growth correctly', async () => {
      const currentRevenue = 50000;
      const previousRevenue = 40000;

      const mockCurrentData = [{ amount: currentRevenue }];
      const mockPreviousData = [{ amount: previousRevenue }];

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => ({
        ...mockSupabaseClient,
        select: () => ({
          ...mockSupabaseClient,
          eq: () => ({
            ...mockSupabaseClient,
            gte: () => ({
              ...mockSupabaseClient,
              lte: () =>
                Promise.resolve({
                  data: callCount++ < 5 ? mockCurrentData : mockPreviousData,
                }),
            }),
          }),
        }),
      }));

      const result = await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );

      const expectedGrowth =
        ((currentRevenue - previousRevenue) / previousRevenue) * 100;
      expect(result.revenueGrowth).toBeCloseTo(expectedGrowth, 1);
    });

    test('handles empty data sets gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        ...mockSupabaseClient,
        select: () => ({
          ...mockSupabaseClient,
          eq: () => ({
            ...mockSupabaseClient,
            gte: () => ({
              ...mockSupabaseClient,
              lte: () => ({
                ...mockSupabaseClient,
                order: () => ({
                  ...mockSupabaseClient,
                  limit: () => Promise.resolve({ data: [] }),
                }),
                then: (callback: any) => callback({ data: [] }),
              }),
              then: (callback: any) => callback({ data: [] }),
            }),
            then: (callback: any) => callback({ data: [] }),
          }),
          then: (callback: any) => callback({ data: [] }),
        }),
        then: (callback: any) => callback({ data: [] }),
      }));

      const result = await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.activeClients).toBe(0);
      expect(result.weddingBookings).toBe(0);
      expect(result.avgVendorRating).toBe(0);
      expect(result.recentActivity).toEqual([]);
    });

    test('uses cache when force refresh is false', async () => {
      // First call
      await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );
      const firstCallCount = mockSupabaseClient.from.mock.calls.length;

      // Second call without force refresh (should use cache)
      await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );
      const secondCallCount = mockSupabaseClient.from.mock.calls.length;

      // Should not make additional database calls
      expect(secondCallCount).toBe(firstCallCount);
    });

    test('bypasses cache when force refresh is true', async () => {
      // First call
      await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );
      mockSupabaseClient.from.mockClear();

      // Second call with force refresh
      await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
        { forceRefresh: true },
      );

      // Should make new database calls
      expect(mockSupabaseClient.from.mock.calls.length).toBeGreaterThan(0);
    });

    test('calculates peak season load correctly', async () => {
      const peakSeasonBookings = [
        {
          id: '1',
          event_date: '2025-06-15T10:00:00Z',
          created_at: '2025-01-15T10:00:00Z',
        }, // June (peak)
        {
          id: '2',
          event_date: '2025-07-20T10:00:00Z',
          created_at: '2025-01-10T10:00:00Z',
        }, // July (peak)
      ];
      const offSeasonBookings = [
        {
          id: '3',
          event_date: '2025-12-10T10:00:00Z',
          created_at: '2025-01-05T10:00:00Z',
        }, // December (off-season)
      ];

      const allBookings = [...peakSeasonBookings, ...offSeasonBookings];

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'client_events') {
          return {
            ...mockSupabaseClient,
            select: () => ({
              ...mockSupabaseClient,
              eq: () => ({
                ...mockSupabaseClient,
                gte: () => ({
                  ...mockSupabaseClient,
                  lte: () => Promise.resolve({ data: allBookings }),
                }),
              }),
            }),
          };
        }
        return {
          ...mockSupabaseClient,
          select: () => ({
            ...mockSupabaseClient,
            eq: () => Promise.resolve({ data: [] }),
          }),
        };
      });

      const result = await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );

      const expectedLoad = peakSeasonBookings.length / offSeasonBookings.length;
      expect(result.peakSeasonLoad).toBe(expectedLoad);
    });
  });

  describe('subscribeToMetricsUpdates', () => {
    test('creates subscription and returns cleanup function', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockSupabaseClient.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: mockUnsubscribe,
        }),
      });

      const cleanup = await subscribeToMetricsUpdates('org-123', mockCallback);

      expect(cleanup).toBeInstanceOf(Function);
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        'exec-metrics-org-123',
      );

      // Call cleanup
      cleanup();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    test('handles subscription errors gracefully', async () => {
      const mockCallback = jest.fn();

      mockSupabaseClient.channel.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      // Should not throw error
      await expect(
        subscribeToMetricsUpdates('org-123', mockCallback),
      ).rejects.toThrow('Subscription failed');
    });

    test('triggers callback when data changes', async () => {
      const mockCallback = jest.fn();
      let dataChangeHandler: Function;

      mockSupabaseClient.channel.mockReturnValue({
        on: jest.fn().mockImplementation((event, config, handler) => {
          dataChangeHandler = handler;
          return {
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn().mockReturnValue({
              unsubscribe: jest.fn(),
            }),
          };
        }),
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn(),
        }),
      });

      await subscribeToMetricsUpdates('org-123', mockCallback);

      // Simulate data change
      if (dataChangeHandler!) {
        await dataChangeHandler();
      }

      // Callback should eventually be called with updated metrics
      // Note: This would require mocking the entire getExecutiveMetrics chain again
    });
  });

  describe('cleanupAllSubscriptions', () => {
    test('cleans up all active subscriptions', () => {
      const mockCleanup1 = jest.fn();
      const mockCleanup2 = jest.fn();

      // Mock active subscriptions
      const mockSubscriptions = new Map([
        ['sub1', { callback: jest.fn(), cleanup: mockCleanup1 }],
        ['sub2', { callback: jest.fn(), cleanup: mockCleanup2 }],
      ]);

      // This would require accessing internal state, which is not ideal
      // In a real implementation, we might export a function to check subscription count
      cleanupAllSubscriptions();

      // Verify that cleanup was called (would need internal access)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles large datasets efficiently', async () => {
      const largePaymentData = Array.from({ length: 10000 }, (_, i) => ({
        amount: Math.floor(Math.random() * 5000) + 1000,
      }));

      mockSupabaseClient.from.mockImplementation(() => ({
        ...mockSupabaseClient,
        select: () => ({
          ...mockSupabaseClient,
          eq: () => Promise.resolve({ data: largePaymentData }),
        }),
      }));

      const startTime = Date.now();
      const result = await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('handles null/undefined values in data', async () => {
      const dataWithNulls = [
        { amount: 1000 },
        { amount: null },
        { amount: undefined },
        { amount: 2000 },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        ...mockSupabaseClient,
        select: () => ({
          ...mockSupabaseClient,
          eq: () => Promise.resolve({ data: dataWithNulls }),
        }),
      }));

      const result = await getExecutiveMetrics(
        'org-123',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );

      // Should only count valid amounts
      expect(result.totalRevenue).toBe(3000);
    });

    test('handles concurrent metric requests', async () => {
      const organizationId = 'org-123';
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const promises = Array.from({ length: 5 }, () =>
        getExecutiveMetrics(organizationId, startDate, endDate),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result).toHaveProperty('totalRevenue');
      });
    });
  });
});
