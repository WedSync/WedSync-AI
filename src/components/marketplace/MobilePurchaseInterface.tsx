'use client';

/**
 * WS-115: Mobile-Optimized Marketplace Purchase Interface
 *
 * Mobile-first purchase interface for marketplace templates
 * Optimized for touch interactions, responsive design, and fast checkout
 *
 * Team C - Batch 9 - Round 1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShoppingCart,
  CreditCard,
  Shield,
  ArrowLeft,
  Star,
  Users,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Smartphone,
  Tablet,
  Monitor,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

interface Template {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  creator: {
    id: string;
    business_name: string;
    avatar_url?: string;
  };
  preview_images: string[];
  install_count: number;
  average_rating: number;
  rating_count: number;
  tags: string[];
  template_type: string;
  featured: boolean;
}

interface PurchaseInterfaceProps {
  template: Template;
  onBack?: () => void;
  onPurchaseComplete?: (purchaseId: string) => void;
  className?: string;
  isOpen?: boolean;
  defaultReturnUrl?: string;
}

// =====================================================================================
// MOBILE PURCHASE INTERFACE COMPONENT
// =====================================================================================

export default function MobilePurchaseInterface({
  template,
  onBack,
  onPurchaseComplete,
  className,
  isOpen = true,
  defaultReturnUrl,
}: PurchaseInterfaceProps) {
  const [currentStep, setCurrentStep] = useState<
    'preview' | 'checkout' | 'processing'
  >('preview');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(template.price_cents);
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // Auto-advance preview images
  useEffect(() => {
    if (template.preview_images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(
          (prev) => (prev + 1) % template.preview_images.length,
        );
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [template.preview_images.length]);

  const formatPrice = (cents: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const applyPromoCode = useCallback(async () => {
    if (!promoCode.trim()) return;

    setIsProcessing(true);
    try {
      // This would call the promotional code validation API
      // For now, simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate 20% discount for demo
      const discount = Math.floor(template.price_cents * 0.2);
      setDiscountAmount(discount);
      setFinalPrice(template.price_cents - discount);
      setPromoApplied(true);

      toast({
        title: 'Promo code applied!',
        description: `You saved ${formatPrice(discount)}`,
      });
    } catch (error) {
      toast({
        title: 'Invalid promo code',
        description: 'Please check your code and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [promoCode, template.price_cents, formatPrice, toast]);

  const initiateCheckout = useCallback(async () => {
    if (!termsAccepted) {
      toast({
        title: 'Terms required',
        description: 'Please accept the terms and conditions to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/marketplace/purchase/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`, // Assume auth token is stored
        },
        body: JSON.stringify({
          template_id: template.id,
          promotional_code: promoApplied ? promoCode : undefined,
          return_url: defaultReturnUrl,
          client_reference_id: `mobile_${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (error) {
      console.error('Checkout initiation failed:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
      toast({
        title: 'Checkout failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    template.id,
    promoCode,
    promoApplied,
    termsAccepted,
    defaultReturnUrl,
    toast,
  ]);

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="font-semibold text-lg truncate">{template.title}</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Preview Images Carousel */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <div className="aspect-video">
              {template.preview_images.length > 0 ? (
                <img
                  src={template.preview_images[currentImageIndex]}
                  alt={`${template.title} preview ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Monitor className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Image indicators */}
            {template.preview_images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {template.preview_images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50',
                    )}
                  />
                ))}
              </div>
            )}

            {/* Template type badge */}
            <Badge className="absolute top-4 left-4 bg-black/80 text-white">
              {template.template_type.replace('_', ' ')}
            </Badge>
          </div>

          {/* Template info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">{template.title}</h2>
              <p className="text-gray-600 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Creator info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {template.creator.avatar_url ? (
                  <img
                    src={template.creator.avatar_url}
                    alt={template.creator.business_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Users className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium">{template.creator.business_name}</p>
                <p className="text-sm text-gray-500">Template Creator</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{template.average_rating.toFixed(1)}</span>
                <span>({template.rating_count})</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>{template.install_count} installs</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Device compatibility */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Works on all devices</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Tablet className="w-4 h-4" />
                  <span>Tablet</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Monitor className="w-4 h-4" />
                  <span>Desktop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Purchase sticky footer */}
      <div className="p-4 bg-white border-t sticky bottom-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold">
              {formatPrice(template.price_cents, template.currency)}
            </p>
            <p className="text-sm text-gray-500">One-time purchase</p>
          </div>
          {template.featured && (
            <Badge variant="destructive" className="animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>

        <Button
          onClick={() => setCurrentStep('checkout')}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Buy Now
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          30-day money-back guarantee • Instant download
        </p>
      </div>
    </div>
  );

  const renderCheckoutStep = () => (
    <div className="space-y-6">
      {/* Checkout header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep('preview')}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-semibold text-lg">Checkout</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Order summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <img
                src={template.preview_images[0] || '/placeholder-template.png'}
                alt={template.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium">{template.title}</h3>
                <p className="text-sm text-gray-500">
                  {template.creator.business_name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatPrice(template.price_cents, template.currency)}
                </p>
              </div>
            </div>

            {promoApplied && (
              <>
                <Separator />
                <div className="flex justify-between text-green-600">
                  <span>Discount ({promoCode})</span>
                  <span>-{formatPrice(discountAmount, template.currency)}</span>
                </div>
              </>
            )}

            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(finalPrice, template.currency)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Promo code */}
        {!promoApplied && (
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="promo" className="text-sm font-medium">
                Promo Code
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="uppercase"
                />
                <Button
                  onClick={applyPromoCode}
                  disabled={!promoCode.trim() || isProcessing}
                  variant="outline"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms and security */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 underline">
                Privacy Policy
              </a>
            </Label>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Purchase button */}
      <div className="p-4 bg-white border-t sticky bottom-0">
        <Button
          onClick={initiateCheckout}
          disabled={!termsAccepted || isProcessing}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Complete Purchase
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          You'll be redirected to secure payment
        </p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-white flex flex-col',
        'md:relative md:rounded-lg md:shadow-lg md:max-w-md md:mx-auto',
        className,
      )}
    >
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'checkout' && renderCheckoutStep()}
    </div>
  );
}

// =====================================================================================
// PURCHASE BUTTON COMPONENT (for use in template listings)
// =====================================================================================

interface PurchaseButtonProps {
  template: Template;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onPurchaseStart?: () => void;
}

export function PurchaseButton({
  template,
  variant = 'default',
  size = 'default',
  className,
  onPurchaseStart,
}: PurchaseButtonProps) {
  const [showInterface, setShowInterface] = useState(false);

  const handleClick = () => {
    onPurchaseStart?.();
    setShowInterface(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={className}
      >
        <ShoppingCart className="w-4 h-4 mr-2" />
        {template.price_cents === 0
          ? 'Free'
          : new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: template.currency,
            }).format(template.price_cents / 100)}
      </Button>

      {showInterface && (
        <MobilePurchaseInterface
          template={template}
          onBack={() => setShowInterface(false)}
          onPurchaseComplete={() => setShowInterface(false)}
          isOpen={showInterface}
        />
      )}
    </>
  );
}
