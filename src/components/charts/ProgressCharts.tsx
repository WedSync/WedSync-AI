'use client';

/**
 * WS-224: Progress Charts System - Main Dashboard Component
 * Comprehensive wedding progress visualization dashboard
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgressData } from '@/hooks/useProgressData';
import { ProgressOverview } from './ProgressOverview';
import { MilestoneTimeline } from './MilestoneTimeline';
import { TaskProgress } from './TaskProgress';
import { BudgetCharts } from './BudgetCharts';
import { VendorMetrics } from './VendorMetrics';
import type { ProgressFeatureAccess, ProgressFilter } from '@/types/charts';

interface ProgressChartsProps {
  weddingId?: string;
  organizationId?: string;
  accessLevel?: ProgressFeatureAccess;
  className?: string;
}

export function ProgressCharts({
  weddingId,
  organizationId,
  accessLevel,
  className,
}: ProgressChartsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  const {
    overview,
    milestones,
    tasks,
    budget,
    vendors,
    timeline,
    alerts,
    weddingMetrics,
    loading,
    error,
    lastUpdated,
    refetch,
    progressPercentage,
    onTrackStatus,
    criticalIssues,
    upcomingDeadlines,
    budgetUtilization,
  } = useProgressData({
    weddingId,
    organizationId,
    autoRefresh: true,
  });

  // Format last updated time
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Check access level for advanced features
  const hasAccess = (feature: keyof ProgressFeatureAccess['features']) => {
    return accessLevel?.features[feature] !== false;
  };

  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load progress data: {error}
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with key metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Wedding Progress Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Track milestones, tasks, and budget for your wedding planning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            Last updated: {formatLastUpdated(lastUpdated)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Progress
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressPercentage.toFixed(0)}%
            </div>
            <div className="flex items-center gap-2 mt-1">
              {onTrackStatus ? (
                <Badge variant="success" className="text-xs">
                  On Track
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Behind Schedule
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Days Until Wedding
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.daysUntilWedding || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {weddingMetrics?.planningPhase === 'week_of' && 'Wedding Week!'}
              {weddingMetrics?.planningPhase === 'final' &&
                'Final preparations'}
              {weddingMetrics?.planningPhase === 'middle' &&
                'Main planning phase'}
              {weddingMetrics?.planningPhase === 'early' && 'Early planning'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetUtilization.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              £{overview?.spentBudget?.toLocaleString() || 0} of £
              {overview?.totalBudget?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            {criticalIssues > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                criticalIssues > 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {criticalIssues}
            </div>
            <p className="text-xs text-muted-foreground">
              {criticalIssues === 0 ? 'All good!' : 'Need attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalIssues > 0 && alerts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Critical items need attention:
            </div>
            <ul className="space-y-1 text-sm">
              {alerts.overdueTasks?.slice(0, 2).map((task) => (
                <li key={task.id}>• Overdue task: {task.title}</li>
              ))}
              {alerts.budgetOverruns?.slice(0, 2).map((item) => (
                <li key={item.id}>• Budget overrun: {item.description}</li>
              ))}
              {alerts.unresponsiveVendors?.slice(0, 2).map((vendor) => (
                <li key={vendor.id}>• Unresponsive vendor: {vendor.name}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Charts Dashboard */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger
            value="budget"
            disabled={!hasAccess('budgetAnalytics')}
            className={!hasAccess('budgetAnalytics') ? 'opacity-50' : ''}
          >
            Budget
          </TabsTrigger>
          <TabsTrigger
            value="vendors"
            disabled={!hasAccess('vendorMetrics')}
            className={!hasAccess('vendorMetrics') ? 'opacity-50' : ''}
          >
            Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProgressOverview
            overview={overview}
            milestones={milestones}
            tasks={tasks}
            weddingMetrics={weddingMetrics}
            alerts={alerts}
            className="space-y-6"
          />
        </TabsContent>

        <TabsContent value="timeline">
          <MilestoneTimeline
            milestones={milestones}
            timeline={timeline}
            weddingDate={weddingMetrics?.weddingDate}
            className="space-y-6"
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskProgress
            tasks={tasks}
            milestones={milestones}
            weddingMetrics={weddingMetrics}
            className="space-y-6"
          />
        </TabsContent>

        {hasAccess('budgetAnalytics') && (
          <TabsContent value="budget">
            <BudgetCharts
              budget={budget}
              overview={overview}
              milestones={milestones}
              className="space-y-6"
            />
          </TabsContent>
        )}

        {hasAccess('vendorMetrics') && (
          <TabsContent value="vendors">
            <VendorMetrics
              vendors={vendors}
              milestones={milestones}
              overview={overview}
              className="space-y-6"
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Upgrade prompt for limited access */}
      {(!hasAccess('budgetAnalytics') || !hasAccess('vendorMetrics')) && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">
                  Unlock Advanced Analytics
                </h4>
                <p className="text-sm text-purple-700 mt-1">
                  Upgrade to Professional plan for budget analytics, vendor
                  performance metrics, and advanced reporting features.
                </p>
                <Button size="sm" className="mt-2">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProgressCharts;
