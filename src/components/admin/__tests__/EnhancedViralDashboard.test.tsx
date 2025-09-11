import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { EnhancedViralDashboard } from '../EnhancedViralDashboard';
import * as useEnhancedViralMetricsModule from '@/hooks/useEnhancedViralMetrics';

// Mock the hook
const mockUseEnhancedViralMetrics = jest.spyOn(
  useEnhancedViralMetricsModule,
  'useEnhancedViralMetrics',
);
const mockUseViralSimulationPresets = jest.spyOn(
  useEnhancedViralMetricsModule,
  'useViralSimulationPresets',
);

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Play: () => <div data-testid="play-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Target: () => <div data-testid="target-icon" />,
}));

describe('EnhancedViralDashboard', () => {
  const mockMetrics = {
    enhanced: {
      coefficient: 1.25,
      sustainableCoefficient: 1.1,
      acceptanceRate: 0.75,
      conversionTime: 12,
      qualityScore: 0.8,
      seasonalMultiplier: 1.4,
      velocityTrend: 'accelerating' as const,
      weddingIndustryFactors: {
        seasonalImpact: 'peak' as const,
        vendorDensity: 'high' as const,
        marketMaturity: 'mature' as const,
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
    bottlenecks: [
      {
        stage: 'invitation_acceptance',
        impact: 0.2,
        severity: 'medium' as const,
        description: 'Room for improvement',
      },
    ],
    recommendations: [
      {
        priority: 'high' as const,
        category: 'messaging',
        action: 'Optimize messaging',
        expectedImpact: 0.15,
        implementationEffort: 'medium' as const,
        roi: 2.5,
      },
    ],
    isLoading: false,
    error: null,
    lastUpdated: new Date('2024-06-15T10:00:00Z'),
  };

  const mockSimulation = {
    result: null,
    isRunning: false,
    error: null,
  };

  const mockRefreshMetrics = jest.fn();
  const mockRunSimulation = jest.fn();

  const mockSimulationPresets = {
    incentiveBoost: {
      type: 'incentive' as const,
      name: 'Referral Incentive Campaign',
      description:
        'Offer premium features to users who successfully refer new vendors',
      parameters: { incentiveAmount: 25, targetSegment: 'all' as const },
      expectedImpact: {
        invitationRate: 1.3,
        conversionRate: 1.2,
        activationRate: 1.1,
      },
      cost: 2500,
      duration: 30,
    },
    seasonalPush: {
      type: 'timing' as const,
      name: 'Off-Season Engagement Push',
      description: 'Targeted campaigns during winter months',
      parameters: {
        timingOptimization: 'seasonal' as const,
        targetSegment: 'photographers' as const,
      },
      expectedImpact: {
        invitationRate: 1.5,
        conversionRate: 1.1,
        cycleTime: -3,
      },
      cost: 5000,
      duration: 60,
    },
    qualityFocus: {
      type: 'targeting' as const,
      name: 'High-Value Connection Targeting',
      description: 'Focus on high-quality vendors',
      parameters: { targetSegment: 'venues' as const },
      expectedImpact: { conversionRate: 1.4, activationRate: 1.3 },
      cost: 1500,
      duration: 45,
    },
    messagingOptimization: {
      type: 'messaging' as const,
      name: 'Wedding-Focused Messaging',
      description: 'Wedding industry-specific language',
      parameters: { messagingVariant: 'wedding_focused' },
      expectedImpact: { conversionRate: 1.25, activationRate: 1.15 },
      cost: 800,
      duration: 21,
    },
  };

  beforeEach(() => {
    mockUseEnhancedViralMetrics.mockReturnValue({
      metrics: mockMetrics,
      simulation: mockSimulation,
      refreshMetrics: mockRefreshMetrics,
      runSimulation: mockRunSimulation,
      isHealthy: true,
      growthTrend: 'up' as const,
      topBottleneck: mockMetrics.bottlenecks[0],
      topRecommendation: mockMetrics.recommendations[0],
      coefficientTrendData: [
        { date: '2024-05-01', value: 1.1 },
        { date: '2024-05-15', value: 1.2 },
        { date: '2024-06-01', value: 1.25 },
      ],
      loopPerformanceData: [
        { name: 'supplier to couple', value: 45, efficiency: 0.9 },
        { name: 'couple to supplier', value: 32, efficiency: 0.75 },
      ],
      seasonalData: [
        { month: 'Jan', multiplier: 0.7 },
        { month: 'Feb', multiplier: 0.7 },
        { month: 'May', multiplier: 1.4 },
        { month: 'Jun', multiplier: 1.4 },
      ],
    });

    mockUseViralSimulationPresets.mockReturnValue(mockSimulationPresets);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the dashboard with all tabs', () => {
      render(<EnhancedViralDashboard />);

      expect(
        screen.getByText('Enhanced Viral Coefficient Tracking'),
      ).toBeInTheDocument();

      // Check all tabs are present
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Viral Loops')).toBeInTheDocument();
      expect(screen.getByText('Seasonal')).toBeInTheDocument();
      expect(screen.getByText('Simulation')).toBeInTheDocument();
      expect(screen.getByText('Optimization')).toBeInTheDocument();
    });

    it('should render overview tab by default', () => {
      render(<EnhancedViralDashboard />);

      // Should show overview content
      expect(screen.getByText('1.25')).toBeInTheDocument(); // Coefficient
      expect(screen.getByText('75%')).toBeInTheDocument(); // Acceptance rate
      expect(screen.getByText('12 days')).toBeInTheDocument(); // Conversion time
    });

    it('should show loading state when metrics are loading', () => {
      mockUseEnhancedViralMetrics.mockReturnValue({
        metrics: { ...mockMetrics, isLoading: true },
        simulation: mockSimulation,
        refreshMetrics: mockRefreshMetrics,
        runSimulation: mockRunSimulation,
        isHealthy: false,
        growthTrend: 'stable' as const,
        topBottleneck: null,
        topRecommendation: null,
        coefficientTrendData: [],
        loopPerformanceData: [],
        seasonalData: [],
      });

      render(<EnhancedViralDashboard />);

      expect(screen.getByText('Loading viral metrics...')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUseEnhancedViralMetrics.mockReturnValue({
        metrics: {
          ...mockMetrics,
          error: 'Failed to load metrics',
          isLoading: false,
        },
        simulation: mockSimulation,
        refreshMetrics: mockRefreshMetrics,
        runSimulation: mockRunSimulation,
        isHealthy: false,
        growthTrend: 'stable' as const,
        topBottleneck: null,
        topRecommendation: null,
        coefficientTrendData: [],
        loopPerformanceData: [],
        seasonalData: [],
      });

      render(<EnhancedViralDashboard />);

      expect(
        screen.getByText('Error loading viral metrics'),
      ).toBeInTheDocument();
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', () => {
      render(<EnhancedViralDashboard />);

      // Click on Viral Loops tab
      fireEvent.click(screen.getByText('Viral Loops'));
      expect(screen.getByText('Loop Performance Analysis')).toBeInTheDocument();

      // Click on Seasonal tab
      fireEvent.click(screen.getByText('Seasonal'));
      expect(screen.getByText('Wedding Season Impact')).toBeInTheDocument();

      // Click on Simulation tab
      fireEvent.click(screen.getByText('Simulation'));
      expect(screen.getByText('Viral Growth Simulation')).toBeInTheDocument();

      // Click on Optimization tab
      fireEvent.click(screen.getByText('Optimization'));
      expect(
        screen.getByText('Growth Optimization Recommendations'),
      ).toBeInTheDocument();

      // Click back to Overview
      fireEvent.click(screen.getByText('Overview'));
      expect(screen.getByText('Current Viral Coefficient')).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('should display health indicator correctly for healthy metrics', () => {
      render(<EnhancedViralDashboard />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should display unhealthy status for poor metrics', () => {
      mockUseEnhancedViralMetrics.mockReturnValue({
        metrics: {
          ...mockMetrics,
          enhanced: {
            ...mockMetrics.enhanced,
            coefficient: 0.6,
            qualityScore: 0.3,
            acceptanceRate: 0.2,
          },
        },
        simulation: mockSimulation,
        refreshMetrics: mockRefreshMetrics,
        runSimulation: mockRunSimulation,
        isHealthy: false,
        growthTrend: 'down' as const,
        topBottleneck: mockMetrics.bottlenecks[0],
        topRecommendation: mockMetrics.recommendations[0],
        coefficientTrendData: [],
        loopPerformanceData: [],
        seasonalData: [],
      });

      render(<EnhancedViralDashboard />);

      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should display growth trend indicators', () => {
      render(<EnhancedViralDashboard />);

      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    });

    it('should show wedding industry context', () => {
      render(<EnhancedViralDashboard />);

      expect(screen.getByText('Peak Season')).toBeInTheDocument();
      expect(screen.getByText('High Density')).toBeInTheDocument();
      expect(screen.getByText('Mature Market')).toBeInTheDocument();
    });
  });

  describe('Viral Loops Tab', () => {
    it('should display loop performance data', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Viral Loops'));

      expect(screen.getByText('Loop Performance Analysis')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

      // Should show loop types
      expect(screen.getByText('supplier_to_couple')).toBeInTheDocument();
      expect(screen.getByText('couple_to_supplier')).toBeInTheDocument();
    });

    it('should display efficiency metrics for loops', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Viral Loops'));

      // Should show efficiency percentages
      expect(screen.getByText('90%')).toBeInTheDocument(); // supplier_to_couple efficiency
      expect(screen.getByText('75%')).toBeInTheDocument(); // couple_to_supplier efficiency
    });
  });

  describe('Seasonal Tab', () => {
    it('should display seasonal analysis', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Seasonal'));

      expect(screen.getByText('Wedding Season Impact')).toBeInTheDocument();
      expect(screen.getByText('Current Period')).toBeInTheDocument();
      expect(screen.getByText('Peak Season (1.4x)')).toBeInTheDocument();
    });

    it('should show seasonal recommendations', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Seasonal'));

      expect(
        screen.getByText('Peak season - maximize viral campaigns'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('High vendor density - leverage network effects'),
      ).toBeInTheDocument();
    });
  });

  describe('Simulation Tab', () => {
    it('should display simulation presets', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Simulation'));

      expect(screen.getByText('Viral Growth Simulation')).toBeInTheDocument();
      expect(
        screen.getByText('Referral Incentive Campaign'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Off-Season Engagement Push'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('High-Value Connection Targeting'),
      ).toBeInTheDocument();
      expect(screen.getByText('Wedding-Focused Messaging')).toBeInTheDocument();
    });

    it('should run simulation when preset is clicked', async () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Simulation'));

      // Click on a simulation preset
      const runButtons = screen.getAllByText('Run Simulation');
      fireEvent.click(runButtons[0]);

      expect(mockRunSimulation).toHaveBeenCalledWith(
        mockSimulationPresets.incentiveBoost,
        mockSimulationPresets.incentiveBoost.duration,
      );
    });

    it('should show simulation results when available', () => {
      const simulationResult = {
        projectedOutcome: {
          baselineCoefficient: 1.0,
          projectedCoefficient: 1.3,
          expectedNewUsers: 150,
          projectedRevenue: 50000,
          confidenceLevel: 0.85,
        },
        riskAnalysis: {
          implementationRisk: 'medium' as const,
          marketRisk: 'low' as const,
          seasonalRisk: 'low' as const,
          overallRisk: 'medium' as const,
        },
        timelineProjections: [
          { week: 1, coefficient: 1.05, users: 525 },
          { week: 2, coefficient: 1.15, users: 555 },
        ],
        roiAnalysis: {
          investmentCost: 5000,
          projectedReturn: 18000,
          roi: 2.6,
          paybackPeriod: 7,
          breakEvenPoint: 5,
        },
        recommendations: ['Test recommendation'],
      };

      mockUseEnhancedViralMetrics.mockReturnValue({
        metrics: mockMetrics,
        simulation: {
          result: simulationResult,
          isRunning: false,
          error: null,
        },
        refreshMetrics: mockRefreshMetrics,
        runSimulation: mockRunSimulation,
        isHealthy: true,
        growthTrend: 'up' as const,
        topBottleneck: mockMetrics.bottlenecks[0],
        topRecommendation: mockMetrics.recommendations[0],
        coefficientTrendData: [],
        loopPerformanceData: [],
        seasonalData: [],
      });

      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Simulation'));

      expect(screen.getByText('Simulation Results')).toBeInTheDocument();
      expect(screen.getByText('1.30')).toBeInTheDocument(); // Projected coefficient
      expect(screen.getByText('150')).toBeInTheDocument(); // Expected new users
      expect(screen.getByText('£50,000')).toBeInTheDocument(); // Projected revenue
      expect(screen.getByText('2.6x')).toBeInTheDocument(); // ROI
    });
  });

  describe('Optimization Tab', () => {
    it('should display bottlenecks and recommendations', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Optimization'));

      expect(
        screen.getByText('Growth Optimization Recommendations'),
      ).toBeInTheDocument();
      expect(screen.getByText('Current Bottlenecks')).toBeInTheDocument();
      expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
    });

    it('should show bottleneck details', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Optimization'));

      expect(screen.getByText('invitation_acceptance')).toBeInTheDocument();
      expect(screen.getByText('Room for improvement')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument(); // Severity
    });

    it('should show recommendation details', () => {
      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Optimization'));

      expect(screen.getByText('Optimize messaging')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Expected Impact: 15%')).toBeInTheDocument();
      expect(screen.getByText('ROI: 2.5x')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh metrics when refresh button is clicked', () => {
      render(<EnhancedViralDashboard />);

      const refreshButton = screen
        .getByTestId('refresh-icon')
        .closest('button');
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(mockRefreshMetrics).toHaveBeenCalled();
      }
    });
  });

  describe('Time Range Selector', () => {
    it('should display time range options', () => {
      render(<EnhancedViralDashboard />);

      expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument();
    });

    it('should update metrics when time range changes', async () => {
      render(<EnhancedViralDashboard />);

      const select = screen.getByDisplayValue('Last 30 Days');
      fireEvent.change(select, { target: { value: '7d' } });

      // Should have called useEnhancedViralMetrics with new timeframe
      await waitFor(() => {
        expect(mockUseEnhancedViralMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            timeframe: '7d',
          }),
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EnhancedViralDashboard />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(5);
    });

    it('should support keyboard navigation for tabs', () => {
      render(<EnhancedViralDashboard />);

      const viralLoopsTab = screen.getByText('Viral Loops');
      viralLoopsTab.focus();
      fireEvent.keyDown(viralLoopsTab, { key: 'Enter' });

      expect(screen.getByText('Loop Performance Analysis')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display simulation errors', () => {
      mockUseEnhancedViralMetrics.mockReturnValue({
        metrics: mockMetrics,
        simulation: {
          result: null,
          isRunning: false,
          error: 'Simulation failed: insufficient data',
        },
        refreshMetrics: mockRefreshMetrics,
        runSimulation: mockRunSimulation,
        isHealthy: true,
        growthTrend: 'up' as const,
        topBottleneck: mockMetrics.bottlenecks[0],
        topRecommendation: mockMetrics.recommendations[0],
        coefficientTrendData: [],
        loopPerformanceData: [],
        seasonalData: [],
      });

      render(<EnhancedViralDashboard />);

      fireEvent.click(screen.getByText('Simulation'));

      expect(screen.getByText('Simulation Error')).toBeInTheDocument();
      expect(
        screen.getByText('Simulation failed: insufficient data'),
      ).toBeInTheDocument();
    });
  });
});
