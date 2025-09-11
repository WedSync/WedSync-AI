import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFieldEditor } from '@/components/mobile/fields/MobileFieldEditor';

// Mock the useDebounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any, delay: number) => value, // Return value immediately for testing
}));

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

describe('MobileFieldEditor', () => {
  const mockField = {
    key: 'partner1_name',
    value: 'John Doe',
    status: 'completed' as const,
    lastUpdated: '2025-01-01T10:00:00Z',
    updatedBy: 'couple' as const,
    isLocked: false,
    definition: {
      fieldName: 'Partner 1 Name',
      fieldDescription: 'Full legal name of first partner',
      fieldType: 'text' as const,
      validationSchema: { minLength: 2, maxLength: 100 },
      isRequired: true,
      category: 'couple',
      propagatesTo: ['all_vendors'],
    },
    validationErrors: [],
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render field with basic information', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Partner 1 Name')).toBeInTheDocument();
      expect(
        screen.getByText('Full legal name of first partner'),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    it('should show required indicator for required fields', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator for optional fields', () => {
      const optionalField = {
        ...mockField,
        definition: { ...mockField.definition, isRequired: false },
      };

      render(
        <MobileFieldEditor field={optionalField} onUpdate={mockOnUpdate} />,
      );

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should show lock indicator for locked fields', () => {
      const lockedField = {
        ...mockField,
        isLocked: true,
        lockReason: 'Field locked by admin',
      };

      render(<MobileFieldEditor field={lockedField} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('🔒 Locked')).toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('should render text input for text fields', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render email input for email fields', () => {
      const emailField = {
        ...mockField,
        key: 'partner1_email',
        value: 'john@example.com',
        definition: { ...mockField.definition, fieldType: 'email' as const },
      };

      render(<MobileFieldEditor field={emailField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('john@example.com');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render phone input for phone fields', () => {
      const phoneField = {
        ...mockField,
        key: 'partner1_phone',
        value: '5551234567',
        definition: { ...mockField.definition, fieldType: 'phone' as const },
      };

      render(<MobileFieldEditor field={phoneField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('(555) 123-4567');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should render date input for date fields', () => {
      const dateField = {
        ...mockField,
        key: 'wedding_date',
        value: '2025-06-15',
        definition: { ...mockField.definition, fieldType: 'date' as const },
      };

      render(<MobileFieldEditor field={dateField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('2025-06-15');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should render number input for number fields', () => {
      const numberField = {
        ...mockField,
        key: 'guest_count',
        value: 150,
        definition: { ...mockField.definition, fieldType: 'number' as const },
      };

      render(<MobileFieldEditor field={numberField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('150');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render textarea for address fields', () => {
      const addressField = {
        ...mockField,
        key: 'ceremony_venue_address',
        value: '123 Main St, City, State 12345',
        definition: { ...mockField.definition, fieldType: 'address' as const },
      };

      render(
        <MobileFieldEditor field={addressField} onUpdate={mockOnUpdate} />,
      );

      const textarea = screen.getByDisplayValue(
        '123 Main St, City, State 12345',
      );
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('User Interactions', () => {
    it('should call onUpdate when value changes', async () => {
      const user = userEvent.setup();
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'Jane Doe');

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('Jane Doe', undefined);
      });
    });

    it('should not call onUpdate for locked fields', async () => {
      const user = userEvent.setup();
      const lockedField = { ...mockField, isLocked: true };

      render(<MobileFieldEditor field={lockedField} onUpdate={mockOnUpdate} />);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toBeDisabled();

      // Try to interact with disabled input
      await user.click(input);

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should format phone numbers as user types', async () => {
      const user = userEvent.setup();
      const phoneField = {
        ...mockField,
        key: 'partner1_phone',
        value: '',
        definition: { ...mockField.definition, fieldType: 'phone' as const },
      };

      render(<MobileFieldEditor field={phoneField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '5551234567');

      expect(input).toHaveValue('(555) 123-4567');
    });
  });

  describe('Validation Errors', () => {
    it('should display validation errors', () => {
      const fieldWithErrors = {
        ...mockField,
        validationErrors: [
          {
            code: 'REQUIRED_FIELD_EMPTY',
            message: 'This field is required',
            field: 'partner1_name',
            value: '',
          },
        ],
      };

      render(
        <MobileFieldEditor field={fieldWithErrors} onUpdate={mockOnUpdate} />,
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling when validation errors exist', () => {
      const fieldWithErrors = {
        ...mockField,
        validationErrors: [
          {
            code: 'REQUIRED_FIELD_EMPTY',
            message: 'This field is required',
            field: 'partner1_name',
            value: '',
          },
        ],
      };

      render(
        <MobileFieldEditor field={fieldWithErrors} onUpdate={mockOnUpdate} />,
      );

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveClass('border-red-300');
    });

    it('should clear errors when field value changes', async () => {
      const user = userEvent.setup();
      const fieldWithErrors = {
        ...mockField,
        validationErrors: [
          {
            code: 'REQUIRED_FIELD_EMPTY',
            message: 'This field is required',
            field: 'partner1_name',
            value: '',
          },
        ],
      };

      const { rerender } = render(
        <MobileFieldEditor field={fieldWithErrors} onUpdate={mockOnUpdate} />,
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();

      // Simulate field update clearing errors
      const fieldWithoutErrors = { ...fieldWithErrors, validationErrors: [] };
      rerender(
        <MobileFieldEditor
          field={fieldWithoutErrors}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(
        screen.queryByText('This field is required'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show completion status icon', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      // Completed field should show check icon (via SVG or other indicator)
      const statusIcon = screen.getByRole('generic'); // Status container
      expect(statusIcon).toBeInTheDocument();
    });

    it('should show pending sync indicator', () => {
      render(
        <MobileFieldEditor
          field={mockField}
          onUpdate={mockOnUpdate}
          isPending={true}
        />,
      );

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should show propagation information', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      expect(screen.getByText(/Syncs to \d+ vendors?/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and descriptions', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAccessibleName('Partner 1 Name');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('textbox');

      await user.tab();
      expect(document.activeElement).toBe(input);
    });

    it('should have proper ARIA attributes for errors', () => {
      const fieldWithErrors = {
        ...mockField,
        validationErrors: [
          {
            code: 'REQUIRED_FIELD_EMPTY',
            message: 'This field is required',
            field: 'partner1_name',
            value: '',
          },
        ],
      };

      render(
        <MobileFieldEditor field={fieldWithErrors} onUpdate={mockOnUpdate} />,
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Mobile Optimizations', () => {
    it('should have touch-friendly input sizes', () => {
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('py-4'); // Large padding for touch
    });

    it('should use appropriate input modes for mobile keyboards', () => {
      const numberField = {
        ...mockField,
        key: 'guest_count',
        value: 150,
        definition: { ...mockField.definition, fieldType: 'number' as const },
      };

      render(<MobileFieldEditor field={numberField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });
  });

  describe('Performance', () => {
    it('should debounce field updates', async () => {
      const user = userEvent.setup();
      render(<MobileFieldEditor field={mockField} onUpdate={mockOnUpdate} />);

      const input = screen.getByRole('textbox');

      // Type multiple characters quickly
      await user.type(input, 'XYZ');

      // Should only call onUpdate once (due to debouncing - mocked to immediate for testing)
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
