import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BudgetCharts } from '@/components/wedme/budget/BudgetCharts';
import { WeddingMetricsDashboard } from '@/components/analytics/wedding/WeddingMetricsDashboard';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock Recharts for integration testing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey }: { data: any[]; dataKey: string }) => (
    <div data-testid="pie" data-items={data.length}>
      {data.map((item, index) => (
        <div
          key={index}
          data-testid={`pie-segment-${index}`}
          data-value={item[dataKey]}
        >
          {item.name}: {item[dataKey]}
        </div>
      ))}
    </div>
  ),
  BarChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: any[];
  }) => (
    <div data-testid="bar-chart" data-items={data.length}>
      {children}
    </div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="bar" data-key={dataKey} />
  ),
  LineChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: any[];
  }) => (
    <div data-testid="line-chart" data-items={data.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid="line" data-key={dataKey} data-stroke={stroke} />
  ),
  AreaChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: any[];
  }) => (
    <div data-testid="area-chart" data-items={data.length}>
      {children}
    </div>
  ),
  Area: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid="area" data-key={dataKey} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({
    domain,
    tickFormatter,
  }: {
    domain?: [number, number];
    tickFormatter?: (value: any) => string;
  }) => (
    <div
      data-testid="y-axis"
      data-domain={domain?.join(',')}
      data-formatter={!!tickFormatter}
    />
  ),
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray?: string }) => (
    <div data-testid="cartesian-grid" data-stroke={strokeDasharray} />
  ),
  Tooltip: ({
    content,
    formatter,
  }: {
    content?: React.ComponentType<any>;
    formatter?: Function;
  }) => (
    <div
      data-testid="tooltip"
      data-has-content={!!content}
      data-has-formatter={!!formatter}
    />
  ),
  Legend: ({ formatter }: { formatter?: Function }) => (
    <div data-testid="legend" data-has-formatter={!!formatter} />
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" data-fill={fill} />
  ),
}));

describe('Chart Data Processing Integration Tests', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  // Mock data that would come from the database
  const mockBudgetCategories = [
    {
      id: '1',
      name: 'Venue',
      budgeted_amount: 10000,
      spent_amount: 8500,
      percentage_of_total: 35,
      color: '#8b5cf6',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-15T12:00:00.000Z',
    },
    {
      id: '2',
      name: 'Photography',
      budgeted_amount: 5000,
      spent_amount: 4800,
      percentage_of_total: 20,
      color: '#06b6d4',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-10T10:00:00.000Z',
    },
    {
      id: '3',
      name: 'Catering',
      budgeted_amount: 8000,
      spent_amount: 7200,
      percentage_of_total: 30,
      color: '#10b981',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-12T14:00:00.000Z',
    },
    {
      id: '4',
      name: 'Music',
      budgeted_amount: 2000,
      spent_amount: 1800,
      percentage_of_total: 8,
      color: '#f59e0b',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-08T09:00:00.000Z',
    },
    {
      id: '5',
      name: 'Flowers',
      budgeted_amount: 3000,
      spent_amount: 2900,
      percentage_of_total: 12,
      color: '#ef4444',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-14T16:00:00.000Z',
    },
  ];

  const mockTransactions = [
    {
      id: '1',
      amount: 8500,
      category: 'Venue',
      transaction_date: '2024-01-15',
      description: 'Wedding venue deposit',
      vendor: 'Grand Ballroom',
    },
    {
      id: '2',
      amount: 2400,
      category: 'Photography',
      transaction_date: '2024-01-10',
      description: 'Photography package deposit',
      vendor: 'Perfect Shots Photography',
    },
    {
      id: '3',
      amount: 2400,
      category: 'Photography',
      transaction_date: '2024-01-20',
      description: 'Photography package balance',
      vendor: 'Perfect Shots Photography',
    },
    {
      id: '4',
      amount: 3600,
      category: 'Catering',
      transaction_date: '2024-01-12',
      description: 'Catering deposit',
      vendor: 'Delicious Catering Co',
    },
    {
      id: '5',
      amount: 3600,
      category: 'Catering',
      transaction_date: '2024-01-25',
      description: 'Catering balance',
      vendor: 'Delicious Catering Co',
    },
  ];

  const mockWeddingMetrics = {
    wedding_info: {
      id: 'wedding-1',
      date: '2024-06-15',
      days_until: 150,
      completion_percentage: 65,
      guest_count: 120,
      venue: 'Grand Ballroom',
    },
    budget_summary: {
      total_budget: 28000,
      total_spent: 25200,
      utilization_percentage: 90.0,
      remaining_budget: 2800,
      categories_over_budget: 1,
    },
    vendor_performance: {
      total_vendors: 8,
      avg_response_time: 2.5,
      avg_satisfaction: 4.7,
      completion_rate: 92,
    },
    timeline_progress: {
      total_tasks: 45,
      completed_tasks: 29,
      overdue_tasks: 3,
      upcoming_deadlines: 5,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('BudgetCharts Data Processing Integration', () => {
    beforeEach(() => {
      // Mock successful data fetching
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: mockBudgetCategories,
                error: null,
              }),
            ),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);
    });

    it('processes budget category data correctly for pie chart', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={mockBudgetCategories}
            totalBudget={28000}
          />
        </QueryClientProvider>,
      );

      // Wait for data processing and chart rendering
      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });

      // Verify pie chart processes all categories
      const pieElement = screen.getByTestId('pie');
      expect(pieElement).toHaveAttribute('data-items', '5');

      // Check that each category is processed correctly
      const segments = screen.getAllByTestId(/pie-segment-/);
      expect(segments).toHaveLength(5);

      // Verify data values are correct
      expect(segments[0]).toHaveAttribute('data-value', '8500'); // Venue spent
      expect(segments[1]).toHaveAttribute('data-value', '4800'); // Photography spent
      expect(segments[2]).toHaveAttribute('data-value', '7200'); // Catering spent
    });

    it('transforms data correctly for bar chart comparison', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={mockBudgetCategories}
            totalBudget={28000}
          />
        </QueryClientProvider>,
      );

      // Switch to bar chart
      const barChartButton = screen.getByRole('button', {
        name: /comparison/i,
      });
      await user.click(barChartButton);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Verify bar chart has processed all categories
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '5');

      // Check for both budgeted and spent bars
      const budgetedBar = screen.getByTestId('bar');
      expect(budgetedBar).toHaveAttribute('data-key', 'budgeted_amount');
    });

    it('calculates spending trends correctly with transaction data', async () => {
      // Mock transaction data fetch
      const mockSupabaseClient = {
        from: vi.fn((table) => {
          if (table === 'budget_transactions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() =>
                  Promise.resolve({
                    data: mockTransactions,
                    error: null,
                  }),
                ),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: mockBudgetCategories,
                  error: null,
                }),
              ),
            })),
          };
        }),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={mockBudgetCategories}
            totalBudget={28000}
          />
        </QueryClientProvider>,
      );

      // Switch to trends view
      const trendsButton = screen.getByRole('button', { name: /trends/i });
      await user.click(trendsButton);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });

      // Verify trends chart processes transaction data
      const areaChart = screen.getByTestId('area-chart');
      expect(areaChart).toHaveAttribute('data-items', '6'); // 6 months of trend data
    });

    it('handles edge cases in data processing', async () => {
      const edgeCaseCategories = [
        {
          id: '1',
          name: 'Zero Budget Category',
          budgeted_amount: 0,
          spent_amount: 500, // Over budget scenario
          percentage_of_total: 0,
          color: '#ff0000',
        },
        {
          id: '2',
          name: 'Unspent Category',
          budgeted_amount: 2000,
          spent_amount: 0,
          percentage_of_total: 10,
          color: '#00ff00',
        },
        {
          id: '3',
          name: 'Exact Match Category',
          budgeted_amount: 1500,
          spent_amount: 1500,
          percentage_of_total: 8,
          color: '#0000ff',
        },
      ];

      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: edgeCaseCategories,
                error: null,
              }),
            ),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={edgeCaseCategories}
            totalBudget={3500}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });

      // Verify edge cases are handled correctly
      expect(screen.getByText(/over budget/i)).toBeInTheDocument(); // Zero budget category
      expect(screen.getByText(/100%/i)).toBeInTheDocument(); // Exact match category
      expect(screen.getByText(/0%/i)).toBeInTheDocument(); // Unspent category
    });

    it('processes large datasets efficiently', async () => {
      // Generate large dataset (100 categories)
      const largeDataset = Array.from({ length: 100 }, (_, index) => ({
        id: `cat-${index + 1}`,
        name: `Category ${index + 1}`,
        budgeted_amount: Math.floor(Math.random() * 5000) + 1000,
        spent_amount: Math.floor(Math.random() * 4000) + 500,
        percentage_of_total: Math.random() * 10,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));

      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: largeDataset,
                error: null,
              }),
            ),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={largeDataset}
            totalBudget={500000}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Data processing should complete within reasonable time
      expect(processingTime).toBeLessThan(2000);

      // Verify large dataset is processed correctly
      const pieElement = screen.getByTestId('pie');
      expect(pieElement).toHaveAttribute('data-items', '100');
    });

    it('validates data transformations for progress chart', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={mockBudgetCategories}
            totalBudget={28000}
          />
        </QueryClientProvider>,
      );

      // Switch to progress view
      const progressButton = screen.getByRole('button', { name: /progress/i });
      await user.click(progressButton);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Verify progress percentages are calculated correctly
      // Venue: 8500/10000 = 85%
      // Photography: 4800/5000 = 96%
      // Catering: 7200/8000 = 90%
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('96%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('handles real-time data updates correctly', async () => {
      const initialData = mockBudgetCategories.slice(0, 3);
      const updatedData = [
        ...initialData,
        {
          id: '6',
          name: 'Transportation',
          budgeted_amount: 1500,
          spent_amount: 800,
          percentage_of_total: 5,
          color: '#8b5a2b',
          created_at: '2024-01-20T00:00:00.000Z',
          updated_at: '2024-01-20T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              callCount++;
              const data = callCount === 1 ? initialData : updatedData;
              return Promise.resolve({ data, error: null });
            }),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={initialData}
            totalBudget={23000}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        const pieElement = screen.getByTestId('pie');
        expect(pieElement).toHaveAttribute('data-items', '3');
      });

      // Simulate real-time update
      rerender(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={updatedData}
            totalBudget={24500}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        const pieElement = screen.getByTestId('pie');
        expect(pieElement).toHaveAttribute('data-items', '4');
      });

      // Verify new category is processed and displayed
      expect(screen.getByText('Transportation')).toBeInTheDocument();
    });
  });

  describe('WeddingMetricsDashboard Data Processing Integration', () => {
    beforeEach(() => {
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: mockWeddingMetrics,
                error: null,
              }),
            ),
          })),
        })),
        rpc: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                month: 'Jan 2024',
                completion: 25,
                budget_utilization: 30,
                vendor_count: 3,
              },
              {
                month: 'Feb 2024',
                completion: 45,
                budget_utilization: 55,
                vendor_count: 5,
              },
              {
                month: 'Mar 2024',
                completion: 65,
                budget_utilization: 75,
                vendor_count: 7,
              },
            ],
            error: null,
          }),
        ),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);
    });

    it('processes wedding metrics data correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Days until wedding
        expect(screen.getByText('65%')).toBeInTheDocument(); // Completion percentage
        expect(screen.getByText('90.0%')).toBeInTheDocument(); // Budget utilization
      });

      // Verify metric calculations
      expect(screen.getByText('$25,200')).toBeInTheDocument(); // Total spent
      expect(screen.getByText('$28,000')).toBeInTheDocument(); // Total budget
      expect(screen.getByText('120')).toBeInTheDocument(); // Guest count
    });

    it('transforms timeline data for chart visualization', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Verify timeline chart has trend data
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toHaveAttribute('data-items', '3'); // 3 months of data

      // Check line chart data keys
      const completionLine = screen.getByTestId('line');
      expect(completionLine).toHaveAttribute('data-key', 'completion');
    });

    it('calculates efficiency scores correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        // Efficiency score calculation:
        // (completion_rate * 0.4) + (budget_efficiency * 0.3) + (vendor_performance * 0.3)
        // (65 * 0.4) + (90 * 0.3) + (92 * 0.3) = 26 + 27 + 27.6 = 80.6
        expect(screen.getByText(/8[0-1]/)).toBeInTheDocument(); // Efficiency score around 80-81
      });
    });

    it('processes vendor performance analytics', async () => {
      const mockVendorData = [
        {
          category: 'Photography',
          avg_rating: 4.8,
          response_time: 2.1,
          completion: 95,
        },
        {
          category: 'Catering',
          avg_rating: 4.6,
          response_time: 3.5,
          completion: 88,
        },
        {
          category: 'Music',
          avg_rating: 4.9,
          response_time: 1.8,
          completion: 100,
        },
      ];

      const mockSupabaseClient = {
        from: vi.fn((table) => {
          if (table === 'vendor_performance') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() =>
                  Promise.resolve({
                    data: mockVendorData,
                    error: null,
                  }),
                ),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: mockWeddingMetrics,
                  error: null,
                }),
              ),
            })),
          };
        }),
        rpc: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          }),
        ),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      // Switch to vendors view
      const vendorsButton = screen.getByRole('button', { name: /vendors/i });
      await user.click(vendorsButton);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Verify vendor performance data processing
      expect(screen.getByText('4.8')).toBeInTheDocument(); // Photography rating
      expect(screen.getByText('4.6')).toBeInTheDocument(); // Catering rating
      expect(screen.getByText('4.9')).toBeInTheDocument(); // Music rating
    });

    it('handles missing or incomplete data gracefully', async () => {
      const incompleteData = {
        wedding_info: {
          id: 'wedding-1',
          date: '2024-06-15',
          days_until: null, // Missing data
          completion_percentage: 0,
          guest_count: null,
        },
        budget_summary: {
          total_budget: 0,
          total_spent: 0,
          utilization_percentage: 0,
        },
        vendor_performance: null, // Missing section
        timeline_progress: {
          total_tasks: 0,
          completed_tasks: 0,
        },
      };

      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: incompleteData,
                error: null,
              }),
            ),
          })),
        })),
        rpc: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          }),
        ),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        // Should display fallback values
        expect(screen.getByText('N/A')).toBeInTheDocument(); // For null days_until
        expect(screen.getByText('0%')).toBeInTheDocument(); // For zero completion
      });

      // Should not crash with missing vendor_performance
      expect(screen.queryByText(/vendor performance/i)).toBeInTheDocument();
    });

    it('validates time range filtering affects data processing', async () => {
      let timeRange = '7d';
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: mockWeddingMetrics,
                error: null,
              }),
            ),
          })),
        })),
        rpc: vi.fn((funcName, params) => {
          // Simulate different data based on time range
          const dataLength =
            timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const mockTimeData = Array.from(
            { length: dataLength },
            (_, index) => ({
              date: `2024-01-${String(index + 1).padStart(2, '0')}`,
              completion: Math.random() * 100,
              budget_utilization: Math.random() * 100,
            }),
          );

          return Promise.resolve({
            data: mockTimeData,
            error: null,
          });
        }),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <WeddingMetricsDashboard weddingId="wedding-1" />
        </QueryClientProvider>,
      );

      // Start with 7 days
      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-items', '7');
      });

      // Switch to 30 days
      timeRange = '30d';
      const thirtyDaysButton = screen.getByRole('button', { name: /30 days/i });
      await user.click(thirtyDaysButton);

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-items', '30');
      });

      // Switch to 90 days
      timeRange = '90d';
      const ninetyDaysButton = screen.getByRole('button', { name: /90 days/i });
      await user.click(ninetyDaysButton);

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-items', '90');
      });
    });
  });

  describe('Cross-Component Data Consistency', () => {
    it('maintains data consistency between budget charts and wedding metrics', async () => {
      // Mock consistent data across components
      const consistentBudgetData = {
        total_budget: 25000,
        total_spent: 22000,
        utilization_percentage: 88.0,
      };

      const mockSupabaseClient = {
        from: vi.fn((table) => {
          if (table === 'budget_categories') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() =>
                  Promise.resolve({
                    data: mockBudgetCategories,
                    error: null,
                  }),
                ),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: {
                    ...mockWeddingMetrics,
                    budget_summary: consistentBudgetData,
                  },
                  error: null,
                }),
              ),
            })),
          };
        }),
        rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <div>
            <BudgetCharts
              clientId="test-client"
              categories={mockBudgetCategories}
              totalBudget={25000}
            />
            <WeddingMetricsDashboard weddingId="wedding-1" />
          </div>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        // Both components should show consistent budget data
        const budgetTexts = container.querySelectorAll(
          '[data-testid*="budget"]',
        );
        expect(budgetTexts.length).toBeGreaterThan(0);
      });

      // Verify both components display the same total budget
      const totalBudgetElements = screen.getAllByText(/\$25,000/);
      expect(totalBudgetElements.length).toBeGreaterThanOrEqual(2);

      // Verify utilization percentage is consistent
      const utilizationElements = screen.getAllByText(/88/);
      expect(utilizationElements.length).toBeGreaterThanOrEqual(1);
    });

    it('handles concurrent data updates across components', async () => {
      let updateCount = 0;
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              updateCount++;
              // Simulate data change after first load
              const updatedBudget = updateCount > 2 ? 26000 : 25000;
              const updatedSpent = updateCount > 2 ? 23500 : 22000;

              return Promise.resolve({
                data:
                  updateCount === 1
                    ? mockBudgetCategories
                    : {
                        ...mockWeddingMetrics,
                        budget_summary: {
                          total_budget: updatedBudget,
                          total_spent: updatedSpent,
                          utilization_percentage:
                            (updatedSpent / updatedBudget) * 100,
                        },
                      },
                error: null,
              });
            }),
          })),
        })),
        rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <div>
            <BudgetCharts
              clientId="test-client"
              categories={mockBudgetCategories}
              totalBudget={25000}
            />
            <WeddingMetricsDashboard weddingId="wedding-1" />
          </div>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/\$25,000/).length).toBeGreaterThanOrEqual(
          1,
        );
      });

      // Trigger data refresh
      queryClient.invalidateQueries();
      rerender(
        <QueryClientProvider client={queryClient}>
          <div>
            <BudgetCharts
              clientId="test-client"
              categories={mockBudgetCategories}
              totalBudget={26000}
            />
            <WeddingMetricsDashboard weddingId="wedding-1" />
          </div>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/\$26,000/).length).toBeGreaterThanOrEqual(
          1,
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles API errors gracefully without breaking chart rendering', async () => {
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database connection failed', status: 500 },
              }),
            ),
          })),
        })),
        rpc: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: 'RPC function failed', status: 500 },
          }),
        ),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={[]}
            totalBudget={0}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // Should display error state instead of crashing
      expect(
        screen.getByRole('button', { name: /try again/i }),
      ).toBeInTheDocument();
    });

    it('recovers from network errors with retry mechanism', async () => {
      let attemptCount = 0;
      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              attemptCount++;
              if (attemptCount === 1) {
                return Promise.reject(new Error('Network error'));
              }
              return Promise.resolve({
                data: mockBudgetCategories,
                error: null,
              });
            }),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={mockBudgetCategories}
            totalBudget={28000}
          />
        </QueryClientProvider>,
      );

      // First attempt should fail
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // Retry should succeed
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });

      expect(attemptCount).toBe(2);
    });

    it('validates data integrity before chart rendering', async () => {
      // Mock invalid data
      const invalidData = [
        {
          id: '1',
          name: null, // Invalid name
          budgeted_amount: 'not-a-number', // Invalid amount
          spent_amount: -500, // Negative amount
          percentage_of_total: 150, // Over 100%
          color: 'invalid-color',
        },
      ];

      const mockSupabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: invalidData,
                error: null,
              }),
            ),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

      render(
        <QueryClientProvider client={queryClient}>
          <BudgetCharts
            clientId="test-client"
            categories={invalidData as any}
            totalBudget={5000}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        // Should either show error or sanitize data
        const chartOrError =
          screen.queryByTestId('pie-chart') || screen.queryByText(/error/i);
        expect(chartOrError).toBeInTheDocument();
      });

      // Invalid data should not crash the application
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
