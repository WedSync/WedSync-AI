'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  BarChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  Filter,
  Search,
  Download,
  Share,
  Calendar,
  Target,
  Activity,
  AlertCircle,
  Bug,
  Heart,
  Users,
  Camera,
  MapPin,
  Flower,
  ChefHat,
  Music,
  Car,
  Gift,
  Database,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  FileText,
} from 'lucide-react';

// Test Results Analysis Types
export interface TestResultAnalysis {
  id: string;
  testSuiteId: string;
  testSuiteName: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  status: TestExecutionStatus;
  summary: TestSummary;
  results: DetailedTestResult[];
  performance: PerformanceAnalysis;
  weddingContext: WeddingTestContext;
  trends: TrendAnalysis;
  recommendations: TestRecommendation[];
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  warningTests: number;
  executionTime: number;
  passRate: number;
  coveragePercentage: number;
  criticalFailures: number;
  performanceIssues: number;
}

export interface DetailedTestResult {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  status: TestResultStatus;
  duration: number;
  startTime: Date;
  endTime: Date;
  errorMessage?: string;
  stackTrace?: string;
  screenshots?: Screenshot[];
  logs: TestLog[];
  assertions: Assertion[];
  metrics: TestMetrics;
  weddingData?: WeddingTestData;
  supplierContext?: SupplierTestContext;
  retryAttempts: number;
  tags: string[];
}

export interface PerformanceAnalysis {
  averageResponseTime: number;
  peakResponseTime: number;
  throughput: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
  bottlenecks: PerformanceBottleneck[];
  scalabilityMetrics: ScalabilityMetrics;
  weddingLoadMetrics: WeddingLoadMetrics;
}

export interface ResourceUsage {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  database: ResourceMetric;
  network: ResourceMetric;
  storage: ResourceMetric;
}

export interface ResourceMetric {
  average: number;
  peak: number;
  unit: string;
  threshold: number;
  alerts: ResourceAlert[];
}

export interface ResourceAlert {
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  duration: number;
}

export interface PerformanceBottleneck {
  id: string;
  type: 'database' | 'network' | 'computation' | 'memory' | 'external-service';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  suggestedFix: string;
  weddingContext?: string;
}

export interface ScalabilityMetrics {
  concurrentUsers: number;
  requestsPerSecond: number;
  dataVolumeProcessed: number;
  peakLoad: number;
  loadTestResults: LoadTestResult[];
}

export interface WeddingLoadMetrics {
  simultaneousWeddings: number;
  averageGuestsPerWedding: number;
  peakBookingPeriod: string;
  supplierConcurrency: number;
  realTimeUpdatesPerSecond: number;
}

export interface LoadTestResult {
  userCount: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}

export interface WeddingTestContext {
  weddingId: string;
  coupleNames: string[];
  weddingDate: string;
  venue: string;
  guestCount: number;
  supplierCount: number;
  weddingPhase: WeddingPhase;
}

export interface WeddingTestData {
  weddingDetails: any;
  supplierData: any[];
  guestData: any[];
  timelineData: any;
  budgetData: any;
  communicationHistory: any[];
}

export interface SupplierTestContext {
  supplierId: string;
  supplierType: SupplierType;
  integrationStatus: string;
  dataFieldsUsed: string[];
  apiCallsMade: number;
  errorEncountered?: string;
}

export interface TrendAnalysis {
  passRateTrend: TrendData[];
  performanceTrend: TrendData[];
  errorFrequency: ErrorTrendData[];
  supplierReliability: SupplierTrendData[];
  weddingSeasonImpact: SeasonalTrendData[];
}

export interface TrendData {
  date: Date;
  value: number;
  label?: string;
}

export interface ErrorTrendData extends TrendData {
  errorType: string;
  errorCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SupplierTrendData extends TrendData {
  supplierType: SupplierType;
  successRate: number;
  averageResponseTime: number;
  integrationHealth: number;
}

export interface SeasonalTrendData extends TrendData {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weddingCount: number;
  performanceImpact: number;
  commonIssues: string[];
}

export interface TestRecommendation {
  id: string;
  type:
    | 'performance'
    | 'reliability'
    | 'coverage'
    | 'maintenance'
    | 'wedding-specific';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
  weddingBenefit?: string;
}

export interface Screenshot {
  id: string;
  timestamp: Date;
  description: string;
  url: string;
  thumbnailUrl: string;
  context: string;
}

export interface TestLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  source: string;
}

export interface Assertion {
  id: string;
  description: string;
  expected: any;
  actual: any;
  status: 'passed' | 'failed';
  errorMessage?: string;
}

export interface TestMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  databaseQueries: number;
  cacheHits: number;
  userExperienceScore: number;
  weddingWorkflowScore?: number;
}

export type TestExecutionStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'warning';
export type TestCategory =
  | 'functional'
  | 'performance'
  | 'integration'
  | 'e2e'
  | 'regression'
  | 'wedding-workflow';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';
export type WeddingPhase =
  | 'planning'
  | 'coordination'
  | 'wedding-day'
  | 'post-wedding';

export interface TestResultsAnalyzerProps {
  results: TestResultAnalysis[];
  selectedExecution?: string;
  onSelectExecution: (executionId: string) => void;
  onRetryTest: (testId: string) => void;
  onExportResults: (format: 'pdf' | 'json' | 'csv') => void;
  onShareResults: (executionId: string) => void;
  realTimeUpdates?: boolean;
}

const TestResultsAnalyzer: React.FC<TestResultsAnalyzerProps> = ({
  results,
  selectedExecution,
  onSelectExecution,
  onRetryTest,
  onExportResults,
  onShareResults,
  realTimeUpdates = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestResultStatus | 'all'>(
    'all',
  );
  const [categoryFilter, setCategoryFilter] = useState<TestCategory | 'all'>(
    'all',
  );
  const [supplierFilter, setSupplierFilter] = useState<SupplierType | 'all'>(
    'all',
  );
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'trends'>(
    'summary',
  );

  const currentAnalysis = selectedExecution
    ? results.find((r) => r.executionId === selectedExecution)
    : results[0];

  const getStatusIcon = (status: TestResultStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSupplierIcon = (type: SupplierType) => {
    switch (type) {
      case 'photographer':
        return <Camera className="h-4 w-4 text-blue-500" />;
      case 'venue':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'florist':
        return <Flower className="h-4 w-4 text-pink-500" />;
      case 'caterer':
        return <ChefHat className="h-4 w-4 text-orange-500" />;
      case 'musician':
        return <Music className="h-4 w-4 text-purple-500" />;
      case 'transport':
        return <Car className="h-4 w-4 text-gray-500" />;
      default:
        return <Gift className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getCategoryIcon = (category: TestCategory) => {
    switch (category) {
      case 'functional':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'performance':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'integration':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'e2e':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'regression':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case 'wedding-workflow':
        return <Heart className="h-4 w-4 text-rose-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getFilteredResults = () => {
    if (!currentAnalysis) return [];

    return currentAnalysis.results.filter((result) => {
      if (
        searchTerm &&
        !result.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !result.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      if (statusFilter !== 'all' && result.status !== statusFilter)
        return false;
      if (categoryFilter !== 'all' && result.category !== categoryFilter)
        return false;
      if (
        supplierFilter !== 'all' &&
        result.supplierContext?.supplierType !== supplierFilter
      )
        return false;
      return true;
    });
  };

  const getOverallStats = () => {
    if (!currentAnalysis) return null;

    const { summary } = currentAnalysis;
    return {
      passRate: summary.passRate,
      totalTests: summary.totalTests,
      criticalFailures: summary.criticalFailures,
      avgExecutionTime: summary.executionTime / summary.totalTests,
      performanceScore: Math.round(
        100 - (summary.performanceIssues / summary.totalTests) * 100,
      ),
    };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const stats = getOverallStats();

  if (!currentAnalysis) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No test results available for analysis
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Test Results Analyzer
          </h2>
          <p className="text-gray-600">
            Comprehensive visualization and analysis of integration test results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {['summary', 'detailed', 'trends'].map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode as any)}
                className="text-xs capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportResults('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShareResults(currentAnalysis.executionId)}
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Execution Selector */}
      {results.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Label>Execution:</Label>
              <Select
                value={selectedExecution}
                onValueChange={onSelectExecution}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select execution" />
                </SelectTrigger>
                <SelectContent>
                  {results.map((result) => (
                    <SelectItem
                      key={result.executionId}
                      value={result.executionId}
                    >
                      {result.testSuiteName} -{' '}
                      {result.startTime.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {realTimeUpdates && (
                <Badge variant="default" className="text-xs">
                  Live Updates
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary View */}
      {viewMode === 'summary' && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Pass Rate
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.passRate.toFixed(1)}%
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
                    <p className="text-sm font-medium text-gray-600">
                      Total Tests
                    </p>
                    <p className="text-2xl font-bold">{stats?.totalTests}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Critical Failures
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats?.criticalFailures}
                    </p>
                  </div>
                  <Bug className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg Time
                    </p>
                    <p className="text-2xl font-bold">
                      {formatDuration(stats?.avgExecutionTime || 0)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Performance
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.performanceScore}%
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wedding Context */}
          {currentAnalysis.weddingContext && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-rose-500" />
                  <span>Wedding Test Context</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Couple:</span>
                    <p className="font-medium">
                      {currentAnalysis.weddingContext.coupleNames.join(' & ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Wedding Date:</span>
                    <p className="font-medium">
                      {currentAnalysis.weddingContext.weddingDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Venue:</span>
                    <p className="font-medium">
                      {currentAnalysis.weddingContext.venue}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Guests:</span>
                    <p className="font-medium">
                      {currentAnalysis.weddingContext.guestCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Avg Response Time:</span>
                    <p className="font-medium">
                      {formatDuration(
                        currentAnalysis.performance.averageResponseTime,
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Peak Response Time:</span>
                    <p className="font-medium">
                      {formatDuration(
                        currentAnalysis.performance.peakResponseTime,
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Throughput:</span>
                    <p className="font-medium">
                      {currentAnalysis.performance.throughput} req/s
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Error Rate:</span>
                    <p className="font-medium">
                      {(currentAnalysis.performance.errorRate * 100).toFixed(2)}
                      %
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Resource Usage
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(
                      currentAnalysis.performance.resourceUsage,
                    ).map(([key, metric]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{key}:</span>
                        <div className="flex items-center space-x-2">
                          <span>
                            {metric.average.toFixed(1)}
                            {metric.unit}
                          </span>
                          <Progress
                            value={(metric.average / metric.threshold) * 100}
                            className="w-16 h-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wedding Load Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentAnalysis.performance.weddingLoadMetrics && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">
                        Simultaneous Weddings:
                      </span>
                      <p className="font-medium">
                        {
                          currentAnalysis.performance.weddingLoadMetrics
                            .simultaneousWeddings
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Guests/Wedding:</span>
                      <p className="font-medium">
                        {
                          currentAnalysis.performance.weddingLoadMetrics
                            .averageGuestsPerWedding
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Peak Booking Period:
                      </span>
                      <p className="font-medium">
                        {
                          currentAnalysis.performance.weddingLoadMetrics
                            .peakBookingPeriod
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Supplier Concurrency:
                      </span>
                      <p className="font-medium">
                        {
                          currentAnalysis.performance.weddingLoadMetrics
                            .supplierConcurrency
                        }
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">
                        Real-time Updates/sec:
                      </span>
                      <p className="font-medium">
                        {
                          currentAnalysis.performance.weddingLoadMetrics
                            .realTimeUpdatesPerSecond
                        }
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as any)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="e2e">End-to-End</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="wedding-workflow">
                      Wedding Workflow
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={supplierFilter}
                  onValueChange={(value) => setSupplierFilter(value as any)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    <SelectItem value="photographer">Photographer</SelectItem>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="florist">Florist</SelectItem>
                    <SelectItem value="caterer">Caterer</SelectItem>
                    <SelectItem value="musician">Musician</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>
                Test Results ({getFilteredResults().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {getFilteredResults().map((result) => (
                    <div
                      key={result.id}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-all duration-200',
                        selectedResult === result.id && 'ring-2 ring-blue-500',
                        result.status === 'failed' &&
                          'border-red-200 bg-red-50',
                        result.status === 'passed' &&
                          'border-green-200 bg-green-50',
                        result.status === 'warning' &&
                          'border-yellow-200 bg-yellow-50',
                      )}
                      onClick={() =>
                        setSelectedResult(
                          selectedResult === result.id ? null : result.id,
                        )
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(result.status)}
                          {getCategoryIcon(result.category)}
                          <span className="font-medium">{result.name}</span>
                          {result.supplierContext &&
                            getSupplierIcon(
                              result.supplierContext.supplierType,
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDuration(result.duration)}
                          </span>
                          {result.retryAttempts > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {result.retryAttempts} retries
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {result.description}
                      </p>

                      {result.errorMessage && (
                        <Alert className="mb-2">
                          <Bug className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {result.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Test Metrics */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Response:</span>
                          <span className="ml-1 font-medium">
                            {formatDuration(result.metrics.responseTime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Memory:</span>
                          <span className="ml-1 font-medium">
                            {formatBytes(result.metrics.memoryUsage)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">DB Queries:</span>
                          <span className="ml-1 font-medium">
                            {result.metrics.databaseQueries}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">UX Score:</span>
                          <span className="ml-1 font-medium">
                            {result.metrics.userExperienceScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedResult === result.id && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Assertions */}
                          {result.assertions.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                Assertions ({result.assertions.length})
                              </h4>
                              <div className="space-y-1">
                                {result.assertions.map((assertion) => (
                                  <div
                                    key={assertion.id}
                                    className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                                  >
                                    <div className="flex items-center space-x-2">
                                      {assertion.status === 'passed' ? (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <XCircle className="h-3 w-3 text-red-500" />
                                      )}
                                      <span>{assertion.description}</span>
                                    </div>
                                    <div className="text-gray-600">
                                      Expected:{' '}
                                      {JSON.stringify(assertion.expected)} |
                                      Actual: {JSON.stringify(assertion.actual)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Screenshots */}
                          {result.screenshots &&
                            result.screenshots.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Screenshots ({result.screenshots.length})
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                  {result.screenshots.map((screenshot) => (
                                    <div
                                      key={screenshot.id}
                                      className="text-center"
                                    >
                                      <img
                                        src={screenshot.thumbnailUrl}
                                        alt={screenshot.description}
                                        className="w-full h-16 object-cover rounded border cursor-pointer"
                                        onClick={() =>
                                          window.open(screenshot.url, '_blank')
                                        }
                                      />
                                      <p className="text-xs text-gray-600 mt-1 truncate">
                                        {screenshot.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Logs */}
                          {result.logs.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                Logs ({result.logs.length})
                              </h4>
                              <ScrollArea className="max-h-32">
                                <div className="space-y-1">
                                  {result.logs.slice(-10).map((log) => (
                                    <div
                                      key={log.id}
                                      className="text-xs p-1 font-mono"
                                    >
                                      <span className="text-gray-500">
                                        [{log.timestamp.toLocaleTimeString()}]
                                      </span>
                                      <span
                                        className={cn(
                                          'ml-2 font-medium',
                                          log.level === 'error' &&
                                            'text-red-600',
                                          log.level === 'warn' &&
                                            'text-yellow-600',
                                          log.level === 'info' &&
                                            'text-blue-600',
                                        )}
                                      >
                                        [{log.level.toUpperCase()}]
                                      </span>
                                      <span className="ml-2">
                                        {log.message}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-end space-x-2">
                            {result.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRetryTest(result.id);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {getFilteredResults().length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No test results match the current filters
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && (
        <div className="space-y-6">
          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Pass Rate Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Trend visualization would be implemented here
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Performance Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Performance trends would be shown here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {currentAnalysis.recommendations &&
            currentAnalysis.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentAnalysis.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={cn(
                          'p-4 border rounded-lg',
                          getPriorityColor(rec.priority),
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {rec.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.effort} effort
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{rec.description}</p>
                        <div className="text-sm">
                          <span className="font-medium">Impact:</span>{' '}
                          {rec.impact}
                        </div>
                        {rec.weddingBenefit && (
                          <div className="text-sm">
                            <span className="font-medium">
                              Wedding Benefit:
                            </span>{' '}
                            {rec.weddingBenefit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
};

export default TestResultsAnalyzer;
