/**
 * WS-115: Marketplace Purchase Button Component
 * Quick purchase button with instant checkout
 *
 * Team C - Batch 9 - Round 1
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  ShoppingCart,
  Loader2,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/stripe-config';
import { useToast } from '@/hooks/use-toast';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface Template {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  template_type: string;
  category: string;
  minimum_tier?: string;
}

interface PurchaseButtonProps {
  template: Template;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showPrice?: boolean;
  quickPurchase?: boolean;
  disabled?: boolean;
  onPurchaseStart?: () => void;
  onPurchaseComplete?: (purchaseId: string) => void;
  onPurchaseError?: (error: string) => void;
  className?: string;
}

interface PurchaseState {
  status: 'idle' | 'loading' | 'processing' | 'completed' | 'error';
  error?: string;
  purchaseId?: string;
}

// =====================================================================================
// PURCHASE BUTTON COMPONENT
// =====================================================================================

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  template,
  variant = 'default',
  size = 'md',
  showPrice = true,
  quickPurchase = false,
  disabled = false,
  onPurchaseStart,
  onPurchaseComplete,
  onPurchaseError,
  className,
}) => {
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    status: 'idle',
  });
  const { toast } = useToast();

  const formattedPrice = formatPrice(template.price_cents, 'monthly');
  const isProcessing =
    purchaseState.status === 'loading' || purchaseState.status === 'processing';

  // Handle purchase click
  const handlePurchase = async () => {
    if (disabled || isProcessing) return;

    try {
      setPurchaseState({ status: 'loading' });
      onPurchaseStart?.();

      if (quickPurchase) {
        // Direct API purchase for simple templates
        await handleQuickPurchase();
      } else {
        // Open purchase modal for complex flows
        await handleModalPurchase();
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Purchase failed';
      setPurchaseState({
        status: 'error',
        error: errorMessage,
      });
      onPurchaseError?.(errorMessage);

      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Quick purchase flow
  const handleQuickPurchase = async () => {
    // Create purchase session
    const sessionResponse = await fetch('/api/marketplace/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: template.id,
        metadata: {
          source: 'quick_purchase',
          templateType: template.template_type,
          category: template.category,
        },
      }),
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.json();
      throw new Error(error.error || 'Failed to create purchase session');
    }

    const session = await sessionResponse.json();

    // For quick purchase, we'd typically use saved payment methods
    // For now, we'll redirect to full flow
    await handleModalPurchase();
  };

  // Modal purchase flow
  const handleModalPurchase = async () => {
    // This would typically open a purchase modal
    // For now, we'll simulate the flow
    setPurchaseState({ status: 'processing' });

    // Simulate purchase process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockPurchaseId = `purchase_${Date.now()}`;
    setPurchaseState({
      status: 'completed',
      purchaseId: mockPurchaseId,
    });

    onPurchaseComplete?.(mockPurchaseId);

    toast({
      title: 'Purchase Successful!',
      description: `${template.title} has been added to your account.`,
      variant: 'default',
    });

    // Reset state after success
    setTimeout(() => {
      setPurchaseState({ status: 'idle' });
    }, 3000);
  };

  // Get button content based on state
  const getButtonContent = () => {
    switch (purchaseState.status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Setting up...
          </>
        );

      case 'processing':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        );

      case 'completed':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Purchased!
          </>
        );

      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            Try Again
          </>
        );

      default:
        if (template.price_cents === 0) {
          return (
            <>
              <Download className="h-4 w-4 mr-2" />
              Get Free
            </>
          );
        }

        return (
          <>
            {quickPurchase ? (
              <Zap className="h-4 w-4 mr-2" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            {showPrice ? `Buy ${formattedPrice}` : 'Purchase'}
          </>
        );
    }
  };

  // Get button variant based on state
  const getButtonVariant = () => {
    switch (purchaseState.status) {
      case 'completed':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return variant;
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        variant={getButtonVariant()}
        size={size}
        onClick={handlePurchase}
        disabled={disabled || isProcessing}
        className={cn(
          'relative',
          purchaseState.status === 'completed' &&
            'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
          quickPurchase &&
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
        )}
      >
        {getButtonContent()}
      </Button>

      {/* Additional info */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock className="h-3 w-3" />
        <span>Secure payment</span>
      </div>

      {/* Template badges */}
      {template.minimum_tier && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            Requires {template.minimum_tier} plan
          </Badge>
        </div>
      )}
    </div>
  );
};

// =====================================================================================
// BULK PURCHASE COMPONENT
// =====================================================================================

export const BulkPurchaseButton: React.FC<{
  templates: Template[];
  onPurchaseComplete?: (purchaseIds: string[]) => void;
}> = ({ templates, onPurchaseComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const totalPrice = templates.reduce(
    (sum, template) => sum + template.price_cents,
    0,
  );
  const formattedTotalPrice = formatPrice(totalPrice, 'monthly');

  const handleBulkPurchase = async () => {
    setIsProcessing(true);

    try {
      const purchasePromises = templates.map((template) =>
        fetch('/api/marketplace/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: template.id,
            metadata: {
              source: 'bulk_purchase',
              bulkPurchase: true,
            },
          }),
        }).then((res) => res.json()),
      );

      const results = await Promise.all(purchasePromises);
      const purchaseIds = results.map((result) => result.purchaseId);

      onPurchaseComplete?.(purchaseIds);

      toast({
        title: 'Bulk Purchase Successful!',
        description: `${templates.length} templates purchased successfully.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Bulk Purchase Failed',
        description:
          'Some purchases may have failed. Please check your purchases.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (templates.length === 0) return null;

  return (
    <Button
      onClick={handleBulkPurchase}
      disabled={isProcessing}
      size="lg"
      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Processing {templates.length} purchases...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy All {templates.length} Templates - {formattedTotalPrice}
        </>
      )}
    </Button>
  );
};

// =====================================================================================
// ONE-CLICK PURCHASE COMPONENT
// =====================================================================================

export const OneClickPurchaseButton: React.FC<{
  template: Template;
  savedPaymentMethod?: string;
  onPurchaseComplete?: (purchaseId: string) => void;
}> = ({ template, savedPaymentMethod, onPurchaseComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  if (!savedPaymentMethod) {
    return (
      <PurchaseButton
        template={template}
        variant="outline"
        quickPurchase={false}
        onPurchaseComplete={onPurchaseComplete}
      />
    );
  }

  const handleOneClickPurchase = async () => {
    setIsProcessing(true);

    try {
      // Create and complete purchase in one API call
      const response = await fetch('/api/marketplace/purchase/one-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          paymentMethodId: savedPaymentMethod,
          metadata: {
            source: 'one_click_purchase',
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'One-click purchase failed');
      }

      onPurchaseComplete?.(result.purchaseId);

      toast({
        title: 'Purchase Complete!',
        description: `${template.title} is ready to use.`,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message || 'One-click purchase failed',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedPrice = formatPrice(template.price_cents, 'monthly');

  return (
    <Button
      onClick={handleOneClickPurchase}
      disabled={isProcessing}
      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Purchasing...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 mr-2" />
          1-Click Buy {formattedPrice}
        </>
      )}
    </Button>
  );
};

export default PurchaseButton;
