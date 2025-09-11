import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ClientJourney } from '../ClientJourney';

// Mock the useClientAnalytics hook
const mockUseClientAnalytics = vi.fn();
vi.mock('../../hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => mockUseClientAnalytics(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Map: () => <div data-testid="map-icon" />,
  Users: () => <div data-testid="users-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  BarChart3: () => <div data-testid="bar-chart-3-icon" />,
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  Legend: () => <div data-testid="legend" />,
  FunnelChart: ({ children }: any) => (
    <div data-testid="funnel-chart">{children}</div>
  ),
  Funnel: ({ dataKey }: any) => <div data-testid={`funnel-${dataKey}`} />,
  LabelList: () => <div data-testid="label-list" />,
}));

const mockJourneyData = {
  journey: {
    funnelStages: [
      {
        stage: 'Discovery',
        users: 1250,
        completion: 100,
        dropoff: 0,
        avgTimeSpent: 45,
      },
      {
        stage: 'Registration',
        users: 987,
        completion: 78.9,
        dropoff: 263,
        avgTimeSpent: 120,
      },
      {
        stage: 'Onboarding',
        users: 823,
        completion: 65.8,
        dropoff: 164,
        avgTimeSpent: 300,
      },
      {
        stage: 'First Use',
        users: 745,
        completion: 59.6,
        dropoff: 78,
        avgTimeSpent: 180,
      },
      {
        stage: 'Active Usage',
        users: 672,
        completion: 53.8,
        dropoff: 73,
        avgTimeSpent: 450,
      },
      {
        stage: 'Premium Upgrade',
        users: 234,
        completion: 18.7,
        dropoff: 438,
        avgTimeSpent: 240,
      },
    ],
    cohortAnalysis: [
      {
        cohort: 'Jan 2024',
        month0: 100,
        month1: 75,
        month2: 65,
        month3: 58,
        month6: 45,
      },
      {
        cohort: 'Feb 2024',
        month0: 100,
        month1: 78,
        month2: 68,
        month3: 62,
        month6: 48,
      },
      {
        cohort: 'Mar 2024',
        month0: 100,
        month1: 82,
        month2: 72,
        month3: 65,
        month6: 52,
      },
    ],
    milestoneEngagement: {
      'First Client Added': {
        users: 745,
        timeToComplete: 2.3,
        completionRate: 89.4,
      },
      'First Form Created': {
        users: 623,
        timeToComplete: 4.7,
        completionRate: 75.7,
      },
      'First PDF Import': {
        users: 456,
        timeToComplete: 7.2,
        completionRate: 55.4,
      },
      'Calendar Integration': {
        users: 334,
        timeToComplete: 12.5,
        completionRate: 40.6,
      },
      'First Payment': {
        users: 234,
        timeToComplete: 18.3,
        completionRate: 28.4,
      },
    },
    journeyFlow: [
      {
        step: 'Landing Page',
        nextStep: 'Sign Up',
        conversionRate: 12.5,
        users: 2350,
      },
      {
        step: 'Sign Up',
        nextStep: 'Email Verification',
        conversionRate: 78.9,
        users: 294,
      },
      {
        step: 'Email Verification',
        nextStep: 'Onboarding',
        conversionRate: 85.2,
        users: 232,
      },
      {
        step: 'Onboarding',
        nextStep: 'Dashboard',
        conversionRate: 91.7,
        users: 198,
      },
      {
        step: 'Dashboard',
        nextStep: 'First Action',
        conversionRate: 67.3,
        users: 182,
      },
    ],
    segmentPerformance: [
      {
        segment: 'Photographers',
        conversion: 23.4,
        retention: 67.8,
        ltv: 1840,
      },
      { segment: 'Venues', conversion: 18.7, retention: 72.1, ltv: 2340 },
      { segment: 'Florists', conversion: 15.2, retention: 58.9, ltv: 1420 },
      { segment: 'Coordinators', conversion: 31.2, retention: 85.4, ltv: 3120 },
    ],
    touchpointAnalysis: {
      'Email Marketing': {
        interactions: 1250,
        conversions: 178,
        conversionRate: 14.2,
      },
      'Direct Traffic': {
        interactions: 890,
        conversions: 234,
        conversionRate: 26.3,
      },
      'Social Media': {
        interactions: 567,
        conversions: 89,
        conversionRate: 15.7,
      },
      Referrals: { interactions: 345, conversions: 123, conversionRate: 35.7 },
    },
  },
  loading: false,
  error: null,
  refreshData: vi.fn(),
  exportData: vi.fn(),
};

describe('ClientJourney', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClientAnalytics.mockReturnValue(mockJourneyData);
  });

  it('renders client journey analytics correctly', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Client Journey Analytics')).toBeInTheDocument();
    expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
    expect(screen.getByText('Cohort Analysis')).toBeInTheDocument();
  });

  it('displays funnel stages with correct metrics', () => {
    render(<ClientJourney timeRange="30d" />);

    // Check funnel stages
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('1,250 users')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // Completion rate

    expect(screen.getByText('Registration')).toBeInTheDocument();
    expect(screen.getByText('987 users')).toBeInTheDocument();
    expect(screen.getByText('78.9%')).toBeInTheDocument();

    expect(screen.getByText('Premium Upgrade')).toBeInTheDocument();
    expect(screen.getByText('234 users')).toBeInTheDocument();
    expect(screen.getByText('18.7%')).toBeInTheDocument();
  });

  it('shows dropoff analysis between stages', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Dropoff Analysis')).toBeInTheDocument();

    // Discovery to Registration: 263 users dropped off
    expect(screen.getByText('263 users')).toBeInTheDocument(); // Registration dropoff
    expect(screen.getByText('164 users')).toBeInTheDocument(); // Onboarding dropoff
    expect(screen.getByText('438 users')).toBeInTheDocument(); // Premium upgrade dropoff (highest)
  });

  it('renders cohort retention analysis', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Cohort Retention')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Check cohort data
    expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    expect(screen.getByText('Feb 2024')).toBeInTheDocument();
    expect(screen.getByText('Mar 2024')).toBeInTheDocument();

    // Check retention rates
    expect(screen.getByText('45%')).toBeInTheDocument(); // Jan 6-month retention
    expect(screen.getByText('52%')).toBeInTheDocument(); // Mar 6-month retention
  });

  it('displays milestone engagement metrics', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Key Milestones')).toBeInTheDocument();

    // Check milestones
    expect(screen.getByText('First Client Added')).toBeInTheDocument();
    expect(screen.getByText('89.4%')).toBeInTheDocument(); // Completion rate
    expect(screen.getByText('2.3 days')).toBeInTheDocument(); // Time to complete

    expect(screen.getByText('First Form Created')).toBeInTheDocument();
    expect(screen.getByText('75.7%')).toBeInTheDocument();
    expect(screen.getByText('4.7 days')).toBeInTheDocument();

    expect(screen.getByText('Calendar Integration')).toBeInTheDocument();
    expect(screen.getByText('40.6%')).toBeInTheDocument();
    expect(screen.getByText('12.5 days')).toBeInTheDocument();
  });

  it('shows journey flow with conversion rates', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Journey Flow')).toBeInTheDocument();

    // Check flow steps and conversion rates
    expect(screen.getByText('Landing Page → Sign Up')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument(); // Landing to sign up conversion

    expect(
      screen.getByText('Sign Up → Email Verification'),
    ).toBeInTheDocument();
    expect(screen.getByText('78.9%')).toBeInTheDocument(); // Sign up to verification

    expect(screen.getByText('Dashboard → First Action')).toBeInTheDocument();
    expect(screen.getByText('67.3%')).toBeInTheDocument(); // Dashboard to first action
  });

  it('displays segment performance comparison', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Segment Performance')).toBeInTheDocument();

    // Check segment data
    expect(screen.getByText('Photographers')).toBeInTheDocument();
    expect(screen.getByText('23.4%')).toBeInTheDocument(); // Conversion
    expect(screen.getByText('67.8%')).toBeInTheDocument(); // Retention
    expect(screen.getByText('£1,840')).toBeInTheDocument(); // LTV

    expect(screen.getByText('Coordinators')).toBeInTheDocument();
    expect(screen.getByText('31.2%')).toBeInTheDocument(); // Best conversion
    expect(screen.getByText('85.4%')).toBeInTheDocument(); // Best retention
    expect(screen.getByText('£3,120')).toBeInTheDocument(); // Highest LTV
  });

  it('shows touchpoint analysis', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Touchpoint Performance')).toBeInTheDocument();

    // Check touchpoint data
    expect(screen.getByText('Email Marketing')).toBeInTheDocument();
    expect(screen.getByText('1,250 interactions')).toBeInTheDocument();
    expect(screen.getByText('14.2%')).toBeInTheDocument(); // Conversion rate

    expect(screen.getByText('Referrals')).toBeInTheDocument();
    expect(screen.getByText('35.7%')).toBeInTheDocument(); // Best conversion rate

    expect(screen.getByText('Direct Traffic')).toBeInTheDocument();
    expect(screen.getByText('26.3%')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockJourneyData,
      loading: true,
      journey: null,
    });

    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Loading journey data...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockJourneyData,
      loading: false,
      journey: null,
      error: 'Failed to load journey analytics',
    });

    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Error loading journey data')).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load journey analytics'),
    ).toBeInTheDocument();
  });

  it('passes correct props to useClientAnalytics hook', () => {
    const timeRange = '7d';
    const supplierId = 'supplier-111';

    render(<ClientJourney timeRange={timeRange} supplierId={supplierId} />);

    expect(mockUseClientAnalytics).toHaveBeenCalledWith({
      timeRange,
      supplierId,
      type: 'journey',
    });
  });

  it('identifies critical dropoff points', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Critical Dropoff Points')).toBeInTheDocument();

    // Premium Upgrade has the highest dropoff (438 users)
    expect(
      screen.getByText('Active Usage → Premium Upgrade'),
    ).toBeInTheDocument();
    expect(screen.getByText('65.1% dropoff')).toBeInTheDocument(); // 438/672 * 100
  });

  it('shows funnel visualization chart', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByTestId('funnel-chart')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-users')).toBeInTheDocument();
  });

  it('calculates average time spent per stage', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Time Analysis')).toBeInTheDocument();

    // Check time spent formatting
    expect(screen.getByText('45s')).toBeInTheDocument(); // Discovery
    expect(screen.getByText('2m 0s')).toBeInTheDocument(); // Registration
    expect(screen.getByText('5m 0s')).toBeInTheDocument(); // Onboarding
    expect(screen.getByText('7m 30s')).toBeInTheDocument(); // Active Usage
  });

  it('handles interactive funnel stage selection', async () => {
    const user = userEvent.setup();
    render(<ClientJourney timeRange="30d" />);

    // Click on a funnel stage to see details
    await user.click(screen.getByText('Registration'));

    await waitFor(() => {
      expect(
        screen.getByText('Stage Details: Registration'),
      ).toBeInTheDocument();
      expect(screen.getByText('Improvement Suggestions')).toBeInTheDocument();
    });
  });

  it('displays wedding-specific journey insights', () => {
    const weddingJourneyData = {
      ...mockJourneyData,
      journey: {
        ...mockJourneyData.journey,
        weddingInsights: {
          seasonalJourney: {
            peakSeason: { faster: true, conversionIncrease: 23.4 },
            offSeason: { slower: true, longerConsideration: 45.2 },
          },
          weddingPhases: {
            'Planning Phase': {
              users: 567,
              avgDuration: 180,
              completionRate: 78.9,
            },
            'Final Month': {
              users: 234,
              avgDuration: 90,
              completionRate: 92.4,
            },
            'Wedding Day': {
              users: 189,
              avgDuration: 30,
              completionRate: 99.1,
            },
          },
        },
      },
    };

    mockUseClientAnalytics.mockReturnValue(weddingJourneyData);

    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('Wedding Journey Insights')).toBeInTheDocument();
    expect(
      screen.getByText('Planning Phase: 78.9% completion'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Wedding Day: 99.1% completion'),
    ).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <ClientJourney timeRange="30d" className="custom-journey" />,
    );

    expect(container.firstChild).toHaveClass('custom-journey');
  });

  it('handles empty journey data gracefully', () => {
    mockUseClientAnalytics.mockReturnValue({
      ...mockJourneyData,
      journey: {
        funnelStages: [],
        cohortAnalysis: [],
        milestoneEngagement: {},
        journeyFlow: [],
        segmentPerformance: [],
        touchpointAnalysis: {},
      },
    });

    render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('No journey data available')).toBeInTheDocument();
  });

  it('recommends optimization strategies', () => {
    render(<ClientJourney timeRange="30d" />);

    expect(
      screen.getByText('Optimization Recommendations'),
    ).toBeInTheDocument();

    // Should recommend focusing on highest dropoff point
    expect(
      screen.getByText('Focus on Premium Upgrade conversion'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('65.1% of users drop off at this stage'),
    ).toBeInTheDocument();

    // Should highlight best performing segments
    expect(
      screen.getByText('Expand Coordinator targeting'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('31.2% conversion rate vs 22.1% average'),
    ).toBeInTheDocument();
  });

  it('shows real-time journey updates', async () => {
    const { rerender } = render(<ClientJourney timeRange="30d" />);

    expect(screen.getByText('1,250 users')).toBeInTheDocument(); // Original discovery users

    // Simulate real-time update
    mockUseClientAnalytics.mockReturnValue({
      ...mockJourneyData,
      journey: {
        ...mockJourneyData.journey,
        funnelStages: [
          { ...mockJourneyData.journey.funnelStages[0], users: 1267 }, // Updated discovery
          ...mockJourneyData.journey.funnelStages.slice(1),
        ],
      },
    });

    rerender(<ClientJourney timeRange="30d" />);

    await waitFor(() => {
      expect(screen.getByText('1,267 users')).toBeInTheDocument(); // Updated count
    });
  });
});
