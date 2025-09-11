'use client';

import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Database,
  Server,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  StopCircle,
  RotateCcw,
} from 'lucide-react';

export interface ContainmentAction {
  id: string;
  title: string;
  description: string;
  category:
    | 'isolation'
    | 'access_control'
    | 'data_protection'
    | 'service_control'
    | 'communication';
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  automated: boolean;
  weddingImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  estimatedTime: number; // minutes
  executedAt?: Date;
  executedBy?: string;
  rollbackAvailable: boolean;
  approvalRequired: boolean;
}

interface ContainmentActionsProps {
  incidentId: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  isWeddingDay?: boolean;
  onExecuteAction: (actionId: string) => void;
  onRollbackAction: (actionId: string) => void;
  className?: string;
}

const ContainmentActions: React.FC<ContainmentActionsProps> = ({
  incidentId,
  severity,
  isWeddingDay = false,
  onExecuteAction,
  onRollbackAction,
  className = '',
}) => {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);

  // Wedding-aware containment actions based on severity
  const getAvailableActions = (): ContainmentAction[] => {
    const baseActions: ContainmentAction[] = [
      {
        id: 'isolate_affected_systems',
        title: 'Isolate Affected Systems',
        description: 'Temporarily isolate compromised systems from the network',
        category: 'isolation',
        severity,
        status: 'pending',
        automated: true,
        weddingImpact: isWeddingDay ? 'moderate' : 'minimal',
        estimatedTime: 2,
        rollbackAvailable: true,
        approvalRequired: severity === 'P1' && isWeddingDay,
      },
      {
        id: 'revoke_suspicious_sessions',
        title: 'Revoke Suspicious Sessions',
        description: 'Invalidate potentially compromised user sessions',
        category: 'access_control',
        severity,
        status: 'pending',
        automated: true,
        weddingImpact: 'minimal',
        estimatedTime: 1,
        rollbackAvailable: false,
        approvalRequired: false,
      },
      {
        id: 'enable_enhanced_monitoring',
        title: 'Enhanced Monitoring',
        description: 'Activate detailed logging and real-time monitoring',
        category: 'isolation',
        severity,
        status: 'pending',
        automated: true,
        weddingImpact: 'none',
        estimatedTime: 1,
        rollbackAvailable: true,
        approvalRequired: false,
      },
      {
        id: 'backup_critical_data',
        title: 'Emergency Data Backup',
        description:
          'Create immediate backup of critical wedding and client data',
        category: 'data_protection',
        severity,
        status: 'pending',
        automated: true,
        weddingImpact: 'none',
        estimatedTime: 5,
        rollbackAvailable: false,
        approvalRequired: false,
      },
    ];

    // Add severity-specific actions
    if (severity === 'P1' || severity === 'P2') {
      baseActions.push(
        {
          id: 'activate_wedding_day_protocol',
          title: 'Wedding Day Emergency Protocol',
          description: 'Activate manual backup procedures for active weddings',
          category: 'communication',
          severity,
          status: 'pending',
          automated: false,
          weddingImpact: isWeddingDay ? 'none' : 'minimal',
          estimatedTime: 10,
          rollbackAvailable: false,
          approvalRequired: true,
        },
        {
          id: 'disable_non_essential_services',
          title: 'Disable Non-Essential Services',
          description:
            'Temporarily disable non-critical features to preserve core functionality',
          category: 'service_control',
          severity,
          status: 'pending',
          automated: true,
          weddingImpact: isWeddingDay ? 'moderate' : 'minimal',
          estimatedTime: 3,
          rollbackAvailable: true,
          approvalRequired: isWeddingDay,
        },
      );
    }

    if (severity === 'P1') {
      baseActions.push(
        {
          id: 'emergency_maintenance_mode',
          title: 'Emergency Maintenance Mode',
          description: 'Enable maintenance mode with essential services only',
          category: 'service_control',
          severity,
          status: 'pending',
          automated: true,
          weddingImpact: 'severe',
          estimatedTime: 1,
          rollbackAvailable: true,
          approvalRequired: true,
        },
        {
          id: 'notify_venue_partners',
          title: 'Notify Venue Partners',
          description: 'Send emergency notifications to all venue partners',
          category: 'communication',
          severity,
          status: 'pending',
          automated: true,
          weddingImpact: 'none',
          estimatedTime: 2,
          rollbackAvailable: false,
          approvalRequired: false,
        },
      );
    }

    return baseActions;
  };

  const actions = getAvailableActions();

  const categoryConfig = {
    isolation: {
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    access_control: {
      icon: Lock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    data_protection: {
      icon: Database,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    service_control: {
      icon: Server,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    communication: {
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
  };

  const weddingImpactConfig = {
    none: { color: 'text-green-600', label: 'No Impact' },
    minimal: { color: 'text-yellow-600', label: 'Minimal Impact' },
    moderate: { color: 'text-orange-600', label: 'Moderate Impact' },
    severe: { color: 'text-red-600', label: 'Severe Impact' },
  };

  const statusConfig = {
    pending: { color: 'text-gray-600', icon: Clock, bg: 'bg-gray-100' },
    in_progress: {
      color: 'text-blue-600',
      icon: PlayCircle,
      bg: 'bg-blue-100',
    },
    completed: {
      color: 'text-green-600',
      icon: CheckCircle,
      bg: 'bg-green-100',
    },
    failed: { color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' },
    cancelled: { color: 'text-gray-500', icon: StopCircle, bg: 'bg-gray-100' },
  };

  const handleActionToggle = (actionId: string) => {
    setSelectedActions((prev) =>
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId],
    );
  };

  const handleExecuteAction = (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);
    if (
      action?.approvalRequired ||
      (isWeddingDay && action?.weddingImpact !== 'none')
    ) {
      setShowConfirmation(actionId);
    } else {
      onExecuteAction(actionId);
    }
  };

  const confirmExecution = (actionId: string) => {
    onExecuteAction(actionId);
    setShowConfirmation(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Wedding Day Warning */}
      {isWeddingDay && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center text-purple-800 font-medium mb-2">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Wedding Day Protocol Active
          </div>
          <p className="text-purple-700 text-sm">
            Extra caution required. All actions with moderate to severe impact
            require approval.
          </p>
        </div>
      )}

      {/* Actions by Category */}
      {Object.entries(
        actions.reduce(
          (acc, action) => {
            if (!acc[action.category]) acc[action.category] = [];
            acc[action.category].push(action);
            return acc;
          },
          {} as Record<string, ContainmentAction[]>,
        ),
      ).map(([category, categoryActions]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const Icon = config.icon;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center space-x-2">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <h3 className="font-semibold text-gray-800 capitalize">
                {category.replace('_', ' ')}
              </h3>
            </div>

            <div className="space-y-2">
              {categoryActions.map((action) => {
                const CategoryIcon = config.icon;
                const statusStyle = statusConfig[action.status];
                const StatusIcon = statusStyle.icon;
                const weddingImpact = weddingImpactConfig[action.weddingImpact];

                return (
                  <div
                    key={action.id}
                    className={`
                      p-4 rounded-lg border transition-all
                      ${config.bgColor} ${config.borderColor}
                      ${selectedActions.includes(action.id) ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CategoryIcon className={`w-4 h-4 ${config.color}`} />
                          <h4 className="font-medium text-gray-800">
                            {action.title}
                          </h4>
                          {action.automated && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Automated
                            </span>
                          )}
                          {action.approvalRequired && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Approval Required
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {action.description}
                        </p>

                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-gray-500" />
                            {action.estimatedTime}m
                          </div>
                          <div className={`font-medium ${weddingImpact.color}`}>
                            {weddingImpact.label}
                          </div>
                          {action.rollbackAvailable && (
                            <span className="text-green-600">
                              Rollback Available
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div
                          className={`
                          px-2 py-1 rounded-full text-xs font-medium flex items-center
                          ${statusStyle.bg} ${statusStyle.color}
                        `}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {action.status.charAt(0).toUpperCase() +
                            action.status.slice(1)}
                        </div>

                        {action.status === 'pending' && (
                          <button
                            onClick={() => handleExecuteAction(action.id)}
                            className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            Execute
                          </button>
                        )}

                        {action.status === 'completed' &&
                          action.rollbackAvailable && (
                            <button
                              onClick={() => onRollbackAction(action.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Rollback
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center text-orange-600 mb-4">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-semibold">Confirm Action</h3>
            </div>

            <p className="text-gray-700 mb-6">
              This action requires confirmation due to{' '}
              {isWeddingDay ? 'wedding day protocol' : 'high severity'}. Are you
              sure you want to proceed?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmExecution(showConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainmentActions;
