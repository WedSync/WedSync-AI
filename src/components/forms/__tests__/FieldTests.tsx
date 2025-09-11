'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import all the field testing components
import FieldValidationTester from './FieldValidationTester';
import FieldTypeTester from './FieldTypeTester';
import FieldOptionsTester from './FieldOptionsTester';
import FieldAccessibilityTester from './FieldAccessibilityTester';
import FieldPerformanceTester from './FieldPerformanceTester';
import FieldIntegrationTester from './FieldIntegrationTester';
import FieldDataIntegrityTester from './FieldDataIntegrityTester';

interface TestSuite {
  name: string;
  component: React.ComponentType<{
    onTestComplete?: (results: any[]) => void;
    autoRun?: boolean;
  }>;
  description: string;
  icon: string;
  criticality: 'critical' | 'important' | 'moderate';
}

interface FieldTestsProps {
  autoRunAll?: boolean;
  onAllTestsComplete?: (results: { [suiteName: string]: any[] }) => void;
}

export function FieldTests({
  autoRunAll = false,
  onAllTestsComplete,
}: FieldTestsProps) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [testResults, setTestResults] = React.useState<{
    [suiteName: string]: any[];
  }>({});
  const [completedSuites, setCompletedSuites] = React.useState<Set<string>>(
    new Set(),
  );
  const [isRunningAll, setIsRunningAll] = React.useState(false);

  const testSuites: TestSuite[] = [
    {
      name: 'validation',
      component: FieldValidationTester,
      description: 'Validates field validation rules for wedding form data',
      icon: '✅',
      criticality: 'critical',
    },
    {
      name: 'field-types',
      component: FieldTypeTester,
      description: 'Tests behavior of all supported wedding form field types',
      icon: '🔧',
      criticality: 'critical',
    },
    {
      name: 'options',
      component: FieldOptionsTester,
      description:
        'Tests dropdown, radio, and checkbox options for wedding services',
      icon: '⚙️',
      criticality: 'important',
    },
    {
      name: 'accessibility',
      component: FieldAccessibilityTester,
      description: 'WCAG compliance testing for inclusive wedding forms',
      icon: '♿',
      criticality: 'critical',
    },
    {
      name: 'performance',
      component: FieldPerformanceTester,
      description: 'Performance testing for wedding day reliability',
      icon: '⚡',
      criticality: 'important',
    },
    {
      name: 'integration',
      component: FieldIntegrationTester,
      description: 'Integration testing with wedding workflows and APIs',
      icon: '🔗',
      criticality: 'important',
    },
    {
      name: 'data-integrity',
      component: FieldDataIntegrityTester,
      description:
        'Data persistence and corruption prevention for wedding data',
      icon: '🛡️',
      criticality: 'critical',
    },
  ];

  const handleTestComplete = (suiteName: string) => (results: any[]) => {
    setTestResults((prev) => ({
      ...prev,
      [suiteName]: results,
    }));

    setCompletedSuites((prev) => new Set([...prev, suiteName]));

    // Check if all suites are complete
    const newCompleted = new Set([...completedSuites, suiteName]);
    if (newCompleted.size === testSuites.length && onAllTestsComplete) {
      onAllTestsComplete({
        ...testResults,
        [suiteName]: results,
      });
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setTestResults({});
    setCompletedSuites(new Set());

    // This would trigger autoRun on all test components
    // In a real implementation, you'd need to coordinate the test runs

    // Simulate running all tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRunningAll(false);
  };

  const getOverallStats = () => {
    const allResults = Object.values(testResults).flat();
    const totalTests = allResults.length;
    const passedTests = allResults.filter((result) => result.passed).length;
    const criticalFailures = allResults.filter(
      (result) =>
        !result.passed &&
        testSuites.find((suite) => testResults[suite.name]?.includes(result))
          ?.criticality === 'critical',
    ).length;

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate:
        totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      criticalFailures,
      completedSuites: completedSuites.size,
      totalSuites: testSuites.length,
    };
  };

  const stats = getOverallStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 WedSync Field Testing Suite
            </h1>
            <p className="text-gray-600 max-w-3xl">
              Comprehensive testing framework for wedding form fields ensuring
              reliability, accessibility, performance, and data integrity for
              the wedding industry's most critical form systems.
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-300 disabled:to-blue-300 text-white px-8 py-3 rounded-lg font-medium text-lg"
            >
              {isRunningAll ? 'Running All Tests...' : '🚀 Run All Test Suites'}
            </button>
          </div>
        </div>

        {/* Overall Statistics Dashboard */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">
            Testing Dashboard
          </h3>
          <div className="grid grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalTests}
              </div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.passedTests}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.failedTests}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.successRate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.criticalFailures}
              </div>
              <div className="text-sm text-gray-600">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {stats.completedSuites}
              </div>
              <div className="text-sm text-gray-600">Suites Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">
                {stats.totalSuites}
              </div>
              <div className="text-sm text-gray-600">Total Suites</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="text-xs">
            📊 Overview
          </TabsTrigger>
          {testSuites.map((suite) => (
            <TabsTrigger
              key={suite.name}
              value={suite.name}
              className="text-xs"
            >
              {suite.icon}{' '}
              {suite.name
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
              {completedSuites.has(suite.name) && (
                <span className="ml-1 text-green-600">✓</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testSuites.map((suite) => {
              const suiteResults = testResults[suite.name] || [];
              const suitePassed = suiteResults.filter((r) => r.passed).length;
              const suiteTotal = suiteResults.length;
              const suiteSuccess =
                suiteTotal > 0
                  ? Math.round((suitePassed / suiteTotal) * 100)
                  : 0;

              const criticalityColor = {
                critical: 'border-red-200 bg-red-50',
                important: 'border-yellow-200 bg-yellow-50',
                moderate: 'border-blue-200 bg-blue-50',
              }[suite.criticality];

              return (
                <div
                  key={suite.name}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${criticalityColor}`}
                  onClick={() => setActiveTab(suite.name)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{suite.icon}</div>
                    <div className="text-right">
                      {completedSuites.has(suite.name) ? (
                        <div className="flex items-center space-x-2">
                          <div
                            className={`text-lg font-bold ${
                              suiteSuccess >= 90
                                ? 'text-green-600'
                                : suiteSuccess >= 70
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {suiteSuccess}%
                          </div>
                          <span className="text-green-600 text-xl">✅</span>
                        </div>
                      ) : (
                        <div className="text-gray-400">Not run</div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 capitalize">
                    {suite.name.replace('-', ' ')} Testing
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {suite.description}
                  </p>

                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`px-2 py-1 rounded font-medium ${
                        suite.criticality === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : suite.criticality === 'important'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {suite.criticality.toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      {suiteTotal > 0
                        ? `${suitePassed}/${suiteTotal} passed`
                        : 'Click to run'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {stats.criticalFailures > 0 && (
            <div className="bg-red-50 border-l-4 border-l-red-500 p-6 rounded">
              <h4 className="font-semibold text-red-900 mb-2">
                🚨 Critical Issues Detected
              </h4>
              <p className="text-red-800 mb-4">
                {stats.criticalFailures} critical issues found that could affect
                wedding day operations. These must be resolved before production
                deployment.
              </p>
              <button
                onClick={() => {
                  const criticalSuite = testSuites.find(
                    (suite) =>
                      suite.criticality === 'critical' &&
                      testResults[suite.name]?.some((r) => !r.passed),
                  );
                  if (criticalSuite) setActiveTab(criticalSuite.name);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                View Critical Issues
              </button>
            </div>
          )}
        </TabsContent>

        {testSuites.map((suite) => {
          const Component = suite.component;
          return (
            <TabsContent key={suite.name} value={suite.name}>
              <div className="bg-white rounded-lg border">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                        <span className="text-2xl">{suite.icon}</span>
                        <span className="capitalize">
                          {suite.name.replace('-', ' ')} Testing
                        </span>
                      </h2>
                      <p className="text-gray-600 mt-1">{suite.description}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`px-3 py-1 rounded font-medium text-sm ${
                          suite.criticality === 'critical'
                            ? 'bg-red-200 text-red-800'
                            : suite.criticality === 'important'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-blue-200 text-blue-800'
                        }`}
                      >
                        {suite.criticality.toUpperCase()} PRIORITY
                      </div>
                    </div>
                  </div>
                </div>
                <Component
                  onTestComplete={handleTestComplete(suite.name)}
                  autoRun={autoRunAll}
                />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          🎯{' '}
          <strong>
            WS-215 Field Management System - Team E Implementation
          </strong>
        </p>
        <p>
          Comprehensive field testing suite for wedding industry form
          reliability
        </p>
      </div>
    </div>
  );
}

export default FieldTests;
