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
  type TierDefinition,
} from '@/lib/stripe-config';

interface PricingPlansProps {
  currentTier?: SubscriptionTier;
  billingCycle?: 'monthly' | 'annual';
  onSelectPlan?: (tier: SubscriptionTier, cycle: 'monthly' | 'annual') => void;
  onBillingCycleChange?: (cycle: 'monthly' | 'annual') => void;
  highlightTier?: SubscriptionTier;
  showFreeTier?: boolean;
  className?: string;
}

function PricingCard({
  tier,
  isPopular,
  isCurrentPlan,
  billingCycle,
  onSelectPlan,
  disabled = false,
}: {
  tier: TierDefinition;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  billingCycle: 'monthly' | 'annual';
  onSelectPlan?: (tier: SubscriptionTier, cycle: 'monthly' | 'annual') => void;
  disabled?: boolean;
}) {
  const price =
    billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
  const savings =
    billingCycle === 'annual' && tier.id !== 'FREE'
      ? tier.monthlyPrice * 12 - tier.annualPrice
      : 0;

  return (
    <Card
      className={`relative p-6 h-full flex flex-col ${
        isPopular ? 'ring-2 ring-wedding shadow-lg' : ''
      } ${isCurrentPlan ? 'bg-blue-50 border-blue-200' : ''}`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge
            variant="secondary"
            className="bg-wedding text-white px-3 py-1"
          >
            Most Popular
          </Badge>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge
            variant="secondary"
            className="bg-blue-500 text-white px-2 py-1"
          >
            Current Plan
          </Badge>
        </div>
      )}

      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
            {tier.badge && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 text-xs"
              >
                {tier.badge}
              </Badge>
            )}
          </div>
          <p className="text-gray-600 text-sm">{tier.description}</p>
        </div>

        {/* Pricing */}
        <div className="text-center space-y-1">
          <div className="space-y-1">
            <div className="text-3xl font-bold text-gray-900">
              {tier.id === 'FREE' ? 'Free' : formatPrice(price, billingCycle)}
            </div>
            {tier.id !== 'FREE' && (
              <div className="text-sm text-gray-500">
                {billingCycle === 'annual'
                  ? 'per month, billed annually'
                  : 'per month'}
              </div>
            )}
            {savings > 0 && (
              <div className="text-sm text-green-600 font-medium">
                Save £{savings} per year
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">
            What's included:
          </h4>
          <ul className="space-y-2">
            {tier.highlights.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-gray-700 leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-6">
        {isCurrentPlan ? (
          <Button variant="outline" fullWidth disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            variant={isPopular ? 'wedding' : 'outline'}
            fullWidth
            onClick={() => onSelectPlan?.(tier.id, billingCycle)}
            disabled={disabled}
            className={isPopular ? 'shadow-md' : ''}
          >
            {tier.id === 'FREE' ? 'Get Started Free' : `Choose ${tier.name}`}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function PricingPlans({
  currentTier,
  billingCycle = 'monthly',
  onSelectPlan,
  onBillingCycleChange,
  highlightTier = 'PROFESSIONAL',
  showFreeTier = true,
  className = '',
}: PricingPlansProps) {
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>(
    billingCycle,
  );

  const handleBillingCycleChange = (cycle: 'monthly' | 'annual') => {
    setSelectedCycle(cycle);
    onBillingCycleChange?.(cycle);
  };

  // Get tiers to display
  const tiersToShow = Object.values(SUBSCRIPTION_TIERS).filter(
    (tier) => showFreeTier || tier.id !== 'FREE',
  );

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start your free trial and upgrade when you're ready. All plans
            include our core wedding management features.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => handleBillingCycleChange('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleBillingCycleChange('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                selectedCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5"
              >
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {tiersToShow.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isPopular={tier.id === highlightTier || tier.popular}
              isCurrentPlan={tier.id === currentTier}
              billingCycle={selectedCycle}
              onSelectPlan={onSelectPlan}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              Compare Features
            </h3>
            <p className="text-gray-600 mt-2">
              See what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Features
                  </th>
                  {tiersToShow.map((tier) => (
                    <th
                      key={tier.id}
                      className="text-center py-3 px-4 font-semibold text-gray-900"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 text-gray-700">User Logins</td>
                  {tiersToShow.map((tier) => (
                    <td key={tier.id} className="text-center py-3 px-4">
                      {tier.features.logins === -1
                        ? 'Unlimited'
                        : tier.features.logins}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">Forms</td>
                  {tiersToShow.map((tier) => (
                    <td key={tier.id} className="text-center py-3 px-4">
                      {tier.features.forms === -1
                        ? 'Unlimited'
                        : tier.features.forms}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700">PDF Import</td>
                  {tiersToShow.map((tier) => (
                    <td key={tier.id} className="text-center py-3 px-4">
                      {tier.features.pdfImport ? '✅' : '❌'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">AI Chatbot</td>
                  {tiersToShow.map((tier) => (
                    <td key={tier.id} className="text-center py-3 px-4">
                      {tier.features.aiChatbot ? '✅' : '❌'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700">API Access</td>
                  {tiersToShow.map((tier) => (
                    <td key={tier.id} className="text-center py-3 px-4">
                      {tier.features.apiAccess === 'full'
                        ? 'Full'
                        : tier.features.apiAccess === true
                          ? 'Basic'
                          : '❌'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gray-50 rounded-lg p-6 mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Can I change plans anytime?
              </h4>
              <p className="text-sm text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect immediately with prorated billing.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Is there a free trial?
              </h4>
              <p className="text-sm text-gray-600">
                Yes! All paid plans include a 14-day free trial. No credit card
                required to start.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-sm text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American
                Express) and debit cards through Stripe.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-sm text-gray-600">
                Absolutely. You can cancel your subscription at any time. You'll
                continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
