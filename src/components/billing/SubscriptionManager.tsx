'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface SubscriptionManagerProps {
  subscription: any;
  plans: any[];
  onUpdate: () => void;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: string;
  features: string[];
  limits: {
    clients: number;
    vendors: number;
    journeys: number;
    storage_gb: number;
    team_members: number;
  };
}

export function SubscriptionManager({
  subscription,
  plans,
  onUpdate,
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const currentPlan =
    plans.find(
      (plan) =>
        subscription?.plan_id === plan.id ||
        subscription?.plan_name === plan.name,
    ) || plans.find((plan) => plan.name === 'free');

  const handleUpgrade = async (planId: string, priceId: string) => {
    if (!planId || loading) return;

    try {
      setLoading(true);
      setSelectedPlan(planId);

      const response = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: subscription ? 'update' : 'create',
          userId: subscription?.user_id,
          priceId,
          subscriptionId: subscription?.stripe_subscription_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subscription');
      }

      if (result.data.clientSecret) {
        // Handle payment confirmation with Stripe
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error } = await stripe.confirmPayment({
          clientSecret: result.data.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/billing?success=true`,
          },
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleCancel = async () => {
    if (!subscription?.stripe_subscription_id || loading) return;

    try {
      setLoading(true);

      const response = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          subscriptionId: subscription.stripe_subscription_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      setShowCancelDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return null;

    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysRemaining > 0 ? daysRemaining : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Current Subscription
        </h2>
        <p className="text-gray-600 mt-1">
          Manage your subscription plan and billing
        </p>
      </div>

      <div className="p-6">
        {/* Current Plan Display */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {currentPlan?.display_name || 'Free Plan'}
              </h3>
              <p className="text-gray-600">{currentPlan?.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(currentPlan?.price || 0)}
              </div>
              <div className="text-sm text-gray-600">
                per {currentPlan?.billing_interval || 'month'}
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="flex items-center gap-4 mb-4">
            <span
              className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${
                subscription?.status === 'active'
                  ? 'bg-success-100 text-success-800'
                  : subscription?.status === 'trialing'
                    ? 'bg-blue-100 text-blue-800'
                    : subscription?.status === 'past_due'
                      ? 'bg-warning-100 text-warning-800'
                      : subscription?.status === 'canceled'
                        ? 'bg-error-100 text-error-800'
                        : 'bg-gray-100 text-gray-800'
              }
            `}
            >
              {subscription?.status === 'trialing' &&
              trialDaysRemaining !== null
                ? `Trial: ${trialDaysRemaining} days left`
                : subscription?.status || 'Free'}
            </span>

            {subscription?.cancel_at_period_end && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-800">
                Cancels on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Next Billing Date */}
          {subscription?.current_period_end &&
            !subscription?.cancel_at_period_end && (
              <p className="text-sm text-gray-600">
                Next billing:{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
        </div>

        {/* Plan Features */}
        {currentPlan?.features && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              What's included:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentPlan.features.map((feature: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-success-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {currentPlan?.name !== 'enterprise' && (
            <button
              onClick={() => {
                const nextPlan = plans.find((plan) => {
                  const planHierarchy = [
                    'free',
                    'starter',
                    'professional',
                    'enterprise',
                  ];
                  const currentIndex = planHierarchy.indexOf(
                    currentPlan?.name || 'free',
                  );
                  return planHierarchy.indexOf(plan.name) === currentIndex + 1;
                });
                if (nextPlan) {
                  handleUpgrade(nextPlan.id, nextPlan.stripe_price_id);
                }
              }}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg transition-colors duration-200"
            >
              {loading && selectedPlan ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Upgrading...
                </div>
              ) : (
                'Upgrade Plan'
              )}
            </button>
          )}

          <button
            onClick={() =>
              window.open('/billing/manage-payment-methods', '_blank')
            }
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-300 rounded-lg transition-colors duration-200"
          >
            Manage Payment Methods
          </button>

          {subscription && !subscription.cancel_at_period_end && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-medium text-sm border border-red-300 rounded-lg transition-colors duration-200"
            >
              Cancel Subscription
            </button>
          )}

          {subscription?.cancel_at_period_end && (
            <button
              onClick={() => {
                // Reactivate subscription
                if (subscription.stripe_subscription_id) {
                  handleUpgrade(
                    subscription.plan_id,
                    subscription.stripe_price_id,
                  );
                }
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors duration-200"
            >
              Reactivate Subscription
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
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
                    d="M12 9v3.75m-9-.75a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m12 12.75h.008v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cancel Subscription
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? You'll
                continue to have access until the end of your current billing
                period.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-300 rounded-lg transition-colors duration-200"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg transition-colors duration-200"
                >
                  {loading ? 'Canceling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
