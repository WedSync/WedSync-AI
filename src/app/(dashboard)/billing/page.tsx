'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { SubscriptionManager } from '@/components/billing/SubscriptionManager';
import { UsageDisplay } from '@/components/billing/UsageDisplay';
import { PaymentHistory } from '@/components/billing/PaymentHistory';
import { PricingPlans } from '@/components/billing/PricingPlans';

interface BillingData {
  subscription: {
    plan_name?: string;
    amount?: number;
    current_period_end?: string;
    status?: string;
  } | null;
  usage: Record<string, unknown>;
  planLimits: Record<string, unknown>;
  payments: unknown[];
  plans: unknown[];
}

export default function BillingPage() {
  const { user, loading: userLoading } = useUser();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'history'>(
    'overview',
  );

  useEffect(() => {
    if (user && !userLoading) {
      fetchBillingData();
    }
  }, [user, userLoading]);

  const fetchBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [subscriptionRes, usageRes, plansRes, paymentsRes] =
        await Promise.all([
          fetch('/api/billing/subscription?userId=' + user.id),
          fetch('/api/billing/usage?userId=' + user.id),
          fetch('/api/billing/plans'),
          fetch('/api/billing/payments?userId=' + user.id),
        ]);

      if (
        !subscriptionRes.ok ||
        !usageRes.ok ||
        !plansRes.ok ||
        !paymentsRes.ok
      ) {
        throw new Error('Failed to fetch billing data');
      }

      const [subscription, usage, plans, payments] = await Promise.all([
        subscriptionRes.json(),
        usageRes.json(),
        plansRes.json(),
        paymentsRes.json(),
      ]);

      setBillingData({
        subscription: subscription.data,
        usage: usage.data.usage,
        planLimits: usage.data.limits,
        payments: payments.data || [],
        plans: plans.data || [],
      });
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionUpdate = () => {
    fetchBillingData();
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-red-500">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Billing
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchBillingData}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-600">
            Manage your subscription, view usage, and billing history
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'plans', name: 'Plans', icon: '📋' },
                { id: 'history', name: 'Billing History', icon: '📄' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    transition-colors duration-200
                  `}
                >
                  <span>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Subscription Info */}
            <div className="lg:col-span-2 space-y-6">
              <SubscriptionManager
                subscription={billingData?.subscription}
                plans={billingData?.plans || []}
                onUpdate={handleSubscriptionUpdate}
              />

              <UsageDisplay
                usage={(billingData?.usage as any) || {}}
                limits={(billingData?.planLimits as any) || {}}
                currentPlan={billingData?.subscription?.plan_name || 'free'}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors duration-200"
                  >
                    View All Plans
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="w-full px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-300 rounded-lg transition-colors duration-200"
                  >
                    View Billing History
                  </button>
                  <button
                    onClick={() =>
                      window.open('mailto:support@wedsync.com', '_blank')
                    }
                    className="w-full px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-300 rounded-lg transition-colors duration-200"
                  >
                    Contact Support
                  </button>
                </div>
              </div>

              {/* Billing Summary */}
              {billingData?.subscription && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Billing Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Current Plan
                      </span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {billingData.subscription.plan_name || 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Monthly Cost
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        ${billingData.subscription.amount || '0'}/month
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Next Billing
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {billingData.subscription.current_period_end
                          ? new Date(
                              billingData.subscription.current_period_end,
                            ).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <span
                        className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          billingData.subscription.status === 'active'
                            ? 'bg-success-50 text-success-700 border border-success-200'
                            : billingData.subscription.status === 'trialing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }
                      `}
                      >
                        {billingData.subscription.status || 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <PricingPlans
            currentTier={
              (billingData?.subscription?.plan_name as any) || 'free'
            }
            onSelectPlan={handleSubscriptionUpdate}
          />
        )}

        {activeTab === 'history' && (
          <PaymentHistory organizationId={user?.id} />
        )}
      </div>
    </div>
  );
}
