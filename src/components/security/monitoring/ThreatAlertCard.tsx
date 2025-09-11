'use client';

import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  GlobeAltIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ThreatAlertCardProps {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threatType:
    | 'brute_force'
    | 'suspicious_login'
    | 'data_access'
    | 'rate_limit'
    | 'csrf_attack'
    | 'malware';
  sourceIp?: string;
  affectedResource: string;
  weddingDataImpact: string;
  mitigationStatus: 'active' | 'investigating' | 'mitigated' | 'resolved';
  assignedTo?: string;
  actionRequired: boolean;
  expandable?: boolean;
  onDismiss?: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
  className?: string;
}

export function ThreatAlertCard({
  id,
  timestamp,
  title,
  description,
  severity,
  threatType,
  sourceIp,
  affectedResource,
  weddingDataImpact,
  mitigationStatus,
  assignedTo,
  actionRequired,
  expandable = true,
  onDismiss,
  onStatusChange,
  className = '',
}: ThreatAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return 'border-l-error-500 bg-error-50 border-error-200';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 border-orange-200';
      case 'medium':
        return 'border-l-warning-500 bg-warning-50 border-warning-200';
      case 'low':
        return 'border-l-blue-500 bg-blue-50 border-blue-200';
      default:
        return 'border-l-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ShieldExclamationIcon className="w-5 h-5 text-error-600" />;
      case 'medium':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-600" />;
      case 'low':
        return <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (mitigationStatus) {
      case 'active':
        return 'bg-error-100 text-error-700';
      case 'investigating':
        return 'bg-warning-100 text-warning-700';
      case 'mitigated':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getThreatTypeLabel = () => {
    switch (threatType) {
      case 'brute_force':
        return 'Brute Force Attack';
      case 'suspicious_login':
        return 'Suspicious Login';
      case 'data_access':
        return 'Unauthorized Data Access';
      case 'rate_limit':
        return 'Rate Limit Violation';
      case 'csrf_attack':
        return 'CSRF Attack';
      case 'malware':
        return 'Malware Detection';
      default:
        return 'Security Threat';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(id, newStatus);
    }
  };

  return (
    <div
      className={`border border-l-4 rounded-lg shadow-xs ${getSeverityColor()} ${className}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {getSeverityIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                {actionRequired && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700">
                    Action Required
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium uppercase ${
                    severity === 'critical'
                      ? 'bg-error-100 text-error-700'
                      : severity === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : severity === 'medium'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {severity}
                </span>
                <span className="text-xs text-gray-500">
                  {getThreatTypeLabel()}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{description}</p>

              {/* Quick Details */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>{formatTimestamp(timestamp)}</span>
                </span>
                {sourceIp && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <GlobeAltIcon className="w-3 h-3" />
                      <span>{sourceIp}</span>
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{affectedResource}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
            >
              {mitigationStatus === 'active'
                ? 'Active'
                : mitigationStatus === 'investigating'
                  ? 'Investigating'
                  : mitigationStatus === 'mitigated'
                    ? 'Mitigated'
                    : 'Resolved'}
            </span>

            {expandable && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
            )}

            {onDismiss && mitigationStatus === 'resolved' && (
              <button
                onClick={() => onDismiss(id)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Wedding Data Impact - Always Visible */}
        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-orange-600 font-medium mb-1">
                Wedding Data Impact:
              </div>
              <div className="text-sm text-orange-700">{weddingDataImpact}</div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Assignment */}
            {assignedTo && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Assigned To:
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">{assignedTo}</p>
              </div>
            )}

            {/* Status Change Actions */}
            {onStatusChange && mitigationStatus !== 'resolved' && (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  Update Status:
                </div>
                <div className="flex items-center space-x-2">
                  {mitigationStatus === 'active' && (
                    <button
                      onClick={() => handleStatusChange('investigating')}
                      className="inline-flex items-center px-3 py-1 border border-warning-300 rounded-md text-sm font-medium text-warning-700 bg-warning-50 hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-500"
                    >
                      Mark as Investigating
                    </button>
                  )}

                  {['active', 'investigating'].includes(mitigationStatus) && (
                    <button
                      onClick={() => handleStatusChange('mitigated')}
                      className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Mark as Mitigated
                    </button>
                  )}

                  {mitigationStatus === 'mitigated' && (
                    <button
                      onClick={() => handleStatusChange('resolved')}
                      className="inline-flex items-center px-3 py-1 border border-success-300 rounded-md text-sm font-medium text-success-700 bg-success-50 hover:bg-success-100 focus:outline-none focus:ring-2 focus:ring-success-500"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Additional Technical Details */}
            <div>
              <div className="text-sm font-medium text-gray-900 mb-2">
                Technical Details:
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Threat Type:</strong> {getThreatTypeLabel()}
                </p>
                <p>
                  <strong>Affected Resource:</strong> {affectedResource}
                </p>
                {sourceIp && (
                  <p>
                    <strong>Source IP:</strong> {sourceIp}
                  </p>
                )}
                <p>
                  <strong>First Detected:</strong> {timestamp.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Wedding Context */}
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
              <div className="text-sm font-medium text-primary-900 mb-2">
                Wedding Platform Context:
              </div>
              <div className="text-sm text-primary-800">
                This threat specifically targets wedding industry data and could
                impact:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Couple privacy and personal wedding information</li>
                  <li>Supplier business data and client relationships</li>
                  <li>Payment processing for wedding services</li>
                  <li>Wedding timeline coordination between vendors</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
