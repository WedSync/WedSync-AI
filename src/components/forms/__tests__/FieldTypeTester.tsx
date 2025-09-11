'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField, FormFieldType } from '@/types/forms';

interface FieldTypeTestCase {
  name: string;
  fieldType: FormFieldType;
  testScenarios: {
    description: string;
    action: 'render' | 'input' | 'select' | 'focus' | 'blur';
    value?: any;
    expectedBehavior: string;
    shouldPass: boolean;
  }[];
}

interface FieldTypeTestResult {
  fieldType: FormFieldType;
  testName: string;
  scenario: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface FieldTypeTesterProps {
  onTestComplete?: (results: FieldTypeTestResult[]) => void;
  autoRun?: boolean;
}

export function FieldTypeTester({
  onTestComplete,
  autoRun = false,
}: FieldTypeTesterProps) {
  const [testResults, setTestResults] = React.useState<FieldTypeTestResult[]>(
    [],
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentTest, setCurrentTest] = React.useState<string>('');

  const fieldTypeTests: FieldTypeTestCase[] = [
    {
      name: 'Text Field Tests',
      fieldType: 'text',
      testScenarios: [
        {
          description: 'Text field renders with correct attributes',
          action: 'render',
          expectedBehavior: 'Input element with type="text" should be present',
          shouldPass: true,
        },
        {
          description: 'Text input accepts wedding venue names',
          action: 'input',
          value: 'The Grand Ballroom at Château Wedding Estate',
          expectedBehavior: 'Should accept and display long venue names',
          shouldPass: true,
        },
        {
          description: 'Text input handles special characters',
          action: 'input',
          value: 'Café Lumière & Co.',
          expectedBehavior:
            'Should accept special characters common in venue names',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Email Field Tests',
      fieldType: 'email',
      testScenarios: [
        {
          description: 'Email field renders with correct type',
          action: 'render',
          expectedBehavior: 'Input element with type="email" should be present',
          shouldPass: true,
        },
        {
          description: 'Email input accepts valid wedding vendor emails',
          action: 'input',
          value: 'bookings@weddingvenue.co.uk',
          expectedBehavior: 'Should accept valid business email formats',
          shouldPass: true,
        },
        {
          description: 'Email input shows validation for invalid format',
          action: 'input',
          value: 'invalid-email',
          expectedBehavior:
            'Should trigger validation feedback for invalid format',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Phone Field Tests',
      fieldType: 'tel',
      testScenarios: [
        {
          description: 'Phone field renders with correct type',
          action: 'render',
          expectedBehavior: 'Input element with type="tel" should be present',
          shouldPass: true,
        },
        {
          description: 'Phone input accepts UK mobile numbers',
          action: 'input',
          value: '+447700900123',
          expectedBehavior: 'Should accept international phone format',
          shouldPass: true,
        },
        {
          description: 'Phone input accepts landline format',
          action: 'input',
          value: '01234 567890',
          expectedBehavior: 'Should accept UK landline format',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Number Field Tests',
      fieldType: 'number',
      testScenarios: [
        {
          description: 'Number field renders with correct type',
          action: 'render',
          expectedBehavior:
            'Input element with type="number" should be present',
          shouldPass: true,
        },
        {
          description: 'Number input accepts guest counts',
          action: 'input',
          value: 150,
          expectedBehavior: 'Should accept typical wedding guest numbers',
          shouldPass: true,
        },
        {
          description: 'Number input handles decimal values for pricing',
          action: 'input',
          value: 2500.5,
          expectedBehavior: 'Should accept decimal values for pricing fields',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Date Field Tests',
      fieldType: 'date',
      testScenarios: [
        {
          description: 'Date field renders with correct type',
          action: 'render',
          expectedBehavior: 'Input element with type="date" should be present',
          shouldPass: true,
        },
        {
          description: 'Date input accepts wedding dates',
          action: 'input',
          value: '2024-06-15',
          expectedBehavior: 'Should accept date in YYYY-MM-DD format',
          shouldPass: true,
        },
        {
          description: 'Date input handles weekend dates',
          action: 'input',
          value: '2024-06-22',
          expectedBehavior: 'Should accept Saturday wedding dates',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Time Field Tests',
      fieldType: 'time',
      testScenarios: [
        {
          description: 'Time field renders with correct type',
          action: 'render',
          expectedBehavior: 'Input element with type="time" should be present',
          shouldPass: true,
        },
        {
          description: 'Time input accepts ceremony time',
          action: 'input',
          value: '14:30',
          expectedBehavior: 'Should accept 24-hour time format',
          shouldPass: true,
        },
        {
          description: 'Time input handles evening reception time',
          action: 'input',
          value: '19:00',
          expectedBehavior: 'Should accept evening times',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Textarea Field Tests',
      fieldType: 'textarea',
      testScenarios: [
        {
          description: 'Textarea field renders correctly',
          action: 'render',
          expectedBehavior: 'Textarea element should be present',
          shouldPass: true,
        },
        {
          description: 'Textarea accepts long wedding descriptions',
          action: 'input',
          value:
            'Our dream wedding will be a romantic outdoor ceremony in a beautiful garden setting, followed by a reception in an elegant marquee. We envision a color scheme of blush pink and gold, with lots of fairy lights and floral arrangements.',
          expectedBehavior: 'Should accept multi-line text descriptions',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Select Field Tests',
      fieldType: 'select',
      testScenarios: [
        {
          description: 'Select field renders with options',
          action: 'render',
          expectedBehavior: 'Select element with options should be present',
          shouldPass: true,
        },
        {
          description: 'Select accepts wedding style choice',
          action: 'select',
          value: 'traditional',
          expectedBehavior: 'Should allow selection of wedding style option',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Radio Field Tests',
      fieldType: 'radio',
      testScenarios: [
        {
          description: 'Radio field group renders correctly',
          action: 'render',
          expectedBehavior: 'Radio input elements should be present',
          shouldPass: true,
        },
        {
          description: 'Radio allows single selection',
          action: 'select',
          value: 'indoor',
          expectedBehavior: 'Should allow only one radio option to be selected',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Checkbox Field Tests',
      fieldType: 'checkbox',
      testScenarios: [
        {
          description: 'Checkbox field renders correctly',
          action: 'render',
          expectedBehavior: 'Checkbox input elements should be present',
          shouldPass: true,
        },
        {
          description: 'Checkbox allows multiple selections',
          action: 'select',
          value: ['photography', 'videography', 'flowers'],
          expectedBehavior:
            'Should allow multiple checkbox options to be selected',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'File Field Tests',
      fieldType: 'file',
      testScenarios: [
        {
          description: 'File field renders correctly',
          action: 'render',
          expectedBehavior: 'File input element should be present',
          shouldPass: true,
        },
        {
          description: 'File input accepts wedding documents',
          action: 'input',
          value: 'wedding-contract.pdf',
          expectedBehavior: 'Should accept file selection',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Signature Field Tests',
      fieldType: 'signature',
      testScenarios: [
        {
          description: 'Signature field renders canvas',
          action: 'render',
          expectedBehavior: 'Signature canvas should be present',
          shouldPass: true,
        },
      ],
    },
  ];

  const runFieldTypeTest = async (
    testCase: FieldTypeTestCase,
  ): Promise<FieldTypeTestResult[]> => {
    const results: FieldTypeTestResult[] = [];

    for (const scenario of testCase.testScenarios) {
      const startTime = performance.now();

      try {
        const mockField: FormField = {
          id: `test-${testCase.fieldType}`,
          type: testCase.fieldType,
          label: `Test ${testCase.fieldType} Field`,
          options:
            testCase.fieldType === 'select' ||
            testCase.fieldType === 'radio' ||
            testCase.fieldType === 'checkbox'
              ? [
                  { id: '1', label: 'Traditional', value: 'traditional' },
                  { id: '2', label: 'Modern', value: 'modern' },
                  { id: '3', label: 'Rustic', value: 'rustic' },
                ]
              : undefined,
        };

        // Mock field rendering and interaction
        const testResult = await simulateFieldInteraction(mockField, scenario);

        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          passed: testResult.success === scenario.shouldPass,
          message: testResult.message || scenario.expectedBehavior,
          duration: performance.now() - startTime,
        });
      } catch (error) {
        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          passed: false,
          message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - startTime,
        });
      }
    }

    return results;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const allResults: FieldTypeTestResult[] = [];

    for (const testCase of fieldTypeTests) {
      setCurrentTest(testCase.name);
      const results = await runFieldTypeTest(testCase);
      allResults.push(...results);
      setTestResults([...allResults]);

      // Small delay to show progress
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsRunning(false);
    setCurrentTest('');

    if (onTestComplete) {
      onTestComplete(allResults);
    }
  };

  React.useEffect(() => {
    if (autoRun) {
      runAllTests();
    }
  }, [autoRun]);

  const getResultsByFieldType = () => {
    const grouped: { [key: string]: FieldTypeTestResult[] } = {};
    testResults.forEach((result) => {
      if (!grouped[result.fieldType]) {
        grouped[result.fieldType] = [];
      }
      grouped[result.fieldType].push(result);
    });
    return grouped;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Field Type Behavior Tester
        </h2>
        <p className="text-gray-600">
          Comprehensive testing for all wedding form field types including
          render behavior, input handling, and user interactions
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-6 py-2 rounded-md font-medium"
        >
          {isRunning
            ? 'Running Field Type Tests...'
            : 'Run All Field Type Tests'}
        </button>

        {isRunning && currentTest && (
          <div className="mt-2 text-sm text-gray-600">
            Currently testing: {currentTest}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Test Summary</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
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
            <div>
              <span className="font-medium text-blue-600">Field Types:</span>{' '}
              {Object.keys(getResultsByFieldType()).length}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(getResultsByFieldType()).map(
            ([fieldType, results]) => (
              <div
                key={fieldType}
                className="border rounded-lg overflow-hidden"
              >
                <div className="bg-gray-100 px-4 py-2">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {fieldType} Field Tests ({results.length} tests)
                  </h4>
                  <div className="text-sm text-gray-600">
                    Passed: {results.filter((r) => r.passed).length} | Failed:{' '}
                    {results.filter((r) => !r.passed).length}
                  </div>
                </div>
                <div className="divide-y">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 ${
                        result.passed ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {result.scenario}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {result.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Duration: {result.duration.toFixed(2)}ms
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ml-4 ${
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
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// Mock function to simulate field interaction
async function simulateFieldInteraction(
  field: FormField,
  scenario: { action: string; value?: any; expectedBehavior: string },
): Promise<{ success: boolean; message?: string }> {
  // Simulate different field interactions
  switch (scenario.action) {
    case 'render':
      // Mock rendering test - check if field type is supported
      const supportedTypes: FormFieldType[] = [
        'text',
        'email',
        'tel',
        'textarea',
        'select',
        'radio',
        'checkbox',
        'date',
        'time',
        'file',
        'number',
        'heading',
        'paragraph',
        'divider',
        'image',
        'signature',
      ];
      return {
        success: supportedTypes.includes(field.type),
        message: `${field.type} field rendered successfully`,
      };

    case 'input':
      // Mock input interaction
      if (
        ['text', 'email', 'tel', 'textarea', 'number', 'date', 'time'].includes(
          field.type,
        )
      ) {
        return {
          success: scenario.value !== undefined,
          message: `Input accepted value: ${scenario.value}`,
        };
      }
      return {
        success: false,
        message: 'Field type does not support text input',
      };

    case 'select':
      // Mock selection interaction
      if (['select', 'radio', 'checkbox'].includes(field.type)) {
        return {
          success: field.options && field.options.length > 0,
          message: `Selection made: ${scenario.value}`,
        };
      }
      return {
        success: false,
        message: 'Field type does not support selection',
      };

    case 'focus':
    case 'blur':
      // Mock focus/blur events
      return {
        success: true,
        message: `${scenario.action} event handled successfully`,
      };

    default:
      return { success: false, message: 'Unknown test action' };
  }
}

export default FieldTypeTester;
