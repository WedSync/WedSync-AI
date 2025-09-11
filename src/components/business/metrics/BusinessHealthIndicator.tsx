'use client';

// WS-195: Business Health Indicator Component
// Comprehensive business health monitoring with KPI tracking and alerts

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BusinessHealthProps,
  BusinessAlert,
  HealthIndicator,
} from '@/types/business-metrics';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Heart,
  Shield,
  DollarSign,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Business Health Indicator Component
 * Comprehensive business health monitoring for wedding marketplace
 * Features:
 * - Overall health score calculation and visualization
 * - Individual KPI tracking with trend analysis
 * - Real-time alert system with severity classification
 * - Wedding industry specific health metrics
 * - Predictive health indicators and recommendations
 */
export function BusinessHealthIndicator({
  healthData,
  showAlerts,
  alertThreshold = 'all',
  onAlertClick,
}: BusinessHealthProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'financial' | 'growth' | 'operational'
  >('all');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Filter indicators by category
  const filteredIndicators = useMemo(() => {
    if (selectedCategory === 'all') return healthData.indicators;

    const categoryKeywords = {
      financial: ['revenue', 'mrr', 'cac', 'ltv', 'margin', 'cost'],
      growth: ['growth', 'viral', 'churn', 'retention', 'acquisition'],
      operational: ['uptime', 'performance', 'satisfaction', 'support'],
    };

    const keywords = categoryKeywords[selectedCategory] || [];
    return healthData.indicators.filter((indicator) =>
      keywords.some((keyword) =>
        indicator.name.toLowerCase().includes(keyword),
      ),
    );
  }, [healthData.indicators, selectedCategory]);

  // Filter alerts by threshold
  const filteredAlerts = useMemo(() => {
    if (alertThreshold === 'all') return healthData.alerts;

    const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
    const thresholdLevel = severityOrder[alertThreshold] || 1;

    return healthData.alerts.filter(
      (alert) => severityOrder[alert.severity] >= thresholdLevel,
    );
  }, [healthData.alerts, alertThreshold]);

  // Get health score color and status
  const getHealthStatus = (score: number) => {
    if (score >= 90)
      return {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        label: 'Excellent',
        icon: CheckCircle,
      };
    if (score >= 75)
      return {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        label: 'Healthy',
        icon: Activity,
      };
    if (score >= 60)
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        label: 'Concerning',
        icon: AlertTriangle,
      };
    return {
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Critical',
      icon: XCircle,
    };
  };

  // Get indicator icon based on type
  const getIndicatorIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('revenue') || nameLower.includes('mrr'))
      return <DollarSign className="w-4 h-4" />;
    if (nameLower.includes('user') || nameLower.includes('customer'))
      return <Users className="w-4 h-4" />;
    if (nameLower.includes('growth') || nameLower.includes('viral'))
      return <TrendingUp className="w-4 h-4" />;
    if (nameLower.includes('performance') || nameLower.includes('speed'))
      return <Zap className="w-4 h-4" />;
    if (nameLower.includes('security') || nameLower.includes('compliance'))
      return <Shield className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  // Get indicator status color
  const getIndicatorColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'healthy':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'concerning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  // Get alert icon and color
  const getAlertDisplay = (alert: BusinessAlert) => {
    switch (alert.severity) {
      case 'critical':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-600 bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-800',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          badge: 'bg-orange-100 text-orange-800',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      case 'info':
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const healthStatus = getHealthStatus(healthData.score);
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className={cn('border-2', healthStatus.border)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-full', healthStatus.bg)}>
                <HealthIcon className={cn('w-6 h-6', healthStatus.color)} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Business Health Score</h3>
                <p className="text-sm text-gray-600">
                  Overall platform health assessment
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={cn('text-3xl font-bold', healthStatus.color)}>
                {healthData.score}%
              </div>
              <Badge
                className={cn(
                  'mt-1',
                  healthStatus.bg.replace('bg-', 'bg-'),
                  healthStatus.color,
                )}
              >
                {healthStatus.label}
              </Badge>
            </div>
          </div>

          <Progress
            value={healthData.score}
            className={cn(
              'h-3',
              `[&>div]:${healthStatus.color.replace('text-', 'bg-')}`,
            )}
            aria-label={`Business health score: ${healthData.score}%`}
          />

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Critical (0-59)</span>
            <span>Concerning (60-74)</span>
            <span>Healthy (75-89)</span>
            <span>Excellent (90-100)</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Metrics
        </Button>
        <Button
          variant={selectedCategory === 'financial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('financial')}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Financial
        </Button>
        <Button
          variant={selectedCategory === 'growth' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('growth')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Growth
        </Button>
        <Button
          variant={selectedCategory === 'operational' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('operational')}
        >
          <Activity className="w-4 h-4 mr-2" />
          Operational
        </Button>
      </div>

      {/* Health Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicators.map((indicator, index) => (
          <Card
            key={index}
            className={cn(
              'transition-all hover:shadow-md border',
              getIndicatorColor(indicator.status),
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getIndicatorIcon(indicator.name)}
                  <h4 className="font-medium text-sm">{indicator.name}</h4>
                </div>
                {getTrendIcon(indicator.trend)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-bold">
                    {indicator.value.toFixed(1)}
                    {indicator.name.includes('Rate') ||
                    indicator.name.includes('Score')
                      ? '%'
                      : ''}
                  </span>
                  <span className="text-xs text-gray-500">
                    Target: {indicator.target.toFixed(1)}
                    {indicator.name.includes('Rate') ||
                    indicator.name.includes('Score')
                      ? '%'
                      : ''}
                  </span>
                </div>

                <Progress
                  value={Math.min(
                    (indicator.value / indicator.target) * 100,
                    100,
                  )}
                  className="h-2"
                />

                <div className="text-xs text-gray-600">
                  {indicator.description}
                </div>

                {indicator.weddingImpact && (
                  <div className="text-xs italic text-gray-500 bg-gray-50 p-2 rounded">
                    💒 {indicator.weddingImpact}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {showAlerts && filteredAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Business Alerts
              <Badge variant="secondary">{filteredAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const alertDisplay = getAlertDisplay(alert);
                const isExpanded = expandedAlert === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'border rounded-lg cursor-pointer transition-all',
                      alertDisplay.color,
                      isExpanded ? 'shadow-md' : 'hover:shadow-sm',
                    )}
                    onClick={() => {
                      setExpandedAlert(isExpanded ? null : alert.id);
                      onAlertClick(alert);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {alertDisplay.icon}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">
                                {alert.title}
                              </h4>
                              <Badge className={alertDisplay.badge} size="sm">
                                {alert.severity}
                              </Badge>
                              {alert.actionRequired && (
                                <Badge variant="destructive" size="sm">
                                  Action Required
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-gray-700 mb-2">
                              {alert.description}
                            </p>

                            {isExpanded && (
                              <div className="space-y-2">
                                <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded italic">
                                  💒 Wedding Context: {alert.weddingContext}
                                </div>

                                <div className="text-xs text-gray-500">
                                  Reported:{' '}
                                  {new Date(alert.timestamp).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 ml-4">
                          {new Date(alert.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAlerts.length === 0 && alertThreshold !== 'all' && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p>No {alertThreshold} alerts at this time</p>
                <p className="text-xs mt-1">
                  Business health indicators are performing well
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health Trends Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />
            Health Trend Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {
                  healthData.indicators.filter((i) => i.status === 'excellent')
                    .length
                }
              </div>
              <div className="text-sm text-green-700">Excellent Metrics</div>
              <div className="text-xs text-green-600">
                Performing above target
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  healthData.indicators.filter((i) => i.status === 'concerning')
                    .length
                }
              </div>
              <div className="text-sm text-yellow-700">Need Attention</div>
              <div className="text-xs text-yellow-600">
                Below target performance
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {filteredAlerts.filter((a) => a.severity === 'critical').length}
              </div>
              <div className="text-sm text-red-700">Critical Issues</div>
              <div className="text-xs text-red-600">
                Require immediate action
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BusinessHealthIndicator;
