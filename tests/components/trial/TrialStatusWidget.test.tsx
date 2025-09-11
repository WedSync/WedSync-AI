/**
 * WS-167 Trial Management System - Enhanced TrialStatusWidget Unit Tests
 * Comprehensive test coverage for activity tracking, security, and UI functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrialStatusWidget } from '@/components/trial/TrialStatusWidget';
import { TrialStatusResponse } from '@/types/trial';

// Mock fetch API
global.fetch = vi.fn();

// Mock the components and utilities
vi.mock('@/components/untitled-ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>
}));

vi.mock('@/components/untitled-ui/badge', () => ({
  Badge: ({ children, variant, size }: any) => (
    <span className={`badge ${variant} ${size}`}>{children}</span>
  )
}));

vi.mock('@/components/untitled-ui/button', () => ({
  Button: ({ children, onClick, className, size, variant }: any) => (
    <button 
      className={`button ${variant} ${size} ${className}`} 
      onClick={onClick}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/untitled-ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={`progress ${className}`} data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
  )
}));

vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ size }: any) => <div className={`spinner ${size}`}>Loading...</div>
}));

vi.mock('@/lib/security/input-validation', () => ({
  sanitizeHTML: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '')
}));

const mockTrialData: TrialStatusResponse = {
  success: true,
  trial: {
    id: 'trial-123',
    user_id: 'user-123',
    business_type: 'wedding_planner',
    business_goals: ['efficiency', 'growth'],
    current_workflow_pain_points: ['manual_processes'],
    expected_time_savings_hours: 10,
    trial_start: new Date('2024-01-01'),
    trial_end: new Date('2024-01-31'),
    status: 'active',
    onboarding_completed: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15')
  },
  progress: {
    trial_id: 'trial-123',
    days_remaining: 15,
    days_elapsed: 15,
    progress_percentage: 60,
    milestones_achieved: [],
    milestones_remaining: [],
    feature_usage_summary: [],
    roi_metrics: {
      trial_id: 'trial-123',
      total_time_saved_hours: 25,
      estimated_cost_savings: 1250,
      productivity_improvement_percent: 30,
      features_adopted_count: 5,
      milestones_achieved_count: 3,
      workflow_efficiency_gain: 40,
      projected_monthly_savings: 500,
      roi_percentage: 150,
      calculated_at: new Date()
    },
    conversion_recommendation: 'upgrade_now',
    urgency_score: 3
  },
  recommendations: {
    next_actions: ['Complete profile', 'Add first client'],
    upgrade_benefits: ['Unlimited clients', 'Advanced features']
  }
};

describe('Enhanced TrialStatusWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTrialData)
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state correctly', () => {
    render(<TrialStatusWidget />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('generic', { name: /spinner/ })).toBeInTheDocument();
  });

  it('renders trial data successfully with activity score', async () => {
    render(<TrialStatusWidget showActivityScore={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Professional Trial')).toBeInTheDocument();
      expect(screen.getByText(/15 days remaining/)).toBeInTheDocument();
      expect(screen.getByText(/60% complete/)).toBeInTheDocument();
      expect(screen.getByText(/150% ROI/)).toBeInTheDocument();
      expect(screen.getByText(/activity/)).toBeInTheDocument();
    });
  });

  it('displays compact view correctly', async () => {
    render(<TrialStatusWidget compact={true} showActivityScore={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Professional Trial')).toBeInTheDocument();
      expect(screen.getByText(/15d left/)).toBeInTheDocument();
      expect(screen.getByText(/activity/)).toBeInTheDocument();
      expect(screen.getByText('Upgrade')).toBeInTheDocument();
    });
  });

  it('handles error states correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Trial not found' })
    });

    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('Trial Status Error')).toBeInTheDocument();
      expect(screen.getByText('Trial not found')).toBeInTheDocument();
    });
  });

  it('handles network errors correctly', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('Trial Status Error')).toBeInTheDocument();
      expect(screen.getByText('Network error loading trial status')).toBeInTheDocument();
    });
  });

  it('sanitizes HTML content for security', async () => {
    const maliciousData = {
      ...mockTrialData,
      trial: {
        ...mockTrialData.trial,
        business_type: '<script>alert("xss")</script>wedding_planner' as any
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(maliciousData)
    });

    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      expect(screen.getByText('Professional Trial')).toBeInTheDocument();
      // Script tag should be sanitized out
      expect(screen.queryByText(/script/)).not.toBeInTheDocument();
    });
  });

  it('validates numeric ranges for security', async () => {
    const invalidData = {
      ...mockTrialData,
      progress: {
        ...mockTrialData.progress,
        days_remaining: -5, // Should be clamped to 0
        progress_percentage: 150, // Should be clamped to 100
        roi_metrics: {
          ...mockTrialData.progress.roi_metrics,
          roi_percentage: -50, // Should be clamped to 0
          total_time_saved_hours: -10 // Should be clamped to 0
        }
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidData)
    });

    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      // Days remaining should be 0 (clamped)
      expect(screen.getByText(/0 days remaining/)).toBeInTheDocument();
      // Progress should be 100% (clamped)
      expect(screen.getByText(/100% complete/)).toBeInTheDocument();
    });
  });

  it('calls upgrade callback when upgrade button is clicked', async () => {
    const onUpgradeClick = vi.fn();
    
    render(<TrialStatusWidget onUpgradeClick={onUpgradeClick} />);
    
    await waitFor(() => {
      const upgradeButton = screen.getByText('Upgrade Now');
      fireEvent.click(upgradeButton);
      expect(onUpgradeClick).toHaveBeenCalledTimes(1);
    });
  });

  it('calculates activity score correctly', async () => {
    const onActivityUpdate = vi.fn();
    
    render(<TrialStatusWidget onActivityUpdate={onActivityUpdate} showActivityScore={true} />);
    
    await waitFor(() => {
      expect(onActivityUpdate).toHaveBeenCalledWith(expect.any(Number));
      // Activity score should be calculated based on milestones (60%) and ROI (40%)
      // With progress 60% and ROI capped at 100%, score should be around 76%
      const [score] = onActivityUpdate.mock.calls[0];
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(100);
    });
  });

  it('updates countdown timer live', async () => {
    vi.useFakeTimers();
    
    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      expect(screen.getByText(/15d.*h remaining/)).toBeInTheDocument();
    });

    // Fast forward time by 1 minute
    vi.advanceTimersByTime(60000);

    await waitFor(() => {
      // Time display should still be present (exact format may vary)
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });
  });

  it('auto-refreshes data at specified intervals', async () => {
    vi.useFakeTimers();
    
    render(<TrialStatusWidget refreshInterval={30000} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Fast forward by refresh interval
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows high activity indicator when score is > 75', async () => {
    const highActivityData = {
      ...mockTrialData,
      progress: {
        ...mockTrialData.progress,
        progress_percentage: 90,
        roi_metrics: {
          ...mockTrialData.progress.roi_metrics,
          roi_percentage: 200
        }
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(highActivityData)
    });

    render(<TrialStatusWidget showActivityScore={true} />);
    
    await waitFor(() => {
      // Should show high activity indicator (Zap icon)
      expect(document.querySelector('.lucide-zap')).toBeInTheDocument();
    });
  });

  it('shows urgency styling when days remaining < 5', async () => {
    const urgentData = {
      ...mockTrialData,
      progress: {
        ...mockTrialData.progress,
        days_remaining: 3,
        urgency_score: 5
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(urgentData)
    });

    render(<TrialStatusWidget />);
    
    await waitFor(() => {
      expect(screen.getByText(/Trial ending soon!/)).toBeInTheDocument();
      expect(screen.getByText(/3 days remaining/)).toBeInTheDocument();
    });
  });

  it('hides activity score when showActivityScore is false', async () => {
    render(<TrialStatusWidget showActivityScore={false} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/activity/)).not.toBeInTheDocument();
    });
  });

  it('hides upgrade button when showUpgradeButton is false', async () => {
    render(<TrialStatusWidget showUpgradeButton={false} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument();
    });
  });

  it('displays refreshing indicator during data refresh', async () => {
    vi.useFakeTimers();
    
    render(<TrialStatusWidget refreshInterval={30000} />);
    
    await waitFor(() => {
      expect(screen.getByText('Professional Trial')).toBeInTheDocument();
    });

    // Trigger refresh
    vi.advanceTimersByTime(30000);

    // Should show refreshing indicator
    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});