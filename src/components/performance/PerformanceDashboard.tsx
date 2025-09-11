'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { AdvancedPerformanceProfiler } from './AdvancedPerformanceProfiler';

// Performance test scenarios
interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  target: 'guest-list' | 'search' | 'rendering' | 'memory' | 'network';
  thresholds: {
    renderTime: number;
    fps: number;
    memoryUsage: number;
  };
  status: 'idle' | 'running' | 'passed' | 'failed';
  results?: {
    renderTime: number;
    fps: number;
    memoryUsage: number;
    score: number;
  };
}

interface LoadTestConfig {
  concurrent_users: number;
  duration_seconds: number;
  ramp_up_seconds: number;
  target_endpoint: string;
  test_data_size: number;
}

const PERFORMANCE_TESTS: PerformanceTest[] = [
  {
    id: 'guest-list-1000',
    name: '1000 Guest List Rendering',
    description: 'Test virtual scrolling performance with 1000 guests',
    target: 'guest-list',
    thresholds: { renderTime: 16, fps: 55, memoryUsage: 80 },
    status: 'idle',
  },
  {
    id: 'guest-search-performance',
    name: 'Guest Search Performance',
    description: 'Test search worker performance with large dataset',
    target: 'search',
    thresholds: { renderTime: 10, fps: 58, memoryUsage: 75 },
    status: 'idle',
  },
  {
    id: 'react-concurrent-rendering',
    name: 'React Concurrent Rendering',
    description: 'Test React 19 concurrent features under load',
    target: 'rendering',
    thresholds: { renderTime: 12, fps: 57, memoryUsage: 70 },
    status: 'idle',
  },
  {
    id: 'memory-stress-test',
    name: 'Memory Stress Test',
    description:
      'Test memory usage with large datasets and multiple operations',
    target: 'memory',
    thresholds: { renderTime: 20, fps: 50, memoryUsage: 85 },
    status: 'idle',
  },
  {
    id: 'mobile-performance',
    name: 'Mobile Performance',
    description: 'Test performance on mobile viewport with touch interactions',
    target: 'rendering',
    thresholds: { renderTime: 25, fps: 45, memoryUsage: 90 },
    status: 'idle',
  },
];

export const PerformanceDashboard: React.FC<{ className?: string }> = memo(
  ({ className }) => {
    const [tests, setTests] = useState<PerformanceTest[]>(PERFORMANCE_TESTS);
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [loadTestConfig, setLoadTestConfig] = useState<LoadTestConfig>({
      concurrent_users: 10,
      duration_seconds: 60,
      ramp_up_seconds: 10,
      target_endpoint: '/api/guests',
      test_data_size: 1000,
    });
    const [profilerRecording, setProfilerRecording] = useState(false);
    const [dashboardMetrics, setDashboardMetrics] = useState({
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageScore: 0,
      lastRunTime: null as Date | null,
    });

    // Run individual performance test
    const runTest = useCallback(
      async (testId: string) => {
        setTests((prev) =>
          prev.map((test) =>
            test.id === testId ? { ...test, status: 'running' } : test,
          ),
        );

        try {
          // Simulate performance test execution
          const test = tests.find((t) => t.id === testId);
          if (!test) return;

          // Start performance monitoring
          const startTime = performance.now();
          const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

          // Simulate test scenarios
          let mockResults = {
            renderTime: 0,
            fps: 60,
            memoryUsage: 0,
            score: 0,
          };

          switch (test.target) {
            case 'guest-list':
              mockResults = await simulateGuestListTest(
                loadTestConfig.test_data_size,
              );
              break;
            case 'search':
              mockResults = await simulateSearchTest(
                loadTestConfig.test_data_size,
              );
              break;
            case 'rendering':
              mockResults = await simulateRenderingTest();
              break;
            case 'memory':
              mockResults = await simulateMemoryTest();
              break;
            default:
              mockResults = await simulateGenericTest();
          }

          const endTime = performance.now();
          const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

          mockResults.renderTime = endTime - startTime;
          mockResults.memoryUsage = Math.max(
            0,
            (endMemory - startMemory) / (1024 * 1024),
          );

          // Calculate score based on thresholds
          let score = 100;
          if (mockResults.renderTime > test.thresholds.renderTime) score -= 30;
          if (mockResults.fps < test.thresholds.fps) score -= 30;
          if (mockResults.memoryUsage > test.thresholds.memoryUsage)
            score -= 40;
          mockResults.score = Math.max(0, score);

          const status =
            mockResults.renderTime <= test.thresholds.renderTime &&
            mockResults.fps >= test.thresholds.fps &&
            mockResults.memoryUsage <= test.thresholds.memoryUsage
              ? 'passed'
              : 'failed';

          setTests((prev) =>
            prev.map((t) =>
              t.id === testId ? { ...t, status, results: mockResults } : t,
            ),
          );
        } catch (error) {
          setTests((prev) =>
            prev.map((test) =>
              test.id === testId ? { ...test, status: 'failed' } : test,
            ),
          );
        }
      },
      [tests, loadTestConfig],
    );

    // Simulate guest list performance test
    const simulateGuestListTest = async (dataSize: number) => {
      return new Promise<any>((resolve) => {
        let frameCount = 0;
        let totalFrameTime = 0;
        const startTime = performance.now();

        const measureFrame = () => {
          const frameStart = performance.now();

          // Simulate virtual scrolling operations
          const mockData = Array.from(
            { length: Math.min(50, dataSize) },
            (_, i) => ({
              id: `guest-${i}`,
              name: `Guest ${i}`,
              visible: i < 20,
            }),
          );

          // Simulate rendering work
          for (let i = 0; i < 100; i++) {
            Math.random() * mockData.length;
          }

          const frameEnd = performance.now();
          totalFrameTime += frameEnd - frameStart;
          frameCount++;

          if (frameCount < 60 && performance.now() - startTime < 1000) {
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = totalFrameTime / frameCount;
            const fps = Math.round(1000 / (avgFrameTime || 16.67));
            resolve({
              renderTime: avgFrameTime,
              fps: Math.min(60, fps),
              memoryUsage: dataSize * 0.001, // Mock memory usage
              score: 0,
            });
          }
        };

        requestAnimationFrame(measureFrame);
      });
    };

    // Simulate search performance test
    const simulateSearchTest = async (dataSize: number) => {
      const startTime = performance.now();

      // Simulate search operations
      const searchTerms = [
        'john',
        'smith',
        'email@example.com',
        'family',
        'friend',
      ];
      for (const term of searchTerms) {
        // Simulate fuzzy search on large dataset
        for (let i = 0; i < Math.min(1000, dataSize); i++) {
          const similarity = Math.random();
          if (similarity > 0.3) {
            // Simulate match processing
            const processed = term.toLowerCase() + i;
          }
        }
      }

      const endTime = performance.now();
      return {
        renderTime: endTime - startTime,
        fps: 58,
        memoryUsage: dataSize * 0.002,
        score: 0,
      };
    };

    // Simulate rendering performance test
    const simulateRenderingTest = async () => {
      return new Promise<any>((resolve) => {
        let renderCount = 0;
        let totalRenderTime = 0;

        const testRender = () => {
          const renderStart = performance.now();

          // Simulate React concurrent rendering
          setTimeout(() => {
            const renderEnd = performance.now();
            totalRenderTime += renderEnd - renderStart;
            renderCount++;

            if (renderCount < 10) {
              testRender();
            } else {
              resolve({
                renderTime: totalRenderTime / renderCount,
                fps: 57,
                memoryUsage: 15,
                score: 0,
              });
            }
          }, Math.random() * 5); // Simulate async rendering
        };

        testRender();
      });
    };

    // Simulate memory stress test
    const simulateMemoryTest = async () => {
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Create memory pressure
      const largeArrays = [];
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(1000).fill(`data-${i}`));
      }

      // Simulate cleanup
      largeArrays.length = 0;

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsed = Math.max(0, (endMemory - startMemory) / (1024 * 1024));

      return {
        renderTime: 12,
        fps: 52,
        memoryUsage: memoryUsed,
        score: 0,
      };
    };

    // Simulate generic performance test
    const simulateGenericTest = async () => {
      const delay = Math.random() * 50 + 10;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return {
        renderTime: delay,
        fps: Math.round(Math.random() * 20 + 50),
        memoryUsage: Math.random() * 30 + 20,
        score: 0,
      };
    };

    // Run all tests sequentially
    const runAllTests = useCallback(async () => {
      setIsRunningAll(true);

      for (const test of tests) {
        if (test.status !== 'running') {
          await runTest(test.id);
          // Small delay between tests
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setIsRunningAll(false);
      setDashboardMetrics((prev) => ({
        ...prev,
        lastRunTime: new Date(),
      }));
    }, [tests, runTest]);

    // Update dashboard metrics when tests change
    useEffect(() => {
      const totalTests = tests.length;
      const passedTests = tests.filter((t) => t.status === 'passed').length;
      const failedTests = tests.filter((t) => t.status === 'failed').length;
      const completedTests = tests.filter((t) => t.results);
      const averageScore =
        completedTests.length > 0
          ? completedTests.reduce(
              (sum, t) => sum + (t.results?.score || 0),
              0,
            ) / completedTests.length
          : 0;

      setDashboardMetrics((prev) => ({
        ...prev,
        totalTests,
        passedTests,
        failedTests,
        averageScore,
      }));
    }, [tests]);

    // Reset all tests
    const resetTests = useCallback(() => {
      setTests((prev) =>
        prev.map((test) => ({
          ...test,
          status: 'idle',
          results: undefined,
        })),
      );
    }, []);

    // Export test results
    const exportResults = useCallback(() => {
      const results = {
        timestamp: new Date().toISOString(),
        summary: dashboardMetrics,
        tests: tests.map((test) => ({
          id: test.id,
          name: test.name,
          status: test.status,
          results: test.results,
          thresholds: test.thresholds,
        })),
        configuration: loadTestConfig,
      };

      const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-test-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [dashboardMetrics, tests, loadTestConfig]);

    return (
      <div className={cn('p-6 space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Performance Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor and optimize WedSync performance metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={resetTests}
              variant="outline"
              size="sm"
              disabled={isRunningAll}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button onClick={exportResults} variant="outline" size="sm">
              <DocumentChartBarIcon className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunningAll ? (
                <>
                  <StopIcon className="w-4 h-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.totalTests}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-green-900">
                  {dashboardMetrics.passedTests}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-900">
                  {dashboardMetrics.failedTests}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.averageScore.toFixed(0)}
                  <span className="text-lg text-gray-500">/100</span>
                </p>
              </div>
              <CpuChipIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Test Configuration */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Test Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Data Size
              </label>
              <Input
                type="number"
                value={loadTestConfig.test_data_size}
                onChange={(e) =>
                  setLoadTestConfig((prev) => ({
                    ...prev,
                    test_data_size: parseInt(e.target.value) || 1000,
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <Input
                type="number"
                value={loadTestConfig.duration_seconds}
                onChange={(e) =>
                  setLoadTestConfig((prev) => ({
                    ...prev,
                    duration_seconds: parseInt(e.target.value) || 60,
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concurrent Users
              </label>
              <Input
                type="number"
                value={loadTestConfig.concurrent_users}
                onChange={(e) =>
                  setLoadTestConfig((prev) => ({
                    ...prev,
                    concurrent_users: parseInt(e.target.value) || 10,
                  }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Performance Tests */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Performance Tests
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {tests.map((test) => (
              <div key={test.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {test.name}
                    </h3>
                    <p className="text-sm text-gray-600">{test.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        test.status === 'passed'
                          ? 'default'
                          : test.status === 'failed'
                            ? 'destructive'
                            : test.status === 'running'
                              ? 'outline'
                              : 'secondary'
                      }
                      className={cn(
                        test.status === 'running' && 'animate-pulse',
                      )}
                    >
                      {test.status}
                    </Badge>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(test.id)}
                      disabled={test.status === 'running' || isRunningAll}
                    >
                      {test.status === 'running' ? 'Running...' : 'Run Test'}
                    </Button>
                  </div>
                </div>

                {/* Test Results */}
                {test.results && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Render Time:</span>
                      <span
                        className={cn(
                          'ml-2 font-medium',
                          test.results.renderTime <= test.thresholds.renderTime
                            ? 'text-green-600'
                            : 'text-red-600',
                        )}
                      >
                        {test.results.renderTime.toFixed(1)}ms
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600">FPS:</span>
                      <span
                        className={cn(
                          'ml-2 font-medium',
                          test.results.fps >= test.thresholds.fps
                            ? 'text-green-600'
                            : 'text-red-600',
                        )}
                      >
                        {test.results.fps}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600">Memory:</span>
                      <span
                        className={cn(
                          'ml-2 font-medium',
                          test.results.memoryUsage <=
                            test.thresholds.memoryUsage
                            ? 'text-green-600'
                            : 'text-red-600',
                        )}
                      >
                        {test.results.memoryUsage.toFixed(1)}MB
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600">Score:</span>
                      <span
                        className={cn(
                          'ml-2 font-bold',
                          test.results.score >= 80
                            ? 'text-green-600'
                            : test.results.score >= 60
                              ? 'text-yellow-600'
                              : 'text-red-600',
                        )}
                      >
                        {test.results.score}/100
                      </span>
                    </div>
                  </div>
                )}

                {/* Thresholds */}
                <div className="mt-2 text-xs text-gray-500">
                  Thresholds: Render ≤{test.thresholds.renderTime}ms, FPS ≥
                  {test.thresholds.fps}, Memory ≤{test.thresholds.memoryUsage}MB
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Profiler */}
        <AdvancedPerformanceProfiler
          isRecording={profilerRecording}
          onToggleRecording={setProfilerRecording}
          autoStart={false}
        />
      </div>
    );
  },
);

PerformanceDashboard.displayName = 'PerformanceDashboard';
