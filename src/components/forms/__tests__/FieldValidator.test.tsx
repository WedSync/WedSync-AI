import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  FieldValidator,
  useFieldValidator,
  ValidationUtils,
  ValidationRule,
  ValidationResult,
  FieldValidationResult,
} from '../FieldValidator';
import { FormField } from '@/types/forms';

// Mock console methods
const originalConsole = console;
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Test data
const mockFields: FormField[] = [
  {
    id: 'name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your name',
    required: true,
    validation: { required: true, minLength: 2, maxLength: 50 },
    order: 0,
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    placeholder: 'your@email.com',
    required: true,
    validation: {
      required: true,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      customMessage: 'Please enter a valid email address',
    },
    order: 1,
  },
  {
    id: 'age',
    type: 'number',
    label: 'Age',
    validation: { min: 18, max: 120 },
    order: 2,
  },
  {
    id: 'phone',
    type: 'tel',
    label: 'Phone Number',
    validation: { required: false },
    order: 3,
  },
  {
    id: 'comments',
    type: 'textarea',
    label: 'Comments',
    validation: { maxLength: 500 },
    order: 4,
  },
];

describe('FieldValidator', () => {
  const defaultProps = {
    fields: mockFields,
    formData: {},
    validationMode: 'onBlur' as const,
    enableRealTime: false,
    enableAsyncValidation: false,
    enableCrossFieldValidation: false,
    showValidationSummary: true,
    enableFieldSuggestions: true,
    onValidation: jest.fn(),
    onFieldValidation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders validation summary when enabled', () => {
      render(<FieldValidator {...defaultProps} showValidationSummary={true} />);

      expect(screen.getByText('Validation Summary')).toBeInTheDocument();
      expect(screen.getByText('Form Score')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });

    it('does not render validation summary when disabled', () => {
      render(
        <FieldValidator {...defaultProps} showValidationSummary={false} />,
      );

      expect(screen.queryByText('Validation Summary')).not.toBeInTheDocument();
    });

    it('shows validation statistics', () => {
      render(<FieldValidator {...defaultProps} showValidationSummary={true} />);

      expect(screen.getByText(/Total Validations:/)).toBeInTheDocument();
      expect(screen.getByText(/Error Rate:/)).toBeInTheDocument();
    });
  });

  describe('Validation Logic', () => {
    it('validates required fields', async () => {
      const onValidation = jest.fn();
      const { rerender } = render(
        <FieldValidator
          {...defaultProps}
          formData={{ name: '', email: 'test@example.com' }}
          onValidation={onValidation}
        />,
      );

      // Trigger validation by changing validationMode
      rerender(
        <FieldValidator
          {...defaultProps}
          formData={{ name: '', email: 'test@example.com' }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      // Fast forward timers for debounced validation
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(result.errors.some((e) => e.fieldId === 'name')).toBe(true);
        expect(result.isValid).toBe(false);
      });
    });

    it('validates email format', async () => {
      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ email: 'invalid-email' }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(
          result.errors.some(
            (e) => e.fieldId === 'email' && e.ruleType === 'email',
          ),
        ).toBe(true);
      });
    });

    it('validates number ranges', async () => {
      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ age: 15 }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(
          result.errors.some(
            (e) => e.fieldId === 'age' && e.ruleType === 'min',
          ),
        ).toBe(true);
      });
    });

    it('validates text length constraints', async () => {
      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ name: 'A', comments: 'x'.repeat(600) }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];

        // Should have minLength error for name
        expect(
          result.errors.some(
            (e) => e.fieldId === 'name' && e.ruleType === 'minLength',
          ),
        ).toBe(true);

        // Should have maxLength error for comments
        expect(
          result.errors.some(
            (e) => e.fieldId === 'comments' && e.ruleType === 'maxLength',
          ),
        ).toBe(true);
      });
    });

    it('provides validation suggestions when enabled', async () => {
      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ email: 'testexample.com' }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
          enableFieldSuggestions={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        const emailError = result.errors.find((e) => e.fieldId === 'email');
        expect(emailError?.suggestions).toBeDefined();
        expect(emailError?.suggestions?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Custom Validation Rules', () => {
    it('applies custom validation rules', async () => {
      const customRules: ValidationRule[] = [
        {
          id: 'custom-name-rule',
          type: 'custom',
          fieldRef: 'name',
          customValidator: (value: string) => value !== 'admin',
          message: 'Name cannot be "admin"',
          priority: 50,
        },
      ];

      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ name: 'admin' }}
          customRules={customRules}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(
          result.errors.some(
            (e) => e.fieldId === 'name' && e.ruleType === 'custom',
          ),
        ).toBe(true);
      });
    });

    it('handles async validation when enabled', async () => {
      const asyncRule: ValidationRule = {
        id: 'async-email-check',
        type: 'async',
        fieldRef: 'email',
        asyncValidator: async (value: string) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          return value !== 'taken@example.com';
        },
        message: 'Email already taken',
      };

      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ email: 'taken@example.com' }}
          customRules={[asyncRule]}
          enableAsyncValidation={true}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Wait for async validation
      await waitFor(
        () => {
          expect(onValidation).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      const result: ValidationResult = onValidation.mock.calls[0][0];
      expect(
        result.errors.some(
          (e) => e.fieldId === 'email' && e.ruleType === 'async',
        ),
      ).toBe(true);
    });
  });

  describe('Cross-field Validation', () => {
    it('performs cross-field validation when enabled', async () => {
      const crossFieldRule: ValidationRule = {
        id: 'password-confirm',
        type: 'crossField',
        fieldRef: 'password',
        customValidator: (value: string, formData: Record<string, any>) => {
          return value === formData?.passwordConfirm;
        },
        message: 'Passwords must match',
      };

      const fieldsWithPasswords = [
        ...mockFields,
        {
          id: 'password',
          type: 'text' as const,
          label: 'Password',
          validation: { required: true },
          order: 5,
        },
        {
          id: 'passwordConfirm',
          type: 'text' as const,
          label: 'Confirm Password',
          validation: { required: true },
          order: 6,
        },
      ];

      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          fields={fieldsWithPasswords}
          formData={{ password: 'secret123', passwordConfirm: 'different' }}
          customRules={[crossFieldRule]}
          enableCrossFieldValidation={true}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(
          result.errors.some(
            (e) => e.fieldId === 'password' && e.ruleType === 'crossField',
          ),
        ).toBe(true);
      });
    });
  });

  describe('Form Score Calculation', () => {
    it('calculates form score based on validation results', async () => {
      const onValidation = jest.fn();

      // Test with valid data
      render(
        <FieldValidator
          {...defaultProps}
          formData={{
            name: 'John Doe',
            email: 'john@example.com',
            age: 25,
            phone: '+1234567890',
            comments: 'Valid comment',
          }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(result.formScore).toBeGreaterThan(80);
        expect(result.isValid).toBe(true);
      });
    });

    it('reduces form score for validation errors', async () => {
      const onValidation = jest.fn();

      // Test with invalid data
      render(
        <FieldValidator
          {...defaultProps}
          formData={{
            name: '', // Required but empty
            email: 'invalid-email', // Invalid format
            age: 15, // Below minimum
          }}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        expect(result.formScore).toBeLessThan(50);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('tracks validation execution time', async () => {
      const onFieldValidation = jest.fn();
      const { rerender } = render(
        <FieldValidator
          {...defaultProps}
          formData={{ name: 'John' }}
          onFieldValidation={onFieldValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onFieldValidation).toHaveBeenCalled();
        const result: FieldValidationResult =
          onFieldValidation.mock.calls[0][1];
        expect(result.executionTime).toBeGreaterThan(0);
        expect(typeof result.executionTime).toBe('number');
      });
    });

    it('updates validation statistics', () => {
      render(<FieldValidator {...defaultProps} showValidationSummary={true} />);

      // Should show initial stats
      expect(screen.getByText(/Total Validations:/)).toBeInTheDocument();
      expect(screen.getByText(/Error Rate:/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles validation rule execution errors gracefully', async () => {
      const faultyRule: ValidationRule = {
        id: 'faulty-rule',
        type: 'custom',
        fieldRef: 'name',
        customValidator: () => {
          throw new Error('Validation error');
        },
        message: 'Custom validation failed',
      };

      const onValidation = jest.fn();
      render(
        <FieldValidator
          {...defaultProps}
          formData={{ name: 'test' }}
          customRules={[faultyRule]}
          onValidation={onValidation}
          validationMode="live"
          enableRealTime={true}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onValidation).toHaveBeenCalled();
        const result: ValidationResult = onValidation.mock.calls[0][0];
        // Should still have validation result, with error handled
        expect(
          result.errors.some((e) => e.message.includes('execution failed')),
        ).toBe(true);
      });
    });
  });
});

describe('useFieldValidator Hook', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useFieldValidator(mockFields));

    expect(result.current.formData).toEqual({});
    expect(result.current.validationResult.isValid).toBe(true);
    expect(result.current.validationResult.errors).toHaveLength(0);
    expect(result.current.validationResult.formScore).toBe(100);
  });

  it('updates field values', () => {
    const { result } = renderHook(() => useFieldValidator(mockFields));

    act(() => {
      result.current.updateFieldValue('name', 'John Doe');
    });

    expect(result.current.formData.name).toBe('John Doe');
  });

  it('validates form data', async () => {
    const { result } = renderHook(() => useFieldValidator(mockFields));

    act(() => {
      result.current.updateFieldValue('name', '');
      result.current.updateFieldValue('email', 'invalid');
    });

    let validationResult: ValidationResult;
    await act(async () => {
      validationResult = await result.current.validateForm();
    });

    expect(validationResult!.isValid).toBe(false);
    expect(validationResult!.errors.length).toBeGreaterThan(0);
  });

  it('validates individual fields', async () => {
    const { result } = renderHook(() => useFieldValidator(mockFields));

    let fieldResult: FieldValidationResult;
    await act(async () => {
      fieldResult = await result.current.validateField(
        'email',
        'invalid-email',
      );
    });

    expect(fieldResult!.isValid).toBe(false);
    expect(fieldResult!.errors.length).toBeGreaterThan(0);
    expect(fieldResult!.fieldId).toBe('email');
  });
});

describe('ValidationUtils', () => {
  describe('createRule', () => {
    it('creates validation rule with correct properties', () => {
      const rule = ValidationUtils.createRule('email', {
        message: 'Custom email message',
        priority: 10,
      });

      expect(rule.type).toBe('email');
      expect(rule.message).toBe('Custom email message');
      expect(rule.priority).toBe(10);
      expect(rule.id).toBeDefined();
    });
  });

  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(ValidationUtils.validateEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.validateEmail('user.name+tag@domain.co.uk')).toBe(
        true,
      );
    });

    it('rejects invalid email addresses', () => {
      expect(ValidationUtils.validateEmail('invalid')).toBe(false);
      expect(ValidationUtils.validateEmail('test@')).toBe(false);
      expect(ValidationUtils.validateEmail('@example.com')).toBe(false);
      expect(ValidationUtils.validateEmail('test.example.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates correct phone numbers', () => {
      expect(ValidationUtils.validatePhone('+1234567890')).toBe(true);
      expect(ValidationUtils.validatePhone('1234567890')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(ValidationUtils.validatePhone('abc')).toBe(false);
      expect(ValidationUtils.validatePhone('123')).toBe(false);
      expect(ValidationUtils.validatePhone('+abc123')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('validates correct URLs', () => {
      expect(ValidationUtils.validateUrl('https://example.com')).toBe(true);
      expect(
        ValidationUtils.validateUrl('http://subdomain.example.com/path'),
      ).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(ValidationUtils.validateUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.validateUrl('example.com')).toBe(false);
      expect(ValidationUtils.validateUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('sanitizes HTML input', () => {
      const html = '<script>alert("xss")</script>';
      const sanitized = ValidationUtils.sanitizeInput(html, 'html');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('sanitizes SQL input', () => {
      const sql = "'; DROP TABLE users; --";
      const sanitized = ValidationUtils.sanitizeInput(sql, 'sql');
      expect(sanitized).toContain("''; DROP TABLE users; --");
    });

    it('trims text input', () => {
      const text = '  hello world  ';
      const sanitized = ValidationUtils.sanitizeInput(text, 'text');
      expect(sanitized).toBe('hello world');
    });

    it('handles empty/null input', () => {
      expect(ValidationUtils.sanitizeInput('', 'text')).toBe('');
      expect(ValidationUtils.sanitizeInput(null as any, 'text')).toBe(null);
      expect(ValidationUtils.sanitizeInput(undefined as any, 'text')).toBe(
        undefined,
      );
    });
  });
});

describe('Integration Tests', () => {
  it('integrates all validation features together', async () => {
    const customRule: ValidationRule = {
      id: 'unique-email',
      type: 'async',
      fieldRef: 'email',
      asyncValidator: async (value: string) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return value !== 'taken@example.com';
      },
      message: 'Email already exists',
    };

    const onValidation = jest.fn();
    const onFieldValidation = jest.fn();

    render(
      <FieldValidator
        fields={mockFields}
        formData={{
          name: 'Jo', // Too short
          email: 'taken@example.com', // Will fail async validation
          age: 200, // Too high
          phone: '+1234567890', // Valid
        }}
        customRules={[customRule]}
        validationMode="live"
        enableRealTime={true}
        enableAsyncValidation={true}
        enableCrossFieldValidation={true}
        showValidationSummary={true}
        enableFieldSuggestions={true}
        onValidation={onValidation}
        onFieldValidation={onFieldValidation}
        debounceMs={100}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(
      () => {
        expect(onValidation).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    const result: ValidationResult = onValidation.mock.calls[0][0];

    // Should have multiple validation errors
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
    expect(result.formScore).toBeLessThan(70);

    // Should have called field validation for each field
    expect(onFieldValidation).toHaveBeenCalledTimes(mockFields.length);

    // Should show validation summary
    expect(screen.getByText('Validation Summary')).toBeInTheDocument();
    expect(screen.getByText(result.formScore.toString())).toBeInTheDocument();
  });
});
