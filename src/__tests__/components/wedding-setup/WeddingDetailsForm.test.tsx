/**
 * @file WeddingDetailsForm.test.tsx
 * @description Comprehensive tests for the WeddingDetailsForm component (Team A)
 * @coverage Form validation, data binding, internationalization, accessibility, mobile UX
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { WeddingDetailsForm } from '@/components/wedding-setup/WeddingDetailsForm';

// Mock dependencies
vi.mock('@/lib/supabase/client');
vi.mock('@/hooks/useWeddingValidation');

const mockOnSubmit = vi.fn();
const mockOnChange = vi.fn();

const defaultProps = {
  onSubmit: mockOnSubmit,
  onChange: mockOnChange,
  initialData: {},
  isLoading: false,
};

describe('WeddingDetailsForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      expect(screen.getByLabelText('Partner 1 Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Partner 2 Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Time')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Guest Count (Estimated)'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Style')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget Range')).toBeInTheDocument();
    });

    it('renders with initial data populated', () => {
      const initialData = {
        partner1Name: 'John Doe',
        partner2Name: 'Jane Smith',
        weddingDate: '2025-06-15',
        contactEmail: 'john.jane@example.com',
        guestCount: 150,
      };

      render(
        <WeddingDetailsForm {...defaultProps} initialData={initialData} />,
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('john.jane@example.com'),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(<WeddingDetailsForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Partner 1 name is required'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Partner 2 name is required'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Wedding date is required'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Contact email is required'),
        ).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Contact Email');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address'),
        ).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText('Contact Phone');
      await user.type(phoneInput, '123'); // Too short

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid phone number'),
        ).toBeInTheDocument();
      });
    });

    it('validates wedding date is in the future', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const dateInput = screen.getByLabelText('Wedding Date');
      const pastDate = new Date('2020-01-01').toISOString().split('T')[0];
      await user.type(dateInput, pastDate);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Wedding date must be in the future'),
        ).toBeInTheDocument();
      });
    });

    it('validates guest count is reasonable', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const guestCountInput = screen.getByLabelText('Guest Count (Estimated)');
      await user.type(guestCountInput, '10000'); // Unreasonably high

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Guest count seems unusually high. Please verify.'),
        ).toBeInTheDocument();
      });
    });

    it('validates budget range is within reasonable limits', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const budgetSelect = screen.getByLabelText('Budget Range');
      await user.selectOptions(budgetSelect, 'custom');

      // Custom budget input should appear
      const customBudgetInput = screen.getByLabelText('Custom Budget Amount');
      await user.type(customBudgetInput, '-1000'); // Negative budget

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Budget must be a positive amount'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('calls onChange when form fields are updated', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Partner 1 Name');
      await user.type(nameInput, 'John Doe');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          partner1Name: 'John Doe',
        });
      });
    });

    it('submits form with valid data', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      // Fill in all required fields
      await user.type(screen.getByLabelText('Partner 1 Name'), 'John Doe');
      await user.type(screen.getByLabelText('Partner 2 Name'), 'Jane Smith');

      const dateInput = screen.getByLabelText('Wedding Date');
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      await user.type(dateInput, futureDate.toISOString().split('T')[0]);

      await user.type(
        screen.getByLabelText('Contact Email'),
        'john.jane@example.com',
      );
      await user.type(screen.getByLabelText('Contact Phone'), '+1234567890');
      await user.type(screen.getByLabelText('Guest Count (Estimated)'), '150');

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            partner1Name: 'John Doe',
            partner2Name: 'Jane Smith',
            contactEmail: 'john.jane@example.com',
            contactPhone: '+1234567890',
            guestCount: 150,
          }),
        );
      });
    });

    it('shows custom budget field when custom option is selected', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const budgetSelect = screen.getByLabelText('Budget Range');
      await user.selectOptions(budgetSelect, 'custom');

      expect(screen.getByLabelText('Custom Budget Amount')).toBeInTheDocument();
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });

    it('provides wedding style suggestions', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const styleInput = screen.getByLabelText('Wedding Style');
      await user.type(styleInput, 'tra');

      await waitFor(() => {
        expect(screen.getByText('Traditional')).toBeInTheDocument();
        expect(screen.getByText('Rustic')).toBeInTheDocument();
      });
    });

    it('handles date picker interactions', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const dateInput = screen.getByLabelText('Wedding Date');
      await user.click(dateInput);

      // Calendar should open
      expect(
        screen.getByRole('dialog', { name: /choose date/i }),
      ).toBeInTheDocument();

      // Select a future date
      const futureDate = screen.getByText('15'); // Assuming 15th is available
      await user.click(futureDate);

      expect(dateInput).toHaveValue(expect.stringMatching(/\d{4}-\d{2}-15/));
    });
  });

  describe('Internationalization', () => {
    it('supports multiple languages', () => {
      // Mock i18n context for Spanish
      const SpanishWrapper = ({ children }: { children: React.ReactNode }) => (
        <div lang="es">{children}</div>
      );

      render(
        <SpanishWrapper>
          <WeddingDetailsForm {...defaultProps} />
        </SpanishWrapper>,
      );

      expect(
        screen.getByLabelText('Nombre de la Pareja 1'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Nombre de la Pareja 2'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha de la Boda')).toBeInTheDocument();
    });

    it('formats dates according to locale', () => {
      // Mock locale context
      const UKWrapper = ({ children }: { children: React.ReactNode }) => (
        <div lang="en-GB">{children}</div>
      );

      const initialData = { weddingDate: '2025-06-15' };
      render(
        <UKWrapper>
          <WeddingDetailsForm {...defaultProps} initialData={initialData} />
        </UKWrapper>,
      );

      // Should display DD/MM/YYYY format for UK locale
      expect(screen.getByDisplayValue('15/06/2025')).toBeInTheDocument();
    });

    it('supports different currency formats', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const budgetSelect = screen.getByLabelText('Budget Range');
      await user.selectOptions(budgetSelect, 'custom');

      const currencySelect = screen.getByLabelText('Currency');
      expect(
        screen.getByRole('option', { name: 'USD ($)' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'GBP (£)' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'EUR (€)' }),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const partner1Input = screen.getByLabelText('Partner 1 Name');
      expect(partner1Input).toHaveAttribute('aria-describedby');
      expect(partner1Input).toHaveAttribute('aria-required', 'true');

      const emailInput = screen.getByLabelText('Contact Email');
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('announces validation errors to screen readers', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const errorRegion = screen.getByRole('alert');
        expect(errorRegion).toHaveTextContent(
          'Please correct the following errors',
        );
      });
    });

    it('supports keyboard navigation', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const partner1Input = screen.getByLabelText('Partner 1 Name');
      partner1Input.focus();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText('Partner 2 Name')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Wedding Date')).toHaveFocus();
    });

    it('provides clear field descriptions', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      expect(
        screen.getByText('This will be used for all communications'),
      ).toBeInTheDocument();
      expect(
        screen.getByText("We'll use this for reminders and updates"),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Approximate number for planning purposes'),
      ).toBeInTheDocument();
    });
  });

  describe('Mobile Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('adapts form layout for mobile screens', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const form = screen.getByTestId('wedding-details-form');
      expect(form).toHaveClass('mobile-form');

      // Fields should stack vertically on mobile
      const fieldContainer = screen.getByTestId('form-fields');
      expect(fieldContainer).toHaveClass('flex-col');
    });

    it('uses mobile-optimized input types', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText('Contact Phone');
      expect(phoneInput).toHaveAttribute('type', 'tel');
      expect(phoneInput).toHaveAttribute('inputmode', 'tel');

      const emailInput = screen.getByLabelText('Contact Email');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('inputmode', 'email');

      const guestCountInput = screen.getByLabelText('Guest Count (Estimated)');
      expect(guestCountInput).toHaveAttribute('type', 'number');
      expect(guestCountInput).toHaveAttribute('inputmode', 'numeric');
    });

    it('has touch-friendly interactive elements', () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      const buttonStyles = getComputedStyle(submitButton);

      // Minimum touch target size
      expect(parseInt(buttonStyles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(buttonStyles.minWidth)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Auto-save Functionality', () => {
    it('auto-saves form data after user input', async () => {
      const mockAutoSave = vi.fn();
      render(
        <WeddingDetailsForm {...defaultProps} onAutoSave={mockAutoSave} />,
      );

      const nameInput = screen.getByLabelText('Partner 1 Name');
      await user.type(nameInput, 'John Doe');

      // Auto-save should trigger after debounce period
      await waitFor(
        () => {
          expect(mockAutoSave).toHaveBeenCalledWith({
            partner1Name: 'John Doe',
          });
        },
        { timeout: 2000 },
      );
    });

    it('shows save status indicator', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Partner 1 Name');
      await user.type(nameInput, 'John');

      // Should show "Saving..." indicator
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      // Should show "Saved" indicator after success
      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays server validation errors', async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue({
        errors: {
          contactEmail: 'Email already in use',
          weddingDate: 'Date not available',
        },
      });

      render(<WeddingDetailsForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill form and submit
      await user.type(screen.getByLabelText('Partner 1 Name'), 'John Doe');
      await user.type(screen.getByLabelText('Partner 2 Name'), 'Jane Smith');
      await user.type(
        screen.getByLabelText('Contact Email'),
        'existing@example.com',
      );

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
        expect(screen.getByText('Date not available')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const mockOnSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      render(<WeddingDetailsForm {...defaultProps} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', {
        name: /save details/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Unable to save. Please check your connection and try again.',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('debounces onChange events', async () => {
      render(<WeddingDetailsForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Partner 1 Name');

      // Rapid typing
      await user.type(nameInput, 'John', { delay: 50 });

      // Should only call onChange once after debounce
      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );
    });

    it('lazy loads date picker component', async () => {
      const mockLazyComponent = vi.fn();
      vi.mock('@/components/ui/DatePicker', () => ({
        default: mockLazyComponent,
      }));

      render(<WeddingDetailsForm {...defaultProps} />);

      // DatePicker should not be loaded initially
      expect(mockLazyComponent).not.toHaveBeenCalled();

      // Click date input to trigger lazy load
      const dateInput = screen.getByLabelText('Wedding Date');
      await user.click(dateInput);

      await waitFor(() => {
        expect(mockLazyComponent).toHaveBeenCalled();
      });
    });
  });
});
