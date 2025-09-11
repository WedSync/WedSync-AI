'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Lock,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface Variable {
  id: string;
  key: string;
  value: string;
  environment:
    | 'development'
    | 'staging'
    | 'production'
    | 'wedding-day-critical';
  security_level:
    | 'Public'
    | 'Internal'
    | 'Confidential'
    | 'Wedding-Day-Critical';
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface MobileHealthOverviewProps {
  variables: Variable[];
}

export function MobileHealthOverview({ variables }: MobileHealthOverviewProps) {
  const healthMetrics = useMemo(() => {
    const environments = [
      'development',
      'staging',
      'production',
      'wedding-day-critical',
    ];
    const requiredVars = [
      'STRIPE_SECRET_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
      'DATABASE_URL',
    ];

    const environmentHealth = environments.map((env) => {
      const envVars = variables.filter((v) => v.environment === env);
      const missing = requiredVars.filter(
        (req) => !envVars.some((v) => v.key === req),
      );
      const encrypted = envVars.filter((v) => v.is_encrypted).length;
      const critical = envVars.filter(
        (v) => v.security_level === 'Wedding-Day-Critical',
      ).length;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (missing.length > 0) {
        status = env === 'production' ? 'critical' : 'warning';
      }

      const healthScore = Math.max(0, 100 - missing.length * 15);

      return {
        environment: env,
        status,
        variableCount: envVars.length,
        missingCount: missing.length,
        missingVariables: missing,
        encryptedCount: encrypted,
        criticalCount: critical,
        healthScore,
      };
    });

    // Overall metrics
    const totalVariables = variables.length;
    const totalEncrypted = variables.filter((v) => v.is_encrypted).length;
    const totalCritical = variables.filter(
      (v) => v.security_level === 'Wedding-Day-Critical',
    ).length;
    const overallHealth =
      environmentHealth.reduce((sum, env) => sum + env.healthScore, 0) /
      environmentHealth.length;

    const securityScore = Math.min(
      100,
      (totalEncrypted / Math.max(1, totalVariables)) * 60 + // 60% weight for encryption
        (totalCritical / Math.max(1, totalVariables)) * 40, // 40% weight for critical classification
    );

    return {
      environmentHealth,
      overallMetrics: {
        totalVariables,
        totalEncrypted,
        totalCritical,
        overallHealth: Math.round(overallHealth),
        securityScore: Math.round(securityScore),
        healthyEnvironments: environmentHealth.filter(
          (e) => e.status === 'healthy',
        ).length,
        warningEnvironments: environmentHealth.filter(
          (e) => e.status === 'warning',
        ).length,
        criticalEnvironments: environmentHealth.filter(
          (e) => e.status === 'critical',
        ).length,
      },
    };
  }, [variables]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 text-xs"
          >
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 text-xs"
          >
            Warning
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs">
            Critical
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Unknown
          </Badge>
        );
    }
  };

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'production':
        return (
          <Badge variant="destructive" className="text-xs">
            Production
          </Badge>
        );
      case 'staging':
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 text-xs"
          >
            Staging
          </Badge>
        );
      case 'development':
        return (
          <Badge variant="outline" className="text-xs">
            Development
          </Badge>
        );
      case 'wedding-day-critical':
        return (
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 text-xs"
          >
            Wedding Critical
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {env}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Health Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">System Health Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Score */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">
                {healthMetrics.overallMetrics.overallHealth}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Overall Health Score</p>
            <Progress
              value={healthMetrics.overallMetrics.overallHealth}
              className="mt-2 h-2"
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Database className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-bold text-blue-600">
                {healthMetrics.overallMetrics.totalVariables}
              </div>
              <div className="text-xs text-blue-700">Total Variables</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Lock className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold text-green-600">
                {healthMetrics.overallMetrics.totalEncrypted}
              </div>
              <div className="text-xs text-green-700">Encrypted</div>
            </div>

            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <div className="text-lg font-bold text-orange-600">
                {healthMetrics.overallMetrics.totalCritical}
              </div>
              <div className="text-xs text-orange-700">Critical</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Shield className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <div className="text-lg font-bold text-purple-600">
                {healthMetrics.overallMetrics.securityScore}%
              </div>
              <div className="text-xs text-purple-700">Security Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Status Cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Environment Status
        </h3>

        {healthMetrics.environmentHealth.map((envHealth) => (
          <Card key={envHealth.environment} className="relative">
            <CardContent className="p-4">
              {/* Environment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(envHealth.status)}
                  <span className="font-medium capitalize">
                    {envHealth.environment.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {getEnvironmentBadge(envHealth.environment)}
                  {getStatusBadge(envHealth.status)}
                </div>
              </div>

              {/* Health Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Health Score</span>
                  <span className="text-sm font-medium">
                    {envHealth.healthScore}%
                  </span>
                </div>
                <Progress value={envHealth.healthScore} className="h-2" />
              </div>

              {/* Environment Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {envHealth.variableCount}
                  </div>
                  <div className="text-xs text-gray-600">Variables</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-green-600">
                    {envHealth.encryptedCount}
                  </div>
                  <div className="text-xs text-gray-600">Encrypted</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-red-600">
                    {envHealth.criticalCount}
                  </div>
                  <div className="text-xs text-gray-600">Critical</div>
                </div>
              </div>

              {/* Missing Variables Alert */}
              {envHealth.missingCount > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      {envHealth.missingCount} Missing Variables
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {envHealth.missingVariables.slice(0, 3).map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="text-xs bg-red-100 text-red-700"
                      >
                        {variable}
                      </Badge>
                    ))}
                    {envHealth.missingVariables.length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-red-100 text-red-700"
                      >
                        +{envHealth.missingVariables.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Wedding Day Impact Warning */}
              {envHealth.environment === 'production' &&
                envHealth.status === 'critical' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Wedding Day Risk
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Critical production issues could impact wedding operations
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthMetrics.overallMetrics.securityScore < 70 && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Security Score Below Target
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Consider encrypting more variables and reviewing security
                  classifications
                </p>
              </div>
            </div>
          )}

          {variables.filter(
            (v) => v.environment === 'production' && !v.is_encrypted,
          ).length > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
              <Lock className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Unencrypted Production Variables
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {
                    variables.filter(
                      (v) => v.environment === 'production' && !v.is_encrypted,
                    ).length
                  }{' '}
                  production variables should be encrypted
                </p>
              </div>
            </div>
          )}

          {healthMetrics.overallMetrics.overallHealth >= 80 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  System Health Excellent
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Your environment variables are well-configured and secure
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Environment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold text-green-600">
                {healthMetrics.overallMetrics.healthyEnvironments}
              </div>
              <div className="text-xs text-green-700">Healthy</div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
              <div className="text-lg font-bold text-yellow-600">
                {healthMetrics.overallMetrics.warningEnvironments}
              </div>
              <div className="text-xs text-yellow-700">Warnings</div>
            </div>

            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
              <div className="text-lg font-bold text-red-600">
                {healthMetrics.overallMetrics.criticalEnvironments}
              </div>
              <div className="text-xs text-red-700">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
