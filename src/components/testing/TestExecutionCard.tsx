'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  MoreHorizontal,
  Calendar,
  Users,
  Heart,
} from 'lucide-react';

export interface TestExecution {
  id: string;
  name: string;
  description: string;
  status: ExecutionStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  testCount: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    running: number;
  };
  metrics: ExecutionMetrics;
  weddingContext?: WeddingExecutionContext;
  logs: ExecutionLogEntry[];
  canPause: boolean;
  canStop: boolean;
  canRetry: boolean;
}

export interface ExecutionMetrics {
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  passRate: number;
}

export interface WeddingExecutionContext {
  coupleNames: string[];
  weddingDate: string;
  supplierCount: number;
  guestCount: number;
  venue: string;
  testScenario: string;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TestExecutionCardProps {
  execution: TestExecution;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onRetry: (id: string) => void;
  onViewDetails: (id: string) => void;
  compact?: boolean;
  showLogs?: boolean;
  className?: string;
}

const TestExecutionCard: React.FC<TestExecutionCardProps> = ({
  execution,
  onPlay,
  onPause,
  onStop,
  onRetry,
  onViewDetails,
  compact = false,
  showLogs = false,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'paused':
        return 'border-yellow-200 bg-yellow-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'cancelled':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentDuration = () => {
    if (execution.endTime) {
      return execution.endTime.getTime() - execution.startTime.getTime();
    } else if (
      execution.status === 'running' ||
      execution.status === 'paused'
    ) {
      return Date.now() - execution.startTime.getTime();
    }
    return execution.duration;
  };

  const getRunningTestsText = () => {
    const { testCount } = execution;
    if (testCount.running > 0) {
      return `${testCount.running} running`;
    }
    return `${testCount.passed + testCount.failed}/${testCount.total} completed`;
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        getStatusColor(execution.status),
        expanded && 'shadow-lg',
        className,
      )}
    >
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(execution.status)}
            <CardTitle className={cn('text-base', compact && 'text-sm')}>
              {execution.name}
            </CardTitle>
            <Badge
              variant={execution.status === 'running' ? 'default' : 'secondary'}
            >
              {execution.status}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {execution.weddingContext && (
              <Heart className="h-4 w-4 text-rose-500" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-gray-600">{execution.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress: {getRunningTestsText()}</span>
            <span>{Math.round(execution.progress)}%</span>
          </div>
          <Progress value={execution.progress} className="h-2" />
        </div>

        {/* Test Count Summary */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-600 font-medium">
              {execution.testCount.passed}
            </div>
            <div className="text-gray-500">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-medium">
              {execution.testCount.failed}
            </div>
            <div className="text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-medium">
              {execution.testCount.skipped}
            </div>
            <div className="text-gray-500">Skipped</div>
          </div>
          <div className="text-center">
            <div className="text-blue-600 font-medium">
              {execution.testCount.running}
            </div>
            <div className="text-gray-500">Running</div>
          </div>
        </div>

        {/* Execution Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-2 font-medium">
              {formatDuration(getCurrentDuration())}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Pass Rate:</span>
            <span className="ml-2 font-medium">
              {execution.metrics.passRate.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Response Time:</span>
            <span className="ml-2 font-medium">
              {execution.metrics.averageResponseTime}ms
            </span>
          </div>
          <div>
            <span className="text-gray-500">Error Rate:</span>
            <span className="ml-2 font-medium">
              {(execution.metrics.errorRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Wedding Context */}
        {execution.weddingContext && !compact && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="font-medium text-rose-700 text-sm">
                Wedding Test Context
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-rose-600">Couple:</span>
                <span className="ml-1">
                  {execution.weddingContext.coupleNames.join(' & ')}
                </span>
              </div>
              <div>
                <span className="text-rose-600">Date:</span>
                <span className="ml-1">
                  {execution.weddingContext.weddingDate}
                </span>
              </div>
              <div>
                <span className="text-rose-600">Venue:</span>
                <span className="ml-1">{execution.weddingContext.venue}</span>
              </div>
              <div>
                <span className="text-rose-600">Guests:</span>
                <span className="ml-1">
                  {execution.weddingContext.guestCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            {execution.status === 'pending' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onPlay(execution.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}

            {execution.status === 'running' && execution.canPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(execution.id)}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}

            {execution.status === 'paused' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onPlay(execution.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}

            {(execution.status === 'running' ||
              execution.status === 'paused') &&
              execution.canStop && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStop(execution.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              )}

            {(execution.status === 'failed' ||
              execution.status === 'cancelled') &&
              execution.canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(execution.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(execution.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="pt-4 border-t space-y-4">
            {/* Performance Metrics */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Performance Metrics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Throughput:</span>
                  <span className="font-medium">
                    {execution.metrics.throughput} req/s
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Memory:</span>
                  <span className="font-medium">
                    {execution.metrics.memoryUsage}MB
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>CPU:</span>
                  <span className="font-medium">
                    {execution.metrics.cpuUsage}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Errors:</span>
                  <span className="font-medium">
                    {(execution.metrics.errorRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Logs */}
            {showLogs && execution.logs.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Logs</h4>
                <div className="max-h-32 overflow-y-auto bg-gray-900 text-green-400 p-2 rounded font-mono text-xs">
                  {execution.logs.slice(-10).map((log) => (
                    <div key={log.id} className="flex items-start space-x-2">
                      <span className="text-gray-500">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                      <span
                        className={cn(
                          log.level === 'error' && 'text-red-400',
                          log.level === 'warn' && 'text-yellow-400',
                          log.level === 'info' && 'text-blue-400',
                          log.level === 'debug' && 'text-gray-400',
                        )}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wedding Scenario Details */}
            {execution.weddingContext && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Wedding Test Scenario
                </h4>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium text-rose-700">
                        Scenario:
                      </span>
                      <span className="ml-2">
                        {execution.weddingContext.testScenario}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-rose-700">
                        Suppliers:
                      </span>
                      <span className="ml-2">
                        {execution.weddingContext.supplierCount} active
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-rose-500" />
                        <span>{execution.weddingContext.weddingDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-rose-500" />
                        <span>
                          {execution.weddingContext.guestCount} guests
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestExecutionCard;
