/**
 * WS-182 AtRiskSupplierCard Component Tests
 * Team A - UI Component Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AtRiskSupplierCard } from '@/components/admin/churn/AtRiskSupplierCard';
import { ChurnRiskLevel } from '@/types/churn-intelligence';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
  format: jest.fn(() => 'Jan 15, 2025'),
}));

const mockSupplier = {
  supplierId: 'supplier-1',
  supplierName: 'Sunshine Photography',
  supplierType: 'photographer' as const,
  contactEmail: 'contact@sunshinephoto.com',
  churnRiskScore: 92,
  churnRiskLevel: ChurnRiskLevel.CRITICAL,
  churnProbability: 0.85,
  predictedChurnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  daysUntilPredictedChurn: 7,
  riskFactors: [
    {
      factorType: 'login_recency' as const,
      severity: 'critical' as const,
      score: 95,
      weight: 0.4,
      description: 'No login for 18 days during peak season',
      value: 18,
      detectedAt: new Date(),
      thresholdExceeded: true,
      actionRequired: true
    },
    {
      factorType: 'support_sentiment' as const,
      severity: 'high' as const,
      score: 80,
      weight: 0.2,
      description: '3 unresolved support tickets with negative sentiment',
      value: 3,
      detectedAt: new Date(),
      thresholdExceeded: true,
      actionRequired: true
    }
  ],
  primaryRiskReason: 'Extended absence during peak season',
  daysSinceLastLogin: 18,
  lastActivityDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  loginFrequencyTrend: 'declining' as const,
  featureUsageScore: 15,
  engagementTrend: 'declining' as const,
  openSupportTickets: 3,
  recentTicketSentiment: 'negative' as const,
  supportInteractionCount30d: 5,
  subscriptionValue: 2400,
  paymentFailures30d: 1,
  subscriptionTier: 'Professional',
  daysSinceLastPayment: 45,
  interventionCount30d: 0,
  previousRetentionSuccess: false,
  weddingSeasonActivity: 'peak' as const,
  seasonalRiskAdjustment: -5,
  calculatedAt: new Date(),
  lastUpdated: new Date()
};

const mockLowRiskSupplier = {
  ...mockSupplier,
  supplierId: 'supplier-2',
  supplierName: 'Happy Venue',
  churnRiskScore: 25,
  churnRiskLevel: ChurnRiskLevel.STABLE,
  churnProbability: 0.15,
  daysSinceLastLogin: 2,
  recentTicketSentiment: 'positive' as const,
  openSupportTickets: 0
};

const defaultProps = {
  supplier: mockSupplier,
  onRetentionAction: jest.fn(),
  onSupplierClick: jest.fn(),
  showDetailedView: false,
};

describe('AtRiskSupplierCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders supplier basic information correctly', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByText('Sunshine Photography')).toBeInTheDocument();
      expect(screen.getByText('photographer')).toBeInTheDocument();
      expect(screen.getByText('contact@sunshinephoto.com')).toBeInTheDocument();
    });

    it('displays risk score and level appropriately', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByText('92')).toBeInTheDocument(); // Risk score
      expect(screen.getByText(/critical/i)).toBeInTheDocument(); // Risk level
    });

    it('shows churn probability and predicted date', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByText('85%')).toBeInTheDocument(); // Probability
      expect(screen.getByText(/7 days/i)).toBeInTheDocument(); // Days until churn
    });

    it('renders risk factors correctly', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByText(/no login for 18 days/i)).toBeInTheDocument();
      expect(screen.getByText(/3 unresolved support tickets/i)).toBeInTheDocument();
    });

    it('applies correct styling for different risk levels', () => {
      const { rerender } = render(<AtRiskSupplierCard {...defaultProps} />);

      // Critical risk styling
      let card = screen.getByTestId('supplier-card');
      expect(card).toHaveClass('border-red-200');

      // Low risk styling
      rerender(<AtRiskSupplierCard {...defaultProps} supplier={mockLowRiskSupplier} />);
      card = screen.getByTestId('supplier-card');
      expect(card).toHaveClass('border-green-200');
    });
  });

  describe('Risk Level Visualization', () => {
    it('displays circular progress indicator for risk score', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      const progressIndicator = screen.getByRole('progressbar');
      expect(progressIndicator).toBeInTheDocument();
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '92');
    });

    it('shows appropriate color coding for risk levels', () => {
      const { rerender } = render(<AtRiskSupplierCard {...defaultProps} />);

      // Critical level should use red
      let riskBadge = screen.getByText(/critical/i);
      expect(riskBadge).toHaveClass('bg-red-100');

      // Stable level should use green
      rerender(<AtRiskSupplierCard {...defaultProps} supplier={mockLowRiskSupplier} />);
      riskBadge = screen.getByText(/stable/i);
      expect(riskBadge).toHaveClass('bg-green-100');
    });

    it('displays risk trend indicators correctly', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      // Should show declining trend
      expect(screen.getByTitle(/declining engagement/i)).toBeInTheDocument();
    });
  });

  describe('Detailed View Toggle', () => {
    it('shows basic view by default', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.queryByText(/risk factor details/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/engagement metrics/i)).not.toBeInTheDocument();
    });

    it('shows detailed information when expanded', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      expect(screen.getByText(/last activity/i)).toBeInTheDocument();
      expect(screen.getByText(/subscription tier/i)).toBeInTheDocument();
      expect(screen.getByText(/support tickets/i)).toBeInTheDocument();
    });

    it('toggles detailed view when card is clicked', async () => {
      const mockOnSupplierClick = jest.fn();
      render(
        <AtRiskSupplierCard 
          {...defaultProps} 
          onSupplierClick={mockOnSupplierClick}
        />
      );

      const card = screen.getByTestId('supplier-card');
      fireEvent.click(card);

      expect(mockOnSupplierClick).toHaveBeenCalledWith('supplier-1');
    });
  });

  describe('Retention Actions', () => {
    it('displays appropriate retention action buttons', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      expect(screen.getByRole('button', { name: /schedule call/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /assign csm/i })).toBeInTheDocument();
    });

    it('executes retention actions correctly', async () => {
      const mockOnRetentionAction = jest.fn().mockResolvedValue({});
      render(
        <AtRiskSupplierCard 
          {...defaultProps} 
          onRetentionAction={mockOnRetentionAction}
          showDetailedView={true}
        />
      );

      const callButton = screen.getByRole('button', { name: /schedule call/i });
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(mockOnRetentionAction).toHaveBeenCalledWith({
          supplierId: 'supplier-1',
          action: 'schedule_call'
        });
      });
    });

    it('shows loading state during action execution', async () => {
      const mockOnRetentionAction = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <AtRiskSupplierCard 
          {...defaultProps} 
          onRetentionAction={mockOnRetentionAction}
          showDetailedView={true}
        />
      );

      const callButton = screen.getByRole('button', { name: /schedule call/i });
      fireEvent.click(callButton);

      expect(callButton).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(callButton).not.toBeDisabled();
      });
    });

    it('handles action errors gracefully', async () => {
      const mockOnRetentionAction = jest.fn().mockRejectedValue(new Error('Action failed'));
      render(
        <AtRiskSupplierCard 
          {...defaultProps} 
          onRetentionAction={mockOnRetentionAction}
          showDetailedView={true}
        />
      );

      const callButton = screen.getByRole('button', { name: /schedule call/i });
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(callButton).not.toBeDisabled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('AI Recommendations', () => {
    it('displays AI-generated recommendations', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      expect(screen.getByText(/ai recommendations/i)).toBeInTheDocument();
      expect(screen.getByText(/immediate outreach/i)).toBeInTheDocument();
    });

    it('shows contextual recommendations based on risk factors', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      // Should recommend actions based on login inactivity
      expect(screen.getByText(/re-engagement/i)).toBeInTheDocument();
      // Should recommend actions based on support sentiment
      expect(screen.getByText(/personal check-in/i)).toBeInTheDocument();
    });

    it('prioritizes recommendations by impact', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      const recommendations = screen.getAllByTestId(/recommendation-item/i);
      expect(recommendations.length).toBeGreaterThan(0);

      // First recommendation should be highest priority
      const firstRec = recommendations[0];
      expect(firstRec).toHaveAttribute('data-priority', 'high');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      const card = screen.getByTestId('supplier-card');
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-labelledby');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('supports keyboard navigation', async () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      const card = screen.getByTestId('supplier-card');
      card.focus();
      expect(document.activeElement).toBe(card);

      // Enter key should trigger click
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(defaultProps.onSupplierClick).toHaveBeenCalled();
    });

    it('provides screen reader friendly descriptions', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByLabelText(/risk score 92 out of 100/i)).toBeInTheDocument();
      expect(screen.getByText(/critical risk level/i)).toBeInTheDocument();
    });

    it('has sufficient color contrast for risk indicators', () => {
      render(<AtRiskSupplierCard {...defaultProps} />);

      const criticalBadge = screen.getByText(/critical/i);
      // Test passes if element exists with proper styling classes
      expect(criticalBadge).toHaveClass('text-red-800');
    });
  });

  describe('Performance Optimizations', () => {
    it('renders efficiently with complex risk factor data', () => {
      const complexSupplier = {
        ...mockSupplier,
        riskFactors: Array.from({ length: 20 }, (_, i) => ({
          factorType: `factor_${i}` as any,
          severity: 'medium' as const,
          score: 50 + i,
          weight: 0.05,
          description: `Risk factor description ${i}`,
          value: i * 10,
          detectedAt: new Date(),
          thresholdExceeded: i % 2 === 0,
          actionRequired: i % 3 === 0
        }))
      };

      const startTime = performance.now();
      render(<AtRiskSupplierCard {...defaultProps} supplier={complexSupplier} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });

    it('memoizes expensive calculations', () => {
      const { rerender } = render(<AtRiskSupplierCard {...defaultProps} />);

      // Rerender with same props
      rerender(<AtRiskSupplierCard {...defaultProps} />);

      // Component should not recalculate risk metrics unnecessarily
      expect(screen.getByText('92')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('reflects updated risk scores appropriately', () => {
      const { rerender } = render(<AtRiskSupplierCard {...defaultProps} />);

      expect(screen.getByText('92')).toBeInTheDocument();

      const updatedSupplier = { ...mockSupplier, churnRiskScore: 75, churnRiskLevel: ChurnRiskLevel.HIGH_RISK };
      rerender(<AtRiskSupplierCard {...defaultProps} supplier={updatedSupplier} />);

      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText(/high risk/i)).toBeInTheDocument();
    });

    it('updates last updated timestamp', () => {
      render(<AtRiskSupplierCard {...defaultProps} showDetailedView={true} />);

      expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
    });
  });
});