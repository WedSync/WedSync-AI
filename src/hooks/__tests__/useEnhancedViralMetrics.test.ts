import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useEnhancedViralMetrics,
  useViralSimulationPresets,
} from '../useEnhancedViralMetrics';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useEnhancedViralMetrics', () => {
  const mockAuthToken = 'mock-auth-token';

  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(mockAuthToken);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Hook Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useEnhancedViralMetrics());

      expect(result.current.metrics.enhanced).toBeNull();
      expect(result.current.metrics.historical).toEqual([]);
      expect(result.current.metrics.loops).toEqual([]);
      expect(result.current.metrics.seasonal).toBeNull();
      expect(result.current.metrics.bottlenecks).toEqual([]);
      expect(result.current.metrics.recommendations).toEqual([]);
      expect(result.current.metrics.isLoading).toBe(false);
      expect(result.current.metrics.error).toBeNull();
      expect(result.current.metrics.lastUpdated).toBeNull();

      expect(result.current.simulation.result).toBeNull();
      expect(result.current.simulation.isRunning).toBe(false);
      expect(result.current.simulation.error).toBeNull();
    });

    it('should fetch metrics on mount', async () => {
      const mockMetricsResponse = {
        enhanced: {
          coefficient: 1.25,
          sustainableCoefficient: 1.1,
          acceptanceRate: 0.75,
          conversionTime: 12,
          qualityScore: 0.8,
          seasonalMultiplier: 1.4,
          velocityTrend: 'accelerating',
          weddingIndustryFactors: {
            seasonalImpact: 'peak',
            vendorDensity: 'high',
            marketMaturity: 'mature',
          },
          metadata: {
            totalInvitations: 150,
            totalAcceptances: 112,
            analysisDate: '2024-06-15T10:00:00Z',
            cohortSize: 75,
          },
        },
        historical: [
          {
            date: '2024-05-01',
            coefficient: 1.1,
            invitationRate: 2.5,
            conversionRate: 0.65,
            activationRate: 0.8,
          },
          {
            date: '2024-05-15',
            coefficient: 1.2,
            invitationRate: 2.8,
            conversionRate: 0.7,
            activationRate: 0.85,
          },
          {
            date: '2024-06-01',
            coefficient: 1.25,
            invitationRate: 3.0,
            conversionRate: 0.75,
            activationRate: 0.9,
          },
        ],
        loops: [
          {
            type: 'supplier_to_couple',
            count: 45,
            conversionRate: 0.8,
            revenue: 35000,
            efficiency: 0.9,
          },
          {
            type: 'couple_to_supplier',
            count: 32,
            conversionRate: 0.65,
            revenue: 25000,
            efficiency: 0.75,
          },
        ],
        seasonal: {
          currentMultiplier: 1.4,
          peakSeason: { months: [5, 6, 7, 8, 9], multiplier: 1.4 },
          offSeason: { months: [11, 12, 1, 2, 3], multiplier: 0.7 },
        },
      };

      const mockBottlenecksResponse = {
        bottlenecks: [
          {
            stage: 'invitation_acceptance',
            impact: 0.2,
            severity: 'medium',
            description: 'Room for improvement in acceptance rates',
          },
        ],
        recommendations: [
          {
            priority: 'high',
            category: 'messaging',
            action: 'Optimize invitation messaging',
            expectedImpact: 0.15,
            implementationEffort: 'medium',
            roi: 2.5,
          },
        ],
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBottlenecksResponse,
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.metrics.enhanced).not.toBeNull();
      });

      expect(result.current.metrics.enhanced?.coefficient).toBe(1.25);
      expect(result.current.metrics.historical).toHaveLength(3);
      expect(result.current.metrics.loops).toHaveLength(2);
      expect(result.current.metrics.seasonal?.currentMultiplier).toBe(1.4);
      expect(result.current.metrics.bottlenecks).toHaveLength(1);
      expect(result.current.metrics.recommendations).toHaveLength(1);
      expect(result.current.metrics.lastUpdated).not.toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.metrics.error).not.toBeNull();
      });

      expect(result.current.metrics.error).toBe('Network error');
      expect(result.current.metrics.isLoading).toBe(false);
      expect(result.current.metrics.enhanced).toBeNull();
    });
  });

  describe('Hook Options', () => {
    it('should use custom timeframe parameter', async () => {
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      renderHook(() => useEnhancedViralMetrics({ timeframe: '7d' }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('timeframe=7d'),
          expect.objectContaining({
            headers: { Authorization: `Bearer ${mockAuthToken}` },
          }),
        );
      });
    });

    it('should include vendor type filter when provided', async () => {
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      renderHook(() =>
        useEnhancedViralMetrics({
          timeframe: '30d',
          vendorType: 'photographers',
        }),
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('vendorType=photographers'),
          expect.any(Object),
        );
      });
    });

    it('should auto-refresh when enabled', async () => {
      jest.useFakeTimers();

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      renderHook(() =>
        useEnhancedViralMetrics({
          autoRefresh: true,
          refreshInterval: 10000, // 10 seconds
        }),
      );

      // Initial fetch
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      const initialCallCount = (fetch as jest.MockedFunction<typeof fetch>).mock
        .calls.length;

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should have made additional fetch calls
      await waitFor(() => {
        expect(
          (fetch as jest.MockedFunction<typeof fetch>).mock.calls.length,
        ).toBeGreaterThan(initialCallCount);
      });

      jest.useRealTimers();
    });
  });

  describe('Simulation Functionality', () => {
    it('should run simulation successfully', async () => {
      const mockSimulationResult = {
        projectedOutcome: {
          baselineCoefficient: 1.0,
          projectedCoefficient: 1.3,
          expectedNewUsers: 150,
          projectedRevenue: 50000,
          confidenceLevel: 0.85,
        },
        riskAnalysis: {
          implementationRisk: 'medium',
          marketRisk: 'low',
          seasonalRisk: 'low',
          overallRisk: 'medium',
        },
        timelineProjections: [
          { week: 1, coefficient: 1.05, users: 525 },
          { week: 2, coefficient: 1.15, users: 555 },
          { week: 3, coefficient: 1.25, users: 590 },
          { week: 4, coefficient: 1.3, users: 625 },
        ],
        roiAnalysis: {
          investmentCost: 5000,
          projectedReturn: 18000,
          roi: 2.6,
          paybackPeriod: 7,
          breakEvenPoint: 5,
        },
        recommendations: [
          'Focus on peak wedding season timing',
          'Target photographer segment for maximum impact',
        ],
      };

      // Mock initial fetch calls
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response)
        // Mock simulation API call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSimulationResult,
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      const intervention = {
        type: 'incentive' as const,
        parameters: {
          incentiveAmount: 50,
          targetSegment: 'photographers' as const,
        },
        expectedImpact: {
          invitationRate: 1.3,
          conversionRate: 1.2,
        },
        cost: 5000,
      };

      await act(async () => {
        await result.current.runSimulation(intervention, 30);
      });

      await waitFor(() => {
        expect(result.current.simulation.result).not.toBeNull();
      });

      expect(
        result.current.simulation.result?.projectedOutcome.projectedCoefficient,
      ).toBe(1.3);
      expect(result.current.simulation.result?.roiAnalysis.roi).toBe(2.6);
      expect(result.current.simulation.isRunning).toBe(false);
      expect(result.current.simulation.error).toBeNull();
    });

    it('should handle simulation errors', async () => {
      // Mock initial fetch calls
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response)
        // Mock simulation API error
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Insufficient data for simulation' }),
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      const intervention = {
        type: 'timing' as const,
        parameters: {
          timingOptimization: 'seasonal' as const,
        },
        expectedImpact: {
          invitationRate: 1.2,
        },
        cost: 3000,
      };

      await act(async () => {
        await result.current.runSimulation(intervention, 21);
      });

      await waitFor(() => {
        expect(result.current.simulation.error).not.toBeNull();
      });

      expect(result.current.simulation.error).toBe(
        'Insufficient data for simulation',
      );
      expect(result.current.simulation.result).toBeNull();
      expect(result.current.simulation.isRunning).toBe(false);
    });
  });

  describe('Computed Values', () => {
    it('should calculate health status correctly', async () => {
      const healthyMetrics = {
        enhanced: {
          coefficient: 1.5,
          qualityScore: 0.8,
          acceptanceRate: 0.7,
          velocityTrend: 'accelerating',
        },
        historical: [],
        loops: [],
        seasonal: null,
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => healthyMetrics,
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(true);
      });

      expect(result.current.growthTrend).toBe('up');
    });

    it('should identify unhealthy metrics', async () => {
      const unhealthyMetrics = {
        enhanced: {
          coefficient: 0.6,
          qualityScore: 0.3,
          acceptanceRate: 0.2,
          velocityTrend: 'decelerating',
        },
        historical: [],
        loops: [],
        seasonal: null,
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => unhealthyMetrics,
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      });

      expect(result.current.growthTrend).toBe('down');
    });

    it('should provide chart data transformations', async () => {
      const metricsWithData = {
        enhanced: {},
        historical: [
          {
            date: '2024-05-01',
            coefficient: 1.1,
            invitationRate: 2.5,
            conversionRate: 0.65,
            activationRate: 0.8,
          },
          {
            date: '2024-05-15',
            coefficient: 1.25,
            invitationRate: 2.8,
            conversionRate: 0.7,
            activationRate: 0.85,
          },
        ],
        loops: [
          { type: 'supplier_to_couple', count: 45, efficiency: 0.9 },
          { type: 'couple_to_supplier', count: 32, efficiency: 0.75 },
        ],
        seasonal: {
          peakSeason: { months: [5, 6, 7, 8, 9], multiplier: 1.4 },
          offSeason: { months: [11, 12, 1, 2, 3], multiplier: 0.7 },
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => metricsWithData,
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ bottlenecks: [], recommendations: [] }),
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.coefficientTrendData).toHaveLength(2);
      });

      expect(result.current.coefficientTrendData[0]).toEqual({
        date: '2024-05-01',
        value: 1.1,
      });

      expect(result.current.loopPerformanceData).toHaveLength(2);
      expect(result.current.loopPerformanceData[0].name).toBe(
        'supplier to couple',
      );
      expect(result.current.loopPerformanceData[0].value).toBe(45);
      expect(result.current.loopPerformanceData[0].efficiency).toBe(0.9);

      expect(result.current.seasonalData).toHaveLength(12);
      expect(result.current.seasonalData[4]).toEqual({
        month: 'May',
        multiplier: 1.4,
      }); // Peak season
      expect(result.current.seasonalData[0]).toEqual({
        month: 'Jan',
        multiplier: 0.7,
      }); // Off season
    });
  });

  describe('Top Recommendations and Bottlenecks', () => {
    it('should identify top bottleneck and recommendation', async () => {
      const mockBottlenecksResponse = {
        bottlenecks: [
          {
            stage: 'invitation_acceptance',
            impact: 0.4,
            severity: 'high',
            description: 'Low acceptance rate',
          },
          {
            stage: 'seasonal_optimization',
            impact: 0.2,
            severity: 'medium',
            description: 'Off-season issues',
          },
        ],
        recommendations: [
          {
            priority: 'critical',
            category: 'messaging',
            action: 'Fix invitation messaging',
            expectedImpact: 0.3,
            implementationEffort: 'high',
            roi: 3.0,
          },
          {
            priority: 'high',
            category: 'timing',
            action: 'Optimize send timing',
            expectedImpact: 0.15,
            implementationEffort: 'medium',
            roi: 2.0,
          },
        ],
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            enhanced: {},
            historical: [],
            loops: [],
            seasonal: null,
          }),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => mockBottlenecksResponse,
        } as Response);

      const { result } = renderHook(() => useEnhancedViralMetrics());

      await waitFor(() => {
        expect(result.current.topBottleneck).not.toBeNull();
      });

      expect(result.current.topBottleneck?.stage).toBe('invitation_acceptance');
      expect(result.current.topBottleneck?.impact).toBe(0.4);

      expect(result.current.topRecommendation?.priority).toBe('critical');
      expect(result.current.topRecommendation?.category).toBe('messaging');
    });
  });
});

describe('useViralSimulationPresets', () => {
  it('should provide predefined simulation presets', () => {
    const { result } = renderHook(() => useViralSimulationPresets());

    expect(result.current.incentiveBoost).toBeDefined();
    expect(result.current.seasonalPush).toBeDefined();
    expect(result.current.qualityFocus).toBeDefined();
    expect(result.current.messagingOptimization).toBeDefined();

    // Verify incentive boost preset
    expect(result.current.incentiveBoost.type).toBe('incentive');
    expect(result.current.incentiveBoost.parameters.incentiveAmount).toBe(25);
    expect(result.current.incentiveBoost.cost).toBe(2500);
    expect(result.current.incentiveBoost.duration).toBe(30);

    // Verify seasonal push preset
    expect(result.current.seasonalPush.type).toBe('timing');
    expect(result.current.seasonalPush.parameters.timingOptimization).toBe(
      'seasonal',
    );
    expect(result.current.seasonalPush.parameters.targetSegment).toBe(
      'photographers',
    );

    // Verify quality focus preset
    expect(result.current.qualityFocus.type).toBe('targeting');
    expect(result.current.qualityFocus.parameters.targetSegment).toBe('venues');

    // Verify messaging optimization preset
    expect(result.current.messagingOptimization.type).toBe('messaging');
    expect(
      result.current.messagingOptimization.parameters.messagingVariant,
    ).toBe('wedding_focused');
  });

  it('should provide stable preset references', () => {
    const { result, rerender } = renderHook(() => useViralSimulationPresets());

    const firstRender = result.current;

    rerender();

    const secondRender = result.current;

    // References should be stable due to useMemo
    expect(firstRender.incentiveBoost).toBe(secondRender.incentiveBoost);
    expect(firstRender.seasonalPush).toBe(secondRender.seasonalPush);
    expect(firstRender.qualityFocus).toBe(secondRender.qualityFocus);
    expect(firstRender.messagingOptimization).toBe(
      secondRender.messagingOptimization,
    );
  });
});
