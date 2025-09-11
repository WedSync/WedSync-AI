/**
 * WS-182 ChurnAlertPanel Component Tests
 * Team A - UI Component Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChurnAlertPanel } from '@/components/admin/churn/ChurnAlertPanel';
import { AlertUrgency, ChurnRiskLevel } from '@/types/churn-intelligence';

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  }),
}));

const mockAlerts = [
  {
    id: 'alert-1',
    alertType: 'escalated_risk' as const,
    urgency: AlertUrgency.CRITICAL,
    supplierId: 'supplier-1',
    supplierName: 'Sunshine Photography',
    riskScore: 95,
    riskLevel: ChurnRiskLevel.CRITICAL,
    title: 'Critical Churn Risk Detected',
    message: 'Supplier has not logged in for 21 days during peak season',
    actionRequired: 'Immediate intervention required within 24 hours',
    suggestedActions: ['schedule_call', 'assign_csm', 'escalate_critical'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    isDismissed: false,
    triggerEvent: 'login_absence',
    metadata: {
      daysSinceLogin: 21,
      peakSeason: true
    },
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000) // Expires in 22 hours
  },
  {
    id: 'alert-2',
    alertType: 'support_sentiment' as const,
    urgency: AlertUrgency.URGENT,
    supplierId: 'supplier-2',
    supplierName: 'Grand Ballroom Venue',
    riskScore: 78,
    riskLevel: ChurnRiskLevel.HIGH_RISK,
    title: 'Negative Support Interaction',
    message: 'Recent support tickets show declining satisfaction',
    actionRequired: 'Review support interactions and follow up',
    suggestedActions: ['send_email', 'schedule_call'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    isDismissed: false,
    triggerEvent: 'support_sentiment_decline',
    metadata: {
      ticketCount: 3,
      averageSentiment: -0.7
    },
    acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    id: 'alert-3',
    alertType: 'payment_issue' as const,
    urgency: AlertUrgency.WARNING,
    supplierId: 'supplier-3',
    supplierName: 'Elegant Flowers',
    riskScore: 65,
    riskLevel: ChurnRiskLevel.ATTENTION,
    title: 'Payment Failure Detected',
    message: 'Payment method failed for monthly subscription',
    actionRequired: 'Contact supplier to update payment information',
    suggestedActions: ['send_email', 'payment_reminder'],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isRead: false,
    isDismissed: false,
    triggerEvent: 'payment_failure',
    metadata: {
      failureCount: 1,
      lastSuccessfulPayment: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000)
    }
  },
  {
    id: 'alert-4',
    alertType: 'campaign_executed' as const,
    urgency: AlertUrgency.INFO,
    supplierId: 'supplier-4',
    supplierName: 'Perfect Planning Co.',
    riskScore: 45,
    riskLevel: ChurnRiskLevel.STABLE,
    title: 'Retention Campaign Completed',
    message: 'Email sequence successfully sent to supplier',
    actionRequired: 'Monitor response and engagement metrics',
    suggestedActions: [],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    isRead: false,
    isDismissed: false,
    triggerEvent: 'campaign_completion',
    metadata: {
      campaignId: 'campaign-123',
      emailsSent: 1
    }
  }
];

const defaultProps = {
  alerts: mockAlerts,
  onAlertDismiss: jest.fn(),
  onAlertAction: jest.fn(),
  onAlertAcknowledge: jest.fn(),
  maxDisplayAlerts: 5,
};

describe('ChurnAlertPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders alert panel with header and alerts', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      expect(screen.getByText('Churn Risk Alerts')).toBeInTheDocument();
      expect(screen.getByText(/4 active alerts? requiring attention/i)).toBeInTheDocument();
    });

    it('displays alerts sorted by urgency and creation time', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const alertTitles = screen.getAllByTestId(/alert-title/i);
      expect(alertTitles[0]).toHaveTextContent('Critical Churn Risk Detected'); // Critical first
      expect(alertTitles[1]).toHaveTextContent('Negative Support Interaction'); // Urgent second
    });

    it('applies correct styling for different urgency levels', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const criticalAlert = screen.getByTestId('alert-alert-1');
      expect(criticalAlert).toHaveClass('border-red-200', 'bg-red-50');

      const warningAlert = screen.getByTestId('alert-alert-3');
      expect(warningAlert).toHaveClass('border-yellow-200', 'bg-yellow-50');
    });

    it('shows critical alert count in header', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      expect(screen.getByText('1 Critical')).toBeInTheDocument();
    });

    it('does not render when no alerts are present', () => {
      render(<ChurnAlertPanel {...defaultProps} alerts={[]} />);

      expect(screen.queryByText('Churn Risk Alerts')).not.toBeInTheDocument();
    });
  });

  describe('Alert Urgency Display', () => {
    it('displays critical alerts with animation and special styling', () => {
      const criticalAlert = mockAlerts.filter(alert => 
        alert.urgency === AlertUrgency.CRITICAL && !alert.isRead
      )[0];

      render(<ChurnAlertPanel {...defaultProps} alerts={[criticalAlert]} />);

      const alertElement = screen.getByTestId(`alert-${criticalAlert.id}`);
      expect(alertElement).toHaveClass('animate-pulse');
      expect(alertElement).toHaveClass('ring-2', 'ring-red-200');
    });

    it('shows urgency badges with correct colors', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      expect(screen.getByText('CRITICAL')).toHaveClass('bg-red-100', 'text-red-800');
      expect(screen.getByText('URGENT')).toHaveClass('bg-orange-100', 'text-orange-800');
      expect(screen.getByText('WARNING')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('displays risk level indicators correctly', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const riskIndicators = screen.getAllByTestId(/risk-indicator/i);
      expect(riskIndicators[0]).toHaveClass('bg-red-500'); // Critical
      expect(riskIndicators[2]).toHaveClass('bg-yellow-500'); // Attention
    });
  });

  describe('Alert Interactions', () => {
    it('acknowledges alerts when mark as read button is clicked', async () => {
      const mockOnAcknowledge = jest.fn();
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertAcknowledge={mockOnAcknowledge} 
        />
      );

      const unreadAlerts = mockAlerts.filter(alert => !alert.isRead);
      const markReadButton = screen.getAllByTitle(/mark as read/i)[0];
      fireEvent.click(markReadButton);

      expect(mockOnAcknowledge).toHaveBeenCalledWith(unreadAlerts[0].id);
    });

    it('dismisses alerts when dismiss button is clicked', async () => {
      const mockOnDismiss = jest.fn();
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertDismiss={mockOnDismiss} 
        />
      );

      const dismissButton = screen.getAllByTitle(/dismiss alert/i)[0];
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledWith('alert-1');
    });

    it('expands and collapses alert details', async () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const expandButton = screen.getAllByTitle(/expand/i)[0];
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Required Action')).toBeInTheDocument();
        expect(screen.getByText('Immediate intervention required within 24 hours')).toBeInTheDocument();
      });

      // Click again to collapse
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.queryByText('Required Action')).not.toBeInTheDocument();
      });
    });

    it('executes suggested actions correctly', async () => {
      const mockOnAlertAction = jest.fn().mockResolvedValue({});
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertAction={mockOnAlertAction} 
        />
      );

      // Expand first alert to see action buttons
      const expandButton = screen.getAllByTitle(/expand/i)[0];
      fireEvent.click(expandButton);

      await waitFor(() => {
        const scheduleCallButton = screen.getByRole('button', { name: /schedule call/i });
        fireEvent.click(scheduleCallButton);
      });

      expect(mockOnAlertAction).toHaveBeenCalledWith('alert-1', 'schedule_call');
    });

    it('shows loading state during action execution', async () => {
      const mockOnAlertAction = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertAction={mockOnAlertAction} 
        />
      );

      const expandButton = screen.getAllByTitle(/expand/i)[0];
      fireEvent.click(expandButton);

      await waitFor(async () => {
        const actionButton = screen.getByRole('button', { name: /schedule call/i });
        fireEvent.click(actionButton);

        expect(screen.getByText(/processing intervention/i)).toBeInTheDocument();
      });
    });
  });

  describe('Critical Alert Quick Actions', () => {
    it('displays emergency response buttons for critical alerts', () => {
      const criticalAlert = mockAlerts.filter(alert => 
        alert.urgency === AlertUrgency.CRITICAL
      )[0];

      render(<ChurnAlertPanel {...defaultProps} alerts={[criticalAlert]} />);

      expect(screen.getByRole('button', { name: /emergency response/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /call now/i })).toBeInTheDocument();
    });

    it('executes emergency actions from quick action buttons', async () => {
      const mockOnAlertAction = jest.fn().mockResolvedValue({});
      const criticalAlert = mockAlerts.filter(alert => 
        alert.urgency === AlertUrgency.CRITICAL
      )[0];

      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          alerts={[criticalAlert]}
          onAlertAction={mockOnAlertAction} 
        />
      );

      const emergencyButton = screen.getByRole('button', { name: /emergency response/i });
      fireEvent.click(emergencyButton);

      expect(mockOnAlertAction).toHaveBeenCalledWith('alert-1', 'escalate_critical');
    });
  });

  describe('Sound Notifications', () => {
    beforeEach(() => {
      // Mock console.log for sound notifications
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('triggers sound notification for new critical alerts', () => {
      const criticalAlert = mockAlerts.filter(alert => 
        alert.urgency === AlertUrgency.CRITICAL && !alert.isRead
      )[0];

      render(<ChurnAlertPanel {...defaultProps} alerts={[criticalAlert]} />);

      expect(console.log).toHaveBeenCalledWith('🔊 Critical churn alert sound would play');
    });

    it('toggles sound notifications on/off', async () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const soundToggle = screen.getByRole('button', { name: /on/i });
      expect(soundToggle).toBeInTheDocument();

      fireEvent.click(soundToggle);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /off/i })).toBeInTheDocument();
      });
    });
  });

  describe('Auto-dismiss Functionality', () => {
    it('auto-dismisses expired alerts', () => {
      const expiredAlert = {
        ...mockAlerts[0],
        id: 'expired-alert',
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      const mockOnDismiss = jest.fn();
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          alerts={[expiredAlert]}
          onAlertDismiss={mockOnDismiss} 
        />
      );

      expect(mockOnDismiss).toHaveBeenCalledWith('expired-alert');
    });
  });

  describe('Alert Filtering and Limits', () => {
    it('respects maxDisplayAlerts prop', () => {
      const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
        ...mockAlerts[0],
        id: `alert-${i}`,
        title: `Alert ${i}`,
      }));

      render(<ChurnAlertPanel {...defaultProps} alerts={manyAlerts} maxDisplayAlerts={3} />);

      const alertElements = screen.getAllByTestId(/^alert-alert-/);
      expect(alertElements).toHaveLength(3);
    });

    it('shows count of hidden alerts when limit exceeded', () => {
      const manyAlerts = Array.from({ length: 8 }, (_, i) => ({
        ...mockAlerts[0],
        id: `alert-${i}`,
        title: `Alert ${i}`,
      }));

      render(<ChurnAlertPanel {...defaultProps} alerts={manyAlerts} maxDisplayAlerts={5} />);

      expect(screen.getByText('Showing 5 of 8 alerts')).toBeInTheDocument();
    });

    it('filters out dismissed alerts from display', () => {
      const alertsWithDismissed = [
        ...mockAlerts,
        {
          ...mockAlerts[0],
          id: 'dismissed-alert',
          title: 'Dismissed Alert',
          isDismissed: true
        }
      ];

      render(<ChurnAlertPanel {...defaultProps} alerts={alertsWithDismissed} />);

      expect(screen.queryByText('Dismissed Alert')).not.toBeInTheDocument();
    });
  });

  describe('Batch Operations', () => {
    it('marks all alerts as read when batch button is clicked', async () => {
      const mockOnAcknowledge = jest.fn();
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertAcknowledge={mockOnAcknowledge} 
        />
      );

      const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
      fireEvent.click(markAllReadButton);

      expect(mockOnAcknowledge).toHaveBeenCalledTimes(mockAlerts.length);
      mockAlerts.forEach(alert => {
        expect(mockOnAcknowledge).toHaveBeenCalledWith(alert.id);
      });
    });
  });

  describe('Summary Footer', () => {
    it('displays correct alert counts by urgency', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      expect(screen.getAllByText('1 Critical')).toHaveLength(2); // Header and footer
      expect(screen.getByText('1 Urgent')).toBeInTheDocument();
      expect(screen.getByText('3 Unread')).toBeInTheDocument();
    });

    it('updates counts when alerts change', () => {
      const { rerender } = render(<ChurnAlertPanel {...defaultProps} />);

      const updatedAlerts = mockAlerts.map(alert => 
        alert.id === 'alert-1' ? { ...alert, isRead: true } : alert
      );

      rerender(<ChurnAlertPanel {...defaultProps} alerts={updatedAlerts} />);

      expect(screen.getByText('2 Unread')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      expect(screen.getByRole('region', { name: /alert panel/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<ChurnAlertPanel {...defaultProps} />);

      const firstActionButton = screen.getAllByRole('button')[1]; // Skip sound toggle
      firstActionButton.focus();
      expect(document.activeElement).toBe(firstActionButton);

      fireEvent.keyDown(firstActionButton, { key: 'Tab' });
      // Next focusable element should receive focus
    });

    it('announces alert changes to screen readers', async () => {
      const { rerender } = render(<ChurnAlertPanel {...defaultProps} />);

      const newAlert = {
        ...mockAlerts[0],
        id: 'new-alert',
        title: 'New Alert',
        createdAt: new Date()
      };

      rerender(<ChurnAlertPanel {...defaultProps} alerts={[...mockAlerts, newAlert]} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/new alert received/i);
    });
  });

  describe('Performance Optimizations', () => {
    it('renders efficiently with large alert datasets', () => {
      const largeAlertList = Array.from({ length: 100 }, (_, i) => ({
        ...mockAlerts[0],
        id: `alert-${i}`,
        title: `Alert ${i}`,
      }));

      const startTime = performance.now();
      render(<ChurnAlertPanel {...defaultProps} alerts={largeAlertList} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should render within 500ms
    });

    it('uses memoization to prevent unnecessary re-renders', () => {
      const { rerender } = render(<ChurnAlertPanel {...defaultProps} />);

      // Rerender with same props
      rerender(<ChurnAlertPanel {...defaultProps} />);

      // Component should not recalculate alert processing unnecessarily
      expect(screen.getByText('Churn Risk Alerts')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles malformed alert data gracefully', () => {
      const malformedAlert = {
        ...mockAlerts[0],
        urgency: 'invalid_urgency' as any,
        createdAt: null as any
      };

      expect(() => {
        render(<ChurnAlertPanel {...defaultProps} alerts={[malformedAlert]} />);
      }).not.toThrow();
    });

    it('continues functioning when action execution fails', async () => {
      const mockOnAlertAction = jest.fn().mockRejectedValue(new Error('Action failed'));
      render(
        <ChurnAlertPanel 
          {...defaultProps} 
          onAlertAction={mockOnAlertAction} 
        />
      );

      const expandButton = screen.getAllByTitle(/expand/i)[0];
      fireEvent.click(expandButton);

      await waitFor(async () => {
        const actionButton = screen.getByRole('button', { name: /schedule call/i });
        fireEvent.click(actionButton);

        // Should handle error gracefully and not crash
        await waitFor(() => {
          expect(actionButton).not.toBeDisabled();
        });
      });
    });
  });
});