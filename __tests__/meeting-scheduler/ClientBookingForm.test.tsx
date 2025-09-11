/**
 * Unit Tests for ClientBookingForm Component
 * WS-064: Meeting Scheduler - Client Verification & Security Testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClientBookingForm from '@/components/scheduling/ClientBookingForm';
import moment from 'moment-timezone';

// Mock moment
vi.mock('moment-timezone', () => ({
  default: (): any => ({
    format: vi.fn().mockReturnValue('Monday, January 1, 2024 at 10:00 AM'),
    add: vi.fn().mockReturnThis(),
    tz: vi.fn().mockReturnThis()
  })
}));

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Test data
const mockSelectedSlot = {
  id: 'slot-123',
  start: new Date('2024-01-01T10:00:00Z'),
  end: new Date('2024-01-01T10:30:00Z'),
  isAvailable: true,
  meetingType: {
    id: 'meeting-1',
    name: 'Initial Consultation',
    description: 'Get to know each other',
    duration_minutes: 30,
    color: '#7F56D9',
    is_paid: false,
    currency: 'GBP',
    meeting_location: 'Video Call',
    video_call_platform: 'Zoom',
    requires_questionnaire: true,
    questionnaire_questions: [
      {
        id: 'q1',
        question: 'What is your wedding date?',
        type: 'text' as const,
        required: true
      },
      {
        id: 'q2',
        question: 'How many guests?',
        type: 'select' as const,
        required: true,
        options: ['1-50', '51-100', '101-150', '150+']
      },
      {
        id: 'q3',
        question: 'Tell us about your vision',
        type: 'textarea' as const,
        required: false
      }
    ]
  }
};

const mockExistingClient = {
  id: 'client-123',
  name: 'John & Jane Smith',
  email: 'john.smith@example.com',
  phone: '+44 7123 456789',
  wedding_date: '2024-06-15',
  partner_name: 'Jane Smith',
  venue_name: 'The Grand Hotel',
  guest_count: 100,
  wedding_style: 'Classic'
};

const mockOnBookingSubmit = vi.fn();
const mockOnBack = vi.fn();
const mockOnClientLookup = vi.fn();

const defaultProps = {
  supplierId: 'supplier-123',
  bookingPageSlug: 'wedding-planning',
  selectedSlot: mockSelectedSlot,
  timezone: 'Europe/London',
  onBookingSubmit: mockOnBookingSubmit,
  onBack: mockOnBack,
  onClientLookup: mockOnClientLookup,
  requiresClientVerification: true
};

describe('ClientBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClientLookup.mockResolvedValue(mockExistingClient);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders multi-step form with progress indicators', () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      expect(screen.getByText('Client Verification')).toBeInTheDocument();
      expect(screen.getByText('Wedding Details')).toBeInTheDocument();
      expect(screen.getByText('Meeting Preferences')).toBeInTheDocument();
      expect(screen.getByText('Questionnaire')).toBeInTheDocument();
      expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
    });

    it('shows meeting summary with selected slot details', () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      expect(screen.getByText('Initial Consultation')).toBeInTheDocument();
      expect(screen.getByText('Get to know each other')).toBeInTheDocument();
      expect(screen.getByText(/Monday, January 1, 2024 at 10:00 AM/)).toBeInTheDocument();
      expect(screen.getByText('Video Call')).toBeInTheDocument();
    });

    it('shows security notice for existing clients only', () => {
      render(<ClientBookingForm {...defaultProps} requiresClientVerification={true} />);
      
      expect(screen.getByText('Existing Clients Only')).toBeInTheDocument();
      expect(screen.getByText(/This booking system is for existing clients only/)).toBeInTheDocument();
    });

    it('hides security restrictions when guest booking allowed', () => {
      render(
        <ClientBookingForm 
          {...defaultProps} 
          requiresClientVerification={false} 
          allowGuestBooking={true} 
        />
      );
      
      expect(screen.queryByText('Existing Clients Only')).not.toBeInTheDocument();
    });
  });

  describe('Client Verification Security', () => {
    it('prevents non-existing clients from proceeding', async () => {
      mockOnClientLookup.mockResolvedValue(null);
      
      render(<ClientBookingForm {...defaultProps} requiresClientVerification={true} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'nonexistent@example.com');
      
      await waitFor(() => {
        expect(screen.getByText(/Email not found. This booking system is for existing clients only/)).toBeInTheDocument();
      });
      
      // Continue button should be disabled or show error
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should not proceed to next step
      expect(screen.getByText('Client Verification')).toHaveClass('text-gray-900'); // Still on step 1
    });

    it('auto-verifies client when valid email is entered', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'john.smith@example.com');
      
      await waitFor(() => {
        expect(mockOnClientLookup).toHaveBeenCalledWith('john.smith@example.com');
        expect(screen.getByText('Client Account Verified')).toBeInTheDocument();
        expect(screen.getByText('Welcome back, John & Jane Smith!')).toBeInTheDocument();
      });
    });

    it('pre-fills form with verified client data', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'john.smith@example.com');
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John & Jane Smith')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+44 7123 456789')).toBeInTheDocument();
      });
    });

    it('handles client lookup errors gracefully', async () => {
      mockOnClientLookup.mockRejectedValue(new Error('Network error'));
      
      render(<ClientBookingForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByText(/Unable to verify client. Please try again/)).toBeInTheDocument();
      });
    });

    it('validates email format before client lookup', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'invalid-email');
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(mockOnClientLookup).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Step Navigation', () => {
    beforeEach(async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      // Complete step 1 - Client verification
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'john.smith@example.com');
      
      await waitFor(() => {
        expect(screen.getByText('Client Account Verified')).toBeInTheDocument();
      });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText('Wedding Details')).toHaveClass('text-gray-900');
      });
    });

    it('navigates between steps correctly', async () => {
      // Should be on step 2 now
      expect(screen.getByText('Tell us about your special day')).toBeInTheDocument();
      
      // Go back to step 1
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(screen.getByText('Client Verification')).toHaveClass('text-gray-900');
    });

    it('validates each step before allowing progression', async () => {
      // On step 2 - Wedding Details
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should show validation errors and not proceed
      await waitFor(() => {
        expect(screen.getByText('Wedding date is required')).toBeInTheDocument();
      });
    });

    it('completes wedding details step with valid data', async () => {
      // Fill wedding details
      const weddingDateInput = screen.getByLabelText(/Wedding Date/);
      await userEvent.type(weddingDateInput, '2024-06-15');
      
      const partnerNameInput = screen.getByLabelText(/Partner's Name/);
      await userEvent.clear(partnerNameInput);
      await userEvent.type(partnerNameInput, 'Jane Smith');
      
      const venueInput = screen.getByLabelText(/Venue Location/);
      await userEvent.clear(venueInput);
      await userEvent.type(venueInput, 'The Grand Hotel');
      
      const guestCountSelect = screen.getByLabelText(/Expected Guest Count/);
      fireEvent.click(guestCountSelect);
      const guestOption = screen.getByText('51-100 guests (Medium)');
      fireEvent.click(guestOption);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText('Meeting Preferences')).toHaveClass('text-gray-900');
      });
    });
  });

  describe('Wedding Details Validation', () => {
    it('validates wedding date is in the future', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      // Navigate to wedding details step
      await completeClientVerification();
      
      // Enter past date
      const weddingDateInput = screen.getByLabelText(/Wedding Date/);
      await userEvent.type(weddingDateInput, '2020-01-01');
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText('Wedding date must be in the future')).toBeInTheDocument();
    });

    it('requires all mandatory wedding fields', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeClientVerification();
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText('Wedding date is required')).toBeInTheDocument();
      expect(screen.getByText('Partner name is required')).toBeInTheDocument();
      expect(screen.getByText('Venue location is required')).toBeInTheDocument();
      expect(screen.getByText('Guest count is required')).toBeInTheDocument();
    });
  });

  describe('Questionnaire Handling', () => {
    it('shows questionnaire step when meeting type requires it', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeClientVerification();
      await completeWeddingDetails();
      await completeMeetingPreferences();
      
      // Should be on questionnaire step
      expect(screen.getByText('Additional Questions')).toBeInTheDocument();
      expect(screen.getByText('What is your wedding date?')).toBeInTheDocument();
      expect(screen.getByText('How many guests?')).toBeInTheDocument();
      expect(screen.getByText('Tell us about your vision')).toBeInTheDocument();
    });

    it('validates required questionnaire fields', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeClientVerification();
      await completeWeddingDetails();
      await completeMeetingPreferences();
      
      // Try to continue without answering required questions
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText('This question is required')).toBeInTheDocument();
    });

    it('handles different question types correctly', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeClientVerification();
      await completeWeddingDetails();
      await completeMeetingPreferences();
      
      // Text question
      const textInput = screen.getByLabelText(/What is your wedding date/);
      await userEvent.type(textInput, '2024-06-15');
      
      // Select question
      const selectQuestion = screen.getByLabelText(/How many guests/);
      fireEvent.click(selectQuestion);
      const selectOption = screen.getByText('51-100');
      fireEvent.click(selectOption);
      
      // Textarea question
      const textareaQuestion = screen.getByLabelText(/Tell us about your vision/);
      await userEvent.type(textareaQuestion, 'Romantic garden wedding');
      
      expect(textInput).toHaveValue('2024-06-15');
      expect(textareaQuestion).toHaveValue('Romantic garden wedding');
    });

    it('skips questionnaire step when not required', async () => {
      const noQuestionnaireSlot = {
        ...mockSelectedSlot,
        meetingType: {
          ...mockSelectedSlot.meetingType,
          requires_questionnaire: false,
          questionnaire_questions: []
        }
      };

      render(<ClientBookingForm {...defaultProps} selectedSlot={noQuestionnaireSlot} />);
      
      await completeClientVerification();
      await completeWeddingDetails();
      await completeMeetingPreferences();
      
      // Should go directly to review step
      expect(screen.getByText('Review & Confirm')).toHaveClass('text-gray-900');
    });
  });

  describe('Final Review and Submission', () => {
    it('displays comprehensive booking summary', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      
      // Should show review step
      expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      expect(screen.getByText('Booking Summary')).toBeInTheDocument();
      
      // Should show contact information
      expect(screen.getByText('John & Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
      
      // Should show wedding details
      expect(screen.getByText(/Date: /)).toBeInTheDocument();
      expect(screen.getByText(/Partner: Jane Smith/)).toBeInTheDocument();
      
      // Should show meeting details
      expect(screen.getByText('Initial Consultation')).toBeInTheDocument();
    });

    it('requires terms and privacy acceptance', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      
      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);
      
      expect(screen.getByText('You must accept the terms and conditions')).toBeInTheDocument();
      expect(screen.getByText('You must accept the privacy policy')).toBeInTheDocument();
    });

    it('submits booking with correct data structure', async () => {
      mockOnBookingSubmit.mockResolvedValue({ success: true, bookingId: 'booking-123' });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      
      // Accept terms
      const termsCheckbox = screen.getByLabelText(/accept the terms/);
      const privacyCheckbox = screen.getByLabelText(/accept the privacy/);
      fireEvent.click(termsCheckbox);
      fireEvent.click(privacyCheckbox);
      
      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnBookingSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'client-123',
            client_name: 'John & Jane Smith',
            client_email: 'john.smith@example.com',
            wedding_date: '2024-06-15',
            partner_name: 'Jane Smith',
            terms_accepted: true,
            privacy_accepted: true
          })
        );
      });
    });

    it('handles submission errors gracefully', async () => {
      mockOnBookingSubmit.mockResolvedValue({ success: false, error: 'Booking failed' });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      
      // Accept terms and submit
      const termsCheckbox = screen.getByLabelText(/accept the terms/);
      const privacyCheckbox = screen.getByLabelText(/accept the privacy/);
      fireEvent.click(termsCheckbox);
      fireEvent.click(privacyCheckbox);
      
      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Booking failed')).toBeInTheDocument();
      });
    });
  });

  describe('Booking Confirmation', () => {
    it('shows confirmation screen after successful booking', async () => {
      mockOnBookingSubmit.mockResolvedValue({ success: true, bookingId: 'BOOK-123' });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      
      // Accept terms and submit
      const termsCheckbox = screen.getByLabelText(/accept the terms/);
      const privacyCheckbox = screen.getByLabelText(/accept the privacy/);
      fireEvent.click(termsCheckbox);
      fireEvent.click(privacyCheckbox);
      
      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
        expect(screen.getByText('BOOK-123')).toBeInTheDocument();
        expect(screen.getByText(/confirmation email has been sent/)).toBeInTheDocument();
      });
    });

    it('provides post-booking action buttons', async () => {
      mockOnBookingSubmit.mockResolvedValue({ success: true, bookingId: 'BOOK-123' });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeAllSteps();
      await completeBookingSubmission();
      
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Book Another Meeting')).toBeInTheDocument();
    });
  });

  describe('Performance Testing', () => {
    it('renders form within performance budget', () => {
      const startTime = performance.now();
      
      render(<ClientBookingForm {...defaultProps} />);
      
      const renderTime = performance.now() - startTime;
      
      // Should render within 100ms (much less than 500ms booking confirmation requirement)
      expect(renderTime).toBeLessThan(100);
    });

    it('validates form steps efficiently', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Fill form and validate
      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, 'john.smith@example.com');
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const validationTime = performance.now() - startTime;
      
      // Validation should be fast
      expect(validationTime).toBeLessThan(50);
    });
  });

  describe('Accessibility', () => {
    it('provides proper form labels and ARIA attributes', () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('required');
      expect(screen.getByLabelText(/Full Name/)).toHaveAttribute('required');
      expect(screen.getByLabelText(/Phone Number/)).toHaveAttribute('required');
    });

    it('announces validation errors to screen readers', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/Email Address/);
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('maintains focus management across steps', async () => {
      render(<ClientBookingForm {...defaultProps} />);
      
      await completeClientVerification();
      
      // Focus should move to first field of next step
      await waitFor(() => {
        const weddingDateInput = screen.getByLabelText(/Wedding Date/);
        expect(document.activeElement).toBe(weddingDateInput);
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts form layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      // Should render with mobile-appropriate layout
      expect(screen.getByText('Client Verification')).toBeInTheDocument();
    });

    it('uses touch-optimized input sizes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      render(<ClientBookingForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/Email Address/);
      expect(emailInput).toHaveClass(/min-h-\[44px\]|touch/); // Touch-optimized sizing
    });
  });

  // Helper functions for test setup
  async function completeClientVerification() {
    const emailInput = screen.getByLabelText(/Email Address/);
    await userEvent.type(emailInput, 'john.smith@example.com');
    
    await waitFor(() => {
      expect(screen.getByText('Client Account Verified')).toBeInTheDocument();
    });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Wedding Details')).toHaveClass('text-gray-900');
    });
  }

  async function completeWeddingDetails() {
    const weddingDateInput = screen.getByLabelText(/Wedding Date/);
    await userEvent.type(weddingDateInput, '2024-06-15');
    
    const partnerNameInput = screen.getByLabelText(/Partner's Name/);
    await userEvent.clear(partnerNameInput);
    await userEvent.type(partnerNameInput, 'Jane Smith');
    
    const venueInput = screen.getByLabelText(/Venue Location/);
    await userEvent.clear(venueInput);
    await userEvent.type(venueInput, 'The Grand Hotel');
    
    const guestCountSelect = screen.getByLabelText(/Expected Guest Count/);
    fireEvent.click(guestCountSelect);
    const guestOption = screen.getByText('51-100 guests (Medium)');
    fireEvent.click(guestOption);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Meeting Preferences')).toHaveClass('text-gray-900');
    });
  }

  async function completeMeetingPreferences() {
    // Optional fields, just continue
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Additional Questions|Review & Confirm/)).toBeInTheDocument();
    });
  }

  async function completeQuestionnaire() {
    if (screen.queryByText('Additional Questions')) {
      // Answer required questions
      const textInput = screen.getByLabelText(/What is your wedding date/);
      await userEvent.type(textInput, '2024-06-15');
      
      const selectQuestion = screen.getByLabelText(/How many guests/);
      fireEvent.click(selectQuestion);
      const selectOption = screen.getByText('51-100');
      fireEvent.click(selectOption);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Review & Confirm')).toHaveClass('text-gray-900');
    });
  }

  async function completeAllSteps() {
    await completeClientVerification();
    await completeWeddingDetails();
    await completeMeetingPreferences();
    await completeQuestionnaire();
  }

  async function completeBookingSubmission() {
    const termsCheckbox = screen.getByLabelText(/accept the terms/);
    const privacyCheckbox = screen.getByLabelText(/accept the privacy/);
    fireEvent.click(termsCheckbox);
    fireEvent.click(privacyCheckbox);
    
    const confirmButton = screen.getByText('Confirm Booking');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    });
  }
});