'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  };
  isDefault: boolean;
  created: Date;
}

interface PaymentMethodsProps {
  organizationId?: string;
  customerId?: string;
  onPaymentMethodChange?: () => void;
  className?: string;
}

// Card brand icons mapping
function getCardIcon(brand: string) {
  const brandLower = brand.toLowerCase();

  switch (brandLower) {
    case 'visa':
      return '💳';
    case 'mastercard':
      return '💳';
    case 'amex':
    case 'american_express':
      return '💳';
    case 'discover':
      return '💳';
    case 'diners':
      return '💳';
    case 'jcb':
      return '💳';
    case 'unionpay':
      return '💳';
    default:
      return '💳';
  }
}

function PaymentMethodCard({
  method,
  onSetDefault,
  onDelete,
  loading,
}: {
  method: PaymentMethod;
  onSetDefault?: (methodId: string) => Promise<void>;
  onDelete?: (methodId: string) => Promise<void>;
  loading?: boolean;
}) {
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (
    action: string,
    callback?: (id: string) => Promise<void>,
  ) => {
    if (!callback) return;

    setIsActionLoading(action);
    try {
      await callback(method.id);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    if (onDelete) {
      await handleAction('delete', onDelete);
    }
  };

  if (!method.card) return null;

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Card Icon */}
            <div className="text-2xl">{getCardIcon(method.card.brand)}</div>

            {/* Card Details */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 capitalize">
                  {method.card.brand} •••• {method.card.last4}
                </h3>
                {method.isDefault && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    Default
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Expires {method.card.exp_month.toString().padStart(2, '0')}/
                {method.card.exp_year}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {method.card.funding} card
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {!method.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('default', onSetDefault)}
                loading={isActionLoading === 'default'}
                disabled={loading || isActionLoading !== null}
              >
                Set Default
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              loading={isActionLoading === 'delete'}
              disabled={loading || isActionLoading !== null}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Remove Payment Method
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove this payment method? This action
            cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isActionLoading === 'delete'}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function AddPaymentMethodForm({
  customerId,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCardComplete, setIsCardComplete] = useState(false);

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

  const handleCardChange = (event: any) => {
    setIsCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    if (!isCardComplete) {
      setError('Please complete your card information.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const token =
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

      if (!token) {
        throw new Error('Authentication required');
      }

      // Create payment method
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement)!,
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Attach payment method to customer
      const response = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          customerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add payment method');
      }

      onSuccess?.();
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to add payment method',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Payment Method
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-lg p-4 bg-white">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Card Information
            </label>
            <CardElement
              options={cardElementOptions}
              onChange={handleCardChange}
              className="p-3"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="wedding"
              loading={isProcessing}
              disabled={!stripe || !isCardComplete || isProcessing}
            >
              Add Payment Method
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Your card information is encrypted and secure. We use Stripe for
            processing.
          </p>
        </div>
      </div>
    </Card>
  );
}

function AddPaymentMethodFormWrapper(
  props: Parameters<typeof AddPaymentMethodForm>[0],
) {
  return (
    <Elements stripe={stripePromise}>
      <AddPaymentMethodForm {...props} />
    </Elements>
  );
}

export function PaymentMethods({
  organizationId,
  customerId,
  onPaymentMethodChange,
  className = '',
}: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  const loadPaymentMethods = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError('');

    try {
      const token =
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `/api/billing/payment-methods?organizationId=${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load payment methods',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, [organizationId]);

  const handleSetDefault = async (methodId: string) => {
    try {
      const token =
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/billing/payment-methods/default', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to set default payment method');
      }

      // Refresh payment methods
      await loadPaymentMethods();
      onPaymentMethodChange?.();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to set default payment method',
      );
    }
  };

  const handleDelete = async (methodId: string) => {
    try {
      const token =
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/billing/payment-methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete payment method');
      }

      // Refresh payment methods
      await loadPaymentMethods();
      onPaymentMethodChange?.();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete payment method',
      );
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    loadPaymentMethods();
    onPaymentMethodChange?.();
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="p-6">
          <div className="space-y-4">
            <LoadingSkeleton className="h-6 w-40" />
            <LoadingSkeleton className="h-4 w-full" />
            <LoadingSkeleton className="h-4 w-3/4" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-gray-600 mt-1">
            Manage your payment methods for billing
          </p>
        </div>

        {!showAddForm && (
          <Button variant="wedding" onClick={() => setShowAddForm(true)}>
            Add Payment Method
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {showAddForm && customerId && (
        <AddPaymentMethodFormWrapper
          customerId={customerId}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {paymentMethods.length === 0 && !showAddForm ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No payment methods
          </h3>
          <p className="text-gray-600 mb-4">
            Add a payment method to manage your billing
          </p>
          <Button variant="wedding" onClick={() => setShowAddForm(true)}>
            Add Your First Payment Method
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
