import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createClient } from '@supabase/supabase-js'
import '@testing-library/jest-dom'

/**
 * WS-246: Vendor Performance Analytics System - UI Component Testing
 * Tests analytics dashboard components with React Testing Library
 */

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: mockVendorsData, error: null })),
        range: jest.fn(() => Promise.resolve({ data: mockVendorsData, error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: jest.fn(() => Promise.resolve({ data: 85.5, error: null })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({ subscribe: jest.fn() })),
      subscribe: jest.fn()
    }))
  }))
}))

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn()
  })
}))

// Mock chart components
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
  BarChart: ({ children, ...props }: any) => <div data-testid="bar-chart" {...props}>{children}</div>,
  PieChart: ({ children, ...props }: any) => <div data-testid="pie-chart" {...props}>{children}</div>,
  Line: ({ ...props }: any) => <div data-testid="chart-line" {...props} />,
  Bar: ({ ...props }: any) => <div data-testid="chart-bar" {...props} />,
  Cell: ({ ...props }: any) => <div data-testid="chart-cell" {...props} />,
  XAxis: ({ ...props }: any) => <div data-testid="x-axis" {...props} />,
  YAxis: ({ ...props }: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: ({ ...props }: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: ({ ...props }: any) => <div data-testid="chart-tooltip" {...props} />,
  Legend: ({ ...props }: any) => <div data-testid="chart-legend" {...props} />,
  ResponsiveContainer: ({ children, ...props }: any) => <div data-testid="responsive-container" {...props}>{children}</div>
}))

// Import components to test
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import VendorPerformanceCard from '@/components/analytics/VendorPerformanceCard'
import PerformanceChart from '@/components/analytics/PerformanceChart'
import VendorComparison from '@/components/analytics/VendorComparison'
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters'

// Mock data
const mockVendorData = {
  id: 'vendor-1',
  name: 'Elegant Photography',
  type: 'photographer',
  overall_score: 92.5,
  response_time_score: 95,
  booking_success_rate: 0.88,
  satisfaction_score: 4.7,
  total_bookings: 156,
  total_revenue: 234500,
  response_time_avg: 1.2,
  created_at: '2024-01-15T10:00:00Z',
  last_updated: '2025-01-15T14:30:00Z'
}

const mockVendorsData = [
  mockVendorData,
  {
    id: 'vendor-2',
    name: 'Perfect Venues',
    type: 'venue',
    overall_score: 88.2,
    response_time_score: 82,
    booking_success_rate: 0.91,
    satisfaction_score: 4.5,
    total_bookings: 89,
    total_revenue: 445000,
    response_time_avg: 3.5,
    created_at: '2024-02-20T09:15:00Z',
    last_updated: '2025-01-15T14:30:00Z'
  }
]

const mockDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6,
    last_updated: '2025-01-15T14:30:00Z'
  },
  top_performers: mockVendorsData,
  performance_trends: [
    { date: '2025-01-01', bookings: 45, revenue: 67500, satisfaction: 4.5 },
    { date: '2025-01-08', bookings: 52, revenue: 78900, satisfaction: 4.6 },
    { date: '2025-01-15', bookings: 48, revenue: 72300, satisfaction: 4.7 }
  ],
  vendor_types: [
    { type: 'photographer', count: 89, percentage: 36.3 },
    { type: 'venue', count: 67, percentage: 27.3 },
    { type: 'florist', count: 45, percentage: 18.4 },
    { type: 'caterer', count: 44, percentage: 18.0 }
  ]
}

describe('Analytics Dashboard Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('should render analytics dashboard with all key sections', async () => {
    render(<AnalyticsDashboard data={mockDashboardData} />)

    // Check main sections are present
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Top Performers')).toBeInTheDocument()
    expect(screen.getByText('Performance Trends')).toBeInTheDocument()
    
    // Check overview metrics
    expect(screen.getByText('245')).toBeInTheDocument() // total vendors
    expect(screen.getByText('189')).toBeInTheDocument() // active vendors
    expect(screen.getByText('1,234')).toBeInTheDocument() // total bookings
    expect(screen.getByText('£2,450,000')).toBeInTheDocument() // total revenue
  })

  it('should display loading state correctly', () => {
    render(<AnalyticsDashboard loading={true} />)

    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument()
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('should handle error states gracefully', () => {
    const errorMessage = 'Failed to load analytics data'
    render(<AnalyticsDashboard error={errorMessage} />)

    expect(screen.getByTestId('analytics-error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should refresh data when retry button is clicked', async () => {
    const mockRefresh = jest.fn()
    render(<AnalyticsDashboard error="Failed to load" onRefresh={mockRefresh} />)

    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('should be responsive on mobile devices', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<AnalyticsDashboard data={mockDashboardData} />)

    const dashboard = screen.getByTestId('analytics-dashboard')
    expect(dashboard).toHaveClass('mobile-responsive')
    
    // Check mobile layout is applied
    expect(dashboard).toHaveClass('flex-col') // Stacked layout on mobile
  })
})

describe('Vendor Performance Card Component', () => {
  it('should display vendor performance metrics correctly', () => {
    render(<VendorPerformanceCard vendor={mockVendorData} />)

    expect(screen.getByText('Elegant Photography')).toBeInTheDocument()
    expect(screen.getByText('photographer')).toBeInTheDocument()
    expect(screen.getByText('92.5')).toBeInTheDocument() // overall score
    expect(screen.getByText('4.7 ★')).toBeInTheDocument() // satisfaction score
    expect(screen.getByText('156')).toBeInTheDocument() // total bookings
    expect(screen.getByText('£234,500')).toBeInTheDocument() // revenue
  })

  it('should show performance indicators with correct colors', () => {
    render(<VendorPerformanceCard vendor={mockVendorData} />)

    const scoreElement = screen.getByTestId('overall-score')
    expect(scoreElement).toHaveClass('text-green-600') // High score = green

    const responseTimeElement = screen.getByTestId('response-time')
    expect(responseTimeElement).toHaveClass('text-green-600') // Fast response = green
  })

  it('should handle low performance scores appropriately', () => {
    const lowPerformanceVendor = {
      ...mockVendorData,
      overall_score: 45.2,
      response_time_avg: 12.5,
      satisfaction_score: 2.1
    }

    render(<VendorPerformanceCard vendor={lowPerformanceVendor} />)

    const scoreElement = screen.getByTestId('overall-score')
    expect(scoreElement).toHaveClass('text-red-600') // Low score = red

    const satisfactionElement = screen.getByTestId('satisfaction-score')
    expect(satisfactionElement).toHaveClass('text-red-600') // Low satisfaction = red
  })

  it('should open vendor detail modal when clicked', async () => {
    const mockOnClick = jest.fn()
    render(<VendorPerformanceCard vendor={mockVendorData} onClick={mockOnClick} />)

    const card = screen.getByTestId('vendor-performance-card')
    fireEvent.click(card)

    expect(mockOnClick).toHaveBeenCalledWith(mockVendorData.id)
  })

  it('should show tooltip on hover with additional details', async () => {
    const user = userEvent.setup()
    render(<VendorPerformanceCard vendor={mockVendorData} showTooltip={true} />)

    const card = screen.getByTestId('vendor-performance-card')
    await user.hover(card)

    await waitFor(() => {
      expect(screen.getByTestId('vendor-tooltip')).toBeInTheDocument()
      expect(screen.getByText('Response Time: 1.2 hours avg')).toBeInTheDocument()
      expect(screen.getByText('Success Rate: 88%')).toBeInTheDocument()
    })
  })
})

describe('Performance Chart Component', () => {
  const mockChartData = [
    { date: '2025-01-01', bookings: 45, revenue: 67500, satisfaction: 4.5 },
    { date: '2025-01-08', bookings: 52, revenue: 78900, satisfaction: 4.6 },
    { date: '2025-01-15', bookings: 48, revenue: 72300, satisfaction: 4.7 }
  ]

  it('should render performance chart with correct data', () => {
    render(
      <PerformanceChart 
        data={mockChartData} 
        type="line"
        metric="bookings"
        title="Booking Trends"
      />
    )

    expect(screen.getByText('Booking Trends')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should switch between different chart types', async () => {
    const user = userEvent.setup()
    render(
      <PerformanceChart 
        data={mockChartData} 
        type="line"
        metric="bookings"
        allowTypeSwitch={true}
      />
    )

    // Click to switch to bar chart
    const barChartButton = screen.getByTestId('chart-type-bar')
    await user.click(barChartButton)

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('should filter chart data by date range', async () => {
    const user = userEvent.setup()
    render(
      <PerformanceChart 
        data={mockChartData} 
        type="line"
        metric="bookings"
        showDateFilter={true}
      />
    )

    // Select date range
    const dateRangeSelector = screen.getByTestId('date-range-selector')
    await user.selectOptions(dateRangeSelector, '7d')

    await waitFor(() => {
      // Chart should update with filtered data
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-filtered', 'true')
    })
  })

  it('should export chart data when export button is clicked', async () => {
    const user = userEvent.setup()
    const mockExport = jest.fn()
    
    render(
      <PerformanceChart 
        data={mockChartData} 
        type="line"
        metric="bookings"
        onExport={mockExport}
        showExportButton={true}
      />
    )

    const exportButton = screen.getByTestId('chart-export-button')
    await user.click(exportButton)

    expect(mockExport).toHaveBeenCalledWith(mockChartData, 'bookings')
  })

  it('should handle empty data gracefully', () => {
    render(
      <PerformanceChart 
        data={[]} 
        type="line"
        metric="bookings"
      />
    )

    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByTestId('empty-chart-state')).toBeInTheDocument()
  })
})

describe('Vendor Comparison Component', () => {
  it('should allow comparing multiple vendors', async () => {
    const user = userEvent.setup()
    render(
      <VendorComparison 
        vendors={mockVendorsData} 
        maxSelections={3}
      />
    )

    // Select vendors for comparison
    const vendor1Checkbox = screen.getByTestId('vendor-select-vendor-1')
    const vendor2Checkbox = screen.getByTestId('vendor-select-vendor-2')

    await user.click(vendor1Checkbox)
    await user.click(vendor2Checkbox)

    // Verify selection
    expect(vendor1Checkbox).toBeChecked()
    expect(vendor2Checkbox).toBeChecked()

    // Check comparison is displayed
    expect(screen.getByTestId('vendor-comparison-chart')).toBeInTheDocument()
  })

  it('should limit vendor selections to maximum allowed', async () => {
    const user = userEvent.setup()
    const maxSelections = 2
    
    render(
      <VendorComparison 
        vendors={mockVendorsData} 
        maxSelections={maxSelections}
      />
    )

    // Try to select more than allowed
    const vendor1Checkbox = screen.getByTestId('vendor-select-vendor-1')
    const vendor2Checkbox = screen.getByTestId('vendor-select-vendor-2')

    await user.click(vendor1Checkbox)
    await user.click(vendor2Checkbox)

    // Verify limit message appears
    expect(screen.getByText(`Maximum ${maxSelections} vendors can be compared`)).toBeInTheDocument()
  })

  it('should display comparison metrics side by side', async () => {
    const user = userEvent.setup()
    render(<VendorComparison vendors={mockVendorsData} />)

    // Select vendors
    await user.click(screen.getByTestId('vendor-select-vendor-1'))
    await user.click(screen.getByTestId('vendor-select-vendor-2'))

    // Check comparison table
    const comparisonTable = screen.getByTestId('comparison-table')
    expect(comparisonTable).toBeInTheDocument()

    // Verify metrics are displayed
    within(comparisonTable).getByText('92.5') // vendor 1 score
    within(comparisonTable).getByText('88.2') // vendor 2 score
    within(comparisonTable).getByText('£234,500') // vendor 1 revenue
    within(comparisonTable).getByText('£445,000') // vendor 2 revenue
  })

  it('should export comparison data', async () => {
    const user = userEvent.setup()
    const mockExport = jest.fn()
    
    render(
      <VendorComparison 
        vendors={mockVendorsData} 
        onExport={mockExport}
      />
    )

    // Select vendors and export
    await user.click(screen.getByTestId('vendor-select-vendor-1'))
    await user.click(screen.getByTestId('vendor-select-vendor-2'))
    await user.click(screen.getByTestId('export-comparison'))

    expect(mockExport).toHaveBeenCalledWith([mockVendorsData[0], mockVendorsData[1]])
  })
})

describe('Analytics Filters Component', () => {
  const mockFilters = {
    dateRange: '30d',
    vendorType: 'all',
    performanceRange: 'all',
    sortBy: 'score'
  }

  it('should render all filter options', () => {
    render(
      <AnalyticsFilters 
        filters={mockFilters} 
        onChange={jest.fn()}
      />
    )

    expect(screen.getByLabelText('Date Range')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendor Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Performance Range')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
  })

  it('should call onChange when filters are updated', async () => {
    const user = userEvent.setup()
    const mockOnChange = jest.fn()
    
    render(
      <AnalyticsFilters 
        filters={mockFilters} 
        onChange={mockOnChange}
      />
    )

    // Change date range
    const dateRangeSelect = screen.getByLabelText('Date Range')
    await user.selectOptions(dateRangeSelect, '7d')

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      dateRange: '7d'
    })
  })

  it('should reset filters when reset button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnChange = jest.fn()
    
    render(
      <AnalyticsFilters 
        filters={mockFilters} 
        onChange={mockOnChange}
        showResetButton={true}
      />
    )

    const resetButton = screen.getByTestId('reset-filters')
    await user.click(resetButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      dateRange: '30d',
      vendorType: 'all',
      performanceRange: 'all',
      sortBy: 'score'
    })
  })

  it('should show active filter count', () => {
    const activeFilters = {
      ...mockFilters,
      vendorType: 'photographer',
      performanceRange: 'high'
    }

    render(
      <AnalyticsFilters 
        filters={activeFilters} 
        onChange={jest.fn()}
        showActiveCount={true}
      />
    )

    expect(screen.getByText('2 active filters')).toBeInTheDocument()
  })
})

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  })

  it('should adapt dashboard layout for mobile', () => {
    render(<AnalyticsDashboard data={mockDashboardData} />)

    const dashboard = screen.getByTestId('analytics-dashboard')
    expect(dashboard).toHaveClass('mobile-layout')
    
    // Charts should stack vertically on mobile
    const chartsContainer = screen.getByTestId('charts-container')
    expect(chartsContainer).toHaveClass('flex-col')
  })

  it('should show mobile-friendly vendor cards', () => {
    render(<VendorPerformanceCard vendor={mockVendorData} />)

    const card = screen.getByTestId('vendor-performance-card')
    expect(card).toHaveClass('mobile-card')
    
    // Should show condensed information on mobile
    expect(screen.queryByTestId('detailed-metrics')).not.toBeInTheDocument()
  })

  it('should provide touch-friendly interaction targets', () => {
    render(<VendorComparison vendors={mockVendorsData} />)

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      const checkboxContainer = checkbox.closest('[data-testid*="vendor-select"]')
      const styles = window.getComputedStyle(checkboxContainer!)
      
      // Touch targets should be at least 48px
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(48)
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(48)
    })
  })
})

describe('Accessibility', () => {
  it('should have proper ARIA labels for screen readers', () => {
    render(<AnalyticsDashboard data={mockDashboardData} />)

    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard')
    expect(screen.getByRole('region', { name: 'Overview Metrics' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Performance Charts' })).toBeInTheDocument()
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<VendorComparison vendors={mockVendorsData} />)

    // Tab through interactive elements
    await user.tab()
    expect(screen.getByTestId('vendor-select-vendor-1')).toHaveFocus()

    await user.tab()
    expect(screen.getByTestId('vendor-select-vendor-2')).toHaveFocus()
  })

  it('should announce chart data to screen readers', () => {
    render(
      <PerformanceChart 
        data={mockChartData} 
        type="line"
        metric="bookings"
        title="Booking Trends"
      />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Booking Trends'))
  })

  it('should provide alternative text for visual elements', () => {
    render(<VendorPerformanceCard vendor={mockVendorData} />)

    const scoreIndicator = screen.getByTestId('score-indicator')
    expect(scoreIndicator).toHaveAttribute('aria-label', 'Overall score: 92.5 out of 100')
  })
})