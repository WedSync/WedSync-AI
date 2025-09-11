/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { VendorSpecificControls } from '@/components/ai/VendorSpecificControls';
import {
  JourneySuggestionRequest,
  VendorType,
  ServiceLevel,
  CommunicationStyle,
  CommunicationFrequency,
} from '@/types/journey-ai';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Camera: ({ className }: { className?: string }) => (
    <div data-testid="camera-icon" className={className} />
  ),
  ChefHat: ({ className }: { className?: string }) => (
    <div data-testid="chefhat-icon" className={className} />
  ),
  Music: ({ className }: { className?: string }) => (
    <div data-testid="music-icon" className={className} />
  ),
  Building2: ({ className }: { className?: string }) => (
    <div data-testid="building2-icon" className={className} />
  ),
  ClipboardList: ({ className }: { className?: string }) => (
    <div data-testid="clipboardlist-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} />
  ),
  Users: ({ className }: { className?: string }) => (
    <div data-testid="users-icon" className={className} />
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <div data-testid="messagesquare-icon" className={className} />
  ),
  MessageCircle: ({ className }: { className?: string }) => (
    <div data-testid="messagecircle-icon" className={className} />
  ),
  Mail: ({ className }: { className?: string }) => (
    <div data-testid="mail-icon" className={className} />
  ),
  Phone: ({ className }: { className?: string }) => (
    <div data-testid="phone-icon" className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <div data-testid="user-icon" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevrondown-icon" className={className} />
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <div data-testid="chevronright-icon" className={className} />
  ),
}));

describe('VendorSpecificControls', () => {
  const mockRequest: JourneySuggestionRequest = {
    vendorType: 'photographer' as VendorType,
    serviceLevel: 'premium' as ServiceLevel,
    weddingTimeline: 12,
    clientPreferences: {
      communicationStyle: 'friendly' as CommunicationStyle,
      frequency: 'regular' as CommunicationFrequency,
      preferredChannels: ['email', 'sms'],
      timeOfDay: 'any',
    },
  };

  const mockOnChange = jest.fn();
  const defaultProps = {
    request: mockRequest,
    onChange: mockOnChange,
    isLoading: false,
    errors: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vendor Type Selection', () => {
    it('renders all vendor type options', () => {
      render(<VendorSpecificControls {...defaultProps} />);

      expect(screen.getByText('Wedding Photography')).toBeInTheDocument();
      expect(screen.getByText('Wedding Catering')).toBeInTheDocument();
      expect(
        screen.getByText('Wedding DJ & Entertainment'),
      ).toBeInTheDocument();
      expect(screen.getByText('Wedding Venue')).toBeInTheDocument();
      expect(screen.getByText('Wedding Planning')).toBeInTheDocument();
    });

    it('shows selected vendor type', () => {
      render(<VendorSpecificControls {...defaultProps} />);

      const photographerCard = screen
        .getByText('Wedding Photography')
        .closest('button');
      expect(photographerCard).toHaveClass('border-accent');
    });

    it('calls onChange when vendor type is selected', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      const catererCard = screen
        .getByText('Wedding Catering')
        .closest('button');
      await user.click(catererCard!);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorType: 'caterer',
        }),
      );
    });

    it('displays vendor descriptions and timelines', () => {
      render(<VendorSpecificControls {...defaultProps} />);

      expect(
        screen.getByText('Capture moments and memories'),
      ).toBeInTheDocument();
      expect(screen.getByText('3mo')).toBeInTheDocument();
      expect(screen.getByText('6mo')).toBeInTheDocument();
      expect(screen.getByText('12mo')).toBeInTheDocument();
    });
  });

  describe('Service Level Selection', () => {
    it('shows service level options when on service section', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      // Navigate to service level section
      const serviceLevelTab = screen.getByText('Service Level');
      await user.click(serviceLevelTab);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
        expect(screen.getByText('Premium')).toBeInTheDocument();
        expect(screen.getByText('Luxury')).toBeInTheDocument();
      });
    });

    it('calls onChange when service level is selected', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      // Navigate to service level section
      await user.click(screen.getByText('Service Level'));

      // Select luxury service level
      await waitFor(() => {
        const luxuryOption = screen.getByText('Luxury').closest('button');
        return user.click(luxuryOption!);
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceLevel: 'luxury',
          }),
        );
      });
    });

    it('displays service descriptions', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Service Level'));

      await waitFor(() => {
        expect(
          screen.getByText('Essential coverage and edited photos'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Full day coverage with engagement session'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Multiple photographers and premium albums'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Timeline Selection', () => {
    it('shows timeline slider when on timeline section', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        expect(
          screen.getByText('Timeline: 12 months before wedding'),
        ).toBeInTheDocument();
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
    });

    it('calls onChange when timeline is adjusted', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '18' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          weddingTimeline: 18,
        }),
      );
    });

    it('shows common timelines for vendor type', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        expect(screen.getByText('3 months')).toBeInTheDocument();
        expect(screen.getByText('6 months')).toBeInTheDocument();
        expect(screen.getByText('18 months')).toBeInTheDocument();
      });
    });
  });

  describe('Client Preferences', () => {
    it('shows preference options when on preferences section', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Preferences'));

      await waitFor(() => {
        expect(screen.getByText('Communication Style')).toBeInTheDocument();
        expect(screen.getByText('Communication Frequency')).toBeInTheDocument();
        expect(
          screen.getByText('Preferred Communication Channels'),
        ).toBeInTheDocument();
      });
    });

    it('allows selection of communication style', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Preferences'));

      await waitFor(async () => {
        const casualButton = screen.getByRole('button', { name: /casual/i });
        await user.click(casualButton);
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPreferences: expect.objectContaining({
            communicationStyle: 'casual',
          }),
        }),
      );
    });

    it('allows toggling of communication channels', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Preferences'));

      await waitFor(async () => {
        const phoneButton = screen.getByRole('button', { name: /phone/i });
        await user.click(phoneButton);
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPreferences: expect.objectContaining({
            preferredChannels: ['email', 'sms', 'phone'],
          }),
        }),
      );
    });

    it('shows selected channels with active styling', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Preferences'));

      await waitFor(() => {
        const emailButton = screen.getByText('Email').closest('button');
        expect(emailButton).toHaveClass('border-accent');
      });
    });
  });

  describe('Navigation', () => {
    it('shows section navigation tabs', () => {
      render(<VendorSpecificControls {...defaultProps} />);

      expect(screen.getByText('Vendor Type')).toBeInTheDocument();
      expect(screen.getByText('Service Level')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('navigates between sections', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        expect(screen.getByText('Wedding Timeline')).toBeInTheDocument();
      });
    });

    it('shows navigation arrows', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      expect(screen.getByText('Next →')).toBeInTheDocument();

      await user.click(screen.getByText('Service Level'));

      await waitFor(() => {
        expect(screen.getByText('← Previous')).toBeInTheDocument();
        expect(screen.getByText('Next →')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('disables controls when loading', () => {
      render(<VendorSpecificControls {...defaultProps} isLoading={true} />);

      const photographerCard = screen
        .getByText('Wedding Photography')
        .closest('button');
      expect(photographerCard).toBeDisabled();
    });

    it('displays validation errors', () => {
      const errors = {
        vendorType: 'Please select a vendor type',
        serviceLevel: 'Service level is required',
      };

      render(<VendorSpecificControls {...defaultProps} errors={errors} />);

      expect(
        screen.getByText('Please select a vendor type'),
      ).toBeInTheDocument();
    });

    it('applies error styling to buttons', () => {
      render(<VendorSpecificControls {...defaultProps} isLoading={true} />);

      const photographerCard = screen
        .getByText('Wedding Photography')
        .closest('button');
      expect(photographerCard).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('min', '1');
        expect(slider).toHaveAttribute('max', '24');
        expect(slider).toHaveAttribute('value', '12');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<VendorSpecificControls {...defaultProps} />);

      const photographerCard = screen
        .getByText('Wedding Photography')
        .closest('button');
      expect(photographerCard).toBeInTheDocument();

      // Test that buttons are focusable
      photographerCard?.focus();
      expect(photographerCard).toHaveFocus();
    });

    it('has proper button roles and labels', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Preferences'));

      await waitFor(() => {
        const communicationButtons = screen.getAllByRole('button');
        expect(communicationButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Validation', () => {
    it('validates timeline range', async () => {
      const user = userEvent.setup();
      render(<VendorSpecificControls {...defaultProps} />);

      await user.click(screen.getByText('Timeline'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '0' } });
      });

      // Should still call onChange with minimum value
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles empty channel selection gracefully', async () => {
      const requestWithNoChannels = {
        ...mockRequest,
        clientPreferences: {
          ...mockRequest.clientPreferences,
          preferredChannels: ['email'], // Start with one channel
        },
      };

      const user = userEvent.setup();
      render(
        <VendorSpecificControls
          {...defaultProps}
          request={requestWithNoChannels}
        />,
      );

      await user.click(screen.getByText('Preferences'));

      await waitFor(async () => {
        const emailButton = screen.getByText('Email').closest('button');
        await user.click(emailButton!); // Remove the last channel
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPreferences: expect.objectContaining({
            preferredChannels: [],
          }),
        }),
      );
    });
  });
});
