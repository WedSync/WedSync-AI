'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Users,
  Heart,
  Camera,
  MapPin,
  Flower,
  ChefHat,
  Music,
  Car,
  Gift,
  Smartphone,
  Mail,
  MessageSquare,
  FileText,
  Database,
  Zap,
} from 'lucide-react';

// Workflow Test Types
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type:
    | 'supplier-action'
    | 'couple-action'
    | 'system-sync'
    | 'validation'
    | 'notification';
  status: WorkflowStepStatus;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  supplierContext?: SupplierContext;
  coupleContext?: CoupleContext;
  dataFlow?: DataFlowInfo;
  dependencies: string[];
  errorMessage?: string;
  retryCount?: number;
  metrics?: WorkflowStepMetrics;
}

export interface SupplierContext {
  supplierId: string;
  supplierType: SupplierType;
  action: string;
  fieldsMapped: string[];
  integrationEndpoint?: string;
}

export interface CoupleContext {
  coupleId: string;
  action: string;
  touchpoint: 'mobile' | 'web' | 'email' | 'sms';
  fieldsAccessed: string[];
}

export interface DataFlowInfo {
  sourceSystem: string;
  targetSystem: string;
  dataType:
    | 'client-info'
    | 'wedding-details'
    | 'booking-data'
    | 'payment-info'
    | 'timeline-updates';
  recordCount: number;
  syncStatus: 'pending' | 'in-progress' | 'completed' | 'failed';
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  field: string;
  status: 'passed' | 'failed' | 'warning';
  message?: string;
}

export interface WorkflowStepMetrics {
  responseTime: number;
  successRate: number;
  dataIntegrity: number;
  userExperience: number;
}

export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'blocked';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';

export interface TestProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  overallProgress: number;
  estimatedTimeRemaining: number;
}

export interface WorkflowTestVisualizerProps {
  currentTest: IntegrationTest;
  supplierCoupleFlow: WorkflowStep[];
  testProgress: TestProgress;
  onStepRetry: (stepId: string) => void;
  onStepSkip: (stepId: string) => void;
  onFlowPause: () => void;
  onFlowResume: () => void;
  realTimeUpdates?: boolean;
}

export interface IntegrationTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  weddingScenario: WeddingScenario;
  startTime?: Date;
  endTime?: Date;
}

export interface WeddingScenario {
  id: string;
  name: string;
  supplierTypes: SupplierType[];
  coupleProfile: CoupleProfile;
  weddingDetails: WeddingDetails;
  testObjectives: string[];
}

export interface CoupleProfile {
  names: string[];
  weddingDate: string;
  guestCount: number;
  budget: number;
  preferences: string[];
}

export interface WeddingDetails {
  venue: string;
  ceremony: string;
  reception: string;
  theme: string;
  season: string;
}

const WorkflowTestVisualizer: React.FC<WorkflowTestVisualizerProps> = ({
  currentTest,
  supplierCoupleFlow,
  testProgress,
  onStepRetry,
  onStepSkip,
  onFlowPause,
  onFlowResume,
  realTimeUpdates = false,
}) => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [flowDirection, setFlowDirection] = useState<'horizontal' | 'vertical'>(
    'vertical',
  );
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to current step
  useEffect(() => {
    if (autoScroll && testProgress.currentStepIndex >= 0) {
      const currentStepElement = document.getElementById(
        `step-${testProgress.currentStepIndex}`,
      );
      currentStepElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [testProgress.currentStepIndex, autoScroll]);

  const getStepIcon = (step: WorkflowStep) => {
    // Status icons first
    switch (step.status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        // Type-based icons for pending steps
        switch (step.type) {
          case 'supplier-action':
            return getSupplierIcon(step.supplierContext?.supplierType);
          case 'couple-action':
            return getTouchpointIcon(step.coupleContext?.touchpoint);
          case 'system-sync':
            return <Database className="h-4 w-4 text-purple-500" />;
          case 'validation':
            return <CheckCircle className="h-4 w-4 text-indigo-500" />;
          case 'notification':
            return <Zap className="h-4 w-4 text-yellow-500" />;
          default:
            return <Clock className="h-4 w-4 text-gray-400" />;
        }
    }
  };

  const getSupplierIcon = (supplierType?: SupplierType) => {
    switch (supplierType) {
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

  const getTouchpointIcon = (touchpoint?: string) => {
    switch (touchpoint) {
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-blue-500" />;
      case 'web':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepStatusColor = (status: WorkflowStepStatus) => {
    switch (status) {
      case 'running':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'failed':
        return 'border-red-300 bg-red-50';
      case 'blocked':
        return 'border-orange-300 bg-orange-50';
      case 'skipped':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getDataFlowVisualization = (dataFlow?: DataFlowInfo) => {
    if (!dataFlow) return null;

    return (
      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Database className="h-3 w-3 text-purple-500" />
            <span className="font-medium">
              {dataFlow.sourceSystem} → {dataFlow.targetSystem}
            </span>
          </div>
          <Badge
            variant={
              dataFlow.syncStatus === 'completed' ? 'default' : 'secondary'
            }
            className="text-xs"
          >
            {dataFlow.syncStatus}
          </Badge>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-purple-700">
          <span>
            {dataFlow.dataType} ({dataFlow.recordCount} records)
          </span>
          {dataFlow.validationResults && (
            <span>
              {
                dataFlow.validationResults.filter((r) => r.status === 'passed')
                  .length
              }
              /{dataFlow.validationResults.length} validated
            </span>
          )}
        </div>
      </div>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '0s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const currentStepId = supplierCoupleFlow[testProgress.currentStepIndex]?.id;

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Workflow Test Visualizer
          </h2>
          <p className="text-gray-600">
            Real-time supplier-couple interaction flow monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFlowDirection(
                flowDirection === 'vertical' ? 'horizontal' : 'vertical',
              )
            }
          >
            {flowDirection === 'vertical' ? 'Horizontal View' : 'Vertical View'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={autoScroll ? 'bg-blue-50 text-blue-700' : ''}
          >
            Auto-scroll {autoScroll ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* Test Context Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <span>{currentTest.name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  currentTest.status === 'running' ? 'default' : 'secondary'
                }
              >
                {currentTest.status}
              </Badge>
              {realTimeUpdates && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  Live Updates
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Wedding Date:</span>
              <p>{currentTest.weddingScenario.coupleProfile.weddingDate}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Guests:</span>
              <p>{currentTest.weddingScenario.coupleProfile.guestCount}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Suppliers:</span>
              <div className="flex items-center space-x-1 mt-1">
                {currentTest.weddingScenario.supplierTypes.map((type) => (
                  <div key={type} className="flex items-center">
                    {getSupplierIcon(type)}
                  </div>
                ))}
                <span className="ml-2 text-gray-500">
                  ({currentTest.weddingScenario.supplierTypes.length})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="font-medium">Progress:</span>
                  <span className="ml-2">
                    {testProgress.completedSteps}/{testProgress.totalSteps}{' '}
                    steps
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Failed:</span>
                  <span className="ml-2 text-red-600">
                    {testProgress.failedSteps}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {currentTest.status === 'running' ? (
                  <Button variant="outline" size="sm" onClick={onFlowPause}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={onFlowResume}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(testProgress.overallProgress)}%</span>
              </div>
              <Progress value={testProgress.overallProgress} className="h-2" />
            </div>

            {testProgress.estimatedTimeRemaining > 0 && (
              <div className="text-sm text-gray-600">
                Estimated time remaining:{' '}
                {Math.round(testProgress.estimatedTimeRemaining / 60000)}m{' '}
                {Math.round(
                  (testProgress.estimatedTimeRemaining % 60000) / 1000,
                )}
                s
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <div
              className={cn(
                'space-y-4',
                flowDirection === 'horizontal' &&
                  'flex space-y-0 space-x-4 overflow-x-auto pb-4',
              )}
            >
              {supplierCoupleFlow.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Step Card */}
                  <div
                    id={`step-${index}`}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer',
                      getStepStatusColor(step.status),
                      selectedStep === step.id && 'ring-2 ring-blue-500',
                      currentStepId === step.id && 'shadow-lg scale-105',
                      flowDirection === 'horizontal' && 'min-w-72',
                    )}
                    onClick={() =>
                      setSelectedStep(selectedStep === step.id ? null : step.id)
                    }
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border">
                          <span className="text-xs font-bold">{index + 1}</span>
                        </div>
                        {getStepIcon(step)}
                        <span className="font-medium text-sm">{step.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {step.type.replace('-', ' ')}
                        </Badge>
                        {step.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(step.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Description */}
                    <p className="text-xs text-gray-600 mb-3">
                      {step.description}
                    </p>

                    {/* Context Information */}
                    {step.supplierContext && (
                      <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {getSupplierIcon(step.supplierContext.supplierType)}
                            <span className="font-medium capitalize">
                              {step.supplierContext.supplierType}
                            </span>
                          </div>
                          <span className="text-blue-700">
                            {step.supplierContext.fieldsMapped.length} fields
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          {step.supplierContext.action}
                        </div>
                      </div>
                    )}

                    {step.coupleContext && (
                      <div className="mb-2 p-2 bg-rose-50 rounded border border-rose-200">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {getTouchpointIcon(step.coupleContext.touchpoint)}
                            <span className="font-medium capitalize">
                              {step.coupleContext.touchpoint}
                            </span>
                          </div>
                          <span className="text-rose-700">
                            {step.coupleContext.fieldsAccessed.length} fields
                          </span>
                        </div>
                        <div className="text-xs text-rose-700 mt-1">
                          {step.coupleContext.action}
                        </div>
                      </div>
                    )}

                    {/* Data Flow Visualization */}
                    {getDataFlowVisualization(step.dataFlow)}

                    {/* Error Message */}
                    {step.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center space-x-2 text-xs text-red-700">
                          <AlertCircle className="h-3 w-3" />
                          <span>{step.errorMessage}</span>
                        </div>
                        {step.retryCount && step.retryCount > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            Retried {step.retryCount} times
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step Actions */}
                    {(step.status === 'failed' ||
                      step.status === 'blocked') && (
                      <div className="flex space-x-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepRetry(step.id);
                          }}
                          className="text-xs"
                        >
                          Retry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepSkip(step.id);
                          }}
                          className="text-xs"
                        >
                          Skip
                        </Button>
                      </div>
                    )}

                    {/* Metrics Display */}
                    {selectedStep === step.id && step.metrics && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">
                              Response Time:
                            </span>
                            <div className="font-medium">
                              {step.metrics.responseTime}ms
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Success Rate:</span>
                            <div className="font-medium">
                              {step.metrics.successRate}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Data Integrity:
                            </span>
                            <div className="font-medium">
                              {step.metrics.dataIntegrity}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">UX Score:</span>
                            <div className="font-medium">
                              {step.metrics.userExperience}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Arrow (for vertical layout) */}
                  {flowDirection === 'vertical' &&
                    index < supplierCoupleFlow.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                    )}

                  {/* Flow Arrow (for horizontal layout) */}
                  {flowDirection === 'horizontal' &&
                    index < supplierCoupleFlow.length - 1 && (
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
                        <ArrowRight className="h-4 w-4 text-gray-400 bg-white rounded-full border" />
                      </div>
                    )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Step Dependencies (when step is selected) */}
      {selectedStep &&
        supplierCoupleFlow.find((s) => s.id === selectedStep)?.dependencies
          .length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {supplierCoupleFlow
                  .find((s) => s.id === selectedStep)
                  ?.dependencies.map((depId) => {
                    const depStep = supplierCoupleFlow.find(
                      (s) => s.id === depId,
                    );
                    return depStep ? (
                      <div
                        key={depId}
                        className="flex items-center space-x-2 text-sm"
                      >
                        {getStepIcon(depStep)}
                        <span>{depStep.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {depStep.status}
                        </Badge>
                      </div>
                    ) : null;
                  })}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default WorkflowTestVisualizer;
