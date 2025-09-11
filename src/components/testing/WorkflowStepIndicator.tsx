'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  ArrowDown,
  Pause,
  Play,
  Users,
  Database,
  Zap,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Camera,
  MapPin,
  Flower,
  ChefHat,
  Music,
  Car,
  Gift,
  Heart,
} from 'lucide-react';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: StepType;
  status: StepStatus;
  progress?: number;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  supplierContext?: SupplierStepContext;
  coupleContext?: CoupleStepContext;
  dependencies?: string[];
  retryCount?: number;
  isBlocking?: boolean;
}

export interface SupplierStepContext {
  supplierType: SupplierType;
  supplierId: string;
  action: string;
  fieldsAffected: string[];
  integrationPoint?: string;
}

export interface CoupleStepContext {
  coupleId: string;
  action: string;
  touchpoint: TouchpointType;
  fieldsAccessed: string[];
  userExperienceImpact?: 'low' | 'medium' | 'high';
}

export type StepType =
  | 'supplier-action'
  | 'couple-action'
  | 'system-sync'
  | 'validation'
  | 'notification'
  | 'data-flow';
export type StepStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';
export type TouchpointType =
  | 'web'
  | 'mobile'
  | 'email'
  | 'sms'
  | 'app-notification';

export interface WorkflowStepIndicatorProps {
  steps: WorkflowStep[];
  currentStepIndex?: number;
  orientation?: 'horizontal' | 'vertical';
  showProgress?: boolean;
  showDependencies?: boolean;
  compact?: boolean;
  onStepClick?: (stepId: string) => void;
  onStepRetry?: (stepId: string) => void;
  className?: string;
}

const WorkflowStepIndicator: React.FC<WorkflowStepIndicatorProps> = ({
  steps,
  currentStepIndex = -1,
  orientation = 'vertical',
  showProgress = true,
  showDependencies = false,
  compact = false,
  onStepClick,
  onStepRetry,
  className,
}) => {
  const getStepIcon = (step: WorkflowStep) => {
    // Status takes precedence over type for icon selection
    switch (step.status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'pending':
      default:
        return getTypeIcon(step);
    }
  };

  const getTypeIcon = (step: WorkflowStep) => {
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
      case 'data-flow':
        return <ArrowRight className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
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

  const getTouchpointIcon = (touchpoint?: TouchpointType) => {
    switch (touchpoint) {
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-blue-500" />;
      case 'web':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'app-notification':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepColor = (step: WorkflowStep, index: number) => {
    if (index === currentStepIndex) {
      return 'border-blue-300 bg-blue-50 shadow-md';
    }

    switch (step.status) {
      case 'running':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'failed':
        return 'border-red-300 bg-red-50';
      case 'blocked':
        return 'border-orange-300 bg-orange-50';
      case 'paused':
        return 'border-yellow-300 bg-yellow-50';
      case 'skipped':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStepNumber = (index: number) => {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-gray-300 text-xs font-bold">
        {index + 1}
      </div>
    );
  };

  const isStepClickable = (step: WorkflowStep) => {
    return (
      onStepClick &&
      (step.status === 'completed' ||
        step.status === 'failed' ||
        step.status === 'blocked')
    );
  };

  return (
    <div
      className={cn(
        'space-y-2',
        orientation === 'horizontal' &&
          'flex space-x-4 space-y-0 overflow-x-auto pb-4',
        className,
      )}
    >
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          {/* Step Card */}
          <div
            className={cn(
              'p-3 rounded-lg border-2 transition-all duration-200',
              getStepColor(step, index),
              isStepClickable(step) && 'cursor-pointer hover:shadow-lg',
              compact && 'p-2',
              orientation === 'horizontal' && 'min-w-64 flex-shrink-0',
            )}
            onClick={() => isStepClickable(step) && onStepClick?.(step.id)}
          >
            {/* Step Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {!compact && getStepNumber(index)}
                {getStepIcon(step)}
                <span
                  className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}
                >
                  {step.name}
                </span>
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
                {step.retryCount && step.retryCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {step.retryCount} retries
                  </Badge>
                )}
              </div>
            </div>

            {/* Step Description */}
            {!compact && (
              <p className="text-xs text-gray-600 mb-2">{step.description}</p>
            )}

            {/* Progress Bar */}
            {showProgress &&
              step.progress !== undefined &&
              step.status === 'running' && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="h-1" />
                </div>
              )}

            {/* Context Information */}
            {!compact && (
              <>
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
                        {step.supplierContext.fieldsAffected.length} fields
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
                      <div className="flex items-center space-x-2">
                        <span className="text-rose-700">
                          {step.coupleContext.fieldsAccessed.length} fields
                        </span>
                        {step.coupleContext.userExperienceImpact && (
                          <Badge
                            variant={
                              step.coupleContext.userExperienceImpact === 'high'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {step.coupleContext.userExperienceImpact} UX
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-rose-700 mt-1">
                      {step.coupleContext.action}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {step.errorMessage && (
              <div className="mb-2 p-2 bg-red-50 rounded border border-red-200">
                <div className="flex items-center space-x-2 text-xs text-red-700">
                  <XCircle className="h-3 w-3" />
                  <span>{step.errorMessage}</span>
                </div>
              </div>
            )}

            {/* Blocking Indicator */}
            {step.isBlocking && (
              <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                <div className="flex items-center space-x-2 text-xs text-orange-700">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Blocking step - other tests may be affected</span>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {showDependencies &&
              step.dependencies &&
              step.dependencies.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600 font-medium">
                    Dependencies:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step.dependencies.map((depId) => {
                      const depStep = steps.find((s) => s.id === depId);
                      return depStep ? (
                        <Badge
                          key={depId}
                          variant="outline"
                          className="text-xs"
                        >
                          {depStep.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            {(step.status === 'failed' || step.status === 'blocked') &&
              onStepRetry && (
                <div className="flex justify-end pt-2 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepRetry(step.id);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Retry Step
                  </button>
                </div>
              )}
          </div>

          {/* Connection Line/Arrow */}
          {orientation === 'vertical' && index < steps.length - 1 && (
            <div className="flex justify-center py-1">
              <ArrowDown className="h-4 w-4 text-gray-400" />
            </div>
          )}

          {orientation === 'horizontal' && index < steps.length - 1 && (
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
              <ArrowRight className="h-4 w-4 text-gray-400 bg-white rounded-full border" />
            </div>
          )}
        </div>
      ))}

      {/* Wedding Context Summary */}
      {steps.some((step) => step.supplierContext || step.coupleContext) &&
        !compact && (
          <div className="mt-4 p-3 bg-gradient-to-r from-rose-50 to-blue-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="font-medium text-sm text-gray-900">
                Wedding Workflow Context
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Supplier Steps:</span>
                <span className="ml-2 font-medium">
                  {steps.filter((step) => step.supplierContext).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Couple Steps:</span>
                <span className="ml-2 font-medium">
                  {steps.filter((step) => step.coupleContext).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">System Steps:</span>
                <span className="ml-2 font-medium">
                  {
                    steps.filter(
                      (step) =>
                        step.type === 'system-sync' ||
                        step.type === 'validation',
                    ).length
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Notifications:</span>
                <span className="ml-2 font-medium">
                  {steps.filter((step) => step.type === 'notification').length}
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default WorkflowStepIndicator;
