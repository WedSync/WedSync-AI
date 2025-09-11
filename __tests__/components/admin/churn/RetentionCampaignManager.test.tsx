/**
 * WS-182 RetentionCampaignManager Component Tests
 * Team A - UI Component Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RetentionCampaignManager } from '@/components/admin/churn/RetentionCampaignManager';
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
  differenceInDays: jest.fn(() => 7),
}));

const mockCampaigns = [
  {
    id: 'campaign-1',
    name: 'Peak Season Re-engagement',
    campaignType: 're_engagement' as const,
    description: 'Targeted outreach to inactive suppliers during peak wedding season',
    targetRiskLevel: [ChurnRiskLevel.HIGH_RISK, ChurnRiskLevel.ATTENTION],
    targetSupplierTypes: ['photographer', 'venue'],
    targetSegments: [],
    status: 'active' as const,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
    frequency: 'weekly' as const,
    targetedSuppliers: 35,
    emailsSent: 32,
    emailOpenRate: 68.2,
    emailClickRate: 24.1,
    callsCompleted: 8,
    responseRate: 31.25,
    suppliersRetained: 11,
    suppliersLost: 3,
    saveRate: 78.6,
    roiCalculated: 245.3,
    revenueRetained: 45600,
    isTestCampaign: false,
    autoExecute: true,
    triggerConditions: {
      riskScoreThreshold: 70,
      daysSinceLastLogin: 14
    },
    executionHistory: [
      {
        executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        suppliersTargeted: 12,
        successfulActions: 8,
        outcome: 'completed'
      }
    ],
    createdBy: 'system',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'campaign-2',
    name: 'New Supplier Onboarding',
    campaignType: 'onboarding' as const,
    description: 'Welcome sequence for new suppliers',
    targetRiskLevel: [ChurnRiskLevel.STABLE],
    targetSupplierTypes: ['all'],
    targetSegments: ['new_suppliers'],
    status: 'draft' as const,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    frequency: 'one_time' as const,
    targetedSuppliers: 0,
    emailsSent: 0,
    emailOpenRate: 0,
    emailClickRate: 0,
    callsCompleted: 0,
    responseRate: 0,
    suppliersRetained: 0,
    suppliersLost: 0,
    saveRate: 0,
    roiCalculated: 0,
    revenueRetained: 0,
    isTestCampaign: true,
    autoExecute: false,
    triggerConditions: {},
    executionHistory: [],
    createdBy: 'user123',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }
];

const defaultProps = {
  campaigns: mockCampaigns,
  onCreateCampaign: jest.fn(),
  onUpdateCampaign: jest.fn(),
  onDeleteCampaign: jest.fn(),
  onExecuteCampaign: jest.fn(),
  isCreating: false,
  isUpdating: false,
};

describe('RetentionCampaignManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders campaign manager with header and controls', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByText(/retention campaign manager/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
    });

    it('displays campaign list correctly', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByText('Peak Season Re-engagement')).toBeInTheDocument();
      expect(screen.getByText('New Supplier Onboarding')).toBeInTheDocument();
    });

    it('shows campaign status badges', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('displays campaign performance metrics', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByText('78.6%')).toBeInTheDocument(); // Save rate
      expect(screen.getByText('68.2%')).toBeInTheDocument(); // Open rate
      expect(screen.getByText('$45,600')).toBeInTheDocument(); // Revenue retained
    });
  });

  describe('Campaign Creation', () => {
    it('opens campaign creation modal when create button is clicked', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/new retention campaign/i)).toBeInTheDocument();
      });
    });

    it('displays campaign creation form with all required fields', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/campaign type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/target risk level/i)).toBeInTheDocument();
      });
    });

    it('validates required fields before submission', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create campaign/i });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/campaign name is required/i)).toBeInTheDocument();
    });

    it('submits campaign creation with valid data', async () => {
      const mockOnCreate = jest.fn().mockResolvedValue({});
      render(<RetentionCampaignManager {...defaultProps} onCreateCampaign={mockOnCreate} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/campaign name/i);
        const descriptionInput = screen.getByLabelText(/description/i);
        
        fireEvent.change(nameInput, { target: { value: 'Test Campaign' } });
        fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

        const submitButton = screen.getByRole('button', { name: /create campaign/i });
        fireEvent.click(submitButton);
      });

      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Campaign',
          description: 'Test description'
        })
      );
    });

    it('shows loading state during campaign creation', async () => {
      render(<RetentionCampaignManager {...defaultProps} isCreating={true} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /creating/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Campaign Management', () => {
    it('displays campaign action buttons', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const campaignCards = screen.getAllByTestId(/campaign-card/i);
      expect(campaignCards.length).toBeGreaterThan(0);

      const firstCard = campaignCards[0];
      expect(within(firstCard).getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(within(firstCard).getByRole('button', { name: /execute/i })).toBeInTheDocument();
    });

    it('executes campaign when execute button is clicked', async () => {
      const mockOnExecute = jest.fn().mockResolvedValue({});
      render(<RetentionCampaignManager {...defaultProps} onExecuteCampaign={mockOnExecute} />);

      const executeButton = screen.getAllByRole('button', { name: /execute/i })[0];
      fireEvent.click(executeButton);

      expect(mockOnExecute).toHaveBeenCalledWith('campaign-1');
    });

    it('opens edit modal for campaign editing', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Peak Season Re-engagement')).toBeInTheDocument();
      });
    });

    it('deletes campaign with confirmation', async () => {
      const mockOnDelete = jest.fn().mockResolvedValue({});
      render(<RetentionCampaignManager {...defaultProps} onDeleteCampaign={mockOnDelete} />);

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
        const confirmButton = screen.getByRole('button', { name: /delete campaign/i });
        fireEvent.click(confirmButton);
      });

      expect(mockOnDelete).toHaveBeenCalledWith('campaign-1');
    });
  });

  describe('Campaign Templates', () => {
    it('displays template selector in creation modal', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByText(/use template/i)).toBeInTheDocument();
        expect(screen.getByText(/re-engagement sequence/i)).toBeInTheDocument();
        expect(screen.getByText(/win-back campaign/i)).toBeInTheDocument();
      });
    });

    it('populates form when template is selected', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const template = screen.getByText(/re-engagement sequence/i);
        fireEvent.click(template);
      });

      const nameInput = screen.getByLabelText(/campaign name/i) as HTMLInputElement;
      expect(nameInput.value).toContain('Re-engagement');
    });
  });

  describe('A/B Testing Configuration', () => {
    it('shows A/B testing options in advanced settings', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const advancedToggle = screen.getByText(/advanced settings/i);
        fireEvent.click(advancedToggle);
      });

      expect(screen.getByText(/a\/b testing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/test variant percentage/i)).toBeInTheDocument();
    });

    it('configures A/B test parameters', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const advancedToggle = screen.getByText(/advanced settings/i);
        fireEvent.click(advancedToggle);

        const abTestToggle = screen.getByLabelText(/enable a\/b testing/i);
        fireEvent.click(abTestToggle);
      });

      expect(screen.getByLabelText(/control group size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/test duration/i)).toBeInTheDocument();
    });
  });

  describe('Performance Analytics', () => {
    it('displays campaign performance metrics chart', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByTestId('campaign-performance-chart')).toBeInTheDocument();
    });

    it('shows detailed performance metrics on campaign expand', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const expandButton = screen.getAllByRole('button', { name: /expand/i })[0];
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/execution history/i)).toBeInTheDocument();
        expect(screen.getByText(/roi analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/supplier feedback/i)).toBeInTheDocument();
      });
    });

    it('calculates and displays ROI correctly', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByText('245.3%')).toBeInTheDocument(); // ROI
    });
  });

  describe('Campaign Scheduling', () => {
    it('shows scheduling options in campaign form', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
      });
    });

    it('validates schedule configuration', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const startDateInput = screen.getByLabelText(/start date/i);
        fireEvent.change(startDateInput, { target: { value: '2024-12-01' } }); // Past date

        const submitButton = screen.getByRole('button', { name: /create campaign/i });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/start date cannot be in the past/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('filters campaigns by status', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      await waitFor(() => {
        expect(screen.getByText('Peak Season Re-engagement')).toBeInTheDocument();
        expect(screen.queryByText('New Supplier Onboarding')).not.toBeInTheDocument();
      });
    });

    it('searches campaigns by name', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search campaigns/i);
      fireEvent.change(searchInput, { target: { value: 'Peak' } });

      await waitFor(() => {
        expect(screen.getByText('Peak Season Re-engagement')).toBeInTheDocument();
        expect(screen.queryByText('New Supplier Onboarding')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/campaign management interface/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<RetentionCampaignManager {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      createButton.focus();
      expect(document.activeElement).toBe(createButton);

      fireEvent.keyDown(createButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('announces status changes to screen readers', async () => {
      const { rerender } = render(<RetentionCampaignManager {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();

      const updatedCampaigns = [
        { ...mockCampaigns[0], status: 'paused' as const },
        ...mockCampaigns.slice(1)
      ];

      rerender(<RetentionCampaignManager {...defaultProps} campaigns={updatedCampaigns} />);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/campaign status updated/i);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles campaign creation errors gracefully', async () => {
      const mockOnCreate = jest.fn().mockRejectedValue(new Error('Creation failed'));
      render(<RetentionCampaignManager {...defaultProps} onCreateCampaign={mockOnCreate} />);

      fireEvent.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/campaign name/i);
        fireEvent.change(nameInput, { target: { value: 'Test Campaign' } });

        const submitButton = screen.getByRole('button', { name: /create campaign/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to create campaign/i)).toBeInTheDocument();
      });
    });

    it('displays appropriate error messages for different failures', async () => {
      const mockOnExecute = jest.fn().mockRejectedValue(new Error('Execution failed'));
      render(<RetentionCampaignManager {...defaultProps} onExecuteCampaign={mockOnExecute} />);

      const executeButton = screen.getAllByRole('button', { name: /execute/i })[0];
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to execute campaign/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('renders efficiently with large campaign datasets', () => {
      const largeCampaignList = Array.from({ length: 100 }, (_, i) => ({
        ...mockCampaigns[0],
        id: `campaign-${i}`,
        name: `Campaign ${i}`,
      }));

      const startTime = performance.now();
      render(<RetentionCampaignManager {...defaultProps} campaigns={largeCampaignList} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('implements virtualization for large campaign lists', () => {
      const largeCampaignList = Array.from({ length: 200 }, (_, i) => ({
        ...mockCampaigns[0],
        id: `campaign-${i}`,
        name: `Campaign ${i}`,
      }));

      render(<RetentionCampaignManager {...defaultProps} campaigns={largeCampaignList} />);

      // Should only render visible campaigns
      const campaignCards = screen.getAllByTestId(/campaign-card/i);
      expect(campaignCards.length).toBeLessThan(50); // Reasonable viewport limit
    });
  });
});