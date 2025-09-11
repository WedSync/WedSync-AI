'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  formatPrice,
  checkTrialStatus,
  type TrialStatus,
} from '@/lib/stripe-config';

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  billingCycle: 'monthly' | 'annual';
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

interface SubscriptionCardProps {
  subscription: SubscriptionInfo;
  onUpgrade?: () => void;
  onDowngrade?: () => void;
  onCancel?: () => void;
  onReactivate?: () => void;
  onManagePayment?: () => void;
  loading?: boolean;
}

function getStatusBadge(status: string, trialStatus?: TrialStatus) {
  if (trialStatus?.isActive) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        Trial • {trialStatus.daysRemaining} days left
      </Badge>
    );
  }

  switch (status) {
    case 'active':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Active
        </Badge>
      );
    case 'trialing':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Trial
        </Badge>
      );
    case 'past_due':
      return <Badge variant="destructive">Past Due</Badge>;
    case 'canceled':
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          Canceled
        </Badge>
      );
    case 'incomplete':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Incomplete
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function SubscriptionCard({
  subscription,
  onUpgrade,
  onDowngrade,
  onCancel,
  onReactivate,
  onManagePayment,
  loading = false,
}: SubscriptionCardProps) {
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const tierInfo = SUBSCRIPTION_TIERS[subscription.tier];
  const price =
    subscription.billingCycle === 'annual'
      ? tierInfo.annualPrice
      : tierInfo.monthlyPrice;

  // Check trial status if in trial
  const trialStatus = subscription.trialEnd
    ? checkTrialStatus(subscription.trialEnd, subscription.tier)
    : null;

  const handleAction = async (action: string, callback?: () => void) => {
    if (!callback) return;

    setIsActionLoading(action);
    try {
      await callback();
    } finally {
      setIsActionLoading(null);
    }
  };

  const canUpgrade =
    subscription.tier !== 'ENTERPRISE' && subscription.status === 'active';
  const canDowngrade =
    subscription.tier !== 'FREE' && subscription.status === 'active';
  const canCancel =
    subscription.status === 'active' && !subscription.cancelAtPeriodEnd;
  const canReactivate =
    subscription.cancelAtPeriodEnd || subscription.status === 'canceled';

  return (
    <Card className="w-full max-w-2xl p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {tierInfo.name} Plan
              </h2>
              {tierInfo.badge && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-800"
                >
                  {tierInfo.badge}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">{tierInfo.description}</p>
          </div>

          {getStatusBadge(subscription.status, trialStatus)}
        </div>

        {/* Pricing */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscription.tier === 'FREE'
                  ? 'Free'
                  : formatPrice(price, subscription.billingCycle)}
              </p>
              {subscription.billingCycle === 'annual' &&
                subscription.tier !== 'FREE' && (
                  <p className="text-sm text-green-600">
                    Save £{tierInfo.monthlyPrice * 12 - tierInfo.annualPrice}{' '}
                    yearly
                  </p>
                )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">
                {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
              </p>
              <p className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        </div>

        {/* Trial Warning */}
        {trialStatus?.isActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                !
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">
                  Trial ends in {trialStatus.daysRemaining} days
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your trial ends on {formatDate(trialStatus.trialEndDate)}.
                  Subscribe to continue using {tierInfo.name} features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Past Due Warning */}
        {subscription.status === 'past_due' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                !
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Payment Failed</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your payment failed. Please update your payment method to
                  continue using WedSync.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                !
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">
                  Subscription Canceled
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your subscription will end on{' '}
                  {formatDate(subscription.currentPeriodEnd)}. You'll still have
                  access until then.
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Features */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tierInfo.highlights.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {canUpgrade && (
            <Button
              variant="wedding"
              onClick={() => handleAction('upgrade', onUpgrade)}
              loading={isActionLoading === 'upgrade'}
              disabled={loading || isActionLoading !== null}
            >
              Upgrade Plan
            </Button>
          )}

          {subscription.status === 'past_due' && (
            <Button
              variant="wedding"
              onClick={() => handleAction('payment', onManagePayment)}
              loading={isActionLoading === 'payment'}
              disabled={loading || isActionLoading !== null}
            >
              Update Payment Method
            </Button>
          )}

          {canReactivate && (
            <Button
              variant="wedding"
              onClick={() => handleAction('reactivate', onReactivate)}
              loading={isActionLoading === 'reactivate'}
              disabled={loading || isActionLoading !== null}
            >
              Reactivate Subscription
            </Button>
          )}

          {subscription.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => handleAction('payment', onManagePayment)}
              loading={isActionLoading === 'payment'}
              disabled={loading || isActionLoading !== null}
            >
              Manage Payment
            </Button>
          )}

          {canDowngrade && (
            <Button
              variant="outline"
              onClick={() => handleAction('downgrade', onDowngrade)}
              loading={isActionLoading === 'downgrade'}
              disabled={loading || isActionLoading !== null}
            >
              Change Plan
            </Button>
          )}

          {canCancel && (
            <Button
              variant="outline"
              onClick={() => handleAction('cancel', onCancel)}
              loading={isActionLoading === 'cancel'}
              disabled={loading || isActionLoading !== null}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel Subscription
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help with your subscription?{' '}
            <a href="/support" className="text-wedding hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </Card>
  );
}
