/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ReferralStats from '@/components/referrals/ReferralStats'
import { SupplierReferralStats } from '@/types/supplier-referrals'
import { toast } from '@/lib/toast-helper'

// Mock the toast helper
jest.mock('@/lib/toast-helper', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock ShimmerButton component
jest.mock('@/components/magicui/shimmer-button', () => {
  return function MockShimmerButton({ children, onClick, className }: any) {
    return (
      <button onClick={onClick} className={className} data-testid="shimmer-button">
        {children}
      </button>
    )
  }
})

describe('ReferralStats Component', () => {
  const mockStats: SupplierReferralStats = {
    supplier_id: 'test-supplier',
    total_referrals_sent: 47,
    total_clicks: 32,
    total_signups: 28,
    total_trials_started: 25,
    total_conversions: 23,
    total_rewards_earned: 180000, // £1,800 in pence
    click_through_rate: 68.1,
    conversion_rate: 71.9,
    signup_rate: 87.5,
    trial_to_paid_rate: 92.0,
    avg_time_to_conversion_days: 3.2,
    last_referral_sent_at: '2025-01-22T10:30:00Z',
    current_month_stats: {
      month: '2025-01',
      referrals_sent: 12,
      conversions: 8,
      rewards_earned: 79200, // £792
      rank_in_category: 3,
      rank_overall: 12
    },
    lifetime_stats: {
      total_referrals_sent: 47,
      total_conversions: 23,
      total_rewards_earned: 180000,
      best_month_conversions: 15,
      best_month_rewards: 148500, // £1,485
      current_streak_days: 12,
      longest_streak_days: 28
    }
  }

  const mockRankingData = {
    category_rank: 3,
    overall_rank: 12,
    total_in_category: 45,
    total_overall: 156
  }

  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component with all key elements', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Check header
      expect(screen.getByText('Your Referral Performance')).toBeInTheDocument()
      expect(screen.getByText('Real-time statistics and conversion metrics')).toBeInTheDocument()

      // Check refresh button
      expect(screen.getByTestId('shimmer-button')).toBeInTheDocument()
      expect(screen.getByText('Refresh Stats')).toBeInTheDocument()
    })

    it('displays key metrics correctly', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Check total rewards
      expect(screen.getByText('£1,800.00')).toBeInTheDocument()
      
      // Check conversion rate
      expect(screen.getByText('71.9%')).toBeInTheDocument()
      
      // Check average time to convert
      expect(screen.getByText('3.2d')).toBeInTheDocument()
    })

    it('displays referral pipeline stages', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Check pipeline stage names
      expect(screen.getByText('Sent')).toBeInTheDocument()
      expect(screen.getByText('Clicked')).toBeInTheDocument()
      expect(screen.getByText('Signed Up')).toBeInTheDocument()
      expect(screen.getByText('Started Trial')).toBeInTheDocument()
      expect(screen.getByText('Converted')).toBeInTheDocument()

      // Check pipeline values
      expect(screen.getByText('47')).toBeInTheDocument() // Total referrals sent
      expect(screen.getByText('32')).toBeInTheDocument() // Total clicks
      expect(screen.getByText('28')).toBeInTheDocument() // Total signups
      expect(screen.getByText('25')).toBeInTheDocument() // Total trials
      expect(screen.getByText('23')).toBeInTheDocument() // Total conversions
    })

    it('displays ranking information when provided', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('Your Current Rankings')).toBeInTheDocument()
      expect(screen.getByText('#3 of 45')).toBeInTheDocument() // Category rank
      expect(screen.getByText('#12 of 156')).toBeInTheDocument() // Overall rank
    })

    it('does not display ranking information when not provided', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.queryByText('Your Current Rankings')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          isLoading={true}
        />
      )

      // Should show loading skeleton
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(0)

      // Should not show actual content
      expect(screen.queryByText('Your Referral Performance')).not.toBeInTheDocument()
    })

    it('renders content when isLoading is false', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          isLoading={false}
        />
      )

      // Should show actual content
      expect(screen.getByText('Your Referral Performance')).toBeInTheDocument()

      // Should not show loading skeleton
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBe(0)
    })
  })

  describe('Interactions', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      const refreshButton = screen.getByTestId('shimmer-button')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Data Formatting', () => {
    it('formats currency correctly', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Check various currency formats
      expect(screen.getByText('£1,800.00')).toBeInTheDocument() // Total rewards
      expect(screen.getByText('£792.00')).toBeInTheDocument() // This month rewards
      expect(screen.getByText('£1,485.00')).toBeInTheDocument() // Best month rewards
    })

    it('formats percentages correctly', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('71.9%')).toBeInTheDocument() // Conversion rate
    })

    it('handles large numbers correctly', () => {
      const largeStats = {
        ...mockStats,
        total_referrals_sent: 2500,
        total_conversions: 1200
      }

      render(
        <ReferralStats
          stats={largeStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('2.5K')).toBeInTheDocument() // Formatted large number
      expect(screen.getByText('1.2K')).toBeInTheDocument() // Formatted large number
    })
  })

  describe('Monthly Performance Comparison', () => {
    it('displays monthly vs lifetime stats correctly', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('This Month vs Lifetime Best')).toBeInTheDocument()
      
      // Current month stats
      expect(screen.getByText('12')).toBeInTheDocument() // Current month referrals
      expect(screen.getByText('8')).toBeInTheDocument() // Current month conversions
      
      // Best month stats
      expect(screen.getByText('Best: 15')).toBeInTheDocument() // Best month conversions
    })

    it('displays activity streak information', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('Activity Streak')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument() // Current streak
      expect(screen.getByText('Longest Streak')).toBeInTheDocument()
      expect(screen.getByText('28')).toBeInTheDocument() // Longest streak
    })
  })

  describe('Accessibility', () => {
    it('includes proper ARIA labels', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Check for screen reader content
      const srOnlyElements = document.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)
    })

    it('has proper heading hierarchy', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)

      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      })

      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Component should render without errors on mobile
      expect(screen.getByText('Your Referral Performance')).toBeInTheDocument()
    })

    it('renders desktop layout', () => {
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280, // Desktop width
      })

      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      // Component should render without errors on desktop
      expect(screen.getByText('Your Referral Performance')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero stats gracefully', () => {
      const zeroStats = {
        ...mockStats,
        total_referrals_sent: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_rewards_earned: 0,
        conversion_rate: 0
      }

      render(
        <ReferralStats
          stats={zeroStats}
          onRefresh={mockOnRefresh}
          rankingData={mockRankingData}
        />
      )

      expect(screen.getByText('£0.00')).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('handles missing optional props', () => {
      render(
        <ReferralStats
          stats={mockStats}
          onRefresh={mockOnRefresh}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Your Referral Performance')).toBeInTheDocument()
    })
  })
})