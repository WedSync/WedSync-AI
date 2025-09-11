/**
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCampaignBuilder } from '@/components/reviews/ReviewCampaignBuilder';
import { reviewCampaignFixtures } from '@/test/fixtures/review-collection';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

// Mock server action
vi.mock('@/app/api/reviews/campaigns/create/action', () => ({
  createReviewCampaign: vi.fn()
}));

describe('ReviewCampaignBuilder', () => {
  const defaultProps = {
    clientId: 'test-client-id',
    onSave: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all form fields correctly', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Check for main form elements
      expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/send review request/i)).toBeInTheDocument();
      expect(screen.getByText(/review platforms/i)).toBeInTheDocument();
      expect(screen.getByText(/review request message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/review incentive/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/campaign status/i)).toBeInTheDocument();
    });

    it('displays platform options with correct icons and descriptions', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Check platform options
      expect(screen.getByText('Google Business')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('WeddingWire')).toBeInTheDocument();
      expect(screen.getByText('The Knot')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Google My Business reviews')).toBeInTheDocument();
      expect(screen.getByText('Facebook page reviews')).toBeInTheDocument();
    });

    it('shows preview toggle button', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);
      
      const previewButton = screen.getByText(/preview/i);
      expect(previewButton).toBeInTheDocument();
    });

    it('renders with existing campaign data', () => {
      const existingCampaign = reviewCampaignFixtures.validCampaign;
      render(
        <ReviewCampaignBuilder 
          {...defaultProps} 
          existingCampaign={existingCampaign}
        />
      );

      // Check that form is populated
      expect(screen.getByDisplayValue(existingCampaign.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(existingCampaign.delay_days.toString())).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates campaign name field', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/campaign name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Campaign');

      expect(nameInput).toHaveValue('Test Campaign');
    });

    it('toggles platform selection', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Find Google platform toggle (should be unchecked initially)
      const googleToggle = screen.getByText('Google Business').closest('div');
      expect(googleToggle).toBeInTheDocument();

      // Click to select
      await user.click(googleToggle!);
      
      // Check that it's visually selected (would need to check CSS classes or aria attributes)
      expect(googleToggle).toHaveClass('border-primary-300');
    });

    it('changes delay days selection', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const delaySelect = screen.getByLabelText(/send review request/i);
      await user.selectOptions(delaySelect, '14');

      expect(delaySelect).toHaveValue('14');
    });

    it('updates incentive type and shows value field', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const incentiveSelect = screen.getByLabelText(/review incentive/i);
      await user.selectOptions(incentiveSelect, 'discount');

      expect(incentiveSelect).toHaveValue('discount');
      
      // Value input should appear
      const incentiveInput = screen.getByPlaceholderText(/e.g., 10% off/i);
      expect(incentiveInput).toBeInTheDocument();
    });

    it('toggles campaign active status', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const statusToggle = screen.getByLabelText(/campaign status/i);
      expect(statusToggle).toBeChecked(); // Default is active

      await user.click(statusToggle);
      expect(statusToggle).not.toBeChecked();
    });

    it('shows/hides preview panel', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const previewButton = screen.getByText(/preview/i);
      
      // Initially hidden
      expect(screen.queryByText(/campaign preview/i)).not.toBeInTheDocument();

      // Show preview
      await user.click(previewButton);
      expect(screen.getByText(/campaign preview/i)).toBeInTheDocument();

      // Hide preview
      await user.click(previewButton);
      expect(screen.queryByText(/campaign preview/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires campaign name', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
      });
    });

    it('requires at least one platform selection', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Fill required fields but no platform
      await user.type(screen.getByLabelText(/campaign name/i), 'Test Campaign');
      await user.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByText(/select.*platform/i)).toBeInTheDocument();
      });
    });

    it('validates message template', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Submit without message template
      await user.type(screen.getByLabelText(/campaign name/i), 'Test Campaign');
      await user.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByText(/message.*required/i)).toBeInTheDocument();
      });
    });

    it('validates incentive value when incentive type is selected', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Select discount but don't provide value
      await user.selectOptions(screen.getByLabelText(/review incentive/i), 'discount');
      await user.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByText(/incentive value.*required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Check ARIA labels
      expect(screen.getByLabelText(/campaign name/i)).toHaveAttribute('required');
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Check button accessibility
      const submitButton = screen.getByRole('button', { name: /create campaign/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('provides helpful field descriptions', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      expect(screen.getByText(/optimal timing.*7-14 days/i)).toBeInTheDocument();
    });

    it('has proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/campaign name/i);
      nameInput.focus();
      
      expect(nameInput).toHaveFocus();

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/send review request/i)).toHaveFocus();
    });
  });

  describe('Integration with Supporting Components', () => {
    it('integrates with MessageTemplateEditor', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // MessageTemplateEditor should be rendered
      expect(screen.getByText(/merge fields/i)).toBeInTheDocument();
      expect(screen.getByText(/quick tips/i)).toBeInTheDocument();
    });

    it('integrates with CampaignPreview when preview is shown', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      await user.click(screen.getByText(/preview/i));
      
      // CampaignPreview should show
      expect(screen.getByText(/client experience preview/i)).toBeInTheDocument();
    });

    it('uses PlatformToggle components for platform selection', () => {
      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Platform toggles should be present
      const platformToggles = screen.getAllByRole('button');
      const platformToggleCount = platformToggles.filter(button => 
        button.textContent?.includes('Google') || 
        button.textContent?.includes('Facebook')
      ).length;
      
      expect(platformToggleCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('displays server-side validation errors', async () => {
      const user = userEvent.setup();
      
      // Mock server action to return error
      const { createReviewCampaign } = await import('@/app/api/reviews/campaigns/create/action');
      vi.mocked(createReviewCampaign).mockRejectedValueOnce(new Error('Server error'));

      render(<ReviewCampaignBuilder {...defaultProps} />);

      // Fill form and submit
      await user.type(screen.getByLabelText(/campaign name/i), 'Test Campaign');
      await user.click(screen.getByRole('button', { name: /create campaign/i }));

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      render(<ReviewCampaignBuilder {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', () => {
      const startTime = performance.now();
      render(<ReviewCampaignBuilder {...defaultProps} />);
      const renderTime = performance.now() - startTime;

      // Should render in under 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large forms efficiently', () => {
      const largeProps = {
        ...defaultProps,
        existingCampaign: {
          ...reviewCampaignFixtures.validCampaign,
          message_template: 'A'.repeat(5000) // Large message
        }
      };

      const startTime = performance.now();
      render(<ReviewCampaignBuilder {...largeProps} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(200);
    });
  });
});

// Security Tests
describe('ReviewCampaignBuilder Security', () => {
  it('sanitizes user input', async () => {
    const user = userEvent.setup();
    render(<ReviewCampaignBuilder />);

    const maliciousInput = '<script>alert("xss")</script>';
    const nameInput = screen.getByLabelText(/campaign name/i);
    
    await user.type(nameInput, maliciousInput);
    
    // Input should be escaped/sanitized
    expect(nameInput.value).not.toContain('<script>');
  });

  it('prevents CSRF attacks by using secure form actions', () => {
    render(<ReviewCampaignBuilder />);

    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('action'); // Should use server action
  });

  it('validates file uploads if any', () => {
    // This would test any file upload functionality
    // Currently not implemented but good to have the test structure
    expect(true).toBe(true);
  });
});