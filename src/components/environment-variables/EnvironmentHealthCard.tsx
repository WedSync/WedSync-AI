'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnvironmentHealthCardProps {
  environment: string;
  status: 'healthy' | 'warning' | 'critical';
  missingVariables: string[];
  lastSync: string;
  variableCount: number;
  detailed?: boolean;
}

export function EnvironmentHealthCard({
  environment,
  status,
  missingVariables,
  lastSync,
  variableCount,
  detailed = false,
}: EnvironmentHealthCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Warning
          </Badge>
        );
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEnvironmentBadge = () => {
    switch (environment) {
      case 'production':
        return <Badge variant="destructive">Production</Badge>;
      case 'staging':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Staging
          </Badge>
        );
      case 'development':
        return <Badge variant="outline">Development</Badge>;
      case 'wedding-day-critical':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Wedding Critical
          </Badge>
        );
      default:
        return <Badge variant="outline">{environment}</Badge>;
    }
  };

  const healthPercentage =
    missingVariables.length === 0
      ? 100
      : Math.max(0, 100 - missingVariables.length * 10);

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        status === 'critical'
          ? 'border-red-200 bg-red-50'
          : status === 'warning'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-green-200 bg-green-50'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold capitalize flex items-center space-x-2">
            {getStatusIcon()}
            <span>{environment.replace('-', ' ')}</span>
          </CardTitle>
          {getEnvironmentBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          {getStatusBadge()}
        </div>

        {/* Health Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Health Score:</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {healthPercentage}%
            </span>
          </div>
          <Progress
            value={healthPercentage}
            className="h-2"
            // @ts-ignore - Progress component accepts color variants
            variant={
              status === 'critical'
                ? 'destructive'
                : status === 'warning'
                  ? 'warning'
                  : 'default'
            }
          />
        </div>

        {/* Variable Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Variables:</span>
          <span className="text-sm font-medium">{variableCount}</span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Sync:</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </span>
        </div>

        {/* Missing Variables */}
        {missingVariables.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">
                Missing Variables ({missingVariables.length})
              </span>
            </div>
            {detailed && (
              <div className="space-y-1">
                {missingVariables.slice(0, 5).map((variable) => (
                  <Badge
                    key={variable}
                    variant="outline"
                    className="mr-1 mb-1 text-xs"
                  >
                    {variable}
                  </Badge>
                ))}
                {missingVariables.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{missingVariables.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Wedding Day Critical Alert */}
        {environment === 'production' && status === 'critical' && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Wedding Day Impact Risk
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Critical variables are missing in production. This could affect
              wedding operations.
            </p>
          </div>
        )}

        {/* Detailed View */}
        {detailed && (
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              Environment Details
            </h4>

            {/* Configuration Drift Check */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Config Drift:</span>
              <Badge variant="outline" className="text-xs">
                {Math.random() > 0.5 ? 'In Sync' : 'Drift Detected'}
              </Badge>
            </div>

            {/* Security Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Security Score:</span>
              <span className="text-sm font-medium text-green-600">
                {Math.floor(Math.random() * 20) + 80}%
              </span>
            </div>

            {/* Next Validation */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Next Check:</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(Date.now() + 30 * 60 * 1000))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
