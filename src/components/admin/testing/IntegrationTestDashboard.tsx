'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Wedding,
  Camera,
  MapPin,
  Heart,
} from 'lucide-react';

// Integration Test Types
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category:
    | 'supplier-coupling'
    | 'workflow'
    | 'performance'
    | 'wedding-scenarios';
  tests: IntegrationTest[];
  status: TestExecutionStatus;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
}

export interface IntegrationTest {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  progress: number;
  duration?: number;
  errorMessage?: string;
  steps: TestStep[];
  weddingContext?: WeddingTestContext;
}

export interface TestStep {
  id: string;
  name: string;
  status: TestStatus;
  duration?: number;
  details?: string;
  supplierAction?: string;
  coupleAction?: string;
}

export interface WeddingTestContext {
  supplierType: 'photographer' | 'venue' | 'florist' | 'caterer';
  coupleId: string;
  weddingDate: string;
  guestCount: number;
  testScenario: string;
}

export interface TestExecution {
  id: string;
  suiteId: string;
  status: TestExecutionStatus;
  startTime: Date;
  endTime?: Date;
  results: TestResult[];
}

export interface TestResult {
  testId: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string;
  metrics?: TestMetrics;
}

export interface TestMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  supplierCouplingHealth: number;
}

export type TestStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped';
export type TestExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface IntegrationTestDashboardProps {
  testSuites: TestSuite[];
  executionHistory: TestExecution[];
  realTimeResults: boolean;
  weddingScenarios: WeddingTestScenario[];
  onExecuteTest: (suiteId: string) => void;
  onStopTest: (suiteId: string) => void;
  onRefreshResults: () => void;
}

export interface WeddingTestScenario {
  id: string;
  name: string;
  description: string;
  supplierTypes: string[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

const IntegrationTestDashboard: React.FC<IntegrationTestDashboardProps> = ({
  testSuites,
  executionHistory,
  realTimeResults,
  weddingScenarios,
  onExecuteTest,
  onStopTest,
  onRefreshResults,
}) => {
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time updates effect
  useEffect(() => {
    if (realTimeResults) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
        onRefreshResults();
      }, 10000); // Update every 10 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeResults, onRefreshResults]);

  // WebSocket connection for real-time updates (mocked for now)
  useEffect(() => {
    if (realTimeResults) {
      // Mock WebSocket connection
      const mockWebSocket = {
        onmessage: (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          if (data.type === 'TEST_UPDATE') {
            onRefreshResults();
          }
        },
      };

      // Simulate real-time updates
      const interval = setInterval(() => {
        if (isExecuting) {
          onRefreshResults();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [realTimeResults, isExecuting, onRefreshResults]);

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-300" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'passed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'skipped':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'supplier-coupling':
        return <Users className="h-4 w-4" />;
      case 'wedding-scenarios':
        return <Wedding className="h-4 w-4" />;
      case 'workflow':
        return <Heart className="h-4 w-4" />;
      case 'performance':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const handleExecuteTest = (suiteId: string) => {
    setIsExecuting(true);
    onExecuteTest(suiteId);
  };

  const handleStopTest = (suiteId: string) => {
    setIsExecuting(false);
    onStopTest(suiteId);
  };

  const getOverallProgress = () => {
    if (testSuites.length === 0) return 0;

    const totalTests = testSuites.reduce(
      (acc, suite) => acc + suite.tests.length,
      0,
    );
    const completedTests = testSuites.reduce(
      (acc, suite) =>
        acc +
        suite.tests.filter(
          (test) => test.status === 'passed' || test.status === 'failed',
        ).length,
      0,
    );

    return Math.round((completedTests / totalTests) * 100);
  };

  const getTestSuiteStats = () => {
    const stats = {
      total: testSuites.length,
      running: testSuites.filter((s) => s.status === 'running').length,
      passed: testSuites.filter((s) => s.status === 'completed').length,
      failed: testSuites.filter((s) => s.status === 'failed').length,
    };
    return stats;
  };

  const stats = getTestSuiteStats();
  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Integration Test Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of wedding workflow integration tests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={realTimeResults ? 'default' : 'secondary'}>
            {realTimeResults ? 'Live Updates' : 'Manual Refresh'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshResults}
            disabled={isExecuting}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isExecuting && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Suites
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.running}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.passed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Overall Test Progress
            <span className="text-sm font-normal text-gray-600">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {testSuites.map((suite) => (
          <Card
            key={suite.id}
            className={cn(
              'transition-all duration-200',
              selectedSuite === suite.id && 'ring-2 ring-blue-500',
              suite.status === 'running' && 'border-blue-300 bg-blue-50/50',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(suite.category)}
                  <CardTitle className="text-lg">{suite.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {suite.category.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(suite.status)}
                  <Badge
                    variant={
                      suite.status === 'running' ? 'default' : 'secondary'
                    }
                  >
                    {suite.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">{suite.description}</p>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Test Progress */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>
                    Tests:{' '}
                    {
                      suite.tests.filter(
                        (t) => t.status === 'passed' || t.status === 'failed',
                      ).length
                    }
                    /{suite.tests.length}
                  </span>
                  {suite.duration && (
                    <span>{Math.round(suite.duration / 1000)}s</span>
                  )}
                </div>

                <Progress
                  value={
                    suite.tests.length > 0
                      ? (suite.tests.filter(
                          (t) => t.status === 'passed' || t.status === 'failed',
                        ).length /
                          suite.tests.length) *
                        100
                      : 0
                  }
                  className="h-1.5"
                />

                {/* Wedding Context Display */}
                {suite.tests.some((t) => t.weddingContext) && (
                  <div className="mt-3 p-2 bg-rose-50 rounded-lg border border-rose-200">
                    <div className="flex items-center space-x-2 text-xs text-rose-700">
                      <Wedding className="h-3 w-3" />
                      <span>Wedding Scenario Active</span>
                    </div>
                  </div>
                )}

                {/* Test List Preview */}
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {suite.tests.slice(0, 3).map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(test.status)}
                          <span className="truncate max-w-48">{test.name}</span>
                        </div>
                        {test.progress > 0 && test.status === 'running' && (
                          <div className="flex items-center space-x-1">
                            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${test.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {test.progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {suite.tests.length > 3 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{suite.tests.length - 3} more tests
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Action Buttons */}
                <Separator />
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedSuite(
                        selectedSuite === suite.id ? null : suite.id,
                      )
                    }
                  >
                    {selectedSuite === suite.id ? 'Collapse' : 'View Details'}
                  </Button>

                  <div className="flex space-x-1">
                    {suite.status === 'running' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopTest(suite.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleExecuteTest(suite.id)}
                        disabled={isExecuting}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Expanded Details */}
            {selectedSuite === suite.id && (
              <CardContent className="pt-0 mt-4 border-t">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Detailed Test Results
                  </h4>

                  <div className="space-y-2">
                    {suite.tests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(test.status)}
                          <div>
                            <div className="text-sm font-medium">
                              {test.name}
                            </div>
                            {test.weddingContext && (
                              <div className="text-xs text-gray-500 flex items-center space-x-1">
                                {test.weddingContext.supplierType ===
                                  'photographer' && (
                                  <Camera className="h-3 w-3" />
                                )}
                                {test.weddingContext.supplierType ===
                                  'venue' && <MapPin className="h-3 w-3" />}
                                <span>
                                  {test.weddingContext.supplierType} •{' '}
                                  {test.weddingContext.guestCount} guests
                                </span>
                              </div>
                            )}
                            {test.errorMessage && (
                              <div className="text-xs text-red-600 mt-1">
                                {test.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {test.status === 'running' && (
                            <div className="text-xs text-blue-600">
                              {test.progress}%
                            </div>
                          )}
                          {test.duration && (
                            <div className="text-xs text-gray-500">
                              {Math.round(test.duration / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Wedding Scenarios Quick Access */}
      {weddingScenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wedding className="h-5 w-5" />
              <span>Wedding Test Scenarios</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weddingScenarios.slice(0, 3).map((scenario) => (
                <div key={scenario.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{scenario.name}</h4>
                    <Badge
                      variant={
                        scenario.complexity === 'complex'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {scenario.complexity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {scenario.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {scenario.estimatedDuration}min
                    </span>
                    <span className="text-gray-500">
                      {scenario.supplierTypes.length} suppliers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntegrationTestDashboard;
