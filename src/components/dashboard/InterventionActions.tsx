'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card-untitled';
import { Avatar } from '@/components/ui/avatar';
import {
  Phone,
  Mail,
  BookOpen,
  TrendingUp,
  Heart,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  User,
  Calendar,
} from 'lucide-react';
import type {
  SupplierHealthMetrics,
  InterventionAction,
} from '@/types/supplier-health';

interface InterventionActionsProps {
  suppliers: SupplierHealthMetrics[];
  onActionExecuted: (
    supplierId: string,
    intervention: InterventionAction,
  ) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export function InterventionActions({
  suppliers,
  onActionExecuted,
  loading = false,
  className = '',
}: InterventionActionsProps) {
  const [executingActions, setExecutingActions] = useState<Set<string>>(
    new Set(),
  );

  // Group and sort all interventions by priority and due date
  const prioritizedInterventions = useMemo(() => {
    const allInterventions: Array<{
      supplier: SupplierHealthMetrics;
      intervention: InterventionAction;
      key: string;
    }> = [];

    suppliers.forEach((supplier) => {
      supplier.interventionsNeeded.forEach((intervention) => {
        allInterventions.push({
          supplier,
          intervention,
          key: `${supplier.supplier_id}-${intervention.id}`,
        });
      });
    });

    // Sort by priority and due date
    return allInterventions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.intervention.priority];
      const bPriority = priorityOrder[b.intervention.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return (
        new Date(a.intervention.dueDate).getTime() -
        new Date(b.intervention.dueDate).getTime()
      );
    });
  }, [suppliers]);

  const handleActionExecute = async (
    supplier: SupplierHealthMetrics,
    intervention: InterventionAction,
  ) => {
    const actionKey = `${supplier.supplier_id}-${intervention.id}`;

    if (executingActions.has(actionKey)) return;

    setExecutingActions((prev) => new Set(prev).add(actionKey));

    try {
      await onActionExecuted(supplier.supplier_id, intervention);
    } finally {
      setExecutingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const getInterventionIcon = (type: InterventionAction['type']) => {
    switch (type) {
      case 'follow_up':
        return Phone;
      case 'training':
        return BookOpen;
      case 'support':
        return MessageSquare;
      case 'upsell':
        return TrendingUp;
      case 'retention':
        return Heart;
      default:
        return AlertCircle;
    }
  };

  const getInterventionColor = (type: InterventionAction['type']) => {
    switch (type) {
      case 'follow_up':
        return 'text-blue-600';
      case 'training':
        return 'text-green-600';
      case 'support':
        return 'text-purple-600';
      case 'upsell':
        return 'text-orange-600';
      case 'retention':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityVariant = (priority: InterventionAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatTimeUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      const overdueDays = Math.abs(daysDiff);
      return {
        text: `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`,
        isOverdue: true,
      };
    } else if (daysDiff === 0) {
      return { text: 'Due today', isOverdue: false };
    } else if (daysDiff === 1) {
      return { text: 'Due tomorrow', isOverdue: false };
    } else {
      return { text: `Due in ${daysDiff} days`, isOverdue: false };
    }
  };

  const getSupplierInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionButtonText = (type: InterventionAction['type']) => {
    switch (type) {
      case 'follow_up':
        return 'Call Now';
      case 'training':
        return 'Schedule Training';
      case 'support':
        return 'Provide Support';
      case 'upsell':
        return 'Discuss Upgrade';
      case 'retention':
        return 'Retention Action';
      default:
        return 'Take Action';
    }
  };

  if (prioritizedInterventions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          All Caught Up!
        </h3>
        <p className="text-gray-500 text-sm">
          No immediate interventions required. Your suppliers are healthy!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {prioritizedInterventions
        .slice(0, 8)
        .map(({ supplier, intervention, key }) => {
          const Icon = getInterventionIcon(intervention.type);
          const iconColor = getInterventionColor(intervention.type);
          const isExecuting = executingActions.has(key);
          const dueInfo = formatTimeUntilDue(intervention.dueDate);

          return (
            <Card
              key={key}
              variant="default"
              padding="none"
              className={`transition-all duration-200 hover:shadow-md ${
                dueInfo.isOverdue ? 'border-red-200 bg-red-50' : ''
              }`}
            >
              <CardContent noPadding className="p-4">
                <div className="flex items-start gap-3">
                  {/* Supplier Avatar */}
                  <Avatar className="h-10 w-10 bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {getSupplierInitials(supplier.supplier_name)}
                    </span>
                  </Avatar>

                  {/* Intervention Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {supplier.supplier_name}
                        </h4>
                        <p className="text-xs text-gray-500 capitalize">
                          {supplier.supplier_category}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={getPriorityVariant(intervention.priority)}
                          className="text-xs uppercase"
                        >
                          {intervention.priority}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {intervention.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Icon className={`h-3 w-3 ${iconColor}`} />
                          <span className="capitalize">
                            {intervention.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span
                            className={
                              dueInfo.isOverdue
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            {dueInfo.text}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant={
                          intervention.priority === 'critical'
                            ? 'primary'
                            : 'secondary'
                        }
                        size="sm"
                        onClick={() =>
                          handleActionExecute(supplier, intervention)
                        }
                        disabled={loading || isExecuting}
                        className="text-xs px-3 py-1"
                      >
                        {isExecuting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-1" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon className="h-3 w-3 mr-1" />
                            {getActionButtonText(intervention.type)}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

      {/* Show More Actions Button */}
      {prioritizedInterventions.length > 8 && (
        <Card variant="default" padding="md">
          <CardContent noPadding className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {prioritizedInterventions.length - 8} more action
              {prioritizedInterventions.length - 8 > 1 ? 's' : ''} available
            </p>
            <Button variant="secondary" size="sm" disabled={loading}>
              View All Actions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {prioritizedInterventions.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {
                  prioritizedInterventions.filter(
                    (i) => formatTimeUntilDue(i.intervention.dueDate).isOverdue,
                  ).length
                }
              </div>
              <div className="text-xs text-gray-600">Overdue</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">
                {
                  prioritizedInterventions.filter(
                    (i) => i.intervention.priority === 'critical',
                  ).length
                }
              </div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterventionActions;
