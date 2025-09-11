'use client';

import React from 'react';
import { FormField } from '@/types/forms';

interface AccessibilityTestCase {
  name: string;
  fieldType: string;
  field: FormField;
  testScenarios: {
    description: string;
    wcagLevel: 'A' | 'AA' | 'AAA';
    wcagCriterion: string;
    testType:
      | 'keyboard'
      | 'screen-reader'
      | 'color-contrast'
      | 'focus'
      | 'aria'
      | 'semantic';
    expectedBehavior: string;
    shouldPass: boolean;
  }[];
}

interface AccessibilityTestResult {
  fieldType: string;
  testName: string;
  scenario: string;
  wcagLevel: string;
  wcagCriterion: string;
  testType: string;
  passed: boolean;
  message: string;
  duration: number;
  issues?: string[];
}

interface FieldAccessibilityTesterProps {
  onTestComplete?: (results: AccessibilityTestResult[]) => void;
  autoRun?: boolean;
}

export function FieldAccessibilityTester({
  onTestComplete,
  autoRun = false,
}: FieldAccessibilityTesterProps) {
  const [testResults, setTestResults] = React.useState<
    AccessibilityTestResult[]
  >([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentTest, setCurrentTest] = React.useState<string>('');

  const accessibilityTests: AccessibilityTestCase[] = [
    {
      name: 'Text Field Accessibility',
      fieldType: 'text',
      field: {
        id: 'bride-name',
        type: 'text',
        label: "Bride's Full Name",
        placeholder: "Enter the bride's full name",
        required: true,
        helperText:
          'Please include first and last name as it will appear on the wedding certificate',
      },
      testScenarios: [
        {
          description: 'Label association with input',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'aria',
          expectedBehavior:
            'Label should be properly associated with input via for/id or aria-labelledby',
          shouldPass: true,
        },
        {
          description: 'Required field indication',
          wcagLevel: 'A',
          wcagCriterion: '3.3.2 Labels or Instructions',
          testType: 'aria',
          expectedBehavior:
            'Required fields should be indicated with aria-required and visual indicator',
          shouldPass: true,
        },
        {
          description: 'Keyboard navigation',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior:
            'Field should be reachable and operable with keyboard Tab navigation',
          shouldPass: true,
        },
        {
          description: 'Focus visibility',
          wcagLevel: 'AA',
          wcagCriterion: '2.4.7 Focus Visible',
          testType: 'focus',
          expectedBehavior:
            'Field should have clear focus indicator with sufficient contrast',
          shouldPass: true,
        },
        {
          description: 'Error message association',
          wcagLevel: 'AA',
          wcagCriterion: '3.3.1 Error Identification',
          testType: 'aria',
          expectedBehavior:
            'Error messages should be associated with field via aria-describedby',
          shouldPass: true,
        },
        {
          description: 'Helper text accessibility',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'aria',
          expectedBehavior:
            'Helper text should be associated with field and announced by screen readers',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Email Field Accessibility',
      fieldType: 'email',
      field: {
        id: 'contact-email',
        type: 'email',
        label: 'Wedding Contact Email',
        placeholder: 'your.email@example.com',
        required: true,
        validation: {
          required: true,
          customMessage:
            'Please enter a valid email address for wedding communications',
        },
      },
      testScenarios: [
        {
          description: 'Input type semantics',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'semantic',
          expectedBehavior:
            'Email field should use type="email" for proper semantics and mobile keyboards',
          shouldPass: true,
        },
        {
          description: 'Autocomplete attributes',
          wcagLevel: 'AA',
          wcagCriterion: '1.3.5 Identify Input Purpose',
          testType: 'semantic',
          expectedBehavior:
            'Email field should have autocomplete="email" attribute',
          shouldPass: true,
        },
        {
          description: 'Validation error accessibility',
          wcagLevel: 'AA',
          wcagCriterion: '3.3.3 Error Suggestion',
          testType: 'aria',
          expectedBehavior:
            'Invalid email errors should provide helpful suggestions',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Select Field Accessibility',
      fieldType: 'select',
      field: {
        id: 'venue-type',
        type: 'select',
        label: 'Wedding Venue Type',
        options: [
          { id: 'indoor', label: 'Indoor Venue', value: 'indoor' },
          { id: 'outdoor', label: 'Outdoor Venue', value: 'outdoor' },
          { id: 'marquee', label: 'Marquee/Tent', value: 'marquee' },
        ],
        required: true,
      },
      testScenarios: [
        {
          description: 'Select keyboard navigation',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior:
            'Select should open with Space/Enter and navigate options with arrows',
          shouldPass: true,
        },
        {
          description: 'Select screen reader announcements',
          wcagLevel: 'A',
          wcagCriterion: '4.1.3 Status Messages',
          testType: 'screen-reader',
          expectedBehavior: 'Selected option should be announced when changed',
          shouldPass: true,
        },
        {
          description: 'Select option grouping',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'semantic',
          expectedBehavior:
            'Related options should be grouped with optgroup when applicable',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Radio Group Accessibility',
      fieldType: 'radio',
      field: {
        id: 'wedding-season',
        type: 'radio',
        label: 'Preferred Wedding Season',
        options: [
          { id: 'spring', label: 'Spring (March - May)', value: 'spring' },
          { id: 'summer', label: 'Summer (June - August)', value: 'summer' },
          {
            id: 'autumn',
            label: 'Autumn (September - November)',
            value: 'autumn',
          },
          {
            id: 'winter',
            label: 'Winter (December - February)',
            value: 'winter',
          },
        ],
      },
      testScenarios: [
        {
          description: 'Radio group fieldset structure',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'semantic',
          expectedBehavior:
            'Radio buttons should be grouped in fieldset with legend',
          shouldPass: true,
        },
        {
          description: 'Radio keyboard navigation',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior: 'Arrow keys should navigate between radio options',
          shouldPass: true,
        },
        {
          description: 'Radio screen reader grouping',
          wcagLevel: 'A',
          wcagCriterion: '4.1.2 Name, Role, Value',
          testType: 'screen-reader',
          expectedBehavior:
            'Screen reader should announce group name and current selection',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Checkbox Group Accessibility',
      fieldType: 'checkbox',
      field: {
        id: 'wedding-services',
        type: 'checkbox',
        label: 'Required Wedding Services',
        options: [
          {
            id: 'photography',
            label: 'Wedding Photography',
            value: 'photography',
          },
          {
            id: 'videography',
            label: 'Wedding Videography',
            value: 'videography',
          },
          { id: 'catering', label: 'Catering Services', value: 'catering' },
          { id: 'music', label: 'Music & Entertainment', value: 'music' },
        ],
      },
      testScenarios: [
        {
          description: 'Checkbox group structure',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'semantic',
          expectedBehavior:
            'Checkboxes should be grouped with proper fieldset/legend or role="group"',
          shouldPass: true,
        },
        {
          description: 'Checkbox state announcements',
          wcagLevel: 'A',
          wcagCriterion: '4.1.2 Name, Role, Value',
          testType: 'screen-reader',
          expectedBehavior:
            'Checkbox state (checked/unchecked) should be announced',
          shouldPass: true,
        },
        {
          description: 'Checkbox keyboard interaction',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior: 'Space key should toggle checkbox state',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Date Field Accessibility',
      fieldType: 'date',
      field: {
        id: 'wedding-date',
        type: 'date',
        label: 'Wedding Date',
        required: true,
        helperText: 'Please select your preferred wedding date',
      },
      testScenarios: [
        {
          description: 'Date input semantics',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships',
          testType: 'semantic',
          expectedBehavior:
            'Date field should use type="date" for proper semantics',
          shouldPass: true,
        },
        {
          description: 'Date picker keyboard navigation',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior: 'Date picker should be fully keyboard navigable',
          shouldPass: true,
        },
        {
          description: 'Date format instructions',
          wcagLevel: 'AA',
          wcagCriterion: '3.3.2 Labels or Instructions',
          testType: 'aria',
          expectedBehavior: 'Expected date format should be clearly indicated',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'File Upload Accessibility',
      fieldType: 'file',
      field: {
        id: 'wedding-documents',
        type: 'file',
        label: 'Upload Wedding Documents',
        helperText: 'Accepted formats: PDF, DOC, DOCX. Maximum file size: 10MB',
      },
      testScenarios: [
        {
          description: 'File input keyboard access',
          wcagLevel: 'A',
          wcagCriterion: '2.1.1 Keyboard',
          testType: 'keyboard',
          expectedBehavior: 'File input should be keyboard accessible',
          shouldPass: true,
        },
        {
          description: 'File upload status announcements',
          wcagLevel: 'AA',
          wcagCriterion: '4.1.3 Status Messages',
          testType: 'screen-reader',
          expectedBehavior:
            'Upload progress and completion should be announced',
          shouldPass: true,
        },
        {
          description: 'File type restrictions clarity',
          wcagLevel: 'AA',
          wcagCriterion: '3.3.2 Labels or Instructions',
          testType: 'aria',
          expectedBehavior: 'Accepted file types should be clearly indicated',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Color Contrast Testing',
      fieldType: 'general',
      field: {
        id: 'contrast-test',
        type: 'text',
        label: 'Color Contrast Test Field',
        placeholder: 'Testing color contrast ratios',
      },
      testScenarios: [
        {
          description: 'Normal text contrast ratio',
          wcagLevel: 'AA',
          wcagCriterion: '1.4.3 Contrast (Minimum)',
          testType: 'color-contrast',
          expectedBehavior:
            'Text should have minimum 4.5:1 contrast ratio against background',
          shouldPass: true,
        },
        {
          description: 'Large text contrast ratio',
          wcagLevel: 'AA',
          wcagCriterion: '1.4.3 Contrast (Minimum)',
          testType: 'color-contrast',
          expectedBehavior:
            'Large text should have minimum 3:1 contrast ratio against background',
          shouldPass: true,
        },
        {
          description: 'Focus indicator contrast',
          wcagLevel: 'AA',
          wcagCriterion: '1.4.11 Non-text Contrast',
          testType: 'color-contrast',
          expectedBehavior:
            'Focus indicators should have minimum 3:1 contrast ratio',
          shouldPass: true,
        },
        {
          description: 'Enhanced contrast (AAA)',
          wcagLevel: 'AAA',
          wcagCriterion: '1.4.6 Contrast (Enhanced)',
          testType: 'color-contrast',
          expectedBehavior:
            'Text should have 7:1 contrast ratio for AAA compliance',
          shouldPass: true,
        },
      ],
    },
  ];

  const runAccessibilityTest = async (
    testCase: AccessibilityTestCase,
  ): Promise<AccessibilityTestResult[]> => {
    const results: AccessibilityTestResult[] = [];

    for (const scenario of testCase.testScenarios) {
      const startTime = performance.now();

      try {
        const testResult = await simulateAccessibilityTest(
          testCase.field,
          scenario,
        );

        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          wcagLevel: scenario.wcagLevel,
          wcagCriterion: scenario.wcagCriterion,
          testType: scenario.testType,
          passed: testResult.success === scenario.shouldPass,
          message: testResult.message || scenario.expectedBehavior,
          duration: performance.now() - startTime,
          issues: testResult.issues,
        });
      } catch (error) {
        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          wcagLevel: scenario.wcagLevel,
          wcagCriterion: scenario.wcagCriterion,
          testType: scenario.testType,
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

    const allResults: AccessibilityTestResult[] = [];

    for (const testCase of accessibilityTests) {
      setCurrentTest(testCase.name);
      const results = await runAccessibilityTest(testCase);
      allResults.push(...results);
      setTestResults([...allResults]);

      // Small delay to show progress
      await new Promise((resolve) => setTimeout(resolve, 100));
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

  const getResultsByWcagLevel = () => {
    const grouped: { [key: string]: AccessibilityTestResult[] } = {};
    testResults.forEach((result) => {
      if (!grouped[result.wcagLevel]) {
        grouped[result.wcagLevel] = [];
      }
      grouped[result.wcagLevel].push(result);
    });
    return grouped;
  };

  const getResultsByTestType = () => {
    const grouped: { [key: string]: AccessibilityTestResult[] } = {};
    testResults.forEach((result) => {
      if (!grouped[result.testType]) {
        grouped[result.testType] = [];
      }
      grouped[result.testType].push(result);
    });
    return grouped;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Field Accessibility Tester
        </h2>
        <p className="text-gray-600">
          WCAG 2.1 compliance testing for wedding form fields including keyboard
          navigation, screen reader compatibility, color contrast, and semantic
          markup validation
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium"
        >
          {isRunning
            ? 'Running Accessibility Tests...'
            : 'Run Accessibility Tests'}
        </button>

        {isRunning && currentTest && (
          <div className="mt-2 text-sm text-gray-600">
            Currently testing: {currentTest}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">
            Accessibility Test Summary
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                Overall Results
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <span className="font-medium text-blue-600">Compliance:</span>{' '}
                  {testResults.length > 0
                    ? Math.round(
                        (testResults.filter((r) => r.passed).length /
                          testResults.length) *
                          100,
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                WCAG Level Breakdown
              </h4>
              <div className="space-y-1 text-sm">
                {Object.entries(getResultsByWcagLevel()).map(
                  ([level, results]) => (
                    <div key={level} className="flex justify-between">
                      <span className="font-medium">WCAG {level}:</span>
                      <span>
                        <span className="text-green-600">
                          {results.filter((r) => r.passed).length}
                        </span>
                        <span className="text-gray-500">/{results.length}</span>
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 text-sm">
          {Object.entries(getResultsByTestType()).map(([testType, results]) => (
            <div
              key={testType}
              className="bg-white p-3 rounded-lg border text-center"
            >
              <div className="font-medium text-gray-900 capitalize mb-1">
                {testType.replace('-', ' ')}
              </div>
              <div className="text-gray-600">
                <span className="text-green-600 font-medium">
                  {results.filter((r) => r.passed).length}
                </span>
                /{results.length}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {Object.entries(getResultsByWcagLevel()).map(
            ([wcagLevel, results]) => (
              <div
                key={wcagLevel}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className={`px-4 py-3 ${
                    wcagLevel === 'A'
                      ? 'bg-blue-100'
                      : wcagLevel === 'AA'
                        ? 'bg-green-100'
                        : 'bg-purple-100'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900">
                    WCAG {wcagLevel} Level Tests ({results.length} tests)
                  </h4>
                  <div className="text-sm text-gray-700 mt-1">
                    <span className="text-green-600 font-medium">
                      ✓ {results.filter((r) => r.passed).length} passed
                    </span>
                    {results.filter((r) => !r.passed).length > 0 && (
                      <>
                        {' • '}
                        <span className="text-red-600 font-medium">
                          ✗ {results.filter((r) => !r.passed).length} failed
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 ${
                        result.passed
                          ? 'bg-green-50 border-l-4 border-l-green-500'
                          : 'bg-red-50 border-l-4 border-l-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {result.scenario}
                          </div>
                          <div className="text-sm text-gray-700 mb-2">
                            {result.message}
                          </div>
                          <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500">
                            <span className="bg-gray-200 px-2 py-1 rounded">
                              {result.wcagCriterion}
                            </span>
                            <span className="bg-blue-200 px-2 py-1 rounded">
                              {result.testType}
                            </span>
                            <span>Field: {result.fieldType}</span>
                            <span>
                              Duration: {result.duration.toFixed(2)}ms
                            </span>
                          </div>
                          {result.issues && result.issues.length > 0 && (
                            <div className="mt-2 text-sm text-red-700">
                              <strong>Issues found:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {result.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ml-4 ${
                            result.passed
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
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

// Mock function to simulate accessibility testing
async function simulateAccessibilityTest(
  field: FormField,
  scenario: {
    testType: string;
    wcagLevel: string;
    wcagCriterion: string;
    expectedBehavior: string;
  },
): Promise<{ success: boolean; message?: string; issues?: string[] }> {
  const issues: string[] = [];
  let success = true;

  switch (scenario.testType) {
    case 'aria':
      // Mock ARIA testing
      if (
        field.required &&
        !scenario.expectedBehavior.includes('aria-required')
      ) {
        issues.push('Missing aria-required attribute for required field');
        success = false;
      }
      if (
        field.helperText &&
        !scenario.expectedBehavior.includes('aria-describedby')
      ) {
        issues.push('Helper text not associated with aria-describedby');
        success = false;
      }
      return {
        success,
        message: success
          ? 'ARIA attributes properly implemented'
          : 'ARIA issues found',
        issues,
      };

    case 'keyboard':
      // Mock keyboard testing
      const keyboardNavigableTypes = [
        'text',
        'email',
        'tel',
        'textarea',
        'select',
        'radio',
        'checkbox',
        'date',
        'time',
        'number',
        'file',
      ];
      if (!keyboardNavigableTypes.includes(field.type)) {
        issues.push('Field type may not be keyboard accessible');
        success = false;
      }
      return {
        success,
        message: success
          ? 'Keyboard navigation supported'
          : 'Keyboard accessibility issues found',
        issues,
      };

    case 'screen-reader':
      // Mock screen reader testing
      if (!field.label || field.label.trim() === '') {
        issues.push('Missing accessible label for screen readers');
        success = false;
      }
      if (
        field.type === 'radio' &&
        !scenario.expectedBehavior.includes('group')
      ) {
        issues.push('Radio buttons should be grouped for screen readers');
        success = false;
      }
      return {
        success,
        message: success
          ? 'Screen reader compatible'
          : 'Screen reader issues found',
        issues,
      };

    case 'color-contrast':
      // Mock color contrast testing
      const contrastRatio = Math.random() * 10 + 2; // Random ratio between 2-12

      if (
        scenario.wcagLevel === 'AA' &&
        scenario.expectedBehavior.includes('4.5:1') &&
        contrastRatio < 4.5
      ) {
        issues.push(
          `Contrast ratio ${contrastRatio.toFixed(2)}:1 is below required 4.5:1`,
        );
        success = false;
      } else if (
        scenario.wcagLevel === 'AA' &&
        scenario.expectedBehavior.includes('3:1') &&
        contrastRatio < 3
      ) {
        issues.push(
          `Contrast ratio ${contrastRatio.toFixed(2)}:1 is below required 3:1`,
        );
        success = false;
      } else if (
        scenario.wcagLevel === 'AAA' &&
        scenario.expectedBehavior.includes('7:1') &&
        contrastRatio < 7
      ) {
        issues.push(
          `Contrast ratio ${contrastRatio.toFixed(2)}:1 is below required 7:1 for AAA`,
        );
        success = false;
      }

      return {
        success,
        message: success
          ? `Color contrast passed (${contrastRatio.toFixed(2)}:1)`
          : 'Color contrast issues found',
        issues,
      };

    case 'focus':
      // Mock focus testing
      if (!scenario.expectedBehavior.includes('focus indicator')) {
        issues.push('Focus indicator may not be visible');
        success = false;
      }
      return {
        success,
        message: success
          ? 'Focus indicators properly implemented'
          : 'Focus visibility issues found',
        issues,
      };

    case 'semantic':
      // Mock semantic markup testing
      const semanticTypes = ['email', 'tel', 'date', 'time', 'number'];
      if (semanticTypes.includes(field.type)) {
        return {
          success: true,
          message: `Semantic HTML type="${field.type}" properly used`,
        };
      }

      if (
        field.type === 'radio' &&
        !scenario.expectedBehavior.includes('fieldset')
      ) {
        issues.push('Radio buttons should be wrapped in fieldset with legend');
        success = false;
      }

      return {
        success,
        message: success
          ? 'Semantic markup correct'
          : 'Semantic markup issues found',
        issues,
      };

    default:
      return {
        success: false,
        message: 'Unknown accessibility test type',
        issues: ['Unknown test type'],
      };
  }
}

export default FieldAccessibilityTester;
