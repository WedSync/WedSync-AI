import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MobileFieldValidator,
  MobileFieldValidationUtils,
  ValidationError,
} from '@/components/mobile/fields/MobileFieldValidator';

// Mock touch components
jest.mock('@/components/mobile/touch/TouchButton', () => {
  return {
    TouchButton: ({ children, onClick, className }: any) => (
      <button
        onClick={onClick}
        className={className}
        data-testid="touch-button"
      >
        {children}
      </button>
    ),
  };
});

describe('MobileFieldValidator', () => {
  const mockErrors: ValidationError[] = [
    {
      code: 'REQUIRED_FIELD_EMPTY',
      message: 'This field is required',
      field: 'partner1_name',
      value: '',
      severity: 'error',
    },
    {
      code: 'INVALID_EMAIL_FORMAT',
      message: 'Please enter a valid email address',
      field: 'partner1_email',
      value: 'invalid-email',
      severity: 'error',
    },
  ];

  const mockWarnings: ValidationError[] = [
    {
      code: 'DATE_TOO_LATE',
      message: 'Wedding date is quite far in the future',
      field: 'wedding_date',
      value: '2028-06-15',
      severity: 'warning',
    },
  ];

  const mockSuggestions: ValidationError[] = [
    {
      code: 'GUEST_COUNT_SUGGESTION',
      message: 'Consider updating your guest count for better vendor matching',
      field: 'guest_count',
      value: 150,
      severity: 'info',
    },
  ];

  const mockOnDismiss = jest.fn();
  const mockOnFixAttempt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should show success state when no errors', () => {
      render(
        <MobileFieldValidator
          errors={[]}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(screen.getByText('All fields are valid')).toBeInTheDocument();
    });

    it('should display errors with proper styling', () => {
      render(
        <MobileFieldValidator
          errors={mockErrors}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(
        screen.getByText('Please enter a valid email address'),
      ).toBeInTheDocument();
    });

    it('should display warnings with different styling', () => {
      render(
        <MobileFieldValidator
          errors={[]}
          warnings={mockWarnings}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(
        screen.getByText('Wedding date is quite far in the future'),
      ).toBeInTheDocument();
    });

    it('should display suggestions with info styling', () => {
      render(
        <MobileFieldValidator
          errors={[]}
          suggestions={mockSuggestions}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(
        screen.getByText(
          'Consider updating your guest count for better vendor matching',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should show summary in compact mode', () => {
      render(
        <MobileFieldValidator
          errors={mockErrors}
          warnings={mockWarnings}
          compact={true}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(screen.getByText('2 errors')).toBeInTheDocument();
      expect(screen.getByText('1 warning')).toBeInTheDocument();
    });

    it('should handle singular/plural correctly in compact mode', () => {
      const singleError = [mockErrors[0]];

      render(
        <MobileFieldValidator
          errors={singleError}
          compact={true}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(screen.getByText('1 error')).toBeInTheDocument();
    });
  });

  describe('Expansion and Interaction', () => {
    it('should expand to show details when clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFieldValidator
          errors={mockErrors}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      const firstError = screen.getByText('This field is required');
      await user.click(firstError);

      expect(screen.getByText('How to fix:')).toBeInTheDocument();
      expect(screen.getByText('Field:')).toBeInTheDocument();
      expect(screen.getByText('Error code:')).toBeInTheDocument();
    });

    it('should show fix suggestions when expanded', async () => {
      const user = userEvent.setup();
      render(
        <MobileFieldValidator
          errors={mockErrors}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      const emailError = screen.getByText('Please enter a valid email address');
      await user.click(emailError);

      expect(
        screen.getByText(
          /Please enter a valid email address \(e\.g\., name@example\.com\)\./,
        ),
      ).toBeInTheDocument();
    });

    it('should call onFixAttempt when fix button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFieldValidator
          errors={mockErrors}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      // Expand first error
      const firstError = screen.getByText('This field is required');
      await user.click(firstError);

      // Click fix button
      const fixButton = screen.getByText('Try to Fix');
      await user.click(fixButton);

      expect(mockOnFixAttempt).toHaveBeenCalledWith(mockErrors[0]);
    });

    it('should call onDismiss when dismiss button is clicked for warnings', async () => {
      const user = userEvent.setup();
      render(
        <MobileFieldValidator
          errors={[]}
          warnings={mockWarnings}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      // Expand warning
      const warning = screen.getByText(
        'Wedding date is quite far in the future',
      );
      await user.click(warning);

      // Click dismiss button
      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledWith(mockWarnings[0]);
    });

    it('should not show dismiss button for errors', async () => {
      const user = userEvent.setup();
      render(
        <MobileFieldValidator
          errors={mockErrors}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      // Expand error
      const error = screen.getByText('This field is required');
      await user.click(error);

      // Should not have dismiss button for errors
      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should use appropriate icons for different severity levels', () => {
      render(
        <MobileFieldValidator
          errors={mockErrors}
          warnings={mockWarnings}
          suggestions={mockSuggestions}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      // Check that different severity levels are rendered (icons are SVGs)
      const errorMessages = screen.getAllByText(
        /This field is required|Please enter a valid email address/,
      );
      const warningMessages = screen.getAllByText(
        /Wedding date is quite far in the future/,
      );
      const infoMessages = screen.getAllByText(
        /Consider updating your guest count/,
      );

      expect(errorMessages.length).toBe(2);
      expect(warningMessages.length).toBe(1);
      expect(infoMessages.length).toBe(1);
    });

    it('should apply correct background colors based on severity', () => {
      const { container } = render(
        <MobileFieldValidator
          errors={mockErrors}
          warnings={mockWarnings}
          suggestions={mockSuggestions}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      // Check for presence of error, warning, and info colored elements
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
    });
  });

  describe('Dismissal Functionality', () => {
    it('should remove dismissed items from display', () => {
      const { rerender } = render(
        <MobileFieldValidator
          errors={mockErrors}
          warnings={mockWarnings}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(
        screen.getByText('Wedding date is quite far in the future'),
      ).toBeInTheDocument();

      // Simulate dismissing the warning by not including it in re-render
      rerender(
        <MobileFieldValidator
          errors={mockErrors}
          warnings={[]}
          onDismiss={mockOnDismiss}
          onFixAttempt={mockOnFixAttempt}
        />,
      );

      expect(
        screen.queryByText('Wedding date is quite far in the future'),
      ).not.toBeInTheDocument();
    });
  });
});

describe('MobileFieldValidationUtils', () => {
  describe('validateEmail', () => {
    it('should validate empty email as required field error', () => {
      const errors = MobileFieldValidationUtils.validateEmail('');

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED_FIELD_EMPTY');
      expect(errors[0].severity).toBe('error');
    });

    it('should validate invalid email format', () => {
      const errors = MobileFieldValidationUtils.validateEmail('invalid-email');

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_EMAIL_FORMAT');
      expect(errors[0].severity).toBe('error');
    });

    it('should pass valid email', () => {
      const errors =
        MobileFieldValidationUtils.validateEmail('test@example.com');

      expect(errors).toHaveLength(0);
    });
  });

  describe('validatePhone', () => {
    it('should allow empty phone (optional field)', () => {
      const errors = MobileFieldValidationUtils.validatePhone('');

      expect(errors).toHaveLength(0);
    });

    it('should validate phone with incorrect length', () => {
      const errors = MobileFieldValidationUtils.validatePhone('123');

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_PHONE_FORMAT');
    });

    it('should pass valid 10-digit phone', () => {
      const errors = MobileFieldValidationUtils.validatePhone('5551234567');

      expect(errors).toHaveLength(0);
    });

    it('should pass formatted phone number', () => {
      const errors = MobileFieldValidationUtils.validatePhone('(555) 123-4567');

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateWeddingDate', () => {
    it('should validate empty date as required', () => {
      const errors = MobileFieldValidationUtils.validateWeddingDate('');

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED_FIELD_EMPTY');
    });

    it('should validate date too early', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const errors = MobileFieldValidationUtils.validateWeddingDate(
        tomorrow.toISOString().split('T')[0],
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DATE_TOO_EARLY');
    });

    it('should validate date too late', () => {
      const farFuture = new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000);
      const errors = MobileFieldValidationUtils.validateWeddingDate(
        farFuture.toISOString().split('T')[0],
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('DATE_TOO_LATE');
      expect(errors[0].severity).toBe('warning');
    });

    it('should pass valid wedding date', () => {
      const validDate = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months from now
      const errors = MobileFieldValidationUtils.validateWeddingDate(
        validDate.toISOString().split('T')[0],
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateGuestCount', () => {
    it('should validate guest count too low', () => {
      const errors = MobileFieldValidationUtils.validateGuestCount(1);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GUEST_COUNT_TOO_LOW');
    });

    it('should validate guest count too high', () => {
      const errors = MobileFieldValidationUtils.validateGuestCount(600);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GUEST_COUNT_TOO_HIGH');
      expect(errors[0].severity).toBe('warning');
    });

    it('should pass valid guest count', () => {
      const errors = MobileFieldValidationUtils.validateGuestCount(150);

      expect(errors).toHaveLength(0);
    });
  });
});
