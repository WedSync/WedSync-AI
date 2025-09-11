'use client';

import React from 'react';
import { FormField } from '@/types/forms';

interface DataIntegrityTestCase {
  name: string;
  fieldType: string;
  field: FormField;
  testScenarios: {
    description: string;
    testType:
      | 'persistence'
      | 'corruption'
      | 'recovery'
      | 'consistency'
      | 'backup'
      | 'migration';
    scenario:
      | 'normal'
      | 'network-failure'
      | 'power-loss'
      | 'concurrent-writes'
      | 'data-corruption';
    expectedBehavior: string;
    shouldPass: boolean;
  }[];
}

interface DataIntegrityTestResult {
  fieldType: string;
  testName: string;
  scenario: string;
  testType: string;
  testScenario: string;
  passed: boolean;
  message: string;
  duration: number;
  dataIntegrityScore: number; // 0-100 score
  issuesFound?: string[];
  recoveryTime?: number;
}

interface FieldDataIntegrityTesterProps {
  onTestComplete?: (results: DataIntegrityTestResult[]) => void;
  autoRun?: boolean;
}

export function FieldDataIntegrityTester({
  onTestComplete,
  autoRun = false,
}: FieldDataIntegrityTesterProps) {
  const [testResults, setTestResults] = React.useState<
    DataIntegrityTestResult[]
  >([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentTest, setCurrentTest] = React.useState<string>('');

  const dataIntegrityTests: DataIntegrityTestCase[] = [
    {
      name: 'Wedding Contact Data Integrity',
      fieldType: 'email',
      field: {
        id: 'primary-contact-email',
        type: 'email',
        label: 'Primary Wedding Contact Email',
        required: true,
        validation: {
          required: true,
          customMessage:
            'Primary contact email is essential for wedding coordination',
        },
      },
      testScenarios: [
        {
          description: 'Email data persists correctly in database',
          testType: 'persistence',
          scenario: 'normal',
          expectedBehavior: 'Email should be stored correctly and retrievable',
          shouldPass: true,
        },
        {
          description: 'Email data survives network interruption during save',
          testType: 'persistence',
          scenario: 'network-failure',
          expectedBehavior:
            'Email should be saved locally and synced when connection restored',
          shouldPass: true,
        },
        {
          description: 'Email data corruption detection and prevention',
          testType: 'corruption',
          scenario: 'data-corruption',
          expectedBehavior:
            'Corrupted email data should be detected and rejected',
          shouldPass: true,
        },
        {
          description: 'Email data recovery from backup',
          testType: 'recovery',
          scenario: 'power-loss',
          expectedBehavior:
            'Email should be recoverable from automatic backups',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Wedding Date Data Critical Integrity',
      fieldType: 'date',
      field: {
        id: 'wedding-date',
        type: 'date',
        label: 'Wedding Date',
        required: true,
        validation: {
          required: true,
          customMessage:
            'Wedding date is absolutely critical and cannot be lost',
        },
      },
      testScenarios: [
        {
          description: 'Wedding date immutability after confirmation',
          testType: 'consistency',
          scenario: 'normal',
          expectedBehavior:
            'Confirmed wedding dates should be protected from accidental changes',
          shouldPass: true,
        },
        {
          description: 'Wedding date consistency across all wedding systems',
          testType: 'consistency',
          scenario: 'concurrent-writes',
          expectedBehavior:
            'Wedding date should be consistent across all dependent systems',
          shouldPass: true,
        },
        {
          description: 'Wedding date recovery from catastrophic failure',
          testType: 'recovery',
          scenario: 'power-loss',
          expectedBehavior:
            'Wedding date should be recoverable even after system failure',
          shouldPass: true,
        },
        {
          description: 'Wedding date backup verification',
          testType: 'backup',
          scenario: 'normal',
          expectedBehavior:
            'Wedding date should be included in all backup procedures',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Guest Count Data Accuracy',
      fieldType: 'number',
      field: {
        id: 'final-guest-count',
        type: 'number',
        label: 'Final Guest Count',
        validation: {
          required: true,
          min: 1,
          max: 1000,
          customMessage:
            'Accurate guest count is critical for catering and venue planning',
        },
      },
      testScenarios: [
        {
          description: 'Guest count numerical precision preservation',
          testType: 'persistence',
          scenario: 'normal',
          expectedBehavior:
            'Guest count should be stored as exact integer without rounding errors',
          shouldPass: true,
        },
        {
          description: 'Guest count bounds validation enforcement',
          testType: 'corruption',
          scenario: 'data-corruption',
          expectedBehavior:
            'Guest counts outside valid ranges should be rejected',
          shouldPass: true,
        },
        {
          description: 'Guest count history tracking',
          testType: 'consistency',
          scenario: 'normal',
          expectedBehavior:
            'Guest count changes should be tracked for catering adjustments',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Wedding Service Selections Integrity',
      fieldType: 'checkbox',
      field: {
        id: 'selected-services',
        type: 'checkbox',
        label: 'Selected Wedding Services',
        options: [
          {
            id: 'photography',
            label: 'Photography Package',
            value: 'photography',
          },
          {
            id: 'videography',
            label: 'Videography Package',
            value: 'videography',
          },
          { id: 'catering', label: 'Catering Services', value: 'catering' },
          { id: 'flowers', label: 'Floral Arrangements', value: 'flowers' },
          { id: 'music', label: 'Music & DJ', value: 'music' },
        ],
      },
      testScenarios: [
        {
          description: 'Service selection array integrity',
          testType: 'persistence',
          scenario: 'normal',
          expectedBehavior:
            'All selected services should be stored and retrievable as array',
          shouldPass: true,
        },
        {
          description: 'Service selection consistency during updates',
          testType: 'consistency',
          scenario: 'concurrent-writes',
          expectedBehavior:
            'Service selections should not be lost during concurrent updates',
          shouldPass: true,
        },
        {
          description: 'Service selection validation against available options',
          testType: 'corruption',
          scenario: 'data-corruption',
          expectedBehavior:
            'Invalid service selections should be detected and corrected',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Wedding Document File Integrity',
      fieldType: 'file',
      field: {
        id: 'wedding-contracts',
        type: 'file',
        label: 'Wedding Contracts & Documents',
        validation: {
          required: true,
          customMessage:
            'Wedding contracts are legally important and must be preserved',
        },
      },
      testScenarios: [
        {
          description: 'File upload integrity verification',
          testType: 'persistence',
          scenario: 'normal',
          expectedBehavior:
            'Uploaded files should maintain checksums and be uncorrupted',
          shouldPass: true,
        },
        {
          description: 'File recovery from corrupted storage',
          testType: 'recovery',
          scenario: 'data-corruption',
          expectedBehavior:
            'Corrupted files should be recoverable from redundant storage',
          shouldPass: true,
        },
        {
          description: 'File backup and archival integrity',
          testType: 'backup',
          scenario: 'normal',
          expectedBehavior:
            'Wedding documents should be backed up with integrity verification',
          shouldPass: true,
        },
        {
          description: 'File metadata consistency',
          testType: 'consistency',
          scenario: 'normal',
          expectedBehavior:
            'File metadata (size, type, name) should match actual file properties',
          shouldPass: true,
        },
      ],
    },
    {
      name: 'Large Form Data Migration Integrity',
      fieldType: 'mixed',
      field: {
        id: 'comprehensive-wedding-form',
        type: 'text',
        label: 'Comprehensive Wedding Form Data',
      },
      testScenarios: [
        {
          description: 'Large form data migration without loss',
          testType: 'migration',
          scenario: 'normal',
          expectedBehavior:
            'All form fields should migrate correctly during system updates',
          shouldPass: true,
        },
        {
          description: 'Form data rollback after failed migration',
          testType: 'recovery',
          scenario: 'data-corruption',
          expectedBehavior:
            'Failed migrations should rollback to previous stable state',
          shouldPass: true,
        },
        {
          description: 'Cross-version data compatibility',
          testType: 'migration',
          scenario: 'normal',
          expectedBehavior:
            'Form data should be compatible across system versions',
          shouldPass: true,
        },
      ],
    },
  ];

  const runDataIntegrityTest = async (
    testCase: DataIntegrityTestCase,
  ): Promise<DataIntegrityTestResult[]> => {
    const results: DataIntegrityTestResult[] = [];

    for (const scenario of testCase.testScenarios) {
      const startTime = performance.now();

      try {
        const testResult = await simulateDataIntegrityTest(
          testCase.field,
          scenario,
        );

        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          testType: scenario.testType,
          testScenario: scenario.scenario,
          passed: testResult.success === scenario.shouldPass,
          message: testResult.message || scenario.expectedBehavior,
          duration: performance.now() - startTime,
          dataIntegrityScore: testResult.integrityScore,
          issuesFound: testResult.issues,
          recoveryTime: testResult.recoveryTime,
        });
      } catch (error) {
        results.push({
          fieldType: testCase.fieldType,
          testName: testCase.name,
          scenario: scenario.description,
          testType: scenario.testType,
          testScenario: scenario.scenario,
          passed: false,
          message: `Data integrity test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: performance.now() - startTime,
          dataIntegrityScore: 0,
          issuesFound: ['Test execution failed'],
        });
      }
    }

    return results;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const allResults: DataIntegrityTestResult[] = [];

    for (const testCase of dataIntegrityTests) {
      setCurrentTest(testCase.name);
      const results = await runDataIntegrityTest(testCase);
      allResults.push(...results);
      setTestResults([...allResults]);

      // Longer delay for data integrity tests
      await new Promise((resolve) => setTimeout(resolve, 400));
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

  const getResultsByTestType = () => {
    const grouped: { [key: string]: DataIntegrityTestResult[] } = {};
    testResults.forEach((result) => {
      if (!grouped[result.testType]) {
        grouped[result.testType] = [];
      }
      grouped[result.testType].push(result);
    });
    return grouped;
  };

  const getOverallIntegrityScore = () => {
    if (testResults.length === 0) return 0;
    const totalScore = testResults.reduce(
      (acc, result) => acc + result.dataIntegrityScore,
      0,
    );
    return Math.round(totalScore / testResults.length);
  };

  const getCriticalIssues = () => {
    return testResults.filter(
      (result) => !result.passed || result.dataIntegrityScore < 70,
    );
  };

  const criticalIssues = getCriticalIssues();
  const overallScore = getOverallIntegrityScore();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Field Data Integrity Tester
        </h2>
        <p className="text-gray-600">
          Comprehensive data integrity testing for wedding form fields including
          persistence, corruption detection, recovery mechanisms, consistency
          validation, and backup verification
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2 rounded-md font-medium"
        >
          {isRunning
            ? 'Running Data Integrity Tests...'
            : 'Run Data Integrity Tests'}
        </button>

        {isRunning && currentTest && (
          <div className="mt-2 text-sm text-gray-600">
            Currently testing: {currentTest}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Overall Data Integrity Dashboard */}
        <div
          className={`p-6 rounded-lg border-2 ${
            overallScore >= 90
              ? 'bg-green-50 border-green-200'
              : overallScore >= 70
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
          }`}
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            Data Integrity Health Score
          </h3>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div
                className={`text-4xl font-bold mb-2 ${
                  overallScore >= 90
                    ? 'text-green-600'
                    : overallScore >= 70
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {overallScore}
              </div>
              <div className="text-sm text-gray-600">
                Overall Integrity Score
              </div>
              <div
                className={`text-xs font-medium ${
                  overallScore >= 90
                    ? 'text-green-700'
                    : overallScore >= 70
                      ? 'text-yellow-700'
                      : 'text-red-700'
                }`}
              >
                {overallScore >= 90
                  ? 'EXCELLENT'
                  : overallScore >= 70
                    ? 'ACCEPTABLE'
                    : 'CRITICAL ISSUES'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {testResults.filter((r) => r.passed).length}
              </div>
              <div className="text-sm text-gray-600">Tests Passed</div>
              <div className="text-xs text-green-700 font-medium">
                {testResults.length > 0
                  ? Math.round(
                      (testResults.filter((r) => r.passed).length /
                        testResults.length) *
                        100,
                    )
                  : 0}
                % Success
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {criticalIssues.length}
              </div>
              <div className="text-sm text-gray-600">Critical Issues</div>
              <div className="text-xs text-red-700 font-medium">
                {criticalIssues.length === 0 ? 'NONE FOUND' : 'NEEDS ATTENTION'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {testResults
                  .reduce((acc, r) => acc + (r.recoveryTime || 0), 0)
                  .toFixed(1)}
                s
              </div>
              <div className="text-sm text-gray-600">Total Recovery Time</div>
              <div className="text-xs text-blue-700 font-medium">
                AVG:{' '}
                {testResults.length > 0
                  ? (
                      testResults.reduce(
                        (acc, r) => acc + (r.recoveryTime || 0),
                        0,
                      ) / testResults.length
                    ).toFixed(2)
                  : 0}
                s
              </div>
            </div>
          </div>
        </div>

        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <div className="bg-red-50 border-l-4 border-l-red-500 p-4 rounded">
            <h4 className="font-semibold text-red-900 mb-2">
              🚨 Critical Data Integrity Issues Found
            </h4>
            <div className="text-sm text-red-800">
              <p className="mb-2">
                {criticalIssues.length} critical issues detected that could
                result in data loss or corruption:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {criticalIssues.slice(0, 5).map((issue, index) => (
                  <li key={index}>
                    <strong>{issue.testName}:</strong> {issue.scenario}
                    (Score: {issue.dataIntegrityScore}/100)
                  </li>
                ))}
              </ul>
              {criticalIssues.length > 5 && (
                <p className="mt-2 text-red-700 font-medium">
                  ...and {criticalIssues.length - 5} more issues
                </p>
              )}
            </div>
          </div>
        )}

        {/* Test Type Breakdown */}
        <div className="grid grid-cols-6 gap-3 text-sm">
          {Object.entries(getResultsByTestType()).map(([testType, results]) => {
            const avgScore =
              results.reduce((acc, r) => acc + r.dataIntegrityScore, 0) /
              results.length;
            const scoreColor =
              avgScore >= 90 ? 'green' : avgScore >= 70 ? 'yellow' : 'red';

            return (
              <div
                key={testType}
                className="bg-white p-4 rounded-lg border text-center"
              >
                <div className="font-semibold text-gray-900 capitalize mb-2">
                  {testType.replace('-', ' ')}
                </div>
                <div
                  className={`text-xl font-bold mb-1 ${
                    scoreColor === 'green'
                      ? 'text-green-600'
                      : scoreColor === 'yellow'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {avgScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500">
                  {results.filter((r) => r.passed).length}/{results.length}{' '}
                  passed
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden ${
                result.passed && result.dataIntegrityScore >= 70
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div
                className={`px-4 py-3 ${
                  result.passed && result.dataIntegrityScore >= 70
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {result.scenario}
                    </h4>
                    <div className="text-sm text-gray-700 mt-1">
                      {result.testName} • {result.fieldType} field •{' '}
                      {result.testScenario} scenario
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`text-lg font-bold ${
                        result.dataIntegrityScore >= 90
                          ? 'text-green-600'
                          : result.dataIntegrityScore >= 70
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {result.dataIntegrityScore}/100
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        result.passed && result.dataIntegrityScore >= 70
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {result.passed && result.dataIntegrityScore >= 70
                        ? 'PASS'
                        : 'FAIL'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="mb-3">
                  <div className="text-sm text-gray-700 mb-2">
                    {result.message}
                  </div>

                  {/* Integrity Score Visualization */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-600">Integrity:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          result.dataIntegrityScore >= 90
                            ? 'bg-green-500'
                            : result.dataIntegrityScore >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${result.dataIntegrityScore}%` }}
                      />
                    </div>
                    <span className="text-gray-600 font-medium">
                      {result.dataIntegrityScore}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>
                    Test Type: <strong>{result.testType}</strong>
                  </span>
                  <span>
                    Duration: <strong>{result.duration.toFixed(2)}ms</strong>
                  </span>
                  {result.recoveryTime && (
                    <span>
                      Recovery:{' '}
                      <strong>{result.recoveryTime.toFixed(2)}s</strong>
                    </span>
                  )}
                </div>

                {result.issuesFound && result.issuesFound.length > 0 && (
                  <div className="mt-2 text-sm">
                    <strong className="text-red-700">Issues Found:</strong>
                    <ul className="list-disc list-inside ml-2 text-red-600">
                      {result.issuesFound.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock function to simulate data integrity testing
async function simulateDataIntegrityTest(
  field: FormField,
  scenario: {
    testType: string;
    scenario: string;
    expectedBehavior: string;
  },
): Promise<{
  success: boolean;
  message?: string;
  integrityScore: number;
  issues?: string[];
  recoveryTime?: number;
}> {
  // Simulate longer testing time for data integrity
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 300),
  );

  let success = true;
  let message = '';
  let integrityScore = 100;
  let issues: string[] = [];
  let recoveryTime = undefined;

  switch (scenario.testType) {
    case 'persistence':
      if (scenario.scenario === 'network-failure') {
        success = Math.random() > 0.15; // 85% success rate
        integrityScore = success
          ? 90 + Math.random() * 10
          : 40 + Math.random() * 30;
        message = success
          ? 'Data persisted successfully despite network interruption'
          : 'Data lost during network failure';
        if (!success)
          issues.push(
            'Local storage mechanism failed',
            'Sync recovery incomplete',
          );
      } else {
        success = Math.random() > 0.05; // 95% success rate
        integrityScore = success
          ? 95 + Math.random() * 5
          : 60 + Math.random() * 20;
        message = success
          ? 'Data persistence working correctly'
          : 'Data storage integrity issue';
        if (!success) issues.push('Database write verification failed');
      }
      break;

    case 'corruption':
      success = Math.random() > 0.1; // 90% success rate
      integrityScore = success
        ? 85 + Math.random() * 15
        : 30 + Math.random() * 40;
      message = success
        ? 'Data corruption detection and prevention working'
        : 'Data corruption not properly handled';
      if (!success) {
        issues.push('Checksum validation failed', 'Invalid data accepted');
        if (field.type === 'email')
          issues.push('Email format validation bypassed');
        if (field.type === 'number')
          issues.push('Numeric bounds checking failed');
      }
      break;

    case 'recovery':
      recoveryTime = 1 + Math.random() * 5; // 1-6 seconds recovery time
      success = Math.random() > 0.2; // 80% success rate
      integrityScore = success
        ? 80 + Math.random() * 20
        : 20 + Math.random() * 50;
      message = success
        ? `Data recovered successfully in ${recoveryTime.toFixed(2)}s`
        : 'Data recovery failed or incomplete';
      if (!success) {
        issues.push('Backup mechanism failed', 'Recovery process timed out');
        if (recoveryTime > 4)
          issues.push('Recovery time exceeded acceptable limits');
      }
      break;

    case 'consistency':
      if (scenario.scenario === 'concurrent-writes') {
        success = Math.random() > 0.25; // 75% success rate for concurrent scenarios
        integrityScore = success
          ? 75 + Math.random() * 25
          : 25 + Math.random() * 45;
        message = success
          ? 'Data consistency maintained during concurrent operations'
          : 'Data inconsistency detected';
        if (!success)
          issues.push(
            'Race condition detected',
            'Concurrent write conflict not resolved',
          );
      } else {
        success = Math.random() > 0.1; // 90% success rate
        integrityScore = success
          ? 88 + Math.random() * 12
          : 50 + Math.random() * 30;
        message = success
          ? 'Data consistency checks passed'
          : 'Data consistency violation';
        if (!success) issues.push('Cross-system data mismatch');
      }
      break;

    case 'backup':
      success = Math.random() > 0.08; // 92% success rate
      integrityScore = success
        ? 90 + Math.random() * 10
        : 45 + Math.random() * 35;
      message = success
        ? 'Backup verification successful'
        : 'Backup integrity issues found';
      if (!success) {
        issues.push('Backup verification failed', 'Backup data incomplete');
        if (field.type === 'file') issues.push('File backup checksum mismatch');
      }
      break;

    case 'migration':
      success = Math.random() > 0.18; // 82% success rate
      integrityScore = success
        ? 85 + Math.random() * 15
        : 35 + Math.random() * 40;
      message = success
        ? 'Data migration completed without integrity loss'
        : 'Data migration integrity issues';
      if (!success) {
        issues.push(
          'Schema migration data loss',
          'Version compatibility issues',
        );
        recoveryTime = 10 + Math.random() * 20; // Longer recovery for migrations
      }
      break;

    default:
      success = Math.random() > 0.1;
      integrityScore = success
        ? 85 + Math.random() * 15
        : 40 + Math.random() * 40;
      message = success
        ? 'Data integrity test passed'
        : 'Data integrity test failed';
  }

  // Wedding-specific critical data gets higher standards
  if (
    field.label.toLowerCase().includes('wedding date') ||
    field.label.toLowerCase().includes('contact email') ||
    field.required
  ) {
    if (integrityScore < 80) {
      integrityScore = Math.max(integrityScore - 10, 10); // Penalize critical field failures more
      issues.push('Critical wedding data integrity below acceptable threshold');
    }
  }

  return {
    success,
    message,
    integrityScore: Math.round(integrityScore),
    issues: issues.length > 0 ? issues : undefined,
    recoveryTime,
  };
}

export default FieldDataIntegrityTester;
