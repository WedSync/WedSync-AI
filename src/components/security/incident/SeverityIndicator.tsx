'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

export type SeverityLevel = 'P1' | 'P2' | 'P3' | 'P4';

interface SeverityIndicatorProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showDescription?: boolean;
  animated?: boolean;
  compact?: boolean;
  className?: string;
}

const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  size = 'md',
  showLabel = true,
  showDescription = false,
  animated = false,
  compact = false,
  className = '',
}) => {
  const severityConfig = {
    P1: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertTriangle,
      label: 'Critical',
      description:
        'System-wide failure. Immediate action required. Wedding day impact possible.',
      priority: 'CRITICAL',
      responseTime: '15 minutes',
      escalation: 'Auto-escalate to incident commander',
      weddingImpact: 'High - May affect live weddings',
    },
    P2: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: AlertTriangle,
      label: 'High',
      description:
        'Major functionality impaired. Significant user impact expected.',
      priority: 'HIGH',
      responseTime: '1 hour',
      escalation: 'Notify senior team',
      weddingImpact: 'Medium - May affect vendor workflows',
    },
    P3: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: AlertCircle,
      label: 'Medium',
      description: 'Moderate impact on functionality. Some users affected.',
      priority: 'MEDIUM',
      responseTime: '4 hours',
      escalation: 'Standard escalation path',
      weddingImpact: 'Low - Minor impact on user experience',
    },
    P4: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Info,
      label: 'Low',
      description:
        'Minor issue with minimal impact. Can be scheduled for resolution.',
      priority: 'LOW',
      responseTime: '24 hours',
      escalation: 'Normal queue processing',
      weddingImpact: 'None - No impact on core functionality',
    },
  };

  const sizeConfig = {
    sm: {
      container: 'text-xs',
      icon: 'w-3 h-3',
      badge: 'px-1.5 py-0.5 text-xs',
      spacing: 'space-x-1',
    },
    md: {
      container: 'text-sm',
      icon: 'w-4 h-4',
      badge: 'px-2 py-1 text-xs',
      spacing: 'space-x-2',
    },
    lg: {
      container: 'text-base',
      icon: 'w-5 h-5',
      badge: 'px-3 py-1.5 text-sm',
      spacing: 'space-x-3',
    },
    xl: {
      container: 'text-lg',
      icon: 'w-6 h-6',
      badge: 'px-4 py-2 text-base',
      spacing: 'space-x-4',
    },
  };

  const config = severityConfig[severity];
  const sizing = sizeConfig[size];
  const Icon = config.icon;

  const pulseAnimation = animated
    ? severity === 'P1'
      ? 'animate-pulse'
      : severity === 'P2'
        ? 'animate-bounce'
        : ''
    : '';

  if (compact) {
    return (
      <div
        className={`inline-flex items-center ${sizing.spacing} ${className}`}
      >
        <div
          className={`
          p-1 rounded-full ${config.bgColor} ${config.borderColor} border
          ${pulseAnimation}
        `}
        >
          <Icon className={`${sizing.icon} ${config.color}`} />
        </div>
        {showLabel && (
          <span className={`font-medium ${config.color} ${sizing.container}`}>
            {severity}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${sizing.container} ${className}`}>
      {/* Main Indicator */}
      <div
        className={`
        inline-flex items-center ${sizing.spacing} 
        px-3 py-2 rounded-lg border
        ${config.bgColor} ${config.borderColor}
        ${pulseAnimation}
      `}
      >
        <Icon className={`${sizing.icon} ${config.color}`} />

        {showLabel && (
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${config.color}`}>
                {severity}
              </span>
              <span
                className={`
                px-2 py-0.5 rounded-full text-xs font-medium border
                ${config.badgeColor}
              `}
              >
                {config.label}
              </span>
            </div>

            {showDescription && (
              <div className="mt-2 space-y-2">
                <p className="text-gray-600 text-sm">{config.description}</p>

                {/* Wedding-Specific Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="bg-white bg-opacity-60 p-2 rounded border">
                    <div className="font-medium text-gray-700 mb-1">
                      Response SLA
                    </div>
                    <div className="text-gray-600">{config.responseTime}</div>
                  </div>

                  <div className="bg-white bg-opacity-60 p-2 rounded border">
                    <div className="font-medium text-gray-700 mb-1">
                      Wedding Impact
                    </div>
                    <div className="text-gray-600">{config.weddingImpact}</div>
                  </div>

                  <div className="bg-white bg-opacity-60 p-2 rounded border md:col-span-2">
                    <div className="font-medium text-gray-700 mb-1">
                      Escalation
                    </div>
                    <div className="text-gray-600">{config.escalation}</div>
                  </div>
                </div>

                {/* P1 Special Wedding Day Protocol */}
                {severity === 'P1' && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="font-medium text-purple-800 text-sm mb-1 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Wedding Day Protocol
                    </div>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>
                        • Immediately check for active weddings this weekend
                      </li>
                      <li>• Activate emergency communication channel</li>
                      <li>• Notify all venue partners within 30 minutes</li>
                      <li>• Prepare manual backup procedures if needed</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeverityIndicator;
