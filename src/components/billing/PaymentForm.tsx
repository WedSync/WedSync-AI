'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  formatPrice,
} from '@/lib/stripe-config';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

// Validation schema
const paymentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
  returnUrl?: string;
}

// Card element options for Stripe Elements
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: '"Inter", system-ui, sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true,
};

function PaymentFormInner({
  tier,
  billingCycle,
  onSuccess,
  onError,
  returnUrl,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCardComplete, setIsCardComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
  });

  const tierInfo = SUBSCRIPTION_TIERS[tier];
  const price =
    billingCycle === 'annual' ? tierInfo.annualPrice : tierInfo.monthlyPrice;

  const handleCardChange = (event: any) => {
    setIsCardComplete(event.complete);
    if (event.error) {
      setErrorMessage(event.error.message);
    } else {
      setErrorMessage('');
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!stripe || !elements) {
      setErrorMessage('Stripe has not loaded yet. Please try again.');
      return;
    }

    if (!isCardComplete) {
      setErrorMessage('Please complete your card information.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Get the user's session token for authentication
      const token =
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: tier.toLowerCase(),
          billingCycle,
          idempotencyKey: `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      if (result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto p-6">
      <div className="space-y-6">
        {/* Plan Summary */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {tierInfo.name} Plan
            </h2>
            <p className="text-gray-600 mt-1">{tierInfo.description}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">
                {billingCycle === 'annual' ? 'Annual' : 'Monthly'} Subscription
              </span>
              <div className="text-right">
                <div className="text-2xl font-bold text-wedding">
                  {formatPrice(price, billingCycle)}
                </div>
                {billingCycle === 'annual' && (
                  <div className="text-sm text-gray-500">
                    Save £{tierInfo.monthlyPrice * 12 - tierInfo.annualPrice}{' '}
                    yearly
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Billing Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Billing Information</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Method</h3>

            <div className="border rounded-lg p-4 bg-white">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Card Information
              </Label>
              <CardElement
                options={cardElementOptions}
                onChange={handleCardChange}
                className="p-3"
              />
            </div>
          </div>

          {/* Error Display */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="wedding"
            size="lg"
            fullWidth
            loading={isProcessing}
            disabled={!stripe || !isCardComplete || isProcessing}
            className="mt-6"
          >
            {isProcessing
              ? 'Processing...'
              : `Subscribe for ${formatPrice(price, billingCycle)}`}
          </Button>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔒 Your payment information is encrypted and secure.
              <br />
              Powered by Stripe. PCI DSS compliant.
            </p>
          </div>

          {/* Terms */}
          <div className="text-center">
            <p className="text-xs text-gray-600">
              By subscribing, you agree to our{' '}
              <a href="/terms" className="text-wedding hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-wedding hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </form>
      </div>
    </Card>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner {...props} />
    </Elements>
  );
}
