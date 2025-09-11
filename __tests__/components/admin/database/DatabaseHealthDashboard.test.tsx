/**
 * Database Health Dashboard Component Tests - WS-234
 * Tests all monitoring dashboard components for wedding day reliability
 * Focus: Mobile responsiveness, accessibility, and real-time updates
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'

import { DatabaseHealthDashboard } from '@/components/admin/database/DatabaseHealthDashboard'
import { HealthMetricsCard } from '@/components/admin/database/HealthMetricsCard'
import { AlertNotificationPanel } from '@/components/admin/database/AlertNotificationPanel'
import { WeddingDayStatusCard } from '@/components/admin/database/WeddingDayStatusCard'
import { PerformanceTrendsChart } from '@/components/admin/database/PerformanceTrendsChart'
import { CriticalOperationsTable } from '@/components/admin/database/CriticalOperationsTable'

// Extend jest matchers
expect.extend(toHaveNoViolations)

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/admin/database',
  useSearchParams: () => new URLSearchParams()
}))

// Mock wedding day utilities
jest.mock('@/lib/utils/wedding-day', () => ({
  isWeddingDay: jest.fn(() => false),
  isHighTrafficPeriod: jest.fn(() => false),
  getWeddingDayThresholds: jest.fn(() => ({
    response_time_ms: 500,
    error_rate_percent: 1.0,
    connection_health_percent: 85
  })),
  getWeddingContextMessage: jest.fn(() => '')
}))

// Mock database health data
const mockHealthData = {
  overall_status: 'healthy' as const,
  connection_pool: {
    active: 45,
    idle: 15,
    max: 100,
    status: 'optimal' as const
  },
  query_performance: {
    avg_response_time: 120,
    slow_queries: 2,
    status: 'fast' as const
  },
  storage: {
    used_gb: 847,
    total_gb: 1000,
    percentage: 84.7,
    status: 'healthy' as const
  },
  active_sessions: 234,
  replication_lag: 0,
  last_backup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  wedding_day_active: false
}

const mockWeddingDayHealthData = {
  ...mockHealthData,
  wedding_day_active: true,
  overall_status: 'warning' as const
}

const mockAlerts = [
  {
    id: 'alert-1',
    type: 'critical' as const,
    title: 'High Response Time Detected',
    message: 'Database response time exceeded 2 seconds during peak wedding hours',
    timestamp: new Date().toISOString(),
    source: 'Performance Monitor',
    affectedVendors: 23,
    affectedWeddings: 5,
    weddingVenues: ['Grand Ballroom', 'Rose Garden Chapel'],
    escalated: false,
    acknowledged: false
  },
  {
    id: 'alert-2',
    type: 'warning' as const,
    title: 'Storage Usage High',
    message: 'Database storage at 89% capacity',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    source: 'Storage Monitor',
    affectedVendors: 0,
    escalated: false,
    acknowledged: true
  }
]

describe('DatabaseHealthDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders dashboard with all components', async () => {
      render(<DatabaseHealthDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
        expect(screen.getByText('Real-time monitoring for wedding vendor operations')).toBeInTheDocument()
      })
    })

    it('renders loading state correctly', () => {
      render(<DatabaseHealthDashboard />)
      
      // Check for loading animations
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('handles error states gracefully', async () => {
      // Mock error boundary trigger
      const ErrorComponent = () => {
        throw new Error('Database connection failed')
      }
      
      const { container } = render(
        <DatabaseHealthDashboard>
          <ErrorComponent />
        </DatabaseHealthDashboard>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument()
        expect(screen.getByText(/Unable to load database monitoring/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument()
      })
    })
  })

  describe('Wedding Day Mode', () => {
    it('activates wedding day mode on Saturdays', async () => {
      const { isWeddingDay } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)

      render(<DatabaseHealthDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('WEDDING DAY MODE ACTIVE')).toBeInTheDocument()
        expect(screen.getByText('Enhanced monitoring every 15 seconds')).toBeInTheDocument()
      })

      // Check for wedding day styling
      const container = document.querySelector('.bg-red-50')
      expect(container).toBeInTheDocument()
    })

    it('shows enhanced refresh rate during wedding days', async () => {
      const { isWeddingDay } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(true)

      render(<DatabaseHealthDashboard refreshInterval={30000} />)
      
      await waitFor(() => {
        expect(screen.getByText('Refresh: 15s')).toBeInTheDocument()
      })
    })

    it('displays normal mode on non-wedding days', async () => {
      const { isWeddingDay } = require('@/lib/utils/wedding-day')
      isWeddingDay.mockReturnValue(false)

      render(<DatabaseHealthDashboard refreshInterval={30000} />)
      
      await waitFor(() => {
        expect(screen.getByText('Refresh: 30s')).toBeInTheDocument()
        expect(screen.queryByText('WEDDING DAY MODE ACTIVE')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = render(<DatabaseHealthDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<DatabaseHealthDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
      })

      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('role', 'button')
      
      // Check focus indicators
      expect(document.activeElement).toHaveClass('focus:ring-2')
    })

    it('provides proper ARIA labels', async () => {
      render(<DatabaseHealthDashboard />)
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts to mobile viewport (375px)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(<DatabaseHealthDashboard />)
      
      // Check for mobile-responsive grid
      const metricsGrid = document.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4')
      expect(metricsGrid).toBeInTheDocument()
    })

    it('scales properly on tablet viewport (768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })

      render(<DatabaseHealthDashboard />)
      
      // Should show 2-column grid on medium screens
      const metricsGrid = document.querySelector('.md\\:grid-cols-2')
      expect(metricsGrid).toBeInTheDocument()
    })

    it('provides optimal desktop layout (1024px+)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      })

      render(<DatabaseHealthDashboard />)
      
      // Should show 4-column grid on large screens
      const metricsGrid = document.querySelector('.lg\\:grid-cols-4')
      expect(metricsGrid).toBeInTheDocument()
    })
  })
})

describe('HealthMetricsCard', () => {
  const defaultProps = {
    title: 'Response Time',
    value: '145ms',
    status: 'healthy' as const,
    icon: () => <div data-testid="icon" />,
    description: 'Average database response time'
  }

  it('displays metric information correctly', () => {
    render(<HealthMetricsCard {...defaultProps} />)
    
    expect(screen.getByText('Response Time')).toBeInTheDocument()
    expect(screen.getByText('145ms')).toBeInTheDocument()
    expect(screen.getByText('Average database response time')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
  })

  it('shows wedding day urgency indicators', () => {
    render(
      <HealthMetricsCard 
        {...defaultProps}
        status="critical"
        weddingDayMode={true}
      />
    )
    
    // Check for wedding day indicator
    expect(screen.getByText('WEDDING DAY')).toBeInTheDocument()
    
    // Check for pulsing animation
    const urgentIndicator = document.querySelector('.animate-pulse')
    expect(urgentIndicator).toBeInTheDocument()
  })

  it('handles click interactions', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(
      <HealthMetricsCard 
        {...defaultProps}
        onClick={handleClick}
      />
    )
    
    const card = screen.getByRole('button')
    await user.click(card)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard interaction', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(
      <HealthMetricsCard 
        {...defaultProps}
        onClick={handleClick}
      />
    )
    
    const card = screen.getByRole('button')
    card.focus()
    await user.keyboard('{Enter}')
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('displays trend information when provided', () => {
    render(
      <HealthMetricsCard 
        {...defaultProps}
        trend="up"
        trendValue="+15ms"
      />
    )
    
    expect(screen.getByText('+15ms')).toBeInTheDocument()
    expect(screen.getByText('vs yesterday')).toBeInTheDocument()
  })
})

describe('AlertNotificationPanel', () => {
  it('displays no alerts state correctly', () => {
    render(<AlertNotificationPanel alerts={[]} />)
    
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument()
    expect(screen.getByText('No active alerts. Database health is optimal.')).toBeInTheDocument()
  })

  it('shows wedding day no alerts state', () => {
    render(<AlertNotificationPanel alerts={[]} weddingDayMode={true} />)
    
    expect(screen.getByText('Wedding day monitoring active - no alerts detected')).toBeInTheDocument()
  })

  it('renders alerts with wedding impact information', () => {
    render(<AlertNotificationPanel alerts={mockAlerts} />)
    
    expect(screen.getByText('High Response Time Detected')).toBeInTheDocument()
    expect(screen.getByText('23 vendors affected')).toBeInTheDocument()
    expect(screen.getByText('5 weddings today')).toBeInTheDocument()
    expect(screen.getByText('Grand Ballroom')).toBeInTheDocument()
    expect(screen.getByText('Rose Garden Chapel')).toBeInTheDocument()
  })

  it('handles alert acknowledgment', async () => {
    const handleAcknowledge = jest.fn()
    const user = userEvent.setup()
    
    render(
      <AlertNotificationPanel 
        alerts={mockAlerts} 
        onAcknowledge={handleAcknowledge}
      />
    )
    
    const ackButton = screen.getByTitle('Acknowledge alert')
    await user.click(ackButton)
    
    expect(handleAcknowledge).toHaveBeenCalledWith('alert-1')
  })

  it('handles alert escalation for critical issues', async () => {
    const handleEscalate = jest.fn()
    const user = userEvent.setup()
    
    render(
      <AlertNotificationPanel 
        alerts={mockAlerts} 
        onEscalate={handleEscalate}
        weddingDayMode={true}
      />
    )
    
    const escalateButton = screen.getByText('Escalate')
    await user.click(escalateButton)
    
    expect(handleEscalate).toHaveBeenCalledWith('alert-1')
  })

  it('shows wedding day emergency contacts for critical alerts', () => {
    const criticalAlert = [{
      ...mockAlerts[0],
      type: 'critical' as const
    }]
    
    render(
      <AlertNotificationPanel 
        alerts={criticalAlert} 
        weddingDayMode={true}
      />
    )
    
    expect(screen.getByText('Emergency Escalation Protocol Active')).toBeInTheDocument()
    expect(screen.getByText('On-call engineer: +44 7xxx xxx xxx')).toBeInTheDocument()
    expect(screen.getByText('Emergency: alerts@wedsync.com')).toBeInTheDocument()
    expect(screen.getByText('Slack: #wedding-day-ops')).toBeInTheDocument()
  })
})

describe('WeddingDayStatusCard', () => {
  it('displays wedding day metrics correctly', () => {
    render(<WeddingDayStatusCard healthData={mockWeddingDayHealthData} />)
    
    expect(screen.getByText('Wedding Day Operations')).toBeInTheDocument()
    expect(screen.getByText('PREPARATION')).toBeInTheDocument() // Default phase for test time
  })

  it('shows critical status banner for issues', () => {
    const criticalHealthData = {
      ...mockWeddingDayHealthData,
      overall_status: 'critical' as const
    }
    
    render(<WeddingDayStatusCard healthData={criticalHealthData} />)
    
    expect(screen.getByText('CRITICAL: Wedding Day Systems Degraded')).toBeInTheDocument()
    expect(screen.getByText('Immediate attention required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /escalate/i })).toBeInTheDocument()
  })

  it('displays current wedding phase based on time', () => {
    // Mock specific time for ceremony phase
    const mockDate = new Date('2023-06-10T14:30:00Z') // 2:30 PM
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
    
    render(<WeddingDayStatusCard healthData={mockWeddingDayHealthData} />)
    
    expect(screen.getByText('RECEPTIONS')).toBeInTheDocument()
    expect(screen.getByText('Peak reception times')).toBeInTheDocument()
  })
})

describe('PerformanceTrendsChart', () => {
  it('renders chart with default metrics', () => {
    render(<PerformanceTrendsChart />)
    
    expect(screen.getByText('Performance Trends')).toBeInTheDocument()
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument()
  })

  it('shows wedding day mode indicators', () => {
    render(<PerformanceTrendsChart weddingDayMode={true} />)
    
    expect(screen.getByText('SATURDAY MODE')).toBeInTheDocument()
    expect(screen.getByText('Wedding day monitoring active')).toBeInTheDocument()
  })

  it('handles metric selection changes', async () => {
    const user = userEvent.setup()
    
    render(<PerformanceTrendsChart />)
    
    // Should have metric cards that can be selected
    const cpuMetric = screen.getByText('CPU Usage')
    await user.click(cpuMetric)
    
    // Chart should update to show CPU trends
    expect(screen.getByText('CPU Usage Trend')).toBeInTheDocument()
  })

  it('toggles auto-refresh correctly', async () => {
    const user = userEvent.setup()
    
    render(<PerformanceTrendsChart />)
    
    const autoRefreshButton = screen.getByText('Auto-refresh ON')
    await user.click(autoRefreshButton)
    
    expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument()
  })

  it('displays wedding day performance insights', () => {
    render(<PerformanceTrendsChart weddingDayMode={true} />)
    
    expect(screen.getByText('Wedding Day Performance Insights')).toBeInTheDocument()
    expect(screen.getByText(/Peak ceremony time/)).toBeInTheDocument()
    expect(screen.getByText(/Vendor activity/)).toBeInTheDocument()
  })
})

describe('CriticalOperationsTable', () => {
  const mockOperations = [
    {
      id: '1',
      operation: 'Wedding photo backup process',
      table: 'wedding_photos',
      duration: 45000,
      status: 'running' as const,
      startTime: new Date().toISOString(),
      affectedRows: 1500,
      vendorImpact: 0,
      weddingImpact: 0,
      venueNames: [],
      queryType: 'BACKUP' as const,
      priority: 'high' as const,
      performance: {
        cpuUsage: 25,
        memoryUsage: 40,
        ioWait: 60
      }
    }
  ]

  it('displays operations with proper status indicators', () => {
    render(<CriticalOperationsTable healthData={mockHealthData} />)
    
    expect(screen.getByText('Critical Operations Monitor')).toBeInTheDocument()
    expect(screen.getByText('Real-time database operations with vendor impact assessment')).toBeInTheDocument()
  })

  it('shows wedding day mode enhancements', () => {
    render(<CriticalOperationsTable weddingDayMode={true} healthData={mockWeddingDayHealthData} />)
    
    expect(screen.getByText(/Wedding Day Mode: Critical operations monitored/)).toBeInTheDocument()
  })

  it('handles search filtering', async () => {
    const user = userEvent.setup()
    
    render(<CriticalOperationsTable healthData={mockHealthData} />)
    
    const searchInput = screen.getByPlaceholderText(/Search operations/i)
    await user.type(searchInput, 'photo')
    
    // Should filter operations based on search term
    await waitFor(() => {
      expect(searchInput).toHaveValue('photo')
    })
  })

  it('supports sorting by different columns', async () => {
    const user = userEvent.setup()
    
    render(<CriticalOperationsTable healthData={mockHealthData} />)
    
    const durationHeader = screen.getByText('Duration')
    await user.click(durationHeader)
    
    // Should toggle sort direction
    expect(durationHeader.closest('button')).toBeInTheDocument()
  })
})

describe('Mobile Touch Interactions', () => {
  it('handles touch interactions on mobile devices', async () => {
    const user = userEvent.setup()
    
    // Mock touch device
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: {}
    })

    render(<DatabaseHealthDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
    })

    // Touch targets should be at least 48x48px
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button)
      const minSize = parseFloat(styles.minHeight) || parseFloat(styles.height)
      expect(minSize).toBeGreaterThanOrEqual(48) // 48px minimum touch target
    })
  })

  it('provides proper feedback for touch interactions', async () => {
    const user = userEvent.setup()
    
    render(
      <HealthMetricsCard 
        title="Test Metric"
        value="100"
        status="healthy"
        icon={() => <div />}
        onClick={jest.fn()}
      />
    )
    
    const card = screen.getByRole('button')
    
    // Simulate touch start/end
    fireEvent.touchStart(card)
    expect(card).toHaveClass('hover:scale-105')
    
    fireEvent.touchEnd(card)
    await user.click(card)
    
    // Should have proper visual feedback
    expect(card).toHaveClass('transition-all')
  })
})

describe('Performance', () => {
  it('renders quickly without blocking the main thread', async () => {
    const startTime = performance.now()
    
    render(<DatabaseHealthDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Database Health Monitor')).toBeInTheDocument()
    })
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    // Should render within 100ms for good UX
    expect(renderTime).toBeLessThan(100)
  })

  it('handles large datasets without performance degradation', () => {
    const largeAlertsList = Array.from({ length: 100 }, (_, i) => ({
      ...mockAlerts[0],
      id: `alert-${i}`,
      message: `Alert ${i}: Performance issue detected`
    }))
    
    const startTime = performance.now()
    
    render(<AlertNotificationPanel alerts={largeAlertsList} />)
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    // Should handle large lists efficiently
    expect(renderTime).toBeLessThan(200)
    expect(screen.getByText('System Alerts')).toBeInTheDocument()
  })
})