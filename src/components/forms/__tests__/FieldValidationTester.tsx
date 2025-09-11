'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField, FormFieldValidation } from '@/types/forms';

interface ValidationTestCase {
  name: string;
  field: FormField;
  input: string | number;
  expectedValid: boolean;
  expectedMessage?: string;
}

interface FieldValidationTesterProps {
  onTestComplete?: (results: ValidationTestResult[]) => void;
  autoRun?: boolean;
}

interface ValidationTestResult {
  testName: string;
  fieldType: string;
  passed: boolean;
  message?: string;
  duration: number;
}

export function FieldValidationTester({
  onTestComplete,
  autoRun = false,
}: FieldValidationTesterProps) {
  const [testResults, setTestResults] = React.useState<ValidationTestResult[]>(
    [],
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentTest, setCurrentTest] = React.useState<string>('');

  // Test cases for different field types and validation rules
  const testCases: ValidationTestCase[] = [
    // Text Field Validation Tests
    {
      name: 'Text Field - Required validation',
      field: {
        id: 'text-required',
        type: 'text',
        label: 'Wedding Venue Name',
        required: true,
        validation: {
          required: true,
          customMessage: 'Venue name is required for your wedding',
        },
      },
      input: '',
      expectedValid: false,
      expectedMessage: 'Venue name is required for your wedding',
    },
    {
      name: 'Text Field - Minimum length validation',
      field: {
        id: 'text-minlength',
        type: 'text',
        label: 'Vendor Business Name',
        validation: {
          minLength: 3,
          customMessage: 'Business name must be at least 3 characters',
        },
      },
      input: 'AB',
      expectedValid: false,
      expectedMessage: 'Business name must be at least 3 characters',
    },
    {
      name: 'Text Field - Maximum length validation',
      field: {
        id: 'text-maxlength',
        type: 'text',
        label: 'Wedding Tagline',
        validation: {
          maxLength: 50,
          customMessage: 'Wedding tagline cannot exceed 50 characters',
        },
      },
      input:
        'This is a very long wedding tagline that exceeds the maximum allowed length for this field',
      expectedValid: false,
      expectedMessage: 'Wedding tagline cannot exceed 50 characters',
    },

    // Email Field Validation Tests
    {
      name: 'Email Field - Valid email format',
      field: {
        id: 'email-valid',
        type: 'email',
        label: 'Contact Email',
        validation: {
          required: true,
          customMessage: 'Please enter a valid email address',
        },
      },
      input: 'photographer@weddingvendor.com',
      expectedValid: true,
    },
    {
      name: 'Email Field - Invalid email format',
      field: {
        id: 'email-invalid',
        type: 'email',
        label: 'Contact Email',
        validation: {
          required: true,
          customMessage: 'Please enter a valid email address',
        },
      },
      input: 'invalid-email-format',
      expectedValid: false,
      expectedMessage: 'Please enter a valid email address',
    },

    // Phone Field Validation Tests
    {
      name: 'Phone Field - Valid phone number',
      field: {
        id: 'tel-valid',
        type: 'tel',
        label: 'Wedding Day Contact',
        validation: {
          required: true,
          pattern: '^\\+?[1-9]\\d{1,14}$',
          customMessage:
            'Please enter a valid phone number for wedding day contact',
        },
      },
      input: '+447700900123',
      expectedValid: true,
    },
    {
      name: 'Phone Field - Invalid phone format',
      field: {
        id: 'tel-invalid',
        type: 'tel',
        label: 'Wedding Day Contact',
        validation: {
          required: true,
          pattern: '^\\+?[1-9]\\d{1,14}$',
          customMessage:
            'Please enter a valid phone number for wedding day contact',
        },
      },
      input: 'not-a-phone-number',
      expectedValid: false,
      expectedMessage:
        'Please enter a valid phone number for wedding day contact',
    },

    // Number Field Validation Tests
    {
      name: 'Number Field - Minimum value validation',
      field: {
        id: 'number-min',
        type: 'number',
        label: 'Guest Count',
        validation: {
          min: 1,
          customMessage: 'Guest count must be at least 1',
        },
      },
      input: 0,
      expectedValid: false,
      expectedMessage: 'Guest count must be at least 1',
    },
    {
      name: 'Number Field - Maximum value validation',
      field: {
        id: 'number-max',
        type: 'number',
        label: 'Photography Package Hours',
        validation: {
          max: 12,
          customMessage: 'Photography packages cannot exceed 12 hours',
        },
      },
      input: 15,
      expectedValid: false,
      expectedMessage: 'Photography packages cannot exceed 12 hours',
    },

    // Date Field Validation Tests
    {
      name: 'Date Field - Future date validation',
      field: {
        id: 'date-future',
        type: 'date',
        label: 'Wedding Date',
        validation: {
          required: true,
          customMessage: 'Please select your wedding date',
        },
      },
      input: '2024-01-01',
      expectedValid: false,
      expectedMessage: 'Wedding date must be in the future',
    },

    // Textarea Field Validation Tests
    {
      name: 'Textarea Field - Length validation',
      field: {
        id: 'textarea-length',
        type: 'textarea',
        label: 'Special Requirements',
        validation: {
          maxLength: 500,
          customMessage:
            'Special requirements description cannot exceed 500 characters',
        },
      },
      input: 'A'.repeat(501),
      expectedValid: false,
      expectedMessage:
        'Special requirements description cannot exceed 500 characters',
    },

    // File Upload Validation Tests
    {
      name: 'File Field - Required file validation',
      field: {
        id: 'file-required',
        type: 'file',
        label: 'Wedding Contract Upload',
        validation: {
          required: true,
          customMessage: 'Please upload your wedding contract',
        },
      },
      input: '',
      expectedValid: false,
      expectedMessage: 'Please upload your wedding contract',
    },
  ];

  const runValidationTest = async (
    testCase: ValidationTestCase,
  ): Promise<ValidationTestResult> => {
    const startTime = performance.now();

    try {
      // Mock field validation logic
      const validationResult = validateField(testCase.field, testCase.input);
      const passed = validationResult.isValid === testCase.expectedValid;

      if (!passed) {
        console.warn(`Validation test failed: ${testCase.name}`, {
          expected: testCase.expectedValid,
          actual: validationResult.isValid,
          expectedMessage: testCase.expectedMessage,
          actualMessage: validationResult.message,
        });
      }

      return {
        testName: testCase.name,
        fieldType: testCase.field.type,
        passed,
        message: validationResult.message,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        testName: testCase.name,
        fieldType: testCase.field.type,
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: performance.now() - startTime,
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const results: ValidationTestResult[] = [];

    for (const testCase of testCases) {
      setCurrentTest(testCase.name);
      const result = await runValidationTest(testCase);
      results.push(result);
      setTestResults([...results]);

      // Small delay to show progress
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setIsRunning(false);
    setCurrentTest('');

    if (onTestComplete) {
      onTestComplete(results);
    }
  };

  React.useEffect(() => {
    if (autoRun) {
      runAllTests();
    }
  }, [autoRun]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Field Validation Tester
        </h2>
        <p className="text-gray-600">
          Comprehensive validation testing for wedding form fields across all
          supported types
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium"
        >
          {isRunning ? 'Running Tests...' : 'Run Validation Tests'}
        </button>

        {isRunning && currentTest && (
          <div className="mt-2 text-sm text-gray-600">
            Currently running: {currentTest}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Test Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Tests:</span>{' '}
              {testResults.length}
            </div>
            <div>
              <span className="font-medium text-green-600">Passed:</span>{' '}
              {testResults.filter((r) => r.passed).length}
            </div>
            <div>
              <span className="font-medium text-red-600">Failed:</span>{' '}
              {testResults.filter((r) => !r.passed).length}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border-l-4 ${
                result.passed
                  ? 'border-l-green-500 bg-green-50'
                  : 'border-l-red-500 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {result.testName}
                  </div>
                  <div className="text-sm text-gray-600">
                    Field Type: {result.fieldType} • Duration:{' '}
                    {result.duration.toFixed(2)}ms
                  </div>
                  {result.message && (
                    <div className="text-sm text-gray-700 mt-1">
                      {result.message}
                    </div>
                  )}
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    result.passed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.passed ? 'PASS' : 'FAIL'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock validation function (in real implementation, this would be the actual validation logic)
function validateField(
  field: FormField,
  value: string | number,
): { isValid: boolean; message?: string } {
  const validation = field.validation;

  if (!validation) {
    return { isValid: true };
  }

  // Required validation
  if (validation.required && (!value || value.toString().trim() === '')) {
    return {
      isValid: false,
      message: validation.customMessage || `${field.label} is required`,
    };
  }

  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return { isValid: true };
  }

  const stringValue = value.toString();

  // Length validations
  if (validation.minLength && stringValue.length < validation.minLength) {
    return {
      isValid: false,
      message:
        validation.customMessage ||
        `${field.label} must be at least ${validation.minLength} characters`,
    };
  }

  if (validation.maxLength && stringValue.length > validation.maxLength) {
    return {
      isValid: false,
      message:
        validation.customMessage ||
        `${field.label} cannot exceed ${validation.maxLength} characters`,
    };
  }

  // Number validations
  if (field.type === 'number') {
    const numValue =
      typeof value === 'number' ? value : parseFloat(stringValue);

    if (validation.min !== undefined && numValue < validation.min) {
      return {
        isValid: false,
        message:
          validation.customMessage ||
          `${field.label} must be at least ${validation.min}`,
      };
    }

    if (validation.max !== undefined && numValue > validation.max) {
      return {
        isValid: false,
        message:
          validation.customMessage ||
          `${field.label} cannot exceed ${validation.max}`,
      };
    }
  }

  // Email validation
  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return {
        isValid: false,
        message:
          validation.customMessage || 'Please enter a valid email address',
      };
    }
  }

  // Pattern validation
  if (validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(stringValue)) {
      return {
        isValid: false,
        message: validation.customMessage || `${field.label} format is invalid`,
      };
    }
  }

  // Date validation (future date for wedding dates)
  if (field.type === 'date' && field.label.toLowerCase().includes('wedding')) {
    const inputDate = new Date(stringValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate <= today) {
      return {
        isValid: false,
        message: 'Wedding date must be in the future',
      };
    }
  }

  return { isValid: true };
}

export default FieldValidationTester;
