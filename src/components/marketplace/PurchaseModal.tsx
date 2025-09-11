/**
 * WS-115: Marketplace Purchase Modal Component
 * Complete purchase flow with Stripe integration
 *
 * Team C - Batch 9 - Round 1
 */

'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Shield,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPrice } from '@/lib/stripe-config';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

// =====================================================================================
// INTERFACES
// =====================================================================================

interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  template_type: string;
  category: string;
  price_cents: number;
  currency: string;
  preview_images: string[];
  average_rating: number;
  rating_count: number;
  install_count: number;
  supplier: {
    id: string;
    business_name: string;
    contact_name: string;
  };
  preview_data: {
    features?: string[];
    includes?: string[];
    requirements?: string[];
  };
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: MarketplaceTemplate | null;
  onPurchaseComplete: (purchaseId: string) => void;
}

interface PurchaseState {
  step: 'review' | 'payment' | 'processing' | 'success' | 'error';
  paymentIntentId?: string;
  clientSecret?: string;
  purchaseId?: string;
  error?: string;
  sessionData?: any;
}

// =====================================================================================
// PURCHASE FLOW COMPONENT
// =====================================================================================

const PurchaseFlow: React.FC<{
  template: MarketplaceTemplate;
  onComplete: (purchaseId: string) => void;
  onError: (error: string) => void;
}> = ({ template, onComplete, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    step: 'review',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Create purchase session
  const createPurchaseSession = async () => {
    try {
      setIsProcessing(true);
      setPurchaseState((prev) => ({ ...prev, step: 'processing' }));

      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          metadata: {
            source: 'marketplace_modal',
            templateType: template.template_type,
            category: template.category,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create purchase session');
      }

      setPurchaseState({
        step: 'payment',
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret,
        purchaseId: data.purchaseId,
        sessionData: data,
      });
    } catch (error: any) {
      console.error('Purchase session error:', error);
      setPurchaseState({
        step: 'error',
        error: error.message || 'Failed to initialize purchase',
      });
      onError(error.message || 'Failed to initialize purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (!stripe || !elements || !purchaseState.clientSecret) return;

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Confirm payment
      const { paymentIntent, error } = await stripe.confirmCardPayment(
        purchaseState.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm with backend
        const confirmResponse = await fetch(
          '/api/marketplace/purchase/confirm',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
            }),
          },
        );

        const confirmData = await confirmResponse.json();

        if (!confirmResponse.ok) {
          throw new Error(confirmData.error || 'Failed to complete purchase');
        }

        setPurchaseState({
          ...purchaseState,
          step: 'success',
          purchaseId: confirmData.purchaseId,
        });

        onComplete(confirmData.purchaseId);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPurchaseState({
        ...purchaseState,
        step: 'error',
        error: error.message || 'Payment processing failed',
      });
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render purchase steps
  const renderStep = () => {
    switch (purchaseState.step) {
      case 'review':
        return (
          <PurchaseReview
            template={template}
            onProceed={createPurchaseSession}
            isLoading={isProcessing}
          />
        );

      case 'payment':
        return (
          <PaymentForm
            template={template}
            onSubmit={handlePayment}
            isLoading={isProcessing}
          />
        );

      case 'processing':
        return <ProcessingState message="Setting up your purchase..." />;

      case 'success':
        return (
          <SuccessState
            template={template}
            purchaseId={purchaseState.purchaseId!}
          />
        );

      case 'error':
        return (
          <ErrorState
            error={purchaseState.error!}
            onRetry={() => setPurchaseState({ step: 'review' })}
          />
        );

      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
};

// =====================================================================================
// STEP COMPONENTS
// =====================================================================================

const PurchaseReview: React.FC<{
  template: MarketplaceTemplate;
  onProceed: () => void;
  isLoading: boolean;
}> = ({ template, onProceed, isLoading }) => {
  const price = template.price_cents / 100;
  const formattedPrice = formatPrice(template.price_cents, 'monthly');

  return (
    <div className="space-y-6">
      {/* Template Preview */}
      <div className="flex gap-4">
        {template.preview_images?.[0] && (
          <img
            src={template.preview_images[0]}
            alt={template.title}
            className="w-20 h-20 rounded-lg object-cover bg-gray-100"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{template.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{template.template_type}</Badge>
            <Badge variant="outline">{template.category}</Badge>
          </div>
        </div>
      </div>

      {/* Template Stats */}
      <div className="grid grid-cols-3 gap-4 py-4 border-y">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">
              {template.average_rating.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {template.rating_count} reviews
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{template.install_count}</span>
          </div>
          <p className="text-xs text-gray-600">installs</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="font-medium">Instant</span>
          </div>
          <p className="text-xs text-gray-600">delivery</p>
        </div>
      </div>

      {/* What's Included */}
      {template.preview_data?.includes && (
        <div>
          <h4 className="font-medium mb-2">What's Included:</h4>
          <ul className="space-y-1">
            {template.preview_data.includes.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Seller Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-1">Created by</h4>
        <p className="text-sm font-medium">{template.supplier.business_name}</p>
        <p className="text-xs text-gray-600">
          {template.supplier.contact_name}
        </p>
      </div>

      {/* Pricing */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Total</p>
            <p className="text-xs text-gray-600">One-time purchase</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{formattedPrice}</p>
            <p className="text-xs text-gray-600">{template.currency}</p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Shield className="h-4 w-4 text-green-500" />
        <span>Secure payment powered by Stripe</span>
      </div>

      {/* Action Button */}
      <Button
        onClick={onProceed}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Setting up purchase...
          </>
        ) : (
          <>
            Continue to Payment
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};

const PaymentForm: React.FC<{
  template: MarketplaceTemplate;
  onSubmit: () => void;
  isLoading: boolean;
}> = ({ template, onSubmit, isLoading }) => {
  const price = template.price_cents / 100;
  const formattedPrice = formatPrice(template.price_cents, 'monthly');

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Order Summary</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">{template.title}</span>
          <span className="font-medium">{formattedPrice}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between font-medium">
          <span>Total</span>
          <span>{formattedPrice}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="font-medium mb-4">Payment Method</h3>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Credit or Debit Card</span>
          </div>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Security Info */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your payment information is encrypted and processed securely by
          Stripe. We never store your card details.
        </AlertDescription>
      </Alert>

      {/* Purchase Button */}
      <Button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            Complete Purchase - {formattedPrice}
            <CreditCard className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};

const ProcessingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-8">
    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
    <h3 className="font-medium mb-2">Processing...</h3>
    <p className="text-sm text-gray-600">{message}</p>
  </div>
);

const SuccessState: React.FC<{
  template: MarketplaceTemplate;
  purchaseId: string;
}> = ({ template, purchaseId }) => (
  <div className="text-center py-8">
    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
    <h3 className="font-semibold text-lg mb-2">Purchase Successful!</h3>
    <p className="text-gray-600 mb-6">
      {template.title} has been purchased and is being installed.
    </p>

    <div className="space-y-3">
      <Button className="w-full" size="lg">
        <Download className="h-4 w-4 mr-2" />
        View Template
      </Button>
      <Button variant="outline" className="w-full">
        View Receipt
      </Button>
    </div>
  </div>
);

const ErrorState: React.FC<{
  error: string;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="text-center py-8">
    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
    <h3 className="font-semibold text-lg mb-2">Purchase Failed</h3>
    <p className="text-red-600 mb-6">{error}</p>

    <div className="space-y-3">
      <Button onClick={onRetry} className="w-full" size="lg">
        Try Again
      </Button>
      <Button variant="outline" className="w-full">
        Contact Support
      </Button>
    </div>
  </div>
);

// =====================================================================================
// MAIN MODAL COMPONENT
// =====================================================================================

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  template,
  onPurchaseComplete,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handlePurchaseComplete = (purchaseId: string) => {
    onPurchaseComplete(purchaseId);
    // Auto-close after a delay
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Template</DialogTitle>
          <DialogDescription>
            Complete your purchase to access this template immediately.
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <PurchaseFlow
            template={template}
            onComplete={handlePurchaseComplete}
            onError={handleError}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseModal;
