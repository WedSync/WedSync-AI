'use client';

import React, { useState, useMemo } from 'react';
import {
  AtRiskSupplierCardProps,
  ChurnRiskLevel,
  RetentionAction,
  RetentionRecommendation,
} from '@/types/churn-intelligence';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  TrendingDown,
  Clock,
  Ticket,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronUp,
  Shield,
  User,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

export default function AtRiskSupplierCard({
  supplier,
  riskFactors,
  recommendedActions = [],
  onActionExecute,
  onViewDetails,
  compact = false,
}: AtRiskSupplierCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isExecutingAction, setIsExecutingAction] =
    useState<RetentionAction | null>(null);

  // Generate AI recommendations based on risk factors
  const aiRecommendations = useMemo((): RetentionRecommendation[] => {
    const recommendations: RetentionRecommendation[] = [];

    // Analyze primary risk factors and generate recommendations
    if (supplier.daysSinceLastLogin >= 15) {
      recommendations.push({
        action: RetentionAction.SCHEDULE_CALL,
        priority: 'critical' as any,
        successProbability: 75,
        estimatedEffort: 'medium',
        expectedOutcome: 'Re-engagement with platform',
        reasoning: `No login for ${supplier.daysSinceLastLogin} days indicates disengagement`,
        timeFrame: 'within 24 hours',
        requiredResources: ['CSM time: 30 minutes', 'Call scheduling system'],
      });
    }

    if (supplier.openSupportTickets > 0) {
      recommendations.push({
        action: RetentionAction.ASSIGN_CSM,
        priority: 'high' as any,
        successProbability: 85,
        estimatedEffort: 'high',
        expectedOutcome: 'Resolution of support issues',
        reasoning: `${supplier.openSupportTickets} open tickets need dedicated attention`,
        timeFrame: 'within 4 hours',
        requiredResources: [
          'Senior CSM assignment',
          'Escalation to technical team',
        ],
      });
    }

    if (supplier.paymentFailures30d > 0) {
      recommendations.push({
        action: RetentionAction.OFFER_DISCOUNT,
        priority: 'high' as any,
        successProbability: 60,
        estimatedEffort: 'low',
        expectedOutcome: 'Payment recovery and retention',
        reasoning: 'Payment issues may indicate financial constraints',
        timeFrame: 'within 2 hours',
        requiredResources: [
          'Billing team approval',
          'Discount code generation',
        ],
      });
    }

    if (supplier.featureUsageScore < 30) {
      recommendations.push({
        action: RetentionAction.PROVIDE_TRAINING,
        priority: 'medium' as any,
        successProbability: 70,
        estimatedEffort: 'medium',
        expectedOutcome: 'Increased feature adoption',
        reasoning: 'Low feature usage suggests need for training',
        timeFrame: 'within 1 week',
        requiredResources: [
          'Training session: 45 minutes',
          'Product specialist',
        ],
      });
    }

    return recommendations.sort(
      (a, b) => b.successProbability - a.successProbability,
    );
  }, [supplier]);

  const handleActionExecute = async (action: RetentionAction) => {
    setIsExecutingAction(action);

    try {
      await onActionExecute(action);
      toast.success(`${action.replace('_', ' ')} initiated successfully`);
    } catch (error) {
      toast.error(`Failed to execute ${action.replace('_', ' ')}`);
    } finally {
      setIsExecutingAction(null);
    }
  };

  const getRiskLevelColor = (level: ChurnRiskLevel) => {
    switch (level) {
      case ChurnRiskLevel.CRITICAL:
        return {
          bg: 'bg-red-50',
          border: 'border-l-red-500',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
        };
      case ChurnRiskLevel.HIGH_RISK:
        return {
          bg: 'bg-orange-50',
          border: 'border-l-orange-500',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
        };
      case ChurnRiskLevel.ATTENTION:
        return {
          bg: 'bg-yellow-50',
          border: 'border-l-yellow-500',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-l-blue-500',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-800',
        };
    }
  };

  const riskColors = getRiskLevelColor(supplier.churnRiskLevel);

  const getSupplierTypeIcon = (type: string) => {
    // Return appropriate icon based on supplier type
    return <User className="h-4 w-4" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getRiskScoreDisplay = (score: number) => {
    const percentage = Math.round(score);
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={
                score >= 85 ? '#ef4444' : score >= 70 ? '#f97316' : '#eab308'
              }
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${percentage * 2.51}, 251`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900">
              {percentage}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-600">Risk Score</div>
      </div>
    );
  };

  return (
    <Card
      variant="default"
      padding="md"
      interactive={!compact}
      className={cn(
        'border-l-4 transition-all duration-200',
        riskColors.border,
        riskColors.bg,
        compact ? 'p-4' : 'p-6',
      )}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            {getSupplierTypeIcon(supplier.supplierType)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {supplier.supplierName}
            </h3>
            <p className="text-sm text-gray-600 capitalize">
              {supplier.supplierType.replace('_', ' ')}
            </p>

            {supplier.predictedChurnDate && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-600 font-medium">
                  Churn predicted:{' '}
                  {format(supplier.predictedChurnDate, 'MMM dd')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getRiskScoreDisplay(supplier.churnRiskScore)}
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="flex items-center justify-between mb-4">
        <Badge className={cn('text-xs font-medium', riskColors.badge)}>
          {supplier.churnRiskLevel.replace('_', ' ').toUpperCase()}
        </Badge>

        <div className="text-xs text-gray-600">
          ${formatCurrency(supplier.subscriptionValue)} value
        </div>
      </div>

      {/* Risk Factors Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Last login:</span>
          <span className="font-medium text-gray-900">
            {supplier.daysSinceLastLogin}d ago
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <TrendingDown className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Usage:</span>
          <span className="font-medium text-gray-900">
            {supplier.featureUsageScore}/100
          </span>
        </div>

        {supplier.openSupportTickets > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-orange-500" />
            <span className="text-gray-600">Open tickets:</span>
            <span className="font-medium text-orange-700">
              {supplier.openSupportTickets}
            </span>
          </div>
        )}

        {supplier.paymentFailures30d > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-red-500" />
            <span className="text-gray-600">Payment issues:</span>
            <span className="font-medium text-red-700">
              {supplier.paymentFailures30d}
            </span>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {!compact && (
        <div className="space-y-4">
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 w-full justify-between"
          >
            <span>Risk Factor Details</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              {/* Risk Factors Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Risk Factors Analysis
                </h4>
                {riskFactors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          factor.severity === 'critical'
                            ? 'bg-red-500'
                            : factor.severity === 'high'
                              ? 'bg-orange-500'
                              : factor.severity === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500',
                        )}
                      />
                      <span className="text-sm text-gray-700">
                        {factor.description}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {factor.score}/100
                    </Badge>
                  </div>
                ))}
              </div>

              {/* AI Recommendations */}
              {aiRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Recommended Actions
                  </h4>
                  <div className="space-y-2">
                    {aiRecommendations.slice(0, 2).map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 rounded-md border border-blue-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-blue-900 capitalize">
                                {rec.action.replace('_', ' ')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {rec.successProbability}% success
                              </Badge>
                            </div>
                            <p className="text-xs text-blue-700">
                              {rec.reasoning}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Expected: {rec.expectedOutcome} • Timeline:{' '}
                              {rec.timeFrame}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
        {/* Priority actions based on risk level */}
        {supplier.churnRiskLevel === ChurnRiskLevel.CRITICAL && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              handleActionExecute(RetentionAction.ESCALATE_CRITICAL)
            }
            disabled={isExecutingAction === RetentionAction.ESCALATE_CRITICAL}
            className="gap-2 flex-1"
          >
            <AlertTriangle className="h-4 w-4" />
            Emergency Response
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleActionExecute(RetentionAction.SCHEDULE_CALL)}
          disabled={isExecutingAction === RetentionAction.SCHEDULE_CALL}
          className="gap-2 flex-1"
        >
          <Phone className="h-4 w-4" />
          Schedule Call
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleActionExecute(RetentionAction.SEND_EMAIL)}
          disabled={isExecutingAction === RetentionAction.SEND_EMAIL}
          className="gap-2 flex-1"
        >
          <Mail className="h-4 w-4" />
          Send Email
        </Button>

        {supplier.churnRiskLevel === ChurnRiskLevel.HIGH_RISK && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleActionExecute(RetentionAction.OFFER_DISCOUNT)}
            disabled={isExecutingAction === RetentionAction.OFFER_DISCOUNT}
            className="gap-2 flex-1"
          >
            <DollarSign className="h-4 w-4" />
            Offer Discount
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      {!compact && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => handleActionExecute(RetentionAction.ASSIGN_CSM)}
              disabled={isExecutingAction === RetentionAction.ASSIGN_CSM}
              className="gap-1 text-xs"
            >
              <User className="h-3 w-3" />
              Assign CSM
            </Button>

            <Button
              variant="tertiary"
              size="sm"
              onClick={() =>
                handleActionExecute(RetentionAction.PROVIDE_TRAINING)
              }
              disabled={isExecutingAction === RetentionAction.PROVIDE_TRAINING}
              className="gap-1 text-xs"
            >
              <Calendar className="h-3 w-3" />
              Training
            </Button>
          </div>

          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(supplier.supplierId)}
              className="gap-1 text-xs"
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
          )}
        </div>
      )}

      {/* Compact Mode Footer */}
      {compact && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            {formatDistanceToNow(supplier.lastActivityDate, {
              addSuffix: true,
            })}
          </div>

          <div className="flex gap-1">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1 px-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(supplier.supplierId)}
                className="gap-1 px-2"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Wedding Context Indicator */}
      {supplier.weddingSeasonActivity === 'peak' && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-purple-100 text-purple-800 text-xs">
            Peak Season
          </Badge>
        </div>
      )}
    </Card>
  );
}
