'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChurnRiskDashboardProps,
  AtRiskSupplier,
  ChurnMetrics,
  RetentionCampaign,
  ChurnRiskLevel,
  ChurnAlert,
  AlertUrgency,
} from '@/types/churn-intelligence';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  Users,
  TrendingDown,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AtRiskSupplierCard from './AtRiskSupplierCard';
import ChurnTrendChart from './ChurnTrendChart';
import RetentionCampaignManager from './RetentionCampaignManager';
import ChurnAlertPanel from './ChurnAlertPanel';

export default function ChurnRiskDashboard({
  atRiskSuppliers = [],
  churnMetrics,
  retentionCampaigns = [],
  realTimeUpdates = false,
  onSupplierSelect,
  onCampaignCreate,
  onActionExecute,
}: ChurnRiskDashboardProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<
    ChurnRiskLevel[]
  >([ChurnRiskLevel.HIGH_RISK, ChurnRiskLevel.CRITICAL]);
  const [autoRefresh, setAutoRefresh] = useState(realTimeUpdates);
  const [alerts, setAlerts] = useState<ChurnAlert[]>([]);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'suppliers' | 'campaigns' | 'trends'
  >('overview');

  // Filter suppliers by selected risk levels
  const filteredSuppliers = useMemo(() => {
    return atRiskSuppliers.filter((supplier) =>
      selectedRiskLevels.includes(supplier.churnRiskLevel),
    );
  }, [atRiskSuppliers, selectedRiskLevels]);

  // Risk level counts for dashboard cards
  const riskCounts = useMemo(() => {
    const counts = {
      [ChurnRiskLevel.CRITICAL]: 0,
      [ChurnRiskLevel.HIGH_RISK]: 0,
      [ChurnRiskLevel.ATTENTION]: 0,
      [ChurnRiskLevel.STABLE]: 0,
      [ChurnRiskLevel.SAFE]: 0,
    };

    atRiskSuppliers.forEach((supplier) => {
      counts[supplier.churnRiskLevel]++;
    });

    return counts;
  }, [atRiskSuppliers]);

  // Auto-refresh functionality
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        handleRefreshData();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  // Mock alerts for critical situations
  useEffect(() => {
    const criticalSuppliers = atRiskSuppliers.filter(
      (s) => s.churnRiskLevel === ChurnRiskLevel.CRITICAL,
    );
    const newAlerts: ChurnAlert[] = criticalSuppliers
      .slice(0, 3)
      .map((supplier) => ({
        id: `alert-${supplier.supplierId}`,
        alertType: 'churn_imminent' as const,
        urgency: AlertUrgency.CRITICAL,
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        riskScore: supplier.churnRiskScore,
        riskLevel: supplier.churnRiskLevel,
        title: 'Critical Churn Risk Detected',
        message: `${supplier.supplierName} has ${supplier.daysSinceLastLogin} days since last login and ${supplier.openSupportTickets} open tickets`,
        actionRequired: 'Immediate customer success intervention required',
        suggestedActions: ['schedule_call', 'assign_csm', 'offer_discount'],
        createdAt: new Date(),
        isRead: false,
        isDismissed: false,
        triggerEvent: 'risk_score_exceeded_85',
        metadata: {},
      }));

    setAlerts(newAlerts);
  }, [atRiskSuppliers]);

  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, this would trigger data refresh
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
      toast.success('Churn intelligence data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRiskLevelToggle = (riskLevel: ChurnRiskLevel) => {
    setSelectedRiskLevels((prev) =>
      prev.includes(riskLevel)
        ? prev.filter((level) => level !== riskLevel)
        : [...prev, riskLevel],
    );
  };

  const handleSupplierAction = useCallback(
    (supplierId: string, action: string) => {
      onActionExecute?.({
        supplierId,
        action: action as any,
        campaignId: undefined,
        customMessage: undefined,
        scheduledFor: new Date(),
        assignedTo: 'current-user',
      });

      toast.success(`${action.replace('_', ' ')} initiated for supplier`);
    },
    [onActionExecute],
  );

  const getRiskLevelColor = (level: ChurnRiskLevel) => {
    switch (level) {
      case ChurnRiskLevel.CRITICAL:
        return 'bg-red-500';
      case ChurnRiskLevel.HIGH_RISK:
        return 'bg-orange-500';
      case ChurnRiskLevel.ATTENTION:
        return 'bg-yellow-500';
      case ChurnRiskLevel.STABLE:
        return 'bg-blue-500';
      case ChurnRiskLevel.SAFE:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskLevelBadgeVariant = (level: ChurnRiskLevel) => {
    switch (level) {
      case ChurnRiskLevel.CRITICAL:
        return 'destructive';
      case ChurnRiskLevel.HIGH_RISK:
        return 'warning';
      case ChurnRiskLevel.ATTENTION:
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Churn Intelligence Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor at-risk suppliers and manage retention campaigns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            {autoRefresh ? 'Live' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Critical Alerts Panel */}
      {alerts.length > 0 && (
        <ChurnAlertPanel
          alerts={alerts}
          onAlertDismiss={(alertId) =>
            setAlerts((prev) => prev.filter((a) => a.id !== alertId))
          }
          onAlertAction={handleSupplierAction}
          onAlertAcknowledge={(alertId) =>
            setAlerts((prev) =>
              prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
            )
          }
          maxDisplayAlerts={5}
        />
      )}

      {/* Risk Level Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(riskCounts).map(([level, count]) => {
          const riskLevel = level as ChurnRiskLevel;
          const isSelected = selectedRiskLevels.includes(riskLevel);

          return (
            <Card
              key={level}
              variant="default"
              padding="sm"
              interactive={true}
              className={cn(
                'border-l-4 transition-all duration-200',
                getRiskLevelColor(riskLevel),
                isSelected ? 'ring-2 ring-primary-200 bg-primary-25' : '',
              )}
              onClick={() => handleRiskLevelToggle(riskLevel)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs font-medium text-gray-600 capitalize">
                  {level.replace('_', ' ')}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {churnMetrics?.predictedChurn30d || 0}
              </div>
              <div className="text-sm text-gray-600">Predicted 30d Churn</div>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {churnMetrics?.retentionRateChange > 0 ? '+' : ''}
                {churnMetrics?.retentionRateChange.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600">Retention Change</div>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {churnMetrics?.campaignsSaved || 0}
              </div>
              <div className="text-sm text-gray-600">Suppliers Saved</div>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {churnMetrics?.interventionsExecuted30d || 0}
              </div>
              <div className="text-sm text-gray-600">Interventions (30d)</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'overview', label: 'Overview', icon: AlertTriangle },
          { key: 'suppliers', label: 'At-Risk Suppliers', icon: Users },
          { key: 'campaigns', label: 'Campaigns', icon: TrendingUp },
          { key: 'trends', label: 'Trends', icon: TrendingDown },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedView === key ? 'primary' : 'tertiary'}
            size="sm"
            onClick={() => setSelectedView(key as any)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top At-Risk Suppliers */}
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Critical Risk Suppliers
                </h3>
                <Badge variant="destructive">
                  {riskCounts[ChurnRiskLevel.CRITICAL]} Critical
                </Badge>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {atRiskSuppliers
                  .filter((s) => s.churnRiskLevel === ChurnRiskLevel.CRITICAL)
                  .slice(0, 5)
                  .map((supplier) => (
                    <AtRiskSupplierCard
                      key={supplier.supplierId}
                      supplier={supplier}
                      riskFactors={supplier.riskFactors}
                      recommendedActions={[]} // Will be populated by component
                      onActionExecute={(action) =>
                        handleSupplierAction(supplier.supplierId, action)
                      }
                      compact={true}
                    />
                  ))}

                {riskCounts[ChurnRiskLevel.CRITICAL] === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No critical risk suppliers detected</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Active Campaigns Summary */}
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Active Campaigns
                </h3>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    onCampaignCreate?.({
                      name: 'New Retention Campaign',
                      campaignType: 're_engagement' as any,
                      targetRiskLevel: [ChurnRiskLevel.HIGH_RISK],
                      campaignContent: {},
                      executionSettings: {
                        startDate: new Date(),
                        autoExecute: false,
                        frequency: 'once',
                      },
                    })
                  }
                >
                  New Campaign
                </Button>
              </div>

              <div className="space-y-3">
                {retentionCampaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {campaign.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {campaign.targetedSuppliers} suppliers •{' '}
                          {campaign.saveRate.toFixed(1)}% save rate
                        </p>
                      </div>
                      <Badge
                        variant={
                          campaign.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                {retentionCampaigns.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p>No active retention campaigns</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {selectedView === 'suppliers' && (
          <div className="space-y-4">
            {/* Risk Level Filters */}
            <Card variant="default" padding="sm">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  Filter by risk level:
                </span>
                {Object.values(ChurnRiskLevel).map((level) => (
                  <Button
                    key={level}
                    variant={
                      selectedRiskLevels.includes(level)
                        ? 'primary'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => handleRiskLevelToggle(level)}
                    className="gap-2"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getRiskLevelColor(level),
                      )}
                    />
                    <span className="capitalize">
                      {level.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="ml-1">
                      {riskCounts[level]}
                    </Badge>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <AtRiskSupplierCard
                  key={supplier.supplierId}
                  supplier={supplier}
                  riskFactors={supplier.riskFactors}
                  recommendedActions={[]} // Will be populated by component
                  onActionExecute={(action) =>
                    handleSupplierAction(supplier.supplierId, action)
                  }
                  onViewDetails={
                    onSupplierSelect
                      ? () => onSupplierSelect(supplier)
                      : undefined
                  }
                />
              ))}
            </div>

            {filteredSuppliers.length === 0 && (
              <Card variant="default" padding="lg">
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Suppliers at Selected Risk Levels
                  </h3>
                  <p className="text-gray-600">
                    All suppliers in the selected risk categories are stable or
                    being monitored.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {selectedView === 'campaigns' && (
          <RetentionCampaignManager
            activeCampaigns={retentionCampaigns}
            campaignTemplates={[]} // Will be populated with templates
            onCampaignCreate={onCampaignCreate || (() => {})}
            onCampaignUpdate={(id, updates) => {
              toast.success('Campaign updated successfully');
            }}
            onCampaignPause={(id) => {
              toast.success('Campaign paused');
            }}
            onCampaignStop={(id) => {
              toast.success('Campaign stopped');
            }}
          />
        )}

        {selectedView === 'trends' && (
          <ChurnTrendChart
            churnData={[]} // Will be populated with trend data
            timeRange="90d"
            supplierSegments={['photographer', 'venue', 'planner']}
            showPredictions={true}
            showInterventions={true}
            onDateRangeChange={(range) => {
              console.log('Date range changed:', range);
            }}
          />
        )}
      </div>

      {/* Floating Action Button for Emergency Interventions */}
      {riskCounts[ChurnRiskLevel.CRITICAL] > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full shadow-xl hover:shadow-2xl gap-2 animate-pulse"
            onClick={() => {
              const criticalSuppliers = atRiskSuppliers.filter(
                (s) => s.churnRiskLevel === ChurnRiskLevel.CRITICAL,
              );
              toast.error(
                `${criticalSuppliers.length} suppliers require immediate attention!`,
              );
            }}
          >
            <AlertTriangle className="h-5 w-5" />
            {riskCounts[ChurnRiskLevel.CRITICAL]} Critical
          </Button>
        </div>
      )}
    </div>
  );
}
