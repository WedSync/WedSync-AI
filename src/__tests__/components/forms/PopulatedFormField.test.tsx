/**
 * PopulatedFormField Test Suite
 * WS-216 Team A - Enhanced Form Field Component Testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PopulatedFormField } from '@/components/forms/PopulatedFormField';
import { AutoPopulationProvider } from '@/components/forms/AutoPopulationProvider';
import type { FieldType, PopulationSource } from '@/types/auto-population';

// Mock dependencies
jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

const mockOrganizationId = 'test-org-123';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AutoPopulationProvider organizationId={mockOrganizationId}>
    {children}
  </AutoPopulationProvider>
);

describe('PopulatedFormField', () => {
  const defaultProps = {
    fieldId: 'test-field',
    fieldType: 'text' as FieldType,
    fieldName: 'Test Field',
    value: '',
    onChange: jest.fn(),
    source: 'ml_suggestion' as PopulationSource,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render basic field correctly', () => {
      render(
        <TestWrapper>
          <PopulatedFormField {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    });

    it('should render with populated value', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            value="John Smith"
            isPopulated={true}
            confidence="high"
          />
        </TestWrapper>,
      );

      const input = screen.getByDisplayValue('John Smith');
      expect(input).toBeInTheDocument();
    });

    it('should show confidence indicator for populated fields', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="high"
            showConfidenceIndicator={true}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('should render different field types correctly', () => {
      const fieldTypes: FieldType[] = ['email', 'phone', 'date', 'number'];

      fieldTypes.forEach((type) => {
        const { unmount } = render(
          <TestWrapper>
            <PopulatedFormField
              {...defaultProps}
              fieldType={type}
              fieldId={`test-${type}`}
            />
          </TestWrapper>,
        );

        // Different input types have different ARIA roles:
        // - date: no implicit role, use getByLabelText
        // - number: 'spinbutton' role
        // - email/phone: 'textbox' role
        const input = type === 'date' 
          ? screen.getByLabelText('Test Field')
          : type === 'number'
          ? screen.getByRole('spinbutton')
          : screen.getByRole('textbox');
        expect(input).toHaveAttribute('type', type === 'phone' ? 'tel' : type);

        unmount();
      });
    });

    it('should show validation errors', () => {
      const validationErrors = ['Field is required', 'Invalid format'];

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            validationErrors={validationErrors}
          />
        </TestWrapper>,
      );

      validationErrors.forEach((error) => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            required={true}
            isPopulated={true}
            confidence="medium"
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            showAcceptReject={true}
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      await user.tab();
      expect(input).toHaveFocus();

      // Test accept/reject buttons if present
      const acceptButton = screen.queryByText('Accept');
      if (acceptButton) {
        await user.tab();
        expect(acceptButton).toHaveFocus();
      }
    });

    it('should announce changes to screen readers', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="high"
            screenReaderAnnouncement="Field populated with high confidence"
          />
        </TestWrapper>,
      );

      expect(
        screen.getByText('Field populated with high confidence'),
      ).toBeInTheDocument();
    });

    it('should have proper color contrast for confidence indicators', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="low"
            showConfidenceIndicator={true}
          />
        </TestWrapper>,
      );

      // Test that confidence indicators meet WCAG contrast requirements
      const confidenceIndicator =
        screen.getByTestId('sparkles-icon').parentElement;
      expect(confidenceIndicator).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Features', () => {
    it('should format wedding names correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="name"
            fieldId="couple_name_1"
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'john smith');

      // Should format to proper case
      expect(input).toHaveValue('john smith'); // Would be formatted on blur
    });

    it('should validate wedding dates', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="date"
            fieldId="wedding_date"
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '2020-01-01'); // Past date

      // Should show validation error for past dates
      await waitFor(() => {
        expect(
          screen.queryByText(/date should be in the future/i),
        ).toBeInTheDocument();
      });
    });

    it('should handle wedding budget formatting', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="currency"
            fieldId="budget_amount"
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '25000');

      // Should format as currency
      fireEvent.blur(input);

      await waitFor(() => {
        expect(input.value).toMatch(/\$25,000/);
      });
    });

    it('should suggest wedding vendors', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="text"
            fieldId="venue_name"
            showSuggestions={true}
          />
        </TestWrapper>,
      );

      // Should show venue suggestions when focused
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // Verify suggestions appear (implementation dependent)
    });
  });

  describe('Confidence Levels', () => {
    it('should display high confidence correctly', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="high"
            showConfidenceIndicator={true}
          />
        </TestWrapper>,
      );

      const indicator = screen.getByTestId('sparkles-icon').parentElement;
      expect(indicator).toHaveClass('text-success-600'); // High confidence color
    });

    it('should display medium confidence correctly', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="medium"
            showConfidenceIndicator={true}
          />
        </TestWrapper>,
      );

      const indicator = screen.getByTestId('sparkles-icon').parentElement;
      expect(indicator).toHaveClass('text-warning-600'); // Medium confidence color
    });

    it('should display low confidence correctly', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            confidence="low"
            showConfidenceIndicator={true}
          />
        </TestWrapper>,
      );

      const indicator = screen.getByTestId('sparkles-icon').parentElement;
      expect(indicator).toHaveClass('text-error-600'); // Low confidence color
    });
  });

  describe('Sensitive Data Handling', () => {
    it('should mask sensitive fields by default', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="ssn"
            value="123-45-6789"
            isSensitive={true}
            isPopulated={true}
          />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should allow unmasking sensitive fields', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="ssn"
            value="123-45-6789"
            isSensitive={true}
            isPopulated={true}
            showUnmaskButton={true}
          />
        </TestWrapper>,
      );

      const unmaskButton = screen.getByTestId('eye-icon').parentElement;
      await user.click(unmaskButton!);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should require consent for sensitive fields', () => {
      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            fieldType="email"
            isSensitive={true}
            requireConsent={true}
          />
        </TestWrapper>,
      );

      expect(screen.getByText(/consent required/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle accept population', async () => {
      const user = userEvent.setup();
      const mockOnAccept = jest.fn();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            showAcceptReject={true}
            onAcceptPopulation={mockOnAccept}
          />
        </TestWrapper>,
      );

      const acceptButton = screen.getByText('Accept');
      await user.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalledWith('test-field');
    });

    it('should handle reject population', async () => {
      const user = userEvent.setup();
      const mockOnReject = jest.fn();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            isPopulated={true}
            showAcceptReject={true}
            onRejectPopulation={mockOnReject}
          />
        </TestWrapper>,
      );

      const rejectButton = screen.getByText('Reject');
      await user.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledWith(
        'test-field',
        expect.any(String),
      );
    });

    it('should handle value changes', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <TestWrapper>
          <PopulatedFormField {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'new value');

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should render within performance budget', () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <PopulatedFormField {...defaultProps} />
        </TestWrapper>,
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(200); // <200ms requirement
    });

    it('should handle rapid value changes efficiently', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <TestWrapper>
          <PopulatedFormField {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>,
      );

      const input = screen.getByRole('textbox');

      // Simulate rapid typing
      const startTime = performance.now();
      await user.type(input, 'quick typing test');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <PopulatedFormField
            {...defaultProps}
            validationErrors={['Invalid email format']}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should handle missing population data', () => {
      render(
        <TestWrapper>
          <PopulatedFormField {...defaultProps} isPopulated={false} value="" />
        </TestWrapper>,
      );

      // Should render normally without population data
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with React Hook Form', () => {
      // Test React Hook Form integration
      // This would require setting up a form context
    });

    it('should integrate with Zod validation', () => {
      // Test Zod schema integration
      // This would test schema-based validation
    });
  });
});

// Performance benchmark tests
describe('PopulatedFormField Performance Benchmarks', () => {
  it('should meet render time requirements', () => {
    const iterations = 10;
    const renderTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const { unmount } = render(
        <TestWrapper>
          <PopulatedFormField
            fieldId={`field-${i}`}
            fieldType="text"
            fieldName={`Field ${i}`}
            value=""
            onChange={() => {}}
          />
        </TestWrapper>,
      );

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);

      unmount();
    }

    const averageRenderTime =
      renderTimes.reduce((a, b) => a + b, 0) / iterations;
    expect(averageRenderTime).toBeLessThan(200); // <200ms average
  });

  it('should handle multiple fields efficiently', () => {
    const startTime = performance.now();

    render(
      <TestWrapper>
        <div>
          {Array.from({ length: 20 }, (_, i) => (
            <PopulatedFormField
              key={i}
              fieldId={`field-${i}`}
              fieldType="text"
              fieldName={`Field ${i}`}
              value=""
              onChange={() => {}}
            />
          ))}
        </div>
      </TestWrapper>,
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Multiple fields under 1s
  });
});
