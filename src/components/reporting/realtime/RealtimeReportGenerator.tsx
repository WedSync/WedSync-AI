'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  TrendingUp,
  Database,
  Wifi,
  WifiOff,
  Bell,
  Download,
  Eye,
  Settings,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react';

import {
  ReportTemplate,
  RealtimeReportJob,
  ReportGenerationStatus,
  ReportProgressUpdate,
  WebSocketMessage,
  WEDDING_COLORS,
} from '../types';

interface RealtimeReportGeneratorProps {
  template: ReportTemplate;
  onReportGenerated: (reportData: any) => void;
  onCancel: () => void;
  websocketUrl?: string;
  className?: string;
}

interface ReportProgress {
  jobId: string;
  status: ReportGenerationStatus;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  startTime: Date;
  completedSteps: string[];
  totalSteps: number;
}

const GENERATION_STEPS = [
  {
    id: 'init',
    name: 'Initializing',
    description: 'Setting up report generation',
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Verifying permissions and access',
  },
  {
    id: 'data-fetch',
    name: 'Fetching Data',
    description: 'Collecting wedding and booking data',
  },
  {
    id: 'processing',
    name: 'Processing',
    description: 'Analyzing and transforming data',
  },
  {
    id: 'charts',
    name: 'Building Charts',
    description: 'Generating visualizations',
  },
  {
    id: 'formatting',
    name: 'Formatting',
    description: 'Applying styling and layout',
  },
  {
    id: 'finalizing',
    name: 'Finalizing',
    description: 'Preparing report for delivery',
  },
];

const StatusIndicator = ({
  status,
  isConnected,
}: {
  status: ReportGenerationStatus;
  isConnected: boolean;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'running':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'cancelled':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'running':
        return RefreshCw;
      case 'completed':
        return CheckCircle;
      case 'failed':
        return AlertCircle;
      case 'cancelled':
        return Square;
      default:
        return Clock;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <StatusIcon
          className={`h-5 w-5 ${getStatusColor()} ${
            status === 'running' ? 'animate-spin' : ''
          }`}
        />

        {/* Connection indicator */}
        <div
          className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
      </div>

      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
};

const ProgressBar = ({
  progress,
  status,
  animated = true,
}: {
  progress: number;
  status: ReportGenerationStatus;
  animated?: boolean;
}) => {
  const getProgressColor = () => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <motion.div
        className={`h-full ${getProgressColor()} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        transition={{ duration: animated ? 0.5 : 0 }}
      />
    </div>
  );
};

const StepProgress = ({
  steps,
  currentStep,
  completedSteps,
}: {
  steps: typeof GENERATION_STEPS;
  currentStep: string;
  completedSteps: string[];
}) => {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const isUpcoming = !isCompleted && !isCurrent;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
              isCurrent
                ? 'bg-blue-50 border border-blue-200'
                : isCompleted
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-3 w-3" />
              ) : isCurrent ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <div className="flex-1">
              <div
                className={`text-sm font-medium ${
                  isCurrent
                    ? 'text-blue-900'
                    : isCompleted
                      ? 'text-green-900'
                      : 'text-gray-700'
                }`}
              >
                {step.name}
              </div>
              <div
                className={`text-xs ${
                  isCurrent
                    ? 'text-blue-600'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-500'
                }`}
              >
                {step.description}
              </div>
            </div>

            {isCurrent && (
              <div className="text-blue-500">
                <Activity className="h-4 w-4 animate-pulse" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const ReportMetrics = ({
  progress,
  startTime,
}: {
  progress: ReportProgress;
  startTime: Date;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const elapsedTime = Math.floor(
    (currentTime.getTime() - startTime.getTime()) / 1000,
  );
  const estimatedTotal = progress.estimatedTimeRemaining
    ? elapsedTime + progress.estimatedTimeRemaining
    : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Clock className="h-4 w-4 text-gray-500 mr-1" />
        </div>
        <div className="text-sm font-medium text-gray-900">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-xs text-gray-500">Elapsed</div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
        </div>
        <div className="text-sm font-medium text-gray-900">
          {progress.progress.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-500">Complete</div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center mb-1">
          <Zap className="h-4 w-4 text-green-500 mr-1" />
        </div>
        <div className="text-sm font-medium text-gray-900">
          {progress.estimatedTimeRemaining
            ? formatTime(progress.estimatedTimeRemaining)
            : '--:--'}
        </div>
        <div className="text-xs text-gray-500">Remaining</div>
      </div>
    </div>
  );
};

export const RealtimeReportGenerator: React.FC<
  RealtimeReportGeneratorProps
> = ({
  template,
  onReportGenerated,
  onCancel,
  websocketUrl = 'ws://localhost:8080/ws/reports',
  className = '',
}) => {
  const [progress, setProgress] = useState<ReportProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      wsRef.current = new WebSocket(websocketUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'progress':
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      ...message.data,
                      progress: Math.min(
                        Math.max(message.data.progress || 0, 0),
                        100,
                      ),
                    }
                  : null,
              );
              break;

            case 'notification':
              setNotifications((prev) =>
                [...prev, message.data.message].slice(-5),
              );
              break;

            case 'completed':
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      status: 'completed',
                      progress: 100,
                      currentStep: 'done',
                    }
                  : null,
              );
              onReportGenerated(message.data.reportData);
              break;

            case 'error':
              setProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      status: 'failed',
                      errorMessage: message.data.error,
                    }
                  : null,
              );
              setError(message.data.error);
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt to reconnect after a delay if we had a job running
        if (progress?.status === 'running') {
          setTimeout(() => {
            connectWebSocket();
          }, 2000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error - check your network connection');
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to establish real-time connection');
    }
  }, [websocketUrl, progress?.status, onReportGenerated]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const startReportGeneration = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }

    const jobId = `report_${Date.now()}`;
    jobIdRef.current = jobId;

    const initialProgress: ReportProgress = {
      jobId,
      status: 'pending',
      progress: 0,
      currentStep: 'init',
      startTime: new Date(),
      completedSteps: [],
      totalSteps: GENERATION_STEPS.length,
    };

    setProgress(initialProgress);
    setError(null);
    setNotifications([]);

    // Send start command via WebSocket
    wsRef.current.send(
      JSON.stringify({
        type: 'start_generation',
        data: {
          jobId,
          template: template,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }, [template]);

  const cancelReportGeneration = useCallback(() => {
    if (wsRef.current && jobIdRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: 'cancel_generation',
          data: {
            jobId: jobIdRef.current,
          },
        }),
      );
    }

    setProgress((prev) =>
      prev
        ? {
            ...prev,
            status: 'cancelled',
          }
        : null,
    );

    onCancel();
  }, [onCancel]);

  const pauseReportGeneration = useCallback(() => {
    if (wsRef.current && jobIdRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: 'pause_generation',
          data: {
            jobId: jobIdRef.current,
          },
        }),
      );
    }
  }, []);

  const resumeReportGeneration = useCallback(() => {
    if (wsRef.current && jobIdRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: 'resume_generation',
          data: {
            jobId: jobIdRef.current,
          },
        }),
      );
    }
  }, []);

  const isGenerating = progress?.status === 'running';
  const isCompleted = progress?.status === 'completed';
  const hasFailed = progress?.status === 'failed';

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Real-time Report Generation
          </h3>
          <p className="text-sm text-gray-600">Generating: {template.name}</p>
        </div>

        <StatusIndicator
          status={progress?.status || 'pending'}
          isConnected={isConnected}
        />
      </div>

      {/* Connection Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            {!isConnected && (
              <button
                onClick={connectWebSocket}
                className="ml-auto text-xs text-red-600 hover:text-red-800 underline"
              >
                Retry Connection
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" />
              {notification}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Content */}
      <div className="space-y-6">
        {!progress ? (
          // Initial State
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-wedding-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-wedding-primary" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Generate Report
            </h4>
            <p className="text-gray-600 mb-6">
              This will create a real-time report based on your wedding data and
              the selected template.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={startReportGeneration}
                disabled={!isConnected}
                className="flex items-center gap-2 bg-wedding-primary text-white px-6 py-3 rounded-md hover:bg-wedding-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Play className="h-4 w-4" />
                Start Generation
              </button>

              <button
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>

            {!isConnected && (
              <p className="mt-3 text-sm text-red-600">
                ⚠️ Not connected to server - please check your connection
              </p>
            )}
          </div>
        ) : (
          // Progress State
          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-600">
                  {progress.progress.toFixed(0)}%
                </span>
              </div>
              <ProgressBar
                progress={progress.progress}
                status={progress.status}
              />
            </div>

            {/* Metrics */}
            <ReportMetrics progress={progress} startTime={progress.startTime} />

            {/* Step Progress */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Generation Steps
              </h4>
              <StepProgress
                steps={GENERATION_STEPS}
                currentStep={progress.currentStep}
                completedSteps={progress.completedSteps}
              />
            </div>

            {/* Error Message */}
            {hasFailed && progress.errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-900">
                    Generation Failed
                  </span>
                </div>
                <p className="text-sm text-red-700">{progress.errorMessage}</p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-200">
              {isCompleted ? (
                <>
                  <button
                    onClick={() => onReportGenerated({})} // This should trigger the view
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View Report
                  </button>

                  <button
                    onClick={() => {
                      /* TODO: Implement download */
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </>
              ) : hasFailed ? (
                <button
                  onClick={startReportGeneration}
                  className="flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Generation
                </button>
              ) : isGenerating ? (
                <>
                  <button
                    onClick={pauseReportGeneration}
                    className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors font-medium"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>

                  <button
                    onClick={cancelReportGeneration}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    <Square className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={resumeReportGeneration}
                  className="flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors font-medium"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}

              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeReportGenerator;
