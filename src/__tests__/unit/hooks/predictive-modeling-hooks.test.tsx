/**
 * WS-232 Predictive Modeling React Hooks Unit Tests
 * Comprehensive testing of all prediction hooks and functionality
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  usePredictiveModeling,
  useBatchPredictions,
  usePredictionHistory,
  useModelPerformance,
  PredictionType,
} from '@/hooks/usePredictiveModeling';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useRetry');
const mockToast = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: mockToast,
    error: mockToast,
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUser = {
  id: 'user-123',
  organization_id: 'org-456',
};

const mockAuth = {
  user: mockUser,
};

const mockRetry = {
  retry: jest.fn(),
};

// Mock implementations
jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue(mockAuth);
jest.mocked(require('@/hooks/useRetry').useRetry).mockReturnValue(mockRetry);

describe('WS-232 Predictive Modeling Hooks Unit Tests', () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    mockRetry.retry.mockImplementation((fn) => fn());
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('usePredictiveModeling Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.predict).toBeInstanceOf(Function);
      expect(result.current.weddingPredictions).toBeDefined();
    });

    it('should handle vendor performance prediction successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'pred-123',
          type: 'vendor_performance',
          result: {
            overallScore: 0.92,
            strengths: ['On-time delivery', 'Communication'],
            weaknesses: ['Pricing'],
            futurePerformance: 0.89,
            recommendForBooking: true,
          },
          confidence: 0.89,
          metadata: {
            modelVersion: '1.0.0',
            processingTime: 1500,
            timestamp: new Date().toISOString(),
            dataPoints: 45,
          },
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      let predictionResult: any;

      await act(async () => {
        predictionResult =
          await result.current.weddingPredictions.analyzeVendorPerformance({
            vendorId: 'vendor-123',
            metrics: {
              completionRate: 0.95,
              communicationScore: 4.8,
              timelyDelivery: 0.92,
              clientSatisfaction: 4.7,
              priceCompetitiveness: 3.2,
            },
            historicalData: [
              { date: '2024-01-01', performance: 0.9 },
              { date: '2024-02-01', performance: 0.92 },
            ],
          });
      });

      expect(predictionResult).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith('/api/ml/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('vendor_performance'),
      });
    });

    it('should handle budget optimization prediction', async () => {
      const mockBudgetResponse = {
        success: true,
        data: {
          id: 'pred-budget-456',
          type: 'budget_optimization',
          result: {
            recommendations: [
              {
                category: 'venue',
                suggestedAmount: 10000,
                reasoning: 'Based on guest count and location',
                savings: 2000,
              },
              {
                category: 'catering',
                suggestedAmount: 7500,
                reasoning: 'Seasonal pricing adjustment',
                savings: 1500,
              },
            ],
            riskAreas: ['Photography budget low'],
            totalSavings: 3500,
          },
          confidence: 0.85,
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBudgetResponse),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      let budgetResult: any;

      await act(async () => {
        budgetResult = await result.current.weddingPredictions.optimizeBudget({
          totalBudget: 25000,
          allocations: [
            { category: 'venue', allocated: 12000, spent: 0 },
            { category: 'catering', allocated: 9000, spent: 0 },
            { category: 'photography', allocated: 2000, spent: 0 },
          ],
          weddingDate: '2025-06-15',
          guestCount: 120,
          location: 'London',
        });
      });

      expect(budgetResult).toEqual(mockBudgetResponse.data);
      expect(budgetResult.result.totalSavings).toBe(3500);
      expect(budgetResult.result.recommendations).toHaveLength(2);
    });

    it('should handle guest behavior prediction', async () => {
      const mockGuestResponse = {
        success: true,
        data: {
          id: 'pred-guest-789',
          type: 'guest_behavior',
          result: {
            expectedAttendance: 104,
            dietaryRequirements: {
              vegetarian: 12,
              vegan: 5,
              gluten_free: 8,
              no_restrictions: 79,
            },
            accommodationNeeds: 25,
            childrenCount: 8,
            rsvpTimeline: [
              { date: '2025-04-01', expectedResponses: 30 },
              { date: '2025-05-01', expectedResponses: 60 },
              { date: '2025-06-01', expectedResponses: 90 },
            ],
          },
          confidence: 0.82,
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGuestResponse),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      let guestResult: any;

      await act(async () => {
        guestResult =
          await result.current.weddingPredictions.predictGuestBehavior({
            totalInvited: 120,
            demographics: {
              age_25_35: 40,
              age_35_45: 35,
              age_45_plus: 25,
              families_with_children: 15,
            },
            weddingStyle: 'traditional',
            location: 'countryside',
            season: 'summer',
          });
      });

      expect(guestResult.result.expectedAttendance).toBe(104);
      expect(guestResult.result.childrenCount).toBe(8);
      expect(guestResult.result.rsvpTimeline).toHaveLength(3);
    });

    it('should handle timeline conflict detection', async () => {
      const mockTimelineResponse = {
        success: true,
        data: {
          id: 'pred-timeline-101',
          type: 'timeline_conflicts',
          result: {
            conflicts: [
              {
                eventIds: ['event-1', 'event-2'],
                type: 'vendor',
                severity: 'high',
                resolution:
                  'Stagger photographer between ceremony and reception',
              },
            ],
            suggestions: [
              'Add 30-minute buffer between ceremony and reception',
              'Coordinate vendor arrival times',
            ],
          },
          confidence: 0.91,
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTimelineResponse),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      let timelineResult: any;

      await act(async () => {
        timelineResult =
          await result.current.weddingPredictions.detectTimelineConflicts({
            events: [
              {
                id: 'event-1',
                title: 'Ceremony',
                startTime: '2025-06-15T14:00:00Z',
                endTime: '2025-06-15T15:00:00Z',
                location: 'Main Hall',
                vendors: ['photographer', 'officiant'],
              },
              {
                id: 'event-2',
                title: 'Reception',
                startTime: '2025-06-15T15:00:00Z',
                endTime: '2025-06-15T22:00:00Z',
                location: 'Ballroom',
                vendors: ['photographer', 'catering', 'dj'],
              },
            ],
            weddingDate: '2025-06-15',
            venues: ['Main Hall', 'Ballroom'],
          });
      });

      expect(timelineResult.result.conflicts).toHaveLength(1);
      expect(timelineResult.result.conflicts[0].severity).toBe('high');
      expect(timelineResult.result.suggestions).toContain(
        expect.stringContaining('buffer'),
      );
    });

    it('should handle prediction errors gracefully', async () => {
      const errorMessage = 'OpenAI API unavailable';
      jest.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: errorMessage },
          }),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        try {
          await result.current.predict('vendor_performance', { test: true });
        } catch (error) {
          expect((error as Error).message).toBe(errorMessage);
        }
      });

      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('failed'));
    });

    it('should cache identical prediction requests', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'pred-cached',
          type: 'vendor_performance',
          result: { performanceScore: 0.9 },
          confidence: 0.85,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      };

      jest.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      const predictionData = {
        vendorId: 'same-vendor',
        metrics: { score: 0.9 },
      };

      // First call
      await act(async () => {
        await result.current.predict('vendor_performance', predictionData);
      });

      // Second identical call (should use cache)
      await act(async () => {
        await result.current.predict('vendor_performance', predictionData);
      });

      // Should only make one fetch call due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('useBatchPredictions Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBatchPredictions(), {
        wrapper: createWrapper,
      });

      expect(result.current.isStartingBatch).toBe(false);
      expect(result.current.activeBatches).toEqual([]);
      expect(result.current.queueLength).toBe(0);
      expect(result.current.weddingBatchPredictions).toBeDefined();
    });

    it('should handle wedding portfolio analysis batch', async () => {
      const mockBatchResponse = {
        success: true,
        data: {
          batchId: 'batch-123',
          name: 'Wedding Portfolio Analysis (3 weddings)',
          status: 'completed',
          results: [
            {
              requestId: 'req-1',
              status: 'completed',
              result: {
                id: 'pred-1',
                result: { recommendations: [], totalSavings: 2500 },
              },
            },
            {
              requestId: 'req-2',
              status: 'completed',
              result: {
                id: 'pred-2',
                result: { recommendations: [], totalSavings: 3200 },
              },
            },
          ],
          metadata: {
            totalRequests: 2,
            completed: 2,
            failed: 0,
          },
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBatchResponse),
      } as Response);

      const { result } = renderHook(() => useBatchPredictions(), {
        wrapper: createWrapper,
      });

      let batchResult: any;

      await act(async () => {
        batchResult =
          await result.current.weddingBatchPredictions.analyzeWeddingPortfolio([
            {
              id: 'wedding-1',
              budget: 25000,
              guestCount: 120,
              date: '2025-06-15',
              location: 'London',
              vendors: ['venue', 'catering', 'photography'],
            },
            {
              id: 'wedding-2',
              budget: 30000,
              guestCount: 150,
              date: '2025-07-20',
              location: 'Edinburgh',
              vendors: ['venue', 'catering', 'photography', 'flowers'],
            },
          ]);
      });

      expect(batchResult).toEqual(mockBatchResponse.data);
      expect(fetch).toHaveBeenCalledWith('/api/ml/predictions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Wedding Portfolio Analysis'),
      });
    });

    it('should handle vendor portfolio analysis batch', async () => {
      const mockVendorBatchResponse = {
        success: true,
        data: {
          batchId: 'vendor-batch-456',
          name: 'Vendor Portfolio Analysis (4 vendors)',
          status: 'completed',
          results: [
            {
              requestId: 'vendor-req-1',
              status: 'completed',
              result: {
                result: { overallScore: 0.92, recommendForBooking: true },
              },
            },
          ],
        },
      };

      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVendorBatchResponse),
      } as Response);

      const { result } = renderHook(() => useBatchPredictions(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        await result.current.weddingBatchPredictions.analyzeVendorPortfolio([
          {
            id: 'vendor-1',
            category: 'photography',
            metrics: {
              completionRate: 0.95,
              clientSatisfaction: 4.8,
            },
          },
          {
            id: 'vendor-2',
            category: 'catering',
            metrics: {
              completionRate: 0.88,
              clientSatisfaction: 4.5,
            },
          },
        ]);
      });

      expect(fetch).toHaveBeenCalledWith('/api/ml/predictions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Vendor Portfolio Analysis'),
      });
    });

    it('should manage batch queue correctly', async () => {
      const { result } = renderHook(() => useBatchPredictions(), {
        wrapper: createWrapper,
      });

      // Add items to queue
      await act(async () => {
        result.current.addToBatchQueue({
          id: 'batch-queued-1',
          name: 'Queued Batch 1',
          requests: [
            {
              type: 'vendor_performance' as PredictionType,
              data: { test: true },
            },
          ],
        });
      });

      expect(result.current.queueLength).toBe(1);

      // Queue should auto-process when capacity allows
      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { batchId: 'processed-batch' },
          }),
      } as Response);

      await act(async () => {
        await result.current.processBatchQueue();
      });

      expect(result.current.queueLength).toBe(0);
    });

    it('should handle batch processing errors', async () => {
      jest.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: 'Batch processing failed' },
          }),
      } as Response);

      const { result } = renderHook(() => useBatchPredictions(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        try {
          await result.current.startBatch({
            id: 'failing-batch',
            name: 'Failing Batch',
            requests: [
              {
                type: 'vendor_performance' as PredictionType,
                data: { test: true },
              },
            ],
          });
        } catch (error) {
          expect((error as Error).message).toContain('Batch processing failed');
        }
      });
    });
  });

  describe('Wedding Industry Helper Functions', () => {
    it('should calculate wedding category budgets correctly', () => {
      const {
        getWeddingCategoryBudget,
      } = require('@/hooks/usePredictiveModeling');

      const venueBudget = getWeddingCategoryBudget(25000, 'venue');
      expect(venueBudget).toEqual({
        min: 8750, // 35% of 25000
        max: 12500, // 50% of 25000
        suggested: 10000, // 40% of 25000
      });

      const cateringBudget = getWeddingCategoryBudget(25000, 'catering');
      expect(cateringBudget).toEqual({
        min: 6250, // 25% of 25000
        max: 10000, // 40% of 25000
        suggested: 7500, // 30% of 25000
      });

      const photographyBudget = getWeddingCategoryBudget(25000, 'photography');
      expect(photographyBudget).toEqual({
        min: 2000, // 8% of 25000
        max: 3750, // 15% of 25000
        suggested: 2500, // 10% of 25000
      });
    });

    it('should calculate wedding complexity correctly', () => {
      const {
        calculateWeddingComplexity,
      } = require('@/hooks/usePredictiveModeling');

      const simpleWedding = calculateWeddingComplexity({
        guestCount: 50,
        venueCount: 1,
        vendorCount: 3,
        eventCount: 5,
        customRequests: 1,
      });
      expect(simpleWedding).toBe('simple');

      const complexWedding = calculateWeddingComplexity({
        guestCount: 200,
        venueCount: 3,
        vendorCount: 12,
        eventCount: 15,
        customRequests: 8,
      });
      expect(complexWedding).toBe('complex');

      const elaborateWedding = calculateWeddingComplexity({
        guestCount: 300,
        venueCount: 4,
        vendorCount: 20,
        eventCount: 25,
        customRequests: 15,
      });
      expect(elaborateWedding).toBe('elaborate');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors with retry logic', async () => {
      const networkError = new Error('Network request failed');

      // First two calls fail, third succeeds
      jest
        .mocked(fetch)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { id: 'retry-success', confidence: 0.8 },
            }),
        } as Response);

      mockRetry.retry.mockImplementation(async (fn) => {
        // Simulate retry logic
        try {
          return await fn();
        } catch (error) {
          // Retry once
          return await fn();
        }
      });

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      let predictionResult: any;

      await act(async () => {
        predictionResult = await result.current.predict('vendor_performance', {
          test: true,
        });
      });

      expect(predictionResult.id).toBe('retry-success');
      expect(mockRetry.retry).toHaveBeenCalled();
    });

    it('should handle missing user context', () => {
      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValueOnce({
        user: null,
      });

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      act(async () => {
        try {
          await result.current.predict('vendor_performance', { test: true });
        } catch (error) {
          expect((error as Error).message).toContain(
            'Organization context required',
          );
        }
      });
    });

    it('should handle empty prediction responses', async () => {
      jest.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: null,
          }),
      } as Response);

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        const prediction = await result.current.predict('vendor_performance', {
          test: true,
        });
        expect(prediction).toBe(null);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up resources on unmount', () => {
      const { unmount } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      // No memory leaks or console errors should occur
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid successive predictions efficiently', async () => {
      jest.mocked(fetch).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { id: `pred-${Date.now()}`, confidence: 0.8 },
            }),
        } as Response),
      );

      const { result } = renderHook(() => usePredictiveModeling(), {
        wrapper: createWrapper,
      });

      const rapidPredictions = Array.from({ length: 5 }, (_, i) =>
        result.current.predict('vendor_performance', { rapidTest: i }),
      );

      await act(async () => {
        const results = await Promise.all(rapidPredictions);
        expect(results).toHaveLength(5);
        results.forEach((result) => {
          expect(result.confidence).toBe(0.8);
        });
      });
    });
  });
});
