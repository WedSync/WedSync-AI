// WS-131: Advanced Billing Dashboard
// Complete billing management with analytics and subscription controls

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_cents: number;
  interval: string;
  features: Record<string, any>;
  limits: Record<string, number>;
}

interface UserSubscription {
  id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: SubscriptionPlan;
}

interface UsageSummary {
  feature: string;
  current: number;
  limit: number;
  percentage: number;
  resetDate: string;
}

interface BillingDashboardProps {
  userId: string;
  isAdmin?: boolean;
}

export function AdvancedBillingDashboard({
  userId,
  isAdmin = false,
}: BillingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null,
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usageData, setUsageData] = useState<UsageSummary[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [userId]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);

      const endpoints = [
        '/api/billing/subscription',
        '/api/billing/plans',
        '/api/billing/usage-summary',
      ];

      if (isAdmin) {
        endpoints.push('/api/billing/analytics');
      }

      const responses = await Promise.all(endpoints.map((url) => fetch(url)));
      const [subData, plansData, usageResponse, analyticsData] =
        await Promise.all(responses.map((res) => res.json()));

      setSubscription(subData.subscription);
      setPlans(plansData.plans || []);
      setUsageData(usageResponse.usage || []);

      if (isAdmin && analyticsData) {
        setRevenueData(analyticsData);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanUpgrade = async (newPlanId: string) => {
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscription?.id,
          new_plan_id: newPlanId,
        }),
      });

      if (response.ok) {
        await loadBillingData();
        setUpgradeModalOpen(false);
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        );
      case 'trialing':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Trial
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3">Loading billing dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Billing & Subscription
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription, usage, and billing preferences
          </p>
        </div>
        {subscription?.status === 'active' && (
          <Button
            onClick={() => setUpgradeModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Tracking</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Current Plan Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Plan
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">
                    {subscription?.plan?.name || 'Free Plan'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    ${((subscription?.plan?.price_cents || 0) / 100).toFixed(2)}
                    /{subscription?.plan?.interval || 'month'}
                  </p>
                  {getStatusBadge(subscription?.status || 'inactive')}
                  {subscription?.current_period_end && (
                    <p className="text-xs text-gray-500">
                      Renews:{' '}
                      {new Date(
                        subscription.current_period_end,
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {subscription?.cancel_at_period_end && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Your subscription will be cancelled at the end of the
                        current period.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Overview Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Usage This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageData.slice(0, 3).map((usage) => (
                    <div key={usage.feature} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {usage.feature.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {usage.limit === -1
                            ? `${usage.current}/∞`
                            : `${usage.current}/${usage.limit}`}
                        </span>
                      </div>
                      {usage.limit !== -1 && (
                        <div className="flex items-center space-x-2">
                          <Progress
                            value={usage.percentage}
                            className={`h-2 flex-1 ${getUsageColor(usage.percentage)}`}
                          />
                          <span className="text-xs font-medium">
                            {Math.round(usage.percentage)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Update Payment Method
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Usage Details
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Alerts */}
          {usageData.some((u) => u.percentage > 80) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You're approaching usage limits on some features. Consider
                upgrading your plan to avoid interruptions.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Usage Tracking Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor your usage across all features and set up alerts
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {usageData.map((usage) => (
                  <div key={usage.feature} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium capitalize">
                          {usage.feature.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Resets:{' '}
                          {new Date(usage.resetDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {usage.limit === -1
                            ? usage.current
                            : `${usage.current}/${usage.limit}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {usage.limit === -1
                            ? 'Unlimited'
                            : `${Math.round(usage.percentage)}% used`}
                        </p>
                      </div>
                    </div>
                    {usage.limit !== -1 && (
                      <Progress
                        value={usage.percentage}
                        className={`h-3 ${getUsageColor(usage.percentage)}`}
                      />
                    )}
                    {usage.percentage > 90 && usage.limit !== -1 && (
                      <Alert className="mt-3 border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          You've used {Math.round(usage.percentage)}% of your{' '}
                          {usage.feature} limit. Upgrade your plan to increase
                          limits.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans & Pricing Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  subscription?.plan?.id === plan.id
                    ? 'border-primary-500 bg-primary-50'
                    : ''
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-3xl font-bold mt-2">
                        ${(plan.price_cents / 100).toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.interval}
                        </span>
                      </p>
                    </div>
                    {subscription?.plan?.id === plan.id && (
                      <Badge className="bg-primary-100 text-primary-800">
                        Current
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Features:</h4>
                      <ul className="text-sm space-y-1">
                        {Object.entries(plan.features).map(
                          ([feature, included]) => (
                            <li key={feature} className="flex items-center">
                              {included ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 mr-2" />
                              )}
                              {feature.replace('_', ' ')}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Limits:</h4>
                      <ul className="text-sm space-y-1">
                        {Object.entries(plan.limits).map(([limit, value]) => (
                          <li key={limit} className="flex justify-between">
                            <span className="capitalize">
                              {limit.replace('_', ' ')}:
                            </span>
                            <span className="font-medium">
                              {value === -1
                                ? 'Unlimited'
                                : value.toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      className="w-full"
                      variant={
                        subscription?.plan?.id === plan.id
                          ? 'outline'
                          : 'default'
                      }
                      disabled={subscription?.plan?.id === plan.id}
                      onClick={() => handlePlanUpgrade(plan.id)}
                    >
                      {subscription?.plan?.id === plan.id
                        ? 'Current Plan'
                        : 'Select Plan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Monthly Recurring Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${revenueData?.current_period?.mrr?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueData?.current_period?.growth_rate > 0 ? '+' : ''}
                    {revenueData?.current_period?.growth_rate?.toFixed(1) || 0}%
                    from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Customers
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueData?.current_period?.active_subscriptions?.toLocaleString() ||
                      '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Churn rate:{' '}
                    {revenueData?.current_period?.churn_rate?.toFixed(1) || 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average LTV
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${revenueData?.current_period?.ltv?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ARPU: $
                    {revenueData?.current_period?.arpu?.toFixed(2) || '0'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Trial Conversions
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueData?.current_period?.trial_conversions || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Plan Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData?.plan_breakdown?.map((plan: any) => (
                    <div
                      key={plan.plan_name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{plan.plan_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {plan.active_subscriptions} subscribers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          ${plan.mrr.toLocaleString()}/mo
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.percentage_of_total.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
